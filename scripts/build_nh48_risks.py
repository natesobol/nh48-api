#!/usr/bin/env python3
"""
NH48 Risk Factor Schema Generator
- Input: local file path or URL to nh48.json (default: data/nh48.json)
- Output: JSON array (stdout or write to --output file)

Usage:
  python scripts/build_nh48_risks.py --input data/nh48.json --output data/nh48_risk_schema.json

This script deterministically maps dataset fields to a small set of
risk factor strings and produces per-peak objects with `risk_factors`,
`prep_notes`, `risk_evidence`, and `risk_review`.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from typing import Any, Dict, List, Set, Tuple

NH48_DEFAULT = "data/nh48.json"
NH48_CANONICAL_URL = "https://nh48.info/data/nh48.json"

# Authoritative definition sources
DEFINITION_SOURCES = [
    {
        "id": "usfs_safety_ethics",
        "title": "White Mountain National Forest - Safety and Outdoor Ethics",
        "url": "https://www.fs.usda.gov/r09/whitemountain/safety-ethics",
        "supports": ["AboveTreelineExposure", "Navigation", "Preparedness"],
        "note": "USFS notes conditions and emphasizes preparedness; relevant for treeline and rapid weather changes.",
    },
    {
        "id": "nhfg_prepared_responsible",
        "title": "NH Fish & Game - Be aware, prepared, and responsible when hiking in NH",
        "url": "https://nhfishgame.com/2025/05/15/be-aware-prepared-and-responsible-when-hiking-in-new-hampshire/",
        "supports": ["Preparedness", "LimitedWater", "Navigation", "NoCellService"],
        "note": "NHFG emphasizes 10 essentials and preparedness; highlights variable conditions and carrying extra food/water.",
    },
    {
        "id": "hikesafe",
        "title": "HikeSafe - Hiker Responsibility Code",
        "url": "https://www.hikesafe.com/",
        "supports": ["Preparedness", "Navigation", "LongBailout"],
        "note": "HikeSafe emphasizes planning and personal responsibility; relevant to long bailouts and rescue delays.",
    },
    {
        "id": "atc_lightning",
        "title": "Appalachian Trail Conservancy - Lightning & ridgeline risk",
        "url": "https://appalachiantrail.org/experience/hike-the-trail/essential-skills/safety/weather-hazards/lightning/",
        "supports": ["AboveTreelineExposure", "SevereWeather"],
        "note": "ATC warns ridgelines/summits above treeline are especially dangerous; notes fatalities on Franconia Ridge.",
    },
    {
        "id": "mwo_big_wind",
        "title": "Mount Washington Observatory - Remembering the Big Wind",
        "url": "https://mountwashington.org/remembering-the-big-wind/",
        "supports": ["SevereWeather"],
        "note": "MWO documents extreme wind history and supports severe-weather messaging for the Presidentials.",
    },
    {
        "id": "nhpr_bridge_wilderness",
        "title": "NHPR - Bridges in the Pemigewasset Wilderness and Wilderness Act constraints",
        "url": "https://www.nhpr.org/north-country/2015-10-08/white-mountain-national-forest-does-a-bridge-belong-in-the-wilderness",
        "supports": ["UnbridgedRiverCrossings", "LongBailout"],
        "note": "Shows wilderness-area constraints around bridges; supports risk modeling for unbridged crossings in Pemi context.",
    },
]


# Name aliases for matching dataset entries
NAME_ALIASES = {
    "Washington": ["Mount Washington", "Washington"],
    "Adams": ["Mount Adams", "Adams"],
    "Jefferson": ["Mount Jefferson", "Jefferson"],
    "Monroe": ["Mount Monroe", "Monroe"],
    "Madison": ["Mount Madison", "Madison"],
    "Lafayette": ["Mount Lafayette", "Lafayette"],
    "Lincoln": ["Mount Lincoln", "Lincoln"],
    "South Twin": ["South Twin", "South Twin Mountain"],
    "North Twin": ["North Twin", "North Twin Mountain"],
    "Carter Dome": ["Carter Dome", "Carter Dome Mountain", "Carter Dome Mountain"],
    "Moosilauke": ["Mount Moosilauke", "Moosilauke"],
    "Eisenhower": ["Mount Eisenhower", "Eisenhower"],
    "Carrigain": ["Mount Carrigain", "Carrigain"],
    "Bond": ["Mount Bond", "Bond"],
    "Bondcliff": ["Bondcliff"],
    "West Bond": ["West Bond", "West-Bond"],
    "Middle Carter": ["Middle Carter", "Middle Carter Mountain"],
    "South Carter": ["South Carter", "South Carter Mountain"],
    "North Carter": ["North Carter", "North Carter Mountain"],
    "Wildcat A": ["Wildcat A", "Wildcat Mountain - A Peak"],
    "Hancock": ["Mount Hancock", "Hancock"],
    "South Kinsman": ["South Kinsman", "South Kinsman Mountain"],
    "Field": ["Mount Field", "Field"],
    "Osceola": ["Mount Osceola", "Osceola"],
    "East Osceola": ["Mount Osceola East", "East Osceola", "Mount Osceola - East Peak"],
    "Flume": ["Mount Flume", "Flume"],
    "South Hancock": ["South Hancock", "Mount Hancock - South Peak"],
    "Pierce": ["Mount Pierce", "Pierce"],
    "Willey": ["Mount Willey", "Willey"],
    "Zealand": ["Zealand Mountain", "Zealand"],
    "Guyot": ["Mount Guyot", "Guyot"],
    "Passaconaway": ["Mount Passaconaway", "Passaconaway"],
    "Whiteface": ["Mount Whiteface", "Whiteface"],
    "North Tripyramid": ["North Tripyramid", "North Tripyramid Mountain"],
    "Middle Tripyramid": ["Middle Tripyramid", "Middle Tripyramid Mountain"],
    "Cabot": ["Mount Cabot", "Cabot"],
    "Cannon": ["Cannon Mountain", "Cannon"],
    "Hale": ["Mount Hale", "Hale"],
    "Jackson": ["Mount Jackson", "Jackson"],
    "Tom": ["Mount Tom", "Tom"],
    "Moriah": ["Mount Moriah", "Moriah"],
    "Galehead": ["Galehead Mountain", "Galehead"],
    "Owl's Head": ["Owls Head", "Owl's Head", "Owl's Head"],
    "Isolation": ["Mount Isolation", "Isolation"],
    "Waumbek": ["Mount Waumbek", "Waumbek"],
    "Tecumseh": ["Mount Tecumseh", "Tecumseh"],
}

# Risk factors exposed to UI as filter chips
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

def _to_str(v: Any) -> str:
    return "" if v is None else str(v)

def _contains_any(haystack: str, needles: List[str]) -> bool:
    h = haystack.lower()
    return any(n.lower() in h for n in needles)

def _normalize_spaces(s: str) -> str:
    return _ws_re.sub(" ", s).strip()


def _normalize_name(s: str) -> str:
    return _normalize_spaces(s).rstrip(".")

def load_dataset(source: str) -> Dict[str, Any]:
    # Accept local path or URL
    if source.startswith("http://") or source.startswith("https://"):
        import urllib.request

        with urllib.request.urlopen(source) as resp:
            return json.loads(resp.read().decode("utf-8"))
    else:
        with open(source, "r", encoding="utf-8") as f:
            return json.load(f)

def build_name_index(dataset: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    idx: Dict[str, Dict[str, Any]] = {}
    for slug, obj in dataset.items():
        # try a few common name fields
        peak_name = obj.get("peakName") or obj.get("Peak Name") or obj.get("peak_name") or obj.get("name") or obj.get("title")
        if peak_name:
            idx[_normalize_name(str(peak_name))] = obj
        # also index slug and other visible keys
        if slug:
            idx[_normalize_name(str(slug))] = obj
    return idx

def get_peak_obj(name_index: Dict[str, Dict[str, Any]], user_name: str) -> Dict[str, Any]:
    candidates = NAME_ALIASES.get(user_name, [user_name])
    for cand in candidates:
        cand_norm = _normalize_name(cand)
        if cand_norm in name_index:
            return name_index[cand_norm]
    # fallback: fuzzy contains
    key_lower = _normalize_name(user_name).lower()
    for k, v in name_index.items():
        if key_lower in k.lower():
            return v
    raise KeyError(f"Could not locate peak in dataset for '{user_name}'")

def assign_risk_factors(peak: Dict[str, Any]) -> Tuple[List[str], List[Dict[str, Any]]]:
    factors: Set[str] = set()
    triggers: List[Dict[str, Any]] = []

    exposure_level = _to_str(peak.get("Exposure Level") or peak.get("Exposure") or peak.get("exposure"))
    weather_rating = _to_str(peak.get("Weather Exposure Rating") or peak.get("Weather") or peak.get("weather_exposure"))
    water_avail = _to_str(peak.get("Water Availability") or peak.get("Water Availability (notes)") or peak.get("water"))
    cell = _to_str(peak.get("Cell Reception Quality") or peak.get("Cell Reception") or peak.get("cell"))
    bailout = _to_str(peak.get("Emergency Bailout Options") or peak.get("Emergency Bailout") or peak.get("bailout"))
    scramble = _to_str(peak.get("Scramble Sections") or peak.get("Scramble") or peak.get("scramble"))
    terrain = _to_str(peak.get("Terrain Character") or peak.get("Terrain") or peak.get("terrain"))

    # Above treeline / high exposure
    if _contains_any(exposure_level, ["high", "very high"]) or _contains_any(terrain, ["above treeline", "alpine", "fully exposed"]):
        factors.add("AboveTreelineExposure")
        triggers.append({"field": "Exposure Level", "value": exposure_level})
        triggers.append({"field": "Terrain Character", "value": terrain})

    # Severe weather
    if _contains_any(weather_rating, ["high", "very high", "hurricane-force", "dangerous"]):
        factors.add("SevereWeather")
        triggers.append({"field": "Weather Exposure Rating", "value": weather_rating})

    # Long bailout
    if _contains_any(bailout, ["none", "no short", "must retreat", "long", "miles"]) or _contains_any(cell, ["none"]):
        if _contains_any(bailout, ["none", "no short", "must retreat", "long", "miles"]):
            factors.add("LongBailout")
            triggers.append({"field": "Emergency Bailout Options", "value": bailout})

    # Limited water
    if _contains_any(water_avail, ["limited", "none", "carry", "no reliable", "filter"]):
        factors.add("LimitedWater")
        triggers.append({"field": "Water Availability", "value": water_avail})

    # No cell service
    if _contains_any(cell, ["none", "no", "poor", "spotty", "limited"]):
        factors.add("NoCellService")
        triggers.append({"field": "Cell Reception Quality", "value": cell})

    # Scramble / steep
    if _contains_any(scramble, ["scramble", "chimney", "ladder", "slide", "steep"]) or _contains_any(terrain, ["slide", "ledg", "scrambl"]):
        factors.add("ScrambleSteep")
        triggers.append({"field": "Scramble Sections", "value": scramble})
        triggers.append({"field": "Terrain Character", "value": terrain})

    # Unbridged crossings
    if _contains_any(terrain, ["stream crossing", "river crossing", "ford", "wade"]) or _contains_any(water_avail, ["brook crossing", "stream crossing", "ford"]):
        factors.add("UnbridgedRiverCrossings")
        triggers.append({"field": "Terrain Character", "value": terrain})

    # Navigation: above-treeline or (no cell + long bailout)
    if "AboveTreelineExposure" in factors or ("NoCellService" in factors and "LongBailout" in factors):
        factors.add("Navigation")
        triggers.append({"field": "Derived", "value": "Navigation added due to AboveTreelineExposure or (NoCellService+LongBailout)"})

    ordered = [f for f in RISK_FACTOR_ENUM if f in factors]
    return ordered, triggers

def build_prep_notes(peak: Dict[str, Any], risk_factors: List[str]) -> str:
    parts: List[str] = []

    water_avail = _to_str(peak.get("Water Availability") or peak.get("water"))
    cell = _to_str(peak.get("Cell Reception Quality") or peak.get("cell"))
    bailout = _to_str(peak.get("Emergency Bailout Options") or peak.get("bailout"))

    if "AboveTreelineExposure" in risk_factors or "SevereWeather" in risk_factors:
        parts.append("Check a summit forecast and carry windproof/warm layers; be prepared to turn around if visibility or lightning risk increases.")

    if "LimitedWater" in risk_factors:
        parts.append("Plan water conservatively (often 2-4L in warm weather) and do not assume reliable sources late in the hike.")

    if "NoCellService" in risk_factors:
        parts.append("Download offline maps and do not rely on cell service; leave a plan with someone.")

    if "LongBailout" in risk_factors and bailout:
        parts.append(_normalize_spaces(bailout))

    if not parts:
        parts.append("Carry the 10 essentials and prepare for rapid weather changes and slower travel on rough footing.")

    note = " ".join(parts)
    return _normalize_spaces(note)[:420]

def build_risk_evidence(user_peak_name: str, peak: Dict[str, Any], triggers: List[Dict[str, Any]], dataset_source: str) -> List[Dict[str, Any]]:
    evidence: List[Dict[str, Any]] = []
    for t in triggers:
        evidence.append({
            "type": "dataset_field",
            "peak": user_peak_name,
            "field": t.get("field"),
            "value": t.get("value"),
            "source_title": "NH48 JSON dataset",
            "source_url": dataset_source,
        })
    for src in DEFINITION_SOURCES:
        evidence.append({
            "type": "definition_source",
            "source_id": src["id"],
            "title": src["title"],
            "source_url": src["url"],
            "supports": src["supports"],
            "note": src["note"],
        })
    return evidence

def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build NH48 risk schema from nh48 dataset")
    parser.add_argument("--input", "-i", default=NH48_DEFAULT, help="Path or URL to nh48.json (default: data/nh48.json)")
    parser.add_argument("--output", "-o", help="Write JSON output to file (default: stdout)")
    args = parser.parse_args(argv)

    dataset = load_dataset(args.input)
    name_index = build_name_index(dataset)
    dataset_source = args.input if args.input.startswith("http://") or args.input.startswith("https://") else NH48_CANONICAL_URL

    # canonical order provided by user (48 peaks); use a best-effort list
    requested = [
        "Washington","Adams","Jefferson","Monroe","Madison","Lafayette","Lincoln","South Twin","Carter Dome","Moosilauke",
        "Eisenhower","North Twin","Carrigain","Bond","Middle Carter","West Bond","Garfield","Liberty","South Carter",
        "Wildcat A","Hancock","South Kinsman","Field","Osceola","Flume","South Hancock","Pierce","North Carter","Willey",
        "Bondcliff","Zealand","Guyot","Passaconaway","Whiteface","North Tripyramid","Middle Tripyramid","Cabot","East Osceola",
        "Cannon","Hale","Jackson","Tom","Moriah","Galehead","Owl's Head","Isolation","Waumbek","Tecumseh"
    ]

    today = date.today().isoformat()
    out: List[Dict[str, Any]] = []

    for nm in requested:
        try:
            peak = get_peak_obj(name_index, nm)
        except KeyError:
            out.append({
                "mountain": nm,
                "risk_factors": [],
                "prep_notes": "Dataset entry not found; manual review required.",
                "risk_evidence": [],
                "risk_review": {"status": "missing_dataset", "confidence": 0.0, "last_reviewed": today},
            })
            continue

        factors, triggers = assign_risk_factors(peak)
        prep = build_prep_notes(peak, factors)

        out.append({
            "mountain": nm,
            "risk_factors": factors,
            "prep_notes": prep,
            "risk_evidence": build_risk_evidence(nm, peak, triggers, dataset_source),
            "risk_review": {"status": "generated", "confidence": 0.8 if triggers else 0.5, "last_reviewed": today},
        })

    text = json.dumps(out, indent=2, ensure_ascii=True)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text)
            f.write("\n")
    else:
        sys.stdout.write(text)
        sys.stdout.write("\n")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
