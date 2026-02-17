(() => {
  'use strict';

  const SITE_ORIGIN = 'https://nh48.info';
  const IS_FRENCH_ROUTE = /^\/fr(\/|$)/i.test(window.location.pathname || '');
  const CATALOG_PATH = IS_FRENCH_ROUTE ? '/fr/bird-catalog' : '/bird-catalog';
  const DETAIL_PATH_PREFIX = IS_FRENCH_ROUTE ? '/fr/bird' : '/bird';
  const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720"><rect width="100%" height="100%" fill="#0f172a"/><text x="50%" y="48%" dominant-baseline="middle" text-anchor="middle" fill="#93a3b8" font-family="system-ui" font-size="38">No bird photo yet</text><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#6b7d96" font-family="system-ui" font-size="24">Connect NH Bird data source to enable gallery media</text></svg>'
  )}`;
  const FACT_FALLBACK = 'Pending data source hookup.';

  const carouselEl = document.getElementById('carousel');
  const dotsEl = document.getElementById('dots');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const carouselLoading = document.getElementById('carouselLoading');
  const shareCardBtn = document.getElementById('shareCardBtn');
  const shareCardDropdown = document.getElementById('shareCardDropdown');
  const shareCardStatus = document.getElementById('shareCardStatus');
  const backToCatalogLink = document.getElementById('backToCatalogLink');
  const birdSequenceNav = document.getElementById('birdSequenceNav');
  const prevBirdLink = document.getElementById('prevBirdLink');
  const nextBirdLink = document.getElementById('nextBirdLink');
  const relatedBirdsSection = document.getElementById('relatedBirdsSection');
  const relatedBirdsList = document.getElementById('relatedBirdsList');
  const detailStatusNote = document.getElementById('detailStatusNote');

  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = String(value || '').trim() || '\u2014';
  };

  const normalizeToken = (input) => String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  const normalizeSearchText = (input) => String(input || '')
    .toLowerCase()
    .replace(/[^\w\s/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const humanizeSlug = (value) => normalizeToken(value)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Bird';

  const asStringList = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(/[,;|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const normalizeBirdRecord = (raw, index = 0) => {
    if (!raw || typeof raw !== 'object') return null;
    const common = String(raw.common || raw.commonName || raw.name || raw.displayName || '').trim();
    const latin = String(raw.latin || raw.scientificName || raw.scientific || '').trim();
    const id = normalizeToken(raw.id || raw.slug || raw.code || common || latin || `bird-${index + 1}`);
    if (!id) return null;

    const images = []
      .concat(asStringList(raw.imgs))
      .concat(asStringList(raw.images))
      .concat(asStringList(raw.photos))
      .concat(asStringList(raw.photoUrls));

    const notes = []
      .concat(asStringList(raw.notes))
      .concat(asStringList(raw.fieldNotes));

    return {
      id,
      common: common || humanizeSlug(id),
      latin,
      type: String(raw.type || raw.group || raw.category || '').trim(),
      habitat: String(raw.habitat || raw.primaryHabitat || '').trim(),
      season: String(raw.season || raw.migrationWindow || raw.bestSeason || '').trim(),
      elevation: String(raw.elevation || raw.elevationRange || '').trim(),
      plumage: String(raw.plumage || raw.plumageNotes || '').trim(),
      similar: String(raw.similar || raw.similarSpecies || '').trim(),
      behavior: String(raw.behavior || raw.behaviorNotes || '').trim(),
      status: String(raw.status || raw.conservationStatus || '').trim(),
      tags: asStringList(raw.tags || raw.labels || raw.keywords),
      teaser: String(raw.teaser || raw.summary || raw.overview || '').trim(),
      desc: String(raw.desc || raw.description || '').trim(),
      notes,
      credits: String(raw.credits || raw.photoCredit || raw.credit || '').trim(),
      imgs: Array.from(new Set(images))
    };
  };

  const resolveBirdDataset = () => {
    const payload = window.__NH_BIRD_DEV_DATA__;
    let records = [];
    if (Array.isArray(payload)) {
      records = payload;
    } else if (typeof payload === 'string' && payload.trim()) {
      try {
        const parsed = JSON.parse(payload);
        if (Array.isArray(parsed)) records = parsed;
      } catch (_) {
        records = [];
      }
    }
    return records
      .map((raw, idx) => normalizeBirdRecord(raw, idx))
      .filter(Boolean);
  };

  const parseSlugFromPath = () => {
    const pathname = String(window.location.pathname || '/');
    const noLocale = pathname.replace(/^\/fr(?=\/|$)/, '') || '/';
    const match = noLocale.match(/^\/bird\/([^/]+)\/?$/i);
    if (!match) return '';
    try {
      return normalizeToken(decodeURIComponent(match[1]));
    } catch (_) {
      return normalizeToken(match[1]);
    }
  };

  const resolveReturnContext = () => {
    const params = new URLSearchParams(window.location.search);
    const raw = String(params.get('return') || '').trim();
    if (!raw) return CATALOG_PATH;
    try {
      const parsed = new URL(raw, SITE_ORIGIN);
      if (parsed.origin !== SITE_ORIGIN) return CATALOG_PATH;
      const resolved = `${parsed.pathname || '/'}${parsed.search || ''}${parsed.hash || ''}`;
      if (resolved.startsWith('/bird-catalog') || resolved.startsWith('/fr/bird-catalog')) {
        return resolved;
      }
    } catch (_) {
      if (raw.startsWith('/bird-catalog') || raw.startsWith('/fr/bird-catalog')) {
        return raw;
      }
    }
    return CATALOG_PATH;
  };

  const buildDetailUrl = (birdId, returnHref) => `${DETAIL_PATH_PREFIX}/${encodeURIComponent(birdId)}?return=${encodeURIComponent(returnHref)}`;

  let birds = [];
  let currentBird = null;
  let currentIndex = -1;
  let currentSlide = 0;
  let slides = [];
  let dots = [];
  let shareAvailable = false;

  function setShareMenuOpen(open) {
    if (!shareCardBtn || !shareCardDropdown) return;
    const isOpen = Boolean(open);
    shareCardBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    shareCardDropdown.hidden = !isOpen;
  }

  function setShareStatus(message) {
    if (!shareCardStatus) return;
    shareCardStatus.textContent = String(message || '').trim();
  }

  function updateShareAvailability() {
    if (!shareCardBtn) return;
    const hasRecord = !!currentBird;
    const hasImage = hasRecord && Array.isArray(currentBird.imgs) && currentBird.imgs.length > 0;
    shareAvailable = hasRecord && hasImage;
    shareCardBtn.disabled = !shareAvailable;
    if (!shareAvailable) {
      setShareStatus('Share and download actions unlock after bird photos are connected.');
      setShareMenuOpen(false);
    } else {
      setShareStatus('');
    }
  }

  function buildShareMenu() {
    if (!shareCardDropdown) return;
    shareCardDropdown.innerHTML = '';
    const actions = [
      { label: 'Download Card', hint: 'Bird share card export is pending schema hookup.' },
      { label: 'Share to Social', hint: 'Social share options unlock once bird media is connected.' }
    ];
    actions.forEach((action) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = action.label;
      btn.addEventListener('click', () => setShareStatus(action.hint));
      shareCardDropdown.appendChild(btn);
    });
  }

  function setCarouselLoading(isLoading) {
    if (!carouselLoading) return;
    carouselLoading.hidden = !isLoading;
  }

  function showSlide(index) {
    if (!slides.length) return;
    let nextIndex = Number(index);
    if (!Number.isFinite(nextIndex)) nextIndex = 0;
    if (nextIndex < 0) nextIndex = slides.length - 1;
    if (nextIndex >= slides.length) nextIndex = 0;
    currentSlide = nextIndex;
    slides.forEach((slide, idx) => {
      slide.classList.toggle('active', idx === currentSlide);
    });
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentSlide);
    });
  }

  function renderCarousel(images) {
    if (!carouselEl || !dotsEl) return;
    carouselEl.innerHTML = '';
    dotsEl.innerHTML = '';
    slides = [];
    dots = [];
    currentSlide = 0;
    const sources = (Array.isArray(images) && images.length ? images : [PLACEHOLDER_IMAGE])
      .map((src) => String(src || '').trim())
      .filter(Boolean);

    setCarouselLoading(true);
    let firstLoaded = false;

    sources.forEach((src, idx) => {
      const slide = document.createElement('div');
      slide.className = 'slide';
      const img = document.createElement('img');
      img.loading = idx === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.alt = currentBird ? `${currentBird.common} photo ${idx + 1}` : `Bird placeholder image ${idx + 1}`;
      img.src = src;
      img.addEventListener('load', () => {
        if (!firstLoaded) {
          firstLoaded = true;
          setCarouselLoading(false);
        }
      });
      img.addEventListener('error', () => {
        img.src = PLACEHOLDER_IMAGE;
        if (!firstLoaded) {
          firstLoaded = true;
          setCarouselLoading(false);
        }
      }, { once: true });
      slide.appendChild(img);
      carouselEl.appendChild(slide);
      slides.push(slide);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'dot';
      dot.setAttribute('aria-label', `Show image ${idx + 1}`);
      dot.addEventListener('click', () => showSlide(idx));
      dotsEl.appendChild(dot);
      dots.push(dot);
    });

    if (!sources.length) {
      setCarouselLoading(false);
    }

    showSlide(0);
  }

  function renderTags(tags) {
    const tagsEl = document.getElementById('d-tags');
    if (!tagsEl) return;
    tagsEl.innerHTML = '';
    const list = Array.isArray(tags) ? tags : [];
    list.slice(0, 12).forEach((tag) => {
      const pill = document.createElement('span');
      pill.className = 'chip';
      pill.textContent = String(tag || '').trim();
      tagsEl.appendChild(pill);
    });
  }

  function renderNotes(notes) {
    const sec = document.getElementById('sec-notes');
    const listEl = document.getElementById('d-notes');
    if (!sec || !listEl) return;
    listEl.innerHTML = '';
    const lines = Array.isArray(notes) ? notes.filter(Boolean) : [];
    if (!lines.length) {
      sec.hidden = true;
      return;
    }
    lines.forEach((line) => {
      const li = document.createElement('li');
      li.textContent = String(line);
      listEl.appendChild(li);
    });
    sec.hidden = false;
  }

  function renderCredits(credits) {
    const sec = document.getElementById('sec-credits');
    const out = document.getElementById('d-credits');
    if (!sec || !out) return;
    const value = String(credits || '').trim();
    if (!value) {
      sec.hidden = true;
      return;
    }
    out.textContent = value;
    sec.hidden = false;
  }

  function updateSequenceNavigation(returnHref) {
    if (!birdSequenceNav || !prevBirdLink || !nextBirdLink || currentIndex < 0 || birds.length < 2) {
      if (birdSequenceNav) birdSequenceNav.hidden = true;
      return;
    }
    const prev = birds[(currentIndex - 1 + birds.length) % birds.length];
    const next = birds[(currentIndex + 1) % birds.length];
    prevBirdLink.href = buildDetailUrl(prev.id, returnHref);
    nextBirdLink.href = buildDetailUrl(next.id, returnHref);
    prevBirdLink.textContent = `\u2190 ${prev.common}`;
    nextBirdLink.textContent = `${next.common} \u2192`;
    birdSequenceNav.hidden = false;
  }

  function renderRelatedBirds(returnHref) {
    if (!relatedBirdsSection || !relatedBirdsList || !currentBird) return;
    relatedBirdsList.innerHTML = '';
    const currentTags = new Set((currentBird.tags || []).map((tag) => normalizeToken(tag)));
    const related = birds
      .filter((bird) => bird.id !== currentBird.id)
      .map((bird) => {
        let score = 0;
        if (bird.type && currentBird.type && normalizeToken(bird.type) === normalizeToken(currentBird.type)) {
          score += 2;
        }
        (bird.tags || []).forEach((tag) => {
          if (currentTags.has(normalizeToken(tag))) score += 1;
        });
        return { bird, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.bird.common.localeCompare(b.bird.common))
      .slice(0, 3)
      .map((entry) => entry.bird);

    if (!related.length) {
      relatedBirdsSection.hidden = true;
      return;
    }
    related.forEach((bird) => {
      const link = document.createElement('a');
      link.href = buildDetailUrl(bird.id, returnHref);
      link.innerHTML = `<strong>${bird.common}</strong><br><span>${bird.latin || bird.type || 'Bird profile'}</span>`;
      relatedBirdsList.appendChild(link);
    });
    relatedBirdsSection.hidden = false;
  }

  function renderBirdRecord(record, slug, returnHref) {
    currentBird = record;
    currentIndex = birds.findIndex((bird) => bird.id === record.id);

    const title = record.common || humanizeSlug(slug);
    document.title = `${title} | NH Bird Catalog`;
    setText('detail-title', `NH Bird Catalog \u2022 ${title}`);
    setText('detail-breadcrumb', title);
    setText('d-title', title);
    setText('d-latin', record.latin || 'Bird profile');
    renderTags(record.tags);

    const desc = String(record.desc || record.teaser || '').trim()
      || 'Bird record loaded from development data source. Connect the production schema to complete this profile.';
    setText('d-desc', desc);
    setText('f-type', record.type || FACT_FALLBACK);
    setText('f-habitat', record.habitat || FACT_FALLBACK);
    setText('f-elev', record.elevation || FACT_FALLBACK);
    setText('f-season', record.season || FACT_FALLBACK);
    setText('f-plumage', record.plumage || FACT_FALLBACK);
    setText('f-similar', record.similar || FACT_FALLBACK);
    setText('f-behavior', record.behavior || FACT_FALLBACK);
    setText('f-status', record.status || FACT_FALLBACK);

    renderNotes(record.notes);
    renderCredits(record.credits);
    renderCarousel(record.imgs);
    updateShareAvailability();
    updateSequenceNavigation(returnHref);
    renderRelatedBirds(returnHref);

    if (detailStatusNote) {
      detailStatusNote.textContent = `Bird detail shell active. Record slug: ${record.id}.`;
    }
  }

  function renderEmptyState(slug, hasDataset) {
    currentBird = null;
    currentIndex = -1;
    const label = humanizeSlug(slug || 'bird');
    document.title = `${label} | NH Bird Catalog`;
    setText('detail-title', `NH Bird Catalog \u2022 ${label}`);
    setText('detail-breadcrumb', label);
    setText('d-title', label);
    setText('d-latin', 'Data source not connected yet');
    renderTags([]);
    setText('d-desc', hasDataset
      ? 'No matching bird record was found for this slug in the current development dataset.'
      : 'No bird records yet. Data source not connected yet.');
    setText('f-type', FACT_FALLBACK);
    setText('f-habitat', FACT_FALLBACK);
    setText('f-elev', FACT_FALLBACK);
    setText('f-season', FACT_FALLBACK);
    setText('f-plumage', FACT_FALLBACK);
    setText('f-similar', FACT_FALLBACK);
    setText('f-behavior', FACT_FALLBACK);
    setText('f-status', FACT_FALLBACK);
    renderNotes([]);
    renderCredits('');
    renderCarousel([]);
    updateShareAvailability();
    if (birdSequenceNav) birdSequenceNav.hidden = true;
    if (relatedBirdsSection) relatedBirdsSection.hidden = true;
    if (detailStatusNote) {
      detailStatusNote.textContent = hasDataset
        ? 'Bird dataset is loaded, but this slug is not present.'
        : 'Bird detail shell is running without a connected dataset.';
    }
  }

  function init() {
    buildShareMenu();
    if (IS_FRENCH_ROUTE) {
      document.querySelectorAll('.page-breadcrumbs a[href="/"]').forEach((anchor) => {
        anchor.setAttribute('href', '/fr/');
      });
      document.querySelectorAll('.page-breadcrumbs a[href="/bird-catalog"]').forEach((anchor) => {
        anchor.setAttribute('href', '/fr/bird-catalog');
      });
    }

    const returnHref = resolveReturnContext();
    if (backToCatalogLink) {
      backToCatalogLink.href = returnHref;
      backToCatalogLink.textContent = returnHref === CATALOG_PATH
        ? '\u2190 Back to Bird Catalog'
        : '\u2190 Back to filtered catalog';
    }

    const slug = parseSlugFromPath();
    birds = resolveBirdDataset();
    const birdBySlug = birds.find((bird) => bird.id === slug);

    if (birdBySlug) {
      renderBirdRecord(birdBySlug, slug, returnHref);
    } else {
      renderEmptyState(slug, birds.length > 0);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => showSlide(currentSlide - 1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => showSlide(currentSlide + 1));
    }
    if (carouselEl) {
      carouselEl.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          showSlide(currentSlide - 1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          showSlide(currentSlide + 1);
        }
      });
    }

    if (shareCardBtn && shareCardDropdown) {
      shareCardBtn.addEventListener('click', () => {
        if (!shareAvailable) return;
        const isOpen = shareCardBtn.getAttribute('aria-expanded') === 'true';
        setShareMenuOpen(!isOpen);
      });
      document.addEventListener('click', (event) => {
        if (!shareCardDropdown.hidden && !document.getElementById('shareCardMenu')?.contains(event.target)) {
          setShareMenuOpen(false);
        }
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setShareMenuOpen(false);
      });
    }
  }

  init();
})();
