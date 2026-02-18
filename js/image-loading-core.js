(function bootstrapNh48ImageLoadingCore() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__NH48_IMAGE_LOADING_CORE_READY) return;
  window.__NH48_IMAGE_LOADING_CORE_READY = true;

  const LARGE_THRESHOLD = 248;
  const NATIVE_LOADER_CONTAINERS = [
    '.media',
    '.thumb',
    '.dot',
    '.itinerary-photo-banner',
  ];
  const NATIVE_LOADER_MARKERS = [
    '.media-loading',
    '.thumb-loading',
    '.dot-loading',
    '.itinerary-photo-loading',
  ];
  const HERO_CONTAINER_SELECTORS = [
    '.hero',
    '.wiki-hero',
    '.peak-hero',
    '.plant-hero',
    '.bird-hero',
    '.range-hero',
    '.dataset-hero',
    '.splash-hero',
    '.site-hero',
  ];

  const trackedImages = new Set();
  let repositionRaf = 0;

  function parseNumber(value) {
    const parsed = Number.parseFloat(String(value || '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseStylePx(styleText, propName) {
    if (!styleText) return 0;
    const regex = new RegExp(`${propName}\\s*:\\s*([0-9.]+)px`, 'i');
    const match = String(styleText).match(regex);
    return match ? parseNumber(match[1]) : 0;
  }

  function hasPercentStyle(styleText, propName) {
    if (!styleText) return false;
    const regex = new RegExp(`${propName}\\s*:\\s*([0-9.]+)%`, 'i');
    const match = String(styleText).match(regex);
    return Boolean(match && parseNumber(match[1]) >= 50);
  }

  function hasLargeClassSignal(img) {
    const blob = `${img.className || ''} ${img.id || ''}`.toLowerCase();
    return /(hero|banner|cover|gallery|carousel|dataset-card-image|print-thumb|flowchart|photo|media)/.test(blob);
  }

  function getRenderedMaxSize(img) {
    const rect = img.getBoundingClientRect();
    return Math.max(parseNumber(rect.width), parseNumber(rect.height));
  }

  function getExplicitMaxSize(img) {
    const widthAttr = parseNumber(img.getAttribute('width'));
    const heightAttr = parseNumber(img.getAttribute('height'));
    const styleText = img.getAttribute('style') || '';
    const explicitStyleMax = Math.max(
      parseStylePx(styleText, 'width'),
      parseStylePx(styleText, 'height'),
      parseStylePx(styleText, 'max-width'),
      parseStylePx(styleText, 'max-height'),
      parseStylePx(styleText, 'min-width'),
      parseStylePx(styleText, 'min-height')
    );
    return Math.max(widthAttr, heightAttr, explicitStyleMax);
  }

  function isLikelyLargeImage(img) {
    const explicitSize = getExplicitMaxSize(img);
    if (explicitSize >= LARGE_THRESHOLD) return true;

    const rendered = getRenderedMaxSize(img);
    if (rendered >= LARGE_THRESHOLD) return true;

    const styleText = img.getAttribute('style') || '';
    if (hasPercentStyle(styleText, 'width') || hasPercentStyle(styleText, 'height')) {
      const parent = img.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        if (Math.max(parseNumber(parentRect.width), parseNumber(parentRect.height)) >= LARGE_THRESHOLD) {
          return true;
        }
      }
    }

    if (hasLargeClassSignal(img)) {
      const parent = img.parentElement;
      if (!parent) return false;
      const parentRect = parent.getBoundingClientRect();
      return Math.max(parseNumber(parentRect.width), parseNumber(parentRect.height)) >= LARGE_THRESHOLD;
    }

    return false;
  }

  function hasNativeLoaderMarker(container) {
    if (!container) return false;
    return NATIVE_LOADER_MARKERS.some((selector) => container.querySelector(selector));
  }

  function isManagedByNativeLoader(img) {
    if (img.closest('.nh48-image-loader-overlay')) return true;
    if (img.closest('.nh48-image-loader-wrap')) return false;
    for (const containerSelector of NATIVE_LOADER_CONTAINERS) {
      const container = img.closest(containerSelector);
      if (container && hasNativeLoaderMarker(container)) {
        return true;
      }
    }
    return false;
  }

  function isHeroImage(img) {
    const heroAttr = String(img.getAttribute('data-nh48-hero') || '').toLowerCase();
    if (heroAttr === 'true') return true;

    const loadingAttr = String(img.getAttribute('loading') || '').toLowerCase();
    if (loadingAttr === 'eager') return true;

    const fetchPriority = String(img.getAttribute('fetchpriority') || '').toLowerCase();
    if (fetchPriority === 'high') return true;

    if (HERO_CONTAINER_SELECTORS.some((selector) => img.closest(selector))) {
      return true;
    }

    const blob = `${img.className || ''} ${img.id || ''}`.toLowerCase();
    return /(hero|banner|masthead|cover)/.test(blob);
  }

  function shouldSkip(img) {
    if (!(img instanceof HTMLImageElement)) return true;
    if (img.getAttribute('data-nh48-image-loader-core') === 'off') return true;
    return false;
  }

  function shouldSkipSpinner(img) {
    if (String(img.getAttribute('data-nh48-spinner') || '').toLowerCase() === 'off') return true;
    if (isManagedByNativeLoader(img)) return true;
    return false;
  }

  function setDeliveryHints(img) {
    if (!isLikelyLargeImage(img)) return;
    if (isManagedByNativeLoader(img)) return;
    if (String(img.getAttribute('data-nh48-lazy') || '').toLowerCase() === 'off') return;

    if (!img.hasAttribute('decoding')) {
      img.decoding = 'async';
    }

    const hero = isHeroImage(img);
    if (!img.hasAttribute('loading')) {
      img.loading = hero ? 'eager' : 'lazy';
    }

    if (!hero && String(img.getAttribute('loading') || '').toLowerCase() === 'lazy' && !img.hasAttribute('fetchpriority')) {
      img.fetchPriority = 'low';
    }
  }

  function markContainerPositioning(parent) {
    if (!(parent instanceof HTMLElement)) return false;
    const computed = window.getComputedStyle(parent);
    if (computed.display === 'inline') return false;

    parent.classList.add('nh48-image-loader-wrap');
    if (computed.position === 'static' && parent.getAttribute('data-nh48-loader-positioned') !== '1') {
      parent.style.position = 'relative';
      parent.setAttribute('data-nh48-loader-positioned', '1');
    }
    return true;
  }

  function positionOverlay(img, overlay) {
    const parent = overlay.parentElement;
    if (!(parent instanceof HTMLElement)) return;
    const imgRect = img.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const width = parseNumber(imgRect.width);
    const height = parseNumber(imgRect.height);

    if (width < 1 || height < 1) {
      overlay.hidden = true;
      return;
    }

    overlay.hidden = false;
    overlay.style.left = `${imgRect.left - parentRect.left + parent.scrollLeft}px`;
    overlay.style.top = `${imgRect.top - parentRect.top + parent.scrollTop}px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
  }

  function removeOverlay(img) {
    const overlay = img.__nh48ImageLoaderOverlay;
    if (overlay && overlay.parentNode) {
      overlay.remove();
    }
    trackedImages.delete(img);
    img.__nh48ImageLoaderOverlay = null;
  }

  function ensureOverlay(img) {
    if (shouldSkipSpinner(img)) return;
    if (!isLikelyLargeImage(img)) return;
    if (img.complete && img.naturalWidth > 0) return;

    if (img.__nh48ImageLoaderOverlay) {
      positionOverlay(img, img.__nh48ImageLoaderOverlay);
      trackedImages.add(img);
      return;
    }

    const parent = img.parentElement;
    if (!markContainerPositioning(parent)) return;

    const overlay = document.createElement('span');
    overlay.className = 'nh48-image-loader-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    if (isHeroImage(img)) {
      overlay.classList.add('large');
    }
    const spinner = document.createElement('span');
    spinner.className = 'nh48-image-loader-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    overlay.appendChild(spinner);

    parent.appendChild(overlay);
    img.__nh48ImageLoaderOverlay = overlay;
    trackedImages.add(img);
    positionOverlay(img, overlay);
  }

  function onImageSettled(event) {
    const img = event.currentTarget;
    if (!(img instanceof HTMLImageElement)) return;
    removeOverlay(img);
  }

  function ensureListeners(img) {
    if (img.getAttribute('data-nh48-loader-listeners') === '1') return;
    img.setAttribute('data-nh48-loader-listeners', '1');
    img.addEventListener('load', onImageSettled, { passive: true });
    img.addEventListener('error', onImageSettled, { passive: true });
  }

  function processImage(img) {
    if (shouldSkip(img)) return;
    ensureListeners(img);
    setDeliveryHints(img);
    ensureOverlay(img);
  }

  function processNode(node) {
    if (!(node instanceof Element)) return;
    if (node instanceof HTMLImageElement) {
      processImage(node);
      return;
    }
    node.querySelectorAll('img').forEach(processImage);
  }

  function scheduleReposition() {
    if (repositionRaf) return;
    repositionRaf = window.requestAnimationFrame(() => {
      repositionRaf = 0;
      trackedImages.forEach((img) => {
        const overlay = img.__nh48ImageLoaderOverlay;
        if (!img.isConnected || !overlay) {
          removeOverlay(img);
          return;
        }
        if (img.complete && img.naturalWidth > 0) {
          removeOverlay(img);
          return;
        }
        positionOverlay(img, overlay);
      });
    });
  }

  function processAllImages() {
    document.querySelectorAll('img').forEach(processImage);
    scheduleReposition();
  }

  const observer = new MutationObserver((mutations) => {
    let touched = false;
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        if (mutation.target instanceof HTMLImageElement) {
          processImage(mutation.target);
          touched = true;
        }
        continue;
      }
      mutation.addedNodes.forEach((node) => processNode(node));
      if (mutation.addedNodes.length) touched = true;
    }
    if (touched) scheduleReposition();
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['src', 'srcset', 'style', 'class'],
  });

  window.addEventListener('resize', scheduleReposition, { passive: true });
  window.addEventListener('orientationchange', scheduleReposition, { passive: true });
  document.addEventListener('scroll', scheduleReposition, { passive: true, capture: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processAllImages, { once: true });
  } else {
    processAllImages();
  }
  window.addEventListener('load', processAllImages, { once: true });
})();
