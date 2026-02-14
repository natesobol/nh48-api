#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PEAK_DATA_PATH = path.join(ROOT, 'data', 'nh48.json');
const EXPERIENCE_PATH = path.join(ROOT, 'data', 'peak-experiences.en.json');
const PEAKS_DIR = path.join(ROOT, 'peaks');
const PEAK_TEMPLATE_PATH = path.join(ROOT, 'pages', 'nh48_peak.html');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function extractJsonLdBlocks(html) {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const docs = [];
  const errors = [];
  matches.forEach((match) => {
    const raw = (match[1] || '').trim();
    if (!raw) return;
    try {
      docs.push(JSON.parse(raw));
    } catch (err) {
      errors.push(err.message);
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
    if (value && typeof value === 'object') {
      collectNodes(value, out);
    }
  });
  return out;
}

function getTypes(node) {
  const value = node['@type'];
  if (Array.isArray(value)) return value.map((entry) => String(entry));
  if (typeof value === 'string') return [value];
  return [];
}

function auditExperienceFile(slugs) {
  const failures = [];
  const payload = readJson(EXPERIENCE_PATH);
  const keys = Object.keys(payload || {});
  if (keys.length !== 48) {
    failures.push(`Expected 48 entries in ${path.relative(ROOT, EXPERIENCE_PATH)}, found ${keys.length}`);
  }

  slugs.forEach((slug) => {
    const entry = payload?.[slug];
    if (!entry || typeof entry !== 'object') {
      failures.push(`Missing experience entry for slug "${slug}"`);
      return;
    }
    ['experienceSummary', 'conditionsFromExperience', 'planningTip', 'lastReviewed'].forEach((field) => {
      const value = typeof entry[field] === 'string' ? entry[field].trim() : '';
      if (!value) {
        failures.push(`Missing "${field}" for slug "${slug}" in ${path.relative(ROOT, EXPERIENCE_PATH)}`);
      }
    });
    if (/\[object Object\]/i.test(String(entry.planningTip || ''))) {
      failures.push(`Invalid planningTip serialization for slug "${slug}" in ${path.relative(ROOT, EXPERIENCE_PATH)}`);
    }
  });

  return failures;
}

function auditPeakPage(slug) {
  const relPath = path.join('peaks', slug, 'index.html');
  const filePath = path.join(ROOT, relPath);
  const failures = [];

  if (!fs.existsSync(filePath)) {
    failures.push(`Missing prerendered file: ${relPath}`);
    return failures;
  }

  const html = fs.readFileSync(filePath, 'utf8');

  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  const canonicalUrl = canonicalMatch ? canonicalMatch[1] : '';
  if (canonicalUrl !== `https://nh48.info/peak/${slug}/`) {
    failures.push(`Canonical URL mismatch. Expected https://nh48.info/peak/${slug}/, found ${canonicalUrl || '[missing]'}`);
  }

  if (!/Trail-tested notes/i.test(html)) {
    failures.push('Missing visible "Trail-tested notes" section');
  }

  const { docs, errors } = extractJsonLdBlocks(html);
  if (errors.length) {
    failures.push(`Invalid JSON-LD blocks: ${errors.join('; ')}`);
    return failures;
  }
  const nodes = [];
  docs.forEach((doc) => collectNodes(doc, nodes));

  const breadcrumbNodes = nodes.filter((node) => getTypes(node).includes('BreadcrumbList'));
  if (breadcrumbNodes.length !== 1) {
    failures.push(`Expected 1 BreadcrumbList, found ${breadcrumbNodes.length}`);
  } else {
    const items = Array.isArray(breadcrumbNodes[0].itemListElement) ? breadcrumbNodes[0].itemListElement : [];
    if (items.length !== 4) {
      failures.push(`Expected breadcrumb depth 4, found ${items.length}`);
    }
  }

  const typeSet = new Set();
  nodes.forEach((node) => getTypes(node).forEach((type) => typeSet.add(type)));
  ['Mountain', 'HikingTrail', 'TouristAttraction', 'ImageObject'].forEach((requiredType) => {
    if (!typeSet.has(requiredType)) {
      failures.push(`Missing required schema type: ${requiredType}`);
    }
  });

  return failures;
}

function auditInteractiveTemplate() {
  const failures = [];
  const relPath = path.relative(ROOT, PEAK_TEMPLATE_PATH);
  if (!fs.existsSync(PEAK_TEMPLATE_PATH)) {
    failures.push(`Missing interactive template: ${relPath}`);
    return failures;
  }

  const html = fs.readFileSync(PEAK_TEMPLATE_PATH, 'utf8');
  if (!/id=["']nav-placeholder["']/i.test(html)) {
    failures.push(`${relPath}: Missing #nav-placeholder marker for worker nav injection`);
  }

  const requiredMarkers = [
    'routesHeading',
    'relatedTrailsHeading',
    'parkingAccessHeading',
    'difficultyMetricsHeading',
    'riskPrepHeading',
    'trailTestedNotesHeading'
  ];

  requiredMarkers.forEach((marker) => {
    if (!new RegExp(`id=["']${marker}["']`, 'i').test(html)) {
      failures.push(`${relPath}: Missing required section marker #${marker}`);
    }
  });

  return failures;
}

function main() {
  const peakData = readJson(PEAK_DATA_PATH);
  const slugs = Object.keys(peakData || {}).sort();
  const allFailures = [];

  allFailures.push(...auditInteractiveTemplate());
  allFailures.push(...auditExperienceFile(slugs));

  slugs.forEach((slug) => {
    const failures = auditPeakPage(slug);
    failures.forEach((failure) => allFailures.push(`${path.join('peaks', slug, 'index.html')}: ${failure}`));
  });

  if (allFailures.length) {
    console.error(`Peak authority audit failed with ${allFailures.length} issue(s).`);
    allFailures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`Peak authority audit passed for ${slugs.length} peak guide pages.`);
}

main();
