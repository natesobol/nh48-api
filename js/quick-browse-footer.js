(() => {
  const FOOTER_ID = 'nh48-quick-browse-footer';
  const STYLE_ATTR = 'data-nh48-quick-footer-style';
  const FOOTER_ATTR = 'data-nh48-quick-footer';
  const PARTIAL_URL = '/pages/footer-quick-browse.html';
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

  const getLabel = (peak) => peak.label || peak.name;

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
    if (footerEl.querySelector('.nh48-quick-footer__controls')) return;
    const grid = footerEl.querySelector('.nh48-quick-footer__grid');
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
