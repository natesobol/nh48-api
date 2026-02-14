# Testing Guide

## SEO Audit Execution Matrix

### Local static/template audits
Run from repo root:

```bash
node scripts/audit-site-schema.js
node scripts/audit-peak-guide-authority.js
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
