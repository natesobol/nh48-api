#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENTITY_LINKS_PATH = path.join(ROOT, 'data', 'entity-links.json');
const PERSON_PATH = path.join(ROOT, 'data', 'person.json');
const ORG_PATH = path.join(ROOT, 'data', 'organization.json');
const WEBSITE_PATH = path.join(ROOT, 'data', 'website.json');

const PRIMARY_SISTER_SITES = [
  'https://www.instagram.com/nate_dumps_pics/',
  'https://www.etsy.com/shop/NH48pics',
  'https://www.nh48pics.com/',
  'https://www.nh48.app/'
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.endsWith('/')) return trimmed;
  return `${trimmed}/`;
}

function normalizeAllowList(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return '';
  // Etsy shop URLs are canonical without trailing slash in existing data.
  if (/^https:\/\/www\.etsy\.com\/shop\//i.test(normalized)) {
    return normalized.replace(/\/$/, '');
  }
  return normalized;
}

function normalizeExisting(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return '';
  if (/^https:\/\/www\.etsy\.com\/shop\//i.test(normalized)) {
    return normalized.replace(/\/$/, '');
  }
  return normalized;
}

function findMissing(required, actual) {
  const actualSet = new Set(actual.map(normalizeExisting).filter(Boolean));
  return required
    .map(normalizeAllowList)
    .filter(Boolean)
    .filter((url) => !actualSet.has(url));
}

function assertPrimarySites(context, sameAs, failures) {
  if (!Array.isArray(sameAs)) {
    failures.push(`${context}: sameAs is not an array`);
    return;
  }
  const missing = findMissing(PRIMARY_SISTER_SITES, sameAs);
  if (missing.length) {
    failures.push(`${context}: missing primary sister site link(s): ${missing.join(', ')}`);
  }
}

function main() {
  const failures = [];

  const entityLinks = readJson(ENTITY_LINKS_PATH);
  const person = readJson(PERSON_PATH);
  const organization = readJson(ORG_PATH);
  const website = readJson(WEBSITE_PATH);

  assertPrimarySites('data/entity-links.json person.sameAs', entityLinks?.person?.sameAs, failures);
  assertPrimarySites('data/entity-links.json organization.sameAs', entityLinks?.organization?.sameAs, failures);
  assertPrimarySites('data/entity-links.json website.sameAs', entityLinks?.website?.sameAs, failures);

  assertPrimarySites('data/person.json sameAs', person?.sameAs, failures);
  assertPrimarySites('data/organization.json sameAs', organization?.sameAs, failures);
  assertPrimarySites('data/website.json sameAs', website?.sameAs, failures);

  if (failures.length) {
    console.error(`Entity links audit failed with ${failures.length} issue(s):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log('Entity links audit passed: all primary sister sites are present in identity sameAs surfaces.');
}

main();
