(function () {
  function q(id) {
    return document.getElementById(id);
  }

  function collectState() {
    const groups = Array.from(document.querySelectorAll('.wiki-disease-group-panel')).map((panel) => {
      const statusBlocks = Array.from(panel.querySelectorAll('.wiki-disease-status-block')).map((block) => ({
        element: block,
        cards: Array.from(block.querySelectorAll('.wiki-disease-card'))
      }));
      return { panel, statusBlocks };
    });
    return { groups };
  }

  function updateCounts(state) {
    state.groups.forEach(({ panel, statusBlocks }) => {
      let visibleTotal = 0;
      statusBlocks.forEach(({ element, cards }) => {
        const visibleCards = cards.filter((card) => !card.hidden).length;
        visibleTotal += visibleCards;
        element.hidden = visibleCards === 0;
        const statusTitle = element.querySelector('.wiki-disease-status-title span');
        if (statusTitle) {
          statusTitle.textContent = String(visibleCards);
        }
      });

      panel.hidden = visibleTotal === 0;
      const panelCount = panel.querySelector('.wiki-panel-count');
      if (panelCount) {
        panelCount.textContent = `${visibleTotal} entries`;
      }
    });
  }

  function runFilter(state, rawTerm) {
    const term = String(rawTerm || '').trim().toLowerCase();
    state.groups.forEach(({ statusBlocks }) => {
      statusBlocks.forEach(({ cards }) => {
        cards.forEach((card) => {
          if (!term) {
            card.hidden = false;
            return;
          }
          const haystack = `${card.dataset.search || ''} ${card.textContent || ''}`.toLowerCase();
          card.hidden = !haystack.includes(term);
        });
      });
    });
    updateCounts(state);
  }

  function init() {
    const search = q('wikiDiseaseSearch');
    const state = collectState();
    if (search) {
      search.addEventListener('input', () => runFilter(state, search.value));
    }
    updateCounts(state);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

