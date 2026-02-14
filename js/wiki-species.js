(function () {
  const RAW_BASE = 'https://raw.githubusercontent.com/natesobol/nh48-api/main';
  const CDN_BASE = 'https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main';

  function q(id) {
    return document.getElementById(id);
  }

  function text(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  function titleCase(value) {
    return String(value || '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function parsePath(kind) {
    const section = kind === 'animal' ? 'animals' : 'plants';
    const match = window.location.pathname.match(new RegExp(`^/wiki/${section}/([^/]+)`, 'i'));
    return match ? decodeURIComponent(match[1]).toLowerCase() : '';
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

  function formatRange(value, unitLabel) {
    if (!Array.isArray(value) || value.length < 2) return '';
    const low = Number(value[0]);
    const high = Number(value[1]);
    if (!Number.isFinite(low) || !Number.isFinite(high)) return '';
    return `${low.toLocaleString()} - ${high.toLocaleString()} ${unitLabel}`;
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
      caption.textContent = `${photo.caption || photo.title || photo.alt || ''}${photo.credit ? ` - ${photo.credit}` : ''}`;
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

  function renderTags(entry) {
    const chipRow = q('wikiEntryTags');
    if (!chipRow) return;
    chipRow.innerHTML = '';
    const tags = Array.isArray(entry.tags) ? entry.tags : [];
    const labelTags = [entry.type, entry.conservationStatus, ...tags].map(text).filter(Boolean);
    labelTags.forEach((tag) => {
      const chip = document.createElement('span');
      chip.className = 'wiki-chip';
      chip.textContent = titleCase(tag);
      chipRow.appendChild(chip);
    });
  }

  function renderSources(entry) {
    const list = q('wikiSourcesList');
    if (!list) return;
    list.innerHTML = '';
    const sources = Array.isArray(entry.sources) ? entry.sources : [];
    if (!sources.length) {
      const li = document.createElement('li');
      li.textContent = 'No external references listed for this entry.';
      list.appendChild(li);
      return;
    }

    sources.forEach((source) => {
      const li = document.createElement('li');
      const anchor = document.createElement('a');
      anchor.href = source.url || '#';
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = source.title || source.url || 'Source';
      li.appendChild(anchor);
      list.appendChild(li);
    });
  }

  function renderEntry(entry, kind) {
    const commonName = text(entry.commonName || entry.name || titleCase(entry.slug));
    const scientificName = text(entry.scientificName || '');
    const subtitle = scientificName ? `${scientificName} - ${text(entry.type) || 'Entry'}` : text(entry.type) || 'Entry';
    q('wikiEntryTitle').textContent = commonName || titleCase(kind);
    q('wikiEntrySubtitle').textContent = subtitle || 'No subtitle metadata available.';
    q('wikiEntryBreadcrumbLabel').textContent = commonName || titleCase(kind);

    q('wikiOverviewText').textContent = text(entry.description) || 'No overview available.';
    const ecologyText = q('wikiEcologyText');
    if (ecologyText) {
      ecologyText.textContent = text(entry.ecology) || 'No ecology notes available.';
    }

    const factsGrid = q('wikiFactsGrid');
    if (factsGrid) {
      factsGrid.innerHTML = '';
      appendRow(factsGrid, 'Common Name', commonName);
      appendRow(factsGrid, 'Scientific Name', scientificName);
      appendRow(factsGrid, 'Type', text(entry.type));
      appendRow(factsGrid, 'Habitat', text(entry.habitat));
      appendRow(factsGrid, 'Elevation Range', formatRange(entry.elevationRange_ft, 'ft'));
      if (kind === 'plant') {
        appendRow(factsGrid, 'Bloom Period', text(entry.bloomPeriod));
      } else {
        appendRow(factsGrid, 'Diet', text(entry.diet));
        appendRow(factsGrid, 'Activity Pattern', text(entry.activityPattern));
        appendRow(factsGrid, 'Weight Range', formatRange(entry.weightRange_kg, 'kg'));
      }
      appendRow(factsGrid, 'Conservation Status', text(entry.conservationStatus));
    }

    const behaviorGrid = q('wikiBehaviorGrid');
    if (behaviorGrid) {
      behaviorGrid.innerHTML = '';
      appendRow(behaviorGrid, 'Diet', text(entry.diet));
      appendRow(behaviorGrid, 'Activity Pattern', text(entry.activityPattern));
      appendRow(behaviorGrid, 'Habitat Notes', text(entry.habitat));
    }

    renderTags(entry);
    renderSources(entry);
    renderCarousel(normalizeMedia(entry, commonName || titleCase(kind)));
  }

  function renderNotFound(kind, slug) {
    q('wikiEntryTitle').textContent = `${titleCase(kind)} Entry Not Found`;
    q('wikiEntrySubtitle').textContent = `No wiki record found for "${slug}".`;
    q('wikiEntryBreadcrumbLabel').textContent = titleCase(kind);
    q('wikiOverviewText').textContent = `No wiki record found for "${slug}".`;
    const shell = q('wikiMediaShell');
    if (shell) shell.classList.add('is-empty');
  }

  async function init() {
    const body = document.body;
    const kind = body.dataset.wikiKind === 'animal' ? 'animal' : 'plant';
    const slug = (body.dataset.wikiEntrySlug || parsePath(kind) || '').toLowerCase();
    const file = kind === 'animal' ? 'data/wiki/animals.json' : 'data/wiki/plants.json';
    if (!slug) {
      renderNotFound(kind, slug);
      return;
    }
    const payload = await loadWikiJson(file);
    const list = Array.isArray(payload) ? payload : [];
    const entry = list.find((item) => text(item.slug).toLowerCase() === slug);
    if (!entry) {
      renderNotFound(kind, slug);
      return;
    }
    renderEntry(entry, kind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
