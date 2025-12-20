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

process.on("uncaughtException", (err) => {
  console.error("Unhandled error during prerender:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection during prerender:", err);
  process.exit(1);
});

const cleanText = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return text.replace(/:contentReference\[[^\]]*\]\{[^}]*\}/g, "").trim();
};

const numberFrom = (value) => {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
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

const escapeScriptJson = (value) => String(value).replace(/<\/script/gi, "<\\/script");

const buildJsonLd = (peak, canonicalUrl, coordinates, primaryImageUrl, descriptionText, range) => {
  const peakName = cleanText(peak.peakName || peak["Peak Name"] || peak.slug);
  const elevationFt = numberFrom(peak["Elevation (ft)"]);
  const prominenceFt = numberFrom(peak["Prominence (ft)"]);
  const difficulty = cleanText(peak["Difficulty"]);
  const trailType = cleanText(peak["Trail Type"]);
  const additionalProperty = [
    prominenceFt != null
      ? {
        "@type": "PropertyValue",
        name: "Prominence (ft)",
        value: prominenceFt,
        unitText: "FT",
      }
      : null,
    difficulty
      ? {
        "@type": "PropertyValue",
        name: "Difficulty",
        value: difficulty,
      }
      : null,
    range
      ? {
        "@type": "PropertyValue",
        name: "Range / Subrange",
        value: range,
      }
      : null,
    trailType
      ? {
        "@type": "PropertyValue",
        name: "Trail Type",
        value: trailType,
      }
      : null,
  ].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Mountain",
    name: peakName,
    description: descriptionText,
    url: canonicalUrl,
    image: primaryImageUrl ? [primaryImageUrl] : undefined,
    geo: coordinates.latitude && coordinates.longitude
      ? {
        "@type": "GeoCoordinates",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      }
      : undefined,
    elevation: elevationFt != null
      ? {
        "@type": "QuantitativeValue",
        value: elevationFt,
        unitText: "FT",
      }
      : undefined,
    containedInPlace: range
      ? { "@type": "Place", name: "White Mountain National Forest" }
      : undefined,
    additionalProperty: additionalProperty.length ? additionalProperty : undefined,
  };

  Object.keys(jsonLd).forEach((key) => jsonLd[key] === undefined && delete jsonLd[key]);
  return JSON.stringify(jsonLd, null, 2);
};

const TRAIL_KEYWORDS = [
  "Trail",
  "Path",
  "Ridge",
  "Brook",
  "River",
  "Notch",
  "Road",
  "Cutoff",
  "Loop",
  "Slide",
  "Spur",
  "Connector",
];

const extractRelatedTrailNames = (routes) => {
  if (!Array.isArray(routes)) return [];
  const keywords = TRAIL_KEYWORDS.join("|");
  const endPattern = new RegExp(`\\b(?:${keywords})\\b$`, "i");
  const names = new Set();

  routes.forEach((route) => {
    const raw = cleanText(route["Route Name"] || route.name || "");
    if (!raw) return;
    const parts = raw
      .replace(/[()]/g, " ")
      .split(/\s*(?:>|via|to|,|;|\/|&)\s*/i);
    parts.forEach((part) => {
      const cleaned = part.replace(/[^\w\s'-]/g, " ").replace(/\s+/g, " ").trim();
      if (!cleaned) return;
      const words = cleaned.split(" ").filter(Boolean);
      if (words.length < 2 || words.length > 4) return;
      if (!endPattern.test(cleaned)) return;
      names.add(words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "));
    });
  });

  return Array.from(names);
};

const buildRelatedTrailsList = (routes) => {
  const relatedNames = extractRelatedTrailNames(routes);
  if (!relatedNames.length) {
    return "<li>No related trails listed yet.</li>";
  }
  return relatedNames
    .map((name) => {
      const href = `https://nh48.info/trails.html?trail=${encodeURIComponent(name)}`;
      const text = `${name} route`;
      return `<li><a href="${href}">${escapeHtml(text)}</a></li>`;
    })
    .join("\n");
};

const renderTemplate = (templateHtml, values) => {
  return Object.entries(values).reduce((html, [key, value]) => {
    const safeValue = value === undefined || value === null ? "" : String(value);
    return html.split(`{{${key}}}`).join(safeValue);
  }, templateHtml);
};

const readFile = (filePath, label) => {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error(`Failed to read ${label} at ${filePath}:`, err);
    throw err;
  }
};

const main = () => {
  try {
    console.log("Starting peak prerender...");
    console.log(`Template path: ${TEMPLATE_PATH}`);
    console.log(`Data path: ${DATA_PATH}`);
    console.log(`Output directory: ${OUTPUT_DIR}`);

    const template = readFile(TEMPLATE_PATH, "template");
    const data = JSON.parse(readFile(DATA_PATH, "data"));
    const slugs = Object.keys(data).sort();

    console.log(`Rendering ${slugs.length} peak pages...`);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

slugs.forEach((slug) => {
  const peak = data[slug];
  const name = cleanText(peak["Peak Name"] || peak.peakName || slug);
  const elevation = cleanText(peak["Elevation (ft)"] || "Unknown");
  const prominence = cleanText(peak["Prominence (ft)"] || "Unknown");
  const rangeValue = cleanText(peak["Range / Subrange"] || "");
  const difficultyValue = cleanText(peak["Difficulty"] || "");
  const trailTypeValue = cleanText(peak["Trail Type"] || "");
  const range = rangeValue || "White Mountains";
  const difficulty = difficultyValue || "Unknown";
  const trailType = trailTypeValue || "Unknown";
  const time = cleanText(peak["Typical Completion Time"] || "Varies");
  const summary = cleanText(peak["Terrain Character"] || peak["View Type"] || "");
  const coordinates = parseCoordinates(peak["Coordinates"]);
  const primaryPhoto = pickPrimaryPhoto(peak.photos, name);
  const canonicalUrl = `${CANONICAL_BASE}/${slug}/`;
  const appUrl = `${APP_BASE}?slug=${slug}`;
  const descriptionText = summary || `${name} guide with route details, elevation, and photos.`;
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
    RELATED_TRAILS_LI: buildRelatedTrailsList(peak["Standard Routes"]),
    GALLERY_IMAGES: buildGallery(peak.photos, name),
    APP_URL: appUrl,
    HERO_IMAGE: primaryPhoto.url,
    HERO_ALT: escapeHtml(primaryPhoto.alt),
    JSON_LD: escapeScriptJson(
      buildJsonLd(
        peak,
        canonicalUrl,
        coordinates,
        primaryPhoto.url,
        descriptionText,
        rangeValue || null
      )
    ),
  };

  const outputDir = path.join(OUTPUT_DIR, slug);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(path.join(outputDir, "index.html"), renderTemplate(template, values));
      console.log(`Rendered ${slug}`);
    });
  } catch (err) {
    console.error("Error during prerender:", err);
    process.exit(1);
  }
};

main();
