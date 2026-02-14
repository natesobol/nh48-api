#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PEAK_TEMPLATE_PATH = path.join(ROOT, 'pages', 'nh48_peak.html');
const WORKER_PATH = path.join(ROOT, 'worker.js');
const BASE_URL = process.env.PEAK_SCHEMA_PARITY_AUDIT_URL || getArgValue('--url') || '';

const ROUTES = [
  '/peak/mount-washington',
  '/peak/mount-isolation',
  '/fr/peak/mount-washington'
];

const REQUIRED_TYPES = ['Mountain', 'HikingTrail', 'ImageObject', 'BreadcrumbList'];
const REQUIRED_ENRICHMENT_PROPERTIES = [
  'Most Common Trailhead',
  'Parking Notes',
  'Technical Difficulty (1-10)',
  'Physical Effort (1-10)',
  'Risk Factors',
  'Preparation Notes',
  'Current Wind Speed (mph)',
  'Current Temperature (F)'
];

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return '';
  return process.argv[idx + 1];
}

function escRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractFunctionChunk(content, functionName) {
  const signature = `function ${functionName}`;
  const start = content.indexOf(signature);
  if (start === -1) {
    return '';
  }
  const tail = content.slice(start + 1);
  const nextMatch = tail.match(/\n\s*(?:async\s+)?function\s+[A-Za-z0-9_]+\s*\(/);
  if (!nextMatch) {
    return content.slice(start);
  }
  const end = start + 1 + nextMatch.index;
  return content.slice(start, end);
}

function extractJsonLdDocs(html) {
  const docs = [];
  const errors = [];
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  matches.forEach((match) => {
    const raw = (match[1] || '').trim();
    if (!raw) return;
    try {
      docs.push(JSON.parse(raw));
    } catch (error) {
      errors.push(error.message);
    }
  });
  return { docs, errors };
}

function collectNodes(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((entry) => collectNodes(entry, out));
    return out;
  }
  if (Array.isArray(node['@graph'])) {
    node['@graph'].forEach((entry) => collectNodes(entry, out));
    return out;
  }
  out.push(node);
  Object.values(node).forEach((value) => {
    if (value && typeof value === 'object') collectNodes(value, out);
  });
  return out;
}

function getTypes(node) {
  const type = node && node['@type'];
  if (Array.isArray(type)) return type.map((entry) => String(entry));
  if (typeof type === 'string') return [type];
  return [];
}

function additionalPropertyNames(node) {
  const list = Array.isArray(node && node.additionalProperty) ? node.additionalProperty : [];
  return new Set(
    list
      .map((entry) => (entry && typeof entry === 'object' ? String(entry.name || '').trim() : ''))
      .filter(Boolean)
  );
}

function assertSourceParity(templateContent, workerContent, failures) {
  const templateBody = extractFunctionChunk(templateContent, 'buildMountainSchema');
  const workerBody = extractFunctionChunk(workerContent, 'buildJsonLd');

  if (!templateBody) {
    failures.push('Unable to locate buildMountainSchema() in pages/nh48_peak.html.');
    return;
  }
  if (!workerBody) {
    failures.push('Unable to locate buildJsonLd() in worker.js.');
    return;
  }

  REQUIRED_TYPES.forEach((type) => {
    if (!new RegExp(escRegExp(type), 'i').test(templateContent)) {
      failures.push(`Template is missing schema type reference: ${type}`);
    }
    if (!new RegExp(escRegExp(type), 'i').test(workerContent)) {
      failures.push(`Worker is missing schema type reference: ${type}`);
    }
  });

  REQUIRED_ENRICHMENT_PROPERTIES.forEach((propertyName) => {
    const token = new RegExp(`['"]${escRegExp(propertyName)}['"]`);
    if (!token.test(templateBody)) {
      failures.push(`Template schema builder is missing required enrichment property "${propertyName}".`);
    }
    if (!token.test(workerBody)) {
      failures.push(`Worker schema builder is missing required enrichment property "${propertyName}".`);
    }
  });

  if (!/ParkingFacility|containsPlace/.test(templateBody)) {
    failures.push('Template schema builder is missing parking/access place enrichment logic.');
  }
  if (!/ParkingFacility|containsPlace/.test(workerBody)) {
    failures.push('Worker schema builder is missing parking/access place enrichment logic.');
  }
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'NH48-Peak-Schema-Parity-Audit/1.0' }
  });
  const body = await response.text();
  return { status: response.status, body };
}

async function assertRuntimeParity(baseUrl, failures) {
  for (const route of ROUTES) {
    const url = new URL(route, baseUrl).toString();
    const { status, body } = await fetchHtml(url);
    if (status !== 200) {
      failures.push(`${url}: expected HTTP 200, received ${status}.`);
      continue;
    }

    const { docs, errors } = extractJsonLdDocs(body);
    if (errors.length) {
      failures.push(`${url}: invalid JSON-LD (${errors.join('; ')})`);
      continue;
    }

    const nodes = [];
    docs.forEach((doc) => collectNodes(doc, nodes));
    const typeSet = new Set();
    nodes.forEach((node) => getTypes(node).forEach((type) => typeSet.add(type)));
    REQUIRED_TYPES.forEach((requiredType) => {
      if (!typeSet.has(requiredType)) {
        failures.push(`${url}: missing required schema type "${requiredType}".`);
      }
    });

    const mountainNodes = nodes.filter((node) => getTypes(node).includes('Mountain'));
    if (!mountainNodes.length) {
      failures.push(`${url}: missing Mountain node.`);
      continue;
    }
    const mountain = mountainNodes[0];
    const propertyNames = additionalPropertyNames(mountain);
    REQUIRED_ENRICHMENT_PROPERTIES.forEach((propertyName) => {
      if (!propertyNames.has(propertyName)) {
        failures.push(`${url}: Mountain.additionalProperty is missing "${propertyName}".`);
      }
    });

    if (!mountain.containsPlace) {
      failures.push(`${url}: Mountain node missing containsPlace parking/access enrichment.`);
    }
  }
}

async function main() {
  const failures = [];
  const templateContent = fs.readFileSync(PEAK_TEMPLATE_PATH, 'utf8');
  const workerContent = fs.readFileSync(WORKER_PATH, 'utf8');

  assertSourceParity(templateContent, workerContent, failures);
  if (BASE_URL) {
    await assertRuntimeParity(BASE_URL, failures);
  }

  if (failures.length) {
    console.error(`Peak schema parity audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  if (BASE_URL) {
    console.log(`Peak schema parity audit passed for ${ROUTES.length} route(s): ${BASE_URL}`);
  } else {
    console.log('Peak schema parity audit passed for worker/template source checks.');
  }
}

main().catch((error) => {
  console.error(`Peak schema parity audit crashed: ${error.message}`);
  process.exit(1);
});
