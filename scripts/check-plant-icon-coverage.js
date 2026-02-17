#!/usr/bin/env node
/*
  Verifies Howker plant icon mappings resolve to local icon assets.
*/

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const plantsPath = path.join(repoRoot, 'data', 'howker-plants');
const iconsDir = path.join(repoRoot, 'assets', 'icons', 'plant-catalog-icons');
const iconApi = require(path.join(repoRoot, 'js', 'howker-plant-icons.js'));

const REQUIRED_FIELD_KEYS = [
  'type',
  'habitat',
  'elevation',
  'bloom-season',
  'leaf-stem',
  'similar-species',
  'ecology',
  'status',
  'tags',
  'overview'
];

function iconFilenameFromSrc(src) {
  const marker = '/assets/icons/plant-catalog-icons/';
  const raw = String(src || '').trim();
  const markerIndex = raw.indexOf(marker);
  if (markerIndex === -1) {
    return '';
  }
  const encodedName = raw.slice(markerIndex + marker.length).split('?')[0];
  if (!encodedName) {
    return '';
  }
  try {
    return decodeURIComponent(encodedName);
  } catch (_) {
    return encodedName;
  }
}

function validateIconPath(label, src, problems) {
  const filename = iconFilenameFromSrc(src);
  if (!filename) {
    problems.push(`${label}: unresolved icon source "${src}"`);
    return;
  }
  const fullPath = path.join(iconsDir, filename);
  if (!fs.existsSync(fullPath)) {
    problems.push(`${label}: missing file "${filename}"`);
  }
}

function main() {
  const plants = JSON.parse(fs.readFileSync(plantsPath, 'utf8'));
  const problems = [];

  REQUIRED_FIELD_KEYS.forEach((fieldKey) => {
    const src = iconApi.resolveFieldIcon(fieldKey);
    validateIconPath(`field:${fieldKey}`, src, problems);
  });

  plants.forEach((plant, index) => {
    const id = String(plant?.id || `index-${index}`);
    validateIconPath(
      `plant:${id}:species`,
      iconApi.resolveSpeciesIcon(plant),
      problems
    );
    validateIconPath(
      `plant:${id}:type`,
      iconApi.resolveTypeIcon(plant),
      problems
    );
  });

  if (problems.length) {
    console.error(`Plant icon coverage check failed with ${problems.length} issue(s):`);
    problems.forEach((problem) => console.error(`- ${problem}`));
    process.exit(1);
  }

  console.log(
    `Plant icon coverage check passed for ${plants.length} plants and ${REQUIRED_FIELD_KEYS.length} fixed fields.`
  );
}

main();
