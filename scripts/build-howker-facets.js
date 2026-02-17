#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const INPUT_PATH = path.join(ROOT, 'data', 'howker-plants');
const OUTPUT_PATH = path.join(ROOT, 'data', 'howker-plants-index.json');

const HABITAT_GROUPS = Object.freeze([
  'alpine',
  'bog/wetland',
  'forest-floor',
  'rocky-ledges',
  'mixed',
]);

const SEASON_GROUPS = Object.freeze([
  'spring',
  'early-summer',
  'summer',
  'late-summer/fall',
  'year-round',
]);

const HABITAT_RULES = Object.freeze({
  'bog/wetland': [
    'bog',
    'wetland',
    'peat',
    'fen',
    'swamp',
    'stream',
    'sphagnum',
    'seep',
    'water',
    'marsh',
    'hollow',
  ],
  alpine: [
    'alpine',
    'subalpine',
    'treeline',
    'above treeline',
    'summit',
    'krummholz',
    'tundra',
    'presidential',
  ],
  'rocky-ledges': [
    'rock',
    'rocky',
    'ledge',
    'talus',
    'boulder',
    'felsenmeer',
    'crevice',
    'cliff',
    'outcrop',
  ],
  'forest-floor': [
    'forest',
    'woods',
    'woodland',
    'understory',
    'leaf litter',
    'decaying',
    'rotting',
    'log',
    'stump',
    'shade',
    'spruce-fir',
    'conifer',
    'hardwood',
    'ravine',
  ],
});

const SEASON_RULES = Object.freeze({
  'year-round': [
    'year-round',
    'year round',
    'non-flowering',
    'non flowering',
    'reproduces via',
  ],
  'late-summer/fall': [
    'late summer',
    'fall',
    'autumn',
    'august',
    'september',
    'october',
  ],
  summer: [
    'summer',
    'july',
    'mid-june',
    'mid june',
    'june-july',
    'june to july',
    'july-august',
  ],
  'early-summer': [
    'early summer',
    'late may',
    'may-june',
    'may to june',
    'june',
  ],
  spring: [
    'spring',
    'late spring',
    'early spring',
    'april',
    'may',
  ],
});

const TYPE_TO_TAG = Object.freeze({
  shrub: 'shrub',
  wildflower: 'wildflower',
  moss: 'moss',
  lichen: 'lichen',
  forest: 'forest',
  community: 'community',
  fungus: 'fungus',
  fern: 'fern',
  grass: 'grass',
  clubmoss: 'clubmoss',
  'coniferous tree': 'tree',
  'creeping vine': 'vine',
});

const TAG_ALIASES = Object.freeze({
  'alpine-heath': 'alpine',
  'alpine-tundra': 'alpine',
  'subalpine': 'alpine',
  'subalpine-forest': 'forest-floor',
  'bog': 'bog/wetland',
  'wetland': 'bog/wetland',
  'water-holding': 'bog/wetland',
  'forest-floor': 'forest-floor',
  'rocky-soil': 'rocky-ledges',
  'talus': 'rocky-ledges',
  'boulder-field': 'rocky-ledges',
  'deciduous': 'deciduous',
  'evergreen': 'evergreen',
  'berry': 'berries',
  'red-berries': 'berries',
  'edible-fruit': 'berries',
  'pink-flowers': 'flowers',
  'white-flowers': 'flowers',
  'twin-flowers': 'flowers',
  'spore-bearing': 'spore-bearing',
  'wind-tolerant': 'wind-tolerant',
  'groundcover': 'groundcover',
  'low-growing': 'groundcover',
  'dwarf-shrub': 'groundcover',
  'shade': 'shade',
  'conifer': 'tree',
  'tree': 'tree',
  'rare': 'rare',
  'indicator': 'indicator',
  'pioneer': 'pioneer',
  'lichen': 'lichen',
  'moss': 'moss',
  'fungus': 'fungus',
  'wildflower': 'wildflower',
  'shrub': 'shrub',
  'fern': 'fern',
  'grass': 'grass',
  'clubmoss': 'clubmoss',
  'vine': 'vine',
  'pollinator': 'pollinator',
});

const PRIORITY_TAGS = Object.freeze([
  'alpine',
  'bog/wetland',
  'forest-floor',
  'rocky-ledges',
  'tree',
  'shrub',
  'wildflower',
  'moss',
  'lichen',
  'fungus',
  'fern',
  'grass',
  'clubmoss',
  'vine',
  'berries',
  'flowers',
  'evergreen',
  'deciduous',
  'groundcover',
  'shade',
  'wind-tolerant',
  'spore-bearing',
  'indicator',
  'pioneer',
  'rare',
  'pollinator',
]);

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\w\s/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreGroup(text, rules) {
  return rules.reduce((count, keyword) => (text.includes(keyword) ? count + 1 : count), 0);
}

function deriveHabitatGroup(plant) {
  const haystack = normalizeText(
    [plant.habitat, plant.teaser, plant.desc, plant.type, (plant.tags || []).join(' ')].join(' ')
  );
  let best = { group: 'mixed', score: 0 };
  HABITAT_GROUPS.forEach((group) => {
    if (group === 'mixed') return;
    const score = scoreGroup(haystack, HABITAT_RULES[group] || []);
    if (score > best.score) {
      best = { group, score };
    }
  });
  return best.score > 0 ? best.group : 'mixed';
}

function deriveSeasonGroup(plant) {
  const haystack = normalizeText([plant.bloom, plant.teaser, plant.desc].join(' '));
  let best = { group: 'year-round', score: 0 };
  SEASON_GROUPS.forEach((group) => {
    const score = scoreGroup(haystack, SEASON_RULES[group] || []);
    if (score > best.score) {
      best = { group, score };
    }
  });
  if (best.score > 0) return best.group;
  return normalizeToken(plant.type).includes('lichen') || normalizeToken(plant.type).includes('moss')
    ? 'year-round'
    : 'summer';
}

function canonicalizeTag(rawTag) {
  const token = normalizeToken(rawTag);
  if (!token) return '';
  if (TAG_ALIASES[token]) return TAG_ALIASES[token];
  if (token.includes('berry')) return 'berries';
  if (token.includes('flower')) return 'flowers';
  if (token.includes('wind')) return 'wind-tolerant';
  if (token.includes('shade')) return 'shade';
  if (token.includes('spore')) return 'spore-bearing';
  if (token.includes('alpine') || token.includes('krummholz')) return 'alpine';
  if (token.includes('bog') || token.includes('wetland') || token.includes('peat')) return 'bog/wetland';
  if (token.includes('rock') || token.includes('talus') || token.includes('ledge')) return 'rocky-ledges';
  if (token.includes('forest') || token.includes('wood')) return 'forest-floor';
  if (token.includes('evergreen')) return 'evergreen';
  if (token.includes('deciduous')) return 'deciduous';
  if (token.includes('rare')) return 'rare';
  if (token.includes('pollinator')) return 'pollinator';
  return '';
}

function getImageCount(plant) {
  if (Array.isArray(plant.imgs) && plant.imgs.length) {
    return plant.imgs.filter((src) => String(src || '').trim().length > 0).length;
  }
  return String(plant.img || '').trim().length > 0 ? 1 : 0;
}

function buildCanonicalTags(plant, habitatGroup, seasonGroup) {
  const set = new Set();
  const typeTag = TYPE_TO_TAG[normalizeText(plant.type)] || '';
  if (typeTag) set.add(typeTag);
  if (habitatGroup && habitatGroup !== 'mixed') set.add(habitatGroup);
  if (seasonGroup === 'year-round') set.add('year-round');

  (plant.tags || []).forEach((tag) => {
    const canonical = canonicalizeTag(tag);
    if (canonical) set.add(canonical);
  });

  const textCanonical = canonicalizeTag([plant.habitat, plant.bloom, plant.teaser].join(' '));
  if (textCanonical) set.add(textCanonical);

  if (set.size === 0 && typeTag) set.add(typeTag);
  if (set.size === 0) set.add('mixed');

  const priority = new Map(PRIORITY_TAGS.map((tag, idx) => [tag, idx]));
  return Array.from(set).sort((a, b) => {
    const pa = priority.has(a) ? priority.get(a) : Number.MAX_SAFE_INTEGER;
    const pb = priority.has(b) ? priority.get(b) : Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });
}

function buildSearchTerms(plant, canonicalTags) {
  const terms = new Set();
  const pushTokens = (value, options = {}) => {
    const { tokenize = true } = options;
    const raw = String(value || '').trim();
    if (!raw) return;
    terms.add(raw.toLowerCase());
    if (tokenize) {
      normalizeText(raw)
        .split(/\s+/)
        .filter(Boolean)
        .forEach((token) => terms.add(token));
    }
  };

  [
    plant.id,
    plant.common,
    plant.latin,
    plant.type,
    plant.habitat,
    plant.bloom,
  ].forEach((value) => pushTokens(value));

  pushTokens(plant.teaser, { tokenize: false });
  (plant.tags || []).forEach((tag) => pushTokens(tag));
  canonicalTags.forEach((tag) => pushTokens(tag));

  return Array.from(terms)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 120);
}

function buildIndex(plants) {
  const records = {};
  const typeSet = new Set();
  const tagCounts = new Map();

  plants.forEach((plant) => {
    const id = String(plant.id || '').trim();
    if (!id) return;

    const habitatGroup = deriveHabitatGroup(plant);
    const seasonGroup = deriveSeasonGroup(plant);
    const canonicalTags = buildCanonicalTags(plant, habitatGroup, seasonGroup);
    const imageCount = getImageCount(plant);

    canonicalTags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
    if (plant.type) typeSet.add(String(plant.type).trim());

    records[id] = {
      habitat_group: habitatGroup,
      season_group: seasonGroup,
      canonical_tags: canonicalTags,
      search_terms: buildSearchTerms(plant, canonicalTags),
      has_gallery: imageCount > 1,
      image_count: imageCount,
    };
  });

  const sortedTypes = Array.from(typeSet).sort((a, b) => a.localeCompare(b));
  const sortedTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag);
    });

  return {
    generatedAt: new Date().toISOString(),
    source: 'data/howker-plants',
    plants: records,
    facets: {
      types: sortedTypes,
      habitat_groups: HABITAT_GROUPS.slice(),
      season_groups: SEASON_GROUPS.slice(),
      canonical_tags: sortedTags,
      quick_tags: sortedTags.slice(0, 12).map((entry) => entry.tag),
    },
  };
}

function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Missing input file: ${path.relative(ROOT, INPUT_PATH)}`);
    process.exit(1);
  }
  const plants = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  if (!Array.isArray(plants)) {
    console.error('Expected data/howker-plants to be a JSON array.');
    process.exit(1);
  }

  const index = buildIndex(plants);
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  console.log(
    `Built ${path.relative(ROOT, OUTPUT_PATH)} for ${Object.keys(index.plants).length} plant record(s).`
  );
}

main();
