(() => {
  const FOOTER_ID = 'nh48-quick-browse-footer';
  const STYLE_ATTR = 'data-nh48-quick-footer-style';
  const FOOTER_ATTR = 'data-nh48-quick-footer';
  const PARTIAL_URL = '/pages/footer-quick-browse.html';
  const POPULAR_PEAKS = [
    { slug: 'mount-washington', name: 'Mount Washington' },
    { slug: 'mount-lafayette', name: 'Mount Lafayette' },
    { slug: 'mount-lincoln', name: 'Mount Lincoln' },
    { slug: 'mount-tecumseh', name: 'Mount Tecumseh' },
    { slug: 'mount-moosilauke', name: 'Mount Moosilauke' },
    { slug: 'mount-pierce', name: 'Mount Pierce' },
    { slug: 'mount-liberty', name: 'Mount Liberty' },
    { slug: 'mount-adams', name: 'Mount Adams' },
    { slug: 'mount-eisenhower', name: 'Mount Eisenhower' },
    { slug: 'mount-osceola', name: 'Mount Osceola' },
    { slug: 'mount-jackson', name: 'Mount Jackson' },
    { slug: 'mount-monroe', name: 'Mount Monroe' },
    { slug: 'mount-jefferson', name: 'Mount Jefferson' },
    { slug: 'cannon-mountain', name: 'Cannon Mountain' },
    { slug: 'mount-madison', name: 'Mount Madison' },
    { slug: 'mount-flume', name: 'Mount Flume' },
    { slug: 'mount-garfield', name: 'Mount Garfield' },
    { slug: 'mount-carrigain', name: 'Mount Carrigain' },
    { slug: 'north-kinsman-mountain', name: 'North Kinsman Mountain' },
    { slug: 'south-kinsman-mountain', name: 'South Kinsman Mountain' },
    { slug: 'mount-whiteface', name: 'Mount Whiteface' },
    { slug: 'mount-passaconaway', name: 'Mount Passaconaway' },
    { slug: 'mount-field', name: 'Mount Field' },
    { slug: 'mount-tom', name: 'Mount Tom' },
    { slug: 'mount-willey', name: 'Mount Willey' },
    { slug: 'carter-dome', name: 'Carter Dome' },
    { slug: 'mount-moriah', name: 'Mount Moriah' },
    { slug: 'south-carter-mountain', name: 'South Carter Mountain' },
    { slug: 'middle-carter-mountain', name: 'Middle Carter Mountain' },
    { slug: 'mount-hale', name: 'Mount Hale' },
    { slug: 'mount-waumbek', name: 'Mount Waumbek' },
    { slug: 'mount-isolation', name: 'Mount Isolation' },
    { slug: 'mount-cabot', name: 'Mount Cabot' },
    { slug: 'north-tripyramid', name: 'North Tripyramid' },
    { slug: 'middle-tripyramid', name: 'Middle Tripyramid' },
    { slug: 'mount-osceola-east', name: 'Mount Osceola – East Peak' },
    { slug: 'wildcat-mountain-d', name: 'Wildcat Mountain – D Peak' },
    { slug: 'wildcat-mountain-a', name: 'Wildcat Mountain – A Peak' },
    { slug: 'galehead-mountain', name: 'Galehead Mountain' },
    { slug: 'zealand-mountain', name: 'Zealand Mountain' },
    { slug: 'west-bond', name: 'West Bond' },
    { slug: 'mount-bond', name: 'Mount Bond' },
    { slug: 'south-twin-mountain', name: 'South Twin Mountain' },
    { slug: 'north-twin-mountain', name: 'North Twin Mountain' },
    { slug: 'mount-hancock-south', name: 'Mount Hancock – South Peak' },
    { slug: 'mount-hancock', name: 'Mount Hancock – North Peak' },
    { slug: 'owls-head', name: "Owl's Head" },
    { slug: 'bondcliff', name: 'Bondcliff' }
  ];

  const POPULARITY_INDEX = POPULAR_PEAKS.reduce((map, peak, index) => {
    map[peak.slug] = index;
    return map;
  }, {});

  const parseElevation = (rawValue) => {
    if (!rawValue && rawValue !== 0) return null;
    const match = String(rawValue).match(/\d+/);
    return match ? Number(match[0]) : null;
  };

  const loadPeakData = async () => {
    try {
      const response = await fetch('/data/nh48.json');
      if (!response.ok) {
        return POPULAR_PEAKS.map((peak) => ({ ...peak, href: `/peaks/${peak.slug}`, elevation: null }));
      }
      const data = await response.json();
      return POPULAR_PEAKS.map((peak) => {
        const entry = data[peak.slug] || {};
        const elevation = parseElevation(entry['Elevation (ft)']);
        return {
          ...peak,
          elevation,
          href: `/peaks/${peak.slug}`
        };
      });
    } catch (error) {
      console.warn('NH48 quick footer failed to load elevations, falling back to defaults', error);
      return POPULAR_PEAKS.map((peak) => ({ ...peak, href: `/peaks/${peak.slug}`, elevation: null }));
    }
  };

  const sortPeaks = (peaks, sortKey) => {
    const list = peaks.slice();
    if (sortKey === 'alphabetical') {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
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
      link.textContent = peak.name;
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
    if (footerEl.querySelector('.nh48-quick-footer__controls')) return;
    const grid = footerEl.querySelector('.nh48-quick-footer__grid');
    if (!grid) return;

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
    if (document.querySelector(`[${FOOTER_ATTR}]`)) {
      return;
    }

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
        document.body.appendChild(footer);
        initializeFooters();
      })
      .catch((error) => {
        console.error('NH48 quick footer failed to load', error);
      });
  };

  const boot = () => {
    initializeFooters();
    injectFooter();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
