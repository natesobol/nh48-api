(function () {
  function q(id) {
    return document.getElementById(id);
  }

  function toInt(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function collectPanelState(panelId, listId, countId) {
    const panel = q(panelId);
    const list = q(listId);
    const count = q(countId);
    if (!panel || !list || !count) return null;
    const items = Array.from(list.querySelectorAll('.wiki-link-item'));
    const total = items.filter((item) => !item.hidden).length;
    return { panel, list, count, items, total };
  }

  function applyCounts(states) {
    const nh48 = states.nh48 ? states.nh48.items.filter((item) => !item.hidden).length : 0;
    const nh52wav = states.nh52wav ? states.nh52wav.items.filter((item) => !item.hidden).length : 0;
    const plants = states.plants ? states.plants.items.filter((item) => !item.hidden).length : 0;
    const animals = states.animals ? states.animals.items.filter((item) => !item.hidden).length : 0;
    const mountains = nh48 + nh52wav;

    const statMountains = q('wikiStatMountains');
    const statPlants = q('wikiStatPlants');
    const statAnimals = q('wikiStatAnimals');
    const statPhotos = q('wikiStatPhotos');
    if (statMountains) statMountains.textContent = String(mountains);
    if (statPlants) statPlants.textContent = String(plants);
    if (statAnimals) statAnimals.textContent = String(animals);
    if (statPhotos) {
      const source = document.body.getAttribute('data-wiki-photo-count') || '0';
      statPhotos.textContent = String(toInt(source));
    }
  }

  function updatePanelCount(state) {
    const visible = state.items.filter((item) => !item.hidden).length;
    state.count.textContent = `${visible} entries`;
    state.panel.classList.toggle('is-empty', visible === 0);
  }

  function runFilter(states, term) {
    const query = String(term || '').trim().toLowerCase();
    Object.values(states).forEach((state) => {
      if (!state) return;
      state.items.forEach((item) => {
        const haystack = `${item.textContent || ''} ${(item.dataset.search || '')}`.toLowerCase();
        item.hidden = query ? !haystack.includes(query) : false;
      });
      updatePanelCount(state);
    });
    applyCounts(states);
  }

  function init() {
    const states = {
      nh48: collectPanelState('wikiPanelNh48', 'wikiListNh48', 'wikiCountNh48'),
      nh52wav: collectPanelState('wikiPanelNh52wav', 'wikiListNh52wav', 'wikiCountNh52wav'),
      plants: collectPanelState('wikiPanelPlants', 'wikiListPlants', 'wikiCountPlants'),
      animals: collectPanelState('wikiPanelAnimals', 'wikiListAnimals', 'wikiCountAnimals')
    };

    Object.values(states).forEach((state) => {
      if (!state) return;
      state.count.textContent = `${state.total} entries`;
    });

    const search = q('wikiSearch');
    if (search) {
      search.addEventListener('input', () => runFilter(states, search.value));
    }

    applyCounts(states);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
