#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORKER_PATH = path.join(ROOT, 'worker.js');
const BASE_URL = process.env.IMAGE_CRAWL_VISIBILITY_AUDIT_URL || getArgValue('--url') || '';

const ROUTES = [
  {
    path: '/peak/mount-washington',
    minConcreteImages: 3,
    minTransformedImages: 1,
    expectPeakSource: 'prerendered',
    requireFallbackBlock: false,
    assertNoTemplateTokens: true,
  },
  {
    path: '/catalog',
    minConcreteImages: 10,
    minTransformedImages: 8,
    expectPeakSource: '',
    requireFallbackBlock: true,
    assertNoTemplateTokens: false,
  },
  {
    path: '/photos',
    minConcreteImages: 10,
    minTransformedImages: 8,
    expectPeakSource: '',
    requireFallbackBlock: true,
    assertNoTemplateTokens: false,
  },
  {
    path: '/plant-catalog',
    minConcreteImages: 1,
    minTransformedImages: 0,
    expectPeakSource: '',
    requireFallbackBlock: false,
    assertNoTemplateTokens: false,
  },
];

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return '';
  return process.argv[index + 1];
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x2026;/gi, '...')
    .replace(/&#8230;/gi, '...');
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeaningfulH1Texts(html) {
  const matches = [...String(html || '').matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  return matches
    .map((match) => stripHtml(match[1]))
    .filter((text) => text && !/^loading(?:\s*(?:\.{3}))?$/i.test(text));
}

function extractConcreteImageSrcs(html) {
  const matches = [...String(html || '').matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)];
  return matches
    .map((match) => String(match[1] || '').trim())
    .filter((src) => src && !src.startsWith('data:') && !src.includes('${'));
}

function assertLocalSourceChecks(failures) {
  if (!fs.existsSync(WORKER_PATH)) {
    failures.push(`Missing worker source file: ${path.relative(ROOT, WORKER_PATH)}`);
    return;
  }

  const workerText = fs.readFileSync(WORKER_PATH, 'utf8');
  if (!workerText.includes('function buildCrawlerImageFallbackHtml')) {
    failures.push('worker.js missing buildCrawlerImageFallbackHtml helper.');
  }
  if (!workerText.includes('injectCrawlerFallbackAfterContainer(html, \'grid\'')) {
    failures.push('worker.js missing crawler fallback injection for catalog grid.');
  }
  if (!workerText.includes('injectCrawlerFallbackAfterContainer(html, \'photos-container\'')) {
    failures.push('worker.js missing crawler fallback injection for photos container.');
  }
  if (!workerText.includes('const shouldAttemptPrerender = routeKeyword === \'peak\' && !explicitTemplateMode')) {
    failures.push('worker.js missing default prerender-first decision for peak routes.');
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'NH48-Image-Crawl-Visibility-Audit/1.0' },
  });
  const body = await response.text();
  return { status: response.status, headers: response.headers, body };
}

async function assertLiveRoute(routeConfig, failures) {
  const url = new URL(routeConfig.path, BASE_URL).toString();
  const { status, headers, body } = await fetchText(url);

  if (status !== 200) {
    failures.push(`${url}: expected HTTP 200, received ${status}.`);
    return;
  }

  const concreteImageSrcs = extractConcreteImageSrcs(body);
  const transformedImageCount = concreteImageSrcs.filter((src) => /\/cdn-cgi\/image\//i.test(src)).length;
  if (concreteImageSrcs.length < routeConfig.minConcreteImages) {
    failures.push(
      `${url}: expected at least ${routeConfig.minConcreteImages} crawl-visible <img src> URLs, found ${concreteImageSrcs.length}.`
    );
  }
  if (transformedImageCount < routeConfig.minTransformedImages) {
    failures.push(
      `${url}: expected at least ${routeConfig.minTransformedImages} transformed image URLs, found ${transformedImageCount}.`
    );
  }

  if (routeConfig.expectPeakSource) {
    const sourceHeader = String(headers.get('x-peak-source') || '').toLowerCase();
    if (sourceHeader !== routeConfig.expectPeakSource) {
      failures.push(`${url}: expected X-Peak-Source=${routeConfig.expectPeakSource}, received "${sourceHeader || '[missing]'}".`);
    }
  }

  if (routeConfig.assertNoTemplateTokens && /\$\{[^}]+\}/.test(body)) {
    failures.push(`${url}: unresolved template token pattern detected (\\$\\{...\\}).`);
  }

  if (routeConfig.path.startsWith('/peak/')) {
    const h1Texts = extractMeaningfulH1Texts(body);
    if (h1Texts.length !== 1) {
      failures.push(`${url}: expected exactly 1 meaningful <h1>, found ${h1Texts.length}.`);
    }
  }

  if (routeConfig.requireFallbackBlock && !/class=["'][^"']*\bnh48-crawl-fallback\b/i.test(body)) {
    failures.push(`${url}: expected crawl fallback block (.nh48-crawl-fallback) not found.`);
  }
}

async function main() {
  const failures = [];
  assertLocalSourceChecks(failures);

  if (BASE_URL) {
    if (typeof fetch !== 'function') {
      failures.push('Global fetch is unavailable in this Node runtime.');
    } else {
      for (const routeConfig of ROUTES) {
        // eslint-disable-next-line no-await-in-loop
        await assertLiveRoute(routeConfig, failures);
      }
    }
  }

  if (failures.length) {
    console.error(`Image crawl visibility audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  if (BASE_URL) {
    console.log(`Image crawl visibility audit passed for local source checks + ${ROUTES.length} live route checks: ${BASE_URL}`);
  } else {
    console.log('Image crawl visibility audit passed for local source checks.');
  }
}

main().catch((error) => {
  console.error(`Image crawl visibility audit crashed: ${error.message}`);
  process.exit(1);
});
