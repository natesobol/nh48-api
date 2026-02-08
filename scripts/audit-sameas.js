#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NH48_PATH = path.join(ROOT, 'data', 'nh48.json');
const SAMEAS_PATH = path.join(ROOT, 'data', 'peak-sameas.json');

const peaks = JSON.parse(fs.readFileSync(NH48_PATH, 'utf8'));
const lookup = JSON.parse(fs.readFileSync(SAMEAS_PATH, 'utf8'));

const peakSlugs = Object.keys(peaks).sort();
const lookupSlugs = Object.keys(lookup).sort();

const issues = [];

const missing = peakSlugs.filter((slug) => !lookupSlugs.includes(slug));
const extra = lookupSlugs.filter((slug) => !peakSlugs.includes(slug));
if (missing.length) issues.push(`Missing slugs in peak-sameas.json: ${missing.join(', ')}`);
if (extra.length) issues.push(`Extra slugs in peak-sameas.json: ${extra.join(', ')}`);

for (const slug of peakSlugs) {
  const links = lookup[slug];
  if (!Array.isArray(links)) {
    issues.push(`${slug}: sameAs entry is not an array`);
    continue;
  }

  if (links.length === 0) {
    issues.push(`${slug}: sameAs array is empty`);
    continue;
  }

  const seen = new Set();
  for (const link of links) {
    if (typeof link !== 'string') {
      issues.push(`${slug}: non-string URL value`);
      continue;
    }
    if (!link.startsWith('https://')) {
      issues.push(`${slug}: non-https URL ${link}`);
    }
    if (/\/search\b|[?&](q|query|search)=/i.test(link)) {
      issues.push(`${slug}: search URL present ${link}`);
    }
    if (seen.has(link)) {
      issues.push(`${slug}: duplicate URL ${link}`);
    }
    seen.add(link);
  }
}

if (issues.length) {
  console.error(`sameAs audit failed with ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('sameAs audit passed: slug sets match, URLs are canonical https links, and no search URLs are present.');
