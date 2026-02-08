#!/usr/bin/env node

/**
 * Static verification for generated NH48 peak pages + catalog JSON-LD geography wiring.
 *
 * Usage:
 *   node scripts/verify-peak-geography-jsonld.js
 *
 * Optional overrides (comma-separated IDs):
 *   NH48_CONTAINED_IN_PLACE_IDS="id1,id2,id3,id4" node scripts/verify-peak-geography-jsonld.js
 *   NH48_SHARED_GEOGRAPHY_NODE_IDS="id1,id2,id3,id4,id5" node scripts/verify-peak-geography-jsonld.js
 *   NH48_USFS_LAND_MANAGER_ID="https://www.fs.usda.gov/whitemountain" node scripts/verify-peak-geography-jsonld.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'nh48.json');
const PEAKS_DIR = path.join(ROOT, 'peaks');
const CATALOG_PATH = path.join(ROOT, 'catalog.html');

const parseCsvIds = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const containedInPlaceOverride = parseCsvIds(process.env.NH48_CONTAINED_IN_PLACE_IDS);
const sharedGeographyOverride = parseCsvIds(process.env.NH48_SHARED_GEOGRAPHY_NODE_IDS);

const TARGET_CONTAINED_IN_PLACE_IDS = containedInPlaceOverride.length
  ? containedInPlaceOverride
  : [
      'https://nh48.info/id/white-mountain-national-forest',
      'https://nh48.info/id/new-hampshire',
      'https://nh48.info/id/maine',
      'https://nh48.info/id/united-states',
    ];

const SHARED_GEOGRAPHY_NODE_IDS = sharedGeographyOverride.length
  ? sharedGeographyOverride
  : [
      'https://nh48.info/id/white-mountain-national-forest',
      'https://nh48.info/id/new-hampshire',
      'https://nh48.info/id/maine',
      'https://nh48.info/id/new-england',
      'https://nh48.info/id/united-states',
    ];

const USFS_LAND_MANAGER_ID =
  process.env.NH48_USFS_LAND_MANAGER_ID || 'https://www.fs.usda.gov/whitemountain';

const failuresByFile = new Map();

const addFailure = (file, message) => {
  if (!failuresByFile.has(file)) failuresByFile.set(file, []);
  failuresByFile.get(file).push(message);
};

const check = (condition, file, message) => {
  if (!condition) addFailure(file, message);
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const extractJsonLdBlocks = (html, relPath) => {
  const blocks = [];
  const regex = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const raw = match[1].trim();
    try {
      blocks.push(JSON.parse(raw));
    } catch (error) {
      addFailure(relPath, `invalid JSON-LD block (${error.message})`);
    }
  }

  return blocks;
};

const toTypeList = (node) => {
  const type = node && node['@type'];
  if (Array.isArray(type)) return type;
  return typeof type === 'string' && type ? [type] : [];
};

const flattenNodes = (blocks) => {
  const out = [];
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    if (Array.isArray(block['@graph'])) {
      for (const node of block['@graph']) {
        if (node && typeof node === 'object') out.push(node);
      }
    } else {
      out.push(block);
    }
  }
  return out;
};

const firstId = (value) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof value['@id'] === 'string') return value['@id'];
  return null;
};

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const collectContainedInPlaceIds = (containedInPlace) =>
  asArray(containedInPlace)
    .map((item) => firstId(item))
    .filter(Boolean);

const peakData = readJson(DATA_PATH);
const slugs = Object.keys(peakData);

for (const slug of slugs) {
  const filePath = path.join(PEAKS_DIR, slug, 'index.html');
  const relPath = path.relative(ROOT, filePath);

  check(fs.existsSync(filePath), relPath, 'missing generated peak page');
  if (!fs.existsSync(filePath)) continue;

  const html = fs.readFileSync(filePath, 'utf8');
  const blocks = extractJsonLdBlocks(html, relPath);
  const nodes = flattenNodes(blocks);

  const mountain = nodes.find((node) => toTypeList(node).includes('Mountain'));
  check(Boolean(mountain), relPath, 'missing Mountain JSON-LD node');
  if (!mountain) continue;

  const mountainTypes = toTypeList(mountain);
  check(
    mountainTypes.includes('Mountain') && mountainTypes.includes('TouristAttraction'),
    relPath,
    'Mountain @type must include both Mountain and TouristAttraction'
  );

  const containedInPlaceIds = collectContainedInPlaceIds(mountain.containedInPlace);
  for (const targetId of TARGET_CONTAINED_IN_PLACE_IDS) {
    check(
      containedInPlaceIds.includes(targetId),
      relPath,
      `containedInPlace missing target ID ${targetId}`
    );
  }

  const landManagerId = firstId(mountain.landManager);
  check(
    landManagerId === USFS_LAND_MANAGER_ID,
    relPath,
    `landManager must point to ${USFS_LAND_MANAGER_ID} (found ${landManagerId || 'none'})`
  );

  const nodeIdCounts = new Map();
  for (const node of nodes) {
    const nodeId = node && node['@id'];
    if (typeof nodeId !== 'string' || !nodeId) continue;
    nodeIdCounts.set(nodeId, (nodeIdCounts.get(nodeId) || 0) + 1);
  }

  for (const sharedId of SHARED_GEOGRAPHY_NODE_IDS) {
    const count = nodeIdCounts.get(sharedId) || 0;
    check(
      count === 1,
      relPath,
      `shared geography node ${sharedId} must appear exactly once (found ${count})`
    );
  }
}

const catalogRelPath = path.relative(ROOT, CATALOG_PATH);
const catalogHtml = fs.readFileSync(CATALOG_PATH, 'utf8');
const catalogBlocks = extractJsonLdBlocks(catalogHtml, catalogRelPath);
const catalogNodes = flattenNodes(catalogBlocks);

const touristDestination = catalogNodes.find((node) => toTypeList(node).includes('TouristDestination'));
check(Boolean(touristDestination), catalogRelPath, 'missing TouristDestination JSON-LD node');

if (touristDestination) {
  const includesAttractionCount = asArray(touristDestination.includesAttraction).length;
  check(
    includesAttractionCount === slugs.length,
    catalogRelPath,
    `includesAttraction count ${includesAttractionCount} does not match data/nh48.json count ${slugs.length}`
  );
}

const filesWithFailures = [...failuresByFile.keys()].sort();
if (filesWithFailures.length) {
  const totalIssues = filesWithFailures.reduce((sum, file) => sum + failuresByFile.get(file).length, 0);
  console.error(`Verification failed with ${totalIssues} issue(s) across ${filesWithFailures.length} file(s):`);
  for (const file of filesWithFailures) {
    console.error(`\n${file}`);
    for (const issue of failuresByFile.get(file)) {
      console.error(`  - ${issue}`);
    }
  }
  process.exit(1);
}

console.log('Verification passed: peak and catalog JSON-LD geography constraints are satisfied.');
