(() => {
  const FOOTER_ID = 'nh48-quick-browse-footer';
  const STYLE_ATTR = 'data-nh48-quick-footer-style';
  const FOOTER_ATTR = 'data-nh48-quick-footer';
  const PARTIAL_URL = '/pages/footer.html';
  const FOOTER_LEGAL_TEXT = '© 2026 Nathan Sobol · ' +
    '<a href="/catalog" class="legal-link nh48-link">NH 48</a>, ' +
    '<a href="/trails" class="legal-link tracing-link">White Mountain Tracing</a>, ' +
    '<a href="/long-trails" class="legal-link long-trail-link">Scenic & Long Trail</a> – Data, Routes, and Photos.';
  const PEMI_HEADING_TEXT = 'Pemigewasset';
  const UNIFIED_FOOTER_CSS = `
.nh48-quick-footer {
    --nh48-footer-grid-min: clamp(220px, 21vw, 260px);
    --nh48-footer-surface: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%);
    --nh48-footer-card: color-mix(in srgb, #141833 70%, rgba(10, 12, 26, 0.55) 30%);
    --nh48-footer-border: #ffffff;
    --nh48-footer-ink: var(--ink, #ffffff);
    --nh48-footer-accent: var(--accent, #22c55e);
    margin: 32px 0 0;
    width: 100%;
    max-width: none;
    background: var(--nh48-footer-surface);
    border: 0;
    border-top: 1px solid var(--nh48-footer-border);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
    padding: clamp(16px, 2vw, 22px) 0 0;
    color: var(--nh48-footer-ink);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    height: auto;
    max-height: none;
    overflow: visible;
    text-align: center;
    box-sizing: border-box;
    border-radius: 0;
    position: relative;
    isolation: isolate;
  }

  .nh48-quick-footer__header {
    text-align: center;
    max-width: 1080px;
    margin: 0 auto 0;
    padding: 0 clamp(16px, 3vw, 32px);
  }

  .nh48-quick-footer__controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 9px 12px;
    margin: 2px auto 0;
    border-radius: 14px;
    border: 1px solid var(--nh48-footer-border);
    background: var(--nh48-footer-card);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }

  .nh48-quick-footer__sort-button {
    appearance: none;
    border: 1px solid var(--nh48-footer-border);
    background: color-mix(in srgb, var(--nh48-footer-card) 70%, #000 30%);
    color: var(--nh48-footer-ink);
    border-radius: 12px;
    padding: 8px 13px;
    font-weight: 800;
    letter-spacing: 0.25px;
    cursor: pointer;
    transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  }

  .nh48-quick-footer__sort-button:hover,
  .nh48-quick-footer__sort-button:focus-visible {
    outline: none;
    border-color: var(--nh48-footer-accent);
    background: color-mix(in srgb, var(--nh48-footer-card) 60%, var(--nh48-footer-accent) 40%);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--nh48-footer-accent) 24%, transparent);
    transform: translateY(-1px);
  }

  .nh48-quick-footer__sort-button.is-active {
    background: color-mix(in srgb, var(--nh48-footer-card) 40%, var(--nh48-footer-accent) 60%);
    border-color: var(--nh48-footer-accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--nh48-footer-accent) 24%, transparent);
  }

  .nh48-quick-footer__eyebrow {
    display: none;
  }

  .nh48-quick-footer__header h2 {
    margin: 4px 0 4px;
    font-size: clamp(19px, 2.4vw, 24px);
    letter-spacing: 0.35px;
    color: var(--nh48-footer-ink);
  }

  .nh48-quick-footer__header p {
    margin: 0 0 4px;
    color: color-mix(in srgb, var(--nh48-footer-ink) 80%, #cbd5e1 20%);
    line-height: 1.45;
    font-size: 0.95rem;
  }

  .nh48-quick-footer .nh48-quick-footer__grid {
    display: grid;
    grid-template-columns: 1fr;
    align-items: stretch;
    justify-items: stretch;
    gap: 16px;
    width: min(1200px, 98vw);
    margin: 6px auto 0;
    padding: 12px clamp(14px, 2.6vw, 24px) 12px;
    overflow-x: hidden;
    overflow-y: auto;
    max-height: 500px;
    min-height: 0;
    flex: 1 1 auto;
    scrollbar-width: thin;
    scrollbar-color: var(--nh48-footer-accent) color-mix(in srgb, var(--nh48-footer-card) 80%, #000 20%);
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: y proximity;
  }

  .nh48-quick-footer__grid::-webkit-scrollbar {
    width: 12px;
  }

  .nh48-quick-footer__grid::-webkit-scrollbar-track {
    background: color-mix(in srgb, var(--nh48-footer-card) 80%, #000 20%);
    border-radius: 10px;
  }

  .nh48-quick-footer__grid::-webkit-scrollbar-thumb {
    background: var(--nh48-footer-accent);
    border-radius: 10px;
    border: 2px solid rgba(26, 26, 46, 0.9);
  }

  .nh48-quick-footer .nh48-quick-footer__group {
    border: 1px solid var(--nh48-footer-border);
    border-radius: 14px;
    padding: 12px 14px;
    background: var(--nh48-footer-card);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 6px 18px rgba(0, 0, 0, 0.28);
    min-width: 0;
    max-width: none;
    width: 100%;
    text-align: center;
    scroll-snap-align: start;
  }

  .nh48-quick-footer__group h2 {
    margin: 0 0 8px;
    font-size: 15px;
    letter-spacing: 0.2px;
    color: var(--nh48-footer-ink);
  }

  .nh48-quick-footer__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 7px;
  }

  .nh48-quick-footer__link {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    padding: 8px 10px;
    min-height: 40px;
    text-align: left;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--nh48-footer-accent) 70%, var(--nh48-footer-ink) 30%);
    color: var(--nh48-footer-ink);
    text-decoration: none;
    background: color-mix(in srgb, var(--nh48-footer-card) 70%, var(--nh48-footer-accent) 30%);
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, transform 0.2s ease;
    line-height: 1.32;
    white-space: normal;
    width: 100%;
  }

  .nh48-quick-footer__link:hover,
  .nh48-quick-footer__link:focus-visible {
    border-color: var(--nh48-footer-accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--nh48-footer-accent) 28%, transparent);
    background: color-mix(in srgb, var(--nh48-footer-card) 55%, var(--nh48-footer-accent) 45%);
    transform: translateY(-1px);
    outline: none;
  }

  .nh48-quick-footer__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border-top: 1px solid var(--nh48-footer-border);
    padding: 12px clamp(16px, 3vw, 32px) 0;
    font-size: 14px;
    text-align: center;
  }

  .nh48-quick-footer__meta-links {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .nh48-quick-footer__meta-links a {
    color: color-mix(in srgb, var(--nh48-footer-ink) 85%, #cbd5e1 15%);
    text-decoration: none;
    padding: 6px 10px;
    border-radius: 9px;
    border: 1px solid transparent;
    transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  }

  .nh48-quick-footer__meta-links a:hover,
  .nh48-quick-footer__meta-links a:focus-visible {
    color: #ffffff;
    background: color-mix(in srgb, var(--nh48-footer-card) 65%, var(--nh48-footer-accent) 35%);
    border-color: color-mix(in srgb, var(--nh48-footer-accent) 32%, transparent);
    outline: none;
  }

  .nh48-quick-footer__legal {
    color: color-mix(in srgb, var(--nh48-footer-ink) 80%, #cbd5e1 20%);
  }

  .nh48-quick-footer__legal a {
    text-decoration: none;
    font-weight: 700;
  }

  .nh48-quick-footer__legal a.nh48-link { color: var(--nh48-footer-accent); }
  .nh48-quick-footer__legal a.tracing-link { color: #6ee7b7; }
  .nh48-quick-footer__legal a.long-trail-link { color: #38bdf8; }

  .nh48-quick-footer__legal a:hover,
  .nh48-quick-footer__legal a:focus-visible {
    text-decoration: underline;
    outline: none;
  }

  @media (max-width: 1024px) {
    .nh48-quick-footer .nh48-quick-footer__grid {
      grid-template-columns: 1fr;
      width: min(1100px, 98vw);
      max-height: 500px;
      scroll-snap-type: y proximity;
    }

    .nh48-quick-footer .nh48-quick-footer__group {
      max-width: 100%;
    }
  }

  @media (max-width: 768px) {
    .nh48-quick-footer { 
      margin: 24px auto 10px; 
      padding: 14px clamp(12px, 4vw, 18px) 0; 
      width: min(720px, 100%); 
      min-height: 0; 
      max-height: none; 
    }

    .nh48-quick-footer .nh48-quick-footer__grid {
      grid-template-columns: 1fr;
      gap: 14px;
      padding: 8px 12px 12px;
      min-height: 0;
      max-height: 420px;
    }

    .nh48-quick-footer__list { 
      gap: 8px; 
    }

    .nh48-quick-footer__link { 
      justify-content: center;
      font-size: 1rem;
      min-height: 44px; 
      padding: 10px 14px; 
    }

    .nh48-quick-footer__controls {
      width: 100%;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .nh48-quick-footer__sort-button {
      width: 100%;
      text-align: center;
      padding: 10px 14px;
      font-size: 1rem;
    }
  }
`;

  const cleanLinkText = (text) => {
    if (!text) return '';
    const withoutKeywords = text.replace(/\b(Mount|Mountain|Peak)\b/gi, '');
    return withoutKeywords
      .replace(/\s{2,}/g, ' ')
      .replace(/\s*–\s*/g, ' – ')
      .replace(/\s*-\s*/g, ' - ')
      .trim();
  };

  const harmonizeFooterCopy = (footerEl) => {
    if (!footerEl) return;
    footerEl.querySelectorAll('.nh48-quick-footer__group h2').forEach((heading) => {
      if (/^Pemigewasset\b/i.test(heading.textContent.trim())) {
        heading.textContent = PEMI_HEADING_TEXT;
      }
    });

    const legal = footerEl.querySelector('.nh48-quick-footer__legal');
    if (legal) {
      legal.innerHTML = FOOTER_LEGAL_TEXT;
    }
  };
  const POPULAR_PEAKS = [
    { slug: 'mount-washington', name: 'Mount Washington', label: 'Washington' },
    { slug: 'mount-lafayette', name: 'Mount Lafayette', label: 'Lafayette' },
    { slug: 'mount-lincoln', name: 'Mount Lincoln', label: 'Lincoln' },
    { slug: 'mount-tecumseh', name: 'Mount Tecumseh', label: 'Tecumseh' },
    { slug: 'mount-moosilauke', name: 'Mount Moosilauke', label: 'Moosilauke' },
    { slug: 'mount-pierce', name: 'Mount Pierce', label: 'Pierce' },
    { slug: 'mount-liberty', name: 'Mount Liberty', label: 'Liberty' },
    { slug: 'mount-adams', name: 'Mount Adams', label: 'Adams' },
    { slug: 'mount-eisenhower', name: 'Mount Eisenhower', label: 'Eisenhower' },
    { slug: 'mount-osceola', name: 'Mount Osceola', label: 'Osceola' },
    { slug: 'mount-jackson', name: 'Mount Jackson', label: 'Jackson' },
    { slug: 'mount-monroe', name: 'Mount Monroe', label: 'Monroe' },
    { slug: 'mount-jefferson', name: 'Mount Jefferson', label: 'Jefferson' },
    { slug: 'cannon-mountain', name: 'Cannon Mountain', label: 'Cannon' },
    { slug: 'mount-madison', name: 'Mount Madison', label: 'Madison' },
    { slug: 'mount-flume', name: 'Mount Flume', label: 'Flume' },
    { slug: 'mount-garfield', name: 'Mount Garfield', label: 'Garfield' },
    { slug: 'mount-carrigain', name: 'Mount Carrigain', label: 'Carrigain' },
    { slug: 'north-kinsman-mountain', name: 'North Kinsman Mountain', label: 'North Kinsman' },
    { slug: 'south-kinsman-mountain', name: 'South Kinsman Mountain', label: 'South Kinsman' },
    { slug: 'mount-whiteface', name: 'Mount Whiteface', label: 'Whiteface' },
    { slug: 'mount-passaconaway', name: 'Mount Passaconaway', label: 'Passaconaway' },
    { slug: 'mount-field', name: 'Mount Field', label: 'Field' },
    { slug: 'mount-tom', name: 'Mount Tom', label: 'Tom' },
    { slug: 'mount-willey', name: 'Mount Willey', label: 'Willey' },
    { slug: 'carter-dome', name: 'Carter Dome', label: 'Carter Dome' },
    { slug: 'mount-moriah', name: 'Mount Moriah', label: 'Moriah' },
    { slug: 'south-carter-mountain', name: 'South Carter Mountain', label: 'South Carter' },
    { slug: 'middle-carter-mountain', name: 'Middle Carter Mountain', label: 'Middle Carter' },
    { slug: 'mount-hale', name: 'Mount Hale', label: 'Hale' },
    { slug: 'mount-waumbek', name: 'Mount Waumbek', label: 'Waumbek' },
    { slug: 'mount-isolation', name: 'Mount Isolation', label: 'Isolation' },
    { slug: 'mount-cabot', name: 'Mount Cabot', label: 'Cabot' },
    { slug: 'north-tripyramid', name: 'North Tripyramid', label: 'North Tripyramid' },
    { slug: 'middle-tripyramid', name: 'Middle Tripyramid', label: 'Middle Tripyramid' },
    { slug: 'mount-osceola-east', name: 'Mount Osceola – East Peak', label: 'Osceola East' },
    { slug: 'wildcat-mountain-d', name: 'Wildcat Mountain – D Peak', label: 'Wildcat D' },
    { slug: 'wildcat-mountain-a', name: 'Wildcat Mountain – A Peak', label: 'Wildcat A' },
    { slug: 'galehead-mountain', name: 'Galehead Mountain', label: 'Galehead' },
    { slug: 'zealand-mountain', name: 'Zealand Mountain', label: 'Zealand' },
    { slug: 'west-bond', name: 'West Bond', label: 'West Bond' },
    { slug: 'mount-bond', name: 'Mount Bond', label: 'Bond' },
    { slug: 'south-twin-mountain', name: 'South Twin Mountain', label: 'South Twin' },
    { slug: 'north-twin-mountain', name: 'North Twin Mountain', label: 'North Twin' },
    { slug: 'mount-hancock-south', name: 'Mount Hancock – South Peak', label: 'Hancock South' },
    { slug: 'mount-hancock', name: 'Mount Hancock – North Peak', label: 'Hancock North' },
    { slug: 'owls-head', name: "Owl's Head", label: "Owl's Head" },
    { slug: 'bondcliff', name: 'Bondcliff', label: 'Bondcliff' }
  ];

  const POPULARITY_INDEX = POPULAR_PEAKS.reduce((map, peak, index) => {
    map[peak.slug] = index;
    return map;
  }, {});

  const ensureFooterStyles = () => {
    let styleEl = document.head.querySelector(`style[${STYLE_ATTR}]`);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.setAttribute(STYLE_ATTR, '');
      document.head.appendChild(styleEl);
    }
    if (styleEl.textContent !== UNIFIED_FOOTER_CSS) {
      styleEl.textContent = UNIFIED_FOOTER_CSS;
    }
  };

  const normalizeExistingLinks = (container) => {
    if (!container) return;
    container.querySelectorAll('.nh48-quick-footer__link').forEach((link) => {
      const original = link.textContent.trim();
      const cleaned = cleanLinkText(original);
      if (cleaned && cleaned !== original) {
        if (!link.getAttribute('data-full-name')) {
          link.setAttribute('data-full-name', original);
        }
        if (!link.title) {
          link.title = original;
        }
        link.textContent = cleaned;
      }
    });
  };

  const parseElevation = (rawValue) => {
    if (!rawValue && rawValue !== 0) return null;
    const match = String(rawValue).match(/\d+/);
    return match ? Number(match[0]) : null;
  };

  const loadPeakData = async () => {
    try {
      const response = await fetch('/data/nh48.json');
      if (!response.ok) {
        return POPULAR_PEAKS.map((peak) => ({ ...peak, href: `/peak/${peak.slug}`, elevation: null }));
      }
      const data = await response.json();
      return POPULAR_PEAKS.map((peak) => {
        const entry = data[peak.slug] || {};
        const elevation = parseElevation(entry['Elevation (ft)']);
        return {
          ...peak,
          elevation,
          href: `/peak/${peak.slug}`
        };
      });
    } catch (error) {
      console.warn('NH48 quick footer failed to load elevations, falling back to defaults', error);
      return POPULAR_PEAKS.map((peak) => ({ ...peak, href: `/peak/${peak.slug}`, elevation: null }));
    }
  };

  const getLabel = (peak) => cleanLinkText(peak.label || peak.name);

  const sortPeaks = (peaks, sortKey) => {
    const list = peaks.slice();
    if (sortKey === 'alphabetical') {
      list.sort((a, b) => getLabel(a).localeCompare(getLabel(b), undefined, { sensitivity: 'base' }));
    } else if (sortKey === 'elevation') {
      list.sort((a, b) => (b.elevation || 0) - (a.elevation || 0));
    } else {
      list.sort((a, b) => POPULARITY_INDEX[a.slug] - POPULARITY_INDEX[b.slug]);
    }
    return list;
  };

  const renderGrid = (gridEl, peaks, sortKey) => {
    const sorted = sortPeaks(peaks, sortKey);
    gridEl.innerHTML = '';
    sorted.forEach((peak) => {
      const link = document.createElement('a');
      link.className = 'nh48-quick-footer__link';
      link.href = peak.href;
      const displayText = getLabel(peak);
      link.textContent = displayText;
      if (peak.name && peak.name !== displayText) {
        link.setAttribute('data-full-name', peak.name);
        link.title = peak.name;
      }
      if (peak.elevation) {
        link.setAttribute('data-elevation', peak.elevation);
      }
      gridEl.appendChild(link);
    });
  };

  const createControls = (onChange) => {
    const controls = document.createElement('div');
    controls.className = 'nh48-quick-footer__controls';
    const buttons = [
      { key: 'popularity', label: 'Popularity' },
      { key: 'alphabetical', label: 'Alphabetical' },
      { key: 'elevation', label: 'Elevation' }
    ];

    buttons.forEach(({ key, label }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.className = 'nh48-quick-footer__sort-button';
      if (key === 'popularity') {
        button.classList.add('is-active');
      }
      button.addEventListener('click', () => {
        controls.querySelectorAll('.nh48-quick-footer__sort-button').forEach((btn) => btn.classList.remove('is-active'));
        button.classList.add('is-active');
        onChange(key);
      });
      controls.appendChild(button);
    });

    return controls;
  };

  const enhanceFooter = (footerEl, peaks) => {
    harmonizeFooterCopy(footerEl);
    const grid = footerEl.querySelector('.nh48-quick-footer__grid');
    normalizeExistingLinks(grid);
    if (footerEl.querySelector('.nh48-quick-footer__controls')) return;
    if (!grid) return;
    if (grid.querySelector('.nh48-quick-footer__group')) return;

    let activeSort = 'popularity';
    const hasExistingLinks = grid.querySelectorAll('.nh48-quick-footer__link').length > 0;
    let hasRendered = false;

    const renderIfNeeded = (sortKey, allowInitialRender = false) => {
      if (!allowInitialRender && sortKey === 'popularity' && hasExistingLinks && !hasRendered) {
        return;
      }
      renderGrid(grid, peaks, sortKey);
      hasRendered = true;
    };

    const controls = createControls((sortKey) => {
      activeSort = sortKey;
      renderIfNeeded(sortKey, true);
    });

    const insertionTarget = footerEl.querySelector('.nh48-quick-footer__header') || footerEl;
    insertionTarget.parentNode.insertBefore(controls, grid);
    if (!hasExistingLinks) {
      renderIfNeeded(activeSort, true);
    }
  };

  const initializeFooters = async () => {
    const peaks = await loadPeakData();
    const seen = new Set();
    const footers = Array.from(document.querySelectorAll(`[${FOOTER_ATTR}], .nh48-quick-footer`)).filter((footer) => {
      if (seen.has(footer)) return false;
      seen.add(footer);
      return true;
    });
    if (!footers.length) return;
    footers.forEach((footer) => enhanceFooter(footer, peaks));
  };

  const injectFooter = () => {
    if (document.getElementById(FOOTER_ID) || document.querySelector(`[${FOOTER_ATTR}]`) || document.querySelector('.nh48-quick-footer')) {
      return;
    }

    // Check for footer-placeholder and inject there if found
    const placeholder = document.getElementById('footer-placeholder');
    const targetParent = placeholder ? placeholder.parentNode : document.body;
    const insertBefore = placeholder ? placeholder.nextSibling : null;

    fetch(PARTIAL_URL)
      .then((response) => (response.ok ? response.text() : ''))
      .then((html) => {
        if (!html) return;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;

        const style = wrapper.querySelector(`style[${STYLE_ATTR}]`);
        if (style && !document.head.querySelector(`style[${STYLE_ATTR}]`)) {
          document.head.appendChild(style.cloneNode(true));
        }

        const footer = wrapper.querySelector(`[${FOOTER_ATTR}]`);
        if (!footer) return;
        footer.id = FOOTER_ID;
        
        // Remove the placeholder if it exists
        if (placeholder) {
          placeholder.remove();
        }
        
        // Insert the footer
        if (insertBefore) {
          targetParent.insertBefore(footer, insertBefore);
        } else {
          targetParent.appendChild(footer);
        }
        
        ensureFooterStyles();
        initializeFooters();
      })
      .catch((error) => {
        console.error('NH48 quick footer failed to load', error);
      });
  };

  const boot = () => {
    ensureFooterStyles();
    initializeFooters();
    injectFooter();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
