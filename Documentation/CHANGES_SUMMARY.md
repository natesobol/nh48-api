# Changes Summary

## 2026-02-14 - SEO Expansion and Sister-Site Alignment

### Implemented
- Added `https://www.nh48.app/` as a first-class sister site across:
  - `data/entity-links.json`
  - `data/person.json`
  - `data/organization.json`
  - `data/website.json`
  - worker fallback schema surfaces
- Added `scripts/audit-entity-links.js` and wired it into CI gates.
- Strengthened per-peak authority references:
  - canonicalized Wikidata to `/entity/Q...`
  - regenerated `data/peak-sameas.json`
  - hardened `scripts/audit-sameas.js` to require Wikipedia or Wikidata+OSM.
- Added/updated supporting SEO data contracts:
  - `data/parking-data.json`
  - `data/monthly-weather.json`
  - `data/peak-difficulty.json`
  - `data/peak-difficulty-overrides.json`
  - `data/current-conditions.json`
- Added `scripts/build-peak-difficulty.js`.
- Improved experience scaffold generation to avoid `[object Object]` planning tips.
- Extended prerender and worker SEO pipelines with parking/weather/difficulty/risk context.
- Added worker advisory banner logic (conditions + risk/weather context) for peak and key hub routes.
- Updated deploy workflow gating and trigger scope for SEO/entity/audit/doc changes.

### Documentation
- Added canonical runbook: `Documentation/SEO_SYSTEM_RUNBOOK.md`.
- Rewrote:
  - `Documentation/README.md`
  - `Documentation/TESTING_GUIDE.md`
  - `Documentation/CHANGES_SUMMARY.md`
- Removed mojibake from touched docs and normalized content to clean UTF-8 text.

### Notes
- Video sitemap remains intentionally deferred.
- FR narrative parity remains follow-up scope.
- Trail section breadcrumb expansion remains out of scope by design.
