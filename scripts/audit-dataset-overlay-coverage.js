#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const {
  OVERLAY_FILENAMES,
  readJson,
  getLocaleCodes,
  loadSourceDatasets,
  buildExpectedOverlayScaffoldFromSource,
  getOverlayPath
} = require('./lib/dataset-overlay-utils');

function flattenLeaves(value, currentPath = '', out = new Set()) {
  if (value === null || value === undefined) return out;

  if (typeof value === 'string') {
    out.add(currentPath);
    return out;
  }
  if (Array.isArray(value)) {
    if (!value.length) {
      out.add(currentPath);
      return out;
    }
    value.forEach((item, index) => {
      flattenLeaves(item, `${currentPath}[${index}]`, out);
    });
    return out;
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      const next = currentPath ? `${currentPath}.${key}` : key;
      flattenLeaves(child, next, out);
    });
  }
  return out;
}

const issues = [];
const locales = getLocaleCodes().filter((code) => code !== 'en');
const expected = buildExpectedOverlayScaffoldFromSource(loadSourceDatasets());

locales.forEach((locale) => {
  Object.keys(OVERLAY_FILENAMES).forEach((datasetKey) => {
    const overlayPath = getOverlayPath(locale, datasetKey);
    const relPath = path.relative(process.cwd(), overlayPath).replace(/\\/g, '/');

    if (!fs.existsSync(overlayPath)) {
      issues.push(`${relPath}: missing file`);
      return;
    }

    let overlay;
    try {
      overlay = readJson(overlayPath);
    } catch (error) {
      issues.push(`${relPath}: invalid JSON (${error.message})`);
      return;
    }

    if (!overlay || typeof overlay !== 'object' || Array.isArray(overlay)) {
      issues.push(`${relPath}: expected top-level object`);
      return;
    }

    const expectedDataset = expected[datasetKey] || {};
    const overlayEntryKeys = new Set(Object.keys(overlay));
    const expectedEntryKeys = Object.keys(expectedDataset);

    expectedEntryKeys.forEach((entryKey) => {
      if (!overlayEntryKeys.has(entryKey)) {
        issues.push(`${relPath}: missing entry key "${entryKey}"`);
        return;
      }
      const overlayEntry = overlay[entryKey];
      if (!overlayEntry || typeof overlayEntry !== 'object' || Array.isArray(overlayEntry)) {
        issues.push(`${relPath}: entry "${entryKey}" must be an object`);
        return;
      }

      const expectedPaths = flattenLeaves(expectedDataset[entryKey]);
      const overlayPaths = flattenLeaves(overlayEntry);
      expectedPaths.forEach((leafPath) => {
        if (!overlayPaths.has(leafPath)) {
          issues.push(`${relPath}: entry "${entryKey}" missing translatable path "${leafPath}"`);
        }
      });
    });
  });
});

if (issues.length) {
  console.error(`Dataset overlay coverage audit failed with ${issues.length} issue(s).`);
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log(
  `Dataset overlay coverage audit passed for ${locales.length} locale(s) across ${Object.keys(OVERLAY_FILENAMES).length} dataset overlay file(s).`
);
