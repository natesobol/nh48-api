# Testing Guide

## SEO Audit Execution Matrix

### Local static/template audits
Run from repo root:

```bash
node scripts/audit-site-schema.js
node scripts/audit-i18n-completeness.js
node scripts/audit-dataset-overlay-coverage.js
node scripts/audit-unresolved-i18n-markers.js
node scripts/audit-image-loading-coverage.js
node scripts/audit-og-cards.js
node scripts/audit-peak-guide-authority.js
node scripts/audit-wiki-routes.js
node scripts/audit-wiki-media-sync.js
node scripts/audit-sameas.js
node scripts/audit-entity-links.js
node scripts/audit-image-crawl-visibility.js
node scripts/audit-crawl-entrypoints.js
node scripts/audit-peak-render-source.js
```

### Local build/regeneration checks
```bash
python scripts/build-peak-sameas.py
npm run sync:i18n-missing-keys
npm run build:dataset-overlay-scaffold
node scripts/build-peak-difficulty.js
node scripts/build-peak-experience-scaffold.js
node scripts/prerender-peaks.js
node scripts/generate-sitemaps.js
python scripts/generate-og-cards.py
npm run wiki:sync-media
npm run wiki:sync-media:check
```

### Production URL audits
```bash
node scripts/audit-homepage-worker-seo.js --url https://nh48.info
node scripts/audit-worker-breadcrumbs.js --url https://nh48.info
node scripts/audit-og-cards.js --url https://nh48.info --sample 30
node scripts/audit-crawl-entrypoints.js --url https://nh48.info
node scripts/audit-image-crawl-visibility.js --url https://nh48.info
node scripts/audit-image-loading-coverage.js --url https://nh48.info
node scripts/audit-peak-render-source.js --url https://nh48.info
```

## Peak Render Source Audit
Goal: ensure peak routes are SEO-first by default (prerendered HTML), while preserving explicit template override behavior for debugging.

### Local source contract check
```bash
node scripts/audit-peak-render-source.js
```
Validates `worker.js` contract:
- prerender is default source for `/peak/*`
- explicit `render=template|interactive` override support
- explicit `render=prerender` support
- `X-Peak-Source` headers for prerender/template modes
- template fallback image URL transform hardening hook

### Live runtime check
```bash
node scripts/audit-peak-render-source.js --url https://nh48.info
```
Validates:
- `/peak/mount-washington`, `/peak/mount-isolation`, `/fr/peak/mount-washington` return `200`
- `X-Peak-Source=prerendered` on default requests
- exactly one meaningful H1 in default HTML
- no unresolved template tokens like `\${...}` in default HTML
- transformed image URLs present (`/cdn-cgi/image/`) on default HTML
- no raw full-size `https://photos.nh48.info/<peak-slug>/...` URLs in default HTML
- explicit `?render=prerender` checks still pass:
  - `X-Peak-Source=prerendered`
  - one meaningful H1
  - transformed image URLs present (`/cdn-cgi/image/`)
  - no raw full-size `https://photos.nh48.info/<peak-slug>/...` URLs

Template override check included:
- `/peak/mount-washington?render=template` returns template source header and interactive panel/grid markers

## Image Crawl Visibility Audit
Goal: verify crawl-visible image URLs exist in raw HTML (without JS execution) for key image-heavy routes.

### Local source contract check
```bash
node scripts/audit-image-crawl-visibility.js
```
Validates `worker.js` wiring:
- crawler fallback HTML helper exists
- `/catalog` fallback injection exists
- `/photos` fallback injection exists
- peak route default remains prerender-first

### Live runtime check
```bash
node scripts/audit-image-crawl-visibility.js --url https://nh48.info
```
Validates:
- `/peak/mount-washington` returns prerendered source with crawl-visible transformed image URLs
- `/catalog` and `/photos` expose concrete `<img src>` URLs without requiring JS
- crawler fallback block (`.nh48-crawl-fallback`) is present on `/catalog` and `/photos`
- `/plant-catalog` still has at least one crawl-visible image reference

## Crawl Entrypoints Audit
Goal: verify crawler entry files are valid and discoverable.
Important: `sitemap.xml` is an XML sitemap index, not a plain-text link list.
Canonical host policy: `https://nh48.info` is canonical. `https://www.nh48.info/*` sitemap endpoints are expected to `301` redirect to apex.

### Local file check
```bash
node scripts/audit-crawl-entrypoints.js
```
Validates:
- `robots.txt` includes sitemap declarations
- `sitemap.xml` is a sitemap index referencing `page-sitemap.xml` + `image-sitemap.xml`
- `sitemap.xml`, `page-sitemap.xml`, and `image-sitemap.xml` all parse as XML with expected root nodes
- `image-sitemap.xml` contains the image namespace (`xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`)
- `page-sitemap.xml` includes `/peak/` and does not include legacy `/peaks/`

### Live endpoint check
```bash
node scripts/audit-crawl-entrypoints.js --url https://nh48.info
```
Validates HTTP `200` + expected content for:
- `/robots.txt`
- `/sitemap.xml`
- `/page-sitemap.xml`
- `/image-sitemap.xml`
- all sitemap endpoints return XML content-types (`application/xml` or `text/xml`)

Search Console submission target:
- Submit `https://nh48.info/sitemap.xml`
- Do not rely on `?fresh=1` as a separate submission URL.
- Prefer a **Domain property** for `nh48.info` so subdomain-hosted images (`photos.nh48.info`, `plants.nh48.info`, `wikiphotos.nh48.info`, `howker.nh48.info`) are tracked in one property.

Optional redirect verification:
```bash
curl -I https://www.nh48.info/sitemap.xml
```
Expected:
- `HTTP/1.1 301`
- `Location: https://nh48.info/sitemap.xml`

## Weekly Sitemap Regression Check
Run weekly (CI schedule or manual runbook), apex only:

```bash
node scripts/audit-crawl-entrypoints.js --url https://nh48.info
node scripts/audit-image-sitemap-quality.js --url https://nh48.info --sample 100
```

## Sitewide Image Loading UX
Goal: show a loading pinwheel for large images and keep non-hero large media lazy-loaded without changing image quality.

Runtime contract:
- large image threshold: `>= 248px` on either side (rendered or explicit size signal)
- non-hero large images default to `loading="lazy"` when missing
- hero images keep eager behavior
- global runtime injected by worker:
  - `/js/image-loading-core.js`
  - `/css/image-loading-core.css`

Opt-out attributes:
- `data-nh48-spinner="off"`: skip runtime pinwheel
- `data-nh48-lazy="off"`: skip lazy-loading override
- `data-nh48-hero="true"`: force hero/eager treatment

Audit commands:
```bash
node scripts/audit-image-loading-coverage.js
node scripts/audit-image-loading-coverage.js --url https://nh48.info
```

## CI Gate Order
Workflow: `.github/workflows/deploy-worker.yml`

Pre-deploy gates:
1. `audit-site-schema`
2. `audit-i18n-completeness`
3. `audit-image-sitemap-quality`
4. `audit-image-crawl-visibility`
5. `audit-crawl-entrypoints`
6. `audit-og-cards`
7. `audit-peak-render-source`
8. `audit-dataset-overlay-coverage`
9. `audit-unresolved-i18n-markers`
10. `audit-peak-guide-authority`
11. `audit-sameas`
12. `audit-entity-links`

Post-deploy gates with retry:
1. `audit-homepage-worker-seo` (production URL)
2. `audit-worker-breadcrumbs` (production URL)

## OG Social Preview Validation
1. Generate cards and manifest:
   - `python scripts/generate-og-cards.py`
2. Validate route coverage and image contracts:
   - `node scripts/audit-og-cards.js`
3. Validate live worker/meta output (optional):
   - `node scripts/audit-og-cards.js --url https://nh48.info --sample 30`
4. Refresh social crawler caches after changes:
   - Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
   - X Card Validator (or equivalent card fetch tooling)
5. Confirm representative routes show `/photos/og/*?v=<hash>` URLs in both:
   - `og:image`
   - `twitter:image`

Retry policy:
- 6 attempts
- 20 seconds delay

## Troubleshooting: Breadcrumb and JSON-LD Mismatch

### Symptom: breadcrumb audit fails in CI but passes locally
1. Check if production is still serving an older worker deployment.
2. Re-run production audits manually against `https://nh48.info`.
3. Compare worker route output (`/`, `/peak/{slug}`, `/fr/peak/{slug}`) for exactly one `BreadcrumbList`.

### Symptom: expected breadcrumb labels are reported as `[missing]`
1. Verify worker-injected JSON-LD is present in returned HTML.
2. Confirm prerendered peak HTML still contains a valid breadcrumb block when served static-first.
3. Confirm no template script strips the worker breadcrumb output.

### Symptom: `sameAs` audit failures
1. Run `python scripts/build-peak-sameas.py` to regenerate canonical links.
2. Re-run `node scripts/audit-sameas.js`.
3. Confirm each peak has either:
   - Wikipedia, or
   - Wikidata entity + OSM canonical URL.

### Symptom: entity link audit failures
1. Check `data/entity-links.json`, `data/person.json`, `data/organization.json`, `data/website.json`.
2. Ensure all four primary sister sites are present:
   - Instagram
   - Etsy
   - nh48pics.com
   - nh48.app

### Symptom: advisory/weather output looks stale
1. Check `data/current-conditions.json` timestamp and advisory expiry.
2. Verify worker can reach NWS endpoints (`api.weather.gov`).
3. Confirm fallback month exists in `data/monthly-weather.json`.

## Quick Validation Targets
- Homepage breadcrumb: `Home > NH48 API`
- Peak breadcrumb depth: 4 items (`Home > White Mountains > Range > Peak`)
- One breadcrumb list per audited route
- Peak pages include narrative module and authority links

## Localization QA
1. Locale key completeness:
   - `node scripts/audit-i18n-completeness.js`
2. Overlay file coverage:
   - `node scripts/audit-dataset-overlay-coverage.js`
3. Unresolved key marker check:
   - `node scripts/audit-unresolved-i18n-markers.js`
4. Rebuild locale overlay scaffolds after dataset edits:
   - `npm run build:dataset-overlay-scaffold`
5. Backfill missing locale keys after adding new EN keys:
   - `npm run sync:i18n-missing-keys`

## NH Bird Catalog Shell (UI/Routing Phase)
Current scope is intentionally UI/routing only:
- Live routes:
  - `/bird-catalog`
  - `/fr/bird-catalog`
  - `/bird/<slug>`
  - `/fr/bird/<slug>`
- Catalog and detail pages render stable placeholders when no dataset is connected.
- No production bird schema adapter is active yet.
- No bird photo bucket sync workflow is active yet.

Developer smoke test (optional local seed data):
1. Open browser console on `/bird-catalog`.
2. Seed test data:
   - `window.__NH_BIRD_DEV_DATA__ = [{ id: 'common-loon', common: 'Common Loon', latin: 'Gavia immer', type: 'Waterbird', habitat: 'Lakes and ponds', season: 'Spring through fall', imgs: ['https://photos.nh48.info/cdn-cgi/image/format=jpg,quality=85,width=1200/mount-madison/mount-madison__003.jpg'] }]; location.reload();`
3. Confirm card rendering, filters, and detail link behavior.
4. Open `/bird/common-loon?return=%2Fbird-catalog` and verify detail shell + back-link continuity.

Future hookup checklist (deferred):
1. Add bird schema adapter (map real JSON into catalog/detail normalized fields).
2. Add bird media host/domain wiring (planned domain pattern: `nhbirds.nh48.info`).
3. Add optional secrets namespace (example recommendation only):
   - `NHBIRDS_R2_ACCESS_KEY_ID`
   - `NHBIRDS_R2_SECRET_ACCESS_KEY`
   - `NHBIRDS_R2_BUCKET_NAME`
   - `NHBIRDS_R2_ACCOUNT_ID`
   - `NHBIRDS_R2_ENDPOINT`
4. Activate a dedicated bird media sync workflow only after bucket and ACL scope are verified.

## NH48 Map Fullscreen Route
Scope: fullscreen map shell under sticky nav, backed by `data/nh48.json`, with EN + FR routes.

Live routes:
- `/nh48-map`
- `/fr/nh48-map`

Manual validation checklist:
1. Route and layout
   - `/nh48-map` returns `200`
   - nav is visible
   - footer is not rendered on this route
   - map fills viewport below nav with no dead space
2. Data load
   - map loads 48 peak markers from `/data/nh48.json`
   - marker popup includes peak name, elevation, range, and link to `/peak/:slug` (or `/fr/peak/:slug` on FR route)
3. Panel interactions
   - search filters list by peak/range/route text
   - range filter updates list and marker emphasis
   - sort supports `Name (A-Z)` and `Elevation (high to low)`
   - list click and marker click stay synchronized with detail card selection
4. Fullscreen stability
   - desktop (`1366x768`, `1920x1080`): no clipping, no bottom gap
   - mobile (`390x844`, `430x932`): no horizontal overflow, panel collapse/expand works
   - orientation change and resize keep map tiles aligned (`invalidateSize` behavior)
5. Weather overlay controls
   - weather toggle button is visible on initial load
   - weather panel is hidden by default
   - all weather overlays are off by default
   - weather drawer can be opened/closed via button and `Escape`
6. Weather overlay rendering
   - single scalar overlay renders colored glyph markers + legend values with units
   - multiple scalar overlays can be enabled simultaneously and remain visually distinct
   - selecting another peak updates anchored legend values
   - radar overlay renders with topo still visible underneath
   - alerts overlay renders polygons and opens popup details
7. Weather failure handling
   - overlay request failure only marks that overlay as errored
   - stale status is shown when cached weather data is reused
   - base map, peak markers, and existing controls remain functional after overlay failures
8. Discovery
   - `scripts/generate-sitemaps.js` includes `/nh48-map` and `/fr/nh48-map`
   - `scripts/generate-og-cards.py` recognizes `/nh48-map` route family and outputs OG card manifest coverage

## CI Workflow Ownership Map
- `deploy-worker.yml`: Worker deploy + all SEO/peak audit gates + production parity retry.
- `prerender.yml`: Canonical prerender/sitemap/OG generator and committer for generated files.
- `pages.yml`: Packages/deploys Pages artifact; only fallback-renders when generated outputs are missing.
- `sync-r2-wmnf-tiles.yml`: Manual WMNF stylized tile upload into photos bucket prefix `tiles/wmnf-stylized/v1`.
- `sync-r2-map-data.yml`: Syncs Howker map data files to R2 map bucket.
- `sync-r2-photos-wrangler.yml`: Canonical photo sync + metadata manifest + prerender refresh.
- `sync-r2-photos.yml`: Manual emergency fallback only (deprecated).
- `sync-r2-wiki-media.yml`: Canonical wiki media sync + upload for `whitemountains-wiki/**`.
- `autogen-longtrail-geometries.yml`: Generates and commits long-trail geometry derivatives.

## Wiki Media Sync Flow
1. After editing `data/wiki/plants.json`, `data/wiki/animals.json`, or `data/wiki/plant-disease.json`, run:
   - `npm run wiki:sync-media`
2. Validate parity before commit:
   - `npm run wiki:sync-media:check`
   - `npm run audit:wiki-media-sync`
3. On push to `main`, `.github/workflows/sync-r2-wiki-media.yml` uploads `whitemountains-wiki/**` to R2.

Required secrets for `sync-r2-wiki-media.yml`:
- `WIKI_R2_ACCESS_KEY_ID`
- `WIKI_R2_SECRET_ACCESS_KEY`
- `WIKI_R2_ACCOUNT_ID`
- `WIKI_R2_BUCKET_NAME`
- `WIKI_R2_ENDPOINT` (optional)

## R2 Secret Hookup Playbook
This section defines the current production contract for R2 secrets and the exact setup flow.

### Source-of-Truth Secret Ownership
- `WIKI_R2_*` secrets own S3 API login credentials for:
  - `.github/workflows/sync-r2-wiki-media.yml`
  - `.github/workflows/sync-r2-photos-wrangler.yml` (forced)
  - `.github/workflows/sync-r2-photos.yml` (deprecated fallback, forced)
- `R2_*` routing secrets own target routing for photos workflows:
  - target bucket (`R2_BUCKET_NAME` or `R2_BUCKET`)
  - account id (`R2_ACCOUNT_ID`, fallback `WIKI_R2_ACCOUNT_ID`)
  - endpoint (`R2_ENDPOINT`, validated against account id)
- `R2_*` credential secrets are still used by map/data workflows and are intentionally separate from photos auth.

### Workflow-by-Workflow Secret Contract
- `sync-r2-photos-wrangler.yml`:
  - Auth: `WIKI_R2_ACCESS_KEY_ID`, `WIKI_R2_SECRET_ACCESS_KEY`
  - Routing: `R2_BUCKET_NAME`/`R2_BUCKET`, `R2_ACCOUNT_ID` (fallback `WIKI_R2_ACCOUNT_ID`), `R2_ENDPOINT`
- `sync-r2-photos.yml` (manual/deprecated):
  - Auth: `WIKI_R2_ACCESS_KEY_ID`, `WIKI_R2_SECRET_ACCESS_KEY`
  - Routing: `R2_BUCKET_NAME`/`R2_BUCKET`, `R2_ACCOUNT_ID` (fallback `WIKI_R2_ACCOUNT_ID`), `R2_ENDPOINT`
- `sync-r2-wiki-media.yml`:
  - Auth + routing: fully `WIKI_R2_*`
- `sync-r2-map-data.yml`:
  - Auth: prefers `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`, fallback to `WIKI_R2_*`
  - Routing: `R2_ENDPOINT`, `R2_BUCKET`
- `sync-r2-wmnf-tiles.yml`:
  - Auth: `WIKI_R2_ACCESS_KEY_ID`, `WIKI_R2_SECRET_ACCESS_KEY`
  - Routing: `R2_BUCKET_NAME`/`R2_BUCKET`, `R2_ACCOUNT_ID` (fallback `WIKI_R2_ACCOUNT_ID`), `R2_ENDPOINT`

### Required GitHub Secret Values (Photos)
For `.photos` uploads (`sync-r2-photos-wrangler.yml`):
- `WIKI_R2_ACCESS_KEY_ID`: active Cloudflare R2 API access key id
- `WIKI_R2_SECRET_ACCESS_KEY`: matching secret key from the same token/keypair
- `R2_BUCKET_NAME` or `R2_BUCKET`: photos bucket name (example: `nh48-photos`)
- `R2_ACCOUNT_ID`: account owning the photos bucket
- `R2_ENDPOINT` (optional): `https://<account_id>.r2.cloudflarestorage.com`

Rules:
- Never set `R2_ENDPOINT` to custom domain (`https://photos.nh48.info`).
- Never set `R2_BUCKET_NAME`/`R2_BUCKET` to `WIKI_R2_BUCKET_NAME`.
- Keep `R2_ACCOUNT_ID` aligned to the same account as `R2_ENDPOINT`.
- Keep `WIKI_R2_ACCESS_KEY_ID` and `WIKI_R2_SECRET_ACCESS_KEY` as a matched pair from one token rotation.

### Step-by-Step Secret Hookup (GitHub UI)
1. Open repository: `Settings` -> `Secrets and variables` -> `Actions`.
2. Edit `WIKI_R2_ACCESS_KEY_ID` and paste the new access key id.
3. Edit `WIKI_R2_SECRET_ACCESS_KEY` and paste the matching secret key.
4. Verify `R2_BUCKET_NAME` (or `R2_BUCKET`) is the photos bucket (`nh48-photos`).
5. Verify `R2_ACCOUNT_ID` is the account id for that photos bucket.
6. Set `R2_ENDPOINT` to blank, or set it to `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`.
7. Confirm `WIKI_R2_BUCKET_NAME` is not equal to `R2_BUCKET_NAME`/`R2_BUCKET`.
8. Save all changes, then run `sync-r2-photos-wrangler.yml` with `workflow_dispatch`.

### Step-by-Step Key Rotation (Cloudflare -> GitHub)
1. In Cloudflare R2, create/regenerate S3 API credentials with required bucket permissions.
2. Copy both values immediately:
   - Access Key ID
   - Secret Access Key
3. Update GitHub secrets in one session:
   - `WIKI_R2_ACCESS_KEY_ID`
   - `WIKI_R2_SECRET_ACCESS_KEY`
4. Re-run `sync-r2-photos-wrangler.yml`.
5. Confirm logs include:
   - `Using credential source: WIKI_R2_* (forced for photos S3 auth)`
6. If still failing, validate `R2_ACCOUNT_ID` + `R2_ENDPOINT` alignment.

### Validation and Smoke-Test Sequence
1. Run `sync-r2-photos-wrangler.yml` manually.
2. Confirm `Sync photos to R2 (S3 API)` step passes `list-objects-v2`.
3. Confirm re-sync step with metadata also passes.
4. Run `sync-r2-map-data.yml` manually and confirm expected behavior (separate contract).
5. Run deploy flow and verify production SEO parity audits pass.

### Error Signature -> Root Cause Mapping
- `Using credential source: R2_*` in photos workflow:
  - Workflow version is outdated or branch did not include forced wiki-auth change.
- `Missing required wiki auth secrets: WIKI_R2_ACCESS_KEY_ID and WIKI_R2_SECRET_ACCESS_KEY`:
  - Missing/empty wiki credential secrets.
- `SignatureDoesNotMatch` during `ListObjectsV2`/`PutObject`:
  - Invalid keypair or endpoint/account mismatch.
- `Photo sync resolved to WIKI_R2_BUCKET_NAME`:
  - `R2_BUCKET_NAME`/`R2_BUCKET` incorrectly points to wiki bucket.
- `Missing account id. Set R2_ACCOUNT_ID (or WIKI_R2_ACCOUNT_ID fallback)`:
  - Neither account secret is set.
- `Ignoring invalid R2_ENDPOINT ... using account endpoint fallback.`:
  - `R2_ENDPOINT` is malformed or custom domain.
- `Ignoring R2_ENDPOINT account mismatch ... using account endpoint fallback.`:
  - Endpoint account segment does not match configured account id.

## Photos R2 Sync Required Secrets
Required for `.github/workflows/sync-r2-photos-wrangler.yml`:
- `WIKI_R2_ACCESS_KEY_ID`
- `WIKI_R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME` (or `R2_BUCKET` fallback)
- `R2_ACCOUNT_ID` (or `WIKI_R2_ACCOUNT_ID` fallback)

Optional:
- `R2_ENDPOINT` (must be an S3 API endpoint on `*.r2.cloudflarestorage.com`)

Warning:
- Do not set `R2_ENDPOINT` to `https://photos.nh48.info` (custom domain). Use blank or `https://<account_id>.r2.cloudflarestorage.com`.
- Photos workflows use `R2_*` routing secrets (`R2_BUCKET_NAME`/`R2_BUCKET`, `R2_ACCOUNT_ID`, `R2_ENDPOINT`) and force `WIKI_R2_*` for S3 auth credentials.
- Photo workflows fail fast if `R2_BUCKET_NAME`/`R2_BUCKET` resolves to `WIKI_R2_BUCKET_NAME`.
- If `R2_ENDPOINT` is set, its account segment must match `R2_ACCOUNT_ID`/`WIKI_R2_ACCOUNT_ID`; otherwise the workflow falls back to `https://<account_id>.r2.cloudflarestorage.com`.

## Map Data R2 Sync Required Secrets
Required for `.github/workflows/sync-r2-map-data.yml`:
- `R2_ACCESS_KEY_ID` (fallback: `WIKI_R2_ACCESS_KEY_ID`)
- `R2_SECRET_ACCESS_KEY` (fallback: `WIKI_R2_SECRET_ACCESS_KEY`)
- `R2_ENDPOINT`
- `R2_BUCKET`

Notes:
- Map workflow keeps endpoint and bucket routing on `R2_*` secrets only.
- Workflow fails fast when any required value is empty.
- `sync-r2-data.yml` is deprecated and removed. `nh48.json` is sourced directly from repo/raw via worker static proxy.

## Expected Run Matrix
1. `worker.js` or worker SEO script changes on `main`:
   - Runs: `deploy-worker.yml`
   - Expected: deploy may run; production parity audits always run.
2. `photos/**` changes on `main`:
   - Runs: `sync-r2-photos-wrangler.yml`
   - Expected: photo upload, manifest rebuild, prerender commit.
3. `data/nh48.json` changes on `main`:
   - Runs: `prerender.yml`, `pages.yml`, and `deploy-worker.yml` checks (push).
4. Generated-only file commits (`peaks/**`, `fr/peaks/**`, `long-trails/**`, sitemap files):
   - Runs: `pages.yml` deploy path.
   - Does not rerun: `prerender.yml` push path (protected via path exclusions in `push.paths`).
5. Docs-only changes:
   - Usually runs none except workflows whose path filters include docs (notably `deploy-worker.yml` if SEO docs touched).

## Troubleshooting Skipped Checks
1. `deploy-worker.yml` shows deploy skipped:
   - Expected when no `worker.js`/`wrangler.toml` changes and not manual dispatch.
   - Audits can still run and fail/pass independently.
2. `pages.yml` did not rerender pages:
   - Expected if required generated outputs already exist.
   - Fallback render runs only when artifacts are missing.
3. `prerender.yml` not triggered after generated-file commit:
   - Expected by design (`paths-ignore` avoids self-loop).
4. One photo sync workflow appears skipped:
   - `sync-r2-photos.yml` is manual fallback only; automatic photo runs are owned by `sync-r2-photos-wrangler.yml`.
