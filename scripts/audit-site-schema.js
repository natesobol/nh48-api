#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(filePath) {
  return fs.readFileSync(path.join(ROOT, filePath), 'utf8');
}

function extractJsonLd(html) {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const docs = [];
  const errors = [];
  matches.forEach((m) => {
    const raw = (m[1] || '').trim();
    if (!raw) return;
    try {
      docs.push(JSON.parse(raw));
    } catch (err) {
      errors.push(err.message);
    }
  });
  return { docs, errors };
}

function collectTypes(node, out = new Set()) {
  if (!node || typeof node !== 'object') return out;
  const type = node['@type'];
  if (Array.isArray(type)) type.forEach((t) => out.add(String(t)));
  else if (typeof type === 'string') out.add(type);

  if (Array.isArray(node['@graph'])) {
    node['@graph'].forEach((item) => collectTypes(item, out));
  }
  Object.values(node).forEach((value) => {
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) value.forEach((item) => collectTypes(item, out));
      else collectTypes(value, out);
    }
  });
  return out;
}

function hasVisibleBreadcrumb(html) {
  return /aria-label=["']Breadcrumb["']/i.test(html) || /class=["'][^"']*breadcrumbs[^"']*["']/i.test(html);
}

function hasSeoGallery(html) {
  return /class=["'][^"']*seo-gallery[^"']*["']/i.test(html);
}

function sectionPages() {
  const trailsRoot = path.join(ROOT, 'trails');
  const pages = [];
  if (!fs.existsSync(trailsRoot)) return pages;

  const trailSlugs = fs.readdirSync(trailsRoot, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  trailSlugs.forEach((trailSlug) => {
    const sectionsDir = path.join(trailsRoot, trailSlug, 'sections');
    if (!fs.existsSync(sectionsDir)) return;
    const sectionSlugs = fs.readdirSync(sectionsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    sectionSlugs.forEach((sectionSlug) => {
      pages.push(path.join('trails', trailSlug, 'sections', sectionSlug, 'index.html'));
    });
  });
  return pages;
}

function auditFile(filePath, requirements) {
  const html = read(filePath);
  const { docs, errors } = extractJsonLd(html);
  const types = new Set();
  docs.forEach((doc) => collectTypes(doc, types));

  const problems = [];
  if (errors.length) {
    problems.push(`invalid JSON-LD block(s): ${errors.join('; ')}`);
  }
  (requirements.types || []).forEach((type) => {
    if (!types.has(type)) {
      problems.push(`missing JSON-LD type "${type}"`);
    }
  });
  if (requirements.visibleBreadcrumb && !hasVisibleBreadcrumb(html)) {
    problems.push('missing visible breadcrumb nav');
  }
  if (requirements.noSeoGallery && hasSeoGallery(html)) {
    problems.push('homepage seo-gallery block should be removed');
  }
  return problems;
}

function main() {
  const checks = [
    { file: 'index.html', types: ['BreadcrumbList'], visibleBreadcrumb: true, noSeoGallery: true },
    { file: 'pages/index.html', types: [], visibleBreadcrumb: true, noSeoGallery: true },
    { file: 'nh-4000-footers-guide.html', types: ['WebPage', 'BreadcrumbList', 'ImageObject'], visibleBreadcrumb: true },
    { file: 'nh-4000-footers-info.html', types: ['BreadcrumbList', 'FAQPage'], visibleBreadcrumb: true },
    { file: 'nh48-planner.html', types: ['WebPage', 'BreadcrumbList', 'ImageObject'], visibleBreadcrumb: true },
    { file: 'range/index.html', types: ['WebPage', 'BreadcrumbList', 'ImageObject'], visibleBreadcrumb: true },
    { file: 'photos/index.html', types: ['Collection', 'BreadcrumbList'], visibleBreadcrumb: true },
    { file: 'dataset/index.html', types: ['DataCatalog', 'WebPage', 'BreadcrumbList', 'ImageObject'], visibleBreadcrumb: true },
    { file: 'dataset/long-trails/index.html', types: ['Dataset', 'WebPage', 'BreadcrumbList', 'ImageObject'], visibleBreadcrumb: true },
    { file: 'long-trails/index.html', types: ['Dataset', 'BreadcrumbList', 'ImageObject'], visibleBreadcrumb: true },
    { file: 'trails/index.html', types: ['Dataset', 'BreadcrumbList', 'ImageObject'], visibleBreadcrumb: true },
    { file: 'catalog.html', types: ['BreadcrumbList'], visibleBreadcrumb: false }
  ];

  const allFailures = [];
  checks.forEach((check) => {
    const problems = auditFile(check.file, check);
    if (problems.length) {
      allFailures.push({ file: check.file, problems });
    }
  });

  sectionPages().forEach((filePath) => {
    const problems = auditFile(filePath, {
      types: ['WebPage', 'BreadcrumbList'],
      visibleBreadcrumb: true
    });
    if (problems.length) {
      allFailures.push({ file: filePath, problems });
    }
  });

  const i18nDir = path.join(ROOT, 'i18n');
  if (fs.existsSync(i18nDir)) {
    fs.readdirSync(i18nDir).filter((name) => name.endsWith('.html')).forEach((name) => {
      const filePath = path.join('i18n', name);
      const problems = auditFile(filePath, {
        types: ['BreadcrumbList'],
        visibleBreadcrumb: false
      });
      if (problems.length) {
        allFailures.push({ file: filePath, problems });
      }
    });
  }

  if (allFailures.length) {
    console.error(`Schema audit failed (${allFailures.length} file(s)).`);
    allFailures.forEach((failure) => {
      console.error(`- ${failure.file}`);
      failure.problems.forEach((p) => console.error(`  * ${p}`));
    });
    process.exit(1);
  }

  console.log('Schema audit passed.');
}

main();
