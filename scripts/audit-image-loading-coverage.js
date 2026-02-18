#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'pages');
const LARGE_THRESHOLD = 248;
const BASE_URL = getArgValue('--url') || '';
const REPORT_ONLY = process.argv.includes('--report-only');

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return '';
  return String(process.argv[index + 1] || '').trim();
}

function walkHtmlFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkHtmlFiles(full));
      return;
    }
    if (entry.isFile() && full.toLowerCase().endsWith('.html')) {
      out.push(full);
    }
  });
  return out;
}

function extractImgTags(html) {
  return [...String(html || '').matchAll(/<img\b[\s\S]*?>/gi)].map((match) => match[0]);
}

function getAttr(tag, attr) {
  const match = String(tag || '').match(new RegExp(`\\b${attr}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? match[1].trim() : '';
}

function parsePx(styleText, prop) {
  const match = String(styleText || '').match(new RegExp(`${prop}\\s*:\\s*([0-9.]+)px`, 'i'));
  if (!match) return 0;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasPercent(styleText, prop) {
  const match = String(styleText || '').match(new RegExp(`${prop}\\s*:\\s*([0-9.]+)%`, 'i'));
  if (!match) return false;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) && parsed >= 50;
}

function hasLargeSignal(tag) {
  const width = Number.parseFloat(getAttr(tag, 'width') || '0');
  const height = Number.parseFloat(getAttr(tag, 'height') || '0');
  if (Number.isFinite(width) && width >= LARGE_THRESHOLD) return true;
  if (Number.isFinite(height) && height >= LARGE_THRESHOLD) return true;

  const style = getAttr(tag, 'style');
  const stylePxMax = Math.max(
    parsePx(style, 'width'),
    parsePx(style, 'height'),
    parsePx(style, 'max-width'),
    parsePx(style, 'max-height'),
    parsePx(style, 'min-width'),
    parsePx(style, 'min-height')
  );
  if (stylePxMax >= LARGE_THRESHOLD) return true;
  if (hasPercent(style, 'width') || hasPercent(style, 'height')) return true;

  const classAttr = getAttr(tag, 'class');
  const idAttr = getAttr(tag, 'id');
  const srcAttr = getAttr(tag, 'src');
  const blob = `${classAttr} ${idAttr} ${srcAttr}`.toLowerCase();
  return /(hero|banner|cover|gallery|carousel|dataset-card-image|print-thumb|flowchart|photo|media)/.test(blob);
}

function isHeroSignal(tag) {
  const dataHero = getAttr(tag, 'data-nh48-hero').toLowerCase();
  if (dataHero === 'true') return true;
  const loading = getAttr(tag, 'loading').toLowerCase();
  if (loading === 'eager') return true;
  const fetchPriority = getAttr(tag, 'fetchpriority').toLowerCase();
  if (fetchPriority === 'high') return true;
  const classAttr = getAttr(tag, 'class');
  const idAttr = getAttr(tag, 'id');
  const blob = `${classAttr} ${idAttr}`.toLowerCase();
  return /(hero|banner|masthead|cover)/.test(blob);
}

function staticAudit(failures, warnings) {
  const files = walkHtmlFiles(PAGES_DIR);
  const stats = {
    files: files.length,
    imgTags: 0,
    largeCandidates: 0,
  };

  files.forEach((file) => {
    const rel = path.relative(ROOT, file);
    const html = fs.readFileSync(file, 'utf8');
    const tags = extractImgTags(html);
    stats.imgTags += tags.length;

    tags.forEach((tag) => {
      if (!hasLargeSignal(tag)) return;
      stats.largeCandidates += 1;

      const loading = getAttr(tag, 'loading').toLowerCase();
      const decoding = getAttr(tag, 'decoding').toLowerCase();
      const lazyOptOut = getAttr(tag, 'data-nh48-lazy').toLowerCase() === 'off';

      if (!decoding) {
        failures.push(`${rel}: large image missing decoding attribute.`);
      }

      if (!loading && !isHeroSignal(tag) && !lazyOptOut) {
        failures.push(`${rel}: non-hero large image missing loading attribute.`);
      }
      if (loading && !['lazy', 'eager', 'auto'].includes(loading)) {
        warnings.push(`${rel}: unexpected loading value "${loading}".`);
      }
      if (decoding && !['async', 'sync', 'auto'].includes(decoding)) {
        warnings.push(`${rel}: unexpected decoding value "${decoding}".`);
      }
    });
  });

  return stats;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'NH48-Image-Loading-Audit/1.0' } });
  const body = await response.text();
  return { status: response.status, body, url: response.url || url };
}

async function liveAudit(failures) {
  const origin = new URL(BASE_URL).origin;
  const routes = ['/', '/photos', '/catalog', '/plant-catalog', '/plant/alpine-bilberry', '/trails', '/wiki/diseases'];

  for (const route of routes) {
    const url = `${origin}${route}`;
    const response = await fetchText(url);
    if (response.status !== 200) {
      failures.push(`${url}: expected HTTP 200, received ${response.status}.`);
      continue;
    }
    if (!/\/js\/image-loading-core\.js/i.test(response.body)) {
      failures.push(`${url}: missing /js/image-loading-core.js injection.`);
    }
    if (!/\/css\/image-loading-core\.css/i.test(response.body)) {
      failures.push(`${url}: missing /css/image-loading-core.css injection.`);
    }
  }
}

async function main() {
  const failures = [];
  const warnings = [];
  const stats = staticAudit(failures, warnings);

  if (BASE_URL) {
    if (typeof fetch !== 'function') {
      failures.push('Global fetch is unavailable in this Node runtime.');
    } else {
      await liveAudit(failures);
    }
  }

  warnings.forEach((warning) => console.warn(`WARN: ${warning}`));

  if (failures.length) {
    console.error(`Image loading coverage audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    if (!REPORT_ONLY) {
      process.exit(1);
    }
  }

  const liveLabel = BASE_URL ? ` + live checks (${new URL(BASE_URL).origin})` : '';
  const summary = `Image loading coverage audit completed${liveLabel}. Files: ${stats.files}, <img> tags: ${stats.imgTags}, large candidates: ${stats.largeCandidates}, failures: ${failures.length}.`;
  if (REPORT_ONLY && failures.length) {
    console.log(`REPORT ONLY: ${summary}`);
  } else {
    console.log(summary);
  }
}

main().catch((error) => {
  console.error(`Image loading coverage audit crashed: ${error.message}`);
  process.exit(1);
});
