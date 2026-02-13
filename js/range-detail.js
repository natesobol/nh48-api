const PEAKS_DATA_URLS = [
  '/data/nh48.json',
  'https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48.json',
  'https://raw.githubusercontent.com/natesobol/nh48-api/main/data/nh48.json'
];
const RANGE_DATA_URLS = [
  '/data/wmnf-ranges.json',
  'https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/wmnf-ranges.json',
  'https://raw.githubusercontent.com/natesobol/nh48-api/main/data/wmnf-ranges.json'
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

function trackAnalytics(name, params = {}){
  if(window.NH48Analytics?.track){
    window.NH48Analytics.track(name, params);
    return;
  }
  if(window.NH48_INFO_ANALYTICS?.logEvent){
    window.NH48_INFO_ANALYTICS.logEvent(name, params);
  }
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

function normalizeName(value){
  return String(value || '').trim().toLowerCase();
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

async function fetchRanges(){
  for(const url of RANGE_DATA_URLS){
    try{
      const response = await fetch(url, { mode: 'cors' });
      if(!response.ok) throw new Error(`Bad response: ${response.status}`);
      const data = await response.json();
      if(data && typeof data === 'object'){
        return data;
      }
    }catch(error){
      console.warn('Failed to fetch ranges from', url, error);
    }
  }
  throw new Error('Unable to load range data.');
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
        <td>${photoUrl ? `<img src="${photoUrl}" alt="${photo?.altText || photo?.alt || name}" class="peak-thumbnail" loading="lazy" decoding="async">` : '—'}</td>
        <td><a href="/peak/${peak.slug}/" data-peak-slug="${peak.slug || ''}">${name}</a></td>
        <td>${formatElevation(elevation)}</td>
        <td>${difficulty || 'N/A'}</td>
      </tr>
    `;
  });
  elements.peaksBody.innerHTML = rows.join('');
}

function updatePhotoMeta(photo){
  if(!photo) return;
  const author = photo.author || photo?.iptc?.creator || photo?.iptc?.credit;
  const captureDate = photo.captureDate || photo?.iptc?.dateCreated;
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

function updateBreadcrumb(rangeName){
  const crumb = document.querySelector('.breadcrumb-nav li[aria-current="page"]');
  if(crumb) crumb.textContent = rangeName;
}

function updateRangeMetaAndStructuredData(rangeInfo, peaksInRange, heroPhoto, heroPhotoUrl){
  const rangeName = rangeInfo.rangeName || 'NH48 Range';
  const canonicalUrl = `https://nh48.info/range/${rangeInfo.slug}/`;
  const description =
    rangeInfo.description ||
    rangeInfo.extendedDescription ||
    `${rangeName} features ${rangeInfo.peakCount || peaksInRange.length} NH48 peaks, with ${rangeInfo.highestPoint?.peakName || 'a highest summit'} at ${formatElevation(rangeInfo.highestPoint?.elevation_ft)}.`;
  const title = `${rangeName} Range – NH48`;

  document.title = title;
  const setMeta = (selector, content) => {
    if(!content) return;
    const el = document.querySelector(selector);
    if(el) el.setAttribute('content', content);
  };
  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[property="og:url"]', canonicalUrl);
  setMeta('meta[property="og:image"]', heroPhotoUrl || '');
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:description"]', description);
  setMeta('meta[name="twitter:image"]', heroPhotoUrl || '');
  setMeta('meta[name="twitter:url"]', canonicalUrl);
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if(canonicalLink) canonicalLink.setAttribute('href', canonicalUrl);

  const imageDescription =
    heroPhoto?.description ||
    heroPhoto?.extendedDescription ||
    heroPhoto?.caption ||
    heroPhoto?.altText ||
    heroPhoto?.alt;
  const imageObject = heroPhotoUrl ? {
    "@type": "ImageObject",
    "url": heroPhotoUrl,
    "caption": heroPhoto?.caption || heroPhoto?.altText || heroPhoto?.alt || rangeName,
    "description": imageDescription,
    "creditText": heroPhoto?.iptc?.credit || heroPhoto?.author || heroPhoto?.iptc?.creator,
    "creator": heroPhoto?.iptc?.creator || heroPhoto?.author,
    "license": heroPhoto?.iptc?.copyrightNotice || heroPhoto?.copyright
  } : undefined;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${rangeName} Range`,
    "description": description,
    "url": canonicalUrl,
    "image": imageObject,
    "hasPart": peaksInRange.map((peak) => ({
      "@type": "Mountain",
      "name": getPeakName(peak),
      "url": `https://nh48.info/peak/${peak.slug}/`
    }))
  };

  const existing = document.getElementById('range-structured-data');
  if(existing) existing.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'range-structured-data';
  script.textContent = JSON.stringify(structuredData);
  document.head.appendChild(script);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://nh48.info/" },
      { "@type": "ListItem", "position": 2, "name": "Range Catalog", "item": "https://nh48.info/catalog/ranges" },
      { "@type": "ListItem", "position": 3, "name": rangeName, "item": canonicalUrl }
    ]
  };
  const breadcrumbExisting = document.getElementById('range-breadcrumb-structured-data');
  if(breadcrumbExisting) breadcrumbExisting.remove();
  const breadcrumbScript = document.createElement('script');
  breadcrumbScript.type = 'application/ld+json';
  breadcrumbScript.id = 'range-breadcrumb-structured-data';
  breadcrumbScript.textContent = JSON.stringify(breadcrumb);
  document.head.appendChild(breadcrumbScript);
}

function showRange(rangeInfo, peaksInRange, heroPhoto){
  const rangeName = rangeInfo.rangeName;
  const sortedPeaks = [...peaksInRange].sort((a, b) => parseElevation(b) - parseElevation(a));
  const tallestName = rangeInfo.highestPoint?.peakName || getPeakName(sortedPeaks[0]);
  const tallestElevation = rangeInfo.highestPoint?.elevation_ft || parseElevation(sortedPeaks[0]);
  const heroPhotoUrl = heroPhoto?.url ? toTransformedPhotoUrl(heroPhoto.url) : '';
  const summary =
    rangeInfo.description ||
    rangeInfo.extendedDescription ||
    `${rangeName} features ${rangeInfo.peakCount || peaksInRange.length} NH48 peaks. The tallest summit is ${tallestName} at ${formatElevation(tallestElevation)}.`;

  elements.title.textContent = rangeName;
  elements.summary.textContent = summary;
  elements.peakCount.textContent = rangeInfo.peakCount || peaksInRange.length;
  elements.highestPeak.textContent = tallestName;
  elements.highestElevation.textContent = formatElevation(tallestElevation);

  if(heroPhotoUrl){
    elements.heroImage.src = heroPhotoUrl;
    elements.heroImage.alt = heroPhoto?.altText || heroPhoto?.alt || `${rangeName} range highlighted by ${tallestName}`;
    elements.heroCaption.textContent = heroPhoto?.caption || heroPhoto?.description || heroPhoto?.extendedDescription || heroPhoto?.altText || heroPhoto?.alt || `${tallestName} in the ${rangeName} range.`;
  }else{
    elements.heroImage.alt = `${rangeName} range`;
    elements.heroCaption.textContent = `${rangeName} range.`;
  }

  buildPeaksTable(sortedPeaks);
  updatePhotoMeta(heroPhoto);
  updateBreadcrumb(rangeName);
  updateRangeMetaAndStructuredData(rangeInfo, peaksInRange, heroPhoto, heroPhotoUrl);
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
    const rangesData = await fetchRanges();
    const rangeInfo = rangesData[rangeSlug];
    if(!rangeInfo){
      elements.loading.style.display = 'none';
      elements.empty.hidden = false;
      elements.empty.textContent = 'Range not found.';
      return;
    }

    const peaksData = await fetchPeaks();
    const peaks = getPeaksArray(peaksData);
    const peakMap = {};
    peaks.forEach(peak => {
      const peakName = getPeakName(peak);
      if(peakName) peakMap[normalizeName(peakName)] = peak;
      if(peak?.peakName) peakMap[normalizeName(peak.peakName)] = peak;
    });
    const peaksInRange = (rangeInfo.peakList || [])
      .map(name => peakMap[normalizeName(name)])
      .filter(Boolean);
    const heroPhoto = (rangeInfo.photos || []).find(photo => photo?.isPrimary) || rangeInfo.photos?.[0] || null;

    elements.loading.style.display = 'none';
    if(peaksInRange.length === 0){
      elements.empty.hidden = false;
      elements.empty.textContent = 'No peaks found for this range.';
      return;
    }
    elements.peaksBody.addEventListener('click', (event) => {
      const peakLink = event.target.closest('a[data-peak-slug]');
      if(!peakLink) return;
      trackAnalytics('range_peak_open', {
        peak_slug: peakLink.getAttribute('data-peak-slug') || '',
        range_slug: rangeSlug
      });
    });
    showRange(rangeInfo, peaksInRange, heroPhoto);
    elements.content.hidden = false;
  }catch(error){
    console.error(error);
    elements.loading.style.display = 'none';
    elements.empty.hidden = false;
    elements.empty.textContent = 'Unable to load range details.';
  }
}

init();
