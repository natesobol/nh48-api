#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "templates", "peak-page-template.html");
const DATA_PATH = path.join(ROOT, "data", "nh48.json");
const OUTPUT_DIR = path.join(ROOT, "peaks");
const CANONICAL_BASE = "https://nh48.info/peaks";
const APP_BASE = "https://nh48.info/pages/nh48_peak.html";
const FALLBACK_IMAGE = "https://nh48.info/nh48-preview.png";

const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));

const cleanText = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return text.replace(/:contentReference\[[^\]]*\]\{[^}]*\}/g, "").trim();
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const parseCoordinates = (value) => {
  const cleaned = cleanText(value);
  const matches = cleaned.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) {
    return { text: cleaned, latitude: null, longitude: null };
  }
  const [lat, lon] = matches;
  return {
    text: `${lat}, ${lon}`,
    latitude: Number(lat),
    longitude: Number(lon),
  };
};

const pickPrimaryPhoto = (photos, peakName) => {
  if (!Array.isArray(photos) || photos.length === 0) {
    return {
      url: FALLBACK_IMAGE,
      alt: `${peakName} in the White Mountains`,
    };
  }
  const primary = photos.find((photo) => photo.isPrimary) || photos[0];
  const alt = cleanText(primary.alt) || buildPhotoAlt(primary, peakName);
  return { url: primary.url || FALLBACK_IMAGE, alt };
};

const buildPhotoAlt = (photo, peakName) => {
  const tags = Array.isArray(photo.tags) ? photo.tags.filter(Boolean) : [];
  if (tags.length) {
    return `${peakName} - ${tags.join(", ")}`;
  }
  return `${peakName} photo`;
};

const buildRoutesList = (routes) => {
  if (!Array.isArray(routes) || routes.length === 0) {
    return "<li>No standard routes are listed for this peak.</li>";
  }
  return routes
    .map((route) => {
      const name = cleanText(route["Route Name"] || route.name || "Route");
      const distance = cleanText(route["Distance (mi)"] || "");
      const gain = cleanText(route["Elevation Gain (ft)"] || "");
      const difficulty = cleanText(route["Difficulty"] || "");
      const trailType = cleanText(route["Trail Type"] || "");
      const details = [distance && `${distance} mi`, gain && `${gain} ft gain`, trailType, difficulty]
        .filter(Boolean)
        .join(" • ");
      return `<li><strong>${escapeHtml(name)}</strong>${details ? ` — ${escapeHtml(details)}` : ""}</li>`;
    })
    .join("\n");
};

const buildGallery = (photos, peakName) => {
  if (!Array.isArray(photos) || photos.length === 0) {
    return `<img src="${FALLBACK_IMAGE}" alt="${escapeHtml(
      `${peakName} in the White Mountains`
    )}" loading="lazy" />`;
  }
  return photos.slice(0, 4).map((photo) => {
    const alt = cleanText(photo.alt) || buildPhotoAlt(photo, peakName);
    const url = photo.url || FALLBACK_IMAGE;
    return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
  }).join("\n");
};

const buildJsonLd = (peak, canonicalUrl, coordinates) => {
  const name = cleanText(peak["Peak Name"] || peak.peakName || peak.slug);
  const elevation = cleanText(peak["Elevation (ft)"] || "");
  const prominence = cleanText(peak["Prominence (ft)"] || "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Mountain",
    name,
    url: canonicalUrl,
    description: cleanText(peak["View Type"] || peak["Terrain Character"] || "") || `${name} in the White Mountains of New Hampshire.`,
    elevation: elevation ? `${elevation} ft` : undefined,
    prominence: prominence ? `${prominence} ft` : undefined,
    geo: coordinates.latitude && coordinates.longitude ? {
      "@type": "GeoCoordinates",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    } : undefined,
  };
  Object.keys(jsonLd).forEach((key) => jsonLd[key] === undefined && delete jsonLd[key]);
  return JSON.stringify(jsonLd, null, 2);
};

const renderTemplate = (values) => {
  return Object.entries(values).reduce((html, [key, value]) => {
    const safeValue = value === undefined || value === null ? "" : String(value);
    return html.split(`{{${key}}}`).join(safeValue);
  }, template);
};

const slugs = Object.keys(data).sort();
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

slugs.forEach((slug) => {
  const peak = data[slug];
  const name = cleanText(peak["Peak Name"] || peak.peakName || slug);
  const elevation = cleanText(peak["Elevation (ft)"] || "Unknown");
  const prominence = cleanText(peak["Prominence (ft)"] || "Unknown");
  const range = cleanText(peak["Range / Subrange"] || "White Mountains");
  const difficulty = cleanText(peak["Difficulty"] || "Unknown");
  const trailType = cleanText(peak["Trail Type"] || "Unknown");
  const time = cleanText(peak["Typical Completion Time"] || "Varies");
  const summary = cleanText(peak["Terrain Character"] || peak["View Type"] || "");
  const coordinates = parseCoordinates(peak["Coordinates"]);
  const primaryPhoto = pickPrimaryPhoto(peak.photos, name);
  const canonicalUrl = `${CANONICAL_BASE}/${slug}/`;
  const appUrl = `${APP_BASE}?slug=${slug}`;
  const description = `${name} guide with route details, elevation, and photos.`;

  const values = {
    TITLE: escapeHtml(`${name} | NH 48 Peak Guide`),
    DESCRIPTION: escapeHtml(description),
    CANONICAL_URL: canonicalUrl,
    OG_IMAGE: primaryPhoto.url,
    PEAK_NAME: escapeHtml(name),
    ELEVATION: escapeHtml(`${elevation} ft`),
    PROMINENCE: escapeHtml(`${prominence} ft`),
    RANGE: escapeHtml(range),
    DIFFICULTY: escapeHtml(difficulty),
    TRAIL_TYPE: escapeHtml(trailType),
    TIME: escapeHtml(time),
    SUMMARY: escapeHtml(summary || `${name} is one of the classic New Hampshire 4,000-footers.`),
    COORDINATES: escapeHtml(coordinates.text || "Coordinates coming soon."),
    ROUTES_LIST: buildRoutesList(peak["Standard Routes"]),
    GALLERY_IMAGES: buildGallery(peak.photos, name),
    APP_URL: appUrl,
    HERO_IMAGE: primaryPhoto.url,
    HERO_ALT: escapeHtml(primaryPhoto.alt),
    JSON_LD: buildJsonLd(peak, canonicalUrl, coordinates),
  };

  const outputDir = path.join(OUTPUT_DIR, slug);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "index.html"), renderTemplate(values));
  console.log(`Rendered ${slug}`);
});
