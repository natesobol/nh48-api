#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PEAKS_PATH = path.join(ROOT, 'data', 'nh48.json');
const PARKING_PATH = path.join(ROOT, 'data', 'parking-data.json');
const STRICT = process.argv.includes('--strict');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${path.relative(ROOT, filePath)}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function safeText(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function toSlug(value) {
  return safeText(value).toLowerCase();
}

function parseCoordinates(value) {
  if (!value) return null;
  if (typeof value === 'object') {
    const lat = Number(value.lat ?? value.latitude);
    const lon = Number(value.lon ?? value.lng ?? value.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
    return null;
  }
  const text = String(value).trim();
  const match = text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function parseMapCoords(urlValue) {
  const text = safeText(urlValue);
  if (!text) return null;
  try {
    const parsed = new URL(text);
    const queryValue = parsed.searchParams.get('query')
      || parsed.searchParams.get('destination')
      || parsed.searchParams.get('q')
      || parsed.searchParams.get('ll')
      || parsed.searchParams.get('center')
      || '';
    const queryMatch = queryValue.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (queryMatch) {
      const lat = Number(queryMatch[1]);
      const lon = Number(queryMatch[2]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
    }
    const pathMatch = parsed.pathname.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (pathMatch) {
      const lat = Number(pathMatch[1]);
      const lon = Number(pathMatch[2]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
    }
    return null;
  } catch (_error) {
    return null;
  }
}

function haversineMiles(aLat, aLon, bLat, bLon) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const r = 3958.8;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isNearSummit(candidate, summit, thresholdMiles = 0.15) {
  if (!candidate || !summit) return false;
  const distance = haversineMiles(candidate.lat, candidate.lon, summit.lat, summit.lon);
  return Number.isFinite(distance) && distance <= thresholdMiles;
}

function main() {
  const peaksPayload = readJson(PEAKS_PATH);
  const parkingPayload = readJson(PARKING_PATH);
  const peaks = Array.isArray(peaksPayload?.peaks)
    ? peaksPayload.peaks
    : (peaksPayload && typeof peaksPayload === 'object'
      ? Object.entries(peaksPayload).map(([slug, value]) => ({ slug, ...(value || {}) }))
      : []);
  const parkingRows = Array.isArray(parkingPayload) ? parkingPayload : [];

  const peaksBySlug = new Map();
  peaks.forEach((peak) => {
    const slug = toSlug(peak?.slug || peak?.Slug || peak?.slug_en);
    if (!slug) return;
    peaksBySlug.set(slug, peak);
  });

  const warnings = [];
  let checked = 0;

  parkingRows.forEach((row) => {
    const slug = toSlug(row?.slug || row?.peakSlug);
    if (!slug) return;
    const peak = peaksBySlug.get(slug);
    if (!peak) {
      warnings.push(`${slug}: parking entry has no matching peak slug in nh48.json`);
      return;
    }
    checked += 1;

    const summit = parseCoordinates(peak['Coordinates']);
    const parkingCoords = parseCoordinates({
      lat: row.parkingLat,
      lon: row.parkingLng
    });
    const sourceCoords = parseMapCoords(row.sourceUrl);
    const trailhead = safeText(row.trailheadName || peak['Most Common Trailhead']);

    if (summit && parkingCoords && isNearSummit(parkingCoords, summit)) {
      warnings.push(`${slug}: parking coordinates appear summit-equivalent (${row.parkingLat}, ${row.parkingLng})`);
    }
    if (summit && sourceCoords && isNearSummit(sourceCoords, summit)) {
      warnings.push(`${slug}: parking sourceUrl appears summit-equivalent (${safeText(row.sourceUrl)})`);
    }

    const hasUsableDestination = Boolean(safeText(row.sourceUrl) || parkingCoords || trailhead);
    if (!hasUsableDestination) {
      warnings.push(`${slug}: no usable parking destination source (sourceUrl/coords/trailhead missing)`);
    }
  });

  if (warnings.length) {
    console.warn(`Parking destination parity audit found ${warnings.length} warning(s) across ${checked} matched peak(s).`);
    warnings.forEach((warning) => console.warn(`- ${warning}`));
    if (STRICT) {
      process.exit(1);
    }
    process.exit(0);
  }

  console.log(`Parking destination parity audit passed for ${checked} matched peak(s).`);
}

try {
  main();
} catch (error) {
  console.error(`Parking destination parity audit failed: ${error.message}`);
  process.exit(1);
}
