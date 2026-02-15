#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'i18n');
const SCAN_DIRS = [path.join(ROOT, 'pages'), path.join(ROOT, 'fr')];

function walkFiles(dirPath, predicate, output = []) {
  if (!fs.existsSync(dirPath)) return output;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, predicate, output);
      return;
    }
    if (predicate(fullPath)) {
      output.push(fullPath);
    }
  });
  return output;
}

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

const issues = [];

const localeFiles = fs
  .readdirSync(I18N_DIR)
  .filter(
    (name) =>
      name.endsWith('.json') &&
      name !== 'hrt_terms.json' &&
      name !== 'domain-glossary.json'
  )
  .sort((a, b) => a.localeCompare(b));

localeFiles.forEach((fileName) => {
  const filePath = path.join(I18N_DIR, fileName);
  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const leaves = flattenLeaves(payload);
  Object.entries(leaves).forEach(([key, value]) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (/^[a-z0-9_-]+(?:\.[a-z0-9_-]+){2,}$/i.test(trimmed) && trimmed.includes('.')) {
      issues.push(`${path.relative(ROOT, filePath).replace(/\\/g, '/')}: unresolved key-like value "${key}" -> "${trimmed}"`);
    }
  });
});

const htmlFiles = SCAN_DIRS.flatMap((dirPath) => walkFiles(dirPath, (fullPath) => fullPath.endsWith('.html')));
const htmlMarkerRegex = />\s*([a-z0-9_-]+(?:\.[a-z0-9_-]+){2,})\s*</gi;

htmlFiles.forEach((filePath) => {
  const text = fs.readFileSync(filePath, 'utf8');
  let match;
  while ((match = htmlMarkerRegex.exec(text)) !== null) {
    issues.push(`${path.relative(ROOT, filePath).replace(/\\/g, '/')}: raw marker "${match[1]}" in HTML text node`);
  }
});

if (issues.length) {
  console.error(`Unresolved i18n marker audit failed with ${issues.length} issue(s).`);
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log(`Unresolved i18n marker audit passed for ${localeFiles.length} locale file(s) and ${htmlFiles.length} HTML file(s).`);
