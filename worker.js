// Cloudflare Worker for NH48 Peak Guide – Full Template Version
//
// This Worker serves the full interactive peak detail page stored in the
// GitHub repository (pages/nh48_peak.html) at clean URLs like
// `/peak/{slug}` and `/fr/peak/{slug}`.  It removes the client-side
// redirect logic from the template, injects a script that rewrites
// `window.location.search` so that the existing client-side code can
// read the slug from the query string, and inserts server-rendered
// meta tags and structured data for SEO.  The Worker fetches the
// mountain data and descriptions from an R2 bucket (`NH48_DATA`), and
// loads translation dictionaries from GitHub to build localized
// titles and descriptions.  By doing this work on the server, the
// page becomes indexable while still delivering the full SPA
// experience once the JS hydrates on the client.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    // Determine if the route is French and extract the slug.  We
    // support two patterns:
    //   /peak/{slug}
    //   /fr/peak/{slug}
    const isFrench = parts[0] === 'fr';
    const slugIdx = isFrench ? 2 : 1;
    const slug = parts[slugIdx] || '';
    const lang = isFrench ? 'fr' : 'en';

    // Constants
    const SITE = 'https://nh48.info';
    const RAW_TEMPLATE_URL = 'https://raw.githubusercontent.com/natesobol/nh48-api/main/pages/nh48_peak.html';
    const RAW_CATALOG_URL = 'https://raw.githubusercontent.com/natesobol/nh48-api/main/pages/nh48_catalog.html';
    const EN_TRANS_URL = 'https://raw.githubusercontent.com/natesobol/nh48-api/main/i18n/en.json';
    const FR_TRANS_URL = 'https://raw.githubusercontent.com/natesobol/nh48-api/main/i18n/fr.json';
    const DEFAULT_IMAGE = `${SITE}/nh48-preview.png`;
    const RIGHTS_DEFAULTS = {
      creatorName: 'Nathan Sobol',
      creditText: '© Nathan Sobol / NH48pics.com',
      copyrightNotice: '© Nathan Sobol',
      licenseUrl: 'https://nh48.info/license',
      acquireLicensePageUrl: 'https://nh48.info/contact'
    };

    // Global caches for translation JSON and mountain description map.  These
    // persist across requests within the same instance of the Worker.
    env.__i18n = env.__i18n || {};
    env.__descMap = env.__descMap || null;
    env.__peaks = env.__peaks || null;

    // Fetch translation dictionary if needed
    async function loadTranslation(code) {
      if (!env.__i18n[code]) {
        const url = code === 'fr' ? FR_TRANS_URL : EN_TRANS_URL;
        try {
          const res = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true }, headers: { 'User-Agent': 'NH48-SSR' } });
          if (res.ok) {
            env.__i18n[code] = await res.json();
          }
        } catch (_) {}
      }
      return env.__i18n[code] || {};
    }

    // Load mountain descriptions from R2 or cache
    async function loadDescriptions() {
      if (env.__descMap) return env.__descMap;
      const map = Object.create(null);
      try {
        if (env.NH48_DATA) {
          const obj = await env.NH48_DATA.get('mountain-descriptions.txt');
          if (obj) {
            const text = await obj.text();
            text.split(/\r?\n/).forEach((line) => {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith('#')) return;
              const idx = trimmed.indexOf(':');
              if (idx > 0) {
                const key = trimmed.slice(0, idx).trim();
                const value = trimmed.slice(idx + 1).trim();
                if (key) map[key] = value;
              }
            });
          }
        }
      } catch (_) {}
      env.__descMap = map;
      return map;
    }

    // Load nh48.json from R2 or origin and cache it
    async function loadPeaks() {
      if (env.__peaks) return env.__peaks;
      let peaks;
      try {
        if (env.NH48_DATA) {
          const obj = await env.NH48_DATA.get('nh48.json');
          if (obj) {
            peaks = JSON.parse(await obj.text());
          }
        }
      } catch (_) {}
      if (!peaks) {
        const res = await fetch(`${SITE}/data/nh48.json`, { cf: { cacheTtl: 86400, cacheEverything: true }, headers: { 'User-Agent': 'NH48-SSR' } });
        peaks = await res.json();
      }
      env.__peaks = peaks;
      return peaks;
    }

    // Escape HTML characters
    function esc(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Normalize strings for web output. Fixes common mojibake (â€” → —, etc.)
    // and replaces em/en dashes with a simple hyphen for XML.
    function normalizeTextForWeb(input) {
      if (!input) return '';
      let s = String(input);
      // Fix UTF-8 / Windows-1252 mixups
      s = s
        .replace(/â€”/g, '—')
        .replace(/â€“/g, '–')
        .replace(/â€˜|â€™/g, "'")
        .replace(/â€œ|â€�/g, '"')
        .replace(/Â/g, '');
      // Normalize dashes
      s = s.replace(/[—–]/g, ' - ');
      // Collapse whitespace
      return s.replace(/\s+/g, ' ').trim();
    }

    function pickFirstNonEmpty(...vals) {
      for (const v of vals) {
        if (!v) continue;
        const s = normalizeTextForWeb(v);
        if (s) return s;
      }
      return '';
    }

    function formatCameraBits(photo) {
      const bits = [];
      const cam = pickFirstNonEmpty(photo.cameraModel, photo.camera);
      const lens = pickFirstNonEmpty(photo.lens);
      const focal = pickFirstNonEmpty(photo.focalLength);
      const iso = pickFirstNonEmpty(photo.iso);
      const fstop = pickFirstNonEmpty(photo.fStop);
      const ss = pickFirstNonEmpty(photo.shutterSpeed);
      if (cam) bits.push(cam);
      if (lens) bits.push(lens);
      if (focal) bits.push(focal);
      if (fstop) bits.push(`f/${String(fstop).replace(/^f\//, '')}`);
      if (ss) bits.push(ss);
      if (iso) bits.push(`ISO ${iso}`);
      return bits.length ? bits.join(' • ') : '';
    }

    function formatDescriptorBits(photo) {
      const bits = [];
      const season = pickFirstNonEmpty(photo.season);
      const tod = pickFirstNonEmpty(photo.timeOfDay);
      const orient = pickFirstNonEmpty(photo.orientation);
      if (season) bits.push(season);
      if (tod) bits.push(tod);
      if (orient) bits.push(orient);
      const tags = Array.isArray(photo.tags) ? photo.tags.map(normalizeTextForWeb).filter(Boolean) : [];
      for (const t of tags.slice(0, 3)) bits.push(t);
      return bits.length ? bits.join(', ') : '';
    }

    function buildPhotoTitleUnique(peakName, photo) {
      const explicit = pickFirstNonEmpty(photo.headline, photo.title, photo.altText, photo.caption);
      if (explicit) return explicit;
      const descBits = formatDescriptorBits(photo);
      const cameraBits = formatCameraBits(photo);
      let title = `${peakName} - White Mountain National Forest (New Hampshire)`;
      if (descBits) title = `${peakName} - ${descBits} - White Mountain National Forest (New Hampshire)`;
      if (cameraBits) title = `${title} - ${cameraBits}`;
      return title;
    }

    function buildPhotoCaptionUnique(peakName, photo) {
      const explicit = pickFirstNonEmpty(photo.description, photo.extendedDescription, photo.caption, photo.altText);
      if (explicit) return explicit;
      const descBits = formatDescriptorBits(photo);
      const cameraBits = formatCameraBits(photo);
      let caption = `Landscape photograph of ${peakName} in the White Mountain National Forest, New Hampshire.`;
      if (descBits) caption = `${caption} Details: ${descBits}.`;
      if (cameraBits) caption = `${caption} Camera: ${cameraBits}.`;
      return caption;
    }

    // Format numbers as feet
    function formatFeet(value) {
      if (value === null || value === undefined || value === '') return '';
      const num = Number(String(value).replace(/[^0-9.-]/g, ''));
      if (Number.isNaN(num)) return String(value);
      return `${num.toLocaleString('en-US')} ft`;
    }

    // Parse coordinates
    function parseCoords(val) {
      if (!val) return { text: '', lat: null, lon: null };
      const m = String(val).match(/-?\d+(?:\.\d+)?/g);
      if (!m || m.length < 2) return { text: String(val), lat: null, lon: null };
      return { text: `${m[0]}, ${m[1]}`, lat: Number(m[0]), lon: Number(m[1]) };
    }

    // Build meta title and description using translations and values
    function buildMeta(trans, peakName, elevation, range, description) {
      const titleTpl = trans['peak.meta.titleTemplate'] || '{peakName} | NH48';
      const descTpl = trans['peak.meta.descriptionTemplate'] || '{peakName} – {description}';
      const title = titleTpl.replace('{peakName}', peakName).replace('{elevation}', elevation).replace('{range}', range);
      const descriptionText = descTpl.replace('{peakName}', peakName).replace('{description}', description).replace('{elevation}', elevation).replace('{range}', range);
      return { title: esc(title), description: esc(descriptionText) };
    }

    function flattenMetaToPropertyValues(prefix, obj, out) {
      if (!obj || typeof obj !== 'object') return;
      for (const [key, val] of Object.entries(obj)) {
        if (val === undefined || val === null) continue;
        if (['url', 'photoId', 'filename', 'isPrimary'].includes(key)) continue;
        const name = prefix ? `${prefix}.${key}` : key;
        if (Array.isArray(val)) {
          const text = val.map((item) => String(item).trim()).filter(Boolean).join(', ');
          if (text) out.push({ '@type': 'PropertyValue', name, value: text });
        } else if (typeof val === 'object') {
          flattenMetaToPropertyValues(name, val, out);
        } else {
          const text = String(val).trim();
          if (text) out.push({ '@type': 'PropertyValue', name, value: text });
        }
      }
    }

    function buildExifData(photoMeta) {
      const out = [];
      flattenMetaToPropertyValues('', photoMeta || {}, out);
      return out;
    }

    function buildCatalogDataset({ canonicalUrl, title, description, imageObjects }) {
      return {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: title,
        description,
        identifier: 'nh48.json',
        url: canonicalUrl,
        sameAs: [
          'https://github.com/natesobol/nh48-api',
          'https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48.json'
        ],
        isAccessibleForFree: true,
        license: 'https://creativecommons.org/licenses/by/4.0/',
        creator: {
          '@type': 'Person',
          name: RIGHTS_DEFAULTS.creatorName,
          url: 'https://www.nh48pics.com/'
        },
        keywords: [
          'NH48',
          'White Mountains',
          '4000 footers',
          'hiking data',
          'peak metadata',
          'photo metadata',
          'open dataset',
          'New Hampshire 4,000-footers API'
        ],
        spatialCoverage: {
          '@type': 'Place',
          name: 'White Mountain National Forest',
          geo: { '@type': 'GeoShape', circle: '44.15 -71.34 50km' }
        },
        temporalCoverage: '2020-01-01/2025-12-31',
        distribution: [
          {
            '@type': 'DataDownload',
            name: 'NH48 API (cdn.jsdelivr)',
            encodingFormat: 'application/json',
            contentUrl: 'https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48.json'
          },
          {
            '@type': 'DataDownload',
            name: 'NH48 API (raw GitHub)',
            encodingFormat: 'application/json',
            contentUrl: 'https://raw.githubusercontent.com/natesobol/nh48-api/main/data/nh48.json'
          },
          {
            '@type': 'DataDownload',
            name: 'NH48 API (site mirror)',
            encodingFormat: 'application/json',
            contentUrl: 'https://nh48.info/data/nh48.json'
          }
        ],
        includedInDataCatalog: {
          '@type': 'DataCatalog',
          name: 'NH48 Open Hiking APIs',
          url: canonicalUrl,
          description: 'Public datasets for the New Hampshire 4000-footers including photo metadata, peak attributes, and API utilities for map clients.',
          license: 'https://creativecommons.org/licenses/by/4.0/'
        },
        image: imageObjects.length ? imageObjects : DEFAULT_IMAGE
      };
    }

    // Build JSON-LD for Mountain and Breadcrumb
    function buildJsonLd(
      peakName,
      elevation,
      prominence,
      rangeVal,
      coords,
      canonicalUrl,
      imageUrl,
      summaryText,
      photos = []
    ) {
      const imageObjects = (Array.isArray(photos) ? photos : [])
        .slice(0, 10)
        .map((photo) => {
          if (!photo || !photo.url) return null;
          const exifData = buildExifData(photo);
          return {
            '@type': 'ImageObject',
            contentUrl: photo.url,
            url: photo.url,
            name: buildPhotoTitleUnique(peakName, photo),
            caption: buildPhotoCaptionUnique(peakName, photo),
            creator: { '@type': 'Person', name: RIGHTS_DEFAULTS.creatorName },
            creditText: RIGHTS_DEFAULTS.creditText,
            copyrightNotice: RIGHTS_DEFAULTS.copyrightNotice,
            license: RIGHTS_DEFAULTS.licenseUrl,
            acquireLicensePage: RIGHTS_DEFAULTS.acquireLicensePageUrl,
            exifData
          };
        })
        .filter(Boolean);
      const mountain = {
        '@context': 'https://schema.org',
        '@type': 'Mountain',
        name: peakName,
        description: summaryText,
        image: imageObjects.length ? imageObjects : imageUrl,
        url: canonicalUrl,
        additionalProperty: []
      };
      if (elevation) {
        mountain.additionalProperty.push({ '@type': 'PropertyValue', name: 'Elevation (ft)', value: elevation.replace(/ ft$/, '') });
      }
      if (prominence) {
        mountain.additionalProperty.push({ '@type': 'PropertyValue', name: 'Prominence (ft)', value: prominence.replace(/ ft$/, '') });
      }
      if (rangeVal) {
        mountain.additionalProperty.push({ '@type': 'PropertyValue', name: 'Range', value: rangeVal });
      }
      if (coords.lat && coords.lon) {
        mountain.geo = { '@type': 'GeoCoordinates', latitude: coords.lat, longitude: coords.lon };
      }
      const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isFrench ? 'Accueil' : 'Home', item: isFrench ? `${SITE}/fr/` : `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: isFrench ? 'Catalogue des sommets' : 'Peak Catalog', item: isFrench ? `${SITE}/fr/catalog` : `${SITE}/catalog` },
          { '@type': 'ListItem', position: 3, name: peakName, item: canonicalUrl }
        ]
      };
      return { mountain, breadcrumb };
    }

    async function serveCatalog() {
      const canonicalUrl = isFrench ? `${SITE}/fr/catalog` : `${SITE}/catalog`;
      const title = isFrench
        ? 'Catalogue NH48 - Données et photos des sommets du New Hampshire'
        : 'NH48 Peak Catalog - Data & photos for New Hampshire’s 4000-footers';
      const description = isFrench
        ? 'Parcourez le catalogue NH48 avec altitude, proéminence, chaîne, difficulté et vignettes photo pour les 48 sommets de 4 000 pieds du New Hampshire.'
        : 'Browse the NH48 Peak Catalog with elevation, prominence, range, difficulty and photo thumbnails for all 48 four-thousand-foot peaks in New Hampshire.';
      const altText = isFrench
        ? 'Aperçu du catalogue NH48 avec photos et données des sommets.'
        : 'Preview of the NH48 Peak Catalog with peak photos and data.';

      const peaks = await loadPeaks();
      const peakList = Array.isArray(peaks) ? peaks : Object.values(peaks || {});
      const photos = [];
      for (const peak of peakList) {
        if (!peak) continue;
        const peakName = peak.peakName || peak.name || peak['Peak Name'] || '';
        const peakPhotos = Array.isArray(peak.photos) ? peak.photos : [];
        for (const photo of peakPhotos) {
          const data = typeof photo === 'string' ? { url: photo } : photo;
          if (!data || !data.url) continue;
          photos.push({ peakName, data });
        }
      }

      const imageObjects = photos.slice(0, 1000).map(({ peakName, data }) => {
        const photoMeta = { ...data };
        const exifData = buildExifData(photoMeta);
        return {
          '@type': 'ImageObject',
          contentUrl: photoMeta.url,
          url: photoMeta.url,
          name: buildPhotoTitleUnique(peakName, photoMeta),
          caption: buildPhotoCaptionUnique(peakName, photoMeta),
          creator: { '@type': 'Person', name: RIGHTS_DEFAULTS.creatorName },
          creditText: RIGHTS_DEFAULTS.creditText,
          copyrightNotice: RIGHTS_DEFAULTS.copyrightNotice,
          license: RIGHTS_DEFAULTS.licenseUrl,
          acquireLicensePage: RIGHTS_DEFAULTS.acquireLicensePageUrl,
          exifData
        };
      });

      const datasetSchema = buildCatalogDataset({
        canonicalUrl,
        title,
        description,
        imageObjects
      });

      const tplResp = await fetch(RAW_CATALOG_URL, { cf: { cacheTtl: 86400, cacheEverything: true }, headers: { 'User-Agent': 'NH48-SSR' } });
      if (!tplResp.ok) {
        return new Response('Template unavailable', { status: 500 });
      }
      let html = await tplResp.text();
      html = html
        .replace(/<title[^>]*>.*?<\/title>/i, '')
        .replace(/<meta[^>]*name="description"[^>]*>/i, '')
        .replace(/<meta[^>]*property="og:[^"]*"[^>]*>/gi, '')
        .replace(/<meta[^>]*name="twitter:[^"]*"[^>]*>/gi, '')
        .replace(/<meta[^>]*property="twitter:[^"]*"[^>]*>/gi, '')
        .replace(/<link[^>]*rel="canonical"[^>]*>/i, '')
        .replace(/<link[^>]*rel="alternate"[^>]*>/gi, '')
        .replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '');

      const metaBlock = [
        `<title>${esc(title)}</title>`,
        `<meta name="description" content="${esc(description)}" />`,
        `<meta name="author" content="Nathan Sobol" />`,
        `<meta property="og:site_name" content="nh48.info" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        `<meta property="og:description" content="${esc(description)}" />`,
        `<meta property="og:image" content="${DEFAULT_IMAGE}" />`,
        `<meta property="og:image:alt" content="${esc(altText)}" />`,
        `<meta property="og:url" content="${canonicalUrl}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${esc(title)}" />`,
        `<meta name="twitter:description" content="${esc(description)}" />`,
        `<meta name="twitter:image" content="${DEFAULT_IMAGE}" />`,
        `<link rel="canonical" href="${canonicalUrl}" />`,
        `<link rel="alternate" hreflang="en" href="${SITE}/catalog" />`,
        `<link rel="alternate" hreflang="fr" href="${SITE}/fr/catalog" />`,
        `<link rel="alternate" hreflang="x-default" href="${SITE}/catalog" />`,
        `<script type="application/ld+json">${JSON.stringify(datasetSchema).replace(/</g, '<\/')}</script>`
      ].join('\n');
      html = html.replace(/<\/head>/i, `${metaBlock}\n</head>`);

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=0, s-maxage=86400',
          'X-Robots-Tag': 'index, follow'
        }
      });
    }

    const isCatalogRoute = (!isFrench && parts[0] === 'catalog' && parts.length === 1)
      || (isFrench && parts[1] === 'catalog' && parts.length === 2);
    if (isCatalogRoute) {
      return serveCatalog();
    }

    // Only handle peak routes.  If the URL does not match, return 404.
    const ok = (!isFrench && parts[0] === 'peak') || (isFrench && parts[1] === 'peak');
    if (!ok || !slug) {
      return new Response('Not found', { status: 404 });
    }

    // Find the peak by slug in the loaded dataset
    function findPeak(peaks, slugValue) {
      let peak = null;
      if (Array.isArray(peaks)) {
        peak = peaks.find((p) => p.slug === slugValue || p.slug_en === slugValue || p.Slug === slugValue);
      } else if (peaks && typeof peaks === 'object') {
        peak = peaks[slugValue] || Object.values(peaks).find((p) => p.slug === slugValue || p.slug_en === slugValue || p.Slug === slugValue);
      }
      return peak;
    }

    // Load necessary data
    const [peaks, descMap, trans] = await Promise.all([
      loadPeaks(),
      loadDescriptions(),
      loadTranslation(lang)
    ]);

    const peak = findPeak(peaks, slug);
    if (!peak) {
      // If the slug doesn’t exist, return a simple 404 page instead of redirecting.  We
      // avoid client redirects so that crawlers get a proper 404.
      return new Response('<!doctype html><title>404 Not Found</title><h1>Peak not found</h1>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // Extract attributes for meta and structured data
    const peakName = peak.peakName || peak.name || peak['Peak Name'] || slug;
    const elevation = formatFeet(peak['Elevation (ft)'] || peak.elevation_ft || '');
    const prominence = formatFeet(peak['Prominence (ft)'] || peak.prominence_ft || '');
    const rangeVal = peak['Range / Subrange'] || peak.range || '';
    const coords = parseCoords(peak.lat || peak.latitude || peak['Coordinates'] || '');
    let photos = [];
    if (Array.isArray(peak.photos)) {
      photos = peak.photos
        .map((photo) => (typeof photo === 'string' ? { url: photo } : photo))
        .filter((photo) => photo && photo.url);
    }
    const primaryPhoto = photos.length ? photos[0] : null;
    const heroUrl = primaryPhoto ? primaryPhoto.url : DEFAULT_IMAGE;
    const summaryFromFile = descMap[slug] || '';
    const summaryVal = summaryFromFile || (peak.summary || peak.description || '').toString().trim();

    // Build canonical and alternate URLs
    const canonical = isFrench ? `${SITE}/fr/peak/${encodeURIComponent(slug)}` : `${SITE}/peak/${encodeURIComponent(slug)}`;
    const canonicalEn = `${SITE}/peak/${encodeURIComponent(slug)}`;
    const canonicalFr = `${SITE}/fr/peak/${encodeURIComponent(slug)}`;
    const canonicalX = canonicalEn;

    // Build meta tags
    const { title, description } = buildMeta(trans, peakName, elevation, rangeVal, summaryVal);
    const primaryCaption = primaryPhoto
      ? buildPhotoCaptionUnique(peakName, primaryPhoto)
      : peakName;
    const { mountain, breadcrumb } = buildJsonLd(
      peakName,
      elevation,
      prominence,
      rangeVal,
      coords,
      canonical,
      heroUrl,
      summaryVal,
      photos
    );

    // Fetch the raw interactive HTML template from GitHub
    const tplResp = await fetch(RAW_TEMPLATE_URL, { cf: { cacheTtl: 86400, cacheEverything: true }, headers: { 'User-Agent': 'NH48-SSR' } });
    if (!tplResp.ok) {
      return new Response('Template unavailable', { status: 500 });
    }
    let html = await tplResp.text();

    // Remove the client-side redirect logic.  The redirect in the
    // original template checks for missing slug and redirects to
    // /not-found.html if not found.  We remove any script that calls
    // window.location.replace('/not-found.html') or similar.  This is a
    // simple regex that removes the entire script block containing
    // redirectToApp or window.location.replace.
    html = html.replace(/<script[^>]*>[\s\S]*?window\.location\.replace\([^)]*\)[\s\S]*?<\/script>/gi, '');

    // Remove existing placeholders and duplicate head tags.
    html = html
      .replace(/<title[^>]*>.*?<\/title>/i, '')
      .replace(/<meta[^>]*name="description"[^>]*>/i, '')
      .replace(/<meta[^>]*property="og:title"[^>]*>/i, '')
      .replace(/<meta[^>]*property="og:description"[^>]*>/i, '')
      .replace(/<meta[^>]*property="og:image"[^>]*>/i, '')
      .replace(/<meta[^>]*property="og:image:alt"[^>]*>/i, '')
      .replace(/<meta[^>]*property="og:url"[^>]*>/i, '')
      .replace(/<meta[^>]*property="og:site_name"[^>]*>/i, '')
      .replace(/<link[^>]*rel="canonical"[^>]*>/i, '')
      .replace(/<link[^>]*rel="alternate"[^>]*hreflang="en"[^>]*>/gi, '')
      .replace(/<link[^>]*rel="alternate"[^>]*hreflang="fr"[^>]*>/gi, '')
      .replace(/<link[^>]*rel="alternate"[^>]*hreflang="x-default"[^>]*>/gi, '')
      .replace(/<script[^>]*id="peakJsonLd"[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script[^>]*id="breadcrumbJsonLd"[^>]*>[\s\S]*?<\/script>/gi, '');

    // Insert our meta tags, canonical links and structured data just
    // before the closing head tag.
    const metaBlock = [
      `<title>${title}</title>`,
      `<meta name="description" content="${description}" />`,
      `<meta name="author" content="Nathan Sobol" />`,
      `<meta property="og:site_name" content="nh48.info" />`,
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:image" content="${heroUrl}" />`,
      `<meta property="og:image:alt" content="${esc(primaryCaption)}" />`,
      `<meta property="og:url" content="${canonical}" />`,
      `<link rel="canonical" href="${canonical}" />`,
      `<link rel="alternate" hreflang="en" href="${canonicalEn}" />`,
      `<link rel="alternate" hreflang="fr" href="${canonicalFr}" />`,
      `<link rel="alternate" hreflang="x-default" href="${canonicalX}" />`,
      `<script type="application/ld+json">${JSON.stringify(mountain).replace(/</g, '<\/')}</script>`,
      `<script type="application/ld+json">${JSON.stringify(breadcrumb).replace(/</g, '<\/')}</script>`
    ].join('\n');
    html = html.replace(/<\/head>/i, `${metaBlock}\n</head>`);

    // Return the modified interactive page with caching.  Set
    // appropriate headers for SEO.  Browser cache is short to
    // encourage fresh translation, edge cache is longer.
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=86400',
        'X-Robots-Tag': 'index, follow'
      }
    });
  }
};
