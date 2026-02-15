(function () {
  'use strict';

  const DEFAULT_SELECTOR = 'a[href], button, select, input:not([type="hidden"]), textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"]), .dot';
  const ACTION_LEAD_RE = /^(open|go to|jump to|view|visit|read|download)\s+/i;

  const state = {
    initialized: false,
    tooltipEl: null,
    showTimer: null,
    hideTimer: null,
    target: null,
    config: {
      selector: DEFAULT_SELECTOR,
      showDelayMs: 50,
      hideDelayMs: 50,
      preferContextAwareLinkText: true,
      pageName: ''
    }
  };

  function getTranslator(config) {
    if (config && typeof config.i18n === 'function') return config.i18n;
    if (window.NH48_I18N && typeof window.NH48_I18N.t === 'function') return window.NH48_I18N.t;
    return null;
  }

  function safeText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function looksLikeKey(value) {
    return /^[a-z0-9_-]+(?:\.[a-z0-9_-]+)+$/i.test(safeText(value));
  }

  function maybeTranslate(value, config, vars) {
    const text = safeText(value);
    if (!text) return '';
    if (!looksLikeKey(text)) return text;
    const t = getTranslator(config);
    if (!t) return text;
    const translated = safeText(t(text, vars));
    if (!translated || translated === text || looksLikeKey(translated)) return '';
    return translated;
  }

  function t(key, fallback, vars) {
    const translator = getTranslator(state.config);
    if (!translator) return interpolate(fallback || key, vars);
    const translated = safeText(translator(key, vars));
    if (!translated || translated === key || looksLikeKey(translated)) {
      return interpolate(fallback || key, vars);
    }
    return translated;
  }

  function interpolate(template, vars) {
    const raw = String(template || '');
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (m, name) => (vars[name] != null ? String(vars[name]) : m));
  }

  function ensureTooltipElement() {
    if (state.tooltipEl && document.body.contains(state.tooltipEl)) return state.tooltipEl;
    const el = document.createElement('div');
    el.id = 'uiTooltip';
    el.className = 'ui-tooltip';
    el.setAttribute('role', 'tooltip');
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    state.tooltipEl = el;
    return el;
  }

  function preserveTitle(element) {
    if (!element || !element.getAttribute) return;
    const title = element.getAttribute('title');
    if (title && !element.hasAttribute('data-native-title')) {
      element.setAttribute('data-native-title', title);
    }
    if (title) element.removeAttribute('title');
  }

  function refresh(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const selector = state.config.selector || DEFAULT_SELECTOR;
    scope.querySelectorAll(selector).forEach((el) => preserveTitle(el));
    if (scope !== document && scope.matches && scope.matches(selector)) {
      preserveTitle(scope);
    }
  }

  function clearTimers() {
    if (state.showTimer) {
      clearTimeout(state.showTimer);
      state.showTimer = null;
    }
    if (state.hideTimer) {
      clearTimeout(state.hideTimer);
      state.hideTimer = null;
    }
  }

  function hideTooltip() {
    if (!state.tooltipEl) return;
    state.tooltipEl.classList.remove('is-visible');
    state.tooltipEl.setAttribute('aria-hidden', 'true');
  }

  function positionTooltip(target) {
    const tooltip = state.tooltipEl;
    if (!tooltip || !target) return;
    const rect = target.getBoundingClientRect();
    const viewportPad = 8;
    const maxLeft = window.innerWidth - viewportPad;
    const minLeft = viewportPad;
    let centerX = rect.left + (rect.width / 2);
    centerX = Math.max(minLeft, Math.min(maxLeft, centerX));
    let top = rect.top - 8;
    if (top < 48) top = rect.bottom + 8 + tooltip.offsetHeight;
    tooltip.style.left = `${Math.round(centerX)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  }

  function scheduleHide() {
    clearTimers();
    state.hideTimer = setTimeout(() => {
      state.target = null;
      hideTooltip();
    }, Number(state.config.hideDelayMs) || 50);
  }

  function stripLeadingAction(text) {
    return safeText(text).replace(ACTION_LEAD_RE, '').trim();
  }

  function normalizePageLabel(text) {
    return stripLeadingAction(text).replace(/\s+page$/i, '').trim();
  }

  function getVisibleLabel(element) {
    if (!element) return '';
    const dataName = safeText(element.getAttribute && element.getAttribute('data-tooltip-name'));
    if (dataName) return stripLeadingAction(dataName);
    const text = safeText(element.textContent);
    if (text) return stripLeadingAction(text);
    return '';
  }

  function getSelectLabel(select) {
    const overrideMap = state.config.idTextOverrides || {};
    if (select.id && overrideMap[select.id]) {
      return maybeTranslate(overrideMap[select.id], state.config) || safeText(overrideMap[select.id]);
    }
    if (select.name && overrideMap[select.name]) {
      return maybeTranslate(overrideMap[select.name], state.config) || safeText(overrideMap[select.name]);
    }

    const ariaLabel = safeText(select.getAttribute('aria-label'));
    if (ariaLabel && !looksLikeKey(ariaLabel)) return ariaLabel;

    if (select.id) {
      const label = document.querySelector(`label[for="${select.id}"]`);
      const labelText = safeText(label ? label.textContent : '');
      if (labelText) return labelText;
    }

    const option = select.options && select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null;
    return safeText(option ? option.textContent : '');
  }

  function titleFromPath(pathname) {
    const chunks = String(pathname || '')
      .split('/')
      .filter(Boolean)
      .map((part) => decodeURIComponent(part).replace(/[-_]+/g, ' '));
    if (!chunks.length) return state.config.pageName || t('common.home', 'Home');
    const last = chunks[chunks.length - 1];
    return last.replace(/\b\w/g, (m) => m.toUpperCase());
  }

  function buildContextTooltipForLink(anchor) {
    if (!(anchor instanceof HTMLAnchorElement)) return '';
    const hrefAttr = safeText(anchor.getAttribute('href'));
    if (!hrefAttr) return '';

    let parsed;
    try {
      parsed = new URL(hrefAttr, window.location.origin);
    } catch (error) {
      return '';
    }

    if (hrefAttr.startsWith('#')) {
      const sectionName = stripLeadingAction(getVisibleLabel(anchor)) || titleFromPath(parsed.hash.replace(/^#/, ''));
      return t('common.tooltips.jumpSection', 'Jump to {sectionName}', { sectionName });
    }

    const isDownload = anchor.hasAttribute('download') || /\.(gpx|kml|csv|json|zip|pdf|geojson)(\?|$)/i.test(parsed.pathname);
    if (isDownload) {
      const fileName = safeText(anchor.getAttribute('download')) || decodeURIComponent(parsed.pathname.split('/').pop() || 'file');
      return t('common.tooltips.downloadFile', 'Download {fileName}', { fileName });
    }

    const isExternal = parsed.origin !== window.location.origin;
    if (isExternal) {
      const siteName = parsed.hostname.replace(/^www\./i, '');
      return t('common.tooltips.openExternalPage', 'Open external page: {siteName}', { siteName });
    }

    if (parsed.hash) {
      const sectionName = stripLeadingAction(getVisibleLabel(anchor)) || titleFromPath(parsed.hash.replace(/^#/, ''));
      return t('common.tooltips.jumpSection', 'Jump to {sectionName}', { sectionName });
    }

    const explicitName = normalizePageLabel(getVisibleLabel(anchor)) || normalizePageLabel(state.config.pageName) || titleFromPath(parsed.pathname);
    return t('common.tooltips.openPage', 'Open {pageName} page', { pageName: explicitName });
  }

  function isEligible(element) {
    if (!element || !element.matches) return false;
    const selector = state.config.selector || DEFAULT_SELECTOR;
    if (!element.matches(selector)) return false;
    if (element.closest('#uiTooltip')) return false;
    if (element.hidden) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;
    return true;
  }

  function normalizeFinalText(value) {
    const text = safeText(value);
    if (!text) return '';
    if (looksLikeKey(text)) return '';
    return text.length > 240 ? `${text.slice(0, 237)}...` : text;
  }

  function resolveText(element) {
    if (!element || !element.getAttribute) return '';
    preserveTitle(element);

    const overrideMap = state.config.idTextOverrides || {};
    const overrideKey = (element.id && overrideMap[element.id]) || (element.name && overrideMap[element.name]);
    if (overrideKey) {
      const overrideText = maybeTranslate(overrideKey, state.config) || safeText(overrideKey);
      const resolvedOverride = normalizeFinalText(overrideText);
      if (resolvedOverride) return resolvedOverride;
    }

    // For links, prefer context-aware tooltips unless an explicit data-tooltip is provided.
    if (state.config.preferContextAwareLinkText && element.tagName === 'A') {
      const explicitDataTooltip = normalizeFinalText(maybeTranslate(element.getAttribute('data-tooltip'), state.config) || element.getAttribute('data-tooltip'));
      if (explicitDataTooltip) return explicitDataTooltip;
      const contextual = normalizeFinalText(buildContextTooltipForLink(element));
      if (contextual) return contextual;
    }

    const explicitCandidates = [
      element.getAttribute('data-tooltip'),
      element.getAttribute('aria-label'),
      element.getAttribute('data-native-title'),
      element.getAttribute('title')
    ];

    for (const candidate of explicitCandidates) {
      const translatedMaybe = maybeTranslate(candidate, state.config);
      const explicit = normalizeFinalText(translatedMaybe || candidate);
      if (explicit) return explicit;
    }

    if (element.tagName === 'SELECT') {
      const selectText = normalizeFinalText(getSelectLabel(element));
      if (selectText) return selectText;
    }

    const fallback = normalizeFinalText(element.textContent);
    return fallback;
  }

  function showTooltip(target) {
    if (!isEligible(target)) return;
    const tooltip = ensureTooltipElement();
    const text = resolveText(target);
    if (!text) {
      hideTooltip();
      return;
    }
    state.target = target;
    tooltip.textContent = text;
    tooltip.setAttribute('aria-hidden', 'false');
    positionTooltip(target);
    tooltip.classList.add('is-visible');
  }

  function scheduleShow(target) {
    clearTimers();
    state.showTimer = setTimeout(() => showTooltip(target), Number(state.config.showDelayMs) || 50);
  }

  function attachEvents() {
    document.addEventListener('mouseover', (event) => {
      const selector = state.config.selector || DEFAULT_SELECTOR;
      const target = event.target && event.target.closest ? event.target.closest(selector) : null;
      if (!target) {
        scheduleHide();
        return;
      }
      if (target === state.target) return;
      scheduleShow(target);
    });

    document.addEventListener('mouseout', (event) => {
      const selector = state.config.selector || DEFAULT_SELECTOR;
      const leaving = event.target && event.target.closest ? event.target.closest(selector) : null;
      if (!leaving) return;
      const entering = event.relatedTarget && event.relatedTarget.closest ? event.relatedTarget.closest(selector) : null;
      if (leaving === entering) return;
      scheduleHide();
    });

    document.addEventListener('mousemove', (event) => {
      if (!state.target || !state.tooltipEl || state.tooltipEl.getAttribute('aria-hidden') === 'true') return;
      const selector = state.config.selector || DEFAULT_SELECTOR;
      const within = event.target && event.target.closest ? event.target.closest(selector) : null;
      if (within !== state.target) return;
      positionTooltip(state.target);
    });

    document.addEventListener('focusin', (event) => {
      const selector = state.config.selector || DEFAULT_SELECTOR;
      const target = event.target && event.target.matches && event.target.matches(selector) ? event.target : null;
      if (!target) return;
      scheduleShow(target);
    });

    document.addEventListener('focusout', (event) => {
      const selector = state.config.selector || DEFAULT_SELECTOR;
      const target = event.target && event.target.matches && event.target.matches(selector) ? event.target : null;
      if (!target) return;
      scheduleHide();
    });

    window.addEventListener(
      'scroll',
      () => {
        if (!state.target) {
          hideTooltip();
          return;
        }
        positionTooltip(state.target);
      },
      { passive: true }
    );

    window.addEventListener('resize', () => {
      if (!state.target) {
        hideTooltip();
        return;
      }
      positionTooltip(state.target);
    });
  }

  function init(config = {}) {
    state.config = {
      ...state.config,
      ...config
    };

    ensureTooltipElement();
    refresh(document);

    if (state.initialized) return;
    state.initialized = true;
    attachEvents();
  }

  window.NH48Tooltips = {
    init,
    refresh
  };
})();
