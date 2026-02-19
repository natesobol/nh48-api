# NH48 Map Weather Overlays

## Purpose
This document describes the weather overlay subsystem on `/nh48-map` and `/fr/nh48-map`.

## Core Behavior
- Topographic basemap remains the default on first load.
- Weather panel starts hidden.
- All overlays start disabled.
- Users can select one or many overlays, then click `Apply overlays`.

## Data Sources
- Open-Meteo API (`/api/weather/open-meteo` proxy)
  - Variables: temperature, apparent temperature, wind speed, wind gusts, humidity, precipitation, snow depth, snowfall.
  - Update cadence: near-real-time model updates by provider; endpoint polled on demand.
- RainViewer (`/api/weather/radar/meta` + `/api/weather/radar/tile/...` proxies)
  - Primary radar source.
  - Update cadence: metadata cached for 120 seconds; tiles cached for 300 seconds.
- NOAA OpenGeo WMS (radar fallback)
  - Used when RainViewer metadata is unavailable.
- NWS Alerts API (`/api/weather/alerts` proxy)
  - Active alerts as simplified GeoJSON.
  - Update cadence: cached for 300 seconds.

## Rendering Model
- `weatherTilePane`: radar tiles.
- `weatherPolygonPane`: NWS alert polygons.
- `weatherScalarPane`: scalar glyph markers.
- `nh48MarkerPane`: peak markers above weather overlays.

Scalar overlays are rendered as compact offset glyphs around peaks so multiple overlays can coexist.

## Dynamic Color Scaling
For each active scalar overlay:
1. Convert values to the selected unit system.
2. Compute robust spread with visible values (`q10`, `q90`).
3. Anchor around selected peak value (or median fallback).
4. Build domain with minimum span and clamp to overlay absolute safety bounds.
5. Map values with palette interpolation.

## Legend
Each active scalar overlay legend includes:
- Overlay label
- Continuous color bar
- Min / anchor / max ticks with units
- Selected peak readout
- Source and update time

Radar and alert overlays also provide legend cards.

## Units
- Default: Imperial.
- Supported: Imperial + Metric.
- Unit conversion is applied before domain and color calculations.

## Caching and Resilience
- In-memory cache per endpoint + query key.
- Local storage fallback for scalar payloads.
- Overlay-level error handling only (map stays functional).
- Status labels per overlay: `Idle`, `Loading`, `Live`, `Stale`, `Error`.

## Analytics Events
- `nh48_map_weather_panel_toggle`
- `nh48_map_weather_apply`
- `nh48_map_weather_overlay_toggle`
- `nh48_map_weather_overlay_error`

## Future Expansion (Phase 2)
- NOHRSC observed snowpack / SWE overlays.
- Radar timeline animation controls.
- Per-overlay threshold filters.
- Snapshot export of active weather stack.
