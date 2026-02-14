#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE_URL = process.env.WIKI_AUDIT_URL || getArgValue('--url') || '';

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return '';
  return process.argv[index + 1];
}

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  const raw = fs.readFileSync(fullPath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function extractJsonLdDocs(html) {
  const docs = [];
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  blocks.forEach((block) => {
    const raw = (block[1] || '').trim();
    if (!raw) return;
    try {
      docs.push(JSON.parse(raw));
    } catch (_) {
      // ignored
    }
  });
  return docs;
}

function collectTypes(node, out = new Set()) {
  if (!node || typeof node !== 'object') return out;
  const t = node['@type'];
  if (Array.isArray(t)) t.forEach((value) => out.add(String(value)));
  else if (typeof t === 'string') out.add(t);
  if (Array.isArray(node['@graph'])) node['@graph'].forEach((child) => collectTypes(child, out));
  Object.values(node).forEach((value) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) value.forEach((item) => collectTypes(item, out));
    else collectTypes(value, out);
  });
  return out;
}

function countType(docs, typeName) {
  let count = 0;
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    const t = node['@type'];
    if (Array.isArray(t) ? t.includes(typeName) : t === typeName) count += 1;
    if (Array.isArray(node['@graph'])) node['@graph'].forEach(walk);
    Object.values(node).forEach((value) => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) value.forEach(walk);
      else walk(value);
    });
  }
  docs.forEach(walk);
  return count;
}

function countWikiImageObjects(docs, canonicalUrl) {
  let count = 0;
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    const t = node['@type'];
    const isImage = Array.isArray(t) ? t.includes('ImageObject') : t === 'ImageObject';
    if (isImage) {
      const nodeId = typeof node['@id'] === 'string' ? node['@id'] : '';
      if (nodeId.includes('#wiki-image-') || (canonicalUrl && nodeId.startsWith(`${canonicalUrl}#wiki-image-`))) {
        count += 1;
      }
    }
    if (Array.isArray(node['@graph'])) node['@graph'].forEach(walk);
    Object.values(node).forEach((value) => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) value.forEach(walk);
      else walk(value);
    });
  }
  docs.forEach(walk);
  return count;
}

function hasEntryMedia(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (Array.isArray(entry.photos) && entry.photos.length > 0) return true;
  if (Array.isArray(entry.imgs) && entry.imgs.some((img) => typeof img === 'string' && img.trim().length > 0)) return true;
  if (typeof entry.img === 'string' && entry.img.trim().length > 0) return true;
  return false;
}

function pickSamples() {
  const mountainSets = readJson('data/wiki/mountain-sets.json');
  const nh48Data = readJson('data/wiki/wiki-nh48-mountains.json');
  const nh52Data = readJson('data/wiki/wiki-nh52wav-mountains.json');
  const plants = readJson('data/wiki/plants.json');
  const animals = readJson('data/wiki/animals.json');
  const plantDiseases = readJson('data/wiki/plant-disease.json');

  const nh48Entries = Object.entries(nh48Data).map(([key, entry]) => ({ ...(entry || {}), slug: entry?.slug || key }));
  const nh52Entries = Object.entries(nh52Data).map(([key, entry]) => ({ ...(entry || {}), slug: entry?.slug || key }));
  const mountainWithPhotos = nh48Entries.find((entry) => Array.isArray(entry.photos) && entry.photos.length) || nh48Entries[0];
  const mountainNoPhotos = nh52Entries.find((entry) => !Array.isArray(entry.photos) || entry.photos.length === 0) || nh52Entries[0];
  const plant = Array.isArray(plants) ? plants.find((entry) => entry && entry.slug) : null;
  const animal = Array.isArray(animals) ? animals.find((entry) => entry && entry.slug) : null;
  const diseaseEntries = Array.isArray(plantDiseases?.diseases) ? plantDiseases.diseases : [];
  const plantDisease = diseaseEntries
    .map((entry) => ({ ...(entry || {}), slug: String(entry?.slug || entry?.id || '').trim().toLowerCase() }))
    .find((entry) => entry.slug);
  const plantDiseaseHasMedia = diseaseEntries.some((entry) => hasEntryMedia(entry));

  return {
    mountainSets,
    mountainWithPhotos,
    mountainNoPhotos,
    plant,
    animal,
    plantDisease,
    plantDiseaseHasMedia
  };
}

function runTemplateChecks(samples) {
  const failures = [];
  const templateChecks = [
    {
      file: 'pages/wiki/index.html',
      mustContain: ['id="nav-placeholder"', 'id="footer-placeholder"', 'id="wikiSearch"', 'id="wikiListNh48"', 'id="wikiListNh52wav"', 'id="wikiListPlants"', 'id="wikiListAnimals"']
    },
    {
      file: 'pages/wiki/mountain.html',
      mustContain: ['id="nav-placeholder"', 'id="footer-placeholder"', 'id="wikiMediaShell"', 'id="wikiRoutesGrid"', 'id="wikiStatsGrid"', 'id="wikiSetChip"']
    },
    {
      file: 'pages/wiki/plant.html',
      mustContain: ['id="nav-placeholder"', 'id="footer-placeholder"', 'id="wikiMediaShell"', 'id="wikiFactsGrid"', 'id="wikiSourcesList"']
    },
    {
      file: 'pages/wiki/animal.html',
      mustContain: ['id="nav-placeholder"', 'id="footer-placeholder"', 'id="wikiMediaShell"', 'id="wikiFactsGrid"', 'id="wikiBehaviorGrid"', 'id="wikiSourcesList"']
    },
    {
      file: 'pages/wiki/plant-disease.html',
      mustContain: ['id="nav-placeholder"', 'id="footer-placeholder"', 'id="wikiDiseaseHierarchy"', 'id="wikiDiseaseSearch"', '{{PLANT_DISEASE_GROUPS}}']
    }
  ];

  templateChecks.forEach((check) => {
    const fullPath = path.join(ROOT, check.file);
    if (!fs.existsSync(fullPath)) {
      failures.push(`Missing template: ${check.file}`);
      return;
    }
    const html = fs.readFileSync(fullPath, 'utf8');
    check.mustContain.forEach((marker) => {
      if (!html.includes(marker)) {
        failures.push(`${check.file}: missing marker ${marker}`);
      }
    });
  });

  assert(Boolean(samples.mountainSets && samples.mountainSets.nh48 && samples.mountainSets.nh52wav), 'data/wiki/mountain-sets.json must include nh48 and nh52wav sets.', failures);
  assert(Boolean(samples.mountainWithPhotos && samples.mountainWithPhotos.slug), 'Could not find wiki mountain sample with photos in data/wiki/wiki-nh48-mountains.json.', failures);
  assert(Boolean(samples.mountainNoPhotos && samples.mountainNoPhotos.slug), 'Could not find wiki mountain sample without photos in data/wiki/wiki-nh52wav-mountains.json.', failures);
  assert(Boolean(samples.plant && samples.plant.slug), 'Could not find wiki plant sample in data/wiki/plants.json.', failures);
  assert(Boolean(samples.animal && samples.animal.slug), 'Could not find wiki animal sample in data/wiki/animals.json.', failures);
  assert(Boolean(samples.plantDisease && samples.plantDisease.slug), 'Could not find wiki plant disease sample in data/wiki/plant-disease.json.', failures);

  return failures;
}

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'NH48-Wiki-Audit/1.0'
    }
  });
  const body = await response.text();
  return { status: response.status, body };
}

function buildRoutes(samples) {
  return {
    landing: '/wiki',
    mountainPhoto: `/wiki/mountains/nh48/${encodeURIComponent(samples.mountainWithPhotos.slug)}`,
    mountainNoPhoto: `/wiki/mountains/nh52wav/${encodeURIComponent(samples.mountainNoPhotos.slug)}`,
    plant: `/wiki/plants/${encodeURIComponent(samples.plant.slug)}`,
    animal: `/wiki/animals/${encodeURIComponent(samples.animal.slug)}`,
    plantDisease: '/wiki/plant-diseases',
    plantDiseaseAnchor: `/wiki/plant-diseases#disease-${encodeURIComponent(samples.plantDisease.slug)}`
  };
}

async function runUrlChecks(samples) {
  const failures = [];
  const routes = buildRoutes(samples);

  const landingUrl = new URL(routes.landing, BASE_URL).toString();
  const landingPage = await fetchPage(landingUrl);
  assert(landingPage.status === 200, `${landingUrl}: expected HTTP 200, found ${landingPage.status}`, failures);
  [routes.mountainPhoto, routes.mountainNoPhoto, routes.plant, routes.animal, routes.plantDiseaseAnchor].forEach((route) => {
    if (!landingPage.body.includes(`href="${route}"`)) {
      failures.push(`${landingUrl}: missing crawlable wiki link ${route}`);
    }
  });

  const landingDocs = extractJsonLdDocs(landingPage.body);
  const landingTypes = new Set();
  landingDocs.forEach((doc) => collectTypes(doc, landingTypes));
  assert(landingTypes.has('CollectionPage'), `${landingUrl}: missing CollectionPage JSON-LD`, failures);
  assert(landingTypes.has('ItemList'), `${landingUrl}: missing ItemList JSON-LD`, failures);
  assert(countType(landingDocs, 'BreadcrumbList') === 1, `${landingUrl}: expected exactly one BreadcrumbList`, failures);

  const routeChecks = [
    { route: routes.mountainPhoto, requiredType: 'Mountain', expectsImages: true },
    { route: routes.mountainNoPhoto, requiredType: 'Mountain', expectsImages: false },
    { route: routes.plant, requiredType: 'Species', expectsImages: hasEntryMedia(samples.plant) },
    { route: routes.animal, requiredType: 'Species', expectsImages: hasEntryMedia(samples.animal) },
    { route: routes.plantDisease, requiredType: 'CollectionPage', expectsImages: Boolean(samples.plantDiseaseHasMedia) }
  ];

  for (const check of routeChecks) {
    const fullUrl = new URL(check.route, BASE_URL).toString();
    const page = await fetchPage(fullUrl);
    assert(page.status === 200, `${fullUrl}: expected HTTP 200, found ${page.status}`, failures);
    if (page.status !== 200) continue;

    assert(/aria-label=["']Breadcrumb["']/i.test(page.body), `${fullUrl}: visible breadcrumb nav not found`, failures);

    const docs = extractJsonLdDocs(page.body);
    const types = new Set();
    docs.forEach((doc) => collectTypes(doc, types));
    assert(types.has('WebPage'), `${fullUrl}: missing WebPage JSON-LD`, failures);
    assert(types.has(check.requiredType), `${fullUrl}: missing ${check.requiredType} JSON-LD`, failures);
    assert(countType(docs, 'BreadcrumbList') === 1, `${fullUrl}: expected exactly one BreadcrumbList`, failures);

    const imageCount = countWikiImageObjects(docs, fullUrl);
    if (check.expectsImages) {
      assert(imageCount > 0, `${fullUrl}: expected wiki ImageObject metadata for photo-backed entry`, failures);
    } else {
      assert(imageCount === 0, `${fullUrl}: expected no wiki ImageObject metadata for no-photo entry`, failures);
    }

    if (check.route === routes.plantDisease) {
      assert(page.body.includes(`id="disease-${samples.plantDisease.slug}"`), `${fullUrl}: expected visible disease anchor for ${samples.plantDisease.slug}`, failures);
    }
  }

  return failures;
}

async function main() {
  if (typeof fetch !== 'function') {
    console.error('Global fetch is unavailable in this Node runtime.');
    process.exit(1);
  }

  const samples = pickSamples();
  const failures = [];
  failures.push(...runTemplateChecks(samples));
  if (BASE_URL) {
    failures.push(...(await runUrlChecks(samples)));
  }

  if (failures.length) {
    console.error(`Wiki routes audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  if (BASE_URL) {
    console.log(`Wiki routes audit passed for local templates + URL checks: ${BASE_URL}`);
  } else {
    console.log('Wiki routes audit passed for local template/data checks.');
  }
}

main().catch((error) => {
  console.error(`Wiki routes audit crashed: ${error.message}`);
  process.exit(1);
});
