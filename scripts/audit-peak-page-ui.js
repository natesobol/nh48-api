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
  assertIncludes(html, 'id="trailNamesGrid"', 'Template missing Associated Trails grid', failures);
  assertIncludes(html, 'id="parkingAccessGrid"', 'Template missing Parking & Access panel/grid', failures);
  assertIncludes(html, 'id="difficultyMetricsGrid"', 'Template missing Difficulty Metrics panel/grid', failures);
  assertIncludes(html, 'id="riskPrepGrid"', 'Template missing Risk & Preparation panel/grid', failures);

  if (/trailNamesGrid\s*\.\s*hidden\s*=\s*true/i.test(html)) {
    failures.push('Template still force-hides trailNamesGrid');
  }
  if (!/function\s+renderTrailNames\s*\(/i.test(html)) {
    failures.push('Template missing renderTrailNames() implementation');
  }
  const renderRoutesBody = extractFunctionBody(html, 'renderRoutes');
  if (!renderRoutesBody || !/routes\.forEach\s*\(/i.test(renderRoutesBody)) {
    failures.push('renderRoutes() does not iterate all routes with routes.forEach');
  }
  if (/\.\s*slice\s*\(/i.test(renderRoutesBody)) {
    failures.push('renderRoutes() appears to slice/truncate routes');
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

    ['routesGrid', 'trailNamesGrid', 'parkingAccessGrid', 'difficultyMetricsGrid', 'riskPrepGrid'].forEach((id) => {
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
