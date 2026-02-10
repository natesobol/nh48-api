#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'long-trails-full.json');
const OUTPUT_ROOT = path.join(__dirname, '..', 'trails');

process.on('uncaughtException', (err) => {
  console.error('Unhandled error during long-trails prerender:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection during long-trails prerender:', err);
  process.exit(1);
});

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (match) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[match]));
}

function buildSectionLabel(section) {
  if (section.name) {
    return section.name;
  }
  const start = section.start && section.start.name ? section.start.name : 'Start';
  const end = section.end && section.end.name ? section.end.name : 'End';
  return `${start} -> ${end}`;
}

function buildDescription(trail, section) {
  const distance = section.distanceMiles != null ? `${section.distanceMiles} miles` : null;
  const difficulty = section.difficulty && section.difficulty.rating ? `difficulty ${section.difficulty.rating}` : null;
  const parts = [distance, difficulty].filter(Boolean);
  return `${buildSectionLabel(section)} on the ${trail.name}${parts.length ? ` (${parts.join(', ')})` : ''}.`;
}

function toJsonLd(value) {
  return JSON.stringify(value, null, 2).replace(/<\//g, '<\\/');
}

function renderSectionPage(trail, section, previous, next) {
  const sectionLabel = buildSectionLabel(section);
  const title = `${sectionLabel} - ${trail.name} - NH48`;
  const description = buildDescription(trail, section);
  const canonical = `https://nh48.info/trails/${trail.slug}/sections/${section.slug}/`;
  const trailCanonical = `https://nh48.info/trails/${trail.slug}/`;
  const trailsCanonical = 'https://nh48.info/long-trails/';
  const distance = section.distanceMiles != null ? `${section.distanceMiles} mi` : '-';
  const difficulty = section.difficulty && section.difficulty.rating ? section.difficulty.rating : '-';
  const mileRange = section.mileRange ? `${section.mileRange.start}-${section.mileRange.end}` : '-';
  const jurisdictions = section.jurisdictions && section.jurisdictions.length ? section.jurisdictions.join(', ') : '-';
  const tags = section.tags && section.tags.length ? section.tags.join(', ') : '-';
  const bounds = section.bounds || trail.bounds || (trail.map && trail.map.bounds) || null;

  const breadcrumbSchema = toJsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://nh48.info/' },
      { '@type': 'ListItem', position: 2, name: 'Long Trails', item: trailsCanonical },
      { '@type': 'ListItem', position: 3, name: trail.name, item: trailCanonical },
      { '@type': 'ListItem', position: 4, name: sectionLabel, item: canonical }
    ]
  });

  const webpageSchema = toJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: canonical,
    inLanguage: 'en',
    isPartOf: {
      '@type': 'WebSite',
      name: 'NH48 API',
      url: 'https://nh48.info/'
    },
    about: {
      '@type': 'Route',
      name: trail.name,
      identifier: trail.slug,
      description: sectionLabel,
      url: trailCanonical
    }
  });

  const mapScript = bounds ? `
    const bounds = L.latLngBounds([
      [${bounds.minLat}, ${bounds.minLon}],
      [${bounds.maxLat}, ${bounds.maxLon}]
    ]);
    map.fitBounds(bounds, { padding: [20, 20] });
  ` : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <script id="page-webpage-schema" type="application/ld+json">${webpageSchema}</script>
  <script id="page-breadcrumb-schema" type="application/ld+json">${breadcrumbSchema}</script>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #1a1d23;
      color: #ffffff;
    }
    .breadcrumbs {
      max-width: 960px;
      margin: 18px auto 0;
      padding: 0 20px;
      color: #d9dde5;
      font-size: 0.92rem;
    }
    .breadcrumbs ol {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      align-items: center;
    }
    .breadcrumbs li::after {
      content: "/";
      margin-left: 0.3rem;
      color: rgba(217, 221, 229, 0.58);
    }
    .breadcrumbs li:last-child::after {
      display: none;
    }
    .breadcrumbs a {
      color: #7dd3fc;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .breadcrumbs [aria-current="page"] {
      color: #ffffff;
      text-decoration: none;
    }
    header {
      padding: 24px 20px 12px;
      max-width: 960px;
      margin: 0 auto;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 2rem;
    }
    p {
      margin: 0;
      color: #d9dde5;
    }
    .content {
      max-width: 960px;
      margin: 0 auto 32px;
      padding: 0 20px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .stats {
      background: #25282f;
      border-radius: 12px;
      border: 1px solid #3d4048;
      padding: 16px;
      display: grid;
      gap: 8px;
    }
    .stats div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .map {
      height: 320px;
      border-radius: 12px;
      border: 1px solid #3d4048;
      overflow: hidden;
    }
    .nav-links {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .nav-links a {
      color: #4a9eff;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li><a href="/long-trails/">Long Trails</a></li>
      <li><a href="/trails/${trail.slug}/">${escapeHtml(trail.name)}</a></li>
      <li><span aria-current="page">${escapeHtml(sectionLabel)}</span></li>
    </ol>
  </nav>
  <header>
    <h1>${escapeHtml(sectionLabel)}</h1>
    <p>${escapeHtml(trail.name)}</p>
  </header>
  <div class="content">
    <div class="stats">
      <div><strong>Distance</strong><span>${escapeHtml(distance)}</span></div>
      <div><strong>Difficulty</strong><span>${escapeHtml(difficulty)}</span></div>
      <div><strong>Mile range</strong><span>${escapeHtml(mileRange)}</span></div>
      <div><strong>Jurisdictions</strong><span>${escapeHtml(jurisdictions)}</span></div>
      <div><strong>Tags</strong><span>${escapeHtml(tags)}</span></div>
    </div>
    <div id="map" class="map"></div>
    <div class="nav-links">
      ${previous ? `<a href="/trails/${trail.slug}/sections/${previous.slug}/">&larr; ${escapeHtml(buildSectionLabel(previous))}</a>` : '<span></span>'}
      ${next ? `<a href="/trails/${trail.slug}/sections/${next.slug}/">${escapeHtml(buildSectionLabel(next))} &rarr;</a>` : '<span></span>'}
    </div>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
    const map = L.map('map', { zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    ${mapScript || 'map.setView([44.0, -71.4], 7);'}
  </script>
</body>
</html>`;
}

function buildPages() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error('Missing long-trails-full.json. Run prepare-long-trails.js first.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const trails = data.trails || [];

  trails.forEach((trail) => {
    const sections = (trail.sections || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    sections.forEach((section, index) => {
      const previous = index > 0 ? sections[index - 1] : null;
      const next = index < sections.length - 1 ? sections[index + 1] : null;
      const outputDir = path.join(OUTPUT_ROOT, trail.slug, 'sections', section.slug);
      ensureDir(outputDir);
      const html = renderSectionPage(trail, section, previous, next);
      fs.writeFileSync(path.join(outputDir, 'index.html'), html);
    });
  });
}

try {
  buildPages();
  console.log('Rendered long trail section pages.');
} catch (err) {
  console.error('Error during long-trails prerender:', err);
  process.exit(1);
}
