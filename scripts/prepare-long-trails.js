#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'long-trails');
const OUTPUT_INDEX = path.join(__dirname, '..', 'data', 'long-trails-index.json');
const OUTPUT_FULL = path.join(__dirname, '..', 'data', 'long-trails-full.json');

const TRAIL_COLORS = {
  'appalachian-trail': '#008A5E',
  'tuscarora-trail': '#0065A4',
  'allegheny-trail': '#8b5cf6',
  'long-trail': '#16a34a',
  'north-country-trail': '#f97316',
  'finger-lakes-trail': '#db2777',
  'quehanna-trail': '#0ea5e9',
  'mid-state-trail': '#facc15'
};

const FALLBACK_PALETTE = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf'
];

function readJson(filePath){
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toNumber(value){
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function slugify(value){
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .trim();
}

function normalizeBounds(input){
  if(!input){
    return null;
  }
  if(Array.isArray(input) && input.length === 4){
    const [minLat, minLon, maxLat, maxLon] = input;
    return {
      minLat: toNumber(minLat),
      minLon: toNumber(minLon),
      maxLat: toNumber(maxLat),
      maxLon: toNumber(maxLon)
    };
  }
  if(typeof input === 'object'){
    return {
      minLat: toNumber(input.minLat ?? input.south ?? input.min_lat),
      minLon: toNumber(input.minLon ?? input.west ?? input.min_lon),
      maxLat: toNumber(input.maxLat ?? input.north ?? input.max_lat),
      maxLon: toNumber(input.maxLon ?? input.east ?? input.max_lon)
    };
  }
  return null;
}

function mergeBounds(a, b){
  if(!a) return b;
  if(!b) return a;
  return {
    minLat: Math.min(a.minLat, b.minLat),
    minLon: Math.min(a.minLon, b.minLon),
    maxLat: Math.max(a.maxLat, b.maxLat),
    maxLon: Math.max(a.maxLon, b.maxLon)
  };
}

function boundsFromPoints(points){
  const coords = points.filter(Boolean);
  if(coords.length === 0) return null;
  let minLat = coords[0].lat;
  let maxLat = coords[0].lat;
  let minLon = coords[0].lon;
  let maxLon = coords[0].lon;
  coords.forEach(({ lat, lon }) => {
    if(lat < minLat) minLat = lat;
    if(lat > maxLat) maxLat = lat;
    if(lon < minLon) minLon = lon;
    if(lon > maxLon) maxLon = lon;
  });
  return { minLat, minLon, maxLat, maxLon };
}

function normalizeEndpoints(stats){
  if(!stats) return null;
  const endpoints = stats.endpoints;
  if(Array.isArray(endpoints) && endpoints.length >= 2){
    return {
      start: endpoints[0],
      end: endpoints[endpoints.length - 1]
    };
  }
  if(typeof endpoints === 'object'){
    return endpoints;
  }
  return null;
}

function resolveColor(slug, usedColors){
  if(TRAIL_COLORS[slug]){
    return TRAIL_COLORS[slug];
  }
  const color = FALLBACK_PALETTE[usedColors.size % FALLBACK_PALETTE.length];
  usedColors.add(color);
  return color;
}

function normalizeDistance(distance){
  if(distance == null) return null;
  if(typeof distance === 'number') return distance;
  if(typeof distance === 'string'){
    const parsed = toNumber(distance);
    return parsed;
  }
  if(typeof distance === 'object'){
    return toNumber(distance.miles ?? distance.mi ?? distance.mile ?? distance.value);
  }
  return null;
}

function sectionCenter(section){
  if(section.start && section.end){
    const lat = (toNumber(section.start.lat) + toNumber(section.end.lat)) / 2;
    const lon = (toNumber(section.start.lon) + toNumber(section.end.lon)) / 2;
    if(Number.isFinite(lat) && Number.isFinite(lon)){
      return { lat, lon };
    }
  }
  return null;
}

function normalizeSection(section, index, trailSlug){
  const start = section.start || null;
  const end = section.end || null;
  const bounds = normalizeBounds(section.geometry || section.bounds || section.bbox);
  const pointBounds = boundsFromPoints([
    start && { lat: toNumber(start.lat), lon: toNumber(start.lon) },
    end && { lat: toNumber(end.lat), lon: toNumber(end.lon) }
  ].filter(Boolean));
  const mergedBounds = mergeBounds(bounds, pointBounds);
  const center = sectionCenter({ start, end });
  const slug = section.slug || slugify(section.name || `${start?.name || 'start'}-${end?.name || 'end'}`) || `${trailSlug}-section-${index + 1}`;

  return {
    ...section,
    id: section.id || `${trailSlug}-section-${index + 1}`,
    slug,
    start,
    end,
    bounds: mergedBounds,
    center,
    distanceMiles: normalizeDistance(section.distance)
  };
}

function buildIndex(){
  if(!fs.existsSync(DATA_DIR)){
    return {
      generatedAt: new Date().toISOString(),
      bounds: null,
      trails: [],
      colors: {}
    };
  }

  const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));
  const usedColors = new Set();
  const colors = {};
  let globalBounds = null;

  const trails = files.map((file, index) => {
    const trail = readJson(path.join(DATA_DIR, file));
    const slug = trail.slug || trail.id || path.basename(file, '.json');
    const color = resolveColor(slug, usedColors, index);
    colors[slug] = color;
    const normalizedSections = (trail.sections || []).map((section, sectionIndex) => {
      return normalizeSection(section, sectionIndex, slug);
    }).sort((a, b) => {
      return (a.order ?? 0) - (b.order ?? 0);
    });

    let trailBounds = null;
    normalizedSections.forEach(section => {
      trailBounds = mergeBounds(trailBounds, section.bounds);
    });

    trailBounds = mergeBounds(trailBounds, normalizeBounds(trail.map && (trail.map.bbox || trail.map.bounds)));
    globalBounds = mergeBounds(globalBounds, trailBounds);

    return {
      ...trail,
      slug,
      color,
      stats: {
        ...trail.stats,
        endpoints: normalizeEndpoints(trail.stats)
      },
      map: {
        ...trail.map,
        bounds: normalizeBounds(trail.map && (trail.map.bbox || trail.map.bounds))
      },
      bounds: trailBounds,
      sections: normalizedSections
    };
  });

  const index = {
    generatedAt: new Date().toISOString(),
    bounds: globalBounds,
    colors,
    trails: trails.map(trail => ({
      slug: trail.slug,
      name: trail.name,
      shortName: trail.shortName || null,
      sectionCount: trail.sections.length
    }))
  };

  const full = {
    generatedAt: new Date().toISOString(),
    bounds: globalBounds,
    colors,
    trails
  };

  return { index, full };
}

const output = buildIndex();
fs.writeFileSync(OUTPUT_INDEX, JSON.stringify(output.index, null, 2));
fs.writeFileSync(OUTPUT_FULL, JSON.stringify(output.full, null, 2));

console.log(`Wrote ${OUTPUT_INDEX}`);
console.log(`Wrote ${OUTPUT_FULL}`);
