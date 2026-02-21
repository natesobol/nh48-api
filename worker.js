// Cloudflare Worker for NH48 Peak Guide - Full Template Version
// Version: 1.2.0 - Auto-deployed via GitHub Actions
//
// This Worker serves the full interactive peak detail page stored in the
// GitHub repository (pages/nh48_peak.html) at clean URLs like
// `/peak/{slug}` and `/fr/peak/{slug}`.  It removes the client-side
// redirect logic from the template, injects a script that rewrites
// `window.location.search` so that the existing client-side code can
// read the slug from the query string, and inserts server-rendered
// meta tags and structured data for SEO.  The Worker fetches the
// mountain data from canonical GitHub raw data while sourcing mountain
// descriptions from the canonical GitHub file, and
// loads translation dictionaries from GitHub to build localized
// titles and descriptions.  By doing this work on the server, the
// page becomes indexable while still delivering the full SPA
// experience once the JS hydrates on the client.

let globalSchemaCache = null;
let creativeWorksCache = null;
let collectionsCache = null;
let entityLinksCache = null;
let breadcrumbTaxonomyCache = null;
let rangeLookupCache = null;
let peakExperiencesCache = null;
let parkingLookupCache = null;
let monthlyWeatherCache = null;
let peakDifficultyCache = null;
let riskOverlayCache = null;
let currentConditionsCache = null;
let nwsWeatherCache = new Map();
let wikiMountainSetsCache = null;
let wikiMountainDataCache = new Map();
let wikiPlantsCache = null;
let wikiAnimalsCache = null;
let wikiPlantDiseasesCache = null;
let wikiForestHealthFlowchartBase64Cache = null;
let ogCardsManifestCache = null;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const parts = url.pathname.split('/').filter(Boolean);
    const isFrench = parts[0] === 'fr';

    // Constants - defined early for static file serving
    const SITE = url.origin;
    const RAW_BASE = 'https://raw.githubusercontent.com/natesobol/nh48-api/main';
    const HOWKER_ORIGIN = 'https://nh48.info';
    const RAW_TEMPLATE_URL = `${RAW_BASE}/pages/nh48_peak.html`;
    const RAW_CATALOG_URL = `${RAW_BASE}/catalog/index.html`;
    const RAW_HOMEPAGE_TEMPLATE_URL = `${RAW_BASE}/pages/index.html`;
    const RAW_SPLASH_MANIFEST_URL = `${RAW_BASE}/photos/backgrounds/manifest.json`;
    const RAW_SPLASH_ALT_TEXT_URL = `${RAW_BASE}/photos/backgrounds/alt-text.json`;
    const RAW_LONG_TRAILS_INDEX_URL = `${RAW_BASE}/data/long-trails-index.json`;
    const RAW_LONG_TRAILS_FULL_URL = `${RAW_BASE}/data/long-trails-full.json`;
    const RAW_NAV_URL = `${RAW_BASE}/pages/nav.html`;
    const RAW_FOOTER_URL = `${RAW_BASE}/pages/footer.html`;
    const RAW_BUILD_META_URL = `${RAW_BASE}/build-meta.json`;
    const RAW_MOUNTAIN_DESCRIPTIONS_URL = `${RAW_BASE}/data/nh48/mountain-descriptions.txt`;
    const RAW_SAME_AS_URL = `${RAW_BASE}/data/peak-sameas.json`;
    const RAW_LEGACY_SAME_AS_URL = `${RAW_BASE}/data/sameAs.json`;
    const RAW_ORGANIZATION_URL = `${RAW_BASE}/data/organization.json`;
    const RAW_PERSON_URL = `${RAW_BASE}/data/person.json`;
    const RAW_WEBSITE_URL = `${RAW_BASE}/data/website.json`;
    const RAW_CREATIVEWORKS_URL = `${RAW_BASE}/data/creativeWorks.json`;
    const RAW_COLLECTIONS_URL = `${RAW_BASE}/data/collections.json`;
    const RAW_ENTITY_LINKS_URL = `${RAW_BASE}/data/entity-links.json`;
    const RAW_BREADCRUMB_TAXONOMY_URL = `${RAW_BASE}/data/breadcrumb-taxonomy.json`;
    const RAW_WMNF_RANGES_URL = `${RAW_BASE}/data/wmnf-ranges.json`;
    const RAW_PEAK_EXPERIENCES_EN_URL = `${RAW_BASE}/data/peak-experiences.en.json`;
    const RAW_PARKING_DATA_URL = `${RAW_BASE}/data/parking-data.json`;
    const RAW_MONTHLY_WEATHER_URL = `${RAW_BASE}/data/monthly-weather.json`;
    const RAW_PEAK_DIFFICULTY_URL = `${RAW_BASE}/data/peak-difficulty.json`;
    const RAW_RISK_OVERLAY_URL = `${RAW_BASE}/data/nh48_enriched_overlay.json`;
    const RAW_CURRENT_CONDITIONS_URL = `${RAW_BASE}/data/current-conditions.json`;
    const RAW_OG_CARDS_URL = `${RAW_BASE}/data/og-cards.json`;
    const RAW_WIKI_MOUNTAIN_SETS_URL = `${RAW_BASE}/data/wiki/mountain-sets.json`;
    const RAW_WIKI_PLANTS_URL = `${RAW_BASE}/data/wiki/plants.json`;
    const RAW_WIKI_ANIMALS_URL = `${RAW_BASE}/data/wiki/animals.json`;
    const RAW_WIKI_PLANT_DISEASES_URL = `${RAW_BASE}/data/wiki/plant-disease.json`;
    const RAW_WIKI_FOREST_HEALTH_TEMPLATE_URL = `${RAW_BASE}/pages/wiki/diseases/index.html`;
    const RAW_WIKI_FOREST_HEALTH_FLOWCHART_BASE64_URL = `${RAW_BASE}/data/wiki/forest-health-flowchart.base64.txt`;
    const EN_TRANS_URL = `${RAW_BASE}/i18n/en.json`;
    const FR_TRANS_URL = `${RAW_BASE}/i18n/fr.json`;
    const SITE_NAME = url.hostname;
    const DEFAULT_IMAGE = `${SITE}/nh48-preview.png`;
    const DEFAULT_LOGO = `${SITE}/nh48API_logo.png`;
    const SITE_URL = `${SITE}/`;
    const howkerDataRoutes = {
      '/data/howker-ridge-status.geojson': {
        key: 'howker-ridge-status.geojson',
        contentType: 'application/geo+json; charset=utf-8'
      },
      '/data/howker-ridge-pois.geojson': {
        key: 'howker-ridge-pois.geojson',
        contentType: 'application/geo+json; charset=utf-8'
      },
      '/data/howker-ridge-edit.json': {
        key: 'howker-ridge-edit.json',
        contentType: 'application/json; charset=utf-8'
      }
    };
    const RIGHTS_DEFAULTS = {
      creatorName: 'Nathan Sobol',
      creditText: '(c) Nathan Sobol / NH48pics.com',
      copyrightNotice: '(c) Nathan Sobol',
      licenseUrl: 'https://nh48.info/license',
      acquireLicensePageUrl: 'https://nh48.info/contact'
    };
    const CATALOG_IMAGE_LICENSE_URL = 'https://creativecommons.org/licenses/by-nc-nd/4.0/';
    const HOME_SOCIAL_IMAGE = 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-washington/mount-washington__001.jpg';
    const INSTAGRAM_URL = 'https://www.instagram.com/nate_dumps_pics/';
    const NH48_APP_URL = 'https://www.nh48.app/';

    const buildMeta = await fetchBuildMeta(RAW_BUILD_META_URL);
    const buildDate = buildMeta?.buildDate || '';

    const weatherCorsHeaders = (maxAgeSeconds = 300) => ({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': `public, max-age=${maxAgeSeconds}`,
      'Content-Type': 'application/json; charset=utf-8'
    });

    const WMNF_STYLIZED_PREFIX = 'tiles/wmnf-stylized/v1';
    const WMNF_HILLSHADE_PREFIX = `${WMNF_STYLIZED_PREFIX}/hillshade`;
    const WMNF_CONTOURS_PREFIX = `${WMNF_STYLIZED_PREFIX}/contours`;
    const WMNF_METADATA_KEY = `${WMNF_STYLIZED_PREFIX}/metadata.json`;
    const LONG_TILE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
    const STYLE_METADATA_CACHE_CONTROL = 'public, max-age=300';

    const tileResponseHeaders = (contentType, cacheControl = LONG_TILE_CACHE_CONTROL) => ({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': cacheControl,
      'Content-Type': contentType
    });

    const tileResponseHeadersWithDebug = (contentType, cacheControl, debugValues = {}) => {
      const headers = tileResponseHeaders(contentType, cacheControl);
      Object.entries(debugValues).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        headers[key] = String(value);
      });
      return headers;
    };

    const tileJsonError = (status, payload, cacheControl = STYLE_METADATA_CACHE_CONTROL) => {
      const headers = tileResponseHeaders('application/json; charset=utf-8', cacheControl);
      if (request.method === 'HEAD') {
        return new Response(null, { status, headers });
      }
      return new Response(JSON.stringify(payload), { status, headers });
    };

    const weatherJsonResponse = (status, payload, maxAgeSeconds = 300) => {
      const headers = weatherCorsHeaders(maxAgeSeconds);
      if (request.method === 'HEAD') {
        return new Response(null, { status, headers });
      }
      return new Response(JSON.stringify(payload), { status, headers });
    };

    const parseCsv = (input) => String(input || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const parseCsvNumbers = (input) => parseCsv(input).map((value) => Number.parseFloat(value));

    const openMeteoVariables = [
      'temperature_2m',
      'apparent_temperature',
      'wind_speed_10m',
      'wind_gusts_10m',
      'relative_humidity_2m',
      'precipitation',
      'snow_depth',
      'snowfall'
    ];
    const weatherMaxPoints = 60;
    const cleanText = (value) => String(value || '').trim();

    const toGeometryBounds = (geometry) => {
      if (!geometry || typeof geometry !== 'object') return null;
      const coords = [];
      const collect = (node) => {
        if (!Array.isArray(node)) return;
        if (node.length >= 2 && Number.isFinite(Number(node[0])) && Number.isFinite(Number(node[1]))) {
          coords.push([Number(node[0]), Number(node[1])]);
          return;
        }
        node.forEach((child) => collect(child));
      };
      collect(geometry.coordinates);
      if (!coords.length) return null;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      coords.forEach(([x, y]) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });
      if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
        return null;
      }
      return { minX, minY, maxX, maxY };
    };

    const boundsIntersect = (a, b) => {
      if (!a || !b) return false;
      if (a.maxX < b.minX || a.minX > b.maxX) return false;
      if (a.maxY < b.minY || a.minY > b.maxY) return false;
      return true;
    };

    if (pathname.startsWith('/api/weather/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: weatherCorsHeaders(60) });
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response('Method Not Allowed', { status: 405, headers: weatherCorsHeaders(60) });
      }
    }

      if (pathname === '/api/tiles/wmnf-style-metadata.json') {
        if (request.method === 'OPTIONS') {
          return new Response(null, {
            status: 204,
            headers: tileResponseHeadersWithDebug('application/json; charset=utf-8', STYLE_METADATA_CACHE_CONTROL, {
              'X-WMNF-Route': 'metadata',
              'X-WMNF-Metadata-Key': WMNF_METADATA_KEY
            })
          });
        }
      if (!['GET', 'HEAD'].includes(request.method)) {
        return tileJsonError(405, { error: 'Method not allowed.' }, STYLE_METADATA_CACHE_CONTROL);
      }
      const fallbackMetadata = {
        version: 'wmnf_v1',
        available: false,
        hillshadeTemplate: '/api/tiles/wmnf-hillshade/{z}/{x}/{y}.png',
        contourTemplate: '/api/tiles/wmnf-contours/{z}/{x}/{y}.pbf'
      };
        if (!env.WMNF_TILE_DATA) {
          const payload = {
            ...fallbackMetadata,
            error: 'Stylized tile bucket binding unavailable.'
          };
          return new Response(request.method === 'HEAD' ? null : JSON.stringify(payload), {
            status: 200,
            headers: tileResponseHeadersWithDebug('application/json; charset=utf-8', STYLE_METADATA_CACHE_CONTROL, {
              'X-WMNF-Route': 'metadata',
              'X-WMNF-Source': 'binding-missing',
              'X-WMNF-Metadata-Key': WMNF_METADATA_KEY
            })
          });
        }
      const metadataObject = await env.WMNF_TILE_DATA.get(WMNF_METADATA_KEY);
        if (!metadataObject) {
          const payload = {
            ...fallbackMetadata,
            error: 'Stylized style metadata not found.',
            key: WMNF_METADATA_KEY
          };
          return new Response(request.method === 'HEAD' ? null : JSON.stringify(payload), {
            status: 200,
            headers: tileResponseHeadersWithDebug('application/json; charset=utf-8', STYLE_METADATA_CACHE_CONTROL, {
              'X-WMNF-Route': 'metadata',
              'X-WMNF-Source': 'r2-miss',
              'X-WMNF-Metadata-Key': WMNF_METADATA_KEY
            })
          });
        }
      return new Response(request.method === 'HEAD' ? null : metadataObject.body, {
        status: 200,
        headers: tileResponseHeadersWithDebug('application/json; charset=utf-8', STYLE_METADATA_CACHE_CONTROL, {
          'X-WMNF-Route': 'metadata',
          'X-WMNF-Source': 'r2-hit',
          'X-WMNF-Metadata-Key': WMNF_METADATA_KEY
        })
      });
    }

      if (pathname.startsWith('/api/tiles/wmnf-hillshade/')) {
        const match = pathname.match(/^\/api\/tiles\/wmnf-hillshade\/(\d+)\/(\d+)\/(\d+)\.png$/);
        if (!match) {
          return new Response('Invalid WMNF hillshade tile path.', {
            status: 400,
            headers: tileResponseHeadersWithDebug('text/plain; charset=utf-8', STYLE_METADATA_CACHE_CONTROL, {
              'X-WMNF-Route': 'hillshade',
              'X-WMNF-Error': 'invalid-path'
            })
          });
        }
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: tileResponseHeadersWithDebug('image/png', LONG_TILE_CACHE_CONTROL, {
            'X-WMNF-Route': 'hillshade'
          })
        });
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response('Method Not Allowed', {
          status: 405,
          headers: tileResponseHeadersWithDebug('text/plain; charset=utf-8', STYLE_METADATA_CACHE_CONTROL, {
            'X-WMNF-Route': 'hillshade',
            'X-WMNF-Error': 'method-not-allowed'
          })
        });
      }
      if (!env.WMNF_TILE_DATA) {
        return new Response('Stylized tile bucket binding unavailable.', {
          status: 503,
          headers: tileResponseHeadersWithDebug('text/plain; charset=utf-8', STYLE_METADATA_CACHE_CONTROL, {
            'X-WMNF-Route': 'hillshade',
            'X-WMNF-Source': 'binding-missing'
          })
        });
      }
      const [, z, x, y] = match;
      const key = `${WMNF_HILLSHADE_PREFIX}/${z}/${x}/${y}.png`;
      const tileObject = await env.WMNF_TILE_DATA.get(key);
      if (!tileObject) {
        return new Response('WMNF hillshade tile not found.', {
          status: 404,
          headers: tileResponseHeadersWithDebug('text/plain; charset=utf-8', STYLE_METADATA_CACHE_CONTROL, {
            'X-WMNF-Route': 'hillshade',
            'X-WMNF-Source': 'r2-miss',
            'X-WMNF-Tile-Key': key
          })
        });
      }
      return new Response(request.method === 'HEAD' ? null : tileObject.body, {
        status: 200,
        headers: tileResponseHeadersWithDebug('image/png', LONG_TILE_CACHE_CONTROL, {
          'X-WMNF-Route': 'hillshade',
          'X-WMNF-Source': 'r2-hit',
          'X-WMNF-Tile-Key': key
        })
      });
    }

    if (pathname.startsWith('/api/tiles/wmnf-contours/')) {
      const match = pathname.match(/^\/api\/tiles\/wmnf-contours\/(\d+)\/(\d+)\/(\d+)\.pbf$/);
      if (!match) {
        return new Response('Invalid WMNF contour tile path.', {
          status: 400,
          headers: tileResponseHeadersWithDebug('text/plain; charset=utf-8', STYLE_METADATA_CACHE_CONTROL, {
            'X-WMNF-Route': 'contours',
            'X-WMNF-Error': 'invalid-path'
          })
        });
      }
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: tileResponseHeadersWithDebug('application/x-protobuf', LONG_TILE_CACHE_CONTROL, {
            'X-WMNF-Route': 'contours'
          })
        });
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response('Method Not Allowed', {
          status: 405,
          headers: tileResponseHeadersWithDebug('text/plain; charset=utf-8', STYLE_METADATA_CACHE_CONTROL, {
            'X-WMNF-Route': 'contours',
            'X-WMNF-Error': 'method-not-allowed'
          })
        });
      }
      if (!env.WMNF_TILE_DATA) {
        return new Response('Stylized tile bucket binding unavailable.', {
          status: 503,
          headers: tileResponseHeadersWithDebug('text/plain; charset=utf-8', STYLE_METADATA_CACHE_CONTROL, {
            'X-WMNF-Route': 'contours',
            'X-WMNF-Source': 'binding-missing'
          })
        });
      }
      const [, z, x, y] = match;
      const key = `${WMNF_CONTOURS_PREFIX}/${z}/${x}/${y}.pbf`;
      const tileObject = await env.WMNF_TILE_DATA.get(key);
      if (!tileObject) {
        return new Response('WMNF contour tile not found.', {
          status: 404,
          headers: tileResponseHeadersWithDebug('text/plain; charset=utf-8', STYLE_METADATA_CACHE_CONTROL, {
            'X-WMNF-Route': 'contours',
            'X-WMNF-Source': 'r2-miss',
            'X-WMNF-Tile-Key': key
          })
        });
      }
      return new Response(request.method === 'HEAD' ? null : tileObject.body, {
        status: 200,
        headers: tileResponseHeadersWithDebug('application/x-protobuf', LONG_TILE_CACHE_CONTROL, {
          'X-WMNF-Route': 'contours',
          'X-WMNF-Source': 'r2-hit',
          'X-WMNF-Tile-Key': key
        })
      });
    }

    if (pathname.startsWith('/api/tiles/opentopo/')) {
      const match = pathname.match(/^\/api\/tiles\/opentopo\/(\d+)\/(\d+)\/(\d+)\.(png|jpg)$/);
      if (!match) {
        return new Response('Invalid tile path.', { status: 400 });
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response('Method Not Allowed', { status: 405 });
      }
      const [, z, x, y, ext] = match;
      const subdomains = ['a', 'b', 'c'];
      const sub = subdomains[Math.floor(Math.random() * subdomains.length)];
      const tileUrl = `https://${sub}.tile.opentopomap.org/${z}/${x}/${y}.png`;
      const upstream = await fetch(tileUrl, {
        cf: { cacheTtl: 86400, cacheEverything: true }
      });
      if (!upstream.ok) {
        return new Response('Tile not found.', { status: upstream.status });
      }
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          'Content-Type': `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Open-Meteo proxy: normalized scalar weather values, 5-minute CDN/browser cache.
    if (pathname === '/api/weather/open-meteo' || pathname === '/api/weather/open-meteo/') {
      const slugs = parseCsv(url.searchParams.get('slugs'));
      const latitudes = parseCsvNumbers(url.searchParams.get('lat'));
      const longitudes = parseCsvNumbers(url.searchParams.get('lon'));
      const hourOffsetRaw = Number.parseInt(url.searchParams.get('hour_offset') || '0', 10);
      const hourOffset = Number.isFinite(hourOffsetRaw)
        ? Math.max(0, Math.min(48, hourOffsetRaw))
        : 0;

      if (!slugs.length || !latitudes.length || !longitudes.length) {
        return weatherJsonResponse(400, { error: 'slugs, lat, and lon are required CSV query parameters.' }, 60);
      }
      if (slugs.length !== latitudes.length || slugs.length !== longitudes.length) {
        return weatherJsonResponse(400, { error: 'slugs, lat, and lon must have equal lengths.' }, 60);
      }
      if (slugs.length > weatherMaxPoints) {
        return weatherJsonResponse(400, { error: `Maximum ${weatherMaxPoints} points are allowed.` }, 60);
      }
      if (latitudes.some((value) => !Number.isFinite(value) || value < -90 || value > 90)) {
        return weatherJsonResponse(400, { error: 'All latitude values must be valid.' }, 60);
      }
      if (longitudes.some((value) => !Number.isFinite(value) || value < -180 || value > 180)) {
        return weatherJsonResponse(400, { error: 'All longitude values must be valid.' }, 60);
      }

      const params = new URLSearchParams({
        latitude: latitudes.join(','),
        longitude: longitudes.join(','),
        current: openMeteoVariables.join(','),
        hourly: openMeteoVariables.join(','),
        timezone: 'UTC',
        forecast_days: '3',
        temperature_unit: 'celsius',
        wind_speed_unit: 'kmh',
        precipitation_unit: 'mm'
      });
      params.set('snowfall_unit', 'cm');

      let upstreamPayload = null;
      try {
        const upstream = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
          cf: { cacheTtl: 300, cacheEverything: true }
        });
        if (!upstream.ok) {
          return weatherJsonResponse(502, { error: `Open-Meteo request failed (${upstream.status}).` }, 60);
        }
        upstreamPayload = await upstream.json();
      } catch (_) {
        return weatherJsonResponse(502, { error: 'Unable to reach Open-Meteo right now.' }, 60);
      }

      const entries = Array.isArray(upstreamPayload)
        ? upstreamPayload
        : Array.isArray(upstreamPayload?.results)
          ? upstreamPayload.results
          : [upstreamPayload];
      const first = entries[0] || {};
      const units = {
        ...((first && typeof first.current_units === 'object') ? first.current_units : {}),
        ...((first && typeof first.hourly_units === 'object') ? first.hourly_units : {})
      };

      const points = slugs.map((slug, index) => {
        const entry = entries[index] || entries[0] || {};
        const current = entry && typeof entry.current === 'object' ? entry.current : {};
        const hourly = entry && typeof entry.hourly === 'object' ? entry.hourly : {};
        const hourlyTimes = Array.isArray(hourly.time) ? hourly.time : [];
        const hourlyIndex = hourlyTimes.length
          ? Math.max(0, Math.min(hourlyTimes.length - 1, hourOffset))
          : 0;

        const values = {};
        openMeteoVariables.forEach((variable) => {
          let value = null;
          if (hourOffset === 0 && Number.isFinite(Number(current?.[variable]))) {
            value = Number(current[variable]);
          } else if (Array.isArray(hourly?.[variable]) && Number.isFinite(Number(hourly[variable][hourlyIndex]))) {
            value = Number(hourly[variable][hourlyIndex]);
          } else if (Number.isFinite(Number(current?.[variable]))) {
            value = Number(current[variable]);
          }
          values[variable] = value;
        });

        const pointTime = hourOffset === 0
          ? (current?.time || hourlyTimes[hourlyIndex] || '')
          : (hourlyTimes[hourlyIndex] || current?.time || '');

        return {
          slug,
          lat: latitudes[index],
          lon: longitudes[index],
          time: pointTime,
          values
        };
      });

      return weatherJsonResponse(200, {
        source: 'open-meteo',
        generatedAt: new Date().toISOString(),
        hourOffset,
        units,
        points
      }, 300);
    }

    // Radar metadata proxy: RainViewer primary, NOAA OpenGeo WMS fallback, 2-minute cache.
    if (pathname === '/api/weather/radar/meta' || pathname === '/api/weather/radar/meta/') {
      const noaaWms = {
        url: 'https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows',
        layers: 'conus_bref_qcd',
        format: 'image/png',
        transparent: true
      };

      try {
        const upstream = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
          cf: { cacheTtl: 120, cacheEverything: true }
        });
        if (!upstream.ok) {
          return weatherJsonResponse(200, {
            provider: 'noaa_opengeo_wms',
            mode: 'wms',
            fallback: { wms: noaaWms }
          }, 120);
        }
        const payload = await upstream.json();
        const pastFrames = Array.isArray(payload?.radar?.past) ? payload.radar.past : [];
        const latestFrame = pastFrames.length ? pastFrames[pastFrames.length - 1] : null;
        let timestamp = Number(latestFrame?.time);
        if (!Number.isFinite(timestamp) && typeof latestFrame?.path === 'string') {
          const match = latestFrame.path.match(/(\d{8,})/);
          if (match) timestamp = Number(match[1]);
        }

        if (Number.isFinite(timestamp)) {
          return weatherJsonResponse(200, {
            provider: 'rainviewer',
            mode: 'tile',
            timestamp,
            tileTemplate: `/api/weather/radar/tile/${timestamp}/{z}/{x}/{y}.png`,
            fallback: {
              provider: 'noaa_opengeo_wms',
              wms: noaaWms
            }
          }, 120);
        }
      } catch (_) {
        // Fall through to NOAA fallback.
      }

      return weatherJsonResponse(200, {
        provider: 'noaa_opengeo_wms',
        mode: 'wms',
        fallback: { wms: noaaWms }
      }, 120);
    }

    // Radar tile proxy: RainViewer frame tile passthrough, 5-minute cache.
    if (pathname.startsWith('/api/weather/radar/tile/')) {
      const match = pathname.match(/^\/api\/weather\/radar\/tile\/(\d+)\/(\d+)\/(\d+)\/(\d+)\.png$/);
      if (!match) {
        return new Response('Invalid radar tile path.', { status: 400, headers: weatherCorsHeaders(60) });
      }
      const [, timestamp, z, x, y] = match;
      const upstreamUrl = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/512/${z}/${x}/${y}/2/1_1.png`;
      const upstream = await fetch(upstreamUrl, {
        cf: { cacheTtl: 300, cacheEverything: true }
      });
      if (!upstream.ok) {
        return new Response('Radar tile not found.', {
          status: upstream.status,
          headers: {
            ...weatherCorsHeaders(300),
            'Content-Type': 'text/plain; charset=utf-8'
          }
        });
      }
      return new Response(request.method === 'HEAD' ? null : upstream.body, {
        status: upstream.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
          'Content-Type': 'image/png'
        }
      });
    }

    // NWS alerts proxy: simplified FeatureCollection, filtered by point or bbox, 5-minute cache.
    if (pathname === '/api/weather/alerts' || pathname === '/api/weather/alerts/') {
      const pointParam = cleanText(url.searchParams.get('point'));
      const bboxParam = cleanText(url.searchParams.get('bbox'));
      if (!pointParam && !bboxParam) {
        return weatherJsonResponse(400, { error: 'point or bbox query parameter is required.' }, 60);
      }

      let pointLat = null;
      let pointLon = null;
      if (pointParam) {
        const parts = pointParam.split(',').map((value) => Number.parseFloat(value.trim()));
        if (parts.length !== 2 || parts.some((value) => !Number.isFinite(value))) {
          return weatherJsonResponse(400, { error: 'point must be lat,lon.' }, 60);
        }
        [pointLat, pointLon] = parts;
      }

      let bboxBounds = null;
      if (bboxParam) {
        const parts = bboxParam.split(',').map((value) => Number.parseFloat(value.trim()));
        if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
          return weatherJsonResponse(400, { error: 'bbox must be minLon,minLat,maxLon,maxLat.' }, 60);
        }
        bboxBounds = {
          minX: Math.min(parts[0], parts[2]),
          minY: Math.min(parts[1], parts[3]),
          maxX: Math.max(parts[0], parts[2]),
          maxY: Math.max(parts[1], parts[3])
        };
      }

      const upstreamUrl = pointParam
        ? `https://api.weather.gov/alerts/active?point=${pointLat},${pointLon}`
        : 'https://api.weather.gov/alerts/active';

      let upstreamPayload = null;
      try {
        const upstream = await fetch(upstreamUrl, {
          headers: {
            'User-Agent': 'NH48-Worker/1.0 (https://nh48.info/contact)',
            Accept: 'application/geo+json'
          },
          cf: { cacheTtl: 300, cacheEverything: true }
        });
        if (!upstream.ok) {
          return weatherJsonResponse(502, { error: `NWS request failed (${upstream.status}).` }, 60);
        }
        upstreamPayload = await upstream.json();
      } catch (_) {
        return weatherJsonResponse(502, { error: 'Unable to reach NWS alerts right now.' }, 60);
      }

      const features = Array.isArray(upstreamPayload?.features) ? upstreamPayload.features : [];
      const filtered = bboxBounds
        ? features.filter((feature) => boundsIntersect(bboxBounds, toGeometryBounds(feature?.geometry)))
        : features;

      const simplified = filtered
        .map((feature) => {
          const props = feature?.properties && typeof feature.properties === 'object' ? feature.properties : {};
          const severity = cleanText(props.severity).toLowerCase() || 'unknown';
          return {
            type: 'Feature',
            id: feature?.id || props.id || '',
            geometry: feature?.geometry || null,
            properties: {
              event: cleanText(props.event) || 'Alert',
              severity,
              headline: cleanText(props.headline),
              effective: props.effective || '',
              expires: props.expires || '',
              senderName: cleanText(props.senderName),
              areaDesc: cleanText(props.areaDesc)
            }
          };
        })
        .filter((feature) => feature.geometry);

      return weatherJsonResponse(200, {
        type: 'FeatureCollection',
        source: 'nws',
        generatedAt: new Date().toISOString(),
        features: simplified
      }, 300);
    }

    if (pathname === '/api/howker/share-image' || pathname === '/api/howker/share-image/') {
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response('Method Not Allowed', { status: 405 });
      }

      const srcParam = url.searchParams.get('src');
      if (!srcParam) {
        return new Response('Missing src parameter.', { status: 400 });
      }

      let sourceUrl;
      try {
        sourceUrl = new URL(srcParam);
      } catch (_) {
        return new Response('Invalid src parameter.', { status: 400 });
      }

      const allowedHosts = new Set([
        'plants.nh48.info',
        'photos.nh48.info',
        'wikiphotos.nh48.info',
        'howker.nh48.info'
      ]);
      const host = sourceUrl.hostname.toLowerCase();
      const protocol = sourceUrl.protocol.toLowerCase();
      if (!['https:', 'http:'].includes(protocol)) {
        return new Response('Unsupported protocol.', { status: 400 });
      }
      if (sourceUrl.username || sourceUrl.password) {
        return new Response('Credentials are not allowed in src.', { status: 400 });
      }
      if (sourceUrl.port && sourceUrl.port !== '443' && sourceUrl.port !== '80') {
        return new Response('Unsupported port in src.', { status: 400 });
      }

      const isPrivateOrLocalHost = (hostname) => {
        if (!hostname) return true;
        const lower = hostname.toLowerCase();
        if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) {
          return true;
        }
        if (lower.includes(':')) {
          return true;
        }
        const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (!ipv4Match) return false;
        const octets = ipv4Match.slice(1).map((part) => Number(part));
        if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
          return true;
        }
        if (octets[0] === 10 || octets[0] === 127) return true;
        if (octets[0] === 169 && octets[1] === 254) return true;
        if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
        if (octets[0] === 192 && octets[1] === 168) return true;
        return false;
      };

      if (isPrivateOrLocalHost(host)) {
        return new Response('Private or local hosts are not allowed.', { status: 400 });
      }
      if (!allowedHosts.has(host)) {
        return new Response('Host is not allowed.', { status: 400 });
      }

      const widthParam = Number.parseInt(url.searchParams.get('w') || '', 10);
      const width = Number.isFinite(widthParam) && widthParam > 0
        ? Math.max(320, Math.min(4096, widthParam))
        : 1600;
      const rawFormat = String(url.searchParams.get('fmt') || 'jpg').toLowerCase();
      const normalizedFormat = rawFormat === 'jpeg' ? 'jpg' : rawFormat;
      if (!['jpg', 'webp', 'png'].includes(normalizedFormat)) {
        return new Response('Unsupported fmt parameter.', { status: 400 });
      }

      const originalSourceUrl = sourceUrl.toString();
      const candidateUpstreamUrls = [];
      const pushCandidate = (value) => {
        const candidate = String(value || '').trim();
        if (!candidate) return;
        if (!candidateUpstreamUrls.includes(candidate)) {
          candidateUpstreamUrls.push(candidate);
        }
      };

      if (isCloudflareImageHost(host)) {
        pushCandidate(buildCloudflareImageVariantUrl(originalSourceUrl, {
          width,
          format: normalizedFormat,
          quality: 85
        }));
        pushCandidate(stripCloudflareImageTransform(originalSourceUrl));
      }
      pushCandidate(originalSourceUrl);

      let upstreamResponse = null;
      let resolvedUpstreamUrl = '';
      let lastFailureStatus = 502;
      let sawNonImagePayload = false;
      for (const candidateUrl of candidateUpstreamUrls) {
        let candidateResponse;
        try {
          candidateResponse = await fetch(candidateUrl, {
            method: request.method,
            headers: {
              Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
            },
            cf: {
              cacheEverything: true,
              cacheTtl: 120
            }
          });
        } catch (_) {
          lastFailureStatus = 502;
          continue;
        }

        if (!candidateResponse.ok) {
          lastFailureStatus = candidateResponse.status;
          continue;
        }

        const candidateContentType = candidateResponse.headers.get('content-type') || '';
        if (!candidateContentType.toLowerCase().startsWith('image/')) {
          sawNonImagePayload = true;
          lastFailureStatus = 400;
          continue;
        }

        upstreamResponse = candidateResponse;
        resolvedUpstreamUrl = candidateUrl;
        break;
      }

      if (!upstreamResponse) {
        if (sawNonImagePayload) {
          return new Response('Upstream response is not an image.', { status: 400 });
        }
        return new Response(`Upstream image request failed (${lastFailureStatus}).`, {
          status: lastFailureStatus
        });
      }

      const contentType = upstreamResponse.headers.get('content-type') || '';

      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Cache-Control', 'public, max-age=120');
      headers.set('X-NH48-Upstream-Image', resolvedUpstreamUrl);
      const etag = upstreamResponse.headers.get('etag');
      if (etag) headers.set('ETag', etag);
      const lastModified = upstreamResponse.headers.get('last-modified');
      if (lastModified) headers.set('Last-Modified', lastModified);
      const contentLength = upstreamResponse.headers.get('content-length');
      if (contentLength) headers.set('Content-Length', contentLength);

      if (request.method === 'HEAD') {
        return new Response(null, { status: 200, headers });
      }
      return new Response(upstreamResponse.body, { status: 200, headers });
    }

    if (pathname.startsWith('/api/howker/plant-reports')) {
      const corsHeaders = {
        'Access-Control-Allow-Origin': HOWKER_ORIGIN,
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      };

      const jsonResponse = (status, payload) => {
        return new Response(JSON.stringify(payload), {
          status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      if (request.method === 'GET') {
        const bboxParam = url.searchParams.get('bbox');
        if (!bboxParam) {
          return jsonResponse(400, { error: 'Missing bbox parameter.' });
        }

        const bboxParts = bboxParam.split(',').map((value) => Number.parseFloat(value));
        if (bboxParts.length !== 4 || bboxParts.some((value) => Number.isNaN(value))) {
          return jsonResponse(400, { error: 'Invalid bbox parameter.' });
        }

        const [minLng, minLat, maxLng, maxLat] = bboxParts;
        const plantSlug = url.searchParams.get('plantSlug');
        const params = [minLng, maxLng, minLat, maxLat];
        let sql = `SELECT\n  id,\n  plant_slug AS plantSlug,\n  lat,\n  lng,\n  accuracy_m AS accuracyM,\n  elevation_m AS elevationM,\n  observed_at AS observedAt,\n  notes,\n  created_at AS createdAt\nFROM plant_reports\nWHERE status = 'approved'\n  AND lng BETWEEN ?1 AND ?2\n  AND lat BETWEEN ?3 AND ?4`;

        if (plantSlug) {
          sql += '\n  AND plant_slug = ?5';
          params.push(plantSlug);
        }

        sql += '\nLIMIT 2000;';
        const results = await env.HOWKER_DB.prepare(sql).bind(...params).all();
        return jsonResponse(200, { reports: results?.results ?? [] });
      }

      if (request.method === 'POST') {
        let payload;
        try {
          payload = await request.json();
        } catch (err) {
          return jsonResponse(400, { error: 'Invalid JSON body.' });
        }

        const plantSlug = typeof payload?.plantSlug === 'string' ? payload.plantSlug.trim() : '';
        const lat = Number.parseFloat(payload?.lat);
        const lng = Number.parseFloat(payload?.lng);
        const accuracyMValue = payload?.accuracyM ?? null;
        const elevationMValue = payload?.elevationM ?? null;
        const observedAt = payload?.observedAt ?? null;
        const notes = typeof payload?.notes === 'string' ? payload.notes : null;

        if (!plantSlug) {
          return jsonResponse(400, { error: 'plantSlug is required.' });
        }

        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return jsonResponse(400, { error: 'lat/lng must be valid coordinates.' });
        }

        if (notes && notes.length > 2000) {
          return jsonResponse(400, { error: 'notes must be 2000 characters or fewer.' });
        }

        if (accuracyMValue !== null && accuracyMValue !== undefined && !Number.isFinite(Number.parseFloat(accuracyMValue))) {
          return jsonResponse(400, { error: 'accuracyM must be a number.' });
        }

        if (elevationMValue !== null && elevationMValue !== undefined && !Number.isFinite(Number.parseFloat(elevationMValue))) {
          return jsonResponse(400, { error: 'elevationM must be a number.' });
        }

        const id = crypto.randomUUID();
        const createdBy = payload?.createdBy ?? null;
        const accuracyM = accuracyMValue === null || accuracyMValue === undefined ? null : Number.parseFloat(accuracyMValue);
        const elevationM = elevationMValue === null || elevationMValue === undefined ? null : Number.parseFloat(elevationMValue);
        await env.HOWKER_DB.prepare(
          `INSERT INTO plant_reports\n(id, plant_slug, lat, lng, accuracy_m, elevation_m, observed_at, notes, status, source, created_by)\nVALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'web', ?);`
        ).bind(
          id,
          plantSlug,
          lat,
          lng,
          accuracyM,
          elevationM,
          observedAt,
          notes,
          createdBy
        ).run();

        return jsonResponse(201, { ok: true, id });
      }

      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    if (pathname === '/api/howker/map-card-upload' || pathname === '/api/howker/map-card-upload/') {
      const corsHeaders = (origin) => {
        const allowed = new Set([
          'https://nh48.info',
          'http://localhost:3000',
          'http://127.0.0.1:3000'
        ]);
        const resolved = allowed.has(origin) ? origin : 'https://nh48.info';
        return {
          'Access-Control-Allow-Origin': resolved,
          'Access-Control-Allow-Methods': 'POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        };
      };
      const origin = request.headers.get('Origin') || HOWKER_ORIGIN;
      const jsonResponse = (status, payload) => {
        return new Response(JSON.stringify(payload), {
          status,
          headers: {
            ...corsHeaders(origin),
            'Content-Type': 'application/json'
          }
        });
      };
      const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(origin) });
      }
      if (!env.HOWKER_DATA) {
        return jsonResponse(500, { error: 'Storage is not configured.' });
      }
      let form;
      try {
        form = await request.formData();
      } catch (err) {
        return jsonResponse(400, { error: 'Invalid form data.' });
      }
      const expectedPw = (env.HOWKER_MAP_PW || '').trim()
        || (env.HOWKER_MAP_PASSWORD || '').trim()
        || (env.HOWKER_PASS || '').trim();
      const providedPw = (form.get('password') || '').toString().trim();
      if (!expectedPw || !providedPw || providedPw !== expectedPw) {
        return new Response('Unauthorized', { status: 403, headers: corsHeaders(origin) });
      }
      const file = form.get('file');
      if (!file || typeof file === 'string') {
        return jsonResponse(400, { error: 'Missing file upload.' });
      }
      const filename = file.name || 'howker-map-card.jpg';
      const isJpeg = file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(filename);
      if (!isJpeg) {
        return jsonResponse(400, { error: 'Only JPEG uploads are allowed.' });
      }
      const meta = form.get('meta');
      const metaString = typeof meta === 'string' ? meta : '';
      const key = `howker-share/howker-map-card-${Date.now()}.jpg`;
      await env.HOWKER_DATA.put(key, file.stream(), {
        httpMetadata: { contentType: 'image/jpeg' },
        customMetadata: metaString ? { meta: metaString } : undefined
      });
      return jsonResponse(200, {
        ok: true,
        key,
        url: `${SITE}/api/howker/map-card/${encodeURIComponent(key)}`
      });
    }

    if (pathname.startsWith('/api/howker/map-card/')) {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      };
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
      }
      if (!env.HOWKER_DATA) {
        return new Response('Storage is not configured.', { status: 500, headers: corsHeaders });
      }
      const key = decodeURIComponent(pathname.replace('/api/howker/map-card/', ''));
      if (!key) {
        return new Response('Missing key.', { status: 400, headers: corsHeaders });
      }
      if (request.method === 'HEAD') {
        const head = await env.HOWKER_DATA.head(key);
        if (!head) {
          return new Response('Not Found', { status: 404, headers: corsHeaders });
        }
        return new Response(null, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000'
          }
        });
      }
      const object = await env.HOWKER_DATA.get(key);
      if (!object) {
        return new Response('Not Found', { status: 404, headers: corsHeaders });
      }
      return new Response(object.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    }

    if (pathname === '/api/howker/map-update' || pathname === '/api/howker/map-update/') {
      const corsHeaders = (origin) => {
        const allowed = new Set([
          'https://nh48.info',
          'http://localhost:3000',
          'http://127.0.0.1:3000'
        ]);
        const resolved = allowed.has(origin) ? origin : 'https://nh48.info';
        return {
          'Access-Control-Allow-Origin': resolved,
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        };
      };

      const origin = request.headers.get('Origin') || HOWKER_ORIGIN;

      const jsonResponse = (status, payload) => {
        return new Response(JSON.stringify(payload), {
          status,
          headers: {
            ...corsHeaders(origin),
            'Content-Type': 'application/json'
          }
        });
      };

      const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }

      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(origin) });
      }

      const contentLengthHeader = request.headers.get('content-length');
      const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
      if (Number.isFinite(contentLength) && contentLength > MAX_PAYLOAD_BYTES) {
        return jsonResponse(400, { error: 'Payload too large.' });
      }

      let body = {};
      try {
        body = await request.json();
      } catch (err) {
        return new Response('Bad JSON', { status: 400, headers: corsHeaders(origin) });
      }

      if (!Number.isFinite(contentLength)) {
        const payloadSize = JSON.stringify(body).length;
        if (payloadSize > MAX_PAYLOAD_BYTES) {
          return jsonResponse(400, { error: 'Payload too large.' });
        }
      }

      const expectedPw = (env.HOWKER_MAP_PW || '').trim()
        || (env.HOWKER_MAP_PASSWORD || '').trim()
        || (env.HOWKER_PASS || '').trim();
      const providedPw = (body?.password || '').trim();
      if (!expectedPw || !providedPw || providedPw !== expectedPw) {
        return new Response('Unauthorized', { status: 403, headers: corsHeaders(origin) });
      }

      const statusGeoJson = body?.statusGeoJson || body?.status;
      const poiGeoJson = body?.poiGeoJson || body?.pois;

      if (!statusGeoJson || !poiGeoJson) {
        return jsonResponse(400, { error: 'Missing data.' });
      }

      const isFeatureCollection = (value) => {
        return Boolean(
          value
          && value.type === 'FeatureCollection'
          && Array.isArray(value.features)
        );
      };

      if (!isFeatureCollection(statusGeoJson) || !isFeatureCollection(poiGeoJson)) {
        return jsonResponse(400, { error: 'Invalid GeoJSON FeatureCollection.' });
      }

      if (!env.HOWKER_DATA) {
        return jsonResponse(500, { error: 'Storage is not configured.' });
      }

      const editPayload = {
        status: statusGeoJson,
        blowdowns: body?.blowdowns || null,
        signs: body?.signs || null,
        drainage: body?.drainage || null,
        bogBridges: body?.bogBridges || null,
        stonework: body?.stonework || null,
        tread: body?.tread || null,
        encroachments: body?.encroachments || null,
        hazards: body?.hazards || null,
        cairns: body?.cairns || null,
        pois: poiGeoJson
      };

      await env.HOWKER_DATA.put('howker-ridge-status.geojson', JSON.stringify(statusGeoJson, null, 2), {
        httpMetadata: { contentType: 'application/geo+json' }
      });
      await env.HOWKER_DATA.put('howker-ridge-pois.geojson', JSON.stringify(poiGeoJson, null, 2), {
        httpMetadata: { contentType: 'application/geo+json' }
      });
      await env.HOWKER_DATA.put('howker-ridge-edit.json', JSON.stringify(editPayload, null, 2), {
        httpMetadata: { contentType: 'application/json' }
      });

      return jsonResponse(200, { ok: true });
    }

    if (pathname === '/projects/plant-map' || pathname === '/projects/plant-map/') {
      const canonical = `${SITE}${pathname}`;
      const creativeWorks = await loadCreativeWorks();
      const plantMapCreativeWork = buildCreativeWorkNode({
        entry: creativeWorks['projects/plant-map'],
        fallbackType: 'Article',
        id: `${canonical}#article`,
        url: canonical,
        name: 'Howker Ridge Plant Log Map',
        description: 'Interactive map to explore and record alpine plant observations along the Howker Ridge Trail.',
        thumbnailUrl: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-madison/mount-madison__003.jpg'
      });
      return serveTemplatePage({
        templatePath: 'pages/projects/plant-map.html',
        pathname,
        routeId: 'plant-map',
        meta: {
          title: 'Howker Ridge Plant Log Map - NH48.info',
          description: 'Interactive map to explore and record alpine plant observations along the Howker Ridge Trail.',
          canonical,
          image: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-madison/mount-madison__003.jpg',
          imageAlt: 'Mount Madison ridge view with alpine terrain and distant peaks',
          ogType: 'website'
        },
        jsonLd: [plantMapCreativeWork]
      });
    }

    if (pathname === '/projects/howker-map-editor' || pathname === '/projects/howker-map-editor/') {
      const canonical = `${SITE}${pathname}`;
      return serveTemplatePage({
        templatePath: 'pages/projects/howker-map-editor.html',
        pathname,
        routeId: 'howker-map-editor',
        meta: {
          title: 'Howker Ridge Trail Map Editor - NH48.info',
          description: 'Interactive editor for the Howker Ridge Trail map. Mark brushed sections, blowdowns, and signage needs with password-protected saves.',
          canonical,
          image: DEFAULT_IMAGE,
          imageAlt: 'Howker Ridge trail map editor interface',
          ogType: 'website'
        },
        jsonLd: []
      });
    }

    if (pathname === '/turnstile-sitekey') {
      const sitekey = env.TURNSTILE_SITEKEY || '';
      return new Response(JSON.stringify({ sitekey }), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        }
      });
    }

    if (howkerDataRoutes[pathname]) {
      const { key, contentType } = howkerDataRoutes[pathname];
      const cacheHeaders = {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      };

      if (env.HOWKER_DATA) {
        const object = await env.HOWKER_DATA.get(key);
        if (object) {
          const body = await object.arrayBuffer();
          return new Response(body, {
            status: 200,
            headers: {
              'Content-Type': object.httpMetadata?.contentType || contentType,
              ...cacheHeaders
            }
          });
        }
      }

      const githubUrl = `${RAW_BASE}${pathname}`;
      try {
        const res = await fetch(githubUrl, {
          headers: { 'User-Agent': 'NH48-SSR/1.0' },
          cf: { cacheTtl: 0, cacheEverything: false }
        });

        if (!res.ok) {
          console.log(`[Static] Not found: ${githubUrl} (${res.status})`);
          return new Response('Not Found', { status: 404 });
        }

        const body = await res.arrayBuffer();
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            ...cacheHeaders
          }
        });
      } catch (err) {
        console.error(`[Static] Error: ${err.message}`);
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    if (pathname === '/submit-edit' || pathname === '/submit-edit/' || pathname === '/fr/submit-edit' || pathname === '/fr/submit-edit/') {
      if (request.method === 'POST') {
        const form = await request.formData();
        const name = form.get('name')?.toString().trim() || '';
        const email = form.get('email')?.toString().trim() || '';
        const peak = form.get('peak')?.toString().trim() || '';
        const plant = form.get('plant')?.toString().trim() || '';
        const page = form.get('page')?.toString().trim() || '';
        const body = form.get('body')?.toString().trim() || '';
        const token = form.get('cf-turnstile-response')?.toString() || '';

        const redirectWithStatus = (status, message, statusCode = 303) => {
          const redirectUrl = new URL('/submit-edit', url.origin);
          redirectUrl.searchParams.set('status', status);
          if (message) {
            redirectUrl.searchParams.set('message', message);
          }
          return Response.redirect(redirectUrl.toString(), statusCode);
        };

        if (!name || !email || !body) {
          return redirectWithStatus('error', 'Please complete all required fields.');
        }

        if (!isValidEmail(email)) {
          return redirectWithStatus('error', 'Please enter a valid email address.');
        }

        if (env.TURNSTILE_SECRET) {
          if (!token) {
            return redirectWithStatus('error', 'Please complete the CAPTCHA.');
          }
          const ip = request.headers.get('CF-Connecting-IP') || '';
          const verification = await verifyTurnstileToken(token, ip, env);
          if (!verification.success) {
            return redirectWithStatus('error', 'CAPTCHA verification failed.');
          }
        } else {
          const mathAnswer = form.get('math')?.toString().trim() || '';
          if (mathAnswer !== '8') {
            return redirectWithStatus('error', 'Please solve the math challenge.');
          }
        }

        if (!env.EMAIL || !env.EMAIL_FROM || !env.EMAIL_TO) {
          return redirectWithStatus('error', 'Email delivery is not configured.');
        }

        const subjectTags = [];
        if (peak) subjectTags.push(`Peak: ${peak}`);
        if (plant) subjectTags.push(`Plant: ${plant}`);
        if (page) subjectTags.push(`Page: ${page}`);
        const subjectSuffix = subjectTags.length ? ` - ${subjectTags.join(', ')}` : '';
        const subject = `Edit submission from ${name}${subjectSuffix}`;
        const sanitizedBody = stripHtml(body);
        const content = [
          `Name: ${name}`,
          `Email: ${email}`,
          peak ? `NH48 Peak: ${peak}` : null,
          plant ? `Plant: ${plant}` : null,
          page ? `Page: ${page}` : null,
          '',
          'Message:',
          sanitizedBody || '(no message provided)'
        ].filter(Boolean).join('\n');

        await env.EMAIL.send({
          to: env.EMAIL_TO,
          from: env.EMAIL_FROM,
          subject,
          content
        });

        return redirectWithStatus('success', 'Thanks! Your report has been sent.');
      }

      if (request.method !== 'GET') {
        return new Response('Method Not Allowed', { status: 405 });
      }
    }

    // ============================================================
    // STATIC FILE SERVING - Proxy static assets from GitHub
    // Since there's no origin server (GitHub Pages disabled), 
    // we serve static files directly from GitHub raw URLs
    // ============================================================
    const staticExtensions = ['.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.eot', '.geojson', '.txt', '.xml', '.webmanifest', '.html'];
    const staticPrefixes = ['/css/', '/js/', '/data/', '/downloads/', '/images/', '/favicons/', '/photos/', '/i18n/', '/UI-Elements/', '/scripts/', '/license/', '/old/', '/templates/'];
    const staticFiles = ['/manifest.json', '/nh48API_logo.png', '/robots.txt', '/sitemap.xml', '/nh48-preview.png', '/BingSiteAuth.xml', '/image-sitemap.xml', '/page-sitemap.xml'];

    const legacyRedirectMap = {
      '/index.html': '/',
      '/catalog.html': '/catalog',
      '/long-trails.html': '/long-trails',
      '/peak.html': '/catalog',
      '/plant-catalog.html': '/plant-catalog',
      '/bird-catalog.html': '/bird-catalog',
      '/trails_app.html': '/trails',
      '/long_trails_app.html': '/long-trails',
      '/plant_catalog.html': '/plant-catalog',
      '/plant_catalog': '/plant-catalog',
      '/bird_catalog.html': '/bird-catalog',
      '/bird_catalog': '/bird-catalog',
      '/nh48-map.html': '/nh48-map',
      '/nh48_map.html': '/nh48-map',
      '/nh48_map': '/nh48-map',
      '/hrt_info.html': '/projects/hrt-info',
      '/pages/hrt_info.html': '/projects/hrt-info',
      '/howker_ridge.html': '/howker-ridge',
      '/pages/howker_ridge.html': '/howker-ridge',
      '/nh-4000-footers-guide': '/nh-4000-footers-info',
      '/nh-4000-footers-guide.html': '/nh-4000-footers-info',
      '/nh-4000-footers-info.html': '/nh-4000-footers-info',
      '/nh48-planner': '/nh48-planner.html'
    };

    const legacyKey = pathname.startsWith('/fr/') ? pathname.replace(/^\/fr/, '') : pathname;
    if (legacyRedirectMap[legacyKey]) {
      const targetPath = pathname.startsWith('/fr/') ? `/fr${legacyRedirectMap[legacyKey]}` : legacyRedirectMap[legacyKey];
      return Response.redirect(`${SITE}${targetPath}${url.search || ''}`, 301);
    }

    const legacyPeakRoute = pathname.match(/^\/(fr\/)?peaks\/([^/?#]+)\/?$/i);
    if (legacyPeakRoute) {
      const localePrefix = legacyPeakRoute[1] ? 'fr/' : '';
      const peakSlug = legacyPeakRoute[2];
      return Response.redirect(`${SITE}/${localePrefix}peak/${encodeURIComponent(peakSlug)}${url.search || ''}`, 301);
    }

    const sitemapSlashRedirects = {
      '/sitemap.xml/': '/sitemap.xml',
      '/page-sitemap.xml/': '/page-sitemap.xml',
      '/image-sitemap.xml/': '/image-sitemap.xml'
    };
    if (sitemapSlashRedirects[pathname]) {
      return Response.redirect(`${SITE}${sitemapSlashRedirects[pathname]}${url.search || ''}`, 301);
    }

    if (pathname === '/fr/wiki' || pathname === '/fr/wiki/' || pathname.startsWith('/fr/wiki/')) {
      const enPath = pathname.replace(/^\/fr/, '') || '/wiki';
      return Response.redirect(`${SITE}${enPath}${url.search || ''}`, 301);
    }

    if (pathname === '/photos' || pathname === '/photos/') {
      const githubUrl = `${RAW_BASE}/photos/index.html`;
      try {
        const res = await fetch(githubUrl, {
          headers: { 'User-Agent': 'NH48-SSR/1.0' },
          cf: { cacheTtl: 0, cacheEverything: false }
        });

        if (!res.ok) {
          console.log(`[Static] Not found: ${githubUrl} (${res.status})`);
          return new Response('Not Found', { status: 404 });
        }

        let html = await res.text();
        const photoFallbackHtml = buildCrawlerImageFallbackHtml({
          peaks: await loadPeaks(),
          variant: 'photos',
          limit: 48
        });
        html = injectCrawlerFallbackAfterContainer(html, 'photos-container', photoFallbackHtml);
        html = injectClientRuntimeCore(html);
        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (err) {
        console.error(`[Static] Error: ${err.message}`);
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    // Check if this is a static file request (but not an SSR route)
    const hasStaticExtension = staticExtensions.some(ext => pathname.toLowerCase().endsWith(ext));
    const hasStaticPrefix = staticPrefixes.some(prefix => pathname.startsWith(prefix));
    const isStaticFile = staticFiles.includes(pathname);
    const isSSRRoute = pathname === '/' || pathname === '/fr' || pathname === '/fr/' ||
      pathname.startsWith('/peak/') || pathname.startsWith('/fr/peak/') ||
      pathname.startsWith('/peaks/') || pathname.startsWith('/fr/peaks/') ||
      pathname.startsWith('/guest/') || pathname.startsWith('/fr/guest/') ||
      pathname === '/catalog' || pathname === '/catalog/' ||
      pathname === '/fr/catalog' || pathname === '/fr/catalog/' ||
      pathname === '/nh48-map' || pathname === '/nh48-map/' ||
      pathname === '/fr/nh48-map' || pathname === '/fr/nh48-map/' ||
      pathname === '/trails' || pathname === '/trails/' ||
      pathname === '/fr/trails' || pathname === '/fr/trails/' ||
      pathname === '/long-trails' || pathname === '/long-trails/' ||
      pathname === '/fr/long-trails' || pathname === '/fr/long-trails/' ||
      pathname === '/dataset' || pathname === '/dataset/' ||
      pathname.startsWith('/dataset/') || pathname.startsWith('/fr/dataset/') ||
      pathname === '/wiki' || pathname === '/wiki/' ||
      pathname.startsWith('/wiki/') || pathname.startsWith('/fr/wiki/') ||
      pathname === '/plant-catalog' || pathname === '/plant-catalog/' ||
      pathname === '/bird-catalog' || pathname === '/bird-catalog/' ||
      pathname === '/fr/bird-catalog' || pathname === '/fr/bird-catalog/' ||
      pathname === '/projects/plant-map' || pathname === '/projects/plant-map/' ||
      pathname === '/projects/hrt-info' || pathname === '/projects/hrt-info/' ||
      pathname === '/howker-ridge' || pathname === '/howker-ridge/' ||
      pathname.startsWith('/howker-ridge/poi') ||
      pathname.startsWith('/plant/') || pathname.startsWith('/fr/plant/') ||
      pathname.startsWith('/bird/') || pathname.startsWith('/fr/bird/') ||
      pathname === '/nh-4000-footers-info.html' || pathname === '/nh-4000-footers-info' ||
      pathname.match(/^\/fr\/(catalog|trails|long-trails|dataset|plant|bird|nh48-map)/) !== null;

    // Serve static files from GitHub (but not SSR routes even if they have extensions)
    if ((hasStaticPrefix || isStaticFile || hasStaticExtension) && !isSSRRoute) {
      const githubUrl = `${RAW_BASE}${pathname}`;
      try {
        const res = await fetch(githubUrl, {
          headers: { 'User-Agent': 'NH48-SSR/1.0' },
          cf: { cacheTtl: 0, cacheEverything: false }
        });

        if (!res.ok) {
          console.log(`[Static] Not found: ${githubUrl} (${res.status})`);
          return new Response('Not Found', { status: 404 });
        }

        // Determine content type based on file extension
        const ext = pathname.split('.').pop().toLowerCase();
        const contentTypes = {
          'css': 'text/css; charset=utf-8',
          'js': 'application/javascript; charset=utf-8',
          'json': 'application/json; charset=utf-8',
          'geojson': 'application/geo+json; charset=utf-8',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'svg': 'image/svg+xml',
          'ico': 'image/x-icon',
          'webp': 'image/webp',
          'woff': 'font/woff',
          'woff2': 'font/woff2',
          'ttf': 'font/ttf',
          'txt': 'text/plain; charset=utf-8',
          'xml': 'application/xml; charset=utf-8',
          'webmanifest': 'application/manifest+json',
          'html': 'text/html; charset=utf-8'
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';
        const cacheControl = pathname.startsWith('/photos/og/')
          ? 'public, max-age=31536000, immutable'
          : 'no-store';
        if (ext === 'html') {
          let html = await res.text();
          html = injectClientRuntimeCore(html);
          return new Response(html, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'no-store',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }

        const body = await res.arrayBuffer();

        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': cacheControl,
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (err) {
        console.error(`[Static] Error: ${err.message}`);
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    // ============================================================
    // SSR ROUTE HANDLING - Dynamic pages with SEO metadata
    // ============================================================

    // Determine if the route is French and extract the slug. We support:
    //   /peak/{slug}, /fr/peak/{slug}
    //   /guest/{slug}, /fr/guest/{slug} (legacy)
    // /peaks/* is redirected to /peak/* before this block.
    const peakKeywords = ['peak', 'guest'];
    let slugIdx = -1;
    let routeType = null;

    for (let i = 0; i < parts.length; i++) {
      if (peakKeywords.includes(parts[i])) {
        slugIdx = i + 1;
        routeType = parts[i];
        break;
      }
    }

    // Fallback to default position if no keyword found
    if (slugIdx === -1) {
      slugIdx = isFrench ? 2 : 1;
    }

    const slug = parts[slugIdx] || '';
    const lang = isFrench ? 'fr' : 'en';
    const pathNoLocale = isFrench ? `/${parts.slice(1).join('/')}` || '/' : pathname;

    const NO_CACHE_FETCH = {
      cf: { cacheTtl: 0, cacheEverything: false },
      headers: { 'User-Agent': 'NH48-SSR' }
    };

    // Warm caches used by worker-side breadcrumb and schema generation.
    await Promise.all([
      loadBreadcrumbTaxonomy(),
      loadEntityLinks()
    ]);

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    // Rewrite relative paths to absolute paths in HTML templates
    // Fixes ../css/ -> /css/, ../js/ -> /js/, etc.
    function fixRelativePaths(html) {
      return html
        .replace(/href="\.\.\//g, 'href="/')
        .replace(/src="\.\.\//g, 'src="/');
    }

    function hasLegacyAnalyticsMarkers(html) {
      if (typeof html !== 'string' || !html) return false;
      return /firebasejs|initializeApp|window\.NH48_INFO_ANALYTICS/i.test(html);
    }

    function injectAnalyticsCore(html) {
      if (typeof html !== 'string' || !html) return html;
      if (/data-nh48-analytics-core=["']1["']/i.test(html)) return html;
      if (hasLegacyAnalyticsMarkers(html)) return html;

      const scriptTag = '<script type="module" src="/js/analytics-core.js" data-nh48-analytics-core="1"></script>';
      if (/<\/head>/i.test(html)) {
        return html.replace(/<\/head>/i, `${scriptTag}\n</head>`);
      }
      return `${scriptTag}\n${html}`;
    }

    function injectImageLoadingCore(html) {
      if (typeof html !== 'string' || !html) return html;
      if (/data-nh48-image-loading-core=["']1["']/i.test(html)) return html;

      const styleTag = '<link rel="stylesheet" href="/css/image-loading-core.css" data-nh48-image-loading-core="1" />';
      const scriptTag = '<script src="/js/image-loading-core.js" defer data-nh48-image-loading-core="1"></script>';
      if (/<\/head>/i.test(html)) {
        return html.replace(/<\/head>/i, `${styleTag}\n${scriptTag}\n</head>`);
      }
      return `${styleTag}\n${scriptTag}\n${html}`;
    }

    function injectClientRuntimeCore(html) {
      const withImageLoading = injectImageLoadingCore(html);
      return injectAnalyticsCore(withImageLoading);
    }

    // Fetch translation dictionary if needed
    async function loadTranslation(code) {
      const url = code === 'fr' ? FR_TRANS_URL : EN_TRANS_URL;
      try {
        const res = await fetch(url, NO_CACHE_FETCH);
        if (res.ok) {
          return await res.json();
        }
      } catch (_) { }
      return {};
    }

    async function verifyTurnstileToken(token, ip, env) {
      const formData = new FormData();
      formData.append('secret', env.TURNSTILE_SECRET);
      formData.append('response', token);
      if (ip) {
        formData.append('remoteip', ip);
      }
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        return { success: false };
      }
      return res.json();
    }

    function isValidEmail(value) {
      return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
    }

    function stripHtml(value) {
      return value
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\\s+/g, ' ')
        .trim();
    }

    function normalizeDescriptionKey(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/[-_]+/g, ' ')
        .replace(/[^a-z0-9\\s]/g, '')
        .replace(/\\s+/g, ' ')
        .trim();
    }

    // Load mountain descriptions from the canonical GitHub data file
    async function loadDescriptions() {
      const map = Object.create(null);
      try {
        const res = await fetch(RAW_MOUNTAIN_DESCRIPTIONS_URL, NO_CACHE_FETCH);
        if (res.ok) {
          const text = await res.text();
          text.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            let key = '';
            let value = '';
            const colonIdx = trimmed.indexOf(':');
            if (colonIdx > 0) {
              key = trimmed.slice(0, colonIdx).trim();
              value = trimmed.slice(colonIdx + 1).trim();
            } else {
              const dashMatch = trimmed.match(/^(.+?)\\s*[-\u2013\u2014]\\s+(.+)$/);
              if (dashMatch) {
                key = dashMatch[1].trim();
                value = dashMatch[2].trim();
              }
            }
            if (key && value) {
              map[key] = value;
              const normalizedKey = normalizeDescriptionKey(key);
              if (normalizedKey) {
                map[normalizedKey] = value;
              }
            }
          });
        }
      } catch (_) { }
      return map;
    }

    function toPeakArray(peaks) {
      if (Array.isArray(peaks)) return peaks;
      if (peaks && typeof peaks === 'object') return Object.values(peaks);
      return [];
    }

    function normalizePeakKey(value) {
      return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    function getPeakSlugValue(peak, index) {
      const candidate =
        peak?.slug ||
        peak?.slug_en ||
        peak?.Slug ||
        peak?.peakName ||
        peak?.['Peak Name'] ||
        `peak-${index + 1}`;
      return normalizePeakKey(candidate);
    }

    function getPhotoToken(photo) {
      const raw =
        (typeof photo === 'string' ? photo : '') ||
        photo?.filename ||
        photo?.url ||
        photo?.originalUrl ||
        '';
      if (!raw) return '';
      const path = String(raw).split('?')[0].split('#')[0];
      const token = path.split('/').pop() || '';
      return token.trim().toLowerCase();
    }

    function buildPeakPhotoMap(peaks) {
      const map = new Map();
      const entries = toPeakArray(peaks);
      entries.forEach((peak, index) => {
        const slug = getPeakSlugValue(peak, index);
        if (!slug) return;
        const photos = Array.isArray(peak?.photos) ? peak.photos : [];
        const tokens = photos
          .map((photo) => getPhotoToken(photo))
          .filter(Boolean)
          .sort();
        map.set(slug, tokens);
      });
      return map;
    }

    function comparePeakPhotoParity(primary, canonical) {
      const primaryMap = buildPeakPhotoMap(primary);
      const canonicalMap = buildPeakPhotoMap(canonical);
      const allSlugs = new Set([...primaryMap.keys(), ...canonicalMap.keys()]);
      const mismatches = [];
      for (const slug of allSlugs) {
        const primaryTokens = primaryMap.get(slug) || [];
        const canonicalTokens = canonicalMap.get(slug) || [];
        if (primaryTokens.length !== canonicalTokens.length || primaryTokens.join('|') !== canonicalTokens.join('|')) {
          mismatches.push({
            slug,
            primaryCount: primaryTokens.length,
            canonicalCount: canonicalTokens.length
          });
        }
      }
      return {
        isMatch: mismatches.length === 0,
        mismatchCount: mismatches.length,
        mismatches
      };
    }

    // Load nh48.json from canonical GitHub raw source.
    async function loadPeaks() {
      try {
        const res = await fetch(`${RAW_BASE}/data/nh48.json`, NO_CACHE_FETCH);
        if (!res.ok) return null;
        return await res.json();
      } catch (_) {
        return null;
      }
    }

    async function loadPartial(name, url) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'NH48-SSR/1.0' },
          cf: { cacheTtl: 0, cacheEverything: false }
        });
        if (res.ok) {
          return await res.text();
        }
      } catch (err) {
        console.error(`Error loading ${name}:`, err.message);
      }
      return '';
    }

    async function loadJsonCache(key, url) {
      const res = await fetch(url, { cf: { cacheTtl: 0, cacheEverything: false }, headers: { 'User-Agent': 'NH48-SSR' } });
      if (!res.ok) {
        return null;
      }
      return await res.json();
    }

    function applyTemplateReplacements(html, replacements) {
      if (!replacements || typeof replacements !== 'object') return html;
      let output = html;
      for (const [token, rawValue] of Object.entries(replacements)) {
        const value = rawValue === null || rawValue === undefined ? '' : String(rawValue);
        output = output.replaceAll(token, value);
      }
      return output;
    }

    async function loadWikiMountainSets() {
      if (wikiMountainSetsCache) return wikiMountainSetsCache;
      const payload = await loadJsonCache('wiki-mountain-sets', RAW_WIKI_MOUNTAIN_SETS_URL);
      wikiMountainSetsCache = payload && typeof payload === 'object' ? payload : {};
      return wikiMountainSetsCache;
    }

    function resolveWikiSetSlug(setSlug) {
      return String(setSlug || '').trim().toLowerCase();
    }

    function resolveWikiMountainEntry(dataset, entrySlug) {
      const slug = normalizeSlug(entrySlug);
      if (!dataset || typeof dataset !== 'object' || !slug) return null;
      if (dataset[slug] && typeof dataset[slug] === 'object') return dataset[slug];
      return Object.values(dataset).find((entry) => normalizeSlug(entry?.slug || entry?.peakSlug || '') === slug) || null;
    }

    async function loadWikiMountainSetData(setSlug, setMeta = null) {
      const normalizedSetSlug = resolveWikiSetSlug(setSlug);
      if (!normalizedSetSlug) return null;
      if (wikiMountainDataCache.has(normalizedSetSlug)) {
        return wikiMountainDataCache.get(normalizedSetSlug);
      }
      const sets = setMeta ? { [normalizedSetSlug]: setMeta } : await loadWikiMountainSets();
      const selectedSet = (sets && typeof sets === 'object') ? sets[normalizedSetSlug] : null;
      if (!selectedSet || !selectedSet.dataFile) {
        wikiMountainDataCache.set(normalizedSetSlug, null);
        return null;
      }
      const dataFilePath = String(selectedSet.dataFile).replace(/^\/+/, '');
      const dataUrl = `${RAW_BASE}/${dataFilePath}`;
      const payload = await loadJsonCache(`wiki-mountains:${normalizedSetSlug}`, dataUrl);
      const normalized = payload && typeof payload === 'object' ? payload : null;
      wikiMountainDataCache.set(normalizedSetSlug, normalized);
      return normalized;
    }

    async function loadWikiPlants() {
      if (wikiPlantsCache) return wikiPlantsCache;
      const payload = await loadJsonCache('wiki-plants', RAW_WIKI_PLANTS_URL);
      wikiPlantsCache = Array.isArray(payload) ? payload : [];
      return wikiPlantsCache;
    }

    async function loadWikiAnimals() {
      if (wikiAnimalsCache) return wikiAnimalsCache;
      const payload = await loadJsonCache('wiki-animals', RAW_WIKI_ANIMALS_URL);
      wikiAnimalsCache = Array.isArray(payload) ? payload : [];
      return wikiAnimalsCache;
    }

    async function loadWikiPlantDiseases() {
      if (wikiPlantDiseasesCache) return wikiPlantDiseasesCache;
      const payload = await loadJsonCache('wiki-plant-diseases', RAW_WIKI_PLANT_DISEASES_URL);
      const entries = Array.isArray(payload?.diseases) ? payload.diseases : [];
      wikiPlantDiseasesCache = {
        metadata: payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
        diseases: entries
      };
      return wikiPlantDiseasesCache;
    }

    async function loadWikiForestHealthFlowchartBase64() {
      if (wikiForestHealthFlowchartBase64Cache) return wikiForestHealthFlowchartBase64Cache;
      const payload = await loadTextCache('wiki-forest-health-flowchart-b64', RAW_WIKI_FOREST_HEALTH_FLOWCHART_BASE64_URL);
      const normalized = String(payload || '').replace(/\s+/g, '');
      wikiForestHealthFlowchartBase64Cache = normalized;
      return wikiForestHealthFlowchartBase64Cache;
    }

    function resolveWikiSpeciesEntry(entries, slug) {
      const normalizedSlug = normalizeSlug(slug);
      if (!normalizedSlug || !Array.isArray(entries)) return null;
      return entries.find((entry) => normalizeSlug(entry?.slug || entry?.id) === normalizedSlug) || null;
    }

    function normalizeWikiMedia(entry, fallbackName = '') {
      const media = [];
      const push = (photo) => {
        if (!photo) return;
        if (typeof photo === 'string') {
          const contentUrl = normalizeTextForWeb(photo);
          if (!contentUrl) return;
          const displayUrl = buildCloudflareImageVariantUrl(contentUrl, { width: 1200, format: 'jpg' });
          media.push({
            url: contentUrl,
            contentUrl,
            displayUrl: displayUrl || contentUrl,
            alt: fallbackName ? `${fallbackName} photo` : 'Wiki photo',
            title: fallbackName || 'Wiki photo',
            caption: fallbackName || 'Wiki photo',
            creditText: RIGHTS_DEFAULTS.creditText,
            license: RIGHTS_DEFAULTS.licenseUrl
          });
          return;
        }
        const contentUrl = normalizeTextForWeb(photo.contentUrl || photo.url || photo.src || '');
        if (!contentUrl) return;
        const displayUrl = buildCloudflareImageVariantUrl(contentUrl, { width: 1200, format: 'jpg' });
        media.push({
          url: contentUrl,
          contentUrl,
          displayUrl: displayUrl || contentUrl,
          alt: normalizeTextForWeb(photo.alt || photo.altText || photo.description || photo.caption || `${fallbackName} photo`),
          title: normalizeTextForWeb(photo.title || photo.headline || photo.caption || photo.alt || fallbackName || 'Wiki photo'),
          caption: normalizeTextForWeb(photo.caption || photo.description || photo.extendedDescription || photo.alt || fallbackName || 'Wiki photo'),
          creditText: normalizeTextForWeb(photo.creditText || photo.credit || photo.author || RIGHTS_DEFAULTS.creditText),
          license: normalizeTextForWeb(photo.license || RIGHTS_DEFAULTS.licenseUrl)
        });
      };

      if (Array.isArray(entry?.photos)) entry.photos.forEach(push);
      if (!media.length && Array.isArray(entry?.imgs)) entry.imgs.forEach(push);
      if (!media.length && entry?.img) push(entry.img);

      const seen = new Set();
      return media.filter((item) => {
        const key = item.contentUrl || item.url;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function buildWikiImageObjects({ media = [], canonicalUrl, entityName, inLanguage = 'en' }) {
      return media.map((photo, index) => ({
        '@context': 'https://schema.org',
        '@type': 'ImageObject',
        '@id': `${canonicalUrl}#wiki-image-${index + 1}`,
        url: photo.url,
        contentUrl: photo.contentUrl || photo.url,
        name: normalizeTextForWeb(photo.title || photo.alt || `${entityName} photo ${index + 1}`),
        caption: normalizeTextForWeb(photo.caption || photo.alt || `${entityName} photo ${index + 1}`),
        description: normalizeTextForWeb(photo.caption || photo.alt || `${entityName} photo ${index + 1}`),
        inLanguage,
        license: photo.license || RIGHTS_DEFAULTS.licenseUrl,
        acquireLicensePage: RIGHTS_DEFAULTS.acquireLicensePageUrl,
        creditText: photo.creditText || RIGHTS_DEFAULTS.creditText,
        copyrightNotice: RIGHTS_DEFAULTS.copyrightNotice,
        creator: {
          '@type': 'Person',
          name: RIGHTS_DEFAULTS.creatorName,
          url: `${SITE}/about`
        }
      }));
    }

    function renderWikiLinks(items, buildUrl, subtitleBuilder = null) {
      if (!Array.isArray(items) || !items.length) {
        return '<li class="wiki-link-item" hidden><a class="wiki-link" href="/wiki">No entries</a></li>';
      }
      return items.map((item) => {
        const name = normalizeTextForWeb(item.name || item.peakName || item.commonName || item.slug || 'Entry');
        const slug = normalizeSlug(item.slug || item.id || item.peakSlug || '');
        if (!slug) return '';
        const url = buildUrl(slug);
        const subtitle = subtitleBuilder ? normalizeTextForWeb(subtitleBuilder(item) || '') : '';
        const searchText = normalizeTextForWeb(`${name} ${subtitle}`);
        const media = normalizeWikiMedia(item, name);
        const primaryMedia = media[0] || null;
        const iconUrl = primaryMedia
          ? buildCloudflareImageVariantUrl(primaryMedia.contentUrl || primaryMedia.url, { width: 96, format: 'webp', quality: 60 })
          : '';
        const iconHtml = iconUrl
          ? `<span class="wiki-link-icon-wrap"><img class="wiki-link-icon" src="${esc(iconUrl)}" alt="${esc(primaryMedia.alt || `${name} image`)}" loading="lazy" decoding="async" width="42" height="42"></span>`
          : '';
        const linkClass = iconHtml ? 'wiki-link has-icon' : 'wiki-link no-icon';
        return [
          `<li class="wiki-link-item" data-search="${esc(searchText)}">`,
          `<a class="${linkClass}" href="${url}">`,
          iconHtml,
          '<span class="wiki-link-text">',
          `${esc(name)}`,
          subtitle ? `<small class="wiki-link-subtitle">${esc(subtitle)}</small>` : '',
          '</span>',
          '</a>',
          '</li>'
        ].join('');
      }).join('\n');
    }

    function normalizeUrlArray(values) {
      const out = [];
      const seen = new Set();
      const push = (value) => {
        if (typeof value !== 'string') return;
        const normalized = value.trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        out.push(normalized);
      };
      if (Array.isArray(values)) values.forEach(push);
      else push(values);
      return out;
    }

    function mergeUrlArrays(...sources) {
      const out = [];
      const seen = new Set();
      sources.forEach((source) => {
        normalizeUrlArray(source).forEach((url) => {
          if (seen.has(url)) return;
          seen.add(url);
          out.push(url);
        });
      });
      return out;
    }

    function normalizeEntityCollection(values) {
      if (!Array.isArray(values)) return [];
      return values.filter((value) => {
        if (typeof value === 'string') return value.trim().length > 0;
        return value && typeof value === 'object';
      });
    }

    function filterAuthorityUrl(url) {
      if (typeof url !== 'string') return '';
      const trimmed = url.trim();
      if (!/^https?:\/\//i.test(trimmed)) return '';
      if (/\/search\b|[?&](q|query|search)=/i.test(trimmed)) return '';
      return trimmed;
    }

    function mergePeakSameAsSources(...sources) {
      const merged = [];
      const seen = new Set();
      sources.forEach((source) => {
        const list = Array.isArray(source) ? source : [source];
        list.forEach((entry) => {
          const normalized = filterAuthorityUrl(entry);
          if (!normalized || seen.has(normalized)) return;
          seen.add(normalized);
          merged.push(normalized);
        });
      });
      return merged;
    }

    function withEntityLinks(node, profile = null) {
      if (!node || typeof node !== 'object') return node;
      const sameAs = mergeUrlArrays(node.sameAs, profile?.sameAs, [INSTAGRAM_URL]);
      const next = { ...node };
      if (sameAs.length) {
        next.sameAs = sameAs;
      }

      const about = normalizeEntityCollection(profile?.about);
      if (about.length) {
        next.about = about;
      }

      const mentions = normalizeEntityCollection(profile?.mentions);
      if (mentions.length) {
        next.mentions = mentions;
      }

      const knowsAbout = normalizeEntityCollection(profile?.knowsAbout);
      if (knowsAbout.length) {
        next.knowsAbout = knowsAbout;
      }
      return next;
    }

    async function loadEntityLinks() {
      if (entityLinksCache) return entityLinksCache;
      const data = await loadJsonCache('entity-links', RAW_ENTITY_LINKS_URL);
      entityLinksCache = data && typeof data === 'object' ? data : {};
      return entityLinksCache;
    }

    async function loadBreadcrumbTaxonomy() {
      if (breadcrumbTaxonomyCache) return breadcrumbTaxonomyCache;
      const data = await loadJsonCache('breadcrumb-taxonomy', RAW_BREADCRUMB_TAXONOMY_URL);
      breadcrumbTaxonomyCache = data && typeof data === 'object' ? data : {};
      return breadcrumbTaxonomyCache;
    }

    function normalizeRangeName(value) {
      if (!value) return '';
      return String(value)
        .toLowerCase()
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[^\w\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function extractPrimaryRangeName(value) {
      const raw = String(value || '').trim();
      if (!raw) return '';
      const primary = raw.split(/[|/;,]/)[0] || raw;
      const beforeDash = primary.split(/\s*-\s*/)[0] || primary;
      return beforeDash.replace(/\.+$/, '').trim();
    }

    function slugifyRange(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    async function loadRangeLookup() {
      if (rangeLookupCache) return rangeLookupCache;
      const payload = await loadJsonCache('wmnf-ranges', RAW_WMNF_RANGES_URL);
      const map = new Map();
      const values = payload && typeof payload === 'object'
        ? (Array.isArray(payload) ? payload : Object.values(payload))
        : [];
      values.forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        const rangeName = String(entry.rangeName || entry.name || '').trim();
        const rangeSlug = String(entry.slug || '').trim() || slugifyRange(rangeName);
        if (!rangeName || !rangeSlug) return;
        map.set(normalizeRangeName(rangeName), { rangeName, rangeSlug });
      });
      rangeLookupCache = map;
      return rangeLookupCache;
    }

    async function resolveRangeContext(rangeValue) {
      const primaryRange = extractPrimaryRangeName(rangeValue);
      if (!primaryRange) return { rangeName: '', rangeSlug: '' };
      const lookup = await loadRangeLookup();
      const exact = lookup.get(normalizeRangeName(primaryRange));
      if (exact) return { rangeName: exact.rangeName, rangeSlug: exact.rangeSlug };
      return {
        rangeName: primaryRange,
        rangeSlug: slugifyRange(primaryRange)
      };
    }

    async function loadPeakExperiencesEn() {
      if (peakExperiencesCache) return peakExperiencesCache;
      const payload = await loadJsonCache('peak-experiences-en', RAW_PEAK_EXPERIENCES_EN_URL);
      peakExperiencesCache = payload && typeof payload === 'object' ? payload : {};
      return peakExperiencesCache;
    }

    function normalizeSlug(value) {
      return String(value || '')
        .trim()
        .toLowerCase();
    }

    function toNumber(value) {
      if (value === null || value === undefined || value === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    function buildLookupBySlug(payload) {
      const lookup = {};
      if (!payload) return lookup;
      if (Array.isArray(payload)) {
        payload.forEach((entry) => {
          if (!entry || typeof entry !== 'object') return;
          const slug = normalizeSlug(entry.slug || entry.peakSlug || entry.peak_id || entry.id);
          if (!slug) return;
          if (!lookup[slug]) {
            lookup[slug] = entry;
          }
        });
        return lookup;
      }
      if (typeof payload === 'object') {
        Object.entries(payload).forEach(([key, value]) => {
          if (!value || typeof value !== 'object') return;
          const slug = normalizeSlug(value.slug || key);
          if (!slug) return;
          if (!lookup[slug]) {
            lookup[slug] = value;
          }
        });
      }
      return lookup;
    }

    function getEasternMonthName(now = new Date()) {
      return now.toLocaleString('en-US', { month: 'long', timeZone: 'America/New_York' });
    }

    async function loadParkingLookup() {
      if (parkingLookupCache) return parkingLookupCache;
      const payload = await loadJsonCache('parking-data', RAW_PARKING_DATA_URL);
      parkingLookupCache = buildLookupBySlug(payload);
      return parkingLookupCache;
    }

    async function loadMonthlyWeather() {
      if (monthlyWeatherCache) return monthlyWeatherCache;
      const payload = await loadJsonCache('monthly-weather', RAW_MONTHLY_WEATHER_URL);
      monthlyWeatherCache = payload && typeof payload === 'object' ? payload : {};
      return monthlyWeatherCache;
    }

    async function loadPeakDifficultyLookup() {
      if (peakDifficultyCache) return peakDifficultyCache;
      const payload = await loadJsonCache('peak-difficulty', RAW_PEAK_DIFFICULTY_URL);
      peakDifficultyCache = payload && typeof payload === 'object' ? payload : {};
      return peakDifficultyCache;
    }

    async function loadRiskOverlayLookup() {
      if (riskOverlayCache) return riskOverlayCache;
      const payload = await loadJsonCache('risk-overlay', RAW_RISK_OVERLAY_URL);
      riskOverlayCache = buildLookupBySlug(payload);
      return riskOverlayCache;
    }

    async function loadCurrentConditions() {
      if (currentConditionsCache) return currentConditionsCache;
      const payload = await loadJsonCache('current-conditions', RAW_CURRENT_CONDITIONS_URL);
      currentConditionsCache = payload && typeof payload === 'object'
        ? payload
        : { generatedAt: '', expiresAt: '', advisories: [] };
      return currentConditionsCache;
    }

    function parseWindMph(value) {
      if (!value) return null;
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const text = String(value);
      const matches = text.match(/(\d+(?:\.\d+)?)/g);
      if (!matches || !matches.length) return null;
      const values = matches.map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry));
      if (!values.length) return null;
      return Math.max(...values);
    }

    function isIsoDateActive(expiresAt) {
      if (!expiresAt || typeof expiresAt !== 'string') return true;
      const ts = Date.parse(expiresAt);
      if (!Number.isFinite(ts)) return true;
      return ts > Date.now();
    }

    function advisoryAppliesToPeak(advisory, peakSlug, peakId) {
      if (!advisory || typeof advisory !== 'object') return false;
      const slugList = Array.isArray(advisory.affectedSlugs) ? advisory.affectedSlugs.map(normalizeSlug) : [];
      const idList = Array.isArray(advisory.affectedPeaks) ? advisory.affectedPeaks.map((v) => String(v)) : [];
      if (!slugList.length && !idList.length) return true;
      if (slugList.includes(normalizeSlug(peakSlug))) return true;
      if (peakId !== null && peakId !== undefined && idList.includes(String(peakId))) return true;
      return false;
    }

    function normalizeCurrentConditionsAdvisories(payload, peakSlug = '', peakId = null) {
      const advisories = Array.isArray(payload?.advisories) ? payload.advisories : [];
      return advisories
        .filter((advisory) => advisoryAppliesToPeak(advisory, peakSlug, peakId))
        .filter((advisory) => isIsoDateActive(advisory.expires || advisory.expiresAt || payload?.expiresAt))
        .map((advisory) => ({
          level: String(advisory.level || advisory.severity || 'moderate').toLowerCase(),
          title: String(advisory.type || advisory.title || 'Trail advisory').trim(),
          description: String(advisory.description || advisory.message || '').trim(),
          expiresAt: advisory.expires || advisory.expiresAt || payload?.expiresAt || ''
        }));
    }

    async function fetchNwsSnapshot(lat, lon) {
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
      const cached = nwsWeatherCache.get(key);
      const now = Date.now();
      if (cached && now - cached.ts < 20 * 60 * 1000) {
        return cached.value;
      }
      try {
        const headers = {
          'User-Agent': 'NH48-SSR/1.0 (https://nh48.info/contact)',
          Accept: 'application/geo+json'
        };
        const pointsResp = await fetch(`https://api.weather.gov/points/${lat},${lon}`, { headers });
        if (!pointsResp.ok) {
          nwsWeatherCache.set(key, { ts: now, value: null });
          return null;
        }
        const pointsPayload = await pointsResp.json();
        const forecastUrl = pointsPayload?.properties?.forecast;
        if (!forecastUrl) {
          nwsWeatherCache.set(key, { ts: now, value: null });
          return null;
        }
        const forecastResp = await fetch(forecastUrl, { headers });
        if (!forecastResp.ok) {
          nwsWeatherCache.set(key, { ts: now, value: null });
          return null;
        }
        const forecastPayload = await forecastResp.json();
        const period = Array.isArray(forecastPayload?.properties?.periods)
          ? forecastPayload.properties.periods[0]
          : null;
        if (!period) {
          nwsWeatherCache.set(key, { ts: now, value: null });
          return null;
        }
        const rawTemp = Number(period.temperature);
        const tempUnit = String(period.temperatureUnit || 'F').toUpperCase();
        const temperatureF = Number.isFinite(rawTemp)
          ? (tempUnit === 'C' ? (rawTemp * 9) / 5 + 32 : rawTemp)
          : null;
        const snapshot = {
          source: 'nws',
          fetchedAt: new Date().toISOString(),
          summary: String(period.shortForecast || period.detailedForecast || '').trim(),
          windMph: parseWindMph(period.windSpeed),
          temperatureF
        };
        nwsWeatherCache.set(key, { ts: now, value: snapshot });
        return snapshot;
      } catch (_) {
        nwsWeatherCache.set(key, { ts: now, value: null });
        return null;
      }
    }

    async function buildWeatherSnapshot(coords) {
      const lat = toNumber(coords?.lat);
      const lon = toNumber(coords?.lon);
      const nws = await fetchNwsSnapshot(lat, lon);
      if (nws) return nws;

      const monthly = await loadMonthlyWeather();
      const monthName = getEasternMonthName();
      const monthEntry = monthly?.[monthName];
      if (!monthEntry || typeof monthEntry !== 'object') return null;
      const avgWindMph = toNumber(monthEntry.avgWindMph);
      const avgTempF = toNumber(monthEntry.avgTempF);
      const gustMph = toNumber(monthEntry.avgWindGustMph);
      return {
        source: 'monthly-climatology',
        fetchedAt: new Date().toISOString(),
        summary: `${monthName} averages at higher summits`,
        windMph: avgWindMph,
        temperatureF: avgTempF,
        windGustMph: gustMph
      };
    }

    function computeRiskSeverity({ riskEntry, weatherSnapshot, currentAdvisories }) {
      let score = 0;
      const factors = Array.isArray(riskEntry?.risk_factors) ? riskEntry.risk_factors : [];
      if (factors.includes('SevereWeather')) score += 2;
      if (factors.includes('AboveTreelineExposure')) score += 2;
      if (factors.includes('LongBailout')) score += 1;
      if (factors.includes('NavigationComplexity')) score += 1;
      if (factors.includes('LimitedWater')) score += 1;

      const windMph = toNumber(weatherSnapshot?.windMph);
      const tempF = toNumber(weatherSnapshot?.temperatureF);
      if (windMph !== null && windMph >= 45) score += 2;
      else if (windMph !== null && windMph >= 30) score += 1;
      if (tempF !== null && tempF <= 10) score += 2;
      else if (tempF !== null && tempF <= 20) score += 1;

      const advisoryCount = Array.isArray(currentAdvisories) ? currentAdvisories.length : 0;
      if (advisoryCount >= 2) score += 2;
      else if (advisoryCount === 1) score += 1;

      if (score >= 6) return 'high';
      if (score >= 3) return 'moderate';
      return 'low';
    }

    function buildAlertBannerHtml(model, isFrench = false) {
      if (!model) return '';
      const level = model.level === 'high' ? 'high' : model.level === 'moderate' ? 'moderate' : 'info';
      const border = level === 'high' ? '#dc2626' : level === 'moderate' ? '#d97706' : '#2563eb';
      const bg = level === 'high' ? 'rgba(127,29,29,0.18)' : level === 'moderate' ? 'rgba(146,64,14,0.18)' : 'rgba(30,58,138,0.18)';
      const title = esc(model.title || (isFrench ? 'Alerte sentier' : 'Trail advisory'));
      const message = esc(model.message || '');
      const ctaLabel = esc(model.ctaLabel || (isFrench ? 'Voir le bulletin météo' : 'View weather briefing'));
      const ctaHref = esc(model.ctaHref || 'https://www.mountwashington.org/experience-the-weather/higher-summit-forecast.aspx');
      const expiresLine = model.expiresAt
        ? `<p style="margin:6px 0 0 0;opacity:.82;font-size:.87rem;">${esc(isFrench ? 'Expiration:' : 'Expires:')} ${esc(model.expiresAt)}</p>`
        : '';
      return `
<section data-nh48-alert-banner="true" style="margin:16px auto 0 auto;max-width:1100px;padding:14px 16px;border:1px solid ${border};background:${bg};border-radius:12px;color:#e5e7eb;">
  <p style="margin:0;font-weight:700;letter-spacing:.01em;">${title}</p>
  <p style="margin:6px 0 0 0;line-height:1.45;">${message}</p>
  ${expiresLine}
  <p style="margin:10px 0 0 0;">
    <a href="${ctaHref}" target="_blank" rel="noopener" style="color:#86efac;text-decoration:underline;">${ctaLabel}</a>
  </p>
</section>`;
    }

    function injectBodyStartHtml(html, snippet) {
      if (!snippet || typeof snippet !== 'string') return html;
      if (/<body[^>]*>/i.test(html)) {
        return html.replace(/<body([^>]*)>/i, (match, attrs) => `<body${attrs}>\n${snippet}`);
      }
      return `${snippet}\n${html}`;
    }

    function injectMainStartHtml(html, snippet) {
      if (!snippet || typeof snippet !== 'string') return html;
      if (/<main[^>]*>/i.test(html)) {
        return html.replace(/<main([^>]*)>/i, (match, attrs) => `<main${attrs}>\n${snippet}`);
      }
      return injectBodyStartHtml(html, snippet);
    }

    function injectPeakAdvisoryHtml(html, snippet) {
      if (!snippet || typeof snippet !== 'string') return html;

      // Preferred placement: explicit advisory slot in peak template.
      if (/<div[^>]+id=["']peakAdvisorySlot["'][^>]*>\s*<\/div>/i.test(html)) {
        return html.replace(
          /<div([^>]*)id=["']peakAdvisorySlot["']([^>]*)>\s*<\/div>/i,
          `<div$1id="peakAdvisorySlot"$2>\n${snippet}\n</div>`
        );
      }

      // Fallback placement: immediately after monthly weather section.
      const monthlySectionPattern = /(<section[^>]+id=["']monthlyWeatherPanel["'][^>]*>[\s\S]*?<\/section>)/i;
      if (monthlySectionPattern.test(html)) {
        return html.replace(monthlySectionPattern, `$1\n${snippet}`);
      }

      // Last-resort placement: before footer placeholder, never before nav.
      if (/<div[^>]+id=["']footer-placeholder["'][^>]*>/i.test(html)) {
        return html.replace(/<div([^>]*)id=["']footer-placeholder["']([^>]*)>/i, `${snippet}\n<div$1id="footer-placeholder"$2>`);
      }

      return html;
    }

    const PEAK_UI_PARITY_IDS = [
      'printBtn',
      'shareBtn',
      'unitsSelect',
      'getDirectionsBtn',
      'routesGrid',
      'relatedTrailsGrid',
      'parkingAccessGrid',
      'difficultyMetricsGrid',
      'riskPrepGrid',
      'wildernessSafetyGrid',
      'monthlyWeatherPanel',
      'monthlyWeatherMonthSelect',
      'panelReaderModal',
      'panelReaderContent'
    ];

    function buildPeakParityAnchorBlock(missingIds) {
      if (!Array.isArray(missingIds) || !missingIds.length) return '';
      const idSet = new Set(missingIds);
      const nodes = [];
      const pushNode = (html) => {
        if (!html) return;
        nodes.push(html);
      };

      if (idSet.has('printBtn')) pushNode('<button type="button" id="printBtn"></button>');
      if (idSet.has('shareBtn')) pushNode('<button type="button" id="shareBtn"></button>');
      if (idSet.has('unitsSelect')) {
        pushNode('<select id="unitsSelect"><option value="imperial">Imperial</option><option value="metric">Metric</option></select>');
      }
      if (idSet.has('getDirectionsBtn')) pushNode('<button type="button" id="getDirectionsBtn"></button>');
      if (idSet.has('routesGrid')) pushNode('<div id="routesGrid"></div>');
      if (idSet.has('relatedTrailsGrid')) pushNode('<div id="relatedTrailsGrid"></div>');
      if (idSet.has('parkingAccessGrid')) pushNode('<div id="parkingAccessGrid"></div>');
      if (idSet.has('difficultyMetricsGrid')) pushNode('<div id="difficultyMetricsGrid"></div>');
      if (idSet.has('riskPrepGrid')) pushNode('<div id="riskPrepGrid"></div>');
      if (idSet.has('wildernessSafetyGrid')) pushNode('<div id="wildernessSafetyGrid">Data TBD for this route.</div>');
      if (idSet.has('monthlyWeatherPanel')) pushNode('<section id="monthlyWeatherPanel"></section>');
      if (idSet.has('monthlyWeatherMonthSelect')) {
        pushNode('<select id="monthlyWeatherMonthSelect"><option value="current">Current month</option></select>');
      }
      if (idSet.has('panelReaderModal')) pushNode('<div id="panelReaderModal"></div>');
      if (idSet.has('panelReaderContent')) pushNode('<div id="panelReaderContent"></div>');

      if (!nodes.length) return '';
      return [
        '<div data-peak-ui-parity="true" hidden aria-hidden="true" style="display:none!important;">',
        ...nodes,
        '</div>'
      ].join('\n');
    }

    function ensurePeakParityAnchors(html) {
      if (typeof html !== 'string' || !html) return html;
      const missing = PEAK_UI_PARITY_IDS.filter((id) => !new RegExp(`id=["']${escRegExp(id)}["']`, 'i').test(html));
      if (!missing.length) return html;
      const block = buildPeakParityAnchorBlock(missing);
      if (!block) return html;
      if (/<\/body>/i.test(html)) {
        return html.replace(/<\/body>/i, `${block}\n</body>`);
      }
      return `${html}\n${block}`;
    }

    function normalizePrerenderHeroAlt(html, heroImageAlt) {
      if (typeof html !== 'string' || !html) return html;
      const normalizedAlt = normalizeTextForWeb(heroImageAlt);
      if (!normalizedAlt) return html;
      const escapedAlt = esc(normalizedAlt);
      let output = html;

      output = output.replace(
        /(<meta\b[^>]*property=["']og:image:alt["'][^>]*content=["'])[^"']*(["'][^>]*>)/i,
        `$1${escapedAlt}$2`
      );
      output = output.replace(
        /(<meta\b[^>]*name=["']twitter:image:alt["'][^>]*content=["'])[^"']*(["'][^>]*>)/i,
        `$1${escapedAlt}$2`
      );
      output = output.replace(
        /(<figure\b[^>]*class=["'][^"']*\bhero-image\b[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*\balt=["'])[^"']*(["'][^>]*>)/i,
        `$1${escapedAlt}$2`
      );

      return output;
    }

    async function buildSitewideAdvisoryBanner(isFrench = false) {
      const currentConditions = await loadCurrentConditions();
      const advisories = normalizeCurrentConditionsAdvisories(currentConditions);
      const washingtonSnapshot = await buildWeatherSnapshot({ lat: 44.2705, lon: -71.3033 });
      const windMph = toNumber(washingtonSnapshot?.windMph);
      const showWeatherPrompt = Number.isFinite(windMph) && windMph >= 35;
      if (!advisories.length && !showWeatherPrompt) {
        return '';
      }
      const advisory = advisories[0] || null;
      const title = advisory?.title || (isFrench ? 'Bulletin conditions White Mountains' : 'White Mountains conditions bulletin');
      const message = advisory?.description
        || (isFrench
          ? `Vent estime sur les sommets: ${Math.round(windMph)} mph. Verifiez la meteo avant votre itineraire.`
          : `Estimated summit wind: ${Math.round(windMph)} mph. Check weather before committing to exposed routes.`);
      return buildAlertBannerHtml({
        level: advisories.length ? 'moderate' : 'info',
        title,
        message,
        expiresAt: advisory?.expiresAt || currentConditions?.expiresAt || '',
        ctaHref: 'https://www.mountwashington.org/experience-the-weather/higher-summit-forecast.aspx',
        ctaLabel: isFrench ? 'Voir le bulletin sommital' : 'Open higher summits forecast'
      }, isFrench);
    }

    function collectJsonLdIds(block, ids) {
      if (!block || typeof block !== 'object') return;
      if (Array.isArray(block['@graph'])) {
        block['@graph'].forEach((node) => collectJsonLdIds(node, ids));
        return;
      }
      const nodeId = typeof block['@id'] === 'string' ? block['@id'] : '';
      if (nodeId) ids.add(nodeId);
    }

    function mergeJsonLdBlocks(blocks, globalNodes) {
      const merged = Array.isArray(blocks) ? [...blocks] : [];
      const ids = new Set();
      merged.forEach((block) => collectJsonLdIds(block, ids));

      (globalNodes || []).forEach((node) => {
        if (!node || typeof node !== 'object') return;
        const nodeId = typeof node['@id'] === 'string' ? node['@id'] : '';
        if (nodeId && ids.has(nodeId)) return;
        merged.push(node);
        if (nodeId) ids.add(nodeId);
      });
      return merged;
    }

    async function loadGlobalSchemaNodes() {
      if (globalSchemaCache) return globalSchemaCache;

      const [orgData, personData, websiteData, entityLinks] = await Promise.all([
        loadJsonCache('schema:org', RAW_ORGANIZATION_URL),
        loadJsonCache('schema:person', RAW_PERSON_URL),
        loadJsonCache('schema:website', RAW_WEBSITE_URL),
        loadEntityLinks()
      ]);

      const fallbackOrganization = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${SITE}/#organization`,
        name: 'NH48pics',
        url: `${SITE}/`,
        logo: {
          '@type': 'ImageObject',
          url: DEFAULT_LOGO,
          width: 512,
          height: 512
        },
        sameAs: [
          INSTAGRAM_URL,
          'https://www.facebook.com/natedumpspics',
          'https://www.etsy.com/shop/NH48pics',
          NH48_APP_URL
        ]
      };
      const fallbackPerson = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': `${SITE}/#person-nathan-sobol`,
        name: 'Nathan Sobol',
        url: `${SITE}/about/`,
        sameAs: [
          INSTAGRAM_URL,
          'https://www.facebook.com/natedumpspics',
          'https://www.etsy.com/shop/NH48pics',
          NH48_APP_URL
        ],
        worksFor: { '@id': `${SITE}/#organization` }
      };
      const fallbackWebsite = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        name: 'NH48pics',
        url: `${SITE}/`,
        sameAs: [INSTAGRAM_URL, NH48_APP_URL],
        publisher: { '@id': `${SITE}/#organization` }
      };

      const nodes = [
        withEntityLinks(orgData || fallbackOrganization, entityLinks?.organization),
        withEntityLinks(personData || fallbackPerson, entityLinks?.person),
        withEntityLinks(websiteData || fallbackWebsite, entityLinks?.website)
      ].filter(Boolean);

      globalSchemaCache = nodes;
      return nodes;
    }

    async function loadCreativeWorks() {
      if (creativeWorksCache) return creativeWorksCache;
      const data = await loadJsonCache('creativeWorks', RAW_CREATIVEWORKS_URL);
      creativeWorksCache = data && typeof data === 'object' ? data : {};
      return creativeWorksCache;
    }

    async function loadCollections() {
      if (collectionsCache) return collectionsCache;
      const data = await loadJsonCache('collections', RAW_COLLECTIONS_URL);
      collectionsCache = data && typeof data === 'object' ? data : {};
      return collectionsCache;
    }

    function buildCreativeSameAs() {
      return [
        SITE_URL,
        NH48_APP_URL,
        INSTAGRAM_URL,
        'https://www.facebook.com/natedumpspics',
        'https://www.etsy.com/shop/NH48pics'
      ];
    }

    function buildCreativeWorkNode({
      entry,
      fallbackType,
      id,
      url,
      name,
      description,
      thumbnailUrl,
      associatedMedia,
      datePublished,
      imageObjects
    }) {
      const type = entry?.type || fallbackType || 'CreativeWork';
      const normalizedType = Array.isArray(type) ? type : [type];
      const isHowTo = normalizedType.includes('HowTo') || normalizedType.includes('EducationalCourse');
      const isArticle = normalizedType.includes('BlogPosting') || normalizedType.includes('Article');
      const isPhotograph = normalizedType.includes('Photograph');
      const imageRef = (() => {
        if (entry?.imageUrl) return entry.imageUrl;
        if (entry?.thumbnail) return entry.thumbnail;
        if (!entry?.imageSlug || !Array.isArray(imageObjects)) return undefined;
        const match = imageObjects.find((img) => {
          const imgId = typeof img?.['@id'] === 'string' ? img['@id'] : '';
          const imgUrl = typeof img?.url === 'string' ? img.url : '';
          return imgId.includes(entry.imageSlug) || imgUrl.includes(entry.imageSlug);
        });
        return match?.['@id'] ? { '@id': match['@id'] } : match?.url;
      })();
      const creativeType = normalizedType.includes('CreativeWork')
        ? normalizedType
        : ['CreativeWork', ...normalizedType];
      const node = {
        '@context': 'https://schema.org',
        '@type': isHowTo || isArticle ? normalizedType : creativeType,
        '@id': id,
        url,
        name: entry?.name || name,
        headline: isArticle ? (entry?.name || name) : undefined,
        description: entry?.description || description,
        thumbnailUrl: entry?.thumbnail || thumbnailUrl,
        datePublished: entry?.datePublished || datePublished,
        publisher: { '@id': `${SITE}/#organization` },
        creator: { '@id': `${SITE}/#person-nathan-sobol` },
        sameAs: buildCreativeSameAs(),
        image: imageRef || undefined,
        mainEntityOfPage: { '@id': url },
        isPartOf: { '@id': `${SITE}/#organization` },
        associatedMedia: associatedMedia?.length ? associatedMedia : undefined
      };
      if (isHowTo) {
        const steps = Array.isArray(entry?.steps) ? entry.steps : [];
        node.step = steps.map((step, index) => ({
          '@type': 'HowToStep',
          name: String(step),
          position: index + 1
        }));
      }
      if (isPhotograph) {
        node['@type'] = ['CreativeWork', 'Photograph'];
      }
      Object.keys(node).forEach((key) => node[key] === undefined && delete node[key]);
      return node;
    }

    function buildCollectionObject({ entry, canonicalUrl, items }) {
      if (!entry || typeof entry !== 'object') return null;
      const hasPart = Array.isArray(entry.items) && entry.items.length
        ? entry.items.map((slug) => ({ '@id': `${SITE}/${slug}` }))
        : items;
      if (!hasPart || !hasPart.length) return null;
      return {
        '@context': 'https://schema.org',
        '@type': ['Collection', 'ImageGallery'],
        '@id': `${canonicalUrl}#collection`,
        name: entry.name,
        description: entry.description,
        hasPart,
        publisher: { '@id': `${SITE}/#organization` },
        creator: { '@id': `${SITE}/#person-nathan-sobol` }
      };
    }

    function buildSportsActivityLocation(entry, canonicalUrl) {
      const loc = entry?.sportsLocation;
      if (!loc || typeof loc !== 'object') return null;
      const latitude = Number(loc.latitude);
      const longitude = Number(loc.longitude);
      const address = {
        '@type': 'PostalAddress',
        addressLocality: loc.addressLocality,
        addressRegion: loc.addressRegion,
        addressCountry: loc.addressCountry
      };
      Object.keys(address).forEach((key) => address[key] === undefined && delete address[key]);
      const node = {
        '@context': 'https://schema.org',
        '@type': 'SportsActivityLocation',
        '@id': `${canonicalUrl}#sports-location`,
        name: loc.name || 'Trailhead',
        description: loc.description,
        sport: 'Hiking',
        geo: Number.isFinite(latitude) && Number.isFinite(longitude)
          ? { '@type': 'GeoCoordinates', latitude, longitude }
          : undefined,
        containedInPlace: { '@id': `${SITE}/#place-wmnf` },
        address
      };
      if (!Object.keys(address).length) {
        delete node.address;
      }
      return node;
    }

    async function loadTextCache(key, url) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'NH48-SSR/1.0' },
          cf: { cacheTtl: 0, cacheEverything: false }
        });
        if (!res.ok) {
          console.error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
          return '';
        }
        const text = await res.text();
        if (text.length < 50) {
          console.error(`Template too small (${text.length} bytes): ${url}`);
          return '';
        }
        return text;
      } catch (err) {
        console.error(`Error fetching ${url}:`, err.message);
        return '';
      }
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

    function escRegExp(value) {
      return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function getEasternMonthNumber(now = new Date()) {
      const monthText = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        month: 'numeric'
      }).format(now);
      const month = Number(monthText);
      return Number.isFinite(month) ? month : (now.getUTCMonth() + 1);
    }

    function getSeasonHint(now = new Date()) {
      const month = getEasternMonthNumber(now);
      if (month === 12 || month <= 2) return 'winter';
      if (month >= 3 && month <= 5) return 'spring';
      if (month >= 6 && month <= 8) return 'summer';
      return 'fall';
    }

    function injectPeakSeasonHintSignals(html, seasonHint) {
      if (typeof html !== 'string' || !html) return html;
      const safeHint = String(seasonHint || '').trim().toLowerCase();
      if (!safeHint) return html;
      let output = html;
      const metaTag = `<meta name="nh48:season-hint" content="${esc(safeHint)}" />`;
      if (/<meta\b[^>]*name=["']nh48:season-hint["']/i.test(output)) {
        output = output.replace(
          /(<meta\b[^>]*name=["']nh48:season-hint["'][^>]*content=["'])[^"']*(["'][^>]*>)/i,
          `$1${esc(safeHint)}$2`
        );
      } else {
        output = output.replace(/<\/head>/i, `${metaTag}\n</head>`);
      }

      if (/<body[^>]*\bdata-season-hint=/i.test(output)) {
        output = output.replace(
          /(<body[^>]*\bdata-season-hint=["'])[^"']*(["'][^>]*>)/i,
          `$1${esc(safeHint)}$2`
        );
      } else {
        output = output.replace(/<body([^>]*)>/i, `<body$1 data-season-hint="${esc(safeHint)}">`);
      }
      return output;
    }

    function stripClientNavScripts(html) {
      // Don't strip any scripts - the template's nav/footer loading scripts
      // are harmless and trying to remove them was breaking the page
      // The server-injected nav/footer will take precedence if placeholders exist
      return html;
    }

    function markNavActive(navHtml, pathname) {
      if (!navHtml) return navHtml;
      const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
      const stripCurrentClass = (classValue = '') =>
        String(classValue)
          .split(/\s+/)
          .filter((token) => token && token !== 'current')
          .join(' ');

      const updateClassAttr = (attrs, isActive) => {
        const classPattern = /(^|\s)class=(["'])([^"']*)\2/i;
        if (classPattern.test(attrs)) {
          return attrs.replace(classPattern, (match, prefix, quote, classValue) => {
            const cleaned = stripCurrentClass(classValue);
            const finalClasses = isActive ? [cleaned, 'current'].filter(Boolean).join(' ') : cleaned;
            return finalClasses ? `${prefix}class=${quote}${finalClasses}${quote}` : '';
          });
        }
        return isActive ? `${attrs} class="current"` : attrs;
      };

      return navHtml.replace(/<a\s+([^>]*?)href="([^"]+)"([^>]*)>/gi, (match, pre, href, post) => {
        const urlPath = href.replace(SITE, '');
        const normalizedHref = urlPath.endsWith('/') && urlPath.length > 1 ? urlPath.slice(0, -1) : urlPath;
        const isActive = Boolean(
          normalizedHref &&
          (normalizedHref === normalized || normalizedHref === `${normalized}/index.html`)
        );
        let attrs = `${pre || ''}href="${href}"${post || ''}`;
        attrs = attrs.replace(/(^|\s)aria-current=(["'])[^"']*\2/gi, '');
        attrs = updateClassAttr(attrs, isActive);
        if (isActive) {
          attrs += ' aria-current="page"';
        }
        return `<a ${attrs}>`;
      });
    }

    function injectNavFooter(html, navHtml, footerHtml, pathname, routeId = '', bodyDataAttrs = null, injectOptions = null) {
      let output = stripClientNavScripts(html);
      const includeFooter = !(injectOptions && injectOptions.includeFooter === false);
      if (navHtml) {
        const markedNav = markNavActive(navHtml, pathname);
        const navPlaceholderPattern = /<div\b[^>]*id=["']nav-placeholder["'][^>]*>[\s\S]*?<\/div>/i;
        if (navPlaceholderPattern.test(output)) {
          output = output.replace(navPlaceholderPattern, markedNav);
        } else {
          output = output.replace(/<body([^>]*)>/i, (match, attrs) => `<body${attrs}>\n${markedNav}`);
        }
      }
      if (includeFooter && footerHtml) {
        const footerPlaceholderPattern = /<div\b[^>]*id=["']footer-placeholder["'][^>]*>[\s\S]*?<\/div>/i;
        if (footerPlaceholderPattern.test(output)) {
          output = output.replace(footerPlaceholderPattern, footerHtml);
        } else {
          output = output.replace(/<\/body>/i, `${footerHtml}\n</body>`);
        }
      }
      if (routeId) {
        output = output.replace(/<body([^>]*)>/i, (match, attrs) => {
          let nextAttrs = attrs;
          if (!/data-route=/i.test(nextAttrs)) {
            nextAttrs += ` data-route="${routeId}"`;
          }
          if (bodyDataAttrs && typeof bodyDataAttrs === 'object') {
            for (const [key, value] of Object.entries(bodyDataAttrs)) {
              if (value === null || value === undefined || value === '') continue;
              const attrName = `data-${String(key).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
              const attrRegex = new RegExp(`\\s${attrName}=`, 'i');
              if (attrRegex.test(nextAttrs)) continue;
              nextAttrs += ` ${attrName}="${esc(String(value))}"`;
            }
          }
          return `<body${nextAttrs}>`;
        });
      }
      return output;
    }

    function stripHeadMeta(html) {
      // Only strip specific meta tags that we'll replace with SSR versions
      // Keep everything else intact to avoid breaking the page structure
      let result = html;

      // Remove title tag
      result = result.replace(/<title[^>]*>[^<]*<\/title>/gi, '');

      // Remove specific meta tags (single line each)
      result = result.replace(/<meta[^>]*name\s*=\s*["']description["'][^>]*>/gi, '');
      result = result.replace(/<meta[^>]*name\s*=\s*["']keywords["'][^>]*>/gi, '');
      result = result.replace(/<meta[^>]*name\s*=\s*["']robots["'][^>]*>/gi, '');
      result = result.replace(/<meta[^>]*property\s*=\s*["']og:[^"']*["'][^>]*>/gi, '');
      result = result.replace(/<meta[^>]*name\s*=\s*["']twitter:[^"']*["'][^>]*>/gi, '');
      result = result.replace(/<meta[^>]*property\s*=\s*["']twitter:[^"']*["'][^>]*>/gi, '');

      // Remove canonical and alternate links
      result = result.replace(/<link[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi, '');
      result = result.replace(/<link[^>]*rel\s*=\s*["']alternate["'][^>]*>/gi, '');

      // Note: We intentionally do NOT remove JSON-LD scripts here
      // Duplicate JSON-LD is harmless and trying to remove it was breaking the page

      return result;
    }

    function stripJsonLdScripts(html) {
      if (typeof html !== 'string' || !html) return html;
      return html.replace(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
    }

    function stripBreadcrumbJsonLdScripts(html) {
      if (typeof html !== 'string' || !html) return html;
      return html.replace(
        /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
        (match) => (/"@type"\s*:\s*"BreadcrumbList"|["']BreadcrumbList["']/i.test(match) ? '' : match)
      );
    }

    function stripBreadcrumbMicrodata(html) {
      if (typeof html !== 'string' || !html) return html;
      return html.replace(
        /<nav\b[^>]*(?:aria-label=["'][^"']*(?:Breadcrumb|Fil d[^"']*)["']|class=["'][^"']*breadcrumb[^"']*["'])[^>]*>[\s\S]*?<\/nav>/gi,
        (block) => block
          .replace(/\sitemscope(?:=(?:"[^"]*"|'[^']*'))?/gi, '')
          .replace(/\sitemtype=(?:"[^"]*"|'[^']*')/gi, '')
          .replace(/\sitemprop=(?:"[^"]*"|'[^']*')/gi, '')
      );
    }

    function injectBuildDate(html, isoString) {
      if (!isoString) return html;
      const scriptTag = `<script>window.NH48_BUILD_DATE=${JSON.stringify(isoString)};</script>`;
      const footerScriptPattern = /<script\s+src=["']\/js\/unified-footer\.js["'][^>]*><\/script>/i;
      if (footerScriptPattern.test(html)) {
        return html.replace(footerScriptPattern, `${scriptTag}\n$&`);
      }
      return html.replace(/<\/head>/i, `${scriptTag}\n</head>`);
    }

    async function fetchBuildMeta(url) {
      try {
        const resp = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!data || typeof data.buildDate !== 'string') return null;
        return data;
      } catch (err) {
        return null;
      }
    }

    function buildMetaBlock(meta) {
      const tags = [
        `<title>${esc(meta.title)}</title>`,
        `<meta name="description" content="${esc(meta.description)}" />`,
        `<meta name="robots" content="${meta.robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />`,
        `<meta name="googlebot" content="${meta.robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}" />`,
        `<meta name="bingbot" content="${meta.robots || 'index, follow, max-image-preview:large'}" />`,
        `<meta name="author" content="${meta.author || 'Nathan Sobol'}" />`,
        `<meta name="publisher" content="NH48pics" />`,
        `<meta name="application-name" content="NH48pics" />`,
        `<meta name="theme-color" content="#0a0a0a" />`,
        `<meta property="og:site_name" content="${meta.siteName || 'NH48pics'}" />`,
        `<meta property="og:type" content="${meta.ogType || 'website'}" />`,
        `<meta property="og:locale" content="${meta.locale || 'en_US'}" />`,
        `<meta property="og:title" content="${esc(meta.title)}" />`,
        `<meta property="og:description" content="${esc(meta.description)}" />`,
        `<meta property="og:image" content="${meta.image || DEFAULT_IMAGE}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta property="og:image:alt" content="${esc(meta.imageAlt || meta.title)}" />`,
        `<meta property="og:logo" content="${meta.logo || DEFAULT_LOGO}" />`,
        `<meta property="og:url" content="${meta.canonical}" />`,
        `<meta name="twitter:card" content="${meta.twitterCard || 'summary_large_image'}" />`,
        `<meta name="twitter:site" content="@nate_dumps_pics" />`,
        `<meta name="twitter:creator" content="@nate_dumps_pics" />`,
        `<meta name="twitter:url" content="${meta.canonical}" />`,
        `<meta name="twitter:title" content="${esc(meta.title)}" />`,
        `<meta name="twitter:description" content="${esc(meta.description)}" />`,
        `<meta name="twitter:image" content="${meta.image || DEFAULT_IMAGE}" />`,
        `<meta name="twitter:image:alt" content="${esc(meta.imageAlt || meta.title)}" />`,
        `<link rel="canonical" href="${meta.canonical}" />`
      ];
      if (meta.alternateEn && meta.alternateFr) {
        tags.push(`<link rel="alternate" hreflang="en" href="${meta.alternateEn}" />`);
        tags.push(`<link rel="alternate" hreflang="fr" href="${meta.alternateFr}" />`);
        tags.push(`<link rel="alternate" hreflang="x-default" href="${meta.alternateEn}" />`);
      }
      if (meta.jsonLd && meta.jsonLd.length) {
        for (const block of meta.jsonLd) {
          tags.push(`<script type="application/ld+json">${JSON.stringify(block).replace(/</g, '\\u003c')}</script>`);
        }
      }
      return tags.join('\n');
    }

    // Normalize strings for web output and repair common mojibake sequences.
    function normalizeTextForWeb(input) {
      if (!input) return '';
      let s = String(input);

      try {
        if (/[\u00C3\u00C2\u00E2]/.test(s)) {
          const bytes = new Uint8Array(s.length);
          for (let i = 0; i < s.length; i += 1) {
            bytes[i] = s.charCodeAt(i) & 0xff;
          }
          s = new TextDecoder('utf-8').decode(bytes);
        }
      } catch (_) {
        // Keep original text if decoding fails.
      }

      s = s
        .replace(/\u2018|\u2019/g, "'")
        .replace(/\u201C|\u201D/g, '"')
        .replace(/\u2013|\u2014/g, ' - ');

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
      return bits.length ? bits.join(' " ') : '';
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

    function extractPhotoSequenceLabel(photo) {
      const source = pickFirstNonEmpty(photo.photoId, photo.filename, photo.url, photo.originalUrl);
      if (!source) return '';
      let basename = '';
      try {
        const parsed = new URL(source, SITE);
        const parts = String(parsed.pathname || '').split('/').filter(Boolean);
        basename = parts.length ? parts[parts.length - 1] : '';
      } catch (_) {
        basename = String(source).split(/[?#]/)[0].split('/').pop() || '';
      }
      const normalized = normalizeTextForWeb(basename);
      if (!normalized) return '';
      const doubleUnderscoreMatch = normalized.match(/__(\d{1,4})/);
      if (doubleUnderscoreMatch) {
        return `Photo ${Number(doubleUnderscoreMatch[1])}`;
      }
      const trailingNumberMatch = normalized.match(/(?:^|[-_])(\d{3,4})(?:[-_.]|$)/);
      if (trailingNumberMatch) {
        return `Photo ${Number(trailingNumberMatch[1])}`;
      }
      return '';
    }

    function buildPhotoTitleUnique(peakName, photo) {
      const explicit = pickFirstNonEmpty(photo.headline, photo.title, photo.altText, photo.caption);
      if (explicit) return explicit;
      const descBits = formatDescriptorBits(photo);
      const cameraBits = formatCameraBits(photo);
      const sequenceLabel = extractPhotoSequenceLabel(photo);
      const labeledPeakName = sequenceLabel ? `${peakName} (${sequenceLabel})` : peakName;
      let title = `${labeledPeakName} - White Mountain National Forest (New Hampshire)`;
      if (descBits) title = `${labeledPeakName} - ${descBits} - White Mountain National Forest (New Hampshire)`;
      if (cameraBits) title = `${title} - ${cameraBits}`;
      return title;
    }

    function buildPhotoCaptionUnique(peakName, photo) {
      const explicit = pickFirstNonEmpty(photo.description, photo.extendedDescription, photo.caption, photo.altText);
      if (explicit) return explicit;
      const descBits = formatDescriptorBits(photo);
      const cameraBits = formatCameraBits(photo);
      const sequenceLabel = extractPhotoSequenceLabel(photo);
      const labeledPeakName = sequenceLabel ? `${peakName} (${sequenceLabel})` : peakName;
      let caption = `Landscape photograph of ${labeledPeakName} in the White Mountain National Forest, New Hampshire.`;
      if (descBits) caption = `${caption} Details: ${descBits}.`;
      if (cameraBits) caption = `${caption} Camera: ${cameraBits}.`;
      return caption;
    }

    function normalizeLooseMediaText(value) {
      return normalizeTextForWeb(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    }

    function stripHeroAltPattern(value, peakName) {
      const text = normalizeTextForWeb(value);
      const safePeakName = normalizeTextForWeb(peakName);
      const suffix = ' - NH48';
      const prefix = safePeakName ? `${safePeakName} - ` : '';
      if (!text) return '';
      if (prefix && text.startsWith(prefix) && text.endsWith(suffix) && text.length > prefix.length + suffix.length) {
        return text.slice(prefix.length, -suffix.length).trim();
      }
      return text;
    }

    function isFilenameLikeDescription(value) {
      const text = normalizeTextForWeb(value);
      if (!text) return true;
      const normalized = text.toLowerCase();
      if (/\.(?:jpe?g|png|webp|gif|heic|avif)\b/.test(normalized)) return true;
      if (/__\d{1,4}\b/.test(normalized)) return true;
      if (/(?:^|[\s_-])(?:img|dsc|pxl|photo|mount)[\s_-]*\d{2,6}\b/.test(normalized)) return true;
      if (/^[a-z0-9_-]{4,}$/.test(normalized) && /\d/.test(normalized)) return true;
      return false;
    }

    function isWeakViewDescription(value, peakName) {
      const text = normalizeTextForWeb(value);
      if (!text) return true;
      if (isFilenameLikeDescription(text)) return true;
      const normalized = normalizeLooseMediaText(text);
      if (!normalized || normalized.length < 8) return true;
      const peakNormalized = normalizeLooseMediaText(peakName);
      if (!peakNormalized) return false;
      const peakPattern = new RegExp(`\\b${escRegExp(peakNormalized).replace(/\s+/g, '\\s+')}\\b`, 'gi');
      const remainder = normalized
        .replace(peakPattern, ' ')
        .replace(/\b(?:mount|mont|mt|photo|image|summit|sommet|view|vue)\b/gi, ' ')
        .replace(/\b\d+\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return remainder.length < 4;
    }

    function defaultHeroViewDescription(isFrench = false) {
      return isFrench ? 'Vue du sommet des White Mountains' : 'Summit view in the White Mountains';
    }

    function localizeFrenchPeakName(peakName) {
      const cleaned = normalizeTextForWeb(peakName);
      if (!cleaned) return cleaned;
      const prefixPattern = /^(?:Mt\.?|Mount)\s+/i;
      if (prefixPattern.test(cleaned)) {
        return cleaned.replace(prefixPattern, 'Mont ');
      }
      if (/\s+Mountain$/i.test(cleaned)) {
        const trimmed = cleaned.replace(/\s+Mountain$/i, '').trim();
        return `Mont ${trimmed}`;
      }
      if (/^Mont\s+/i.test(cleaned)) {
        return cleaned;
      }
      return `Mont ${cleaned}`;
    }

    function buildHeroImageAltText(peakName, photo, isFrench = false) {
      const candidate = stripHeroAltPattern(
        pickFirstNonEmpty(
          photo?.extendedDescription,
          photo?.description,
          photo?.caption,
          photo?.altText,
          photo?.alt,
          photo?.title,
          photo?.headline
        ),
        peakName
      );
      const viewDescription = isWeakViewDescription(candidate, peakName)
        ? defaultHeroViewDescription(isFrench)
        : candidate;
      return `${normalizeTextForWeb(peakName)} - ${normalizeTextForWeb(viewDescription)} - NH48`;
    }

    function parseImageDimensions(photo) {
      const width = Number(photo?.width);
      const height = Number(photo?.height);
      if (Number.isFinite(width) && Number.isFinite(height)) {
        return { width, height };
      }
      const dimensions = String(photo?.dimensions || '').trim();
      if (!dimensions) return { width: undefined, height: undefined };
      const match = dimensions.match(/(\d+)\s*[x\u00d7]\s*(\d+)/i);
      if (!match) return { width: undefined, height: undefined };
      return { width: Number(match[1]), height: Number(match[2]) };
    }

    function buildPhotoKeywords(photo) {
      const tags = Array.isArray(photo?.tags) ? photo.tags.map(normalizeTextForWeb).filter(Boolean) : [];
      const iptcKeywords = Array.isArray(photo?.iptc?.keywords)
        ? photo.iptc.keywords.map((item) => String(item).trim()).filter(Boolean)
        : [];
      const contextual = [photo?.season, photo?.timeOfDay, photo?.orientation]
        .map(normalizeTextForWeb)
        .filter(Boolean);
      const combined = [];
      const seen = new Set();
      for (const item of [...tags, ...iptcKeywords, ...contextual]) {
        if (!item) continue;
        const key = item.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        combined.push(item);
      }
      return combined.length ? combined : undefined;
    }

    function buildContentLocation(photo) {
      const loc = photo?.iptc?.locationShown || photo?.iptc?.locationCreated;
      if (!loc || typeof loc !== 'object') return undefined;
      const name = pickFirstNonEmpty(loc.city, loc.sublocation, loc.provinceState, loc.countryName, loc.worldRegion);
      if (!name) return undefined;
      const address = {};
      if (loc.city) address.addressLocality = loc.city;
      if (loc.provinceState) address.addressRegion = loc.provinceState;
      if (loc.countryName) address.addressCountry = loc.countryName;
      return {
        '@type': 'Place',
        name,
        address: Object.keys(address).length
          ? { '@type': 'PostalAddress', ...address }
          : undefined
      };
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
    function buildPeakMeta(trans, peakName, elevation, range, description) {
      const titleTpl = trans['peak.meta.titleTemplate'] || '{peakName} | NH48';
      const descTpl = trans['peak.meta.descriptionTemplate'] || '{peakName} - {description}';
      const title = titleTpl.replace('{peakName}', peakName).replace('{elevation}', elevation).replace('{range}', range);
      const descriptionText = descTpl.replace('{peakName}', peakName).replace('{description}', description).replace('{elevation}', elevation).replace('{range}', range);
      return { title: esc(title), description: esc(descriptionText) };
    }

    function flattenMetaToPropertyValues(prefix, obj, out) {
      if (!obj || typeof obj !== 'object') return;
      for (const [key, val] of Object.entries(obj)) {
        if (val === undefined || val === null) continue;
        if (['photoId', 'filename', 'isPrimary'].includes(key)) continue;
        if (/(?:^|_|-)(?:url|uri|src|source|path)$/i.test(String(key || ''))) continue;
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
      const cameraModel = pickFirstNonEmpty(photoMeta?.cameraModel, photoMeta?.camera, photoMeta?.cameraMaker) || 'unknown';
      const lens = pickFirstNonEmpty(photoMeta?.lens) || 'unknown';
      const rawFStop = pickFirstNonEmpty(photoMeta?.fStop);
      const fStop = rawFStop ? (/^f\//i.test(rawFStop) ? rawFStop : `f/${rawFStop}`) : 'unknown';
      const shutterSpeed = pickFirstNonEmpty(photoMeta?.shutterSpeed) || 'unknown';
      const isoRaw = pickFirstNonEmpty(photoMeta?.iso);
      const iso = isoRaw ? isoRaw.replace(/^iso\s*/i, '') : 'unknown';
      const focalLength = pickFirstNonEmpty(photoMeta?.focalLength) || 'unknown';
      return [
        { '@type': 'PropertyValue', name: 'cameraModel', value: cameraModel },
        { '@type': 'PropertyValue', name: 'lens', value: lens },
        { '@type': 'PropertyValue', name: 'fStop', value: fStop },
        { '@type': 'PropertyValue', name: 'shutterSpeed', value: shutterSpeed },
        { '@type': 'PropertyValue', name: 'iso', value: iso },
        { '@type': 'PropertyValue', name: 'focalLength', value: focalLength }
      ];
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
        creator: { '@id': `${SITE}/#organization` },
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

    function toPositiveInteger(value, fallback) {
      const num = Number(value);
      if (!Number.isFinite(num) || num <= 0) return fallback;
      return Math.round(num);
    }

    function isCloudflareImageHost(hostname) {
      const host = String(hostname || '').toLowerCase();
      return host === 'photos.nh48.info'
        || host === 'wikiphotos.nh48.info'
        || host === 'howker.nh48.info'
        || host === 'plants.nh48.info';
    }

    function normalizeCatalogPhotoUrl(url, { width = 1600, format = 'jpg' } = {}) {
      if (!url) return '';
      const widthVal = toPositiveInteger(width, 1600);
      const fmt = typeof format === 'string' && format.trim() ? format.trim() : 'jpg';
      const options = `format=${fmt},quality=85,width=${widthVal},metadata=keep`;
      try {
        const parsed = new URL(url);
        if (!isCloudflareImageHost(parsed.hostname)) return url;
        const path = parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`;
        if (path.includes('/cdn-cgi/image/')) {
          return url;
        }
        return `${parsed.origin}/cdn-cgi/image/${options}${path}`;
      } catch (_) {
        return url;
      }
    }

    function normalizeMediaText(value) {
      if (typeof value !== 'string') return '';
      return value.trim();
    }

    function decodeHtmlEntities(text) {
      return String(text || '')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&nbsp;/gi, ' ');
    }

    function extractHtmlAttribute(tag, name) {
      if (!tag || !name) return '';
      const pattern = new RegExp(`${name}\\s*=\\s*(\"([^\"]*)\"|'([^']*)')`, 'i');
      const match = tag.match(pattern);
      if (!match) return '';
      return normalizeMediaText(match[2] || match[3] || '');
    }

    function stripCloudflareImageTransform(rawUrl) {
      if (!rawUrl) return '';
      try {
        const parsed = new URL(rawUrl);
        const marker = '/cdn-cgi/image/';
        const markerIndex = parsed.pathname.indexOf(marker);
        if (markerIndex === -1) {
          return parsed.toString();
        }
        const tail = parsed.pathname.slice(markerIndex + marker.length);
        const slashIndex = tail.indexOf('/');
        if (slashIndex === -1) {
          return parsed.toString();
        }
        const originPath = tail.slice(slashIndex + 1);
        return `${parsed.origin}/${originPath}`;
      } catch (_) {
        return rawUrl;
      }
    }

    function buildCloudflareImageVariantUrl(rawUrl, { width = 1200, format = 'jpg', quality = 85 } = {}) {
      const contentUrl = stripCloudflareImageTransform(rawUrl);
      if (!contentUrl) return '';
      try {
        const parsed = new URL(contentUrl);
        if (!isCloudflareImageHost(parsed.hostname)) {
          return contentUrl;
        }
        const widthVal = toPositiveInteger(width, 1200);
        const qualityVal = Math.max(1, Math.min(100, toPositiveInteger(quality, 85)));
        const fmt = normalizeMediaText(format) || 'jpg';
        return `${parsed.origin}/cdn-cgi/image/format=${fmt},quality=${qualityVal},width=${widthVal}${parsed.pathname}`;
      } catch (_) {
        return contentUrl;
      }
    }

    function humanizeMediaName(value) {
      if (!value) return 'NH48 image';
      let input = String(value).trim();
      try {
        const parsed = new URL(input);
        input = parsed.pathname.split('/').pop() || parsed.pathname || input;
      } catch (_) {
        const parts = input.split('/');
        input = parts[parts.length - 1] || input;
      }
      const withoutExt = input.replace(/\.[^.]+$/, '');
      const normalized = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (!normalized) return 'NH48 image';
      return normalized.replace(/\b\w/g, (ch) => ch.toUpperCase());
    }

    function extractHomepageCardMedia(templateHtml) {
      if (typeof templateHtml !== 'string' || !templateHtml.trim()) {
        return [];
      }

      const media = [];
      const imageTagPattern = /<img\b[^>]*class\s*=\s*["'][^"']*\bdataset-card-image\b[^"']*["'][^>]*>/gi;
      const imageTags = templateHtml.match(imageTagPattern) || [];

      imageTags.forEach((tag) => {
        const rawSrc = decodeHtmlEntities(extractHtmlAttribute(tag, 'src'));
        if (!rawSrc) return;
        const rawAlt = decodeHtmlEntities(extractHtmlAttribute(tag, 'alt'));
        const contentUrl = stripCloudflareImageTransform(rawSrc);
        const fallbackText = `Homepage card image: ${humanizeMediaName(contentUrl)}`;
        const text = normalizeMediaText(rawAlt) || fallbackText;
        media.push({
          contentUrl,
          url: buildCloudflareImageVariantUrl(contentUrl, { width: 1200, format: 'jpg' }),
          name: text,
          description: text,
          caption: text
        });
      });

      return media;
    }

    function buildSplashAltLookup(altPayload) {
      const lookup = new Map();
      const entries = Array.isArray(altPayload?.images) ? altPayload.images : [];

      entries.forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        const file = normalizeMediaText(entry.file).toLowerCase();
        if (!file) return;
        const normalized = {
          title: normalizeMediaText(entry.title),
          alt: normalizeMediaText(entry.alt),
          description: normalizeMediaText(entry.description)
        };
        lookup.set(file, normalized);
        const basename = file.split('/').pop();
        if (basename && !lookup.has(basename)) {
          lookup.set(basename, normalized);
        }
      });

      return lookup;
    }

    function extractHomepageSplashMedia(manifestPayload, splashAltLookup) {
      const entries = Array.isArray(manifestPayload) ? manifestPayload : [];
      const media = [];

      entries.forEach((entry) => {
        const relativePath = normalizeMediaText(entry).replace(/^\/+/, '');
        if (!relativePath || !/\.(png|jpe?g|webp)$/i.test(relativePath)) {
          return;
        }

        const lowerPath = relativePath.toLowerCase();
        const basename = lowerPath.split('/').pop();
        const altMeta = splashAltLookup.get(lowerPath) || splashAltLookup.get(basename) || null;
        const fallbackText = `Splash image: ${humanizeMediaName(relativePath)}`;
        const caption = altMeta?.alt || altMeta?.description || fallbackText;
        const name = altMeta?.title || caption;
        const description = altMeta?.description || caption;
        const contentUrl = `https://photos.nh48.info/${relativePath}`;

        media.push({
          contentUrl,
          url: buildCloudflareImageVariantUrl(contentUrl, { width: 1200, format: 'jpg' }),
          name,
          description,
          caption
        });
      });

      return media;
    }

    function normalizeMediaUrlKey(value) {
      if (!value) return '';
      try {
        return new URL(value).toString().toLowerCase();
      } catch (_) {
        return String(value).trim().toLowerCase();
      }
    }

    function isGenericMediaText(value) {
      return /^Homepage card image:|^Splash image:/i.test(normalizeMediaText(value));
    }

    function mergeHomepageMediaSources(...sources) {
      const map = new Map();
      const allItems = sources.flat().filter(Boolean);

      allItems.forEach((item) => {
        const contentUrl = stripCloudflareImageTransform(item.contentUrl || item.url || '');
        if (!contentUrl) return;

        const key = normalizeMediaUrlKey(contentUrl);
        const candidate = {
          contentUrl,
          url: buildCloudflareImageVariantUrl(contentUrl, { width: 1200, format: 'jpg' }),
          name: normalizeMediaText(item.name),
          description: normalizeMediaText(item.description),
          caption: normalizeMediaText(item.caption)
        };

        const fallbackText = humanizeMediaName(contentUrl);
        if (!candidate.name) candidate.name = fallbackText;
        if (!candidate.description) candidate.description = candidate.caption || candidate.name;
        if (!candidate.caption) candidate.caption = candidate.description || candidate.name;

        if (!map.has(key)) {
          map.set(key, candidate);
          return;
        }

        const current = map.get(key);
        if (isGenericMediaText(current.name) && !isGenericMediaText(candidate.name)) {
          current.name = candidate.name;
        }
        if (isGenericMediaText(current.description) && !isGenericMediaText(candidate.description)) {
          current.description = candidate.description;
        }
        if (isGenericMediaText(current.caption) && !isGenericMediaText(candidate.caption)) {
          current.caption = candidate.caption;
        }
      });

      return Array.from(map.values());
    }

    function getPrimaryPhoto(photos) {
      const list = Array.isArray(photos) ? photos : [];
      const normalized = list.map((photo) => (typeof photo === 'string' ? { url: photo } : photo)).filter((photo) => photo && photo.url);
      if (!normalized.length) return null;
      const explicitPrimary = normalized.find((photo) => photo.isPrimary === true || String(photo.isPrimary).toLowerCase() === 'true');
      return explicitPrimary || normalized[0];
    }

    function injectCrawlerFallbackAfterContainer(html, containerId, fallbackHtml) {
      if (!fallbackHtml || !html) return html;
      const marker = new RegExp(`(<div[^>]*id=["']${containerId}["'][^>]*>\\s*</div>)`, 'i');
      if (marker.test(html)) {
        return html.replace(marker, `$1\n${fallbackHtml}`);
      }
      if (/<\/main>/i.test(html)) {
        return html.replace(/<\/main>/i, `${fallbackHtml}\n</main>`);
      }
      return html.replace(/<\/body>/i, `${fallbackHtml}\n</body>`);
    }

    function buildCrawlerImageFallbackHtml({ peaks, variant = 'catalog', limit = 32 }) {
      const peakList = toPeakArray(peaks);
      if (!peakList.length) return '';

      const items = peakList
        .map((peak, index) => {
          if (!peak || typeof peak !== 'object') return null;
          const slug = getPeakSlugValue(peak, index);
          if (!slug) return null;
          const peakName = normalizeTextForWeb(peak.peakName || peak['Peak Name'] || slug);
          const primaryPhoto = getPrimaryPhoto(peak.photos);
          if (!primaryPhoto || !primaryPhoto.url) return null;
          const imageUrl = normalizeCatalogPhotoUrl(primaryPhoto.url, { width: 1600, format: 'jpg' });
          if (!imageUrl) return null;
          const imageAlt = normalizeTextForWeb(
            primaryPhoto.altText ||
            primaryPhoto.alt ||
            primaryPhoto.description ||
            primaryPhoto.caption ||
            `${peakName} summit photo`
          );
          const caption = normalizeTextForWeb(
            primaryPhoto.caption ||
            buildPhotoCaptionUnique(peakName, primaryPhoto)
          );
          return {
            slug,
            peakName,
            imageUrl,
            imageAlt: imageAlt || `${peakName} summit photo`,
            caption
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.peakName.localeCompare(b.peakName))
        .slice(0, Math.max(1, Number(limit) || 32));

      if (!items.length) return '';

      const title = variant === 'photos'
        ? 'NH48 Photo Archive Crawl Fallback'
        : 'NH48 Peak Catalog Crawl Fallback';
      const intro = variant === 'photos'
        ? 'Image links for crawlers when JavaScript is unavailable.'
        : 'Peak image links for crawlers when JavaScript is unavailable.';

      const listItems = items
        .map((item) => [
          '<li>',
          `  <a href="/peak/${encodeURIComponent(item.slug)}">`,
          `    <img src="${esc(item.imageUrl)}" alt="${esc(item.imageAlt)}" loading="lazy" decoding="async">`,
          `    <span>${esc(item.peakName)}</span>`,
          '  </a>',
          item.caption ? `  <small>${esc(item.caption)}</small>` : '',
          '</li>'
        ].join('\n'))
        .join('\n');

      return [
        '<noscript>',
        '<section class="nh48-crawl-fallback" aria-label="Crawler image fallback">',
        '  <style>',
        '    .nh48-crawl-fallback{margin:1.5rem 0;padding:1rem;border:1px solid rgba(148,163,184,.28);border-radius:12px;background:#0b1221;color:#e2e8f0;}',
        '    .nh48-crawl-fallback h2{margin:0 0 .35rem;font-size:1.1rem;}',
        '    .nh48-crawl-fallback p{margin:0 0 .8rem;color:#94a3b8;font-size:.92rem;}',
        '    .nh48-crawl-fallback ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.8rem;}',
        '    .nh48-crawl-fallback li{display:flex;flex-direction:column;gap:.4rem;}',
        '    .nh48-crawl-fallback a{display:flex;flex-direction:column;gap:.45rem;text-decoration:none;color:#e2e8f0;}',
        '    .nh48-crawl-fallback img{width:100%;height:auto;border-radius:10px;border:1px solid rgba(148,163,184,.2);background:#020617;}',
        '    .nh48-crawl-fallback small{color:#94a3b8;line-height:1.35;}',
        '  </style>',
        `  <h2>${esc(title)}</h2>`,
        `  <p>${esc(intro)}</p>`,
        '  <ul>',
        listItems,
        '  </ul>',
        '</section>',
        '</noscript>'
      ].join('\n');
    }

    function buildDataCatalogSchema({ canonicalUrl, title, description, datasets }) {
      return {
        '@context': 'https://schema.org',
        '@type': 'DataCatalog',
        name: title,
        description,
        url: canonicalUrl,
        license: 'https://creativecommons.org/licenses/by/4.0/',
        dataset: datasets
      };
    }

    function buildDatasetSchema({ canonicalUrl, title, description, distribution, keywords, spatialCoverage, license, publisher }) {
      return {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: title,
        description,
        url: canonicalUrl,
        license: license || 'https://creativecommons.org/licenses/by/4.0/',
        creator: publisher || { '@id': `${SITE}/#organization` },
        publisher: publisher || { '@id': `${SITE}/#organization` },
        keywords,
        spatialCoverage,
        distribution
      };
    }

    function buildWebAppSchema({ canonicalUrl, title, description, datasetName }) {
      return {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: title,
        description,
        url: canonicalUrl,
        applicationCategory: 'MapApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
        isAccessibleForFree: true,
        about: {
          '@type': 'Dataset',
          name: datasetName
        }
      };
    }

    function buildItemList(peaks, canonicalUrl) {
      const items = peaks.map((peak, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: peak.name,
        item: peak.url
      }));
      return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'NH 4000-Footers',
        url: canonicalUrl,
        itemListElement: items
      };
    }

    function countRecords(data) {
      if (!data) return 0;
      if (Array.isArray(data)) return data.length;
      if (Array.isArray(data.features)) return data.features.length;
      return Object.keys(data).length;
    }

    function buildAlternatePaths(pathname) {
      const enPath = isFrench ? (pathname.replace(/^\/fr/, '') || '/') : pathname;
      const frPath = isFrench ? pathname : `${pathname === '/' ? '/fr' : `/fr${pathname}`}`;
      return { enPath, frPath };
    }

    function normalizeOgRoutePath(pathnameValue) {
      let normalized = String(pathnameValue || '/').trim();
      if (!normalized.startsWith('/')) {
        normalized = `/${normalized}`;
      }
      normalized = normalized.replace(/\/{2,}/g, '/');
      if (normalized.length > 1 && normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
      }
      return normalized || '/';
    }

    async function loadOgCardsManifest() {
      if (ogCardsManifestCache) return ogCardsManifestCache;
      const payload = await loadJsonCache('og-cards-manifest', RAW_OG_CARDS_URL);
      if (!payload || typeof payload !== 'object' || typeof payload.cards !== 'object') {
        ogCardsManifestCache = { cards: {} };
        return ogCardsManifestCache;
      }
      ogCardsManifestCache = payload;
      return ogCardsManifestCache;
    }

    function mapOgAliasPath(pathnameValue) {
      const aliasMap = {
        '/catalog.html': '/catalog',
        '/long-trails.html': '/long-trails',
        '/peakid-game.html': '/peakid-game',
        '/timed-peakid-game.html': '/timed-peakid-game',
        '/peakid-timed': '/timed-peakid-game',
        '/plant-catalog.html': '/plant-catalog',
        '/bird-catalog.html': '/bird-catalog',
        '/bird_catalog.html': '/bird-catalog',
        '/bird_catalog': '/bird-catalog',
        '/nh48-map.html': '/nh48-map',
        '/nh48_map.html': '/nh48-map',
        '/nh48_map': '/nh48-map',
        '/nh-4000-footers-info.html': '/nh-4000-footers-info',
        '/nh48-planner': '/nh48-planner.html',
        '/virtual_hike.html': '/virtual-hike'
      };
      return aliasMap[pathnameValue] || pathnameValue;
    }

    async function resolveOgCard(pathnameValue) {
      const manifest = await loadOgCardsManifest();
      const cards = manifest?.cards;
      if (!cards || typeof cards !== 'object') return null;

      let key = normalizeOgRoutePath(pathnameValue);
      key = mapOgAliasPath(key);
      const candidates = [key];
      if (key === '/fr') {
        candidates.push('/');
      }
      if (key.startsWith('/fr/')) {
        candidates.push(key.replace(/^\/fr/, ''));
      }

      for (const candidate of candidates) {
        const card = cards[candidate];
        if (!card || typeof card !== 'object') continue;
        const image = typeof card.image === 'string' ? card.image.trim() : '';
        if (!image) continue;
        const imageAlt = typeof card.imageAlt === 'string' ? card.imageAlt.trim() : '';
        return { image, imageAlt };
      }
      return null;
    }

    function normalizeTrailSlug(value) {
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/^\/+|\/+$/g, '');
    }

    function humanizeSlug(value) {
      const normalized = normalizeTrailSlug(value);
      if (!normalized) return '';
      return normalized
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (ch) => ch.toUpperCase());
    }

    function resolveTrailSectionCount(entry) {
      if (!entry || typeof entry !== 'object') return 0;
      const directCount = Number(
        entry.sectionCount
        || entry.section_count
        || entry.sectionsCount
      );
      if (Number.isFinite(directCount) && directCount > 0) {
        return directCount;
      }
      const statsCount = Number(entry.stats?.sectionCount || entry.stats?.sectionsCount);
      if (Number.isFinite(statsCount) && statsCount > 0) {
        return statsCount;
      }
      if (Array.isArray(entry.sections)) {
        return entry.sections.length;
      }
      return 0;
    }

    function collectTrailEntries(payload) {
      if (!payload) return [];
      if (Array.isArray(payload?.trails)) return payload.trails;
      if (Array.isArray(payload)) return payload;
      return [];
    }

    async function loadLongTrailLookup() {
      const [indexPayload, fullPayload] = await Promise.all([
        loadJsonCache('long-trails-index', RAW_LONG_TRAILS_INDEX_URL),
        loadJsonCache('long-trails-full', RAW_LONG_TRAILS_FULL_URL)
      ]);
      const lookup = new Map();

      const mergeEntry = (entry) => {
        if (!entry || typeof entry !== 'object') return;
        const slug = normalizeTrailSlug(entry.slug || entry.id);
        if (!slug) return;

        const nameCandidate = normalizeTextForWeb(entry.name || entry.title || '');
        const shortNameCandidate = normalizeTextForWeb(entry.shortName || entry.short_name || '');
        const descriptionCandidate = normalizeTextForWeb(entry.description || entry.summary || '');
        const sectionCountCandidate = resolveTrailSectionCount(entry);

        if (!lookup.has(slug)) {
          lookup.set(slug, {
            slug,
            name: nameCandidate || humanizeSlug(slug),
            shortName: shortNameCandidate || '',
            description: descriptionCandidate || '',
            sectionCount: sectionCountCandidate,
            source: entry
          });
          return;
        }

        const existing = lookup.get(slug);
        if (!existing.name && nameCandidate) existing.name = nameCandidate;
        if (!existing.shortName && shortNameCandidate) existing.shortName = shortNameCandidate;
        if (!existing.description && descriptionCandidate) existing.description = descriptionCandidate;
        if (sectionCountCandidate > existing.sectionCount) {
          existing.sectionCount = sectionCountCandidate;
          existing.source = entry;
        }
      };

      collectTrailEntries(indexPayload).forEach(mergeEntry);
      collectTrailEntries(fullPayload).forEach(mergeEntry);

      return lookup;
    }

    function buildBreadcrumbSchema({ canonicalUrl, name, items }) {
      if (!canonicalUrl || !Array.isArray(items) || !items.length) return null;
      const itemListElement = items.map((item, index) => {
        const node = {
          '@type': 'ListItem',
          position: index + 1,
          name: item.name
        };
        if (item.item) {
          node.item = item.item;
        }
        return node;
      });
      return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumbs`,
        name: name || undefined,
        itemListElement
      };
    }

    function buildCanonicalBreadcrumbSchema({ routeId, canonicalUrl, context = {} }) {
      if (!routeId || !canonicalUrl) return null;

      const taxonomy = breadcrumbTaxonomyCache || {};
      const taxonomyLabels = taxonomy.labels || {};
      const strategies = taxonomy.strategies || {};
      const defaultStrategy = typeof taxonomy.defaultStrategy === 'string' ? taxonomy.defaultStrategy : 'technical';
      const routeStrategy = typeof strategies[routeId] === 'string' ? strategies[routeId] : defaultStrategy;

      const homeLabel = taxonomyLabels.home?.[isFrench ? 'fr' : 'en'] || (isFrench ? 'Accueil' : 'Home');
      const apiLabel = taxonomyLabels.api?.[isFrench ? 'fr' : 'en'] || (isFrench ? 'API NH48' : 'NH48 API');
      const whiteMountainsLabel = taxonomyLabels.whiteMountains?.[isFrench ? 'fr' : 'en'] || 'White Mountains';
      const wikiLabel = taxonomyLabels.wiki?.[isFrench ? 'fr' : 'en'] || (isFrench ? 'Wiki White Mountains' : 'White Mountain Wiki');
      const mountainsLabel = taxonomyLabels.mountains?.[isFrench ? 'fr' : 'en'] || (isFrench ? 'Montagnes' : 'Mountains');
      const plantsLabel = taxonomyLabels.plants?.[isFrench ? 'fr' : 'en'] || (isFrench ? 'Plantes' : 'Plants');
      const animalsLabel = taxonomyLabels.animals?.[isFrench ? 'fr' : 'en'] || (isFrench ? 'Animaux' : 'Animals');
      const plantDiseasesLabel = taxonomyLabels.plantDiseases?.[isFrench ? 'fr' : 'en'] || (isFrench ? 'Maladies des plantes' : 'Plant Diseases');
      const forestHealthLabel = taxonomyLabels.forestHealth?.[isFrench ? 'fr' : 'en'] || (isFrench ? 'Sante forestiere' : 'Forest Health');
      const homeUrl = isFrench ? `${SITE}/fr/` : `${SITE}/`;
      const catalogUrl = isFrench ? `${SITE}/fr/catalog` : `${SITE}/catalog`;
      const datasetUrl = isFrench ? `${SITE}/fr/dataset` : `${SITE}/dataset`;
      const trailsUrl = isFrench ? `${SITE}/fr/trails` : `${SITE}/trails`;
      const longTrailsUrl = isFrench ? `${SITE}/fr/long-trails` : `${SITE}/long-trails`;
      const plantCatalogUrl = isFrench ? `${SITE}/fr/plant-catalog` : `${SITE}/plant-catalog`;
      const wikiUrl = `${SITE}/wiki`;
      const whiteMountainsHubUrl = isFrench
        ? `${SITE}${taxonomy.paths?.whiteMountainsHubFr || '/fr/nh-4000-footers-info'}`
        : `${SITE}${taxonomy.paths?.whiteMountainsHubEn || '/nh-4000-footers-info'}`;
      const items = [];
      const push = (name, item) => {
        if (!name) return;
        const crumb = { name: normalizeTextForWeb(name) || name };
        if (item) crumb.item = item;
        items.push(crumb);
      };

      const withApiPrefix = () => {
        push(homeLabel, homeUrl);
        push(apiLabel, homeUrl);
      };

      if (routeStrategy === 'geographic' && routeId === 'peak-detail') {
        const rangeName = context.rangeName || extractPrimaryRangeName(context.rangeValue || '');
        const rangeSlug = context.rangeSlug || slugifyRange(rangeName);
        const rangeUrl = context.rangeUrl || (rangeSlug ? `${SITE}/range/${encodeURIComponent(rangeSlug)}/` : '');
        push(homeLabel, homeUrl);
        push(whiteMountainsLabel, whiteMountainsHubUrl);
        if (rangeName) {
          push(rangeName, rangeUrl || undefined);
        }
        push(context.peakName || (isFrench ? 'Sommet' : 'Peak'));
        return buildBreadcrumbSchema({
          canonicalUrl,
          name: `${context.peakName || (isFrench ? 'Sommet' : 'Peak')} breadcrumb trail`,
          items
        });
      }

      switch (routeId) {
        case 'home':
          push(homeLabel, homeUrl);
          push(apiLabel, canonicalUrl);
          break;
        case 'catalog':
          withApiPrefix();
          push(isFrench ? 'Reference API' : 'API Reference', catalogUrl);
          push(isFrench ? 'Catalogue des sommets' : 'Peak Catalog');
          break;
        case 'peak-detail':
          withApiPrefix();
          push(isFrench ? 'Reference API' : 'API Reference', catalogUrl);
          push(isFrench ? 'Catalogue des sommets' : 'Peak Catalog', catalogUrl);
          push(context.peakName || (isFrench ? 'Sommet' : 'Peak'));
          break;
        case 'range-catalog':
          withApiPrefix();
          push(isFrench ? 'Reference API' : 'API Reference', catalogUrl);
          push(isFrench ? 'Chaines' : 'Ranges');
          break;
        case 'range-detail':
          withApiPrefix();
          push(isFrench ? 'Reference API' : 'API Reference', catalogUrl);
          push(isFrench ? 'Chaines' : 'Ranges', `${SITE}/catalog/ranges`);
          push(context.rangeName || (isFrench ? 'Chaine' : 'Range'));
          break;
        case 'dataset':
          withApiPrefix();
          push(isFrench ? 'Catalogue de donnees' : 'Data Catalog');
          break;
        case 'dataset-detail':
          withApiPrefix();
          push(isFrench ? 'Catalogue de donnees' : 'Data Catalog', datasetUrl);
          push(context.datasetName || (isFrench ? 'Jeu de donnees' : 'Dataset'));
          break;
        case 'trails':
          withApiPrefix();
          push(isFrench ? 'Sentiers' : 'Trails', trailsUrl);
          push(isFrench ? 'Carte WMNF' : 'WMNF Trails Map');
          break;
        case 'long-trails':
          withApiPrefix();
          push(isFrench ? 'Sentiers' : 'Trails', trailsUrl);
          push(isFrench ? 'Carte des longs sentiers' : 'Long-Distance Trails Map');
          break;
        case 'long-trail-detail':
          withApiPrefix();
          push(isFrench ? 'Sentiers' : 'Trails', trailsUrl);
          push(isFrench ? 'Carte des longs sentiers' : 'Long-Distance Trails Map', longTrailsUrl);
          push(context.trailName || (isFrench ? 'Sentier longue distance' : 'Long-Distance Trail'));
          break;
        case 'plant-catalog':
          withApiPrefix();
          push(isFrench ? 'Catalogue de donnees' : 'Data Catalog', datasetUrl);
          push(isFrench ? 'Catalogue des plantes alpines' : 'Alpine Plant Catalog');
          break;
        case 'plant-detail':
          withApiPrefix();
          push(isFrench ? 'Catalogue de donnees' : 'Data Catalog', datasetUrl);
          push(isFrench ? 'Catalogue des plantes alpines' : 'Alpine Plant Catalog', plantCatalogUrl);
          push(context.plantName || (isFrench ? 'Plante' : 'Plant'));
          break;
        case 'bird-catalog':
          withApiPrefix();
          push(isFrench ? 'Projets' : 'Projects');
          push(isFrench ? 'Catalogue des oiseaux NH (beta)' : 'NH Bird Catalog (Beta)');
          break;
        case 'bird-detail':
          withApiPrefix();
          push(isFrench ? 'Projets' : 'Projects');
          push(
            isFrench ? 'Catalogue des oiseaux NH (beta)' : 'NH Bird Catalog (Beta)',
            isFrench ? `${SITE}/fr/bird-catalog` : `${SITE}/bird-catalog`
          );
          push(context.birdName || (isFrench ? 'Oiseau' : 'Bird'));
          break;
        case 'wiki-home':
          push(homeLabel, homeUrl);
          push(wikiLabel, wikiUrl);
          break;
        case 'wiki-mountain-detail': {
          push(homeLabel, homeUrl);
          push(wikiLabel, wikiUrl);
          push(mountainsLabel, `${wikiUrl}#wikiPanelNh48`);
          if (context.setName) {
            push(context.setName, wikiUrl);
          }
          push(context.entryName || context.peakName || (isFrench ? 'Montagne' : 'Mountain'));
          break;
        }
        case 'wiki-plant-detail':
          push(homeLabel, homeUrl);
          push(wikiLabel, wikiUrl);
          push(plantsLabel, `${wikiUrl}#wikiPanelPlants`);
          push(context.entryName || context.plantName || (isFrench ? 'Plante' : 'Plant'));
          break;
        case 'wiki-animal-detail':
          push(homeLabel, homeUrl);
          push(wikiLabel, wikiUrl);
          push(animalsLabel, `${wikiUrl}#wikiPanelAnimals`);
          push(context.entryName || context.animalName || (isFrench ? 'Animal' : 'Animal'));
          break;
        case 'wiki-plant-disease':
          push(homeLabel, homeUrl);
          push(wikiLabel, wikiUrl);
          push(plantDiseasesLabel, `${wikiUrl}#wikiPanelPlantDiseases`);
          break;
        case 'wiki-forest-health':
          push(homeLabel, homeUrl);
          push(wikiLabel, wikiUrl);
          push(forestHealthLabel, `${SITE}/wiki/diseases`);
          break;
        case 'plant-map':
          withApiPrefix();
          push(isFrench ? 'Projets' : 'Projects');
          push(isFrench ? 'Carte des plantes' : 'Plant Map');
          break;
        case 'nh48-map':
          push(homeLabel, homeUrl);
          push(isFrench ? 'Projets' : 'Projects');
          push('NH48 Map');
          break;
        case 'howker-map-editor':
          withApiPrefix();
          push(isFrench ? 'Projets' : 'Projects');
          push(isFrench ? 'Editeur carte Howker' : 'Howker Map Editor');
          break;
        case 'hrt-info':
          withApiPrefix();
          push(isFrench ? 'Projets' : 'Projects');
          push(isFrench ? 'Infos sentier Howker Ridge' : 'Howker Ridge Trail Info');
          break;
        case 'howker-ridge':
          withApiPrefix();
          push(isFrench ? 'Projets' : 'Projects');
          push(isFrench ? 'Carte et donnees Howker Ridge' : 'Howker Ridge Trail Map & Data');
          break;
        case 'howker-ridge-poi':
          withApiPrefix();
          push(isFrench ? 'Projets' : 'Projects');
          push(
            isFrench ? 'Carte et donnees Howker Ridge' : 'Howker Ridge Trail Map & Data',
            isFrench ? `${SITE}/fr/howker-ridge` : `${SITE}/howker-ridge`
          );
          push(isFrench ? "Point d'interet" : 'Point of Interest');
          break;
        case 'about':
          withApiPrefix();
          push(isFrench ? 'Documentation' : 'Documentation');
          push(isFrench ? 'A propos' : 'About');
          break;
        case 'submit-edit':
          withApiPrefix();
          push(isFrench ? 'Support' : 'Support');
          push(isFrench ? 'Soumettre une correction' : 'Submit Edit');
          break;
        case 'nh48-info':
          withApiPrefix();
          push(isFrench ? 'Reference API' : 'API Reference', catalogUrl);
          push(isFrench ? 'Infos 4 000 pieds NH' : 'NH 4,000-Footers Info');
          break;
        default:
          return null;
      }

      if (!items.length) return null;
      return buildBreadcrumbSchema({
        canonicalUrl,
        name: `${items[items.length - 1].name} breadcrumb trail`,
        items
      });
    }

    // Build JSON-LD for mountain and related entities
    function formatRouteSummary(route) {
      if (!route || typeof route !== 'object') return '';
      const name = pickFirstNonEmpty(route['Route Name'], route.name);
      const distance = pickFirstNonEmpty(route['Distance (mi)'], route.distance);
      const gain = pickFirstNonEmpty(route['Elevation Gain (ft)'], route.elevationGain);
      const difficulty = pickFirstNonEmpty(route['Difficulty'], route.difficulty);
      const trailType = pickFirstNonEmpty(route['Trail Type'], route.trailType);
      const details = [
        distance ? `${distance} mi` : '',
        gain ? `${gain} ft gain` : '',
        trailType || '',
        difficulty || ''
      ]
        .filter(Boolean)
        .join(' " ');
      if (!name && !details) return '';
      return details ? `${name || 'Route'} (${details})` : name;
    }

    function normalizePropertyValue(value) {
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) {
        const values = value
          .map((item) => normalizePropertyValue(item))
          .filter(Boolean);
        return values.join('; ');
      }
      if (typeof value === 'object') {
        if (
          'Route Name' in value ||
          'Distance (mi)' in value ||
          'Elevation Gain (ft)' in value ||
          'Trail Type' in value
        ) {
          return formatRouteSummary(value);
        }
        const entries = Object.entries(value)
          .map(([key, val]) => {
            const text = normalizePropertyValue(val);
            return text ? `${key}: ${text}` : '';
          })
          .filter(Boolean);
        return entries.join(', ');
      }
      return String(value).trim();
    }

    function buildJsonLd(
      peakData,
      peakName,
      elevation,
      prominence,
      rangeVal,
      coords,
      canonicalUrl,
      imageUrl,
      summaryText,
      photos = [],
      seoContext = {}
    ) {
      const parkingEntry = seoContext?.parkingEntry || null;
      const difficultyEntry = seoContext?.difficultyEntry || null;
      const riskEntry = seoContext?.riskEntry || null;
      const weatherSnapshot = seoContext?.weatherSnapshot || null;
      const isFrenchRoute = /\/fr\/peak\//i.test(canonicalUrl);
      const localizedPeakName = isFrenchRoute ? localizeFrenchPeakName(peakName) : peakName;
      const normalizeNarrative = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const narrativeParts = [];
      const pushNarrativePart = (name, text, suffix) => {
        const normalizedText = normalizeNarrative(text);
        if (!normalizedText) return;
        narrativeParts.push({
          '@type': 'WebPageElement',
          '@id': `${canonicalUrl}#${suffix}`,
          name,
          text: normalizedText
        });
      };
      pushNarrativePart('Mountain Overview', summaryText, 'overview');
      const experience = peakData && typeof peakData === 'object' && peakData.experience && typeof peakData.experience === 'object'
        ? peakData.experience
        : null;
      if (experience) {
        pushNarrativePart(`${peakName} Summary`, experience.experienceSummary, 'trail-tested-summary');
        pushNarrativePart(`Conditions on ${peakName}`, experience.conditionsFromExperience, 'trail-tested-conditions');
        pushNarrativePart('Planning Trip', experience.planningTip, 'trail-tested-planning');
        const historyBits = [
          normalizeNarrative(experience.firstAscent || experience.first_ascent),
          normalizeNarrative(experience.historyNotes || experience.history_notes || experience.history)
        ].filter(Boolean);
        if (historyBits.length) {
          pushNarrativePart(`${peakName} History`, historyBits.join(' '), 'trail-tested-history');
        }
      }
      const photoList = Array.isArray(photos) ? photos : [];
      const primaryPhotoIndex = Math.max(0, photoList.findIndex((photo) => photo && photo.isPrimary));
      const normalizedHeroImageUrl = normalizeCatalogPhotoUrl(imageUrl, { width: 1800, format: 'jpg' }) || imageUrl;
      const imageObjects = photoList
        .map((photo, index) => {
          if (!photo || !photo.url) return null;
          const isFineArt = !!photo.isFineArt;
          const { width, height } = parseImageDimensions(photo);
          const keywords = buildPhotoKeywords(photo);
          const contentLocation = buildContentLocation(photo);
          const dateCreated = pickFirstNonEmpty(photo.captureDate, photo.dateCreated);
          const exifData = buildExifData(photo);
          const forcePatternCaption = buildHeroImageAltText(localizedPeakName, photo, isFrenchRoute);
          const copyrightNotice = pickFirstNonEmpty(photo?.iptc?.copyrightNotice, photo.copyrightNotice, RIGHTS_DEFAULTS.copyrightNotice);
          const acquireLicensePage = pickFirstNonEmpty(photo.acquireLicensePage, RIGHTS_DEFAULTS.licenseUrl, RIGHTS_DEFAULTS.acquireLicensePageUrl);
          const normalizedContentUrl = normalizeCatalogPhotoUrl(photo.contentUrl || photo.url, { width: 1800, format: 'jpg' }) || (photo.contentUrl || photo.url);
          const imageId = `${canonicalUrl}#img-${String(index + 1).padStart(3, '0')}`;
          const imageObject = {
            '@type': isFineArt ? ['ImageObject', 'Photograph', 'VisualArtwork'] : ['ImageObject', 'Photograph'],
            '@id': imageId,
            contentUrl: normalizedContentUrl,
            url: normalizedContentUrl,
            name: buildPhotoTitleUnique(peakName, photo),
            caption: forcePatternCaption,
            creator: { '@type': 'Person', name: RIGHTS_DEFAULTS.creatorName },
            creditText: RIGHTS_DEFAULTS.creditText,
            copyrightNotice,
            license: RIGHTS_DEFAULTS.licenseUrl,
            acquireLicensePage,
            dateCreated,
            width,
            height,
            keywords,
            contentLocation,
            exifData,
            representativeOfPage: index === primaryPhotoIndex
          };
          if (isFineArt) {
            imageObject.artform = 'Photography';
            imageObject.artEdition = 'Open edition';
            imageObject.artMedium = 'Digital photography';
          }
          return imageObject;
        })
        .filter(Boolean);
      const imageRefs = imageObjects.map((image) => ({ '@id': image['@id'] }));
      const creativeWork = {
        '@context': 'https://schema.org',
        '@type': ['CreativeWork', 'Photograph'],
        '@id': `${canonicalUrl}#creativework`,
        url: canonicalUrl,
        name: `${peakName} fine-art photograph`,
        description: summaryText || `Fine-art photograph of ${peakName} in the White Mountains.`,
        image: imageRefs.length ? imageRefs[0] : normalizedHeroImageUrl,
        associatedMedia: imageRefs.length ? imageRefs : undefined,
        publisher: { '@id': `${SITE}/#organization` },
        creator: { '@id': `${SITE}/#person-nathan-sobol` },
        sameAs: buildCreativeSameAs(),
        mainEntityOfPage: { '@id': `${canonicalUrl}#webpage` }
      };
      // Guard against missing fields in peakData to avoid undefined errors
      const dogFriendly = peakData && typeof peakData === 'object'
        ? (peakData['Dog Friendly'] || peakData.dogFriendly || '')
        : '';
      const rawTrailNames = peakData && typeof peakData === 'object'
        ? (peakData['Trail Names'] || peakData.trailNames || '')
        : '';
      const trailNames = Array.isArray(rawTrailNames)
        ? rawTrailNames.map((name) => String(name).trim()).filter(Boolean)
        : String(rawTrailNames)
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean);
      const trailType = peakData && typeof peakData === 'object'
        ? (peakData['Trail Type'] || peakData.trailType || '')
        : '';
      const typicalCompletionTime = peakData && typeof peakData === 'object'
        ? (peakData['Typical Completion Time'] || peakData.typicalCompletionTime || '')
        : '';
      const trailAdditionalProps = [];
      const mountainId = `${canonicalUrl}#mountain`;
      const mountain = {
        '@context': 'https://schema.org',
        '@type': 'Mountain',
        '@id': mountainId,
        name: peakName,
        description: summaryText,
        image: imageRefs.length ? imageRefs : normalizedHeroImageUrl,
        url: canonicalUrl,
        hasPart: narrativeParts.length ? narrativeParts : undefined,
        additionalProperty: []
      };
      const addPropertyValue = (name, value) => {
        const text = normalizePropertyValue(value);
        if (!text) return;
        mountain.additionalProperty.push({ '@type': 'PropertyValue', name, value: text });
      };

      if (elevation) {
        addPropertyValue('Elevation (ft)', elevation.replace(/ ft$/, ''));
      }
      if (prominence) {
        addPropertyValue('Prominence (ft)', prominence.replace(/ ft$/, ''));
      }
      if (rangeVal) {
        addPropertyValue('Range', rangeVal);
      }

      if (peakData && typeof peakData === 'object') {
        const peakProperties = [
          ['Difficulty', peakData['Difficulty']],
          ['Trail Type', peakData['Trail Type']],
          ['Standard Routes', peakData['Standard Routes']],
          ['Typical Completion Time', peakData['Typical Completion Time']],
          ['Best Seasons to Hike', peakData['Best Seasons to Hike']],
          ['Exposure Level', peakData['Exposure Level']],
          ['Terrain Character', peakData['Terrain Character']],
          ['Scramble Sections', peakData['Scramble Sections']],
          ['Water Availability', peakData['Water Availability']],
          ['Cell Reception Quality', peakData['Cell Reception Quality']],
          ['Weather Exposure Rating', peakData['Weather Exposure Rating']],
          ['Emergency Bailout Options', peakData['Emergency Bailout Options']],
          ['Dog Friendly', peakData['Dog Friendly']],
          ['Summit Marker Type', peakData['Summit Marker Type']],
          ['View Type', peakData['View Type']],
          ['Flora/Environment Zones', peakData['Flora/Environment Zones']],
          ['Nearby Notable Features', peakData['Nearby Notable Features']],
          ['Nearby 4000-footer Connections', peakData['Nearby 4000-footer Connections']],
          ['Trail Names', peakData['Trail Names']],
          ['Most Common Trailhead', peakData['Most Common Trailhead']],
          ['Parking Notes', peakData['Parking Notes']]
        ];

        for (const [name, value] of peakProperties) {
          addPropertyValue(name, value);
        }
      }
      if (Number.isFinite(Number(difficultyEntry?.technicalDifficulty))) {
        addPropertyValue('Technical Difficulty (1-10)', Number(difficultyEntry.technicalDifficulty));
      }
      if (Number.isFinite(Number(difficultyEntry?.physicalEffort))) {
        addPropertyValue('Physical Effort (1-10)', Number(difficultyEntry.physicalEffort));
      }
      if (Array.isArray(riskEntry?.risk_factors) && riskEntry.risk_factors.length) {
        addPropertyValue('Risk Factors', riskEntry.risk_factors.join(', '));
      }
      if (typeof riskEntry?.prep_notes === 'string' && riskEntry.prep_notes.trim()) {
        addPropertyValue('Preparation Notes', riskEntry.prep_notes.trim());
      }
      if (Number.isFinite(Number(weatherSnapshot?.windMph))) {
        addPropertyValue('Current Wind Speed (mph)', Number(weatherSnapshot.windMph));
      }
      if (Number.isFinite(Number(weatherSnapshot?.temperatureF))) {
        addPropertyValue('Current Temperature (F)', Number(weatherSnapshot.temperatureF));
      }
      mountain.publisher = { '@id': `${SITE}/#organization` };
      if (coords.lat && coords.lon) {
        mountain.geo = { '@type': 'GeoCoordinates', latitude: coords.lat, longitude: coords.lon };
      }
      const trailheadValue = typeof parkingEntry?.trailheadName === 'string'
        ? parkingEntry.trailheadName.trim()
        : (typeof peakData?.['Most Common Trailhead'] === 'string' ? peakData['Most Common Trailhead'].trim() : '');
      const parkingValue = typeof parkingEntry?.notes === 'string'
        ? parkingEntry.notes.trim()
        : (typeof peakData?.['Parking Notes'] === 'string' ? peakData['Parking Notes'].trim() : '');
      const parkingLat = toNumber(parkingEntry?.parkingLat);
      const parkingLng = toNumber(parkingEntry?.parkingLng);
      const parkingCapacity = toNumber(parkingEntry?.capacity);
      const parkingFullBy = typeof parkingEntry?.fullBy === 'string' ? parkingEntry.fullBy.trim() : '';
      if (trailheadValue || parkingValue || parkingLat !== null || parkingLng !== null) {
        mountain.containsPlace = {
          '@type': 'ParkingFacility',
          name: trailheadValue || `${peakName} trailhead parking`,
          description: parkingValue || undefined,
          geo: parkingLat !== null && parkingLng !== null
            ? {
              '@type': 'GeoCoordinates',
              latitude: parkingLat,
              longitude: parkingLng
            }
            : undefined,
          maximumAttendeeCapacity: parkingCapacity !== null ? parkingCapacity : undefined,
          additionalProperty: parkingFullBy
            ? [{ '@type': 'PropertyValue', name: 'Full By', value: parkingFullBy }]
            : undefined
        };
      }
      if (weatherSnapshot && (weatherSnapshot.summary || weatherSnapshot.windMph || weatherSnapshot.temperatureF)) {
        mountain.weather = {
          '@type': 'WeatherObservation',
          dateObserved: weatherSnapshot.fetchedAt || new Date().toISOString(),
          description: weatherSnapshot.summary || undefined,
          windSpeed: Number.isFinite(Number(weatherSnapshot.windMph)) ? Number(weatherSnapshot.windMph) : undefined,
          temperature: Number.isFinite(Number(weatherSnapshot.temperatureF)) ? Number(weatherSnapshot.temperatureF) : undefined
        };
      }
      if (!mountain.additionalProperty.length) {
        delete mountain.additionalProperty;
      }
      const hikingTrail = {
        '@context': 'https://schema.org',
        '@type': 'HikingTrail',
        '@id': `${canonicalUrl}#trail`,
        name: trailNames.length ? trailNames.join(' / ') : `${peakName} hiking trail`,
        alternateName: trailNames.length > 1 ? trailNames : undefined,
        trailType: trailType || undefined,
        timeRequired: typicalCompletionTime || undefined,
        additionalProperty: dogFriendly
          ? trailAdditionalProps.concat({
            '@type': 'PropertyValue',
            name: 'Dog Friendly',
            value: dogFriendly
          })
          : trailAdditionalProps,
        about: { '@id': mountainId }
      };
      return { mountain, hikingTrail, creativeWork, imageObjects };
    }

    async function serveCatalog() {
      const canonicalUrl = isFrench ? `${SITE}/fr/catalog` : `${SITE}/catalog`;
      const title = isFrench
        ? 'Catalogue des sommets NH48 - Guides, photos et donnees'
        : 'NH48 Peak Catalog - Guide-first list of New Hampshire\'s 4,000-footers';
      const description = isFrench
        ? 'Parcourez les 48 sommets NH48 avec contexte de randonnee, niveau de difficulte, photos et acces secondaire aux donnees API.'
        : 'Browse all 48 NH4K peaks with hiking context, difficulty, range groupings, and mountain photos, with developer API access available as a secondary option.';
      const altText = isFrench
        ? 'Apercu du catalogue NH48 avec photos et donnees des sommets.'
        : 'Preview of the NH48 Peak Catalog with peak photos and data.';
      const peaks = await loadPeaks();
      const peakEntries = Array.isArray(peaks)
        ? peaks.map((peak, index) => [peak?.slug || `peak-${index + 1}`, peak])
        : Object.entries(peaks || {});
      const [sameAsLookup, legacySameAsLookup, entityLinks] = await Promise.all([
        loadJsonCache('sameAs', RAW_SAME_AS_URL),
        loadJsonCache('sameAs:legacy', RAW_LEGACY_SAME_AS_URL),
        loadEntityLinks()
      ]);
      const peakAuthorityLinks = Array.isArray(entityLinks?.peakAuthorityLinks) ? entityLinks.peakAuthorityLinks : [];

      const imageObjects = [];
      const itemListElement = [];
      for (let i = 0; i < peakEntries.length; i += 1) {
        const [slug, peak] = peakEntries[i] || [];
        if (!peak || !slug) continue;
        const peakSlug = String(slug).trim();
        const peakName = peak.peakName || peak.name || peak['Peak Name'] || peakSlug;
        const peakUrl = isFrench
          ? `${SITE}/fr/peak/${encodeURIComponent(peakSlug)}`
          : `${SITE}/peak/${encodeURIComponent(peakSlug)}`;
        const peakId = `${peakUrl}#mountain`;
        const peakSameAs = mergePeakSameAsSources(
          sameAsLookup?.[slug],
          legacySameAsLookup?.[slug],
          peakAuthorityLinks
        );
        const primaryPhoto = getPrimaryPhoto(peak.photos);

        let imageId = '';
        if (primaryPhoto && primaryPhoto.url) {
          const fullUrl = normalizeCatalogPhotoUrl(primaryPhoto.url, { width: 1600, format: 'jpg' });
          const thumbUrl = normalizeCatalogPhotoUrl(primaryPhoto.url, { width: 400, format: 'jpg' });
          imageId = `${peakUrl}#photo`;
          const isFineArt = !!primaryPhoto.isFineArt;
          const imageObject = {
            '@type': isFineArt ? ['ImageObject', 'Photograph', 'VisualArtwork'] : ['ImageObject', 'Photograph'],
            '@id': imageId,
            url: fullUrl,
            contentUrl: fullUrl,
            thumbnailUrl: thumbUrl,
            name: buildPhotoTitleUnique(peakName, primaryPhoto),
            caption: buildPhotoCaptionUnique(peakName, primaryPhoto),
            description: buildPhotoCaptionUnique(peakName, primaryPhoto),
            inLanguage: isFrench ? 'fr' : 'en',
            creditText: RIGHTS_DEFAULTS.creditText,
            creator: { '@type': 'Person', name: RIGHTS_DEFAULTS.creatorName, url: `${SITE}/about` },
            copyrightHolder: { '@type': 'Person', name: RIGHTS_DEFAULTS.creatorName },
            copyrightNotice: `(c) ${RIGHTS_DEFAULTS.creatorName}`,
            license: CATALOG_IMAGE_LICENSE_URL,
            acquireLicensePage: RIGHTS_DEFAULTS.acquireLicensePageUrl,
            sameAs: peakSameAs
          };
          if (isFineArt) {
            imageObject.artform = 'Photography';
            imageObject.artEdition = 'Open edition';
            imageObject.artMedium = 'Digital photography';
          }
          imageObjects.push(imageObject);
        }

        const rangeName = String(peak['Range / Subrange'] || peak.range || '').trim();
        const trailType = String(peak['Trail Type'] || peak.trailType || '').trim();
        const difficulty = String(peak['Difficulty'] || peak.difficulty || '').trim();
        const exposure = String(peak['Exposure Level'] || peak['Weather Exposure Rating'] || peak.exposureLevel || '').trim();
        const standardRoutes = String(peak['Standard Routes'] || peak.standardRoutes || '').trim();
        const typicalCompletionTime = String(peak['Typical Completion Time'] || peak.typicalCompletionTime || '').trim();
        const coords = parseCoords(peak.lat || peak.latitude || peak['Coordinates'] || '');

        const additionalProperty = [
          rangeName ? { '@type': 'PropertyValue', name: 'Range / Subrange', value: rangeName } : null,
          trailType ? { '@type': 'PropertyValue', name: 'Trail Type', value: trailType } : null,
          difficulty ? { '@type': 'PropertyValue', name: 'Difficulty', value: difficulty } : null,
          exposure ? { '@type': 'PropertyValue', name: 'Exposure Level', value: exposure } : null,
          standardRoutes ? { '@type': 'PropertyValue', name: 'Standard Routes', value: standardRoutes } : null,
          typicalCompletionTime ? { '@type': 'PropertyValue', name: 'Typical Completion Time', value: typicalCompletionTime } : null
        ].filter(Boolean);

        const mountainNode = {
          '@type': 'Mountain',
          '@id': peakId,
          name: peakName,
          url: peakUrl,
          identifier: peakSlug,
          elevation: formatFeet(peak['Elevation (ft)'] || peak.elevation),
          prominence: formatFeet(peak['Prominence (ft)'] || peak.prominence),
          sameAs: peakSameAs
        };
        if (imageId) mountainNode.image = { '@id': imageId };
        if (rangeName) mountainNode.containedInPlace = { '@type': 'Place', name: rangeName };
        if (coords.lat !== null && coords.lon !== null) {
          mountainNode.geo = { '@type': 'GeoCoordinates', latitude: coords.lat, longitude: coords.lon };
        }
        if (additionalProperty.length) mountainNode.additionalProperty = additionalProperty;

        itemListElement.push({
          '@type': 'ListItem',
          position: i + 1,
          item: mountainNode
        });
      }

      const heroImage = imageObjects[0]?.url || DEFAULT_IMAGE;
      const ogCard = await resolveOgCard(pathname);
      const socialImage = ogCard?.image || heroImage;
      const socialImageAlt = ogCard?.imageAlt || altText;

      const datasetSchema = buildCatalogDataset({
        canonicalUrl,
        title,
        description,
        imageObjects
      });
      const imageGallerySchema = {
        '@context': 'https://schema.org',
        '@type': 'ImageGallery',
        '@id': `${canonicalUrl}#image-gallery`,
        name: 'NH48 Summit Photo Gallery',
        description: 'Primary summit photographs for all 48 New Hampshire four-thousand-footers in the NH48 catalog.',
        creator: { '@id': `${SITE}/#organization` },
        license: CATALOG_IMAGE_LICENSE_URL,
        about: { '@type': 'Dataset', '@id': `${canonicalUrl}#dataset`, name: title },
        associatedMedia: imageObjects
      };
      const peakItemListSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#peak-item-list`,
        name: 'NH48 Peak Catalog Mountain List',
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        numberOfItems: itemListElement.length,
        itemListElement
      };
      const breadcrumbSchema = buildCanonicalBreadcrumbSchema({
        routeId: 'catalog',
        canonicalUrl
      });
      const creativeWorks = await loadCreativeWorks();
      const catalogCreativeWork = buildCreativeWorkNode({
        entry: creativeWorks.catalog,
        fallbackType: 'ImageGallery',
        id: `${canonicalUrl}#creativework-gallery`,
        url: canonicalUrl,
        name: 'NH48 Summit Photo Gallery',
        description: 'A gallery of summit photographs for all 48 New Hampshire four-thousand-footers.',
        thumbnailUrl: heroImage,
        associatedMedia: imageObjects.map((img) => ({ '@id': img['@id'] })),
        datePublished: '2024-01-01'
      });
      const collections = await loadCollections();
      const collectionItems = itemListElement.map((item) => ({ '@id': item.item['@id'] }));
      const catalogCollection = buildCollectionObject({
        entry: collections.catalog,
        canonicalUrl,
        items: collectionItems
      });
      const globalSchemaNodes = await loadGlobalSchemaNodes();
      const catalogPageNodes = [
        datasetSchema,
        imageGallerySchema,
        peakItemListSchema,
        breadcrumbSchema,
        catalogCreativeWork,
        catalogCollection
      ].filter(Boolean);
      const jsonLdBlocks = mergeJsonLdBlocks(
        catalogPageNodes,
        globalSchemaNodes
      );

      const tplResp = await fetch(RAW_CATALOG_URL, NO_CACHE_FETCH);
      if (!tplResp.ok) {
        return new Response('Template unavailable', { status: 500 });
      }
      let html = await tplResp.text();
      // Fix relative paths in template (../css/ -> /css/, etc.)
      html = fixRelativePaths(html);
      html = stripBreadcrumbJsonLdScripts(html);
      html = stripBreadcrumbMicrodata(html);
      const [navHtml, footerHtml] = await Promise.all([
        loadPartial('nav', RAW_NAV_URL),
        loadPartial('footer', RAW_FOOTER_URL)
      ]);
      html = injectNavFooter(stripHeadMeta(html), navHtml, footerHtml, pathname, 'catalog');
      html = injectBuildDate(html, buildDate);
      const catalogFallbackHtml = buildCrawlerImageFallbackHtml({
        peaks,
        variant: 'catalog',
        limit: 48
      });
      html = injectCrawlerFallbackAfterContainer(html, 'grid', catalogFallbackHtml);

      const metaBlock = [
        `<title>${esc(title)}</title>`,
        `<meta name="description" content="${esc(description)}" />`,
        `<meta name="keywords" content="NH48 API, NH48 catalog, New Hampshire 4000 footers, peak metadata, hiking data, mountain photos" />`,
        `<meta name="robots" content="index,follow,max-image-preview:large" />`,
        `<meta name="author" content="Nathan Sobol" />`,
        `<meta property="og:site_name" content="NH48pics" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        `<meta property="og:description" content="${esc(description)}" />`,
        `<meta property="og:image" content="${socialImage}" />`,
        `<meta property="og:image:alt" content="${esc(socialImageAlt)}" />`,
        `<meta property="og:url" content="${canonicalUrl}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:site" content="@nate_dumps_pics" />`,
        `<meta name="twitter:creator" content="@nate_dumps_pics" />`,
        `<meta name="twitter:url" content="${canonicalUrl}" />`,
        `<meta name="twitter:title" content="${esc(title)}" />`,
        `<meta name="twitter:description" content="${esc(description)}" />`,
        `<meta name="twitter:image" content="${socialImage}" />`,
        `<meta name="twitter:image:alt" content="${esc(socialImageAlt)}" />`,
        `<link rel="canonical" href="${canonicalUrl}" />`,
        `<link rel="alternate" hreflang="en" href="${SITE}/catalog" />`,
        `<link rel="alternate" hreflang="fr" href="${SITE}/fr/catalog" />`,
        `<link rel="alternate" hreflang="x-default" href="${SITE}/catalog" />`,
        ...jsonLdBlocks.map(
          (block) => `<script type="application/ld+json">${JSON.stringify(block).replace(/</g, '\\u003c')}</script>`
        )
      ].join('\n');
      html = html.replace(/<\/head>/i, `${metaBlock}\n</head>`);
      html = injectClientRuntimeCore(html);

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'index, follow'
        }
      });
    }

    async function serveTemplatePage({
      templatePath,
      pathname,
      routeId,
      meta,
      jsonLd,
      breadcrumbContext = {},
      includeBreadcrumb = true,
      stripTemplateJsonLd = false,
      stripTemplateBreadcrumbJsonLd = true,
      bodyDataAttrs = null,
      hideFooter = false,
      prependBodyHtml = '',
      templateReplacements = null
    }) {
      const templateUrl = `${RAW_BASE}/${templatePath}`;
      const rawHtml = await loadTextCache(`tpl:${templatePath}`, templateUrl);
      if (!rawHtml || rawHtml.length < 100) {
        console.error(`[serveTemplatePage] Template empty or unavailable: ${templateUrl}`);
        return new Response(`<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Template Unavailable</h1><p>Could not load: ${templatePath}</p><p>URL: ${templateUrl}</p><p>Length: ${rawHtml ? rawHtml.length : 0} bytes</p></body></html>`, {
          status: 500,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
      const [navHtml, footerHtml] = await Promise.all([
        loadPartial('nav', RAW_NAV_URL),
        loadPartial('footer', RAW_FOOTER_URL)
      ]);
      // Fix relative paths in template (../css/ -> /css/, etc.)
      let html = fixRelativePaths(rawHtml);
      html = applyTemplateReplacements(html, templateReplacements);
      if (stripTemplateJsonLd) {
        html = stripJsonLdScripts(html);
      } else if (stripTemplateBreadcrumbJsonLd) {
        html = stripBreadcrumbJsonLdScripts(html);
      }
      html = stripBreadcrumbMicrodata(html);
      html = stripHeadMeta(html);
      html = injectNavFooter(html, navHtml, footerHtml, pathname, routeId, bodyDataAttrs, {
        includeFooter: !hideFooter
      });
      if (prependBodyHtml) {
        html = injectBodyStartHtml(html, prependBodyHtml);
      }
      html = injectBuildDate(html, buildDate);
      const globalSchemaNodes = await loadGlobalSchemaNodes();
      const pageJsonLd = Array.isArray(jsonLd) ? [...jsonLd] : [];
      if (includeBreadcrumb) {
        const breadcrumbSchema = buildCanonicalBreadcrumbSchema({
          routeId,
          canonicalUrl: meta?.canonical,
          context: breadcrumbContext
        });
        if (breadcrumbSchema) {
          pageJsonLd.push(breadcrumbSchema);
        }
      }
      const mergedJsonLd = mergeJsonLdBlocks(pageJsonLd, globalSchemaNodes);
      const ogCard = await resolveOgCard(pathname);
      const metaBlock = buildMetaBlock({
        ...meta,
        image: ogCard?.image || meta?.image,
        imageAlt: ogCard?.imageAlt || meta?.imageAlt,
        jsonLd: mergedJsonLd
      });
      html = html.replace(/<\/head>/i, `${metaBlock}\n</head>`);
      html = injectClientRuntimeCore(html);
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': meta.robotsTag || 'index, follow'
        }
      });
    }

    // Homepage route handler
    const isHomepage = pathname === '/' || pathname === '/fr/' || pathname === '/fr';
    if (isHomepage) {
      const canonical = isFrench ? `${SITE}/fr/` : `${SITE}/`;
      const title = isFrench
        ? 'NH48: Guides, photos et donnees des sommets de 4 000 pieds du New Hampshire'
        : 'NH48: New Hampshire 4,000-Footers Guides, Photos, Routes, and Open Data';
      const description = isFrench
        ? 'Explorez les guides des 48 sommets NH, les photos, les routes et les donnees ouvertes pour planifier vos sorties dans les White Mountains.'
        : 'Explore the full NH48 destination hub: 48 peak guides, route planning context, mountain photography, and open datasets for New Hampshire\'s four-thousand-footers.';
      const [creativeWorks, homepageTemplateHtml, splashManifestPayload, splashAltPayload, entityLinks] = await Promise.all([
        loadCreativeWorks(),
        loadTextCache('homepage:template', RAW_HOMEPAGE_TEMPLATE_URL),
        loadJsonCache('homepage:splash-manifest', RAW_SPLASH_MANIFEST_URL),
        loadJsonCache('homepage:splash-alt', RAW_SPLASH_ALT_TEXT_URL),
        loadEntityLinks()
      ]);
      const homepageCardMedia = extractHomepageCardMedia(homepageTemplateHtml);
      const splashAltLookup = buildSplashAltLookup(splashAltPayload);
      const homepageSplashMedia = extractHomepageSplashMedia(splashManifestPayload, splashAltLookup);
      const homepageMedia = mergeHomepageMediaSources(homepageCardMedia, homepageSplashMedia);
      const homepageImageObjects = homepageMedia.map((media, index) => ({
        '@context': 'https://schema.org',
        '@type': 'ImageObject',
        '@id': `${canonical}#homepage-image-${index + 1}`,
        url: media.url,
        contentUrl: media.contentUrl,
        name: media.name,
        description: media.description,
        caption: media.caption,
        inLanguage: isFrench ? 'fr' : 'en',
        license: CATALOG_IMAGE_LICENSE_URL,
        acquireLicensePage: RIGHTS_DEFAULTS.acquireLicensePageUrl,
        creditText: RIGHTS_DEFAULTS.creditText,
        copyrightNotice: RIGHTS_DEFAULTS.copyrightNotice,
        creator: {
          '@type': 'Person',
          name: RIGHTS_DEFAULTS.creatorName,
          url: `${SITE}/about`
        }
      }));
      const homepageImageRefs = homepageImageObjects.map((image) => ({ '@id': image['@id'] }));
      const homepagePrimaryImage = homepageImageObjects[0]?.url || HOME_SOCIAL_IMAGE;

      const homepageDatasetDefinitions = [
        {
          id: `${SITE}/#dataset-nh48-peaks`,
          name: isFrench ? 'Jeu de donnees NH48 Peaks' : 'NH48 Peaks Dataset',
          description: isFrench
            ? 'Donnees structurees pour les 48 sommets de 4 000 pieds du New Hampshire.'
            : 'Structured data for the 48 four-thousand-foot peaks in New Hampshire.',
          url: `${SITE}/catalog`,
          keywords: ['NH48', 'White Mountains', '4000 footers', 'peak metadata', 'photo metadata'],
          distribution: [
            { '@type': 'DataDownload', contentUrl: `${SITE}/data/nh48.json`, encodingFormat: 'application/json' },
            { '@type': 'DataDownload', contentUrl: 'https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48.json', encodingFormat: 'application/json' },
            { '@type': 'DataDownload', contentUrl: 'https://raw.githubusercontent.com/natesobol/nh48-api/main/data/nh48.json', encodingFormat: 'application/json' }
          ],
          spatialCoverage: { '@type': 'Place', name: 'White Mountain National Forest' }
        },
        {
          id: `${SITE}/#dataset-white-mountain-trails`,
          name: isFrench ? 'Jeu de donnees des sentiers WMNF' : 'White Mountain Trails Dataset',
          description: isFrench
            ? 'Geometries et metadonnees des sentiers de la White Mountain National Forest.'
            : 'Trail geometries and metadata for the White Mountain National Forest.',
          url: `${SITE}/trails`,
          keywords: ['WMNF trails', 'hiking trails', 'trail metadata', 'geospatial data'],
          distribution: [
            { '@type': 'DataDownload', contentUrl: `${SITE}/data/wmnf-trails/wmnf-main.json`, encodingFormat: 'application/json' },
            { '@type': 'DataDownload', contentUrl: `${SITE}/data/trails_with_osm.json`, encodingFormat: 'application/json' }
          ],
          spatialCoverage: { '@type': 'Place', name: 'White Mountain National Forest' }
        },
        {
          id: `${SITE}/#dataset-long-trails`,
          name: isFrench ? 'Jeu de donnees des longs sentiers' : 'Long Trails Dataset',
          description: isFrench
            ? 'Routes de longue distance avec segments et metadonnees.'
            : 'Long-distance hiking routes with segmented trail metadata.',
          url: `${SITE}/long-trails`,
          keywords: ['long trails', 'thru-hike routes', 'route metadata', 'distance trails'],
          distribution: [
            { '@type': 'DataDownload', contentUrl: `${SITE}/data/long-trails-index.json`, encodingFormat: 'application/json' },
            { '@type': 'DataDownload', contentUrl: `${SITE}/data/long-trails-full.json`, encodingFormat: 'application/json' }
          ],
          spatialCoverage: { '@type': 'Place', name: 'North America' }
        },
        {
          id: `${SITE}/#dataset-howker-plants`,
          name: isFrench ? 'Jeu de donnees des plantes Howker' : 'Howker Ridge Plant Catalog Dataset',
          description: isFrench
            ? 'Observations de plantes alpines et subalpines sur Howker Ridge.'
            : 'Alpine and subalpine plant observations from the Howker Ridge Trail.',
          url: `${SITE}/plant-catalog`,
          keywords: ['Howker Ridge plants', 'alpine flora', 'botanical dataset', 'plant catalog'],
          distribution: [
            { '@type': 'DataDownload', contentUrl: `${SITE}/data/howker-plants`, encodingFormat: 'application/json' }
          ],
          spatialCoverage: { '@type': 'Place', name: 'White Mountain National Forest' }
        }
      ];
      const homepageDatasetNodes = homepageDatasetDefinitions.map((dataset) => ({
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        '@id': dataset.id,
        name: dataset.name,
        description: dataset.description,
        url: dataset.url,
        license: 'https://creativecommons.org/licenses/by/4.0/',
        creator: { '@id': `${SITE}/#organization` },
        publisher: { '@id': `${SITE}/#organization` },
        isAccessibleForFree: true,
        keywords: dataset.keywords,
        distribution: dataset.distribution,
        spatialCoverage: dataset.spatialCoverage
      }));
      const homepageDataCatalogNode = {
        '@context': 'https://schema.org',
        '@type': 'DataCatalog',
        '@id': `${SITE}/#dataset-catalog`,
        name: isFrench ? 'Catalogue NH48 guides + donnees' : 'NH48 Guides and Data Catalog',
        description: isFrench
          ? 'Catalogue des guides NH48 et des donnees publiques sur les sommets, sentiers et plantes alpines.'
          : 'Catalog of NH48 hiking guides plus public datasets for peaks, trails, and alpine plants.',
        url: isFrench ? `${SITE}/fr/dataset` : `${SITE}/dataset`,
        creator: { '@id': `${SITE}/#organization` },
        dataset: homepageDatasetDefinitions.map((dataset) => ({ '@id': dataset.id }))
      };
      const homepageWebPageNode = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${canonical}#homepage`,
        url: canonical,
        name: isFrench
          ? 'NH48: guides et donnees des sommets de 4 000 pieds'
          : 'NH48: New Hampshire 4,000-Footers guide and data hub',
        description,
        inLanguage: isFrench ? 'fr' : 'en',
        isPartOf: { '@id': `${SITE}/#website` },
        hasPart: homepageDatasetDefinitions.map((dataset) => ({ '@id': dataset.id })),
        primaryImageOfPage: homepageImageObjects.length ? { '@id': homepageImageObjects[0]['@id'] } : undefined
      };
      if (!homepageWebPageNode.primaryImageOfPage) {
        delete homepageWebPageNode.primaryImageOfPage;
      }
      const homepageNavigationNode = {
        '@context': 'https://schema.org',
        '@type': 'SiteNavigationElement',
        '@id': `${SITE}/#main-nav`,
        name: isFrench
          ? ['Accueil', 'Catalogue NH48', 'Sentiers White Mountain', 'Longs sentiers', 'Catalogue plantes Howker', 'Infos Howker Ridge']
          : ['Home', 'NH48 Catalog', 'White Mountain Trails', 'Long Trails', 'Howker Plant Catalog', 'Howker Ridge Info'],
        url: [
          isFrench ? `${SITE}/fr/` : `${SITE}/`,
          `${SITE}/catalog`,
          `${SITE}/trails`,
          `${SITE}/long-trails`,
          `${SITE}/plant-catalog`,
          `${SITE}/projects/hrt-info`
        ]
      };
      const homepageCreativeWork = buildCreativeWorkNode({
        entry: creativeWorks.index,
        fallbackType: 'CreativeWorkSeries',
        id: `${canonical}#creativework-series`,
        url: canonical,
        name: 'NH48pics Fine Art Collection',
        description: 'A curated series of fine-art photographs capturing the beauty of New Hampshire\'s 4,000-footers and alpine flora.',
        thumbnailUrl: homepagePrimaryImage,
        associatedMedia: homepageImageRefs,
        datePublished: '2024-01-01',
        imageObjects: homepageImageObjects
      });
      const homepageOrganizationNode = withEntityLinks({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${SITE}/#organization`,
        name: 'NH48pics',
        legalName: 'NH48pics.com',
        url: `${SITE}/`,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE}/nh48API_logo.png`,
          width: 512,
          height: 512
        },
        description: 'Professional mountain photography covering the New Hampshire 4,000-footers and beyond.',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'White Mountains',
          addressRegion: 'NH',
          addressCountry: 'US'
        },
        founder: { '@id': `${SITE}/#person-nathan-sobol` }
      }, entityLinks?.organization);
      const homepagePersonNode = withEntityLinks({
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': `${SITE}/#person-nathan-sobol`,
        name: 'Nathan Sobol',
        alternateName: 'Nathan Sobol Photography',
        url: `${SITE}/about/`,
        image: `${SITE}/nathan-sobol.jpg`,
        description: 'Nathan Sobol is a landscape photographer and hiker who has documented every 4,000-footer in New Hampshire. As the founder of NH48pics, he combines his passion for the White Mountains with professional photography, offering high-quality prints and trail resources.',
        jobTitle: ['Landscape Photographer', 'Founder of NH48pics'],
        worksFor: { '@id': `${SITE}/#organization` },
        homeLocation: {
          '@type': 'Place',
          name: 'White Mountains',
          address: {
            '@type': 'PostalAddress',
            addressRegion: 'NH',
            addressCountry: 'US'
          }
        },
        knowsLanguage: ['en']
      }, entityLinks?.person);
      const homepageWebsiteNode = withEntityLinks({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        name: 'NH48pics',
        url: `${SITE}/`,
        description: 'Fine-art photography and trail resources for the NH 48 4,000-footers.',
        publisher: { '@id': `${SITE}/#organization` },
        copyrightHolder: { '@id': `${SITE}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE}/catalog?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        },
        inLanguage: ['en', 'fr']
      }, entityLinks?.website);
      const jsonLd = [
        homepageOrganizationNode,
        homepagePersonNode,
        homepageWebsiteNode,
        homepageWebPageNode,
        homepageDataCatalogNode,
        ...homepageDatasetNodes,
        homepageNavigationNode,
        homepageCreativeWork,
        {
          '@context': 'https://schema.org',
          '@type': 'SportsActivityLocation',
          '@id': `${SITE}/#nh48-challenge`,
          name: 'NH48 Four-Thousand Footer Challenge',
          description: 'Complete all 48 of New Hampshire\'s four-thousand-foot peaks. A multi-year hiking challenge covering approximately 350 miles of trail and 170,000 feet of cumulative elevation gain.',
          url: SITE,
          geo: {
            '@type': 'GeoCoordinates',
            latitude: 44.2706,
            longitude: -71.3033,
            name: 'White Mountain National Forest, New Hampshire'
          },
          containedInPlace: {
            '@type': 'AdministrativeArea',
            name: 'New Hampshire, United States'
          },
          amenityFeature: [
            { '@type': 'LocationFeatureSpecification', name: 'Total Peaks', value: '48' },
            { '@type': 'LocationFeatureSpecification', name: 'Total Trail Distance', value: '~350 miles' },
            { '@type': 'LocationFeatureSpecification', name: 'Total Elevation Gain', value: '~170,000 feet' },
            { '@type': 'LocationFeatureSpecification', name: 'Above Treeline Peaks', value: '15' },
            { '@type': 'LocationFeatureSpecification', name: 'Minimum Day Hikes', value: '~20 with efficient groupings' },
            { '@type': 'LocationFeatureSpecification', name: 'Typical Completion Time', value: '1-4 years' }
          ]
        },
        {
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          '@id': `${SITE}/#nh48-howto`,
          name: 'How to Complete the NH48 Challenge',
          description: 'A guide to completing New Hampshire\'s 48 four-thousand-foot peaks, from beginner-friendly summits to severe alpine challenges.',
          totalTime: 'P2Y',
          estimatedCost: {
            '@type': 'MonetaryAmount',
            currency: 'USD',
            value: '0',
            description: 'Free to hike (parking fees may apply at some trailheads)'
          },
          step: [
            {
              '@type': 'HowToStep',
              position: 1,
              name: 'Start with Beginner Peaks',
              text: 'Begin with the 10 easiest peaks: Tecumseh, Hale, Jackson, Pierce, Osceola, Waumbek, Garfield, Eisenhower, Cannon, and Moosilauke.'
            },
            {
              '@type': 'HowToStep',
              position: 2,
              name: 'Build Experience with Moderate Peaks',
              text: 'Progress to the 15 moderate peaks including the Hancocks, Cabot, Galehead, and Passaconaway to build stamina and navigation skills.'
            },
            {
              '@type': 'HowToStep',
              position: 3,
              name: 'Take on Challenging Peaks',
              text: 'Tackle the 15 challenging peaks like Lafayette, Lincoln, Carrigain, Wildcats, and Tripyramids with proper preparation.'
            },
            {
              '@type': 'HowToStep',
              position: 4,
              name: 'Summit the Severe Alpine Peaks',
              text: 'Complete the 8 most difficult peaks including Washington, Adams, Jefferson, Madison, and the Bonds. These require excellent fitness and careful weather planning.'
            }
          ],
          supply: [
            { '@type': 'HowToSupply', name: 'Hiking boots' },
            { '@type': 'HowToSupply', name: '2-4 liters of water' },
            { '@type': 'HowToSupply', name: 'Extra layers for alpine zones' },
            { '@type': 'HowToSupply', name: 'Map and compass or GPS' },
            { '@type': 'HowToSupply', name: 'Ten essentials' }
          ]
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          '@id': `${SITE}/#nh48-faq`,
          mainEntity: [
            {
              '@type': 'Question',
              name: 'How many miles is the NH48 challenge?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'The total distance is approximately 250-500 miles depending on your route choices and how efficiently you group peaks. With optimal groupings, you can cover around 350 miles total.'
              }
            },
            {
              '@type': 'Question',
              name: 'How much elevation gain is the NH48?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'The cumulative elevation gain is approximately 170,000 feet - equivalent to climbing Mount Everest from sea level about 6 times.'
              }
            },
            {
              '@type': 'Question',
              name: 'How long does it take to complete the NH48?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Most hikers complete the NH48 in 1-4 years. Speed runners may finish in 18-20 day hikes over one year, while scenic hikers may take 4-6+ years enjoying each peak individually.'
              }
            },
            {
              '@type': 'Question',
              name: 'What are the easiest NH48 peaks?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'The easiest peaks include Mount Tecumseh (shortest of the 48), Mount Hale, Mount Jackson, Mount Pierce, Mount Osceola, Mount Waumbek, Mount Garfield, Mount Eisenhower, Cannon Mountain, and Mount Moosilauke.'
              }
            },
            {
              '@type': 'Question',
              name: 'What are the hardest NH48 peaks?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'The most challenging peaks include Mount Washington (highest, extreme weather), Mount Adams, Mount Jefferson, Mount Madison, Mount Lafayette, Mount Lincoln, Bondcliff, West Bond, Owl\'s Head, and Mount Isolation.'
              }
            }
          ]
        }
      ].concat(homepageImageObjects);
      return serveTemplatePage({
        templatePath: 'pages/index.html',
        pathname,
        routeId: 'home',
        meta: {
          title,
          description,
          canonical,
          alternateEn: `${SITE}/`,
          alternateFr: `${SITE}/fr/`,
          image: homepagePrimaryImage,
          imageAlt: isFrench
            ? 'Batiments et observatoire meteorologique au sommet du mont Washington'
            : 'Buildings and weather observatory atop Mount Washington in the White Mountains',
          ogType: 'website'
        },
        jsonLd,
        stripTemplateJsonLd: true
      });
    }

    const isCatalogRoute = (!isFrench && parts[0] === 'catalog' && parts.length === 1)
      || (isFrench && parts[1] === 'catalog' && parts.length === 2);
    if (isCatalogRoute) {
      return serveCatalog();
    }

    const isRangeCatalogRoute = !isFrench
      && (pathNoLocale === '/catalog/ranges' || pathNoLocale === '/catalog/ranges/');
    if (isRangeCatalogRoute) {
      const canonical = `${SITE}/catalog/ranges`;
      return serveTemplatePage({
        templatePath: 'catalog/ranges/index.html',
        pathname,
        routeId: 'range-catalog',
        meta: {
          title: 'NH48 Range Catalog - New Hampshire\'s mountain ranges',
          description: 'Explore NH48 mountain ranges with peak counts, highest summits, and photo highlights derived from the NH48 dataset.',
          canonical,
          image: DEFAULT_IMAGE,
          imageAlt: 'Preview of the NH48 Range Catalog',
          ogType: 'website'
        },
        jsonLd: []
      });
    }

    const isRangeDetailRoute = !isFrench && parts[0] === 'range' && parts.length >= 2;
    if (isRangeDetailRoute) {
      const canonical = `${SITE}${pathname.endsWith('/') ? pathname : `${pathname}/`}`;
      const rangeName = humanizeSlug(parts[1] || '');
      return serveTemplatePage({
        templatePath: 'range/index.html',
        pathname,
        routeId: 'range-detail',
        breadcrumbContext: { rangeName },
        meta: {
          title: 'NH48 Range Detail',
          description: 'View NH48 range details with peak lists, elevations, and highlight imagery.',
          canonical,
          image: DEFAULT_IMAGE,
          imageAlt: 'NH48 range preview',
          ogType: 'website'
        },
        jsonLd: []
      });
    }

    const { enPath, frPath } = buildAlternatePaths(pathname);

    if (pathNoLocale === '/nh48-map' || pathNoLocale === '/nh48-map/') {
      const canonical = `${SITE}${pathname.endsWith('/') ? pathname.slice(0, -1) : pathname}`;
      const creativeWorks = await loadCreativeWorks();
      const nh48MapCreativeWork = buildCreativeWorkNode({
        entry: creativeWorks['nh48-map'],
        fallbackType: 'Map',
        id: `${canonical}#map`,
        url: canonical,
        name: isFrench ? 'Carte NH48 interactive' : 'NH48 Interactive Map',
        description: isFrench
          ? 'Carte plein ecran des 48 sommets NH48 avec recherche, filtres et details par sommet.'
          : 'Fullscreen map of all 48 NH48 peaks with search, filters, and peak detail drill-down.',
        thumbnailUrl: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-washington/mount-washington__003.jpg'
      });
      return serveTemplatePage({
        templatePath: 'pages/nh48_map.html',
        pathname,
        routeId: 'nh48-map',
        bodyDataAttrs: { 'hide-footer': 'true' },
        hideFooter: true,
        meta: {
          title: isFrench ? 'NH48 Map - Carte interactive des 48 sommets NH' : 'NH48 Map - Interactive Map of all 48 NH Peaks',
          description: isFrench
            ? 'Explorez les 48 sommets NH48 sur une carte plein ecran avec filtres, recherche et liens vers chaque fiche sommet.'
            : 'Explore all 48 NH48 peaks on a fullscreen interactive map with filters, search, and direct links to each peak guide.',
          canonical,
          alternateEn: `${SITE}/nh48-map`,
          alternateFr: `${SITE}/fr/nh48-map`,
          image: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-washington/mount-washington__003.jpg',
          imageAlt: isFrench
            ? 'Sommet du mont Washington et terrain alpin des White Mountains.'
            : 'Mount Washington summit and alpine terrain in the White Mountains.',
          ogType: 'website'
        },
        jsonLd: [nh48MapCreativeWork].filter(Boolean)
      });
    }

    if (pathNoLocale === '/submit-edit' || pathNoLocale === '/submit-edit/') {
      const canonical = `${SITE}${pathname.endsWith('/') ? pathname.slice(0, -1) : pathname}`;
      return serveTemplatePage({
        templatePath: 'pages/submit_edit.html',
        pathname,
        routeId: 'submit-edit',
        meta: {
          title: 'Submit Edit to Author',
          description: 'Report incorrect or outdated information for NH48 peaks or the Howker Ridge plant catalog.',
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: 'NH48 API logo',
          ogType: 'website'
        },
        jsonLd: []
      });
    }

    if (pathNoLocale === '/dataset' || pathNoLocale === '/dataset/') {
      const datasets = [
        {
          name: 'NH48 Peaks',
          description: 'Peak metadata and photo catalog for New Hampshire 4,000-footers.',
          url: `${SITE}${isFrench ? '/fr' : ''}/catalog`,
          distribution: [
            { '@type': 'DataDownload', contentUrl: `${SITE}/data/nh48.json`, encodingFormat: 'application/json' }
          ]
        },
        {
          name: 'WMNF Trails',
          description: 'White Mountain National Forest trail geometries and metadata.',
          url: `${SITE}${isFrench ? '/fr' : ''}/dataset/wmnf-trails`,
          distribution: [
            { '@type': 'DataDownload', contentUrl: `${SITE}/data/wmnf-trails/wmnf-main.json`, encodingFormat: 'application/json' }
          ]
        },
        {
          name: 'Long-Distance Trails',
          description: 'Index of major long-distance trails with geometries and route stats.',
          url: `${SITE}${isFrench ? '/fr' : ''}/dataset/long-trails`,
          distribution: [
            { '@type': 'DataDownload', contentUrl: `${SITE}/data/long-trails-index.json`, encodingFormat: 'application/json' }
          ]
        },
        {
          name: 'Howker Alpine Plants',
          description: 'Alpine plant catalog with photos, descriptions, and habitat notes.',
          url: `${SITE}${isFrench ? '/fr' : ''}/dataset/howker-plants`,
          distribution: [
            { '@type': 'DataDownload', contentUrl: `${SITE}/data/howker-plants`, encodingFormat: 'application/json' }
          ]
        }
      ];
      const canonical = `${SITE}${pathname.endsWith('/') ? pathname.slice(0, -1) : pathname}`;
      const jsonLd = [
        buildDataCatalogSchema({
          canonicalUrl: canonical,
          title: isFrench ? 'Catalogue de donnees NH48' : 'NH48 Data Catalog',
          description: isFrench
            ? 'Jeu de donnees publiques pour les sommets, sentiers et plantes alpines des White Mountains.'
            : 'Public datasets for White Mountains peaks, trails, and alpine plants.',
          datasets
        })
      ];
      return serveTemplatePage({
        templatePath: 'dataset/index.html',
        pathname,
        routeId: 'dataset',
        meta: {
          title: isFrench ? 'Catalogue de donnees NH48' : 'NH48 Data Catalog',
          description: isFrench
            ? 'Explorez les jeux de donnees NH48 sur les sommets, les sentiers et les plantes alpines.'
            : 'Explore NH48 datasets for peaks, trails, and alpine plants.',
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: isFrench ? 'Apercu des jeux de donnees NH48' : 'NH48 dataset overview',
          ogType: 'website'
        },
        jsonLd
      });
    }

    if (pathNoLocale.startsWith('/dataset/')) {
      const datasetKey = pathNoLocale.split('/')[2];
      const datasetConfigs = {
        'wmnf-trails': {
          title: isFrench ? 'Donnees des sentiers WMNF' : 'WMNF Trails Dataset',
          description: isFrench
            ? 'Geometries et metadonnees des sentiers de la White Mountain National Forest.'
            : 'Trail geometries and metadata for the White Mountain National Forest.',
          templatePath: 'dataset/wmnf-trails/index.html',
          dataUrl: `${RAW_BASE}/data/wmnf-trails/wmnf-main.json`
        },
        'long-trails': {
          title: isFrench ? 'Donnees des longs sentiers' : 'Long-Distance Trails Dataset',
          description: isFrench
            ? 'Index des grands sentiers longue distance avec geometries et statistiques.'
            : 'Index of major long-distance trails with geometries and route stats.',
          templatePath: 'dataset/long-trails/index.html',
          dataUrl: `${RAW_BASE}/data/long-trails-index.json`
        },
        'howker-plants': {
          title: isFrench ? 'Donnees des plantes alpines' : 'Howker Alpine Plants Dataset',
          description: isFrench
            ? 'Catalogue des plantes alpines avec photos, descriptions et habitats.'
            : 'Alpine plant catalog with photos, descriptions, and habitats.',
          templatePath: 'dataset/howker-plants/index.html',
          dataUrl: `${RAW_BASE}/data/howker-plants`
        }
      };
      const config = datasetConfigs[datasetKey];
      if (config) {
        const data = await loadJsonCache(`dataset:${datasetKey}`, config.dataUrl);
        const recordCount = countRecords(data);
        const canonical = `${SITE}${pathname}`;
        const recordInfo = recordCount ? `Records: ${recordCount}.` : '';
        const fullDescription = `${config.description} ${recordInfo}`.trim();
        const jsonLd = [
          buildDatasetSchema({
            canonicalUrl: canonical,
            title: config.title,
            description: fullDescription,
            distribution: [
              {
                '@type': 'DataDownload',
                name: config.title,
                encodingFormat: 'application/json',
                contentUrl: config.dataUrl
              }
            ],
            keywords: [datasetKey, 'NH48', 'White Mountains', 'open data'],
            spatialCoverage: {
              '@type': 'Place',
              name: 'White Mountain National Forest'
            },
            license: 'https://creativecommons.org/licenses/by/4.0/',
            publisher: { '@id': `${SITE}/#organization` }
          })
        ];
        return serveTemplatePage({
          templatePath: config.templatePath,
          pathname,
          routeId: 'dataset-detail',
          breadcrumbContext: { datasetName: config.title },
          meta: {
            title: config.title,
            description: config.description,
            canonical,
            alternateEn: `${SITE}${enPath}`,
            alternateFr: `${SITE}${frPath}`,
            image: DEFAULT_IMAGE,
            imageAlt: config.title,
            ogType: 'website'
          },
          jsonLd
        });
      }
    }

    if (pathNoLocale === '/trails' || pathNoLocale === '/trails/') {
      const canonical = `${SITE}${pathname}`;
      const creativeWorks = await loadCreativeWorks();
      const trailsCreativeWork = buildCreativeWorkNode({
        entry: creativeWorks.trails,
        fallbackType: 'CreativeWork',
        id: `${canonical}#creativework`,
        url: canonical,
        name: isFrench ? 'Carte des sentiers WMNF' : 'WMNF Trails Map',
        description: isFrench
          ? 'Explorez les sentiers de la White Mountain National Forest avec une carte interactive.'
          : 'Explore White Mountain National Forest trails with an interactive map.',
        thumbnailUrl: DEFAULT_IMAGE
      });
      return serveTemplatePage({
        templatePath: 'trails/index.html',
        pathname,
        routeId: 'trails',
        meta: {
          title: isFrench ? 'Carte des sentiers WMNF' : 'WMNF Trails Map',
          description: isFrench
            ? 'Explorez les sentiers de la White Mountain National Forest avec une carte interactive.'
            : 'Explore White Mountain National Forest trails with an interactive map.',
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: isFrench ? 'Carte des sentiers WMNF' : 'WMNF trails map',
          ogType: 'website'
        },
        jsonLd: [trailsCreativeWork]
      });
    }

    if (pathNoLocale === '/long-trails' || pathNoLocale === '/long-trails/') {
      const canonical = `${SITE}${pathname}`;
      const creativeWorks = await loadCreativeWorks();
      const longTrailsCreativeWork = buildCreativeWorkNode({
        entry: creativeWorks['long-trails'],
        fallbackType: 'CreativeWork',
        id: `${canonical}#creativework`,
        url: canonical,
        name: isFrench ? 'Carte des sentiers longue distance' : 'Long-Distance Trails Map',
        description: isFrench
          ? 'Carte interactive des grands sentiers longue distance en Amerique du Nord.'
          : 'Interactive map of major long-distance trails across North America.',
        thumbnailUrl: DEFAULT_IMAGE
      });
      return serveTemplatePage({
        templatePath: 'long-trails/index.html',
        pathname,
        routeId: 'long-trails',
        meta: {
          title: isFrench ? 'Carte des sentiers longue distance' : 'Long-Distance Trails Map',
          description: isFrench
            ? 'Carte interactive des grands sentiers longue distance en Amerique du Nord.'
            : 'Interactive map of major long-distance trails across North America.',
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: isFrench ? 'Carte des sentiers longue distance' : 'Long-distance trails map',
          ogType: 'website'
        },
        jsonLd: [longTrailsCreativeWork]
      });
    }

    const fullTrailMatch = pathNoLocale.match(/^\/trails\/([^/]+)\/?$/i);
    if (fullTrailMatch) {
      const requestedSlug = normalizeTrailSlug(decodeURIComponent(fullTrailMatch[1]));
      if (!requestedSlug || requestedSlug === 'sections') {
        return new Response('<!doctype html><title>404 Not Found</title><h1>Trail not found</h1>', {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      const trailLookup = await loadLongTrailLookup();
      const trail = trailLookup.get(requestedSlug);
      if (!trail || !Number.isFinite(trail.sectionCount) || trail.sectionCount <= 0) {
        return new Response('<!doctype html><title>404 Not Found</title><h1>Trail not found</h1>', {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      const canonical = `${SITE}${pathname.endsWith('/') ? pathname.slice(0, -1) : pathname}`;
      const trailName = trail.name || humanizeSlug(requestedSlug);
      const title = isFrench
        ? `${trailName} - Carte des longs sentiers`
        : `${trailName} - Long-Distance Trail Map`;
      const description = isFrench
        ? `Carte interactive et index des sections pour ${trailName}.`
        : `Interactive map and section index for ${trailName}.`;
      const { enPath: fullTrailEnPath, frPath: fullTrailFrPath } = buildAlternatePaths(pathname);
      const trailCreativeWork = {
        '@context': 'https://schema.org',
        '@type': ['Route', 'CreativeWork'],
        '@id': `${canonical}#trail`,
        name: trailName,
        url: canonical,
        identifier: requestedSlug,
        description: trail.description || description,
        additionalProperty: [
          {
            '@type': 'PropertyValue',
            name: 'Section Count',
            value: String(trail.sectionCount)
          }
        ]
      };

      return serveTemplatePage({
        templatePath: 'long-trails/index.html',
        pathname,
        routeId: 'long-trail-detail',
        breadcrumbContext: { trailName },
        bodyDataAttrs: {
          focusTrail: requestedSlug,
          focusTrailName: trailName
        },
        meta: {
          title,
          description,
          canonical,
          alternateEn: `${SITE}${fullTrailEnPath}`,
          alternateFr: `${SITE}${fullTrailFrPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: trailName,
          ogType: 'website'
        },
        jsonLd: [trailCreativeWork]
      });
    }

    if (pathNoLocale === '/wiki' || pathNoLocale === '/wiki/') {
      const [setRegistry, plants, animals, plantDiseasesPayload] = await Promise.all([
        loadWikiMountainSets(),
        loadWikiPlants(),
        loadWikiAnimals(),
        loadWikiPlantDiseases()
      ]);
      const [nh48Data, nh52Data] = await Promise.all([
        loadWikiMountainSetData('nh48', setRegistry?.nh48),
        loadWikiMountainSetData('nh52wav', setRegistry?.nh52wav)
      ]);

      const normalizeMountainEntries = (payload) => {
        if (!payload || typeof payload !== 'object') return [];
        return Object.entries(payload)
          .map(([key, entry]) => ({ ...(entry || {}), slug: normalizeSlug(entry?.slug || key) }))
          .filter((entry) => entry.slug);
      };

      const sortByName = (items, resolveName) => items.sort((a, b) => {
        const nameA = normalizeTextForWeb(resolveName(a)).toLowerCase();
        const nameB = normalizeTextForWeb(resolveName(b)).toLowerCase();
        return nameA.localeCompare(nameB);
      });

      const nh48Entries = sortByName(
        normalizeMountainEntries(nh48Data),
        (entry) => entry.peakName || entry['Peak Name'] || entry.slug
      );
      const nh52Entries = sortByName(
        normalizeMountainEntries(nh52Data),
        (entry) => entry.peakName || entry['Peak Name'] || entry.slug
      );
      const plantEntries = sortByName(
        Array.isArray(plants) ? plants.filter((entry) => normalizeSlug(entry?.slug || entry?.id)) : [],
        (entry) => entry.commonName || entry.scientificName || entry.slug || entry.id
      );
      const animalEntries = sortByName(
        Array.isArray(animals) ? animals.filter((entry) => normalizeSlug(entry?.slug || entry?.id)) : [],
        (entry) => entry.commonName || entry.scientificName || entry.slug || entry.id
      );
      const diseaseEntries = sortByName(
        Array.isArray(plantDiseasesPayload?.diseases)
          ? plantDiseasesPayload.diseases
            .map((entry) => ({ ...(entry || {}), slug: normalizeSlug(entry?.slug || entry?.id || entry?.name) }))
            .filter((entry) => entry.slug)
          : [],
        (entry) => entry.name || entry.scientific_name || entry.slug
      );

      const nh48LinksHtml = renderWikiLinks(
        nh48Entries,
        (slug) => `/wiki/mountains/nh48/${encodeURIComponent(slug)}`,
        (entry) => entry['Range / Subrange'] || entry.Difficulty || ''
      );
      const nh52LinksHtml = renderWikiLinks(
        nh52Entries,
        (slug) => `/wiki/mountains/nh52wav/${encodeURIComponent(slug)}`,
        (entry) => entry['Range / Subrange'] || entry.Difficulty || ''
      );
      const plantLinksHtml = renderWikiLinks(
        plantEntries,
        (slug) => `/wiki/plants/${encodeURIComponent(slug)}`,
        (entry) => `${entry.scientificName || ''}${entry.type ? ` - ${entry.type}` : ''}`
      );
      const animalLinksHtml = renderWikiLinks(
        animalEntries,
        (slug) => `/wiki/animals/${encodeURIComponent(slug)}`,
        (entry) => `${entry.scientificName || ''}${entry.type ? ` - ${entry.type}` : ''}`
      );
      const diseaseLinksHtml = renderWikiLinks(
        diseaseEntries,
        (slug) => `/wiki/plant-diseases#disease-${encodeURIComponent(slug)}`,
        (entry) => `${entry.scientific_name || ''}${entry.agent_type ? ` - ${entry.agent_type}` : ''}`
      );

      const countMedia = (entries) => entries.reduce(
        (sum, entry) => sum + normalizeWikiMedia(entry, entry.peakName || entry.commonName || '').length,
        0
      );
      const photoCount = countMedia(nh48Entries) + countMedia(nh52Entries) + countMedia(plantEntries) + countMedia(animalEntries) + countMedia(diseaseEntries);

      const canonical = `${SITE}/wiki`;
      const title = 'White Mountain Visual Wiki';
      const description = 'Visual field wiki for White Mountains datasets: NH48 peaks, NH52WAV mountains, plants, plant diseases, and animals.';

      const itemListFromEntries = (id, name, entries, buildUrl, resolveName) => ({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        '@id': `${canonical}#${id}`,
        name,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        numberOfItems: entries.length,
        itemListElement: entries.map((entry, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: normalizeTextForWeb(resolveName(entry)),
          item: `${SITE}${buildUrl(normalizeSlug(entry.slug || entry.id || ''))}`
        }))
      });

      const listNh48 = itemListFromEntries(
        'wiki-list-nh48',
        'NH48 4,000-Footers',
        nh48Entries,
        (slug) => `/wiki/mountains/nh48/${encodeURIComponent(slug)}`,
        (entry) => entry.peakName || entry['Peak Name'] || entry.slug
      );
      const listNh52 = itemListFromEntries(
        'wiki-list-nh52wav',
        'NH52 With a View',
        nh52Entries,
        (slug) => `/wiki/mountains/nh52wav/${encodeURIComponent(slug)}`,
        (entry) => entry.peakName || entry['Peak Name'] || entry.slug
      );
      const listPlants = itemListFromEntries(
        'wiki-list-plants',
        'White Mountain Plants',
        plantEntries,
        (slug) => `/wiki/plants/${encodeURIComponent(slug)}`,
        (entry) => entry.commonName || entry.scientificName || entry.slug
      );
      const listAnimals = itemListFromEntries(
        'wiki-list-animals',
        'White Mountain Animals',
        animalEntries,
        (slug) => `/wiki/animals/${encodeURIComponent(slug)}`,
        (entry) => entry.commonName || entry.scientificName || entry.slug
      );
      const listPlantDiseases = itemListFromEntries(
        'wiki-list-plant-diseases',
        'White Mountain Plant Diseases',
        diseaseEntries,
        (slug) => `/wiki/plant-diseases#disease-${encodeURIComponent(slug)}`,
        (entry) => entry.name || entry.scientific_name || entry.slug
      );

      const collectionPage = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        inLanguage: 'en',
        isPartOf: { '@id': `${SITE}/#website` },
        hasPart: [
          { '@id': listNh48['@id'] },
          { '@id': listNh52['@id'] },
          { '@id': listPlants['@id'] },
          { '@id': listAnimals['@id'] },
          { '@id': listPlantDiseases['@id'] }
        ]
      };

      return serveTemplatePage({
        templatePath: 'pages/wiki/index.html',
        pathname,
        routeId: 'wiki-home',
        stripTemplateJsonLd: true,
        templateReplacements: {
          '{{WIKI_LINKS_NH48}}': nh48LinksHtml,
          '{{WIKI_LINKS_NH52WAV}}': nh52LinksHtml,
          '{{WIKI_LINKS_PLANTS}}': plantLinksHtml,
          '{{WIKI_LINKS_ANIMALS}}': animalLinksHtml,
          '{{WIKI_LINKS_PLANT_DISEASES}}': diseaseLinksHtml
        },
        bodyDataAttrs: {
          wikiPhotoCount: String(photoCount),
          wikiDiseaseCount: String(diseaseEntries.length)
        },
        meta: {
          title,
          description,
          canonical,
          alternateEn: canonical,
          alternateFr: `${SITE}/fr/wiki`,
          image: HOME_SOCIAL_IMAGE,
          imageAlt: title,
          ogType: 'website'
        },
        jsonLd: [collectionPage, listNh48, listNh52, listPlants, listAnimals, listPlantDiseases]
      });
    }

    if (pathNoLocale === '/wiki/plant-diseases' || pathNoLocale === '/wiki/plant-diseases/') {
      const payload = await loadWikiPlantDiseases();
      const diseaseEntries = Array.isArray(payload?.diseases)
        ? payload.diseases
          .map((entry) => ({ ...(entry || {}), slug: normalizeSlug(entry?.slug || entry?.id || entry?.name) }))
          .filter((entry) => entry.slug)
        : [];

      if (!diseaseEntries.length) {
        return new Response('<!doctype html><title>404 Not Found</title><h1>Plant disease wiki entries not found</h1>', {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      const canonical = `${SITE}/wiki/plant-diseases`;
      const title = 'White Mountain Plant Disease Wiki';
      const description = normalizeTextForWeb(
        payload?.metadata?.description
        || 'Extended wiki index of forest diseases, pests, and stand-condition threats affecting New Hampshire and the White Mountains.'
      );
      const lastUpdated = normalizeTextForWeb(payload?.metadata?.generated_on || payload?.metadata?.last_updated || '');

      const toList = (value) => {
        if (Array.isArray(value)) {
          return value.map((item) => normalizeTextForWeb(item)).filter(Boolean);
        }
        const normalized = normalizeTextForWeb(value || '');
        return normalized ? [normalized] : [];
      };

      const statusLabel = (entry) => {
        const invasiveStatus = normalizeTextForWeb(entry?.invasive_status || '');
        if (entry?.invasive === true) return 'Invasive / Introduced';
        if (entry?.invasive === false) return 'Native / Non-invasive';
        if (/invasive|introduced|novel/i.test(invasiveStatus)) return 'Invasive / Introduced';
        if (/native|non-invasive|endemic/i.test(invasiveStatus)) return 'Native / Non-invasive';
        return invasiveStatus || 'Status Unspecified';
      };

      const grouped = new Map();
      diseaseEntries.forEach((entry) => {
        const agent = normalizeTextForWeb(entry.agent_type || entry.agentType || 'Other Agents');
        const status = statusLabel(entry);
        if (!grouped.has(agent)) grouped.set(agent, new Map());
        const byStatus = grouped.get(agent);
        if (!byStatus.has(status)) byStatus.set(status, []);
        byStatus.get(status).push(entry);
      });

      const sortedAgentEntries = Array.from(grouped.entries())
        .map(([agent, statusMap]) => {
          const sortedStatusEntries = Array.from(statusMap.entries())
            .map(([status, entries]) => ({
              status,
              entries: entries.sort((a, b) => {
                const nameA = normalizeTextForWeb(a.name || a.scientific_name || a.slug).toLowerCase();
                const nameB = normalizeTextForWeb(b.name || b.scientific_name || b.slug).toLowerCase();
                return nameA.localeCompare(nameB);
              })
            }))
            .sort((a, b) => a.status.localeCompare(b.status));
          return { agent, slug: normalizeSlug(agent), statusGroups: sortedStatusEntries };
        })
        .sort((a, b) => a.agent.localeCompare(b.agent));

      const renderListValue = (value) => {
        const list = toList(value);
        if (!list.length) return '<span class="wiki-value-muted">Not specified</span>';
        if (list.length === 1) return esc(list[0]);
        return `<ul class="wiki-bullet-list">${list.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
      };

      const renderDiseaseCard = (entry) => {
        const diseaseName = normalizeTextForWeb(entry.name || humanizeSlug(entry.slug));
        const scientificName = normalizeTextForWeb(entry.scientific_name || '');
        const cardMedia = normalizeWikiMedia(entry, diseaseName);
        const thumb = cardMedia[0] || null;
        const categoryText = [diseaseName, scientificName, entry.agent_type, statusLabel(entry), ...(toList(entry.hosts))].join(' ');

        return [
          `<article class="wiki-disease-card" id="disease-${esc(entry.slug)}" data-search="${esc(categoryText)}">`,
          '<header class="wiki-disease-card-header">',
          '<div class="wiki-disease-title-wrap">',
          `<h4 class="wiki-disease-card-title">${esc(diseaseName)}</h4>`,
          scientificName ? `<p class="wiki-disease-scientific">${esc(scientificName)}</p>` : '',
          '</div>',
          '<div class="wiki-chip-row">',
          `<span class="wiki-chip">${esc(normalizeTextForWeb(entry.agent_type || 'Agent unspecified'))}</span>`,
          `<span class="wiki-chip">${esc(statusLabel(entry))}</span>`,
          '</div>',
          '</header>',
          thumb ? `<img class="wiki-disease-thumb" src="${esc(thumb.displayUrl || thumb.url)}" alt="${esc(thumb.alt || diseaseName)}" loading="lazy" decoding="async">` : '',
          '<div class="wiki-data-grid">',
          `<div class="wiki-row"><div class="wiki-label">Hosts</div><div class="wiki-value">${renderListValue(entry.hosts)}</div></div>`,
          `<div class="wiki-row"><div class="wiki-label">Symptoms</div><div class="wiki-value">${renderListValue(entry.symptoms)}</div></div>`,
          `<div class="wiki-row"><div class="wiki-label">Typical Impact</div><div class="wiki-value">${renderListValue(entry.typical_impact)}</div></div>`,
          `<div class="wiki-row"><div class="wiki-label">Distribution</div><div class="wiki-value">${renderListValue(entry.distribution)}</div></div>`,
          `<div class="wiki-row"><div class="wiki-label">Management</div><div class="wiki-value">${renderListValue(entry.management)}</div></div>`,
          `<div class="wiki-row"><div class="wiki-label">Ecological Impacts</div><div class="wiki-value">${renderListValue(entry.ecological_impacts)}</div></div>`,
          `<div class="wiki-row"><div class="wiki-label">Data Sources</div><div class="wiki-value">${renderListValue(entry.data_sources)}</div></div>`,
          '</div>',
          '</article>'
        ].join('');
      };

      const groupsHtml = sortedAgentEntries.map((agentGroup) => {
        const totalInAgent = agentGroup.statusGroups.reduce((sum, group) => sum + group.entries.length, 0);
        const statusBlocks = agentGroup.statusGroups.map((statusGroup) => [
          '<section class="wiki-disease-status-block">',
          `<h3 class="wiki-disease-status-title">${esc(statusGroup.status)} <span>${statusGroup.entries.length}</span></h3>`,
          '<div class="wiki-disease-cards">',
          statusGroup.entries.map((entry) => renderDiseaseCard(entry)).join('\n'),
          '</div>',
          '</section>'
        ].join('')).join('\n');

        return [
          `<article class="wiki-panel wiki-disease-group-panel" id="agent-${esc(agentGroup.slug)}">`,
          '<header class="wiki-panel-header">',
          `<h2 class="wiki-panel-title">${esc(agentGroup.agent)}</h2>`,
          `<span class="wiki-panel-count">${totalInAgent} entries</span>`,
          '</header>',
          '<div class="wiki-panel-body">',
          '<div class="wiki-disease-status-grid">',
          statusBlocks,
          '</div>',
          '</div>',
          '</article>'
        ].join('\n');
      }).join('\n');

      const jumpLinks = sortedAgentEntries
        .map((group) => `<a class="wiki-chip wiki-jump-chip" href="#agent-${esc(group.slug)}">${esc(group.agent)}</a>`)
        .join('\n');

      const diseaseCount = diseaseEntries.length;
      const invasiveCount = diseaseEntries.filter((entry) => entry.invasive === true).length;
      const mediaCount = diseaseEntries.reduce((sum, entry) => sum + normalizeWikiMedia(entry, entry.name || entry.slug).length, 0);

      const diseaseItemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        '@id': `${canonical}#wiki-list-plant-diseases`,
        name: 'White Mountain Plant Disease Directory',
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        numberOfItems: diseaseEntries.length,
        itemListElement: diseaseEntries
          .slice()
          .sort((a, b) => normalizeTextForWeb(a.name || a.slug).localeCompare(normalizeTextForWeb(b.name || b.slug)))
          .map((entry, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: normalizeTextForWeb(entry.name || entry.scientific_name || entry.slug),
            item: `${canonical}#disease-${entry.slug}`
          }))
      };

      const imageObjects = [];
      diseaseEntries.forEach((entry) => {
        const entryName = normalizeTextForWeb(entry.name || entry.scientific_name || entry.slug);
        const media = normalizeWikiMedia(entry, entryName);
        media.forEach((photo) => {
          imageObjects.push({
            '@context': 'https://schema.org',
            '@type': 'ImageObject',
            '@id': `${canonical}#wiki-image-${imageObjects.length + 1}`,
            url: photo.url,
            contentUrl: photo.contentUrl || photo.url,
            name: normalizeTextForWeb(photo.title || `${entryName} photo`),
            caption: normalizeTextForWeb(photo.caption || `${entryName} photo`),
            description: normalizeTextForWeb(photo.caption || `${entryName} photo`),
            inLanguage: 'en',
            license: photo.license || RIGHTS_DEFAULTS.licenseUrl,
            acquireLicensePage: RIGHTS_DEFAULTS.acquireLicensePageUrl,
            creditText: photo.creditText || RIGHTS_DEFAULTS.creditText,
            copyrightNotice: RIGHTS_DEFAULTS.copyrightNotice,
            creator: {
              '@type': 'Person',
              name: RIGHTS_DEFAULTS.creatorName,
              url: `${SITE}/about`
            }
          });
        });
      });

      const collectionPageNode = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        inLanguage: 'en',
        isPartOf: { '@id': `${SITE}/#website` },
        hasPart: [{ '@id': diseaseItemList['@id'] }]
      };

      return serveTemplatePage({
        templatePath: 'pages/wiki/plant-disease.html',
        pathname,
        routeId: 'wiki-plant-disease',
        stripTemplateJsonLd: true,
        bodyDataAttrs: {
          wikiDiseaseEntries: String(diseaseCount),
          wikiDiseaseAgents: String(sortedAgentEntries.length),
          wikiDiseaseInvasive: String(invasiveCount),
          wikiDiseasePhotos: String(mediaCount)
        },
        templateReplacements: {
          '{{PLANT_DISEASE_TOTAL_ENTRIES}}': esc(String(diseaseCount)),
          '{{PLANT_DISEASE_AGENT_COUNT}}': esc(String(sortedAgentEntries.length)),
          '{{PLANT_DISEASE_INVASIVE_COUNT}}': esc(String(invasiveCount)),
          '{{PLANT_DISEASE_PHOTO_COUNT}}': esc(String(mediaCount)),
          '{{PLANT_DISEASE_LAST_UPDATED}}': esc(lastUpdated || 'N/A'),
          '{{PLANT_DISEASE_JUMP_LINKS}}': jumpLinks || '<span class="wiki-value-muted">No categories available.</span>',
          '{{PLANT_DISEASE_GROUPS}}': groupsHtml
        },
        meta: {
          title,
          description,
          canonical,
          alternateEn: canonical,
          alternateFr: `${SITE}/fr/wiki/plant-diseases`,
          image: HOME_SOCIAL_IMAGE,
          imageAlt: title,
          ogType: 'article'
        },
        jsonLd: [collectionPageNode, diseaseItemList, ...imageObjects]
      });
    }

    if (pathNoLocale === '/wiki/diseases' || pathNoLocale === '/wiki/diseases/') {
      const canonical = `${SITE}/wiki/diseases`;
      const title = 'Forest Health - White Mountain Wiki';
      const description = normalizeTextForWeb(
        'Overview of major forest pests and diseases in the White Mountains, including harvest interaction pathways, threat comparisons, and seasonal timing.'
      );
      const flowchartBase64 = await loadWikiForestHealthFlowchartBase64();
      const fallbackTransparentPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgYQm0S4AAAAASUVORK5CYII=';
      const topThreats = [
        'Beech Leaf Disease',
        'Beech Bark Disease',
        'Regeneration Interference',
        'Eastern Spruce Budworm',
        'Balsam Woolly Adelgid',
        'White Pine Needle Damage',
        'Caliciopsis Canker',
        'White Pine Weevil',
        'Hemlock Woolly Adelgid',
        'Emerald Ash Borer'
      ];

      const threatListNode = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        '@id': `${canonical}#top-threats`,
        name: 'White Mountain Forest Health Top Threats',
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        numberOfItems: topThreats.length,
        itemListElement: topThreats.map((name, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name
        }))
      };

      const pageNode = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        inLanguage: 'en',
        isPartOf: { '@id': `${SITE}/#website` },
        hasPart: [{ '@id': threatListNode['@id'] }]
      };

      return serveTemplatePage({
        templatePath: RAW_WIKI_FOREST_HEALTH_TEMPLATE_URL.replace(`${RAW_BASE}/`, ''),
        pathname,
        routeId: 'wiki-forest-health',
        stripTemplateJsonLd: true,
        templateReplacements: {
          '{{FOREST_HEALTH_FLOWCHART_BASE64}}': flowchartBase64 || fallbackTransparentPngBase64
        },
        meta: {
          title,
          description,
          canonical,
          alternateEn: canonical,
          alternateFr: `${SITE}/fr/wiki/diseases`,
          image: HOME_SOCIAL_IMAGE,
          imageAlt: title,
          ogType: 'article'
        },
        jsonLd: [pageNode, threatListNode]
      });
    }

    const wikiMountainMatch = pathNoLocale.match(/^\/wiki\/mountains\/([^/]+)\/([^/]+)\/?$/i);
    if (wikiMountainMatch) {
      const setSlug = resolveWikiSetSlug(wikiMountainMatch[1]);
      const entrySlug = normalizeSlug(wikiMountainMatch[2]);
      const setRegistry = await loadWikiMountainSets();
      const setMeta = setRegistry?.[setSlug];
      if (!setMeta || !setMeta.dataFile) {
        return new Response('<!doctype html><title>404 Not Found</title><h1>Mountain set not found</h1>', {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      const dataset = await loadWikiMountainSetData(setSlug, setMeta);
      const entry = resolveWikiMountainEntry(dataset, entrySlug);
      if (!entry) {
        return new Response('<!doctype html><title>404 Not Found</title><h1>Mountain wiki entry not found</h1>', {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      const canonical = `${SITE}/wiki/mountains/${encodeURIComponent(setSlug)}/${encodeURIComponent(entrySlug)}`;
      const entryName = normalizeTextForWeb(entry.peakName || entry['Peak Name'] || humanizeSlug(entrySlug));
      const setName = normalizeTextForWeb(setMeta.name || setMeta.shortName || humanizeSlug(setSlug));
      const description = normalizeTextForWeb(
        entry.description
        || entry['View Type']
        || `Visual wiki entry for ${entryName} in the ${setName} mountain collection.`
      );

      const media = normalizeWikiMedia(entry, entryName);
      const imageObjects = buildWikiImageObjects({
        media,
        canonicalUrl: canonical,
        entityName: entryName,
        inLanguage: 'en'
      });

      const additionalProperty = [
        ['Elevation (ft)', entry['Elevation (ft)']],
        ['Prominence (ft)', entry['Prominence (ft)']],
        ['Range / Subrange', entry['Range / Subrange']],
        ['Difficulty', entry.Difficulty],
        ['Trail Type', entry['Trail Type']],
        ['Typical Completion Time', entry['Typical Completion Time']],
        ['Best Seasons to Hike', entry['Best Seasons to Hike']],
        ['Weather Exposure Rating', entry['Weather Exposure Rating']],
        ['Water Availability', entry['Water Availability']],
        ['Cell Reception Quality', entry['Cell Reception Quality']],
        ['Most Common Trailhead', entry['Most Common Trailhead']],
        ['Parking Notes', entry['Parking Notes']],
        ['Dog Friendly', entry['Dog Friendly']]
      ]
        .filter(([, value]) => value !== null && value !== undefined && String(value).trim())
        .map(([name, value]) => ({
          '@type': 'PropertyValue',
          name,
          value: normalizeTextForWeb(value)
        }));

      const mountainNode = {
        '@context': 'https://schema.org',
        '@type': 'Mountain',
        '@id': `${canonical}#mountain`,
        name: entryName,
        description,
        url: canonical,
        image: imageObjects.length ? imageObjects.map((img) => ({ '@id': img['@id'] })) : undefined,
        sameAs: Array.isArray(entry.sameAs) ? entry.sameAs : undefined,
        containedInPlace: entry['Range / Subrange']
          ? {
            '@type': 'Place',
            name: normalizeTextForWeb(entry['Range / Subrange'])
          }
          : undefined,
        additionalProperty: additionalProperty.length ? additionalProperty : undefined
      };
      if (!mountainNode.image) delete mountainNode.image;
      if (!mountainNode.sameAs) delete mountainNode.sameAs;
      if (!mountainNode.containedInPlace) delete mountainNode.containedInPlace;
      if (!mountainNode.additionalProperty) delete mountainNode.additionalProperty;

      const routeList = Array.isArray(entry['Standard Routes']) ? entry['Standard Routes'] : [];
      const hikingTrailNode = routeList.length
        ? {
          '@context': 'https://schema.org',
          '@type': 'HikingTrail',
          '@id': `${canonical}#hikingtrail`,
          name: `${entryName} standard routes`,
          description: `Standard route set for ${entryName}.`,
          url: canonical,
          trail: routeList.map((route, index) => ({
            '@type': 'Route',
            name: normalizeTextForWeb(route['Route Name'] || route.name || `Route ${index + 1}`),
            distance: route['Distance (mi)'] ? `${normalizeTextForWeb(route['Distance (mi)'])} mi` : undefined,
            additionalProperty: [
              route['Elevation Gain (ft)'] ? { '@type': 'PropertyValue', name: 'Elevation Gain (ft)', value: normalizeTextForWeb(route['Elevation Gain (ft)']) } : null,
              route.Difficulty ? { '@type': 'PropertyValue', name: 'Difficulty', value: normalizeTextForWeb(route.Difficulty) } : null,
              route['Trail Type'] ? { '@type': 'PropertyValue', name: 'Trail Type', value: normalizeTextForWeb(route['Trail Type']) } : null
            ].filter(Boolean)
          }))
        }
        : null;

      const webPageNode = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: `${entryName} - ${setName}`,
        description,
        inLanguage: 'en',
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': mountainNode['@id'] },
        primaryImageOfPage: imageObjects[0] ? { '@id': imageObjects[0]['@id'] } : undefined
      };
      if (!webPageNode.primaryImageOfPage) delete webPageNode.primaryImageOfPage;

      const jsonLd = [webPageNode, mountainNode, ...imageObjects];
      if (hikingTrailNode) jsonLd.push(hikingTrailNode);

      return serveTemplatePage({
        templatePath: 'pages/wiki/mountain.html',
        pathname,
        routeId: 'wiki-mountain-detail',
        stripTemplateJsonLd: true,
        bodyDataAttrs: {
          wikiSetSlug: setSlug,
          wikiEntrySlug: entrySlug
        },
        breadcrumbContext: {
          setName,
          setSlug,
          entryName
        },
        meta: {
          title: `${entryName} - ${setName} | White Mountain Wiki`,
          description,
          canonical,
          alternateEn: canonical,
          alternateFr: `${SITE}/fr/wiki/mountains/${encodeURIComponent(setSlug)}/${encodeURIComponent(entrySlug)}`,
          image: imageObjects[0]?.url || HOME_SOCIAL_IMAGE,
          imageAlt: entryName,
          ogType: 'article'
        },
        jsonLd
      });
    }

    const wikiPlantMatch = pathNoLocale.match(/^\/wiki\/plants\/([^/]+)\/?$/i);
    if (wikiPlantMatch) {
      const entrySlug = normalizeSlug(wikiPlantMatch[1]);
      const plants = await loadWikiPlants();
      const entry = resolveWikiSpeciesEntry(plants, entrySlug);
      if (!entry) {
        return new Response('<!doctype html><title>404 Not Found</title><h1>Plant wiki entry not found</h1>', {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      const canonical = `${SITE}/wiki/plants/${encodeURIComponent(entrySlug)}`;
      const entryName = normalizeTextForWeb(entry.commonName || entry.scientificName || humanizeSlug(entrySlug));
      const description = normalizeTextForWeb(entry.description || `Visual wiki entry for ${entryName}.`);
      const media = normalizeWikiMedia(entry, entryName);
      const imageObjects = buildWikiImageObjects({
        media,
        canonicalUrl: canonical,
        entityName: entryName,
        inLanguage: 'en'
      });

      const speciesNode = {
        '@context': 'https://schema.org',
        '@type': 'Species',
        '@id': `${canonical}#species`,
        name: entryName,
        description,
        url: canonical,
        taxonRank: normalizeTextForWeb(entry.type || 'Plant'),
        scientificName: normalizeTextForWeb(entry.scientificName || ''),
        image: imageObjects.length ? imageObjects.map((img) => ({ '@id': img['@id'] })) : undefined,
        additionalProperty: [
          entry.habitat ? { '@type': 'PropertyValue', name: 'Habitat', value: normalizeTextForWeb(entry.habitat) } : null,
          entry.bloomPeriod ? { '@type': 'PropertyValue', name: 'Bloom Period', value: normalizeTextForWeb(entry.bloomPeriod) } : null,
          entry.ecology ? { '@type': 'PropertyValue', name: 'Ecology', value: normalizeTextForWeb(entry.ecology) } : null,
          entry.conservationStatus ? { '@type': 'PropertyValue', name: 'Conservation Status', value: normalizeTextForWeb(entry.conservationStatus) } : null
        ].filter(Boolean)
      };
      if (!speciesNode.image) delete speciesNode.image;
      if (!speciesNode.scientificName) delete speciesNode.scientificName;
      if (!speciesNode.additionalProperty.length) delete speciesNode.additionalProperty;

      const webPageNode = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: `${entryName} - White Mountain Plant Wiki`,
        description,
        inLanguage: 'en',
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': speciesNode['@id'] }
      };

      return serveTemplatePage({
        templatePath: 'pages/wiki/plant.html',
        pathname,
        routeId: 'wiki-plant-detail',
        stripTemplateJsonLd: true,
        bodyDataAttrs: {
          wikiEntrySlug: entrySlug,
          wikiKind: 'plant'
        },
        breadcrumbContext: {
          entryName,
          plantName: entryName
        },
        meta: {
          title: `${entryName} | White Mountain Plant Wiki`,
          description,
          canonical,
          alternateEn: canonical,
          alternateFr: `${SITE}/fr/wiki/plants/${encodeURIComponent(entrySlug)}`,
          image: imageObjects[0]?.url || HOME_SOCIAL_IMAGE,
          imageAlt: entryName,
          ogType: 'article'
        },
        jsonLd: [webPageNode, speciesNode, ...imageObjects]
      });
    }

    const wikiAnimalMatch = pathNoLocale.match(/^\/wiki\/animals\/([^/]+)\/?$/i);
    if (wikiAnimalMatch) {
      const entrySlug = normalizeSlug(wikiAnimalMatch[1]);
      const animals = await loadWikiAnimals();
      const entry = resolveWikiSpeciesEntry(animals, entrySlug);
      if (!entry) {
        return new Response('<!doctype html><title>404 Not Found</title><h1>Animal wiki entry not found</h1>', {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      const canonical = `${SITE}/wiki/animals/${encodeURIComponent(entrySlug)}`;
      const entryName = normalizeTextForWeb(entry.commonName || entry.scientificName || humanizeSlug(entrySlug));
      const description = normalizeTextForWeb(entry.description || `Visual wiki entry for ${entryName}.`);
      const media = normalizeWikiMedia(entry, entryName);
      const imageObjects = buildWikiImageObjects({
        media,
        canonicalUrl: canonical,
        entityName: entryName,
        inLanguage: 'en'
      });

      const speciesNode = {
        '@context': 'https://schema.org',
        '@type': 'Species',
        '@id': `${canonical}#species`,
        name: entryName,
        description,
        url: canonical,
        taxonRank: normalizeTextForWeb(entry.type || 'Animal'),
        scientificName: normalizeTextForWeb(entry.scientificName || ''),
        image: imageObjects.length ? imageObjects.map((img) => ({ '@id': img['@id'] })) : undefined,
        additionalProperty: [
          entry.habitat ? { '@type': 'PropertyValue', name: 'Habitat', value: normalizeTextForWeb(entry.habitat) } : null,
          entry.diet ? { '@type': 'PropertyValue', name: 'Diet', value: normalizeTextForWeb(entry.diet) } : null,
          entry.activityPattern ? { '@type': 'PropertyValue', name: 'Activity Pattern', value: normalizeTextForWeb(entry.activityPattern) } : null,
          entry.conservationStatus ? { '@type': 'PropertyValue', name: 'Conservation Status', value: normalizeTextForWeb(entry.conservationStatus) } : null
        ].filter(Boolean)
      };
      if (!speciesNode.image) delete speciesNode.image;
      if (!speciesNode.scientificName) delete speciesNode.scientificName;
      if (!speciesNode.additionalProperty.length) delete speciesNode.additionalProperty;

      const webPageNode = {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: `${entryName} - White Mountain Animal Wiki`,
        description,
        inLanguage: 'en',
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': speciesNode['@id'] }
      };

      return serveTemplatePage({
        templatePath: 'pages/wiki/animal.html',
        pathname,
        routeId: 'wiki-animal-detail',
        stripTemplateJsonLd: true,
        bodyDataAttrs: {
          wikiEntrySlug: entrySlug,
          wikiKind: 'animal'
        },
        breadcrumbContext: {
          entryName,
          animalName: entryName
        },
        meta: {
          title: `${entryName} | White Mountain Animal Wiki`,
          description,
          canonical,
          alternateEn: canonical,
          alternateFr: `${SITE}/fr/wiki/animals/${encodeURIComponent(entrySlug)}`,
          image: imageObjects[0]?.url || HOME_SOCIAL_IMAGE,
          imageAlt: entryName,
          ogType: 'article'
        },
        jsonLd: [webPageNode, speciesNode, ...imageObjects]
      });
    }

    if (pathNoLocale === '/plant-catalog' || pathNoLocale === '/plant-catalog/') {
      const canonical = `${SITE}${pathname}`;
      const plantCatalogTitle = isFrench ? 'Catalogue des plantes alpines' : 'Alpine Plant Catalog';
      const plantCatalogDesc = isFrench
        ? 'Catalogue de plantes alpines avec photos et descriptions detaillees.'
        : 'Alpine plant catalog with photos and detailed descriptions.';
      const plantData = await loadJsonCache('howker-plants', `${RAW_BASE}/data/howker-plants`);
      const plantItems = Array.isArray(plantData) ? plantData : [];
      const plantImageObjects = plantItems
        .filter((plant) => Array.isArray(plant.imgs) && plant.imgs.length)
        .slice(0, 60)
        .map((plant, index) => ({
          '@type': ['ImageObject', 'Photograph'],
          '@id': `${canonical}#plant-photo-${index + 1}`,
          url: plant.imgs[0],
          contentUrl: plant.imgs[0],
          name: `${plant.common} photo`,
          caption: `${plant.common} (${plant.latin})`,
          description: plant.teaser || plant.desc || plantCatalogDesc,
          creditText: RIGHTS_DEFAULTS.creatorName,
          creator: { '@id': `${SITE}/#person-nathan-sobol` },
          copyrightHolder: { '@id': `${SITE}/#person-nathan-sobol` },
          copyrightNotice: `(c) ${RIGHTS_DEFAULTS.creatorName}`,
          license: CATALOG_IMAGE_LICENSE_URL
        }));
      const creativeWorks = await loadCreativeWorks();
      const plantCatalogCreativeWork = buildCreativeWorkNode({
        entry: creativeWorks['plant-catalog'],
        fallbackType: 'ImageGallery',
        id: `${canonical}#creativework-gallery`,
        url: canonical,
        name: plantCatalogTitle,
        description: plantCatalogDesc,
        thumbnailUrl: DEFAULT_IMAGE,
        associatedMedia: plantImageObjects.map((img) => ({ '@id': img['@id'] })),
        imageObjects: plantImageObjects
      });
      const collections = await loadCollections();
      const plantCollectionItems = plantItems.map((plant) => ({ '@id': `${SITE}/plant/${plant.id}` }));
      const plantCatalogCollection = buildCollectionObject({
        entry: collections['plant-catalog'],
        canonicalUrl: canonical,
        items: plantCollectionItems
      });
      const jsonLd = [
        buildDatasetSchema({
          canonicalUrl: canonical,
          title: plantCatalogTitle,
          description: plantCatalogDesc,
          distribution: [
            { '@type': 'DataDownload', name: 'Howker Plants', encodingFormat: 'application/json', contentUrl: `${SITE}/data/howker-plants` }
          ],
          keywords: ['plants', 'alpine', 'NH48', 'White Mountains'],
          spatialCoverage: { '@type': 'Place', name: 'White Mountain National Forest' },
          license: 'https://creativecommons.org/licenses/by/4.0/',
          publisher: { '@id': `${SITE}/#organization` }
        }),
        plantCatalogCreativeWork,
        plantCatalogCollection,
        ...plantImageObjects
      ];
      return serveTemplatePage({
        templatePath: 'pages/plant_catalog.html',
        pathname,
        routeId: 'plant-catalog',
        meta: {
          title: isFrench ? 'Catalogue des plantes alpines' : 'Alpine Plant Catalog',
          description: isFrench
            ? 'Decouvrez les plantes alpines des White Mountains avec photos et descriptions.'
            : 'Discover White Mountains alpine plants with photos and descriptions.',
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: isFrench ? 'Catalogue de plantes alpines' : 'Alpine plant catalog',
          ogType: 'website'
        },
        jsonLd
      });
    }

    if (pathNoLocale === '/bird-catalog' || pathNoLocale === '/bird-catalog/') {
      const canonical = `${SITE}${pathname}`;
      const birdCatalogTitle = 'NH Bird Catalog (Beta)';
      const birdCatalogDesc = 'UI and routing shell for New Hampshire bird species while schema and media source integration are in progress.';
      const jsonLd = [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: birdCatalogTitle,
          description: birdCatalogDesc,
          url: canonical,
          isPartOf: { '@id': `${SITE}/#website` }
        },
        buildDatasetSchema({
          canonicalUrl: canonical,
          title: 'NH Bird Catalog Dataset (Pending)',
          description: 'Bird dataset contract is pending and will be connected in a follow-up phase.',
          distribution: [
            {
              '@type': 'DataDownload',
              name: 'NH Bird Catalog (Pending)',
              encodingFormat: 'application/json',
              contentUrl: canonical
            }
          ],
          keywords: ['birds', 'new hampshire', 'catalog', 'nh48'],
          spatialCoverage: { '@type': 'Place', name: 'New Hampshire' },
          license: 'https://creativecommons.org/licenses/by/4.0/',
          publisher: { '@id': `${SITE}/#organization` }
        })
      ];
      return serveTemplatePage({
        templatePath: 'pages/bird_catalog.html',
        pathname,
        routeId: 'bird-catalog',
        meta: {
          title: birdCatalogTitle,
          description: birdCatalogDesc,
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: 'NH Bird Catalog beta landing page',
          ogType: 'website'
        },
        jsonLd
      });
    }

    if (pathNoLocale === '/projects/hrt-info' || pathNoLocale === '/projects/hrt-info/') {
      const canonical = `${SITE}${pathname}`;
      const creativeWorks = await loadCreativeWorks();
      const howkerInfoCreativeWork = buildCreativeWorkNode({
        entry: creativeWorks['projects/hrt-info'],
        fallbackType: 'HowTo',
        id: `${canonical}#howto`,
        url: canonical,
        name: isFrench ? 'Infos sur le sentier Howker Ridge' : 'Howker Ridge Trail Guide',
        description: isFrench
          ? 'Informations detaillees sur le sentier Howker Ridge : statistiques, terrain, acces et securite.'
          : 'Detailed information about the Howker Ridge Trail: stats, terrain, access, and safety.',
        thumbnailUrl: DEFAULT_IMAGE
      });
      const sportsLocation = buildSportsActivityLocation(creativeWorks['projects/hrt-info'], canonical);
      const jsonLd = [howkerInfoCreativeWork, sportsLocation].filter(Boolean);
      return serveTemplatePage({
        templatePath: isFrench ? 'pages/hrt_info.fr.html' : 'pages/hrt_info.html',
        pathname,
        routeId: 'hrt-info',
        meta: {
          title: isFrench ? 'Infos sur le sentier Howker Ridge' : 'Howker Ridge Trail Info',
          description: isFrench
            ? 'Informations detaillees sur le sentier Howker Ridge : statistiques, terrain, acces et securite.'
            : 'Detailed information about the Howker Ridge Trail: stats, terrain, access, and safety.',
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: isFrench ? 'Vue du Mount Madison' : 'Mount Madison ridge view',
          ogType: 'website'
        },
        jsonLd
      });
    }

    if (pathNoLocale === '/howker-ridge' || pathNoLocale === '/howker-ridge/') {
      const canonical = `${SITE}${pathname}`;
      const creativeWorks = await loadCreativeWorks();
      const howkerCreativeWork = buildCreativeWorkNode({
        entry: creativeWorks['howker-ridge'],
        fallbackType: 'HowTo',
        id: `${canonical}#howto`,
        url: canonical,
        name: isFrench ? 'Howker Ridge : carte et donnees' : 'Howker Ridge Trail Map and Guide',
        description: isFrench
          ? 'Carte interactive, telechargements GPS et meteo actuelle pour le sentier Howker Ridge.'
          : 'Interactive map, GPS downloads, and current weather for the Howker Ridge Trail.',
        thumbnailUrl: DEFAULT_IMAGE
      });
      const sportsLocation = buildSportsActivityLocation(creativeWorks['howker-ridge'], canonical);
      const jsonLd = [howkerCreativeWork, sportsLocation].filter(Boolean);
      return serveTemplatePage({
        templatePath: 'pages/howker_ridge.html',
        pathname,
        routeId: 'howker-ridge',
        meta: {
          title: isFrench ? 'Howker Ridge : carte et donnees' : 'Howker Ridge Trail - Map & Data',
          description: isFrench
            ? 'Carte interactive, telechargements GPS et meteo actuelle pour le sentier Howker Ridge.'
            : 'Interactive map, GPS downloads, and current weather for the Howker Ridge Trail.',
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: isFrench ? 'Vue du Mount Madison' : 'Mount Madison ridge view',
          ogType: 'website'
        },
        jsonLd
      });
    }

    if (pathNoLocale === '/howker-ridge/poi' || pathNoLocale === '/howker-ridge/poi/') {
      const canonical = `${SITE}${pathname}`;
      const creativeWorks = await loadCreativeWorks();
      const howkerPoiCreativeWork = buildCreativeWorkNode({
        entry: creativeWorks['howker-ridge/poi'],
        fallbackType: 'Article',
        id: `${canonical}#article`,
        url: canonical,
        name: isFrench ? 'Point d\u2019interet Howker Ridge' : 'Howker Ridge Points of Interest',
        description: isFrench
          ? 'Details sur un point d\u2019interet du sentier Howker Ridge.'
          : 'Trail highlights and points of interest along the Howker Ridge Trail.',
        thumbnailUrl: DEFAULT_IMAGE
      });
      const sportsLocation = buildSportsActivityLocation(creativeWorks['howker-ridge/poi'], canonical);
      const jsonLd = [howkerPoiCreativeWork, sportsLocation].filter(Boolean);
      return serveTemplatePage({
        templatePath: 'pages/howker_poi.html',
        pathname,
        routeId: 'howker-ridge-poi',
        meta: {
          title: isFrench ? 'Point d\'interet Howker Ridge' : 'Howker Ridge POI',
          description: isFrench
            ? 'Details sur un point d\'interet du sentier Howker Ridge.'
            : 'Point of interest details for the Howker Ridge Trail.',
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: isFrench ? 'Vue du Mount Madison' : 'Mount Madison ridge view',
          ogType: 'website'
        },
        jsonLd
      });
    }

    if (pathNoLocale.startsWith('/plant/') && slug) {
      const plantData = await loadJsonCache('howker-plants', `${RAW_BASE}/data/howker-plants`);
      const plant = Array.isArray(plantData) ? plantData.find((item) => item.id === slug) : null;
      if (!plant) {
        return new Response('<!doctype html><title>404 Not Found</title><h1>Plant not found</h1>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
      const canonical = `${SITE}${pathname}`;
      const title = `${plant.common} (${plant.latin})`;
      const baseDescription = String(plant.teaser || plant.desc || `Profile for ${plant.common}.`).trim();
      const tagSummary = Array.isArray(plant.tags)
        ? plant.tags
            .map((tag) => String(tag || '').trim())
            .filter(Boolean)
            .slice(0, 4)
            .join(', ')
        : '';
      const description = (tagSummary ? `${baseDescription} Key traits: ${tagSummary}.` : baseDescription).slice(0, 280);
      const image = Array.isArray(plant.imgs) && plant.imgs.length ? plant.imgs[0] : DEFAULT_IMAGE;
      const plantImageObjects = Array.isArray(plant.imgs)
        ? plant.imgs.map((imgUrl, index) => ({
          '@type': ['ImageObject', 'Photograph'],
          '@id': `${canonical}#plant-photo-${index + 1}`,
          url: imgUrl,
          contentUrl: imgUrl,
          name: `${plant.common} photo ${index + 1}`,
          caption: `${plant.common} (${plant.latin})`,
          description: description,
          creditText: RIGHTS_DEFAULTS.creatorName,
          creator: { '@id': `${SITE}/#person-nathan-sobol` },
          copyrightHolder: { '@id': `${SITE}/#person-nathan-sobol` },
          copyrightNotice: `(c) ${RIGHTS_DEFAULTS.creatorName}`,
          license: CATALOG_IMAGE_LICENSE_URL
        }))
        : [];
      const creativeWorks = await loadCreativeWorks();
      const plantCreativeWork = buildCreativeWorkNode({
        entry: creativeWorks[`plant/${slug}`],
        fallbackType: 'ImageGallery',
        id: `${canonical}#creativework-gallery`,
        url: canonical,
        name: `${plant.common} - Fine-Art Macro Gallery`,
        description,
        thumbnailUrl: image,
        associatedMedia: plantImageObjects.map((img) => ({ '@id': img['@id'] })),
        imageObjects: plantImageObjects
      });
      const jsonLd = [
        {
          '@context': 'https://schema.org',
          '@type': 'Species',
          name: plant.common,
          scientificName: plant.latin,
          description,
          image: plant.imgs || image,
          url: canonical
        },
        plantCreativeWork,
        ...plantImageObjects
      ];
      return serveTemplatePage({
        templatePath: 'pages/plant.html',
        pathname,
        routeId: 'plant-detail',
        breadcrumbContext: { plantName: plant.common || plant.latin || slug },
        meta: {
          title,
          description,
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image,
          imageAlt: plant.common || plant.latin || 'Howker Ridge plant photo',
          ogType: 'article'
        },
        jsonLd
      });
    }

    if (pathNoLocale.startsWith('/bird/') && slug) {
      const canonical = `${SITE}${pathname}`;
      const birdLabel = humanizeSlug(slug) || 'Bird';
      const title = `${birdLabel} | NH Bird Catalog`;
      const description = 'Bird detail shell route is live. Connect the NH bird schema and media source to populate species-specific metadata.';
      const jsonLd = [
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: title,
          description,
          url: canonical,
          isPartOf: { '@id': `${SITE}/#website` },
          about: {
            '@type': 'Thing',
            name: birdLabel
          }
        }
      ];
      return serveTemplatePage({
        templatePath: 'pages/bird.html',
        pathname,
        routeId: 'bird-detail',
        breadcrumbContext: { birdName: birdLabel },
        meta: {
          title,
          description,
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: `${birdLabel} bird detail placeholder`,
          ogType: 'article'
        },
        jsonLd
      });
    }

    if (pathNoLocale === '/about' || pathNoLocale === '/about/') {
      const canonical = isFrench ? `${SITE}/fr/about` : `${SITE}/about`;
      const aboutTitle = isFrench ? 'A propos de Nathan Sobol - NH48pics' : 'About Nathan Sobol - NH48pics';
      const aboutDescription = isFrench
        ? 'Nathan Sobol est un photographe de paysage et randonneur qui a documente chacun des 4 000 pieds du New Hampshire. Fondateur de NH48pics.'
        : 'Nathan Sobol is a landscape photographer and hiker who has documented every 4,000-footer in New Hampshire. Founder of NH48pics.';
      const entityLinks = await loadEntityLinks();
      const jsonLd = [
        withEntityLinks({
          '@context': 'https://schema.org',
          '@type': 'Person',
          '@id': `${SITE}/#person-nathan-sobol`,
          name: 'Nathan Sobol',
          alternateName: 'Nathan Sobol Photography',
          url: `${SITE}/about/`,
          image: `${SITE}/nathan-sobol.jpg`,
          description: 'Nathan Sobol is a landscape photographer and hiker who has documented every 4,000-footer in New Hampshire. As the founder of NH48pics, he combines his passion for the White Mountains with professional photography, offering high-quality prints and trail resources.',
          jobTitle: ['Landscape Photographer', 'Founder of NH48pics'],
          worksFor: { '@id': `${SITE}/#organization` },
          homeLocation: {
            '@type': 'Place',
            name: 'White Mountains',
            address: {
              '@type': 'PostalAddress',
              addressRegion: 'NH',
              addressCountry: 'US'
            }
          },
          knowsLanguage: ['en']
        }, entityLinks?.person),
        withEntityLinks({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          '@id': `${SITE}/#organization`,
          name: 'NH48pics',
          legalName: 'NH48pics.com',
          url: `${SITE}/`,
          logo: {
            '@type': 'ImageObject',
            url: `${SITE}/nh48API_logo.png`,
            width: 512,
            height: 512
          },
          description: 'Professional mountain photography covering the New Hampshire 4,000-footers and beyond.',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'White Mountains',
            addressRegion: 'NH',
            addressCountry: 'US'
          },
          founder: { '@id': `${SITE}/#person-nathan-sobol` }
        }, entityLinks?.organization),
        withEntityLinks({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': `${SITE}/#website`,
          name: 'NH48pics',
          url: `${SITE}/`,
          description: 'Fine-art photography and trail resources for the NH 48 4,000-footers.',
          publisher: { '@id': `${SITE}/#organization` },
          copyrightHolder: { '@id': `${SITE}/#organization` },
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE}/catalog?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
          },
          inLanguage: ['en', 'fr']
        }, entityLinks?.website)
      ];
      return serveTemplatePage({
        templatePath: 'pages/about.html',
        pathname,
        routeId: 'about',
        meta: {
          title: aboutTitle,
          description: aboutDescription,
          canonical,
          alternateEn: `${SITE}/about`,
          alternateFr: `${SITE}/fr/about`,
          image: `${SITE}/nathan-sobol.jpg`,
          imageAlt: 'Nathan Sobol - NH48pics',
          ogType: 'profile'
        },
        jsonLd
      });
    }

    if (pathNoLocale === '/nh-4000-footers-info' || pathNoLocale === '/nh-4000-footers-info/') {
      const canonical = `${SITE}${pathname}`;
      const title = isFrench ? 'Infos sur les 4 000 pieds du New Hampshire' : 'NH 4,000-Footers Info';
      const description = isFrench
        ? 'Informations et ressources sur la liste officielle des 4 000 pieds.'
        : 'Information and resources about the official 4,000-footers list.';
      const peaks = await loadPeaks();
      const peakList = Array.isArray(peaks) ? peaks : Object.values(peaks || {});
      const itemList = buildItemList(
        peakList.map((peak) => ({
          name: peak.peakName || peak.name || peak['Peak Name'],
          url: `${SITE}${isFrench ? '/fr' : ''}/peak/${peak.slug || peak.slug_en || peak.Slug || ''}`
        })),
        canonical
      );
      return serveTemplatePage({
        templatePath: 'nh-4000-footers-info.html',
        pathname,
        routeId: 'nh48-info',
        meta: {
          title,
          description,
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: title,
          ogType: 'website'
        },
        jsonLd: [itemList]
      });
    }

    const trailSectionMatch = pathNoLocale.match(/^\/trails\/[^/]+\/sections\/[^/]+\/?$/i);
    if (trailSectionMatch) {
      const sectionPath = pathname.endsWith('/') ? pathname : `${pathname}/`;
      const sectionUrl = `${RAW_BASE}${sectionPath}index.html`;

      try {
        const sectionResponse = await fetch(sectionUrl, {
          headers: { 'User-Agent': 'NH48-SSR/1.0' },
          cf: { cacheTtl: 0, cacheEverything: false }
        });
        if (sectionResponse.ok) {
          let html = await sectionResponse.text();
          html = injectClientRuntimeCore(html);
          return new Response(html, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      } catch (err) {
        console.error(`[TrailSection] Error loading ${sectionUrl}: ${err.message}`);
      }
    }

    async function servePrerenderedPeakHtml(peakSlug, french = false, options = {}) {
      if (!peakSlug) return null;
      const normalizedSlug = String(peakSlug).trim().toLowerCase();
      if (!normalizedSlug) return null;
      const seasonHint = String(options?.seasonHint || getSeasonHint()).trim().toLowerCase() || 'summer';
      const routePath = french
        ? `/fr/peak/${encodeURIComponent(normalizedSlug)}`
        : `/peak/${encodeURIComponent(normalizedSlug)}`;
      const prerenderPath = french
        ? `/fr/peaks/${encodeURIComponent(normalizedSlug)}/index.html`
        : `/peaks/${encodeURIComponent(normalizedSlug)}/index.html`;
      const prerenderUrl = `${RAW_BASE}${prerenderPath}`;
      try {
        const response = await fetch(prerenderUrl, {
          headers: { 'User-Agent': 'NH48-SSR/1.0' },
          cf: { cacheTtl: 0, cacheEverything: false }
        });
        if (!response.ok) {
          return null;
        }
        let html = await response.text();
        const [navHtml, footerHtml] = await Promise.all([
          loadPartial('nav', RAW_NAV_URL),
          loadPartial('footer', RAW_FOOTER_URL)
        ]);

        // Replace any stale embedded nav with current shared nav, then inject nav/footer as needed.
        html = html.replace(
          /<nav\b[^>]*class=["'][^"']*\bsite-nav\b[^"']*["'][^>]*>[\s\S]*?<\/nav>/i,
          ''
        );
        html = injectNavFooter(html, navHtml, footerHtml, routePath, 'peak', { 'season-hint': seasonHint });

        if (typeof options?.heroImageAlt === 'string' && options.heroImageAlt.trim()) {
          html = normalizePrerenderHeroAlt(html, options.heroImageAlt);
        }

        if (Array.isArray(options?.jsonLdBlocks) && options.jsonLdBlocks.length) {
          html = stripJsonLdScripts(html);
          const ldBlocks = options.jsonLdBlocks
            .map((block) => `<script type="application/ld+json">${JSON.stringify(block).replace(/</g, '\\u003c')}</script>`)
            .join('\n');
          html = html.replace(/<\/head>/i, `${ldBlocks}\n</head>`);
        }
        if (options?.prependMainHtml) {
          html = injectPeakAdvisoryHtml(html, options.prependMainHtml);
        } else if (options?.prependBodyHtml) {
          html = injectBodyStartHtml(html, options.prependBodyHtml);
        }
        html = applyPeakTemplateImageTransforms(html);
        html = injectPeakSeasonHintSignals(html, seasonHint);
        html = ensurePeakParityAnchors(html);
        html = injectClientRuntimeCore(html);
        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'index, follow',
            'X-Peak-Source': 'prerendered',
            'X-Peak-Season-Hint': seasonHint
          }
        });
      } catch (err) {
        console.error(`[PeakPrerender] Error loading ${prerenderUrl}: ${err.message}`);
        return null;
      }
    }

    function applyPeakTemplateImageTransforms(htmlText) {
      const transformPrefix = 'https://photos.nh48.info/cdn-cgi/image/format=webp,quality=85,width=1800/';
      return String(htmlText || '').replace(
        /https:\/\/photos\.nh48\.info\/(?!cdn-cgi\/image\/)([A-Za-z0-9._~!$&'()*+,;=:@%/-]+\.(?:jpe?g|png|webp))/gi,
        (_match, pathPart) => `${transformPrefix}${String(pathPart || '').replace(/^\/+/, '')}`
      );
    }

    // Only handle peak routes.  If the URL does not match, return 404
    // (static files are already handled by the static file serving block above)
    // Support: /peak/ and /guest/ routes. /peaks/* redirects earlier.
    const peakRoutes = ['peak', 'guest'];
    const routeKeyword = isFrench ? parts[1] : parts[0];
    const isPeakRoute = peakRoutes.includes(routeKeyword);

    if (!isPeakRoute || !slug) {
      // No matching route found - return 404
      console.log(`[Worker] 404: ${pathname} (not a recognized route)`);
      return new Response('<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>Page Not Found</h1><p>The requested page could not be found.</p><p><a href="/">Return to homepage</a></p></body></html>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    console.log(`[Worker] Processing peak route: ${pathname}, slug: ${slug}, lang: ${lang}, type: ${routeKeyword}`);

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
    const [peaks, descMap, trans, sameAsLookup, legacySameAsLookup, entityLinks, peakExperiences, parkingLookup, difficultyLookup, riskLookup, currentConditions] = await Promise.all([
      loadPeaks(),
      loadDescriptions(),
      loadTranslation(lang),
      loadJsonCache('sameAs', RAW_SAME_AS_URL),
      loadJsonCache('sameAs:legacy', RAW_LEGACY_SAME_AS_URL),
      loadEntityLinks(),
      loadPeakExperiencesEn(),
      loadParkingLookup(),
      loadPeakDifficultyLookup(),
      loadRiskOverlayLookup(),
      loadCurrentConditions()
    ]);

    if (!peaks) {
      return new Response('Peak data unavailable', { status: 500 });
    }
    if ((Array.isArray(peaks) && peaks.length === 0) || (!Array.isArray(peaks) && Object.keys(peaks).length === 0)) {
      return new Response('<!doctype html><title>404 Not Found</title><h1>Peak data not found</h1>', {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const peak = findPeak(peaks, slug);
    if (!peak) {
      // If the slug doesn't exist, return a simple 404 page instead of redirecting.  We
      // avoid client redirects so that crawlers get a proper 404.
      return new Response('<!doctype html><title>404 Not Found</title><h1>Peak not found</h1>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    const peakSameAsLinks = mergePeakSameAsSources(
      sameAsLookup?.[slug],
      legacySameAsLookup?.[slug],
      entityLinks?.peakAuthorityLinks
    );
    if (peakSameAsLinks.length) {
      peak.sameAs = peakSameAsLinks;
    }
    if (!isFrench) {
      const narrative = peakExperiences?.[slug];
      if (narrative && typeof narrative === 'object') {
        peak.experience = narrative;
      }
    }

    // Extract attributes for meta and structured data
    const peakName = peak.peakName || peak.name || peak['Peak Name'] || slug;
    const localizedPeakName = isFrench ? localizeFrenchPeakName(peakName) : peakName;
    const elevation = formatFeet(peak['Elevation (ft)'] || peak.elevation_ft || '');
    const prominence = formatFeet(peak['Prominence (ft)'] || peak.prominence_ft || '');
    const rangeVal = peak['Range / Subrange'] || peak.range || '';
    const coords = parseCoords(peak.lat || peak.latitude || peak['Coordinates'] || '');
    const trailheadName = peak['Most Common Trailhead'] || peak.mostCommonTrailhead || '';
    const parkingNotes = peak['Parking Notes'] || peak.parkingNotes || '';
    let photos = [];
    if (Array.isArray(peak.photos)) {
      photos = peak.photos
        .map((photo) => (typeof photo === 'string' ? { url: photo } : photo))
        .filter((photo) => photo && photo.url);
    }
    const primaryPhoto = photos.length ? photos[0] : null;
    const heroUrl = primaryPhoto
      ? (normalizeCatalogPhotoUrl(primaryPhoto.url, { width: 1800, format: 'jpg' }) || primaryPhoto.url)
      : DEFAULT_IMAGE;
    const normalizedSlug = normalizeDescriptionKey(slug);
    const normalizedName = normalizeDescriptionKey(peakName);
    const summaryFromFile =
      descMap[slug] ||
      descMap[normalizedSlug] ||
      descMap[peakName] ||
      descMap[normalizedName] ||
      '';
    const summaryVal = summaryFromFile || (peak.summary || peak.description || '').toString().trim();
    const peakSlugNormalized = normalizeSlug(slug);
    const peakId = toNumber(peak?.id) ?? toNumber(peak?.peakId) ?? null;
    const parkingEntry = parkingLookup?.[peakSlugNormalized] || null;
    const difficultyEntry = difficultyLookup?.[peakSlugNormalized] || null;
    const riskEntry = riskLookup?.[peakSlugNormalized] || null;
    const weatherSnapshot = await buildWeatherSnapshot(coords);
    const currentAdvisories = normalizeCurrentConditionsAdvisories(currentConditions, peakSlugNormalized, peakId);
    const riskSeverity = computeRiskSeverity({
      riskEntry,
      weatherSnapshot,
      currentAdvisories
    });
    const hasLiveAdvisory = currentAdvisories.length > 0;
    const shouldShowRiskBanner = hasLiveAdvisory || riskSeverity !== 'low';
    const riskBannerTitle = isFrench ? 'Alerte conditions montagne' : 'Mountain conditions advisory';
    const riskBannerMessage = (() => {
      if (hasLiveAdvisory) {
        const first = currentAdvisories[0];
        return first?.description
          || (isFrench
            ? `Consultez les conditions actuelles avant d'entreprendre ${peakName}.`
            : `Review current conditions before committing to ${peakName}.`);
      }
      if (weatherSnapshot?.source === 'nws') {
        const windText = Number.isFinite(Number(weatherSnapshot?.windMph))
          ? `${Math.round(Number(weatherSnapshot.windMph))} mph`
          : (isFrench ? 'vent variable' : 'variable wind');
        return isFrench
          ? `${peakName}: risque ${riskSeverity}. Vent estime a ${windText}. Verifiez le bulletin sommital avant le depart.`
          : `${peakName}: ${riskSeverity} exposure today. Estimated wind ${windText}. Check summit forecast before departure.`;
      }
      return isFrench
        ? `${peakName}: niveau de risque ${riskSeverity} base sur l'exposition, l'evacuation et les facteurs d'itineraire.`
        : `${peakName}: ${riskSeverity} risk profile from exposure, bailout distance, and route factors.`;
    })();
    const peakAlertModel = shouldShowRiskBanner
      ? {
        level: riskSeverity === 'high' ? 'high' : hasLiveAdvisory ? 'moderate' : 'info',
        title: hasLiveAdvisory ? currentAdvisories[0]?.title || riskBannerTitle : riskBannerTitle,
        message: riskBannerMessage,
        expiresAt: currentAdvisories[0]?.expiresAt || currentConditions?.expiresAt || '',
        ctaHref: 'https://www.mountwashington.org/experience-the-weather/higher-summit-forecast.aspx',
        ctaLabel: isFrench ? 'Consulter le bulletin sommital' : 'Check higher summits forecast'
      }
      : null;
    const peakAlertHtml = buildAlertBannerHtml(peakAlertModel, isFrench);

    // Build canonical and alternate URLs
    const canonical = isFrench ? `${SITE}/fr/peak/${encodeURIComponent(slug)}` : `${SITE}/peak/${encodeURIComponent(slug)}`;
    const canonicalEn = `${SITE}/peak/${encodeURIComponent(slug)}`;
    const canonicalFr = `${SITE}/fr/peak/${encodeURIComponent(slug)}`;
    const canonicalX = canonicalEn;

    // Build meta tags
    const { title, description } = buildPeakMeta(trans, peakName, elevation, rangeVal, summaryVal);
    const primaryCaption = primaryPhoto
      ? buildPhotoCaptionUnique(peakName, primaryPhoto)
      : peakName;
    const heroImageAlt = buildHeroImageAltText(localizedPeakName, primaryPhoto || {}, isFrench);
    const ogCard = await resolveOgCard(pathname);
    const socialImage = normalizeCatalogPhotoUrl(ogCard?.image || heroUrl, { width: 1800, format: 'jpg' })
      || (ogCard?.image || heroUrl);
    const socialImageAlt = heroImageAlt || ogCard?.imageAlt || primaryCaption;
    const rangeContext = await resolveRangeContext(rangeVal);
    const {
      mountain = {},
      hikingTrail = {},
      creativeWork = {},
      imageObjects = []
    } = buildJsonLd(
      peak,
      peakName,
      elevation,
      prominence,
      rangeVal,
      coords,
      canonical,
      heroUrl,
      summaryVal,
      photos,
      {
        parkingEntry,
        difficultyEntry,
        riskEntry,
        weatherSnapshot
      }
    );
    const alertSchema = peakAlertModel
      ? {
        '@context': 'https://schema.org',
        '@type': 'SpecialAnnouncement',
        '@id': `${canonical}#advisory`,
        name: peakAlertModel.title,
        text: peakAlertModel.message,
        category: 'https://schema.org/PublicSafety',
        datePosted: new Date().toISOString(),
        expires: peakAlertModel.expiresAt || undefined,
        url: canonical
      }
      : null;
    const breadcrumbSchema = buildCanonicalBreadcrumbSchema({
      routeId: 'peak-detail',
      canonicalUrl: canonical,
      context: {
        peakName,
        rangeValue: rangeVal,
        rangeName: rangeContext.rangeName,
        rangeSlug: rangeContext.rangeSlug
      }
    });
    const globalSchemaNodes = await loadGlobalSchemaNodes();
    const peakPageNodes = [mountain, hikingTrail, breadcrumbSchema, creativeWork, alertSchema, ...imageObjects].filter(Boolean);
    const jsonLdBlocks = mergeJsonLdBlocks(
      peakPageNodes,
      globalSchemaNodes
    );
    const seasonHint = getSeasonHint();

    const renderParam = String(url.searchParams.get('render') || '').toLowerCase();
    const debugPrerenderParam = String(url.searchParams.get('debug_prerender') || '').toLowerCase();
    const explicitTemplateMode = routeKeyword === 'peak'
      && ['template', 'interactive'].includes(renderParam);
    const explicitPrerenderMode = routeKeyword === 'peak'
      && (
        ['1', 'true', 'prerender'].includes(debugPrerenderParam)
        || ['1', 'true', 'prerender'].includes(renderParam)
      );
    const shouldAttemptPrerender = routeKeyword === 'peak' && !explicitTemplateMode;

    if (shouldAttemptPrerender) {
      const prerenderedResponse = await servePrerenderedPeakHtml(slug, isFrench, {
        prependMainHtml: peakAlertHtml,
        jsonLdBlocks,
        heroImageAlt,
        seasonHint
      });
      if (prerenderedResponse) {
        return prerenderedResponse;
      }
      if (explicitPrerenderMode) {
        console.warn(`[PeakPrerender] Explicit prerender requested but unavailable for slug: ${slug}; falling back to template.`);
      } else {
        console.warn(`[PeakPrerender] Default prerender unavailable for slug: ${slug}; falling back to template.`);
      }
    }

    // Fetch the raw interactive HTML template from GitHub
    const tplResp = await fetch(RAW_TEMPLATE_URL, NO_CACHE_FETCH);
    if (!tplResp.ok) {
      if (routeKeyword === 'peak') {
        const prerenderedFallback = await servePrerenderedPeakHtml(slug, isFrench, {
          prependMainHtml: peakAlertHtml,
          jsonLdBlocks,
          heroImageAlt,
          seasonHint
        });
        if (prerenderedFallback) {
          return prerenderedFallback;
        }
      }
      return new Response('Template unavailable', { status: 500 });
    }
    let html = await tplResp.text();
    // Fix relative paths in template (../css/ -> /css/, etc.)
    html = fixRelativePaths(html);
    const [navHtml, footerHtml] = await Promise.all([
      loadPartial('nav', RAW_NAV_URL),
      loadPartial('footer', RAW_FOOTER_URL)
    ]);

    // Remove the client-side redirect logic.  The redirect in the
    // original template checks for missing slug and redirects to
    // /not-found.html if not found.  We remove any script that calls
    // window.location.replace('/not-found.html') or similar.  This is a
    // simple regex that removes the entire script block containing
    // redirectToApp or window.location.replace.
    html = html.replace(/<script[^>]*>[\s\S]*?window\.location\.replace\([^)]*\)[\s\S]*?<\/script>/gi, '');
    html = stripBreadcrumbJsonLdScripts(html);
    html = stripBreadcrumbMicrodata(html);
    html = applyPeakTemplateImageTransforms(html);

    // Remove existing placeholders and duplicate head tags.
    html = injectNavFooter(stripHeadMeta(html), navHtml, footerHtml, pathname, 'peak', { 'season-hint': seasonHint });
    if (peakAlertHtml) {
      html = injectPeakAdvisoryHtml(html, peakAlertHtml);
    }
    html = injectBuildDate(html, buildDate);

    // Insert our meta tags, canonical links and structured data just
    // before the closing head tag.
    const metaBlock = [
      `<title>${title}</title>`,
      `<meta name="description" content="${description}" />`,
      `<meta name="keywords" content="NH48 API, ${esc(peakName)} peak details, New Hampshire 4000 footers, White Mountains routes, hiking data, peak metadata, mountain photos" />`,
      `<meta name="robots" content="index,follow,max-image-preview:large" />`,
      `<meta name="author" content="Nathan Sobol" />`,
      `<meta property="og:site_name" content="NH48pics" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:image" content="${socialImage}" />`,
      `<meta property="og:image:alt" content="${esc(socialImageAlt)}" />`,
      `<meta property="og:url" content="${canonical}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:site" content="@nate_dumps_pics" />`,
      `<meta name="twitter:creator" content="@nate_dumps_pics" />`,
      `<meta name="twitter:url" content="${canonical}" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${description}" />`,
      `<meta name="twitter:image" content="${socialImage}" />`,
      `<meta name="twitter:image:alt" content="${esc(socialImageAlt)}" />`,
      `<link rel="canonical" href="${canonical}" />`,
      `<link rel="alternate" hreflang="en" href="${canonicalEn}" />`,
      `<link rel="alternate" hreflang="fr" href="${canonicalFr}" />`,
      `<link rel="alternate" hreflang="x-default" href="${canonicalX}" />`,
      ...jsonLdBlocks.map(
        (block) => `<script type="application/ld+json">${JSON.stringify(block).replace(/</g, '\\u003c')}</script>`
      )
    ].join('\n');
    html = html.replace(/<\/head>/i, `${metaBlock}\n</head>`);
    html = injectPeakSeasonHintSignals(html, seasonHint);
    html = injectClientRuntimeCore(html);

    // Return the modified interactive page with no-store caching for
    // immediate updates and consistent SEO metadata.
    const templateSourceHeader = explicitTemplateMode
      ? 'template-forced'
      : shouldAttemptPrerender
        ? 'template-fallback'
        : 'template-default';
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'index, follow',
        'X-Peak-Source': templateSourceHeader,
        'X-Peak-Season-Hint': seasonHint
      }
    });
  }
};

