#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'nh48.json');
const PHOTOS_DIR = path.join(ROOT, 'photos');
const LICENSE_URL = 'https://nh48.info/licensing';
const USAGE_TERMS = '© 2025 Nathan Sobol. All rights reserved.';
const DEFAULT_KEYWORDS = ['White Mountains', 'New Hampshire', 'hiking', 'landscape photography'];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const cleanText = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/:contentReference\[[^\]]*\]\{[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseCoordinates = (peak) => {
  const raw =
    peak.gpsCoordinates ||
    peak.coordinates ||
    peak.GPSCoordinates ||
    peak.GPS ||
    peak.Coordinates;
  if (!raw) return null;
  const cleaned = cleanText(raw);
  const matches = cleaned.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return null;
  const lat = Number.parseFloat(matches[0]);
  const lon = Number.parseFloat(matches[1]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { lat, lon };
};

const extractFilename = (photo) => {
  if (typeof photo === 'string') return photo;
  if (photo.filename) return photo.filename;
  if (photo.url) return photo.url;
  return '';
};

const resolveWebpPath = (slug, photo) => {
  const raw = extractFilename(photo);
  if (!raw) return '';
  const base = path.basename(raw);
  const ext = path.extname(base).toLowerCase();
  const webpName = ext === '.webp' ? base : `${path.basename(base, ext)}.webp`;
  const fullPath = path.join(PHOTOS_DIR, slug, webpName);
  return fs.existsSync(fullPath) ? fullPath : '';
};

const pickFirst = (...vals) => {
  for (const val of vals) {
    const cleaned = cleanText(val);
    if (cleaned) return cleaned;
  }
  return '';
};

const buildTitle = (peak, photo, peakName) => {
  const explicit = pickFirst(photo.headline, photo.title, photo.caption, photo.altText);
  if (explicit) return explicit;
  const range = cleanText(peak['Range / Subrange']);
  const region = range ? `${range} (New Hampshire)` : 'White Mountain National Forest (New Hampshire)';
  return `${peakName} — ${region}`;
};

const buildCaption = (photo, peakName) => {
  const explicit = pickFirst(photo.description, photo.extendedDescription, photo.altText);
  if (explicit) return explicit;
  return `A scenic mountain landscape in the White Mountain National Forest of New Hampshire featuring ${peakName}, rugged terrain, forested slopes, and surrounding ridges.`;
};

const buildKeywords = (photo, peakName, peak) => {
  const keywords = new Set();
  keywords.add(peakName);
  const range = cleanText(peak['Range / Subrange']);
  if (range) keywords.add(range);
  const rawKeywords = Array.isArray(photo.keywords)
    ? photo.keywords
    : Array.isArray(photo.tags)
      ? photo.tags
      : [];
  rawKeywords.forEach((kw) => {
    const cleaned = cleanText(kw);
    if (cleaned) keywords.add(cleaned);
  });
  DEFAULT_KEYWORDS.forEach((kw) => keywords.add(kw));
  return Array.from(keywords);
};

const normalizeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatExifDate = (date) => {
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatXmpDate = (date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z');

const ensureExiftool = () => {
  if (dryRun) return;
  try {
    execFileSync('exiftool', ['-ver'], { stdio: ['ignore', 'ignore', 'ignore'] });
  } catch (error) {
    console.error('exiftool is required but was not found on PATH.');
    process.exit(1);
  }
};

const buildExiftoolArgs = (metadata) => {
  const argsList = ['-overwrite_original'];
  if (metadata.title) argsList.push(`-XMP-dc:Title=${metadata.title}`);
  if (metadata.caption) argsList.push(`-XMP-dc:Description=${metadata.caption}`);
  if (metadata.dateExif) argsList.push(`-EXIF:DateTimeOriginal=${metadata.dateExif}`);
  if (metadata.dateXmp) argsList.push(`-XMP-photoshop:DateCreated=${metadata.dateXmp}`);
  if (metadata.make) argsList.push(`-XMP-tiff:Make=${metadata.make}`);
  if (metadata.model) argsList.push(`-XMP-tiff:Model=${metadata.model}`);
  if (metadata.lat !== null && metadata.lon !== null) {
    argsList.push(`-GPSLatitude=${metadata.lat}`);
    argsList.push(`-GPSLongitude=${metadata.lon}`);
    argsList.push(`-GPSLatitudeRef=${metadata.lat >= 0 ? 'N' : 'S'}`);
    argsList.push(`-GPSLongitudeRef=${metadata.lon >= 0 ? 'E' : 'W'}`);
  }
  argsList.push(`-XMP-xmpRights:WebStatement=${LICENSE_URL}`);
  argsList.push(`-XMP-xmpRights:UsageTerms=${USAGE_TERMS}`);
  if (metadata.keywords && metadata.keywords.length) {
    const [first, ...rest] = metadata.keywords;
    argsList.push(`-XMP-dc:Subject=${first}`);
    rest.forEach((kw) => argsList.push(`-XMP-dc:Subject+=${kw}`));
  }
  return argsList;
};

ensureExiftool();

let processed = 0;
let skipped = 0;

Object.entries(data).forEach(([slug, peak]) => {
  const peakName = cleanText(peak.peakName || peak['Peak Name'] || slug);
  const photos = Array.isArray(peak.photos) ? peak.photos : [];
  const coords = parseCoordinates(peak);
  photos.forEach((photo) => {
    const imagePath = resolveWebpPath(slug, photo);
    if (!imagePath) {
      skipped += 1;
      return;
    }
    const date =
      normalizeDate(photo.captureDate) ||
      normalizeDate(photo.fileCreateDate) ||
      normalizeDate(photo.fileModifiedDate);
    const metadata = {
      title: buildTitle(peak, photo, peakName),
      caption: buildCaption(photo, peakName),
      keywords: buildKeywords(photo, peakName, peak),
      dateExif: date ? formatExifDate(date) : '',
      dateXmp: date ? formatXmpDate(date) : '',
      make: cleanText(photo.cameraMaker || photo.camera),
      model: cleanText(photo.cameraModel),
      lat: coords ? coords.lat : null,
      lon: coords ? coords.lon : null,
    };
    const exiftoolArgs = buildExiftoolArgs(metadata);
    if (dryRun) {
      console.log(`[dry-run] exiftool ${exiftoolArgs.join(' ')} ${imagePath}`);
      processed += 1;
      return;
    }
    execFileSync('exiftool', [...exiftoolArgs, imagePath], { stdio: 'inherit' });
    processed += 1;
  });
});

console.log(`Processed ${processed} images. Skipped ${skipped} missing WebP files.`);
