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


def _pick_first(raw: Dict[str, object], keys: List[str]) -> Optional[object]:
    """Return the first non-empty value for the provided keys."""

    for key in keys:
        if key in raw and raw[key] not in (None, ""):
            return raw[key]
    return None


def _normalize_keywords(value: object) -> List[str]:
    """Normalize Bridge keywords into a list of unique, non-empty strings."""

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
    # Preserve order while removing duplicates
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

    for key in location:
        if isinstance(location[key], list):
            location[key] = location[key][0] if location[key] else ""
        if location[key] is None:
            location[key] = ""
        else:
            location[key] = str(location[key])
    return location


def _read_bridge_xmp(file_path: str) -> Dict[str, object]:
    """Read Bridge IPTC/XMP metadata from sidecar or embedded XMP via ExifTool."""

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
            try:
                data = json.loads(result.stdout)
                if isinstance(data, list) and data:
                    if isinstance(data[0], dict):
                        return data[0]
            except Exception:
                return {}
    return {}


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

    creator = _pick_first(raw, ["XMP-dc:Creator", "IPTC:By-line"])
    if isinstance(creator, list):
        creator = creator[0] if creator else ""
    curated["creator"] = creator or ""

    curated["creatorJobTitle"] = _pick_first(raw, ["XMP-iptcCore:CreatorJobTitle"]) or ""
    curated["creatorEmail"] = _pick_first(raw, ["XMP-iptcCore:CreatorContactInfoCiEmailWork"]) or ""
    curated["creatorWebsite"] = _pick_first(
        raw,
        ["XMP-iptcCore:CreatorWorkURL", "XMP-iptcCore:CreatorContactInfoCiUrlWork"],
    ) or ""

    curated["headline"] = _pick_first(
        raw,
        ["XMP-iptcCore:Headline", "XMP-dc:Title", "IPTC:Headline"],
    ) or ""

    curated["description"] = _pick_first(
        raw,
        ["XMP-iptcCore:Description", "XMP-dc:Description", "IPTC:Caption-Abstract"],
    ) or ""

    curated["altText"] = _extract_alt_text(
        _pick_first(raw, ["XMP-iptcCore:AltTextAccessibility"])
    )

    curated["extendedDescription"] = _extract_extended_description(raw)

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

    curated["intellectualGenre"] = _pick_first(
        raw, ["IPTC:IntellectualGenre", "XMP-iptcCore:IntellectualGenre"]
    ) or ""
    curated["iptcSubjectCode"] = _pick_first(
        raw, ["IPTC:SubjectReference", "XMP-iptcExt:SubjectCode"]
    ) or ""
    curated["creditLine"] = _pick_first(raw, ["XMP-photoshop:Credit", "IPTC:Credit"]) or ""
    curated["source"] = _pick_first(raw, ["XMP-photoshop:Source", "IPTC:Source"]) or ""
    curated["copyrightNotice"] = _pick_first(
        raw, ["IPTC:CopyrightNotice", "XMP-dc:Rights"]
    ) or ""
    curated["copyrightStatus"] = _pick_first(raw, ["XMP-xmpRights:Marked"]) or ""
    curated["rightsUsageTerms"] = _pick_first(raw, ["XMP-xmpRights:UsageTerms"]) or ""

    curated["locationCreated"] = _collect_location(raw, ["XMP-iptcExt:LocationCreated"])
    curated["locationShown"] = _collect_location(raw, ["XMP-iptcExt:LocationShown"])

    curated["featuredOrgName"] = _pick_first(raw, ["XMP-iptcExt:OrganisationInImageName"]) or ""

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
                    alt_candidate = meta.get('title') or meta.get('subject') or base_name
                    alt_candidate = alt_candidate.strip() if isinstance(alt_candidate, str) else ''

                    raw_bridge = _read_bridge_xmp(file_path)
                    curated_iptc = _curate_bridge_metadata(raw_bridge)

                    ctx = {
                        "peakName": peak.get('peakName') or slug.replace('-', ' ').title(),
                        "season": season or "",
                        "timeOfDay": time_of_day or "",
                        "state": "New Hampshire",
                        "viewHint": "",
                    }
                    generated_fields = {} if bridge_only else _generate_seo_fields(ctx)

                    headline = curated_iptc.get("headline") or generated_fields.get("headline") or alt_candidate
                    description = (
                        curated_iptc.get("description")
                        or generated_fields.get("description")
                        or alt_candidate
                    )
                    alt_text = (
                        curated_iptc.get("altText")
                        or generated_fields.get("altText")
                        or alt_candidate
                    )
                    extended_description = (
                        curated_iptc.get("extendedDescription")
                        or generated_fields.get("extendedDescription")
                        or alt_candidate
                    )

                    for field_key, curated_value, generated_value in (
                        ("headline", curated_iptc.get("headline"), generated_fields.get("headline") if generated_fields else None),
                        ("description", curated_iptc.get("description"), generated_fields.get("description") if generated_fields else None),
                        ("altText", curated_iptc.get("altText"), generated_fields.get("altText") if generated_fields else None),
                        (
                            "extendedDescription",
                            curated_iptc.get("extendedDescription"),
                            generated_fields.get("extendedDescription") if generated_fields else None,
                        ),
                    ):
                        if curated_value:
                            bridge_counts[field_key] += 1
                        elif generated_value:
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
    parser.add_argument("--output", required=True, help="Path to write the updated API JSON file.")
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
    args = parser.parse_args()
    updated = generate_manifest(
        args.api,
        args.photos,
        args.base_url,
        update_only_new=args.append,
        include_iptc_raw=args.include_iptc_raw,
        bridge_only=args.bridge_only,
    )
    with open(args.output, 'w') as out_file:
        json.dump(updated, out_file, indent=2)
    print(f"Manifest updated successfully. Output written to {args.output}")


if __name__ == "__main__":
    main()
