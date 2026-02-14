#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE_URL = process.env.HOMEPAGE_AUDIT_URL || getArgValue('--url') || 'https://nh48.info';
const ROUTES = ['/', '/fr/'];

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return '';
  return process.argv[index + 1];
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ');
}

function extractAttr(tag, attrName) {
  const re = new RegExp(`${attrName}\\s*=\\s*(\"([^\"]*)\"|'([^']*)')`, 'i');
  const match = tag.match(re);
  return normalizeText(match ? match[2] || match[3] || '' : '');
}

function stripCloudflareImageTransform(rawUrl) {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl);
    const marker = '/cdn-cgi/image/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return parsed.toString();
    const tail = parsed.pathname.slice(markerIndex + marker.length);
    const slashIndex = tail.indexOf('/');
    if (slashIndex === -1) return parsed.toString();
    const originPath = tail.slice(slashIndex + 1);
    return `${parsed.origin}/${originPath}`;
  } catch (_) {
    return normalizeText(rawUrl);
  }
}

function normalizeUrlKey(value) {
  const stripped = stripCloudflareImageTransform(value);
  if (!stripped) return '';
  try {
    return new URL(stripped).toString().toLowerCase();
  } catch (_) {
    return stripped.toLowerCase();
  }
}

function readLocal(filePath) {
  return fs.readFileSync(path.join(ROOT, filePath), 'utf8');
}

function expectedHomepageMediaSet() {
  const expected = new Set();

  const homepageHtml = readLocal('pages/index.html');
  const cardImageTags = homepageHtml.match(/<img\b[^>]*class\s*=\s*["'][^"']*\bdataset-card-image\b[^"']*["'][^>]*>/gi) || [];
  cardImageTags.forEach((tag) => {
    const rawSrc = decodeHtmlEntities(extractAttr(tag, 'src'));
    const key = normalizeUrlKey(rawSrc);
    if (key) expected.add(key);
  });

  const splashManifest = JSON.parse(readLocal('photos/backgrounds/manifest.json'));
  if (Array.isArray(splashManifest)) {
    splashManifest.forEach((entry) => {
      const relativePath = normalizeText(entry).replace(/^\/+/, '');
      if (!relativePath || !/\.(png|jpe?g|webp)$/i.test(relativePath)) return;
      const key = normalizeUrlKey(`https://photos.nh48.info/${relativePath}`);
      if (key) expected.add(key);
    });
  }

  return expected;
}

function extractJsonLdDocs(html) {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const docs = [];
  const parseErrors = [];

  matches.forEach((m) => {
    const raw = normalizeText(m[1]);
    if (!raw) return;
    try {
      docs.push(JSON.parse(raw));
    } catch (err) {
      parseErrors.push(err.message);
    }
  });

  return { docs, parseErrors };
}

function collectNodes(root, out = []) {
  if (!root || typeof root !== 'object') return out;
  if (Array.isArray(root)) {
    root.forEach((item) => collectNodes(item, out));
    return out;
  }
  if (Array.isArray(root['@graph'])) {
    root['@graph'].forEach((item) => collectNodes(item, out));
    return out;
  }
  out.push(root);
  Object.values(root).forEach((value) => {
    if (value && typeof value === 'object') {
      collectNodes(value, out);
    }
  });
  return out;
}

function getTypes(node) {
  const value = node['@type'];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return [value];
  return [];
}

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'NH48-SEO-Audit/1.0'
    }
  });
  const body = await response.text();
  return { status: response.status, body };
}

async function auditRoute(baseUrl, routePath, expectedMedia) {
  const url = new URL(routePath, baseUrl).toString();
  const failures = [];
  const result = await fetchPage(url);

  if (result.status !== 200) {
    failures.push(`HTTP ${result.status} at ${url}`);
    return { url, failures };
  }

  if (/class=["'][^"']*seo-gallery[^"']*["']/i.test(result.body)) {
    failures.push('seo-gallery markup detected in rendered homepage output');
  }

  const { docs, parseErrors } = extractJsonLdDocs(result.body);
  if (parseErrors.length) {
    failures.push(`Invalid JSON-LD blocks: ${parseErrors.join('; ')}`);
    return { url, failures };
  }

  const nodes = [];
  docs.forEach((doc) => collectNodes(doc, nodes));

  const typeSet = new Set();
  nodes.forEach((node) => {
    getTypes(node).forEach((type) => typeSet.add(type));
  });

  ['DataCatalog', 'Dataset', 'FAQPage', 'BreadcrumbList', 'WebPage', 'SiteNavigationElement'].forEach((requiredType) => {
    if (!typeSet.has(requiredType)) {
      failures.push(`Missing JSON-LD type: ${requiredType}`);
    }
  });

  const breadcrumbNodes = nodes.filter((node) => getTypes(node).includes('BreadcrumbList'));
  if (breadcrumbNodes.length !== 1) {
    failures.push(`Expected exactly 1 BreadcrumbList, found ${breadcrumbNodes.length}`);
  } else {
    const itemCount = Array.isArray(breadcrumbNodes[0].itemListElement)
      ? breadcrumbNodes[0].itemListElement.length
      : 0;
    if (itemCount !== 2) {
      failures.push(`Expected BreadcrumbList item count 2, found ${itemCount}`);
    }
  }

  const imageNodes = nodes.filter((node) => getTypes(node).includes('ImageObject'));
  if (imageNodes.length <= 12) {
    failures.push(`Expected > 12 ImageObject nodes, found ${imageNodes.length}`);
  }

  const remoteMedia = new Set();
  imageNodes.forEach((node) => {
    const key = normalizeUrlKey(node.contentUrl || node.url || '');
    if (key) remoteMedia.add(key);
  });

  const missingMedia = [];
  expectedMedia.forEach((key) => {
    if (!remoteMedia.has(key)) {
      missingMedia.push(key);
    }
  });
  if (missingMedia.length) {
    const preview = missingMedia.slice(0, 8).join(', ');
    failures.push(`Missing expected card+splash media in ImageObject output (${missingMedia.length}): ${preview}`);
  }

  return { url, failures };
}

async function main() {
  const expectedMedia = expectedHomepageMediaSet();
  if (!expectedMedia.size) {
    console.error('No expected homepage media discovered from local files.');
    process.exit(1);
  }

  const audits = [];
  for (const routePath of ROUTES) {
    audits.push(await auditRoute(BASE_URL, routePath, expectedMedia));
  }

  const failures = audits.filter((audit) => audit.failures.length);
  if (failures.length) {
    console.error(`Homepage worker SEO audit failed for ${failures.length} route(s).`);
    failures.forEach((audit) => {
      console.error(`- ${audit.url}`);
      audit.failures.forEach((failure) => console.error(`  * ${failure}`));
    });
    process.exit(1);
  }

  console.log(`Homepage worker SEO audit passed for ${ROUTES.length} route(s): ${BASE_URL}`);
}

main().catch((error) => {
  console.error(`Homepage worker SEO audit crashed: ${error.message}`);
  process.exit(1);
});
