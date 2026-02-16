#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITEMAP_PATH = path.join(ROOT, 'page-sitemap.xml');
const MANIFEST_PATH = path.join(ROOT, 'data', 'og-cards.json');
const MAX_OG_BYTES = 500 * 1024;
const EXPECTED_WIDTH = 1200;
const EXPECTED_HEIGHT = 630;

function getArgValue(flag, fallback = '') {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

function toPositiveInt(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
}

function normalizeRoutePath(input) {
  const raw = String(input || '').trim();
  if (!raw) return '/';
  let pathValue = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      pathValue = new URL(raw).pathname || '/';
    } catch (_) {
      pathValue = raw;
    }
  }
  if (!pathValue.startsWith('/')) {
    pathValue = `/${pathValue}`;
  }
  pathValue = pathValue.replace(/\/{2,}/g, '/');
  if (pathValue.length > 1 && pathValue.endsWith('/')) {
    pathValue = pathValue.slice(0, -1);
  }
  return pathValue || '/';
}

function parseSitemapRoutes(xmlText) {
  const routes = [];
  const regex = /<loc>([^<]+)<\/loc>/gi;
  let match;
  while ((match = regex.exec(xmlText)) !== null) {
    const route = normalizeRoutePath(match[1]);
    if (/^\/(?:fr\/)?trails\/[^/]+\/sections\/[^/]+\/?$/i.test(route)) {
      continue;
    }
    routes.push(route);
  }
  return routes;
}

function readExpectedRoutes() {
  const xmlText = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const routes = parseSitemapRoutes(xmlText);
  routes.push('/nh48-planner.html');
  const unique = [];
  const seen = new Set();
  routes.forEach((route) => {
    if (!seen.has(route)) {
      seen.add(route);
      unique.push(route);
    }
  });
  return unique;
}

function inspectPngDimensions(buffer) {
  const pngSig = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== pngSig) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function inspectJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 4 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    if (offset + 4 >= buffer.length) break;
    const blockLength = buffer.readUInt16BE(offset + 2);
    if (blockLength < 2) break;
    if (sofMarkers.has(marker)) {
      if (offset + 9 >= buffer.length) break;
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + blockLength;
  }
  return null;
}

function inspectImageDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  return inspectJpegDimensions(buffer) || inspectPngDimensions(buffer);
}

function parseMetaTagContent(htmlText, key, attrName) {
  const regex = /<meta\b[^>]*>/gi;
  let match;
  while ((match = regex.exec(htmlText)) !== null) {
    const tag = match[0];
    const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
    const attrs = {};
    let attrMatch;
    while ((attrMatch = attrRegex.exec(tag)) !== null) {
      const attrKey = String(attrMatch[1] || '').toLowerCase();
      const attrValue = attrMatch[3] || attrMatch[4] || '';
      attrs[attrKey] = attrValue;
    }
    if ((attrs[attrName] || '').toLowerCase() === key.toLowerCase()) {
      return String(attrs.content || '').trim();
    }
  }
  return '';
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'NH48-OG-Audit/1.0' },
  });
  const text = await response.text();
  return { status: response.status, text };
}

async function runLiveMetaChecks(baseUrl, routes, issues) {
  const representative = [
    '/peak/mount-washington',
    '/range/presidential-range',
    '/trails/appalachian-trail',
    '/plant/alpine-bilberry',
    '/wiki/plants/labrador-tea',
    '/dataset/long-trails',
    '/photos/',
    '/nh48-planner.html',
  ];
  for (const route of representative) {
    const resolvedRoute = routes.includes(normalizeRoutePath(route))
      ? route
      : normalizeRoutePath(route);
    const url = `${baseUrl.replace(/\/+$/, '')}${resolvedRoute}`;
    let response;
    try {
      response = await fetchText(url);
    } catch (error) {
      issues.push(`Live meta fetch failed for ${url}: ${error.message}`);
      continue;
    }
    if (response.status !== 200) {
      issues.push(`Live meta fetch returned HTTP ${response.status} for ${url}`);
      continue;
    }
    const ogImage = parseMetaTagContent(response.text, 'og:image', 'property');
    const twitterImage = parseMetaTagContent(response.text, 'twitter:image', 'name');
    const ogAlt = parseMetaTagContent(response.text, 'og:image:alt', 'property');
    const twitterAlt = parseMetaTagContent(response.text, 'twitter:image:alt', 'name');

    if (!ogImage.includes('/photos/og/')) {
      issues.push(`Live route missing manifest OG image URL (${url}): ${ogImage || '[missing]'}`);
    }
    if (!twitterImage.includes('/photos/og/')) {
      issues.push(`Live route missing manifest Twitter image URL (${url}): ${twitterImage || '[missing]'}`);
    }
    if (!ogAlt) {
      issues.push(`Live route missing og:image:alt (${url})`);
    }
    if (!twitterAlt) {
      issues.push(`Live route missing twitter:image:alt (${url})`);
    }
  }
}

async function main() {
  const sampleSize = toPositiveInt(getArgValue('--sample', '30'), 30);
  const baseUrl = getArgValue('--url', '');
  const issues = [];

  if (!fs.existsSync(SITEMAP_PATH)) {
    issues.push(`Missing sitemap file: ${path.relative(ROOT, SITEMAP_PATH)}`);
  }
  if (!fs.existsSync(MANIFEST_PATH)) {
    issues.push(`Missing OG manifest: ${path.relative(ROOT, MANIFEST_PATH)}`);
  }
  if (issues.length) {
    issues.forEach((line) => console.error(`- ${line}`));
    process.exit(1);
  }

  const expectedRoutes = readExpectedRoutes();
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const cards = manifest && typeof manifest.cards === 'object' ? manifest.cards : null;
  if (!cards) {
    issues.push('Manifest missing cards object.');
  }
  if (!manifest.generatedAt || !manifest.version) {
    issues.push('Manifest missing generatedAt or version.');
  }

  const uniqueImageFiles = new Set();

  expectedRoutes.forEach((route) => {
    const entry = cards ? cards[route] : null;
    if (!entry || typeof entry !== 'object') {
      issues.push(`Manifest missing route entry: ${route}`);
      return;
    }
    const image = String(entry.image || '').trim();
    const imageAlt = String(entry.imageAlt || '').trim();
    const hash = String(entry.hash || '').trim();
    if (!image.includes('/photos/og/')) {
      issues.push(`Route ${route} does not point to /photos/og/: ${image || '[missing]'}`);
    }
    if (!/\?v=[a-f0-9]{6,}/i.test(image)) {
      issues.push(`Route ${route} image URL missing cache-busting hash: ${image || '[missing]'}`);
    }
    if (!imageAlt) {
      issues.push(`Route ${route} missing imageAlt.`);
    }
    if (!hash) {
      issues.push(`Route ${route} missing hash.`);
    }
    try {
      const imageUrl = new URL(image);
      const localPath = path.join(ROOT, imageUrl.pathname.replace(/^\/+/, ''));
      uniqueImageFiles.add(localPath);
    } catch (error) {
      issues.push(`Route ${route} has invalid image URL: ${image}`);
    }
  });

  const sortedFiles = Array.from(uniqueImageFiles).sort((a, b) => a.localeCompare(b));
  sortedFiles.forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      issues.push(`Missing generated OG image file: ${path.relative(ROOT, filePath)}`);
    }
  });

  const sampledFiles = sortedFiles.slice(0, sampleSize);
  sampledFiles.forEach((filePath) => {
    if (!fs.existsSync(filePath)) return;
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_OG_BYTES) {
      issues.push(`OG image exceeds ${MAX_OG_BYTES} bytes: ${path.relative(ROOT, filePath)} (${stats.size})`);
    }
    const dimensions = inspectImageDimensions(filePath);
    if (!dimensions) {
      issues.push(`Could not read image dimensions: ${path.relative(ROOT, filePath)}`);
      return;
    }
    if (dimensions.width !== EXPECTED_WIDTH || dimensions.height !== EXPECTED_HEIGHT) {
      issues.push(
        `OG image has invalid dimensions ${dimensions.width}x${dimensions.height}: ${path.relative(ROOT, filePath)}`
      );
    }
  });

  if (baseUrl) {
    await runLiveMetaChecks(baseUrl, expectedRoutes, issues);
  }

  if (issues.length) {
    console.error(`OG cards audit failed with ${issues.length} issue(s).`);
    issues.forEach((line) => console.error(`- ${line}`));
    process.exit(1);
  }

  console.log(
    `OG cards audit passed. Routes checked: ${expectedRoutes.length}, unique images: ${sortedFiles.length}, sampled images: ${sampledFiles.length}.`
  );
}

main().catch((error) => {
  console.error(`OG cards audit crashed: ${error.message}`);
  process.exit(1);
});
