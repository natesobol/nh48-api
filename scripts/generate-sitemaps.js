#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'nh48.json');
const PLANTS_PATH = path.join(ROOT, 'data', 'howker-plants');
const SITEMAP_INDEX_OUTPUT = path.join(ROOT, 'sitemap.xml');
const PAGE_SITEMAP_OUTPUT = path.join(ROOT, 'page-sitemap.xml');
const IMAGE_SITEMAP_OUTPUT = path.join(ROOT, 'image-sitemap.xml');
const PEAK_BASE = 'https://nh48.info/peak';
const PEAK_BASE_FR = 'https://nh48.info/fr/peak';
const PHOTO_BASE_URL = 'https://photos.nh48.info';
const PHOTO_PATH_PREFIX = '/nh48-photos/';
const STATIC_PAGE_ENTRIES = [
  { loc: 'https://nh48.info/', file: 'index.html' },
  { loc: 'https://nh48.info/catalog', file: 'catalog.html' },
  { loc: 'https://nh48.info/photos/', file: 'photos/index.html' },
  { loc: 'https://nh48.info/trails', file: 'trails/index.html' },
  { loc: 'https://nh48.info/long-trails', file: 'long-trails/index.html' },
  { loc: 'https://nh48.info/plant-catalog', file: 'pages/plant_catalog.html' },
  { loc: 'https://nh48.info/projects/hrt-info', file: 'pages/hrt_info.html' },
  { loc: 'https://nh48.info/projects/plant-map', file: 'pages/projects/plant-map.html' },
  {
    loc: 'https://nh48.info/projects/howker-map-editor',
    file: 'pages/projects/howker-map-editor.html',
    changefreq: 'monthly',
    priority: 0.5,
  },
  { loc: 'https://nh48.info/howker-ridge', file: 'pages/howker_ridge.html' },
  { loc: 'https://nh48.info/virtual-hike', file: 'pages/virtual_hike.html' },
  { loc: 'https://nh48.info/peakid-game', file: 'peakid-game.html' },
  { loc: 'https://nh48.info/timed-peakid-game', file: 'timed-peakid-game.html' },
  {
    loc: 'https://nh48.info/pages/puzzle-game.html',
    file: 'pages/puzzle-game.html',
    changefreq: 'monthly',
    priority: 0.6,
  },
  { loc: 'https://nh48.info/nh-4000-footers-info', file: 'nh-4000-footers-info.html' },
];
const STATIC_IMAGE_ENTRIES = [
  {
    loc: 'https://nh48.info/',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/bondcliff/bondcliff__001.jpg',
        title: 'Bondcliff ridgeline looking into the Pemigewasset Wilderness',
        caption: 'Bondcliff ridgeline looking into the Pemigewasset Wilderness featured on the NH48 homepage.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/catalog',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-lafayette/mount-lafayette__002.jpg',
        title: 'Franconia Ridge trail climbing toward the Mount Lafayette summit cone',
        caption: 'Franconia Ridge trail climbing toward Mount Lafayette, featured on the NH48 catalog.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/photos/',
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-washington/mount-washington__001.jpg',
        title: 'Mount Washington summit buildings and observatory',
        caption: 'Featured Mount Washington summit photo for the NH48 photo hub.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/nh-4000-footers-info',
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
    images: [
      {
        url: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-madison/mount-madison__003.jpg',
        title: 'Mount Madison ridge view with alpine terrain and distant peaks',
        caption: 'Mount Madison ridge view featured on the Howker Ridge plant log map.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/virtual-hike',
    images: [
      {
        url: 'https://nh48.info/assets/virtual-hike-thumbnail.jpg',
        title: 'Virtual hike overview of Howker Ridge',
        caption: 'Virtual hike preview image for the Howker Ridge 3D experience.',
      },
    ],
  },
  {
    loc: 'https://nh48.info/timed-peakid-game',
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

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const plantData = JSON.parse(fs.readFileSync(PLANTS_PATH, 'utf8'));

// Normalize strings for web output. Fixes common mojibake (â€” → —, etc.)
// and replaces em/en dashes with a simple hyphen for XML.
const normalizeTextForWeb = (input) => {
  if (!input) return '';
  let s = String(input);
  // Fix UTF-8 / Windows-1252 mixups
  s = s
    .replace(/â€”/g, '—')
    .replace(/â€“/g, '–')
    .replace(/â€˜|â€™/g, "'")
    .replace(/â€œ|â€�/g, '"')
    .replace(/Â/g, '');
  // Normalize dashes
  s = s.replace(/[—–]/g, ' - ');
  // Collapse whitespace
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
  return bits.length ? bits.join(' • ') : '';
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
  const id = source ? source.slice(-12) : 'image';
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

const buildPlantImageEntries = () => {
  const entries = [];
  if (!Array.isArray(plantData)) return entries;
  for (const plant of plantData) {
    if (!plant) continue;
    const name = normalizeTextForWeb(plant.common || plant.latin || plant.id || 'Plant');
    const imgs = Array.isArray(plant.imgs) && plant.imgs.length ? plant.imgs : (plant.img ? [plant.img] : []);
    const images = dedupeImages(buildImageEntries(imgs, name));
    if (images.length) {
      entries.push({ loc: `https://nh48.info/plant/${encodeURIComponent(plant.id)}`, images });
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

  if (Array.isArray(plantData)) {
    const plantLastmod = getGitLastmod(PLANTS_PATH);
    plantData.forEach((plant) => {
      if (!plant || !plant.id) return;
      urls.push({
        loc: `https://nh48.info/plant/${encodeURIComponent(plant.id)}`,
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
    urlEntries.push({ loc: `${PEAK_BASE}/${slug}`, images });
    urlEntries.push({ loc: `${PEAK_BASE}/${slug}/photos`, images });
    allImages.push(...images);
  });

  if (allImages.length) {
    urlEntries.unshift({
      loc: 'https://nh48.info/photos/',
      images: dedupeImages(allImages),
    });
  }

  const plantEntries = buildPlantImageEntries();
  urlEntries.push(...plantEntries);
  const staticEntries = STATIC_IMAGE_ENTRIES.map((entry) => ({
    ...entry,
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
