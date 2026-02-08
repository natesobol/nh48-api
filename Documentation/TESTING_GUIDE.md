# Peak Details Page Testing & Debugging Guide

## Quick Test Checklist

### 1. Test Data Endpoint
```bash
curl -I https://nh48.info/data/nh48.json
```
**Expected:** HTTP 200, Content-Type: application/json

### 2. Test Peak Route (Server-Side)
```bash
curl -s "https://nh48.info/peak/mount-washington/" | grep -i "mount washington" | head -3
```
**Expected:** Should see "Mount Washington" in meta tags and title

### 3. Browser Console Test
Open: https://nh48.info/peak/mount-washington/

In Browser DevTools Console, run:
```javascript
// Check route info
console.log('Route Info:', window.NH48_ROUTE_INFO);

// Test data fetch directly
fetch('/data/nh48.json')
  .then(r => r.json())
  .then(data => {
    console.log('✓ Data loaded, peaks:', Object.keys(data).length);
    console.log('✓ Mount Washington:', data['mount-washington'] ? 'Found' : 'NOT FOUND');
    console.log('  Peak name:', data['mount-washington']?.peakName);
    console.log('  Photos:', data['mount-washington']?.photos?.length);
  })
  .catch(err => console.error('✗ Data fetch failed:', err));
```

### 4. Network Tab Analysis
1. Open DevTools → Network tab
2. Load https://nh48.info/peak/mount-washington/
3. Look for these requests:
   - `nh48.json` - Should be 200, ~800KB
   - `nh48_peak.html` or the page itself
4. Check Response Preview for nh48.json:
   - Should be valid JSON
   - Should have `mount-washington` key

### 5. Console Log Analysis
With the enhanced logging, you should see:
```
[Peak Init] Starting initialization for slug: mount-washington
[Peak Data] Attempting to load from: https://cdn.jsdelivr.net/gh/...
[Peak Data] Received XXXXX bytes from ...
[Peak Data] Parsed data: 48 peaks found
✓ [Peak Data] Successfully loaded peak data from ...
[Peak Init] Data loaded, looking up peak: mount-washington
[Peak Init] ✓ Found peak: Mount Washington
[Peak Init] Photos loaded: X
[Peak Init] ✓ Initialization complete
```

## Common Issues & Solutions

### Issue 1: "All API endpoints failed"
**Symptoms:** Error message in console, placeholder image shown

**Debug Steps:**
1. Check Network tab for failed requests
2. Look at console for specific fetch errors
3. Try each URL manually in browser:
   - https://cdn.jsdelivr.net/gh/natesobol/nh48-api@main/data/nh48.json
   - https://raw.githubusercontent.com/natesobol/nh48-api/main/data/nh48.json
   - https://nh48.info/data/nh48.json

**Solutions:**
- If CDN URLs fail: May be rate limited or blocked, local fallback should work
- If local URL fails: Check Cloudflare Worker isn't intercepting
- If CORS error: Check Access-Control-Allow-Origin headers

### Issue 2: "Peak not found"
**Symptoms:** Slug is loaded but peak data lookup fails

**Debug Steps:**
1. Check console: `[Peak Init] Available slugs:` line
2. Verify slug format in URL matches data keys
3. Test in console:
   ```javascript
   fetch('/data/nh48.json')
     .then(r => r.json())
     .then(data => console.log('Slugs:', Object.keys(data)));
   ```

**Solutions:**
- Verify slug matches exactly (case-sensitive, hyphens vs underscores)
- Check if data file has the peak entry
- Look for typos in URL

### Issue 3: No slug in URL
**Symptoms:** Error about missing peak identifier

**Debug Steps:**
1. Check URL format: `/peak/{slug}` or `/fr/peak/{slug}`
2. Test `window.NH48_ROUTE_INFO` in console
3. Verify URL params aren't being stripped

**Solutions:**
- Ensure URL has slug: `/peak/mount-washington/`
- Check worker routing rules in wrangler.toml
- Verify _redirects file isn't interfering

### Issue 4: Worker serving wrong content
**Symptoms:** Gets static file instead of dynamic template

**Debug Steps:**
1. Check Response Headers for X-Worker or similar
2. Verify wrangler.toml routes are active
3. Test with curl to see raw response

**Solutions:**
- Deploy worker with: `wrangler deploy`
- Check Cloudflare dashboard for worker status
- Verify routes are configured correctly

## Enhanced Debugging Commands

### Get Full Peak Data for Testing
```bash
curl -s "https://nh48.info/data/nh48.json" | jq '.["mount-washington"] | {peakName, slug, photos: (.photos | length)}'
```

### Check Worker Response Headers
```bash
curl -I "https://nh48.info/peak/mount-washington/"
```
Look for:
- Cache-Control
- Content-Type
- Custom headers added by worker

### Test Multiple Peaks
```bash
for peak in mount-washington mount-adams mount-jefferson cannon-mountain; do
  echo "Testing: $peak"
  curl -s "https://nh48.info/peak/$peak/" | grep -q "$peak" && echo "  ✓ Found" || echo "  ✗ Missing"
done
```

### Download and Inspect JSON Locally
```bash
curl -s "https://nh48.info/data/nh48.json" > /tmp/nh48.json
cat /tmp/nh48.json | jq 'keys | length'  # Count peaks
cat /tmp/nh48.json | jq 'keys | .[0:10]'  # First 10 slugs
cat /tmp/nh48.json | jq '.["mount-washington"].peakName'  # Test lookup
```

## Performance Testing

### Check Page Load Time
```bash
curl -w "@-" -o /dev/null -s "https://nh48.info/peak/mount-washington/" <<< "
time_namelookup:  %{time_namelookup}s
time_connect:     %{time_connect}s
time_appconnect:  %{time_appconnect}s
time_pretransfer: %{time_pretransfer}s
time_starttransfer: %{time_starttransfer}s
time_total:       %{time_total}s
"
```

### Check Data File Size
```bash
curl -sI "https://nh48.info/data/nh48.json" | grep -i content-length
```

## Deployment Checklist

After making changes:

1. ✅ Test locally if possible
2. ✅ Commit changes to git
3. ✅ Deploy worker: `wrangler deploy`
4. ✅ Clear Cloudflare cache if needed
5. ✅ Test live site in browser
6. ✅ Check console for errors
7. ✅ Verify analytics events firing
8. ✅ Test on mobile device

## Emergency Rollback

If pages break after deployment:

```bash
# Restore previous version
git log --oneline  # Find last good commit
git revert HEAD    # Or git reset --hard <commit>
git push

# Redeploy worker
wrangler deploy

# Or disable worker temporarily in Cloudflare dashboard
```

## Contact & Support

If issues persist:
1. Check browser console logs
2. Check Cloudflare Worker logs
3. Review recent commits
4. Test with different peaks/slugs
5. Verify JSON file integrity
