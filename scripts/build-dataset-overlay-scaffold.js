#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {
  ROOT,
  OVERLAY_FILENAMES,
  writeJson,
  getLocaleCodes,
  loadSourceDatasets,
  buildExpectedOverlayScaffoldFromSource,
  getOverlayPath
} = require('./lib/dataset-overlay-utils');

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has('--write');
const localeArg = process.argv.find((arg) => arg.startsWith('--locales='));
const requestedLocales = localeArg
  ? localeArg
      .replace('--locales=', '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  : null;

const locales = (requestedLocales && requestedLocales.length ? requestedLocales : getLocaleCodes())
  .filter((code) => code !== 'en');

if (!locales.length) {
  console.log('No locales selected. Nothing to do.');
  process.exit(0);
}

const source = loadSourceDatasets();
const scaffold = buildExpectedOverlayScaffoldFromSource(source);
const datasetKeys = Object.keys(OVERLAY_FILENAMES);
const glossaryPath = path.join(ROOT, 'i18n', 'domain-glossary.json');
let glossary = {};
if (fs.existsSync(glossaryPath)) {
  try {
    glossary = JSON.parse(fs.readFileSync(glossaryPath, 'utf8'));
  } catch (_) {
    glossary = {};
  }
}

function buildLocaleGlossaryLookup(locale) {
  const lookup = new Map();
  Object.values(glossary).forEach((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const enValue = typeof entry.en === 'string' ? entry.en.trim() : '';
    const localized = typeof entry[locale] === 'string' ? entry[locale].trim() : '';
    if (!enValue || !localized) return;
    lookup.set(enValue.toLowerCase(), localized);
  });
  return lookup;
}

function localizeOverlayValue(value, localeLookup) {
  if (typeof value === 'string') {
    const key = value.trim().toLowerCase();
    return localeLookup.get(key) || value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => localizeOverlayValue(item, localeLookup));
  }
  if (value && typeof value === 'object') {
    const output = {};
    Object.entries(value).forEach(([key, child]) => {
      output[key] = localizeOverlayValue(child, localeLookup);
    });
    return output;
  }
  return value;
}

let fileCount = 0;
locales.forEach((locale) => {
  const localeGlossaryLookup = buildLocaleGlossaryLookup(locale);
  datasetKeys.forEach((datasetKey) => {
    const overlayPath = getOverlayPath(locale, datasetKey);
    const payload = localizeOverlayValue(scaffold[datasetKey] || {}, localeGlossaryLookup);
    fileCount += 1;
    if (shouldWrite) {
      writeJson(overlayPath, payload);
    }
  });
});

if (shouldWrite) {
  console.log(`Wrote ${fileCount} overlay file(s) for ${locales.length} locale(s).`);
  console.log(
    `Datasets scaffolded: ${datasetKeys
      .map((key) => `${key} -> ${OVERLAY_FILENAMES[key]}`)
      .join(', ')}`
  );
} else {
  console.log(`Dry run: would write ${fileCount} overlay file(s) for ${locales.length} locale(s).`);
  console.log('Use --write to persist files.');
  locales.forEach((locale) => {
    datasetKeys.forEach((datasetKey) => {
      const overlayPath = getOverlayPath(locale, datasetKey);
      const relative = path.relative(process.cwd(), overlayPath).replace(/\\/g, '/');
      console.log(`- ${relative}`);
    });
  });
}
