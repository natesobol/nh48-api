#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NH48_PATH = path.join(ROOT, 'data', 'nh48.json');
const PEAK_TEMPLATE_PATH = path.join(ROOT, 'pages', 'nh48_peak.html');
const WORKER_PATH = path.join(ROOT, 'worker.js');

const EXPECTED_FIELDS = [
  'Best Seasons to Hike',
  'Cell Reception Quality',
  'Coordinates',
  'Difficulty',
  'Dog Friendly',
  'Elevation (ft)',
  'Emergency Bailout Options',
  'Exposure Level',
  'Flora/Environment Zones',
  'Most Common Trailhead',
  'Nearby 4000-footer Connections',
  'Nearby Notable Features',
  'Parking Notes',
  'Peak Name',
  'Prominence (ft)',
  'Range / Subrange',
  'Scramble Sections',
  'Standard Routes',
  'Summit Marker Type',
  'Terrain Character',
  'Trail Names',
  'Trail Type',
  'Typical Completion Time',
  'View Type',
  'Water Availability',
  'Weather Exposure Rating',
  'description',
  'peakName',
  'photos',
  'slug'
].sort((a, b) => a.localeCompare(b));

const REQUIRED_SECTION_IDS = [
  'routesHeading',
  'relatedTrailsHeading',
  'parkingAccessHeading',
  'difficultyMetricsHeading',
  'riskPrepHeading',
  'trailTestedNotesHeading'
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function escRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectActualTopLevelFields(data) {
  const peaks = Array.isArray(data) ? data : Object.values(data || {});
  const fieldSet = new Set();
  peaks.forEach((peak) => {
    Object.keys(peak || {}).forEach((field) => fieldSet.add(field));
  });
  return Array.from(fieldSet).sort((a, b) => a.localeCompare(b));
}

function compareFieldSet(actualFields, failures) {
  const expectedJson = JSON.stringify(EXPECTED_FIELDS);
  const actualJson = JSON.stringify(actualFields);
  if (actualJson !== expectedJson) {
    const missing = EXPECTED_FIELDS.filter((field) => !actualFields.includes(field));
    const extra = actualFields.filter((field) => !EXPECTED_FIELDS.includes(field));
    failures.push(
      `Top-level nh48 field set drifted from expected 30-field contract.` +
      `${missing.length ? ` Missing: ${missing.join(', ')}.` : ''}` +
      `${extra.length ? ` Extra: ${extra.join(', ')}.` : ''}`
    );
  }
}

function buildFieldPatterns(field) {
  const escaped = escRegExp(field);
  const patterns = [
    new RegExp(`\\[['"]${escaped}['"]\\]`, 'i'),
    new RegExp(`['"]${escaped}['"]`, 'i')
  ];

  if (field === 'peakName') {
    patterns.push(/\bpeakName\b/);
  }
  if (field === 'description') {
    patterns.push(/\bdescription\b/);
  }
  if (field === 'slug') {
    patterns.push(/\bcurrentSlug\b/, /\bslug\b/);
  }
  if (field === 'photos') {
    patterns.push(/\bphotos\b/);
  }

  return patterns;
}

function matchAny(content, patterns) {
  return patterns.some((pattern) => pattern.test(content));
}

function verifyFieldExposure(templateContent, workerContent, failures) {
  EXPECTED_FIELDS.forEach((field) => {
    const patterns = buildFieldPatterns(field);
    const uiHit = matchAny(templateContent, patterns);
    const schemaHit = matchAny(workerContent, patterns);
    if (!uiHit && !schemaHit) {
      failures.push(`Field "${field}" is not referenced in peak UI template or worker schema logic.`);
    }
  });
}

function verifySectionMarkers(templateContent, failures) {
  REQUIRED_SECTION_IDS.forEach((sectionId) => {
    if (!new RegExp(`id=["']${sectionId}["']`, 'i').test(templateContent)) {
      failures.push(`Missing required peak section marker #${sectionId} in template.`);
    }
  });
}

function verifyLocaleParity(templateContent, failures) {
  const localeFunctions = [
    'renderParkingAndAccess',
    'renderDifficultyMetrics',
    'renderRiskAndPreparation',
    'renderTrailTestedNotes',
    'updateDirectionsButton'
  ];

  localeFunctions.forEach((functionName) => {
    const body = extractFunctionBody(templateContent, functionName);
    if (!body) {
      failures.push(`Missing function ${functionName} in peak template.`);
      return;
    }
    if (!/langCode\s*===\s*'fr'|getSeoLang\(\)\s*===\s*'fr'/i.test(body)) {
      failures.push(`Function ${functionName} is missing explicit FR label/branch logic.`);
    }
  });
}

function main() {
  const failures = [];
  const nh48 = readJson(NH48_PATH);
  const templateContent = fs.readFileSync(PEAK_TEMPLATE_PATH, 'utf8');
  const workerContent = fs.readFileSync(WORKER_PATH, 'utf8');

  const actualFields = collectActualTopLevelFields(nh48);
  compareFieldSet(actualFields, failures);
  verifyFieldExposure(templateContent, workerContent, failures);
  verifySectionMarkers(templateContent, failures);
  verifyLocaleParity(templateContent, failures);

  if (failures.length) {
    console.error(`Peak data coverage audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`Peak data coverage audit passed for ${EXPECTED_FIELDS.length} canonical NH48 fields.`);
}

main();
