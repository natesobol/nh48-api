#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PEAK_TEMPLATE_PATH = path.join(ROOT, 'pages', 'nh48_peak.html');
const PEAK_RUNTIME_PATH = path.join(ROOT, 'js', 'peak-detail-runtime.js');
const WORKER_PATH = path.join(ROOT, 'worker.js');
const PEAK_DATA_PATH = path.join(ROOT, 'data', 'nh48.json');
const BASE_URL = process.env.PEAK_SCHEMA_PARITY_AUDIT_URL || getArgValue('--url') || '';

const SAMPLE_ROUTES = [
  '/peak/mount-washington',
  '/peak/mount-isolation',
  '/fr/peak/mount-washington'
];

const REQUIRED_TYPES = ['Mountain', 'HikingTrail', 'ImageObject', 'BreadcrumbList'];
const REQUIRED_ENRICHMENT_PROPERTIES = [
  'Most Common Trailhead',
  'Parking Notes',
  'Technical Difficulty (1-10)',
  'Physical Effort (1-10)',
  'Risk Factors',
  'Preparation Notes',
  'Current Wind Speed (mph)',
  'Current Temperature (F)'
];
const REQUIRED_NARRATIVE_SEGMENTS = ['Mountain Overview'];
const REQUIRED_IMAGE_EXIF_KEYS = ['cameraModel', 'lens', 'fStop', 'shutterSpeed', 'iso', 'focalLength'];

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return '';
  return process.argv[idx + 1];
}

function escRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractFunctionChunk(content, functionName) {
  const signature = `function ${functionName}`;
  const start = content.indexOf(signature);
  if (start === -1) {
    return '';
  }
  const tail = content.slice(start + 1);
  const nextMatch = tail.match(/\n\s*(?:async\s+)?function\s+[A-Za-z0-9_]+\s*\(/);
  if (!nextMatch) {
    return content.slice(start);
  }
  const end = start + 1 + nextMatch.index;
  return content.slice(start, end);
}

function extractJsonLdDocs(html) {
  const docs = [];
  const errors = [];
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  matches.forEach((match) => {
    const raw = (match[1] || '').trim();
    if (!raw) return;
    try {
      docs.push(JSON.parse(raw));
    } catch (error) {
      errors.push(error.message);
    }
  });
  return { docs, errors };
}

function collectNodes(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((entry) => collectNodes(entry, out));
    return out;
  }
  if (Array.isArray(node['@graph'])) {
    node['@graph'].forEach((entry) => collectNodes(entry, out));
    return out;
  }
  out.push(node);
  Object.values(node).forEach((value) => {
    if (value && typeof value === 'object') collectNodes(value, out);
  });
  return out;
}

function getTypes(node) {
  const type = node && node['@type'];
  if (Array.isArray(type)) return type.map((entry) => String(entry));
  if (typeof type === 'string') return [type];
  return [];
}

function additionalPropertyNames(node) {
  const list = Array.isArray(node && node.additionalProperty) ? node.additionalProperty : [];
  return new Set(
    list
      .map((entry) => (entry && typeof entry === 'object' ? String(entry.name || '').trim() : ''))
      .filter(Boolean)
  );
}

function assertImageObjectParity(nodes, label, failures) {
  const imageObjects = nodes.filter((node) => getTypes(node).includes('ImageObject'));
  if (!imageObjects.length) {
    failures.push(`${label}: missing ImageObject node.`);
    return;
  }

  const scoped = imageObjects.filter((image) => {
    const id = String(image?.['@id'] || '').toLowerCase();
    const hasRepresentativeFlag = image?.representativeOfPage === true || image?.representativeOfPage === false;
    return id.includes('#img-') || hasRepresentativeFlag;
  });
  const relevantImages = scoped.length ? scoped : imageObjects;

  const representativeCount = relevantImages.filter((image) => image && image.representativeOfPage === true).length;
  if (representativeCount !== 1) {
    failures.push(`${label}: expected exactly 1 ImageObject with representativeOfPage=true, found ${representativeCount}.`);
  }

  relevantImages.forEach((image, index) => {
    const imageLabel = `${label}: ImageObject #${index + 1}`;
    const exifData = Array.isArray(image?.exifData) ? image.exifData : [];
    if (!exifData.length) {
      failures.push(`${imageLabel} missing exifData PropertyValue[] entries.`);
      return;
    }
    const exifNames = new Set(
      exifData
        .map((entry) => (entry && typeof entry === 'object' ? String(entry.name || '').trim() : ''))
        .filter(Boolean)
    );
    REQUIRED_IMAGE_EXIF_KEYS.forEach((key) => {
      if (!exifNames.has(key)) {
        failures.push(`${imageLabel} exifData missing "${key}".`);
      }
    });
  });
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function readLocalPeakDataset() {
  if (!fs.existsSync(PEAK_DATA_PATH)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(PEAK_DATA_PATH, 'utf8').replace(/^\uFEFF/, '');
    const payload = JSON.parse(raw);
    return payload && typeof payload === 'object' ? payload : {};
  } catch {
    return {};
  }
}

function buildRouteSetFromDataset(dataset, includeFrench = true) {
  const entries = Array.isArray(dataset)
    ? dataset
    : dataset && typeof dataset === 'object'
      ? Object.entries(dataset).map(([slug, peak]) => ({ slug, peak }))
      : [];

  const slugNamePairs = entries
    .map((entry) => {
      if (entry && typeof entry === 'object' && Object.prototype.hasOwnProperty.call(entry, 'peak')) {
        const slug = normalizeSlug(entry.slug || entry.peak?.slug || entry.peak?.['Peak Name']);
        const name = String(entry.peak?.['Peak Name'] || entry.peak?.peakName || '').trim();
        return { slug, name };
      }
      const slug = normalizeSlug(entry?.slug || entry?.Slug || entry?.['Peak Name'] || entry?.peakName);
      const name = String(entry?.['Peak Name'] || entry?.peakName || '').trim();
      return { slug, name };
    })
    .filter((entry) => entry.slug)
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const routes = [];
  const englishNameBySlug = new Map();
  slugNamePairs.forEach(({ slug, name }) => {
    routes.push(`/peak/${slug}`);
    if (includeFrench) {
      routes.push(`/fr/peak/${slug}`);
    }
    if (name) {
      englishNameBySlug.set(slug, name);
    }
  });

  if (!routes.length) {
    return {
      routes: SAMPLE_ROUTES,
      englishNameBySlug: new Map([['mount-washington', 'Mount Washington']])
    };
  }

  return { routes, englishNameBySlug };
}

function extractBreadcrumbLabelAtPosition(breadcrumbNode, position) {
  const items = Array.isArray(breadcrumbNode?.itemListElement) ? breadcrumbNode.itemListElement : [];
  const sorted = items
    .slice()
    .sort((a, b) => Number(a?.position || 0) - Number(b?.position || 0));
  const entry = sorted.find((item) => Number(item?.position || 0) === Number(position));
  if (!entry || typeof entry !== 'object') return '';
  const directName = typeof entry.name === 'string' ? entry.name.trim() : '';
  const nestedName = entry.item && typeof entry.item.name === 'string' ? entry.item.name.trim() : '';
  return directName || nestedName || '';
}

function routeToLocalPrerenderFile(route) {
  const match = String(route || '').match(/^\/(?:fr\/)?peak\/([^/?#]+)/i);
  if (!match) return '';
  const slug = match[1];
  const rel = route.startsWith('/fr/')
    ? path.join('fr', 'peaks', slug, 'index.html')
    : path.join('peaks', slug, 'index.html');
  return path.join(ROOT, rel);
}

function assertSourceParity(templateContent, runtimeContent, workerContent, failures) {
  const templateBody = extractFunctionChunk(runtimeContent, 'buildMountainSchema');
  const workerBody = extractFunctionChunk(workerContent, 'buildJsonLd');

  if (!templateBody) {
    failures.push('Unable to locate buildMountainSchema() in js/peak-detail-runtime.js.');
    return;
  }
  if (!workerBody) {
    failures.push('Unable to locate buildJsonLd() in worker.js.');
    return;
  }

  REQUIRED_TYPES.forEach((type) => {
    if (!new RegExp(escRegExp(type), 'i').test(runtimeContent)) {
      failures.push(`Runtime module is missing schema type reference: ${type}`);
    }
    if (!new RegExp(escRegExp(type), 'i').test(workerContent)) {
      failures.push(`Worker is missing schema type reference: ${type}`);
    }
  });

  REQUIRED_ENRICHMENT_PROPERTIES.forEach((propertyName) => {
    const token = new RegExp(`['"]${escRegExp(propertyName)}['"]`);
    if (!token.test(templateBody)) {
      failures.push(`Template schema builder is missing required enrichment property "${propertyName}".`);
    }
    if (!token.test(workerBody)) {
      failures.push(`Worker schema builder is missing required enrichment property "${propertyName}".`);
    }
  });

  REQUIRED_IMAGE_EXIF_KEYS.forEach((key) => {
    const token = new RegExp(`['"]${escRegExp(key)}['"]`);
    if (!token.test(runtimeContent)) {
      failures.push(`Runtime schema builder is missing required ImageObject exif key "${key}".`);
    }
    if (!token.test(workerContent)) {
      failures.push(`Worker schema builder is missing required ImageObject exif key "${key}".`);
    }
  });

  if (!/ParkingFacility|containsPlace/.test(templateBody)) {
    failures.push('Runtime schema builder is missing parking/access place enrichment logic.');
  }
  if (!/ParkingFacility|containsPlace/.test(workerBody)) {
    failures.push('Worker schema builder is missing parking/access place enrichment logic.');
  }
  if (!/hasPart/.test(templateBody)) {
    failures.push('Runtime schema builder is missing narrative hasPart structured data.');
  }
  if (!/hasPart/.test(workerBody)) {
    failures.push('Worker schema builder is missing narrative hasPart structured data.');
  }
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'NH48-Peak-Schema-Parity-Audit/1.0' }
  });
  const body = await response.text();
  return { status: response.status, body };
}

async function loadRuntimeRouteSet(baseUrl) {
  const dataUrl = new URL('/data/nh48.json', baseUrl).toString();
  const response = await fetch(dataUrl, {
    headers: { 'User-Agent': 'NH48-Peak-Schema-Parity-Audit/1.0' }
  });
  if (!response.ok) {
    throw new Error(`Unable to load canonical source dataset ${dataUrl} (${response.status})`);
  }
  const nh48 = await response.json();
  return buildRouteSetFromDataset(nh48, true);
}

async function assertRuntimeParity(baseUrl, failures) {
  const { routes, englishNameBySlug } = await loadRuntimeRouteSet(baseUrl);

  for (const route of routes) {
    const url = new URL(route, baseUrl).toString();
    const { status, body } = await fetchHtml(url);
    if (status !== 200) {
      failures.push(`${url}: expected HTTP 200, received ${status}.`);
      continue;
    }

    const { docs, errors } = extractJsonLdDocs(body);
    if (errors.length) {
      failures.push(`${url}: invalid JSON-LD (${errors.join('; ')})`);
      continue;
    }

    const nodes = [];
    docs.forEach((doc) => collectNodes(doc, nodes));
    const breadcrumbNodes = nodes.filter((node) => getTypes(node).includes('BreadcrumbList'));
    if (breadcrumbNodes.length !== 1) {
      failures.push(`${url}: expected exactly 1 BreadcrumbList, found ${breadcrumbNodes.length}.`);
    } else if (/\/fr\/peak\//i.test(route)) {
      const slug = String(route).replace(/^\/fr\/peak\//i, '').replace(/\/.*$/, '');
      const expectedName = englishNameBySlug.get(slug);
      if (expectedName) {
        const breadcrumbName = extractBreadcrumbLabelAtPosition(breadcrumbNodes[0], 4);
        if (breadcrumbName !== expectedName) {
          failures.push(`${url}: expected breadcrumb label "${expectedName}" at position 4, found "${breadcrumbName || '[missing]'}".`);
        }
      }
    }

    const typeSet = new Set();
    nodes.forEach((node) => getTypes(node).forEach((type) => typeSet.add(type)));
    REQUIRED_TYPES.forEach((requiredType) => {
      if (!typeSet.has(requiredType)) {
        failures.push(`${url}: missing required schema type "${requiredType}".`);
      }
    });
    assertImageObjectParity(nodes, url, failures);

    const mountainNodes = nodes.filter((node) => getTypes(node).includes('Mountain'));
    if (!mountainNodes.length) {
      failures.push(`${url}: missing Mountain node.`);
      continue;
    }
    const mountain = mountainNodes[0];
    const propertyNames = additionalPropertyNames(mountain);
    REQUIRED_ENRICHMENT_PROPERTIES.forEach((propertyName) => {
      if (!propertyNames.has(propertyName)) {
        failures.push(`${url}: Mountain.additionalProperty is missing "${propertyName}".`);
      }
    });

    if (!mountain.containsPlace) {
      failures.push(`${url}: Mountain node missing containsPlace parking/access enrichment.`);
    }
    const narrative = Array.isArray(mountain.hasPart) ? mountain.hasPart : [];
    REQUIRED_NARRATIVE_SEGMENTS.forEach((segment) => {
      const hasSegment = narrative.some((entry) => {
        const entryName = entry && typeof entry.name === 'string' ? entry.name : '';
        const entryText = entry && typeof entry.text === 'string' ? entry.text.trim() : '';
        return entryName.includes(segment) && entryText.length > 0;
      });
      if (!hasSegment) {
        failures.push(`${url}: Mountain.hasPart is missing narrative segment "${segment}".`);
      }
    });
  }

  return routes.length;
}

function assertLocalPrerenderSamples(failures) {
  const routeSet = buildRouteSetFromDataset(readLocalPeakDataset(), true);
  routeSet.routes.forEach((route) => {
    const filePath = routeToLocalPrerenderFile(route);
    if (!filePath) {
      failures.push(`${route}: unable to resolve local prerender file path.`);
      return;
    }
    if (!fs.existsSync(filePath)) {
      failures.push(`${route}: missing local prerender file (${path.relative(ROOT, filePath)}).`);
      return;
    }

    const body = fs.readFileSync(filePath, 'utf8');
    const { docs, errors } = extractJsonLdDocs(body);
    if (errors.length) {
      failures.push(`${route}: invalid JSON-LD (${errors.join('; ')})`);
      return;
    }

    const nodes = [];
    docs.forEach((doc) => collectNodes(doc, nodes));
    const breadcrumbNodes = nodes.filter((node) => getTypes(node).includes('BreadcrumbList'));
    if (breadcrumbNodes.length !== 1) {
      failures.push(`${route}: expected exactly 1 BreadcrumbList, found ${breadcrumbNodes.length}.`);
    } else if (/^\/fr\/peak\//i.test(route)) {
      const slug = String(route).replace(/^\/fr\/peak\//i, '').replace(/\/.*$/, '');
      const expectedName = routeSet.englishNameBySlug.get(slug);
      if (expectedName) {
        const breadcrumbName = extractBreadcrumbLabelAtPosition(breadcrumbNodes[0], 4);
        if (breadcrumbName !== expectedName) {
          failures.push(`${route}: expected breadcrumb label "${expectedName}" at position 4, found "${breadcrumbName || '[missing]'}".`);
        }
      }
    }

    const typeSet = new Set();
    nodes.forEach((node) => getTypes(node).forEach((type) => typeSet.add(type)));
    REQUIRED_TYPES.forEach((requiredType) => {
      if (!typeSet.has(requiredType)) {
        failures.push(`${route}: missing required schema type "${requiredType}".`);
      }
    });
    assertImageObjectParity(nodes, route, failures);

    const mountainNodes = nodes.filter((node) => getTypes(node).includes('Mountain'));
    if (!mountainNodes.length) {
      failures.push(`${route}: missing Mountain node.`);
      return;
    }
    const mountain = mountainNodes[0];
    const propertyNames = additionalPropertyNames(mountain);
    REQUIRED_ENRICHMENT_PROPERTIES.forEach((propertyName) => {
      if (!propertyNames.has(propertyName)) {
        failures.push(`${route}: Mountain.additionalProperty is missing "${propertyName}".`);
      }
    });

    if (!mountain.containsPlace) {
      failures.push(`${route}: Mountain node missing containsPlace parking/access enrichment.`);
    }

    const narrative = Array.isArray(mountain.hasPart) ? mountain.hasPart : [];
    REQUIRED_NARRATIVE_SEGMENTS.forEach((segment) => {
      const hasSegment = narrative.some((entry) => {
        const entryName = entry && typeof entry.name === 'string' ? entry.name : '';
        const entryText = entry && typeof entry.text === 'string' ? entry.text.trim() : '';
        return entryName.includes(segment) && entryText.length > 0;
      });
      if (!hasSegment) {
        failures.push(`${route}: Mountain.hasPart is missing narrative segment "${segment}".`);
      }
    });
  });

  return routeSet.routes.length;
}

async function main() {
  const failures = [];
  if (!fs.existsSync(PEAK_TEMPLATE_PATH)) {
    failures.push(`Missing template source file ${path.relative(ROOT, PEAK_TEMPLATE_PATH)}.`);
  }
  if (!fs.existsSync(PEAK_RUNTIME_PATH)) {
    failures.push(`Missing runtime source file ${path.relative(ROOT, PEAK_RUNTIME_PATH)}.`);
  }
  if (!fs.existsSync(WORKER_PATH)) {
    failures.push(`Missing worker source file ${path.relative(ROOT, WORKER_PATH)}.`);
  }
  if (failures.length) {
    console.error(`Peak schema parity audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  const templateContent = fs.readFileSync(PEAK_TEMPLATE_PATH, 'utf8');
  const runtimeContent = fs.readFileSync(PEAK_RUNTIME_PATH, 'utf8');
  const workerContent = fs.readFileSync(WORKER_PATH, 'utf8');
  let runtimeRouteCount = SAMPLE_ROUTES.length;

  assertSourceParity(templateContent, runtimeContent, workerContent, failures);
  if (BASE_URL) {
    runtimeRouteCount = await assertRuntimeParity(BASE_URL, failures);
  } else {
    runtimeRouteCount = assertLocalPrerenderSamples(failures);
  }

  if (failures.length) {
    console.error(`Peak schema parity audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  if (BASE_URL) {
    console.log(`Peak schema parity audit passed for ${runtimeRouteCount} route(s): ${BASE_URL}`);
  } else {
    console.log(`Peak schema parity audit passed for worker/template source checks + ${runtimeRouteCount} local route(s).`);
  }
}

main().catch((error) => {
  console.error(`Peak schema parity audit crashed: ${error.message}`);
  process.exit(1);
});
