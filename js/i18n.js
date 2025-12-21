import { LANGS } from './langConfig.js';

(() => {
  const SUPPORTED_LANGS = LANGS.map(({ code }) => code);
  const STORAGE_KEY = 'nh48_lang';
  const DEFAULT_LANG = 'en';
  const callbacks = new Set();
  const dictionaries = new Map();
  let currentLang = DEFAULT_LANG;
  let currentDict = {};
  let isApplying = false;
  let observer = null;
  let debounceTimer = null;

  function getLangFromPath() {
    const path = window.location.pathname || '';
    if (path.startsWith('/i18n/')) {
      const parts = path.split('/');
      if (parts.length >= 3) {
        const file = parts[2]; // e.g., de.html
        const lang = file.split('.')[0];
        if (SUPPORTED_LANGS.includes(lang)) return lang;
      }
    }
    return DEFAULT_LANG;
  }

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || getLangFromPath();
  }

  function getLangConfig(lang) {
    return LANGS.find(item => item.code === lang);
  }

  function setHtmlLang(lang) {
    const config = getLangConfig(lang);
    if (document.documentElement) {
      document.documentElement.lang = config && config.hreflang ? config.hreflang : lang;
    }
  }

  function setDirection(lang) {
    const config = getLangConfig(lang);
    const isRtl = Boolean(config && config.rtl);
    if (document.documentElement) {
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    }
    if (document.body) {
      document.body.classList.toggle('rtl', isRtl);
    }
  }

  function getValue(dict, key) {
    if (!dict) return undefined;
    return key.split('.').reduce((acc, part) => (acc && acc[part] != null ? acc[part] : undefined), dict);
  }

  function interpolate(value, vars) {
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, (match, key) => {
      return vars[key] != null ? String(vars[key]) : match;
    });
  }

  async function loadLang(lang) {
    if (dictionaries.has(lang)) {
      return dictionaries.get(lang);
    }
    try {
      const response = await fetch(`/i18n/${lang}.json`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Failed to load ${lang}`);
      const data = await response.json();
      dictionaries.set(lang, data);
      return data;
    } catch (err) {
      if (lang !== DEFAULT_LANG) {
        return loadLang(DEFAULT_LANG);
      }
      console.warn('Unable to load language dictionaries:', err);
      return {};
    }
  }

  function t(key, vars) {
    const value = getValue(currentDict, key) ?? getValue(dictionaries.get(DEFAULT_LANG), key) ?? key;
    if (typeof value !== 'string') return key;
    return interpolate(value, vars);
  }

  function applyTranslations(root = document) {
    if (!root) return;
    isApplying = true;
    const nodes = [];
    if (root.querySelectorAll) {
      nodes.push(...root.querySelectorAll('[data-i18n], [data-i18n-html], [data-i18n-attr]'));
    }
    if (root !== document && root.matches && root.matches('[data-i18n], [data-i18n-html], [data-i18n-attr]')) {
      nodes.push(root);
    }
    nodes.forEach(el => {
      const key = el.getAttribute('data-i18n');
      const htmlKey = el.getAttribute('data-i18n-html');
      if (key && !el.hasAttribute('data-i18n-attr') && !el.hasAttribute('data-i18n-html')) {
        el.textContent = t(key);
      }
      if (htmlKey) {
        el.innerHTML = t(htmlKey);
      }
      const attrList = el.getAttribute('data-i18n-attr');
      if (attrList && key) {
        attrList.split(',').map(part => part.trim()).filter(Boolean).forEach(attr => {
          const attrKey = attr === 'aria-label' ? 'ariaLabel' : attr;
          const translated = t(`${key}.${attrKey}`);
          if (translated) {
            el.setAttribute(attr, translated);
          }
        });
      }
    });
    isApplying = false;
  }

  function scheduleApply() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      applyTranslations(document);
    }, 75);
  }

  function initObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(mutations => {
      if (isApplying) return;
      const hasAddedNodes = mutations.some(mutation => mutation.addedNodes && mutation.addedNodes.length > 0);
      if (hasAddedNodes) {
        scheduleApply();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function updateFlagButtons(lang) {
    document.querySelectorAll('.nh48-flag').forEach(btn => {
      const btnLang = btn.getAttribute('data-lang');
      btn.classList.toggle('active', btnLang === lang);
      if (btnLang === lang) {
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.removeAttribute('aria-pressed');
      }
    });
  }

  function initLangPicker() {
    document.querySelectorAll('.nh48-flag').forEach(btn => {
      if (btn.dataset.i18nBound) return;
      btn.dataset.i18nBound = 'true';
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        if (lang) {
          setLang(lang);
        }
      });
    });
    updateFlagButtons(currentLang);
  }

  function renderLangPicker() {
    const container = document.getElementById('langPicker');
    if (!container) return;
    container.innerHTML = '<span class="nh48-lang-label" data-i18n="common.language">LANGUAGE</span>';
    LANGS.forEach(({ code, label, flag }) => {
      const btn = document.createElement('button');
      btn.className = 'nh48-flag';
      btn.setAttribute('data-lang', code);
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.innerHTML = `<span class="flag flag-${code}" aria-hidden="true">${flag}</span>`;
      container.appendChild(btn);
    });
    initLangPicker();
  }

  async function setLang(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) {
      lang = DEFAULT_LANG;
    }
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    currentDict = await loadLang(lang);
    if (!dictionaries.has(DEFAULT_LANG)) {
      await loadLang(DEFAULT_LANG);
    }
    setHtmlLang(lang);
    setDirection(lang);
    applyTranslations(document);
    initLangPicker();
    callbacks.forEach(cb => cb(lang));
  }

  function onLangChange(cb) {
    if (typeof cb === 'function') {
      callbacks.add(cb);
    }
  }

  function init() {
    const initialLang = getLang();
    renderLangPicker();
    setLang(initialLang);
    initObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.NH48_I18N = {
    t,
    setLang,
    getLang,
    onLangChange
  };
})();
