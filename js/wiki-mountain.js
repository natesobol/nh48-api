(function () {
  const RAW_BASE = 'https://raw.githubusercontent.com/natesobol/nh48-api/main';
  const CDN_BASE = 'https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main';
  const OVERLAY_BASE = 'data/i18n-content';

  function q(id) {
    return document.getElementById(id);
  }

  function text(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  function humanizeSlug(value) {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function parsePath() {
    const match = window.location.pathname.match(/^\/wiki\/mountains\/([^/]+)\/([^/]+)/i);
    return {
      setSlug: match ? decodeURIComponent(match[1]).toLowerCase() : '',
      entrySlug: match ? decodeURIComponent(match[2]).toLowerCase() : ''
    };
  }

  async function fetchJsonWithBackups(paths) {
    for (const path of paths) {
      try {
        const response = await fetch(path, { cache: 'no-store' });
        if (!response.ok) continue;
        return await response.json();
      } catch (error) {
        continue;
      }
    }
    return null;
  }

  function loadWikiJson(filePath) {
    const cleaned = String(filePath || '').replace(/^\/+/, '');
    return fetchJsonWithBackups([
      `/${cleaned}`,
      `${CDN_BASE}/${cleaned}`,
      `${RAW_BASE}/${cleaned}`
    ]);
  }

  function getCurrentLang() {
    const i18nLang = window.NH48_I18N && typeof window.NH48_I18N.getLang === 'function'
      ? window.NH48_I18N.getLang()
      : '';
    const stored = localStorage.getItem('nh48_lang') || '';
    return text(i18nLang || stored || 'en').toLowerCase();
  }

  function deepMerge(baseValue, overlayValue) {
    if (overlayValue === undefined || overlayValue === null) return baseValue;
    if (Array.isArray(baseValue) && Array.isArray(overlayValue)) {
      const max = Math.max(baseValue.length, overlayValue.length);
      const merged = [];
      for (let i = 0; i < max; i += 1) {
        if (i in overlayValue) {
          merged[i] = deepMerge(baseValue[i], overlayValue[i]);
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
        merged[key] = deepMerge(baseValue[key], overlayValue[key]);
      });
      return merged;
    }
    return overlayValue;
  }

  function loadOverlay(datasetBaseName, langCode) {
    const safeLang = text(langCode).toLowerCase();
    if (!safeLang || safeLang === 'en') {
      return Promise.resolve({});
    }
    return loadWikiJson(`${OVERLAY_BASE}/${safeLang}/${datasetBaseName}.overlay.json`).then((payload) => {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return {};
      }
      return payload;
    });
  }

  function resolveEntry(mapData, slug) {
    if (!mapData || typeof mapData !== 'object') return null;
    if (mapData[slug]) return mapData[slug];
    const entries = Object.values(mapData);
    return entries.find((entry) => text(entry.slug).toLowerCase() === slug) || null;
  }

  function appendRow(container, label, value) {
    const row = document.createElement('div');
    row.className = 'wiki-row';
    const labelNode = document.createElement('div');
    labelNode.className = 'wiki-label';
    labelNode.textContent = label;
    const valueNode = document.createElement('div');
    valueNode.className = 'wiki-value';
    if (value instanceof Node) {
      valueNode.appendChild(value);
    } else {
      valueNode.textContent = value || 'N/A';
    }
    row.appendChild(labelNode);
    row.appendChild(valueNode);
    container.appendChild(row);
  }

  function formatList(value) {
    if (Array.isArray(value)) {
      const items = value.map((item) => text(item)).filter(Boolean);
      return items.length ? items.join(', ') : '';
    }
    return text(value);
  }

  function normalizeMedia(entry, fallbackName) {
    const photos = [];
    const pushPhoto = (photo) => {
      if (!photo) return;
      if (typeof photo === 'string') {
        const url = text(photo);
        if (!url) return;
        photos.push({
          url,
          alt: `${fallbackName} photo`,
          title: `${fallbackName} photo`,
          caption: `${fallbackName} photo`,
          credit: ''
        });
        return;
      }
      const url = text(photo.url || photo.contentUrl || photo.src);
      if (!url) return;
      photos.push({
        url,
        alt: text(photo.alt || photo.altText || photo.description || photo.caption || `${fallbackName} photo`),
        title: text(photo.title || photo.headline || photo.caption || photo.alt || `${fallbackName} photo`),
        caption: text(photo.caption || photo.description || photo.extendedDescription || photo.alt || `${fallbackName} photo`),
        credit: text(photo.credit || photo.creditText || photo.author || '')
      });
    };

    if (Array.isArray(entry.photos)) entry.photos.forEach(pushPhoto);
    if (!photos.length && Array.isArray(entry.imgs)) entry.imgs.forEach(pushPhoto);
    if (!photos.length && entry.img) pushPhoto(entry.img);

    const seen = new Set();
    return photos.filter((photo) => {
      if (seen.has(photo.url)) return false;
      seen.add(photo.url);
      return true;
    });
  }

  function renderCarousel(media) {
    const shell = q('wikiMediaShell');
    const track = q('wikiCarouselTrack');
    const caption = q('wikiCarouselCaption');
    const thumbList = q('wikiThumbList');
    const prevBtn = q('wikiPrevBtn');
    const nextBtn = q('wikiNextBtn');
    if (!shell || !track || !caption || !thumbList || !prevBtn || !nextBtn) return;

    if (!media.length) {
      shell.classList.add('is-empty');
      return;
    }
    shell.classList.remove('is-empty');

    let index = 0;

    function render() {
      const photo = media[index];
      track.innerHTML = '';
      const image = document.createElement('img');
      image.className = 'wiki-carousel-image';
      image.src = photo.url;
      image.alt = photo.alt || photo.title || 'Wiki photo';
      image.loading = 'lazy';
      image.decoding = 'async';
      track.appendChild(image);
      const credit = photo.credit ? ` - ${photo.credit}` : '';
      caption.textContent = `${photo.caption || photo.title || photo.alt || ''}${credit}`;

      Array.from(thumbList.querySelectorAll('button')).forEach((button, buttonIndex) => {
        button.setAttribute('aria-current', buttonIndex === index ? 'true' : 'false');
      });
    }

    thumbList.innerHTML = '';
    media.forEach((photo, photoIndex) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Open image ${photoIndex + 1}`);
      const image = document.createElement('img');
      image.src = photo.url;
      image.alt = photo.alt || photo.title || `Image ${photoIndex + 1}`;
      image.loading = 'lazy';
      image.decoding = 'async';
      button.appendChild(image);
      button.addEventListener('click', () => {
        index = photoIndex;
        render();
      });
      li.appendChild(button);
      thumbList.appendChild(li);
    });

    prevBtn.addEventListener('click', () => {
      index = (index - 1 + media.length) % media.length;
      render();
    });
    nextBtn.addEventListener('click', () => {
      index = (index + 1) % media.length;
      render();
    });

    render();
  }

  function renderRoutes(routes) {
    const grid = q('wikiRoutesGrid');
    const count = q('wikiRouteCount');
    if (!grid || !count) return;
    grid.innerHTML = '';
    const routeList = Array.isArray(routes) ? routes.filter((route) => route && typeof route === 'object') : [];
    count.textContent = `${routeList.length} route${routeList.length === 1 ? '' : 's'}`;
    if (!routeList.length) {
      appendRow(grid, 'Routes', 'No standard routes listed.');
      return;
    }

    routeList.forEach((route, routeIndex) => {
      const card = document.createElement('div');
      card.className = 'wiki-panel';
      const header = document.createElement('header');
      header.className = 'wiki-panel-header';
      const title = document.createElement('h3');
      title.className = 'wiki-panel-title';
      title.textContent = text(route['Route Name'] || route.name || `Route ${routeIndex + 1}`);
      header.appendChild(title);
      card.appendChild(header);
      const body = document.createElement('div');
      body.className = 'wiki-panel-body';
      const dataGrid = document.createElement('div');
      dataGrid.className = 'wiki-data-grid';
      appendRow(dataGrid, 'Distance', text(route['Distance (mi)']) ? `${route['Distance (mi)']} mi` : '');
      appendRow(dataGrid, 'Elevation Gain', text(route['Elevation Gain (ft)']) ? `${route['Elevation Gain (ft)']} ft` : '');
      appendRow(dataGrid, 'Difficulty', text(route.Difficulty || route.difficulty));
      appendRow(dataGrid, 'Trail Type', text(route['Trail Type'] || route.trailType));
      body.appendChild(dataGrid);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  function renderSources(entry) {
    const list = q('wikiSourcesList');
    if (!list) return;
    list.innerHTML = '';
    const merged = [];
    const seen = new Set();

    const push = (title, url, note) => {
      const cleanUrl = text(url);
      if (!cleanUrl || seen.has(cleanUrl)) return;
      seen.add(cleanUrl);
      merged.push({ title: text(title) || cleanUrl, url: cleanUrl, note: text(note) });
    };

    if (Array.isArray(entry.sources)) {
      entry.sources.forEach((source) => push(source.title, source.url, source.note));
    }
    if (entry.deepResearch && Array.isArray(entry.deepResearch.sourcesChecked)) {
      entry.deepResearch.sourcesChecked.forEach((source) => push(source.title || source.site, source.url, source.note));
    }

    if (!merged.length) {
      const li = document.createElement('li');
      li.textContent = 'No external references listed for this entry.';
      list.appendChild(li);
      return;
    }

    merged.forEach((source) => {
      const li = document.createElement('li');
      const anchor = document.createElement('a');
      anchor.href = source.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = source.title;
      li.appendChild(anchor);
      if (source.note) {
        const note = document.createElement('small');
        note.style.display = 'block';
        note.style.color = '#9db0ca';
        note.style.marginTop = '2px';
        note.textContent = source.note;
        li.appendChild(note);
      }
      list.appendChild(li);
    });
  }

  function renderMountain(entry, setMeta, setSlug) {
    const title = text(entry.peakName || entry['Peak Name'] || humanizeSlug(entry.slug));
    const subtitleParts = [
      text(entry['Range / Subrange']),
      text(entry.Difficulty || entry['Difficulty']),
      text(entry['Typical Completion Time'])
    ].filter(Boolean);

    q('wikiMountainTitle').textContent = title || 'Mountain';
    q('wikiMountainSubtitle').textContent = subtitleParts.length ? subtitleParts.join(' - ') : 'No subtitle metadata available.';
    q('wikiEntryBreadcrumbLabel').textContent = title || 'Mountain';
    q('wikiSetChip').textContent = (setMeta && setMeta.shortName) || humanizeSlug(setSlug);
    q('wikiDifficultyChip').textContent = `Difficulty: ${text(entry.Difficulty || 'N/A') || 'N/A'}`;
    q('wikiTimeChip').textContent = `Typical Time: ${text(entry['Typical Completion Time'] || 'N/A') || 'N/A'}`;

    const setLink = q('wikiSetBreadcrumbLink');
    if (setLink) {
      setLink.href = '/wiki';
      setLink.textContent = (setMeta && setMeta.name) || 'Mountains';
    }

    q('wikiOverviewText').textContent = text(entry.description || entry['View Type'] || entry['Terrain Character']) || 'No overview available.';

    const statsGrid = q('wikiStatsGrid');
    statsGrid.innerHTML = '';
    appendRow(statsGrid, 'Peak Name', text(entry['Peak Name'] || entry.peakName));
    appendRow(statsGrid, 'Elevation', text(entry['Elevation (ft)']) ? `${entry['Elevation (ft)']} ft` : '');
    appendRow(statsGrid, 'Prominence', text(entry['Prominence (ft)']) ? `${entry['Prominence (ft)']} ft` : '');
    appendRow(statsGrid, 'Range', text(entry['Range / Subrange']));
    appendRow(statsGrid, 'Coordinates', text(entry.Coordinates));
    appendRow(statsGrid, 'Trail Type', text(entry['Trail Type']));
    appendRow(statsGrid, 'Dog Friendly', text(entry['Dog Friendly']));

    const conditionsGrid = q('wikiConditionsGrid');
    conditionsGrid.innerHTML = '';
    appendRow(conditionsGrid, 'View Type', text(entry['View Type']));
    appendRow(conditionsGrid, 'Exposure', text(entry['Exposure Level']));
    appendRow(conditionsGrid, 'Terrain', text(entry['Terrain Character']));
    appendRow(conditionsGrid, 'Scramble', text(entry['Scramble Sections']));
    appendRow(conditionsGrid, 'Weather Exposure', text(entry['Weather Exposure Rating']));
    appendRow(conditionsGrid, 'Flora / Zones', text(entry['Flora/Environment Zones']));

    const accessGrid = q('wikiAccessGrid');
    accessGrid.innerHTML = '';
    appendRow(accessGrid, 'Trailhead', text(entry['Most Common Trailhead']));
    appendRow(accessGrid, 'Parking', text(entry['Parking Notes']));
    appendRow(accessGrid, 'Water Availability', text(entry['Water Availability']));
    appendRow(accessGrid, 'Cell Reception', text(entry['Cell Reception Quality']));
    appendRow(accessGrid, 'Bailout Options', text(entry['Emergency Bailout Options']));
    appendRow(accessGrid, 'Best Seasons', text(entry['Best Seasons to Hike']));

    const connectionsGrid = q('wikiConnectionsGrid');
    connectionsGrid.innerHTML = '';
    appendRow(connectionsGrid, 'Nearby Features', text(entry['Nearby Notable Features']));
    appendRow(connectionsGrid, 'Nearby 4K Connections', formatList(entry['Nearby 4000-footer Connections']));
    appendRow(connectionsGrid, 'Summit Marker', text(entry['Summit Marker Type']));

    renderRoutes(entry['Standard Routes']);
    renderSources(entry);
    renderCarousel(normalizeMedia(entry, title || 'Mountain'));
  }

  function renderNotFound(message) {
    q('wikiMountainTitle').textContent = 'Wiki Entry Not Found';
    q('wikiMountainSubtitle').textContent = message;
    q('wikiOverviewText').textContent = message;
    const shell = q('wikiMediaShell');
    if (shell) shell.classList.add('is-empty');
  }

  async function init() {
    const body = document.body;
    const path = parsePath();
    const setSlug = (body.dataset.wikiSetSlug || path.setSlug || '').toLowerCase();
    const entrySlug = (body.dataset.wikiEntrySlug || path.entrySlug || '').toLowerCase();
    if (!setSlug || !entrySlug) {
      renderNotFound('Missing route parameters.');
      return;
    }

    const setPayload = await loadWikiJson('data/wiki/mountain-sets.json');
    const setMeta = setPayload && typeof setPayload === 'object' ? setPayload[setSlug] : null;
    if (!setMeta || !setMeta.dataFile) {
      renderNotFound(`Unknown mountain set: ${setSlug}`);
      return;
    }

    const setData = await loadWikiJson(setMeta.dataFile);
    let entry = resolveEntry(setData, entrySlug);
    if (!entry) {
      renderNotFound(`Entry "${entrySlug}" not found in ${setSlug}.`);
      return;
    }

    const lang = getCurrentLang();
    const overlayKey = setSlug === 'nh52wav' ? 'nh52wav' : 'nh48';
    const overlayPayload = await loadOverlay(overlayKey, lang);
    if (overlayPayload && overlayPayload[entrySlug]) {
      entry = deepMerge(entry, overlayPayload[entrySlug]);
    }

    renderMountain(entry, setMeta, setSlug);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
