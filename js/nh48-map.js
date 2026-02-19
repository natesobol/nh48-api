(() => {
  'use strict';

  const DATA_URLS = [
    '/data/nh48.json',
    'https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48.json',
    'https://raw.githubusercontent.com/natesobol/nh48-api/main/data/nh48.json'
  ];
  const PHOTO_TRANSFORM_HOSTS = new Set([
    'photos.nh48.info',
    'plants.nh48.info',
    'wikiphotos.nh48.info',
    'howker.nh48.info'
  ]);
  const DEFAULT_IMAGE = '/nh48-preview.png';
  const SEARCH_DEBOUNCE_MS = 140;
  const MOBILE_BREAKPOINT = 1024;
  const WEATHER_ENDPOINT_MAX_POINTS = 60;
  const WEATHER_SETTINGS_STORAGE_KEY = 'nh48-map-weather-settings-v1';
  const WEATHER_SCALAR_STORAGE_KEY = 'nh48-map-weather-scalars-v1';
  const WEATHER_SCALAR_STORAGE_TTL_MS = 30 * 60 * 1000;
  const WEATHER_CACHE_TTL_MS = 5 * 60 * 1000;
  const WEATHER_RADAR_META_TTL_MS = 2 * 60 * 1000;
  const WEATHER_ALERTS_TTL_MS = 5 * 60 * 1000;
  const IS_FRENCH_ROUTE = /^\/fr(\/|$)/i.test(window.location.pathname || '');
  const PEAK_ROUTE_PREFIX = IS_FRENCH_ROUTE ? '/fr/peak/' : '/peak/';

  const FALLBACK_TEXT = {
    'nh48Map.loading': 'Loading NH48 peaks from nh48.json ...',
    'nh48Map.loadError': 'Unable to load NH48 map data right now. Please try again.',
    'nh48Map.noResults': 'No peaks match your current search.',
    'nh48Map.rangeAll': 'All ranges',
    'nh48Map.sortName': 'Name (A-Z)',
    'nh48Map.sortElevation': 'Elevation (high to low)',
    'nh48Map.showPanel': 'Show panel',
    'nh48Map.hidePanel': 'Hide panel',
    'nh48Map.detailFallbackTitle': 'Select a peak',
    'nh48Map.detailFallbackBody': 'Choose a marker or list item to view elevation, range, and route context.',
    'nh48Map.detailElevation': 'Elevation',
    'nh48Map.detailProminence': 'Prominence',
    'nh48Map.detailRange': 'Range',
    'nh48Map.detailDifficulty': 'Difficulty',
    'nh48Map.detailTrailType': 'Trail Type',
    'nh48Map.detailExposure': 'Exposure',
    'nh48Map.popupElevation': 'Elevation',
    'nh48Map.popupProminence': 'Prominence',
    'nh48Map.popupRange': 'Range',
    'nh48Map.openPeak': 'Open peak details',
    'nh48Map.layerTopo': 'Topographic',
    'nh48Map.layerStandard': 'Standard',
    'nh48Map.unknown': 'Unknown',
    'nh48Map.weather.toggle': 'Weather',
    'nh48Map.weather.title': 'Weather overlays',
    'nh48Map.weather.subtitle': 'Choose one or more layers and apply them to the map.',
    'nh48Map.weather.closePanel': 'Close weather panel',
    'nh48Map.weather.searchLabel': 'Find overlays',
    'nh48Map.weather.searchPlaceholder': 'Search overlays',
    'nh48Map.weather.quickActions': 'Quick actions',
    'nh48Map.weather.selectCore': 'Select core',
    'nh48Map.weather.selectAll': 'Select all',
    'nh48Map.weather.clear': 'Clear',
    'nh48Map.weather.unitsLabel': 'Units',
    'nh48Map.weather.unitsImperial': 'Imperial',
    'nh48Map.weather.unitsMetric': 'Metric',
    'nh48Map.weather.hourOffsetLabel': 'Forecast hour',
    'nh48Map.weather.hourOffsetHelp': '0 means current hour.',
    'nh48Map.weather.apply': 'Apply overlays',
    'nh48Map.weather.noMatches': 'No overlays match your search.',
    'nh48Map.weather.status.idle': 'Idle',
    'nh48Map.weather.status.loading': 'Loading',
    'nh48Map.weather.status.live': 'Live',
    'nh48Map.weather.status.stale': 'Stale',
    'nh48Map.weather.status.error': 'Error',
    'nh48Map.weather.statusSummary': '{count} selected',
    'nh48Map.weather.sourceLabel': 'Source',
    'nh48Map.weather.updatedLabel': 'Updated',
    'nh48Map.weather.legendTitle': 'Weather legend',
    'nh48Map.weather.legendRange': 'Range',
    'nh48Map.weather.legendAnchor': 'Anchor',
    'nh48Map.weather.legendSelected': 'Selected peak',
    'nh48Map.weather.legendRadar': 'Radar overlay active',
    'nh48Map.weather.legendAlerts': 'Active alerts overlay',
    'nh48Map.weather.errorGeneric': 'Unable to load this overlay right now.',
    'nh48Map.weather.errorRadarMeta': 'Unable to load radar metadata right now.',
    'nh48Map.weather.errorAlerts': 'Unable to load weather alerts right now.',
    'nh48Map.weather.category.temperature': 'Temperature',
    'nh48Map.weather.category.wind': 'Wind',
    'nh48Map.weather.category.moisture': 'Humidity',
    'nh48Map.weather.category.precipitation': 'Precipitation',
    'nh48Map.weather.category.snow': 'Snow',
    'nh48Map.weather.category.radar': 'Radar',
    'nh48Map.weather.category.alerts': 'Alerts',
    'nh48Map.weather.overlay.temperature': 'Temperature',
    'nh48Map.weather.overlay.apparent_temperature': 'Apparent temperature',
    'nh48Map.weather.overlay.wind_speed_10m': 'Wind speed (10m)',
    'nh48Map.weather.overlay.wind_gusts_10m': 'Wind gusts (10m)',
    'nh48Map.weather.overlay.relative_humidity_2m': 'Relative humidity',
    'nh48Map.weather.overlay.precipitation': 'Precipitation',
    'nh48Map.weather.overlay.snow_depth': 'Snow depth',
    'nh48Map.weather.overlay.snowfall': 'Snowfall',
    'nh48Map.weather.overlay.radar': 'Radar',
    'nh48Map.weather.overlay.alerts': 'NWS alerts',
    'nh48Map.weather.hourOffsetValue': '+{hours}h',
    'nh48Map.weather.alertSeverity.extreme': 'Extreme',
    'nh48Map.weather.alertSeverity.severe': 'Severe',
    'nh48Map.weather.alertSeverity.moderate': 'Moderate',
    'nh48Map.weather.alertSeverity.minor': 'Minor',
    'nh48Map.weather.alertSeverity.unknown': 'Unknown'
  };

  // Open-Meteo scalar fields are fetched on demand via /api/weather/open-meteo (5 min cache).
  // Radar uses RainViewer metadata/tiles (meta 2 min cache, tile 5 min cache) with NOAA WMS fallback.
  // Alerts use NWS active alert GeoJSON snapshots (5 min cache).
  const WEATHER_OVERLAYS = [
    {
      id: 'temperature',
      labelKey: 'nh48Map.weather.overlay.temperature',
      categoryKey: 'nh48Map.weather.category.temperature',
      type: 'scalar',
      provider: 'open-meteo',
      variableKey: 'temperature_2m',
      units: { metric: '°C', imperial: '°F' },
      palette: ['#1d4ed8', '#38bdf8', '#f59e0b', '#b91c1c'],
      absoluteDomainMetric: { min: -40, max: 40 },
      minSpanMetric: 4,
      supportsHourOffset: true,
      defaultOpacity: 0.9,
      enabledByDefault: false
    },
    {
      id: 'apparent_temperature',
      labelKey: 'nh48Map.weather.overlay.apparent_temperature',
      categoryKey: 'nh48Map.weather.category.temperature',
      type: 'scalar',
      provider: 'open-meteo',
      variableKey: 'apparent_temperature',
      units: { metric: '°C', imperial: '°F' },
      palette: ['#0f3b9f', '#38bdf8', '#f59e0b', '#991b1b'],
      absoluteDomainMetric: { min: -45, max: 45 },
      minSpanMetric: 4,
      supportsHourOffset: true,
      defaultOpacity: 0.9,
      enabledByDefault: false
    },
    {
      id: 'wind_speed_10m',
      labelKey: 'nh48Map.weather.overlay.wind_speed_10m',
      categoryKey: 'nh48Map.weather.category.wind',
      type: 'scalar',
      provider: 'open-meteo',
      variableKey: 'wind_speed_10m',
      units: { metric: 'km/h', imperial: 'mph' },
      palette: ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8'],
      absoluteDomainMetric: { min: 0, max: 180 },
      minSpanMetric: 8,
      supportsHourOffset: true,
      defaultOpacity: 0.9,
      enabledByDefault: false
    },
    {
      id: 'wind_gusts_10m',
      labelKey: 'nh48Map.weather.overlay.wind_gusts_10m',
      categoryKey: 'nh48Map.weather.category.wind',
      type: 'scalar',
      provider: 'open-meteo',
      variableKey: 'wind_gusts_10m',
      units: { metric: 'km/h', imperial: 'mph' },
      palette: ['#e0e7ff', '#818cf8', '#4338ca', '#312e81'],
      absoluteDomainMetric: { min: 0, max: 220 },
      minSpanMetric: 10,
      supportsHourOffset: true,
      defaultOpacity: 0.9,
      enabledByDefault: false
    },
    {
      id: 'relative_humidity_2m',
      labelKey: 'nh48Map.weather.overlay.relative_humidity_2m',
      categoryKey: 'nh48Map.weather.category.moisture',
      type: 'scalar',
      provider: 'open-meteo',
      variableKey: 'relative_humidity_2m',
      units: { metric: '%', imperial: '%' },
      palette: ['#fef3c7', '#fde68a', '#60a5fa', '#1d4ed8'],
      absoluteDomainMetric: { min: 0, max: 100 },
      minSpanMetric: 8,
      supportsHourOffset: true,
      defaultOpacity: 0.9,
      enabledByDefault: false
    },
    {
      id: 'precipitation',
      labelKey: 'nh48Map.weather.overlay.precipitation',
      categoryKey: 'nh48Map.weather.category.precipitation',
      type: 'scalar',
      provider: 'open-meteo',
      variableKey: 'precipitation',
      units: { metric: 'mm', imperial: 'in' },
      palette: ['#e0f2fe', '#7dd3fc', '#0284c7', '#0f172a'],
      absoluteDomainMetric: { min: 0, max: 75 },
      minSpanMetric: 1.2,
      supportsHourOffset: true,
      defaultOpacity: 0.9,
      enabledByDefault: false
    },
    {
      id: 'snow_depth',
      labelKey: 'nh48Map.weather.overlay.snow_depth',
      categoryKey: 'nh48Map.weather.category.snow',
      type: 'scalar',
      provider: 'open-meteo',
      variableKey: 'snow_depth',
      units: { metric: 'm', imperial: 'in' },
      palette: ['#ecfeff', '#a5f3fc', '#22d3ee', '#0369a1'],
      absoluteDomainMetric: { min: 0, max: 3.2 },
      minSpanMetric: 0.06,
      supportsHourOffset: true,
      defaultOpacity: 0.9,
      enabledByDefault: false
    },
    {
      id: 'snowfall',
      labelKey: 'nh48Map.weather.overlay.snowfall',
      categoryKey: 'nh48Map.weather.category.snow',
      type: 'scalar',
      provider: 'open-meteo',
      variableKey: 'snowfall',
      units: { metric: 'cm', imperial: 'in' },
      palette: ['#f8fafc', '#bfdbfe', '#3b82f6', '#1e3a8a'],
      absoluteDomainMetric: { min: 0, max: 90 },
      minSpanMetric: 1.2,
      supportsHourOffset: true,
      defaultOpacity: 0.9,
      enabledByDefault: false
    },
    {
      id: 'radar',
      labelKey: 'nh48Map.weather.overlay.radar',
      categoryKey: 'nh48Map.weather.category.radar',
      type: 'tile',
      provider: 'rainviewer',
      variableKey: 'radar',
      units: { metric: 'dBZ', imperial: 'dBZ' },
      palette: ['#60a5fa', '#3b82f6', '#1d4ed8', '#1e3a8a'],
      absoluteDomainMetric: { min: 0, max: 70 },
      minSpanMetric: 10,
      supportsHourOffset: false,
      defaultOpacity: 0.65,
      enabledByDefault: false
    },
    {
      id: 'alerts',
      labelKey: 'nh48Map.weather.overlay.alerts',
      categoryKey: 'nh48Map.weather.category.alerts',
      type: 'polygon',
      provider: 'nws',
      variableKey: 'alerts',
      units: { metric: '', imperial: '' },
      palette: ['#991b1b', '#b45309', '#2563eb'],
      absoluteDomainMetric: null,
      minSpanMetric: 0,
      supportsHourOffset: false,
      defaultOpacity: 0.72,
      enabledByDefault: false
    }
  ];

  const WEATHER_OVERLAY_BY_ID = new Map(WEATHER_OVERLAYS.map((descriptor) => [descriptor.id, descriptor]));
  const WEATHER_CORE_OVERLAY_IDS = ['temperature', 'wind_speed_10m', 'snow_depth', 'radar', 'alerts'];

  const MARKER_STYLE_ACTIVE = {
    radius: 7,
    color: '#dbeafe',
    weight: 1.4,
    fillColor: '#22c55e',
    fillOpacity: 0.9
  };
  const MARKER_STYLE_MUTED = {
    radius: 6,
    color: 'rgba(219, 234, 254, 0.45)',
    weight: 1.0,
    fillColor: '#64748b',
    fillOpacity: 0.38
  };
  const MARKER_STYLE_SELECTED = {
    radius: 9,
    color: '#e0f2fe',
    weight: 2.1,
    fillColor: '#38bdf8',
    fillOpacity: 0.96
  };

  const state = {
    peaks: [],
    ranges: [],
    filtered: [],
    selectedSlug: '',
    query: '',
    activeRange: '',
    sort: 'name_asc',
    markersBySlug: new Map(),
    bySlug: new Map(),
    map: null,
    markerLayer: null,
    layerControl: null,
    panelCollapsed: false,
    weather: createWeatherState()
  };

  const refs = {
    shell: document.getElementById('nh48MapShell'),
    panel: document.getElementById('nh48MapPanel'),
    panelToggle: document.getElementById('nh48MapPanelToggle'),
    panelExpand: document.getElementById('nh48MapPanelExpand'),
    search: document.getElementById('nh48MapSearch'),
    rangeFilter: document.getElementById('nh48MapRangeFilter'),
    rangeChips: document.getElementById('nh48MapRangeChips'),
    sort: document.getElementById('nh48MapSort'),
    list: document.getElementById('nh48MapList'),
    detail: document.getElementById('nh48MapDetail'),
    loading: document.getElementById('nh48MapLoading'),
    error: document.getElementById('nh48MapError'),
    weatherToggle: document.getElementById('nh48WeatherToggle'),
    weatherPanel: document.getElementById('nh48WeatherPanel'),
    weatherClose: document.getElementById('nh48WeatherClose'),
    weatherSearch: document.getElementById('nh48WeatherSearch'),
    weatherOverlayList: document.getElementById('nh48WeatherOverlayList'),
    weatherSelectCore: document.getElementById('nh48WeatherSelectCore'),
    weatherSelectAll: document.getElementById('nh48WeatherSelectAll'),
    weatherClear: document.getElementById('nh48WeatherClear'),
    weatherUnits: document.getElementById('nh48WeatherUnits'),
    weatherHourOffset: document.getElementById('nh48WeatherHourOffset'),
    weatherApply: document.getElementById('nh48WeatherApply'),
    weatherPanelStatus: document.getElementById('nh48WeatherPanelStatus'),
    weatherLegend: document.getElementById('nh48WeatherLegend')
  };

  function clampNumber(value, min, max, fallback = min) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }

  function loadWeatherSettings() {
    try {
      const raw = window.localStorage.getItem(WEATHER_SETTINGS_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function persistWeatherSettings() {
    const payload = {
      unitSystem: state.weather.unitSystem,
      hourOffset: state.weather.hourOffset,
      draftOverlayIds: [...state.weather.draftOverlayIds]
    };
    try {
      window.localStorage.setItem(WEATHER_SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {
      // Ignore storage errors.
    }
  }

  function persistScalarPayload(payload) {
    if (!payload || typeof payload !== 'object') return;
    const envelope = {
      savedAt: Date.now(),
      hourOffset: state.weather.hourOffset,
      payload
    };
    try {
      window.localStorage.setItem(WEATHER_SCALAR_STORAGE_KEY, JSON.stringify(envelope));
    } catch (_) {
      // Ignore storage errors.
    }
  }

  function loadScalarPayloadFromStorage() {
    try {
      const raw = window.localStorage.getItem(WEATHER_SCALAR_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (Number(parsed.hourOffset) !== Number(state.weather.hourOffset)) return null;
      const savedAt = Number(parsed.savedAt);
      if (!Number.isFinite(savedAt)) return null;
      if (Date.now() - savedAt > WEATHER_SCALAR_STORAGE_TTL_MS) return null;
      return parsed.payload && typeof parsed.payload === 'object' ? parsed.payload : null;
    } catch (_) {
      return null;
    }
  }

  function createWeatherState() {
    const saved = loadWeatherSettings();
    const draftOverlayIds = new Set(
      WEATHER_OVERLAYS
        .filter((descriptor) => descriptor.enabledByDefault)
        .map((descriptor) => descriptor.id)
    );
    if (saved?.draftOverlayIds && Array.isArray(saved.draftOverlayIds)) {
      draftOverlayIds.clear();
      saved.draftOverlayIds.forEach((overlayId) => {
        if (WEATHER_OVERLAY_BY_ID.has(overlayId)) {
          draftOverlayIds.add(overlayId);
        }
      });
    }

    return {
      panelOpen: false,
      draftOverlayIds,
      activeOverlayIds: new Set(),
      unitSystem: saved?.unitSystem === 'metric' ? 'metric' : 'imperial',
      hourOffset: clampNumber(parseInt(saved?.hourOffset, 10), 0, 48, 0),
      overlaySearch: '',
      layerHandles: {
        radarLayer: null,
        alertsLayer: null,
        scalarLayer: null
      },
      cache: new Map(),
      errorsByOverlay: new Map(),
      statusByOverlay: new Map(),
      scalarPayload: null,
      scalarPointsBySlug: new Map(),
      legendData: [],
      radarMeta: null,
      alertsGeoJson: null,
      abortController: null
    };
  }

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const normalizeText = (value) => String(value || '').trim();

  const normalizeToken = (value) => normalizeText(value)
    .toLowerCase()
    .replace(/[_\s/]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const humanizeSlug = (value) => normalizeText(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

  const parseNumber = (value) => {
    if (value === null || value === undefined) return null;
    const clean = String(value).replace(/,/g, '').trim();
    if (!clean) return null;
    const parsed = Number.parseFloat(clean);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseCoordinates = (value) => {
    if (!value) return null;
    if (Array.isArray(value) && value.length >= 2) {
      const lat = parseNumber(value[0]);
      const lng = parseNumber(value[1]);
      if (lat === null || lng === null) return null;
      return [lat, lng];
    }
    if (typeof value === 'object') {
      const lat = parseNumber(value.lat ?? value.latitude ?? value[0]);
      const lng = parseNumber(value.lng ?? value.lon ?? value.longitude ?? value[1]);
      if (lat === null || lng === null) return null;
      return [lat, lng];
    }
    if (typeof value === 'string') {
      const tokens = value
        .split(/[,\s]+/)
        .map((part) => parseNumber(part))
        .filter((num) => num !== null);
      if (tokens.length >= 2) return [tokens[0], tokens[1]];
    }
    return null;
  };

  const formatFeet = (value) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return t('nh48Map.unknown');
    }
    const rounded = Math.round(Number(value));
    return `${rounded.toLocaleString('en-US')} ft`;
  };

  const t = (key, vars = null) => {
    let result = '';
    if (window.NH48_I18N?.t) {
      try {
        result = window.NH48_I18N.t(key, vars);
      } catch (_) {
        result = '';
      }
    }
    if (!result || result === key) {
      result = FALLBACK_TEXT[key] || key;
      if (vars && typeof vars === 'object') {
        result = result.replace(/\{(\w+)\}/g, (match, token) => {
          return Object.prototype.hasOwnProperty.call(vars, token) ? String(vars[token]) : match;
        });
      }
    }
    return result;
  };

  const track = (name, params = {}) => {
    if (window.NH48Analytics?.track) {
      window.NH48Analytics.track(name, params);
      return;
    }
    if (window.NH48_INFO_ANALYTICS?.logEvent) {
      window.NH48_INFO_ANALYTICS.logEvent(name, params);
    }
  };

  const pickPrimaryPhoto = (photos) => {
    if (!Array.isArray(photos) || !photos.length) return '';
    const normalized = photos
      .map((entry) => {
        if (!entry) return null;
        if (typeof entry === 'string') {
          const url = normalizeText(entry);
          return url ? { url, isPrimary: false } : null;
        }
        if (typeof entry !== 'object') return null;
        const url = normalizeText(entry.url || entry.contentUrl || entry.src || entry.image);
        if (!url) return null;
        return { url, isPrimary: Boolean(entry.isPrimary || entry.primary) };
      })
      .filter(Boolean);
    if (!normalized.length) return '';
    const flagged = normalized.find((item) => item.isPrimary);
    return (flagged || normalized[0]).url;
  };

  const toTransformedImage = (inputUrl, width = 760) => {
    const source = normalizeText(inputUrl);
    if (!source) return DEFAULT_IMAGE;
    try {
      const parsed = new URL(source, window.location.origin);
      if (!PHOTO_TRANSFORM_HOSTS.has(parsed.hostname)) {
        return parsed.toString();
      }
      if (parsed.pathname.startsWith('/cdn-cgi/image/')) {
        return parsed.toString();
      }
      const safeWidth = Math.max(280, Math.min(1800, Number.parseInt(String(width), 10) || 760));
      const transformPath = `/cdn-cgi/image/format=jpg,quality=85,width=${safeWidth}${parsed.pathname}`;
      return `${parsed.protocol}//${parsed.host}${transformPath}`;
    } catch (_) {
      return source;
    }
  };

  const extractEntries = (raw) => {
    if (Array.isArray(raw)) {
      return raw.filter((item) => item && typeof item === 'object');
    }
    if (raw && typeof raw === 'object') {
      return Object.entries(raw)
        .map(([key, value]) => {
          if (!value || typeof value !== 'object') return null;
          return { ...value, _key: key };
        })
        .filter(Boolean);
    }
    return [];
  };

  const getRangeName = (entry) => {
    const range = normalizeText(entry['Range'] || entry.range || entry['Range Name']);
    const subrange = normalizeText(entry['Subrange'] || entry.subrange);
    if (range && subrange && !new RegExp(subrange, 'i').test(range)) {
      return `${range} - ${subrange}`;
    }
    return range || subrange || t('nh48Map.unknown');
  };

  const buildPeakRecords = (raw) => {
    const entries = extractEntries(raw);
    const out = [];
    entries.forEach((entry) => {
      const coords = parseCoordinates(entry.Coordinates || entry.coordinates || entry.coord || entry.location);
      if (!coords) return;
      const [lat, lng] = coords;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

      const slug = normalizeToken(
        entry.slug
        || entry.slug_en
        || entry.Slug
        || entry.id
        || entry._key
        || entry['Peak Name']
      );
      if (!slug) return;

      const name = normalizeText(entry.peakName || entry['Peak Name'] || entry.name || humanizeSlug(slug));
      const rangeName = getRangeName(entry);
      const rangeKey = normalizeToken(rangeName) || 'unknown';
      const elevation = parseNumber(entry['Elevation (ft)'] ?? entry.elevation_ft ?? entry.elevation ?? entry.elevationFt);
      const prominence = parseNumber(entry['Prominence (ft)'] ?? entry.prominence_ft ?? entry.prominence ?? entry.prominenceFt);
      const difficulty = normalizeText(entry['Difficulty'] || entry.difficulty);
      const trailType = normalizeText(entry['Trail Type'] || entry.trailType);
      const exposure = normalizeText(entry['Exposure Level'] || entry.exposure || entry.exposureLevel);
      const primaryPhoto = pickPrimaryPhoto(entry.photos);
      const thumb = toTransformedImage(primaryPhoto, 920);
      const popupImage = toTransformedImage(primaryPhoto, 680);
      const peakUrl = `${PEAK_ROUTE_PREFIX}${encodeURIComponent(slug)}`;
      const searchIndex = normalizeText([
        slug,
        name,
        rangeName,
        difficulty,
        trailType,
        exposure
      ].join(' ')).toLowerCase();

      out.push({
        slug,
        name,
        lat,
        lng,
        rangeName,
        rangeKey,
        elevation,
        prominence,
        difficulty: difficulty || t('nh48Map.unknown'),
        trailType: trailType || t('nh48Map.unknown'),
        exposure: exposure || t('nh48Map.unknown'),
        thumb,
        popupImage,
        peakUrl,
        searchIndex
      });
    });
    return out;
  };

  async function fetchPeakData() {
    let lastError = null;
    for (const url of DATA_URLS) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Unable to load nh48.json');
  }

  const debounce = (fn, waitMs) => {
    let timer = null;
    return (...args) => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), waitMs);
    };
  };

  const setLoading = (isLoading) => {
    if (!refs.loading) return;
    refs.loading.hidden = !isLoading;
    if (isLoading) refs.loading.textContent = t('nh48Map.loading');
  };

  const setError = (message) => {
    if (!refs.error) return;
    refs.error.hidden = !message;
    refs.error.textContent = message || '';
  };

  function renderPopupHtml(peak) {
    const rangeLabel = t('nh48Map.popupRange');
    const elevationLabel = t('nh48Map.popupElevation');
    const prominenceLabel = t('nh48Map.popupProminence');
    const openPeakLabel = t('nh48Map.openPeak');
    return `
      <div class="nh48-map-popup">
        <img src="${escapeHtml(peak.popupImage || DEFAULT_IMAGE)}" alt="${escapeHtml(peak.name)}" loading="lazy" decoding="async" />
        <strong>${escapeHtml(peak.name)}</strong>
        <div class="meta">${escapeHtml(rangeLabel)}: ${escapeHtml(peak.rangeName)}</div>
        <div class="meta">${escapeHtml(elevationLabel)}: ${escapeHtml(formatFeet(peak.elevation))}</div>
        <div class="meta">${escapeHtml(prominenceLabel)}: ${escapeHtml(formatFeet(peak.prominence))}</div>
        <a href="${escapeHtml(peak.peakUrl)}">${escapeHtml(openPeakLabel)}</a>
      </div>
    `;
  }

  function renderDetail(peak) {
    if (!refs.detail) return;
    if (!peak) {
      refs.detail.innerHTML = `
        <img class="nh48-map-detail-media" src="${DEFAULT_IMAGE}" alt="NH48 map preview" loading="lazy" decoding="async" />
        <div class="nh48-map-detail-body">
          <h2>${escapeHtml(t('nh48Map.detailFallbackTitle'))}</h2>
          <p class="nh48-map-detail-sub">${escapeHtml(t('nh48Map.detailFallbackBody'))}</p>
        </div>
      `;
      return;
    }
    refs.detail.innerHTML = `
      <img class="nh48-map-detail-media" src="${escapeHtml(peak.thumb || DEFAULT_IMAGE)}" alt="${escapeHtml(peak.name)}" loading="lazy" decoding="async" />
      <div class="nh48-map-detail-body">
        <h2>${escapeHtml(peak.name)}</h2>
        <p class="nh48-map-detail-sub">${escapeHtml(peak.rangeName)}</p>
        <dl class="nh48-map-detail-grid">
          <div class="nh48-map-detail-item">
            <dt>${escapeHtml(t('nh48Map.detailElevation'))}</dt>
            <dd>${escapeHtml(formatFeet(peak.elevation))}</dd>
          </div>
          <div class="nh48-map-detail-item">
            <dt>${escapeHtml(t('nh48Map.detailProminence'))}</dt>
            <dd>${escapeHtml(formatFeet(peak.prominence))}</dd>
          </div>
          <div class="nh48-map-detail-item">
            <dt>${escapeHtml(t('nh48Map.detailRange'))}</dt>
            <dd>${escapeHtml(peak.rangeName)}</dd>
          </div>
          <div class="nh48-map-detail-item">
            <dt>${escapeHtml(t('nh48Map.detailDifficulty'))}</dt>
            <dd>${escapeHtml(peak.difficulty)}</dd>
          </div>
          <div class="nh48-map-detail-item">
            <dt>${escapeHtml(t('nh48Map.detailTrailType'))}</dt>
            <dd>${escapeHtml(peak.trailType)}</dd>
          </div>
          <div class="nh48-map-detail-item">
            <dt>${escapeHtml(t('nh48Map.detailExposure'))}</dt>
            <dd>${escapeHtml(peak.exposure)}</dd>
          </div>
        </dl>
        <a class="nh48-map-detail-link" href="${escapeHtml(peak.peakUrl)}">${escapeHtml(t('nh48Map.openPeak'))}</a>
      </div>
    `;
  }

  function updateMarkerStyles() {
    const visible = new Set(state.filtered.map((peak) => peak.slug));
    state.markersBySlug.forEach((marker, slug) => {
      if (!marker || !marker.setStyle) return;
      if (slug === state.selectedSlug) {
        marker.setStyle(MARKER_STYLE_SELECTED);
        if (marker.bringToFront) marker.bringToFront();
        return;
      }
      if (visible.has(slug)) {
        marker.setStyle(MARKER_STYLE_ACTIVE);
      } else {
        marker.setStyle(MARKER_STYLE_MUTED);
      }
    });
  }

  function renderPeakList() {
    if (!refs.list) return;
    refs.list.innerHTML = '';

    if (!state.filtered.length) {
      refs.list.innerHTML = `<li class="nh48-map-list-meta">${escapeHtml(t('nh48Map.noResults'))}</li>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    state.filtered.forEach((peak) => {
      const item = document.createElement('li');
      item.innerHTML = `
        <button type="button" data-slug="${escapeHtml(peak.slug)}" class="${peak.slug === state.selectedSlug ? 'is-active' : ''}">
          <div class="nh48-map-list-name">${escapeHtml(peak.name)}</div>
          <div class="nh48-map-list-meta">${escapeHtml(peak.rangeName)} - ${escapeHtml(formatFeet(peak.elevation))}</div>
        </button>
      `;
      fragment.appendChild(item);
    });
    refs.list.appendChild(fragment);
  }

  function sortPeaks(peaks, sortValue) {
    const list = [...peaks];
    if (sortValue === 'elevation_desc') {
      list.sort((a, b) => {
        const aVal = Number.isFinite(a.elevation) ? a.elevation : -Infinity;
        const bVal = Number.isFinite(b.elevation) ? b.elevation : -Infinity;
        if (bVal === aVal) return a.name.localeCompare(b.name);
        return bVal - aVal;
      });
      return list;
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }

  function applyFilters() {
    const query = normalizeText(state.query).toLowerCase();
    const filtered = state.peaks.filter((peak) => {
      if (state.activeRange && peak.rangeKey !== state.activeRange) return false;
      if (query && !peak.searchIndex.includes(query)) return false;
      return true;
    });

    state.filtered = sortPeaks(filtered, state.sort);
    if (!state.filtered.some((peak) => peak.slug === state.selectedSlug)) {
      state.selectedSlug = state.filtered[0]?.slug || '';
    }

    renderPeakList();
    updateMarkerStyles();
    renderDetail(state.bySlug.get(state.selectedSlug) || null);
    renderWeatherScalarLayer();
    renderWeatherLegend();
  }

  function renderRangeControls() {
    if (!refs.rangeFilter || !refs.rangeChips) return;
    const selectedRange = state.activeRange;

    refs.rangeFilter.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = t('nh48Map.rangeAll');
    refs.rangeFilter.appendChild(allOption);

    state.ranges.forEach((entry) => {
      const option = document.createElement('option');
      option.value = entry.key;
      option.textContent = entry.label;
      refs.rangeFilter.appendChild(option);
    });
    refs.rangeFilter.value = selectedRange;

    const chips = state.ranges.slice(0, 10);
    refs.rangeChips.innerHTML = '';
    chips.forEach((entry) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nh48-map-range-chip';
      button.dataset.range = entry.key;
      button.textContent = `${entry.label} (${entry.count})`;
      button.setAttribute('aria-pressed', entry.key === selectedRange ? 'true' : 'false');
      refs.rangeChips.appendChild(button);
    });
  }

  function refreshPopupContent() {
    state.markersBySlug.forEach((marker, slug) => {
      const peak = state.bySlug.get(slug);
      if (!peak || !marker?.setPopupContent) return;
      marker.setPopupContent(renderPopupHtml(peak));
    });
  }

  function selectPeak(slug, options = {}) {
    const peak = state.bySlug.get(slug);
    if (!peak) return;
    state.selectedSlug = slug;
    renderPeakList();
    renderDetail(peak);
    updateMarkerStyles();

    const marker = state.markersBySlug.get(slug);
    if (!marker || !state.map) {
      renderWeatherScalarLayer();
      renderWeatherLegend();
      return;
    }

    const shouldFly = options.fly !== false;
    const shouldOpenPopup = options.openPopup !== false;
    if (shouldFly) {
      const zoomTarget = Math.max(state.map.getZoom(), 10);
      state.map.flyTo([peak.lat, peak.lng], zoomTarget, { duration: 0.45 });
    }
    if (shouldOpenPopup && marker.openPopup) {
      marker.openPopup();
    }

    renderWeatherScalarLayer();
    renderWeatherLegend();
  }

  function buildRangeEntries(peaks) {
    const counts = new Map();
    peaks.forEach((peak) => {
      const prev = counts.get(peak.rangeKey) || { key: peak.rangeKey, label: peak.rangeName, count: 0 };
      prev.count += 1;
      counts.set(peak.rangeKey, prev);
    });
    return [...counts.values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  function setPanelCollapsed(collapsed) {
    state.panelCollapsed = Boolean(collapsed);
    document.body.classList.toggle('nh48-map-panel-collapsed', state.panelCollapsed);
    if (refs.panelExpand) refs.panelExpand.hidden = !state.panelCollapsed;
    if (refs.panelToggle) refs.panelToggle.textContent = state.panelCollapsed ? t('nh48Map.showPanel') : t('nh48Map.hidePanel');
    window.setTimeout(() => {
      if (state.map) state.map.invalidateSize();
      renderWeatherScalarLayer();
    }, 220);
  }

  function syncViewportAndMapSize() {
    const root = document.documentElement;
    root.style.setProperty('--nh48-map-vh', `${window.innerHeight}px`);
    const nav = document.querySelector('.site-nav');
    const navHeight = nav ? Math.ceil(nav.getBoundingClientRect().height) : 0;
    root.style.setProperty('--nh48-nav-h', `${navHeight}px`);
    if (state.map) {
      requestAnimationFrame(() => {
        state.map.invalidateSize();
        renderWeatherScalarLayer();
      });
    }
  }

  function initMap() {
    const topoLabel = t('nh48Map.layerTopo');
    const standardLabel = t('nh48Map.layerStandard');
    const topoLayer = L.tileLayer('/api/tiles/opentopo/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenTopoMap contributors'
    });
    const standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    });

    state.map = L.map('nh48Map', {
      layers: [topoLayer],
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([44.1, -71.35], 8);

    const weatherTilePane = state.map.createPane('weatherTilePane');
    weatherTilePane.style.zIndex = '330';
    const weatherPolygonPane = state.map.createPane('weatherPolygonPane');
    weatherPolygonPane.style.zIndex = '420';
    const weatherScalarPane = state.map.createPane('weatherScalarPane');
    weatherScalarPane.style.zIndex = '580';
    const markerPane = state.map.createPane('nh48MarkerPane');
    markerPane.style.zIndex = '660';

    state.layerControl = L.control.layers(
      {
        [topoLabel]: topoLayer,
        [standardLabel]: standardLayer
      },
      null,
      { position: 'topright' }
    ).addTo(state.map);
    L.control.scale({ position: 'bottomleft' }).addTo(state.map);

    state.markerLayer = L.layerGroup().addTo(state.map);
    state.weather.layerHandles.scalarLayer = L.layerGroup().addTo(state.map);
  }

  function renderMarkers() {
    if (!state.markerLayer || !state.map) return;
    state.markerLayer.clearLayers();
    state.markersBySlug.clear();

    state.peaks.forEach((peak) => {
      const marker = L.circleMarker([peak.lat, peak.lng], {
        ...MARKER_STYLE_ACTIVE,
        pane: 'nh48MarkerPane'
      });
      marker.bindPopup(renderPopupHtml(peak), { maxWidth: 280, closeButton: true });
      marker.on('click', () => {
        selectPeak(peak.slug, { fly: false, openPopup: false });
      });
      marker.addTo(state.markerLayer);
      state.markersBySlug.set(peak.slug, marker);
    });

    const markers = [...state.markersBySlug.values()];
    if (markers.length) {
      const group = L.featureGroup(markers);
      state.map.fitBounds(group.getBounds(), { padding: [40, 40] });
    }
  }

  function getOverlayById(overlayId) {
    return WEATHER_OVERLAY_BY_ID.get(overlayId) || null;
  }

  function getActiveOverlays() {
    return [...state.weather.activeOverlayIds]
      .map((overlayId) => getOverlayById(overlayId))
      .filter(Boolean);
  }

  function getActiveScalarOverlays() {
    return getActiveOverlays().filter((overlay) => overlay.type === 'scalar');
  }

  function getOverlayLabel(descriptor) {
    return t(descriptor.labelKey);
  }

  function getWeatherStatusLabel(statusKey) {
    return t(`nh48Map.weather.status.${statusKey}`);
  }

  function setOverlayStatus(overlayId, status, message = '') {
    if (!overlayId || !WEATHER_OVERLAY_BY_ID.has(overlayId)) return;
    state.weather.statusByOverlay.set(overlayId, status);
    if (message) {
      state.weather.errorsByOverlay.set(overlayId, message);
    } else if (status !== 'error') {
      state.weather.errorsByOverlay.delete(overlayId);
    }
  }

  function setOverlayStatuses(overlayIds, status, message = '') {
    overlayIds.forEach((overlayId) => setOverlayStatus(overlayId, status, message));
  }

  function setWeatherPanelOpen(isOpen, options = {}) {
    state.weather.panelOpen = Boolean(isOpen);
    if (refs.weatherPanel) refs.weatherPanel.hidden = !state.weather.panelOpen;
    if (refs.weatherToggle) refs.weatherToggle.setAttribute('aria-expanded', state.weather.panelOpen ? 'true' : 'false');
    if (!options.silentTrack) {
      track('nh48_map_weather_panel_toggle', { open: state.weather.panelOpen });
    }
  }

  function updateWeatherPanelSummary() {
    if (!refs.weatherPanelStatus) return;
    refs.weatherPanelStatus.textContent = t('nh48Map.weather.statusSummary', {
      count: state.weather.draftOverlayIds.size
    });
  }

  function renderWeatherControlValues() {
    if (refs.weatherUnits) refs.weatherUnits.value = state.weather.unitSystem;
    if (refs.weatherHourOffset) refs.weatherHourOffset.value = String(state.weather.hourOffset);
    if (refs.weatherToggle) refs.weatherToggle.textContent = t('nh48Map.weather.toggle');
    if (refs.weatherApply) refs.weatherApply.textContent = t('nh48Map.weather.apply');
    updateWeatherPanelSummary();
  }

  function renderWeatherOverlayList() {
    if (!refs.weatherOverlayList) return;
    const query = normalizeText(state.weather.overlaySearch).toLowerCase();
    const grouped = new Map();

    WEATHER_OVERLAYS.forEach((descriptor) => {
      const label = getOverlayLabel(descriptor);
      const categoryLabel = t(descriptor.categoryKey);
      const haystack = `${label} ${categoryLabel} ${descriptor.provider}`.toLowerCase();
      if (query && !haystack.includes(query)) return;
      if (!grouped.has(descriptor.categoryKey)) {
        grouped.set(descriptor.categoryKey, []);
      }
      grouped.get(descriptor.categoryKey).push(descriptor);
    });

    refs.weatherOverlayList.innerHTML = '';

    if (!grouped.size) {
      const empty = document.createElement('p');
      empty.className = 'nh48-weather-empty';
      empty.textContent = t('nh48Map.weather.noMatches');
      refs.weatherOverlayList.appendChild(empty);
      return;
    }

    const categoryKeys = [...grouped.keys()].sort((a, b) => t(a).localeCompare(t(b)));
    categoryKeys.forEach((categoryKey) => {
      const section = document.createElement('section');
      section.className = 'nh48-weather-group';

      const heading = document.createElement('h3');
      heading.textContent = t(categoryKey);
      section.appendChild(heading);

      const list = document.createElement('ul');
      list.className = 'nh48-weather-list';

      const overlays = grouped.get(categoryKey).sort((a, b) => getOverlayLabel(a).localeCompare(getOverlayLabel(b)));
      overlays.forEach((descriptor) => {
        const checked = state.weather.draftOverlayIds.has(descriptor.id);
        const status = state.weather.statusByOverlay.get(descriptor.id) || 'idle';
        const statusLabel = getWeatherStatusLabel(status);
        const errorText = state.weather.errorsByOverlay.get(descriptor.id) || '';

        const item = document.createElement('li');
        item.className = 'nh48-weather-item';
        item.innerHTML = `
          <label class="nh48-weather-item-label">
            <input type="checkbox" data-overlay-id="${escapeHtml(descriptor.id)}" ${checked ? 'checked' : ''} />
            <span class="nh48-weather-item-main">
              <span class="nh48-weather-item-name">${escapeHtml(getOverlayLabel(descriptor))}</span>
              <span class="nh48-weather-item-meta">${escapeHtml(descriptor.provider)}</span>
            </span>
            <span class="nh48-weather-item-status is-${escapeHtml(status)}">${escapeHtml(statusLabel)}</span>
          </label>
          ${errorText ? `<p class="nh48-weather-item-error">${escapeHtml(errorText)}</p>` : ''}
        `;
        list.appendChild(item);
      });

      section.appendChild(list);
      refs.weatherOverlayList.appendChild(section);
    });
  }

  function removeRadarLayer() {
    if (state.weather.layerHandles.radarLayer && state.map) {
      state.map.removeLayer(state.weather.layerHandles.radarLayer);
    }
    state.weather.layerHandles.radarLayer = null;
  }

  function removeAlertsLayer() {
    if (state.weather.layerHandles.alertsLayer && state.map) {
      state.map.removeLayer(state.weather.layerHandles.alertsLayer);
    }
    state.weather.layerHandles.alertsLayer = null;
    state.weather.alertsGeoJson = null;
  }

  function clearScalarLayer() {
    if (state.weather.layerHandles.scalarLayer) {
      state.weather.layerHandles.scalarLayer.clearLayers();
    }
    state.weather.legendData = [];
  }

  function clearAllWeatherLayers() {
    removeRadarLayer();
    removeAlertsLayer();
    clearScalarLayer();
  }

  function getCachedWeatherEntry(cacheKey) {
    return state.weather.cache.get(cacheKey) || null;
  }

  function setCachedWeatherEntry(cacheKey, data, ttlMs) {
    state.weather.cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + ttlMs
    });
  }

  async function fetchJsonWithCache(cacheKey, ttlMs, fetcher) {
    const cached = getCachedWeatherEntry(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { data: cached.data, source: 'cache', stale: false };
    }

    const data = await fetcher();
    setCachedWeatherEntry(cacheKey, data, ttlMs);
    return { data, source: 'live', stale: false };
  }

  function getScalarMetricValue(peakSlug, descriptor) {
    const point = state.weather.scalarPointsBySlug.get(peakSlug);
    if (!point || !point.values || typeof point.values !== 'object') return null;
    const value = point.values[descriptor.variableKey];
    return Number.isFinite(Number(value)) ? Number(value) : null;
  }

  function convertMetricToDisplay(descriptor, metricValue) {
    if (!Number.isFinite(Number(metricValue))) return null;
    const value = Number(metricValue);
    const toImperial = state.weather.unitSystem === 'imperial';

    switch (descriptor.variableKey) {
      case 'temperature_2m':
      case 'apparent_temperature':
        return toImperial ? (value * 9) / 5 + 32 : value;
      case 'wind_speed_10m':
      case 'wind_gusts_10m':
        return toImperial ? value * 0.621371 : value;
      case 'precipitation':
        return toImperial ? value * 0.0393701 : value;
      case 'snow_depth':
        return toImperial ? value * 39.3701 : value;
      case 'snowfall':
        return toImperial ? value * 0.393701 : value;
      case 'relative_humidity_2m':
      default:
        return value;
    }
  }

  function convertMetricSpanToDisplay(descriptor, metricSpan) {
    if (!Number.isFinite(Number(metricSpan))) return null;
    const span = Number(metricSpan);
    const toImperial = state.weather.unitSystem === 'imperial';

    switch (descriptor.variableKey) {
      case 'temperature_2m':
      case 'apparent_temperature':
        return toImperial ? (span * 9) / 5 : span;
      case 'wind_speed_10m':
      case 'wind_gusts_10m':
        return toImperial ? span * 0.621371 : span;
      case 'precipitation':
        return toImperial ? span * 0.0393701 : span;
      case 'snow_depth':
        return toImperial ? span * 39.3701 : span;
      case 'snowfall':
        return toImperial ? span * 0.393701 : span;
      case 'relative_humidity_2m':
      default:
        return span;
    }
  }

  function convertMetricDomainToDisplay(descriptor, metricDomain) {
    if (!metricDomain || typeof metricDomain !== 'object') return null;
    const min = convertMetricToDisplay(descriptor, metricDomain.min);
    const max = convertMetricToDisplay(descriptor, metricDomain.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { min, max };
  }

  function getOverlayUnit(descriptor) {
    if (!descriptor?.units) return '';
    return descriptor.units[state.weather.unitSystem] || descriptor.units.metric || '';
  }

  function formatOverlayValue(descriptor, displayValue) {
    if (!Number.isFinite(Number(displayValue))) return t('nh48Map.unknown');
    const numeric = Number(displayValue);
    let decimals = 1;

    switch (descriptor.variableKey) {
      case 'relative_humidity_2m':
        decimals = 0;
        break;
      case 'precipitation':
      case 'snowfall':
        decimals = 2;
        break;
      case 'snow_depth':
        decimals = state.weather.unitSystem === 'metric' ? 2 : 1;
        break;
      case 'wind_speed_10m':
      case 'wind_gusts_10m':
        decimals = 1;
        break;
      default:
        decimals = 1;
    }

    const localized = numeric.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });

    const unit = getOverlayUnit(descriptor);
    if (!unit) return localized;
    if (unit === '%') return `${localized}%`;
    return `${localized}${unit}`;
  }

  function quantile(values, q) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (sorted.length - 1) * q;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  function computeOverlayDomain(descriptor, values, selectedValue) {
    if (!Array.isArray(values) || !values.length) return null;
    const validValues = values.filter((value) => Number.isFinite(value));
    if (!validValues.length) return null;

    const q10 = quantile(validValues, 0.1);
    const q90 = quantile(validValues, 0.9);
    const median = quantile(validValues, 0.5);
    const anchor = Number.isFinite(selectedValue) ? selectedValue : median;
    const minSpanBase = Number.isFinite(descriptor.minSpanMetric) ? descriptor.minSpanMetric : 1;
    const minSpan = convertMetricSpanToDisplay(descriptor, minSpanBase) || minSpanBase;

    let span = Math.max(
      Math.abs(q90 - anchor),
      Math.abs(anchor - q10),
      minSpan
    );

    if (!Number.isFinite(span) || span <= 0) {
      span = minSpan || 1;
    }

    let minValue = anchor - span;
    let maxValue = anchor + span;

    const absoluteDomain = convertMetricDomainToDisplay(descriptor, descriptor.absoluteDomainMetric);
    if (absoluteDomain) {
      minValue = Math.max(minValue, absoluteDomain.min);
      maxValue = Math.min(maxValue, absoluteDomain.max);
      if (minValue >= maxValue) {
        minValue = absoluteDomain.min;
        maxValue = absoluteDomain.max;
      }
    }

    if (minValue === maxValue) {
      maxValue += minSpan || 1;
    }

    return {
      domain: [minValue, maxValue],
      anchor
    };
  }

  function hexToRgb(hex) {
    const clean = String(hex || '').replace('#', '').trim();
    if (clean.length !== 6) return { r: 255, g: 255, b: 255 };
    return {
      r: Number.parseInt(clean.slice(0, 2), 16),
      g: Number.parseInt(clean.slice(2, 4), 16),
      b: Number.parseInt(clean.slice(4, 6), 16)
    };
  }

  function rgbToHex(r, g, b) {
    const toHex = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function interpolateColor(colorA, colorB, tValue) {
    const start = hexToRgb(colorA);
    const end = hexToRgb(colorB);
    const tVal = clampNumber(tValue, 0, 1, 0);
    return rgbToHex(
      start.r + (end.r - start.r) * tVal,
      start.g + (end.g - start.g) * tVal,
      start.b + (end.b - start.b) * tVal
    );
  }

  function getPaletteColor(descriptor, value, domain) {
    const palette = Array.isArray(descriptor.palette) && descriptor.palette.length >= 2
      ? descriptor.palette
      : ['#e2e8f0', '#0ea5e9'];

    const minValue = Number(domain[0]);
    const maxValue = Number(domain[1]);
    const span = maxValue - minValue;
    if (!Number.isFinite(span) || span <= 0) return palette[0];

    const tVal = clampNumber((value - minValue) / span, 0, 1, 0);
    const scaled = tVal * (palette.length - 1);
    const index = Math.floor(scaled);
    const nextIndex = Math.min(palette.length - 1, index + 1);
    const localT = scaled - index;
    return interpolateColor(palette[index], palette[nextIndex], localT);
  }

  function getOffsetLatLng(lat, lng, overlayIndex, totalOverlays) {
    if (!state.map) return L.latLng(lat, lng);
    const basePoint = state.map.latLngToContainerPoint([lat, lng]);
    const total = Math.max(totalOverlays, 1);
    const angle = ((overlayIndex % total) / total) * Math.PI * 2 - Math.PI / 2;
    const radius = 12 + Math.floor(overlayIndex / 8) * 8;
    const point = L.point(
      basePoint.x + Math.cos(angle) * radius,
      basePoint.y + Math.sin(angle) * radius
    );
    return state.map.containerPointToLatLng(point);
  }

  async function fetchScalarOverlayData(signal) {
    const scalarOverlays = getActiveScalarOverlays();
    if (!scalarOverlays.length) {
      state.weather.scalarPayload = null;
      state.weather.scalarPointsBySlug.clear();
      clearScalarLayer();
      return;
    }

    const overlayIds = scalarOverlays.map((overlay) => overlay.id);
    setOverlayStatuses(overlayIds, 'loading');

    const points = state.peaks.slice(0, WEATHER_ENDPOINT_MAX_POINTS);
    const slugCsv = points.map((peak) => encodeURIComponent(peak.slug)).join(',');
    const latCsv = points.map((peak) => peak.lat.toFixed(6)).join(',');
    const lonCsv = points.map((peak) => peak.lng.toFixed(6)).join(',');
    const hourOffset = clampNumber(state.weather.hourOffset, 0, 48, 0);

    const endpoint = `/api/weather/open-meteo?slugs=${slugCsv}&lat=${latCsv}&lon=${lonCsv}&hour_offset=${hourOffset}`;
    const cacheKey = `openMeteo:${hourOffset}`;

    let payload = null;

    try {
      const result = await fetchJsonWithCache(cacheKey, WEATHER_CACHE_TTL_MS, async () => {
        const response = await fetch(endpoint, { signal, cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      });
      payload = result.data;
      persistScalarPayload(payload);
      setOverlayStatuses(overlayIds, 'live');
    } catch (err) {
      const cachedLocal = loadScalarPayloadFromStorage();
      if (cachedLocal) {
        payload = cachedLocal;
        setOverlayStatuses(overlayIds, 'stale');
      } else {
        const message = t('nh48Map.weather.errorGeneric');
        setOverlayStatuses(overlayIds, 'error', message);
        overlayIds.forEach((overlayId) => {
          track('nh48_map_weather_overlay_error', {
            overlay_id: overlayId,
            reason: String(err?.message || 'scalar_fetch_failed')
          });
        });
        return;
      }
    }

    if (!payload || typeof payload !== 'object') {
      const message = t('nh48Map.weather.errorGeneric');
      setOverlayStatuses(overlayIds, 'error', message);
      return;
    }

    state.weather.scalarPayload = payload;
    const pointsArray = Array.isArray(payload.points) ? payload.points : [];
    const pointsBySlug = new Map();
    pointsArray.forEach((point) => {
      const slug = normalizeText(point?.slug);
      if (!slug) return;
      pointsBySlug.set(slug, point);
    });
    state.weather.scalarPointsBySlug = pointsBySlug;
  }

  async function ensureRadarLayer(signal) {
    const radarDescriptor = getOverlayById('radar');
    if (!state.weather.activeOverlayIds.has('radar')) {
      removeRadarLayer();
      setOverlayStatus('radar', 'idle');
      return;
    }

    setOverlayStatus('radar', 'loading');
    const cacheKey = 'radar-meta';
    let meta = null;

    try {
      const result = await fetchJsonWithCache(cacheKey, WEATHER_RADAR_META_TTL_MS, async () => {
        const response = await fetch('/api/weather/radar/meta', { signal, cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      });
      meta = result.data;
    } catch (err) {
      setOverlayStatus('radar', 'error', t('nh48Map.weather.errorRadarMeta'));
      track('nh48_map_weather_overlay_error', {
        overlay_id: 'radar',
        reason: String(err?.message || 'radar_meta_failed')
      });
      removeRadarLayer();
      return;
    }

    if (!meta || typeof meta !== 'object') {
      setOverlayStatus('radar', 'error', t('nh48Map.weather.errorRadarMeta'));
      removeRadarLayer();
      return;
    }

    state.weather.radarMeta = meta;
    removeRadarLayer();

    if (meta.mode === 'tile' && Number.isFinite(Number(meta.timestamp))) {
      const timestamp = Number(meta.timestamp);
      const tileUrl = `/api/weather/radar/tile/${timestamp}/{z}/{x}/{y}.png`;
      state.weather.layerHandles.radarLayer = L.tileLayer(tileUrl, {
        pane: 'weatherTilePane',
        opacity: radarDescriptor?.defaultOpacity || 0.65,
        attribution: '&copy; RainViewer'
      }).addTo(state.map);
      setOverlayStatus('radar', 'live');
      return;
    }

    const fallback = meta.fallback?.wms || meta.wms;
    if (fallback?.url && fallback?.layers) {
      state.weather.layerHandles.radarLayer = L.tileLayer.wms(fallback.url, {
        layers: fallback.layers,
        format: fallback.format || 'image/png',
        transparent: true,
        pane: 'weatherTilePane',
        opacity: radarDescriptor?.defaultOpacity || 0.65,
        attribution: '&copy; NOAA OpenGeo'
      }).addTo(state.map);
      setOverlayStatus('radar', 'stale');
      return;
    }

    setOverlayStatus('radar', 'error', t('nh48Map.weather.errorRadarMeta'));
  }

  function severityColor(severityText) {
    const level = normalizeText(severityText).toLowerCase();
    if (level === 'extreme') return '#991b1b';
    if (level === 'severe') return '#b45309';
    if (level === 'moderate') return '#1d4ed8';
    if (level === 'minor') return '#0f766e';
    return '#475569';
  }

  function formatAlertExpiry(value) {
    if (!value) return t('nh48Map.unknown');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  async function ensureAlertsLayer(signal) {
    if (!state.weather.activeOverlayIds.has('alerts')) {
      removeAlertsLayer();
      setOverlayStatus('alerts', 'idle');
      return;
    }

    if (!state.map) return;
    setOverlayStatus('alerts', 'loading');

    const bounds = state.map.getBounds();
    const bbox = [
      bounds.getWest().toFixed(4),
      bounds.getSouth().toFixed(4),
      bounds.getEast().toFixed(4),
      bounds.getNorth().toFixed(4)
    ].join(',');

    const cacheKey = `alerts:${bbox}`;
    let payload = null;

    try {
      const result = await fetchJsonWithCache(cacheKey, WEATHER_ALERTS_TTL_MS, async () => {
        const response = await fetch(`/api/weather/alerts?bbox=${encodeURIComponent(bbox)}`, {
          signal,
          cache: 'no-store'
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      });
      payload = result.data;
    } catch (err) {
      if (state.weather.alertsGeoJson && state.weather.layerHandles.alertsLayer) {
        setOverlayStatus('alerts', 'stale');
      } else {
        setOverlayStatus('alerts', 'error', t('nh48Map.weather.errorAlerts'));
      }
      track('nh48_map_weather_overlay_error', {
        overlay_id: 'alerts',
        reason: String(err?.message || 'alerts_fetch_failed')
      });
      return;
    }

    const features = Array.isArray(payload?.features) ? payload.features : [];
    state.weather.alertsGeoJson = {
      type: 'FeatureCollection',
      features
    };

    removeAlertsLayer();
    state.weather.layerHandles.alertsLayer = L.geoJSON(state.weather.alertsGeoJson, {
      pane: 'weatherPolygonPane',
      style: (feature) => {
        const severity = feature?.properties?.severity;
        const color = severityColor(severity);
        return {
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.16,
          opacity: 0.95
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature?.properties || {};
        const severity = normalizeText(props.severity).toLowerCase();
        const severityLabel = t(`nh48Map.weather.alertSeverity.${severity}`);
        layer.bindPopup(`
          <div class="nh48-alert-popup">
            <strong>${escapeHtml(props.event || 'Alert')}</strong><br />
            <span>${escapeHtml(severityLabel)}</span><br />
            <span>${escapeHtml(props.headline || '')}</span><br />
            <span>${escapeHtml(formatAlertExpiry(props.expires))}</span>
          </div>
        `);
      }
    }).addTo(state.map);

    setOverlayStatus('alerts', 'live');
  }

  function renderWeatherScalarLayer() {
    if (!state.map || !state.weather.layerHandles.scalarLayer) return;
    clearScalarLayer();

    const scalarOverlays = getActiveScalarOverlays();
    if (!scalarOverlays.length || !state.weather.scalarPointsBySlug.size) {
      renderWeatherLegend();
      return;
    }

    const peaksToRender = state.filtered.length ? state.filtered : state.peaks;
    if (!peaksToRender.length) {
      renderWeatherLegend();
      return;
    }

    const selectedPeak = state.bySlug.get(state.selectedSlug) || null;
    const legendEntries = [];

    scalarOverlays.forEach((descriptor, overlayIndex) => {
      const values = [];
      const valueBySlug = new Map();

      peaksToRender.forEach((peak) => {
        const metricValue = getScalarMetricValue(peak.slug, descriptor);
        const displayValue = convertMetricToDisplay(descriptor, metricValue);
        if (!Number.isFinite(displayValue)) return;
        values.push(displayValue);
        valueBySlug.set(peak.slug, displayValue);
      });

      if (!values.length) return;

      const selectedMetricValue = selectedPeak ? getScalarMetricValue(selectedPeak.slug, descriptor) : null;
      const selectedDisplayValue = convertMetricToDisplay(descriptor, selectedMetricValue);
      const domainInfo = computeOverlayDomain(descriptor, values, selectedDisplayValue);
      if (!domainInfo) return;

      peaksToRender.forEach((peak) => {
        const displayValue = valueBySlug.get(peak.slug);
        if (!Number.isFinite(displayValue)) return;
        const markerColor = getPaletteColor(descriptor, displayValue, domainInfo.domain);
        const offsetLatLng = getOffsetLatLng(peak.lat, peak.lng, overlayIndex, scalarOverlays.length);

        const glyph = L.circleMarker(offsetLatLng, {
          pane: 'weatherScalarPane',
          radius: 4,
          color: 'rgba(15, 23, 42, 0.95)',
          weight: 1,
          fillColor: markerColor,
          fillOpacity: 0.95
        });

        const valueLabel = formatOverlayValue(descriptor, displayValue);
        const sourceLabel = t('nh48Map.weather.sourceLabel');
        glyph.bindTooltip(
          `<strong>${escapeHtml(peak.name)}</strong><br>${escapeHtml(getOverlayLabel(descriptor))}: ${escapeHtml(valueLabel)}<br>${escapeHtml(sourceLabel)}: ${escapeHtml(descriptor.provider)}`,
          { direction: 'top', opacity: 0.94, sticky: true }
        );

        glyph.on('click', () => {
          selectPeak(peak.slug, { fly: false, openPopup: true });
        });

        glyph.addTo(state.weather.layerHandles.scalarLayer);
      });

      legendEntries.push({
        overlayId: descriptor.id,
        label: getOverlayLabel(descriptor),
        palette: descriptor.palette,
        domain: domainInfo.domain,
        anchor: domainInfo.anchor,
        selectedPeakName: selectedPeak?.name || '',
        selectedValue: selectedDisplayValue,
        unit: getOverlayUnit(descriptor),
        source: descriptor.provider,
        updatedAt: state.weather.scalarPayload?.generatedAt || state.weather.scalarPayload?.updatedAt || '',
        status: state.weather.statusByOverlay.get(descriptor.id) || 'live',
        descriptor
      });
    });

    state.weather.legendData = legendEntries;
    renderWeatherLegend();
  }

  function formatLegendTimestamp(value) {
    if (!value) return t('nh48Map.unknown');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function buildPaletteGradient(palette) {
    if (!Array.isArray(palette) || !palette.length) return 'transparent';
    return `linear-gradient(90deg, ${palette.join(', ')})`;
  }

  function renderWeatherLegend() {
    if (!refs.weatherLegend) return;

    const activeOverlayIds = [...state.weather.activeOverlayIds];
    if (!activeOverlayIds.length) {
      refs.weatherLegend.hidden = true;
      refs.weatherLegend.innerHTML = '';
      return;
    }

    const cards = [];
    const rangeLabel = t('nh48Map.weather.legendRange');
    const anchorLabel = t('nh48Map.weather.legendAnchor');
    const selectedLabel = t('nh48Map.weather.legendSelected');
    const sourceLabel = t('nh48Map.weather.sourceLabel');
    const updatedLabel = t('nh48Map.weather.updatedLabel');

    state.weather.legendData.forEach((entry) => {
      const [minValue, maxValue] = entry.domain;
      const minLabel = formatOverlayValue(entry.descriptor, minValue);
      const anchorValueLabel = formatOverlayValue(entry.descriptor, entry.anchor);
      const maxLabel = formatOverlayValue(entry.descriptor, maxValue);
      const selectedValueLabel = Number.isFinite(entry.selectedValue)
        ? formatOverlayValue(entry.descriptor, entry.selectedValue)
        : t('nh48Map.unknown');
      const selectedPeakLabel = entry.selectedPeakName || t('nh48Map.unknown');

      cards.push(`
        <article class="nh48-weather-legend-card">
          <h3>${escapeHtml(entry.label)}</h3>
          <div class="nh48-weather-legend-bar" style="background:${escapeHtml(buildPaletteGradient(entry.palette))};"></div>
          <div class="nh48-weather-legend-ticks">
            <span>${escapeHtml(minLabel)}</span>
            <span>${escapeHtml(anchorValueLabel)}</span>
            <span>${escapeHtml(maxLabel)}</span>
          </div>
          <p class="nh48-weather-legend-row"><strong>${escapeHtml(rangeLabel)}:</strong> ${escapeHtml(minLabel)} to ${escapeHtml(maxLabel)}</p>
          <p class="nh48-weather-legend-row"><strong>${escapeHtml(anchorLabel)}:</strong> ${escapeHtml(anchorValueLabel)}</p>
          <p class="nh48-weather-legend-row"><strong>${escapeHtml(selectedLabel)}:</strong> ${escapeHtml(selectedPeakLabel)} - ${escapeHtml(selectedValueLabel)}</p>
          <p class="nh48-weather-legend-row"><strong>${escapeHtml(sourceLabel)}:</strong> ${escapeHtml(entry.source)}</p>
          <p class="nh48-weather-legend-row"><strong>${escapeHtml(updatedLabel)}:</strong> ${escapeHtml(formatLegendTimestamp(entry.updatedAt))}</p>
        </article>
      `);
    });

    if (state.weather.activeOverlayIds.has('radar')) {
      cards.push(`
        <article class="nh48-weather-legend-card">
          <h3>${escapeHtml(t('nh48Map.weather.overlay.radar'))}</h3>
          <p class="nh48-weather-legend-row">${escapeHtml(t('nh48Map.weather.legendRadar'))}</p>
          <p class="nh48-weather-legend-row"><strong>${escapeHtml(sourceLabel)}:</strong> ${escapeHtml(state.weather.radarMeta?.provider || 'rainviewer')}</p>
        </article>
      `);
    }

    if (state.weather.activeOverlayIds.has('alerts')) {
      cards.push(`
        <article class="nh48-weather-legend-card">
          <h3>${escapeHtml(t('nh48Map.weather.overlay.alerts'))}</h3>
          <p class="nh48-weather-legend-row">${escapeHtml(t('nh48Map.weather.legendAlerts'))}</p>
          <div class="nh48-weather-alert-key">
            <span class="swatch extreme"></span><span>${escapeHtml(t('nh48Map.weather.alertSeverity.extreme'))}</span>
            <span class="swatch severe"></span><span>${escapeHtml(t('nh48Map.weather.alertSeverity.severe'))}</span>
            <span class="swatch moderate"></span><span>${escapeHtml(t('nh48Map.weather.alertSeverity.moderate'))}</span>
            <span class="swatch minor"></span><span>${escapeHtml(t('nh48Map.weather.alertSeverity.minor'))}</span>
          </div>
        </article>
      `);
    }

    if (!cards.length) {
      refs.weatherLegend.hidden = true;
      refs.weatherLegend.innerHTML = '';
      return;
    }

    refs.weatherLegend.hidden = false;
    refs.weatherLegend.innerHTML = `
      <h2>${escapeHtml(t('nh48Map.weather.legendTitle'))}</h2>
      ${cards.join('')}
    `;
  }

  async function applyWeatherSelection(options = {}) {
    state.weather.activeOverlayIds = new Set(state.weather.draftOverlayIds);
    persistWeatherSettings();

    if (!options.silentTrack) {
      track('nh48_map_weather_apply', {
        overlay_count: state.weather.activeOverlayIds.size,
        unit_system: state.weather.unitSystem,
        hour_offset: state.weather.hourOffset
      });
    }

    if (state.weather.abortController) {
      state.weather.abortController.abort();
    }
    const controller = new AbortController();
    state.weather.abortController = controller;

    if (!state.weather.activeOverlayIds.size) {
      clearAllWeatherLayers();
      WEATHER_OVERLAYS.forEach((overlay) => {
        setOverlayStatus(overlay.id, 'idle');
      });
      renderWeatherOverlayList();
      renderWeatherLegend();
      updateWeatherPanelSummary();
      return;
    }

    const tasks = [];
    if (getActiveScalarOverlays().length) {
      tasks.push(fetchScalarOverlayData(controller.signal));
    } else {
      state.weather.scalarPayload = null;
      state.weather.scalarPointsBySlug.clear();
      clearScalarLayer();
    }

    tasks.push(ensureRadarLayer(controller.signal));
    tasks.push(ensureAlertsLayer(controller.signal));
    await Promise.all(tasks);

    if (controller.signal.aborted) return;

    renderWeatherScalarLayer();
    renderWeatherLegend();
    renderWeatherOverlayList();
    updateWeatherPanelSummary();
  }

  function resetDraftOverlays(nextIds) {
    state.weather.draftOverlayIds.clear();
    nextIds.forEach((overlayId) => {
      if (WEATHER_OVERLAY_BY_ID.has(overlayId)) {
        state.weather.draftOverlayIds.add(overlayId);
      }
    });
    renderWeatherOverlayList();
    updateWeatherPanelSummary();
    persistWeatherSettings();
  }

  function wireWeatherEvents() {
    if (refs.weatherToggle) {
      refs.weatherToggle.addEventListener('click', () => {
        setWeatherPanelOpen(!state.weather.panelOpen);
      });
    }

    if (refs.weatherClose) {
      refs.weatherClose.addEventListener('click', () => {
        setWeatherPanelOpen(false);
      });
    }

    if (refs.weatherSearch) {
      refs.weatherSearch.addEventListener('input', () => {
        state.weather.overlaySearch = refs.weatherSearch.value || '';
        renderWeatherOverlayList();
      });
    }

    if (refs.weatherOverlayList) {
      refs.weatherOverlayList.addEventListener('change', (event) => {
        const input = event.target.closest('input[type="checkbox"][data-overlay-id]');
        if (!input) return;
        const overlayId = input.getAttribute('data-overlay-id');
        if (!overlayId || !WEATHER_OVERLAY_BY_ID.has(overlayId)) return;

        if (input.checked) {
          state.weather.draftOverlayIds.add(overlayId);
        } else {
          state.weather.draftOverlayIds.delete(overlayId);
        }

        persistWeatherSettings();
        updateWeatherPanelSummary();
        track('nh48_map_weather_overlay_toggle', {
          overlay_id: overlayId,
          enabled: input.checked
        });
      });
    }

    if (refs.weatherSelectCore) {
      refs.weatherSelectCore.addEventListener('click', () => {
        resetDraftOverlays(WEATHER_CORE_OVERLAY_IDS);
      });
    }

    if (refs.weatherSelectAll) {
      refs.weatherSelectAll.addEventListener('click', () => {
        resetDraftOverlays(WEATHER_OVERLAYS.map((overlay) => overlay.id));
      });
    }

    if (refs.weatherClear) {
      refs.weatherClear.addEventListener('click', () => {
        resetDraftOverlays([]);
      });
    }

    if (refs.weatherUnits) {
      refs.weatherUnits.addEventListener('change', () => {
        state.weather.unitSystem = refs.weatherUnits.value === 'metric' ? 'metric' : 'imperial';
        persistWeatherSettings();
      });
    }

    if (refs.weatherHourOffset) {
      refs.weatherHourOffset.addEventListener('change', () => {
        state.weather.hourOffset = clampNumber(parseInt(refs.weatherHourOffset.value, 10), 0, 48, 0);
        persistWeatherSettings();
      });
    }

    if (refs.weatherApply) {
      refs.weatherApply.addEventListener('click', async () => {
        await applyWeatherSelection();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.weather.panelOpen) {
        setWeatherPanelOpen(false);
      }
    });
  }

  function wireEvents() {
    if (refs.list) {
      refs.list.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-slug]');
        if (!button) return;
        const slug = button.getAttribute('data-slug');
        if (!slug) return;
        track('nh48_map_select_peak', { source: 'list', peak_slug: slug });
        selectPeak(slug);
      });
    }

    if (refs.search) {
      const onSearch = debounce(() => {
        state.query = refs.search.value || '';
        applyFilters();
      }, SEARCH_DEBOUNCE_MS);
      refs.search.addEventListener('input', onSearch);
    }

    if (refs.rangeFilter) {
      refs.rangeFilter.addEventListener('change', () => {
        state.activeRange = refs.rangeFilter.value || '';
        applyFilters();
        renderRangeControls();
      });
    }

    if (refs.rangeChips) {
      refs.rangeChips.addEventListener('click', (event) => {
        const chip = event.target.closest('button[data-range]');
        if (!chip) return;
        const range = chip.getAttribute('data-range') || '';
        state.activeRange = state.activeRange === range ? '' : range;
        if (refs.rangeFilter) refs.rangeFilter.value = state.activeRange;
        applyFilters();
        renderRangeControls();
      });
    }

    if (refs.sort) {
      refs.sort.addEventListener('change', () => {
        state.sort = refs.sort.value === 'elevation_desc' ? 'elevation_desc' : 'name_asc';
        applyFilters();
      });
    }

    if (refs.panelToggle) {
      refs.panelToggle.addEventListener('click', () => {
        setPanelCollapsed(true);
      });
    }

    if (refs.panelExpand) {
      refs.panelExpand.addEventListener('click', () => {
        setPanelCollapsed(false);
      });
    }

    const syncDebounced = debounce(syncViewportAndMapSize, 90);
    window.addEventListener('resize', syncDebounced);
    window.addEventListener('orientationchange', () => {
      window.setTimeout(syncViewportAndMapSize, 40);
    });
    window.addEventListener('load', () => {
      syncViewportAndMapSize();
      window.setTimeout(syncViewportAndMapSize, 180);
    });

    if (window.ResizeObserver) {
      const nav = document.querySelector('.site-nav');
      if (nav) {
        const navObserver = new ResizeObserver(() => syncViewportAndMapSize());
        navObserver.observe(nav);
      }
      if (refs.panel) {
        const panelObserver = new ResizeObserver(() => {
          if (state.map) state.map.invalidateSize();
        });
        panelObserver.observe(refs.panel);
      }
    }

    if (state.map) {
      const onMapMove = debounce(() => {
        renderWeatherScalarLayer();
        if (state.weather.activeOverlayIds.has('alerts')) {
          const signal = state.weather.abortController && !state.weather.abortController.signal.aborted
            ? state.weather.abortController.signal
            : undefined;
          ensureAlertsLayer(signal);
        }
      }, 280);
      state.map.on('moveend zoomend', onMapMove);
    }

    wireWeatherEvents();
  }

  function refreshLocalizedControls() {
    if (refs.loading && !refs.loading.hidden) {
      refs.loading.textContent = t('nh48Map.loading');
    }
    if (refs.sort) {
      const nameOption = refs.sort.querySelector('option[value="name_asc"]');
      const elevOption = refs.sort.querySelector('option[value="elevation_desc"]');
      if (nameOption) nameOption.textContent = t('nh48Map.sortName');
      if (elevOption) elevOption.textContent = t('nh48Map.sortElevation');
    }
    renderRangeControls();
    renderWeatherControlValues();
    renderWeatherOverlayList();
    applyFilters();
    refreshPopupContent();
    renderWeatherLegend();
  }

  async function init() {
    if (!refs.shell) return;
    try {
      initMap();
      wireEvents();
      syncViewportAndMapSize();
      setLoading(true);
      setError('');

      const raw = await fetchPeakData();
      const peaks = buildPeakRecords(raw);
      if (!peaks.length) {
        throw new Error('No peaks with valid coordinates in nh48.json');
      }

      state.peaks = peaks;
      state.bySlug = new Map(peaks.map((peak) => [peak.slug, peak]));
      state.ranges = buildRangeEntries(peaks);
      state.filtered = [...peaks].sort((a, b) => a.name.localeCompare(b.name));
      state.selectedSlug = state.filtered[0]?.slug || '';

      renderMarkers();
      renderRangeControls();
      renderWeatherControlValues();
      renderWeatherOverlayList();
      setWeatherPanelOpen(false, { silentTrack: true });
      applyFilters();
      setPanelCollapsed(window.innerWidth < MOBILE_BREAKPOINT);
      setLoading(false);
      track('nh48_map_loaded', {
        peak_count: state.peaks.length,
        route_lang: IS_FRENCH_ROUTE ? 'fr' : 'en'
      });

      if (window.NH48_I18N?.onLangChange) {
        window.NH48_I18N.onLangChange(() => {
          refreshLocalizedControls();
        });
      }
    } catch (err) {
      console.error('[nh48-map] Failed to initialize map:', err);
      setLoading(false);
      setError(t('nh48Map.loadError'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
