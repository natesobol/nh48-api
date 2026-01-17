# Peak Details Page Diagnosis & Fix Plan

## Issue Summary
Peak details pages at `/peak/{slug}` are not loading correctly. The page template loads but peak data doesn't populate.

## Root Causes Identified

### 1. **Client-Side Data Fetching Issues**
Location: `pages/nh48_peak.html` lines 1668-1696

The `fetchPeaks()` function tries multiple endpoints in order:
1. JSDelivr CDN
2. GitHub Raw
3. Local `/data/nh48.json`

**Problem**: If all three fail, the page shows no data. Need better error handling and fallbacks.

### 2. **Worker Route Handling**
Location: `worker.js` lines 1250-1255

```javascript
const ok = (!isFrench && parts[0] === 'peak') || (isFrench && parts[1] === 'peak');
if (!ok || !slug) {
  return fetch(request);
}
```

**Problem**: This only processes peak routes. Everything else passes through. But there's no explicit check that the worker is serving the peak template correctly for all valid slugs.

### 3. **Conflicting Redirects**
Location: `_redirects` lines 1-4

```
/peak /catalog 301
/peak/ /catalog 301
/peak/* /pages/nh48_peak.html 200
/fr/peak/* /pages/nh48_peak.html 200
```

**Problem**: With Cloudflare Workers enabled, these redirects may not be processed at all since the worker intercepts first. But if they ARE processed, they conflict with worker logic.

### 4. **Static Peak Pages Not Used**
Location: `peaks/*/index.html`

**Problem**: You have static HTML files in `peaks/mount-washington/index.html` etc., but the worker serves the dynamic template instead. These static files are orphaned.

## Recommended Fixes

### Priority 1: Enhanced Error Handling in Client

**File**: `pages/nh48_peak.html`

Add after line 1696 (in fetchPeaks function):

```javascript
async function fetchPeaks(){
  let lastError = null;
  for(let i=0; i<API_URLS.length; i++){
    const url = API_URLS[i];
    try{
      console.log(`Attempting to load peak data from: ${url}`);
      const res = await fetch(url, { mode:'cors' });
      if(!res.ok){
        console.warn(`Attempt ${i+1}: Status ${res.status} ${res.statusText}`);
        lastError = `HTTP ${res.status}`;
        continue;
      }
      const text = await res.text();
      console.log(`Received ${text.length} bytes from ${url}`);
      const cleaned = cleanJSON(text);
      let data;
      try{
        data = JSON.parse(cleaned);
        console.log(`Parsed data: ${Object.keys(data).length} peaks`);
      }catch(err){
        console.error(`JSON parse error: ${err.message}`);
        lastError = `Parse error: ${err.message}`;
        continue;
      }
      console.log(`✓ Successfully loaded peak data from ${url}`);
      trackEvent('peak_data_loaded', { source: url, peakCount: Object.keys(data).length });
      return data;
    }catch(err){
      console.error(`Fetch error for ${url}:`, err);
      lastError = err.message || String(err);
      trackEvent('peak_data_fetch_error', { source: url, error: lastError });
    }
  }
  // If all endpoints fail, show detailed error
  console.error('All API endpoints failed. Last error:', lastError);
  console.error('Attempted URLs:', API_URLS);
  throw new Error(`All API endpoints failed. Last error: ${lastError}`);
}
```

### Priority 2: Better Init Error Display

**File**: `pages/nh48_peak.html`

Improve the init function error handling (around line 3157):

```javascript
}catch(err){
  console.error('Error loading peak data:', err);
  trackEvent('peak_load_failed', { slug, message: err.message });
  
  // Show user-friendly error
  const peakTitleEl = document.getElementById('peakTitle');
  if(peakTitleEl){
    peakTitleEl.textContent = t('peak.errorLoading') || 'Error Loading Peak Data';
  }
  
  // Display error details
  const mediaEl = document.getElementById('media');
  if(mediaEl){
    mediaEl.innerHTML = `
      <div style="padding: 2rem; background: var(--card); border-radius: 8px; color: var(--ink);">
        <h2 style="color: #ef4444; margin-bottom: 1rem;">⚠️ Unable to Load Peak Data</h2>
        <p><strong>Slug:</strong> ${slug}</p>
        <p><strong>Error:</strong> ${err.message}</p>
        <p><strong>Attempted URLs:</strong></p>
        <ul>${API_URLS.map(url => `<li><code>${url}</code></li>`).join('')}</ul>
        <p style="margin-top: 1rem;">Please check the browser console for more details.</p>
      </div>
    `;
    mediaEl.hidden = false;
  }
}
```

### Priority 3: Remove Conflicting _redirects

**File**: `_redirects`

Since the Cloudflare Worker handles peak routes, remove these lines:

```
/peak /catalog 301
/peak/ /catalog 301
```

Keep only:
```
/peak/* /pages/nh48_peak.html 200
/fr/peak/* /pages/nh48_peak.html 200
```

But note: With Workers enabled, these may not be processed anyway.

### Priority 4: Worker Logging

**File**: `worker.js`

Add logging to understand what's happening (around line 1260):

```javascript
// Find the peak by slug in the loaded dataset
const peak = findPeak(peaks, slug);
if (!peak) {
  console.error(`Peak not found for slug: ${slug}`);
  console.error(`Available slugs: ${Object.keys(peaks).slice(0, 10).join(', ')}...`);
  return new Response('<!doctype html><title>404 Not Found</title><h1>Peak not found</h1><p>Slug: ' + slug + '</p>', { 
    status: 404, 
    headers: { 'Content-Type': 'text/html; charset=utf-8' } 
  });
}
console.log(`✓ Found peak: ${peak.peakName || peak.name}`);
```

### Priority 5: Test Locally

Add a test script to verify the JSON structure:

```javascript
// test-peak-data.js
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./data/nh48.json', 'utf8'));

console.log('Total peaks:', Object.keys(data).length);
console.log('First 5 slugs:', Object.keys(data).slice(0, 5));

const testSlug = 'mount-washington';
if (data[testSlug]) {
  console.log(`✓ ${testSlug} found`);
  console.log('  Peak name:', data[testSlug].peakName);
  console.log('  Photos:', data[testSlug].photos?.length || 0);
} else {
  console.log(`✗ ${testSlug} NOT found`);
}
```

## Testing Plan

1. **Test Data Accessibility**
   ```bash
   curl -I https://nh48.info/data/nh48.json
   ```
   Should return 200 OK

2. **Test Peak Route**
   ```bash
   curl -s https://nh48.info/peak/mount-washington/ | grep -i "mount washington"
   ```
   Should show the peak name

3. **Browser Console**
   - Open https://nh48.info/peak/mount-washington/
   - Open DevTools Console
   - Look for:
     - `Loaded peak data from...`
     - Any fetch errors
     - `Peak not found` or data loading errors

4. **Network Tab**
   - Check if `/data/nh48.json` request succeeds
   - Check response size (should be ~800KB)
   - Check if response is valid JSON

## Quick Debug Steps

1. Open https://nh48.info/peak/mount-washington/ in browser
2. Open DevTools Console
3. Type: `window.NH48_ROUTE_INFO`
   - Should show: `{ slug: 'mount-washington', isFrench: false }`
4. Type: `fetch('/data/nh48.json').then(r => r.json()).then(data => console.log(Object.keys(data).length))`
   - Should show: 48 (or number of peaks)
5. Type: `fetch('/data/nh48.json').then(r => r.json()).then(data => console.log(data['mount-washington']?.peakName))`
   - Should show: "Mount Washington"

If any of these fail, that's where the problem is.

## Next Steps

1. Apply Priority 1 fix (enhanced error handling)
2. Test in browser and check console
3. Report back what errors appear
4. Apply remaining fixes based on findings
