const API_URLS = [
  'https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48.json',
  'https://raw.githubusercontent.com/natesobol/nh48-api/main/data/nh48.json'
];

const PHOTO_BASE_URL = 'https://photos.nh48.info';
const PHOTO_TRANSFORM = 'format=webp,quality=85,width=720';
const PHOTO_CDN_PREFIX = `${PHOTO_BASE_URL}/cdn-cgi/image/${PHOTO_TRANSFORM}`;
const PHOTO_LIGHTBOX_TRANSFORM = 'format=webp,quality=90,width=1600';
const PHOTO_LIGHTBOX_PREFIX = `${PHOTO_BASE_URL}/cdn-cgi/image/${PHOTO_LIGHTBOX_TRANSFORM}`;
const PHOTOS_PER_PAGE = 500;

const state = {
  peaks: [],
  ranges: [],
  activeRanges: new Set(),
  search: '',
  sort: 'range',
  page: 1
};

const elements = {
  container: document.getElementById('photos-container'),
  loading: document.getElementById('photosLoading'),
  empty: document.getElementById('photosEmpty'),
  search: document.getElementById('photoSearch'),
  sort: document.getElementById('photoSort'),
  rangeFilters: document.getElementById('rangeFilters'),
  prev: document.getElementById('paginationPrev'),
  next: document.getElementById('paginationNext'),
  status: document.getElementById('paginationStatus'),
  lightbox: document.getElementById('photoLightbox'),
  lightboxImage: document.getElementById('photoLightboxImage'),
  lightboxCaption: document.getElementById('photoLightboxCaption')
};

const trackAnalytics = (name, params = {}) => {
  if (window.NH48Analytics?.track) {
    window.NH48Analytics.track(name, params);
    return;
  }
  if (window.NH48_INFO_ANALYTICS?.logEvent) {
    window.NH48_INFO_ANALYTICS.logEvent(name, params);
  }
};

const normalizeRange = (value) => {
  if (!value) return 'Other';
  return String(value).replace(/\.$/, '').trim();
};

const buildPhotoUrl = (photo) => {
  if (!photo) return '';
  const rawUrl = typeof photo === 'string' ? photo : photo.url;
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl);
    if (url.origin === PHOTO_BASE_URL) {
      return `${PHOTO_CDN_PREFIX}${url.pathname}`;
    }
  } catch (error) {
    return rawUrl;
  }
  return rawUrl;
};

const buildLightboxUrl = (photo) => {
  if (!photo) return '';
  const rawUrl = typeof photo === 'string' ? photo : photo.url;
  if (!rawUrl) return '';
  try {
    const url = new URL(rawUrl);
    if (url.origin === PHOTO_BASE_URL) {
      return `${PHOTO_LIGHTBOX_PREFIX}${url.pathname}`;
    }
  } catch (error) {
    return rawUrl;
  }
  return rawUrl;
};

const pickAlt = (photo, peakName) => {
  if (!photo) return `${peakName} summit photo`;
  return photo.alt || photo.altText || photo.caption || photo.headline || `${peakName} summit photo`;
};

const buildPhotoEntries = (peaks) => {
  const entries = [];
  peaks.forEach((peak) => {
    peak.photos.forEach((photo) => {
      entries.push({
        range: peak.range,
        peakName: peak.name,
        photo
      });
    });
  });
  return entries;
};

const sortPeaks = (peaks, sortKey) => {
  const sorted = [...peaks];
  sorted.sort((a, b) => {
    if (sortKey === 'name') return a.name.localeCompare(b.name);
    if (sortKey === 'elevation-desc') return b.elevation - a.elevation;
    if (sortKey === 'elevation-asc') return a.elevation - b.elevation;
    if (sortKey === 'range') {
      const rangeCompare = a.range.localeCompare(b.range);
      if (rangeCompare !== 0) return rangeCompare;
      return a.name.localeCompare(b.name);
    }
    return 0;
  });
  return sorted;
};

const filterPeaks = () => {
  const searchLower = state.search.trim().toLowerCase();
  return state.peaks.filter((peak) => {
    const matchesSearch = !searchLower || peak.name.toLowerCase().includes(searchLower);
    const matchesRange = state.activeRanges.size === 0 || state.activeRanges.has(peak.range);
    return matchesSearch && matchesRange && peak.photos.length > 0;
  });
};

const renderRangeFilters = () => {
  elements.rangeFilters.innerHTML = '';
  state.ranges.forEach((range) => {
    const option = document.createElement('option');
    option.value = range;
    option.textContent = range;
    option.selected = state.activeRanges.has(range);
    elements.rangeFilters.appendChild(option);
  });
};

const openLightbox = (src, captionText, altText) => {
  if (!elements.lightbox || !elements.lightboxImage || !elements.lightboxCaption) return;
  elements.lightboxImage.src = src;
  elements.lightboxImage.alt = altText || captionText || 'Expanded photo view';
  elements.lightboxCaption.textContent = captionText || '';
  elements.lightbox.hidden = false;
  elements.lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('lightbox-open');
  trackAnalytics('photos_lightbox_open', {
    caption_length: (captionText || '').length
  });
};

const closeLightbox = () => {
  if (!elements.lightbox || !elements.lightboxImage) return;
  elements.lightbox.hidden = true;
  elements.lightbox.setAttribute('aria-hidden', 'true');
  elements.lightboxImage.src = '';
  document.body.classList.remove('lightbox-open');
};

const buildRangeSections = (photoEntries) => {
  const map = new Map();
  photoEntries.forEach((entry) => {
    if (!map.has(entry.range)) map.set(entry.range, new Map());
    const peaksMap = map.get(entry.range);
    if (!peaksMap.has(entry.peakName)) peaksMap.set(entry.peakName, []);
    peaksMap.get(entry.peakName).push(entry.photo);
  });
  return map;
};

const renderPagination = (page, totalPages, totalPhotos) => {
  if (totalPhotos <= PHOTOS_PER_PAGE) {
    elements.prev.disabled = true;
    elements.next.disabled = true;
    elements.status.textContent = `Showing ${totalPhotos} photos`;
    return;
  }

  elements.prev.disabled = page <= 1;
  elements.next.disabled = page >= totalPages;
  elements.status.textContent = `Page ${page} of ${totalPages}`;
};

const render = () => {
  const filteredPeaks = filterPeaks();
  const sortedPeaks = sortPeaks(filteredPeaks, state.sort);
  const photoEntries = buildPhotoEntries(sortedPeaks);
  const totalPhotos = photoEntries.length;
  const totalPages = Math.max(1, Math.ceil(totalPhotos / PHOTOS_PER_PAGE));
  const currentPage = Math.min(state.page, totalPages);
  state.page = currentPage;

  const startIndex = (currentPage - 1) * PHOTOS_PER_PAGE;
  const pageEntries = photoEntries.slice(startIndex, startIndex + PHOTOS_PER_PAGE);

  elements.container.innerHTML = '';
  elements.empty.hidden = pageEntries.length > 0;

  const rangeSections = buildRangeSections(pageEntries);

  rangeSections.forEach((peaks, rangeName) => {
    const section = document.createElement('section');
    section.className = 'range-section';

    const header = document.createElement('header');
    header.className = 'range-heading';
    const kicker = document.createElement('p');
    kicker.className = 'kicker';
    kicker.textContent = 'Range';
    const title = document.createElement('h2');
    title.textContent = rangeName;
    const divider = document.createElement('hr');
    header.appendChild(kicker);
    header.appendChild(title);
    header.appendChild(divider);

    section.appendChild(header);

    peaks.forEach((photos, peakName) => {
      const peakSection = document.createElement('div');
      peakSection.className = 'peak-section';
      const peakHeading = document.createElement('h3');
      peakHeading.className = 'peak-heading';
      peakHeading.textContent = peakName;
      const grid = document.createElement('div');
      grid.className = 'photo-grid';

      photos.forEach((photo) => {
        const figure = document.createElement('figure');
        figure.className = 'photo-figure';
        const img = document.createElement('img');
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = buildPhotoUrl(photo);
        img.alt = pickAlt(photo, peakName);
        img.dataset.lightboxUrl = buildLightboxUrl(photo);
        img.dataset.caption = photo.caption || photo.headline || photo.description || img.alt;
        img.dataset.peakName = peakName;
        const caption = document.createElement('figcaption');
        caption.className = 'sr-only';
        caption.textContent = img.dataset.caption;
        figure.appendChild(img);
        figure.appendChild(caption);
        figure.addEventListener('click', () => {
          openLightbox(img.dataset.lightboxUrl, img.dataset.caption, img.alt);
        });
        grid.appendChild(figure);
      });

      peakSection.appendChild(peakHeading);
      peakSection.appendChild(grid);
      section.appendChild(peakSection);
    });

    elements.container.appendChild(section);
  });

  renderPagination(currentPage, totalPages, totalPhotos);
};

const fetchPeaks = async () => {
  for (const url of API_URLS) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.warn(error);
    }
  }
  throw new Error('Unable to fetch NH48 data.');
};

const buildPeakList = (data) => {
  const peaks = Object.values(data || {}).map((peak) => {
    const name = peak.peakName || peak['Peak Name'] || peak.slug || 'Unknown Peak';
    const range = normalizeRange(peak['Range / Subrange'] || peak.range || 'Other');
    const elevation = Number(String(peak['Elevation (ft)'] || peak.elevation || 0).replace(/[^0-9.]/g, '')) || 0;
    const photos = Array.isArray(peak.photos) ? peak.photos : [];
    return {
      name,
      range,
      elevation,
      photos
    };
  });

  const rangeSet = new Set(peaks.map((peak) => peak.range));
  state.ranges = Array.from(rangeSet).sort((a, b) => a.localeCompare(b));
  return peaks;
};

const init = async () => {
  elements.loading.hidden = false;
  try {
    const data = await fetchPeaks();
    state.peaks = buildPeakList(data);
    renderRangeFilters();
    render();
  } catch (error) {
    elements.empty.hidden = false;
    elements.empty.textContent = 'Unable to load photos right now.';
    console.error(error);
  } finally {
    elements.loading.hidden = true;
  }
};

if (elements.search) {
  let searchDebounce = null;
  elements.search.addEventListener('input', (event) => {
    state.search = event.target.value;
    state.page = 1;
    render();
    if (searchDebounce) clearTimeout(searchDebounce);
    const searchLength = (event.target.value || '').trim().length;
    searchDebounce = setTimeout(() => {
      trackAnalytics('photos_search', { search_length: searchLength });
    }, 350);
  });
}

if (elements.sort) {
  elements.sort.addEventListener('change', (event) => {
    state.sort = event.target.value;
    state.page = 1;
    render();
    trackAnalytics('photos_sort_change', {
      sort: event.target.value || 'range'
    });
  });
}

if (elements.rangeFilters) {
  elements.rangeFilters.addEventListener('change', (event) => {
    const selected = Array.from(event.target.selectedOptions || []).map((option) => option.value);
    state.activeRanges = new Set(selected);
    state.page = 1;
    render();
    trackAnalytics('photos_filter_change', {
      selected_count: selected.length
    });
  });
}

if (elements.prev) {
  elements.prev.addEventListener('click', () => {
    if (state.page > 1) {
      state.page -= 1;
      render();
      trackAnalytics('photos_pagination', {
        direction: 'prev',
        page: state.page
      });
    }
  });
}

if (elements.next) {
  elements.next.addEventListener('click', () => {
    state.page += 1;
    render();
    trackAnalytics('photos_pagination', {
      direction: 'next',
      page: state.page
    });
  });
}

init();

if (elements.lightbox) {
  elements.lightbox.addEventListener('click', (event) => {
    if (event.target.closest('[data-lightbox-close]')) {
      closeLightbox();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.lightbox.hidden) {
      closeLightbox();
    }
  });
}
