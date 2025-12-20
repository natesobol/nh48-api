import { decodePolyline6 } from '../polyline6.mjs';

const DEFAULT_BASE_URL = 'https://valhalla1.openstreetmap.de';
const DEFAULT_COSTING = 'pedestrian';

function buildUrl(baseUrl, endpoint){
  return `${baseUrl.replace(/\/$/, '')}${endpoint}`;
}

async function postJson(url, body){
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if(!response.ok){
    const text = await response.text();
    throw new Error(`Valhalla ${response.status}: ${text}`);
  }

  const data = await response.json();
  if(data && data.error){
    throw new Error(`Valhalla error: ${data.error}`);
  }
  return data;
}

function decodeTripGeometry(trip){
  if(!trip || !Array.isArray(trip.legs)){
    throw new Error('Valhalla response missing trip legs.');
  }
  const coordinates = [];
  trip.legs.forEach((leg, legIndex) => {
    if(!leg.shape){
      return;
    }
    const decoded = decodePolyline6(leg.shape);
    decoded.forEach((point, index) => {
      if(legIndex > 0 && index === 0 && coordinates.length){
        const last = coordinates[coordinates.length - 1];
        if(last[0] === point.lon && last[1] === point.lat){
          return;
        }
      }
      coordinates.push([point.lon, point.lat]);
    });
  });

  if(!coordinates.length){
    throw new Error('Valhalla response contained empty geometry.');
  }

  return {
    type: 'LineString',
    coordinates
  };
}

function parseSummary(trip){
  if(!trip || !trip.summary){
    return { distanceKm: null, timeSec: null };
  }
  const distanceKm = Number.isFinite(trip.summary.length) ? trip.summary.length : null;
  const timeSec = Number.isFinite(trip.summary.time) ? trip.summary.time : null;
  return { distanceKm, timeSec };
}

export async function traceRoute(points, options = {}){
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const costing = options.costing || DEFAULT_COSTING;
  const payload = {
    shape: points,
    costing,
    shape_match: 'map_snap',
    filters: {
      attributes: ['edge.names', 'edge.length', 'edge.speed']
    }
  };

  const data = await postJson(buildUrl(baseUrl, '/trace_route'), payload);
  const geometry = decodeTripGeometry(data.trip);
  const summary = parseSummary(data.trip);

  return {
    geometry,
    distanceKm: summary.distanceKm,
    timeSec: summary.timeSec,
    providerMeta: {
      endpoint: 'trace_route',
      baseUrl,
      costing
    }
  };
}

export async function route(points, options = {}){
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const costing = options.costing || DEFAULT_COSTING;
  const payload = {
    locations: points,
    costing,
    directions_options: {
      units: 'miles'
    }
  };

  const data = await postJson(buildUrl(baseUrl, '/route'), payload);
  const geometry = decodeTripGeometry(data.trip);
  const summary = parseSummary(data.trip);

  return {
    geometry,
    distanceKm: summary.distanceKm,
    timeSec: summary.timeSec,
    providerMeta: {
      endpoint: 'route',
      baseUrl,
      costing
    }
  };
}
