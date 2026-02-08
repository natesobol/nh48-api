#!/usr/bin/env python3
"""
Build an enrichment overlay for NH48 peaks for planner + risk filtering.

Input (default): https://nh48.info/data/nh48.json
Output: JSON object keyed by slug containing ONLY new/normalized fields, suitable for merging.

Design goals:
- No speculation: derive from existing dataset fields wherever possible.
- Deterministic mapping: same input produces same risk chips and prep notes.
- Keep evidence: record which dataset fields triggered each chip.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from datetime import date
from typing import Any, Dict, List, Optional, Set, Tuple

DEFAULT_SOURCE = "https://nh48.info/data/nh48.json"

RANGE_GROUP_MAP = [
    ("Presidential", "Presidential Range"),
    ("Franconia", "Franconia Range"),
    ("Kinsman", "Kinsman Range"),
    ("Moosilauke", "Kinsman Range"),
    ("Carter", "Carter-Moriah Range"),
    ("Wildcat", "Carter-Moriah Range"),
    ("Moriah", "Carter-Moriah Range"),
    ("Twin", "Twin Range"),
    ("Bond", "Pemigewasset Wilderness"),
    ("Pemi", "Pemigewasset Wilderness"),
    ("Pemigewasset", "Pemigewasset Wilderness"),
    ("Willey", "Willey Range"),
    ("Pilot", "Pilot-Pliny Range"),
    ("Pliny", "Pilot-Pliny Range"),
    ("Sandwich", "Sandwich / Waterville Range"),
    ("Tripyramid", "Sandwich / Waterville Range"),
    ("Osceola", "Sandwich / Waterville Range"),
    ("Tecumseh", "Sandwich / Waterville Range"),
]

RISK_FACTOR_ENUM = [
    "AboveTreelineExposure",
    "SevereWeather",
    "LongBailout",
    "LimitedWater",
    "Navigation",
    "ScrambleSteep",
    "UnbridgedRiverCrossings",
    "NoCellService",
]

_ws_re = re.compile(r"\s+")


def _norm(value: str) -> str:
    return _ws_re.sub(" ", (value or "").strip())


def load_dataset(source: str) -> Dict[str, Any]:
    if source.startswith("http://") or source.startswith("https://"):
        with urllib.request.urlopen(source) as resp:
            return json.loads(resp.read().decode("utf-8"))
    with open(source, "r", encoding="utf-8") as f:
        return json.load(f)


def parse_coords(coord_text: str) -> Tuple[Optional[float], Optional[float]]:
    if not coord_text:
        return None, None
    parts = [p.strip() for p in coord_text.split(",")]
    if len(parts) != 2:
        return None, None
    try:
        return float(parts[0]), float(parts[1])
    except Exception:
        return None, None


def normalize_range_group(range_raw: str) -> Optional[str]:
    rr = range_raw or ""
    for needle, group in RANGE_GROUP_MAP:
        if needle.lower() in rr.lower():
            return group
    return None


def _to_str(value: Any) -> str:
    return "" if value is None else str(value)


def _contains_any(haystack: str, needles: List[str]) -> bool:
    h = (haystack or "").lower()
    return any(n.lower() in h for n in needles)


def extract_first_route(peak: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    routes = peak.get("Standard Routes")
    if isinstance(routes, list) and routes:
        if isinstance(routes[0], dict):
            return routes[0]
    return None


def parse_number(text: Any) -> Optional[float]:
    if text is None:
        return None
    try:
        return float(str(text).replace(",", "").strip())
    except Exception:
        return None


def parse_typical_time(text: str) -> Optional[float]:
    if not text:
        return None
    numbers = re.findall(r"\d+(?:\.\d+)?", text)
    if not numbers:
        return None
    values = [float(n) for n in numbers]
    if len(values) >= 2:
        return round((values[0] + values[1]) / 2.0, 1)
    return round(values[0], 1)


def naismith_hours(distance_mi: Optional[float], gain_ft: Optional[float]) -> Optional[float]:
    if distance_mi is None or gain_ft is None:
        return None
    return round((distance_mi / 3.0) + (gain_ft / 2000.0), 1)


def bailout_distance_mi(bailout_text: str) -> Optional[float]:
    if not bailout_text:
        return None
    matches = re.findall(r"(~?\s*\d+(?:\.\d+)?)\s*miles?", bailout_text.lower())
    values: List[float] = []
    for m in matches:
        cleaned = m.replace("~", "").strip()
        try:
            values.append(float(cleaned))
        except Exception:
            continue
    return max(values) if values else None


def assign_risk_factors(peak: Dict[str, Any]) -> Tuple[List[str], List[Dict[str, Any]]]:
    factors: Set[str] = set()
    triggers: List[Dict[str, Any]] = []

    exposure_level = _to_str(peak.get("Exposure Level"))
    weather_rating = _to_str(peak.get("Weather Exposure Rating"))
    water_avail = _to_str(peak.get("Water Availability"))
    cell = _to_str(peak.get("Cell Reception Quality"))
    bailout = _to_str(peak.get("Emergency Bailout Options"))
    scramble = _to_str(peak.get("Scramble Sections"))
    terrain = _to_str(peak.get("Terrain Character"))

    if _contains_any(exposure_level, ["high", "very high"]) or _contains_any(
        terrain, ["above treeline", "alpine", "fully exposed"]
    ):
        factors.add("AboveTreelineExposure")
        triggers.append({"field": "Exposure Level", "value": exposure_level})
        triggers.append({"field": "Terrain Character", "value": terrain})

    if _contains_any(weather_rating, ["high", "very high", "hurricane", "dangerous"]):
        factors.add("SevereWeather")
        triggers.append({"field": "Weather Exposure Rating", "value": weather_rating})

    if _contains_any(bailout, ["none", "no short", "must retreat", "long", "miles"]):
        factors.add("LongBailout")
        triggers.append({"field": "Emergency Bailout Options", "value": bailout})

    if _contains_any(water_avail, ["limited", "none", "carry", "no reliable", "filter"]):
        factors.add("LimitedWater")
        triggers.append({"field": "Water Availability", "value": water_avail})

    if _contains_any(cell, ["none", "poor", "spotty", "limited"]):
        factors.add("NoCellService")
        triggers.append({"field": "Cell Reception Quality", "value": cell})

    if _contains_any(scramble, ["scramble", "chimney", "ladder", "slide", "steep"]) or _contains_any(
        terrain, ["slide", "ledg", "scrambl"]
    ):
        factors.add("ScrambleSteep")
        triggers.append({"field": "Scramble Sections", "value": scramble})
        triggers.append({"field": "Terrain Character", "value": terrain})

    if _contains_any(terrain, ["stream crossing", "river crossing", "ford", "wade"]) or _contains_any(
        water_avail, ["brook crossing", "stream crossing", "ford"]
    ):
        factors.add("UnbridgedRiverCrossings")
        triggers.append({"field": "Terrain Character", "value": terrain})

    if "AboveTreelineExposure" in factors or ("NoCellService" in factors and "LongBailout" in factors):
        factors.add("Navigation")
        triggers.append(
            {"field": "Derived", "value": "Navigation added due to AboveTreelineExposure or (NoCellService+LongBailout)"}
        )

    ordered = [f for f in RISK_FACTOR_ENUM if f in factors]
    return ordered, triggers


def build_prep_notes(peak: Dict[str, Any], risk_factors: List[str]) -> str:
    parts: List[str] = []
    bailout = _to_str(peak.get("Emergency Bailout Options"))

    if "AboveTreelineExposure" in risk_factors or "SevereWeather" in risk_factors:
        parts.append("Check a summit forecast and carry windproof/warm layers; turn back if visibility or lightning risk increases.")
    if "LimitedWater" in risk_factors:
        parts.append("Plan water conservatively and do not assume reliable sources late in the hike.")
    if "NoCellService" in risk_factors:
        parts.append("Download offline maps and do not rely on cell service; leave a plan with someone.")
    if "LongBailout" in risk_factors and bailout:
        parts.append(_norm(bailout))
    if not parts:
        parts.append("Carry the 10 essentials and prepare for rough footing and rapid weather changes.")
    return _norm(" ".join(parts))[:420]


def main() -> int:
    parser = argparse.ArgumentParser(description="Build NH48 enrichment overlay JSON")
    parser.add_argument("--input", "-i", default=DEFAULT_SOURCE, help="Input JSON path or URL")
    parser.add_argument("--output", "-o", default="nh48_enriched_overlay.json", help="Output JSON filename")
    args = parser.parse_args()

    dataset = load_dataset(args.input)
    today = date.today().isoformat()
    overlay: Dict[str, Any] = {}

    for slug, peak in dataset.items():
        peak_name = peak.get("peakName") or peak.get("Peak Name") or slug
        coords = _to_str(peak.get("Coordinates"))
        lat, lon = parse_coords(coords)

        range_raw = _to_str(peak.get("Range / Subrange"))
        range_group = normalize_range_group(range_raw)

        primary = extract_first_route(peak) or {}
        dist = parse_number(primary.get("Distance (mi)"))
        gain = parse_number(primary.get("Elevation Gain (ft)"))

        typical_time = parse_typical_time(_to_str(peak.get("Typical Completion Time")))
        estimated_time = typical_time if typical_time is not None else naismith_hours(dist, gain)

        factors, triggers = assign_risk_factors(peak)
        prep = build_prep_notes(peak, factors)

        bailout_text = _to_str(peak.get("Emergency Bailout Options"))
        bailout_mi = bailout_distance_mi(bailout_text)

        overlay[slug] = {
            "peak_id": slug,
            "slug": slug,
            "mountain": peak_name,
            "latitude": lat,
            "longitude": lon,
            "range_group": range_group,
            "range_raw": range_raw or None,
            "primary_route": primary or None,
            "primary_distance_mi": dist,
            "primary_gain_ft": int(gain) if gain is not None else None,
            "trail_type_primary": primary.get("Trail Type"),
            "difficulty_text_primary": primary.get("Difficulty"),
            "estimated_time_hours": estimated_time,
            "risk_factors": factors,
            "prep_notes": prep,
            "bailout_distance_mi": bailout_mi,
            "risk_evidence": [
                {
                    "type": "dataset_field",
                    "field": t.get("field"),
                    "value": t.get("value"),
                    "source_title": "NH48 JSON dataset",
                    "source_url": args.input,
                }
                for t in triggers
            ],
            "risk_review": {"status": "generated", "confidence": 0.8 if triggers else 0.5, "last_reviewed": today},
            "common_groupings": [],
            "finish_strategy_suggestions": [],
            "trailhead_coordinates": None,
        }

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(overlay, f, indent=2, ensure_ascii=True)
        f.write("\n")

    print(f"Wrote overlay for {len(overlay)} peaks -> {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
