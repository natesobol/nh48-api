#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORKER_PATH = path.join(ROOT, 'worker.js');
const BASE_URL = process.env.PEAK_RENDER_SOURCE_AUDIT_URL || getArgValue('--url') || '';

const ROUTES = [
  '/peak/mount-washington',
  '/peak/mount-isolation',
  '/fr/peak/mount-washington',
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

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertLocalSourceChecks(failures) {
  if (!fs.existsSync(WORKER_PATH)) {
    failures.push(`Missing worker source file: ${path.relative(ROOT, WORKER_PATH)}`);
    return;
  }

  const workerText = fs.readFileSync(WORKER_PATH, 'utf8');

  if (!workerText.includes("const explicitTemplateMode = routeKeyword === 'peak'")) {
    failures.push('worker.js missing explicitTemplateMode route switch.');
  }
  if (!workerText.includes("['template', 'interactive'].includes(renderParam)")) {
    failures.push('worker.js missing explicit render=template|interactive override handling.');
  }
  if (!workerText.includes("if (routeKeyword === 'peak' && explicitPrerenderMode && !explicitTemplateMode)")) {
    failures.push('worker.js missing explicit prerender branch for /peak routes.');
  }
  if (!workerText.includes("'X-Peak-Source': 'prerendered'")) {
    failures.push("worker.js missing prerender source header 'X-Peak-Source: prerendered'.");
  }
  if (!workerText.includes("'template-default'")) {
    failures.push("worker.js missing template-default source mode.");
  }
  if (!workerText.includes("'template-forced'")) {
    failures.push("worker.js missing template-forced source mode.");
  }
  if (!workerText.includes("'template-fallback'")) {
    failures.push("worker.js missing template-fallback source mode.");
  }
  if (!workerText.includes("'X-Peak-Source': templateSourceHeader")) {
    failures.push("worker.js missing template response source header.");
  }
  if (!workerText.includes('function applyPeakTemplateImageTransforms')) {
    failures.push('worker.js missing template image transform hardening helper.');
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'NH48-Peak-Render-Source-Audit/1.0' },
  });
  const body = await response.text();
  return { status: response.status, headers: response.headers, body };
}

function extractMeaningfulH1Texts(html) {
  const matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  return matches
    .map((match) => stripHtml(match[1]))
    .filter((text) => text && !/^loading(?:\s*(?:\.{3}|…))?$/i.test(text));
}

async function assertLiveRoute(route, failures) {
  const url = new URL(route, BASE_URL).toString();
  const { status, headers, body } = await fetchText(url);
  if (status !== 200) {
    failures.push(`${url}: expected HTTP 200, received ${status}.`);
    return;
  }

  const sourceHeader = String(headers.get('x-peak-source') || '').toLowerCase();
  if (sourceHeader !== 'template-default') {
    failures.push(`${url}: expected X-Peak-Source=template-default, received "${sourceHeader || '[missing]'}".`);
  }

  if (/\$\{[^}]+\}/.test(body)) {
    failures.push(`${url}: unresolved template token pattern detected (\\$\\{...\\}).`);
  }

  const requiredInteractiveIds = [
    'routesGrid',
    'relatedTrailsGrid',
    'parkingAccessGrid',
    'difficultyMetricsGrid',
    'riskPrepGrid',
    'monthlyWeatherPanel',
    'panelReaderModal'
  ];
  requiredInteractiveIds.forEach((id) => {
    const pattern = new RegExp(`id=["']${escapeRegExp(id)}["']`, 'i');
    if (!pattern.test(body)) {
      failures.push(`${url}: missing interactive marker #${id}.`);
    }
  });
}

async function assertLivePrerenderRoute(route, failures) {
  const prerenderUrl = new URL(route, BASE_URL);
  prerenderUrl.searchParams.set('render', 'prerender');
  const url = prerenderUrl.toString();
  const { status, headers, body } = await fetchText(url);
  if (status !== 200) {
    failures.push(`${url}: expected HTTP 200, received ${status}.`);
    return;
  }

  const sourceHeader = String(headers.get('x-peak-source') || '').toLowerCase();
  if (sourceHeader !== 'prerendered') {
    failures.push(`${url}: expected X-Peak-Source=prerendered, received "${sourceHeader || '[missing]'}".`);
  }

  const h1Texts = extractMeaningfulH1Texts(body);
  if (h1Texts.length !== 1) {
    failures.push(`${url}: expected exactly 1 meaningful <h1>, found ${h1Texts.length} (${h1Texts.join(' | ') || 'none'}).`);
  }

  if (/\$\{[^}]+\}/.test(body)) {
    failures.push(`${url}: unresolved template token pattern detected (\\$\\{...\\}).`);
  }

  if (!/https:\/\/photos\.nh48\.info\/cdn-cgi\/image\//i.test(body)) {
    failures.push(`${url}: expected transformed image URL (/cdn-cgi/image/) not found.`);
  }

  const slugMatch = route.match(/\/(?:fr\/)?peak\/([^/?#]+)/i);
  const peakSlug = slugMatch ? slugMatch[1] : '';
  if (peakSlug) {
    const rawPeakPhotoPattern = new RegExp(`https://photos\\.nh48\\.info/${escapeRegExp(peakSlug)}/`, 'i');
    if (rawPeakPhotoPattern.test(body)) {
      failures.push(`${url}: raw full-size peak photo URL detected for slug "${peakSlug}".`);
    }
  }
}

async function assertTemplateOverridePath(failures) {
  const url = new URL('/peak/mount-washington?render=template', BASE_URL).toString();
  const { status, headers } = await fetchText(url);
  if (status !== 200) {
    failures.push(`${url}: expected HTTP 200, received ${status}.`);
    return;
  }
  const sourceHeader = String(headers.get('x-peak-source') || '').toLowerCase();
  if (!/^template-(?:forced|fallback)$/.test(sourceHeader)) {
    failures.push(`${url}: expected template source header, received "${sourceHeader || '[missing]'}".`);
  }
}

async function main() {
  const failures = [];
  assertLocalSourceChecks(failures);

  if (BASE_URL) {
    if (typeof fetch !== 'function') {
      failures.push('Global fetch is unavailable in this Node runtime.');
    } else {
      for (const route of ROUTES) {
        // eslint-disable-next-line no-await-in-loop
        await assertLiveRoute(route, failures);
        // eslint-disable-next-line no-await-in-loop
        await assertLivePrerenderRoute(route, failures);
      }
      await assertTemplateOverridePath(failures);
    }
  }

  if (failures.length) {
    console.error(`Peak render source audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  if (BASE_URL) {
    console.log(`Peak render source audit passed for local source checks + ${ROUTES.length * 2 + 1} live route checks: ${BASE_URL}`);
  } else {
    console.log('Peak render source audit passed for local source checks.');
  }
}

main().catch((error) => {
  console.error(`Peak render source audit crashed: ${error.message}`);
  process.exit(1);
});
