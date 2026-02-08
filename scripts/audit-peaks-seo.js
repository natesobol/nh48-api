#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIRS = [path.join(ROOT, 'peaks'), path.join(ROOT, 'fr', 'peaks')];
const EXPECTED_NAME = 'Nathan Sobol';
const EXPECTED_COPYRIGHT = '© Nathan Sobol';
const EXPECTED_LICENSE = 'https://creativecommons.org/licenses/by-nc-nd/4.0/';

const failures = [];

const collectHtmlFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dir, entry.name, 'index.html'))
    .filter((file) => fs.existsSync(file));
};

const parseJsonLdBlocks = (html) => {
  const blocks = [];
  const regex = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  while ((match = regex.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1].trim()));
    } catch (error) {
      blocks.push(null);
    }
  }
  return blocks;
};

const getMountainSchema = (jsonBlocks) => jsonBlocks.find((obj) => obj && obj['@type'] === 'Mountain');

const check = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const dir of TARGET_DIRS) {
  for (const file of collectHtmlFiles(dir)) {
    const rel = path.relative(ROOT, file);
    const html = fs.readFileSync(file, 'utf8');

    const imgMatches = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g)];
    for (const match of imgMatches) {
      const src = match[1];
      if (!src.includes('photos.nh48.info')) continue;
      check(src.includes('metadata=keep'), `${rel}: <img> src missing metadata=keep -> ${src}`);
    }

    const jsonBlocks = parseJsonLdBlocks(html);
    check(!jsonBlocks.includes(null), `${rel}: invalid JSON-LD block`);

    const mountain = getMountainSchema(jsonBlocks);
    check(!!mountain, `${rel}: missing Mountain JSON-LD`);
    if (!mountain) continue;

    const sameAs = Array.isArray(mountain.sameAs) ? mountain.sameAs : [];
    check(sameAs.length > 0, `${rel}: sameAs missing or empty`);
    check(
      sameAs.some((url) => typeof url === 'string' && /^https?:\/\//.test(url) && !url.includes('nh48.info')),
      `${rel}: sameAs has no external URL`
    );
    check(
      sameAs.every((url) => typeof url === 'string' && !/\/search\b|[?&](q|query|search)=/i.test(url)),
      `${rel}: sameAs contains search-style URL`
    );

    const primary = mountain.primaryImageOfPage && mountain.primaryImageOfPage['@id'];
    const imageIds = Array.isArray(mountain.image) ? mountain.image.map((img) => img && img['@id']).filter(Boolean) : [];
    check(!!primary, `${rel}: primaryImageOfPage missing`);
    check(primary ? imageIds.includes(primary) : false, `${rel}: hero image not present in image[]`);

    const associatedMedia = mountain.subjectOf?.[0]?.associatedMedia;
    const images = Array.isArray(associatedMedia) ? associatedMedia : [];
    check(images.length > 0, `${rel}: associatedMedia ImageObjects missing`);

    for (const image of images) {
      check(image.creditText === EXPECTED_NAME, `${rel}: image ${image['@id']} creditText mismatch`);
      check(image.creator?.name === EXPECTED_NAME, `${rel}: image ${image['@id']} creator mismatch`);
      check(image.copyrightNotice === EXPECTED_COPYRIGHT, `${rel}: image ${image['@id']} copyrightNotice mismatch`);
      check(image.license === EXPECTED_LICENSE, `${rel}: image ${image['@id']} license mismatch`);
      check(!!image.thumbnailUrl, `${rel}: image ${image['@id']} missing thumbnailUrl`);
    }
  }
}

if (failures.length) {
  console.error(`Audit failed with ${failures.length} issue(s):`);
  for (const issue of failures) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Audit passed: peak pages contain expected image metadata, license fields, thumbnails, hero image references, and sameAs links.');
