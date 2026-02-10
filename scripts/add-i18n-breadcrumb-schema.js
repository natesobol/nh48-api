#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const I18N_DIR = path.join(ROOT, 'i18n');

function buildBreadcrumbSchema(canonicalUrl) {
  return `  <script id="page-breadcrumb-schema" type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://nh48.info/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "NH48 API",
          "item": "${canonicalUrl}"
        }
      ]
    }
  </script>`;
}

function run() {
  const files = fs.readdirSync(I18N_DIR).filter((name) => name.endsWith('.html'));
  let updated = 0;

  files.forEach((name) => {
    const filePath = path.join(I18N_DIR, name);
    let html = fs.readFileSync(filePath, 'utf8');

    if (html.includes('id="page-breadcrumb-schema"')) {
      return;
    }

    const canonicalMatch = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
    const canonicalUrl = canonicalMatch ? canonicalMatch[1] : `https://nh48.info/i18n/${name}`;
    const schema = buildBreadcrumbSchema(canonicalUrl);

    if (html.includes('<style>')) {
      html = html.replace('<style>', `${schema}\n  <style>`);
    } else if (html.includes('</head>')) {
      html = html.replace('</head>', `${schema}\n</head>`);
    } else {
      return;
    }

    fs.writeFileSync(filePath, html, 'utf8');
    updated += 1;
  });

  console.log(`Updated ${updated} i18n page(s) with breadcrumb schema.`);
}

run();
