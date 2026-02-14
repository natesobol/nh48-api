#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WIKI_PLANTS_PATH = path.join(ROOT, 'data', 'wiki', 'plants.json');
const HOWKER_PLANTS_PATH = path.join(ROOT, 'data', 'howker-plants');

const REQUIRED_KEYS = [
  'slug',
  'commonName',
  'scientificName',
  'type',
  'habitat',
  'elevationRange_ft',
  'bloomPeriod',
  'description',
  'ecology',
  'conservationStatus',
  'tags',
  'sources'
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeForMatch(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function trimText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function imageRefCount(entry) {
  const imgsCount = Array.isArray(entry.imgs)
    ? entry.imgs.filter((img) => trimText(img)).length
    : 0;
  const imgCount = trimText(entry.img) ? 1 : 0;
  return imgsCount + imgCount;
}

function richnessScore(entry) {
  const textFields = [
    'teaser',
    'desc',
    'morph',
    'similar',
    'ecology',
    'status',
    'habitat',
    'elevation',
    'bloom',
    'common',
    'latin',
    'type'
  ];
  const textScore = textFields.reduce((sum, key) => sum + trimText(entry[key]).length, 0);
  const tagScore = Array.isArray(entry.tags)
    ? entry.tags.filter((tag) => trimText(tag)).length * 25
    : 0;
  const mediaScore = imageRefCount(entry) * 40;
  return textScore + tagScore + mediaScore;
}

function chooseRicher(currentEntry, nextEntry) {
  const currentScore = richnessScore(currentEntry);
  const nextScore = richnessScore(nextEntry);
  if (nextScore > currentScore) return nextEntry;
  if (nextScore < currentScore) return currentEntry;
  return currentEntry;
}

function parseElevationRange(rawElevation) {
  const text = trimText(rawElevation).replace(/,/g, '');
  const matches = text.match(/\d+/g);
  if (!matches || matches.length === 0) return [0, 0];
  const values = matches.map((value) => Number.parseInt(value, 10)).filter(Number.isFinite);
  if (values.length === 0) return [0, 0];
  const min = values[0];
  const max = values.length === 1 ? values[0] : values[values.length - 1];
  return min <= max ? [min, max] : [max, min];
}

function firstSentence(value) {
  const text = trimText(value);
  if (!text) return '';
  const match = text.match(/^(.+?[.!?])(?:\s|$)/);
  return trimText(match ? match[1] : text);
}

function dedupeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const out = [];
  const seen = new Set();
  for (const tag of tags) {
    const cleaned = trimText(tag);
    if (!cleaned) continue;
    const key = normalizeForMatch(cleaned);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

function buildDescription(entry) {
  const teaser = trimText(entry.teaser);
  if (teaser) return teaser;
  const sentence = firstSentence(entry.desc);
  if (sentence) return sentence;
  const common = trimText(entry.common);
  return common ? `${common} in the White Mountain National Forest.` : 'White Mountain plant entry.';
}

function transformHowkerEntry(entry) {
  return {
    slug: trimText(entry.id),
    commonName: trimText(entry.common),
    scientificName: trimText(entry.latin),
    type: trimText(entry.type),
    habitat: trimText(entry.habitat),
    elevationRange_ft: parseElevationRange(entry.elevation),
    bloomPeriod: trimText(entry.bloom),
    description: buildDescription(entry),
    ecology: trimText(entry.ecology),
    conservationStatus: trimText(entry.status),
    tags: dedupeTags(entry.tags),
    sources: [
      {
        title: 'Howker Ridge Plant Dataset (NH48)',
        url: 'https://nh48.info/data/howker-plants'
      }
    ]
  };
}

function assertValidWikiSchema(plants) {
  for (const plant of plants) {
    const keys = Object.keys(plant);
    if (keys.length !== REQUIRED_KEYS.length) {
      throw new Error(`Invalid key count for slug "${plant.slug}" (${keys.length}).`);
    }
    for (const requiredKey of REQUIRED_KEYS) {
      if (!(requiredKey in plant)) {
        throw new Error(`Missing required key "${requiredKey}" for slug "${plant.slug}".`);
      }
    }
    for (const key of keys) {
      if (!REQUIRED_KEYS.includes(key)) {
        throw new Error(`Unexpected key "${key}" for slug "${plant.slug}".`);
      }
    }
  }
}

function assertUniqueSlugs(plants) {
  const seen = new Set();
  for (const plant of plants) {
    const slug = trimText(plant.slug);
    if (!slug) throw new Error('Encountered empty slug in merged plants.');
    if (seen.has(slug)) throw new Error(`Duplicate slug found in merged plants: "${slug}".`);
    seen.add(slug);
  }
}

function main() {
  const wikiPlants = readJson(WIKI_PLANTS_PATH);
  const howkerPlants = readJson(HOWKER_PLANTS_PATH);

  if (!Array.isArray(wikiPlants)) {
    throw new Error('Expected data/wiki/plants.json to be an array.');
  }
  if (!Array.isArray(howkerPlants)) {
    throw new Error('Expected data/howker-plants to be an array.');
  }

  const dedupedHowkerById = new Map();
  for (const entry of howkerPlants) {
    const id = trimText(entry.id);
    if (!id) continue;
    const current = dedupedHowkerById.get(id);
    dedupedHowkerById.set(id, current ? chooseRicher(current, entry) : entry);
  }

  // Cross-dataset dedupe only:
  // compare Howker candidates against the existing wiki dataset baseline,
  // not against other Howker candidates in this run.
  const baselineSlugSet = new Set(wikiPlants.map((entry) => normalizeForMatch(entry.slug)));
  const baselineScientificSet = new Set(
    wikiPlants.map((entry) => normalizeForMatch(entry.scientificName))
  );
  const baselineCommonSet = new Set(wikiPlants.map((entry) => normalizeForMatch(entry.commonName)));

  const appended = [];
  const skipped = [];

  for (const howkerEntry of dedupedHowkerById.values()) {
    const slugKey = normalizeForMatch(howkerEntry.id);
    const scientificKey = normalizeForMatch(howkerEntry.latin);
    const commonKey = normalizeForMatch(howkerEntry.common);
    const isDuplicate =
      baselineSlugSet.has(slugKey) ||
      baselineScientificSet.has(scientificKey) ||
      baselineCommonSet.has(commonKey);

    if (isDuplicate) {
      skipped.push(trimText(howkerEntry.id));
      continue;
    }

    appended.push(transformHowkerEntry(howkerEntry));
  }

  appended.sort((a, b) =>
    a.commonName.localeCompare(b.commonName, 'en', { sensitivity: 'base', numeric: true })
  );

  const merged = [...wikiPlants, ...appended];

  assertValidWikiSchema(merged);
  assertUniqueSlugs(merged);

  fs.writeFileSync(WIKI_PLANTS_PATH, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

  console.log(`Wiki plants before merge: ${wikiPlants.length}`);
  console.log(`Howker records (raw): ${howkerPlants.length}`);
  console.log(`Howker records (unique by id): ${dedupedHowkerById.size}`);
  console.log(`Imported from Howker: ${appended.length}`);
  console.log(`Skipped duplicates: ${skipped.length}`);
  console.log(`Wiki plants after merge: ${merged.length}`);
}

main();
