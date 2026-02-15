#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'i18n');
const BASE_PATH = path.join(I18N_DIR, 'en.json');

const shouldWrite = process.argv.includes('--write');

function flattenLeaves(value, currentPath = '', out = {}) {
  if (value === null || value === undefined) {
    out[currentPath] = value;
    return out;
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    out[currentPath] = value;
    return out;
  }
  Object.entries(value).forEach(([key, child]) => {
    const nextPath = currentPath ? `${currentPath}.${key}` : key;
    flattenLeaves(child, nextPath, out);
  });
  return out;
}

function setByPath(target, pathKey, value) {
  const parts = pathKey.split('.');
  let cursor = target;
  parts.forEach((part, index) => {
    const isLeaf = index === parts.length - 1;
    if (isLeaf) {
      cursor[part] = value;
      return;
    }
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) {
      cursor[part] = {};
    }
    cursor = cursor[part];
  });
}

const base = JSON.parse(fs.readFileSync(BASE_PATH, 'utf8'));
const baseLeaves = flattenLeaves(base);
const baseKeys = Object.keys(baseLeaves);

const localeFiles = fs
  .readdirSync(I18N_DIR)
  .filter(
    (name) =>
      name.endsWith('.json') &&
      name !== 'en.json' &&
      name !== 'hrt_terms.json' &&
      name !== 'domain-glossary.json'
  )
  .sort((a, b) => a.localeCompare(b));

let totalAdded = 0;
localeFiles.forEach((fileName) => {
  const localePath = path.join(I18N_DIR, fileName);
  const localeJson = JSON.parse(fs.readFileSync(localePath, 'utf8'));
  const localeLeaves = flattenLeaves(localeJson);
  const missing = baseKeys.filter((key) => !(key in localeLeaves));
  if (!missing.length) return;

  missing.forEach((key) => {
    setByPath(localeJson, key, baseLeaves[key]);
  });
  totalAdded += missing.length;
  if (shouldWrite) {
    fs.writeFileSync(localePath, `${JSON.stringify(localeJson, null, 2)}\n`, 'utf8');
  }
  console.log(`${fileName}: added ${missing.length} missing key(s)`);
});

if (!totalAdded) {
  console.log('No missing keys found.');
  process.exit(0);
}

if (shouldWrite) {
  console.log(`Added ${totalAdded} missing key(s) across locale files.`);
} else {
  console.log(`Dry run: ${totalAdded} missing key(s) would be added. Run with --write to persist.`);
}
