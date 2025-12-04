import os
import json
import argparse
from typing import List, Dict, Optional

# We use Pillow (PIL) for reading image metadata.  The standard library
# `PIL.Image` module can extract EXIF information from JPG and some other
# formats without requiring any third‑party packages.  EXIF tags give
# access to the camera settings (e.g. ISO, exposure time, aperture) and
# timestamps when the picture was taken.  If new images use a different
# file type that lacks EXIF data, these fields will simply remain empty.
from PIL import Image, ExifTags

# -----------------------------------------------------------------------------
# Helper functions
#
# The functions below provide robust extraction of metadata from image files.
# They rely on the Pillow (PIL) library to read EXIF tags from JPEG (and some
# other formats) and to derive additional fields from these tags.  If a given
# field is absent in the image's metadata then a sensible default (usually
# ``None``) is returned.  Season and time‑of‑day are derived from the capture
# timestamp when available.

def _convert_fraction(value) -> Optional[float]:
    """Convert a Pillow EXIF rational into a float. Returns None on error."""
    try:
        # PIL may give us a tuple for rational numbers (numerator, denominator)
        if isinstance(value, tuple) and len(value) == 2:
            num, den = value
            if den != 0:
                return float(num) / float(den)
        # Some EXIF tags are returned as ``IFDRational`` objects which
        # implement the float interface directly.
        return float(value)
    except Exception:
        return None


def _extract_photo_metadata(file_path: str) -> Dict[str, Optional[str]]:
    """
    Extract metadata from an image file.  Returns a dictionary with keys for
    captureDate, season, timeOfDay, orientation, cameraMaker, cameraModel,
    camera, lens, fStop, shutterSpeed, iso, exposureBias, focalLength,
    flashMode.

    Parameters
    ----------
    file_path : str
        Absolute or relative path to the image file on disk.

    Returns
    -------
    Dict[str, Optional[str]]
        A dictionary of metadata entries.  Values may be ``None`` if the
        corresponding EXIF tag is not present.
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
        # Additional metadata fields
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
            # Determine basic orientation from image dimensions
            width, height = img.size
            if width == height:
                meta['orientation'] = 'square'
            elif width > height:
                meta['orientation'] = 'landscape'
            else:
                meta['orientation'] = 'portrait'

            # Save dimensions as a string (e.g. "8688 x 5792")
            try:
                meta['dimensions'] = f"{width} x {height}"
            except Exception:
                pass

            exif_data = img._getexif() or {}
            # Map EXIF tag ids to names
            exif = {ExifTags.TAGS.get(k, k): v for k, v in exif_data.items() if k in ExifTags.TAGS}

            # Capture date/time
            dt = None
            for tag in ('DateTimeOriginal', 'DateTimeDigitized', 'DateTime'):
                if tag in exif:
                    try:
                        # EXIF date/time format: "YYYY:MM:DD HH:MM:SS"
                        from datetime import datetime
                        dt = datetime.strptime(str(exif[tag]), "%Y:%m:%d %H:%M:%S")
                        break
                    except Exception:
                        dt = None
            if dt:
                # ISO 8601 string
                meta['captureDate'] = dt.isoformat()
                # Derive season based on month
                m = dt.month
                if m in (12, 1, 2):
                    meta['season'] = 'winter'
                elif m in (3, 4, 5):
                    meta['season'] = 'spring'
                elif m in (6, 7, 8):
                    meta['season'] = 'summer'
                else:
                    meta['season'] = 'fall'
                # Derive time of day based on hour
                h = dt.hour
                if 4 <= h < 7:
                    meta['timeOfDay'] = 'sunrise'
                elif 7 <= h < 17:
                    meta['timeOfDay'] = 'day'
                elif 17 <= h < 20:
                    meta['timeOfDay'] = 'sunset'
                else:
                    meta['timeOfDay'] = 'night'

            # Camera make/model
            make = exif.get('Make')
            model = exif.get('Model')
            if make:
                meta['cameraMaker'] = str(make).strip()
            if model:
                meta['cameraModel'] = str(model).strip()
            if make or model:
                # Combine make and model into a single camera field
                camera_parts = []
                if make:
                    camera_parts.append(str(make).strip())
                if model:
                    # Avoid duplicate maker in model (e.g. "Canon Canon EOS...")
                    m_lower = str(model).strip().lower()
                    if not (make and m_lower.startswith(str(make).strip().lower())):
                        camera_parts.append(str(model).strip())
                meta['camera'] = ' '.join(camera_parts)

            # Lens information (may be absent on some cameras)
            lens = exif.get('LensModel')
            if lens:
                meta['lens'] = str(lens).strip()

            # Aperture (FNumber)
            fnum = exif.get('FNumber')
            fval = _convert_fraction(fnum) if fnum is not None else None
            if fval:
                meta['fStop'] = f"f/{fval:.1f}" if fval >= 1 else f"f/{1/fval:.1f}"

            # Shutter speed / exposure time
            exposure_time = exif.get('ExposureTime')
            exp_val = _convert_fraction(exposure_time) if exposure_time is not None else None
            if exp_val:
                # Represent as fraction if less than 1 second; else as integer seconds
                if exp_val >= 1.0:
                    meta['shutterSpeed'] = f"{int(round(exp_val))} sec"
                else:
                    # Convert to fraction string; try to find simple denominator
                    import fractions
                    frac = fractions.Fraction(exp_val).limit_denominator(1000)
                    meta['shutterSpeed'] = f"{frac.numerator}/{frac.denominator} sec"

            # ISO
            iso = exif.get('ISOSpeedRatings') or exif.get('PhotographicSensitivity')
            if iso:
                if isinstance(iso, (tuple, list)) and len(iso) > 0:
                    meta['iso'] = str(iso[0])
                else:
                    meta['iso'] = str(iso)

            # Exposure bias
            bias = exif.get('ExposureBiasValue')
            bias_val = _convert_fraction(bias) if bias is not None else None
            if bias_val is not None:
                meta['exposureBias'] = f"{bias_val:+.1f} EV"

            # Focal length
            fl = exif.get('FocalLength')
            fl_val = _convert_fraction(fl) if fl is not None else None
            if fl_val:
                meta['focalLength'] = f"{fl_val:.0f} mm"

            # Flash information
            flash = exif.get('Flash')
            # According to the EXIF spec, 0 means no flash, >0 means flash fired
            if flash is not None:
                try:
                    # Some values are ints; others are strings
                    flash_int = int(flash)
                    if flash_int == 0:
                        meta['flashMode'] = 'No flash'
                    else:
                        meta['flashMode'] = 'Flash fired'
                except Exception:
                    meta['flashMode'] = str(flash)

            # Metering mode
            mmode = exif.get('MeteringMode')
            if mmode is not None:
                # EXIF standard enumerates modes; we provide numeric value as string
                try:
                    meta['meteringMode'] = str(int(mmode))
                except Exception:
                    meta['meteringMode'] = str(mmode)

            # Maximum aperture value
            max_aperture = exif.get('MaxApertureValue')
            max_ap_val = _convert_fraction(max_aperture) if max_aperture is not None else None
            if max_ap_val:
                # Convert to f/ number using 2^(Av/2) where Av is APEX value for max aperture
                # According to EXIF spec: Av = APEX*2
                try:
                    # Some cameras store MaxApertureValue as APEX units (AV) = log2(f^2)
                    import math
                    f_number = math.pow(2, max_ap_val / 2.0)
                    meta['maxAperture'] = f"f/{f_number:.1f}"
                except Exception:
                    pass

            # Focal length in 35mm film
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

            # Author/Artist metadata
            author = exif.get('Artist') or exif.get('Copyright')
            if author:
                meta['author'] = str(author).strip()

            # Image title and subject
            title_tag = exif.get('ImageDescription')
            if title_tag:
                meta['title'] = str(title_tag).strip()
            subject_tag = exif.get('XPSubject') or exif.get('Subject')
            if subject_tag:
                # XPSubject may be stored as a byte array; decode if necessary
                try:
                    if isinstance(subject_tag, bytes):
                        meta['subject'] = subject_tag.decode('utf-16le', errors='ignore').rstrip('\x00')
                    else:
                        meta['subject'] = str(subject_tag)
                except Exception:
                    meta['subject'] = str(subject_tag)

            # Rating (EXIF or XMP rating)
            rating_tag = exif.get('Rating') or exif.get('XPRating')
            if rating_tag:
                try:
                    meta['rating'] = str(int(rating_tag))
                except Exception:
                    meta['rating'] = str(rating_tag)

            # Filesystem metadata: file size, creation, modification times
            try:
                stat_info = os.stat(file_path)
                # File size in bytes (convert to MB with two decimals)
                size_bytes = stat_info.st_size
                meta['fileSize'] = f"{size_bytes / (1024 * 1024):.2f} MB"
                # Creation and modification dates (if available on platform)
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
        # On any failure, return what we have; missing metadata remains None
        pass
    return meta

def generate_manifest(api_json_path: str,
                      photos_root: str,
                      base_url: str,
                      update_only_new: bool = False) -> Dict:
    """
    Generates or updates the 'photos' arrays for each peak in the API JSON.

    :param api_json_path: Path to the input API JSON file (e.g. nh48_api_merged.json).
    :param photos_root: Root directory containing subfolders named by slug. Each subfolder contains photos.
    :param base_url: Base URL for constructing public URLs of photos. The final URL will be f"{base_url}/{slug}/{filename}".
    :param update_only_new: If True, existing photo entries in the JSON will be preserved and only new photo files
                            found in the folder structure will be appended. If False, the photos arrays are replaced.
    :return: Updated JSON data structure with photos arrays populated.
    """
    # Load the existing API JSON
    with open(api_json_path, 'r') as f:
        data = json.load(f)

    # Iterate through each peak slug in the JSON
    for slug, peak in data.items():
        photos_dir = os.path.join(photos_root, slug)
        found_entries: List[Dict] = []

        # If the directory for this slug exists, scan for images and extract EXIF metadata.
        if os.path.isdir(photos_dir):
            for entry in sorted(os.listdir(photos_dir)):
                lower = entry.lower()
                # Recognise common image formats
                if lower.endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif')):
                    filename: str = entry
                    # Construct a unique photoId: slug + filename stem
                    photo_id: str = f"{slug}__{os.path.splitext(entry)[0]}"
                    url: str = f"{base_url}/{slug}/{filename}"

                    # Determine file path to read EXIF data
                    file_path: str = os.path.join(photos_dir, filename)

                    # Helper: read image dimensions and EXIF metadata (if available)
                    meta = _extract_photo_metadata(file_path)

                    # Determine orientation.  We prefer the EXIF orientation tag if present; otherwise
                    # fall back to comparing width/height.  If the filename contains hints
                    # ("portrait", "square", etc.) those override the computed orientation.
                    orientation: str = meta.get('orientation', 'landscape')
                    name_lower = filename.lower()
                    if 'portrait' in name_lower or 'vertical' in name_lower:
                        orientation = 'portrait'
                    elif 'square' in name_lower or '1x1' in name_lower:
                        orientation = 'square'

                    # Derive season and timeOfDay from captureDate if possible.
                    season: Optional[str] = meta.get('season')
                    time_of_day: Optional[str] = meta.get('timeOfDay')

                    # Assemble the photo entry.  Additional EXIF metadata fields such as
                    # camera, lens, fStop, shutterSpeed, iso, focalLength and captureDate
                    # are included if present.  Any missing values remain None.
                    photo_entry: Dict[str, Optional[str]] = {
                        "photoId": photo_id,
                        "filename": filename,
                        "url": url,
                        "alt": "",  # Placeholder: to be updated manually for accessibility.
                        "caption": "",  # Placeholder: descriptive caption may be added manually.
                        "season": season,
                        "timeOfDay": time_of_day,
                        "orientation": orientation,
                        "tags": [slug],  # Tag with the peak slug; can be extended manually later.
                        "isPrimary": False  # Set manually to True on one photo per peak for primary display.
                    }

                    # Inject EXIF and derived metadata into the photo entry.  Only include fields that
                    # are not None.  This includes both standard EXIF fields and additional values
                    # such as metering mode, maximum aperture, 35mm equivalent focal length, author,
                    # title/subject, rating, image dimensions, file size and timestamps.
                    for key in (
                        'captureDate', 'cameraMaker', 'cameraModel', 'camera', 'lens',
                        'fStop', 'shutterSpeed', 'iso', 'exposureBias', 'focalLength', 'flashMode',
                        'meteringMode', 'maxAperture', 'focalLength35mm', 'author', 'title',
                        'subject', 'rating', 'dimensions', 'fileSize', 'fileCreateDate', 'fileModifiedDate'
                    ):
                        value = meta.get(key)
                        if value is not None:
                            photo_entry[key] = value

                    found_entries.append(photo_entry)

        # Update the 'photos' array in the JSON for this peak
        if update_only_new and 'photos' in peak:
            # Preserve existing entries; append new ones that don't already exist by photoId
            existing_ids = {p.get('photoId') for p in peak.get('photos', [])}
            new_entries = [e for e in found_entries if e['photoId'] not in existing_ids]
            peak['photos'].extend(new_entries)
        else:
            # Replace or initialise photos array
            peak['photos'] = found_entries

        # Guarantee slug and peakName fields exist
        peak['slug'] = slug
        if 'peakName' not in peak and 'Peak Name' in peak:
            peak['peakName'] = peak['Peak Name']

    return data

def main():
    parser = argparse.ArgumentParser(description="Generate or update photo manifests for NH48 peaks.")
    parser.add_argument("--api", required=True, help="Path to the input API JSON file (e.g. nh48_api_merged.json).")
    parser.add_argument("--photos", required=True, help="Root directory containing photos organised by slug.")
    parser.add_argument("--base-url", required=True, help="Base URL for public access to photos (e.g. https://cdn.jsdelivr.net/gh/user/repo/photos).")
    parser.add_argument("--output", required=True, help="Path to write the updated API JSON file.")
    parser.add_argument("--append", action="store_true", help="If set, existing photos arrays are preserved and new photo files are appended.")
    args = parser.parse_args()

    updated = generate_manifest(args.api, args.photos, args.base_url, update_only_new=args.append)
    with open(args.output, 'w') as out_file:
        json.dump(updated, out_file, indent=2)
    print(f"Manifest updated successfully. Output written to {args.output}")

if __name__ == "__main__":
    main()
