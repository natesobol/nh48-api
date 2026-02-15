# Testing Guide

## SEO Audit Execution Matrix

### Local static/template audits
Run from repo root:

```bash
node scripts/audit-site-schema.js
node scripts/audit-i18n-completeness.js
node scripts/audit-dataset-overlay-coverage.js
node scripts/audit-unresolved-i18n-markers.js
node scripts/audit-peak-guide-authority.js
node scripts/audit-wiki-routes.js
node scripts/audit-wiki-media-sync.js
node scripts/audit-sameas.js
node scripts/audit-entity-links.js
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
npm run wiki:sync-media
npm run wiki:sync-media:check
```

### Production URL audits
```bash
node scripts/audit-homepage-worker-seo.js --url https://nh48.info
node scripts/audit-worker-breadcrumbs.js --url https://nh48.info
```

## CI Gate Order
Workflow: `.github/workflows/deploy-worker.yml`

Pre-deploy gates:
1. `audit-site-schema`
2. `audit-i18n-completeness`
3. `audit-dataset-overlay-coverage`
4. `audit-unresolved-i18n-markers`
5. `audit-peak-guide-authority`
6. `audit-sameas`
7. `audit-entity-links`

Post-deploy gates with retry:
1. `audit-homepage-worker-seo` (production URL)
2. `audit-worker-breadcrumbs` (production URL)

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

## CI Workflow Ownership Map
- `deploy-worker.yml`: Worker deploy + all SEO/peak audit gates + production parity retry.
- `prerender.yml`: Canonical prerender/sitemap generator and committer for generated files.
- `pages.yml`: Packages/deploys Pages artifact; only fallback-renders when generated outputs are missing.
- `sync-r2-data.yml`: Syncs canonical `data/nh48.json` to R2 data bucket.
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

## Photos R2 Sync Required Secrets
Required for `.github/workflows/sync-r2-photos-wrangler.yml`:
- `R2_ACCESS_KEY_ID` (fallback: `WIKI_R2_ACCESS_KEY_ID`)
- `R2_SECRET_ACCESS_KEY` (fallback: `WIKI_R2_SECRET_ACCESS_KEY`)
- `R2_BUCKET_NAME` (or `R2_BUCKET` fallback)
- `R2_ACCOUNT_ID` (or `CLOUDFLARE_ACCOUNT_ID` fallback)

Optional:
- `R2_ENDPOINT` (must be an S3 API endpoint on `*.r2.cloudflarestorage.com`)

Warning:
- Do not set `R2_ENDPOINT` to `https://photos.nh48.info` (custom domain). Use blank or `https://<account_id>.r2.cloudflarestorage.com`.
- Photos workflows use `R2_*` routing secrets (`R2_BUCKET_NAME`/`R2_BUCKET`, `R2_ACCOUNT_ID`/`CLOUDFLARE_ACCOUNT_ID`, `R2_ENDPOINT`) and only fall back to `WIKI_R2_*` for credentials if `R2_*` credentials are missing.
- Credential fallback is applied as a matched pair (`*_ACCESS_KEY_ID` + `*_SECRET_ACCESS_KEY`) from one source only; workflows do not mix R2 key-id with wiki secret-key (or vice versa).
- Photo workflows fail fast if `R2_BUCKET_NAME`/`R2_BUCKET` resolves to `WIKI_R2_BUCKET_NAME`.
- If `R2_ENDPOINT` is set, its account segment must match `R2_ACCOUNT_ID`/`CLOUDFLARE_ACCOUNT_ID`; otherwise the workflow falls back to `https://<account_id>.r2.cloudflarestorage.com`.

## Map Data R2 Sync Required Secrets
Required for `.github/workflows/sync-r2-map-data.yml`:
- `R2_ACCESS_KEY_ID` (fallback: `WIKI_R2_ACCESS_KEY_ID`)
- `R2_SECRET_ACCESS_KEY` (fallback: `WIKI_R2_SECRET_ACCESS_KEY`)
- `R2_ENDPOINT`
- `R2_BUCKET`

Notes:
- Map workflow keeps endpoint and bucket routing on `R2_*` secrets only.
- Workflow fails fast when any required value is empty.
- `sync-r2-data.yml` remains unchanged and continues to use `R2_DATA_*` with fallback to `R2_*`.

## Expected Run Matrix
1. `worker.js` or worker SEO script changes on `main`:
   - Runs: `deploy-worker.yml`
   - Expected: deploy may run; production parity audits always run.
2. `photos/**` changes on `main`:
   - Runs: `sync-r2-photos-wrangler.yml`
   - Expected: photo upload, manifest rebuild, prerender commit.
3. `data/nh48.json` changes on `main`:
   - Runs: `sync-r2-data.yml`, `prerender.yml`, `pages.yml` (push).
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
