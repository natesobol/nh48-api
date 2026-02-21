# NH48 Documentation Index

This folder contains operational and architecture documentation for `nh48.info`.

## SEO System Overview (As of 2026-02-14)
The site is worker-driven for runtime metadata, with static prerendered peak guides for crawlability and resilience.

Primary references:
- SEO runbook: `Documentation/SEO_SYSTEM_RUNBOOK.md`
- Testing matrix: `Documentation/TESTING_GUIDE.md`
- Change log summary: `Documentation/CHANGES_SUMMARY.md`

## Primary Sister Sites
- `https://www.instagram.com/nate_dumps_pics/`
- `https://www.etsy.com/shop/NH48pics`
- `https://www.nh48pics.com/`
- `https://www.nh48.app/`

## SEO Script Inventory
| Script | Command | What it validates/builds |
| --- | --- | --- |
| `scripts/audit-site-schema.js` | `node scripts/audit-site-schema.js` | Template schema and breadcrumb drift checks |
| `scripts/audit-homepage-worker-seo.js` | `node scripts/audit-homepage-worker-seo.js --url https://nh48.info` | Worker homepage metadata integrity |
| `scripts/audit-worker-breadcrumbs.js` | `node scripts/audit-worker-breadcrumbs.js --url https://nh48.info` | Worker breadcrumb depth/labels on core routes |
| `scripts/audit-peak-guide-authority.js` | `node scripts/audit-peak-guide-authority.js` | Peak narrative and authority schema checks |
| `scripts/audit-wiki-routes.js` | `node scripts/audit-wiki-routes.js` | Wiki route/template/schema checks |
| `scripts/sync-wiki-media.js` | `node scripts/sync-wiki-media.js --write` | Synchronizes wiki `photos[]` metadata from `whitemountains-wiki/**` folders |
| `scripts/audit-wiki-media-sync.js` | `node scripts/audit-wiki-media-sync.js` | Enforces wiki JSON/folder/media URL parity |
| `scripts/audit-sameas.js` | `node scripts/audit-sameas.js` | Per-peak strong authority links |
| `scripts/audit-entity-links.js` | `node scripts/audit-entity-links.js` | Sister-site presence in identity `sameAs` |
| `scripts/build-peak-sameas.py` | `python scripts/build-peak-sameas.py` | Regenerates canonical per-peak authority links |
| `scripts/build-peak-difficulty.js` | `node scripts/build-peak-difficulty.js` | Generates numeric technical/physical difficulty |
| `scripts/build-peak-experience-scaffold.js` | `node scripts/build-peak-experience-scaffold.js` | Regenerates narrative scaffolding |
| `scripts/prerender-peaks.js` | `node scripts/prerender-peaks.js` | Builds static peak guides |
| `scripts/generate-sitemaps.js` | `node scripts/generate-sitemaps.js` | Rebuilds XML sitemap outputs |

## Operational Notes
- Worker deploy/audit gate: `.github/workflows/deploy-worker.yml`
- Canonical peak route: `/peak/{slug}`
- Redirected legacy route: `/peaks/{slug}` -> `/peak/{slug}`
- Peak authority policy: Wikipedia preferred; Wikidata + OSM required fallback
- R2 secret wiring and hookup instructions: `Documentation/TESTING_GUIDE.md` -> `R2 Secret Hookup Playbook`

## CI/CD Workflow Map
- `deploy-worker.yml`: worker deploy and production SEO parity gate.
- `prerender.yml`: canonical prerender/sitemap generation and commit.
- `pages.yml`: Pages artifact packaging/deploy; fallback generation only when prerender outputs are missing.
- `sync-r2-photos-wrangler.yml`: canonical photo sync + manifest + prerender refresh.
- `sync-r2-photos.yml`: manual-only deprecated fallback.
- `sync-r2-wiki-media.yml`: canonical wiki media sync from `whitemountains-wiki/**` to the wiki R2 bucket.
- `sync-r2-wmnf-tiles.yml`: manual WMNF stylized tile sync into photos bucket prefix `tiles/wmnf-stylized/v1`.
- `sync-r2-map-data.yml`: R2 sync for map datasets.
- `autogen-longtrail-geometries.yml`: long-trail geometry generation and commit automation.
