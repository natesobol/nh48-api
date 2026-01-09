#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'nh48.json');
const SITEMAP_INDEX_OUTPUT = path.join(ROOT, 'sitemap.xml');
const PAGE_SITEMAP_OUTPUT = path.join(ROOT, 'page-sitemap.xml');
const IMAGE_SITEMAP_OUTPUT = path.join(ROOT, 'image-sitemap.xml');
const PEAK_BASE = 'https://nh48.info/peak';
const PEAK_BASE_FR = 'https://nh48.info/fr/peak';
const PHOTO_BASE_URL = 'https://photos.nh48.info';
const PHOTO_PATH_PREFIX = '/nh48-photos/';
const STATIC_PAGES = [
  'https://nh48.info/',
  'https://nh48.info/catalog',
  'https://nh48.info/nh-4000-footers-guide',
];

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

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
  const explicit = pickFirstNonEmpty(photo.headline, photo.title, photo.altText, photo.caption);
  if (explicit) return explicit;
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

const buildPageSitemap = () => {
  const urls = [];
  STATIC_PAGES.forEach((page) => urls.push({ loc: page }));
  slugs.forEach((slug) => {
    urls.push({ loc: `${PEAK_BASE}/${slug}/` });
    urls.push({ loc: `${PEAK_BASE_FR}/${slug}/` });
  });

  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  urls.forEach((entry) => {
    parts.push('  <url>');
    parts.push(`    <loc>${escapeXml(entry.loc)}</loc>`);
    parts.push('  </url>');
  });
  parts.push('</urlset>');

  fs.writeFileSync(PAGE_SITEMAP_OUTPUT, `${parts.join('\n')}\n`);
  console.log(`Wrote ${urls.length} URLs to ${PAGE_SITEMAP_OUTPUT}`);
};

const buildImageSitemap = () => {
  const urlEntries = [];

  slugs.forEach((slug) => {
    const peak = data[slug] || {};
    const name = peak.peakName || peak['Peak Name'] || slug;
    const images = dedupeImages(buildImageEntries(peak.photos, name));
    if (!images.length) return;
    [
      `${PEAK_BASE}/${slug}/`,
      `${PEAK_BASE_FR}/${slug}/`,
    ].forEach((loc) => {
      urlEntries.push({ loc, images });
    });
  });

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

buildPageSitemap();
buildImageSitemap();
buildSitemapIndex();
