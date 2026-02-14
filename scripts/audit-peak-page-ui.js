#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'pages', 'nh48_peak.html');
const BASE_URL = process.env.PEAK_UI_AUDIT_URL || getArgValue('--url') || '';

const ROUTES = [
  '/peak/mount-washington',
  '/peak/mount-isolation',
  '/fr/peak/mount-washington'
];

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return '';
  return process.argv[index + 1];
}

function assertIncludes(content, needle, message, failures) {
  if (!content.includes(needle)) {
    failures.push(message);
  }
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
  assertIncludes(html, 'id="nav-placeholder"', 'Template missing #nav-placeholder for worker nav injection', failures);
  assertIncludes(html, 'id="getDirectionsBtn"', 'Template missing hero Get Directions button', failures);
  const hasOverviewExpandHook =
    html.includes('id="overviewExpandBtn"') ||
    html.includes("expandBtn.id = 'overviewExpandBtn'") ||
    html.includes('expandBtn.id = "overviewExpandBtn"');
  if (!hasOverviewExpandHook) {
    failures.push('Template missing overview expand control hook');
  }
  assertIncludes(html, 'id="trailsHubSection"', 'Template missing unified trails section container', failures);
  assertIncludes(html, 'id="relatedTrailsGrid"', 'Template missing Related Trails grid', failures);
  assertIncludes(html, 'id="parkingAccessGrid"', 'Template missing Parking & Access panel/grid', failures);
  assertIncludes(html, 'id="difficultyMetricsGrid"', 'Template missing Difficulty Metrics panel/grid', failures);
  assertIncludes(html, 'id="riskPrepGrid"', 'Template missing Risk & Preparation panel/grid', failures);
  assertIncludes(html, 'id="monthlyWeatherPanel"', 'Template missing Monthly Weather panel section', failures);
  assertIncludes(html, 'id="monthlyWeatherMonthSelect"', 'Template missing monthly weather month selector', failures);
  assertIncludes(html, 'id="panelReaderModal"', 'Template missing panel reader modal', failures);
  assertIncludes(html, 'id="panelReaderScale"', 'Template missing panel reader scale control', failures);
  assertIncludes(html, 'id="panelReaderClose"', 'Template missing panel reader close control', failures);

  if (!/function\s+renderRelatedTrails\s*\(/i.test(html)) {
    failures.push('Template missing renderRelatedTrails() implementation');
  }
  const renderRoutesBody = extractFunctionBody(html, 'renderRoutes');
  if (!renderRoutesBody || !/routes\.forEach\s*\(/i.test(renderRoutesBody)) {
    failures.push('renderRoutes() does not iterate all routes with routes.forEach');
  }
  if (/\.\s*slice\s*\(/i.test(renderRoutesBody)) {
    failures.push('renderRoutes() appears to slice/truncate routes');
  }
  if (!/function\s+renderMonthlyWeatherPanel\s*\(/i.test(html)) {
    failures.push('Template missing renderMonthlyWeatherPanel() implementation');
  }
  if (!/function\s+initInstantTooltips\s*\(/i.test(html)) {
    failures.push('Template missing initInstantTooltips() implementation.');
  }
  if (!/ui-tooltip|id="uiTooltip"/i.test(html)) {
    failures.push('Template missing ui-tooltip styling/marker.');
  }
  if (!/is-desc-accessibility/i.test(html)) {
    failures.push('Template missing desc/accessibility row exception classes.');
  }
  ['peak.generalInfo.typicalTime', 'peak.generalInfo.bestSeasons', 'peak.generalInfo.waterAvailability', 'peak.generalInfo.cellReception'].forEach((key) => {
    if (!html.includes(key)) {
      failures.push(`Template missing General Info quick fact key reference: ${key}`);
    }
  });
  const directionsBody = extractFunctionBody(html, 'updateDirectionsButton');
  if (!/aria-disabled/i.test(directionsBody)) {
    failures.push('updateDirectionsButton() does not expose disabled state logic.');
  }
  if (!/Parking location unavailable|stationnement indisponible/i.test(html)) {
    failures.push('Template missing disabled-directions messaging.');
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

async function runRemoteChecks() {
  const failures = [];

  for (const route of ROUTES) {
    const url = new URL(route, BASE_URL).toString();
    const { status, body } = await fetchPage(url);
    if (status !== 200) {
      failures.push(`${url}: expected HTTP 200, found ${status}`);
      continue;
    }

    if (!/class=["'][^"']*site-nav[^"']*["']/i.test(body)) {
      failures.push(`${url}: nav markup (.site-nav) not detected`);
    }

    ['printBtn', 'shareBtn', 'unitsSelect', 'getDirectionsBtn'].forEach((id) => {
      if (!new RegExp(`id=["']${id}["']`, 'i').test(body)) {
        failures.push(`${url}: missing hero tool #${id}`);
      }
    });

    ['routesGrid', 'relatedTrailsGrid', 'parkingAccessGrid', 'difficultyMetricsGrid', 'riskPrepGrid', 'monthlyWeatherPanel', 'monthlyWeatherMonthSelect', 'panelReaderModal', 'panelReaderContent'].forEach((id) => {
      if (!new RegExp(`id=["']${id}["']`, 'i').test(body)) {
        failures.push(`${url}: missing required panel/grid #${id}`);
      }
    });
  }

  return failures;
}

async function main() {
  if (typeof fetch !== 'function') {
    console.error('Global fetch is unavailable in this Node runtime.');
    process.exit(1);
  }

  const failures = [];
  failures.push(...runTemplateChecks());
  if (BASE_URL) {
    failures.push(...(await runRemoteChecks()));
  }

  if (failures.length) {
    console.error(`Peak page UI audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  if (BASE_URL) {
    console.log(`Peak page UI audit passed for template + ${ROUTES.length} route(s): ${BASE_URL}`);
  } else {
    console.log('Peak page UI audit passed for local template checks.');
  }
}

main().catch((error) => {
  console.error(`Peak page UI audit crashed: ${error.message}`);
  process.exit(1);
});
