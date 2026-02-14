#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NH48_PATH = path.join(ROOT, 'data', 'nh48.json');
const OUT_PATH = path.join(ROOT, 'data', 'peak-experiences.en.json');

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function flattenValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return clean(value);
  }
  if (Array.isArray(value)) {
    return value.map(flattenValue).filter(Boolean).join('; ');
  }
  if (typeof value === 'object') {
    const preferred = [
      value.routeName,
      value.name,
      value.route,
      value.description,
      value.notes,
      value.distance,
      value.gain
    ]
      .map(flattenValue)
      .filter(Boolean);
    if (preferred.length) return preferred.join(' - ');
    return Object.values(value).map(flattenValue).filter(Boolean).join(' - ');
  }
  return '';
}

function firstSentence(text) {
  const cleaned = clean(text);
  if (!cleaned) return '';
  const sentence = cleaned.match(/^[^.!?]+[.!?]?/);
  return sentence ? sentence[0].trim() : cleaned;
}

function summarizeRoute(routeValue) {
  const raw = flattenValue(routeValue);
  if (!raw) return 'Choose the standard route option that matches your pace and weather window.';
  const firstChunk = raw.split(';')[0].trim();
  return firstChunk || 'Choose the standard route option that matches your pace and weather window.';
}

function buildExperienceEntry(peak) {
  const name = clean(peak['Peak Name'] || peak.peakName || peak.name || 'This peak');
  const description = firstSentence(peak.description || peak.summary || peak['Terrain Character'] || '');
  const range = clean(peak['Range / Subrange'] || peak.range || 'the White Mountains');
  const seasons = clean(peak['Best Seasons to Hike'] || peak.season || 'Late spring through fall generally offers the most predictable access.');
  const weather = clean(peak['Weather Exposure Rating'] || peak['Exposure Level'] || 'Variable mountain weather should always be expected.');
  const route = summarizeRoute(peak['Standard Routes']);
  const water = flattenValue(peak['Water Availability'] || 'Carry enough water for the full route.');
  const parking = flattenValue(peak['Parking Notes'] || 'Confirm trailhead access before leaving home.');

  const experienceSummary = clean(
    `I built this guide around field photography sessions on ${name} in ${range}. ${description || `The route profile and summit character for ${name} reward careful planning and steady pacing.`}`
  );

  const conditionsFromExperience = clean(
    `${seasons} ${weather}`
  );

  const planningTip = clean(
    `${route} ${water} ${parking}`
  );

  return {
    experienceSummary: experienceSummary || `I built this guide around field days on ${name} in the White Mountains.`,
    conditionsFromExperience: conditionsFromExperience || 'Conditions can change quickly above treeline; check forecasts and trailhead updates.',
    planningTip: planningTip || 'Carry conservative layers, confirm trailhead access, and choose a turnaround time before leaving the trailhead.',
    lastReviewed: new Date().toISOString().slice(0, 10),
    firstAscent: '',
    historyNotes: '',
    historySourceUrl: '',
    historySourceLabel: ''
  };
}

function main() {
  const payload = JSON.parse(fs.readFileSync(NH48_PATH, 'utf8'));
  const slugs = Object.keys(payload || {}).sort();
  const out = {};

  slugs.forEach((slug) => {
    out[slug] = buildExperienceEntry(payload[slug] || {});
  });

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${Object.keys(out).length} peak experience entries -> ${path.relative(ROOT, OUT_PATH)}`);
}

main();
