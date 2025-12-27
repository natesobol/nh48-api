(() => {
  const FOOTER_ID = 'nh48-quick-browse-footer';
  const STYLE_ATTR = 'data-nh48-quick-footer-style';
  const FOOTER_ATTR = 'data-nh48-quick-footer';
  const PARTIAL_URL = '/pages/footer-quick-browse.html';

  const injectFooter = () => {
    if (document.getElementById(FOOTER_ID) || document.querySelector(`[${FOOTER_ATTR}]`)) {
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
      })
      .catch((error) => {
        console.error('NH48 quick footer failed to load', error);
      });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFooter);
  } else {
    injectFooter();
  }
})();
