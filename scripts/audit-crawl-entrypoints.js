#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ROBOTS_PATH = path.join(ROOT, 'robots.txt');
const SITEMAP_INDEX_PATH = path.join(ROOT, 'sitemap.xml');
const PAGE_SITEMAP_PATH = path.join(ROOT, 'page-sitemap.xml');
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

function assertLocalFiles(failures) {
  const robotsText = readLocal(ROBOTS_PATH, 'robots.txt', failures);
  const sitemapIndexText = readLocal(SITEMAP_INDEX_PATH, 'sitemap.xml', failures);
  const pageSitemapText = readLocal(PAGE_SITEMAP_PATH, 'page-sitemap.xml', failures);

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
    if (!/<sitemapindex\b/i.test(sitemapIndexText)) {
      failures.push('sitemap.xml is not a sitemapindex document.');
    }
    if (!/https:\/\/nh48\.info\/page-sitemap\.xml/i.test(sitemapIndexText)) {
      failures.push('sitemap.xml missing page-sitemap.xml reference.');
    }
    if (!/https:\/\/nh48\.info\/image-sitemap\.xml/i.test(sitemapIndexText)) {
      failures.push('sitemap.xml missing image-sitemap.xml reference.');
    }
  }

  if (pageSitemapText) {
    if (!/https:\/\/nh48\.info\/peak\//i.test(pageSitemapText)) {
      failures.push('page-sitemap.xml missing /peak/ URLs.');
    }
    if (/https:\/\/nh48\.info\/peaks\//i.test(pageSitemapText)) {
      failures.push('page-sitemap.xml contains legacy /peaks/ URLs.');
    }
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'NH48-Crawl-Entry-Audit/1.0' },
  });
  const body = await response.text();
  return { status: response.status, headers: response.headers, body };
}

async function assertLiveEndpoints(failures) {
  const origin = new URL(BASE_URL).origin;
  const robotsUrl = `${origin}/robots.txt`;
  const sitemapUrl = `${origin}/sitemap.xml`;
  const pageSitemapUrl = `${origin}/page-sitemap.xml`;

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
    if (!/<sitemapindex\b/i.test(sitemapIndex.body)) {
      failures.push(`${sitemapUrl}: expected <sitemapindex> root.`);
    }
    if (!/\/page-sitemap\.xml/i.test(sitemapIndex.body)) {
      failures.push(`${sitemapUrl}: missing page-sitemap.xml reference.`);
    }
    if (!/\/image-sitemap\.xml/i.test(sitemapIndex.body)) {
      failures.push(`${sitemapUrl}: missing image-sitemap.xml reference.`);
    }
  }

  const pageSitemap = await fetchText(pageSitemapUrl);
  if (pageSitemap.status !== 200) {
    failures.push(`${pageSitemapUrl}: expected HTTP 200, received ${pageSitemap.status}.`);
  } else {
    if (!/https:\/\/nh48\.info\/peak\//i.test(pageSitemap.body)) {
      failures.push(`${pageSitemapUrl}: missing /peak/ URLs.`);
    }
    if (/https:\/\/nh48\.info\/peaks\//i.test(pageSitemap.body)) {
      failures.push(`${pageSitemapUrl}: contains legacy /peaks/ URLs.`);
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

