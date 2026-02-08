# NH48 Enrichment Overlay Merge Strategy

## Goal
Keep `data/nh48.json` as the authoritative narrative dataset while layering in normalized, planner-ready fields (risk chips, coordinates, range groups, and timing estimates) generated from existing data.

## Recommended Flow
1. Treat `data/nh48.json` as the source of truth for peak descriptions, route narratives, and metadata.
2. Generate an overlay file keyed by `slug` using:
   - `scripts/build_nh48_enriched_overlay.py`
3. Merge the overlay into the base dataset by `slug` without deleting any existing fields.

## Merge Rules
- Join on `slug` (or `peak_id`, which is identical to `slug` in the overlay).
- The overlay only introduces **new normalized fields**.
- It must never remove or overwrite existing narrative fields in the base dataset.

## UI Contract
Use overlay fields for UI logic and filtering:
- Risk chips: `risk_factors[]`
- Prep copy: `prep_notes`
- Audit trail: `risk_evidence[]` and `risk_review`
- Planner defaults: `primary_distance_mi`, `primary_gain_ft`, `estimated_time_hours`, `range_group`

## Regeneration
Re-run the overlay script whenever the base dataset changes to keep derived fields in sync.
