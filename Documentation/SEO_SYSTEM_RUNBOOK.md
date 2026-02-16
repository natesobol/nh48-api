# SEO System Runbook

Last updated: 2026-02-16

## Current Production State
- Rendering stack: Cloudflare Worker (`worker.js`) + static templates + prerender scripts.
- Canonical peak guides: `/peak/{slug}` (with `/peaks/{slug}` redirected to canonical).
- Worker remains runtime metadata authority for core pages and fallback peak rendering.
- Prerendered peak HTML is served first when available, with worker fallback for missing prerender output.
- CI deploy workflow runs SEO gates before deploy and production audits with retry after deploy.
- OG social cards are generated at build-time by `scripts/generate-og-cards.py` and published in-repo under `photos/og/**`.
- Worker route metadata now resolves `og:image` and `twitter:image` from `data/og-cards.json` first, then falls back to route defaults.

## Primary Sister Sites
These are the four primary sister-site references used across entity `sameAs` surfaces:
1. `https://www.instagram.com/nate_dumps_pics/`
2. `https://www.etsy.com/shop/NH48pics`
3. `https://www.nh48pics.com/`
4. `https://www.nh48.app/`

## Architecture Boundaries
- Worker-owned metadata and routing:
  - canonical/alternate tags
  - route-level breadcrumb JSON-LD
  - merged global entities (`Organization`, `Person`, `WebSite`)
  - homepage/core route schema assembly
- Prerender-owned peak body content:
  - static crawlable peak guide HTML in `peaks/*`
  - first-hand narrative blocks sourced from `data/peak-experiences.en.json`
- Shared contracts:
  - `data/peak-sameas.json` authority links
  - `data/entity-links.json` global identity and topic references

## Route Schema Surface
| Route type | Primary schema types |
| --- | --- |
| `/`, `/fr` | `WebPage`, `DataCatalog`, multiple `Dataset`, `FAQPage`, `HowTo`, `ImageObject`, `BreadcrumbList` |
| `/catalog` | `Dataset`, `ImageGallery`, `ItemList`, `Mountain`, `BreadcrumbList` |
| `/peak/{slug}` | `Mountain`, `HikingTrail`, `CreativeWork`, `ImageObject`, `BreadcrumbList`, `SpecialAnnouncement` (when advisory present) |
| `/trails`, `/long-trails`, full-trail pages | `WebPage` + route-specific structured data and one breadcrumb list |
| `/dataset/*` pages | data-centric `Dataset`/catalog structured data |
| `/photos/` | gallery + image metadata aligned to rendered images |

## Breadcrumb Taxonomy
- Homepage contract stays fixed: `Home > NH48 API`.
- Peak guide contract is geographic: `Home > White Mountains > {Range} > {Peak}`.
- API/dataset routes use technical taxonomy labels.
- One `BreadcrumbList` per page is enforced by audits.
- Trail section routes (`/trails/*/sections/*`) remain intentionally out of breadcrumb expansion scope.

## Peak Authority Linking Policy
- Source file: `data/peak-sameas.json`.
- Preferred authority link: per-peak English Wikipedia URL.
- Required fallback when no dedicated Wikipedia page:
  - canonical Wikidata entity URL (`https://www.wikidata.org/entity/Q...`)
  - canonical OpenStreetMap object URL (`/node/`, `/way/`, or `/relation/`).
- Additional authority links (for example Peakbagger) are allowed.

## Data Contracts
| File | Purpose |
| --- | --- |
| `data/entity-links.json` | Global person/org/website identity and topical mentions/knowledge links |
| `data/person.json` | Canonical `Person` schema source |
| `data/organization.json` | Canonical `Organization` schema source |
| `data/website.json` | Canonical `WebSite` schema source |
| `data/peak-sameas.json` | Per-peak authority references used in peak JSON-LD |
| `data/peak-sameas.overrides.json` | Manual authority overrides for missing/ambiguous peaks |
| `data/peak-experiences.en.json` | EN first-hand narrative fields per peak |
| `data/parking-data.json` | Structured trailhead/parking logistics by peak slug |
| `data/monthly-weather.json` | Monthly higher-summit weather averages fallback |
| `data/peak-difficulty.json` | Derived numeric `technicalDifficulty` and `physicalEffort` |
| `data/peak-difficulty-overrides.json` | Manual overrides for difficulty model |
| `data/current-conditions.json` | Worker-readable advisory feed fallback |
| `data/nh48_enriched_overlay.json` | Risk factors, prep notes, bailout distances, review confidence |
| `data/breadcrumb-taxonomy.json` | Route taxonomy strategy definitions |
| `data/og-card-overrides.json` | OG image source fallback and route-level OG card overrides |
| `data/og-cards.json` | Generated OG manifest mapping route path -> card URL/alt/hash |

## OG Card System
- Generator script: `python scripts/generate-og-cards.py`
- Route inventory source: `page-sitemap.xml` + explicit extra `/nh48-planner.html`
- Route exclusions: `/trails/*/sections/*`
- Output image contract:
  - Dimensions: `1200x630`
  - Format: JPEG
  - Size target: under `500 KB`
  - Path: `photos/og/<category>/<slug>.jpg`
- Manifest contract (`data/og-cards.json`):
  - `generatedAt`: ISO UTC timestamp
  - `version`: build/git id
  - `cards`: object keyed by normalized route path
  - Per-route fields: `image`, `imageAlt`, `headline`, `sourceImage`, `hash`
- Cache busting:
  - `image` URLs include `?v=<hash8>`
  - Worker serves `/photos/og/*` with `Cache-Control: public, max-age=31536000, immutable`
  - HTML remains `no-store`
- FR mapping:
  - `/fr/*` routes map to the same OG asset as English peers by default unless a route override declares uniqueness.
- Static pages patched by generator (non-SSR image tags):
  - `nh48-planner.html`
  - `peakid-game.html`
  - `timed-peakid-game.html`
  - `pages/puzzle-game.html`

## In-Repo Script Inventory (SEO)
| Script | Command | Purpose |
| --- | --- | --- |
| `scripts/audit-site-schema.js` | `node scripts/audit-site-schema.js` | Template-level schema and breadcrumb drift checks |
| `scripts/audit-homepage-worker-seo.js` | `node scripts/audit-homepage-worker-seo.js --url https://nh48.info` | Live homepage worker schema checks |
| `scripts/audit-worker-breadcrumbs.js` | `node scripts/audit-worker-breadcrumbs.js --url https://nh48.info` | Live worker breadcrumb assertions on key routes |
| `scripts/audit-peak-guide-authority.js` | `node scripts/audit-peak-guide-authority.js` | Peak guide narrative/schema/breadcrumb checks |
| `scripts/audit-sameas.js` | `node scripts/audit-sameas.js` | Strong authority-link contract checks for all peaks |
| `scripts/audit-entity-links.js` | `node scripts/audit-entity-links.js` | Enforces primary sister sites in identity `sameAs` surfaces |
| `scripts/build-peak-sameas.py` | `python scripts/build-peak-sameas.py` | Rebuilds deterministic `data/peak-sameas.json` |
| `scripts/build-peak-difficulty.js` | `node scripts/build-peak-difficulty.js` | Generates numeric difficulty model from dataset + overlay |
| `scripts/build-peak-experience-scaffold.js` | `node scripts/build-peak-experience-scaffold.js` | Creates/refreshes narrative scaffold fields |
| `scripts/prerender-peaks.js` | `node scripts/prerender-peaks.js` | Prerenders static peak guide HTML and schema |
| `scripts/generate-sitemaps.js` | `node scripts/generate-sitemaps.js` | Generates sitemap and canonical page/image entries |
| `scripts/generate-og-cards.py` | `python scripts/generate-og-cards.py` | Builds OG social cards and writes `data/og-cards.json` |
| `scripts/audit-og-cards.js` | `node scripts/audit-og-cards.js` | Verifies OG manifest coverage, image contract, and optional live meta tags |

## CI/CD Gate Behavior
Workflow: `.github/workflows/deploy-worker.yml`

Pre-deploy gates:
1. `audit-site-schema`
2. `audit-image-sitemap-quality`
3. `audit-og-cards`
4. `audit-i18n-completeness`
5. `audit-dataset-overlay-coverage`
6. `audit-unresolved-i18n-markers`
7. `audit-peak-guide-authority`
8. `audit-peak-page-ui`
9. `audit-peak-data-coverage`
10. `audit-peak-image-metadata`
11. `audit-wiki-routes`
12. `audit-wiki-media-sync`
13. `audit-sameas`
14. `audit-entity-links`

Deploy condition:
- Deploy runs on `workflow_dispatch` or when worker files changed.
- On audit-only changes, deploy is skipped but audits still run.

Post-deploy production checks:
- `audit-homepage-worker-seo` and `audit-worker-breadcrumbs`
- retry policy: 6 attempts, 20 seconds between attempts
- target URL: `https://nh48.info`

## Current Implemented vs Deferred
Implemented:
- Canonical peak routing and redirect hygiene
- Expanded breadcrumb taxonomy with one-list enforcement
- Dynamic homepage image metadata union (card + splash sources)
- Strong per-peak authority references with audits
- Sister-site identity expansion including `nh48.app`
- Numeric difficulty, parking/weather/risk data contracts
- Worker advisory banners from conditions + risk/weather context

Deferred in this phase:
- Video sitemap generation
- FR narrative parity (`peak-experiences.fr.json`)
- Trail-section breadcrumb expansion

## Troubleshooting Quick Notes
- If production breadcrumb audits fail, compare deployed worker output with local `audit-worker-breadcrumbs` expectations first.
- If `sameAs` audit fails, regenerate `data/peak-sameas.json` from `scripts/build-peak-sameas.py` and re-run the audit.
- If advisory output looks stale, validate `data/current-conditions.json` timestamps and live NWS reachability.
