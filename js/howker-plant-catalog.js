(() => {
  'use strict';

  const SITE_ORIGIN = 'https://nh48.info';
  const CATALOG_PATH = '/plant-catalog';
  const PAGE_SIZE = 20;
  const SORT_SEQUENCE = ['relevance', 'az', 'most_photographed'];
  const SORT_LABELS = {
    relevance: 'Relevance',
    az: 'A-Z',
    most_photographed: 'Most photographed',
  };
  const DEFAULT_STATE = Object.freeze({
    q: '',
    type: '',
    habitat_group: '',
    season_group: '',
    tag: '',
    sort: 'relevance',
    page: 1,
    view: 'grid',
  });

  const PLANT_ICON_API = window.HOWKER_PLANT_ICONS || null;
  const ICON_FALLBACK = '/assets/icons/plant-catalog-icons/plant.png';
  const LQ_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="#0f1320"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#a5b4c3" font-family="system-ui" font-size="22">image loading...</text></svg>'
  )}`;
  const PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="100%" height="100%" fill="#0f1320"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#a5b4c3" font-family="system-ui" font-size="22">image unavailable</text></svg>'
  )}`;
  const ROTATE_STEP_MS = 1800;
  const ROTATE_FADE_MS = 300;

  let plants = [];
  let indexData = { plants: {}, facets: {} };
  let current = [];
  let page = 1;
  let totalPages = 1;
  let state = { ...DEFAULT_STATE };
  let imgObserver = null;
  let rotateInterval = null;
  let rotateCursor = 0;
  let searchDebounce = null;

  const $ = (selector) => document.querySelector(selector);
  const grid = $('#grid');
  const canonicalLink = document.getElementById('canonical-link');
  const qEl = $('#q');
  const qMobileEl = $('#q-mobile');
  const typeEl = $('#type');
  const typeMobileEl = $('#type-mobile');
  const habitatGroupEl = $('#habitat-group');
  const habitatGroupMobileEl = $('#habitat-group-mobile');
  const seasonGroupEl = $('#season-group');
  const seasonGroupMobileEl = $('#season-group-mobile');
  const sortEl = $('#sort');
  const sortMobileEl = $('#sort-mobile');
  const clearFiltersBtn = $('#clear-filters');
  const mobileClearBtn = $('#mobile-clear-btn');
  const mobileSortBtn = $('#mobile-sort-btn');
  const mobileFiltersBtn = $('#mobile-filters-btn');
  const mobileFilterSheet = $('#mobile-filter-sheet');
  const mobileFilterBackdrop = $('#mobile-filter-backdrop');
  const mobileFilterClose = $('#mobile-filter-close');
  const quickTagsEl = $('#quick-tags');
  const activeFiltersEl = $('#active-filters');
  const resultSummaryEl = $('#result-summary');
  const pageListTop = document.getElementById('page-list-top');
  const pageListBot = document.getElementById('page-list-bot');
  const statsTop = document.getElementById('pager-stats-top');
  const statsBot = document.getElementById('pager-stats-bot');
  const themeToggle = document.getElementById('theme-toggle');
  const viewToggle = document.getElementById('view-toggle');
  const rotateToggle = document.getElementById('rotate-toggle');
  const compactToggle = document.getElementById('compact-toggle');
  const stickyToggle = document.getElementById('sticky-toggle');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsMediaQuery = window.matchMedia('(min-width: 760px)');
  const pageYear = document.getElementById('year');

  if (pageYear) {
    pageYear.textContent = new Date().getFullYear();
  }

  function trackAnalytics(name, params = {}) {
    if (window.NH48Analytics?.track) {
      window.NH48Analytics.track(name, params);
      return;
    }
    if (window.NH48_INFO_ANALYTICS?.logEvent) {
      window.NH48_INFO_ANALYTICS.logEvent(name, params);
    }
  }

  function emitPlantCatalogFilterChange(trigger) {
    trackAnalytics('plant_catalog_filter_change', {
      trigger,
      search_length: state.q.length,
      type: state.type,
      habitat_group: state.habitat_group,
      season_group: state.season_group,
      tag: state.tag,
      sort: state.sort,
      page: state.page,
      view: state.view,
    });
  }

  function normalizeSearchText(input) {
    return String(input || '')
      .toLowerCase()
      .replace(/[^\w\s/-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeToken(input) {
    return String(input || '')
      .trim()
      .toLowerCase()
      .replace(/[_/]+/g, '-')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function uniqueSorted(values) {
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  function parsePositiveInt(value, fallback = 1) {
    const parsed = Number.parseInt(String(value || ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function getImageSources(plant) {
    if (Array.isArray(plant?.imgs) && plant.imgs.length) {
      return plant.imgs.filter((src) => String(src || '').trim().length > 0);
    }
    if (String(plant?.img || '').trim()) {
      return [plant.img.trim()];
    }
    return [];
  }

  function getImageCount(plant) {
    return getImageSources(plant).length;
  }

  function deriveHabitatGroupFallback(plant) {
    const haystack = normalizeSearchText([plant.habitat, plant.teaser, plant.desc, plant.type].join(' '));
    if (/(bog|wetland|peat|fen|sphagnum|seep|stream|swamp)/.test(haystack)) return 'bog/wetland';
    if (/(alpine|subalpine|treeline|krummholz|tundra|summit)/.test(haystack)) return 'alpine';
    if (/(rock|rocky|ledge|talus|boulder|crevice|felsenmeer|cliff)/.test(haystack)) return 'rocky-ledges';
    if (/(forest|woods|woodland|understory|log|stump|shade|spruce-fir|conifer|hardwood)/.test(haystack)) {
      return 'forest-floor';
    }
    return 'mixed';
  }

  function deriveSeasonGroupFallback(plant) {
    const haystack = normalizeSearchText([plant.bloom, plant.teaser].join(' '));
    if (/(year-round|year round|non-flowering|non flowering)/.test(haystack)) return 'year-round';
    if (/(late summer|fall|autumn|august|september|october)/.test(haystack)) return 'late-summer/fall';
    if (/(july|summer|mid-june|mid june|june-july|june to july)/.test(haystack)) return 'summer';
    if (/(early summer|late may|may-june|may to june|june)/.test(haystack)) return 'early-summer';
    if (/(spring|april|may)/.test(haystack)) return 'spring';
    return 'summer';
  }

  function deriveCanonicalTagsFallback(plant) {
    const tags = new Set();
    const typeToken = normalizeToken(plant.type);
    if (typeToken) tags.add(typeToken.replace('-tree', 'tree'));
    const habitatGroup = deriveHabitatGroupFallback(plant);
    if (habitatGroup !== 'mixed') tags.add(habitatGroup);
    (plant.tags || []).forEach((raw) => {
      const token = normalizeToken(raw);
      if (!token) return;
      if (token.includes('berry')) tags.add('berries');
      if (token.includes('flower')) tags.add('flowers');
      if (token.includes('wind')) tags.add('wind-tolerant');
      if (token.includes('shade')) tags.add('shade');
      if (token.includes('evergreen')) tags.add('evergreen');
      if (token.includes('deciduous')) tags.add('deciduous');
      if (token.includes('rare')) tags.add('rare');
      if (token.includes('ground')) tags.add('groundcover');
    });
    if (!tags.size) tags.add('mixed');
    return Array.from(tags);
  }

  function getIndexEntry(plant) {
    const key = String(plant?.id || '').trim();
    const entry = key ? indexData?.plants?.[key] : null;
    if (entry && typeof entry === 'object') {
      return entry;
    }
    const canonicalTags = deriveCanonicalTagsFallback(plant);
    return {
      habitat_group: deriveHabitatGroupFallback(plant),
      season_group: deriveSeasonGroupFallback(plant),
      canonical_tags: canonicalTags,
      search_terms: uniqueSorted([
        plant.id,
        plant.common,
        plant.latin,
        plant.type,
        plant.habitat,
        plant.bloom,
        ...(plant.tags || []),
        ...canonicalTags,
      ].map((value) => String(value || '').toLowerCase())),
      has_gallery: getImageCount(plant) > 1,
      image_count: getImageCount(plant),
    };
  }

  function resolveSpeciesIconSrc(plant) {
    const resolved = PLANT_ICON_API?.resolveSpeciesIcon?.(plant);
    return String(resolved || '').trim() || ICON_FALLBACK;
  }

  function resolveFieldIconSrc(fieldKey) {
    const resolved = PLANT_ICON_API?.resolveFieldIcon?.(fieldKey);
    return String(resolved || '').trim() || ICON_FALLBACK;
  }

  function resolveTypeIconSrc(plant) {
    const resolved = PLANT_ICON_API?.resolveTypeIcon?.(plant);
    return String(resolved || '').trim() || resolveSpeciesIconSrc(plant);
  }

  function iconImageHTML(src, className) {
    const safeSrc = String(src || '').trim() || ICON_FALLBACK;
    return `<img class="${className}" src="${safeSrc}" alt="" aria-hidden="true" onerror="this.onerror=null;this.src='${ICON_FALLBACK}'">`;
  }

  function syncSettingsPanel() {
    if (!settingsPanel) return;
    settingsPanel.open = settingsMediaQuery.matches;
  }

  syncSettingsPanel();
  if (settingsMediaQuery.addEventListener) {
    settingsMediaQuery.addEventListener('change', syncSettingsPanel);
  } else if (settingsMediaQuery.addListener) {
    settingsMediaQuery.addListener(syncSettingsPanel);
  }

  function sanitizeState(input) {
    const next = {
      ...DEFAULT_STATE,
      ...input,
    };
    next.q = String(next.q || '').trim().slice(0, 120);
    next.type = String(next.type || '').trim();
    next.habitat_group = String(next.habitat_group || '').trim();
    next.season_group = String(next.season_group || '').trim();
    next.tag = normalizeToken(next.tag || '').replace(/-/g, '-');
    next.sort = SORT_SEQUENCE.includes(next.sort) ? next.sort : DEFAULT_STATE.sort;
    next.page = parsePositiveInt(next.page, DEFAULT_STATE.page);
    next.view = next.view === 'list' ? 'list' : 'grid';
    return next;
  }

  function parseStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return sanitizeState({
      q: params.get('q') || '',
      type: params.get('type') || '',
      habitat_group: params.get('habitat_group') || '',
      season_group: params.get('season_group') || '',
      tag: params.get('tag') || '',
      sort: params.get('sort') || DEFAULT_STATE.sort,
      page: params.get('page') || String(DEFAULT_STATE.page),
      view: params.get('view') || DEFAULT_STATE.view,
    });
  }

  function serializeStateToSearch(currentState, options = {}) {
    const includeDefaults = Boolean(options.includeDefaults);
    const params = new URLSearchParams();
    if (currentState.q) params.set('q', currentState.q);
    if (currentState.type) params.set('type', currentState.type);
    if (currentState.habitat_group) params.set('habitat_group', currentState.habitat_group);
    if (currentState.season_group) params.set('season_group', currentState.season_group);
    if (currentState.tag) params.set('tag', currentState.tag);
    if (includeDefaults || currentState.sort !== DEFAULT_STATE.sort) params.set('sort', currentState.sort);
    if (includeDefaults || currentState.page !== DEFAULT_STATE.page) params.set('page', String(currentState.page));
    if (includeDefaults || currentState.view !== DEFAULT_STATE.view) params.set('view', currentState.view);
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  function buildCatalogRelativeUrl(currentState, options = {}) {
    return `${CATALOG_PATH}${serializeStateToSearch(currentState, options)}`;
  }

  function updateCanonicalUrl() {
    if (!canonicalLink) return;
    canonicalLink.setAttribute('href', `${SITE_ORIGIN}${buildCatalogRelativeUrl(state, { includeDefaults: false })}`);
  }

  function updateBrowserUrl(mode = 'push') {
    const relativeUrl = buildCatalogRelativeUrl(state, { includeDefaults: false });
    const historyState = { plantCatalogState: { ...state } };
    if (mode === 'replace') {
      window.history.replaceState(historyState, '', relativeUrl);
    } else if (mode === 'push') {
      window.history.pushState(historyState, '', relativeUrl);
    }
    updateCanonicalUrl();
  }

  function parseScrollHash() {
    const match = String(window.location.hash || '').match(/^#y=(\d+)$/);
    if (!match) return null;
    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) ? Math.max(0, value) : null;
  }

  function restoreScrollFromHash() {
    const y = parseScrollHash();
    if (y == null) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: 'auto' });
    });
  }

  function buildReturnContextUrl() {
    const base = buildCatalogRelativeUrl(state, { includeDefaults: false });
    const scrollY = Math.max(0, Math.round(window.scrollY || window.pageYOffset || 0));
    return `${base}#y=${scrollY}`;
  }

  function setControlValuesFromState() {
    qEl.value = state.q;
    qMobileEl.value = state.q;
    typeEl.value = state.type;
    typeMobileEl.value = state.type;
    habitatGroupEl.value = state.habitat_group;
    habitatGroupMobileEl.value = state.habitat_group;
    seasonGroupEl.value = state.season_group;
    seasonGroupMobileEl.value = state.season_group;
    sortEl.value = state.sort;
    sortMobileEl.value = state.sort;

    if (viewToggle) {
      viewToggle.checked = state.view === 'list';
    }
    document.body.classList.toggle('list-view', state.view === 'list');
    updateMobileSortButtonLabel();
  }

  function countActiveFilters() {
    let count = 0;
    if (state.q) count += 1;
    if (state.type) count += 1;
    if (state.habitat_group) count += 1;
    if (state.season_group) count += 1;
    if (state.tag) count += 1;
    if (state.sort !== DEFAULT_STATE.sort) count += 1;
    return count;
  }

  function updateMobileSortButtonLabel() {
    if (!mobileSortBtn) return;
    mobileSortBtn.textContent = `Sort: ${SORT_LABELS[state.sort] || SORT_LABELS.relevance}`;
  }

  function updateMobileFiltersButtonLabel() {
    if (!mobileFiltersBtn) return;
    const activeCount = countActiveFilters();
    mobileFiltersBtn.textContent = activeCount > 0 ? `Filters (${activeCount})` : 'Filters';
  }

  function setMobileFilterSheetOpen(open) {
    if (!mobileFilterSheet) return;
    mobileFilterSheet.hidden = !open;
    if (mobileFiltersBtn) {
      mobileFiltersBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    if (open) {
      qMobileEl?.focus();
    }
  }

  function getQueryTerms() {
    return normalizeSearchText(state.q)
      .split(/\s+/)
      .filter(Boolean);
  }

  function buildSearchHaystack(plant, idxEntry) {
    return normalizeSearchText([
      plant.common,
      plant.latin,
      plant.type,
      plant.habitat,
      plant.bloom,
      plant.teaser,
      ...(plant.tags || []),
      ...(idxEntry.search_terms || []),
      ...(idxEntry.canonical_tags || []),
    ].join(' '));
  }

  function computeRelevanceScore(plant, idxEntry, queryTerms) {
    if (!queryTerms.length) return 0;
    const common = normalizeSearchText(plant.common);
    const latin = normalizeSearchText(plant.latin);
    const tags = new Set((idxEntry.canonical_tags || []).map((tag) => normalizeToken(tag)));
    const haystack = buildSearchHaystack(plant, idxEntry);
    let score = 0;
    queryTerms.forEach((term) => {
      if (common.includes(term)) score += 14;
      if (latin.includes(term)) score += 9;
      if (tags.has(term)) score += 12;
      if (haystack.includes(term)) score += 4;
    });
    score += Math.min(5, Number(idxEntry.image_count) || 0);
    return score;
  }

  function compareByName(a, b) {
    return String(a.common || '').localeCompare(String(b.common || ''));
  }

  function applyFiltersAndSort() {
    const queryTerms = getQueryTerms();
    const activeTag = normalizeToken(state.tag || '');

    current = plants.filter((plant) => {
      const idxEntry = getIndexEntry(plant);
      const haystack = buildSearchHaystack(plant, idxEntry);
      const hasQuery = queryTerms.every((term) => haystack.includes(term));
      const hasType = !state.type || String(plant.type || '') === state.type;
      const hasHabitatGroup = !state.habitat_group || idxEntry.habitat_group === state.habitat_group;
      const hasSeasonGroup = !state.season_group || idxEntry.season_group === state.season_group;
      const hasTag = !activeTag || (idxEntry.canonical_tags || []).some((tag) => normalizeToken(tag) === activeTag);
      return hasQuery && hasType && hasHabitatGroup && hasSeasonGroup && hasTag;
    });

    if (state.sort === 'az') {
      current.sort(compareByName);
    } else if (state.sort === 'most_photographed') {
      current.sort((a, b) => {
        const ai = getIndexEntry(a);
        const bi = getIndexEntry(b);
        const diff = (bi.image_count || 0) - (ai.image_count || 0);
        if (diff !== 0) return diff;
        return compareByName(a, b);
      });
    } else if (queryTerms.length) {
      current.sort((a, b) => {
        const ai = getIndexEntry(a);
        const bi = getIndexEntry(b);
        const scoreDiff = computeRelevanceScore(b, bi, queryTerms) - computeRelevanceScore(a, ai, queryTerms);
        if (scoreDiff !== 0) return scoreDiff;
        return compareByName(a, b);
      });
    } else {
      current.sort((a, b) => (a.__order || 0) - (b.__order || 0));
    }
  }

  function updatePlantItemList(filteredPlants) {
    const plantListScript = document.querySelector('script.plant-list');
    if (!plantListScript) return;
    try {
      const plantItemList = JSON.parse(plantListScript.textContent || '{}');
      plantItemList.itemListElement = filteredPlants.map((plant, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: plant.common,
        url: `${SITE_ORIGIN}/plant/${encodeURIComponent(plant.id)}`,
      }));
      plantListScript.textContent = JSON.stringify(plantItemList);
    } catch (error) {
      console.error('Failed to update plant ItemList structured data', error);
    }
  }

  function hideThumbOverlay(img) {
    const overlay = img?.previousElementSibling;
    if (overlay && overlay.classList.contains('thumb-loading')) {
      overlay.classList.add('hidden');
    }
  }

  function setupImgObserver() {
    if (imgObserver) imgObserver.disconnect();
    if (!('IntersectionObserver' in window)) {
      imgObserver = null;
      return;
    }
    imgObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const img = entry.target;
          const real = img.getAttribute('data-src');
          if (real) {
            img.src = real;
            img.removeAttribute('data-src');
          }
          imgObserver.unobserve(img);
        });
      },
      { rootMargin: '200px 0px', threshold: 0.01 }
    );
  }

  function formatTagLabel(tag) {
    const normalized = String(tag || '').trim();
    if (!normalized) return '';
    if (normalized === 'bog/wetland') return 'BOG/WETLAND';
    return normalized.replace(/-/g, ' ').toUpperCase();
  }

  function cardHTML(plant) {
    const srcList = getImageSources(plant);
    const src = srcList.length ? srcList[0] : PLACEHOLDER;
    const idxEntry = getIndexEntry(plant);
    const canonicalTags = Array.isArray(idxEntry.canonical_tags) ? idxEntry.canonical_tags : [];
    const visibleTags = canonicalTags.slice(0, 5);
    const hiddenTagCount = Math.max(0, canonicalTags.length - visibleTags.length);
    const teaserText = String(plant.teaser || plant.desc || plant.morph || '').slice(0, 220);
    const descText = String(plant.desc || '');
    const creditText = String(plant.credits || '');

    const speciesIcon = iconImageHTML(resolveSpeciesIconSrc(plant), 'card-species-icon');
    const typeIcon = iconImageHTML(resolveTypeIconSrc(plant), 'meta-type-icon');
    const fieldIcons = {
      type: iconImageHTML(resolveFieldIconSrc('type'), 'meta-label-icon'),
      habitat: iconImageHTML(resolveFieldIconSrc('habitat'), 'meta-label-icon'),
      elevation: iconImageHTML(resolveFieldIconSrc('elevation'), 'meta-label-icon'),
      season: iconImageHTML(resolveFieldIconSrc('bloom-season'), 'meta-label-icon'),
      tags: iconImageHTML(resolveFieldIconSrc('tags'), 'meta-label-icon'),
      overview: iconImageHTML(resolveFieldIconSrc('overview'), 'teaser-icon'),
    };

    const tagsMarkup = visibleTags
      .map((tag) => `<span class="tag-pill">${escapeHtml(formatTagLabel(tag))}</span>`)
      .join('');
    const overflowTagMarkup = hiddenTagCount > 0
      ? `<span class="tag-pill">+${hiddenTagCount}</span>`
      : '';

    return `
      <div class="thumb">
        <div class="thumb-loading" aria-hidden="true"><span class="loading-spinner"></span></div>
        <img src="${LQ_PLACEHOLDER}" data-src="${escapeHtml(src)}"
             alt="${escapeHtml(plant.common)} plant observed on Howker Ridge Trail"
             title="${escapeHtml(teaserText)}"
             data-desc="${escapeHtml(descText)}"
             data-credits="${escapeHtml(creditText)}"
             loading="lazy" decoding="async" fetchpriority="low"
             referrerpolicy="no-referrer"
             onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
        <div class="sr-only">${escapeHtml(descText || teaserText)}</div>
      </div>
      <div class="body">
        <div class="card-title-row">${speciesIcon}<h3>${escapeHtml(plant.common)}</h3></div>
        <div class="latin">${escapeHtml(plant.latin || '')}</div>
        <div class="meta">
          ${plant.type ? `<div class="meta-row"><span class="meta-label">${fieldIcons.type}Type</span><span class="meta-value meta-type-value">${typeIcon}${escapeHtml(plant.type)}</span></div>` : ''}
          ${plant.habitat ? `<div class="meta-row"><span class="meta-label">${fieldIcons.habitat}Habitat</span><span class="meta-value">${escapeHtml(plant.habitat)}</span></div>` : ''}
          ${plant.elevation ? `<div class="meta-row"><span class="meta-label">${fieldIcons.elevation}Elevation</span><span class="meta-value">${escapeHtml(plant.elevation)}</span></div>` : ''}
          ${plant.bloom ? `<div class="meta-row"><span class="meta-label">${fieldIcons.season}Season</span><span class="meta-value">${escapeHtml(plant.bloom)}</span></div>` : ''}
          ${(visibleTags.length || overflowTagMarkup) ? `<div class="meta-row"><span class="meta-label">${fieldIcons.tags}Tags</span><span class="meta-value"><span class="meta-tags">${tagsMarkup}${overflowTagMarkup}</span></span></div>` : ''}
        </div>
        ${plant.teaser ? `<div class="teaser-block"><span class="teaser-label">${fieldIcons.overview}Overview</span><p class="teaser">${escapeHtml(plant.teaser)}</p></div>` : ''}
        <div class="more">></div>
      </div>`;
  }

  function renderActiveFilters() {
    const chips = [];
    if (state.q) chips.push({ key: 'q', label: `Search: ${state.q}` });
    if (state.type) chips.push({ key: 'type', label: `Type: ${state.type}` });
    if (state.habitat_group) chips.push({ key: 'habitat_group', label: `Habitat: ${state.habitat_group}` });
    if (state.season_group) chips.push({ key: 'season_group', label: `Season: ${state.season_group}` });
    if (state.tag) chips.push({ key: 'tag', label: `Tag: ${state.tag.replace(/-/g, ' ')}` });
    if (state.sort !== DEFAULT_STATE.sort) chips.push({ key: 'sort', label: `Sort: ${SORT_LABELS[state.sort]}` });

    if (!chips.length) {
      activeFiltersEl.hidden = true;
      activeFiltersEl.innerHTML = '';
      return;
    }

    activeFiltersEl.hidden = false;
    activeFiltersEl.innerHTML = chips
      .map((chip) => `
        <span class="active-filter-chip">
          ${escapeHtml(chip.label)}
          <button type="button" data-filter-key="${chip.key}" aria-label="Remove ${escapeHtml(chip.label)}">x</button>
        </span>
      `)
      .join('');
  }

  function getQuickTagEntries() {
    const fromIndex = Array.isArray(indexData?.facets?.canonical_tags)
      ? indexData.facets.canonical_tags
          .filter((entry) => entry && typeof entry.tag === 'string' && Number.isFinite(entry.count))
          .slice(0, 12)
      : [];
    if (fromIndex.length) return fromIndex;

    const counts = new Map();
    plants.forEach((plant) => {
      const idxEntry = getIndexEntry(plant);
      (idxEntry.canonical_tags || []).forEach((tag) => {
        const normalized = normalizeToken(tag);
        if (!normalized) return;
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => (b.count - a.count) || a.tag.localeCompare(b.tag))
      .slice(0, 12);
  }

  function renderQuickTags() {
    const quickTags = getQuickTagEntries();
    if (!quickTags.length) {
      quickTagsEl.innerHTML = '<span class="result-summary">No canonical tags available.</span>';
      return;
    }
    const activeTag = normalizeToken(state.tag);
    quickTagsEl.innerHTML = quickTags
      .map((entry) => {
        const tag = normalizeToken(entry.tag);
        const pressed = activeTag === tag;
        return `
          <button type="button"
                  class="quick-tag-chip"
                  data-tag="${escapeHtml(tag)}"
                  aria-pressed="${pressed ? 'true' : 'false'}">
            ${escapeHtml(formatTagLabel(tag))}
            <span class="count">${entry.count}</span>
          </button>
        `;
      })
      .join('');
  }

  function updateResultSummary(total, start, end) {
    const activeCount = countActiveFilters();
    if (!total) {
      const emptyText = activeCount
        ? `No plants match your filters (${activeCount} active).`
        : 'No plants found.';
      resultSummaryEl.textContent = emptyText;
      statsTop.textContent = 'No results';
      statsBot.textContent = 'No results';
      return;
    }
    const visible = `${start}-${end}`;
    const summary = `${total} match${total === 1 ? '' : 'es'} | showing ${visible}${activeCount ? ` | ${activeCount} active filter${activeCount === 1 ? '' : 's'}` : ''}`;
    resultSummaryEl.textContent = summary;
    const statsLabel = `Showing ${start}-${end} of ${total}`;
    statsTop.textContent = statsLabel;
    statsBot.textContent = statsLabel;
  }

  function updatePager(total, start, end) {
    totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
    page = Math.max(1, Math.min(page, totalPages));
    updateResultSummary(total, start, end);

    const buildButtons = (host) => {
      if (!host) return;
      host.innerHTML = '';
      if (!total) return;

      const makeButton = (label, disabled, clickHandler, ariaLabel, isCurrent = false) => {
        const button = document.createElement('button');
        button.className = 'page-btn';
        button.textContent = label;
        button.disabled = Boolean(disabled);
        if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
        if (isCurrent) button.setAttribute('aria-current', 'page');
        button.addEventListener('click', clickHandler);
        host.appendChild(button);
      };

      makeButton('<<', page === 1, () => gotoPage(1), 'First page');
      makeButton('<', page === 1, () => gotoPage(page - 1), 'Previous page');

      const windowSize = 7;
      let startPage = Math.max(1, page - Math.floor(windowSize / 2));
      let endPage = Math.min(totalPages, startPage + windowSize - 1);
      startPage = Math.max(1, Math.min(startPage, Math.max(1, endPage - windowSize + 1)));

      for (let cursor = startPage; cursor <= endPage; cursor += 1) {
        makeButton(String(cursor), false, () => gotoPage(cursor), `Page ${cursor}`, cursor === page);
      }

      makeButton('>', page === totalPages, () => gotoPage(page + 1), 'Next page');
      makeButton('>>', page === totalPages, () => gotoPage(totalPages), 'Last page');
    };

    buildButtons(pageListTop);
    buildButtons(pageListBot);
  }

  function renderPage() {
    const total = current.length;
    page = Math.max(1, Math.min(page, Math.max(1, Math.ceil(total / PAGE_SIZE) || 1)));
    state.page = page;
    updateCanonicalUrl();

    grid.innerHTML = '';
    if (!total) {
      grid.innerHTML = '<div class="empty">No plants match your filters.</div>';
      updatePager(0, 0, 0);
      updatePlantItemList([]);
      return;
    }

    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, total);
    const pageSlice = current.slice(startIndex, endIndex);

    pageSlice.forEach((plant) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = cardHTML(plant);
      const sources = getImageSources(plant);
      if (sources.length > 1) {
        card.dataset.imgs = sources.join('|');
        card.dataset.idx = '0';
      }
      card.dataset.pid = String(plant.id || '');

      const image = card.querySelector('img');
      if (image) {
        if (imgObserver) {
          imgObserver.observe(image);
        } else {
          const realSrc = image.getAttribute('data-src');
          if (realSrc) {
            image.src = realSrc;
            image.removeAttribute('data-src');
          }
        }
        image.addEventListener('load', () => hideThumbOverlay(image), { once: true });
        image.addEventListener('error', () => hideThumbOverlay(image), { once: true });
      }

      card.addEventListener('click', () => {
        const returnUrl = buildReturnContextUrl();
        const detailUrl = `/plant/${encodeURIComponent(plant.id)}?return=${encodeURIComponent(returnUrl)}`;
        window.location.href = detailUrl;
      });

      grid.appendChild(card);
    });

    updatePager(total, startIndex + 1, endIndex);
    updatePlantItemList(pageSlice);
    rotateCursor = 0;
  }

  function rotateSingle(card) {
    const images = String(card.dataset.imgs || '')
      .split('|')
      .map((src) => src.trim())
      .filter(Boolean);
    if (images.length < 2) return;
    let idx = Number.parseInt(card.dataset.idx || '0', 10);
    idx = Number.isFinite(idx) ? idx : 0;
    idx = (idx + 1) % images.length;
    const image = card.querySelector('.thumb img');
    if (!image) return;
    image.style.opacity = '0';
    window.setTimeout(() => {
      image.src = images[idx];
      image.removeAttribute('data-src');
      image.style.opacity = '1';
    }, ROTATE_FADE_MS);
    card.dataset.idx = String(idx);
  }

  function getRotatableCards() {
    return Array.from(document.querySelectorAll('#grid .card[data-imgs]'));
  }

  function rotateCardImages() {
    const cards = getRotatableCards();
    if (!cards.length) {
      rotateCursor = 0;
      return;
    }
    if (rotateCursor >= cards.length) {
      rotateCursor = 0;
    }
    const card = cards[rotateCursor];
    rotateSingle(card);
    rotateCursor = (rotateCursor + 1) % cards.length;
  }

  function startCardRotation() {
    if (rotateInterval) return;
    rotateInterval = window.setInterval(rotateCardImages, ROTATE_STEP_MS);
  }

  function stopCardRotation() {
    if (!rotateInterval) return;
    window.clearInterval(rotateInterval);
    rotateInterval = null;
  }

  function applyState(nextState, options = {}) {
    const opts = {
      history: 'push',
      trigger: '',
      restoreHashScroll: false,
      ...options,
    };
    state = sanitizeState(nextState);
    setControlValuesFromState();
    applyFiltersAndSort();
    page = Math.max(1, Math.min(state.page, Math.max(1, Math.ceil(current.length / PAGE_SIZE) || 1)));
    state.page = page;
    renderQuickTags();
    renderActiveFilters();
    renderPage();
    updateMobileFiltersButtonLabel();
    if (opts.history === 'push') {
      updateBrowserUrl('push');
    } else if (opts.history === 'replace') {
      updateBrowserUrl('replace');
    } else {
      updateCanonicalUrl();
    }
    if (opts.restoreHashScroll) {
      restoreScrollFromHash();
    }
    if (opts.trigger) {
      emitPlantCatalogFilterChange(opts.trigger);
    }
  }

  function setFilterPatch(patch, options = {}) {
    const next = { ...state, ...patch };
    if (!Object.prototype.hasOwnProperty.call(patch, 'page')) {
      next.page = 1;
    }
    applyState(next, options);
  }

  function gotoPage(nextPage) {
    setFilterPatch({ page: parsePositiveInt(nextPage, 1) }, { history: 'push', trigger: 'page' });
    const controlsWrap = document.getElementById('controlsWrap');
    if (controlsWrap) {
      const top = controlsWrap.offsetTop - 10;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }

  function clearAllFilters(options = {}) {
    const keepView = state.view;
    applyState({ ...DEFAULT_STATE, view: keepView }, { history: 'push', trigger: options.trigger || 'clear' });
  }

  function bindInputHandlers() {
    const handleSearchInput = (value, trigger) => {
      if (searchDebounce) clearTimeout(searchDebounce);
      searchDebounce = window.setTimeout(() => {
        setFilterPatch({ q: String(value || '').trim() }, { history: 'push', trigger });
      }, 220);
    };

    qEl.addEventListener('input', (event) => {
      qMobileEl.value = event.target.value;
      handleSearchInput(event.target.value, 'q');
    });
    qMobileEl.addEventListener('input', (event) => {
      qEl.value = event.target.value;
      handleSearchInput(event.target.value, 'q_mobile');
    });

    const selectPairs = [
      [typeEl, typeMobileEl, 'type'],
      [habitatGroupEl, habitatGroupMobileEl, 'habitat_group'],
      [seasonGroupEl, seasonGroupMobileEl, 'season_group'],
      [sortEl, sortMobileEl, 'sort'],
    ];
    selectPairs.forEach(([desktopEl, mobileEl, key]) => {
      desktopEl.addEventListener('change', (event) => {
        mobileEl.value = event.target.value;
        setFilterPatch({ [key]: event.target.value }, { history: 'push', trigger: key });
      });
      mobileEl.addEventListener('change', (event) => {
        desktopEl.value = event.target.value;
        setFilterPatch({ [key]: event.target.value }, { history: 'push', trigger: `${key}_mobile` });
      });
    });

    clearFiltersBtn.addEventListener('click', () => clearAllFilters({ trigger: 'clear_button' }));
    mobileClearBtn.addEventListener('click', () => clearAllFilters({ trigger: 'clear_mobile' }));

    mobileSortBtn?.addEventListener('click', () => {
      const index = SORT_SEQUENCE.indexOf(state.sort);
      const nextSort = SORT_SEQUENCE[(index + 1) % SORT_SEQUENCE.length];
      setFilterPatch({ sort: nextSort }, { history: 'push', trigger: 'sort_mobile_cycle' });
    });

    if (viewToggle) {
      viewToggle.addEventListener('change', () => {
        const nextView = viewToggle.checked ? 'list' : 'grid';
        applyState({ ...state, view: nextView }, { history: 'push', trigger: 'view' });
      });
    }

    themeToggle?.addEventListener('change', () => {
      if (themeToggle.checked) {
        document.body.classList.remove('light');
      } else {
        document.body.classList.add('light');
      }
    });

    compactToggle?.addEventListener('change', () => {
      document.body.classList.toggle('compact', compactToggle.checked);
    });

    stickyToggle?.addEventListener('change', () => {
      const headerEl = document.querySelector('header');
      headerEl?.classList.toggle('sticky', stickyToggle.checked);
    });

    if (rotateToggle) {
      rotateToggle.checked = true;
      rotateToggle.disabled = true;
      rotateToggle.title = 'Image rotation is always on.';
      const rotateLabel = document.querySelector('label[for="rotate-toggle"]');
      if (rotateLabel && !/always on/i.test(String(rotateLabel.textContent || ''))) {
        rotateLabel.textContent = `${rotateLabel.textContent} (always on)`;
      }
    }

    quickTagsEl.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-tag]');
      if (!button) return;
      const tag = normalizeToken(button.dataset.tag);
      const nextTag = normalizeToken(state.tag) === tag ? '' : tag;
      setFilterPatch({ tag: nextTag }, { history: 'push', trigger: 'tag' });
    });

    activeFiltersEl.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-filter-key]');
      if (!button) return;
      const key = button.dataset.filterKey;
      if (!key) return;
      const patch = {};
      patch[key] = key === 'sort' ? DEFAULT_STATE.sort : '';
      if (key === 'page') patch[key] = DEFAULT_STATE.page;
      setFilterPatch(patch, { history: 'push', trigger: `remove_${key}` });
    });

    mobileFiltersBtn?.addEventListener('click', () => setMobileFilterSheetOpen(true));
    mobileFilterBackdrop?.addEventListener('click', () => setMobileFilterSheetOpen(false));
    mobileFilterClose?.addEventListener('click', () => setMobileFilterSheetOpen(false));

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setMobileFilterSheetOpen(false);
      }
      if (event.target && (/input|select|textarea/i).test(event.target.tagName)) return;
      if (event.key === 'ArrowRight') gotoPage(page + 1);
      if (event.key === 'ArrowLeft') gotoPage(page - 1);
    });

    window.addEventListener('popstate', () => {
      applyState(parseStateFromUrl(), {
        history: 'none',
        trigger: '',
        restoreHashScroll: true,
      });
    });
  }

  function populateTypeOptions() {
    const fromIndex = Array.isArray(indexData?.facets?.types) ? indexData.facets.types : [];
    const fromPlants = plants.map((plant) => String(plant.type || '').trim()).filter(Boolean);
    const types = uniqueSorted(fromIndex.length ? fromIndex : fromPlants);

    const html = ['<option value="">All types</option>']
      .concat(types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`))
      .join('');

    typeEl.innerHTML = html;
    typeMobileEl.innerHTML = html;
  }

  async function fetchPlants() {
    const response = await fetch('/data/howker-plants', {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function fetchPlantIndex() {
    const response = await fetch('/data/howker-plants-index.json', {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function init() {
    setupImgObserver();
    try {
      const [plantsPayload, indexPayload] = await Promise.all([
        fetchPlants(),
        fetchPlantIndex().catch(() => ({ plants: {}, facets: {} })),
      ]);
      plants = Array.isArray(plantsPayload) ? plantsPayload : [];
      plants.forEach((plant, idx) => {
        plant.__order = idx;
      });
      indexData = (indexPayload && typeof indexPayload === 'object')
        ? indexPayload
        : { plants: {}, facets: {} };

      populateTypeOptions();
      bindInputHandlers();

      const initialState = parseStateFromUrl();
      applyState(initialState, {
        history: 'replace',
        restoreHashScroll: true,
      });

      startCardRotation();
    } catch (error) {
      stopCardRotation();
      console.error(error);
      grid.innerHTML = `<div class="error">Could not load the catalog (network ${escapeHtml(error.message)}).</div>`;
    }
  }

  init();
})();

