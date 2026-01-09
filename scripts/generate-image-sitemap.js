#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'nh48.json');
const OUTPUT_PATH = path.join(ROOT, 'image-sitemap.xml');
const CANONICAL_BASE = 'https://nh48.info/peaks';
const IMAGE_LICENSE_URL = 'https://nh48.info/licensing';

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildPhotoCaption = (peakName, photo) => {
  if (photo && typeof photo === 'object') {
    const explicitAlt = (photo.altText || photo.alt || '').trim();
    if (explicitAlt) return explicitAlt;
    const details = [photo.season, photo.timeOfDay].filter(Boolean).join(' ');
    if (details) return `${peakName} – ${details} photo`;
  }
  return `${peakName} photo`;
};

const isSlugLike = (value) => {
  if (!value) return false;
  const cleaned = String(value).trim();
  if (!cleaned || /\s/.test(cleaned)) return false;
  return /^[a-z0-9]+([_-][a-z0-9]+)+$/i.test(cleaned);
};

const buildPhotoTitle = (peakName, photo) => {
  if (photo && typeof photo === 'object') {
    const explicitTitle = (photo.headline || photo.caption || '').trim();
    if (explicitTitle && !isSlugLike(explicitTitle)) return explicitTitle;
    const fallbackTitle = (photo.title || '').trim();
    if (fallbackTitle && !isSlugLike(fallbackTitle)) return fallbackTitle;
  }
  return `${peakName} — White Mountain National Forest (New Hampshire)`;
};

const buildImageEntries = (photos, peakName) => {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((photo) => {
      if (typeof photo === 'string') {
        return {
          url: photo,
          caption: buildPhotoCaption(peakName, {}),
          title: buildPhotoTitle(peakName, {}),
        };
      }
      if (photo && photo.url) {
        return {
          url: photo.url,
          caption: buildPhotoCaption(peakName, photo),
          title: buildPhotoTitle(peakName, photo),
        };
      }
      return null;
    })
    .filter(Boolean);
};

const slugs = Object.keys(data).sort();
const urlEntries = [];

slugs.forEach((slug) => {
  const peak = data[slug] || {};
  const name = peak.peakName || peak['Peak Name'] || slug;
  const images = buildImageEntries(peak.photos, name);
  if (images.length === 0) return;
  urlEntries.push({
    loc: `${CANONICAL_BASE}/${slug}/`,
    images,
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
      const captionText = image.caption ? escapeXml(image.caption) : '';
      const titleText = image.title ? escapeXml(image.title) : '';
      xmlParts.push(`      <image:caption>${captionText}</image:caption>`);
      xmlParts.push(`      <image:title>${titleText}</image:title>`);
      xmlParts.push(`      <image:license>${escapeXml(IMAGE_LICENSE_URL)}</image:license>`);
      xmlParts.push('    </image:image>');
    });
  xmlParts.push('  </url>');
});

xmlParts.push('</urlset>');

fs.writeFileSync(OUTPUT_PATH, `${xmlParts.join('\n')}\n`);
console.log(`Wrote ${urlEntries.length} peak entries to ${OUTPUT_PATH}`);
