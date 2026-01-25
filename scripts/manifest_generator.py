def _is_numeric_only(value) -> bool:
    """Return True if the value is a string and only contains digits (ignoring whitespace)."""
    return isinstance(value, str) and value.strip().isdigit()
"""Enhanced manifest generator for the NH48 photo API.

This script extends the original manifest generator by automatically
populating additional metadata fields based on the image file itself.
It attempts to derive sensible default values for the ``alt`` and
``caption`` fields using EXIF ``ImageDescription`` or ``XPSubject``
metadata when available, falling back to the cleaned file name when
those tags are absent.  It also sets the first photo found for each
peak as the primary image if one has not already been flagged and
augments the tags list with season, time of day and orientation
keywords.  All existing EXIF metadata extraction behaviour is retained.

Usage:
    python manifest_generator_modified.py --api data/nh48.json --photos photos \
        --base-url https://photos.example.com --output out.json
"""

import argparse
import json
import os
import re
import subprocess
from typing import Dict, List, Optional

from PIL import ExifTags, Image

DEFAULT_PHOTO_BASE_URL = os.getenv(
    "PHOTO_BASE_URL",
    "https://photos.nh48.info",
)

# Fallback IPTC/XMP values used when metadata cannot be found in the image
# These values come from the supplied screenshot and are applied when Bridge
# metadata is absent or empty for a given field.
FALLBACK_KEYWORDS = [
    "White Mountain National Forest",
    "WMNF",
    "New Hampshire mountains",
    "Maine mountains",
    "White Mountains",
    "Appalachian Trail",
    "Franconia Range",
    "Pemigewasset Wilderness",
    "Franconia Notch",
    "Kancamagus Highway",
    "4,000-footers",
    "hiking trails",
    "landscape photography",
    "mountain photography",
    "scenic views",
    "alpine peaks",
]
FALLBACK_IPTC_SUBJECT_CODE = "06007000"
FALLBACK_INTELLECTUAL_GENRE = "Travel / Nature / Landscape"


def _pick_first(raw: Dict[str, object], keys: List[str]) -> Optional[object]:
    """Return the first non-empty value for the provided keys."""

    for key in keys:
        if key in raw and raw[key] not in (None, ""):
            return raw[key]
    return None


def _normalize_keywords(value: object) -> List[str]:
    """Normalize Bridge keywords into a list of unique, trimmed strings."""
    keywords: List[str] = []
    if isinstance(value, list):
        for item in value:
            if isinstance(item, str):
                keywords.extend(re.split(r"[,;]", item))
            else:
                keywords.append(str(item))
    elif isinstance(value, str):
        keywords.extend(re.split(r"[,;]", value))
    normalized = [kw.strip() for kw in keywords if kw and kw.strip()]
    seen = set()
    unique_keywords: List[str] = []
    for kw in normalized:
        if kw not in seen:
            seen.add(kw)
            unique_keywords.append(kw)
    return unique_keywords


def _collect_location(raw: Dict[str, object], prefixes: List[str]) -> Dict[str, str]:
    """Collect location fields from Bridge metadata using namespace prefixes."""

    location = {
        "sublocation": "",
        "city": "",
        "provinceState": "",
        "countryName": "",
        "countryIsoCode": "",
        "worldRegion": "",
    }
    suffix_map = {
        "sublocation": "sublocation",
        "city": "city",
        "province": "provinceState",
        "state": "provinceState",
        "countryname": "countryName",
        "countrycode": "countryIsoCode",
        "worldregion": "worldRegion",
    }

    for key, value in raw.items():
        key_lower = key.lower()
        for prefix in prefixes:
            if key_lower.startswith(prefix.lower()):
                for suffix, target in suffix_map.items():
                    if key_lower.endswith(suffix):
                        if isinstance(value, list):
                            value = value[0] if value else ""
                        location[target] = str(value) if value is not None else ""
                        break

    # Fallback to Photoshop keys if still empty
    if not location["city"]:
        city = _pick_first(raw, ["XMP-photoshop:City"])
        if city:
            location["city"] = city
    if not location["provinceState"]:
        state_val = _pick_first(raw, ["XMP-photoshop:State"])
        if state_val:
            location["provinceState"] = state_val
    if not location["countryName"]:
        country = _pick_first(raw, ["XMP-photoshop:Country"])
        if country:
            location["countryName"] = country

    for k in location:
        if isinstance(location[k], list):
            location[k] = location[k][0] if location[k] else ""
        if location[k] is None:
            location[k] = ""
        else:
            location[k] = str(location[k])

    # Hard-code canonical region fields for these photos. Prefer Bridge values
    # when present for other fields, but ensure these geographic fields are
    # consistently set for the White Mountains corpus.
    location["city"] = "White Mountain National Forest"
    location["provinceState"] = "New Hampshire"
    location["countryName"] = "United States"
    location["countryIsoCode"] = "US"
    location["worldRegion"] = "North America"

    return location


def _read_bridge_xmp(file_path: str, debug: bool = False) -> Dict[str, object]:
    """Read Bridge IPTC/XMP metadata from sidecar or embedded XMP via ExifTool.

    If `debug` is True, the raw ExifTool JSON output will be printed for inspection.
    """

    targets = []
    sidecar_path = f"{file_path}.xmp"
    if os.path.exists(sidecar_path):
        targets.append(sidecar_path)
    targets.append(file_path)

    for target in targets:
        try:
            result = subprocess.run(
                ["exiftool", "-j", "-G1", "-a", "-s", target],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
                text=True,
            )
        except FileNotFoundError:
            return {}
        if result.stdout:
            if debug:
                try:
                    print(f"[DEBUG] ExifTool output for {target}:")
                    print(result.stdout)
                except Exception:
                    pass
            try:
                data = json.loads(result.stdout)
                if isinstance(data, list) and data:
                    if isinstance(data[0], dict):
                        return data[0]
            except Exception:
                return {}
    return {}


def _write_photo_metadata(
    file_path: str,
    headline: str,
    description: str,
    alt_text: str,
    extended_description: str,
    curated_iptc: Dict[str, object],
    tags: Optional[List[str]] = None,
) -> None:
    """
    Persist the selected headline/description/alt/extendedDescription into the photo file.

    Writes directly to the image using ExifTool so the metadata travels with the JPG when
    downloaded. Missing ExifTool or write failures are logged but do not halt generation.
    """

    def _listify(value: object) -> List[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str):
            return [value.strip()] if value.strip() else []
        return [str(value).strip()] if str(value).strip() else []

    # Only write when at least one field is present
    if not any([headline, description, alt_text, extended_description, curated_iptc, tags]):
        return

    args = ["exiftool", "-overwrite_original"]
    if headline:
        args.extend(
            [
                f"-XMP-iptcCore:Headline={headline}",
                f"-IPTC:Headline={headline}",
                f"-XMP-dc:Title={headline}",
            ]
        )
    if description:
        args.extend(
            [
                f"-XMP-iptcCore:Description={description}",
                f"-XMP-dc:Description={description}",
                f"-IPTC:Caption-Abstract={description}",
            ]
        )
    if alt_text:
        args.append(f"-XMP-iptcCore:AltTextAccessibility={alt_text}")
    if extended_description:
        args.append(f"-XMP-iptcCore:ExtDescrAccessibility={extended_description}")

    keywords = _listify(curated_iptc.get("keywords"))
    if tags:
        keywords.extend(_listify(tags))
    seen_keywords = set()
    for keyword in keywords:
        if keyword not in seen_keywords:
            seen_keywords.add(keyword)
            args.append(f"-IPTC:Keywords={keyword}")
            args.append(f"-XMP-dc:Subject={keyword}")

    creator_list = _listify(curated_iptc.get("creator"))
    for creator in creator_list:
        args.append(f"-XMP-dc:Creator={creator}")
        args.append(f"-IPTC:By-line={creator}")

    creator_job_title = curated_iptc.get("creatorJobTitle")
    if creator_job_title:
        args.append(f"-IPTC:By-lineTitle={creator_job_title}")

    credit_line = curated_iptc.get("creditLine")
    if credit_line:
        args.append(f"-XMP-photoshop:Credit={credit_line}")
        args.append(f"-IPTC:Credit={credit_line}")

    source = curated_iptc.get("source")
    if source:
        args.append(f"-XMP-photoshop:Source={source}")
        args.append(f"-IPTC:Source={source}")

    rights = curated_iptc.get("copyrightNotice")
    if rights:
        args.append(f"-XMP-dc:Rights={rights}")
        args.append(f"-IPTC:CopyrightNotice={rights}")

    usage_terms = curated_iptc.get("rightsUsageTerms")
    if usage_terms:
        args.append(f"-XMP-xmpRights:UsageTerms={usage_terms}")

    marked = curated_iptc.get("copyrightStatus")
    if marked:
        args.append(f"-XMP-xmpRights:Marked={marked}")

    intellectual_genre = curated_iptc.get("intellectualGenre")
    if intellectual_genre:
        args.append(f"-IPTC:IntellectualGenre={intellectual_genre}")
        args.append(f"-XMP-iptcCore:IntellectualGenre={intellectual_genre}")

    subject_code = curated_iptc.get("iptcSubjectCode")
    if subject_code:
        args.append(f"-IPTC:SubjectReference={subject_code}")
        args.append(f"-XMP-iptcExt:SubjectCode={subject_code}")

    location_created = curated_iptc.get("locationCreated") or {}
    if isinstance(location_created, dict):
        if location_created.get("sublocation"):
            args.append(
                f"-XMP-iptcExt:LocationCreatedSublocation={location_created['sublocation']}"
            )
        if location_created.get("city"):
            args.append(f"-XMP-iptcExt:LocationCreatedCity={location_created['city']}")
            args.append(f"-XMP-photoshop:City={location_created['city']}")
        if location_created.get("provinceState"):
            args.append(
                f"-XMP-iptcExt:LocationCreatedProvinceState={location_created['provinceState']}"
            )
            args.append(f"-XMP-photoshop:State={location_created['provinceState']}")
        if location_created.get("countryName"):
            args.append(
                f"-XMP-iptcExt:LocationCreatedCountryName={location_created['countryName']}"
            )
            args.append(f"-XMP-photoshop:Country={location_created['countryName']}")
        if location_created.get("countryIsoCode"):
            args.append(
                f"-XMP-iptcExt:LocationCreatedCountryCode={location_created['countryIsoCode']}"
            )
        if location_created.get("worldRegion"):
            args.append(
                f"-XMP-iptcExt:LocationCreatedWorldRegion={location_created['worldRegion']}"
            )

    location_shown = curated_iptc.get("locationShown") or {}
    if isinstance(location_shown, dict):
        if location_shown.get("sublocation"):
            args.append(
                f"-XMP-iptcExt:LocationShownSublocation={location_shown['sublocation']}"
            )
        if location_shown.get("city"):
            args.append(f"-XMP-iptcExt:LocationShownCity={location_shown['city']}")
        if location_shown.get("provinceState"):
            args.append(
                f"-XMP-iptcExt:LocationShownProvinceState={location_shown['provinceState']}"
            )
        if location_shown.get("countryName"):
            args.append(
                f"-XMP-iptcExt:LocationShownCountryName={location_shown['countryName']}"
            )
        if location_shown.get("countryIsoCode"):
            args.append(
                f"-XMP-iptcExt:LocationShownCountryCode={location_shown['countryIsoCode']}"
            )
        if location_shown.get("worldRegion"):
            args.append(
                f"-XMP-iptcExt:LocationShownWorldRegion={location_shown['worldRegion']}"
            )

    featured_org = curated_iptc.get("featuredOrgName")
    if featured_org:
        args.append(f"-XMP-iptcExt:OrganisationInImageName={featured_org}")

    args.append(file_path)

    try:
        result = subprocess.run(
            args,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        print("ExifTool is not installed; skipping write-back of photo metadata.")
        return

    if result.returncode != 0:
        print(
            f"ExifTool failed to update {file_path}: {result.stderr.strip() or 'unknown error'}"
        )


def _curate_bridge_metadata(raw: Dict[str, object]) -> Dict[str, object]:
    """Normalize Bridge metadata into a stable structure for JSON storage."""

    def _extract_alt_text(value: object) -> str:
        if isinstance(value, dict):
            if "en-US" in value:
                return str(value.get("en-US") or "")
            if value:
                first_val = next(iter(value.values()))
                return str(first_val) if first_val is not None else ""
            return ""
        if isinstance(value, list):
            return str(value[0]) if value else ""
        return str(value) if value is not None else ""

    def _extract_extended_description(raw_dict: Dict[str, object]) -> str:
        for key, value in raw_dict.items():
            lower_key = key.lower()
            if (
                "extendeddescription" in lower_key
                or "extdescr" in lower_key
                or ("description" in lower_key and "accessibility" in lower_key)
            ):
                return _extract_alt_text(value)
        return ""

    curated: Dict[str, object] = {
        "creator": "",
        "creatorJobTitle": "",
        "creatorEmail": "",
        "creatorWebsite": "",
        "headline": "",
        "description": "",
        "altText": "",
        "extendedDescription": "",
        "keywords": [],
        "intellectualGenre": "",
        "iptcSubjectCode": "",
        "creditLine": "",
        "source": "",
        "copyrightNotice": "",
        "copyrightStatus": "",
        "rightsUsageTerms": "",
        "locationCreated": {
            "sublocation": "",
            "city": "",
            "provinceState": "",
            "countryName": "",
            "countryIsoCode": "",
            "worldRegion": "",
        },
        "locationShown": {
            "sublocation": "",
            "city": "",
            "provinceState": "",
            "countryName": "",
            "countryIsoCode": "",
            "worldRegion": "",
        },
        "featuredOrgName": "",
    }

    def _find_any_by_substr(keys_substrings: List[str]) -> Optional[object]:
        for key, value in raw.items():
            kl = key.lower()
            for s in keys_substrings:
                if s in kl and value not in (None, ""):
                    return value
        return None


    creator = _pick_first(raw, ["XMP-dc:Creator", "IPTC:By-line"])
    if isinstance(creator, list):
        creator = creator[0] if creator else ""
    # Default to site photographer when Bridge/EXIF doesn't supply a creator
    curated["creator"] = creator or "NATHAN SOBOL"

    curated["creatorJobTitle"] = _pick_first(raw, ["XMP-iptcCore:CreatorJobTitle"]) or ""
    curated["creatorEmail"] = _pick_first(raw, ["XMP-iptcCore:CreatorContactInfoCiEmailWork"]) or ""
    curated["creatorWebsite"] = _pick_first(
        raw,
        ["XMP-iptcCore:CreatorWorkURL", "XMP-iptcCore:CreatorContactInfoCiUrlWork"],
    ) or ""

    # Fallbacks using substring searches for fields that may be stored under
    # different vendor namespaces (Lightroom, Adobe, other XMP schemas).
    if not curated.get("creatorJobTitle"):
        val = _find_any_by_substr(["by-linetitle", "creatorjobtitle", "jobtitle", "by-line-title"])
        if val:
            curated["creatorJobTitle"] = val
    if not curated.get("creatorEmail"):
        val = _find_any_by_substr(["email", "e-mail", "creatorcontactinfo", "creatorcontact"])
        if val:
            curated["creatorEmail"] = val
    if not curated.get("creatorWebsite"):
        val = _find_any_by_substr(["creatorworkurl", "creatorcontactinfo", "website", "url", "uri"])
        if val:
            curated["creatorWebsite"] = val

    curated["headline"] = _pick_first(
        raw,
        [
            "XMP-iptcCore:Headline",
            "XMP-dc:Title",
            "IPTC:Headline",
            "IPTC:ObjectName",
            "XMP-photoshop:Headline",
        ],
    ) or ""

    curated["description"] = _pick_first(
        raw,
        [
            "XMP-iptcCore:Description",
            "XMP-dc:Description",
            "IPTC:Caption-Abstract",
            "IPTC:Caption",
            "XMP-photoshop:Caption",
        ],
    ) or ""

    curated["altText"] = _extract_alt_text(
        _pick_first(
            raw,
            [
                "XMP-iptcCore:AltTextAccessibility",
                "XMP-dc:Title",
                "IPTC:Headline",
                "IPTC:ObjectName",
            ],
        )
    )

    # Prefer explicit extended description tags, then fall back to caption/description
    curated["extendedDescription"] = _extract_extended_description(raw) or _pick_first(
        raw, ["XMP-iptcCore:ExtDescrAccessibility", "XMP-iptcCore:ExtDescr", "IPTC:Caption-Abstract", "XMP-dc:Description"]
    ) or ""

    # Treat numeric-only or trivial numeric Bridge values as absent for SEO purposes.
    for seo_key in ("headline", "description", "altText", "extendedDescription"):
        val = curated.get(seo_key)
        try:
            if isinstance(val, str) and val.strip().isdigit():
                curated[seo_key] = ""
        except Exception:
            pass

    keywords_candidates = []
    kw1 = _pick_first(raw, ["IPTC:Keywords"])
    kw2 = _pick_first(raw, ["XMP-dc:Subject"])
    if kw1 is not None:
        keywords_candidates.append(kw1)
    if kw2 is not None:
        keywords_candidates.append(kw2)
    keywords: List[str] = []
    for candidate in keywords_candidates:
        keywords.extend(_normalize_keywords(candidate))
    # Remove duplicates while preserving order
    seen_kw = set()
    deduped_keywords: List[str] = []
    for kw in keywords:
        if kw not in seen_kw:
            seen_kw.add(kw)
            deduped_keywords.append(kw)
    curated["keywords"] = deduped_keywords

    # Additional keyword sources used by Lightroom/Bridge
    if not curated["keywords"]:
        k = _pick_first(raw, ["XMP-lr:HierarchicalSubject", "XMP-lr:Keywords", "XMP-photoshop:Keywords", "XMP-iptcCore:Subject"])
        if k is not None:
            curated["keywords"] = _normalize_keywords(k)

    curated["intellectualGenre"] = _pick_first(
        raw, ["IPTC:IntellectualGenre", "XMP-iptcCore:IntellectualGenre"]
    ) or ""
    curated["iptcSubjectCode"] = _pick_first(
        raw, ["IPTC:SubjectReference", "XMP-iptcExt:SubjectCode"]
    ) or ""
    # Try additional keys that sometimes carry subject codes
    if not curated["iptcSubjectCode"]:
        val = _find_any_by_substr(["subjectcode", "subjectreference", "subjectref", "subjectcode"]) 
        if val:
            curated["iptcSubjectCode"] = val

    curated["creditLine"] = _pick_first(raw, ["XMP-photoshop:Credit", "IPTC:Credit"]) or ""
    # Fallback to artist/by-line if no explicit credit is set
    if not curated["creditLine"]:
        curated["creditLine"] = _pick_first(raw, ["IFD0:Artist", "IPTC:By-line"]) or ""

    curated["source"] = _pick_first(raw, ["XMP-photoshop:Source", "IPTC:Source"]) or ""
    # Map provenance or derived-from fields to source when present
    if not curated["source"]:
        curated["source"] = _pick_first(raw, ["XMP-dcterms:Provenance", "XMP-dcterms:provenance"]) or _find_any_by_substr(["provenance", "derivedfrom", "origin"]) or ""
    # Additional fallbacks using substring searches
    if not curated["intellectualGenre"]:
        val = _find_any_by_substr(["intellectualgenre", "genre"])
        if val:
            curated["intellectualGenre"] = val
    if not curated["iptcSubjectCode"]:
        val = _find_any_by_substr(["subjectcode", "subjectreference", "subjectref"])
        if val:
            curated["iptcSubjectCode"] = val
    if not curated["creditLine"]:
        val = _find_any_by_substr(["credit", "creditline", "by-line", "by-line"])
        if val:
            curated["creditLine"] = val
    if not curated["source"]:
        val = _find_any_by_substr(["provenance", "source", "derivedfrom", "origin"])
        if val:
            curated["source"] = val
    # If keywords/intellectualGenre/subject code are missing, fill from
    # screenshot-provided fallbacks to ensure manifests have sensible defaults.
    if not curated.get("keywords"):
        curated["keywords"] = FALLBACK_KEYWORDS.copy()
    if not curated.get("iptcSubjectCode"):
        curated["iptcSubjectCode"] = FALLBACK_IPTC_SUBJECT_CODE
    if not curated.get("intellectualGenre"):
        curated["intellectualGenre"] = FALLBACK_INTELLECTUAL_GENRE
    curated["copyrightNotice"] = _pick_first(
        raw, ["IPTC:CopyrightNotice", "XMP-dc:Rights"]
    ) or ""
    # Default copyright notice when absent
    if not curated["copyrightNotice"]:
        curated["copyrightNotice"] = "NEW HAMPSHIRE PHOTOGRAPHY"
    curated["copyrightStatus"] = _pick_first(raw, ["XMP-xmpRights:Marked"]) or ""
    curated["rightsUsageTerms"] = _pick_first(raw, ["XMP-xmpRights:UsageTerms"]) or ""

    curated["locationCreated"] = _collect_location(raw, ["XMP-iptcExt:LocationCreated"])
    curated["locationShown"] = _collect_location(raw, ["XMP-iptcExt:LocationShown"])

    curated["featuredOrgName"] = _pick_first(raw, ["XMP-iptcExt:OrganisationInImageName"]) or ""
    # Force a canonical featured organization for all photos so downstream
    # systems (and the web UI) can rely on a single account handle.
    curated["featuredOrgName"] = "@nate_dumps_pics"

    for key, value in curated.items():
        if key in {"locationCreated", "locationShown", "keywords"}:
            continue
        if isinstance(value, list):
            curated[key] = value[0] if value else ""
        elif value is None:
            curated[key] = ""
        else:
            curated[key] = str(value)

    return curated


def _generate_seo_fields(ctx: Dict[str, str]) -> Dict[str, str]:
    """Generate headline, description, altText, and extendedDescription."""

    peak_name = ctx.get("peakName", "")
    return {
        "headline": f"{peak_name} — White Mountain National Forest (New Hampshire)",
        "description": (
            "A scenic mountain landscape in the White Mountain National Forest of New "
            "Hampshire, featuring {peakName} and surrounding ridgelines. This photograph "
            "highlights rugged terrain, forested slopes, and layered White Mountains "
            "wilderness popular with hikers and peakbaggers."
        ).format(peakName=peak_name),
        "altText": (
            "Forested mountain ridge and summit of {peakName} in the White Mountain "
            "National Forest under a partly cloudy sky."
        ).format(peakName=peak_name),
        "extendedDescription": (
            "This photograph features {peakName} in New Hampshire’s White Mountain "
            "National Forest. The scene shows forested slopes, rocky ridgelines, and "
            "distant mountain ranges fading into the horizon. It reflects the scale and "
            "terrain hikers experience in the White Mountains, home to many of New "
            "Hampshire’s 4,000-foot peaks and backcountry trails."
        ).format(peakName=peak_name),
    }


def _convert_fraction(value) -> Optional[float]:
    """Convert a Pillow EXIF rational into a float. Returns None on error."""
    try:
        if isinstance(value, tuple) and len(value) == 2:
            num, den = value
            if den != 0:
                return float(num) / float(den)
        return float(value)
    except Exception:
        return None


def _extract_photo_metadata(file_path: str) -> Dict[str, Optional[str]]:
    """
    Extract metadata from an image file. See original manifest generator for details.
    Returns a dictionary with various EXIF and filesystem properties. Missing
    fields remain None.
    """
    meta: Dict[str, Optional[str]] = {
        'captureDate': None,
        'season': None,
        'timeOfDay': None,
        'orientation': None,
        'cameraMaker': None,
        'cameraModel': None,
        'camera': None,
        'lens': None,
        'fStop': None,
        'shutterSpeed': None,
        'iso': None,
        'exposureBias': None,
        'focalLength': None,
        'flashMode': None,
        'meteringMode': None,
        'maxAperture': None,
        'focalLength35mm': None,
        'author': None,
        'title': None,
        'subject': None,
        'rating': None,
        'dimensions': None,
        'fileSize': None,
        'fileCreateDate': None,
        'fileModifiedDate': None,
    }
    try:
        with Image.open(file_path) as img:
            width, height = img.size
            if width == height:
                meta['orientation'] = 'square'
            elif width > height:
                meta['orientation'] = 'landscape'
            else:
                meta['orientation'] = 'portrait'
            try:
                meta['dimensions'] = f"{width} x {height}"
            except Exception:
                pass
            exif_data = img._getexif() or {}
            exif = {ExifTags.TAGS.get(k, k): v for k, v in exif_data.items() if k in ExifTags.TAGS}
            dt = None
            for tag in ('DateTimeOriginal', 'DateTimeDigitized', 'DateTime'):
                if tag in exif:
                    try:
                        from datetime import datetime
                        dt = datetime.strptime(str(exif[tag]), "%Y:%m:%d %H:%M:%S")
                        break
                    except Exception:
                        dt = None
            if dt:
                meta['captureDate'] = dt.isoformat()
                m = dt.month
                if m in (12, 1, 2):
                    meta['season'] = 'winter'
                elif m in (3, 4, 5):
                    meta['season'] = 'spring'
                elif m in (6, 7, 8):
                    meta['season'] = 'summer'
                else:
                    meta['season'] = 'fall'
                h = dt.hour
                if 4 <= h < 7:
                    meta['timeOfDay'] = 'sunrise'
                elif 7 <= h < 17:
                    meta['timeOfDay'] = 'day'
                elif 17 <= h < 20:
                    meta['timeOfDay'] = 'sunset'
                else:
                    meta['timeOfDay'] = 'night'
            make = exif.get('Make')
            model = exif.get('Model')
            if make:
                meta['cameraMaker'] = str(make).strip()
            if model:
                meta['cameraModel'] = str(model).strip()
            if make or model:
                camera_parts = []
                if make:
                    camera_parts.append(str(make).strip())
                if model:
                    m_lower = str(model).strip().lower()
                    if not (make and m_lower.startswith(str(make).strip().lower())):
                        camera_parts.append(str(model).strip())
                meta['camera'] = ' '.join(camera_parts)
            lens = exif.get('LensModel')
            if lens:
                meta['lens'] = str(lens).strip()
            fnum = exif.get('FNumber')
            fval = _convert_fraction(fnum) if fnum is not None else None
            if fval:
                meta['fStop'] = f"f/{fval:.1f}" if fval >= 1 else f"f/{1/fval:.1f}"
            exposure_time = exif.get('ExposureTime')
            exp_val = _convert_fraction(exposure_time) if exposure_time is not None else None
            if exp_val:
                if exp_val >= 1.0:
                    meta['shutterSpeed'] = f"{int(round(exp_val))} sec"
                else:
                    import fractions
                    frac = fractions.Fraction(exp_val).limit_denominator(1000)
                    meta['shutterSpeed'] = f"{frac.numerator}/{frac.denominator} sec"
            iso = exif.get('ISOSpeedRatings') or exif.get('PhotographicSensitivity')
            if iso:
                if isinstance(iso, (tuple, list)) and len(iso) > 0:
                    meta['iso'] = str(iso[0])
                else:
                    meta['iso'] = str(iso)
            bias = exif.get('ExposureBiasValue')
            bias_val = _convert_fraction(bias) if bias is not None else None
            if bias_val is not None:
                meta['exposureBias'] = f"{bias_val:+.1f} EV"
            fl = exif.get('FocalLength')
            fl_val = _convert_fraction(fl) if fl is not None else None
            if fl_val:
                meta['focalLength'] = f"{fl_val:.0f} mm"
            flash = exif.get('Flash')
            if flash is not None:
                try:
                    flash_int = int(flash)
                    if flash_int == 0:
                        meta['flashMode'] = 'No flash'
                    else:
                        meta['flashMode'] = 'Flash fired'
                except Exception:
                    meta['flashMode'] = str(flash)
            mmode = exif.get('MeteringMode')
            if mmode is not None:
                try:
                    meta['meteringMode'] = str(int(mmode))
                except Exception:
                    meta['meteringMode'] = str(mmode)
            max_aperture = exif.get('MaxApertureValue')
            max_ap_val = _convert_fraction(max_aperture) if max_aperture is not None else None
            if max_ap_val:
                try:
                    import math
                    f_number = math.pow(2, max_ap_val / 2.0)
                    meta['maxAperture'] = f"f/{f_number:.1f}"
                except Exception:
                    pass
            fl35 = exif.get('FocalLengthIn35mmFilm')
            fl35_val = None
            if fl35 is not None:
                try:
                    fl35_val = int(fl35)
                except Exception:
                    try:
                        fl35_val = int(_convert_fraction(fl35))
                    except Exception:
                        fl35_val = None
            if fl35_val:
                meta['focalLength35mm'] = f"{fl35_val} mm"
            author = exif.get('Artist') or exif.get('Copyright')
            if author:
                meta['author'] = str(author).strip()
            title_tag = exif.get('ImageDescription')
            if title_tag:
                meta['title'] = str(title_tag).strip()
            subject_tag = exif.get('XPSubject') or exif.get('Subject')
            if subject_tag:
                try:
                    if isinstance(subject_tag, bytes):
                        meta['subject'] = subject_tag.decode('utf-16le', errors='ignore').rstrip('\x00')
                    else:
                        meta['subject'] = str(subject_tag)
                except Exception:
                    meta['subject'] = str(subject_tag)
            rating_tag = exif.get('Rating') or exif.get('XPRating')
            if rating_tag:
                try:
                    meta['rating'] = str(int(rating_tag))
                except Exception:
                    meta['rating'] = str(rating_tag)
            try:
                stat_info = os.stat(file_path)
                size_bytes = stat_info.st_size
                meta['fileSize'] = f"{size_bytes / (1024 * 1024):.2f} MB"
                import datetime
                ctime = getattr(stat_info, 'st_ctime', None)
                mtime = getattr(stat_info, 'st_mtime', None)
                if ctime:
                    meta['fileCreateDate'] = datetime.datetime.fromtimestamp(ctime).isoformat()
                if mtime:
                    meta['fileModifiedDate'] = datetime.datetime.fromtimestamp(mtime).isoformat()
            except Exception:
                pass
    except Exception:
        pass
    return meta


def generate_manifest(
    api_json_path: str,
    photos_root: str,
    base_url: str,
    update_only_new: bool = False,
    include_iptc_raw: bool = False,
    bridge_only: bool = False,
    write_photo_metadata: bool = False,
    debug: bool = False,
) -> Dict:
    """
    Generates or updates the 'photos' arrays for each peak in the API JSON.

    Additional behaviour beyond the original:
      * Automatically fills the ``alt`` and ``caption`` fields using
        EXIF ``ImageDescription`` or ``XPSubject`` metadata, or falls back to
        a cleaned file name when those values are absent.
      * Automatically sets ``isPrimary`` to True on the first photo per peak
        when replacing photos (i.e. when not in append mode).
      * Augments the tags list with season, time of day and orientation
        descriptors derived from the photo metadata.
    """
    with open(api_json_path, 'r') as f:
        data = json.load(f)
    bridge_counts = {"headline": 0, "description": 0, "altText": 0, "extendedDescription": 0}
    generated_counts = {"headline": 0, "description": 0, "altText": 0, "extendedDescription": 0}
    total_photos = 0

    for slug, peak in data.items():
        photos_dir = os.path.join(photos_root, slug)
        found_entries: List[Dict] = []
        if os.path.isdir(photos_dir):
            for entry in sorted(os.listdir(photos_dir)):
                lower = entry.lower()
                if lower.endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif')):
                    filename: str = entry
                    photo_id: str = f"{slug}__{os.path.splitext(entry)[0]}"
                    url: str = f"{base_url}/{slug}/{filename}"
                    file_path: str = os.path.join(photos_dir, filename)
                    total_photos += 1
                    meta = _extract_photo_metadata(file_path)
                    orientation: str = meta.get('orientation', 'landscape')
                    name_lower = filename.lower()
                    if 'portrait' in name_lower or 'vertical' in name_lower:
                        orientation = 'portrait'
                    elif 'square' in name_lower or '1x1' in name_lower:
                        orientation = 'square'
                    season: Optional[str] = meta.get('season')
                    time_of_day: Optional[str] = meta.get('timeOfDay')
                    # Derive alt/caption text
                    # Prefer EXIF title or subject; fall back to cleaned file name without slug
                    base_name = os.path.splitext(entry)[0].replace('_', ' ').replace('-', ' ').strip()
                    # Strip slug prefix from base name if present
                    slug_prefix = slug.replace('-', ' ').strip().lower()
                    if base_name.lower().startswith(slug_prefix):
                        base_name = base_name[len(slug_prefix):].strip()

                    # If the candidate is a number (e.g. '001'), use the peakName or slug instead
                    alt_candidate = meta.get('title') or meta.get('subject') or base_name
                    if isinstance(alt_candidate, str):
                        alt_candidate = alt_candidate.strip()
                        # If it's all digits (or just a short number), replace with peakName or slug
                        if alt_candidate.isdigit() or (len(alt_candidate) <= 3 and alt_candidate.replace(' ', '').isdigit()):
                            alt_candidate = peak.get('peakName') or slug.replace('-', ' ').title()
                    else:
                        alt_candidate = peak.get('peakName') or slug.replace('-', ' ').title()

                    raw_bridge = _read_bridge_xmp(file_path, debug=debug)
                    curated_iptc = _curate_bridge_metadata(raw_bridge)

                    if debug:
                        # If curated IPTC fields are empty but raw_bridge contains keys,
                        # print a concise summary to help mapping issues.
                        missing = (
                            not curated_iptc.get("headline")
                            and not curated_iptc.get("description")
                            and not curated_iptc.get("altText")
                            and not curated_iptc.get("extendedDescription")
                        )
                        if missing and raw_bridge:
                            try:
                                keys = list(raw_bridge.keys())
                                print(f"[DEBUG] Raw IPTC/XMP keys for {file_path}: {keys[:40]}")
                            except Exception:
                                pass

                    ctx = {
                        "peakName": peak.get('peakName') or slug.replace('-', ' ').title(),
                        "season": season or "",
                        "timeOfDay": time_of_day or "",
                        "state": "New Hampshire",
                        "viewHint": "",
                    }
                    # Prepare generated SEO fields unless explicitly disabled.
                    generated_fields = {} if bridge_only else _generate_seo_fields(ctx)

                    # For each SEO field, use Bridge value only if not missing, not empty, and not numeric-only
                    def resolve_seo_field(field, alt_candidate):
                        bridge_val = curated_iptc.get(field)
                        template_val = generated_fields.get(field) if generated_fields else None
                        if bridge_val is not None and str(bridge_val).strip() != "" and not _is_numeric_only(bridge_val):
                            return bridge_val, 'bridge'
                        elif template_val is not None and str(template_val).strip() != "":
                            return template_val, 'generated'
                        else:
                            return alt_candidate, 'alt_candidate'

                    headline, headline_src = resolve_seo_field("headline", alt_candidate)
                    description, description_src = resolve_seo_field("description", alt_candidate)
                    alt_text, alt_text_src = resolve_seo_field("altText", alt_candidate)
                    extended_description, extended_description_src = resolve_seo_field("extendedDescription", alt_candidate)

                    # Update counts for reporting
                    for field_key, src in (
                        ("headline", headline_src),
                        ("description", description_src),
                        ("altText", alt_text_src),
                        ("extendedDescription", extended_description_src),
                    ):
                        if src == 'bridge':
                            bridge_counts[field_key] += 1
                        elif src == 'generated':
                            generated_counts[field_key] += 1
                    # Build tags: include slug and derived descriptors
                    tags: List[str] = [slug]
                    if season:
                        tags.append(season)
                    if time_of_day:
                        tags.append(time_of_day)
                    if orientation:
                        tags.append(orientation)
                    photo_entry: Dict[str, Optional[str]] = {
                        "photoId": photo_id,
                        "filename": filename,
                        "url": url,
                        "alt": alt_text or "",
                        "caption": headline or "",
                        "headline": headline or "",
                        "description": description or "",
                        "altText": alt_text or "",
                        "extendedDescription": extended_description or "",
                        "season": season,
                        "timeOfDay": time_of_day,
                        "orientation": orientation,
                        "tags": tags,
                        "isPrimary": False,
                    }
                    # Inject EXIF and derived metadata into photo entry
                    for key in (
                        'captureDate', 'cameraMaker', 'cameraModel', 'camera', 'lens',
                        'fStop', 'shutterSpeed', 'iso', 'exposureBias', 'focalLength', 'flashMode',
                        'meteringMode', 'maxAperture', 'focalLength35mm', 'author', 'title',
                        'subject', 'rating', 'dimensions', 'fileSize', 'fileCreateDate', 'fileModifiedDate'
                    ):
                        value = meta.get(key)
                        if value is not None:
                            photo_entry[key] = value

                    photo_entry["iptc"] = curated_iptc
                    if include_iptc_raw and raw_bridge:
                        photo_entry["iptcRaw"] = raw_bridge

                    if write_photo_metadata:
                        _write_photo_metadata(
                            file_path,
                            headline or "",
                            description or "",
                            alt_text or "",
                            extended_description or "",
                            curated_iptc,
                            tags,
                        )

                    found_entries.append(photo_entry)
        if update_only_new and 'photos' in peak:
            existing_ids = {p.get('photoId') for p in peak.get('photos', [])}
            new_entries = [e for e in found_entries if e['photoId'] not in existing_ids]
            peak['photos'].extend(new_entries)
        else:
            # If replacing the photos array, mark first photo as primary
            if found_entries:
                found_entries[0]['isPrimary'] = True
            peak['photos'] = found_entries
        peak['slug'] = slug
        if 'peakName' not in peak and 'Peak Name' in peak:
            peak['peakName'] = peak['Peak Name']

    if total_photos:
        for field in ("headline", "description", "altText", "extendedDescription"):
            bridge_pct = (bridge_counts[field] / total_photos) * 100
            generated_pct = (generated_counts[field] / total_photos) * 100
            print(
                f"{field}: {bridge_counts[field]} Bridge ({bridge_pct:.1f}%), "
                f"{generated_counts[field]} generated ({generated_pct:.1f}%)",
            )
    return data


def main():
    parser = argparse.ArgumentParser(description="Generate or update photo manifests for NH48 peaks (enhanced version).")
    parser.add_argument("--api", required=True, help="Path to the input API JSON file (e.g. nh48_api_merged.json).")
    parser.add_argument("--photos", required=True, help="Root directory containing photos organised by slug.")
    parser.add_argument(
        "--base-url",
        default=DEFAULT_PHOTO_BASE_URL,
        help=(
            "Base URL for public access to photos "
            "(defaults to PHOTO_BASE_URL env var)."
        ),
    )
    parser.add_argument("--output", required=False, help="Path to write the updated API JSON file. Defaults to the input API file if omitted.")
    parser.add_argument("--append", action="store_true", help="If set, existing photos arrays are preserved and new photo files are appended.")
    parser.add_argument(
        "--include-iptc-raw",
        action="store_true",
        help="Include raw ExifTool IPTC/XMP output in photo entries.",
    )
    parser.add_argument(
        "--bridge-only",
        action="store_true",
        help="Only use Bridge-supplied metadata without generating SEO fields.",
    )
    parser.add_argument(
        "--write-photo-metadata",
        action="store_true",
        help=(
            "Write the resolved headline/description/alt/extendedDescription into the photo file "
            "via ExifTool so downloads include the metadata."
        ),
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Print debug information (raw ExifTool output and key summaries).",
    )
    args = parser.parse_args()
    updated = generate_manifest(
        args.api,
        args.photos,
        args.base_url,
        update_only_new=args.append,
        include_iptc_raw=args.include_iptc_raw,
        bridge_only=args.bridge_only,
        write_photo_metadata=args.write_photo_metadata,
        debug=args.debug,
    )
    output_path = args.output or args.api
    with open(output_path, 'w') as out_file:
        json.dump(updated, out_file, indent=2)
    print(f"Manifest updated successfully. Output written to {output_path}")


if __name__ == "__main__":
    main()
