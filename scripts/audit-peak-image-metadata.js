#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NH48_PATH = path.join(ROOT, 'data', 'nh48.json');
const PEAK_TEMPLATE_PATH = path.join(ROOT, 'pages', 'nh48_peak.html');
const BASE_URL = process.env.PEAK_IMAGE_METADATA_AUDIT_URL || getArgValue('--url') || '';

const SAMPLE_SLUGS = ['mount-washington', 'mount-isolation', 'mount-lafayette'];

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return '';
  return process.argv[idx + 1];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function extractFunctionBody(content, functionName) {
  const signature = `function ${functionName}`;
  const start = content.indexOf(signature);
  if (start === -1) return '';
  const braceStart = content.indexOf('{', start);
  if (braceStart === -1) return '';
  let depth = 0;
  for (let i = braceStart; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(braceStart + 1, i);
      }
    }
  }
  return '';
}

function extractJsonLdDocs(html) {
  const docs = [];
  const errors = [];
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  matches.forEach((match) => {
    const raw = (match[1] || '').trim();
    if (!raw) return;
    try {
      docs.push(JSON.parse(raw));
    } catch (error) {
      errors.push(error.message);
    }
  });
  return { docs, errors };
}

function collectNodes(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((entry) => collectNodes(entry, out));
    return out;
  }
  if (Array.isArray(node['@graph'])) {
    node['@graph'].forEach((entry) => collectNodes(entry, out));
    return out;
  }
  out.push(node);
  Object.values(node).forEach((value) => {
    if (value && typeof value === 'object') collectNodes(value, out);
  });
  return out;
}

function getTypes(node) {
  const type = node && node['@type'];
  if (Array.isArray(type)) return type.map((entry) => String(entry));
  if (typeof type === 'string') return [type];
  return [];
}

function normalizeUrlToBasename(input) {
  if (!input) return '';
  try {
    const url = new URL(String(input));
    const cleanPath = url.pathname.replace(/\/+$/, '');
    return cleanPath.split('/').pop() || '';
  } catch {
    const clean = String(input).split('?')[0].split('#')[0].replace(/\/+$/, '');
    return clean.split('/').pop() || '';
  }
}

function extractSourcePhotoBasenames(peak) {
  const list = Array.isArray(peak && peak.photos) ? peak.photos : [];
  const names = new Set();
  list.forEach((photo) => {
    const rawUrl = typeof photo === 'string' ? photo : (photo && (photo.originalUrl || photo.url));
    const basename = normalizeUrlToBasename(rawUrl);
    if (basename) names.add(basename);
  });
  return names;
}

function extractImageObjectBasenames(nodes, slug) {
  const names = new Set();
  nodes.forEach((node) => {
    if (!getTypes(node).includes('ImageObject')) return;
    const contentUrl = node.contentUrl || node.url || '';
    const basename = normalizeUrlToBasename(contentUrl);
    if (!basename) return;
    if (slug && !basename.toLowerCase().includes(slug.toLowerCase())) return;
    names.add(basename);
  });
  return names;
}

function assertTemplateTitleFallbacks(template, failures) {
  const titleBody = extractFunctionBody(template, 'buildPhotoTitleText');
  if (!titleBody) {
    failures.push('Missing buildPhotoTitleText() helper in peak template.');
    return;
  }
  if (!/headline/i.test(titleBody) || !/title/i.test(titleBody) || !/caption/i.test(titleBody)) {
    failures.push('buildPhotoTitleText() is missing metadata priority keys (headline/title/caption).');
  }
  if (!/altText/i.test(titleBody) || !/alt/i.test(titleBody)) {
    failures.push('buildPhotoTitleText() is missing alt fallback keys (altText/alt).');
  }
  if (!/buildPhotoAltText\s*\(/.test(titleBody)) {
    failures.push('buildPhotoTitleText() must fall back to buildPhotoAltText().');
  }

  const carouselBody = extractFunctionBody(template, 'buildCarousel');
  if (!carouselBody) {
    failures.push('Missing buildCarousel() function in peak template.');
    return;
  }
  if (!/img\.title\s*=/.test(carouselBody)) {
    failures.push('buildCarousel() does not set img.title from metadata fallback chain.');
  }
}

function assertImgMarkupHasAlt(html, slug, failures) {
  const imgMatches = [...html.matchAll(/<img\b[^>]*>/gi)];
  if (!imgMatches.length) {
    failures.push(`${slug}: no <img> tags found in rendered page.`);
    return;
  }
  imgMatches.forEach((match, index) => {
    const tag = match[0];
    const altMatch = tag.match(/\balt\s*=\s*["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1].trim() : '';
    if (!alt) {
      failures.push(`${slug}: image tag #${index + 1} is missing non-empty alt text.`);
    }
  });
}

function assertImageObjectRequirements(nodes, slug, failures) {
  const imageObjects = nodes.filter((node) => getTypes(node).includes('ImageObject'));
  if (!imageObjects.length) {
    failures.push(`${slug}: no ImageObject nodes found in JSON-LD.`);
    return;
  }

  const concreteObjects = imageObjects.filter((node) => {
    return String(node.contentUrl || '').trim().length > 0;
  });
  if (!concreteObjects.length) {
    failures.push(`${slug}: no concrete ImageObject nodes with contentUrl/url found.`);
    return;
  }

  const relevant = concreteObjects.filter((node) => {
    const candidate = `${node.contentUrl || ''} ${node.url || ''}`.toLowerCase();
    return candidate.includes(slug.toLowerCase());
  });
  const scoped = relevant.length ? relevant : concreteObjects;

  scoped.forEach((node, index) => {
    const label = `${slug}: ImageObject #${index + 1}`;
    if (!String(node.contentUrl || '').trim()) failures.push(`${label} missing contentUrl.`);
    if (!String(node.name || '').trim()) failures.push(`${label} missing name.`);
    if (!String(node.caption || node.description || '').trim()) failures.push(`${label} missing caption/description.`);
    if (!node.creator) failures.push(`${label} missing creator.`);
    if (!String(node.license || '').trim()) failures.push(`${label} missing license.`);
    if (!String(node.creditText || '').trim()) failures.push(`${label} missing creditText.`);
    if (!String(node.copyrightNotice || '').trim()) failures.push(`${label} missing copyrightNotice.`);
  });
}

async function loadRenderedPage(slug) {
  if (BASE_URL) {
    const url = new URL(`/peak/${slug}`, BASE_URL).toString();
    const response = await fetch(url, {
      headers: { 'User-Agent': 'NH48-Peak-Image-Metadata-Audit/1.0' }
    });
    if (!response.ok) {
      throw new Error(`${url} returned ${response.status}`);
    }
    return response.text();
  }

  const filePath = path.join(ROOT, 'peaks', slug, 'index.html');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing prerendered file: peaks/${slug}/index.html`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

async function main() {
  const failures = [];
  const nh48 = readJson(NH48_PATH);
  const template = fs.readFileSync(PEAK_TEMPLATE_PATH, 'utf8');
  assertTemplateTitleFallbacks(template, failures);

  for (const slug of SAMPLE_SLUGS) {
    const peak = nh48?.[slug];
    if (!peak) {
      failures.push(`Missing peak entry in data/nh48.json for slug "${slug}".`);
      continue;
    }

    let html = '';
    try {
      html = await loadRenderedPage(slug);
    } catch (error) {
      failures.push(`${slug}: ${error.message}`);
      continue;
    }

    assertImgMarkupHasAlt(html, slug, failures);
    const { docs, errors } = extractJsonLdDocs(html);
    if (errors.length) {
      failures.push(`${slug}: invalid JSON-LD detected (${errors.join('; ')})`);
      continue;
    }
    const nodes = [];
    docs.forEach((doc) => collectNodes(doc, nodes));
    assertImageObjectRequirements(nodes, slug, failures);

    const sourceNames = extractSourcePhotoBasenames(peak);
    const imageNames = extractImageObjectBasenames(nodes, slug);
    sourceNames.forEach((name) => {
      if (!imageNames.has(name)) {
        failures.push(`${slug}: missing ImageObject entry for source photo "${name}".`);
      }
    });
  }

  if (failures.length) {
    console.error(`Peak image metadata audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  if (BASE_URL) {
    console.log(`Peak image metadata audit passed for ${SAMPLE_SLUGS.length} route(s): ${BASE_URL}`);
  } else {
    console.log(`Peak image metadata audit passed for ${SAMPLE_SLUGS.length} sampled prerendered peaks.`);
  }
}

main().catch((error) => {
  console.error(`Peak image metadata audit crashed: ${error.message}`);
  process.exit(1);
});
