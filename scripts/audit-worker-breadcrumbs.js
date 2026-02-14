#!/usr/bin/env node

const BASE_URL = process.env.WORKER_BREADCRUMB_AUDIT_URL || getArgValue('--url') || 'https://nh48.info';

const ROUTES = [
  { path: '/', labels: ['Home', 'NH48 API'] },
  { path: '/fr/', labels: ['Accueil', 'API NH48'] },
  { path: '/trails', labels: ['Home', 'NH48 API', 'Trails', 'WMNF Trails Map'] },
  { path: '/fr/trails', labels: ['Accueil', 'API NH48', 'Sentiers', 'Carte WMNF'] },
  { path: '/long-trails', labels: ['Home', 'NH48 API', 'Trails', 'Long-Distance Trails Map'] },
  { path: '/fr/long-trails', labels: ['Accueil', 'API NH48', 'Sentiers', 'Carte des longs sentiers'] },
  { path: '/trails/appalachian-trail', labels: ['Home', 'NH48 API', 'Trails', 'Long-Distance Trails Map', 'Appalachian Trail'] },
  { path: '/trails/pacific-crest-trail', labels: ['Home', 'NH48 API', 'Trails', 'Long-Distance Trails Map', 'Pacific Crest Trail'] },
  { path: '/fr/trails/appalachian-trail', labels: ['Accueil', 'API NH48', 'Sentiers', 'Carte des longs sentiers', 'Appalachian Trail'] },
  { path: '/fr/trails/pacific-crest-trail', labels: ['Accueil', 'API NH48', 'Sentiers', 'Carte des longs sentiers', 'Pacific Crest Trail'] }
];

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return '';
  return process.argv[index + 1];
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function extractJsonLdDocs(html) {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const docs = [];
  const parseErrors = [];

  matches.forEach((match) => {
    const raw = normalizeText(match[1]);
    if (!raw) return;
    try {
      docs.push(JSON.parse(raw));
    } catch (error) {
      parseErrors.push(error.message);
    }
  });

  return { docs, parseErrors };
}

function collectNodes(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((child) => collectNodes(child, out));
    return out;
  }
  if (Array.isArray(node['@graph'])) {
    node['@graph'].forEach((child) => collectNodes(child, out));
    return out;
  }
  out.push(node);
  Object.values(node).forEach((value) => {
    if (value && typeof value === 'object') {
      collectNodes(value, out);
    }
  });
  return out;
}

function getTypes(node) {
  const value = node['@type'];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return [value];
  return [];
}

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'NH48-Breadcrumb-Audit/1.0'
    }
  });
  const body = await response.text();
  return { status: response.status, body };
}

function validateBreadcrumb(route, breadcrumbNode) {
  const failures = [];
  const items = Array.isArray(breadcrumbNode?.itemListElement) ? breadcrumbNode.itemListElement : [];
  if (items.length !== route.labels.length) {
    failures.push(`Expected ${route.labels.length} breadcrumb items, found ${items.length}`);
  }

  const names = items.map((item) => normalizeText(item?.name));
  route.labels.forEach((label, index) => {
    const actual = names[index] || '';
    if (actual !== label) {
      failures.push(`Expected breadcrumb label "${label}" at position ${index + 1}, found "${actual || '[missing]'}"`);
    }
  });

  items.forEach((item, index) => {
    const expectedPos = index + 1;
    if (Number(item?.position) !== expectedPos) {
      failures.push(`Expected breadcrumb position ${expectedPos}, found ${item?.position ?? '[missing]'}`);
    }
  });

  return failures;
}

async function auditRoute(baseUrl, route) {
  const url = new URL(route.path, baseUrl).toString();
  const failures = [];
  const result = await fetchPage(url);

  if (result.status !== 200) {
    failures.push(`HTTP ${result.status}`);
    return { url, failures };
  }

  const { docs, parseErrors } = extractJsonLdDocs(result.body);
  if (parseErrors.length) {
    failures.push(`Invalid JSON-LD blocks: ${parseErrors.join('; ')}`);
    return { url, failures };
  }

  const nodes = [];
  docs.forEach((doc) => collectNodes(doc, nodes));
  const breadcrumbNodes = nodes.filter((node) => getTypes(node).includes('BreadcrumbList'));
  if (breadcrumbNodes.length !== 1) {
    failures.push(`Expected exactly 1 BreadcrumbList, found ${breadcrumbNodes.length}`);
    return { url, failures };
  }

  failures.push(...validateBreadcrumb(route, breadcrumbNodes[0]));
  return { url, failures };
}

async function main() {
  if (typeof fetch !== 'function') {
    console.error('Global fetch is unavailable in this Node runtime.');
    process.exit(1);
  }

  const audits = [];
  for (const route of ROUTES) {
    audits.push(await auditRoute(BASE_URL, route));
  }

  const failures = audits.filter((audit) => audit.failures.length);
  if (failures.length) {
    console.error(`Worker breadcrumb audit failed for ${failures.length} route(s).`);
    failures.forEach((audit) => {
      console.error(`- ${audit.url}`);
      audit.failures.forEach((failure) => console.error(`  * ${failure}`));
    });
    console.error('Note: /trails/*/sections/* routes are intentionally out of scope for this audit.');
    process.exit(1);
  }

  console.log(`Worker breadcrumb audit passed for ${ROUTES.length} route(s): ${BASE_URL}`);
  console.log('Section routes (/trails/*/sections/*) were intentionally excluded.');
}

main().catch((error) => {
  console.error(`Worker breadcrumb audit crashed: ${error.message}`);
  process.exit(1);
});

