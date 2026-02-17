/*
  Shared icon resolver for Howker plant detail and catalog UIs.
  Exposes deterministic icon selection with rules + overrides.
*/
(function attachHowkerPlantIcons(root) {
  'use strict';

  const BASE_PATH = '/assets/icons/plant-catalog-icons/';
  const DEFAULT_ICON = 'plant.png';

  const FIELD_ICONS = Object.freeze({
    type: 'plant.png',
    habitat: 'tree(3).png',
    elevation: 'tree(4).png',
    'bloom-season': '4-seasons.png',
    season: '4-seasons.png',
    'leaf-stem': 'leaf.png',
    'similar-species': 'magnifying-glass.png',
    ecology: 'soil-health.png',
    status: 'clipboard.png',
    tags: 'sprout.png',
    overview: 'journaling.png',
    teaser: 'journaling.png'
  });

  const TYPE_ICONS = Object.freeze({
    'coniferous-tree': 'tree(5).png',
    shrub: '002-leaf.png',
    moss: 'lichen.png',
    lichen: 'lichen.png',
    fungus: 'mushroom.png',
    wildflower: '008-flower.png',
    'creeping-vine': 'leave.png',
    clubmoss: 'sprout.png',
    fern: '027-parsley.png',
    grass: '008-chives.png'
  });

  const PLANT_OVERRIDES = Object.freeze({
    spruce: 'tree(5).png',
    'orange-cone-mushroom': 'mushroom(1).png',
    partridgeberry: '018-juniper.png',
    'alpine-bilberry': '018-juniper.png',
    'mountain-cranberry': '018-juniper.png',
    'sphagnum-moss': '006-water.png',
    'drooping-woodreed': '008-chives.png'
  });

  const KEYWORD_RULES = Object.freeze([
    { icon: '018-juniper.png', keywords: ['berry', 'berries', 'fruit', 'fruits'] },
    { icon: '006-water.png', keywords: ['bog', 'wetland', 'moist', 'water-holding', 'peat', 'spongy'] },
    { icon: '005-snowflake.png', keywords: ['snow', 'snowpack'] },
    { icon: '007-wind.png', keywords: ['wind', 'alpine', 'treeline', 'krummholz'] },
    { icon: '008-flower.png', keywords: ['flower', 'flowers', 'aster', 'bloom'] }
  ]);

  function normalizeToken(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[_/]+/g, '-')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function buildIconSrc(filename) {
    const safe = String(filename || DEFAULT_ICON).trim() || DEFAULT_ICON;
    return `${BASE_PATH}${encodeURIComponent(safe).replace(/%2F/gi, '/')}`;
  }

  function collectPlantSearchText(plant) {
    if (!plant || typeof plant !== 'object') return '';
    const tags = Array.isArray(plant.tags) ? plant.tags.join(' ') : '';
    return [
      plant.common,
      plant.latin,
      plant.type,
      plant.habitat,
      plant.bloom,
      plant.teaser,
      plant.desc,
      tags
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
  }

  function resolveSpeciesIconFile(plant) {
    const plantId = normalizeToken((plant && (plant.id || plant.slug)) || '');
    if (plantId && PLANT_OVERRIDES[plantId]) {
      return PLANT_OVERRIDES[plantId];
    }

    const typeKey = normalizeToken(plant && plant.type);
    if (typeKey && TYPE_ICONS[typeKey]) {
      return TYPE_ICONS[typeKey];
    }

    const haystack = collectPlantSearchText(plant);
    for (let i = 0; i < KEYWORD_RULES.length; i += 1) {
      const rule = KEYWORD_RULES[i];
      const matched = rule.keywords.some((keyword) => haystack.includes(keyword));
      if (matched) {
        return rule.icon;
      }
    }

    return DEFAULT_ICON;
  }

  function resolveSpeciesIcon(plant) {
    return buildIconSrc(resolveSpeciesIconFile(plant));
  }

  function resolveFieldIcon(fieldKey) {
    const key = normalizeToken(fieldKey);
    return buildIconSrc(FIELD_ICONS[key] || DEFAULT_ICON);
  }

  function resolveTypeIcon(plant) {
    return resolveSpeciesIcon(plant);
  }

  const api = Object.freeze({
    BASE_PATH,
    DEFAULT_ICON,
    FIELD_ICONS,
    TYPE_ICONS,
    KEYWORD_RULES,
    PLANT_OVERRIDES,
    normalizeToken,
    buildIconSrc,
    resolveSpeciesIcon,
    resolveFieldIcon,
    resolveTypeIcon
  });

  root.HOWKER_PLANT_ICONS = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
