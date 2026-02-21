      /* API endpoints */
      const CDN_CACHE_BUST = `?ts=${Date.now()}`;
      const API_URLS = [
        '/data/nh48.json',
        `https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48.json${CDN_CACHE_BUST}`,
        `https://raw.githubusercontent.com/natesobol/nh48-api/main/data/nh48.json${CDN_CACHE_BUST}`
      ];
      const DESC_URLS = [
        '/data/nh48/mountain-descriptions.txt',
        'https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48/mountain-descriptions.txt',
        'https://raw.githubusercontent.com/natesobol/nh48-api/main/data/nh48/mountain-descriptions.txt'
      ];
      const TRAIL_API_URLS = [
        '/data/wmnf-trails/wmnf-normalized.json',
        'https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/wmnf-trails/wmnf-normalized.json',
        'https://raw.githubusercontent.com/natesobol/nh48-api/main/data/wmnf-trails/wmnf-normalized.json'
      ];
      const EXPERIENCE_URLS = [
        '/data/peak-experiences.en.json',
        `https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/peak-experiences.en.json${CDN_CACHE_BUST}`,
        `https://raw.githubusercontent.com/natesobol/nh48-api/main/data/peak-experiences.en.json${CDN_CACHE_BUST}`
      ];
      const PARKING_DATA_URLS = [
        '/data/parking-data.json',
        `https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/parking-data.json${CDN_CACHE_BUST}`,
        `https://raw.githubusercontent.com/natesobol/nh48-api/main/data/parking-data.json${CDN_CACHE_BUST}`
      ];
      const PEAK_DIFFICULTY_URLS = [
        '/data/peak-difficulty.json',
        `https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/peak-difficulty.json${CDN_CACHE_BUST}`,
        `https://raw.githubusercontent.com/natesobol/nh48-api/main/data/peak-difficulty.json${CDN_CACHE_BUST}`
      ];
      const MONTHLY_WEATHER_URLS = [
        '/data/monthly-weather.json',
        `https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/monthly-weather.json${CDN_CACHE_BUST}`,
        `https://raw.githubusercontent.com/natesobol/nh48-api/main/data/monthly-weather.json${CDN_CACHE_BUST}`
      ];
      const RISK_OVERLAY_URLS = [
        '/data/nh48_enriched_overlay.json',
        `https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48_enriched_overlay.json${CDN_CACHE_BUST}`,
        `https://raw.githubusercontent.com/natesobol/nh48-api/main/data/nh48_enriched_overlay.json${CDN_CACHE_BUST}`
      ];
      const CURRENT_CONDITIONS_URLS = [
        '/data/current-conditions.json',
        `https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/current-conditions.json${CDN_CACHE_BUST}`,
        `https://raw.githubusercontent.com/natesobol/nh48-api/main/data/current-conditions.json${CDN_CACHE_BUST}`
      ];
      const DATASET_OVERLAY_BASE_PATH = '/data/i18n-content';
      const MAP_RADIUS_MILES = 2.5;

      const t = (key, vars) => (window.NH48_I18N && window.NH48_I18N.t ? window.NH48_I18N.t(key, vars) : key);

      const translateWithFallback = (key, fallback, vars = {}) => {
        const translated = t(key, vars);
        return translated === key ? fallback : translated;
      };

      const PEAK_DEBUG_ENABLED = (() => {
        try {
          const params = new URLSearchParams(window.location.search || '');
          if (params.get('debug_peak_runtime') === '1') return true;
          if (params.get('debug_peak_runtime') === 'true') return true;
          if (window.localStorage && window.localStorage.getItem('nh48_debug_peak_runtime') === '1') return true;
        } catch (_) {}
        return false;
      })();

      function debugLog(step, payload){
        if(!PEAK_DEBUG_ENABLED) return;
        if(payload === undefined){
          console.log(`[Peak Runtime Debug] ${step}`);
        }else{
          console.log(`[Peak Runtime Debug] ${step}`, payload);
        }
      }

      function debugWarn(step, payload){
        if(!PEAK_DEBUG_ENABLED) return;
        if(payload === undefined){
          console.warn(`[Peak Runtime Debug] ${step}`);
        }else{
          console.warn(`[Peak Runtime Debug] ${step}`, payload);
        }
      }

      function debugError(step, payload){
        if(!PEAK_DEBUG_ENABLED) return;
        if(payload === undefined){
          console.error(`[Peak Runtime Debug] ${step}`);
        }else{
          console.error(`[Peak Runtime Debug] ${step}`, payload);
        }
      }

      function collectRuntimeAssetState(){
        const hasHead = !!document.head;
        const hasBody = !!document.body;
        const hasPeakBootstrapData = !!document.getElementById('peakBootstrapData');
        const hasPeakDetailCssTag = !!document.querySelector('link[href*="/css/peak-detail.css"]');
        const hasTooltipsCssTag = !!document.querySelector('link[href*="/css/ui-tooltips.css"]');
        const hasLeafletCssTag = !!document.querySelector('link[href*="leaflet@1.9.4/dist/leaflet.css"]');
        const hasPeakRuntimeScriptTag = !!document.querySelector('script[src*="/js/peak-detail-runtime.js"]');
        const hasI18nScriptTag = !!document.querySelector('script[src*="/js/i18n.js"]');
        const hasTooltipsScriptTag = !!document.querySelector('script[src*="/js/ui-tooltips.js"]');
        const hasLeafletScriptTag = !!document.querySelector('script[src*="leaflet@1.9.4/dist/leaflet.js"]');
        return {
          hasHead,
          hasBody,
          hasPeakBootstrapData,
          hasPeakDetailCssTag,
          hasTooltipsCssTag,
          hasLeafletCssTag,
          hasPeakRuntimeScriptTag,
          hasI18nScriptTag,
          hasTooltipsScriptTag,
          hasLeafletScriptTag
        };
      }

      if(PEAK_DEBUG_ENABLED){
        debugLog('module-loaded', {
          href: window.location.href,
          readyState: document.readyState
        });
        debugLog('asset-state:module-load', collectRuntimeAssetState());
        window.addEventListener('error', (event) => {
          debugError('window-error', {
            message: event && event.message,
            filename: event && event.filename,
            line: event && event.lineno,
            column: event && event.colno
          });
        });
        window.addEventListener('unhandledrejection', (event) => {
          const reason = event && event.reason;
          debugError('unhandled-rejection', {
            message: reason && reason.message ? reason.message : String(reason),
            stack: reason && reason.stack ? reason.stack : ''
          });
        });
      }

      const trackEvent = (name, params = {}) => {
        const analytics = window.NH48_INFO_ANALYTICS;
        if (analytics && analytics.logEvent && analytics.analytics) {
          analytics.logEvent(analytics.analytics, name, {
            page: location.pathname,
            ...params
          });
        }
      };

      const UNIT_STORAGE_KEY = 'nh48_units';
      const UNITS = {
        FEET: 'feet',
        METERS: 'meters'
      };
      const TRAIL_KEYWORDS = [
        'Trail',
        'Path',
        'Ridge',
        'Brook',
        'River',
        'Notch',
        'Road',
        'Cutoff',
        'Loop',
        'Slide',
        'Spur',
        'Connector'
      ];
      let currentUnits = UNITS.FEET;

      /* Fallback image */
      function getPlaceholder() {
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="#172032"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="system-ui" font-size="22">${t('common.noImage')}</text></svg>`
        );
      }

      const BASE_CANONICAL = 'https://nh48.info/peak';
      const BASE_CANONICAL_FR = 'https://nh48.info/fr/peak';
      const HOME_URL = 'https://nh48.info/';
      const DEFAULT_OG_IMAGE = 'https://nh48.info/nh48API_logo.png';
      const IMAGE_TRANSFORM_OPTIONS = 'format=webp,quality=85';
      const PHOTO_BASE_URL = 'https://photos.nh48.info';
      const PHOTO_BASE = new URL(PHOTO_BASE_URL);
      const IMAGE_TRANSFORM_PREFIX = `${PHOTO_BASE.origin}/cdn-cgi/image/${IMAGE_TRANSFORM_OPTIONS}`;
      const PHOTO_PATH_PREFIX = '/nh48-photos/';
      let peakBootstrapPayload = undefined;

      function getRouteInfo(pathname){
        const parts = String(pathname || '').split('/').filter(Boolean);
        const isFrench = parts[0] === 'fr';
        const peakKeywords = ['peak', 'peaks', 'guest'];
        let slugIndex = -1;
        for (let i = 0; i < parts.length; i++) {
          if (peakKeywords.includes(parts[i])) {
            slugIndex = i + 1;
            break;
          }
        }
        if (slugIndex === -1) {
          slugIndex = isFrench ? 1 : 0;
        }
        const slug = parts[slugIndex] || '';
        return { slug, isFrench };
      }

      function getPeakBootstrapData(){
        if (peakBootstrapPayload !== undefined) return peakBootstrapPayload;
        const bootstrapScript = document.getElementById('peakBootstrapData');
        if (!bootstrapScript) {
          peakBootstrapPayload = null;
          return peakBootstrapPayload;
        }
        try {
          const raw = String(bootstrapScript.textContent || '').trim();
          peakBootstrapPayload = raw ? JSON.parse(raw) : null;
        } catch (err) {
          console.warn('Unable to parse peak bootstrap payload', err);
          peakBootstrapPayload = null;
        }
        return peakBootstrapPayload;
      }

      function getResolvedSlug(){
        const info = window.NH48_ROUTE_INFO || getRouteInfo(window.location.pathname);
        if(info && info.slug){
          return info.slug;
        }
        const params = new URLSearchParams(window.location.search);
        return params.get('slug');
      }

      function applyImageTransform(url){
        if(!url) return url;
        try {
          const parsed = new URL(url, window.location.origin);
          if(parsed.hostname === PHOTO_BASE.hostname){
            const normalizedPath = parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`;
            // Avoid double-transform URLs like /cdn-cgi/image/.../cdn-cgi/image/... that 404.
            if(normalizedPath.startsWith('/cdn-cgi/image/')){
              return parsed.toString();
            }
            return `${IMAGE_TRANSFORM_PREFIX}${normalizedPath}`;
          }
        } catch (error) {
          console.warn('Unable to normalize photo URL', url, error);
        }
        return url;
      }

      function normalizePhotoUrl(url){
        if(!url) return url;
        if(url.startsWith(PHOTO_BASE_URL)) return applyImageTransform(url);
        const isJsdelivrPhoto = url.includes('cdn.jsdelivr.net/gh/natesobol/nh48-api@main/photos/');
        const isGithubRawPhoto = url.includes('raw.githubusercontent.com/natesobol/nh48-api/main/photos/');
        const isR2PathStyle = url.includes('r2.cloudflarestorage.com/nh48-photos/');
        const isR2BucketHost = url.includes('r2.cloudflarestorage.com/') && !url.includes('/nh48-photos/');
        let normalized = url;
        if(isR2PathStyle){
          const [, tail] = url.split(PHOTO_PATH_PREFIX);
          normalized = tail ? `${PHOTO_BASE_URL}/${tail}` : url;
        }
        if(isR2BucketHost){
          const bucketTail = url.split('r2.cloudflarestorage.com/')[1];
          if(bucketTail){
            const normalizedTail = bucketTail.replace(/^nh48-photos\//, '');
            normalized = `${PHOTO_BASE_URL}/${normalizedTail}`;
          }
        }
        if(isJsdelivrPhoto || isGithubRawPhoto){
          const [, tail] = url.split('/photos/');
          normalized = tail ? `${PHOTO_BASE_URL}/${tail}` : url;
        }
        if(normalized.startsWith(PHOTO_BASE_URL)){
          return applyImageTransform(normalized);
        }
        return normalized;
      }

      function setMeta(name, content){
        let el = document.querySelector(`meta[name="${name}"]`);
        if(!el){
          el = document.createElement('meta');
          el.setAttribute('name', name);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      }

      function setMetaProperty(property, content){
        let el = document.querySelector(`meta[property="${property}"]`);
        if(!el){
          el = document.createElement('meta');
          el.setAttribute('property', property);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      }

      function updatePeakTitle(name){
        const peakTitle = document.getElementById('peakTitle');
        if(!peakTitle) return;
        peakTitle.textContent = name;
        if(peakTitle.hasAttribute('data-i18n')){
          peakTitle.removeAttribute('data-i18n');
        }
        const heroTitle = document.getElementById('peakHeroTitle');
        if(heroTitle){
          heroTitle.textContent = name;
          if(heroTitle.hasAttribute('data-i18n')){
            heroTitle.removeAttribute('data-i18n');
          }
        }
      }

      function updateHeroBannerDetails(peak){
        const promEl = document.getElementById('peakHeroProminence');
        const rangeEl = document.getElementById('peakHeroRange');
        const elevEl = document.getElementById('peakToolsElevation');
        const subtitleEl = document.getElementById('peakHeroSubtitle');
        if(!promEl || !rangeEl || !elevEl || !peak) return;
        const prominence = formatFeetValue(peak['Prominence (ft)']);
        const range = safeText(peak['Range / Subrange']) || 'Ã¢â‚¬â€';
        const elevationLabel = t('peak.generalInfo.elevation');
        const prominenceLabel = t('peak.generalInfo.prominence');
        const rangeLabel = t('peak.generalInfo.range');
        const difficulty = translateDifficulty(peak['Difficulty']) || '';
        const completion = safeText(peak['Typical Completion Time']) || '';
        promEl.textContent = `${prominenceLabel}: ${prominence}`;
        rangeEl.textContent = `${rangeLabel}: ${range}`;
        elevEl.textContent = `${elevationLabel}: ${formatFeetValue(peak['Elevation (ft)'])}`;
        if(subtitleEl){
          const pieces = [range, difficulty, completion].filter(Boolean);
          subtitleEl.textContent = pieces.join(' - ') || 'White Mountains peak guide';
        }
      }

      function parseCoordinates(coordStr){
        if(!coordStr) return null;
        const cleaned = coordStr.split(':')[0].trim();
        const [lat, lon] = cleaned.split(',').map(v => parseFloat(v));
        if(Number.isFinite(lat) && Number.isFinite(lon)){
          return { lat, lon };
        }
        return null;
      }

      function escapeHtml(value){
        return String(value || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function safeText(value){
        if(value === undefined || value === null) return '';
        if(typeof value === 'string' || typeof value === 'number') return String(value);
        if(typeof value === 'object'){
          const localized = value.en || value.fr || value.default || value.text;
          if(typeof localized === 'string' || typeof localized === 'number'){
            return String(localized);
          }
        }
        return '';
      }

      function parseDimensions(value){
        if(!value) return { width: null, height: null };
        const match = String(value).replace(/Ãƒâ€”/g, 'x').match(/(\d+)\s*x\s*(\d+)/i);
        if(!match) return { width: null, height: null };
        return { width: Number(match[1]), height: Number(match[2]) };
      }

      function numberFrom(value){
        if(value === undefined || value === null) return null;
        const match = String(value).match(/-?\d+(?:\.\d+)?/);
        return match ? Number(match[0]) : null;
      }

      function normalizeToken(value){
        return String(value || '').trim().toLowerCase();
      }

      function capitalizeFirstLetter(value){
        const text = safeText(value).trim();
        if(!text) return '';
        return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
      }

      function translateSeason(value){
        const key = normalizeToken(value);
        const map = {
          spring: 'season.spring',
          summer: 'season.summer',
          fall: 'season.fall',
          autumn: 'season.autumn',
          winter: 'season.winter'
        };
        return map[key] ? t(map[key]) : value;
      }

      function translateTimeOfDay(value){
        const key = normalizeToken(value);
        const map = {
          sunrise: 'time.sunrise',
          sunset: 'time.sunset',
          morning: 'time.morning',
          afternoon: 'time.afternoon',
          evening: 'time.evening',
          night: 'time.night',
          day: 'time.day',
          dawn: 'time.dawn',
          dusk: 'time.dusk'
        };
        return map[key] ? t(map[key]) : value;
      }

      function normalizeMetadataDisplayValue(key, value){
        const normalizedKey = normalizeToken(key);
        const normalizedValue = safeText(value).trim();
        if(!normalizedValue) return '';
        if(normalizedKey === 'season'){
          return capitalizeFirstLetter(translateSeason(normalizedValue) || normalizedValue);
        }
        if(normalizedKey === 'timeofday'){
          return capitalizeFirstLetter(translateTimeOfDay(normalizedValue) || normalizedValue);
        }
        return normalizedValue;
      }

      /**
       * Return the first non-empty, normalized string from the provided values.
       * Used to pick between multiple potential date fields (captureDate, fileCreateDate, etc.).
       * Adapted from scripts/generate-sitemaps.js.
       */
      function pickFirstNonEmpty(...vals){
        for(const v of vals){
          if(v === undefined || v === null) continue;
          const s = safeText(v).trim();
          if(s) return s;
        }
        return '';
      }

      const TRAIL_TYPE_TRANSLATIONS = {
        'Loop': 'values.trailType.loop',
        'Loop or Out & back': 'values.trailType.loop_or_out_back',
        'Loop or traverse': 'values.trailType.loop_or_traverse',
        'Loop or traverse along ridge': 'values.trailType.loop_or_traverse_along_ridge',
        'Out & back': 'values.trailType.out_back',
        'Out & back  - common.': 'values.trailType.out_back_common',
        'Out & back  - common. or long traverse': 'values.trailType.out_back_common_or_long_traverse',
        'Out & back  - common. or loop with connector trails': 'values.trailType.out_back_common_or_loop_with_connector_trails',
        'Out & back  - common. or small loop including Mt Webster': 'values.trailType.out_back_common_or_small_loop_including_mt_webster',
        'Out & back  - commonly.': 'values.trailType.out_back_commonly',
        'Out & back or loop': 'values.trailType.out_back_or_loop',
        'Out & back or loop  - with Tom and Willey.': 'values.trailType.out_back_or_loop_with_tom_and_willey',
        'Out & back or loop combining trails': 'values.trailType.out_back_or_loop_combining_trails',
        'Out & back or loop options': 'values.trailType.out_back_or_loop_options',
        'Out & back or point-to-point traverse': 'values.trailType.out_back_or_point_to_point_traverse',
        'Out & back or traverse': 'values.trailType.out_back_or_traverse'
      };

      const DIFFICULTY_TRANSLATIONS = {
        'Moderate': 'values.difficulty.moderate',
        'Moderate/Difficult': 'values.difficulty.moderate_difficult',
        'Difficult': 'values.difficulty.difficult',
        'Very Difficult': 'values.difficulty.very_difficult',
        'Very difficult': 'values.difficulty.very_difficult',
        'Extremely Difficult': 'values.difficulty.extremely_difficult'
      };

      function translateTrailType(value){
        if(!value) return value;
        const raw = String(value);
        const key = raw.startsWith('values.trailType.') ? raw : TRAIL_TYPE_TRANSLATIONS[raw];
        if(!key) return value;
        const translated = t(key);
        return translated && translated !== key && !translated.startsWith('values.') ? translated : value;
      }

      function translateDifficulty(value){
        if(!value) return value;
        const raw = String(value);
        const key = raw.startsWith('values.difficulty.') ? raw : DIFFICULTY_TRANSLATIONS[raw];
        if(!key) return value;
        const translated = t(key);
        return translated && translated !== key && !translated.startsWith('values.') ? translated : value;
      }

      function translateExposure(value){
        if(!value) return value;
        const trimmed = String(value).trim();
        if(trimmed.startsWith('values.exposure.')){
          const translated = t(trimmed);
          if(translated && translated !== trimmed && !translated.startsWith('values.exposure')){
            return translated;
          }
          return value;
        }
        const match = trimmed.match(/^(Low to Medium|Low|Medium|High)/i);
        if(!match) return value;
        const normalized = match[1].toLowerCase().replace(/\s+/g, '_');
        const translated = t(`values.exposure.${normalized}`);
        if(!translated || translated.startsWith('values.exposure')) return value;
        return trimmed.replace(match[1], translated);
      }

      function getSeoLang(){
        const params = new URLSearchParams(window.location.search);
        const paramLang = params.get('lang');
        const normalizedParam = paramLang ? paramLang.toLowerCase() : '';
        if(normalizedParam.startsWith('fr')) return 'fr';

        if(window.NH48_ROUTE_INFO && window.NH48_ROUTE_INFO.isFrench) return 'fr';

        const storedLang = localStorage.getItem('nh48_lang');
        if(storedLang && storedLang.toLowerCase().startsWith('fr')) return 'fr';

        const currentLang = window.NH48_I18N && window.NH48_I18N.getLang ? window.NH48_I18N.getLang() : 'en';
        if(currentLang && currentLang.toLowerCase().startsWith('fr')) return 'fr';
        return 'en';
      }

      function buildCanonicalUrl(slug, langCode){
        const base = langCode === 'fr' ? BASE_CANONICAL_FR : BASE_CANONICAL;
        if(!slug){
          return `${base}/`;
        }
        return `${base}/${encodeURIComponent(slug)}/`;
      }

      function updateHreflangLinks(slug){
        const enLink = document.getElementById('hreflangEn');
        const frLink = document.getElementById('hreflangFr');
        const defaultLink = document.getElementById('hreflangDefault');
        const enUrl = buildCanonicalUrl(slug, 'en');
        const frUrl = buildCanonicalUrl(slug, 'fr');

        if(enLink){
          enLink.setAttribute('href', enUrl);
        }
        if(frLink){
          frLink.setAttribute('href', frUrl);
        }
        if(defaultLink){
          defaultLink.setAttribute('href', enUrl);
        }
      }

      function getPrimaryRangeName(rangeValue){
        const raw = safeText(rangeValue);
        if(!raw) return '';
        const first = raw.split(/[|/;,]/)[0] || raw;
        const beforeDash = first.split(/\s*-\s*/)[0] || first;
        return safeText(beforeDash) || safeText(first);
      }

      function slugifyPath(value){
        return safeText(value)
          .toLowerCase()
          .replace(/[\u2013\u2014]/g, '-')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      function updateBreadcrumbNav(name, canonicalUrl, rangeValue){
        const current = document.getElementById('breadcrumbCurrent');
        if(current){
          current.textContent = name;
          if(current.hasAttribute('data-i18n')){
            current.removeAttribute('data-i18n');
          }
        }
        const homeLink = document.getElementById('breadcrumbHomeLink');
        const homeLabel = document.getElementById('breadcrumbHomeLabel');
        const whiteMountainsLink = document.getElementById('breadcrumbWhiteMountainsLink');
        const whiteMountainsLabel = document.getElementById('breadcrumbWhiteMountainsLabel');
        const rangeLink = document.getElementById('breadcrumbRangeLink');
        const rangeLabel = document.getElementById('breadcrumbRangeLabel');
        const langCode = getSeoLang();

        if(homeLink){
          homeLink.href = langCode === 'fr' ? `${HOME_URL}fr/` : HOME_URL;
        }
        if(homeLabel){
          homeLabel.textContent = langCode === 'fr' ? 'Accueil' : 'Home';
        }
        if(whiteMountainsLink){
          whiteMountainsLink.href = langCode === 'fr' ? '/fr/nh-4000-footers-info' : '/nh-4000-footers-info';
        }
        if(whiteMountainsLabel){
          whiteMountainsLabel.textContent = langCode === 'fr' ? 'Montagnes Blanches' : 'White Mountains';
        }
        const rangeName = getPrimaryRangeName(rangeValue) || (langCode === 'fr' ? 'Montagnes Blanches' : 'White Mountains');
        const rangeSlug = slugifyPath(rangeName);
        if(rangeLink){
          rangeLink.href = rangeSlug ? `/range/${encodeURIComponent(rangeSlug)}/` : (langCode === 'fr' ? '/fr/nh-4000-footers-info' : '/nh-4000-footers-info');
        }
        if(rangeLabel){
          rangeLabel.textContent = rangeName;
        }
      }

      function setBreadcrumbJsonLd(name, canonicalUrl, rangeValue){
        const langCode = getSeoLang();
        const homeUrl = langCode === 'fr' ? `${HOME_URL}fr/` : HOME_URL;
        const homeLabel = langCode === 'fr' ? 'Accueil' : 'Home';
        const whiteMountainsLabel = langCode === 'fr' ? 'Montagnes Blanches' : 'White Mountains';
        const whiteMountainsUrl = langCode === 'fr' ? `${HOME_URL}fr/nh-4000-footers-info` : `${HOME_URL}nh-4000-footers-info`;
        const rangeName = getPrimaryRangeName(rangeValue) || whiteMountainsLabel;
        const rangeSlug = slugifyPath(rangeName);
        const rangeUrl = rangeSlug ? `${HOME_URL}range/${encodeURIComponent(rangeSlug)}/` : whiteMountainsUrl;
        const breadcrumbSchema = {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: homeLabel,
              item: homeUrl
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: whiteMountainsLabel,
              item: whiteMountainsUrl
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: rangeName,
              item: rangeUrl
            },
            {
              '@type': 'ListItem',
              position: 4,
              name,
              item: canonicalUrl
            }
          ]
        };

        let ld = document.getElementById('breadcrumbJsonLd');
        if(!ld){
          ld = document.createElement('script');
          ld.type = 'application/ld+json';
          ld.id = 'breadcrumbJsonLd';
          document.head.appendChild(ld);
        }
        ld.textContent = JSON.stringify(breadcrumbSchema);
      }

      function formatFeetValue(value){
        const num = numberFrom(value);
        if(num === null) return 'Ã¢â‚¬â€';
        if(currentUnits === UNITS.METERS){
          return `${Math.round(num * 0.3048)} m`;
        }
        return `${num} ft`;
      }

      function formatDistanceMiles(value){
        const num = numberFrom(value);
        if(num === null) return 'Ã¢â‚¬â€';
        if(currentUnits === UNITS.METERS){
          return `${(num * 1.60934).toFixed(1)} km`;
        }
        return `${num} mi`;
      }

      function setUnits(units, { persist = true } = {}){
        if(!Object.values(UNITS).includes(units)){
          units = UNITS.FEET;
        }
        currentUnits = units;
        const select = document.getElementById('unitsSelect');
        if(select){
          select.value = units;
        }
        if(persist){
          localStorage.setItem(UNIT_STORAGE_KEY, units);
        }
        if(currentPeak){
          updateHeroBannerDetails(currentPeak);
        }
      }

      function syncUnitsWithLanguage(lang){
        if(lang && lang !== 'en'){
          setUnits(UNITS.METERS, { persist: false });
        }else{
          const stored = localStorage.getItem(UNIT_STORAGE_KEY);
          setUnits(stored || UNITS.FEET, { persist: false });
        }
      }

      function setMediaLoading(isLoading){
        const loading = document.getElementById('mediaLoading');
        if(loading){
          loading.hidden = !isLoading;
        }
      }

      function cleanAltValue(value){
        return (safeText(value) || '').replace(/\s+/g, ' ').trim();
      }

      function pickLocalizedText(meta, lang, keys){
        if(!meta || typeof meta !== 'object') return null;
        for(const key of keys){
          if(lang === 'fr'){
            const frCandidate = cleanAltValue(
              meta[`${key}_fr`] || meta[`${key}Fr`] || meta[`fr_${key}`]
            );
            if(frCandidate){
              return { text: frCandidate, lang: 'fr' };
            }
          }
          const base = cleanAltValue(meta[key]);
          if(base){
            return { text: base, lang: lang === 'fr' ? 'en' : (lang || 'en') };
          }
        }
        return null;
      }

      function pickPhotoLocalizedText(photo, keys){
        const lang = getSeoLang();
        if(!photo || typeof photo !== 'object') return null;
        const sources = [];
        if(photo.meta && typeof photo.meta === 'object') sources.push(photo.meta);
        if(photo.iptc && typeof photo.iptc === 'object') sources.push(photo.iptc);
        sources.push(photo);
        for(const source of sources){
          const candidate = pickLocalizedText(source, lang, keys);
          if(candidate) return candidate;
        }
        return null;
      }

      function isFilenameLikeDescription(value){
        const text = cleanAltValue(value).toLowerCase();
        if(!text) return true;
        if(/\.(?:jpe?g|png|webp|gif|heic|avif)\b/.test(text)) return true;
        if(/__\d{1,4}\b/.test(text)) return true;
        if(/(?:^|[\s_-])(?:img|dsc|pxl|photo|mount)[\s_-]*\d{2,6}\b/.test(text)) return true;
        if(/^[a-z0-9_-]{4,}$/.test(text) && /\d/.test(text)) return true;
        return false;
      }

      function stripForcePattern(value, peakName){
        const text = cleanAltValue(value);
        const safePeak = cleanAltValue(peakName);
        const prefix = safePeak ? `${safePeak} - ` : "";
        const suffix = " - NH48";
        if(prefix && text.startsWith(prefix) && text.endsWith(suffix) && text.length > prefix.length + suffix.length){
          return text.slice(prefix.length, -suffix.length).trim();
        }
        return text;
      }

      function defaultPhotoViewDescription(){
        return getSeoLang() === "fr"
          ? "Vue du sommet des White Mountains"
          : "Summit view in the White Mountains";
      }

      function buildPhotoViewDescription(name, photo){
        const described = pickPhotoLocalizedText(photo, [
          "extendedDescription",
          "description",
          "caption",
          "headline",
          "title",
          "altText",
          "alt"
        ]);
        const candidate = stripForcePattern(described && described.text ? described.text : "", name);
        let viewDescription = cleanAltValue(candidate);
        if(!viewDescription || isFilenameLikeDescription(viewDescription) || viewDescription.length < 8){
          const season = cleanAltValue(photo && photo.season ? photo.season : "");
          const timeOfDay = cleanAltValue(photo && photo.timeOfDay ? photo.timeOfDay : "");
          const orientation = cleanAltValue(photo && photo.orientation ? photo.orientation : "");
          const bits = [season, timeOfDay, orientation].filter(Boolean);
          if(bits.length){
            viewDescription = getSeoLang() === "fr"
              ? `Vue ${bits.join(" ")} dans les White Mountains`
              : `${bits.join(" ")} view in the White Mountains`;
          }else{
            viewDescription = defaultPhotoViewDescription();
          }
        }
        return {
          text: viewDescription,
          lang: (described && described.lang) || (getSeoLang() === "fr" ? "fr" : "en")
        };
      }

      function buildForcePatternAltText(name, viewDescription){
        const peakName = cleanAltValue(name) || (getSeoLang() === "fr" ? "Sommet NH48" : "NH48 Peak");
        const view = cleanAltValue(viewDescription) || defaultPhotoViewDescription();
        return `${peakName} - ${view} - NH48`;
      }

      function buildPhotoAltText(name, photo){
        const lang = getSeoLang();
        const viewDescription = buildPhotoViewDescription(name, photo);
        return {
          text: buildForcePatternAltText(name, viewDescription.text),
          lang: viewDescription.lang || (lang === "fr" ? "fr" : (lang || "en"))
        };
      }

      function buildPhotoTitleText(name, photo){
        const preferred = pickPhotoLocalizedText(photo, [
          'headline',
          'title',
          'caption',
          'altText',
          'alt',
          'description',
          'extendedDescription',
        ]);
        const altInfo = buildPhotoAltText(name, photo);
        let text = cleanAltValue(preferred && preferred.text ? preferred.text : '');
        if(!text){
          text = cleanAltValue(altInfo && altInfo.text ? altInfo.text : '');
        }
        if(!text || /^(image|photo|untitled)$/i.test(text)){
          text = `${name} summit photo`;
        }
        if(cleanAltValue(name).toLowerCase() === cleanAltValue(text).toLowerCase()){
          text = `${name} summit photo`;
        }
        if(text.length > 220){
          text = `${text.slice(0, 217).trim()}...`;
        }
        return {
          text,
          lang: (preferred && preferred.lang) || (altInfo && altInfo.lang) || (getSeoLang() === 'fr' ? 'fr' : 'en')
        };
      }

      function buildPhotoExtendedDescription(photo){
        return (
          pickPhotoLocalizedText(photo, [
            'extendedDescription',
            'description',
            'caption',
            'headline',
          ]) || null
        );
      }

      function buildKeywordList(meta){
        const raw = [];
        if(meta && typeof meta === 'object'){
          if(Array.isArray(meta.keywords)) raw.push(...meta.keywords);
          if(Array.isArray(meta.tags)) raw.push(...meta.tags);
          if(meta.season) raw.push(meta.season);
          if(meta.timeOfDay) raw.push(meta.timeOfDay);
          if(meta.orientation) raw.push(meta.orientation);
          if(meta.meta && typeof meta.meta === 'object'){
            if(meta.meta.season) raw.push(meta.meta.season);
            if(meta.meta.timeOfDay) raw.push(meta.meta.timeOfDay);
            if(meta.meta.orientation) raw.push(meta.meta.orientation);
          }
          if(meta.iptc && Array.isArray(meta.iptc.keywords)) raw.push(...meta.iptc.keywords);
        }
        const clean = raw
          .map(value => safeText(value))
          .map(value => value && value.trim())
          .filter(Boolean);
        const seen = new Set();
        const out = [];
        clean.forEach((value) => {
          if(!seen.has(value)){
            seen.add(value);
            out.push(value);
          }
        });
        return out;
      }

      function buildContentLocation(meta){
        if(!meta || typeof meta !== 'object') return null;
        const loc = meta.locationShown || meta.locationCreated;
        if(!loc || typeof loc !== 'object') return null;
        const locality = safeText(loc.city);
        const region = safeText(loc.provinceState);
        const country = safeText(loc.countryName || loc.countryIsoCode);
        const sublocation = safeText(loc.sublocation);
        const worldRegion = safeText(loc.worldRegion);
        if(!(locality || region || country || sublocation || worldRegion)) return null;
        const nameParts = [sublocation, locality, region, country].filter(Boolean);
        const address = {};
        if(locality) address.addressLocality = locality;
        if(region) address.addressRegion = region;
        if(country) address.addressCountry = country;
        const place = {
          '@type': 'Place',
          name: nameParts.length ? nameParts.join(', ') : undefined,
          address: Object.keys(address).length ? {
            '@type': 'PostalAddress',
            ...address
          } : undefined
        };
        if(worldRegion) place.containedInPlace = { '@type': 'Place', name: worldRegion };
        Object.keys(place).forEach(key => {
          if(place[key] === undefined) delete place[key];
        });
        return place;
      }

      function formatRouteSummary(route){
        if(!route || typeof route !== 'object') return '';
        const name = safeText(route['Route Name'] || route.name);
        const distance = safeText(route['Distance (mi)'] || route.distance);
        const gain = safeText(route['Elevation Gain (ft)'] || route.elevationGain);
        const difficulty = safeText(route['Difficulty'] || route.difficulty);
        const trailType = safeText(route['Trail Type'] || route.trailType);
        const details = [distance && `${distance} mi`, gain && `${gain} ft gain`, trailType, difficulty]
          .filter(Boolean)
          .join(' Ã¢â‚¬Â¢ ');
        if(!name && !details) return '';
        return details ? `${name || 'Route'} (${details})` : name;
      }

      function normalizePeakValue(value){
        if(value === null || value === undefined) return '';
        if(Array.isArray(value)){
          return value
            .map(item => normalizePeakValue(item))
            .filter(Boolean)
            .join('; ');
        }
        if(typeof value === 'object'){
          if(
            'Route Name' in value ||
            'Distance (mi)' in value ||
            'Elevation Gain (ft)' in value ||
            'Trail Type' in value
          ){
            return formatRouteSummary(value);
          }
          return Object.entries(value)
            .map(([key, val]) => {
              const text = normalizePeakValue(val);
              return text ? `${key}: ${text}` : '';
            })
            .filter(Boolean)
            .join(', ');
        }
        return safeText(value);
      }

      function flattenMetaToPropertyValues(prefix, obj, out){
        if(!obj || typeof obj !== 'object') return;
        for(const [key, val] of Object.entries(obj)){
          if(val === undefined || val === null) continue;
          if(['url', 'originalUrl', 'photoId', 'filename', 'isPrimary', 'instagramProfileEmbedLink'].includes(key)) continue;
          const name = prefix ? `${prefix}.${key}` : key;
          if(Array.isArray(val)){
            const text = val.map(item => safeText(item)).filter(Boolean).join(', ');
            if(text) out.push({ '@type': 'PropertyValue', name, value: text });
          }else if(typeof val === 'object'){
            flattenMetaToPropertyValues(name, val, out);
          }else{
            const text = safeText(val);
            if(text) out.push({ '@type': 'PropertyValue', name, value: text });
          }
        }
      }

      function buildPhotoPropertyValues(meta){
        const out = [];
        flattenMetaToPropertyValues('', meta || {}, out);
        return out.length ? out : undefined;
      }

      function buildPhotoExifData(meta){
        const source = meta && typeof meta === 'object' ? meta : {};
        const normalizeValue = (value, fallback = 'unknown') => {
          const text = safeText(value).trim();
          return text || fallback;
        };
        const cameraModel = normalizeValue(source.cameraModel || source.camera || source.cameraMaker);
        const lens = normalizeValue(source.lens);
        const rawFStop = safeText(source.fStop).trim();
        const fStop = rawFStop ? (/^f\//i.test(rawFStop) ? rawFStop : `f/${rawFStop}`) : 'unknown';
        const shutterSpeed = normalizeValue(source.shutterSpeed);
        const isoRaw = safeText(source.iso).trim();
        const iso = isoRaw ? isoRaw.replace(/^iso\s*/i, '') : 'unknown';
        const focalLength = normalizeValue(source.focalLength);
        return [
          { '@type': 'PropertyValue', name: 'cameraModel', value: cameraModel },
          { '@type': 'PropertyValue', name: 'lens', value: lens },
          { '@type': 'PropertyValue', name: 'fStop', value: fStop },
          { '@type': 'PropertyValue', name: 'shutterSpeed', value: shutterSpeed },
          { '@type': 'PropertyValue', name: 'iso', value: iso },
          { '@type': 'PropertyValue', name: 'focalLength', value: focalLength }
        ];
      }

      function buildPeakAdditionalProperties(peak){
        const properties = [];
        const addProperty = (name, value) => {
          const text = normalizePeakValue(value);
          if(!text) return;
          properties.push({ '@type': 'PropertyValue', name, value: text });
        };

        addProperty('Standard Routes', peak['Standard Routes']);
        addProperty('Typical Completion Time', peak['Typical Completion Time']);
        addProperty('Best Seasons to Hike', peak['Best Seasons to Hike']);
        addProperty('Exposure Level', peak['Exposure Level']);
        addProperty('Terrain Character', peak['Terrain Character']);
        addProperty('Scramble Sections', peak['Scramble Sections']);
        addProperty('Water Availability', peak['Water Availability']);
        addProperty('Cell Reception Quality', peak['Cell Reception Quality']);
        addProperty('Weather Exposure Rating', peak['Weather Exposure Rating']);
        addProperty('Emergency Bailout Options', peak['Emergency Bailout Options']);
        addProperty('Dog Friendly', peak['Dog Friendly']);
        addProperty('Summit Marker Type', peak['Summit Marker Type']);
        addProperty('View Type', peak['View Type']);
        addProperty('Flora/Environment Zones', peak['Flora/Environment Zones']);
        addProperty('Nearby Notable Features', peak['Nearby Notable Features']);
        addProperty('Nearby 4000-footer Connections', peak['Nearby 4000-footer Connections']);
        addProperty('Trail Names', peak['Trail Names']);
        addProperty('Most Common Trailhead', peak['Most Common Trailhead']);
        addProperty('Parking Notes', peak['Parking Notes']);

        return properties;
      }

      function buildPeakFaqItems(peak, name){
        if(!peak) return [];
        const items = [];
        const addItem = (question, value, answerPrefix) => {
          const text = normalizePeakValue(value);
          if(!text) return;
          const answerText = answerPrefix ? `${answerPrefix} ${text}` : text;
          items.push({
            '@type': 'Question',
            name: question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: answerText
            }
          });
        };

        addItem(`Can I bring my dog on ${name}?`, peak['Dog Friendly'], 'Dog policy:');
        addItem(`What type of trail is ${name}?`, peak['Trail Type'], 'Trail type:');
        addItem(`What are the standard routes for ${name}?`, peak['Standard Routes'], 'Standard routes include:');
        addItem(`How long does it take to hike ${name}?`, peak['Typical Completion Time'], 'Typical completion time:');
        addItem(`When is the best time to hike ${name}?`, peak['Best Seasons to Hike'], 'Best seasons:');
        addItem(`What is the exposure level on ${name}?`, peak['Exposure Level'], 'Exposure level:');
        addItem(`What is the terrain like on ${name}?`, peak['Terrain Character'], 'Terrain:');
        addItem(`Are there scramble sections on ${name}?`, peak['Scramble Sections'], 'Scramble sections:');
        addItem(`Is water available on ${name}?`, peak['Water Availability'], 'Water availability:');
        addItem(`What is cell reception like on ${name}?`, peak['Cell Reception Quality'], 'Cell reception:');
        addItem(`What is the weather exposure on ${name}?`, peak['Weather Exposure Rating'], 'Weather exposure:');
        addItem(`What are the bailout options on ${name}?`, peak['Emergency Bailout Options'], 'Emergency bailout options:');
        addItem(`What is the summit marker on ${name}?`, peak['Summit Marker Type'], 'Summit marker type:');
        addItem(`What kind of views does ${name} have?`, peak['View Type'], 'Views:');
        addItem(`What flora or environment zones are on ${name}?`, peak['Flora/Environment Zones'], 'Flora and environment zones:');
        addItem(`What notable features are near ${name}?`, peak['Nearby Notable Features'], 'Nearby notable features:');
        addItem(`What other 4,000-footers connect to ${name}?`, peak['Nearby 4000-footer Connections'], 'Nearby 4,000-footer connections:');
        addItem(`What are the common trail names for ${name}?`, peak['Trail Names'], 'Trail names:');
        addItem(`What is the most common trailhead for ${name}?`, peak['Most Common Trailhead'], 'Most common trailhead:');
        addItem(`Where do I park for ${name}?`, peak['Parking Notes'], 'Parking notes:');

        return items;
      }

      function buildPeakFaqSchema(peak, name, canonicalUrl){
        const items = buildPeakFaqItems(peak, name);
        if(!items.length) return;
        const faqSchema = {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          '@id': `${canonicalUrl}#faq`,
          mainEntity: items
        };

        let faqScript = document.getElementById('peakFaqJsonLd');
        if(!faqScript){
          faqScript = document.createElement('script');
          faqScript.type = 'application/ld+json';
          faqScript.id = 'peakFaqJsonLd';
          document.head.appendChild(faqScript);
        }
        faqScript.textContent = JSON.stringify(faqSchema);
      }

      function deferImageSrcSwap(root){
        if(!root) return;
        const imgs = Array.from(root.querySelectorAll('img[data-src]'));
        if(!imgs.length) return;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            imgs.forEach(img => {
              const real = img.getAttribute('data-src');
              if(real){
                img.src = real;
                img.removeAttribute('data-src');
              }
            });
          });
        });
      }

      function buildMountainSchema(p, name, canonicalUrl, primaryPhoto, descriptionText, photoList){
        const coords = parseCoordinates(p['Coordinates']);
        const elevationFt = numberFrom(p['Elevation (ft)']);
        const prominenceFt = numberFrom(p['Prominence (ft)']);
        const difficulty = p['Difficulty'];
        const range = p['Range / Subrange'];
        const trailType = p['Trail Type'];
        const enriched = primaryPhoto ? enrichMetadata(primaryPhoto, primaryPhoto.iptc) : null;
        const photoAlt = primaryPhoto ? buildPhotoAltText(name, primaryPhoto) : null;
        const photoDescription = primaryPhoto ? buildPhotoExtendedDescription(primaryPhoto) : null;
        const photoUrl = primaryPhoto && (primaryPhoto.originalUrl || primaryPhoto.url);
        const photoContentUrl = primaryPhoto && primaryPhoto.url;
        const photoKeywords = buildKeywordList(primaryPhoto || {});
        const photoLocation = buildContentLocation(enriched || primaryPhoto);
        const photoCreated = primaryPhoto
          ? pickFirstNonEmpty(primaryPhoto.captureDate, primaryPhoto.fileCreateDate)
          : '';
        const photoExifData = buildPhotoExifData(enriched || primaryPhoto || {});
        const imageObject = primaryPhoto && primaryPhoto.url
          ? {
            '@type': 'ImageObject',
            '@id': `${canonicalUrl}#img-001`,
            url: photoUrl,
            contentUrl: photoContentUrl,
            name: (enriched && enriched.headline) || `${name} Ã¢â‚¬â€ White Mountain National Forest`,
            caption: photoAlt ? photoAlt.text : buildForcePatternAltText(name, defaultPhotoViewDescription()),
            description: (photoDescription && photoDescription.text) || descriptionText,
            creditText: (enriched && enriched.creditLine) || 'Ã‚Â© Nathan Sobol / NH48pics.com',
            creator: enriched && enriched.creator ? { '@type': 'Person', name: enriched.creator } : { '@type': 'Person', name: 'Nathan Sobol' },
            license: (enriched && enriched.rightsUsageTerms) || 'https://nh48.info/license',
            acquireLicensePage: 'https://nh48.info/contact',
            copyrightNotice: enriched && enriched.copyrightNotice ? enriched.copyrightNotice : 'Ã‚Â© Nathan Sobol',
            alternateName: photoAlt ? photoAlt.text : undefined,
            keywords: photoKeywords.length ? photoKeywords.join(', ') : undefined,
            contentLocation: photoLocation || undefined,
            dateCreated: photoCreated || undefined,
            width: primaryPhoto.width || undefined,
            height: primaryPhoto.height || undefined,
            exifData: photoExifData
          }
          : null;
        const additionalProperty = [
          prominenceFt != null ? {
            '@type': 'PropertyValue',
            name: 'Prominence (ft)',
            value: prominenceFt,
            unitText: 'FT'
          } : null,
          difficulty ? {
            '@type': 'PropertyValue',
            name: 'Difficulty',
            value: difficulty
          } : null,
          range ? {
            '@type': 'PropertyValue',
            name: 'Range / Subrange',
            value: range
          } : null,
          trailType ? {
            '@type': 'PropertyValue',
            name: 'Trail Type',
            value: trailType
          } : null,
          ...(p ? buildPeakAdditionalProperties(p) : [])
        ].filter(Boolean);
        const addAdditionalProperty = (propName, propValue) => {
          const text = normalizePeakValue(propValue);
          if(!text) return;
          additionalProperty.push({ '@type': 'PropertyValue', name: propName, value: text });
        };
        const viewModel = peakViewModel && typeof peakViewModel === 'object' ? peakViewModel : null;
        const viewDifficulty = viewModel && viewModel.difficulty ? viewModel.difficulty : null;
        const viewRisk = viewModel && viewModel.risk ? viewModel.risk : null;
        const viewMonthWeather = viewModel && viewModel.monthWeather ? viewModel.monthWeather : null;
        const narrativeParts = [];
        const pushNarrativePart = (titleText, textValue, idSuffix) => {
          const text = safeText(textValue).trim();
          if(!text) return;
          narrativeParts.push({
            '@type': 'WebPageElement',
            '@id': `${canonicalUrl}#${idSuffix}`,
            name: titleText,
            text
          });
        };
        pushNarrativePart('Mountain Overview', descriptionText, 'overview');
        const experienceEntry = (p && p.experience && typeof p.experience === 'object') ? p.experience : null;
        if(experienceEntry){
          pushNarrativePart(`${name} Summary`, neutralizeNarrativeText(experienceEntry.experienceSummary), 'trail-tested-summary');
          pushNarrativePart(`Conditions on ${name}`, neutralizeNarrativeText(experienceEntry.conditionsFromExperience), 'trail-tested-conditions');
          pushNarrativePart('Planning Trip', neutralizeNarrativeText(experienceEntry.planningTip), 'trail-tested-planning');
          const historyText = [safeText(experienceEntry.firstAscent || experienceEntry.first_ascent), neutralizeNarrativeText(experienceEntry.historyNotes || experienceEntry.history_notes || experienceEntry.history)]
            .filter(Boolean)
            .join(' ');
          pushNarrativePart(`${name} History`, historyText, 'trail-tested-history');
        }

        if(Number.isFinite(Number(viewDifficulty && viewDifficulty.technicalDifficulty))){
          addAdditionalProperty('Technical Difficulty (1-10)', Number(viewDifficulty.technicalDifficulty));
        }
        if(Number.isFinite(Number(viewDifficulty && viewDifficulty.physicalEffort))){
          addAdditionalProperty('Physical Effort (1-10)', Number(viewDifficulty.physicalEffort));
        }
        if(Array.isArray(viewRisk && viewRisk.risk_factors) && viewRisk.risk_factors.length){
          addAdditionalProperty('Risk Factors', viewRisk.risk_factors.join(', '));
        }
        if(safeText(viewRisk && viewRisk.prep_notes)){
          addAdditionalProperty('Preparation Notes', safeText(viewRisk.prep_notes));
        }
        if(Number.isFinite(Number(viewMonthWeather && viewMonthWeather.avgWindMph))){
          addAdditionalProperty('Current Wind Speed (mph)', Number(viewMonthWeather.avgWindMph));
        }
        if(Number.isFinite(Number(viewMonthWeather && viewMonthWeather.avgTempF))){
          addAdditionalProperty('Current Temperature (F)', Number(viewMonthWeather.avgTempF));
        }

        const photoMetaList = Array.isArray(photoList)
          ? photoList.filter(photo => photo && photo.url)
          : [];
        const primaryGalleryIndex = Math.max(0, photoMetaList.findIndex(photo => photo && photo.isPrimary));
        const galleryObjects = photoMetaList.map((photo, index) => {
          const enrichedPhoto = enrichMetadata(photo, photo.iptc);
          const alt = buildPhotoAltText(name, photo);
          const description = buildPhotoExtendedDescription(photo);
          const keywords = buildKeywordList(photo);
          const location = buildContentLocation(enrichedPhoto || photo);
          const created = pickFirstNonEmpty(photo.captureDate, photo.fileCreateDate);
          const dimensions = parseDimensions(photo.dimensions);
          const exifData = buildPhotoExifData(enrichedPhoto || photo);
          const id = `${canonicalUrl}#img-${String(index + 1).padStart(3, '0')}`;
          return {
            '@type': 'ImageObject',
            '@id': id,
            url: photo.originalUrl || photo.url,
            contentUrl: photo.url,
            name: (enrichedPhoto && enrichedPhoto.headline) || `${name} Ã¢â‚¬â€ White Mountain National Forest`,
            caption: alt ? alt.text : buildForcePatternAltText(name, defaultPhotoViewDescription()),
            description: (description && description.text) || descriptionText,
            creditText: (enrichedPhoto && enrichedPhoto.creditLine) || 'Ã‚Â© Nathan Sobol / NH48pics.com',
            creator: enrichedPhoto && enrichedPhoto.creator ? { '@type': 'Person', name: enrichedPhoto.creator } : { '@type': 'Person', name: 'Nathan Sobol' },
            license: (enrichedPhoto && enrichedPhoto.rightsUsageTerms) || 'https://nh48.info/license',
            acquireLicensePage: 'https://nh48.info/contact',
            copyrightNotice: enrichedPhoto && enrichedPhoto.copyrightNotice ? enrichedPhoto.copyrightNotice : 'Ã‚Â© Nathan Sobol',
            alternateName: alt ? alt.text : undefined,
            keywords: keywords.length ? keywords.join(', ') : undefined,
            contentLocation: location || undefined,
            dateCreated: created || undefined,
            width: dimensions.width || undefined,
            height: dimensions.height || undefined,
            exifData,
            representativeOfPage: index === primaryGalleryIndex
          };
        }).filter(Boolean);

        const imageGallery = galleryObjects.length ? {
          '@type': 'ImageGallery',
          name: `${name} photo gallery`,
          description: `Photos of ${name} in the White Mountains`,
          associatedMedia: galleryObjects.map((image) => ({ '@id': image['@id'] }))
        } : null;
        if(imageObject){
          if(galleryObjects.length){
            delete imageObject.representativeOfPage;
          }else{
            imageObject.representativeOfPage = true;
          }
        }

        const mountain = {
          '@type': 'Mountain',
          '@id': `${canonicalUrl}#mountain`,
          name,
          description: descriptionText,
          url: canonicalUrl,
          image: galleryObjects.length ? galleryObjects : (imageObject ? [imageObject] : undefined),
          primaryImageOfPage: imageObject ? { '@id': imageObject['@id'] } : undefined,
          creator: enriched && enriched.creator ? { '@type': 'Person', name: enriched.creator } : undefined,
          publisher: enriched ? { '@type': 'Organization', name: 'NH48pics.com' } : undefined,
          license: enriched && enriched.rightsUsageTerms ? enriched.rightsUsageTerms : undefined,
          geo: coords ? { '@type': 'GeoCoordinates', latitude: coords.lat, longitude: coords.lon } : undefined,
          elevation: elevationFt != null ? {
            '@type': 'QuantitativeValue',
            value: elevationFt,
            unitText: 'FT'
          } : undefined,
          containedInPlace: range ? { '@type': 'Place', name: 'White Mountain National Forest' } : undefined,
          hasPart: narrativeParts.length ? narrativeParts : undefined,
          containsPlace: (() => {
            const parkingModel = viewModel && viewModel.parking ? viewModel.parking : null;
            const trailhead = safeText(parkingModel && parkingModel.trailheadName) || safeText(p['Most Common Trailhead']);
            const parking = safeText(parkingModel && parkingModel.notes) || safeText(p['Parking Notes']);
            const parkingLat = Number.isFinite(Number(parkingModel && parkingModel.parkingLat))
              ? Number(parkingModel.parkingLat)
              : null;
            const parkingLng = Number.isFinite(Number(parkingModel && parkingModel.parkingLng))
              ? Number(parkingModel.parkingLng)
              : null;
            const parkingCapacity = Number.isFinite(Number(parkingModel && parkingModel.capacity))
              ? Number(parkingModel.capacity)
              : null;
            const parkingFullBy = safeText(parkingModel && parkingModel.fullBy);
            if(
              !trailhead &&
              !parking &&
              parkingLat === null &&
              parkingLng === null &&
              parkingCapacity === null &&
              !parkingFullBy
            ){
              return undefined;
            }
            const place = {
              '@type': (parkingLat !== null && parkingLng !== null) || parkingCapacity !== null || parkingFullBy
                ? 'ParkingFacility'
                : 'Place'
            };
            if(trailhead) place.name = trailhead;
            if(parking) place.description = parking;
            if(parkingLat !== null && parkingLng !== null){
              place.geo = {
                '@type': 'GeoCoordinates',
                latitude: parkingLat,
                longitude: parkingLng
              };
            }
            if(parkingCapacity !== null){
              place.maximumAttendeeCapacity = parkingCapacity;
            }
            if(parkingFullBy){
              place.additionalProperty = [
                { '@type': 'PropertyValue', name: 'Full By', value: parkingFullBy }
              ];
            }
            return place;
          })(),
          additionalProperty: additionalProperty.length ? additionalProperty : undefined,
          subjectOf: imageGallery ? [imageGallery] : undefined
        };

        Object.keys(mountain).forEach(key => {
          if(mountain[key] === undefined){
            delete mountain[key];
          }
        });

        const trailNameList = Array.isArray(p && p['Trail Names']) ? p['Trail Names'] : [];
        const hikingTrail = {
          '@type': 'HikingTrail',
          '@id': `${canonicalUrl}#hiking-trail`,
          name: trailNameList.length ? trailNameList.join(' / ') : `${name} hiking trail`,
          description: descriptionText,
          url: canonicalUrl,
          trailType: trailType || undefined,
          isPartOf: { '@id': `${canonicalUrl}#mountain` },
          additionalProperty: [
            trailType ? { '@type': 'PropertyValue', name: 'Trail Type', value: trailType } : null,
            normalizePeakValue(p && p['Typical Completion Time']) ? {
              '@type': 'PropertyValue',
              name: 'Typical Completion Time',
              value: normalizePeakValue(p['Typical Completion Time'])
            } : null,
            normalizePeakValue(p && p['Dog Friendly']) ? {
              '@type': 'PropertyValue',
              name: 'Dog Friendly',
              value: normalizePeakValue(p['Dog Friendly'])
            } : null
          ].filter(Boolean)
        };
        Object.keys(hikingTrail).forEach(key => {
          if(hikingTrail[key] === undefined){
            delete hikingTrail[key];
          }
        });

        const schema = {
          '@context': 'https://schema.org',
          '@graph': [mountain, hikingTrail]
        };

        let ld = document.getElementById('peakJsonLd');
        if(!ld){
          ld = document.createElement('script');
          ld.type = 'application/ld+json';
          ld.id = 'peakJsonLd';
          document.head.appendChild(ld);
        }
        ld.textContent = JSON.stringify(schema);
      }

      function cleanJSON(raw){
        let cleaned = raw.replace(/:contentReference\[.*?\]\{index=\d+\}/g, '');
        cleaned = cleaned.replace(/\/\*\s*Lines?\s+\d+[\d\-,\s]*omitted\s*\*\//g, '');
        return cleaned;
      }

      function normalizeDescriptionLookupKey(value){
        return safeText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
      }

      async function fetchPeaks(){
        const bootstrap = getPeakBootstrapData();
        const bootstrapSlug = safeText(bootstrap && (bootstrap.slug || bootstrap.slug_en || bootstrap.Slug)).toLowerCase();
        const bootstrapPeak = bootstrap && typeof bootstrap === 'object'
          ? (bootstrap.peak && typeof bootstrap.peak === 'object' ? bootstrap.peak : null)
          : null;
        if (bootstrapSlug && bootstrapPeak) {
          const bootstrapMap = {};
          bootstrapMap[bootstrapSlug] = bootstrapPeak;
          const altSlug = safeText(bootstrapPeak.slug || bootstrapPeak.slug_en || bootstrapPeak.Slug).toLowerCase();
          if (altSlug && !bootstrapMap[altSlug]) {
            bootstrapMap[altSlug] = bootstrapPeak;
          }
          trackEvent('peak_data_loaded', { source: 'bootstrap', peakCount: Object.keys(bootstrapMap).length });
          return bootstrapMap;
        }

        let lastError = null;
        for(let i=0; i<API_URLS.length; i++){
          const url = API_URLS[i];
          try{
            console.log(`[Peak Data] Attempting to load from: ${url}`);
            const res = await fetch(url, { mode:'cors' });
            if(!res.ok){
              console.warn(`[Peak Data] Attempt ${i+1}/${API_URLS.length}: Status ${res.status} ${res.statusText}`);
              lastError = `HTTP ${res.status} ${res.statusText}`;
              continue;
            }
            const text = await res.text();
            console.log(`[Peak Data] Received ${text.length} bytes from ${url}`);
            const cleaned = cleanJSON(text);
            let data;
            try{
              data = JSON.parse(cleaned);
              const peakCount = Object.keys(data || {}).length;
              console.log(`[Peak Data] Parsed data: ${peakCount} peaks found`);
              if(peakCount === 0){
                console.warn(`[Peak Data] Warning: JSON file is empty or has no peak entries`);
                lastError = 'Empty data';
                continue;
              }
            }catch(err){
              console.error(`[Peak Data] JSON parse error: ${err.message}`);
              lastError = `Parse error: ${err.message}`;
              continue;
            }
            console.log(`[Peak Data] Successfully loaded peak data from ${url}`);
            trackEvent('peak_data_loaded', { source: url, peakCount: Object.keys(data).length });
            return data;
          }catch(err){
            console.error(`[Peak Data] Fetch error for ${url}:`, err);
            lastError = err.message || String(err);
            trackEvent('peak_data_fetch_error', { source: url, error: lastError });
          }
        }
        console.error('[Peak Data] All API endpoints failed. Last error:', lastError);
        console.error('[Peak Data] Attempted URLs:', API_URLS);
        throw new Error(`All API endpoints failed. Last error: ${lastError || 'Unknown error'}`);
      }

      async function fetchDescriptions(){
        for(const url of DESC_URLS){
          try{
            const response = await fetch(url, { mode:'cors' });
            if(!response.ok){
              continue;
            }

            const text = await response.text();
            const descriptionMap = {};
            const lines = text.split(/\r?\n/);
            for(const rawLine of lines){
              const line = safeText(rawLine).trim();
              if(!line || line.startsWith('#')){
                continue;
              }
              const separatorMatch = line.match(/[:Ã¢â‚¬â€œ]/);
              if(!separatorMatch || separatorMatch.index == null){
                continue;
              }
              const splitIndex = separatorMatch.index;
              const rawKey = line.slice(0, splitIndex).trim();
              const value = line.slice(splitIndex + 1).trim();
              const normalizedKey = normalizeDescriptionLookupKey(rawKey);
              if(normalizedKey && value){
                descriptionMap[normalizedKey] = value;
              }
            }

            return descriptionMap;
          }catch(err){
            console.warn('Failed to load mountain-descriptions:', err);
          }
        }
        return {};
      }

      async function fetchPeakExperiences(){
        if(peakExperienceMap && typeof peakExperienceMap === 'object'){
          return peakExperienceMap;
        }
        for(const url of EXPERIENCE_URLS){
          try{
            const response = await fetch(url, { mode: 'cors' });
            if(!response.ok){
              continue;
            }
            const text = await response.text();
            const payload = JSON.parse(cleanJSON(text));
            if(payload && typeof payload === 'object'){
              peakExperienceMap = payload;
              return peakExperienceMap;
            }
          }catch(err){
            console.warn('Failed to load peak experiences from', url, err);
          }
        }
        peakExperienceMap = {};
        return peakExperienceMap;
      }

      async function fetchJsonFromUrls(urls, fallbackValue) {
        for (const url of urls) {
          try {
            const response = await fetch(url, { mode: 'cors' });
            if (!response.ok) {
              continue;
            }
            const text = await response.text();
            const payload = JSON.parse(cleanJSON(text));
            if (payload !== undefined && payload !== null) {
              return payload;
            }
          } catch (err) {
            console.warn('Failed to fetch JSON from', url, err);
          }
        }
        return fallbackValue;
      }

      function buildDatasetOverlayUrls(datasetBaseName, langCode) {
        const safeLang = safeText(langCode).toLowerCase();
        if (!safeLang || safeLang === 'en') return [];
        const safeDataset = safeText(datasetBaseName);
        if (!safeDataset) return [];
        return [
          `${DATASET_OVERLAY_BASE_PATH}/${safeLang}/${safeDataset}.overlay.json`,
          `https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/i18n-content/${safeLang}/${safeDataset}.overlay.json${CDN_CACHE_BUST}`,
          `https://raw.githubusercontent.com/natesobol/nh48-api/main/data/i18n-content/${safeLang}/${safeDataset}.overlay.json${CDN_CACHE_BUST}`
        ];
      }

      function deepMergeOverlay(baseValue, overlayValue) {
        if (overlayValue === undefined || overlayValue === null) {
          return baseValue;
        }
        if (Array.isArray(baseValue) && Array.isArray(overlayValue)) {
          const maxLength = Math.max(baseValue.length, overlayValue.length);
          const merged = [];
          for (let i = 0; i < maxLength; i += 1) {
            if (i in overlayValue) {
              merged[i] = deepMergeOverlay(baseValue[i], overlayValue[i]);
            } else {
              merged[i] = baseValue[i];
            }
          }
          return merged;
        }
        if (
          baseValue &&
          overlayValue &&
          typeof baseValue === 'object' &&
          typeof overlayValue === 'object' &&
          !Array.isArray(baseValue) &&
          !Array.isArray(overlayValue)
        ) {
          const merged = { ...baseValue };
          Object.keys(overlayValue).forEach((key) => {
            merged[key] = deepMergeOverlay(baseValue[key], overlayValue[key]);
          });
          return merged;
        }
        return overlayValue;
      }

      function getActiveUiLanguage() {
        const i18nLang = window.NH48_I18N && typeof window.NH48_I18N.getLang === 'function'
          ? window.NH48_I18N.getLang()
          : '';
        const stored = localStorage.getItem('nh48_lang') || '';
        const routeLang = getSeoLang();
        return safeText(i18nLang || stored || routeLang || 'en').toLowerCase();
      }

      function buildParkingLookup(payload){
        const lookup = {};
        if (!Array.isArray(payload)) return lookup;
        payload.forEach((entry) => {
          if (!entry || typeof entry !== 'object') return;
          const slug = safeText(entry.slug).trim().toLowerCase();
          if (!slug) return;
          lookup[slug] = entry;
        });
        return lookup;
      }

      function buildRiskOverlayLookup(payload){
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          return {};
        }
        const lookup = {};
        Object.entries(payload).forEach(([key, value]) => {
          const slug = safeText((value && value.slug) || key).trim().toLowerCase();
          if (!slug || !value || typeof value !== 'object') return;
          lookup[slug] = value;
        });
        return lookup;
      }

      function getCurrentMonthWeather(monthlyWeather){
        if (!monthlyWeather || typeof monthlyWeather !== 'object') return null;
        const monthName = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'America/New_York' });
        return monthlyWeather[monthName] || null;
      }

      function getMonthlyWeatherByMonth(monthName){
        if (!monthlyWeatherLookup || typeof monthlyWeatherLookup !== 'object') return null;
        if (!monthName) return null;
        return monthlyWeatherLookup[monthName] || null;
      }

      function toFiniteCoord(value){
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
      }

      function haversineMiles(aLat, aLon, bLat, bLon){
        const toRad = (deg) => deg * Math.PI / 180;
        const r = 3958.8;
        const dLat = toRad(bLat - aLat);
        const dLon = toRad(bLon - aLon);
        const s1 = Math.sin(dLat / 2);
        const s2 = Math.sin(dLon / 2);
        const h = s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2;
        return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
      }

      function parseMapQueryCoords(urlValue){
        try{
          const parsed = new URL(String(urlValue));
          const queryValue =
            parsed.searchParams.get('query')
            || parsed.searchParams.get('destination')
            || parsed.searchParams.get('q')
            || parsed.searchParams.get('ll')
            || parsed.searchParams.get('center')
            || '';
          const match = queryValue.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
          let lat = match ? Number(match[1]) : NaN;
          let lon = match ? Number(match[2]) : NaN;
          if(!Number.isFinite(lat) || !Number.isFinite(lon)){
            const pathMatch = parsed.pathname.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
            if(pathMatch){
              lat = Number(pathMatch[1]);
              lon = Number(pathMatch[2]);
            }
          }
          if(!Number.isFinite(lat) || !Number.isFinite(lon)){
            return null;
          }
          return { lat, lon };
        }catch(_err){
          return null;
        }
      }

      function isCoordNearSummit(coord, summitCoord, thresholdMiles = 0.15){
        if(!coord || !summitCoord) return false;
        const distance = haversineMiles(coord.lat, coord.lon, summitCoord.lat, summitCoord.lon);
        return Number.isFinite(distance) && distance <= thresholdMiles;
      }

      function getValidatedParkingCoords(peak, parking){
        const lat = toFiniteCoord(parking && parking.parkingLat);
        const lng = toFiniteCoord(parking && parking.parkingLng);
        if(lat === null || lng === null) return null;
        const summit = parseCoordinates(peak && peak['Coordinates']);
        if(summit && isCoordNearSummit({ lat, lon: lng }, summit)){
          return null;
        }
        return { lat, lon: lng };
      }

      function getValidatedParkingSourceUrl(peak, parking){
        const sourceUrl = safeText(parking && parking.sourceUrl).trim();
        if(!sourceUrl) return '';
        const summit = parseCoordinates(peak && peak['Coordinates']);
        if(!summit) return sourceUrl;
        const queryCoords = parseMapQueryCoords(sourceUrl);
        if(queryCoords && isCoordNearSummit(queryCoords, summit)){
          return '';
        }
        return sourceUrl;
      }

      function buildTrailheadQuery(peak, parking){
        const trailhead = safeText(parking && parking.trailheadName) || safeText(peak && peak['Most Common Trailhead']);
        const notes = safeText(parking && parking.notes);
        const base = [trailhead, notes && notes.split(/[.;]/)[0], 'New Hampshire', 'White Mountains']
          .map((value) => safeText(value).trim())
          .filter(Boolean)
          .join(' ');
        if(!base) return '';
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(base)}`;
      }

      function toSlugSafe(value){
        return safeText(value).trim().toLowerCase();
      }

      function extractPeakAdvisories(payload, peak){
        if (!payload || typeof payload !== 'object') return [];
        const advisories = Array.isArray(payload.advisories) ? payload.advisories : [];
        const slug = toSlugSafe(currentSlug || peak?.slug || peak?.Slug || peak?.slug_en);
        const peakId = String(peak?.id || peak?.peakId || '').trim();
        return advisories.filter((advisory) => {
          if (!advisory || typeof advisory !== 'object') return false;
          const advisorySlug = toSlugSafe(advisory.peakSlug || advisory.slug);
          if (advisorySlug && slug && advisorySlug === slug) return true;
          if (Array.isArray(advisory.affectedPeaks)) {
            const affected = advisory.affectedPeaks.map((value) => toSlugSafe(value));
            if (slug && affected.includes(slug)) return true;
            if (peakId && affected.includes(toSlugSafe(peakId))) return true;
          }
          if (Array.isArray(advisory.peakIds) && peakId) {
            return advisory.peakIds.map((value) => String(value)).includes(peakId);
          }
          return false;
        });
      }

      function buildGoogleMapsDirectionsUrl(peak, parking){
        const validSourceUrl = getValidatedParkingSourceUrl(peak, parking);
        if(validSourceUrl){
          return validSourceUrl;
        }

        const validParkingCoords = getValidatedParkingCoords(peak, parking);
        if(validParkingCoords){
          return `https://www.google.com/maps/search/?api=1&query=${validParkingCoords.lat},${validParkingCoords.lon}`;
        }

        const trailheadQuery = buildTrailheadQuery(peak, parking);
        if(trailheadQuery){
          return trailheadQuery;
        }

        return null;
      }

      function buildPeakViewModel(peak, slug){
        const normalizedSlug = toSlugSafe(slug || peak?.slug || peak?.Slug || peak?.slug_en);
        const parking = parkingLookupBySlug?.[normalizedSlug] || null;
        const difficulty = peakDifficultyLookupBySlug?.[normalizedSlug] || null;
        const risk = riskOverlayLookupBySlug?.[normalizedSlug] || null;
        const monthWeather = getCurrentMonthWeather(monthlyWeatherLookup);
        const advisories = extractPeakAdvisories(currentConditionsData, peak);
        const directionsUrl = buildGoogleMapsDirectionsUrl(peak, parking);
        return {
          slug: normalizedSlug,
          peak,
          parking,
          difficulty,
          risk,
          monthWeather,
          advisories,
          directionsUrl,
          hasDirections: !!directionsUrl
        };
      }

      async function fetchPeakEnrichmentData(){
        const [parkingPayload, difficultyPayload, monthlyPayload, riskPayload, currentConditionsPayload] = await Promise.all([
          fetchJsonFromUrls(PARKING_DATA_URLS, []),
          fetchJsonFromUrls(PEAK_DIFFICULTY_URLS, {}),
          fetchJsonFromUrls(MONTHLY_WEATHER_URLS, {}),
          fetchJsonFromUrls(RISK_OVERLAY_URLS, {}),
          fetchJsonFromUrls(CURRENT_CONDITIONS_URLS, {})
        ]);
        parkingLookupBySlug = buildParkingLookup(parkingPayload);
        peakDifficultyLookupBySlug = difficultyPayload && typeof difficultyPayload === 'object' ? difficultyPayload : {};
        monthlyWeatherLookup = monthlyPayload && typeof monthlyPayload === 'object' ? monthlyPayload : {};
        riskOverlayLookupBySlug = buildRiskOverlayLookup(riskPayload);
        currentConditionsData = currentConditionsPayload && typeof currentConditionsPayload === 'object'
          ? currentConditionsPayload
          : {};
      }

      function neutralizeNarrativeText(value){
        let text = safeText(value).trim();
        if(!text) return '';
        const replacements = [
          [/\bI hiked\b/gi, 'This route was hiked'],
          [/\bI found\b/gi, 'Field notes indicate'],
          [/\bI recommend\b/gi, 'Recommended approach:'],
          [/\bI usually\b/gi, 'This route usually'],
          [/\bI carry\b/gi, 'Carry'],
          [/\bI avoid\b/gi, 'Avoid'],
          [/\bmy\b/gi, 'the'],
          [/\bme\b/gi, 'the hiker'],
          [/\bwe\b/gi, 'hikers'],
          [/\bour\b/gi, 'the'],
          [/\bI\b/gi, 'this route']
        ];
        replacements.forEach(([pattern, replacement]) => {
          text = text.replace(pattern, replacement);
        });
        return text.replace(/\s{2,}/g, ' ').trim();
      }

      function renderTrailTestedNotes(peak, slug){
        const panel = document.getElementById('trailTestedNotesPanel');
        const grid = document.getElementById('trailTestedNotesGrid');
        const reviewed = document.getElementById('trailTestedLastReviewed');
        const heading = document.getElementById('trailTestedNotesHeading');
        if(!panel || !grid || !reviewed || !heading){
          return;
        }

        const langCode = getSeoLang();

        const fromPeak = peak && peak.experience && typeof peak.experience === 'object' ? peak.experience : null;
        const fromMap = peakExperienceMap && slug ? peakExperienceMap[slug] : null;
        const experience = fromPeak || fromMap;
        if(!experience || typeof experience !== 'object'){
          panel.hidden = true;
          grid.innerHTML = '';
          reviewed.hidden = true;
          return;
        }

        const peakName = safeText(peak && (peak.peakName || peak['Peak Name'] || peak.name || peak.Name)) || slug;
        const summary = neutralizeNarrativeText(experience.experienceSummary);
        const conditions = neutralizeNarrativeText(experience.conditionsFromExperience);
        const planningTip = neutralizeNarrativeText(experience.planningTip);
        const historyNotes = neutralizeNarrativeText(experience.historyNotes || experience.history_notes || experience.history);
        const firstAscent = safeText(experience.firstAscent || experience.first_ascent);
        const lastReviewed = safeText(experience.lastReviewed);
        const cards = [];

        heading.textContent = langCode === 'fr' ? 'Notes de terrain et histoire' : 'Trail-tested notes';
        if(summary){
          cards.push({
            title: langCode === 'fr' ? `Resume de ${peakName}` : `${peakName} Summary`,
            text: summary
          });
        }
        if(conditions){
          cards.push({
            title: langCode === 'fr' ? `Conditions sur ${peakName}` : `Conditions on ${peakName}`,
            text: conditions
          });
        }
        if(planningTip){
          cards.push({
            title: 'Planning Trip',
            text: planningTip
          });
        }
        if(historyNotes || firstAscent){
          const lines = [];
          if(firstAscent){
            lines.push(`${langCode === 'fr' ? 'Premiere ascension' : 'First ascent'}: ${firstAscent}`);
          }
          if(historyNotes){
            lines.push(historyNotes);
          }
          cards.push({
            title: langCode === 'fr' ? `Histoire de ${peakName}` : `${peakName} History`,
            text: lines.join(' ')
          });
        }

        if(!cards.length){
          panel.hidden = true;
          grid.innerHTML = '';
          reviewed.hidden = true;
          return;
        }

        grid.innerHTML = '';
        cards.forEach((card, index) => {
          const article = document.createElement('article');
          article.className = 'experience-note';

          const titleEl = document.createElement('h3');
          titleEl.textContent = card.title;
          article.appendChild(titleEl);

          const textWrap = document.createElement('div');
          textWrap.className = 'experience-note-text is-collapsed';
          textWrap.id = `trail-note-content-${index}`;

          const paragraph = document.createElement('p');
          paragraph.textContent = card.text;
          textWrap.appendChild(paragraph);

          const fade = document.createElement('div');
          fade.className = 'collapsible-content-fade';
          textWrap.appendChild(fade);
          article.appendChild(textWrap);

          if(card.text.length > 220){
            const expandBtn = document.createElement('button');
            expandBtn.type = 'button';
            expandBtn.className = 'experience-note-expand';
            expandBtn.setAttribute('aria-expanded', 'false');
            expandBtn.textContent = translateWithFallback('peak.expand.show', 'Expand');
            expandBtn.addEventListener('click', () => {
              const isCollapsed = textWrap.classList.contains('is-collapsed');
              textWrap.classList.toggle('is-collapsed', !isCollapsed);
              expandBtn.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
              expandBtn.textContent = translateWithFallback(
                isCollapsed ? 'peak.expand.hide' : 'peak.expand.show',
                isCollapsed ? 'Collapse' : 'Expand'
              );
            });
            article.appendChild(expandBtn);
          }else{
            textWrap.classList.remove('is-collapsed');
          }

          grid.appendChild(article);
        });

        if(lastReviewed){
          reviewed.textContent = langCode === 'fr'
            ? `Derniere revision : ${lastReviewed}`
            : `Last reviewed: ${lastReviewed}`;
          reviewed.hidden = false;
        }else{
          reviewed.hidden = true;
          reviewed.textContent = '';
        }
        panel.hidden = false;
        ensureSectionZoomControl('trailTestedNotesPanel', 'trailTestedNotesHeading');
      }

      /* CAROUSEL + TIMER STATE ----------------------------------------------- */
      let carouselImgs = [];
      let carouselIdx = 0;
      let carouselTimer = null;
      let timerInterval = null;
      let photoMetaData = [];
      let currentDelay = 8000;
      const BASE_DELAY = 8000; // doubled from 4s
      let currentPeak = null;
      let currentSlug = null;
      let currentImages = [];
      let currentMeta = [];
      let currentPrimaryMeta = null;
      let currentPrimaryPhoto = null;
      let peakExperienceMap = null;
      let peakViewModel = null;
      let parkingLookupBySlug = {};
      let peakDifficultyLookupBySlug = {};
      let monthlyWeatherLookup = {};
      let riskOverlayLookupBySlug = {};
      let currentConditionsData = {};
      const localeOverlayCache = new Map();
      let selectedWeatherMonth = new Date().toLocaleString('en-US', { month: 'long', timeZone: 'America/New_York' });
      let panelReaderTrigger = null;
      let metadataExpanded = false;
      const metadataMobileQuery = window.matchMedia('(max-width: 720px)');
      let isCarouselPaused = false;
      const LANGUAGE_READY_TIMEOUT = 2000;
      const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      let peakMap = null;
      let peakMapTrailsLayer = null;
      let peakMapMarker = null;
      let peakMapLabel = null;
      let peakMapBounds = null;
      let peakMapTrailDataPromise = null;

      async function waitForI18NReady(timeoutMs = LANGUAGE_READY_TIMEOUT){
        return new Promise((resolve) => {
          let resolved = false;
          const finish = () => {
            if(resolved) return;
            resolved = true;
            resolve();
          };

          const start = performance.now();
          const check = () => {
            const i18n = window.NH48_I18N;
            if(i18n && typeof i18n.t === 'function'){
              const sample = i18n.t('peak.generalInfo.title');
              if(sample && sample !== 'peak.generalInfo.title'){
                finish();
                return;
              }
            }
            if(performance.now() - start >= timeoutMs){
              finish();
              return;
            }
            requestAnimationFrame(check);
          };

          if(window.NH48_I18N && typeof window.NH48_I18N.onLangChange === 'function'){
            window.NH48_I18N.onLangChange(() => finish());
          }

          check();
        });
      }

      /* METADATA PANEL -------------------------------------------------------- */
      function enrichMetadata(meta = {}, iptc = {}){
        if(!meta || typeof meta !== 'object') return meta;

        const safeIptc = iptc && typeof iptc === 'object'
          ? iptc
          : (meta.iptc && typeof meta.iptc === 'object' ? meta.iptc : {});
        const pickText = (...values) => {
          for(const v of values){
            if(v !== undefined && v !== null && String(v).trim() !== ''){
              return v;
            }
          }
          return undefined;
        };

        const merged = {
          ...safeIptc,
          ...meta,
          altText: pickText(meta.altText, safeIptc.altText, safeIptc.description),
          alt: pickText(meta.alt, safeIptc.altText, safeIptc.description),
          extendedAlt: pickText(
            meta.extendedAlt,
            meta.extendedDescription,
            safeIptc.extendedDescription,
            safeIptc.description
          ),
          headline: pickText(meta.headline, safeIptc.headline),
          caption: pickText(meta.caption, safeIptc.description),
          description: pickText(meta.description, safeIptc.description),
          extendedDescription: pickText(meta.extendedDescription, safeIptc.extendedDescription),
          creator: pickText(meta.creator, safeIptc.creator, meta.author),
          creditLine: pickText(meta.creditLine, safeIptc.creditLine),
          source: pickText(meta.source, safeIptc.source),
          copyrightNotice: pickText(meta.copyrightNotice, safeIptc.copyrightNotice),
          copyrightStatus: pickText(meta.copyrightStatus, safeIptc.copyrightStatus),
          rightsUsageTerms: pickText(meta.rightsUsageTerms, safeIptc.rightsUsageTerms)
        };

        if(!merged.creator) merged.creator = 'Nathan Sobol';
        if(!merged.creditLine) merged.creditLine = 'Ã‚Â© Nathan Sobol / NH48pics.com';
        if(!merged.source) merged.source = 'nh48.info';
        if(!merged.copyrightNotice) merged.copyrightNotice = 'Ã‚Â© Nathan Sobol';
        if(!merged.copyrightStatus) merged.copyrightStatus = 'Copyrighted';
        if(!merged.rightsUsageTerms){
          merged.rightsUsageTerms =
            'No Unauthorized Reprint or Resale Ã¢â‚¬â€œ Free to Reference Online';
        }
        if(meta.license) merged.license = meta.license;
        if(meta.credentials) merged.credentials = meta.credentials;

        const normalizePerson = (value) => {
          if(value === undefined || value === null) return '';
          return String(value).trim().toLowerCase();
        };
        const normalizedAuthor = normalizePerson(merged.author);
        const normalizedCreator = normalizePerson(merged.creator);
        if(normalizedAuthor && normalizedCreator && normalizedAuthor === normalizedCreator){
          delete merged.creator;
        }

        return merged;
      }

      function makeRow(label, value, options = {}){
        const {
          isMultiline = false,
          isLeftAligned = false,
          disableClamp = false,
          groupKey = ''
        } = options;
        const row = document.createElement('div');
        row.className = 'metadata-row';
        if(isMultiline){
          row.classList.add('is-multiline');
        }
        if(groupKey === 'desc-accessibility'){
          row.classList.add('is-desc-accessibility');
        }

        const lab = document.createElement('div');
        lab.className = 'metadata-label';
        lab.textContent = label;

        const val = document.createElement('div');
        val.className = 'metadata-value';
        val.classList.add(disableClamp ? 'is-unclamped' : 'is-clamped');
        val.classList.add(isLeftAligned ? 'is-left-aligned' : 'is-right-aligned');
        val.textContent = safeText(value);

        row.appendChild(lab);
        row.appendChild(val);
        return row;
      }

      async function fetchDatasetOverlay(datasetBaseName, langCode) {
        const cacheKey = `${safeText(langCode).toLowerCase()}::${safeText(datasetBaseName)}`;
        if (localeOverlayCache.has(cacheKey)) {
          return localeOverlayCache.get(cacheKey);
        }
        const overlayUrls = buildDatasetOverlayUrls(datasetBaseName, langCode);
        if (!overlayUrls.length) {
          localeOverlayCache.set(cacheKey, {});
          return {};
        }
        const payload = await fetchJsonFromUrls(overlayUrls, {});
        const normalized = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
        localeOverlayCache.set(cacheKey, normalized);
        return normalized;
      }

      function humanLabelFromKey(key){
        const map = {
          season: 'peak.metadata.labels.season',
          timeOfDay: 'peak.metadata.labels.timeOfDay',
          orientation: 'peak.metadata.labels.orientation',
          captureDate: 'peak.metadata.labels.captureDate',
          cameraMaker: 'peak.metadata.labels.cameraMaker',
          cameraModel: 'peak.metadata.labels.cameraModel',
          camera: 'peak.metadata.labels.camera',
          lens: 'peak.metadata.labels.lens',
          fStop: 'peak.metadata.labels.fStop',
          shutterSpeed: 'peak.metadata.labels.shutterSpeed',
          iso: 'peak.metadata.labels.iso',
          exposureBias: 'peak.metadata.labels.exposureBias',
          focalLength: 'peak.metadata.labels.focalLength',
          flashMode: 'peak.metadata.labels.flashMode',
          meteringMode: 'peak.metadata.labels.meteringMode',
          maxAperture: 'peak.metadata.labels.maxAperture',
          author: 'peak.metadata.labels.author',
          dimensions: 'peak.metadata.labels.dimensions',
          fileSize: 'peak.metadata.labels.fileSize',
          fileCreateDate: 'peak.metadata.labels.fileCreateDate',
          fileModifiedDate: 'peak.metadata.labels.fileModifiedDate',
          rating: 'peak.metadata.labels.rating',
          metadata: 'peak.metadata.labels.metadata',
          creator: 'peak.metadata.labels.author',
          creditLine: 'peak.metadata.labels.creditLine',
          source: 'peak.metadata.labels.source',
          copyrightNotice: 'peak.metadata.labels.copyrightNotice',
          copyrightStatus: 'peak.metadata.labels.copyrightStatus',
          rightsUsageTerms: 'peak.metadata.labels.rightsUsageTerms',
          altText: 'peak.metadata.labels.altText',
          alt: 'peak.metadata.labels.alt',
          extendedAlt: 'peak.metadata.labels.extendedAlt',
          caption: 'peak.metadata.labels.caption',
          headline: 'peak.metadata.labels.headline',
          extendedDescription: 'peak.metadata.labels.extendedDescription',
          description: 'peak.metadata.labels.description'
        };
        if(map[key]) return t(map[key]);
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      }

      function entriesFromObject(prefixLabel, obj){
        const entries = [];
        if(!obj || typeof obj !== 'object') return entries;
        Object.entries(obj).forEach(([key, val]) => {
          if(val === undefined || val === null) return;
          if(typeof val === 'object' && !Array.isArray(val)){
            entries.push(...entriesFromObject(`${prefixLabel} Ã¢â‚¬â€ ${humanLabelFromKey(key)}`, val));
          }else{
            const valueText = Array.isArray(val) ? val.join(', ') : String(val).trim();
            if(valueText){
              entries.push([`${prefixLabel} Ã¢â‚¬â€ ${humanLabelFromKey(key)}`, valueText]);
            }
          }
        });
        return entries;
      }

      // Always-visible keys
      const PRIMARY_META_KEYS = [
        'captureDate',
        'season',
        'timeOfDay',
        'author',
        'creditLine'
      ];
      const SKIP_META_KEYS = new Set(['photoId','filename','url','isPrimary']);

      function applyMetadataState(open, extraWrap, toggleBtn, { track=false } = {}){
        metadataExpanded = open;
        if(extraWrap){
          extraWrap.classList.toggle('open', open);
        }
        if(toggleBtn){
          toggleBtn.textContent = open ? t('peak.metadata.lessDetails') : t('peak.metadata.moreDetails');
        }
        if(open){
          pauseCarousel('metadata_panel');
        }else{
          resumeCarousel('metadata_panel');
        }
        if(track){
          trackEvent('peak_metadata_toggle', { open });
        }
      }

      // --- Enhanced updateMetadata: group fields by type, show all, stacked layout ---
      function updateMetadata(i){
        const panel = document.getElementById('photoMetadataPanel');
        panel.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'metadata-header';

        const title = document.createElement('div');
        title.className = 'metadata-title';
        title.textContent = t('peak.metadata.title');

        header.appendChild(title);
        const zoomBtn = document.createElement('button');
        zoomBtn.type = 'button';
        zoomBtn.className = 'panel-zoom-btn';
        zoomBtn.setAttribute('aria-label', translateWithFallback('peak.reader.openPanel', 'Open panel reader'));
        zoomBtn.title = translateWithFallback('peak.reader.openPanel', 'Open panel reader');
        zoomBtn.innerHTML = '<span class="iconify" data-icon="mdi:magnify-plus-outline" aria-hidden="true"></span>';
        zoomBtn.addEventListener('click', () => openPanelReader(panel, title.textContent, zoomBtn));
        header.appendChild(zoomBtn);
        panel.appendChild(header);

        const meta = (photoMetaData && photoMetaData[i]) || null;
        const enrichedMeta = enrichMetadata(meta);
        if(metadataMobileQuery.matches){
          metadataExpanded = false;
        }
        if(!meta || typeof meta !== 'object'){
          const empty = document.createElement('div');
          empty.className = 'metadata-primary';
          empty.appendChild(makeRow(t('peak.metadata.labels.metadata'), t('peak.metadata.notAvailable')));
          panel.appendChild(empty);
          metadataExpanded = false;
          resumeCarousel('metadata_panel');
          panel.hidden = false;
          return;
        }

        // Grouping keys by type (EXIF, IPTC, SEO, File Info, etc.)
        const GROUPS = [
          { label: 'Descriptions & Accessibility', keys: ['headline','caption','description','extendedDescription','altText','alt','extendedAlt','title','subject'] },
          { label: 'EXIF', keys: ['captureDate','cameraMaker','cameraModel','camera','lens','fStop','shutterSpeed','iso','exposureBias','focalLength','flashMode','meteringMode','maxAperture','focalLength35mm','rating','dimensions'] },
          { label: 'File Info', keys: ['fileSize','fileCreateDate','fileModifiedDate','author','creator','creditLine','source','title','subject'] },
          { label: 'Tags & Attributes', keys: ['tags','season','timeOfDay','orientation','isPrimary'] },
          { label: 'Rights & Licensing', keys: ['copyrightNotice','copyrightStatus','rightsUsageTerms'] },
          { label: 'IPTC', keys: ['iptc'] },
        ];

        const displayMeta = (enrichedMeta && typeof enrichedMeta === 'object') ? enrichedMeta : meta;
        const shownValues = new Set();
        let shown = new Set(PRIMARY_META_KEYS);

        const formatMetadataValue = (val, key = '') => {
          if(Array.isArray(val)){
            return val
              .map((item) => normalizeMetadataDisplayValue(key, item))
              .filter(Boolean)
              .join(', ');
          }
          if(typeof val === 'object'){
            return JSON.stringify(val, null, 2);
          }
          return normalizeMetadataDisplayValue(key, val);
        };

        const addMetadataRow = (container, label, value, key, rowOptions = {}) => {
          const valueText = formatMetadataValue(value, key).trim();
          if(!valueText || shownValues.has(valueText)){
            return false;
          }
          container.appendChild(makeRow(label, valueText, rowOptions));
          shownValues.add(valueText);
          if(key){
            shown.add(key);
          }
          return true;
        };

        // Collapsed: show only primary keys
        const primaryWrap = document.createElement('div');
        primaryWrap.className = 'metadata-primary';
        let hasPrimary = false;
        PRIMARY_META_KEYS.forEach(key => {
          if(enrichedMeta && enrichedMeta[key] !== undefined && enrichedMeta[key] !== null && String(enrichedMeta[key]).trim() !== ''){
            if(addMetadataRow(primaryWrap, humanLabelFromKey(key), enrichedMeta[key], key)){
              hasPrimary = true;
            }
          }
        });
        if(!hasPrimary){
          primaryWrap.appendChild(makeRow(t('peak.metadata.labels.metadata'), t('peak.metadata.notAvailable')));
        }
        panel.appendChild(primaryWrap);

        // Expanded: show all fields, grouped by type, skipping duplicates
        const extraWrap = document.createElement('div');
        extraWrap.className = 'metadata-extra';
        GROUPS.forEach(group => {
          if(group.label === 'IPTC'){
            const iptc = enrichedMeta && enrichedMeta.iptc;
            if(iptc && typeof iptc === 'object'){
              shown.add('iptc');

              const groupHeader = document.createElement('div');
              groupHeader.className = 'metadata-group-header';
              groupHeader.textContent = group.label;
              extraWrap.appendChild(groupHeader);

              const creatorFields = [
                ['Creator', iptc.creator, 'creator'],
                ['Creator Job Title', iptc.creatorJobTitle, 'creatorJobTitle'],
                ['Creator Email', iptc.creatorEmail, 'creatorEmail'],
                ['Creator Website', iptc.creatorWebsite, 'creatorWebsite'],
                ['Featured Org Name', iptc.featuredOrgName, 'featuredOrgName']
              ].filter(([,v]) => v !== undefined && v !== null && String(v).trim() !== '');

              if(creatorFields.length){
                const subHeader = document.createElement('div');
                subHeader.className = 'metadata-group-subheader';
                subHeader.textContent = 'Creator & Credits';
                extraWrap.appendChild(subHeader);
                creatorFields.forEach(([label, value, key]) => {
                  addMetadataRow(extraWrap, label, value, key);
                });
              }

              const rightsFields = [
                ['Credit Line', iptc.creditLine, 'creditLine'],
                ['Source', iptc.source, 'source'],
                ['Copyright Notice', iptc.copyrightNotice, 'copyrightNotice'],
                ['Copyright Status', iptc.copyrightStatus, 'copyrightStatus'],
                ['Rights Usage Terms', iptc.rightsUsageTerms, 'rightsUsageTerms'],
                ['Intellectual Genre', iptc.intellectualGenre, 'intellectualGenre'],
                ['IPTC Subject Code', iptc.iptcSubjectCode, 'iptcSubjectCode']
              ].filter(([,v]) => v !== undefined && v !== null && String(v).trim() !== '');

              if(rightsFields.length){
                const subHeader = document.createElement('div');
                subHeader.className = 'metadata-group-subheader';
                subHeader.textContent = 'Rights & Licensing';
                extraWrap.appendChild(subHeader);
                rightsFields.forEach(([label, value, key]) => {
                  addMetadataRow(extraWrap, label, value, key);
                });
              }

              if(Array.isArray(iptc.keywords) && iptc.keywords.length){
                const subHeader = document.createElement('div');
                subHeader.className = 'metadata-group-subheader';
                subHeader.textContent = 'Keywords';
                extraWrap.appendChild(subHeader);
                addMetadataRow(extraWrap, 'Keywords', iptc.keywords.join(', '), 'keywords');
              }

              const locationCreatedRows = entriesFromObject('Location Created', iptc.locationCreated);
              const locationShownRows = entriesFromObject('Location Shown', iptc.locationShown);
              const locationRows = [...locationCreatedRows, ...locationShownRows];
              if(locationRows.length){
                const subHeader = document.createElement('div');
                subHeader.className = 'metadata-group-subheader';
                subHeader.textContent = 'Locations';
                extraWrap.appendChild(subHeader);
                locationRows.forEach(([label, value]) => addMetadataRow(extraWrap, label, value));
                shown.add('locationCreated');
                shown.add('locationShown');
              }

              const miscIptc = { ...iptc };
              delete miscIptc.locationCreated;
              delete miscIptc.locationShown;
              delete miscIptc.keywords;
              delete miscIptc.altText;
              delete miscIptc.headline;
              delete miscIptc.description;
              delete miscIptc.extendedDescription;
              delete miscIptc.creator;
              delete miscIptc.creatorJobTitle;
              delete miscIptc.creatorEmail;
              delete miscIptc.creatorWebsite;
              delete miscIptc.featuredOrgName;
              delete miscIptc.creditLine;
              delete miscIptc.source;
              delete miscIptc.copyrightNotice;
              delete miscIptc.copyrightStatus;
              delete miscIptc.rightsUsageTerms;
              delete miscIptc.intellectualGenre;
              delete miscIptc.iptcSubjectCode;
              Object.entries(miscIptc).forEach(([key, val]) => {
                if(val === undefined || val === null) return;
                const valueText = formatMetadataValue(val, key).trim();
                if(valueText){
                  addMetadataRow(extraWrap, humanLabelFromKey(key), valueText, key);
                }
              });
            }
            return;
          }

          const isDescriptionsGroup = group.label === 'Descriptions & Accessibility';
          let groupFields = [];
          group.keys.forEach(key => {
            if(SKIP_META_KEYS.has(key)) return;
            if(displayMeta[key] !== undefined && displayMeta[key] !== null && String(displayMeta[key]).trim() !== '' && !shown.has(key)){
              const valueText = formatMetadataValue(displayMeta[key], key).trim();
              if(!valueText || shownValues.has(valueText)) return;
              groupFields.push([key, valueText]);
              shown.add(key);
              shownValues.add(valueText);
            }
          });
          if(groupFields.length > 0){
            const groupHeader = document.createElement('div');
            groupHeader.className = 'metadata-group-header';
            groupHeader.textContent = group.label;
            extraWrap.appendChild(groupHeader);
            groupFields.forEach(([key, val]) => {
              extraWrap.appendChild(makeRow(
                humanLabelFromKey(key),
                val,
                isDescriptionsGroup
                  ? {
                    isMultiline: true,
                    isLeftAligned: true,
                    disableClamp: true,
                    groupKey: 'desc-accessibility'
                  }
                  : {}
              ));
            });
          }
        });
        // Add any remaining fields not in groups
        Object.entries(displayMeta).forEach(([key, val]) => {
          if(SKIP_META_KEYS.has(key) || shown.has(key)) return;
          if(val === undefined || val === null || String(val).trim() === '') return;
          addMetadataRow(extraWrap, humanLabelFromKey(key), val, key);
        });

        if(extraWrap.childNodes.length > 0){
          const toggleBtn = document.createElement('button');
          toggleBtn.type = 'button';
          toggleBtn.className = 'meta-toggle';
          header.appendChild(toggleBtn);
          panel.appendChild(extraWrap);
          applyMetadataState(metadataExpanded, extraWrap, toggleBtn);
          toggleBtn.addEventListener('click', () => {
            const open = !extraWrap.classList.contains('open');
            applyMetadataState(open, extraWrap, toggleBtn, { track: true });
          });
        }else{
          metadataExpanded = false;
          resumeCarousel('metadata_panel');
        }
        panel.hidden = false;
      }

      function buildPeakDescription(p){
        const panel = document.getElementById('peakDescriptionPanel');
        if(!panel) return;
        panel.innerHTML = '';

        const description = safeText(p.description || p['Description']).trim();
        if(!description){
          panel.hidden = true;
          return;
        }

        const header = document.createElement('div');
        header.className = 'metadata-header';

        const title = document.createElement('div');
        title.className = 'metadata-title';
        title.textContent = translateWithFallback('peak.description.title', 'Mountain Overview');
        header.appendChild(title);

        const zoomBtn = document.createElement('button');
        zoomBtn.type = 'button';
        zoomBtn.className = 'panel-zoom-btn';
        zoomBtn.setAttribute('aria-label', translateWithFallback('peak.reader.openPanel', 'Open panel reader'));
        zoomBtn.title = translateWithFallback('peak.reader.openPanel', 'Open panel reader');
        zoomBtn.innerHTML = '<span class="iconify" data-icon="mdi:magnify-plus-outline" aria-hidden="true"></span>';
        zoomBtn.addEventListener('click', () => {
          openPanelReader(panel, title.textContent);
        });
        header.appendChild(zoomBtn);

        const contentWrap = document.createElement('div');
        contentWrap.id = 'overviewPanelContent';
        contentWrap.className = 'collapsible-content is-collapsed';

        const body = document.createElement('div');
        body.className = 'description-body';
        body.textContent = description;
        contentWrap.appendChild(body);

        const fade = document.createElement('div');
        fade.className = 'collapsible-content-fade';
        contentWrap.appendChild(fade);

        const expandBtn = document.createElement('button');
        expandBtn.type = 'button';
        expandBtn.id = 'overviewExpandBtn';
        expandBtn.className = 'panel-expand-btn';
        expandBtn.setAttribute('aria-expanded', 'false');
        expandBtn.textContent = translateWithFallback('peak.expand.show', 'Expand');
        expandBtn.addEventListener('click', () => {
          const isCollapsed = contentWrap.classList.contains('is-collapsed');
          contentWrap.classList.toggle('is-collapsed', !isCollapsed);
          expandBtn.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
          expandBtn.textContent = translateWithFallback(
            isCollapsed ? 'peak.expand.hide' : 'peak.expand.show',
            isCollapsed ? 'Collapse' : 'Expand'
          );
          trackEvent('peak_overview_toggle', {
            slug: currentSlug,
            expanded: isCollapsed
          });
        });

        panel.appendChild(header);
        panel.appendChild(contentWrap);
        panel.appendChild(expandBtn);
        panel.hidden = false;
      }

      /* GENERAL PEAK INFO PANEL ---------------------------------------------- */
      function buildGeneralInfo(p){
        const panel = document.getElementById('generalInfoPanel');
        panel.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'metadata-header';

        const title = document.createElement('div');
        title.className = 'metadata-title';
        title.textContent = t('peak.generalInfo.title');

        header.appendChild(title);
        const zoomBtn = document.createElement('button');
        zoomBtn.type = 'button';
        zoomBtn.className = 'panel-zoom-btn';
        zoomBtn.setAttribute('aria-label', translateWithFallback('peak.reader.openPanel', 'Open panel reader'));
        zoomBtn.title = translateWithFallback('peak.reader.openPanel', 'Open panel reader');
        zoomBtn.innerHTML = '<span class="iconify" data-icon="mdi:magnify-plus-outline" aria-hidden="true"></span>';
        zoomBtn.addEventListener('click', () => openPanelReader(panel, title.textContent, zoomBtn));
        header.appendChild(zoomBtn);
        panel.appendChild(header);

        const body = document.createElement('div');
        body.className = 'metadata-primary';
        panel.appendChild(body);

        const elev = p['Elevation (ft)'];
        const prom = p['Prominence (ft)'];
        const bestSeasons = safeText(p['Best Seasons to Hike']).trim();
        const normalizedSeasons = bestSeasons
          ? bestSeasons
            .split(/[;,/]/)
            .map((chunk) => chunk.trim())
            .filter(Boolean)
            .map((chunk) => capitalizeFirstLetter(chunk))
            .join(', ')
          : '';
        const waterAvailability = capitalizeFirstLetter(safeText(p['Water Availability']).trim());
        const cellReception = capitalizeFirstLetter(safeText(p['Cell Reception Quality']).trim());
        const typicalTime = safeText(p['Typical Completion Time']).trim();

        body.appendChild(makeRow(t('peak.generalInfo.elevation'), formatFeetValue(elev)));
        body.appendChild(makeRow(t('peak.generalInfo.prominence'), formatFeetValue(prom)));
        body.appendChild(makeRow(t('peak.generalInfo.range'), p['Range / Subrange'] || 'Ã¢â‚¬â€'));
        body.appendChild(makeRow(t('peak.generalInfo.trailType'), translateTrailType(p['Trail Type']) || 'Ã¢â‚¬â€'));
        body.appendChild(makeRow(t('peak.generalInfo.difficulty'), translateDifficulty(p['Difficulty']) || 'Ã¢â‚¬â€'));
        body.appendChild(makeRow(t('peak.generalInfo.exposure'), translateExposure(p['Exposure Level'] || p['Weather Exposure Rating']) || 'Ã¢â‚¬â€'));
        body.appendChild(makeRow(t('peak.generalInfo.typicalTime'), typicalTime || 'Ã¢â‚¬â€'));
        body.appendChild(makeRow(t('peak.generalInfo.bestSeasons'), normalizedSeasons || 'Ã¢â‚¬â€'));
        body.appendChild(makeRow(t('peak.generalInfo.waterAvailability'), waterAvailability || 'Ã¢â‚¬â€'));
        body.appendChild(makeRow(t('peak.generalInfo.cellReception'), cellReception || 'Ã¢â‚¬â€'));

        panel.hidden = false;
        trackEvent('peak_general_info_rendered', { slug: currentSlug });
      }

      function buildPrintSummary(peak, name){
        const summary = document.getElementById('print-summary');
        if(!summary || !peak) return;

        const peakName = name || peak.peakName || peak['Peak Name'] || peak.name || peak['Name'] || peak.peak || peak['Peak'] || peak['PeakName'] || currentSlug || '';
        const imgUrl = (currentPrimaryPhoto && currentPrimaryPhoto.url)
          || (Array.isArray(peak.photos) && peak.photos.length > 0 && (peak.photos[0].url || peak.photos[0]))
          || getPlaceholder();
        const description = safeText(peak.description || peak['Description']).trim();
        const elevation = formatFeetValue(peak['Elevation (ft)']);
        const prominence = formatFeetValue(peak['Prominence (ft)']);
        const routes = Array.isArray(peak['Standard Routes']) ? peak['Standard Routes'] : [];
        const distance = routes.length ? formatDistanceMiles(routes[0]['Distance (mi)']) : 'Ã¢â‚¬â€';
        const difficulty = translateDifficulty(peak['Difficulty']) || 'Ã¢â‚¬â€';
        const trailType = translateTrailType(peak['Trail Type']) || 'Ã¢â‚¬â€';
        const season = safeText(peak['Best Seasons to Hike'] || peak.season || peak['Season']) || translateWithFallback('peak.generalInfo.season', 'All year');

        summary.innerHTML = `
          <div class="print-summary-header">
            <img src="${escapeHtml(normalizePhotoUrl(imgUrl))}" alt="${escapeHtml(peakName)} summit" class="print-thumb" loading="lazy" decoding="async">
            <h2>${escapeHtml(peakName)}</h2>
          </div>
          <dl class="print-details">
            <div><dt>${escapeHtml(t('peak.generalInfo.elevation'))}</dt><dd>${escapeHtml(elevation)}</dd></div>
            <div><dt>${escapeHtml(t('peak.generalInfo.prominence'))}</dt><dd>${escapeHtml(prominence)}</dd></div>
            <div><dt>${escapeHtml(translateWithFallback('peak.print.distance', 'Distance (round-trip)'))}</dt><dd>${escapeHtml(distance)}</dd></div>
            <div><dt>${escapeHtml(t('peak.generalInfo.difficulty'))}</dt><dd>${escapeHtml(difficulty)}</dd></div>
            <div><dt>${escapeHtml(t('peak.generalInfo.trailType'))}</dt><dd>${escapeHtml(trailType)}</dd></div>
            <div><dt>${escapeHtml(translateWithFallback('peak.print.season', 'Season'))}</dt><dd>${escapeHtml(season)}</dd></div>
          </dl>
          ${description ? `<p class="print-description">${escapeHtml(description)}</p>` : ''}
        `;
      }

      function renderRoutes(routes){
        const routesGrid = document.getElementById('routesGrid');
        const routesHeading = document.getElementById('routesHeading');
        if(!routesGrid) return;
        ensureSectionZoomControl('routesPanel', 'routesHeading');
        routesGrid.innerHTML = '';
        if(!Array.isArray(routes) || routes.length === 0){
          routesGrid.hidden = true;
          if(routesHeading){
            routesHeading.textContent = `${translateWithFallback('peak.section.routes', 'Standard Routes')} (0)`;
          }
          trackEvent('peak_routes_empty', { slug: currentSlug });
          return;
        }
        if(routesHeading){
          routesHeading.textContent = `${translateWithFallback('peak.section.routes', 'Standard Routes')} (${routes.length})`;
        }
        routes.forEach(r => {
          const div = document.createElement('div');
          div.className = 'info-panel';
          const dist  = formatDistanceMiles(r['Distance (mi)']);
          const gain  = formatFeetValue(r['Elevation Gain (ft)']);
          const diff  = translateDifficulty(r['Difficulty']) || 'Ã¢â‚¬â€';
          div.innerHTML = `
            <div class="info-label">${r['Route Name']}</div>
            <div class="info-value">
              <strong>${t('peak.routes.distance')}:</strong> ${dist} Ã¢â‚¬Â¢ 
              <strong>${t('peak.routes.gain')}:</strong> ${gain} Ã¢â‚¬Â¢ 
              <strong>${t('peak.routes.difficulty')}:</strong> ${diff}
            </div>`;
          routesGrid.appendChild(div);
        });
        routesGrid.hidden = false;
        ensureSectionZoomControl('routesPanel', 'routesHeading');
        trackEvent('peak_routes_rendered', { slug: currentSlug, count: routes.length });
      }

      function extractRelatedTrailNames(routes){
        if(!Array.isArray(routes)) return [];
        const keywords = TRAIL_KEYWORDS.join('|');
        const endPattern = new RegExp(`\\b(?:${keywords})\\b$`, 'i');
        const names = new Set();

        routes.forEach(route => {
          const raw = (route['Route Name'] || route.name || '').trim();
          if(!raw) return;
          const parts = raw
            .replace(/[()]/g, ' ')
            .split(/\s*(?:>|via|to|,|;|\/|&)\s*/i);
          parts.forEach(part => {
            const cleaned = part.replace(/[^\w\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
            if(!cleaned) return;
            const words = cleaned.split(' ').filter(Boolean);
            if(words.length < 2 || words.length > 4) return;
            if(!endPattern.test(cleaned)) return;
            const formatted = words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            names.add(formatted);
          });
        });

        return Array.from(names);
      }

      function buildTrailLink(name){
        const encoded = encodeURIComponent(name);
        const link = document.createElement('a');
        link.href = `https://nh48.info/trails?trail=${encoded}`;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = translateWithFallback('peak.relatedTrails.link', `${name} route`, { name });
        link.setAttribute('aria-label', translateWithFallback('peak.relatedTrails.link', `${name} route`, { name }));
        link.addEventListener('click', () => {
          trackEvent('peak_trail_link_click', { trail: name, slug: currentSlug });
        });
        return link;
      }

      function renderRelatedTrails(routes, trailNames = []){
        const relatedGrid = document.getElementById('relatedTrailsGrid');
        if(!relatedGrid) return;
        relatedGrid.innerHTML = '';

        const relatedNames = extractRelatedTrailNames(routes);
        const additionalNames = Array.isArray(trailNames) ? trailNames : [];
        const combinedNames = Array.from(new Set([...relatedNames, ...additionalNames]
          .map(name => (name || '').toString().trim())
          .filter(Boolean)))
          .sort((a, b) => a.localeCompare(b));

        const panel = document.createElement('div');
        panel.className = 'info-panel';

        const label = document.createElement('div');
        label.className = 'info-label';
        label.textContent = translateWithFallback('peak.relatedTrails.title', 'Related Trails & Routes');
        panel.appendChild(label);

        const branding = document.createElement('a');
        branding.className = 'trail-branding';
        branding.href = 'https://nh48.info/trails';
        branding.target = '_blank';
        branding.rel = 'noopener';
        branding.title = 'Explore White Mountain National Forest trails map and dataset';
        branding.setAttribute('aria-label', 'Explore White Mountain National Forest trails map and dataset');

        const logo = document.createElement('img');
        logo.src = '/WMNF_Trails_API_logo.png';
        logo.alt = 'White Mountain National Forest Trails API logo badge';
        logo.loading = 'lazy';
        logo.decoding = 'async';
        branding.appendChild(logo);

        const brandingCopy = document.createElement('div');
        brandingCopy.className = 'trail-branding-text';
        brandingCopy.innerHTML = `<strong>White Mountain Trails Map</strong><span>Interactive WMNF trail list with GPX-backed route details</span>`;
        branding.appendChild(brandingCopy);

        panel.appendChild(branding);

        const list = document.createElement('ul');
        list.className = 'trail-list';

        if(!combinedNames.length){
          const emptyItem = document.createElement('li');
          emptyItem.textContent = translateWithFallback('peak.relatedTrails.none', 'No related trails listed yet.');
          list.appendChild(emptyItem);
          trackEvent('peak_related_trails_empty', { slug: currentSlug });
        }else{
          combinedNames.forEach(name => {
            const li = document.createElement('li');
            li.appendChild(buildTrailLink(name));
            list.appendChild(li);
          });
          trackEvent('peak_related_trails_rendered', { slug: currentSlug, count: combinedNames.length });
        }

        panel.appendChild(list);
        relatedGrid.appendChild(panel);
        relatedGrid.hidden = false;
        ensureSectionZoomControl('trailsHubSection', 'relatedTrailsHeading');
      }

      function buildDetailRows(items){
        return items
          .filter(item => item && safeText(item.value).trim())
          .map(item => makeRow(item.label, safeText(item.value).trim()));
      }

      function setPanelReaderScale(scale){
        const content = document.getElementById('panelReaderContent');
        if(!content) return;
        const normalized = ['5', '6', '8'].includes(String(scale)) ? String(scale) : '6';
        content.style.setProperty('--reader-scale-factor', normalized);
      }

      function closePanelReader(){
        const modal = document.getElementById('panelReaderModal');
        if(!modal) return;
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        const content = document.getElementById('panelReaderContent');
        if(content){
          content.innerHTML = '';
        }
        if(panelReaderTrigger && typeof panelReaderTrigger.focus === 'function'){
          panelReaderTrigger.focus();
        }
        panelReaderTrigger = null;
      }

      function openPanelReader(sourceElement, titleText, trigger = null){
        const modal = document.getElementById('panelReaderModal');
        const title = document.getElementById('panelReaderTitle');
        const content = document.getElementById('panelReaderContent');
        const scaleSelect = document.getElementById('panelReaderScale');
        if(!modal || !title || !content || !sourceElement){
          return;
        }

        panelReaderTrigger = trigger || document.activeElement;
        title.textContent = titleText || translateWithFallback('peak.reader.title', 'Panel reader');
        content.innerHTML = '';
        const clone = sourceElement.cloneNode(true);
        clone.querySelectorAll('.panel-zoom-btn, .panel-expand-btn, .experience-note-expand, .meta-toggle, #panelReaderModal').forEach((node) => node.remove());
        content.appendChild(clone);

        const selectedScale = scaleSelect ? scaleSelect.value : '6';
        setPanelReaderScale(selectedScale);
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        const closeBtn = document.getElementById('panelReaderClose');
        if(closeBtn){
          closeBtn.focus();
        }
      }

      function ensureSectionZoomControl(sectionId, headingId){
        const section = document.getElementById(sectionId);
        const heading = document.getElementById(headingId);
        if(!section || !heading) return;

        let wrapper = heading.parentElement;
        if(!wrapper || !wrapper.classList.contains('section-title-wrap')){
          wrapper = document.createElement('div');
          wrapper.className = 'section-title-wrap';
          heading.parentNode.insertBefore(wrapper, heading);
          wrapper.appendChild(heading);
        }

        let btn = wrapper.querySelector('.panel-zoom-btn');
        if(!btn){
          btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'panel-zoom-btn';
          btn.setAttribute('aria-label', translateWithFallback('peak.reader.openPanel', 'Open panel reader'));
          btn.title = translateWithFallback('peak.reader.openPanel', 'Open panel reader');
          btn.innerHTML = '<span class="iconify" data-icon="mdi:magnify-plus-outline" aria-hidden="true"></span>';
          btn.addEventListener('click', () => openPanelReader(section, heading.textContent, btn));
          wrapper.appendChild(btn);
        }
      }

      function initPanelReader(){
        const modal = document.getElementById('panelReaderModal');
        const closeBtn = document.getElementById('panelReaderClose');
        const scaleSelect = document.getElementById('panelReaderScale');
        const title = document.getElementById('panelReaderTitle');
        const scaleLabel = document.getElementById('panelReaderScaleLabel');
        if(!modal) return;
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');

        if(title){
          title.textContent = translateWithFallback('peak.reader.title', 'Panel reader');
        }
        if(scaleLabel){
          scaleLabel.textContent = translateWithFallback('peak.reader.scale', 'Scale');
        }
        if(closeBtn){
          closeBtn.setAttribute('aria-label', translateWithFallback('peak.reader.close', 'Close panel reader'));
          closeBtn.setAttribute('title', translateWithFallback('peak.reader.close', 'Close panel reader'));
        }
        if(closeBtn){
          closeBtn.addEventListener('click', closePanelReader);
        }
        if(scaleSelect){
          scaleSelect.value = '6';
          setPanelReaderScale('6');
          scaleSelect.addEventListener('change', () => {
            setPanelReaderScale(scaleSelect.value);
          });
        }
        modal.addEventListener('click', (event) => {
          if(event.target === modal){
            closePanelReader();
          }
        });
        document.addEventListener('keydown', (event) => {
          if(modal.hidden){
            return;
          }
          if(event.key === 'Escape'){
            closePanelReader();
            return;
          }
          if(event.key === 'Tab'){
            const focusable = Array.from(
              modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
            ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
            if(!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if(event.shiftKey && document.activeElement === first){
              event.preventDefault();
              last.focus();
            }else if(!event.shiftKey && document.activeElement === last){
              event.preventDefault();
              first.focus();
            }
          }
        });
      }

      function updateDirectionsButton(viewModel){
        const btn = document.getElementById('getDirectionsBtn');
        if(!btn) return;
        const langCode = getSeoLang();
        const label = translateWithFallback('peak.directions.label', langCode === 'fr' ? "Obtenir l'itineraire" : 'Get directions');
        const unavailable = translateWithFallback(
          'peak.directions.unavailable',
          langCode === 'fr' ? 'Emplacement de stationnement indisponible' : 'Parking location unavailable'
        );
        const hasDirections = !!(viewModel && viewModel.directionsUrl);
        if(hasDirections){
          btn.setAttribute('href', viewModel.directionsUrl);
          btn.setAttribute('target', '_blank');
          btn.setAttribute('rel', 'noopener');
          btn.classList.remove('is-disabled');
          btn.setAttribute('aria-disabled', 'false');
          btn.removeAttribute('tabindex');
          btn.setAttribute('title', label);
        }else{
          btn.setAttribute('href', '#');
          btn.removeAttribute('target');
          btn.removeAttribute('rel');
          btn.classList.add('is-disabled');
          btn.setAttribute('aria-disabled', 'true');
          btn.setAttribute('tabindex', '-1');
          btn.setAttribute('title', unavailable);
        }
        btn.setAttribute('aria-label', label);
        const sr = btn.querySelector('.sr-only');
        if(sr){
          sr.textContent = hasDirections ? label : unavailable;
        }
        btn.onclick = (event) => {
          if(btn.getAttribute('aria-disabled') === 'true'){
            event.preventDefault();
          }
        };
      }

      function renderParkingAndAccess(viewModel){
        const section = document.getElementById('parkingAccessPanel');
        const grid = document.getElementById('parkingAccessGrid');
        const heading = document.getElementById('parkingAccessHeading');
        if(!section || !grid || !heading) return;
        const langCode = getSeoLang();
        heading.textContent = langCode === 'fr' ? 'Stationnement et accÃƒÂ¨s' : 'Parking & Access';
        grid.innerHTML = '';

        const parking = viewModel && viewModel.parking;
        const peak = viewModel && viewModel.peak;
        if(!parking && !peak){
          section.hidden = true;
          return;
        }

        const panel = document.createElement('article');
        panel.className = 'info-panel detail-panel';
        const title = document.createElement('div');
        title.className = 'info-label';
        title.textContent = safeText(parking && parking.trailheadName)
          || safeText(peak && peak['Most Common Trailhead'])
          || (langCode === 'fr' ? 'Informations de stationnement' : 'Parking details');
        panel.appendChild(title);

        const rowsWrap = document.createElement('div');
        rowsWrap.className = 'metadata-primary';
        buildDetailRows([
          {
            label: langCode === 'fr' ? 'Stationnement' : 'Trailhead parking',
            value: (parking && parking.notes) || (peak && peak['Parking Notes'])
          },
          {
            label: langCode === 'fr' ? 'CapacitÃƒÂ©' : 'Capacity',
            value: Number.isFinite(Number(parking && parking.capacity))
              ? `${Number(parking.capacity)} ${safeText(parking.capacityUnits) || 'vehicles'}${parking.capacityIsEstimate ? ' (est.)' : ''}`
              : ''
          },
          {
            label: langCode === 'fr' ? 'Habituellement complet vers' : 'Typically full by',
            value: safeText(parking && parking.fullBy)
          },
          {
            label: langCode === 'fr' ? 'VÃƒÂ©rifiÃƒÂ© le' : 'Last verified',
            value: safeText(parking && parking.lastVerified)
          }
        ]).forEach((row) => rowsWrap.appendChild(row));
        panel.appendChild(rowsWrap);

        const cta = document.createElement('div');
        cta.className = 'detail-panel-cta';
        if(viewModel && viewModel.directionsUrl){
          cta.innerHTML = `<a class="primary-link-btn" href="${escapeHtml(viewModel.directionsUrl)}" target="_blank" rel="noopener">${escapeHtml(langCode === 'fr' ? "Obtenir l'itineraire (Google Maps)" : 'Get Directions (Google Maps)')}</a>`;
        }else{
          cta.innerHTML = `<span class="primary-link-btn is-disabled" aria-disabled="true">${escapeHtml(translateWithFallback('peak.directions.unavailable', langCode === 'fr' ? 'Emplacement de stationnement indisponible' : 'Parking location unavailable'))}</span>`;
        }
        panel.appendChild(cta);

        grid.appendChild(panel);
        section.hidden = false;
        ensureSectionZoomControl('parkingAccessPanel', 'parkingAccessHeading');
      }

      function renderDifficultyMetrics(viewModel){
        const section = document.getElementById('difficultyMetricsPanel');
        const grid = document.getElementById('difficultyMetricsGrid');
        const heading = document.getElementById('difficultyMetricsHeading');
        if(!section || !grid || !heading) return;
        const langCode = getSeoLang();
        heading.textContent = langCode === 'fr' ? 'Mesures de difficultÃƒÂ©' : 'Difficulty Metrics';
        grid.innerHTML = '';

        const difficulty = viewModel && viewModel.difficulty;
        const peak = viewModel && viewModel.peak;
        const rows = buildDetailRows([
          {
            label: langCode === 'fr' ? 'DifficultÃƒÂ© technique (1-10)' : 'Technical difficulty (1-10)',
            value: Number.isFinite(Number(difficulty && difficulty.technicalDifficulty))
              ? String(difficulty.technicalDifficulty)
              : ''
          },
          {
            label: langCode === 'fr' ? 'Effort physique (1-10)' : 'Physical effort (1-10)',
            value: Number.isFinite(Number(difficulty && difficulty.physicalEffort))
              ? String(difficulty.physicalEffort)
              : ''
          },
          {
            label: langCode === 'fr' ? 'Niveau de difficultÃƒÂ©' : 'Difficulty class',
            value: translateDifficulty(peak && peak['Difficulty'])
          },
          {
            label: langCode === 'fr' ? 'Temps typique' : 'Typical completion time',
            value: safeText(peak && peak['Typical Completion Time'])
          }
        ]);
        if(!rows.length){
          section.hidden = true;
          return;
        }
        const panel = document.createElement('article');
        panel.className = 'info-panel detail-panel';
        rows.forEach((row) => panel.appendChild(row));
        grid.appendChild(panel);
        section.hidden = false;
        ensureSectionZoomControl('difficultyMetricsPanel', 'difficultyMetricsHeading');
      }

      function renderRiskAndPreparation(viewModel){
        const section = document.getElementById('riskPrepPanel');
        const grid = document.getElementById('riskPrepGrid');
        const heading = document.getElementById('riskPrepHeading');
        if(!section || !grid || !heading) return;
        const langCode = getSeoLang();
        heading.textContent = langCode === 'fr' ? 'Risque et prÃƒÂ©paration' : 'Risk & Preparation';
        grid.innerHTML = '';

        const risk = viewModel && viewModel.risk;
        const advisories = viewModel && Array.isArray(viewModel.advisories) ? viewModel.advisories : [];
        const peak = viewModel && viewModel.peak;
        const factorList = Array.isArray(risk && risk.risk_factors) ? risk.risk_factors : [];
        const rows = buildDetailRows([
          {
            label: langCode === 'fr' ? 'Facteurs de risque' : 'Risk factors',
            value: factorList.length ? factorList.join(', ') : ''
          },
          {
            label: langCode === 'fr' ? 'Notes de prÃƒÂ©paration' : 'Preparation notes',
            value: safeText(risk && risk.prep_notes)
          },
          {
            label: langCode === 'fr' ? 'Distance de repli' : 'Bailout distance',
            value: Number.isFinite(Number(risk && risk.bailout_distance_mi))
              ? `${Number(risk.bailout_distance_mi)} mi`
              : safeText(peak && peak['Emergency Bailout Options'])
          },
          {
            label: langCode === 'fr' ? 'Exposition mÃƒÂ©tÃƒÂ©o' : 'Weather exposure',
            value: translateExposure((peak && peak['Weather Exposure Rating']) || '')
          },
          {
            label: langCode === 'fr' ? 'Avis en direct' : 'Live advisory',
            value: advisories.length ? safeText(advisories[0].description || advisories[0].title) : ''
          }
        ]);
        if(!rows.length){
          section.hidden = true;
          return;
        }
        const panel = document.createElement('article');
        panel.className = 'info-panel detail-panel';
        rows.forEach((row) => panel.appendChild(row));
        grid.appendChild(panel);
        section.hidden = false;
        ensureSectionZoomControl('riskPrepPanel', 'riskPrepHeading');
      }

      function renderWildernessSafety(viewModel){
        const section = document.getElementById('wildernessSafetyPanel');
        const grid = document.getElementById('wildernessSafetyGrid');
        const heading = document.getElementById('wildernessSafetyHeading');
        if(!section || !grid || !heading) return;
        const langCode = getSeoLang();
        const fallbackText = langCode === 'fr' ? 'Donnees a confirmer pour cet itineraire.' : 'Data TBD for this route.';
        heading.textContent = langCode === 'fr' ? 'Securite en milieu sauvage' : 'Wilderness Safety';
        grid.innerHTML = '';

        const peak = viewModel && viewModel.peak ? viewModel.peak : {};
        const safetyPanel = document.createElement('article');
        safetyPanel.className = 'info-panel detail-panel';

        const valueOrFallback = (value) => {
          const text = safeText(value).trim();
          return text || fallbackText;
        };

        safetyPanel.appendChild(makeRow(
          langCode === 'fr' ? 'Disponibilite en eau' : 'Water availability',
          valueOrFallback(peak['Water Availability'])
        ));
        safetyPanel.appendChild(makeRow(
          langCode === 'fr' ? 'Reseau cellulaire' : 'Cell reception',
          valueOrFallback(peak['Cell Reception Quality'])
        ));
        safetyPanel.appendChild(makeRow(
          langCode === 'fr' ? 'Meilleures saisons' : 'Best seasons',
          valueOrFallback(peak['Best Seasons to Hike'])
        ));

        grid.appendChild(safetyPanel);
        section.hidden = false;
        ensureSectionZoomControl('wildernessSafetyPanel', 'wildernessSafetyHeading');
      }

      function getPeakMapElements(){
        return {
          panel: document.getElementById('peakMapPanel'),
          map: document.getElementById('peakMap'),
          status: document.getElementById('peakMapStatus'),
          title: document.getElementById('peakMapTitle'),
          subtitle: document.getElementById('peakMapSubtitle'),
          cta: document.getElementById('peakMapCta')
        };
      }

      function updatePeakMapStatus(message, show = true){
        const { status } = getPeakMapElements();
        if(!status) return;
        status.textContent = message;
        status.style.display = show ? 'block' : 'none';
      }

      function getPeakMapBounds(coords){
        const latDelta = MAP_RADIUS_MILES / 69;
        const lonDivisor = Math.max(Math.cos(coords.lat * Math.PI / 180), 0.2);
        const lonDelta = MAP_RADIUS_MILES / (69 * lonDivisor);
        return {
          south: coords.lat - latDelta,
          west: coords.lon - lonDelta,
          north: coords.lat + latDelta,
          east: coords.lon + lonDelta
        };
      }

      function ensureLeafletReady(){
        if(window.L) return Promise.resolve(true);
        return new Promise(resolve => {
          const start = performance.now();
          const check = () => {
            if(window.L){
              resolve(true);
              return;
            }
            if(performance.now() - start > 4000){
              resolve(false);
              return;
            }
            requestAnimationFrame(check);
          };
          check();
        });
      }

      async function fetchTrailData(){
        if(peakMapTrailDataPromise) return peakMapTrailDataPromise;
        peakMapTrailDataPromise = (async () => {
          for(const url of TRAIL_API_URLS){
            try{
              const res = await fetch(url, { mode: 'cors' });
              if(!res.ok) continue;
              const text = await res.text();
              const cleaned = text.replace(/^\uFEFF/, '');
              const data = JSON.parse(cleaned);
              if(Array.isArray(data)){
                trackEvent('peak_map_trails_loaded', { source: url, count: data.length });
                return data;
              }
            }catch(err){
              console.warn('Trail data fetch failed', url, err);
            }
          }
          trackEvent('peak_map_trails_failed');
          return [];
        })();
        return peakMapTrailDataPromise;
      }

      function normalizeTrailName(value){
        return String(value || '')
          .toLowerCase()
          .replace(/[()]/g, ' ')
          .replace(/[^\w\s'-]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      function buildTrailNameCandidates(routes, trailNames){
        const related = extractRelatedTrailNames(routes);
        const manual = Array.isArray(trailNames) ? trailNames : [];
        const combined = [...related, ...manual]
          .map(name => String(name || '').trim())
          .filter(Boolean);

        const suffixes = ['trail', 'loop', 'cutoff', 'road', 'path', 'connector', 'summit', 'route'];
        const candidates = new Set();
        combined.forEach(name => {
          const normalized = normalizeTrailName(name);
          if(normalized) candidates.add(normalized);
          const withoutSuffix = normalized.replace(new RegExp(`\\b(${suffixes.join('|')})\\b`, 'gi'), '').trim();
          if(withoutSuffix) candidates.add(withoutSuffix);
        });
        return candidates;
      }

      function trailWithinBounds(trail, bounds){
        if(trail && trail.bounds){
          return !(
            trail.bounds.maxlat < bounds.south ||
            trail.bounds.minlat > bounds.north ||
            trail.bounds.maxlon < bounds.west ||
            trail.bounds.minlon > bounds.east
          );
        }
        if(!Array.isArray(trail.geometry)) return false;
        return trail.geometry.some(point => point.lat >= bounds.south && point.lat <= bounds.north &&
          point.lon >= bounds.west && point.lon <= bounds.east);
      }

      function setMapJsonLd(name, canonicalUrl, coords, bounds){
        const mapSchema = {
          '@context': 'https://schema.org',
          '@type': 'Map',
          name: `Topographic trail map for ${name}`,
          description: `Interactive map showing White Mountain National Forest trails near ${name}.`,
          url: `${canonicalUrl}#peak-trail-map`,
          isPartOf: {
            '@type': 'WebPage',
            '@id': canonicalUrl
          },
          about: {
            '@type': 'Mountain',
            name,
            url: canonicalUrl
          },
          spatialCoverage: {
            '@type': 'Place',
            geo: {
              '@type': 'GeoShape',
              box: `${bounds.south} ${bounds.west} ${bounds.north} ${bounds.east}`
            }
          },
          contentLocation: {
            '@type': 'Place',
            geo: {
              '@type': 'GeoCoordinates',
              latitude: coords.lat,
              longitude: coords.lon
            }
          }
        };

        const ld = document.getElementById('mapJsonLd');
        if(ld){
          ld.textContent = JSON.stringify(mapSchema);
        }
      }

      async function renderPeakMap(peak, name, canonicalUrl){
        const { panel, map, title, subtitle, cta } = getPeakMapElements();
        if(!panel || !map) return;

        const coords = parseCoordinates(peak['Coordinates']);
        if(!coords){
          panel.hidden = true;
          return;
        }

        panel.hidden = false;
        map.id = 'peakMap';
        map.setAttribute('aria-label', `Topographic map near ${name}`);
        if(title) title.textContent = `${name} trail map`;
        if(subtitle) subtitle.textContent = 'OpenStreetMap topo tiles with WMNF trail geometry.';

        const trailNames = peak['Trail Names'] || [];
        const trailLinkName = Array.isArray(trailNames) && trailNames.length ? trailNames[0] : null;
        if(cta){
          cta.textContent = 'White Mountain Trails Ã¢â€ â€™';
          cta.href = trailLinkName ? `https://nh48.info/trails?trail=${encodeURIComponent(trailLinkName)}` : 'https://nh48.info/trails';
          cta.setAttribute('aria-label', 'Explore White Mountain Trails');
        }

        updatePeakMapStatus('Loading trail mapÃ¢â‚¬Â¦', true);

        const leafletReady = await ensureLeafletReady();
        if(!leafletReady){
          updatePeakMapStatus('Map tiles are unavailable right now.', true);
          return;
        }

        const bounds = getPeakMapBounds(coords);
        peakMapBounds = bounds;
        const latLngBounds = L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]);

        if(!peakMap){
          peakMap = L.map(map, { zoomControl: true, scrollWheelZoom: false });
          const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors &amp; OpenTopoMap (CC-BY-SA)'
          });
          const fallbackLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          });
          topoLayer.on('tileerror', () => {
            if(!peakMap.hasLayer(fallbackLayer)){
              fallbackLayer.addTo(peakMap);
            }
          });
          topoLayer.addTo(peakMap);
          peakMapTrailsLayer = L.layerGroup().addTo(peakMap);
        }else if(peakMapTrailsLayer){
          peakMapTrailsLayer.clearLayers();
        }else{
          peakMapTrailsLayer = L.layerGroup().addTo(peakMap);
        }

        peakMap.fitBounds(latLngBounds, { padding: [12, 12] });
        peakMap.setMaxBounds(latLngBounds.pad(0.05));
        peakMap.setMinZoom(peakMap.getBoundsZoom(latLngBounds));
        requestAnimationFrame(() => peakMap.invalidateSize());

        if(peakMapMarker){
          peakMapMarker.setLatLng([coords.lat, coords.lon]);
        }else{
          peakMapMarker = L.circleMarker([coords.lat, coords.lon], {
            radius: 6,
            color: '#22c55e',
            fillColor: '#22c55e',
            fillOpacity: 0.9,
            weight: 2
          }).addTo(peakMap);
        }

        if(peakMapLabel){
          peakMapLabel.setLatLng([coords.lat, coords.lon]);
          peakMapLabel.setTooltipContent(escapeHtml(name));
        }else{
          peakMapLabel = L.marker([coords.lat, coords.lon], {
            opacity: 0,
            interactive: true
          }).addTo(peakMap);
          peakMapLabel.bindTooltip(escapeHtml(name), {
            permanent: true,
            direction: 'top',
            className: 'peak-map-tooltip',
            offset: [0, -12]
          });
        }

        const trailData = await fetchTrailData();
        const candidates = buildTrailNameCandidates(peak['Standard Routes'] || [], trailNames);
        const matched = trailData.filter(trail => {
          const normalized = normalizeTrailName(trail.name || trail.trail_name || '');
          if(!normalized) return false;
          if(candidates.has(normalized)) return true;
          for(const candidate of candidates){
            if(candidate && normalized.includes(candidate)) return true;
          }
          return false;
        });

        const trailsToRender = matched.length
          ? matched
          : trailData.filter(trail => trailWithinBounds(trail, bounds));

        trailsToRender.forEach(trail => {
          if(!Array.isArray(trail.geometry) || trail.geometry.length < 2) return;
          const latLngs = trail.geometry.map(point => [point.lat, point.lon]);
          const line = L.polyline(latLngs, {
            color: '#60a5fa',
            weight: 3,
            opacity: 0.9
          });
          line.addTo(peakMapTrailsLayer);
          if(trail.name){
            line.bindTooltip(escapeHtml(trail.name), { sticky: true, direction: 'top' });
          }
        });

        if(!trailsToRender.length){
          updatePeakMapStatus('No WMNF trail geometry found in this area yet.', true);
        }else{
          updatePeakMapStatus('', false);
        }

        setMapJsonLd(name, canonicalUrl, coords, bounds);
        trackEvent('peak_map_rendered', { slug: currentSlug, trails: trailsToRender.length });
      }

      const socialSharePlatforms = [
        {
          name: 'Facebook',
          category: 'major',
          buildUrl: share => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(share.url)}`
        },
        {
          name: 'X',
          category: 'major',
          buildUrl: share => `https://twitter.com/intent/tweet?url=${encodeURIComponent(share.url)}&text=${encodeURIComponent(share.text)}`
        },
        {
          name: 'LinkedIn',
          category: 'major',
          buildUrl: share => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(share.url)}`
        },
        {
          name: 'Reddit',
          category: 'major',
          buildUrl: share => `https://www.reddit.com/submit?url=${encodeURIComponent(share.url)}&title=${encodeURIComponent(share.text)}`
        },
        {
          name: 'Email',
          category: 'major',
          buildUrl: share => `mailto:?subject=${encodeURIComponent(share.text)}&body=${encodeURIComponent(share.url)}`
        },
        {
          name: 'WhatsApp',
          category: 'major',
          buildUrl: share => `https://wa.me/?text=${encodeURIComponent(`${share.text} ${share.url}`)}`
        },
        {
          name: 'Bluesky',
          category: 'major',
          buildUrl: share => `https://bsky.app/intent/compose?text=${encodeURIComponent(`${share.text} ${share.url}`)}`
        },
        {
          name: 'Threads',
          category: 'major',
          buildUrl: share => `https://www.threads.net/intent/post?text=${encodeURIComponent(`${share.text} ${share.url}`)}`
        },
        {
          name: 'Telegram',
          category: 'international',
          buildUrl: share => `https://t.me/share/url?url=${encodeURIComponent(share.url)}&text=${encodeURIComponent(share.text)}`
        },
        {
          name: 'Weibo',
          category: 'international',
          buildUrl: share => `https://service.weibo.com/share/share.php?url=${encodeURIComponent(share.url)}&title=${encodeURIComponent(share.text)}`
        },
        {
          name: 'VK',
          category: 'international',
          buildUrl: share => `https://vk.com/share.php?url=${encodeURIComponent(share.url)}`
        },
        {
          name: 'Line',
          category: 'international',
          buildUrl: share => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(share.url)}`
        },
        {
          name: 'KakaoTalk',
          category: 'international',
          buildUrl: share => `https://story.kakao.com/share?url=${encodeURIComponent(share.url)}`
        },
        {
          name: 'Mastodon',
          category: 'international',
          buildUrl: share => `https://mastodon.social/share?text=${encodeURIComponent(`${share.text} ${share.url}`)}`
        },
        {
          name: 'Pocket',
          category: 'international',
          buildUrl: share => `https://getpocket.com/edit?url=${encodeURIComponent(share.url)}&title=${encodeURIComponent(share.text)}`
        },
        {
          name: 'Tumblr',
          category: 'international',
          buildUrl: share => `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodeURIComponent(share.url)}&title=${encodeURIComponent(share.text)}`
        },
        {
          name: 'Pinterest',
          category: 'international',
          buildUrl: share => `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(share.url)}&description=${encodeURIComponent(share.text)}`
        },
        {
          name: 'SMS',
          category: 'international',
          buildUrl: share => `sms:?&body=${encodeURIComponent(`${share.text} ${share.url}`)}`
        }
      ];

      let socialCardReadyPromise = Promise.resolve();
      let socialCardPayload = null;

      function getSocialCardElements(){
        return {
          modal: document.getElementById('socialCardModal'),
          container: document.getElementById('socialCardContainer'),
          name: document.getElementById('socialCardPeakName'),
          prominence: document.getElementById('socialCardProminence'),
          range: document.getElementById('socialCardRange'),
          elevation: document.getElementById('socialCardElevation'),
          units: document.getElementById('socialCardUnits'),
          promo: document.getElementById('socialCardPromo'),
          buttons: Array.from(document.querySelectorAll('.social-card-toggle-btn')),
          shareButtons: document.getElementById('socialShareButtons'),
          downloadButton: document.getElementById('downloadSocialCard'),
          closeButton: document.getElementById('closeSocialCard')
        };
      }

      function getSocialCardHeroImage(peak){
        const photos = Array.isArray(peak.photos) ? peak.photos : [];
        let candidate = null;
        if(photos.length > 1){
          const photo = photos[1];
          candidate = typeof photo === 'string' ? photo : photo && photo.url;
        }
        if(!candidate && photos.length > 0){
          const photo = photos[0];
          candidate = typeof photo === 'string' ? photo : photo && photo.url;
        }
        return candidate ? normalizePhotoUrl(candidate) : null;
      }

      function buildShareButtons(share){
        const elements = getSocialCardElements();
        if(!elements.shareButtons) return;
        const majorContainer = elements.shareButtons.querySelector('.major-networks');
        const internationalContainer = elements.shareButtons.querySelector('.international-networks');
        if(!majorContainer || !internationalContainer) return;
        majorContainer.innerHTML = '';
        internationalContainer.innerHTML = '';

        socialSharePlatforms.forEach(platform => {
          const link = document.createElement('a');
          link.className = `share-button ${platform.category}`;
          link.href = platform.buildUrl(share);
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = platform.name;
          link.setAttribute('aria-label', `Share peak on ${platform.name}`);
          if(platform.category === 'major'){
            majorContainer.appendChild(link);
          }else{
            internationalContainer.appendChild(link);
          }
        });
      }

      function updateSocialCardContent(peak, name, canonicalUrl){
        const elements = getSocialCardElements();
        if(!elements.container || !peak) return;
        const prominence = formatFeetValue(peak['Prominence (ft)']);
        const elevation = formatFeetValue(peak['Elevation (ft)']);
        const range = safeText(peak['Range / Subrange']) || 'Ã¢â‚¬â€';
        const imageUrl = getSocialCardHeroImage(peak) || getPlaceholder();
        elements.container.style.backgroundImage = `url("${imageUrl}")`;
        elements.name.textContent = name;
        elements.prominence.textContent = `${t('peak.generalInfo.prominence')}: ${prominence}`;
        elements.range.textContent = `${t('peak.generalInfo.range')}: ${range}`;
        elements.elevation.textContent = `${t('peak.generalInfo.elevation')}: ${elevation}`;
        elements.units.textContent = `${t('common.unitsLabel')}: ${currentUnits === UNITS.METERS ? t('common.unitsMeters') : t('common.unitsFeet')}`;
        if(elements.promo){
          elements.promo.textContent = `See detailed info & pictures on this NH48 peak at nh48.info/peak/${socialCardPayload && socialCardPayload.slug ? socialCardPayload.slug : ''}`;
        }

        socialCardReadyPromise = new Promise(resolve => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = imageUrl;
          if(img.complete) resolve();
        });

        buildShareButtons({
          url: canonicalUrl,
          text: `${name} Ã¢â‚¬â€ NH48 peak details`
        });
      }

      function updateSocialCardOrientation(orientation){
        const elements = getSocialCardElements();
        if(!elements.container) return;
        elements.container.classList.toggle('landscape', orientation === 'landscape');
        elements.container.classList.toggle('portrait', orientation === 'portrait');
        elements.buttons.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.orientation === orientation);
        });
      }

      function openSocialCardModal(){
        const elements = getSocialCardElements();
        if(!elements.modal || !socialCardPayload) return;
        elements.modal.hidden = false;
        updateSocialCardOrientation('landscape');
        updateSocialCardContent(socialCardPayload.peak, socialCardPayload.name, socialCardPayload.canonicalUrl);
      }

      function closeSocialCardModal(){
        const elements = getSocialCardElements();
        if(elements.modal){
          elements.modal.hidden = true;
        }
      }

      async function downloadSocialCard(){
        const elements = getSocialCardElements();
        if(!window.htmlToImage || !elements.container || !socialCardPayload) return;
        const orientation = elements.container.classList.contains('portrait') ? 'portrait' : 'landscape';
        const fileOrientation = orientation === 'portrait' ? 'vertical' : 'horizontal';
        const fileName = `${socialCardPayload.slug}-social-${fileOrientation}.png`;
        const blob = await window.htmlToImage.toBlob(elements.container, { cacheBust: true });
        if(!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        if(window.NH48_SOCIAL_UPLOAD_URL && window.NH48_SOCIAL_UPLOAD_TOKEN){
          const formData = new FormData();
          formData.append('file', blob, fileName);
          formData.append('slug', socialCardPayload.slug);
          formData.append('orientation', fileOrientation);
          try{
            await fetch(window.NH48_SOCIAL_UPLOAD_URL, {
              method: 'POST',
              headers: { Authorization: `Bearer ${window.NH48_SOCIAL_UPLOAD_TOKEN}` },
              body: formData
            });
          }catch(err){
            console.warn('Social card upload failed.', err);
          }
        }
      }

      function initPeakSocialCardHandlers(peak, name, canonicalUrl, slug){
        const elements = getSocialCardElements();
        if(!elements.modal) return;
        socialCardPayload = { peak, name, canonicalUrl, slug };
        updateSocialCardContent(peak, name, canonicalUrl);

        const shareBtn = document.getElementById('shareBtn');
        if(shareBtn){
          shareBtn.addEventListener('click', openSocialCardModal);
        }
        if(elements.closeButton){
          elements.closeButton.addEventListener('click', closeSocialCardModal);
        }
        elements.modal.addEventListener('click', event => {
          if(event.target === elements.modal){
            closeSocialCardModal();
          }
        });
        elements.buttons.forEach(button => {
          button.addEventListener('click', () => {
            updateSocialCardOrientation(button.dataset.orientation);
          });
        });
        if(elements.downloadButton){
          elements.downloadButton.addEventListener('click', downloadSocialCard);
        }
        window.NH48_PEAK_SOCIAL = {
          openModal: openSocialCardModal,
          closeModal: closeSocialCardModal,
          setOrientation: updateSocialCardOrientation,
          waitForReady: () => socialCardReadyPromise || Promise.resolve(),
          getCardElement: () => elements.container
        };
      }

      function renderTerrain(p){
        const terrainGrid = document.getElementById('terrainGrid');
        const heading = document.getElementById('terrainHeading');
        if(!terrainGrid) return;
        terrainGrid.innerHTML = '';
        if(heading){
          heading.textContent = getSeoLang() === 'fr' ? 'Terrain et caractere du sommet' : 'Terrain & Summit Character';
        }
        const terrainItems = [
          { label: t('peak.terrain.terrain'), value: p['Terrain Character'] },
          { label: t('peak.terrain.scramble'), value: p['Scramble Sections'] },
          { label: t('peak.terrain.view'), value: p['View Type'] },
          { label: getSeoLang() === 'fr' ? 'Marqueur de sommet' : 'Summit marker', value: p['Summit Marker Type'] },
          { label: getSeoLang() === 'fr' ? 'Flore / zone' : 'Flora / environment', value: p['Flora/Environment Zones'] },
          { label: getSeoLang() === 'fr' ? 'Connexions 4 000 pieds' : 'Nearby 4,000-footer connections', value: p['Nearby 4000-footer Connections'] }
        ].filter(x => x.value);

        if(terrainItems.length === 0){
          terrainGrid.hidden = true;
          return;
        }
        terrainItems.forEach(item => {
          const div = document.createElement('div');
          div.className = 'info-panel';
          div.innerHTML = `
            <div class="info-label">${item.label}</div>
            <div class="info-value">${item.value}</div>`;
          terrainGrid.appendChild(div);
        });
        terrainGrid.hidden = false;
        ensureSectionZoomControl('terrainPanel', 'terrainHeading');
        trackEvent('peak_terrain_rendered', { slug: currentSlug, count: terrainItems.length });
      }

      function renderConditions(p){
        const conditionsGrid = document.getElementById('conditionsGrid');
        const heading = document.getElementById('conditionsHeading');
        if(!conditionsGrid) return;
        conditionsGrid.innerHTML = '';
        if(heading){
          heading.textContent = getSeoLang() === 'fr' ? 'Conditions et exposition' : 'Conditions & Exposure';
        }
        const conditionItems = [
          { label: t('peak.conditions.bestSeasons'), value: p['Best Seasons to Hike'] },
          { label: t('peak.conditions.waterAvailability'), value: p['Water Availability'] },
          { label: t('peak.conditions.cellReception'), value: p['Cell Reception Quality'] },
          { label: t('peak.conditions.weatherExposure'), value: translateExposure(p['Weather Exposure Rating']) },
          { label: t('peak.conditions.emergencyBailout'), value: p['Emergency Bailout Options'] },
          { label: t('peak.conditions.dogFriendly'), value: p['Dog Friendly'] },
          { label: t('peak.conditions.nearbyFeatures'), value: p['Nearby Notable Features'] }
        ].filter(x => x.value);

        if(conditionItems.length === 0){
          conditionsGrid.hidden = true;
          return;
        }
        conditionItems.forEach(item => {
          const div = document.createElement('div');
          div.className = 'info-panel';
          div.innerHTML = `
            <div class="info-label">${item.label}</div>
            <div class="info-value">${item.value}</div>`;
          conditionsGrid.appendChild(div);
        });
        conditionsGrid.hidden = false;
        ensureSectionZoomControl('conditionsPanel', 'conditionsHeading');
        trackEvent('peak_conditions_rendered', { slug: currentSlug, count: conditionItems.length });
      }

      function renderMonthlyWeatherPanel(){
        const section = document.getElementById('monthlyWeatherPanel');
        const heading = document.getElementById('monthlyWeatherHeading');
        const monthLabel = document.getElementById('monthlyWeatherMonthLabel');
        const select = document.getElementById('monthlyWeatherMonthSelect');
        const metrics = document.getElementById('monthlyWeatherMetrics');
        const disclaimer = document.getElementById('monthlyWeatherDisclaimer');
        if(!section || !heading || !select || !metrics || !monthLabel || !disclaimer){
          return;
        }

        const langCode = getSeoLang();
        heading.textContent = translateWithFallback('peak.weather.heading', langCode === 'fr' ? 'Moyennes meteo mensuelles' : 'Monthly Weather Averages');
        monthLabel.textContent = translateWithFallback('peak.weather.monthLabel', langCode === 'fr' ? 'Selectionner un mois' : 'Select month');
        disclaimer.textContent = translateWithFallback(
          'peak.weather.disclaimer',
          langCode === 'fr'
            ? 'Donnees climatologiques mensuelles. Les conditions reelles varient rapidement en altitude.'
            : 'Monthly climatology values. Real conditions change rapidly at elevation.'
        );

        const availableMonths = MONTH_NAMES.filter((month) => getMonthlyWeatherByMonth(month));
        if(!availableMonths.length){
          section.hidden = true;
          metrics.innerHTML = '';
          return;
        }

        if(!availableMonths.includes(selectedWeatherMonth)){
          selectedWeatherMonth = availableMonths[0];
        }

        select.innerHTML = '';
        availableMonths.forEach((month) => {
          const option = document.createElement('option');
          option.value = month;
          option.textContent = new Date(Date.UTC(2024, MONTH_NAMES.indexOf(month), 1)).toLocaleString(
            langCode === 'fr' ? 'fr-FR' : 'en-US',
            { month: 'long', timeZone: 'UTC' }
          );
          option.selected = month === selectedWeatherMonth;
          select.appendChild(option);
        });

        const monthWeather = getMonthlyWeatherByMonth(selectedWeatherMonth) || {};
        const windMph = Number(monthWeather.avgWindMph || 0);
        const gustMph = Number(monthWeather.avgWindGustMph || 0);
        const tempF = Number(monthWeather.avgTempF || 0);
        const windDisplay = currentUnits === UNITS.METERS ? `${Math.round(windMph * 1.60934)} km/h` : `${Math.round(windMph)} mph`;
        const gustDisplay = currentUnits === UNITS.METERS ? `${Math.round(gustMph * 1.60934)} km/h` : `${Math.round(gustMph)} mph`;
        const tempDisplay = currentUnits === UNITS.METERS ? `${Math.round((tempF - 32) * 5 / 9)} C` : `${Math.round(tempF)} F`;

        const metricList = [
          {
            label: translateWithFallback('peak.weather.avgWind', langCode === 'fr' ? 'Vent moyen' : 'Average wind'),
            value: windDisplay,
            progress: Math.max(6, Math.min(100, (Math.max(windMph, 0) / 70) * 100))
          },
          {
            label: translateWithFallback('peak.weather.avgGust', langCode === 'fr' ? 'Rafale moyenne' : 'Average gust'),
            value: gustDisplay,
            progress: Math.max(6, Math.min(100, (Math.max(gustMph, 0) / 100) * 100))
          },
          {
            label: translateWithFallback('peak.weather.avgTemp', langCode === 'fr' ? 'Temperature moyenne' : 'Average temperature'),
            value: tempDisplay,
            progress: Math.max(6, Math.min(100, ((tempF + 20) / 90) * 100))
          }
        ];

        metrics.innerHTML = metricList.map((metric) => `
          <article class="weather-metric">
            <div class="weather-metric-label">${escapeHtml(metric.label)}</div>
            <div class="weather-metric-value">${escapeHtml(metric.value)}</div>
            <div class="weather-metric-bar"><span style="width:${metric.progress}%;"></span></div>
          </article>
        `).join('');

        section.hidden = false;
        ensureSectionZoomControl('monthlyWeatherPanel', 'monthlyWeatherHeading');
      }

      function initMonthlyWeatherControls(){
        const select = document.getElementById('monthlyWeatherMonthSelect');
        if(!select || select.dataset.bound === 'true'){
          return;
        }
        select.dataset.bound = 'true';
        select.addEventListener('change', () => {
          selectedWeatherMonth = select.value;
          renderMonthlyWeatherPanel();
          trackEvent('peak_monthly_weather_change', {
            slug: currentSlug,
            month: selectedWeatherMonth
          });
        });
      }

      function updateHeadMeta(p, slug, name, primaryMeta){
        const elevation = p['Elevation (ft)'] || t('common.unknown');
        const prominence = p['Prominence (ft)'] || t('common.unknown');
        const range = p['Range / Subrange'] || 'White Mountains';
        const peakDescription = safeText(p.description || p['Description']).trim();

        const langCode = getSeoLang();
        const canonicalUrl = buildCanonicalUrl(slug, langCode);
        const generatedDescription = t('peak.meta.descriptionTemplate', { name, elevation, prominence, range });
        const enrichedMeta = primaryMeta ? enrichMetadata(primaryMeta, primaryMeta.iptc) : null;
        const metaDescription = enrichedMeta
          ? (safeText(enrichedMeta.description)
            || safeText(enrichedMeta.extendedDescription)
            || safeText(enrichedMeta.altText)
            || safeText(enrichedMeta.alt)
            || safeText(enrichedMeta.caption)).trim()
          : '';
        const descriptionText = peakDescription || metaDescription || generatedDescription;
        const titleText = `${name} Ã¢â‚¬â€ White Mountain National Forest`;

        const titleEl = document.getElementById('dynamicTitle');
        if(titleEl){
          titleEl.textContent = titleText;
        }
        const descriptionEl = document.getElementById('dynamicDescription');
        if(descriptionEl){
          descriptionEl.setAttribute('content', descriptionText);
        }
        const canonicalEl = document.getElementById('dynamicCanonical');
        if(canonicalEl){
          canonicalEl.setAttribute('href', canonicalUrl);
        }
        const ogTitleEl = document.getElementById('dynamicOgTitle');
        if(ogTitleEl){
          ogTitleEl.setAttribute('content', titleText);
        }
        const ogDescriptionEl = document.getElementById('dynamicOgDescription');
        if(ogDescriptionEl){
          ogDescriptionEl.setAttribute('content', descriptionText);
        }
        const ogUrlEl = document.getElementById('dynamicOgUrl');
        if(ogUrlEl){
          ogUrlEl.setAttribute('content', canonicalUrl);
        }
        const twitterTitleEl = document.getElementById('dynamicTwitterTitle');
        if(twitterTitleEl){
          twitterTitleEl.setAttribute('content', titleText);
        }
        const twitterDescriptionEl = document.getElementById('dynamicTwitterDescription');
        if(twitterDescriptionEl){
          twitterDescriptionEl.setAttribute('content', descriptionText);
        }
        const twitterUrlEl = document.querySelector('meta[name=\"twitter:url\"]');
        if(twitterUrlEl){
          twitterUrlEl.setAttribute('content', canonicalUrl);
        }
        setMeta('keywords', `NH48 API, ${name} peak details, New Hampshire 4000 footers, White Mountains routes, hiking data, peak metadata, mountain photos`);
        setMeta('author', (enrichedMeta && enrichedMeta.creator) || 'Nathan Sobol');
        setMetaProperty('article:author', 'https://nh48.info');
        setMetaProperty('og:site_name', 'NH48pics');
        setMetaProperty(
          'og:copyright',
          (enrichedMeta && enrichedMeta.copyrightNotice) || 'Ã‚Â© Nathan Sobol'
        );

        updateHreflangLinks(slug);
        updateBreadcrumbNav(name, canonicalUrl, p['Range / Subrange']);
        // Worker injects the canonical BreadcrumbList JSON-LD.
        // Keep visual breadcrumb updates client-side without adding a second graph.

        return { canonicalUrl, descriptionText };
      }

      /* CAROUSEL ------------------------------------------------------------- */
      function buildCarousel(images, meta, altBase){
        const carouselEl = document.getElementById('carousel');
        const dotsEl = document.getElementById('dots');
        carouselEl.innerHTML = '';
        dotsEl.innerHTML = '';

        carouselImgs = [];
        carouselIdx = 0;
        photoMetaData = meta || [];

        const placeholder = getPlaceholder();
        setMediaLoading(true);
        let firstImageResolved = false;
        if(!images || images.length === 0){
          images = [placeholder];
          photoMetaData = [{}];
        }

        const hasRealImages = images.some(src => src && src !== placeholder);

        images.forEach((src, i) => {
          const slide = document.createElement('div');
          slide.className = 'slide' + (i === 0 ? ' active' : '');

          const figure = document.createElement('figure');
          figure.className = 'slide-figure';

          const img = document.createElement('img');
          const altInfo = buildPhotoAltText(altBase, meta[i]);
          const titleInfo = buildPhotoTitleText(altBase, meta[i]);
          img.alt = altInfo ? altInfo.text : '';
          if(titleInfo && titleInfo.text){
            img.title = titleInfo.text;
          }
          if(altInfo && altInfo.lang){
            img.setAttribute('lang', altInfo.lang);
          }

          const realSrc = src || placeholder;
          const isPlaceholder = realSrc === placeholder;
          img.loading = 'lazy';
          img.decoding = 'async';
          img.src = placeholder;
          if(!isPlaceholder){
            img.setAttribute('data-src', realSrc);
          }

          const resolveFirstImage = () => {
            if(firstImageResolved) return;
            firstImageResolved = true;
            setMediaLoading(false);
            trackEvent('peak_carousel_first_image_loaded', { index: 0 });
          };
          const handleLoad = () => {
            if(img.getAttribute('data-src')) return;
            img.removeEventListener('load', handleLoad);
            resolveFirstImage();
          };
          img.addEventListener('load', handleLoad);
          img.onerror = () => {
            img.onerror = null;
            img.src = placeholder;
            img.removeAttribute('data-src');
            resolveFirstImage();
          };

          figure.appendChild(img);

          const described = buildPhotoExtendedDescription(meta[i]);
          if(described && described.text){
            const describedId = `photo-desc-${i}`;
            img.setAttribute('aria-describedby', describedId);
            const sr = document.createElement('span');
            sr.id = describedId;
            sr.className = 'sr-only';
            sr.textContent = described.text;
            if(described.lang){
              sr.setAttribute('lang', described.lang);
            }
            figure.appendChild(sr);
          }

          slide.appendChild(figure);
          carouselEl.appendChild(slide);
          carouselImgs.push(img);

          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'dot' + (i === 0 ? ' active' : '');
          dot.style.backgroundImage = `url('${realSrc}')`;
          const dotLabel = altInfo && altInfo.text ? altInfo.text : `View photo ${i + 1}`;
          dot.setAttribute('aria-label', dotLabel);
          dot.title = dotLabel;
          dot.addEventListener('click', () => {
            trackEvent('peak_carousel_dot_click', { index: i });
            goTo(i, true);
          });
          dotsEl.appendChild(dot);
        });

        deferImageSrcSwap(carouselEl);
        if(!hasRealImages){
          setMediaLoading(false);
        }

        document.getElementById('media').hidden = false;
        document.getElementById('carouselTimer').hidden = false;

        // Controls
        document.getElementById('prevBtn').onclick = () => prev(true);
        document.getElementById('nextBtn').onclick = () => next(true);

        // Initialise
        updateMetadata(0);
        setupCarouselLazyLoading();
        startCarousel();
      }

      function updateSlides(){
        const slides = Array.from(document.querySelectorAll('.slide'));
        const dots = Array.from(document.querySelectorAll('.dot'));
        slides.forEach((s,i) => s.classList.toggle('active', i === carouselIdx));
        dots.forEach((d,i) => d.classList.toggle('active', i === carouselIdx));
        updateMetadata(carouselIdx);
      }

      function ensureImgLoaded(i){
        const img = carouselImgs[i];
        if(!img) return;
        const real = img.getAttribute('data-src');
        if(real){
          img.src = real;
          img.removeAttribute('data-src');
        }
      }

      function next(manual=false){
        carouselIdx = (carouselIdx + 1) % carouselImgs.length;
        ensureImgLoaded(carouselIdx);
        updateSlides();
        if(manual){
          trackEvent('peak_carousel_next', { index: carouselIdx });
          restartCarousel();
        }
      }

      function prev(manual=false){
        carouselIdx = (carouselIdx - 1 + carouselImgs.length) % carouselImgs.length;
        ensureImgLoaded(carouselIdx);
        updateSlides();
        if(manual){
          trackEvent('peak_carousel_prev', { index: carouselIdx });
          restartCarousel();
        }
      }

      function goTo(i, manual=false){
        carouselIdx = i % carouselImgs.length;
        ensureImgLoaded(carouselIdx);
        updateSlides();
        if(manual){
          trackEvent('peak_carousel_go_to', { index: carouselIdx });
          restartCarousel();
        }
      }

      function startCarousel(){
        stopCarousel();
        if(isCarouselPaused){
          updatePauseButton(true);
          return;
        }
        currentDelay = BASE_DELAY + Math.floor(Math.random()*2000);
        // start the visual timer immediately
        startTimer(currentDelay);
        // and reset both slide + timer on each automatic flip
        carouselTimer = setInterval(() => {
          next(false);
          startTimer(currentDelay);
        }, currentDelay);
        updatePauseButton(false);
      }

      function stopCarousel(){
        if(carouselTimer){
          clearInterval(carouselTimer);
          carouselTimer = null;
        }
        if(timerInterval){
          clearInterval(timerInterval);
          timerInterval = null;
        }
      }

      function updatePauseButton(paused=isCarouselPaused){
        const btn = document.getElementById('carouselPauseBtn');
        if(!btn) return;
        btn.textContent = paused ? 'Ã¢â€“Â¶' : 'Ã¢ÂÅ¡Ã¢ÂÅ¡';
        btn.setAttribute('aria-pressed', paused);
        btn.setAttribute('aria-label', paused ? 'Resume carousel' : 'Pause carousel');
        btn.title = paused ? 'Resume carousel' : 'Pause carousel';
      }

      function pauseCarousel(reason='manual'){
        if(isCarouselPaused) return;
        isCarouselPaused = true;
        stopCarousel();
        updatePauseButton(true);
        trackEvent('peak_carousel_paused', { reason });
      }

      function resumeCarousel(reason='manual'){
        if(!isCarouselPaused) return;
        isCarouselPaused = false;
        startCarousel();
        updatePauseButton(false);
        trackEvent('peak_carousel_resumed', { reason });
      }

      function restartCarousel(){
        if(isCarouselPaused) return;
        startCarousel();
      }

      function toggleCarouselPause(){
        if(isCarouselPaused){
          resumeCarousel('pause_button');
        }else{
          pauseCarousel('pause_button');
        }
      }

      const pauseBtn = document.getElementById('carouselPauseBtn');
      if(pauseBtn){
        pauseBtn.addEventListener('click', toggleCarouselPause);
        updatePauseButton(false);
      }

      function setupCarouselLazyLoading(){
        if (!('IntersectionObserver' in window)){
          carouselImgs.forEach(img => {
            const src = img.getAttribute('data-src');
            if(src){ img.src = src; img.removeAttribute('data-src'); }
          });
          return;
        }
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if(entry.isIntersecting){
              const img = entry.target;
              const src = img.getAttribute('data-src');
              if(src){ img.src = src; img.removeAttribute('data-src'); }
              observer.unobserve(img);
            }
          });
        }, { rootMargin:'100px' });
        carouselImgs.forEach(img => {
          if(img.getAttribute('data-src')) observer.observe(img);
        });
      }

      /* COUNTDOWN TIMER ------------------------------------------------------ */
      function startTimer(duration){
        const ring = document.getElementById('timerRing');
        const textEl = document.getElementById('timerText');
        if(!ring || !textEl) return;

        const radius = 18;
        const circumference = 2 * Math.PI * radius;
        ring.style.strokeDasharray = circumference;
        ring.style.strokeDashoffset = 0;

        const start = Date.now();
        const end = start + duration;

        if(timerInterval) clearInterval(timerInterval);

        timerInterval = setInterval(() => {
          const now = Date.now();
          const remaining = Math.max(end - now, 0);
          const percent = remaining / duration;
          const offset = circumference * (1 - percent);
          ring.style.strokeDashoffset = offset;
          const secs = Math.ceil(remaining / 1000);
          textEl.textContent = secs;
          if(remaining <= 0){
            clearInterval(timerInterval);
            timerInterval = null;
          }
        }, 100);

        textEl.textContent = Math.ceil(duration / 1000);
      }

      /* INIT ----------------------------------------------------------------- */
      async function init(){
        let initStep = 'init:start';
        debugLog('init:start', {
          path: window.location.pathname,
          search: window.location.search
        });
        debugLog('asset-state:init-start', collectRuntimeAssetState());
        initPanelReader();
        initStep = 'init:monthly-weather-controls';
        initMonthlyWeatherControls();
        initStep = 'init:tooltips-bootstrap';
        if (window.NH48Tooltips && typeof window.NH48Tooltips.init === 'function') {
          window.NH48Tooltips.init({
            pageName: 'Peak details',
            idTextOverrides: {
              monthlyWeatherMonthSelect: 'common.tooltips.monthDropdown'
            }
          });
        }
        const slug = getResolvedSlug();
        console.log('[Peak Init] Starting initialization for slug:', slug);
        debugLog('init:resolved-slug', { slug });
        
        if(!slug){
          console.error('[Peak Init] No slug found in URL');
          debugWarn('init:missing-slug', {
            routeInfo: window.NH48_ROUTE_INFO || getRouteInfo(window.location.pathname)
          });
          trackEvent('peak_missing_slug');
          updatePeakTitle(t('peak.notFound') || 'Peak not found');
          const mediaEl = document.getElementById('media');
          if(mediaEl){
            mediaEl.innerHTML = `
              <div style="padding: 2rem; background: var(--card); border-radius: 8px; color: var(--ink);">
                <h2 style="color: #ef4444; margin-bottom: 1rem;">Ã¢Å¡Â Ã¯Â¸Â Missing Peak Identifier</h2>
                <p>No peak slug was found in the URL. Peak pages should be accessed via:</p>
                <ul>
                  <li><code>/peak/{slug}</code> (e.g., /peak/mount-washington)</li>
                  <li><code>/fr/peak/{slug}</code> (e.g., /fr/peak/mount-washington)</li>
                </ul>
                <p style="margin-top: 1rem;"><a href="/catalog" style="color: var(--accent);">Ã¢â€ Â Browse all peaks</a></p>
              </div>
            `;
            mediaEl.hidden = false;
          }
          return;
        }

        try{
          initStep = 'data:load-all';
          console.log('[Peak Init] Loading translation data and peak data...');
          debugLog('init:bootstrap-summary', (() => {
            const bootstrap = getPeakBootstrapData();
            return {
              hasBootstrap: !!bootstrap,
              bootstrapSlug: bootstrap ? (bootstrap.slug || bootstrap.slug_en || bootstrap.Slug || '') : '',
              hasBootstrapPeak: !!(bootstrap && bootstrap.peak)
            };
          })());
          const [ , data, descMap, experienceMap ] = await Promise.all([
            waitForI18NReady(),
            fetchPeaks(),
            fetchDescriptions(),
            fetchPeakExperiences(),
            fetchPeakEnrichmentData()
          ]);
          peakExperienceMap = experienceMap || {};
          debugLog('data:load-all:complete', {
            peakCount: Object.keys(data || {}).length,
            descCount: Object.keys(descMap || {}).length,
            experienceCount: Object.keys(peakExperienceMap || {}).length
          });
          
          initStep = 'data:lookup-peak';
          console.log('[Peak Init] Data loaded, looking up peak:', slug);
          let p = data && data[slug];

          if(!p){
            console.error('[Peak Init] Peak not found in data:', slug);
            console.log('[Peak Init] Available slugs:', Object.keys(data || {}).slice(0, 10).join(', '));
            trackEvent('peak_not_found', { slug });
            updatePeakTitle(t('peak.notFound') || 'Peak not found');
            const mediaEl = document.getElementById('media');
            if(mediaEl){
              mediaEl.innerHTML = `
                <div style="padding: 2rem; background: var(--card); border-radius: 8px; color: var(--ink);">
                  <h2 style="color: #ef4444; margin-bottom: 1rem;">Ã¢Å¡Â Ã¯Â¸Â Peak Not Found</h2>
                  <p><strong>Requested:</strong> <code>${slug}</code></p>
                  <p>This peak identifier was not found in our database.</p>
                  <p style="margin-top: 1rem;"><a href="/catalog" style="color: var(--accent);">Ã¢â€ Â Browse all peaks</a></p>
                </div>
              `;
              mediaEl.hidden = false;
            }
            return;
          }

          const normalizedSlug = normalizeDescriptionLookupKey(slug);
          const peakName = p && (p.peakName || p['Peak Name'] || p.name || p['Name'] || p.peak || p['Peak'] || p['PeakName']);
          const normalizedPeakName = normalizeDescriptionLookupKey(peakName);
          const extendedDescription = descMap[normalizedSlug] || descMap[normalizedPeakName];
          if(extendedDescription){
            p.description = extendedDescription;
          }else{
            p.description = p.description || p['Description'];
          }

          const activeLang = getActiveUiLanguage();
          if (activeLang && activeLang !== 'en') {
            const peakOverlayBySlug = await fetchDatasetOverlay('nh48', activeLang);
            if (peakOverlayBySlug && peakOverlayBySlug[slug]) {
              p = deepMergeOverlay(p, peakOverlayBySlug[slug]);
            }
          }

          const name = p.peakName || p['Peak Name'] || p.name || p['Name'] || p.peak || p['Peak'] || p['PeakName'] || slug;
          console.log('[Peak Init] Found peak:', name);
          updatePeakTitle(name);
          debugLog('data:peak-found', { name, slug });
          if (window.NH48Tooltips && typeof window.NH48Tooltips.init === 'function') {
            window.NH48Tooltips.init({
              pageName: name,
              idTextOverrides: {
                monthlyWeatherMonthSelect: 'common.tooltips.monthDropdown'
              }
            });
            window.NH48Tooltips.refresh(document.body);
          }
          if(!p.experience && peakExperienceMap && peakExperienceMap[slug]){
            p.experience = peakExperienceMap[slug];
          }
          currentPeak = p;
          currentSlug = slug;
          peakViewModel = buildPeakViewModel(p, slug);
          debugLog('view-model:built', {
            hasViewModel: !!peakViewModel,
            riskLevel: peakViewModel && peakViewModel.risk ? peakViewModel.risk.level : 'n/a'
          });

          // Photos + per-photo metadata
          initStep = 'media:normalize-photos';
          let imgs = [];
          let meta = [];
          let primaryIndex = 0;
          let primaryMarked = false;
          const photos = Array.isArray(p.photos) ? p.photos : [];
          let heroUrl = null;
          if(photos.length > 1){
            const candidate = photos[1];
            heroUrl = typeof candidate === 'string' ? candidate : candidate && candidate.url;
          }
          if(!heroUrl && photos.length > 0){
            const candidate = photos[0];
            heroUrl = typeof candidate === 'string' ? candidate : candidate && candidate.url;
          }
          if(heroUrl){
            heroUrl = normalizePhotoUrl(heroUrl);
          }
          if(Array.isArray(p.photos) && p.photos.length > 0){
            p.photos.forEach((item, idx) => {
              if(typeof item === 'string'){
                const normalizedUrl = normalizePhotoUrl(item);
                imgs.push(normalizedUrl);
                meta.push({ url: normalizedUrl, originalUrl: item });
                if(item && typeof item === 'object' && item.isPrimary && !primaryMarked){
                  primaryIndex = idx;
                  primaryMarked = true;
                }
              }else if(item && item.url){
                const normalizedUrl = normalizePhotoUrl(item.url);
                imgs.push(normalizedUrl);
                meta.push({ ...item, url: normalizedUrl, originalUrl: item.url });
                if(item.isPrimary && !primaryMarked){
                  primaryIndex = idx;
                  primaryMarked = true;
                }
              }
            });
          }
          if(imgs.length === 0){
            imgs = [getPlaceholder()];
            meta = [{}];
            primaryIndex = 0;
            primaryMarked = false;
          }
          console.log('[Peak Init] Photos loaded:', imgs.length);
          debugLog('media:photos-ready', {
            count: imgs.length,
            primaryIndex,
            heroUrl: heroUrl || ''
          });
          currentImages = imgs.slice();
          currentMeta = meta.slice();
          const heroEl = document.getElementById('peakHero');
          if(heroEl){
            heroEl.style.backgroundImage = heroUrl ? `url("${heroUrl}")` : '';
          }

          const primaryMeta = meta[primaryIndex] || meta[0] || {};
          const primaryImageCandidate = imgs[primaryIndex] || imgs[0];
          const primaryImage =
            primaryImageCandidate && !primaryImageCandidate.startsWith('data:')
              ? primaryImageCandidate
              : DEFAULT_OG_IMAGE;
          const parsedDimensions = parseDimensions(primaryMeta.dimensions);
          currentPrimaryMeta = primaryMeta;
          currentPrimaryPhoto = {
            ...primaryMeta,
            url: primaryImage,
            width: parsedDimensions.width,
            height: parsedDimensions.height
          };

          const { canonicalUrl, descriptionText } = updateHeadMeta(p, slug, name, primaryMeta);

          const ogImageEl = document.getElementById('dynamicOgImage');
          if(ogImageEl){
            ogImageEl.setAttribute('content', primaryImage);
          }
          const twitterImageEl = document.getElementById('dynamicTwitterImage');
          if(twitterImageEl){
            twitterImageEl.setAttribute('content', primaryImage);
          }

          initStep = 'render:panels-and-map';
          buildPeakDescription(p);
          updateHeroBannerDetails(p);
          updateDirectionsButton(peakViewModel);
          // Build general info panel
          buildGeneralInfo(p);
          buildPrintSummary(p, name);

          const routes = p['Standard Routes'] || [];
          const trailNames = p['Trail Names'] || [];
          renderRoutes(routes);
          renderRelatedTrails(routes, trailNames);
          renderParkingAndAccess(peakViewModel);
          renderDifficultyMetrics(peakViewModel);
          renderRiskAndPreparation(peakViewModel);
          renderWildernessSafety(peakViewModel);
          renderTerrain(p);
          renderConditions(p);
          renderMonthlyWeatherPanel();
          renderTrailTestedNotes(p, slug);
          renderPeakMap(p, name, canonicalUrl);
          initPeakSocialCardHandlers(p, name, canonicalUrl, slug);

          initStep = 'schema-and-carousel';
          buildMountainSchema(p, name, canonicalUrl, currentPrimaryPhoto, descriptionText, currentMeta);
          buildPeakFaqSchema(p, name, canonicalUrl);
          buildCarousel(imgs, meta, name);
          console.log('[Peak Init] Initialization complete');
          debugLog('init:complete', {
            slug,
            name,
            photoCount: imgs.length
          });
          debugLog('asset-state:init-complete', collectRuntimeAssetState());
          trackEvent('peak_loaded', { slug, name, photoCount: imgs.length });

        }catch(err){
          console.error('[Peak Init] Error loading peak data:', err);
          console.error('[Peak Init] Stack trace:', err.stack);
          debugError('init:failed', {
            step: initStep,
            message: err && err.message ? err.message : String(err),
            stack: err && err.stack ? err.stack : ''
          });
          trackEvent('peak_load_failed', { slug, message: err.message });
          
          // Show user-friendly error
          updatePeakTitle(t('peak.errorLoading') || 'Error Loading Peak Data');
          
          // Display error details
          const mediaEl = document.getElementById('media');
          if(mediaEl){
            mediaEl.innerHTML = `
              <div style="padding: 2rem; background: var(--card); border-radius: 8px; color: var(--ink);">
                <h2 style="color: #ef4444; margin-bottom: 1rem;">Ã¢Å¡Â Ã¯Â¸Â Unable to Load Peak Data</h2>
                <p><strong>Peak:</strong> <code>${slug}</code></p>
                <p><strong>Error:</strong> ${err.message}</p>
                <details style="margin-top: 1rem; padding: 1rem; background: var(--panel); border-radius: 4px;">
                  <summary style="cursor: pointer; font-weight: 600;">Technical Details</summary>
                  <p style="margin-top: 0.5rem;"><strong>Attempted Data Sources:</strong></p>
                  <ul>${API_URLS.map(url => `<li><code style="font-size: 0.85em;">${url}</code></li>`).join('')}</ul>
                  ${err.stack ? `<pre style="margin-top: 1rem; padding: 0.5rem; background: var(--bg); overflow-x: auto; font-size: 0.85em;">${err.stack}</pre>` : ''}
                </details>
                <p style="margin-top: 1rem;">
                  <a href="/catalog" style="color: var(--accent); text-decoration: none;">Ã¢â€ Â Browse all peaks</a> | 
                  <a href="javascript:location.reload()" style="color: var(--accent); text-decoration: none; margin-left: 1rem;">Ã¢â€ Â» Retry</a>
                </p>
              </div>
            `;
            mediaEl.hidden = false;
          }
        }
      }

      window.NH48PeakRuntime = window.NH48PeakRuntime || {};
      window.NH48PeakRuntime.init = init;
      window.NH48PeakRuntime.debug = {
        enabled: PEAK_DEBUG_ENABLED,
        assetState: collectRuntimeAssetState,
        logAssetState(label = 'manual'){
          debugLog(`asset-state:${label}`, collectRuntimeAssetState());
        }
      };

      if(!window.__NH48_PEAK_RUNTIME_AUTO_INIT_DONE){
        window.__NH48_PEAK_RUNTIME_AUTO_INIT_DONE = true;
        if(document.readyState === 'loading'){
          document.addEventListener('DOMContentLoaded', init, { once: true });
        }else{
          init();
        }
      }

      if (window.NH48_I18N && window.NH48_I18N.onLangChange) {
        window.NH48_I18N.onLangChange((lang) => {
          syncUnitsWithLanguage(lang);
          if (!currentPeak) return;
          const name = currentPeak.peakName || currentPeak['Peak Name'] || currentSlug;
          peakViewModel = buildPeakViewModel(currentPeak, currentSlug);
          updatePeakTitle(name);
          const { canonicalUrl, descriptionText } = updateHeadMeta(currentPeak, currentSlug, name, currentPrimaryMeta);
          buildPeakDescription(currentPeak);
          updateHeroBannerDetails(currentPeak);
          updateDirectionsButton(peakViewModel);
          buildGeneralInfo(currentPeak);
          buildPrintSummary(currentPeak, name);
          const routes = currentPeak['Standard Routes'] || [];
          const trailNames = currentPeak['Trail Names'] || [];
          renderRoutes(routes);
          renderRelatedTrails(routes, trailNames);
          renderParkingAndAccess(peakViewModel);
          renderDifficultyMetrics(peakViewModel);
          renderRiskAndPreparation(peakViewModel);
          renderWildernessSafety(peakViewModel);
          renderTerrain(currentPeak);
          renderConditions(currentPeak);
          renderMonthlyWeatherPanel();
          renderTrailTestedNotes(currentPeak, currentSlug);
          renderPeakMap(currentPeak, name, canonicalUrl);
          updateSocialCardContent(currentPeak, name, canonicalUrl);
          if (currentPrimaryPhoto) {
            buildMountainSchema(currentPeak, name, canonicalUrl, currentPrimaryPhoto, descriptionText, currentMeta);
          }
          buildPeakFaqSchema(currentPeak, name, canonicalUrl);
          if (currentImages.length) {
            buildCarousel(currentImages, currentMeta, name);
          }
          trackEvent('peak_language_change', { language: lang, slug: currentSlug });
        });
      }

      const unitsSelect = document.getElementById('unitsSelect');
      if(unitsSelect){
        unitsSelect.addEventListener('change', (e) => {
          setUnits(e.target.value);
          if (!currentPeak) return;
          peakViewModel = buildPeakViewModel(currentPeak, currentSlug);
          buildGeneralInfo(currentPeak);
          buildPrintSummary(currentPeak);
          const routes = currentPeak['Standard Routes'] || [];
          const trailNames = currentPeak['Trail Names'] || [];
          renderRoutes(routes);
          renderRelatedTrails(routes, trailNames);
          renderParkingAndAccess(peakViewModel);
          renderDifficultyMetrics(peakViewModel);
          renderRiskAndPreparation(peakViewModel);
          renderWildernessSafety(peakViewModel);
          renderConditions(currentPeak);
          renderMonthlyWeatherPanel();
          updateSocialCardContent(currentPeak, currentPeak.peakName || currentPeak['Peak Name'] || currentSlug, buildCanonicalUrl(currentSlug, getSeoLang()));
          trackEvent('peak_units_change', { units: e.target.value, slug: currentSlug });
        });
      }

      syncUnitsWithLanguage(window.NH48_I18N ? window.NH48_I18N.getLang() : 'en');
