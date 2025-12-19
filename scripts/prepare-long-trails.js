#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'long-trails');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'long-trails-index.json');

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
  const minLat = Math.min(a.minLat, b.minLat);
  const minLon = Math.min(a.minLon, b.minLon);
  const maxLat = Math.max(a.maxLat, b.maxLat);
  const maxLon = Math.max(a.maxLon, b.maxLon);
  return { minLat, minLon, maxLat, maxLon };
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

function parseGpxToGeoJson(gpxPath){
  try{
    const gpx = fs.readFileSync(gpxPath, 'utf8');
    const points = [];
    const regex = /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>/g;
    let match;
    while((match = regex.exec(gpx)) !== null){
      const lat = toNumber(match[1]);
      const lon = toNumber(match[2]);
      if(lat !== null && lon !== null){
        points.push([lon, lat]);
      }
    }
    if(points.length === 0){
      return null;
    }
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: points
      }
    };
  }catch(error){
    return null;
  }
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

function normalizeSection(section){
  const start = section.start || null;
  const end = section.end || null;
  const bounds = normalizeBounds(section.geometry || section.bounds || section.bbox);
  const pointBounds = boundsFromPoints([
    start && { lat: toNumber(start.lat), lon: toNumber(start.lon) },
    end && { lat: toNumber(end.lat), lon: toNumber(end.lon) }
  ].filter(Boolean));
  const mergedBounds = mergeBounds(bounds, pointBounds);
  const center = sectionCenter({ start, end });

  let gpxGeoJson = null;
  let gpxPath = null;
  if(section.gpx && section.gpx.primary && section.gpx.primary.uri){
    gpxPath = path.join(DATA_DIR, section.gpx.primary.uri);
    if(fs.existsSync(gpxPath)){
      const stats = fs.statSync(gpxPath);
      if(stats.size > 0){
        gpxGeoJson = parseGpxToGeoJson(gpxPath);
      }
    }
  }

  return {
    ...section,
    start,
    end,
    bounds: mergedBounds,
    center,
    gpxGeoJson
  };
}

function buildIndex(){
  if(!fs.existsSync(DATA_DIR)){
    return {
      generatedAt: new Date().toISOString(),
      bounds: null,
      trails: []
    };
  }

  const files = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));
  const usedColors = new Set();
  let globalBounds = null;

  const trails = files.map((file, index) => {
    const trail = readJson(path.join(DATA_DIR, file));
    const slug = trail.slug || trail.id || path.basename(file, '.json');
    const color = resolveColor(slug, usedColors, index);
    const normalizedSections = (trail.sections || []).map(normalizeSection).sort((a, b) => {
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

  return {
    generatedAt: new Date().toISOString(),
    bounds: globalBounds,
    trails
  };
}

const output = buildIndex();
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

console.log(`Wrote ${OUTPUT_PATH}`);
