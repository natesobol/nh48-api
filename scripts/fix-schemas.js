#!/usr/bin/env node
/**
 * Batch-update i18n pages and static pages to add Organization/WebSite/Person
 * JSON-LD schemas, og:site_name, og:locale, twitter:site, twitter:creator.
 * Run once, then delete this file.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── Locale map for i18n pages ──
const LOCALE_MAP = {
  'es.html': 'es_ES',
  'fr.html': 'fr_FR',
  'de.html': 'de_DE',
  'zh.html': 'zh_TW',
  'zh-Hans.html': 'zh_CN',
  'ja.html': 'ja_JP',
  'ar.html': 'ar_SA',
  'hi.html': 'hi_IN',
  'pt.html': 'pt_BR',
  'ru.html': 'ru_RU',
  'id.html': 'id_ID',
  'it.html': 'it_IT',
  'ko.html': 'ko_KR',
  'tr.html': 'tr_TR',
  'vi.html': 'vi_VN',
  'pl.html': 'pl_PL',
  'nl.html': 'nl_NL',
  'ur.html': 'ur_PK',
  'sw.html': 'sw_KE',
};

const JSON_LD_BLOCK = `  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://nh48.info/#organization",
          "name": "NH48pics",
          "legalName": "NH48pics.com",
          "description": "Professional mountain photography covering the New Hampshire 4,000-footers and beyond.",
          "url": "https://nh48.info/",
          "logo": {
            "@type": "ImageObject",
            "url": "https://nh48.info/nh48API_logo.png",
            "width": 512,
            "height": 512
          },
          "sameAs": [
            "https://www.instagram.com/nate_dumps_pics",
            "https://www.facebook.com/natedumpspics",
            "https://www.etsy.com/shop/NH48pics",
            "https://github.com/natesobol/nh48-api"
          ],
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "White Mountains",
            "addressRegion": "NH",
            "addressCountry": "US"
          },
          "founder": { "@id": "https://nh48.info/#person-nathan-sobol" }
        },
        {
          "@type": "Person",
          "@id": "https://nh48.info/#person-nathan-sobol",
          "name": "Nathan Sobol",
          "alternateName": "Nathan Sobol Photography",
          "url": "https://nh48.info/about",
          "jobTitle": ["Landscape Photographer", "Founder of NH48pics"],
          "worksFor": { "@id": "https://nh48.info/#organization" },
          "sameAs": [
            "https://www.instagram.com/nate_dumps_pics",
            "https://www.facebook.com/natedumpspics",
            "https://www.etsy.com/shop/NH48pics"
          ]
        },
        {
          "@type": "WebSite",
          "@id": "https://nh48.info/#website",
          "url": "https://nh48.info/",
          "name": "NH48pics",
          "description": "Fine-art photography and trail resources for the NH 48 4,000-footers.",
          "publisher": { "@id": "https://nh48.info/#organization" },
          "copyrightHolder": { "@id": "https://nh48.info/#organization" },
          "inLanguage": ["en", "fr"],
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://nh48.info/catalog?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }
      ]
    }
  </script>`;

// ── Process the 19 i18n pages that have NO JSON-LD and minimal OG tags ──
function processI18nPage(filename) {
  const filePath = path.join(ROOT, 'i18n', filename);
  const locale = LOCALE_MAP[filename];
  if (!locale) {
    console.log(`  Skipping ${filename} (no locale mapping)`);
    return;
  }

  let html = fs.readFileSync(filePath, 'utf8');

  // 1. Insert og:type + og:site_name + og:locale BEFORE the existing og:title line
  const ogTitleMatch = html.match(/(\n)(  <meta property="og:title")/);
  if (ogTitleMatch) {
    const insertBefore = ogTitleMatch[0];
    const ogInsert = `\n  <meta property="og:type" content="website">\n  <meta property="og:site_name" content="NH48pics">\n  <meta property="og:locale" content="${locale}">`;
    html = html.replace(insertBefore, ogInsert + insertBefore);
  }

  // 2. Insert twitter:site + twitter:creator AFTER twitter:card line
  //    Also add twitter:image/title/description using existing og values
  const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)">/);
  const ogImage = ogImageMatch ? ogImageMatch[1] : '';

  const twitterCardLine = '  <meta name="twitter:card" content="summary_large_image">';
  const twitterInsert = [
    `  <meta name="twitter:site" content="@nate_dumps_pics">`,
    `  <meta name="twitter:creator" content="@nate_dumps_pics">`,
  ];
  if (ogImage) {
    twitterInsert.push(`  <meta name="twitter:image" content="${ogImage}">`);
  }
  html = html.replace(
    twitterCardLine + '\n',
    twitterCardLine + '\n' + twitterInsert.join('\n') + '\n'
  );

  // 3. Insert JSON-LD block before <style>
  // Check if there's already a JSON-LD block
  if (!html.includes('application/ld+json')) {
    html = html.replace('  <style>', JSON_LD_BLOCK + '\n  <style>');
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`  Updated ${filename} (locale: ${locale})`);
}

// ── Fix fil.html and fa.html (already have JSON-LD but need og:site_name fix + twitter tags) ──
function fixFilFa(filename) {
  const filePath = path.join(ROOT, 'i18n', filename);
  let html = fs.readFileSync(filePath, 'utf8');

  // Fix og:site_name
  html = html.replace(
    '<meta property="og:site_name" content="NH48 API">',
    '<meta property="og:site_name" content="NH48pics">'
  );

  // Add twitter:site/creator after twitter:card if not present
  if (!html.includes('twitter:site')) {
    html = html.replace(
      '  <meta name="twitter:card" content="summary_large_image">\n',
      '  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:site" content="@nate_dumps_pics">\n  <meta name="twitter:creator" content="@nate_dumps_pics">\n'
    );
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`  Fixed ${filename}`);
}

// ── Fix other static pages ──
function fixStaticPage(relPath, opts = {}) {
  const filePath = path.join(ROOT, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`  Skipping ${relPath} (file not found)`);
    return;
  }
  let html = fs.readFileSync(filePath, 'utf8');

  // Fix og:site_name
  if (opts.fixSiteName) {
    html = html.replace(
      /<meta property="og:site_name" content="[^"]*">/,
      '<meta property="og:site_name" content="NH48pics">'
    );
  }

  // Add og:site_name if missing entirely
  if (opts.addSiteName && !html.includes('og:site_name')) {
    // Insert before og:type or og:title
    const ogTypeMatch = html.match(/(  <meta property="og:type"[^>]*>)/);
    const ogTitleMatch = html.match(/(  <meta property="og:title"[^>]*>)/);
    if (ogTypeMatch) {
      html = html.replace(
        ogTypeMatch[1],
        '  <meta property="og:site_name" content="NH48pics">\n' + ogTypeMatch[1]
      );
    } else if (ogTitleMatch) {
      html = html.replace(
        ogTitleMatch[1],
        '  <meta property="og:site_name" content="NH48pics">\n' + ogTitleMatch[1]
      );
    }
  }

  // Add twitter:site/creator if missing
  if (!html.includes('twitter:site') && html.includes('twitter:card')) {
    html = html.replace(
      /(  <meta name="twitter:card" content="[^"]*">)\n/,
      '$1\n  <meta name="twitter:site" content="@nate_dumps_pics">\n  <meta name="twitter:creator" content="@nate_dumps_pics">\n'
    );
  }

  // Fix JSON-LD "NH48 API" → "NH48pics" in isPartOf WebSite name
  if (opts.fixJsonLdName) {
    html = html.replace(
      /"isPartOf":\s*\{[^}]*"name":\s*"NH48 API"/g,
      (match) => match.replace('"NH48 API"', '"NH48pics"')
    );
  }

  // Fix JSON-LD publisher name in nh-4000-footers-info
  if (opts.fixPublisher) {
    html = html.replace(
      /"publisher":\s*\{\s*"@type":\s*"Organization",\s*"name":\s*"NH48 Info"/,
      '"publisher": {\n          "@type": "Organization",\n          "@id": "https://nh48.info/#organization",\n          "name": "NH48pics"'
    );
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`  Fixed ${relPath}`);
}

// ── Fix pages/nh48_peak.html og:site_name ──
function fixNh48PeakTemplate() {
  const filePath = path.join(ROOT, 'pages', 'nh48_peak.html');
  let html = fs.readFileSync(filePath, 'utf8');

  html = html.replace(
    "setMetaProperty('og:site_name', 'nh48.info');",
    "setMetaProperty('og:site_name', 'NH48pics');"
  );

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('  Fixed pages/nh48_peak.html');
}

// ── Main ──
console.log('\n=== Updating 19 i18n pages ===');
for (const filename of Object.keys(LOCALE_MAP)) {
  processI18nPage(filename);
}

console.log('\n=== Fixing fil.html and fa.html ===');
fixFilFa('fil.html');
fixFilFa('fa.html');

console.log('\n=== Fixing other static pages ===');
fixStaticPage('license/index.html', { fixSiteName: true, addSiteName: false });
fixStaticPage('nh-4000-footers-info.html', { fixSiteName: true, fixPublisher: true });
fixStaticPage('peakid-game.html', { addSiteName: true });
fixStaticPage('timed-peakid-game.html', { addSiteName: true });
fixStaticPage('catalog/index.html', { addSiteName: true });
fixStaticPage('catalog/ranges/index.html', { addSiteName: true });
fixStaticPage('pages/plant.html', { addSiteName: true, fixJsonLdName: true });
fixStaticPage('pages/plant_catalog.html', { addSiteName: true, fixJsonLdName: true });

console.log('\n=== Fixing pages/nh48_peak.html ===');
fixNh48PeakTemplate();

console.log('\n=== Done ===');
