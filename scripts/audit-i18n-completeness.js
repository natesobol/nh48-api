#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'i18n');
const BASE_FILE = path.join(I18N_DIR, 'en.json');

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function looksLikeRawKey(value) {
  return (
    typeof value === 'string' &&
    /^[a-z0-9_-]+(?:\.[a-z0-9_-]+){2,}$/i.test(value.trim())
  );
}

const base = readJson(BASE_FILE);
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

const issues = [];

localeFiles.forEach((fileName) => {
  const localePath = path.join(I18N_DIR, fileName);
  const localeJson = readJson(localePath);
  const localeLeaves = flattenLeaves(localeJson);

  const missing = baseKeys.filter((key) => !(key in localeLeaves));
  const empty = Object.entries(localeLeaves)
    .filter(([, value]) => typeof value === 'string' && value.trim().length === 0)
    .map(([key]) => key);
  const unresolved = Object.entries(localeLeaves)
    .filter(([, value]) => looksLikeRawKey(value))
    .map(([key, value]) => `${key} -> ${value}`);

  if (missing.length || empty.length || unresolved.length) {
    issues.push({
      fileName,
      missing,
      empty,
      unresolved
    });
  }
});

if (issues.length) {
  const total = issues.reduce((sum, item) => sum + item.missing.length + item.empty.length + item.unresolved.length, 0);
  console.error(`i18n completeness audit failed with ${total} issue(s) across ${issues.length} locale file(s).`);
  issues.forEach((issue) => {
    if (issue.missing.length) {
      issue.missing.forEach((key) => console.error(`- ${issue.fileName}: missing key "${key}"`));
    }
    if (issue.empty.length) {
      issue.empty.forEach((key) => console.error(`- ${issue.fileName}: empty value for "${key}"`));
    }
    if (issue.unresolved.length) {
      issue.unresolved.forEach((line) => console.error(`- ${issue.fileName}: unresolved marker "${line}"`));
    }
  });
  process.exit(1);
}

console.log(`i18n completeness audit passed for ${localeFiles.length} locale file(s).`);
