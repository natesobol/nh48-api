import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { traceRoute, route as routeFallback } from './routing/providers/valhalla.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, '..', 'data', 'long-trails');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'long-trails', 'generated');
const RATE_LIMIT_MS = 250;
const RETRIES = 2;
const BASE_DELAY_MS = 500;
const MILES_PER_KM = 0.621371;

function toNumber(value){
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizePoint(point){
  if(!point){
    return null;
  }
  if(Array.isArray(point) && point.length >= 2){
    const [lat, lon] = point;
    return { lat: toNumber(lat), lon: toNumber(lon) };
  }
  if(point.lat != null || point.lon != null){
    return { lat: toNumber(point.lat), lon: toNumber(point.lon) };
  }
  return null;
}

function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetries(fn, { retries = RETRIES, baseDelayMs = BASE_DELAY_MS } = {}){
  let attempt = 0;
  while(true){
    try{
      return await fn();
    }catch(error){
      if(attempt >= retries){
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      await sleep(delay);
      attempt += 1;
    }
  }
}

function toRadians(value){
  return (value * Math.PI) / 180;
}

function haversineMiles(a, b){
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const dLat = lat2 - lat1;
  const dLon = toRadians(b[0] - a[0]);
  const radiusKm = 6371;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return 2 * radiusKm * Math.asin(Math.min(1, Math.sqrt(h))) * MILES_PER_KM;
}

function lineDistanceMiles(geometry){
  if(!geometry || !Array.isArray(geometry.coordinates)){
    return null;
  }
  let total = 0;
  for(let i = 1; i < geometry.coordinates.length; i += 1){
    total += haversineMiles(geometry.coordinates[i - 1], geometry.coordinates[i]);
  }
  return total;
}

async function readJson(filePath){
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

async function writeJson(filePath, payload){
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
}

function buildShape(section){
  const start = normalizePoint(section.start);
  const end = normalizePoint(section.end);
  const vias = Array.isArray(section.routing?.vias) ? section.routing.vias.map(normalizePoint).filter(Boolean) : [];
  const points = [start, ...vias, end].filter(Boolean);
  if(points.length < 2 || !start || !end){
    return { points: null, error: 'Section is missing start/end coordinates.' };
  }
  return { points: points.map(point => ({ lat: point.lat, lon: point.lon })), error: null };
}

function buildSectionOutput({ trailSlug, sectionSlug, provider, result, status, error, geometryOverride }){
  const generatedAt = new Date().toISOString();
  const geometry = geometryOverride ?? result?.geometry ?? null;
  const distanceMiles = result?.distanceKm != null
    ? result.distanceKm * MILES_PER_KM
    : lineDistanceMiles(geometry);
  const timeMin = result?.timeSec != null ? result.timeSec / 60 : null;

  return {
    trailSlug,
    sectionSlug,
    provider,
    generatedAt,
    distance_mi: distanceMiles != null ? Number(distanceMiles.toFixed(2)) : null,
    time_min: timeMin != null ? Number(timeMin.toFixed(1)) : null,
    geometry,
    providerMeta: result?.providerMeta ?? null,
    status,
    error
  };
}

function buildLineGeometry(points){
  if(!Array.isArray(points) || points.length < 2){
    return null;
  }
  return {
    type: 'LineString',
    coordinates: points.map(point => [point.lon, point.lat])
  };
}

function fallbackGeometryFromSection(section){
  const geometry = section?.geometry;
  if(geometry?.type === 'LineString' && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2){
    return geometry;
  }
  if(Array.isArray(geometry?.coordinates) && geometry.coordinates.length >= 2){
    return { type: 'LineString', coordinates: geometry.coordinates };
  }
  return null;
}

async function generateSection({ trailSlug, section, outputDir, force }){
  const sectionSlug = section.slug;
  const outputPath = path.join(outputDir, trailSlug, `${sectionSlug}.json`);
  let existingOutput = null;

  try{
    existingOutput = await readJson(outputPath);
    if(!force){
      return existingOutput;
    }
  }catch(error){
    // Continue to generate if the file does not exist or is unreadable.
  }

  const routing = section.routing || {};
  const costing = routing.costing || 'pedestrian';
  const useTraceRoute = routing.useTraceRoute !== false;
  const shapeResult = buildShape(section);
  const sectionGeometry = fallbackGeometryFromSection(section);
  if(!shapeResult.points){
    if(existingOutput){
      return existingOutput;
    }
    if(sectionGeometry){
      const output = buildSectionOutput({
        trailSlug,
        sectionSlug,
        provider: 'fallback',
        result: null,
        geometryOverride: sectionGeometry,
        status: 'fallback',
        error: `${shapeResult.error} Using existing geometry.`
      });
      await writeJson(outputPath, output);
      return output;
    }
    const output = buildSectionOutput({
      trailSlug,
      sectionSlug,
      provider: 'valhalla',
      result: null,
      status: 'failed',
      error: shapeResult.error
    });
    await writeJson(outputPath, output);
    return output;
  }
  const shape = shapeResult.points;
  let result = null;
  let errorMessage = null;
  let didRequest = false;

  try{
    if(useTraceRoute){
      didRequest = true;
      result = await withRetries(() => traceRoute(shape, { costing }));
    }
  }catch(error){
    errorMessage = error.message;
  }

  if(!result){
    try{
      didRequest = true;
      result = await withRetries(() => routeFallback(shape, { costing }));
    }catch(error){
      errorMessage = error.message;
    }
  }

  if(didRequest){
    await sleep(RATE_LIMIT_MS);
  }

  if(result){
    const output = buildSectionOutput({
      trailSlug,
      sectionSlug,
      provider: 'valhalla',
      result,
      status: 'ok',
      error: null
    });
    await writeJson(outputPath, output);
    return output;
  }

  const fallbackGeometry = sectionGeometry || buildLineGeometry(shape);
  if(fallbackGeometry){
    const output = buildSectionOutput({
      trailSlug,
      sectionSlug,
      provider: 'fallback',
      result: null,
      geometryOverride: fallbackGeometry,
      status: 'fallback',
      error: errorMessage || 'Routing failed, using fallback geometry.'
    });
    await writeJson(outputPath, output);
    return output;
  }

  if(existingOutput){
    return existingOutput;
  }
  const output = buildSectionOutput({
    trailSlug,
    sectionSlug,
    provider: 'valhalla',
    result: null,
    status: 'failed',
    error: errorMessage || 'Routing failed.'
  });
  await writeJson(outputPath, output);
  return output;
}

function buildProgressLabel(state){
  const percent = state.totalSections > 0
    ? ((state.processed / state.totalSections) * 100).toFixed(1)
    : '0.0';
  const attempted = state.ok + state.failed;
  const ratio = attempted > 0 ? ((state.ok / attempted) * 100).toFixed(1) : '0.0';
  return `${percent}% complete | accept ${state.ok} / reject ${state.failed} (${ratio}%)`;
}

function logSectionStatus({ trailSlug, sectionSlug, status, state }){
  const label = buildProgressLabel(state);
  console.log(`[${trailSlug}] ${sectionSlug}: ${status.toUpperCase()} | ${label}`);
}

function logTrailStart({ trailSlug, sectionCount }){
  console.log(`\n==> Processing ${trailSlug} (${sectionCount} sections)`);
}

async function generateTrail({ trail, trailFile, options, state }){
  const trailSlug = trail.slug || trail.id || path.basename(trailFile, '.json');
  if(options.trail && options.trail !== trailSlug){
    return null;
  }

  const sections = Array.isArray(trail.sections) ? trail.sections : [];
  const generatedSections = [];
  const sectionsWithSlug = sections.filter(section => section.slug);
  logTrailStart({ trailSlug, sectionCount: sectionsWithSlug.length });

  for(const section of sections){
    if(!section.slug){
      state.skipped += 1;
      continue;
    }
    const output = await generateSection({
      trailSlug,
      section,
      outputDir: OUTPUT_DIR,
      force: options.force
    });
    generatedSections.push(output);
    state.processed += 1;
    if(output.status === 'ok'){
      state.ok += 1;
    }else{
      state.failed += 1;
    }
    logSectionStatus({
      trailSlug,
      sectionSlug: section.slug,
      status: output.status || 'unknown',
      state
    });
  }

  const combinedPath = path.join(OUTPUT_DIR, `${trailSlug}.sections.generated.json`);
  const combinedOutput = {
    trailSlug,
    generatedAt: new Date().toISOString(),
    sections: generatedSections
  };
  await writeJson(combinedPath, combinedOutput);
  return combinedOutput;
}

function parseArgs(){
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force'),
    trail: args.find(arg => arg.startsWith('--trail='))?.split('=')[1] || null
  };
}

async function main(){
  const options = parseArgs();
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const files = await fs.readdir(DATA_DIR);
  const trails = files.filter(file => file.endsWith('.json'));

  const loadedTrails = [];
  for(const file of trails){
    const trail = await readJson(path.join(DATA_DIR, file));
    const trailSlug = trail.slug || trail.id || path.basename(file, '.json');
    if(options.trail && options.trail !== trailSlug){
      continue;
    }
    loadedTrails.push({ trail, trailFile: file });
  }

  const totalSections = loadedTrails.reduce((total, { trail }) => {
    const sections = Array.isArray(trail.sections) ? trail.sections : [];
    return total + sections.filter(section => section.slug).length;
  }, 0);

  const state = {
    totalSections,
    processed: 0,
    ok: 0,
    failed: 0,
    skipped: 0
  };

  console.log(`Starting geometry generation for ${loadedTrails.length} trails (${totalSections} sections).`);

  for(const entry of loadedTrails){
    await generateTrail({ ...entry, options, state });
  }

  console.log(`\nDone. ${state.processed}/${state.totalSections} sections processed. Skipped: ${state.skipped}.`);
  console.log(buildProgressLabel(state));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
