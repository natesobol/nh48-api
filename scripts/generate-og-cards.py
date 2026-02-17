#!/usr/bin/env python3
"""Build-time Open Graph card generator for NH48 routes.

This script generates 1200x630 JPEG social cards under photos/og/*,
writes a route manifest at data/og-cards.json, and patches OG/Twitter
meta tags for static pages that are not worker SSR-managed.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, urlunparse
from urllib.request import Request, urlopen

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as exc:  # pragma: no cover - explicit runtime guidance
    raise SystemExit(
        "Pillow is required. Install with `python -m pip install pillow` and re-run."
    ) from exc


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_BASE_URL = "https://nh48.info"
DEFAULT_SITEMAP_PATH = ROOT / "page-sitemap.xml"
DEFAULT_MANIFEST_PATH = ROOT / "data" / "og-cards.json"
DEFAULT_OUTPUT_DIR = ROOT / "photos" / "og"
DEFAULT_OVERRIDES_PATH = ROOT / "data" / "og-card-overrides.json"

OG_WIDTH = 1200
OG_HEIGHT = 630
MAX_JPEG_BYTES = 500 * 1024

SECTION_ROUTE_RE = re.compile(r"^/(?:fr/)?trails/[^/]+/sections/[^/]+/?$", re.IGNORECASE)
LOC_RE = re.compile(r"<loc>([^<]+)</loc>", re.IGNORECASE)
TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
ATTR_RE = re.compile(r"([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(\"([^\"]*)\"|'([^']*)')")
META_TAG_RE = re.compile(r"<meta\b[^>]*>", re.IGNORECASE)

ROUTE_TEMPLATE_HINTS = {
    "/": "pages/index.html",
    "/catalog": "catalog/index.html",
    "/catalog/ranges": "catalog/ranges/index.html",
    "/photos": "photos/index.html",
    "/trails": "trails/index.html",
    "/long-trails": "long-trails/index.html",
    "/dataset": "dataset/index.html",
    "/dataset/wmnf-trails": "dataset/wmnf-trails/index.html",
    "/dataset/long-trails": "dataset/long-trails/index.html",
    "/dataset/howker-plants": "dataset/howker-plants/index.html",
    "/plant-catalog": "pages/plant_catalog.html",
    "/bird-catalog": "pages/bird_catalog.html",
    "/projects/hrt-info": "pages/hrt_info.html",
    "/projects/plant-map": "pages/projects/plant-map.html",
    "/projects/howker-map-editor": "pages/projects/howker-map-editor.html",
    "/howker-ridge": "pages/howker_ridge.html",
    "/howker-ridge/poi": "pages/howker_poi.html",
    "/virtual-hike": "pages/virtual_hike.html",
    "/submit-edit": "pages/submit_edit.html",
    "/peakid-game": "peakid-game.html",
    "/timed-peakid-game": "timed-peakid-game.html",
    "/pages/puzzle-game.html": "pages/puzzle-game.html",
    "/nh-4000-footers-info": "nh-4000-footers-info.html",
    "/about": "pages/about.html",
    "/wiki": "pages/wiki/index.html",
    "/wiki/diseases": "pages/wiki/diseases/index.html",
    "/wiki/plant-diseases": "pages/wiki/plant-disease.html",
    "/nh48-planner.html": "nh48-planner.html",
}

STATIC_META_PATCH_ROUTES = {
    "/nh48-planner.html": "nh48-planner.html",
    "/peakid-game": "peakid-game.html",
    "/timed-peakid-game": "timed-peakid-game.html",
    "/pages/puzzle-game.html": "pages/puzzle-game.html",
}


@dataclass
class CardSpec:
    route: str
    family: str
    category: str
    slug: str
    title: str
    source_image: str
    source_alt: str
    headline: str
    used_fallback: bool


class OgCardGenerator:
    def __init__(self, *, base_url: str, output_dir: Path, manifest_path: Path, overrides: dict[str, Any]):
        self.base_url = base_url.rstrip("/")
        self.output_dir = output_dir
        self.manifest_path = manifest_path
        self.overrides = overrides or {}
        self.default_images = self.overrides.get("defaultImages", {})
        self.route_overrides = self.overrides.get("routeOverrides", {})
        self.trail_fallback_by_slug = self.overrides.get("trailFallbackBySlug", {})

        self.image_cache: dict[str, Image.Image] = {}
        self.template_meta_cache: dict[str, dict[str, str]] = {}

        self.peaks_by_slug: dict[str, dict[str, Any]] = {}
        self.peaks_by_name: dict[str, dict[str, Any]] = {}
        self.ranges_by_slug: dict[str, dict[str, Any]] = {}
        self.howker_plants_by_slug: dict[str, dict[str, Any]] = {}
        self.trails_by_slug: dict[str, dict[str, Any]] = {}
        self.wiki_mountain_sets: dict[str, dict[str, Any]] = {}
        self.wiki_mountain_data: dict[str, dict[str, Any]] = {}
        self.wiki_plants_by_slug: dict[str, dict[str, Any]] = {}
        self.wiki_animals_by_slug: dict[str, dict[str, Any]] = {}
        self.wiki_diseases_by_slug: dict[str, dict[str, Any]] = {}

        self.font_headline = self._load_font(size=54, bold=True)
        self.font_brand = self._load_font(size=34, bold=True)

    def load_data(self) -> None:
        self._load_peak_data()
        self._load_range_data()
        self._load_howker_plants()
        self._load_long_trails()
        self._load_wiki_data()

    def _load_json(self, path: Path, default: Any) -> Any:
        if not path.exists():
            return default
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _load_peak_data(self) -> None:
        raw = self._load_json(ROOT / "data" / "nh48.json", {})
        entries: list[dict[str, Any]] = []
        if isinstance(raw, dict):
            for key, value in raw.items():
                if isinstance(value, dict):
                    entry = dict(value)
                    entry.setdefault("_key", key)
                    entries.append(entry)
        elif isinstance(raw, list):
            entries = [dict(item) for item in raw if isinstance(item, dict)]

        for entry in entries:
            slug = normalize_slug(
                entry.get("slug")
                or entry.get("slug_en")
                or entry.get("Slug")
                or entry.get("_key")
            )
            if not slug:
                continue
            self.peaks_by_slug[slug] = entry
            name = normalize_name_key(
                entry.get("peakName") or entry.get("name") or entry.get("Peak Name") or slug
            )
            if name and name not in self.peaks_by_name:
                self.peaks_by_name[name] = entry

    def _load_range_data(self) -> None:
        raw = self._load_json(ROOT / "data" / "wmnf-ranges.json", {})
        if not isinstance(raw, dict):
            return
        for key, value in raw.items():
            if not isinstance(value, dict):
                continue
            slug = normalize_slug(value.get("slug") or key)
            if slug:
                self.ranges_by_slug[slug] = value

    def _load_howker_plants(self) -> None:
        raw = self._load_json(ROOT / "data" / "howker-plants", [])
        if not isinstance(raw, list):
            return
        for item in raw:
            if not isinstance(item, dict):
                continue
            slug = normalize_slug(item.get("id") or item.get("slug"))
            if slug:
                self.howker_plants_by_slug[slug] = item

    def _load_long_trails(self) -> None:
        raw = self._load_json(ROOT / "data" / "long-trails-index.json", {})
        trails = raw.get("trails", []) if isinstance(raw, dict) else raw if isinstance(raw, list) else []
        for item in trails:
            if not isinstance(item, dict):
                continue
            slug = normalize_slug(item.get("slug") or item.get("id"), keep_underscore=True)
            if not slug:
                continue
            existing = self.trails_by_slug.get(slug, {})
            merged = dict(existing)
            merged.update(item)
            self.trails_by_slug[slug] = merged

    def _load_wiki_data(self) -> None:
        sets = self._load_json(ROOT / "data" / "wiki" / "mountain-sets.json", {})
        if isinstance(sets, dict):
            self.wiki_mountain_sets = sets

        for set_slug, set_meta in self.wiki_mountain_sets.items():
            if not isinstance(set_meta, dict):
                continue
            data_file = set_meta.get("dataFile")
            if not isinstance(data_file, str) or not data_file.strip():
                continue
            path = ROOT / data_file.strip().lstrip("/").replace("\\", "/")
            payload = self._load_json(path, {})
            if not isinstance(payload, dict):
                continue
            self.wiki_mountain_data[normalize_slug(set_slug)] = payload

        wiki_plants = self._load_json(ROOT / "data" / "wiki" / "plants.json", [])
        if isinstance(wiki_plants, list):
            for item in wiki_plants:
                if not isinstance(item, dict):
                    continue
                slug = normalize_slug(item.get("slug") or item.get("id"))
                if slug:
                    self.wiki_plants_by_slug[slug] = item

        wiki_animals = self._load_json(ROOT / "data" / "wiki" / "animals.json", [])
        if isinstance(wiki_animals, list):
            for item in wiki_animals:
                if not isinstance(item, dict):
                    continue
                slug = normalize_slug(item.get("slug") or item.get("id"))
                if slug:
                    self.wiki_animals_by_slug[slug] = item

        disease_payload = self._load_json(ROOT / "data" / "wiki" / "plant-disease.json", {})
        diseases = []
        if isinstance(disease_payload, list):
            diseases = disease_payload
        elif isinstance(disease_payload, dict):
            diseases = disease_payload.get("diseases", []) if isinstance(disease_payload.get("diseases"), list) else []
        for item in diseases:
            if not isinstance(item, dict):
                continue
            slug = normalize_slug(item.get("slug") or item.get("id") or item.get("name"))
            if slug:
                self.wiki_diseases_by_slug[slug] = item

    def parse_route_inventory(self, sitemap_path: Path, extras: list[str]) -> list[str]:
        if not sitemap_path.exists():
            raise FileNotFoundError(f"Sitemap not found: {sitemap_path}")
        xml_text = sitemap_path.read_text(encoding="utf-8")
        routes: list[str] = []
        for match in LOC_RE.finditer(xml_text):
            loc = html.unescape(match.group(1).strip())
            if not loc:
                continue
            try:
                parsed = urlparse(loc)
                route = normalize_route_path(parsed.path)
            except Exception:
                continue
            if SECTION_ROUTE_RE.match(route):
                continue
            routes.append(route)

        for extra in extras:
            route = normalize_route_path(extra)
            if not SECTION_ROUTE_RE.match(route):
                routes.append(route)

        seen: set[str] = set()
        unique_routes: list[str] = []
        for route in routes:
            if route in seen:
                continue
            seen.add(route)
            unique_routes.append(route)
        return unique_routes

    def resolve_route_asset_key(self, route: str) -> str:
        override = self.route_overrides.get(route, {})
        if route.startswith("/fr") and override.get("unique"):
            return route
        if route == "/fr":
            return "/"
        if route.startswith("/fr/"):
            return normalize_route_path(route[3:])
        return route

    def resolve_card_spec(self, route: str) -> CardSpec:
        family, category, slug = classify_route(route)
        route_override = self.route_overrides.get(route, {})
        category = safe_slug(route_override.get("category") or category) or "pages"
        slug = safe_slug(route_override.get("slug") or slug) or "card"

        source_image = str(route_override.get("sourceImage") or "").strip()
        source_alt = str(route_override.get("imageAlt") or "").strip()
        title = ""
        used_fallback = False

        if family == "peak":
            peak_slug = normalize_slug(route.split("/", 2)[2])
            peak = self.peaks_by_slug.get(peak_slug)
            if peak:
                title = normalize_text(peak.get("peakName") or peak.get("name") or peak.get("Peak Name"))
                if not source_image:
                    picked = pick_photo_source(peak.get("photos"), prefer_second=True)
                    if picked:
                        source_image, source_alt = picked

        elif family == "range":
            range_slug = normalize_slug(route.split("/", 2)[2])
            range_entry = self.ranges_by_slug.get(range_slug)
            if range_entry:
                title = normalize_text(range_entry.get("rangeName") or humanize_slug(range_slug))
                if not source_image:
                    picked = pick_photo_source(range_entry.get("photos"))
                    if picked:
                        source_image, source_alt = picked
                if not source_image:
                    highest = normalize_name_key((range_entry.get("highestPoint") or {}).get("peakName"))
                    peak = self.peaks_by_name.get(highest)
                    if peak:
                        picked = pick_photo_source(peak.get("photos"), prefer_second=True)
                        if picked:
                            source_image, source_alt = picked

        elif family == "plant":
            plant_slug = normalize_slug(route.split("/", 2)[2])
            plant = self.howker_plants_by_slug.get(plant_slug)
            if plant:
                title = normalize_text(plant.get("common") or plant.get("latin") or humanize_slug(plant_slug))
                if not source_image:
                    imgs = plant.get("imgs")
                    if isinstance(imgs, list) and imgs:
                        source_image = normalize_text(imgs[0])
                        source_alt = source_alt or title

        elif family == "trail-detail":
            trail_slug = normalize_slug(route.split("/", 2)[2], keep_underscore=True)
            trail = self.trails_by_slug.get(trail_slug, {})
            title = normalize_text(trail.get("name") or humanize_slug(trail_slug))
            if not source_image:
                source_image = normalize_text(self.trail_fallback_by_slug.get(trail_slug))
                source_alt = source_alt or f"{title} trail overview"

        elif family == "wiki-mountain":
            parts = route.split("/")
            set_slug = normalize_slug(parts[3])
            entry_slug = normalize_slug(parts[4])
            dataset = self.wiki_mountain_data.get(set_slug, {})
            entry = resolve_wiki_entry(dataset, entry_slug)
            if entry:
                title = normalize_text(entry.get("peakName") or entry.get("Peak Name") or humanize_slug(entry_slug))
                if not source_image:
                    picked = pick_photo_source(entry.get("photos"))
                    if picked:
                        source_image, source_alt = picked

        elif family == "wiki-plant":
            plant_slug = normalize_slug(route.split("/", 3)[3])
            entry = self.wiki_plants_by_slug.get(plant_slug)
            if entry:
                title = normalize_text(entry.get("commonName") or entry.get("scientificName") or humanize_slug(plant_slug))
                if not source_image:
                    picked = pick_photo_source(entry.get("photos"))
                    if picked:
                        source_image, source_alt = picked

        elif family == "wiki-animal":
            animal_slug = normalize_slug(route.split("/", 3)[3])
            entry = self.wiki_animals_by_slug.get(animal_slug)
            if entry:
                title = normalize_text(entry.get("commonName") or entry.get("scientificName") or humanize_slug(animal_slug))
                if not source_image:
                    picked = pick_photo_source(entry.get("photos"))
                    if picked:
                        source_image, source_alt = picked

        elif family == "wiki-disease":
            disease_slug = normalize_slug(route.split("/", 3)[3])
            entry = self.wiki_diseases_by_slug.get(disease_slug)
            if entry:
                title = normalize_text(entry.get("name") or entry.get("scientific_name") or humanize_slug(disease_slug))
                if not source_image:
                    picked = pick_photo_source(entry.get("photos"))
                    if picked:
                        source_image, source_alt = picked

        if not title:
            hint = self.read_template_meta(route)
            title = hint.get("title") or title_from_route(route)

        if not source_image:
            hint = self.read_template_meta(route)
            if hint.get("og_image"):
                source_image = hint["og_image"]
                source_alt = source_alt or hint.get("og_image_alt", "")

        if not source_image:
            fallback_key = family_to_fallback_key(family)
            source_image = normalize_text(self.default_images.get(fallback_key))
            source_alt = source_alt or title
            used_fallback = True

        if not source_image:
            source_image = normalize_text(self.default_images.get("global"))
            source_alt = source_alt or title
            used_fallback = True

        if not source_image:
            raise ValueError(f"Unable to resolve OG source image for route {route}")

        headline = normalize_text(route_override.get("headline"))
        if not headline:
            headline = build_default_headline(family, title)

        return CardSpec(
            route=route,
            family=family,
            category=category,
            slug=slug,
            title=title,
            source_image=source_image,
            source_alt=source_alt or title,
            headline=headline,
            used_fallback=used_fallback,
        )

    def read_template_meta(self, route: str) -> dict[str, str]:
        if route in self.template_meta_cache:
            return self.template_meta_cache[route]
        template_path = ROUTE_TEMPLATE_HINTS.get(route)
        if not template_path:
            self.template_meta_cache[route] = {}
            return {}
        file_path = ROOT / template_path
        if not file_path.exists():
            self.template_meta_cache[route] = {}
            return {}
        html_text = file_path.read_text(encoding="utf-8", errors="replace")
        title_match = TITLE_RE.search(html_text)
        title = normalize_text(html.unescape(title_match.group(1))) if title_match else ""

        og_image = ""
        og_image_alt = ""
        for tag_match in META_TAG_RE.finditer(html_text):
            tag = tag_match.group(0)
            attrs = parse_attributes(tag)
            prop = attrs.get("property", "").lower()
            name = attrs.get("name", "").lower()
            content = normalize_text(html.unescape(attrs.get("content", "")))
            if prop == "og:image" and content:
                og_image = content
            elif prop == "og:image:alt" and content:
                og_image_alt = content
            elif name == "twitter:image" and content and not og_image:
                og_image = content
            elif name == "twitter:image:alt" and content and not og_image_alt:
                og_image_alt = content

        parsed = {
            "title": title,
            "og_image": og_image,
            "og_image_alt": og_image_alt,
        }
        self.template_meta_cache[route] = parsed
        return parsed

    def load_source_image(self, source_url: str) -> Image.Image:
        source_url = normalize_text(source_url)
        if not source_url:
            raise ValueError("Empty source URL")

        candidates = [strip_cloudflare_transform(source_url), source_url]
        deduped: list[str] = []
        for candidate in candidates:
            if candidate and candidate not in deduped:
                deduped.append(candidate)

        for candidate in deduped:
            if candidate in self.image_cache:
                return self.image_cache[candidate].copy()
            try:
                image = self._fetch_image(candidate)
                self.image_cache[candidate] = image
                return image.copy()
            except Exception:
                continue

        raise RuntimeError(f"Unable to fetch source image: {source_url}")

    def _fetch_image(self, url: str) -> Image.Image:
        parsed = urlparse(url)
        local_candidate = ROOT / parsed.path.lstrip("/")
        if parsed.scheme in ("https", "http") and parsed.hostname in {"nh48.info", "www.nh48.info"}:
            if local_candidate.exists() and local_candidate.is_file():
                with local_candidate.open("rb") as handle:
                    data = handle.read()
                image = Image.open(BytesIO(data))
                image.load()
                return image.convert("RGBA")

        request = Request(
            url,
            headers={
                "User-Agent": "NH48-OG-Generator/1.0",
                "Accept": "image/*,*/*;q=0.8",
            },
        )
        with urlopen(request, timeout=45) as response:
            data = response.read()
        image = Image.open(BytesIO(data))
        image.load()
        return image.convert("RGBA")

    def render_card(self, source_image: Image.Image, headline: str) -> bytes:
        card = Image.new("RGBA", (OG_WIDTH, OG_HEIGHT), (0, 0, 0, 0))
        fit = cover_resize(source_image, OG_WIDTH, OG_HEIGHT)
        card.paste(fit, (0, 0))
        card = add_bottom_gradient(card)

        draw = ImageDraw.Draw(card)
        text_max_width = OG_WIDTH - 88
        text_x = 44
        lines = wrap_and_clamp_text(
            draw=draw,
            text=headline,
            font=self.font_headline,
            max_width=text_max_width,
            max_lines=2,
        )
        line_height = int(self.font_headline.size * 1.12)
        text_block_height = max(1, len(lines)) * line_height
        text_y = OG_HEIGHT - 38 - text_block_height

        for idx, line in enumerate(lines):
            y = text_y + idx * line_height
            draw.text((text_x + 2, y + 2), line, fill=(0, 0, 0, 192), font=self.font_headline)
            draw.text((text_x, y), line, fill=(255, 255, 255, 242), font=self.font_headline)

        brand_text = "NH48.info"
        brand_width = int(measure_text(draw, brand_text, self.font_brand))
        brand_height = int(self.font_brand.size * 0.95)
        brand_x = OG_WIDTH - brand_width - 32
        brand_y = OG_HEIGHT - brand_height - 24
        draw.text((brand_x + 1, brand_y + 1), brand_text, fill=(0, 0, 0, 128), font=self.font_brand)
        draw.text((brand_x, brand_y), brand_text, fill=(170, 255, 198, 192), font=self.font_brand)

        rgb = card.convert("RGB")
        best = b""
        for quality in (88, 84, 80, 76, 72, 68, 64, 60, 56):
            buffer = BytesIO()
            rgb.save(
                buffer,
                format="JPEG",
                quality=quality,
                optimize=True,
                progressive=True,
                subsampling="4:2:0",
            )
            payload = buffer.getvalue()
            best = payload
            if len(payload) <= MAX_JPEG_BYTES:
                return payload
        return best

    def write_cards(self, route_specs: dict[str, CardSpec]) -> tuple[dict[str, dict[str, str]], list[str]]:
        self.output_dir.mkdir(parents=True, exist_ok=True)
        generated: dict[str, dict[str, str]] = {}
        warnings: list[str] = []

        for asset_route, spec in route_specs.items():
            source_url = spec.source_image
            source_alt = spec.source_alt
            try:
                source_image = self.load_source_image(source_url)
            except Exception:
                fallback_key = family_to_fallback_key(spec.family)
                fallback_url = normalize_text(self.default_images.get(fallback_key) or self.default_images.get("global"))
                if not fallback_url or fallback_url == source_url:
                    raise
                source_url = fallback_url
                source_alt = source_alt or spec.title
                source_image = self.load_source_image(source_url)
                warnings.append(f"{asset_route} -> source fetch failed; used fallback ({source_url})")

            payload = self.render_card(source_image, spec.headline)
            digest = hashlib.sha256(payload).hexdigest()[:8]

            target_dir = self.output_dir / safe_slug(spec.category)
            target_dir.mkdir(parents=True, exist_ok=True)
            file_path = target_dir / f"{safe_slug(spec.slug)}.jpg"
            file_path.write_bytes(payload)

            rel_path = file_path.relative_to(ROOT).as_posix()
            image_url = f"{self.base_url}/{rel_path}?v={digest}"
            generated[asset_route] = {
                "image": image_url,
                "imageAlt": source_alt or spec.title,
                "headline": spec.headline,
                "sourceImage": strip_cloudflare_transform(source_url),
                "hash": digest,
            }
            if spec.used_fallback:
                warnings.append(f"{asset_route} -> fallback source used ({spec.source_image})")
        return generated, warnings

    def write_manifest(
        self,
        *,
        version: str,
        route_to_asset: dict[str, str],
        generated_assets: dict[str, dict[str, str]],
    ) -> dict[str, Any]:
        cards: dict[str, dict[str, str]] = {}
        for route in sorted(route_to_asset.keys()):
            asset_route = route_to_asset[route]
            if asset_route not in generated_assets:
                raise RuntimeError(f"Missing generated card for route {route} (asset route: {asset_route})")
            cards[route] = generated_assets[asset_route]

        manifest = {
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "version": version,
            "cards": cards,
        }
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
        self.manifest_path.write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf-8")
        return manifest

    def patch_static_meta_tags(self, manifest: dict[str, Any]) -> list[str]:
        patched_files: list[str] = []
        cards = manifest.get("cards", {})
        for route, rel_file in STATIC_META_PATCH_ROUTES.items():
            entry = cards.get(route)
            if not isinstance(entry, dict):
                continue
            file_path = ROOT / rel_file
            if not file_path.exists():
                continue

            html_text = file_path.read_text(encoding="utf-8")
            original = html_text
            canonical_url = f"{self.base_url}{route}"
            image_url = normalize_text(entry.get("image"))
            image_alt = normalize_text(entry.get("imageAlt"))
            if not image_url:
                continue

            html_text = upsert_meta_tag(html_text, attr_name="property", attr_value="og:image", content=image_url)
            html_text = upsert_meta_tag(html_text, attr_name="property", attr_value="og:image:alt", content=image_alt)
            html_text = upsert_meta_tag(html_text, attr_name="property", attr_value="og:url", content=canonical_url)
            html_text = upsert_meta_tag(html_text, attr_name="name", attr_value="twitter:image", content=image_url)
            html_text = upsert_meta_tag(html_text, attr_name="name", attr_value="twitter:image:alt", content=image_alt)
            html_text = upsert_meta_tag(html_text, attr_name="name", attr_value="twitter:url", content=canonical_url)
            html_text = upsert_canonical_link(html_text, canonical_url)

            if html_text != original:
                file_path.write_text(html_text, encoding="utf-8")
                patched_files.append(rel_file)
        return patched_files

    def _load_font(self, *, size: int, bold: bool) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
        candidates = []
        if bold:
            candidates.extend(
                [
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
                    "C:/Windows/Fonts/arialbd.ttf",
                ]
            )
        else:
            candidates.extend(
                [
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                    "C:/Windows/Fonts/arial.ttf",
                ]
            )
        for path in candidates:
            if os.path.exists(path):
                try:
                    return ImageFont.truetype(path, size=size)
                except Exception:
                    continue
        return ImageFont.load_default()


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def normalize_route_path(path: str) -> str:
    parsed = urlparse(path)
    clean = parsed.path if parsed.scheme else path
    clean = normalize_text(clean)
    if not clean:
        return "/"
    if not clean.startswith("/"):
        clean = f"/{clean}"
    clean = re.sub(r"/+", "/", clean)
    if len(clean) > 1 and clean.endswith("/"):
        clean = clean[:-1]
    return clean


def normalize_slug(value: Any, *, keep_underscore: bool = False) -> str:
    text = normalize_text(value).lower()
    if not text:
        return ""
    allowed = r"[^a-z0-9_-]+" if keep_underscore else r"[^a-z0-9-]+"
    text = re.sub(allowed, "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text


def safe_slug(value: Any) -> str:
    return normalize_slug(value, keep_underscore=True).replace("_", "-")


def normalize_name_key(value: Any) -> str:
    text = normalize_text(value).lower()
    if not text:
        return ""
    return re.sub(r"[^a-z0-9]+", "", text)


def humanize_slug(value: str) -> str:
    slug = normalize_text(value).replace("_", " ").replace("-", " ")
    slug = re.sub(r"\s+", " ", slug).strip()
    return " ".join(part.capitalize() for part in slug.split())


def parse_attributes(tag: str) -> dict[str, str]:
    attrs: dict[str, str] = {}
    for match in ATTR_RE.finditer(tag):
        key = match.group(1).lower()
        value = match.group(3) if match.group(3) is not None else match.group(4) or ""
        attrs[key] = value
    return attrs


def measure_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> float:
    if hasattr(draw, "textlength"):
        return float(draw.textlength(text, font=font))
    bbox = draw.textbbox((0, 0), text, font=font)
    return float(max(0, bbox[2] - bbox[0]))


def wrap_and_clamp_text(
    *,
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.ImageFont,
    max_width: int,
    max_lines: int,
) -> list[str]:
    words = [w for w in normalize_text(text).split() if w]
    if not words:
        return [""]

    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if measure_text(draw, candidate, font) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)

    if len(lines) <= max_lines:
        return lines

    trimmed = lines[:max_lines]
    last = trimmed[-1]
    while last and measure_text(draw, f"{last}...", font) > max_width:
        if " " in last:
            last = last.rsplit(" ", 1)[0]
        else:
            last = last[:-1]
    trimmed[-1] = f"{last.rstrip(' ,.;:-')}..." if last else "..."
    return trimmed


def cover_resize(image: Image.Image, width: int, height: int) -> Image.Image:
    src_w, src_h = image.size
    if src_w <= 0 or src_h <= 0:
        raise ValueError("Invalid source image dimensions")
    scale = max(width / src_w, height / src_h)
    new_w = max(width, int(round(src_w * scale)))
    new_h = max(height, int(round(src_h * scale)))
    resized = image.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = max(0, (new_w - width) // 2)
    top = max(0, (new_h - height) // 2)
    return resized.crop((left, top, left + width, top + height))


def add_bottom_gradient(image: Image.Image) -> Image.Image:
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    width, height = image.size
    start = int(height * 0.7)
    span = max(1, height - start)
    for y in range(start, height):
        alpha = int(204 * ((y - start) / span))
        draw.line([(0, y), (width, y)], fill=(0, 0, 0, alpha))
    return Image.alpha_composite(image.convert("RGBA"), overlay)


def strip_cloudflare_transform(url: str) -> str:
    url = normalize_text(url)
    if not url:
        return ""
    try:
        parsed = urlparse(url)
    except Exception:
        return url
    marker = "/cdn-cgi/image/"
    if marker not in parsed.path:
        return url
    tail = parsed.path.split(marker, 1)[1]
    if "/" not in tail:
        return url
    _, original_path = tail.split("/", 1)
    rebuilt = parsed._replace(path=f"/{original_path}")
    return urlunparse(rebuilt)


def pick_photo_source(photos: Any, *, prefer_second: bool = False) -> tuple[str, str] | None:
    if not isinstance(photos, list) or not photos:
        return None
    normalized: list[tuple[str, str]] = []
    for item in photos:
        if isinstance(item, str):
            url = normalize_text(item)
            if url:
                normalized.append((url, ""))
            continue
        if not isinstance(item, dict):
            continue
        url = normalize_text(item.get("url") or item.get("contentUrl") or item.get("src"))
        if not url:
            continue
        alt = normalize_text(
            item.get("alt")
            or item.get("altText")
            or item.get("caption")
            or item.get("title")
            or item.get("description")
        )
        normalized.append((url, alt))
    if not normalized:
        return None
    if prefer_second and len(normalized) > 1 and normalized[1][0]:
        return normalized[1]
    return normalized[0]


def resolve_wiki_entry(dataset: dict[str, Any], slug: str) -> dict[str, Any] | None:
    if slug in dataset and isinstance(dataset[slug], dict):
        return dataset[slug]
    for value in dataset.values():
        if not isinstance(value, dict):
            continue
        candidate = normalize_slug(value.get("slug") or value.get("peakSlug"))
        if candidate == slug:
            return value
    return None


def classify_route(route: str) -> tuple[str, str, str]:
    parts = [p for p in route.split("/") if p]
    if route == "/":
        return "home", "pages", "home"
    if route == "/photos":
        return "photos", "photos", "photos"
    if route in {"/catalog", "/catalog/ranges"}:
        slug = "peak-catalog" if route == "/catalog" else "range-catalog"
        return "catalog", "catalog", slug
    if route == "/trails":
        return "trails-home", "trails", "trails-map"
    if route == "/long-trails":
        return "long-trails-home", "trails", "long-trails-map"
    if route == "/dataset":
        return "dataset-home", "dataset", "dataset-home"
    if route == "/plant-catalog":
        return "plant-catalog", "plants", "plant-catalog"
    if route == "/bird-catalog":
        return "bird-catalog", "birds", "bird-catalog"
    if route.startswith("/peak/") and len(parts) >= 2:
        return "peak", "peaks", parts[1]
    if route.startswith("/range/") and len(parts) >= 2:
        return "range", "ranges", parts[1]
    if route.startswith("/plant/") and len(parts) >= 2:
        return "plant", "plants", parts[1]
    if route.startswith("/bird/") and len(parts) >= 2:
        return "bird", "birds", parts[1]
    if route.startswith("/trails/") and len(parts) >= 2:
        return "trail-detail", "trails", parts[1]
    if route.startswith("/dataset/") and len(parts) >= 2:
        return "dataset-detail", "dataset", parts[1]
    if route.startswith("/wiki/mountains/") and len(parts) >= 4:
        return "wiki-mountain", "wiki-mountains", f"{parts[2]}-{parts[3]}"
    if route.startswith("/wiki/plants/") and len(parts) >= 3:
        return "wiki-plant", "wiki-plants", parts[2]
    if route.startswith("/wiki/animals/") and len(parts) >= 3:
        return "wiki-animal", "wiki-animals", parts[2]
    if route.startswith("/wiki/plant-diseases/") and len(parts) >= 3:
        return "wiki-disease", "wiki", parts[2]
    if route == "/wiki":
        return "wiki-home", "wiki", "wiki-home"
    if route == "/wiki/diseases":
        return "wiki-diseases-home", "wiki", "wiki-diseases"
    if route == "/wiki/plant-diseases":
        return "wiki-plant-diseases-home", "wiki", "wiki-plant-diseases"
    if route in {"/peakid-game", "/timed-peakid-game", "/pages/puzzle-game.html"}:
        return "game", "games", parts[-1].replace(".html", "")
    if route.startswith("/projects/"):
        return "project", "projects", parts[1] if len(parts) > 1 else "project"
    if route in {"/howker-ridge", "/howker-ridge/poi"}:
        return "howker", "projects", parts[-1]
    if route in {"/about", "/submit-edit", "/virtual-hike", "/nh-4000-footers-info", "/nh48-planner.html"}:
        return "page", "pages", parts[-1]
    return "page", "pages", route.strip("/") or "home"


def title_from_route(route: str) -> str:
    if route == "/":
        return "NH48"
    segment = route.strip("/").split("/")[-1]
    if not segment:
        return "NH48"
    segment = segment.replace(".html", "")
    return humanize_slug(segment)


def family_to_fallback_key(family: str) -> str:
    mapping = {
        "home": "homepage",
        "peak": "peak",
        "range": "range",
        "plant": "plant",
        "photos": "photos",
        "wiki-home": "wiki",
        "wiki-diseases-home": "wiki",
        "wiki-plant-diseases-home": "wiki",
        "wiki-mountain": "wiki",
        "wiki-plant": "wiki",
        "wiki-animal": "wiki",
        "wiki-disease": "wiki",
        "trail-detail": "trail",
        "trails-home": "trail",
        "long-trails-home": "long-trails",
        "dataset-home": "dataset",
        "dataset-detail": "dataset",
        "catalog": "peak",
        "plant-catalog": "howker",
        "bird": "howker",
        "bird-catalog": "howker",
        "project": "howker",
        "howker": "howker",
        "game": "game",
    }
    return mapping.get(family, "global")


def build_default_headline(family: str, title: str) -> str:
    title = normalize_text(title) or "NH48"
    if family == "peak":
        return f"View more hiking details about {title} in the White Mountains"
    if family == "range":
        if re.search(r"\brange\b", title, flags=re.IGNORECASE):
            return f"Explore hiking peaks in the {title}"
        return f"Explore hiking peaks in the {title} Range"
    if family in {"trail-detail", "trails-home", "long-trails-home"}:
        return f"Discover the {title} in the White Mountains"
    if family in {"plant", "plant-catalog"}:
        return f"Explore the flora along the Howker Ridge Trail: {title}"
    if family in {"bird", "bird-catalog"}:
        return f"Explore New Hampshire birds: {title}"
    if family == "photos":
        return "Browse photos of New Hampshire's 4,000-footers"
    if family in {"dataset-home", "dataset-detail"}:
        return "Access NH48 data and maps"
    if family == "game":
        return "Test your knowledge of the NH48 peaks"
    if family.startswith("wiki"):
        return f"Explore the White Mountain Wiki: {title}"
    return f"Plan your NH48 hikes with our comprehensive guide: {title}"


def upsert_meta_tag(html_text: str, *, attr_name: str, attr_value: str, content: str) -> str:
    escaped_content = html.escape(content, quote=True)
    new_tag = f'  <meta {attr_name}="{attr_value}" content="{escaped_content}">'
    pattern = re.compile(
        rf"<meta\b[^>]*{attr_name}\s*=\s*['\"]{re.escape(attr_value)}['\"][^>]*>",
        re.IGNORECASE,
    )
    if pattern.search(html_text):
        return pattern.sub(new_tag, html_text, count=1)
    return html_text.replace("</head>", f"{new_tag}\n</head>", 1)


def upsert_canonical_link(html_text: str, canonical_url: str) -> str:
    escaped_url = html.escape(canonical_url, quote=True)
    new_tag = f'  <link rel="canonical" href="{escaped_url}">'
    pattern = re.compile(r"<link\b[^>]*rel\s*=\s*['\"]canonical['\"][^>]*>", re.IGNORECASE)
    if pattern.search(html_text):
        return pattern.sub(new_tag, html_text, count=1)
    return html_text.replace("</head>", f"{new_tag}\n</head>", 1)


def resolve_git_version(default: str = "dev") -> str:
    try:
        completed = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
        )
        value = normalize_text(completed.stdout)
        return value or default
    except Exception:
        return default


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate OG social cards + manifest for NH48 routes.")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Canonical site origin.")
    parser.add_argument("--sitemap", default=str(DEFAULT_SITEMAP_PATH), help="Path to page sitemap XML.")
    parser.add_argument("--manifest-out", default=str(DEFAULT_MANIFEST_PATH), help="Output manifest path.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="OG image output directory.")
    parser.add_argument("--overrides", default=str(DEFAULT_OVERRIDES_PATH), help="Overrides JSON path.")
    parser.add_argument("--version", default="", help="Manifest version identifier (default: git short SHA).")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    overrides_path = Path(args.overrides)
    overrides = {}
    if overrides_path.exists():
        overrides = json.loads(overrides_path.read_text(encoding="utf-8"))

    generator = OgCardGenerator(
        base_url=args.base_url,
        output_dir=Path(args.output_dir),
        manifest_path=Path(args.manifest_out),
        overrides=overrides,
    )
    generator.load_data()

    routes = generator.parse_route_inventory(
        sitemap_path=Path(args.sitemap),
        extras=["/nh48-planner.html"],
    )
    if not routes:
        raise RuntimeError("No routes resolved from sitemap inventory.")

    route_to_asset: dict[str, str] = {}
    asset_specs: dict[str, CardSpec] = {}
    for route in routes:
        asset_route = generator.resolve_route_asset_key(route)
        route_to_asset[route] = asset_route
        if asset_route not in asset_specs:
            asset_specs[asset_route] = generator.resolve_card_spec(asset_route)

    generated_assets, fallback_warnings = generator.write_cards(asset_specs)
    version = args.version or resolve_git_version()
    manifest = generator.write_manifest(
        version=version,
        route_to_asset=route_to_asset,
        generated_assets=generated_assets,
    )
    patched_files = generator.patch_static_meta_tags(manifest)

    print(f"Generated OG cards for {len(asset_specs)} unique route assets ({len(routes)} routes).")
    print(f"Manifest written: {Path(args.manifest_out).as_posix()}")
    if patched_files:
        print("Patched static OG meta tags:")
        for rel in patched_files:
            print(f"- {rel}")
    if fallback_warnings:
        print(f"Fallback image used for {len(fallback_warnings)} route(s):")
        for warning in fallback_warnings[:40]:
            print(f"- {warning}")
        if len(fallback_warnings) > 40:
            print(f"- ... {len(fallback_warnings) - 40} more")


if __name__ == "__main__":
    main()
