const API_URLS = [
  'https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48.json',
  'https://raw.githubusercontent.com/natesobol/nh48-api/main/data/nh48.json'
];

const SITE_URL = 'https://nh48.info';
const PHOTO_BASE_URL = 'https://photos.nh48.info';
const PHOTO_LIST_TRANSFORM = 'format=webp,quality=84,width=960';
const PHOTO_LIGHTBOX_TRANSFORM = 'format=webp,quality=90,width=1800';
const PHOTO_LIST_PREFIX = `${PHOTO_BASE_URL}/cdn-cgi/image/${PHOTO_LIST_TRANSFORM}`;
const PHOTO_LIGHTBOX_PREFIX = `${PHOTO_BASE_URL}/cdn-cgi/image/${PHOTO_LIGHTBOX_TRANSFORM}`;
const LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/';

const state = {
  peaks: [],
  ranges: [],
  rangeCounts: new Map(),
  activeRanges: new Set(),
  search: '',
  sort: 'range',
  renderedRangeGroups: [],
  activeRangeSlug: '',
  hasAppliedInitialHash: false,
  revealObserver: null,
  rangeObserver: null,
  lightbox: {
    peakSlug: '',
    index: 0,
    open: false
  }
};

const elements = {
  container: document.getElementById('photos-container'),
  loading: document.getElementById('photosLoading'),
  empty: document.getElementById('photosEmpty'),
  search: document.getElementById('photoSearch'),
  sort: document.getElementById('photoSort'),
  rangeFilters: document.getElementById('rangeFilters'),
  rangeJumpLinks: document.getElementById('rangeJumpLinks'),
  peakJumpLinks: document.getElementById('peakJumpLinks'),
  viewStatus: document.getElementById('photosViewStatus'),
  statsPeaks: document.getElementById('statsPeaks'),
  statsPhotos: document.getElementById('statsPhotos'),
  statsRanges: document.getElementById('statsRanges'),
  schemaScript: document.getElementById('page-gallery-schema'),
  lightbox: document.getElementById('photoLightbox'),
  lightboxImage: document.getElementById('photoLightboxImage'),
  lightboxCaption: document.getElementById('photoLightboxCaption'),
  lightboxMeta: document.getElementById('photoLightboxMeta'),
  lightboxCounter: document.getElementById('photoLightboxCounter'),
  lightboxPeakLink: document.getElementById('photoLightboxPeakLink'),
  lightboxPrev: document.getElementById('photoLightboxPrev'),
  lightboxNext: document.getElementById('photoLightboxNext')
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const trackAnalytics = (name, params = {}) => {
  if (window.NH48Analytics?.track) {
    window.NH48Analytics.track(name, params);
    return;
  }
  const analytics = window.NH48_INFO_ANALYTICS;
  if (analytics?.logEvent) {
    if (analytics.analytics) {
      analytics.logEvent(analytics.analytics, name, { page: location.pathname, ...params });
      return;
    }
    analytics.logEvent(name, params);
  }
};

const slugify = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const normalizeRange = (value) => {
  if (!value) return 'Other';
  return String(value).replace(/\.$/, '').trim() || 'Other';
};

const parseElevation = (value) => Number(String(value || '').replace(/[^0-9.]/g, '')) || 0;

const pickAlt = (photo, peakName) => photo?.alt
  || photo?.altText
  || photo?.caption
  || photo?.headline
  || `${peakName} summit photo`;

const pickCaption = (photo, peakName) => photo?.caption
  || photo?.headline
  || photo?.description
  || photo?.alt
  || photo?.altText
  || `${peakName} summit photo`;

const normalizePhotoUrl = (rawUrl) => {
  if (!rawUrl) return '';
  const input = String(rawUrl).trim();
  if (!input) return '';

  const jsdelivrMarker = '/gh/natesobol/nh48-api@main/photos/';
  if (input.includes(jsdelivrMarker)) {
    const tail = input.split(jsdelivrMarker)[1];
    return tail ? `${PHOTO_BASE_URL}/${tail.replace(/^\/+/, '')}` : input;
  }

  const rawGithubMarker = '/natesobol/nh48-api/main/photos/';
  if (input.includes(rawGithubMarker)) {
    const tail = input.split(rawGithubMarker)[1];
    return tail ? `${PHOTO_BASE_URL}/${tail.replace(/^\/+/, '')}` : input;
  }

  try {
    const parsed = new URL(input, window.location.origin);
    if (parsed.hostname === new URL(PHOTO_BASE_URL).hostname) {
      return `${PHOTO_BASE_URL}${parsed.pathname}`;
    }
    if (parsed.pathname.includes('/photos/')) {
      const tail = parsed.pathname.split('/photos/')[1];
      if (tail) return `${PHOTO_BASE_URL}/${tail.replace(/^\/+/, '')}`;
    }
    return parsed.href;
  } catch (error) {
    return input;
  }
};

const transformPhotoUrl = (rawUrl, prefix) => {
  const normalized = normalizePhotoUrl(rawUrl);
  if (!normalized) return '';

  try {
    const parsed = new URL(normalized);
    if (parsed.origin === PHOTO_BASE_URL) {
      return `${prefix}${parsed.pathname}`;
    }
  } catch (error) {
    return normalized;
  }

  return normalized;
};

const buildPeakUrl = (slug) => `/peak/${encodeURIComponent(slug)}/`;

const getLayoutClass = (photoCount) => {
  if (photoCount <= 1) return 'layout-1';
  if (photoCount === 2) return 'layout-2';
  if (photoCount <= 4) return 'layout-3-4';
  if (photoCount <= 6) return 'layout-5-6';
  return 'layout-7plus';
};

const getTileClasses = (photoCount, index) => {
  const classes = ['photo-figure'];
  if (photoCount >= 4 && index === 0) classes.push('is-feature');
  if (photoCount >= 5 && index > 0 && index % 4 === 1) classes.push('is-wide');
  if (photoCount >= 7 && index > 0 && index % 6 === 3) classes.push('is-tall');
  return classes;
};

const fetchPeaks = async () => {
  for (const url of API_URLS) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}`);
      return await response.json();
    } catch (error) {
      console.warn(error);
    }
  }
  throw new Error('Unable to fetch NH48 data.');
};

const buildPeakList = (data) => {
  const usedSlugs = new Set();
  const rangeCounts = new Map();

  const peaks = Object.entries(data || {}).map(([entrySlug, peak], index) => {
    const peakName = peak?.peakName || peak?.['Peak Name'] || peak?.name || `Peak ${index + 1}`;
    const baseSlug = slugify(peak?.slug || entrySlug || peakName) || `peak-${index + 1}`;
    let slug = baseSlug;
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(slug);

    const range = normalizeRange(peak?.['Range / Subrange'] || peak?.range || 'Other');
    const elevation = parseElevation(peak?.['Elevation (ft)'] || peak?.elevation || 0);

    const photos = Array.isArray(peak?.photos)
      ? peak.photos.map((photo, photoIndex) => {
          const originalUrl = normalizePhotoUrl(typeof photo === 'string' ? photo : photo?.url);
          const alt = pickAlt(photo, peakName);
          const caption = pickCaption(photo, peakName);
          return {
            id: `${slug}-photo-${photoIndex + 1}`,
            index: photoIndex,
            originalUrl,
            listUrl: transformPhotoUrl(originalUrl, PHOTO_LIST_PREFIX),
            lightboxUrl: transformPhotoUrl(originalUrl, PHOTO_LIGHTBOX_PREFIX),
            alt,
            caption,
            description: caption
          };
        }).filter((photo) => Boolean(photo.originalUrl))
      : [];

    rangeCounts.set(range, (rangeCounts.get(range) || 0) + photos.length);

    return {
      slug,
      name: peakName,
      range,
      rangeSlug: slugify(range),
      elevation,
      peakUrl: buildPeakUrl(slug),
      photos,
      photoCount: photos.length
    };
  }).filter((peak) => peak.photoCount > 0);

  state.rangeCounts = rangeCounts;
  state.ranges = Array.from(rangeCounts.keys()).sort((a, b) => a.localeCompare(b));
  return peaks;
};

const sortPeaks = (peaks, sortKey) => {
  const sorted = [...peaks];
  sorted.sort((a, b) => {
    if (sortKey === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortKey === 'elevation-desc') {
      return (b.elevation - a.elevation) || a.name.localeCompare(b.name);
    }
    if (sortKey === 'elevation-asc') {
      return (a.elevation - b.elevation) || a.name.localeCompare(b.name);
    }
    const rangeCompare = a.range.localeCompare(b.range);
    if (rangeCompare !== 0) return rangeCompare;
    return a.name.localeCompare(b.name);
  });
  return sorted;
};

const filterPeaks = () => {
  const searchLower = state.search.trim().toLowerCase();
  return state.peaks.filter((peak) => {
    const matchesSearch = !searchLower || peak.name.toLowerCase().includes(searchLower);
    const matchesRange = state.activeRanges.size === 0 || state.activeRanges.has(peak.range);
    return matchesSearch && matchesRange;
  });
};

const groupPeaksByRange = (peaks) => {
  const groups = [];
  const indexByRange = new Map();

  peaks.forEach((peak) => {
    if (!indexByRange.has(peak.range)) {
      indexByRange.set(peak.range, groups.length);
      groups.push({
        rangeName: peak.range,
        rangeSlug: peak.rangeSlug || slugify(peak.range),
        peaks: [],
        photoCount: 0
      });
    }

    const groupIndex = indexByRange.get(peak.range);
    const group = groups[groupIndex];
    group.peaks.push(peak);
    group.photoCount += peak.photoCount;
  });

  return groups;
};

const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value || 0);

const updateStats = (groups) => {
  const peakCount = groups.reduce((total, group) => total + group.peaks.length, 0);
  const photoCount = groups.reduce((total, group) => total + group.photoCount, 0);
  const rangeCount = groups.length;

  if (elements.statsPeaks) elements.statsPeaks.textContent = formatNumber(peakCount);
  if (elements.statsPhotos) elements.statsPhotos.textContent = formatNumber(photoCount);
  if (elements.statsRanges) elements.statsRanges.textContent = formatNumber(rangeCount);

  if (elements.viewStatus) {
    elements.viewStatus.textContent = `Showing ${formatNumber(photoCount)} photos across ${formatNumber(peakCount)} peaks in ${formatNumber(rangeCount)} ranges.`;
  }
};

const renderRangeFilters = () => {
  if (!elements.rangeFilters) return;

  elements.rangeFilters.innerHTML = '';
  state.ranges.forEach((range) => {
    const option = document.createElement('option');
    option.value = range;
    option.textContent = `${range} (${formatNumber(state.rangeCounts.get(range) || 0)})`;
    option.selected = state.activeRanges.has(range);
    elements.rangeFilters.appendChild(option);
  });
};

const getRenderedRangeBySlug = (rangeSlug) => state.renderedRangeGroups
  .find((group) => group.rangeSlug === rangeSlug);

const updateRangeJumpActiveState = () => {
  if (!elements.rangeJumpLinks) return;
  const links = elements.rangeJumpLinks.querySelectorAll('.jump-link');
  links.forEach((link) => {
    const isActive = link.dataset.rangeSlug === state.activeRangeSlug;
    link.classList.toggle('active', isActive);
  });
};

const renderPeakJumpLinks = () => {
  if (!elements.peakJumpLinks) return;

  elements.peakJumpLinks.innerHTML = '';
  const activeGroup = getRenderedRangeBySlug(state.activeRangeSlug);

  if (!activeGroup) {
    return;
  }

  activeGroup.peaks.forEach((peak) => {
    const link = document.createElement('a');
    link.href = `#peak-${peak.slug}`;
    link.className = 'jump-link';
    link.dataset.peakSlug = peak.slug;
    link.textContent = peak.name;
    elements.peakJumpLinks.appendChild(link);
  });
};

const setActiveRange = (rangeSlug) => {
  if (!rangeSlug || state.activeRangeSlug === rangeSlug) return;
  state.activeRangeSlug = rangeSlug;
  updateRangeJumpActiveState();
  renderPeakJumpLinks();
};

const renderRangeJumpLinks = () => {
  if (!elements.rangeJumpLinks) return;

  elements.rangeJumpLinks.innerHTML = '';

  if (!state.renderedRangeGroups.length) {
    state.activeRangeSlug = '';
    renderPeakJumpLinks();
    return;
  }

  const hasActive = state.renderedRangeGroups.some((group) => group.rangeSlug === state.activeRangeSlug);
  if (!hasActive) {
    state.activeRangeSlug = state.renderedRangeGroups[0].rangeSlug;
  }

  state.renderedRangeGroups.forEach((group) => {
    const link = document.createElement('a');
    link.href = `#range-${group.rangeSlug}`;
    link.className = 'jump-link';
    link.dataset.rangeSlug = group.rangeSlug;

    const label = document.createElement('span');
    label.textContent = group.rangeName;

    const count = document.createElement('span');
    count.className = 'jump-link__count';
    count.textContent = `${group.peaks.length} peaks`;

    link.appendChild(label);
    link.appendChild(count);

    link.addEventListener('click', () => {
      setActiveRange(group.rangeSlug);
    });

    elements.rangeJumpLinks.appendChild(link);
  });

  updateRangeJumpActiveState();
  renderPeakJumpLinks();
};

const createRangeHeading = (group) => {
  const header = document.createElement('header');
  header.className = 'range-heading';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'range-heading__title-wrap';

  const kicker = document.createElement('p');
  kicker.className = 'kicker';
  kicker.textContent = 'Range';

  const title = document.createElement('h2');
  title.textContent = group.rangeName;

  titleWrap.appendChild(kicker);
  titleWrap.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'range-heading__meta';

  const peaksPill = document.createElement('p');
  peaksPill.className = 'range-meta-pill';
  peaksPill.textContent = `${group.peaks.length} peaks`;

  const photosPill = document.createElement('p');
  photosPill.className = 'range-meta-pill';
  photosPill.textContent = `${group.photoCount} photos`;

  meta.appendChild(peaksPill);
  meta.appendChild(photosPill);

  header.appendChild(titleWrap);
  header.appendChild(meta);

  return header;
};

const createPeakSection = (peak) => {
  const peakSection = document.createElement('article');
  peakSection.className = 'peak-section reveal-target';
  peakSection.id = `peak-${peak.slug}`;
  peakSection.dataset.rangeSlug = peak.rangeSlug;
  peakSection.dataset.peakSlug = peak.slug;

  const header = document.createElement('header');
  header.className = 'peak-header';

  const heading = document.createElement('h3');
  heading.className = 'peak-heading';
  heading.textContent = peak.name;

  const meta = document.createElement('div');
  meta.className = 'peak-meta';

  const elevation = document.createElement('p');
  elevation.className = 'peak-meta__pill';
  elevation.textContent = `${formatNumber(peak.elevation)} ft`;

  const photos = document.createElement('p');
  photos.className = 'peak-meta__pill';
  photos.textContent = `${peak.photoCount} photos`;

  const peakLink = document.createElement('a');
  peakLink.className = 'peak-link';
  peakLink.href = peak.peakUrl;
  peakLink.textContent = 'Open Peak Page';

  meta.appendChild(elevation);
  meta.appendChild(photos);
  meta.appendChild(peakLink);

  header.appendChild(heading);
  header.appendChild(meta);

  const grid = document.createElement('div');
  grid.className = `photo-grid ${getLayoutClass(peak.photoCount)}`;

  peak.photos.forEach((photo, photoIndex) => {
    const figure = document.createElement('figure');
    figure.className = getTileClasses(peak.photoCount, photoIndex).join(' ');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'photo-tile';
    button.dataset.peakSlug = peak.slug;
    button.dataset.photoIndex = String(photoIndex);
    button.setAttribute('aria-label', `${peak.name} photo ${photoIndex + 1}`);

    const image = document.createElement('img');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.src = photo.listUrl || photo.originalUrl;
    image.alt = photo.alt;

    const caption = document.createElement('figcaption');
    caption.className = 'photo-figure__caption';
    caption.textContent = photo.caption;

    button.appendChild(image);
    figure.appendChild(button);
    figure.appendChild(caption);
    grid.appendChild(figure);
  });

  peakSection.appendChild(header);
  peakSection.appendChild(grid);

  return peakSection;
};

const render = () => {
  const filteredPeaks = filterPeaks();
  const sortedPeaks = sortPeaks(filteredPeaks, state.sort);
  const groupedRanges = groupPeaksByRange(sortedPeaks);

  state.renderedRangeGroups = groupedRanges;

  if (elements.container) elements.container.innerHTML = '';
  if (elements.empty) elements.empty.hidden = groupedRanges.length > 0;

  updateStats(groupedRanges);
  renderRangeJumpLinks();

  if (!groupedRanges.length) {
    if (elements.viewStatus) {
      elements.viewStatus.textContent = 'No photos match your current filters.';
    }
    connectRevealObserver();
    connectRangeObserver();
    return;
  }

  groupedRanges.forEach((group) => {
    const section = document.createElement('section');
    section.className = 'range-section reveal-target';
    section.id = `range-${group.rangeSlug}`;
    section.dataset.rangeSlug = group.rangeSlug;

    section.appendChild(createRangeHeading(group));

    group.peaks.forEach((peak) => {
      section.appendChild(createPeakSection(peak));
    });

    elements.container.appendChild(section);
  });

  connectRevealObserver();
  connectRangeObserver();

  if (!state.hasAppliedInitialHash) {
    state.hasAppliedInitialHash = true;
    applyHashSelection();
  }
};

const connectRevealObserver = () => {
  if (state.revealObserver) {
    state.revealObserver.disconnect();
    state.revealObserver = null;
  }

  const revealTargets = document.querySelectorAll('.reveal-target');
  if (prefersReducedMotion || !revealTargets.length) {
    revealTargets.forEach((node) => node.classList.add('is-visible'));
    return;
  }

  state.revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.18 });

  revealTargets.forEach((node) => state.revealObserver.observe(node));
};

const connectRangeObserver = () => {
  if (state.rangeObserver) {
    state.rangeObserver.disconnect();
    state.rangeObserver = null;
  }

  const rangeSections = Array.from(document.querySelectorAll('.range-section'));
  if (!rangeSections.length) {
    return;
  }

  state.rangeObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

    if (!visible.length) return;
    const nextRange = visible[0].target?.dataset?.rangeSlug;
    if (nextRange) {
      setActiveRange(nextRange);
    }
  }, {
    threshold: [0.2, 0.4, 0.65],
    rootMargin: '-10% 0px -55% 0px'
  });

  rangeSections.forEach((section) => state.rangeObserver.observe(section));
};

const getPeakBySlug = (peakSlug) => state.peaks.find((peak) => peak.slug === peakSlug);

const setLightboxOpen = (open) => {
  if (!elements.lightbox) return;
  state.lightbox.open = open;
  elements.lightbox.hidden = !open;
  elements.lightbox.setAttribute('aria-hidden', open ? 'false' : 'true');
  document.body.classList.toggle('lightbox-open', open);
};

const renderLightboxFrame = () => {
  const peak = getPeakBySlug(state.lightbox.peakSlug);
  if (!peak || !peak.photos.length) return;

  const index = Math.max(0, Math.min(state.lightbox.index, peak.photos.length - 1));
  state.lightbox.index = index;

  const activePhoto = peak.photos[index];

  if (elements.lightboxImage) {
    elements.lightboxImage.src = activePhoto.lightboxUrl || activePhoto.originalUrl;
    elements.lightboxImage.alt = activePhoto.alt;
  }
  if (elements.lightboxCaption) elements.lightboxCaption.textContent = activePhoto.caption;
  if (elements.lightboxMeta) elements.lightboxMeta.textContent = `${peak.range} | ${peak.name}`;
  if (elements.lightboxCounter) elements.lightboxCounter.textContent = `${index + 1} of ${peak.photos.length}`;

  if (elements.lightboxPeakLink) {
    elements.lightboxPeakLink.href = peak.peakUrl;
    elements.lightboxPeakLink.textContent = `Open ${peak.name} Page`;
  }

  if (elements.lightboxPrev) elements.lightboxPrev.disabled = index <= 0;
  if (elements.lightboxNext) elements.lightboxNext.disabled = index >= peak.photos.length - 1;
};

const openLightbox = (peakSlug, photoIndex) => {
  const peak = getPeakBySlug(peakSlug);
  if (!peak || !peak.photos.length) return;

  state.lightbox.peakSlug = peakSlug;
  state.lightbox.index = Number(photoIndex) || 0;

  renderLightboxFrame();
  setLightboxOpen(true);

  trackAnalytics('photos_lightbox_open', {
    peak_slug: peak.slug,
    index: state.lightbox.index + 1,
    total_for_peak: peak.photos.length
  });
};

const closeLightbox = () => {
  setLightboxOpen(false);
  if (elements.lightboxImage) elements.lightboxImage.src = '';
};

const moveLightbox = (delta) => {
  if (!state.lightbox.open) return;
  const peak = getPeakBySlug(state.lightbox.peakSlug);
  if (!peak) return;

  const nextIndex = state.lightbox.index + delta;
  if (nextIndex < 0 || nextIndex >= peak.photos.length) return;

  state.lightbox.index = nextIndex;
  renderLightboxFrame();

  trackAnalytics('photos_lightbox_nav', {
    peak_slug: peak.slug,
    direction: delta < 0 ? 'prev' : 'next',
    index: state.lightbox.index + 1
  });
};

const applyHashSelection = () => {
  const hash = (window.location.hash || '').replace('#', '');
  if (!hash) return;

  if (hash.startsWith('range-')) {
    const rangeSlug = hash.replace('range-', '');
    if (getRenderedRangeBySlug(rangeSlug)) {
      setActiveRange(rangeSlug);
    }
  }

  if (hash.startsWith('peak-')) {
    const peakSlug = hash.replace('peak-', '');
    const peak = getPeakBySlug(peakSlug);
    if (peak) {
      setActiveRange(peak.rangeSlug);
    }
  }

  const target = document.getElementById(hash);
  if (target) {
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
};

const buildGallerySchema = () => {
  if (!elements.schemaScript || !state.peaks.length) return;

  const imageObjects = [];

  state.peaks.forEach((peak) => {
    peak.photos.forEach((photo, photoIndex) => {
      const id = `${SITE_URL}/photos/#${photo.id}`;
      imageObjects.push({
        '@type': 'ImageObject',
        '@id': id,
        url: photo.lightboxUrl || photo.originalUrl,
        contentUrl: photo.originalUrl,
        thumbnailUrl: photo.listUrl || photo.originalUrl,
        name: `${peak.name} photo ${photoIndex + 1}`,
        caption: photo.caption,
        description: photo.description,
        inLanguage: 'en',
        license: LICENSE_URL,
        acquireLicensePage: `${SITE_URL}/contact`,
        creditText: '(c) Nathan Sobol / NH48pics.com',
        creator: {
          '@type': 'Person',
          name: 'Nathan Sobol',
          url: `${SITE_URL}/about`
        },
        isPartOf: {
          '@id': `${SITE_URL}/photos/#image-gallery`
        },
        about: {
          '@type': 'Place',
          name: peak.name,
          containedInPlace: {
            '@type': 'Place',
            name: peak.range
          }
        }
      });
    });
  });

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/photos/#collection-page`,
        url: `${SITE_URL}/photos/`,
        name: 'NH48 Summit Photo Collection',
        description: 'Browse all NH48 summit photos grouped by range and peak.',
        inLanguage: 'en',
        primaryImageOfPage: imageObjects.length ? { '@id': imageObjects[0]['@id'] } : undefined,
        hasPart: [{ '@id': `${SITE_URL}/photos/#image-gallery` }]
      },
      {
        '@type': 'ImageGallery',
        '@id': `${SITE_URL}/photos/#image-gallery`,
        name: 'NH48 Summit Photo Gallery',
        description: 'Cinematic segmented gallery of all NH48 summit photography.',
        url: `${SITE_URL}/photos/`,
        numberOfItems: imageObjects.length,
        associatedMedia: imageObjects.map((imageObject) => ({ '@id': imageObject['@id'] }))
      },
      ...imageObjects
    ]
  };

  elements.schemaScript.textContent = JSON.stringify(schema).replace(/</g, '\\u003c');
};

const init = async () => {
  if (elements.loading) elements.loading.hidden = false;

  try {
    const data = await fetchPeaks();
    state.peaks = buildPeakList(data);

    renderRangeFilters();
    buildGallerySchema();
    render();
  } catch (error) {
    if (elements.empty) {
      elements.empty.hidden = false;
      elements.empty.textContent = 'Unable to load photos right now.';
    }
    if (elements.viewStatus) {
      elements.viewStatus.textContent = 'Unable to load the NH48 photo archive.';
    }
    console.error(error);
  } finally {
    if (elements.loading) elements.loading.hidden = true;
  }
};

if (elements.search) {
  let searchDebounce = null;
  elements.search.addEventListener('input', (event) => {
    state.search = event.target.value || '';
    render();

    if (searchDebounce) clearTimeout(searchDebounce);
    const searchLength = state.search.trim().length;
    searchDebounce = setTimeout(() => {
      trackAnalytics('photos_search', { search_length: searchLength });
    }, 350);
  });
}

if (elements.sort) {
  elements.sort.addEventListener('change', (event) => {
    state.sort = event.target.value || 'range';
    render();

    trackAnalytics('photos_sort_change', {
      sort: state.sort
    });
  });
}

if (elements.rangeFilters) {
  elements.rangeFilters.addEventListener('change', (event) => {
    const selected = Array.from(event.target.selectedOptions || []).map((option) => option.value);
    state.activeRanges = new Set(selected);
    render();

    trackAnalytics('photos_filter_change', {
      selected_count: selected.length
    });
  });
}

if (elements.container) {
  elements.container.addEventListener('click', (event) => {
    const trigger = event.target.closest('button.photo-tile');
    if (!trigger) return;

    const peakSlug = trigger.dataset.peakSlug;
    const photoIndex = Number(trigger.dataset.photoIndex || 0);
    if (!peakSlug) return;

    openLightbox(peakSlug, photoIndex);
  });
}

if (elements.lightboxPrev) {
  elements.lightboxPrev.addEventListener('click', () => moveLightbox(-1));
}

if (elements.lightboxNext) {
  elements.lightboxNext.addEventListener('click', () => moveLightbox(1));
}

if (elements.lightbox) {
  elements.lightbox.addEventListener('click', (event) => {
    if (event.target.closest('[data-lightbox-close]')) {
      closeLightbox();
    }
  });
}

window.addEventListener('hashchange', () => {
  applyHashSelection();
});

document.addEventListener('keydown', (event) => {
  if (!state.lightbox.open) return;

  if (event.key === 'Escape') {
    closeLightbox();
    return;
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    moveLightbox(-1);
    return;
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    moveLightbox(1);
  }
});

init();
