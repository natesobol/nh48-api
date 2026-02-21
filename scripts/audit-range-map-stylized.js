#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RANGE_MAP_PAGE = path.join(ROOT, 'nh-4000-footers-info.html');
const BASE_URL = process.env.RANGE_MAP_STYLIZED_AUDIT_URL || getArgValue('--url') || '';

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return '';
  return process.argv[index + 1];
}

function assertPattern(content, regex, message, failures) {
  if (!regex.test(String(content || ''))) {
    failures.push(message);
  }
}

function assertMissing(content, regex, message, failures) {
  if (regex.test(String(content || ''))) {
    failures.push(message);
  }
}

function runContractChecks(content, label, failures) {
  assertPattern(content, /id=["']mapStyleOsm["']/i, `${label}: missing #mapStyleOsm toggle.`, failures);
  assertPattern(content, /id=["']mapStyleStylized["']/i, `${label}: missing #mapStyleStylized toggle.`, failures);
  assertPattern(
    content,
    /leaflet\.vectorgrid@1\.3\.0\/dist\/Leaflet\.VectorGrid\.bundled\.js/i,
    `${label}: missing Leaflet.VectorGrid dependency include.`,
    failures
  );
  assertPattern(content, /L\.vectorGrid\.protobuf\s*\(/i, `${label}: missing VectorGrid contour layer wiring.`, failures);
  assertPattern(content, /\/api\/tiles\/wmnf-style-metadata\.json/i, `${label}: missing WMNF style metadata endpoint.`, failures);
  assertPattern(content, /\/api\/tiles\/wmnf-hillshade\/\{z\}\/\{x\}\/\{y\}\.png/i, `${label}: missing WMNF hillshade tile endpoint.`, failures);
  assertPattern(content, /\/api\/tiles\/wmnf-contours\/\{z\}\/\{x\}\/\{y\}\.pbf/i, `${label}: missing WMNF contour tile endpoint.`, failures);
  assertPattern(content, /stylizedBtn\.setAttribute\('aria-selected'/i, `${label}: stylized toggle aria-selected state wiring missing.`, failures);
  assertPattern(content, /osmBtn\.setAttribute\('aria-selected'/i, `${label}: OSM toggle aria-selected state wiring missing.`, failures);
  assertPattern(content, /map_style'\)\s*;\s*const initialStyle = queryStyle === WMNF_STYLE_PARAM \? 'stylized' : 'osm'/i, `${label}: missing map_style=wmnf_v1 rollout hook.`, failures);

  assertMissing(content, /\bSTYLIZED_TILE_FILTER\b/i, `${label}: legacy STYLIZED_TILE_FILTER still present.`, failures);
  assertMissing(
    content,
    /leafletStylizedLayer\s*=\s*L\.tileLayer\(\s*['"]https:\/\/\{s\}\.tile\.opentopomap\.org/i,
    `${label}: legacy filtered OpenTopoMap stylized path still present.`,
    failures
  );
}

function runLocalAudit() {
  const failures = [];
  if (!fs.existsSync(RANGE_MAP_PAGE)) {
    failures.push(`Missing page: ${path.relative(ROOT, RANGE_MAP_PAGE)}`);
  } else {
    const html = fs.readFileSync(RANGE_MAP_PAGE, 'utf8');
    runContractChecks(html, path.relative(ROOT, RANGE_MAP_PAGE), failures);
  }

  if (failures.length) {
    console.error(`Range map stylized audit failed with ${failures.length} issue(s):`);
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
  }

  console.log('Range map stylized audit passed for local source.');
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'NH48-Range-Map-Stylized-Audit/1.0' }
  });
  const text = await response.text();
  return { response, text };
}

async function fetchStatus(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'NH48-Range-Map-Stylized-Audit/1.0' }
  });
  return response.status;
}

async function runRemoteAudit(baseUrl) {
  const failures = [];
  const pageUrl = new URL('/nh-4000-footers-info', baseUrl).toString();
  try {
    const { response, text } = await fetchText(pageUrl);
    if (!response.ok) {
      failures.push(`${pageUrl}: expected 200, got ${response.status}.`);
    } else {
      runContractChecks(text, pageUrl, failures);
    }
  } catch (error) {
    failures.push(`${pageUrl}: ${error.message}`);
  }

  const endpointChecks = [
    '/api/tiles/wmnf-style-metadata.json',
    '/api/tiles/wmnf-hillshade/7/37/46.png',
    '/api/tiles/wmnf-contours/7/37/46.pbf'
  ];
  for (const endpoint of endpointChecks) {
    const url = new URL(endpoint, baseUrl).toString();
    try {
      const status = await fetchStatus(url);
      if (![200, 404].includes(status)) {
        failures.push(`${url}: expected 200 or 404, got ${status}.`);
      }
    } catch (error) {
      failures.push(`${url}: ${error.message}`);
    }
  }

  if (failures.length) {
    console.error(`Range map stylized audit failed with ${failures.length} issue(s):`);
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
  }

  console.log(`Range map stylized audit passed for live route(s): ${baseUrl}`);
}

async function main() {
  if (BASE_URL) {
    await runRemoteAudit(BASE_URL);
    return;
  }
  runLocalAudit();
}

main().catch((error) => {
  console.error(`Range map stylized audit failed: ${error.message}`);
  process.exit(1);
});

