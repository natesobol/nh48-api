(() => {
  const SUPPORTED_LANGS = ['en', 'es', 'fr', 'de', 'zh', 'ja'];
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
    const match = SUPPORTED_LANGS.find(lang => lang !== 'en' && path.startsWith(`/${lang}/`));
    return match || DEFAULT_LANG;
  }

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || getLangFromPath();
  }

  function setHtmlLang(lang) {
    if (document.documentElement) {
      document.documentElement.lang = lang;
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
