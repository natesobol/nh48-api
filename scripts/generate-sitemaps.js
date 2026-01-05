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

const cleanText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/:contentReference\[[^\]]*\]\{[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

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

const buildPhotoCaption = (peakName, photo) => {
  const explicit = cleanText(
    photo.altText ||
      photo.alt ||
      photo.extendedDescription ||
      photo.description ||
      photo.caption ||
      photo.headline
  );
  if (explicit) return explicit;
  const tags = Array.isArray(photo.tags) ? photo.tags.filter(Boolean) : [];
  if (tags.length) return `${peakName} – ${tags.join(', ')}`;
  return `${peakName} in the White Mountains`;
};

const buildPhotoTitle = (peakName, photo) => {
  const explicit = cleanText(photo.headline || photo.caption || photo.title || photo.altText || photo.alt);
  if (explicit) return explicit;
  return `${peakName} photo`;
};

const buildImageEntries = (photos, peakName) => {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((photo) => {
      if (typeof photo === 'string') {
        return {
          url: normalizePhotoUrl(photo),
          caption: `${peakName} in the White Mountains`,
          title: `${peakName} photo`,
        };
      }
      if (!photo || !photo.url) return null;
      return {
        url: normalizePhotoUrl(photo.url),
        caption: buildPhotoCaption(peakName, photo),
        title: buildPhotoTitle(peakName, photo),
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
    entry.images.forEach((image) => {
      xmlParts.push('    <image:image>');
      xmlParts.push(`      <image:loc>${escapeXml(image.url)}</image:loc>`);
      xmlParts.push(`      <image:caption>${escapeXml(image.caption)}</image:caption>`);
      xmlParts.push(`      <image:title>${escapeXml(image.title)}</image:title>`);
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
