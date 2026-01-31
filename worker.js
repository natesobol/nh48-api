// Cloudflare Worker for NH48 Peak Guide – Full Template Version
// Version: 1.2.0 - Auto-deployed via GitHub Actions
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
    const pathname = url.pathname;
    const parts = url.pathname.split('/').filter(Boolean);

    // Constants - defined early for static file serving
    const SITE = url.origin;
    const RAW_BASE = 'https://raw.githubusercontent.com/natesobol/nh48-api/main';
    const HOWKER_ORIGIN = 'https://nh48.info';
    const RAW_TEMPLATE_URL = `${RAW_BASE}/pages/nh48_peak.html`;
    const RAW_CATALOG_URL = `${RAW_BASE}/catalog/index.html`;
    const RAW_NAV_URL = `${RAW_BASE}/pages/nav.html`;
    const RAW_FOOTER_URL = `${RAW_BASE}/pages/footer.html`;
    const RAW_BUILD_META_URL = `${RAW_BASE}/build-meta.json`;
    const EN_TRANS_URL = `${RAW_BASE}/i18n/en.json`;
    const FR_TRANS_URL = `${RAW_BASE}/i18n/fr.json`;
    const SITE_NAME = url.hostname;
    const DEFAULT_IMAGE = `${SITE}/nh48-preview.png`;
    const RIGHTS_DEFAULTS = {
      creatorName: 'Nathan Sobol',
      creditText: '© Nathan Sobol / NH48pics.com',
      copyrightNotice: '© Nathan Sobol',
      licenseUrl: 'https://nh48.info/license',
      acquireLicensePageUrl: 'https://nh48.info/contact'
    };

    const buildMeta = await fetchBuildMeta(RAW_BUILD_META_URL);
    const buildDate = buildMeta?.buildDate || '';

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

    if (pathname === '/projects/plant-map' || pathname === '/projects/plant-map/') {
      const canonical = `${SITE}${pathname}`;
      return serveTemplatePage({
        templatePath: 'pages/projects/plant-map.html',
        pathname,
        routeId: 'plant-map',
        meta: {
          title: 'Howker Ridge Plant Log Map – NH48.info',
          description: 'Interactive map to explore and record alpine plant observations along the Howker Ridge Trail.',
          canonical,
          image: 'https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-madison/mount-madison__003.jpg',
          imageAlt: 'Mount Madison ridge view with alpine terrain and distant peaks',
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
        const subjectSuffix = subjectTags.length ? ` – ${subjectTags.join(', ')}` : '';
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
      '/trails_app.html': '/trails',
      '/long_trails_app.html': '/long-trails',
      '/plant_catalog.html': '/plant-catalog',
      '/plant_catalog': '/plant-catalog',
      '/hrt_info.html': '/projects/hrt-info',
      '/pages/hrt_info.html': '/projects/hrt-info',
      '/howker_ridge.html': '/howker-ridge',
      '/pages/howker_ridge.html': '/howker-ridge',
      '/nh-4000-footers-guide': '/nh-4000-footers-info',
      '/nh-4000-footers-guide.html': '/nh-4000-footers-info',
      '/nh-4000-footers-info.html': '/nh-4000-footers-info'
    };

    const legacyKey = pathname.startsWith('/fr/') ? pathname.replace(/^\/fr/, '') : pathname;
    if (legacyRedirectMap[legacyKey]) {
      const targetPath = pathname.startsWith('/fr/') ? `/fr${legacyRedirectMap[legacyKey]}` : legacyRedirectMap[legacyKey];
      return Response.redirect(`${SITE}${targetPath}`, 301);
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

        const body = await res.arrayBuffer();
        return new Response(body, {
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
                       pathname === '/trails' || pathname === '/trails/' ||
                       pathname === '/fr/trails' || pathname === '/fr/trails/' ||
                       pathname === '/long-trails' || pathname === '/long-trails/' ||
                       pathname === '/fr/long-trails' || pathname === '/fr/long-trails/' ||
                       pathname === '/dataset' || pathname === '/dataset/' ||
                       pathname.startsWith('/dataset/') || pathname.startsWith('/fr/dataset/') ||
               pathname === '/plant-catalog' || pathname === '/plant-catalog/' ||
               pathname === '/projects/plant-map' || pathname === '/projects/plant-map/' ||
               pathname === '/projects/hrt-info' || pathname === '/projects/hrt-info/' ||
               pathname === '/howker-ridge' || pathname === '/howker-ridge/' ||
               pathname.startsWith('/plant/') || pathname.startsWith('/fr/plant/') ||
               pathname === '/nh-4000-footers-info.html' || pathname === '/nh-4000-footers-info' ||
                       pathname.match(/^\/fr\/(catalog|trails|long-trails|dataset|plant)/) !== null;
    
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
        const body = await res.arrayBuffer();
        
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'no-store',
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

    // Determine if the route is French and extract the slug.  We
    // support multiple patterns:
    //   /peak/{slug}, /fr/peak/{slug}
    //   /guest/{slug}, /fr/guest/{slug} (legacy)
    //   /peaks/{slug}, /fr/peaks/{slug} (alternative)
    const isFrench = parts[0] === 'fr';
    
    // Find slug position - look for peak-related keywords
    const peakKeywords = ['peak', 'peaks', 'guest'];
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

    // Fetch translation dictionary if needed
    async function loadTranslation(code) {
      const url = code === 'fr' ? FR_TRANS_URL : EN_TRANS_URL;
      try {
        const res = await fetch(url, NO_CACHE_FETCH);
        if (res.ok) {
          return await res.json();
        }
      } catch (_) {}
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

    // Load mountain descriptions from R2 or cache
    async function loadDescriptions() {
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
      return map;
    }

    // Load nh48.json from R2 or GitHub raw
    async function loadPeaks() {
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
        // Fallback to GitHub raw URL (not SITE, since there's no origin)
        try {
          const res = await fetch(`${RAW_BASE}/data/nh48.json`, NO_CACHE_FETCH);
          if (!res.ok) {
            return null;
          }
          peaks = await res.json();
        } catch (_) {
          return null;
        }
      }
      return peaks;
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

    function stripClientNavScripts(html) {
      // Don't strip any scripts - the template's nav/footer loading scripts
      // are harmless and trying to remove them was breaking the page
      // The server-injected nav/footer will take precedence if placeholders exist
      return html;
    }

    function markNavActive(navHtml, pathname) {
      if (!navHtml) return navHtml;
      const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
      return navHtml.replace(/<a\s+([^>]*?)href="([^"]+)"([^>]*)>/gi, (match, pre, href, post) => {
        const urlPath = href.replace(SITE, '');
        const normalizedHref = urlPath.endsWith('/') && urlPath.length > 1 ? urlPath.slice(0, -1) : urlPath;
        if (normalizedHref && (normalizedHref === normalized || normalizedHref === `${normalized}/index.html`)) {
          if (/class="/i.test(match)) {
            return `<a ${pre}href="${href}"${post.replace(/class="([^"]*)"/i, 'class="$1 current"')}>`;
          }
          return `<a ${pre}href="${href}" class="current"${post}>`;
        }
        return match;
      });
    }

    function injectNavFooter(html, navHtml, footerHtml, pathname, routeId = '') {
      let output = stripClientNavScripts(html);
      if (navHtml) {
        const markedNav = markNavActive(navHtml, pathname);
        output = output.replace(/<div id="nav-placeholder"><\/div>/i, markedNav);
      }
      if (footerHtml) {
        output = output.replace(/<div id="footer-placeholder"><\/div>/i, footerHtml);
      }
      if (routeId) {
        output = output.replace(/<body([^>]*)>/i, (match, attrs) => {
          if (/data-route=/i.test(attrs)) return match;
          return `<body${attrs} data-route="${routeId}">`;
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
        `<meta name="publisher" content="NH48 API" />`,
        `<meta name="application-name" content="NH48 API" />`,
        `<meta name="theme-color" content="#0a0a0a" />`,
        `<meta property="og:site_name" content="${meta.siteName || SITE_NAME}" />`,
        `<meta property="og:type" content="${meta.ogType || 'website'}" />`,
        `<meta property="og:locale" content="${meta.locale || 'en_US'}" />`,
        `<meta property="og:title" content="${esc(meta.title)}" />`,
        `<meta property="og:description" content="${esc(meta.description)}" />`,
        `<meta property="og:image" content="${meta.image || DEFAULT_IMAGE}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta property="og:image:alt" content="${esc(meta.imageAlt || meta.title)}" />`,
        `<meta property="og:url" content="${meta.canonical}" />`,
        `<meta name="twitter:card" content="${meta.twitterCard || 'summary_large_image'}" />`,
        `<meta name="twitter:site" content="@nate_dumps_pics" />`,
        `<meta name="twitter:creator" content="@nate_dumps_pics" />`,
        `<meta name="twitter:url" content="${meta.canonical}" />`,
        `<meta name="twitter:title" content="${esc(meta.title)}" />`,
        `<meta name="twitter:description" content="${esc(meta.description)}" />`,
        `<meta name="twitter:image" content="${meta.image || DEFAULT_IMAGE}" />`,
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

    function parseImageDimensions(photo) {
      const width = Number(photo?.width);
      const height = Number(photo?.height);
      if (Number.isFinite(width) && Number.isFinite(height)) {
        return { width, height };
      }
      const dimensions = String(photo?.dimensions || '').trim();
      if (!dimensions) return { width: undefined, height: undefined };
      const match = dimensions.match(/(\d+)\s*[x×]\s*(\d+)/i);
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
        creator: publisher || { '@type': 'Person', name: RIGHTS_DEFAULTS.creatorName },
        publisher: publisher || { '@type': 'Person', name: RIGHTS_DEFAULTS.creatorName },
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

    // Build JSON-LD for Mountain and Breadcrumb
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
        .join(' • ');
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
      photos = []
    ) {
      const imageObjects = (Array.isArray(photos) ? photos : [])
        .slice(0, 10)
        .map((photo) => {
          if (!photo || !photo.url) return null;
          const { width, height } = parseImageDimensions(photo);
          const keywords = buildPhotoKeywords(photo);
          const contentLocation = buildContentLocation(photo);
          const dateCreated = pickFirstNonEmpty(photo.captureDate, photo.dateCreated);
          const exifData = buildExifData(photo);
          const copyrightNotice = pickFirstNonEmpty(photo?.iptc?.copyrightNotice, photo.copyrightNotice, RIGHTS_DEFAULTS.copyrightNotice);
          const acquireLicensePage = pickFirstNonEmpty(photo.acquireLicensePage, RIGHTS_DEFAULTS.licenseUrl, RIGHTS_DEFAULTS.acquireLicensePageUrl);
          return {
            '@type': 'ImageObject',
            contentUrl: photo.url,
            url: photo.url,
            name: buildPhotoTitleUnique(peakName, photo),
            caption: buildPhotoCaptionUnique(peakName, photo),
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
            exifData
          };
        })
        .filter(Boolean);
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
        image: imageObjects.length ? imageObjects : imageUrl,
        url: canonicalUrl,
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
      if (coords.lat && coords.lon) {
        mountain.geo = { '@type': 'GeoCoordinates', latitude: coords.lat, longitude: coords.lon };
      }
      if (peakData && typeof peakData === 'object') {
        const trailheadValue = typeof peakData['Most Common Trailhead'] === 'string'
          ? peakData['Most Common Trailhead'].trim()
          : '';
        const parkingValue = typeof peakData['Parking Notes'] === 'string'
          ? peakData['Parking Notes'].trim()
          : '';
        if (trailheadValue || parkingValue) {
          const placeDetails = { '@type': 'Place' };
          if (trailheadValue) {
            placeDetails.name = trailheadValue;
          }
          if (parkingValue) {
            placeDetails.description = parkingValue;
          }
          mountain.containsPlace = placeDetails;
        }
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
      const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        '@id': `${canonicalUrl}#breadcrumbs`,
        name: isFrench ? `Fil d’ariane ${peakName}` : `${peakName} breadcrumb trail`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isFrench ? 'Accueil' : 'Home', item: isFrench ? `${SITE}/fr/` : `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: isFrench ? 'Catalogue des sommets' : 'Peak Catalog', item: isFrench ? `${SITE}/fr/catalog` : `${SITE}/catalog` },
          { '@type': 'ListItem', position: 3, name: peakName, item: canonicalUrl }
        ]
      };
      return { mountain, hikingTrail, breadcrumb };
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

      const tplResp = await fetch(RAW_CATALOG_URL, NO_CACHE_FETCH);
      if (!tplResp.ok) {
        return new Response('Template unavailable', { status: 500 });
      }
      let html = await tplResp.text();
      // Fix relative paths in template (../css/ -> /css/, etc.)
      html = fixRelativePaths(html);
      const [navHtml, footerHtml] = await Promise.all([
        loadPartial('nav', RAW_NAV_URL),
        loadPartial('footer', RAW_FOOTER_URL)
      ]);
      html = injectNavFooter(stripHeadMeta(html), navHtml, footerHtml, pathname, 'catalog');
      html = injectBuildDate(html, buildDate);

      const metaBlock = [
        `<title>${esc(title)}</title>`,
        `<meta name="description" content="${esc(description)}" />`,
        `<meta name="keywords" content="NH48 API, NH48 catalog, New Hampshire 4000 footers, peak metadata, hiking data, mountain photos" />`,
        `<meta name="robots" content="index,follow,max-image-preview:large" />`,
        `<meta name="author" content="Nathan Sobol" />`,
        `<meta property="og:site_name" content="${SITE_NAME}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        `<meta property="og:description" content="${esc(description)}" />`,
        `<meta property="og:image" content="${DEFAULT_IMAGE}" />`,
        `<meta property="og:image:alt" content="${esc(altText)}" />`,
        `<meta property="og:url" content="${canonicalUrl}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:url" content="${canonicalUrl}" />`,
        `<meta name="twitter:title" content="${esc(title)}" />`,
        `<meta name="twitter:description" content="${esc(description)}" />`,
        `<meta name="twitter:image" content="${DEFAULT_IMAGE}" />`,
        `<link rel="canonical" href="${canonicalUrl}" />`,
        `<link rel="alternate" hreflang="en" href="${SITE}/catalog" />`,
        `<link rel="alternate" hreflang="fr" href="${SITE}/fr/catalog" />`,
        `<link rel="alternate" hreflang="x-default" href="${SITE}/catalog" />`,
        `<script type="application/ld+json">${JSON.stringify(datasetSchema).replace(/</g, '\\u003c')}</script>`
      ].join('\n');
      html = html.replace(/<\/head>/i, `${metaBlock}\n</head>`);

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'index, follow'
        }
      });
    }

    async function serveTemplatePage({ templatePath, pathname, routeId, meta, jsonLd }) {
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
      html = stripHeadMeta(html);
      html = injectNavFooter(html, navHtml, footerHtml, pathname, routeId);
      html = injectBuildDate(html, buildDate);
      const metaBlock = buildMetaBlock({
        ...meta,
        jsonLd
      });
      html = html.replace(/<\/head>/i, `${metaBlock}\n</head>`);
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
        ? 'NH48 API - Données ouvertes pour les sommets de 4 000 pieds du New Hampshire'
        : 'NH48 API - Open data for New Hampshire\'s 4,000-foot peaks';
      const description = isFrench
        ? 'NH48 API fournit des données ouvertes et structurées pour les 48 sommets de 4 000 pieds du New Hampshire. Explorez le catalogue, les sentiers et les photos.'
        : 'Complete the NH48 challenge: 48 peaks, ~350 miles, ~170,000 feet of elevation gain. Browse difficulty tiers, day trip groupings, and peak progression guides for New Hampshire\'s four-thousand-footers.';
      const jsonLd = [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': `${SITE}/#website`,
          name: 'NH48 API',
          url: SITE,
          description,
          publisher: {
            '@type': 'Person',
            name: RIGHTS_DEFAULTS.creatorName,
            url: 'https://www.nh48pics.com/'
          },
          potentialAction: {
            '@type': 'SearchAction',
            target: `${SITE}/catalog?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
          },
          inLanguage: isFrench ? 'fr' : 'en'
        },
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          '@id': `${SITE}/#organization`,
          name: 'NH48 API',
          url: SITE,
          logo: `${SITE}/nh48API_logo.png`,
          sameAs: [
            'https://github.com/natesobol/nh48-api',
            'https://www.instagram.com/nate_dumps_pics/'
          ]
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          '@id': `${canonical}#breadcrumbs`,
          name: isFrench ? 'Fil d’ariane NH48' : 'NH48 API breadcrumb trail',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: isFrench ? 'Accueil' : 'Home', item: canonical }
          ]
        },
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
      ];
      return serveTemplatePage({
        templatePath: isFrench ? 'i18n/fr.html' : 'pages/index.html',
        pathname,
        routeId: 'home',
        meta: {
          title,
          description,
          canonical,
          alternateEn: `${SITE}/`,
          alternateFr: `${SITE}/fr/`,
          image: DEFAULT_IMAGE,
          imageAlt: isFrench ? 'Logo NH48 API' : 'NH48 API Logo',
          ogType: 'website'
        },
        jsonLd
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
          title: 'NH48 Range Catalog - New Hampshire’s mountain ranges',
          description: 'Explore NH48 mountain ranges with peak counts, highest summits, and photo highlights derived from the NH48 dataset.',
          canonical,
          image: DEFAULT_IMAGE,
          imageAlt: 'Preview of the NH48 Range Catalog',
          ogType: 'website'
        },
        jsonLd: []
      });
    }

    const { enPath, frPath } = buildAlternatePaths(pathname);

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
          title: isFrench ? 'Catalogue de données NH48' : 'NH48 Data Catalog',
          description: isFrench
            ? 'Jeu de données publics pour les sommets, sentiers et plantes alpines des White Mountains.'
            : 'Public datasets for White Mountains peaks, trails, and alpine plants.',
          datasets
        })
      ];
      return serveTemplatePage({
        templatePath: 'dataset/index.html',
        pathname,
        routeId: 'dataset',
        meta: {
          title: isFrench ? 'Catalogue de données NH48' : 'NH48 Data Catalog',
          description: isFrench
            ? 'Explorez les jeux de données NH48 sur les sommets, les sentiers et les plantes alpines.'
            : 'Explore NH48 datasets for peaks, trails, and alpine plants.',
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: isFrench ? 'Aperçu des jeux de données NH48' : 'NH48 dataset overview',
          ogType: 'website'
        },
        jsonLd
      });
    }

    if (pathNoLocale.startsWith('/dataset/')) {
      const datasetKey = pathNoLocale.split('/')[2];
      const datasetConfigs = {
        'wmnf-trails': {
          title: isFrench ? 'Données des sentiers WMNF' : 'WMNF Trails Dataset',
          description: isFrench
            ? 'Géométries et métadonnées des sentiers de la White Mountain National Forest.'
            : 'Trail geometries and metadata for the White Mountain National Forest.',
          templatePath: 'dataset/wmnf-trails/index.html',
          dataUrl: `${RAW_BASE}/data/wmnf-trails/wmnf-main.json`
        },
        'long-trails': {
          title: isFrench ? 'Données des longs sentiers' : 'Long-Distance Trails Dataset',
          description: isFrench
            ? 'Index des grands sentiers longue distance avec géométries et statistiques.'
            : 'Index of major long-distance trails with geometries and route stats.',
          templatePath: 'dataset/long-trails/index.html',
          dataUrl: `${RAW_BASE}/data/long-trails-index.json`
        },
        'howker-plants': {
          title: isFrench ? 'Données des plantes alpines' : 'Howker Alpine Plants Dataset',
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
            publisher: { '@type': 'Person', name: RIGHTS_DEFAULTS.creatorName }
          })
        ];
        return serveTemplatePage({
          templatePath: config.templatePath,
          pathname,
          routeId: 'dataset-detail',
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
        jsonLd: []
      });
    }

    if (pathNoLocale === '/long-trails' || pathNoLocale === '/long-trails/') {
      const canonical = `${SITE}${pathname}`;
      return serveTemplatePage({
        templatePath: 'long-trails/index.html',
        pathname,
        routeId: 'long-trails',
        meta: {
          title: isFrench ? 'Carte des sentiers longue distance' : 'Long-Distance Trails Map',
          description: isFrench
            ? 'Carte interactive des grands sentiers longue distance en Amérique du Nord.'
            : 'Interactive map of major long-distance trails across North America.',
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: isFrench ? 'Carte des sentiers longue distance' : 'Long-distance trails map',
          ogType: 'website'
        },
        jsonLd: []
      });
    }

    if (pathNoLocale === '/plant-catalog' || pathNoLocale === '/plant-catalog/') {
      const canonical = `${SITE}${pathname}`;
      const plantCatalogTitle = isFrench ? 'Catalogue des plantes alpines' : 'Alpine Plant Catalog';
      const plantCatalogDesc = isFrench
        ? 'Catalogue de plantes alpines avec photos et descriptions détaillées.'
        : 'Alpine plant catalog with photos and detailed descriptions.';
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
          publisher: { '@type': 'Person', name: RIGHTS_DEFAULTS.creatorName }
        })
      ];
      return serveTemplatePage({
        templatePath: 'pages/plant_catalog.html',
        pathname,
        routeId: 'plant-catalog',
        meta: {
          title: isFrench ? 'Catalogue des plantes alpines' : 'Alpine Plant Catalog',
          description: isFrench
            ? 'Découvrez les plantes alpines des White Mountains avec photos et descriptions.'
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

    if (pathNoLocale === '/projects/hrt-info' || pathNoLocale === '/projects/hrt-info/') {
      const canonical = `${SITE}${pathname}`;
      return serveTemplatePage({
        templatePath: isFrench ? 'pages/hrt_info.fr.html' : 'pages/hrt_info.html',
        pathname,
        routeId: 'hrt-info',
        meta: {
          title: isFrench ? 'Infos sur le sentier Howker Ridge' : 'Howker Ridge Trail Info',
          description: isFrench
            ? 'Informations détaillées sur le sentier Howker Ridge : statistiques, terrain, accès et sécurité.'
            : 'Detailed information about the Howker Ridge Trail: stats, terrain, access, and safety.',
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: isFrench ? 'Vue du Mount Madison' : 'Mount Madison ridge view',
          ogType: 'website'
        },
        jsonLd: []
      });
    }

    if (pathNoLocale === '/howker-ridge' || pathNoLocale === '/howker-ridge/') {
      const canonical = `${SITE}${pathname}`;
      return serveTemplatePage({
        templatePath: 'pages/howker_ridge.html',
        pathname,
        routeId: 'howker-ridge',
        meta: {
          title: isFrench ? 'Howker Ridge : carte et données' : 'Howker Ridge Trail – Map & Data',
          description: isFrench
            ? 'Carte interactive, téléchargements GPS et météo actuelle pour le sentier Howker Ridge.'
            : 'Interactive map, GPS downloads, and current weather for the Howker Ridge Trail.',
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image: DEFAULT_IMAGE,
          imageAlt: isFrench ? 'Vue du Mount Madison' : 'Mount Madison ridge view',
          ogType: 'website'
        },
        jsonLd: []
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
      const description = plant.teaser || plant.desc || `Profile for ${plant.common}.`;
      const image = Array.isArray(plant.imgs) && plant.imgs.length ? plant.imgs[0] : DEFAULT_IMAGE;
      const jsonLd = [
        {
          '@context': 'https://schema.org',
          '@type': 'Species',
          name: plant.common,
          scientificName: plant.latin,
          description,
          image: plant.imgs || image,
          url: canonical
        }
      ];
      return serveTemplatePage({
        templatePath: 'pages/plant.html',
        pathname,
        routeId: 'plant-detail',
        meta: {
          title,
          description,
          canonical,
          alternateEn: `${SITE}${enPath}`,
          alternateFr: `${SITE}${frPath}`,
          image,
          imageAlt: plant.common,
          ogType: 'article'
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

    // Only handle peak routes.  If the URL does not match, return 404
    // (static files are already handled by the static file serving block above)
    // Support: /peak/, /peaks/, /guest/, and their French variants
    const peakRoutes = ['peak', 'peaks', 'guest'];
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
    const [peaks, descMap, trans] = await Promise.all([
      loadPeaks(),
      loadDescriptions(),
      loadTranslation(lang)
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
    const trailheadName = peak['Most Common Trailhead'] || peak.mostCommonTrailhead || '';
    const parkingNotes = peak['Parking Notes'] || peak.parkingNotes || '';
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
    const { title, description } = buildPeakMeta(trans, peakName, elevation, rangeVal, summaryVal);
    const primaryCaption = primaryPhoto
      ? buildPhotoCaptionUnique(peakName, primaryPhoto)
      : peakName;
    const { mountain = {}, hikingTrail = {}, breadcrumb = {} } = buildJsonLd(
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
      peak
    );

    // Fetch the raw interactive HTML template from GitHub
    const tplResp = await fetch(RAW_TEMPLATE_URL, NO_CACHE_FETCH);
    if (!tplResp.ok) {
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

    // Remove existing placeholders and duplicate head tags.
    html = injectNavFooter(stripHeadMeta(html), navHtml, footerHtml, pathname, 'peak');
    html = injectBuildDate(html, buildDate);

    // Insert our meta tags, canonical links and structured data just
    // before the closing head tag.
    const metaBlock = [
      `<title>${title}</title>`,
      `<meta name="description" content="${description}" />`,
      `<meta name="keywords" content="NH48 API, ${esc(peakName)} peak details, New Hampshire 4000 footers, White Mountains routes, hiking data, peak metadata, mountain photos" />`,
      `<meta name="robots" content="index,follow,max-image-preview:large" />`,
      `<meta name="author" content="Nathan Sobol" />`,
      `<meta property="og:site_name" content="${SITE_NAME}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      `<meta property="og:image" content="${heroUrl}" />`,
      `<meta property="og:image:alt" content="${esc(primaryCaption)}" />`,
      `<meta property="og:url" content="${canonical}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:url" content="${canonical}" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${description}" />`,
      `<meta name="twitter:image" content="${heroUrl}" />`,
      `<link rel="canonical" href="${canonical}" />`,
      `<link rel="alternate" hreflang="en" href="${canonicalEn}" />`,
      `<link rel="alternate" hreflang="fr" href="${canonicalFr}" />`,
      `<link rel="alternate" hreflang="x-default" href="${canonicalX}" />`,
      `<script type="application/ld+json">${JSON.stringify(mountain).replace(/</g, '\\u003c')}</script>`,
      `<script type="application/ld+json">${JSON.stringify(hikingTrail).replace(/</g, '\\u003c')}</script>`,
      `<script type="application/ld+json">${JSON.stringify(breadcrumb).replace(/</g, '\\u003c')}</script>`
    ].join('\n');
    html = html.replace(/<\/head>/i, `${metaBlock}\n</head>`);

    // Return the modified interactive page with no-store caching for
    // immediate updates and consistent SEO metadata.
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'index, follow'
      }
    });
  }
};
