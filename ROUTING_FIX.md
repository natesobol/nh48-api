# Peak Page Routing Fix

## Issue Identified
The page was stuck on "Loading..." when accessing `/guest/mount-washington` because:
1. The Cloudflare Worker only handled `/peak/` routes
2. The client-side `getRouteInfo()` function only parsed `/peak/{slug}` pattern
3. URLs like `/guest/{slug}` bypassed the worker, serving static HTML without server-side rendering

## Changes Made

### 1. Enhanced Route Detection in Client (`pages/nh48_peak.html`)
**Old behavior:** Only extracted slug from position 1 (`/peak/{slug}`)

**New behavior:** Flexible route detection supporting:
- `/peak/{slug}`
- `/guest/{slug}` (legacy)
- `/peaks/{slug}` (alternative)
- `/fr/peak/{slug}` (French)
- `/fr/guest/{slug}` (French legacy)

### 2. Updated Worker Route Handling (`worker.js`)
**Old behavior:** Only processed routes matching `/peak/` exactly

**New behavior:** 
- Handles `/peak/`, `/peaks/`, and `/guest/` routes
- Automatically detects slug position based on route keyword
- Logs route processing for debugging: `[Worker] Processing peak route: ...`

### 3. Added Redirects (`_redirects`)
Created permanent redirects for consistency:
- `/guest/*` → `/peak/:splat` (301)
- `/peaks/*` → `/peak/:splat` (301)
- French equivalents

### 4. Removed Legacy `peak.html`
The old `peak.html` redirect page was removed so peak navigation flows through the canonical `/peak/{slug}` routes handled by the worker and redirects.

## URLs Now Supported

All these URLs will work for Mount Washington:
- ✅ `https://nh48.info/peak/mount-washington`
- ✅ `https://nh48.info/guest/mount-washington` (redirects to /peak/)
- ✅ `https://nh48.info/peaks/mount-washington` (redirects to /peak/)
- ✅ `https://nh48.info/fr/peak/mount-washington`
- ✅ `https://nh48.info/fr/guest/mount-washington` (redirects to /fr/peak/)

## Testing

After deployment:

1. **Test Direct Access:**
   ```bash
   curl -I "https://nh48.info/peak/mount-washington/"
   ```
   Should return 200 OK

2. **Test Legacy URL:**
   ```bash
   curl -I "https://nh48.info/guest/mount-washington/"
   ```
   Should return 301 redirect to `/peak/mount-washington`

3. **Browser Test:**
   - Visit: https://nh48.info/guest/mount-washington/
   - Should redirect to: https://nh48.info/peak/mount-washington/
   - Page should load with full content (not stuck on "Loading...")

4. **Check Console:**
   - Should see: `[Route Detection]` log showing slug extraction
   - Should see: `[Peak Init]` and `[Peak Data]` logs
   - Should NOT be stuck on "Loading..."

## What Fixed the "Loading..." Issue

The page was stuck because:
1. **Before:** `/guest/` URL bypassed worker → served static HTML → client couldn't find slug → init() failed silently
2. **After:** `/guest/` URL redirects to `/peak/` → worker serves properly → client extracts slug → init() succeeds

## Deploy Commands

```bash
# Commit changes
git add .
git commit -m "Fix routing for peak pages - support /guest/ and /peaks/ URLs"
git push

# Deploy worker (includes new route handling)
wrangler deploy

# Wait 2-3 minutes for Cloudflare Pages to rebuild
```

## Monitoring

After deployment, check:
- [ ] Worker logs in Cloudflare dashboard
- [ ] Browser console for `[Route Detection]` logs
- [ ] Test multiple peaks: mount-washington, mount-adams, cannon-mountain
- [ ] Test legacy `/guest/` URLs redirect properly
- [ ] Verify no more "Loading..." stuck pages
