#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORKER_PATH = path.join(ROOT, 'worker.js');
const PEAK_DATA_PATH = path.join(ROOT, 'data', 'nh48.json');
const BASE_URL = process.env.PEAK_RENDER_SOURCE_AUDIT_URL || getArgValue('--url') || '';

const SAMPLE_ROUTES = [
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

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function loadPeakRoutes() {
  if (!fs.existsSync(PEAK_DATA_PATH)) {
    return SAMPLE_ROUTES;
  }

  try {
    const raw = fs.readFileSync(PEAK_DATA_PATH, 'utf8').replace(/^\uFEFF/, '');
    const payload = JSON.parse(raw);
    const peaks = Array.isArray(payload) ? payload : Object.values(payload || {});
    const slugs = Array.from(
      new Set(
        peaks
          .map((peak) => normalizeSlug(peak?.slug || peak?.slug_en || peak?.Slug || peak?.peakName || peak?.['Peak Name']))
          .filter(Boolean)
      )
    );

    if (!slugs.length) {
      return SAMPLE_ROUTES;
    }

    return slugs.flatMap((slug) => [`/peak/${slug}`, `/fr/peak/${slug}`]);
  } catch (error) {
    return SAMPLE_ROUTES;
  }
}

function routeToLocalPrerenderFile(route) {
  const match = String(route || '').match(/^\/(?:fr\/)?peak\/([^/?#]+)/i);
  if (!match) return '';
  const slug = match[1];
  const rel = route.startsWith('/fr/')
    ? path.join('fr', 'peaks', slug, 'index.html')
    : path.join('peaks', slug, 'index.html');
  return path.join(ROOT, rel);
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
  if (!workerText.includes("const shouldAttemptPrerender = routeKeyword === 'peak' && !explicitTemplateMode")) {
    failures.push('worker.js missing default prerender decision branch for /peak routes.');
  }
  if (!workerText.includes('if (shouldAttemptPrerender)')) {
    failures.push('worker.js missing prerender attempt branch for default peak requests.');
  }
  if (!workerText.includes('[PeakPrerender] Default prerender unavailable')) {
    failures.push('worker.js missing default prerender fallback warning.');
  }
  if (!workerText.includes('[PeakPrerender] Explicit prerender requested but unavailable')) {
    failures.push('worker.js missing explicit prerender fallback warning.');
  }
  if (!workerText.includes("'X-Peak-Source': 'prerendered'")) {
    failures.push("worker.js missing prerender source header 'X-Peak-Source: prerendered'.");
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
  if (!workerText.includes('nh48:season-hint')) {
    failures.push("worker.js missing nh48:season-hint meta injection.");
  }
  if (!workerText.includes("'X-Peak-Season-Hint'")) {
    failures.push("worker.js missing X-Peak-Season-Hint response header.");
  }
  if (!workerText.includes('data-season-hint')) {
    failures.push("worker.js missing body data-season-hint injection.");
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
    .filter((text) => text && !/^loading(?:\s*(?:\.{3}))?$/i.test(text));
}

function assertSeasonHintRuntime(url, headers, body, failures) {
  const seasonHeader = String(headers.get('x-peak-season-hint') || '').toLowerCase();
  if (!/^(spring|summer|fall|winter)$/.test(seasonHeader)) {
    failures.push(`${url}: missing or invalid X-Peak-Season-Hint header ("${seasonHeader || '[missing]'}").`);
  }
  const metaMatch = String(body || '').match(/<meta\b[^>]*name=["']nh48:season-hint["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  const metaSeason = metaMatch ? String(metaMatch[1] || '').toLowerCase().trim() : '';
  if (!/^(spring|summer|fall|winter)$/.test(metaSeason)) {
    failures.push(`${url}: missing or invalid <meta name=\"nh48:season-hint\"> value ("${metaSeason || '[missing]'}").`);
  }
  const bodyMatch = String(body || '').match(/<body\b[^>]*\bdata-season-hint=["']([^"']+)["'][^>]*>/i);
  const bodySeason = bodyMatch ? String(bodyMatch[1] || '').toLowerCase().trim() : '';
  if (!/^(spring|summer|fall|winter)$/.test(bodySeason)) {
    failures.push(`${url}: missing or invalid body data-season-hint value ("${bodySeason || '[missing]'}").`);
  }
}

async function assertLiveRoute(route, failures) {
  const url = new URL(route, BASE_URL).toString();
  const { status, headers, body } = await fetchText(url);
  if (status !== 200) {
    failures.push(`${url}: expected HTTP 200, received ${status}.`);
    return;
  }

  const sourceHeader = String(headers.get('x-peak-source') || '').toLowerCase();
  if (sourceHeader !== 'prerendered') {
    failures.push(`${url}: expected X-Peak-Source=prerendered, received "${sourceHeader || '[missing]'}".`);
  }
  assertSeasonHintRuntime(url, headers, body, failures);

  if (/\$\{[^}]+\}/.test(body)) {
    failures.push(`${url}: unresolved template token pattern detected (\\$\\{...\\}).`);
  }

  const h1Texts = extractMeaningfulH1Texts(body);
  if (h1Texts.length !== 1) {
    failures.push(`${url}: expected exactly 1 meaningful <h1>, found ${h1Texts.length} (${h1Texts.join(' | ') || 'none'}).`);
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
  assertSeasonHintRuntime(url, headers, body, failures);

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
  const { status, headers, body } = await fetchText(url);
  if (status !== 200) {
    failures.push(`${url}: expected HTTP 200, received ${status}.`);
    return;
  }
  const sourceHeader = String(headers.get('x-peak-source') || '').toLowerCase();
  if (!/^template-(?:forced|fallback)$/.test(sourceHeader)) {
    failures.push(`${url}: expected template source header, received "${sourceHeader || '[missing]'}".`);
  }
  assertSeasonHintRuntime(url, headers, body, failures);

  const requiredInteractiveIds = [
    'routesGrid',
    'relatedTrailsGrid',
    'parkingAccessGrid',
    'difficultyMetricsGrid',
    'riskPrepGrid',
    'wildernessSafetyGrid',
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

function assertLocalPrerenderRoutes(failures) {
  const routes = loadPeakRoutes();
  for (const route of routes) {
    const filePath = routeToLocalPrerenderFile(route);
    if (!filePath) {
      failures.push(`${route}: unable to resolve local prerender file path.`);
      continue;
    }
    if (!fs.existsSync(filePath)) {
      failures.push(`${route}: missing local prerender file ${path.relative(ROOT, filePath)}.`);
      continue;
    }
    const body = fs.readFileSync(filePath, 'utf8');
    if (/\$\{[^}]+\}/.test(body)) {
      failures.push(`${route}: unresolved template token pattern detected (\\$\\{...\\}).`);
    }
    const h1Texts = extractMeaningfulH1Texts(body);
    if (h1Texts.length !== 1) {
      failures.push(`${route}: expected exactly 1 meaningful <h1>, found ${h1Texts.length} (${h1Texts.join(' | ') || 'none'}).`);
    }
    if (!/class=["'][^"']*site-nav[^"']*["']/i.test(body)) {
      failures.push(`${route}: nav markup (.site-nav) not detected.`);
    }
    if (!/https:\/\/photos\.nh48\.info\/cdn-cgi\/image\//i.test(body)) {
      failures.push(`${route}: expected transformed image URL (/cdn-cgi/image/) not found.`);
    }
    const slugMatch = route.match(/\/(?:fr\/)?peak\/([^/?#]+)/i);
    const peakSlug = slugMatch ? slugMatch[1] : '';
    if (peakSlug) {
      const rawPeakPhotoPattern = new RegExp(`https://photos\\.nh48\\.info/${escapeRegExp(peakSlug)}/`, 'i');
      if (rawPeakPhotoPattern.test(body)) {
        failures.push(`${route}: raw full-size peak photo URL detected for slug "${peakSlug}".`);
      }
    }
  }
  return routes.length;
}

async function main() {
  const failures = [];
  assertLocalSourceChecks(failures);
  let liveRouteChecks = 0;

  if (BASE_URL) {
    if (typeof fetch !== 'function') {
      failures.push('Global fetch is unavailable in this Node runtime.');
    } else {
      const routes = loadPeakRoutes();
      for (const route of routes) {
        // eslint-disable-next-line no-await-in-loop
        await assertLiveRoute(route, failures);
        // eslint-disable-next-line no-await-in-loop
        await assertLivePrerenderRoute(route, failures);
      }
      liveRouteChecks = routes.length * 2;
      await assertTemplateOverridePath(failures);
      liveRouteChecks += 1;
    }
  } else {
    liveRouteChecks = assertLocalPrerenderRoutes(failures);
  }

  if (failures.length) {
    console.error(`Peak render source audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  if (BASE_URL) {
    console.log(`Peak render source audit passed for local source checks + ${liveRouteChecks} live route checks: ${BASE_URL}`);
  } else {
    console.log(`Peak render source audit passed for local source checks + ${liveRouteChecks} local prerender route checks.`);
  }
}

main().catch((error) => {
  console.error(`Peak render source audit crashed: ${error.message}`);
  process.exit(1);
});
