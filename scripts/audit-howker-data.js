#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PLANTS_PATH = path.join(ROOT, 'data', 'howker-plants');
const INDEX_PATH = path.join(ROOT, 'data', 'howker-plants-index.json');

const VALID_HABITAT_GROUPS = new Set([
  'alpine',
  'bog/wetland',
  'forest-floor',
  'rocky-ledges',
  'mixed',
]);

const VALID_SEASON_GROUPS = new Set([
  'spring',
  'early-summer',
  'summer',
  'late-summer/fall',
  'year-round',
]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing file: ${path.relative(ROOT, filePath)}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Failed to parse ${path.relative(ROOT, filePath)}: ${error.message}`);
  }
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function collectImageUrls(plant) {
  if (Array.isArray(plant.imgs) && plant.imgs.length) {
    return plant.imgs;
  }
  if (typeof plant.img === 'string' && plant.img.trim()) {
    return [plant.img];
  }
  return [];
}

function main() {
  const plants = readJson(PLANTS_PATH);
  const index = readJson(INDEX_PATH);
  const issues = [];

  if (!Array.isArray(plants)) {
    issues.push('data/howker-plants must be a JSON array.');
  }
  if (!index || typeof index !== 'object' || typeof index.plants !== 'object') {
    issues.push('data/howker-plants-index.json must include a top-level plants object.');
  }

  if (issues.length) {
    issues.forEach((line) => console.error(`- ${line}`));
    process.exit(1);
  }

  const idSeen = new Set();
  const routeSeen = new Set();
  const plantRecords = index.plants || {};

  plants.forEach((plant, idx) => {
    const id = String(plant?.id || '').trim();
    if (!id) {
      issues.push(`Entry at index ${idx} is missing "id".`);
      return;
    }

    if (idSeen.has(id)) {
      issues.push(`Duplicate plant id: "${id}".`);
    } else {
      idSeen.add(id);
    }

    const slug = normalizeSlug(id);
    if (!slug) {
      issues.push(`Invalid empty slug for id "${id}".`);
    } else if (routeSeen.has(slug)) {
      issues.push(`Duplicate plant route slug generated from id "${id}" (${slug}).`);
    } else {
      routeSeen.add(slug);
    }

    const imageUrls = collectImageUrls(plant);
    if (!imageUrls.length) {
      issues.push(`Plant "${id}" is missing image URLs (img or imgs).`);
    } else {
      imageUrls.forEach((url, imageIdx) => {
        if (!String(url || '').trim()) {
          issues.push(`Plant "${id}" has empty image URL at index ${imageIdx}.`);
        }
      });
    }

    const indexEntry = plantRecords[id];
    if (!indexEntry) {
      issues.push(`Missing index entry for plant "${id}" in howker-plants-index.json.`);
      return;
    }

    if (!VALID_HABITAT_GROUPS.has(indexEntry.habitat_group)) {
      issues.push(
        `Plant "${id}" has invalid habitat_group "${indexEntry.habitat_group}".`
      );
    }
    if (!VALID_SEASON_GROUPS.has(indexEntry.season_group)) {
      issues.push(
        `Plant "${id}" has invalid season_group "${indexEntry.season_group}".`
      );
    }
    if (!Array.isArray(indexEntry.canonical_tags) || indexEntry.canonical_tags.length === 0) {
      issues.push(`Plant "${id}" must have at least one canonical tag.`);
    }
    if (!Array.isArray(indexEntry.search_terms) || indexEntry.search_terms.length === 0) {
      issues.push(`Plant "${id}" is missing search_terms in index.`);
    }
    if (typeof indexEntry.has_gallery !== 'boolean') {
      issues.push(`Plant "${id}" has invalid has_gallery flag.`);
    }
    if (!Number.isInteger(indexEntry.image_count) || indexEntry.image_count < 0) {
      issues.push(`Plant "${id}" has invalid image_count value "${indexEntry.image_count}".`);
    }
  });

  Object.keys(plantRecords).forEach((id) => {
    if (!idSeen.has(id)) {
      issues.push(`Index includes unknown plant id "${id}" not present in data/howker-plants.`);
    }
  });

  if (issues.length) {
    console.error(`Howker data audit failed with ${issues.length} issue(s).`);
    issues.forEach((line) => console.error(`- ${line}`));
    process.exit(1);
  }

  console.log(
    `Howker data audit passed for ${plants.length} plant entries and ${Object.keys(plantRecords).length} index entries.`
  );
}

main();
