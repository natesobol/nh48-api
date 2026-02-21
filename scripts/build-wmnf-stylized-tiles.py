#!/usr/bin/env python3
"""
Build WMNF-only stylized terrain assets (hillshade + contour MVT tiles).

Outputs (default):
  tmp/wmnf-stylized/v1/hillshade/{z}/{x}/{y}.png
  tmp/wmnf-stylized/v1/contours/{z}/{x}/{y}.pbf
  tmp/wmnf-stylized/v1/metadata.json

Also writes:
  data/wmnf-terrain-bounds.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OVERLAY = ROOT / "data" / "nh48_enriched_overlay.json"
DEFAULT_BOUNDS_OUTPUT = ROOT / "data" / "wmnf-terrain-bounds.json"
DEFAULT_OUTPUT_ROOT = ROOT / "tmp" / "wmnf-stylized" / "v1"
DEFAULT_DEM_CACHE_DIR = ROOT / "tmp" / "wmnf-dem"


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: Path) -> Dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: Dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, indent=2, sort_keys=True)
        handle.write("\n")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def command_exists(name: str) -> bool:
    return shutil.which(name) is not None


def resolve_command(candidates: Iterable[str]) -> str:
    for candidate in candidates:
        if command_exists(candidate):
            return candidate
    raise RuntimeError(f"Missing required command. Tried: {', '.join(candidates)}")


def run(cmd: List[str], cwd: Path | None = None) -> None:
    print(f"[build-wmnf-stylized] $ {' '.join(cmd)}")
    completed = subprocess.run(cmd, cwd=str(cwd) if cwd else None, check=False)
    if completed.returncode != 0:
        raise RuntimeError(f"Command failed ({completed.returncode}): {' '.join(cmd)}")


def extract_overlay_points(overlay_payload: Dict) -> List[Tuple[float, float]]:
    points: List[Tuple[float, float]] = []
    for entry in overlay_payload.values():
        if not isinstance(entry, dict):
            continue
        lat = entry.get("latitude")
        lon = entry.get("longitude")
        if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
            if -90 <= float(lat) <= 90 and -180 <= float(lon) <= 180:
                points.append((float(lat), float(lon)))
    if not points:
        raise RuntimeError("No valid latitude/longitude points found in overlay data.")
    return points


def compute_bounds(points: List[Tuple[float, float]], padding_km: float) -> Dict[str, float]:
    min_lat = min(point[0] for point in points)
    max_lat = max(point[0] for point in points)
    min_lon = min(point[1] for point in points)
    max_lon = max(point[1] for point in points)
    center_lat = (min_lat + max_lat) / 2.0

    lat_pad_deg = padding_km / 110.574
    lon_denominator = max(0.01, 111.320 * math.cos(math.radians(center_lat)))
    lon_pad_deg = padding_km / lon_denominator

    bounded = {
        "min_lat": max(-90.0, min_lat - lat_pad_deg),
        "max_lat": min(90.0, max_lat + lat_pad_deg),
        "min_lon": max(-180.0, min_lon - lon_pad_deg),
        "max_lon": min(180.0, max_lon + lon_pad_deg),
    }
    bounded["center_lat"] = center_lat
    bounded["center_lon"] = (min_lon + max_lon) / 2.0
    bounded["padding_km"] = padding_km
    return bounded


def build_bounds_payload(bounds: Dict[str, float], source_path: Path, point_count: int) -> Dict:
    return {
        "version": "v1",
        "generated_at": iso_now(),
        "source_overlay": source_path.relative_to(ROOT).as_posix(),
        "point_count": point_count,
        "bounds_wgs84": {
            "minLat": round(bounds["min_lat"], 6),
            "maxLat": round(bounds["max_lat"], 6),
            "minLon": round(bounds["min_lon"], 6),
            "maxLon": round(bounds["max_lon"], 6),
        },
        "center_wgs84": {
            "lat": round(bounds["center_lat"], 6),
            "lon": round(bounds["center_lon"], 6),
        },
        "padding_km": bounds["padding_km"],
    }


def build_default_usgs_dem_url(bounds: Dict[str, float], width: int, height: int) -> str:
    params = {
        "bbox": f"{bounds['min_lon']},{bounds['min_lat']},{bounds['max_lon']},{bounds['max_lat']}",
        "bboxSR": "4326",
        "size": f"{width},{height}",
        "imageSR": "4326",
        "format": "tiff",
        "pixelType": "F32",
        "f": "image",
        "interpolation": "RSP_BilinearInterpolation",
    }
    query = "&".join(f"{key}={value}" for key, value in params.items())
    return (
        "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/"
        f"ImageServer/exportImage?{query}"
    )


def fetch_dem(dem_source: str | None, bounds: Dict[str, float], cache_dir: Path, dem_size: int) -> Tuple[Path, str]:
    cache_dir.mkdir(parents=True, exist_ok=True)
    dem_path = cache_dir / "wmnf_dem_source.tif"

    source_ref = dem_source.strip() if dem_source else ""
    if not source_ref:
        source_ref = build_default_usgs_dem_url(bounds, dem_size, dem_size)
        print(f"[build-wmnf-stylized] Using default USGS 3DEP export URL:\n{source_ref}")

    if source_ref.startswith("http://") or source_ref.startswith("https://"):
        print(f"[build-wmnf-stylized] Downloading DEM from URL -> {dem_path}")
        with urllib.request.urlopen(source_ref) as response, dem_path.open("wb") as output:
            shutil.copyfileobj(response, output)
    else:
        source_path = Path(source_ref).expanduser().resolve()
        if not source_path.exists():
            raise RuntimeError(f"DEM source file not found: {source_path}")
        print(f"[build-wmnf-stylized] Copying DEM file -> {dem_path}")
        shutil.copyfile(source_path, dem_path)

    if not dem_path.exists() or dem_path.stat().st_size == 0:
        raise RuntimeError("DEM download/copy failed; output file is missing or empty.")

    return dem_path, source_ref


def annotate_contours(raw_geojson: Path, output_geojson: Path, minor_ft: int, major_ft: int) -> int:
    with raw_geojson.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    features = payload.get("features", [])
    if not isinstance(features, list):
        raise RuntimeError("Unexpected contour GeoJSON structure (missing features list).")

    major_every = max(1, int(round(float(major_ft) / float(minor_ft))))
    output_features = []
    for feature in features:
        if not isinstance(feature, dict):
            continue
        props = feature.get("properties") or {}
        elev_m = props.get("elev_m")
        if elev_m is None:
            elev_m = props.get("ELEV")
        if elev_m is None:
            elev_m = props.get("elev")
        try:
            elev_m_num = float(elev_m)
        except (TypeError, ValueError):
            continue
        elev_ft = elev_m_num * 3.28084
        level = int(round(elev_ft / float(minor_ft)))
        is_major = 1 if level % major_every == 0 else 0
        contour_type = "major" if is_major else "minor"
        feature["properties"] = {
            "elevation_ft": int(round(elev_ft)),
            "elevation_m": round(elev_m_num, 2),
            "interval_ft": int(minor_ft),
            "is_major": is_major,
            "contour_type": contour_type,
            "level": level,
        }
        output_features.append(feature)

    payload["features"] = output_features
    output_geojson.parent.mkdir(parents=True, exist_ok=True)
    with output_geojson.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, separators=(",", ":"), sort_keys=True)
        handle.write("\n")
    return len(output_features)


def count_matching_files(root: Path, suffix: str) -> int:
    if not root.exists():
        return 0
    return sum(1 for candidate in root.rglob(f"*{suffix}") if candidate.is_file())


def build_metadata(
    output_root: Path,
    bounds_payload: Dict,
    dem_path: Path,
    dem_source: str,
    min_zoom: int,
    max_zoom: int,
    minor_ft: int,
    major_ft: int,
    contour_feature_count: int,
) -> Dict:
    return {
        "version": "v1",
        "generated_at": iso_now(),
        "bounds_wgs84": bounds_payload.get("bounds_wgs84", {}),
        "padding_km": bounds_payload.get("padding_km"),
        "zoom": {"min": min_zoom, "max": max_zoom},
        "contours": {
            "minor_interval_ft": minor_ft,
            "major_interval_ft": major_ft,
            "feature_count": contour_feature_count,
            "tile_count": count_matching_files(output_root / "contours", ".pbf"),
        },
        "hillshade": {
            "tile_count": count_matching_files(output_root / "hillshade", ".png"),
        },
        "source_dem": {
            "reference": dem_source,
            "sha256": sha256_file(dem_path),
            "bytes": dem_path.stat().st_size,
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build WMNF stylized terrain tile assets.")
    parser.add_argument("--overlay", type=Path, default=DEFAULT_OVERLAY)
    parser.add_argument("--bounds-output", type=Path, default=DEFAULT_BOUNDS_OUTPUT)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--dem-cache-dir", type=Path, default=DEFAULT_DEM_CACHE_DIR)
    parser.add_argument("--dem-source", type=str, default="")
    parser.add_argument("--dem-size", type=int, default=4096, help="Default USGS DEM export size in pixels.")
    parser.add_argument("--padding-km", type=float, default=12.0)
    parser.add_argument("--min-zoom", type=int, default=7)
    parser.add_argument("--max-zoom", type=int, default=14)
    parser.add_argument("--minor-ft", type=int, default=50)
    parser.add_argument("--major-ft", type=int, default=200)
    parser.add_argument("--bounds-only", action="store_true", help="Compute and write bounds only.")
    parser.add_argument("--force", action="store_true", help="Delete existing output root before rebuilding.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    overlay_path = args.overlay.resolve()
    bounds_output = args.bounds_output.resolve()
    output_root = args.output_root.resolve()
    dem_cache_dir = args.dem_cache_dir.resolve()

    if not overlay_path.exists():
        raise RuntimeError(f"Overlay file not found: {overlay_path}")
    overlay_payload = read_json(overlay_path)
    points = extract_overlay_points(overlay_payload)
    bounds = compute_bounds(points, args.padding_km)
    bounds_payload = build_bounds_payload(bounds, overlay_path, len(points))
    write_json(bounds_output, bounds_payload)
    print(f"[build-wmnf-stylized] Wrote bounds: {bounds_output.relative_to(ROOT)}")

    if args.bounds_only:
        return 0

    required_commands = {
        "gdalwarp": resolve_command(["gdalwarp"]),
        "gdaldem": resolve_command(["gdaldem"]),
        "gdal_translate": resolve_command(["gdal_translate"]),
        "gdal2tiles": resolve_command(["gdal2tiles.py", "gdal2tiles"]),
        "gdal_contour": resolve_command(["gdal_contour"]),
        "tippecanoe": resolve_command(["tippecanoe"]),
        "tile_join": resolve_command(["tile-join"]),
    }

    if args.force and output_root.exists():
        shutil.rmtree(output_root)
    (output_root / "hillshade").mkdir(parents=True, exist_ok=True)
    (output_root / "contours").mkdir(parents=True, exist_ok=True)
    build_tmp = output_root / "_build"
    build_tmp.mkdir(parents=True, exist_ok=True)

    dem_source_tif, dem_source_reference = fetch_dem(args.dem_source, bounds, dem_cache_dir, args.dem_size)
    dem_3857 = build_tmp / "wmnf_dem_3857.tif"
    hillshade_tif = build_tmp / "wmnf_hillshade.tif"
    hillshade_byte_tif = build_tmp / "wmnf_hillshade_byte.tif"
    contours_raw_geojson = build_tmp / "wmnf_contours_raw.geojson"
    contours_tagged_geojson = build_tmp / "wmnf_contours_tagged.geojson"
    contours_mbtiles = build_tmp / "wmnf_contours.mbtiles"

    run([
        required_commands["gdalwarp"],
        "-overwrite",
        "-t_srs",
        "EPSG:3857",
        "-r",
        "bilinear",
        "-dstnodata",
        "-9999",
        str(dem_source_tif),
        str(dem_3857),
    ])

    run([
        required_commands["gdaldem"],
        "hillshade",
        str(dem_3857),
        str(hillshade_tif),
        "-z",
        "1.0",
        "-az",
        "315",
        "-alt",
        "45",
        "-compute_edges",
    ])

    run([
        required_commands["gdal_translate"],
        "-ot",
        "Byte",
        "-scale",
        "0",
        "255",
        "0",
        "255",
        str(hillshade_tif),
        str(hillshade_byte_tif),
    ])

    run([
        required_commands["gdal2tiles"],
        "--xyz",
        "-w",
        "none",
        "-z",
        f"{args.min_zoom}-{args.max_zoom}",
        str(hillshade_byte_tif),
        str(output_root / "hillshade"),
    ])

    minor_m = float(args.minor_ft) * 0.3048
    run([
        required_commands["gdal_contour"],
        "-i",
        f"{minor_m:.6f}",
        "-a",
        "elev_m",
        str(dem_3857),
        str(contours_raw_geojson),
    ])

    contour_feature_count = annotate_contours(
        contours_raw_geojson,
        contours_tagged_geojson,
        minor_ft=int(args.minor_ft),
        major_ft=int(args.major_ft),
    )

    run([
        required_commands["tippecanoe"],
        "-o",
        str(contours_mbtiles),
        "-l",
        "contours",
        "-Z",
        str(args.min_zoom),
        "-z",
        str(args.max_zoom),
        "--drop-densest-as-needed",
        "--coalesce-densest-as-needed",
        "--extend-zooms-if-still-dropping",
        "--no-feature-limit",
        "--no-tile-size-limit",
        str(contours_tagged_geojson),
    ])

    run([
        required_commands["tile_join"],
        "-e",
        str(output_root / "contours"),
        str(contours_mbtiles),
    ])

    metadata_payload = build_metadata(
        output_root=output_root,
        bounds_payload=bounds_payload,
        dem_path=dem_source_tif,
        dem_source=dem_source_reference,
        min_zoom=int(args.min_zoom),
        max_zoom=int(args.max_zoom),
        minor_ft=int(args.minor_ft),
        major_ft=int(args.major_ft),
        contour_feature_count=contour_feature_count,
    )
    write_json(output_root / "metadata.json", metadata_payload)
    print(f"[build-wmnf-stylized] Build complete: {output_root}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"[build-wmnf-stylized] ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
