# Testing Guide

## SEO Audit Execution Matrix

### Local static/template audits
Run from repo root:

```bash
node scripts/audit-site-schema.js
node scripts/audit-peak-guide-authority.js
node scripts/audit-wiki-routes.js
node scripts/audit-wiki-media-sync.js
node scripts/audit-sameas.js
node scripts/audit-entity-links.js
```

### Local build/regeneration checks
```bash
python scripts/build-peak-sameas.py
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
2. `audit-peak-guide-authority`
3. `audit-sameas`
4. `audit-entity-links`

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
