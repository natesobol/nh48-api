const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const I18N_DIR = path.join(ROOT, 'i18n');
const DATA_DIR = path.join(ROOT, 'data');
const OVERLAY_ROOT = path.join(DATA_DIR, 'i18n-content');

const DATASET_PATHS = {
  nh48: path.join(DATA_DIR, 'nh48.json'),
  nh52wav: path.join(DATA_DIR, 'NH52WAV.json'),
  wikiPlants: path.join(DATA_DIR, 'wiki', 'plants.json'),
  wikiAnimals: path.join(DATA_DIR, 'wiki', 'animals.json'),
  wikiPlantDisease: path.join(DATA_DIR, 'wiki', 'plant-disease.json')
};

const OVERLAY_FILENAMES = {
  nh48: 'nh48.overlay.json',
  nh52wav: 'nh52wav.overlay.json',
  wikiPlants: 'wiki-plants.overlay.json',
  wikiAnimals: 'wiki-animals.overlay.json',
  wikiPlantDisease: 'wiki-plant-disease.overlay.json'
};

const MOUNTAIN_STRING_FIELDS = [
  'description',
  'Difficulty',
  'Trail Type',
  'View Type',
  'Best Seasons to Hike',
  'Exposure Level',
  'Terrain Character',
  'Scramble Sections',
  'Water Availability',
  'Cell Reception Quality',
  'Nearby Notable Features',
  'Weather Exposure Rating',
  'Emergency Bailout Options',
  'Parking Notes',
  'Dog Friendly',
  'Typical Completion Time',
  'Summit Marker Type',
  'Flora/Environment Zones',
  'Nearby 4000-footer Connections'
];

const WIKI_PLANT_FIELDS = [
  'type',
  'habitat',
  'bloomPeriod',
  'description',
  'ecology',
  'conservationStatus',
  'tags'
];

const WIKI_ANIMAL_FIELDS = [
  'type',
  'habitat',
  'diet',
  'activityPattern',
  'conservationStatus',
  'description',
  'tags'
];

const WIKI_PLANT_DISEASE_FIELDS = [
  'causal_agent',
  'agent_type',
  'hosts',
  'life_cycle',
  'symptoms',
  'typical_impact',
  'distribution',
  'association_with_logging',
  'invasive_status',
  'detection_methods',
  'management',
  'ecological_impacts',
  'notes'
];

const ROUTE_EXCLUDE_KEYS = new Set([
  'Route Name',
  'Trailhead',
  'Coordinates',
  'Map URL',
  'Map Url',
  'URL',
  'Url',
  'GPX',
  'gpx'
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function getLocaleCodes() {
  return fs
    .readdirSync(I18N_DIR)
    .filter(
      (name) =>
        name.endsWith('.json') &&
        name !== 'en.json' &&
        name !== 'hrt_terms.json' &&
        name !== 'domain-glossary.json'
    )
    .map((name) => name.replace(/\.json$/i, ''))
    .sort((a, b) => a.localeCompare(b));
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function cloneStringArray(value) {
  if (!Array.isArray(value)) return null;
  const items = value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  return items.length ? items : null;
}

function cloneSelectedFields(source, allowedFields) {
  const output = {};
  allowedFields.forEach((field) => {
    const value = source ? source[field] : undefined;
    if (isNonEmptyString(value)) {
      output[field] = value;
      return;
    }
    const stringArray = cloneStringArray(value);
    if (stringArray) {
      output[field] = stringArray;
    }
  });
  return output;
}

function buildRouteOverlayArray(routes) {
  if (!Array.isArray(routes)) return null;
  const translatedRoutes = routes
    .map((route) => {
      if (!route || typeof route !== 'object' || Array.isArray(route)) return null;
      const row = {};
      Object.entries(route).forEach(([key, value]) => {
        if (ROUTE_EXCLUDE_KEYS.has(key)) return;
        if (isNonEmptyString(value)) {
          row[key] = value;
          return;
        }
        const stringArray = cloneStringArray(value);
        if (stringArray) {
          row[key] = stringArray;
        }
      });
      return Object.keys(row).length ? row : null;
    })
    .filter(Boolean);
  return translatedRoutes.length ? translatedRoutes : null;
}

function buildMountainOverlayPayload(data) {
  const payload = {};
  Object.entries(data || {}).forEach(([slug, entry]) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const translated = cloneSelectedFields(entry, MOUNTAIN_STRING_FIELDS);
    const routeOverlay = buildRouteOverlayArray(entry['Standard Routes']);
    if (routeOverlay) {
      translated['Standard Routes'] = routeOverlay;
    }
    if (Object.keys(translated).length) {
      payload[slug] = translated;
    }
  });
  return payload;
}

function buildWikiArrayOverlayPayload(entries, allowedFields) {
  const payload = {};
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const slug = typeof entry.slug === 'string' ? entry.slug.trim().toLowerCase() : '';
    if (!slug) return;
    const translated = cloneSelectedFields(entry, allowedFields);
    if (Object.keys(translated).length) {
      payload[slug] = translated;
    }
  });
  return payload;
}

function buildWikiPlantDiseaseOverlayPayload(diseaseRoot) {
  const payload = {};
  const diseases = Array.isArray(diseaseRoot && diseaseRoot.diseases) ? diseaseRoot.diseases : [];
  diseases.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const slug = String(entry.slug || entry.id || '').trim().toLowerCase();
    if (!slug) return;
    const translated = cloneSelectedFields(entry, WIKI_PLANT_DISEASE_FIELDS);
    if (Object.keys(translated).length) {
      payload[slug] = translated;
    }
  });
  return payload;
}

function loadSourceDatasets() {
  return {
    nh48: readJson(DATASET_PATHS.nh48),
    nh52wav: readJson(DATASET_PATHS.nh52wav),
    wikiPlants: readJson(DATASET_PATHS.wikiPlants),
    wikiAnimals: readJson(DATASET_PATHS.wikiAnimals),
    wikiPlantDisease: readJson(DATASET_PATHS.wikiPlantDisease)
  };
}

function buildExpectedOverlayScaffoldFromSource(sourceDatasets) {
  return {
    nh48: buildMountainOverlayPayload(sourceDatasets.nh48),
    nh52wav: buildMountainOverlayPayload(sourceDatasets.nh52wav),
    wikiPlants: buildWikiArrayOverlayPayload(sourceDatasets.wikiPlants, WIKI_PLANT_FIELDS),
    wikiAnimals: buildWikiArrayOverlayPayload(sourceDatasets.wikiAnimals, WIKI_ANIMAL_FIELDS),
    wikiPlantDisease: buildWikiPlantDiseaseOverlayPayload(sourceDatasets.wikiPlantDisease)
  };
}

function getOverlayPath(locale, datasetKey) {
  const filename = OVERLAY_FILENAMES[datasetKey];
  if (!filename) {
    throw new Error(`Unknown overlay dataset key "${datasetKey}"`);
  }
  return path.join(OVERLAY_ROOT, locale, filename);
}

module.exports = {
  ROOT,
  I18N_DIR,
  OVERLAY_ROOT,
  DATASET_PATHS,
  OVERLAY_FILENAMES,
  readJson,
  writeJson,
  getLocaleCodes,
  loadSourceDatasets,
  buildExpectedOverlayScaffoldFromSource,
  getOverlayPath
};
