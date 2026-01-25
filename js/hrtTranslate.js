(() => {
  async function applyHrtTranslations() {
    let lang = 'en';

    if (window.NH48_I18N && window.NH48_I18N.getCurrentLang) {
      lang = window.NH48_I18N.getCurrentLang();
    } else if (document.documentElement.lang) {
      lang = document.documentElement.lang.split('-')[0];
    }

    if (lang === 'en') {
      return;
    }

    const res = await fetch('/i18n/hrt_terms.json');
    if (!res.ok) {
      return;
    }

    const dictionary = await res.json();
    const replacements = {};

    Object.keys(dictionary).forEach((english) => {
      const translation = dictionary[english][lang];
      if (translation) {
        replacements[english] = translation;
      }
    });

    if (!Object.keys(replacements).length) {
      return;
    }

    const article = document.querySelector('main, article, #content');
    if (!article) {
      return;
    }

    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach((textNode) => {
      let text = textNode.nodeValue;

      Object.keys(replacements).forEach((english) => {
        const translation = replacements[english];
        const regex = new RegExp(`\\b${english}\\b`, 'gi');

        text = text.replace(regex, (match) => {
          if (match[0] === match[0].toUpperCase()) {
            return translation.charAt(0).toUpperCase() + translation.slice(1);
          }

          return translation;
        });
      });

      textNode.nodeValue = text;
    });
  }

  function init() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(applyHrtTranslations);
    } else {
      setTimeout(applyHrtTranslations, 0);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
