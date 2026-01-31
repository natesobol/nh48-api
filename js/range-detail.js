const PEAKS_DATA_URLS = [
  '/data/nh48.json',
  'https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48.json',
  'https://raw.githubusercontent.com/natesobol/nh48-api/main/data/nh48.json'
];

const IMAGE_TRANSFORM_OPTIONS = 'format=webp,quality=85,width=1200';
const PHOTO_BASE_URL = 'https://photos.nh48.info';
const PHOTO_BASE = new URL(PHOTO_BASE_URL);
const IMAGE_TRANSFORM_PREFIX = `${PHOTO_BASE.origin}/cdn-cgi/image/${IMAGE_TRANSFORM_OPTIONS}`;
const PHOTO_PATH_PREFIX = '/nh48-photos/';

const elements = {
  loading: document.getElementById('rangeLoading'),
  content: document.getElementById('rangeContent'),
  empty: document.getElementById('emptyMessage'),
  title: document.getElementById('rangeTitle'),
  summary: document.getElementById('rangeSummary'),
  heroImage: document.getElementById('rangeHeroImage'),
  heroCaption: document.getElementById('rangeHeroCaption'),
  peakCount: document.getElementById('rangePeakCount'),
  highestPeak: document.getElementById('rangeHighestPeak'),
  highestElevation: document.getElementById('rangeHighestElevation'),
  peaksBody: document.getElementById('rangePeaksBody'),
  photoMetaPanel: document.getElementById('photoMetaPanel'),
  photoMetaList: document.getElementById('photoMetaList')
};

function slugify(value){
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanRangeName(range){
  if(!range) return 'Unknown Range';
  const cleaned = range.trim();
  return cleaned.endsWith('.') ? cleaned.slice(0, -1) : cleaned;
}

function getRangeName(peak){
  const range = peak?.range || peak?.['Range / Subrange'] || peak?.['Range'] || 'Unknown Range';
  return cleanRangeName(range);
}

function getPeakName(peak){
  return peak?.name || peak?.['Peak Name'] || peak?.peakName || peak?.['Peak'] || 'Unknown Peak';
}

function parseElevation(peak){
  const raw = peak['Elevation (ft)'] ?? peak.elevation ?? peak['Elevation'] ?? peak.elevationFeet ?? peak.elevation_ft;
  const value = typeof raw === 'string' ? parseFloat(raw.replace(/,/g, '')) : Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function formatElevation(value){
  if(!value) return '—';
  return `${Math.round(value).toLocaleString()} ft`;
}

function getPrimaryPhoto(peak){
  const photos = Array.isArray(peak?.photos) ? peak.photos : [];
  return photos.find(photo => photo && (photo.isPrimary || photo.default)) || photos[0] || null;
}

function applyImageTransform(url){
  if(!url) return url;
  try{
    const parsed = new URL(url, window.location.origin);
    if(parsed.pathname.startsWith('/cdn-cgi/image/')){
      return url;
    }
    if(parsed.hostname === PHOTO_BASE.hostname){
      const normalizedPath = parsed.pathname.startsWith('/') ? parsed.pathname : `/${parsed.pathname}`;
      return `${IMAGE_TRANSFORM_PREFIX}${normalizedPath}${parsed.search || ''}`;
    }
  }catch (err){
    console.warn('Unable to normalize photo URL', url, err);
  }
  return url;
}

function normalizePhotoUrl(url){
  if(!url) return url;
  if(url.startsWith(PHOTO_BASE_URL)) return applyImageTransform(url);
  const isJsdelivrPhoto = url.includes('cdn.jsdelivr.net/gh/natesobol/nh48-api@main/photos/');
  const isGithubRawPhoto = url.includes('raw.githubusercontent.com/natesobol/nh48-api/main/photos/');
  const isR2PathStyle = url.includes('r2.cloudflarestorage.com/nh48-photos/');
  const isR2BucketHost = url.includes('r2.cloudflarestorage.com/') && !url.includes('/nh48-photos/');
  let normalized = url;
  if(isR2PathStyle){
    const [, tail] = url.split(PHOTO_PATH_PREFIX);
    normalized = tail ? `${PHOTO_BASE_URL}/${tail}` : url;
  }
  if(isR2BucketHost){
    const bucketTail = url.split('r2.cloudflarestorage.com/')[1];
    if(bucketTail){
      const normalizedTail = bucketTail.replace(/^nh48-photos\//, '');
      normalized = `${PHOTO_BASE_URL}/${normalizedTail}`;
    }
  }
  if(isJsdelivrPhoto || isGithubRawPhoto){
    const [, tail] = url.split('/photos/');
    normalized = tail ? `${PHOTO_BASE_URL}/${tail}` : url;
  }
  if(normalized.startsWith(PHOTO_BASE_URL)){
    return applyImageTransform(normalized);
  }
  return normalized;
}

function toTransformedPhotoUrl(url){
  const normalized = normalizePhotoUrl(url);
  if(!normalized) return normalized;
  if(normalized.includes('/cdn-cgi/image/')){
    return normalized;
  }
  return applyImageTransform(normalized);
}

function getRangeSlug(){
  const trimmed = window.location.pathname.replace(/\/+$/, '');
  const parts = trimmed.split('/').filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 1] : '';
}

function getPeaksArray(data){
  if(Array.isArray(data)) return data;
  if(data && typeof data === 'object') return Object.values(data);
  return [];
}

async function fetchPeaks(){
  for(const url of PEAKS_DATA_URLS){
    try{
      const response = await fetch(url, { mode: 'cors' });
      if(!response.ok) throw new Error(`Bad response: ${response.status}`);
      const data = await response.json();
      if(data && typeof data === 'object'){
        return data;
      }
    }catch(error){
      console.warn('Failed to fetch peaks from', url, error);
    }
  }
  throw new Error('Unable to load peaks data.');
}

function buildPeaksTable(peaks){
  const rows = peaks.map(peak => {
    const photo = getPrimaryPhoto(peak);
    const photoUrl = photo?.url ? toTransformedPhotoUrl(photo.url) : '';
    const name = getPeakName(peak);
    const elevation = parseElevation(peak);
    const difficulty = peak?.difficulty || peak?.Difficulty || 'N/A';
    return `
      <tr>
        <td>${photoUrl ? `<img src="${photoUrl}" alt="${photo?.alt || name}" class="peak-thumbnail" loading="lazy" decoding="async">` : '—'}</td>
        <td><a href="/peak/${peak.slug}/">${name}</a></td>
        <td>${formatElevation(elevation)}</td>
        <td>${difficulty || 'N/A'}</td>
      </tr>
    `;
  });
  elements.peaksBody.innerHTML = rows.join('');
}

function updatePhotoMeta(photo){
  if(!photo) return;
  const author = photo.author || photo?.iptc?.creator;
  const captureDate = photo.captureDate;
  const license = photo?.iptc?.copyrightNotice || photo?.copyright;
  const items = [
    ['Photographer', author],
    ['Capture Date', captureDate ? new Date(captureDate).toLocaleDateString() : null],
    ['License', license]
  ].filter(([, value]) => value);

  if(items.length === 0) return;

  elements.photoMetaList.innerHTML = items.map(([label, value]) => (
    `<div><dt>${label}</dt><dd>${value}</dd></div>`
  )).join('');
  elements.photoMetaPanel.hidden = false;
}

function showRange(rangeName, peaksInRange){
  const sortedPeaks = [...peaksInRange].sort((a, b) => parseElevation(b) - parseElevation(a));
  const tallestPeak = sortedPeaks[0];
  const tallestName = getPeakName(tallestPeak);
  const tallestElevation = parseElevation(tallestPeak);
  const primaryPhoto = getPrimaryPhoto(tallestPeak);
  const heroPhotoUrl = primaryPhoto?.url ? toTransformedPhotoUrl(primaryPhoto.url) : '';

  elements.title.textContent = rangeName;
  elements.summary.textContent = `${rangeName} features ${peaksInRange.length} NH48 peaks. The tallest summit is ${tallestName} at ${formatElevation(tallestElevation)}.`;
  elements.peakCount.textContent = peaksInRange.length;
  elements.highestPeak.textContent = tallestName;
  elements.highestElevation.textContent = formatElevation(tallestElevation);

  if(heroPhotoUrl){
    elements.heroImage.src = heroPhotoUrl;
    elements.heroImage.alt = primaryPhoto?.alt || `${rangeName} range highlighted by ${tallestName}`;
    elements.heroCaption.textContent = primaryPhoto?.extendedDescription || primaryPhoto?.alt || `${tallestName} in the ${rangeName} range.`;
  }else{
    elements.heroImage.alt = `${rangeName} range`;
    elements.heroCaption.textContent = `${rangeName} range.`;
  }

  buildPeaksTable(sortedPeaks);
  updatePhotoMeta(primaryPhoto);
}

async function init(){
  const rangeSlug = getRangeSlug();
  if(!rangeSlug){
    elements.loading.style.display = 'none';
    elements.empty.hidden = false;
    elements.empty.textContent = 'Select a range from the range catalog to view details.';
    return;
  }
  try{
    const peaksData = await fetchPeaks();
    const peaks = getPeaksArray(peaksData);
    const peaksInRange = peaks.filter(peak => slugify(getRangeName(peak)) === rangeSlug);

    elements.loading.style.display = 'none';
    if(peaksInRange.length === 0){
      elements.empty.hidden = false;
      elements.empty.textContent = 'No peaks found for this range.';
      return;
    }
    const rangeName = getRangeName(peaksInRange[0]);
    showRange(rangeName, peaksInRange);
    elements.content.hidden = false;
  }catch(error){
    console.error(error);
    elements.loading.style.display = 'none';
    elements.empty.hidden = false;
    elements.empty.textContent = 'Unable to load range details.';
  }
}

init();
