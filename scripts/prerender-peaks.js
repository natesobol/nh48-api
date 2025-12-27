#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "templates", "peak-page-template.html");
const DATA_PATH = path.join(ROOT, "data", "nh48.json");
const OUTPUT_DIR = path.join(ROOT, "peaks");
const CANONICAL_BASE = "https://nh48.info/peaks";
const HOME_URL = "https://nh48.info/";
const APP_BASE = "https://nh48.info/pages/nh48_peak.html";
const DEFAULT_CATALOG_URL = "https://nh48.info/catalog";
const FALLBACK_IMAGE = "https://nh48.info/nh48-preview.png";
const PHOTO_BASE_URL = "https://photos.nh48.info";
const PHOTO_PATH_PREFIX = "/nh48-photos/";

const I18N = {
  en: JSON.parse(fs.readFileSync(path.join(ROOT, "i18n", "en.json"), "utf8")),
  fr: JSON.parse(fs.readFileSync(path.join(ROOT, "i18n", "fr.json"), "utf8")),
};

const LANGUAGE_CONFIGS = [
  {
    code: "en",
    hreflang: "en",
    outputDir: OUTPUT_DIR,
    canonicalBase: CANONICAL_BASE,
    homeUrl: "https://nh48.info/",
    catalogUrl: DEFAULT_CATALOG_URL,
    titleSuffix: "NH 48 Peak Guide",
    descriptionTemplate: (name) => `${name} guide with route details, elevation, and photos.`,
    summaryFallback: (name) => `${name} is one of the classic New Hampshire 4,000-footers.`,
    defaults: {
      range: "White Mountains",
      difficulty: "Unknown",
      trailType: "Unknown",
      time: "Varies",
      unknown: "Unknown",
      coordinates: "Coordinates coming soon.",
    },
    labels: {
      elevation: "Elevation",
      prominence: "Prominence",
      range: "Range",
      difficulty: "Difficulty",
      trailType: "Trail Type",
      time: "Typical Time",
      cta: "View interactive page",
      backToCatalog: "Back to NH48 Peak Catalog",
      overview: "Overview",
      location: "Location",
      standardRoutes: "Standard Routes",
      relatedTrails: "Related Trails & Routes",
      gallery: "Photo gallery",
      footer: "NH48 pre-rendered guide page.",
      noRoutes: "No standard routes are listed for this peak.",
      noRelated: "No related trails listed yet.",
      routeSuffix: " route",
      breadcrumbHome: "Home",
      breadcrumbCatalog: "Peak Catalog",
    },
    appUrl: (slug) => `${APP_BASE}?slug=${slug}`,
  },
  {
    code: "fr",
    hreflang: "fr",
    outputDir: path.join(ROOT, "fr", "peaks"),
    canonicalBase: "https://nh48.info/fr/peaks",
    homeUrl: "https://nh48.info/fr/",
    catalogUrl: DEFAULT_CATALOG_URL,
    titleSuffix: "Guide des sommets NH48",
    descriptionTemplate: (name) => `${name} : guide avec itinéraires, altitude et photos.`,
    summaryFallback: (name) => `${name} est l’un des sommets classiques de 4 000 pieds du New Hampshire.`,
    defaults: {
      range: "Montagnes Blanches",
      difficulty: "Inconnu",
      trailType: "Inconnu",
      time: "Variable",
      unknown: "Inconnu",
      coordinates: "Coordonnées bientôt disponibles.",
    },
    labels: {
      elevation: "Altitude",
      prominence: "Proéminence",
      range: "Chaîne",
      difficulty: "Difficulté",
      trailType: "Type de sentier",
      time: "Durée typique",
      cta: "Voir la page interactive",
      backToCatalog: "Retour au catalogue des sommets NH48",
      overview: "Aperçu",
      location: "Emplacement",
      standardRoutes: "Itinéraires standards",
      relatedTrails: "Sentiers et itinéraires associés",
      gallery: "Galerie photo",
      footer: "Page de guide NH48 pré-rendue.",
      noRoutes: "Aucun itinéraire standard n’est listé pour ce sommet.",
      noRelated: "Aucun sentier associé pour le moment.",
      routeSuffix: " itinéraire",
      breadcrumbHome: "Accueil",
      breadcrumbCatalog: "Catalogue des sommets",
    },
    appUrl: (slug) => `${APP_BASE}?slug=${slug}&lang=fr`,
  },
];

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

const formatTemplate = (template, values) =>
  template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  );

const buildLocalizedDescription = (langCode, values, summaryText, fallbackBuilder) => {
  const template = I18N[langCode]?.peak?.meta?.descriptionTemplate;
  const baseDescription = template ? formatTemplate(template, values) : fallbackBuilder(values.name);
  if (summaryText) {
    return `${baseDescription} ${summaryText}`.trim();
  }
  return baseDescription;
};

const localizeFrenchName = (name) => {
  const cleaned = cleanText(name);
  if (!cleaned) return cleaned;
  const prefixPattern = /^(?:Mt\.?|Mount)\s+/i;
  if (prefixPattern.test(cleaned)) {
    return cleaned.replace(prefixPattern, "Mont ");
  }
  if (/\s+Mountain$/i.test(cleaned)) {
    const trimmed = cleaned.replace(/\s+Mountain$/i, "").trim();
    return `Mont ${trimmed}`;
  }
  if (/^Mont\s+/i.test(cleaned)) {
    return cleaned;
  }
  return `Mont ${cleaned}`;
};

const localizePeakName = (name, langCode) => {
  if (langCode === "fr") {
    return localizeFrenchName(name);
  }
  return cleanText(name);
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
  const primary = photos[0];
  const normalizedUrl = normalizePhotoUrl(primary.url) || FALLBACK_IMAGE;
  const alt = cleanText(primary.alt) || buildPhotoAlt(primary, peakName);
  return { url: normalizedUrl, alt };
};

const normalizePhotoUrl = (url) => {
  if (!url) return url;
  if (url.startsWith(PHOTO_BASE_URL)) return url;
  if (url.includes("r2.cloudflarestorage.com/nh48-photos/")) {
    const [, tail] = url.split(PHOTO_PATH_PREFIX);
    return tail ? `${PHOTO_BASE_URL}/${tail}` : url;
  }
  if (
    url.includes("cdn.jsdelivr.net/gh/natesobol/nh48-api@main/photos/") ||
    url.includes("raw.githubusercontent.com/natesobol/nh48-api/main/photos/")
  ) {
    const [, tail] = url.split("/photos/");
    return tail ? `${PHOTO_BASE_URL}/${tail}` : url;
  }
  return url;
};

const buildPhotoAlt = (photo, peakName) => {
  const tags = Array.isArray(photo.tags) ? photo.tags.filter(Boolean) : [];
  if (tags.length) {
    return `${peakName} - ${tags.join(", ")}`;
  }
  return `${peakName} photo`;
};

const buildRoutesList = (routes, labels) => {
  if (!Array.isArray(routes) || routes.length === 0) {
    return `<li>${escapeHtml(labels.noRoutes)}</li>`;
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

const buildBreadcrumbJson = (pageName, canonicalUrl, catalogUrl, homeUrl, labels) => JSON.stringify(
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: labels?.breadcrumbHome || "Home",
        item: homeUrl || HOME_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: labels?.breadcrumbCatalog || "NH48 Peak Catalog",
        item: catalogUrl || DEFAULT_CATALOG_URL,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: pageName,
        item: canonicalUrl,
      },
    ],
  },
  null,
  2
);

const buildJsonLd = (
  peak,
  canonicalUrl,
  coordinates,
  primaryImageUrl,
  descriptionText,
  range,
  langConfig,
  englishName,
  localizedName
) => {
  const peakName = cleanText(localizedName || peak.peakName || peak["Peak Name"] || peak.slug);
  const elevationFt = numberFrom(peak["Elevation (ft)"]);
  const prominenceFt = numberFrom(peak["Prominence (ft)"]);
  const difficulty = cleanText(peak["Difficulty"]);
  const trailType = cleanText(peak["Trail Type"]);
  const sameAsLinks = Array.isArray(peak.sameAs)
    ? peak.sameAs.filter(Boolean)
    : peak.sameAs
      ? [peak.sameAs]
      : [];
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
    alternateName:
      langConfig.code !== "en" && englishName && englishName !== peakName ? englishName : undefined,
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
    prominence: prominenceFt != null
      ? {
        "@type": "QuantitativeValue",
        value: prominenceFt,
        unitText: "FT",
      }
      : undefined,
    containedInPlace: { "@type": "Place", name: "White Mountain National Forest" },
    additionalProperty: additionalProperty.length ? additionalProperty : undefined,
    isPartOf: {
      "@type": "DataCatalog",
      name: "NH48 Peak Dataset",
      url: "https://nh48.info/catalog",
    },
    sameAs: sameAsLinks.length ? sameAsLinks : undefined,
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

const buildRelatedTrailsList = (routes, labels) => {
  const relatedNames = extractRelatedTrailNames(routes);
  if (!relatedNames.length) {
    return `<li>${escapeHtml(labels.noRelated)}</li>`;
  }
  return relatedNames
    .map((name) => {
      const href = `https://nh48.info/trails?trail=${encodeURIComponent(name)}`;
      const text = `${name}${labels.routeSuffix}`;
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
      const elevation = cleanText(peak["Elevation (ft)"] || "");
      const prominence = cleanText(peak["Prominence (ft)"] || "");
      const rangeValue = cleanText(peak["Range / Subrange"] || "");
      const difficultyValue = cleanText(peak["Difficulty"] || "");
      const trailTypeValue = cleanText(peak["Trail Type"] || "");
      const timeValue = cleanText(peak["Typical Completion Time"] || "");
      const summary = cleanText(peak["Terrain Character"] || peak["View Type"] || "");
      const coordinates = parseCoordinates(peak["Coordinates"]);

      LANGUAGE_CONFIGS.forEach((lang) => {
        const canonicalUrl = `${lang.canonicalBase}/${slug}/`;
        const localizedName = localizePeakName(name, lang.code);
        const primaryPhoto = pickPrimaryPhoto(peak.photos, localizedName);
        const descriptionValues = {
          name: localizedName,
          elevation: elevation || lang.defaults.unknown,
          prominence: prominence || lang.defaults.unknown,
          range: rangeValue || lang.defaults.range,
        };
        const descriptionText = buildLocalizedDescription(
          lang.code,
          descriptionValues,
          summary,
          (peakNameText) => lang.descriptionTemplate(peakNameText)
        );
        const range = rangeValue || lang.defaults.range;
        const difficulty = difficultyValue || lang.defaults.difficulty;
        const trailType = trailTypeValue || lang.defaults.trailType;
        const time = timeValue || lang.defaults.time;
        const elevationText = elevation ? `${elevation} ft` : lang.defaults.unknown;
        const prominenceText = prominence ? `${prominence} ft` : lang.defaults.unknown;

        const values = {
          LANG: lang.hreflang,
          TITLE: escapeHtml(`${localizedName} | ${lang.titleSuffix}`),
          DESCRIPTION: escapeHtml(descriptionText),
          CANONICAL_URL: canonicalUrl,
          CANONICAL_EN_URL: `${CANONICAL_BASE}/${slug}/`,
          CANONICAL_FR_URL: `https://nh48.info/fr/peaks/${slug}/`,
          OG_IMAGE: primaryPhoto.url,
          PEAK_NAME: escapeHtml(localizedName),
          HOME_URL: lang.homeUrl || HOME_URL,
          BREADCRUMB_HOME: escapeHtml(lang.labels.breadcrumbHome || "Home"),
          BREADCRUMB_CATALOG: escapeHtml(lang.labels.breadcrumbCatalog || "Peak Catalog"),
          ELEVATION: escapeHtml(elevationText),
          PROMINENCE: escapeHtml(prominenceText),
          RANGE: escapeHtml(range),
          DIFFICULTY: escapeHtml(difficulty),
          TRAIL_TYPE: escapeHtml(trailType),
          TIME: escapeHtml(time),
          SUMMARY: escapeHtml(summary || lang.summaryFallback(localizedName)),
          COORDINATES: escapeHtml(coordinates.text || lang.defaults.coordinates),
          ROUTES_LIST: buildRoutesList(peak["Standard Routes"], lang.labels),
          RELATED_TRAILS_LI: buildRelatedTrailsList(peak["Standard Routes"], lang.labels),
          GALLERY_IMAGES: buildGallery(peak.photos, localizedName),
          APP_URL: lang.appUrl(slug),
          CATALOG_URL: lang.catalogUrl,
          HERO_IMAGE: primaryPhoto.url,
          HERO_ALT: escapeHtml(primaryPhoto.alt),
          LABEL_ELEVATION: escapeHtml(lang.labels.elevation),
          LABEL_PROMINENCE: escapeHtml(lang.labels.prominence),
          LABEL_RANGE: escapeHtml(lang.labels.range),
          LABEL_DIFFICULTY: escapeHtml(lang.labels.difficulty),
          LABEL_TRAIL_TYPE: escapeHtml(lang.labels.trailType),
          LABEL_TIME: escapeHtml(lang.labels.time),
          LABEL_CTA: escapeHtml(lang.labels.cta),
          LABEL_BACK_TO_CATALOG: escapeHtml(lang.labels.backToCatalog),
          LABEL_OVERVIEW: escapeHtml(lang.labels.overview),
          LABEL_LOCATION: escapeHtml(lang.labels.location),
          LABEL_STANDARD_ROUTES: escapeHtml(lang.labels.standardRoutes),
          LABEL_RELATED_TRAILS: escapeHtml(lang.labels.relatedTrails),
          LABEL_GALLERY: escapeHtml(lang.labels.gallery),
          LABEL_FOOTER: escapeHtml(lang.labels.footer),
          JSON_LD: escapeScriptJson(
            buildJsonLd(
              peak,
              canonicalUrl,
              coordinates,
              primaryPhoto.url,
              descriptionText,
              rangeValue || null,
              lang,
              name,
              localizedName
            )
          ),
          BREADCRUMB_LD: escapeScriptJson(
            buildBreadcrumbJson(localizedName, canonicalUrl, lang.catalogUrl, lang.homeUrl, lang.labels)
          ),
        };

        const outputDir = path.join(lang.outputDir, slug);
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(path.join(outputDir, "index.html"), renderTemplate(template, values));
        console.log(`Rendered ${slug} (${lang.code})`);
      });
    });
  } catch (err) {
    console.error("Error during prerender:", err);
    process.exit(1);
  }
};

main();
