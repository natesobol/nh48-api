#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'nh48.json');
const RANGES_DATA_PATH = path.join(ROOT, 'data', 'wmnf-ranges.json');
const PLANTS_PATH = path.join(ROOT, 'data', 'howker-plants');
const LONG_TRAILS_INDEX_PATH = path.join(ROOT, 'data', 'long-trails-index.json');
const SITEMAP_INDEX_OUTPUT = path.join(ROOT, 'sitemap.xml');
const PAGE_SITEMAP_OUTPUT = path.join(ROOT, 'page-sitemap.xml');
const IMAGE_SITEMAP_OUTPUT = path.join(ROOT, 'image-sitemap.xml');
const PEAK_BASE = 'https://nh48.info/peak';
const PEAK_BASE_FR = 'https://nh48.info/fr/peak';
const RANGE_BASE = 'https://nh48.info/range';
const PHOTO_BASE_URL = 'https://photos.nh48.info';
const PHOTO_PATH_PREFIX = '/nh48-photos/';
const STATIC_PAGE_ENTRIES = [
  { loc: 'https://nh48.info/', file: 'pages/index.html' },
  { loc: 'https://nh48.info/fr/', file: 'i18n/fr.html' },
  { loc: 'https://nh48.info/catalog', file: 'catalog/index.html' },
  { loc: 'https://nh48.info/fr/catalog', file: 'catalog/index.html' },
  { loc: 'https://nh48.info/catalog/ranges', file: 'catalog/ranges/index.html' },
  { loc: 'https://nh48.info/photos/', file: 'photos/index.html' },
  { loc: 'https://nh48.info/trails', file: 'trails/index.html' },
  { loc: 'https://nh48.info/fr/trails', file: 'trails/index.html' },
  { loc: 'https://nh48.info/long-trails', file: 'long-trails/index.html' },
  { loc: 'https://nh48.info/fr/long-trails', file: 'long-trails/index.html' },
  { loc: 'https://nh48.info/dataset', file: 'dataset/index.html' },
  { loc: 'https://nh48.info/fr/dataset', file: 'dataset/index.html' },
  { loc: 'https://nh48.info/dataset/wmnf-trails', file: 'dataset/wmnf-trails/index.html' },
  { loc: 'https://nh48.info/fr/dataset/wmnf-trails', file: 'dataset/wmnf-trails/index.html' },
  { loc: 'https://nh48.info/dataset/long-trails', file: 'dataset/long-trails/index.html' },
  { loc: 'https://nh48.info/fr/dataset/long-trails', file: 'dataset/long-trails/index.html' },
  { loc: 'https://nh48.info/dataset/howker-plants', file: 'dataset/howker-plants/index.html' },
  { loc: 'https://nh48.info/fr/dataset/howker-plants', file: 'dataset/howker-plants/index.html' },
  { loc: 'https://nh48.info/plant-catalog', file: 'pages/plant_catalog.html' },
  { loc: 'https://nh48.info/fr/plant-catalog', file: 'pages/plant_catalog.html' },
  { loc: 'https://nh48.info/projects/hrt-info', file: 'pages/hrt_info.html' },
  { loc: 'https://nh48.info/fr/projects/hrt-info', file: 'pages/hrt_info.fr.html' },
  { loc: 'https://nh48.info/projects/plant-map', file: 'pages/projects/plant-map.html' },
  {
    loc: 'https://nh48.info/projects/howker-map-editor',
    file: 'pages/projects/howker-map-editor.html',
    changefreq: 'monthly',
    priority: 0.5,
  },
  { loc: 'https://nh48.info/howker-ridge', file: 'pages/howker_ridge.html' },
  { loc: 'https://nh48.info/fr/howker-ridge', file: 'pages/howker_ridge.html' },
  { loc: 'https://nh48.info/howker-ridge/poi', file: 'pages/howker_poi.html' },
  { loc: 'https://nh48.info/fr/howker-ridge/poi', file: 'pages/howker_poi.html' },
  { loc: 'https://nh48.info/virtual-hike', file: 'pages/virtual_hike.html' },
  { loc: 'https://nh48.info/submit-edit', file: 'pages/submit_edit.html' },
  { loc: 'https://nh48.info/fr/submit-edit', file: 'pages/submit_edit.html' },
  { loc: 'https://nh48.info/peakid-game', file: 'peakid-game.html' },
  { loc: 'https://nh48.info/timed-peakid-game', file: 'timed-peakid-game.html' },
  {
    loc: 'https://nh48.info/pages/puzzle-game.html',
    file: 'pages/puzzle-game.html',
    changefreq: 'monthly',
    priority: 0.6,
  },
  { loc: 'https://nh48.info/nh-4000-footers-info', file: 'nh-4000-footers-info.html' },
  { loc: 'https://nh48.info/about', file: 'pages/about.html' },
  { loc: 'https://nh48.info/fr/about', file: 'pages/about.html' },
];
const STATIC_IMAGE_ENTRIES = [
  {
    loc: 'https://nh48.info/',
    file: 'pages/index.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/bondcliff/bondcliff__001.jpg',
        title: 'Bondcliff ridgeline looking into the Pemigewasset Wilderness',
        caption: 'Bondcliff ridgeline looking into the Pemigewasset Wilderness featured on the NH48 homepage.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/bondcliff/bondcliff__002.jpg',
        title: 'Bondcliff summit drop-off and alpine ridgeline',
        caption: 'Dramatic Bondcliff summit terrain along the Pemigewasset Loop.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/galehead-mountain/galehead-mountain__001.jpg',
        title: 'Twin Range view from Galehead Mountain',
        caption: 'Twin Range view from the wooded spur on Galehead Mountain.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/galehead-mountain/galehead-mountain__002.jpg',
        title: 'Galehead Hut and valley from Galehead outlook',
        caption: 'Galehead Hut and valley seen from the Galehead Mountain outlook.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/middle-carter-mountain/middle-carter-mountain__001.jpg',
        title: 'Middle Carter crest toward Carter Dome',
        caption: 'Forest crest route along Middle Carter Mountain toward Carter Dome.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-adams/mount-adams__002.jpg',
        title: 'Mount Adams alpine cone in the Presidential Range',
        caption: 'Rocky alpine cone of Mount Adams above treeline in the Presidential Range.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-adams/mount-adams__005.jpg',
        title: 'Mount Adams summit boulders and Mount Madison backdrop',
        caption: 'Summit boulders on Mount Adams with Mount Madison in the background.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-carrigain/mount-carrigain__001.jpg',
        title: 'Signal Ridge leading toward Mount Carrigain',
        caption: 'Signal Ridge approach to Mount Carrigain and the summit fire tower.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-garfield/mount-garfield__001.jpg',
        title: 'Open ledges on Mount Garfield',
        caption: 'Open ledges on Mount Garfield facing Franconia Ridge.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-lafayette/mount-lafayette__002.jpg',
        title: 'Franconia Ridge climb toward Mount Lafayette',
        caption: 'Franconia Ridge trail climbing toward the Mount Lafayette summit cone.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-liberty/mount-liberty__001.jpg',
        title: 'Mount Liberty summit view toward Mount Flume',
        caption: 'Summit view from Mount Liberty toward Mount Flume on Franconia Ridge.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-washington/mount-washington__001.jpg',
        title: 'Mount Washington observatory and summit buildings',
        caption: 'Summit buildings and weather observatory atop Mount Washington.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/catalog',
    file: 'catalog/index.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/bondcliff/bondcliff__001.jpg',
        title: 'Bondcliff ridgeline overlooking the Pemigewasset Wilderness',
        caption: 'Bondcliff ridgeline featured in the NH48 Peak Catalog.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-adams/mount-adams__001.jpg',
        title: 'Mount Adams alpine summit cone',
        caption: 'Mount Adams alpine terrain featured in the NH48 Peak Catalog.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-washington/mount-washington__001.jpg',
        title: 'Mount Washington summit buildings and observatory',
        caption: 'Mount Washington summit photo featured in the NH48 Peak Catalog.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-liberty/mount-liberty__001.jpg',
        title: 'Mount Liberty summit view toward Mount Flume',
        caption: 'Mount Liberty summit view featured in the NH48 Peak Catalog.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-lafayette/mount-lafayette__002.jpg',
        title: 'Franconia Ridge trail climbing toward the Mount Lafayette summit cone',
        caption: 'Franconia Ridge trail climbing toward Mount Lafayette, featured on the NH48 catalog.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-carrigain/mount-carrigain__001.jpg',
        title: 'Signal Ridge approach to Mount Carrigain',
        caption: 'Mount Carrigain summit approach featured in the NH48 Peak Catalog.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-garfield/mount-garfield__001.jpg',
        title: 'Open ledges on Mount Garfield',
        caption: 'Open ledges on Mount Garfield featured in the NH48 Peak Catalog.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/galehead-mountain/galehead-mountain__001.jpg',
        title: 'Twin Range view from Galehead Mountain',
        caption: 'Galehead Mountain viewpoint featured in the NH48 Peak Catalog.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/fr/catalog',
    file: 'catalog/index.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/bondcliff/bondcliff__001.jpg',
        title: 'Bondcliff ridgeline overlooking the Pemigewasset Wilderness',
        caption: 'Bondcliff ridgeline featured in the NH48 Peak Catalog.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-adams/mount-adams__001.jpg',
        title: 'Mount Adams alpine summit cone',
        caption: 'Mount Adams alpine terrain featured in the NH48 Peak Catalog.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-washington/mount-washington__001.jpg',
        title: 'Mount Washington summit buildings and observatory',
        caption: 'Mount Washington summit photo featured in the NH48 Peak Catalog.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-liberty/mount-liberty__001.jpg',
        title: 'Mount Liberty summit view toward Mount Flume',
        caption: 'Mount Liberty summit view featured in the NH48 Peak Catalog.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-lafayette/mount-lafayette__002.jpg',
        title: 'Franconia Ridge trail climbing toward the Mount Lafayette summit cone',
        caption: 'Franconia Ridge trail climbing toward Mount Lafayette, featured on the NH48 catalog.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-carrigain/mount-carrigain__001.jpg',
        title: 'Signal Ridge approach to Mount Carrigain',
        caption: 'Mount Carrigain summit approach featured in the NH48 Peak Catalog.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-garfield/mount-garfield__001.jpg',
        title: 'Open ledges on Mount Garfield',
        caption: 'Open ledges on Mount Garfield featured in the NH48 Peak Catalog.',
      },
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/galehead-mountain/galehead-mountain__001.jpg',
        title: 'Twin Range view from Galehead Mountain',
        caption: 'Galehead Mountain viewpoint featured in the NH48 Peak Catalog.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/catalog/ranges',
    file: 'catalog/ranges/index.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-lafayette/mount-lafayette__001.jpg',
        title: 'Mount Lafayette highlights in the NH48 Range Catalog',
        caption: 'Mount Lafayette featured in the NH48 range catalog.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/photos/',
    file: 'photos/index.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-washington/mount-washington__001.jpg',
        title: 'Mount Washington summit buildings and observatory',
        caption: 'Featured Mount Washington summit photo for the NH48 photo hub.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/trails',
    file: 'trails/index.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-garfield/mount-garfield__002.jpg',
        title: 'Summit cairn on Mount Garfield looking over the Pemigewasset',
        caption: 'Summit cairn on Mount Garfield featured on the NH48 trails page.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/long-trails',
    file: 'long-trails/index.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/west-bond/west-bond__001.jpg',
        title: 'West Bond summit rocks overlooking Zealand Valley and Bondcliff',
        caption: 'West Bond summit photo featured on the NH48 long-trails page.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/dataset',
    file: 'dataset/index.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/galehead-mountain/galehead-mountain__001.jpg',
        title: 'View of the Twin Range from the wooded spur on Galehead Mountain',
        caption: 'Dataset hub preview image featuring Galehead Mountain.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/dataset/wmnf-trails',
    file: 'dataset/wmnf-trails/index.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-washington/mount-washington__003.jpg',
        title: 'Summit buildings and alpine terrain on Mount Washington',
        caption: 'WMNF trails dataset preview image showing Mount Washington.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/dataset/long-trails',
    file: 'dataset/long-trails/index.html',
    images: [
      {
        url: 'https://nh48.info/Long_Trails_Logo.png',
        title: 'Long Trails open data logo for the Appalachian Trail, PCT, and CDT dataset',
        caption: 'Long Trails dataset logo.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/dataset/howker-plants',
    file: 'dataset/howker-plants/index.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-madison/mount-madison__002.jpg',
        title: 'Alpine boulder field on Mount Madison',
        caption: 'Howker plants dataset preview image featuring Mount Madison.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/nh-4000-footers-info',
    file: 'nh-4000-footers-info.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-madison/mount-madison__001.jpg',
        title: 'Mount Madison summit boulders under dramatic skies in the Presidential Range',
        caption: 'Mount Madison summit boulders under dramatic skies, featured on the NH48 info hub.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/projects/plant-map',
    file: 'pages/projects/plant-map.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-madison/mount-madison__003.jpg',
        title: 'Mount Madison ridge view with alpine terrain and distant peaks',
        caption: 'Mount Madison ridge view featured on the Howker Ridge plant log map.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/projects/hrt-info',
    file: 'pages/hrt_info.html',
    images: [
      {
        url: 'https://howker.nh48.info/cdn-cgi/image/format=webp,quality=85,width=1200/third-howk/third-howk-001.jpg',
        title: 'Third Howk ridgeline with alpine terrain and sweeping views',
        caption: 'Howker Ridge Trail guide preview image.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/howker-ridge',
    file: 'pages/howker_ridge.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-madison/mount-madison__003.jpg',
        title: 'Mount Madison ridge view with alpine terrain and distant peaks',
        caption: 'Howker Ridge trail map preview image.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/howker-ridge/poi',
    file: 'pages/howker_poi.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-madison/mount-madison__003.jpg',
        title: 'Mount Madison ridge view with alpine terrain and distant peaks',
        caption: 'Howker Ridge points of interest preview image.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/plant-catalog',
    file: 'pages/plant_catalog.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-madison/mount-madison__003.jpg',
        title: 'Mount Madison ridge view with alpine terrain and distant peaks',
        caption: 'Alpine plant catalog preview image.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/virtual-hike',
    file: 'pages/virtual_hike.html',
    images: [
      {
        url: 'https://nh48.info/assets/virtual-hike-thumbnail.jpg',
        title: 'Virtual hike overview of Howker Ridge',
        caption: 'Virtual hike preview image for the Howker Ridge 3D experience.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/peakid-game',
    file: 'peakid-game.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-lafayette/mount-lafayette__002.jpg',
        title: 'Franconia Ridge trail climbing toward the Mount Lafayette summit cone',
        caption: 'PeakID game preview image featuring Mount Lafayette.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/timed-peakid-game',
    file: 'timed-peakid-game.html',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-lafayette/mount-lafayette__002.jpg',
        title: 'Franconia Ridge trail climbing toward the Mount Lafayette summit cone',
        caption: 'Franconia Ridge trail climbing toward Mount Lafayette, featured on the timed PeakID game.',
      },
    ],
  },
];
const IMAGE_LICENSE_URL = 'https://nh48.info/licensing';

const readJsonFile = (filePath, label) => {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  try {
    return JSON.parse(raw);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    const match = message.match(/position (\d+)/);
    if (match) {
      const pos = Number(match[1]);
      const start = Math.max(0, pos - 120);
      const end = Math.min(raw.length, pos + 120);
      const context = raw.slice(start, end);
      console.error(`Failed to parse ${label} at ${filePath} (position ${pos}).`);
      console.error('Context:', context);
    } else {
      console.error(`Failed to parse ${label} at ${filePath}.`);
    }

    const lastClose = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
    if (lastClose > -1 && lastClose < raw.length - 1) {
      const truncated = raw.slice(0, lastClose + 1).trimEnd();
      try {
        console.warn(`Recovered ${label} by truncating trailing data after position ${lastClose}.`);
        return JSON.parse(truncated);
      } catch (recoveryErr) {
        console.error('Recovery parse failed:', recoveryErr);
      }
    }
    throw err;
  }
};

const data = readJsonFile(DATA_PATH, 'data');
const rangesData = readJsonFile(RANGES_DATA_PATH, 'range data');
const plantData = readJsonFile(PLANTS_PATH, 'plant data');
const longTrailsIndexData = readJsonFile(LONG_TRAILS_INDEX_PATH, 'long trails index');

// Normalize strings for web output and repair common mojibake.
const normalizeTextForWeb = (input) => {
  if (!input) return '';
  let s = String(input);
  try {
    if (/[\u00C3\u00C2\u00E2]/.test(s)) {
      s = Buffer.from(s, 'latin1').toString('utf8');
    }
  } catch (error) {
    // Keep original text if repair fails.
  }
  s = s
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2013|\u2014/g, ' - ');
  return s.replace(/\s+/g, ' ').trim();
};

const cleanText = (value) => {
  if (value === null || value === undefined) return '';
  let s = String(value)
    .replace(/:contentReference\[[^\]]*\]\{[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalizeTextForWeb(s);
};

const escapeXml = (value) => {
  const s = normalizeTextForWeb(value);
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

function pickFirstNonEmpty(...vals) {
  for (const v of vals) {
    if (!v) continue;
    const s = normalizeTextForWeb(v);
    if (s) return s;
  }
  return '';
}

function isSlugLike(value) {
  if (!value) return false;
  const s = normalizeTextForWeb(value);
  if (!s || /\s/.test(s)) return false;
  return /^[a-z0-9]+([_-][a-z0-9]+)+$/i.test(s);
}

function normalizeTrailSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '');
}

function resolveTrailSectionCount(trail) {
  if (!trail || typeof trail !== 'object') return 0;
  const direct = Number(trail.sectionCount || trail.section_count || trail.sectionsCount);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const statsCount = Number(trail.stats?.sectionCount || trail.stats?.sectionsCount);
  if (Number.isFinite(statsCount) && statsCount > 0) return statsCount;
  if (Array.isArray(trail.sections)) return trail.sections.length;
  return 0;
}

function collectLongTrailSlugs() {
  const source = Array.isArray(longTrailsIndexData?.trails) ? longTrailsIndexData.trails : [];
  const seen = new Set();
  const slugs = [];
  source.forEach((trail) => {
    const slug = normalizeTrailSlug(trail?.slug || trail?.id);
    if (!slug || seen.has(slug)) return;
    if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(slug)) return;
    if (resolveTrailSectionCount(trail) <= 0) return;
    seen.add(slug);
    slugs.push(slug);
  });
  return slugs;
}

function formatCameraBits(photo) {
  const bits = [];
  const cam = pickFirstNonEmpty(photo.cameraModel, photo.camera);
  const lens = pickFirstNonEmpty(photo.lens);
  const focal = pickFirstNonEmpty(photo.focalLength);
  const iso = pickFirstNonEmpty(photo.iso);
  const fstop = pickFirstNonEmpty(photo.fStop);
  const ss = pickFirstNonEmpty(photo.shutterSpeed);
  if (cam) bits.push(cam);
  if (lens) bits.push(lens);
  if (focal) bits.push(focal);
  if (fstop) bits.push(`f/${String(fstop).replace(/^f\//, '')}`);
  if (ss) bits.push(ss);
  if (iso) bits.push(`ISO ${iso}`);
  return bits.length ? bits.join(' " ') : '';
}

function formatDescriptorBits(photo) {
  const bits = [];
  const season = pickFirstNonEmpty(photo.season);
  const tod = pickFirstNonEmpty(photo.timeOfDay);
  const orient = pickFirstNonEmpty(photo.orientation);
  if (season) bits.push(season);
  if (tod) bits.push(tod);
  if (orient) bits.push(orient);
  const tags = Array.isArray(photo.tags) ? photo.tags.map(normalizeTextForWeb).filter(Boolean) : [];
  for (const t of tags.slice(0, 3)) bits.push(t);
  return bits.length ? bits.join(', ') : '';
}

function buildPhotoTitleUnique(peakName, photo) {
  const explicit = pickFirstNonEmpty(photo.headline, photo.altText, photo.caption);
  if (explicit && !isSlugLike(explicit)) return explicit;
  const titleCandidate = pickFirstNonEmpty(photo.title);
  if (titleCandidate && !isSlugLike(titleCandidate)) return titleCandidate;
  const descBits = formatDescriptorBits(photo);
  const cameraBits = formatCameraBits(photo);
  let title = `${peakName} - White Mountain National Forest (New Hampshire)`;
  if (descBits) title = `${peakName} - ${descBits} - White Mountain National Forest (New Hampshire)`;
  if (cameraBits) title = `${title} - ${cameraBits}`;
  return title;
}

function buildPhotoCaptionUnique(peakName, photo) {
  const explicit = pickFirstNonEmpty(photo.description, photo.extendedDescription, photo.caption, photo.altText);
  if (explicit) return explicit;
  const descBits = formatDescriptorBits(photo);
  const cameraBits = formatCameraBits(photo);
  let caption = `Landscape photograph of ${peakName} in the White Mountain National Forest, New Hampshire.`;
  if (descBits) caption = `${caption} Details: ${descBits}.`;
  if (cameraBits) caption = `${caption} Camera: ${cameraBits}.`;
  return caption;
}

function uniqueify(text, photo, usedSet) {
  let out = normalizeTextForWeb(text);
  if (!usedSet.has(out)) {
    usedSet.add(out);
    return out;
  }
  const source = pickFirstNonEmpty(photo.photoId, photo.filename, photo.url);
  let id = 'image';
  if (source) {
    try {
      const url = new URL(source, 'https://nh48.info');
      const base = path.basename(url.pathname);
      id = base || source.slice(-12);
    } catch (err) {
      id = source.slice(-12);
    }
  }
  out = `${out} (${id})`;
  usedSet.add(out);
  return out;
}

const getGitLastmod = (filePath) => {
  if (!filePath) return '';
  const relativePath = path.isAbsolute(filePath) ? path.relative(ROOT, filePath) : filePath;
  if (!fs.existsSync(path.join(ROOT, relativePath))) return '';
  try {
    const output = execSync(`git log -1 --format=%cI -- "${relativePath}"`, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return output || '';
  } catch (error) {
    return '';
  }
};

const normalizePhotoUrl = (url) => {
  if (!url) return url;
  if (url.startsWith(PHOTO_BASE_URL)) return url;
  if (url.includes('r2.cloudflarestorage.com/nh48-photos/')) {
    const [, tail] = url.split(PHOTO_PATH_PREFIX);
    return tail ? `${PHOTO_BASE_URL}/${tail}` : url;
  }
  if (
    url.includes('cdn.jsdelivr.net/gh/natesobol/nh48-api@main/photos/') ||
    url.includes('raw.githubusercontent.com/natesobol/nh48-api/main/photos/')
  ) {
    const [, tail] = url.split('/photos/');
    return tail ? `${PHOTO_BASE_URL}/${tail}` : url;
  }
  return url;
};

const buildImageEntries = (photos, peakName) => {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((photo) => {
      if (typeof photo === 'string') {
        const entryPhoto = { url: photo };
        return {
          url: normalizePhotoUrl(photo),
          caption: buildPhotoCaptionUnique(peakName, entryPhoto),
          title: buildPhotoTitleUnique(peakName, entryPhoto),
        };
      }
      if (!photo || !photo.url) return null;
      return {
        url: normalizePhotoUrl(photo.url),
        caption: buildPhotoCaptionUnique(peakName, photo),
        title: buildPhotoTitleUnique(peakName, photo),
      };
    })
    .filter(Boolean);
};

const scoreImageDetail = (image) => {
  const caption = cleanText(image.caption);
  const title = cleanText(image.title);
  return (caption ? caption.length + 10 : 0) + (title ? title.length + 5 : 0);
};

const dedupeImages = (images) => {
  const bestByUrl = new Map();
  images.forEach((image) => {
    if (!image.url) return;
    const key = image.url;
    const existing = bestByUrl.get(key);
    if (!existing || scoreImageDetail(image) > scoreImageDetail(existing)) {
      bestByUrl.set(key, image);
    }
  });
  return Array.from(bestByUrl.values());
};

const slugs = Object.keys(data).sort();
const rangeSlugs = Object.keys(rangesData).sort();
const longTrailSlugs = collectLongTrailSlugs();

const buildPlantImageEntries = () => {
  const entries = [];
  if (!Array.isArray(plantData)) return entries;
  const plantLastmod = getGitLastmod(PLANTS_PATH);
  for (const plant of plantData) {
    if (!plant) continue;
    const name = normalizeTextForWeb(plant.common || plant.latin || plant.id || 'Plant');
    const imgs = Array.isArray(plant.imgs) && plant.imgs.length ? plant.imgs : (plant.img ? [plant.img] : []);
    const images = dedupeImages(buildImageEntries(imgs, name));
    if (images.length) {
      entries.push({ loc: `https://nh48.info/plant/${encodeURIComponent(plant.id)}`, images, lastmod: plantLastmod });
      entries.push({ loc: `https://nh48.info/fr/plant/${encodeURIComponent(plant.id)}`, images, lastmod: plantLastmod });
    }
  }
  return entries;
};

const buildPageSitemap = () => {
  const urls = [];
  STATIC_PAGE_ENTRIES.forEach((entry) =>
    urls.push({
      loc: entry.loc,
      lastmod: getGitLastmod(entry.file),
      changefreq: entry.changefreq,
      priority: entry.priority,
    }),
  );
  const longTrailLastmod = getGitLastmod('data/long-trails-index.json') || getGitLastmod('long-trails/index.html');
  longTrailSlugs.forEach((slug) => {
    urls.push({
      loc: `https://nh48.info/trails/${slug}`,
      lastmod: longTrailLastmod
    });
    urls.push({
      loc: `https://nh48.info/fr/trails/${slug}`,
      lastmod: longTrailLastmod
    });
  });
  slugs.forEach((slug) => {
    urls.push({
      loc: `${PEAK_BASE}/${slug}`,
      lastmod: getGitLastmod(path.join('peaks', slug, 'index.html')),
    });
    urls.push({
      loc: `${PEAK_BASE_FR}/${slug}`,
      lastmod: getGitLastmod(path.join('fr', 'peaks', slug, 'index.html')),
    });
  });
  const rangeLastmod = getGitLastmod('range/index.html');
  rangeSlugs.forEach((slug) => {
    urls.push({
      loc: `${RANGE_BASE}/${slug}/`,
      lastmod: rangeLastmod,
    });
  });

  if (Array.isArray(plantData)) {
    const plantLastmod = getGitLastmod(PLANTS_PATH);
    plantData.forEach((plant) => {
      if (!plant || !plant.id) return;
      urls.push({
        loc: `https://nh48.info/plant/${encodeURIComponent(plant.id)}`,
        lastmod: plantLastmod,
      });
      urls.push({
        loc: `https://nh48.info/fr/plant/${encodeURIComponent(plant.id)}`,
        lastmod: plantLastmod,
      });
    });
  }

  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  urls.forEach((entry) => {
    parts.push('  <url>');
    parts.push(`    <loc>${escapeXml(entry.loc)}</loc>`);
    if (entry.lastmod) {
      parts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
    }
    if (entry.changefreq) {
      parts.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`);
    }
    if (entry.priority !== undefined && entry.priority !== null) {
      parts.push(`    <priority>${entry.priority}</priority>`);
    }
    parts.push('  </url>');
  });
  parts.push('</urlset>');

  fs.writeFileSync(PAGE_SITEMAP_OUTPUT, `${parts.join('\n')}\n`);
  console.log(`Wrote ${urls.length} URLs to ${PAGE_SITEMAP_OUTPUT}`);
};

const buildImageSitemap = () => {
  const urlEntries = [];
  const allImages = [];

  slugs.forEach((slug) => {
    const peak = data[slug] || {};
    const name = peak.peakName || peak['Peak Name'] || slug;
    const images = dedupeImages(buildImageEntries(peak.photos, name));
    if (!images.length) return;
    const lastmod = getGitLastmod(path.join('peaks', slug, 'index.html'));
    urlEntries.push({ loc: `${PEAK_BASE}/${slug}`, images, lastmod });
    urlEntries.push({ loc: `${PEAK_BASE}/${slug}/photos`, images, lastmod });
    allImages.push(...images);
  });

  if (allImages.length) {
    const photosLastmod = getGitLastmod('photos/index.html');
    urlEntries.unshift({
      loc: 'https://nh48.info/photos/',
      images: dedupeImages(allImages),
      lastmod: photosLastmod,
    });
  }

  const plantEntries = buildPlantImageEntries();
  urlEntries.push(...plantEntries);
  const staticEntries = STATIC_IMAGE_ENTRIES.map((entry) => ({
    ...entry,
    lastmod: entry.file ? getGitLastmod(entry.file) : undefined,
    images: dedupeImages(
      (entry.images || []).map((image) => ({
        ...image,
        url: normalizePhotoUrl(image.url),
      })),
    ),
  }));
  urlEntries.push(...staticEntries);

  const xmlParts = [];
  xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
  xmlParts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  xmlParts.push('        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">');

  urlEntries.forEach((entry) => {
    xmlParts.push('  <url>');
    xmlParts.push(`    <loc>${escapeXml(entry.loc)}</loc>`);
    if (entry.lastmod) {
      xmlParts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
    }
    const usedTitles = new Set();
    const usedCaptions = new Set();
    entry.images.forEach((image) => {
      const title = uniqueify(image.title, { url: image.url }, usedTitles);
      const caption = uniqueify(image.caption, { url: image.url }, usedCaptions);
      xmlParts.push('    <image:image>');
      xmlParts.push(`      <image:loc>${escapeXml(image.url)}</image:loc>`);
      xmlParts.push(`      <image:caption>${escapeXml(caption)}</image:caption>`);
      xmlParts.push(`      <image:title>${escapeXml(title)}</image:title>`);
      xmlParts.push(`      <image:license>${escapeXml(IMAGE_LICENSE_URL)}</image:license>`);
      xmlParts.push('    </image:image>');
    });
    xmlParts.push('  </url>');
  });

  xmlParts.push('</urlset>');

  fs.writeFileSync(IMAGE_SITEMAP_OUTPUT, `${xmlParts.join('\n')}\n`);
  console.log(`Wrote ${urlEntries.length} URL entries to ${IMAGE_SITEMAP_OUTPUT}`);
};

const buildSitemapIndex = () => {
  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  parts.push(`  <sitemap><loc>${escapeXml('https://nh48.info/page-sitemap.xml')}</loc></sitemap>`);
  parts.push(`  <sitemap><loc>${escapeXml('https://nh48.info/image-sitemap.xml')}</loc></sitemap>`);
  parts.push('</sitemapindex>');
  fs.writeFileSync(SITEMAP_INDEX_OUTPUT, `${parts.join('\n')}\n`);
  console.log(`Wrote sitemap index to ${SITEMAP_INDEX_OUTPUT}`);
};

try {
  buildPageSitemap();
  buildImageSitemap();
  buildSitemapIndex();
} catch (err) {
  console.error('Error while generating sitemaps:', err);
  process.exit(1);
}
