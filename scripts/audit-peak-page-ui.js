#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'pages', 'nh48_peak.html');
const RUNTIME_MODULE_PATH = path.join(ROOT, 'js', 'peak-detail-runtime.js');
const PEAK_STYLESHEET_PATH = path.join(ROOT, 'css', 'peak-detail.css');
const PEAK_DATA_PATH = path.join(ROOT, 'data', 'nh48.json');
const BASE_URL = process.env.PEAK_UI_AUDIT_URL || getArgValue('--url') || '';

const SAMPLE_ROUTES = [
  '/peak/mount-washington',
  '/peak/mount-isolation',
  '/fr/peak/mount-washington'
];

const REQUIRED_HERO_IDS = ['printBtn', 'shareBtn', 'unitsSelect', 'getDirectionsBtn'];
const REQUIRED_PANEL_IDS = [
  'routesGrid',
  'relatedTrailsGrid',
  'parkingAccessGrid',
  'difficultyMetricsGrid',
  'riskPrepGrid',
  'wildernessSafetyGrid',
  'monthlyWeatherPanel',
  'monthlyWeatherMonthSelect',
  'panelReaderModal',
  'panelReaderContent'
];
const REQUIRED_RICH_IDS = [
  'peakDescriptionPanel',
  'generalInfoPanel',
  'photoMetadataPanel',
  'peakMapPanel',
  'peakMap',
  'peakMapStatus',
  'terrainGrid',
  'conditionsGrid',
  'trailTestedNotesPanel',
  'trailTestedNotesGrid',
  'socialCardModal',
  'socialCardContainer',
  'panelReaderScale',
  'panelReaderClose'
];
const REQUIRED_PEAK_RUNTIME_ASSETS = [
  { label: 'Leaflet stylesheet', regex: /href=["']https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.css["']/i },
  { label: 'Peak detail stylesheet', regex: /href=["']\/css\/peak-detail\.css(?:\?[^"']*)?["']/i },
  { label: 'Tooltip stylesheet', regex: /href=["']\/css\/ui-tooltips\.css(?:\?[^"']*)?["']/i },
  { label: 'Leaflet script', regex: /src=["']https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js["']/i },
  { label: 'Tooltip script', regex: /src=["']\/js\/ui-tooltips\.js(?:\?[^"']*)?["']/i },
  { label: 'Peak runtime module', regex: /src=["']\/js\/peak-detail-runtime\.js(?:\?[^"']*)?["']/i }
];
const REQUIRED_FAVICON_LINKS = [
  {
    label: 'favicon 48',
    regex: /<link\b[^>]*rel=["']icon["'][^>]*href=["']https:\/\/nh48\.info\/favicon\.png["'][^>]*sizes=["']48x48["'][^>]*type=["']image\/png["'][^>]*>/i
  },
  {
    label: 'icon 192',
    regex: /<link\b[^>]*rel=["']icon["'][^>]*href=["']https:\/\/nh48\.info\/icon-192\.png["'][^>]*sizes=["']192x192["'][^>]*type=["']image\/png["'][^>]*>/i
  },
  {
    label: 'apple touch icon',
    regex: /<link\b[^>]*rel=["']apple-touch-icon["'][^>]*href=["']https:\/\/nh48\.info\/apple-touch-icon\.png["'][^>]*>/i
  },
  {
    label: 'favicon ico fallback',
    regex: /<link\b[^>]*rel=["']icon["'][^>]*href=["']https:\/\/nh48\.info\/favicon\.ico["'][^>]*sizes=["']any["'][^>]*type=["']image\/x-icon["'][^>]*>/i
  },
  {
    label: 'manifest',
    regex: /<link\b[^>]*rel=["']manifest["'][^>]*href=["']\/manifest\.json["'][^>]*>/i
  }
];

function countRuleMatches(content, ruleRegex) {
  const regex = new RegExp(ruleRegex.source, 'gi');
  const matches = String(content || '').match(regex);
  return matches ? matches.length : 0;
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return '';
  return process.argv[index + 1];
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
    ).sort();

    if (!slugs.length) {
      return SAMPLE_ROUTES;
    }

    return slugs.flatMap((slug) => [`/peak/${slug}`, `/fr/peak/${slug}`]);
  } catch {
    return SAMPLE_ROUTES;
  }
}

function assertIncludes(content, needle, message, failures) {
  if (!content.includes(needle)) {
    failures.push(message);
  }
}

function extractHead(content) {
  const match = String(content || '').match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  return match ? match[1] : '';
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

function runTemplateChecks() {
  const failures = [];
  if (!fs.existsSync(TEMPLATE_PATH)) {
    failures.push(`Missing template: ${path.relative(ROOT, TEMPLATE_PATH)}`);
    return failures;
  }

  const html = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const head = extractHead(html);
  if (!head) {
    failures.push('Template missing <head> section.');
  } else {
    if (/\/favicons\//i.test(head)) {
      failures.push('Template uses legacy /favicons/ links instead of canonical favicon contract.');
    }
    REQUIRED_FAVICON_LINKS.forEach((rule) => {
      const count = countRuleMatches(head, rule.regex);
      if (count !== 1) {
        failures.push(`Template expected exactly one favicon contract link (${rule.label}), found ${count}.`);
      }
    });
  }
  assertIncludes(html, 'id="nav-placeholder"', 'Template missing #nav-placeholder for worker nav injection', failures);
  assertIncludes(html, 'id="getDirectionsBtn"', 'Template missing hero Get Directions button', failures);
  assertIncludes(html, 'id="trailsHubSection"', 'Template missing unified trails section container', failures);
  assertIncludes(html, 'id="relatedTrailsGrid"', 'Template missing Related Trails grid', failures);
  assertIncludes(html, 'id="parkingAccessGrid"', 'Template missing Parking & Access panel/grid', failures);
  assertIncludes(html, 'id="difficultyMetricsGrid"', 'Template missing Difficulty Metrics panel/grid', failures);
  assertIncludes(html, 'id="riskPrepGrid"', 'Template missing Risk & Preparation panel/grid', failures);
  assertIncludes(html, 'id="wildernessSafetyGrid"', 'Template missing Wilderness Safety panel/grid', failures);
  assertIncludes(html, 'id="monthlyWeatherPanel"', 'Template missing Monthly Weather panel section', failures);
  assertIncludes(html, 'id="monthlyWeatherMonthSelect"', 'Template missing monthly weather month selector', failures);
  assertIncludes(html, 'id="panelReaderModal"', 'Template missing panel reader modal', failures);
  assertIncludes(html, 'id="panelReaderScale"', 'Template missing panel reader scale control', failures);
  assertIncludes(html, 'id="panelReaderClose"', 'Template missing panel reader close control', failures);

  REQUIRED_RICH_IDS.forEach((id) => {
    assertIncludes(html, `id="${id}"`, `Template missing rich-runtime container #${id}`, failures);
  });

  if (!/src=["']\/js\/peak-detail-runtime\.js["']/i.test(html)) {
    failures.push('Template missing shared peak runtime module include (/js/peak-detail-runtime.js).');
  }

  let runtimeSource = '';
  if (!fs.existsSync(PEAK_STYLESHEET_PATH)) {
    failures.push(`Missing stylesheet: ${path.relative(ROOT, PEAK_STYLESHEET_PATH)}`);
  } else {
    const css = fs.readFileSync(PEAK_STYLESHEET_PATH, 'utf8');
    if (css.length < 5000) {
      failures.push(`Peak stylesheet appears truncated (${path.relative(ROOT, PEAK_STYLESHEET_PATH)} is only ${css.length} bytes).`);
    }
    ['.wrap', '.peak-hero', '.info-grid', '.media', '.peak-map-panel'].forEach((selector) => {
      if (!css.includes(selector)) {
        failures.push(`Peak stylesheet missing core selector ${selector}.`);
      }
    });
  }
  if (!fs.existsSync(RUNTIME_MODULE_PATH)) {
    failures.push(`Missing runtime module: ${path.relative(ROOT, RUNTIME_MODULE_PATH)}`);
  } else {
    runtimeSource = fs.readFileSync(RUNTIME_MODULE_PATH, 'utf8');
    if (!/function\s+renderRelatedTrails\s*\(/i.test(runtimeSource)) {
      failures.push('Runtime module missing renderRelatedTrails() implementation.');
    }
    const renderRoutesBody = extractFunctionBody(runtimeSource, 'renderRoutes');
    if (!renderRoutesBody || !/routes\.forEach\s*\(/i.test(renderRoutesBody)) {
      failures.push('Runtime renderRoutes() does not iterate all routes with routes.forEach.');
    }
    if (/\.\s*slice\s*\(/i.test(renderRoutesBody)) {
      failures.push('Runtime renderRoutes() appears to slice/truncate routes.');
    }
    if (!/function\s+renderMonthlyWeatherPanel\s*\(/i.test(runtimeSource)) {
      failures.push('Runtime module missing renderMonthlyWeatherPanel() implementation.');
    }
    if (!/window\.NH48PeakRuntime\s*=/.test(runtimeSource) || !/NH48PeakRuntime\.init\s*=/.test(runtimeSource)) {
      failures.push('Runtime module missing NH48PeakRuntime.init() exposure.');
    }
    if (!/overviewExpandBtn/.test(runtimeSource)) {
      failures.push('Runtime module missing overview expand control hook.');
    }
  }
  if (!/js\/ui-tooltips\.js/i.test(html)) {
    failures.push('Template missing shared tooltip module include (/js/ui-tooltips.js).');
  }
  if (!/css\/ui-tooltips\.css/i.test(html)) {
    failures.push('Template missing shared tooltip stylesheet include (/css/ui-tooltips.css).');
  }
  if (!/NH48Tooltips\s*\.\s*init\s*\(/i.test(runtimeSource)) {
    failures.push('Runtime module missing NH48Tooltips.init() integration.');
  }
  if (!/monthlyWeatherMonthSelect\s*:\s*['"]common\.tooltips\.monthDropdown['"]/i.test(runtimeSource)) {
    failures.push('Runtime module missing monthly weather tooltip override mapping.');
  }
  if (!/is-desc-accessibility/i.test(runtimeSource)) {
    failures.push('Runtime module missing desc/accessibility row exception classes.');
  }
  ['peak.generalInfo.typicalTime', 'peak.generalInfo.bestSeasons', 'peak.generalInfo.waterAvailability', 'peak.generalInfo.cellReception'].forEach((key) => {
    if (!runtimeSource.includes(key)) {
      failures.push(`Runtime module missing General Info quick fact key reference: ${key}`);
    }
  });
  const directionsBody = extractFunctionBody(runtimeSource, 'updateDirectionsButton');
  if (!/aria-disabled/i.test(directionsBody)) {
    failures.push('Runtime updateDirectionsButton() does not expose disabled state logic.');
  }
  if (!/Parking location unavailable|stationnement indisponible/i.test(runtimeSource)) {
    failures.push('Runtime module missing disabled-directions messaging.');
  }

  return failures;
}

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'NH48-Peak-UI-Audit/1.0'
    }
  });
  const body = await response.text();
  return { status: response.status, body };
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

function assertRouteUiMarkers(body, label, failures) {
  const head = extractHead(body);
  if (!head) {
    failures.push(`${label}: missing <head> section.`);
  } else {
    if (/\/favicons\//i.test(head)) {
      failures.push(`${label}: head contains legacy /favicons/ link(s).`);
    }
    REQUIRED_FAVICON_LINKS.forEach((rule) => {
      const count = countRuleMatches(head, rule.regex);
      if (count !== 1) {
        failures.push(`${label}: expected exactly one favicon contract link (${rule.label}), found ${count}.`);
      }
    });
  }

  const hasInjectedNav = /class=["'][^"']*site-nav[^"']*["']/i.test(body);
  const hasNavPlaceholder = /id=["']nav-placeholder["']/i.test(body);
  if (!hasInjectedNav && !hasNavPlaceholder) {
    failures.push(`${label}: nav markup (.site-nav) or #nav-placeholder not detected`);
  }

  REQUIRED_PEAK_RUNTIME_ASSETS.forEach((asset) => {
    if (!asset.regex.test(body)) {
      failures.push(`${label}: missing peak runtime asset (${asset.label}).`);
    }
  });

  REQUIRED_HERO_IDS.forEach((id) => {
    if (!new RegExp(`id=["']${id}["']`, 'i').test(body)) {
      failures.push(`${label}: missing hero tool #${id}`);
    }
  });

  REQUIRED_PANEL_IDS.forEach((id) => {
    if (!new RegExp(`id=["']${id}["']`, 'i').test(body)) {
      failures.push(`${label}: missing required panel/grid #${id}`);
    }
  });

  REQUIRED_RICH_IDS.forEach((id) => {
    if (!new RegExp(`id=["']${id}["']`, 'i').test(body)) {
      failures.push(`${label}: missing rich runtime container #${id}`);
    }
  });

  const h1Texts = extractMeaningfulH1Texts(body);
  if (h1Texts.length !== 1) {
    failures.push(`${label}: expected exactly 1 meaningful <h1>, found ${h1Texts.length} (${h1Texts.join(' | ') || 'none'}).`);
  }
}

function routeToLocalPrerenderFile(route) {
  const match = route.match(/^\/(?:fr\/)?peak\/([^/?#]+)/i);
  if (!match) return '';
  const slug = match[1];
  const rel = route.startsWith('/fr/')
    ? path.join('fr', 'peaks', slug, 'index.html')
    : path.join('peaks', slug, 'index.html');
  return path.join(ROOT, rel);
}

function runLocalPrerenderChecks() {
  const failures = [];
  const routes = loadPeakRoutes();
  for (const route of routes) {
    const filePath = routeToLocalPrerenderFile(route);
    if (!filePath) {
      failures.push(`${route}: unable to resolve local prerender path.`);
      continue;
    }
    if (!fs.existsSync(filePath)) {
      failures.push(`${route}: missing local prerender file ${path.relative(ROOT, filePath)}.`);
      continue;
    }
    const body = fs.readFileSync(filePath, 'utf8');
    assertRouteUiMarkers(body, route, failures);
  }
  return { failures, routeCount: routes.length };
}

async function runRemoteChecks() {
  const failures = [];
  const routes = loadPeakRoutes();

  for (const route of routes) {
    const url = new URL(route, BASE_URL).toString();
    const { status, body } = await fetchPage(url);
    if (status !== 200) {
      failures.push(`${url}: expected HTTP 200, found ${status}`);
      continue;
    }

    assertRouteUiMarkers(body, url, failures);
  }

  return { failures, routeCount: routes.length };
}

async function main() {
  if (typeof fetch !== 'function') {
    console.error('Global fetch is unavailable in this Node runtime.');
    process.exit(1);
  }

  const failures = [];
  failures.push(...runTemplateChecks());
  let routeCount = 0;
  if (BASE_URL) {
    const remote = await runRemoteChecks();
    failures.push(...remote.failures);
    routeCount = remote.routeCount;
  } else {
    const local = runLocalPrerenderChecks();
    failures.push(...local.failures);
    routeCount = local.routeCount;
  }

  if (failures.length) {
    console.error(`Peak page UI audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  if (BASE_URL) {
    console.log(`Peak page UI audit passed for template + ${routeCount} route(s): ${BASE_URL}`);
  } else {
    console.log(`Peak page UI audit passed for template + ${routeCount} local prerender route(s).`);
  }
}

main().catch((error) => {
  console.error(`Peak page UI audit crashed: ${error.message}`);
  process.exit(1);
});
