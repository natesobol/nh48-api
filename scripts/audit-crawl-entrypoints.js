#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROBOTS_PATH = path.join(ROOT, 'robots.txt');
const SITEMAP_INDEX_PATH = path.join(ROOT, 'sitemap.xml');
const PAGE_SITEMAP_PATH = path.join(ROOT, 'page-sitemap.xml');
const IMAGE_SITEMAP_PATH = path.join(ROOT, 'image-sitemap.xml');
const BASE_URL = process.env.CRAWL_ENTRYPOINTS_AUDIT_URL || getArgValue('--url') || '';

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return '';
  return process.argv[index + 1];
}

function readLocal(filePath, label, failures) {
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing ${label}: ${path.relative(ROOT, filePath)}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function detectXmlRoot(xmlText) {
  const match = String(xmlText || '').match(/^\s*(?:<\?xml[\s\S]*?\?>\s*)?<([A-Za-z_][\w:.-]*)\b/);
  return match ? match[1] : '';
}

function extractLocValues(xmlText) {
  return [...String(xmlText || '').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function assertXmlBasics(label, xmlText, expectedRoot, failures) {
  if (!xmlText.trim()) {
    failures.push(`${label} is empty.`);
    return;
  }
  if (!/<\?xml\b/i.test(xmlText)) {
    failures.push(`${label} missing XML declaration.`);
  }
  const root = detectXmlRoot(xmlText);
  if (!root) {
    failures.push(`${label} failed XML root detection.`);
    return;
  }
  if (root.toLowerCase() !== expectedRoot.toLowerCase()) {
    failures.push(`${label} expected root <${expectedRoot}>, found <${root}>.`);
  }
  const closingTagPattern = new RegExp(`</\\s*${expectedRoot}\\s*>`, 'i');
  if (!closingTagPattern.test(xmlText)) {
    failures.push(`${label} missing closing </${expectedRoot}> tag.`);
  }
}

function assertLocalFiles(failures) {
  const robotsText = readLocal(ROBOTS_PATH, 'robots.txt', failures);
  const sitemapIndexText = readLocal(SITEMAP_INDEX_PATH, 'sitemap.xml', failures);
  const pageSitemapText = readLocal(PAGE_SITEMAP_PATH, 'page-sitemap.xml', failures);
  const imageSitemapText = readLocal(IMAGE_SITEMAP_PATH, 'image-sitemap.xml', failures);

  if (robotsText) {
    if (!/Sitemap:\s*https:\/\/nh48\.info\/sitemap\.xml/i.test(robotsText)) {
      failures.push('robots.txt missing sitemap.xml declaration.');
    }
    if (!/Sitemap:\s*https:\/\/nh48\.info\/page-sitemap\.xml/i.test(robotsText)) {
      failures.push('robots.txt missing page-sitemap.xml declaration.');
    }
    if (!/Sitemap:\s*https:\/\/nh48\.info\/image-sitemap\.xml/i.test(robotsText)) {
      failures.push('robots.txt missing image-sitemap.xml declaration.');
    }
  }

  if (sitemapIndexText) {
    assertXmlBasics('sitemap.xml', sitemapIndexText, 'sitemapindex', failures);
    const locs = extractLocValues(sitemapIndexText);
    if (!locs.includes('https://nh48.info/page-sitemap.xml')) {
      failures.push('sitemap.xml missing canonical page-sitemap.xml reference.');
    }
    if (!locs.includes('https://nh48.info/image-sitemap.xml')) {
      failures.push('sitemap.xml missing canonical image-sitemap.xml reference.');
    }
  }

  if (pageSitemapText) {
    assertXmlBasics('page-sitemap.xml', pageSitemapText, 'urlset', failures);
    if (!/https:\/\/nh48\.info\/peak\//i.test(pageSitemapText)) {
      failures.push('page-sitemap.xml missing /peak/ URLs.');
    }
    if (/https:\/\/nh48\.info\/peaks\//i.test(pageSitemapText)) {
      failures.push('page-sitemap.xml contains legacy /peaks/ URLs.');
    }
  }

  if (imageSitemapText) {
    assertXmlBasics('image-sitemap.xml', imageSitemapText, 'urlset', failures);
    if (!/xmlns:image=["']http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1["']/i.test(imageSitemapText)) {
      failures.push('image-sitemap.xml missing image namespace declaration.');
    }
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'NH48-Crawl-Entry-Audit/1.0' },
  });
  const body = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body,
    url: response.url || url,
    redirected: Boolean(response.redirected),
  };
}

async function assertLiveEndpoints(failures) {
  const origin = new URL(BASE_URL).origin;
  const robotsUrl = `${origin}/robots.txt`;
  const sitemapUrl = `${origin}/sitemap.xml`;
  const pageSitemapUrl = `${origin}/page-sitemap.xml`;
  const imageSitemapUrl = `${origin}/image-sitemap.xml`;

  const robots = await fetchText(robotsUrl);
  if (robots.status !== 200) {
    failures.push(`${robotsUrl}: expected HTTP 200, received ${robots.status}.`);
  } else {
    if (!/Sitemap:\s*https?:\/\/[^/\s]+\/sitemap\.xml/i.test(robots.body)) {
      failures.push(`${robotsUrl}: missing sitemap.xml declaration.`);
    }
    if (!/Sitemap:\s*https?:\/\/[^/\s]+\/page-sitemap\.xml/i.test(robots.body)) {
      failures.push(`${robotsUrl}: missing page-sitemap.xml declaration.`);
    }
    if (!/Sitemap:\s*https?:\/\/[^/\s]+\/image-sitemap\.xml/i.test(robots.body)) {
      failures.push(`${robotsUrl}: missing image-sitemap.xml declaration.`);
    }
  }

  const sitemapIndex = await fetchText(sitemapUrl);
  if (sitemapIndex.status !== 200) {
    failures.push(`${sitemapUrl}: expected HTTP 200, received ${sitemapIndex.status}.`);
  } else {
    const canonicalOrigin = new URL(sitemapIndex.url || sitemapUrl).origin;
    const contentType = String(sitemapIndex.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('xml')) {
      failures.push(`${sitemapUrl}: expected XML content-type, found "${contentType || '[missing]'}".`);
    }
    assertXmlBasics(sitemapUrl, sitemapIndex.body, 'sitemapindex', failures);
    const locs = extractLocValues(sitemapIndex.body);
    if (!locs.includes(`${canonicalOrigin}/page-sitemap.xml`)) {
      failures.push(`${sitemapUrl}: missing canonical ${canonicalOrigin}/page-sitemap.xml reference.`);
    }
    if (!locs.includes(`${canonicalOrigin}/image-sitemap.xml`)) {
      failures.push(`${sitemapUrl}: missing canonical ${canonicalOrigin}/image-sitemap.xml reference.`);
    }
  }

  const pageSitemap = await fetchText(pageSitemapUrl);
  if (pageSitemap.status !== 200) {
    failures.push(`${pageSitemapUrl}: expected HTTP 200, received ${pageSitemap.status}.`);
  } else {
    const contentType = String(pageSitemap.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('xml')) {
      failures.push(`${pageSitemapUrl}: expected XML content-type, found "${contentType || '[missing]'}".`);
    }
    assertXmlBasics(pageSitemapUrl, pageSitemap.body, 'urlset', failures);
    if (!/https:\/\/nh48\.info\/peak\//i.test(pageSitemap.body)) {
      failures.push(`${pageSitemapUrl}: missing /peak/ URLs.`);
    }
    if (/https:\/\/nh48\.info\/peaks\//i.test(pageSitemap.body)) {
      failures.push(`${pageSitemapUrl}: contains legacy /peaks/ URLs.`);
    }
  }

  const imageSitemap = await fetchText(imageSitemapUrl);
  if (imageSitemap.status !== 200) {
    failures.push(`${imageSitemapUrl}: expected HTTP 200, received ${imageSitemap.status}.`);
  } else {
    const contentType = String(imageSitemap.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('xml')) {
      failures.push(`${imageSitemapUrl}: expected XML content-type, found "${contentType || '[missing]'}".`);
    }
    assertXmlBasics(imageSitemapUrl, imageSitemap.body, 'urlset', failures);
    if (!/xmlns:image=["']http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1["']/i.test(imageSitemap.body)) {
      failures.push(`${imageSitemapUrl}: missing image namespace declaration.`);
    }
  }
}

async function main() {
  const failures = [];
  assertLocalFiles(failures);

  if (BASE_URL) {
    if (typeof fetch !== 'function') {
      failures.push('Global fetch is unavailable in this Node runtime.');
    } else {
      await assertLiveEndpoints(failures);
    }
  }

  if (failures.length) {
    console.error(`Crawl entrypoints audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  if (BASE_URL) {
    console.log(`Crawl entrypoints audit passed for local files + live endpoints: ${BASE_URL}`);
  } else {
    console.log('Crawl entrypoints audit passed for local file checks.');
  }
}

main().catch((error) => {
  console.error(`Crawl entrypoints audit crashed: ${error.message}`);
  process.exit(1);
});
