#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "templates", "peak-page-template.html");
const DATA_PATH = path.join(ROOT, "data", "nh48.json");
const GEOGRAPHY_PATH = path.join(ROOT, "data", "geography.json");
const ORGANIZATION_PATH = path.join(ROOT, "data", "organization.json");
const WEBSITE_PATH = path.join(ROOT, "data", "website.json");
const PERSON_PATH = path.join(ROOT, "data", "person.json");
const CREATIVEWORKS_PATH = path.join(ROOT, "data", "creativeWorks.json");
const WMNF_RANGES_PATH = path.join(ROOT, "data", "wmnf-ranges.json");
const PEAK_EXPERIENCES_EN_PATH = path.join(ROOT, "data", "peak-experiences.en.json");
const PARKING_DATA_PATH = path.join(ROOT, "data", "parking-data.json");
const MONTHLY_WEATHER_PATH = path.join(ROOT, "data", "monthly-weather.json");
const PEAK_DIFFICULTY_PATH = path.join(ROOT, "data", "peak-difficulty.json");
const RISK_OVERLAY_PATH = path.join(ROOT, "data", "nh48_enriched_overlay.json");
const OUTPUT_DIR = path.join(ROOT, "peaks");
const CANONICAL_BASE = "https://nh48.info/peak";
const HOME_URL = "https://nh48.info/";
const APP_BASE_EN = "https://nh48.info/peak";
const APP_BASE_FR = "https://nh48.info/fr/peak";
const WHITE_MOUNTAINS_HUB_EN = "https://nh48.info/nh-4000-footers-info";
const WHITE_MOUNTAINS_HUB_FR = "https://nh48.info/fr/nh-4000-footers-info";
const DEFAULT_CATALOG_URL = "https://nh48.info/catalog";
const FALLBACK_IMAGE = "https://nh48.info/nh48-preview.png";
const FALLBACK_IMAGE_WIDTH = 1800;
const FALLBACK_IMAGE_HEIGHT = 1200;
const PHOTO_BASE_URL = "https://photos.nh48.info";
const PHOTO_BASE = new URL(PHOTO_BASE_URL);
const PHOTO_PATH_PREFIX = "/nh48-photos/";
const IMAGE_TRANSFORM_OPTIONS = "format=webp,quality=85,metadata=keep";
const IMAGE_TRANSFORM_PREFIX = `${PHOTO_BASE.origin}/cdn-cgi/image/${IMAGE_TRANSFORM_OPTIONS}`;
const DEFAULT_SITE_NAME = "NH48pics";
const IMAGE_LICENSE_URL = "https://creativecommons.org/licenses/by-nc-nd/4.0/";
const PEAK_SAMEAS_PATH = path.join(ROOT, "data", "peak-sameas.json");
const AUTHOR_NAME = "Nathan Sobol";
const TWITTER_HANDLE = "@nate_dumps_pics";
const INSTAGRAM_URL = "https://www.instagram.com/nate_dumps_pics/";
const EXIF_UNKNOWN_VALUE = "unknown";

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
    siteName: "NH48pics",
    ogLocale: "en_US",
    ogLocaleAlternate: "fr_FR",
    titleSuffix: "NH48pics",
    descriptionTemplate: (name) => `${name} info page with route details, elevation, and photos.`,
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
      trailTestedNotes: "Trail-tested notes",
      experienceSummary: "Experience summary",
      conditionsFromExperience: "Conditions from experience",
      planningTip: "Planning tip",
      footer: "NH48 pre-rendered info page.",
      noRoutes: "No standard routes are listed for this peak.",
      noRelated: "No related trails listed yet.",
      routeSuffix: " route",
      breadcrumbHome: "Home",
      breadcrumbWhiteMountains: "White Mountains",
    },
    appUrl: (slug) => `${APP_BASE_EN}/${slug}`,
  },
  {
    code: "fr",
    hreflang: "fr",
    outputDir: path.join(ROOT, "fr", "peaks"),
    canonicalBase: "https://nh48.info/fr/peak",
    homeUrl: "https://nh48.info/fr/",
    catalogUrl: DEFAULT_CATALOG_URL,
    siteName: "NH48pics",
    ogLocale: "fr_FR",
    ogLocaleAlternate: "en_US",
    titleSuffix: "NH48pics",
    descriptionTemplate: (name) => `${name} : page info avec itineraires, altitude et photos.`,
    summaryFallback: (name) => `${name} est un sommet classique de 4,000 pieds du New Hampshire.`,
    defaults: {
      range: "Montagnes Blanches",
      difficulty: "Inconnu",
      trailType: "Inconnu",
      time: "Variable",
      unknown: "Inconnu",
      coordinates: "Coordonnees bientot disponibles.",
    },
    labels: {
      elevation: "Altitude",
      prominence: "Proeminence",
      range: "Chaine",
      difficulty: "Difficulte",
      trailType: "Type de sentier",
      time: "Duree typique",
      cta: "Voir la page interactive",
      backToCatalog: "Retour au catalogue des sommets NH48",
      overview: "Apercu",
      location: "Emplacement",
      standardRoutes: "Itineraires standards",
      relatedTrails: "Sentiers et itineraires associes",
      gallery: "Galerie photo",
      trailTestedNotes: "Notes terrain",
      experienceSummary: "Resume experience",
      conditionsFromExperience: "Conditions observees",
      planningTip: "Conseil planification",
      footer: "Page NH48 pre-rendue.",
      noRoutes: "Aucun itineraire standard n'est liste pour ce sommet.",
      noRelated: "Aucun sentier associe pour le moment.",
      routeSuffix: " itineraire",
      breadcrumbHome: "Accueil",
      breadcrumbWhiteMountains: "Montagnes Blanches",
    },
    appUrl: (slug) => `${APP_BASE_FR}/${slug}`,
  },
];
const ACCEPTED_LANG_CODES = LANGUAGE_CONFIGS.map((lang) => lang.code);

const parseSelectedLanguageConfigs = (args) => {
  const langArg = args.find((arg) => arg.startsWith("--lang="));

  if (!langArg) {
    return LANGUAGE_CONFIGS;
  }

  const selectedLangCode = cleanText(langArg.slice("--lang=".length)).toLowerCase();
  const selectedConfig = LANGUAGE_CONFIGS.find((lang) => lang.code === selectedLangCode);

  if (!selectedConfig) {
    console.error(
      `Invalid --lang value \"${selectedLangCode || "(empty)"}\". Accepted values: ${ACCEPTED_LANG_CODES.join(", ")}.`
    );
    process.exit(1);
  }

  return [selectedConfig];
};

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

const normalizeRangeName = (value) =>
  cleanText(value)
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getPrimaryRangeName = (value) => {
  const raw = cleanText(value);
  if (!raw) return "";
  const split = raw.split(/[|/;,]/);
  const first = cleanText(split[0] || raw);
  if (!first) return "";
  const dashSplit = first.split(/\s*-\s*/);
  return cleanText(dashSplit[0] || first);
};

const slugify = (value) =>
  cleanText(value)
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildRangeLookup = (rangesPayload) => {
  const lookup = new Map();
  const entries = Array.isArray(rangesPayload)
    ? rangesPayload
    : rangesPayload && typeof rangesPayload === "object"
      ? Object.values(rangesPayload)
      : [];

  entries.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const rangeName = cleanText(entry.rangeName || entry.name);
    const rangeSlug = cleanText(entry.slug) || slugify(rangeName);
    if (!rangeName || !rangeSlug) return;
    lookup.set(normalizeRangeName(rangeName), { rangeName, rangeSlug });
  });
  return lookup;
};

const resolveRangeContext = (rangeValue, rangeLookup, fallbackRange = "White Mountains") => {
  const primaryRange = getPrimaryRangeName(rangeValue) || fallbackRange;
  const fromLookup = rangeLookup.get(normalizeRangeName(primaryRange));
  if (fromLookup) {
    return {
      rangeName: fromLookup.rangeName,
      rangeSlug: fromLookup.rangeSlug,
      rangeUrl: `https://nh48.info/range/${encodeURIComponent(fromLookup.rangeSlug)}/`,
    };
  }
  const derivedSlug = slugify(primaryRange);
  return {
    rangeName: primaryRange,
    rangeSlug: derivedSlug,
    rangeUrl: derivedSlug ? `https://nh48.info/range/${encodeURIComponent(derivedSlug)}/` : "",
  };
};

const buildIndexBySlug = (payload) => {
  if (Array.isArray(payload)) {
    return Object.fromEntries(
      payload
        .map((entry) => [cleanText(entry?.slug), entry])
        .filter(([slug]) => Boolean(slug))
    );
  }
  return payload && typeof payload === "object" ? payload : {};
};

const getEasternMonthName = () =>
  new Date().toLocaleString("en-US", { month: "long", timeZone: "America/New_York" });

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

const buildMetaTitle = (langCode, values, fallbackBuilder) => {
  const template = I18N[langCode]?.peak?.meta?.titleTemplate;
  if (template) {
    return formatTemplate(template, values);
  }
  return fallbackBuilder(values);
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

const parseEstimatedDuration = (value) => {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const lower = cleaned.toLowerCase();
  const rangeSplit = lower.split(/(?:-|â€“|to)/).map((entry) => entry.trim());
  const target = rangeSplit[0] || lower;
  const numberMatch = target.match(/(\d+(?:\.\d+)?)/);
  if (!numberMatch) return null;
  const quantity = Number(numberMatch[1]);
  if (Number.isNaN(quantity)) return null;
  if (lower.includes("day")) {
    if (Number.isInteger(quantity)) {
      return `P${quantity}D`;
    }
    const hours = Math.round(quantity * 24);
    return `P${Math.floor(hours / 24)}DT${hours % 24}H`;
  }
  if (lower.includes("hour") || lower.includes("hr")) {
    if (Number.isInteger(quantity)) {
      return `PT${quantity}H`;
    }
    const hours = Math.floor(quantity);
    const minutes = Math.round((quantity - hours) * 60);
    const hourPart = hours ? `${hours}H` : "";
    const minutePart = minutes ? `${minutes}M` : "";
    if (!hourPart && !minutePart) return null;
    return `PT${hourPart}${minutePart}`;
  }
  if (lower.includes("min")) {
    const minutes = Math.round(quantity);
    return `PT${minutes}M`;
  }
  return null;
};

const formatFeet = (value) => {
  const numeric = numberFrom(value);
  if (numeric === null || Number.isNaN(numeric)) return "";
  const formatted = numeric.toLocaleString("en-US");
  return `${formatted} ft`;
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

const parseDimensions = (value) => {
  if (!value) return { width: null, height: null };
  const match = String(value)
    .replace(/Ã—/g, 'x')
    .match(/(\d+)\s*x\s*(\d+)/i);
  if (!match) return { width: null, height: null };
  const [, w, h] = match;
  return { width: Number(w), height: Number(h) };
};

const resolvePhotoDimensions = (photo) => {
  if (!photo || typeof photo !== "object") return { width: null, height: null };
  const width = Number(photo.width);
  const height = Number(photo.height);
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  return parseDimensions(photo.dimensions || photo.dimension || "");
};

const buildKeywords = (photo) => {
  const keywords = new Set();
  const add = (value) => {
    const cleaned = cleanText(value);
    if (cleaned) keywords.add(cleaned);
  };

  (photo.tags || []).forEach(add);
  add(photo.season);
  add(photo.timeOfDay);
  add(photo.orientation);
  (photo.iptc?.keywords || []).forEach(add);

  return Array.from(keywords);
};

const normalizeFStopValue = (value) => {
  const cleaned = cleanText(value);
  if (!cleaned) return "";
  return /^f\//i.test(cleaned) ? cleaned : `f/${cleaned}`;
};

const normalizeIsoValue = (value) => {
  const cleaned = cleanText(value);
  if (!cleaned) return "";
  return cleaned.replace(/^iso\s*/i, "");
};

const CANONICAL_EXIF_FIELDS = [
  { name: "cameraModel", resolve: (photo) => cleanText(photo.cameraModel || photo.camera || photo.cameraMaker) },
  { name: "lens", resolve: (photo) => cleanText(photo.lens) },
  { name: "fStop", resolve: (photo) => normalizeFStopValue(photo.fStop) },
  { name: "shutterSpeed", resolve: (photo) => cleanText(photo.shutterSpeed) },
  { name: "iso", resolve: (photo) => normalizeIsoValue(photo.iso) },
  { name: "focalLength", resolve: (photo) => cleanText(photo.focalLength) },
];

const buildCanonicalExifData = (photo) =>
  CANONICAL_EXIF_FIELDS.map((entry) => ({
    "@type": "PropertyValue",
    name: entry.name,
    value: entry.resolve(photo || {}) || EXIF_UNKNOWN_VALUE,
  }));

const buildExifCodeText = (photo, langCode) => {
  const cameraModel = cleanText(photo?.cameraModel || photo?.camera || photo?.cameraMaker);
  const lens = cleanText(photo?.lens);
  const focalLength = cleanText(photo?.focalLength);
  const fStop = normalizeFStopValue(photo?.fStop);
  const shutterSpeed = cleanText(photo?.shutterSpeed);
  const iso = normalizeIsoValue(photo?.iso);
  const parts = [
    cameraModel,
    lens || focalLength,
    fStop,
    shutterSpeed,
    iso ? `ISO ${iso}` : "",
  ].filter(Boolean);
  if (parts.length) return parts.join(" | ");
  return langCode === "fr" ? "Metadonnees indisponibles" : "Metadata unavailable";
};

const buildExifSummary = (photo) => {
  const exifData = buildCanonicalExifData(photo);
  return exifData.map((entry) => `${entry.name}: ${entry.value}`).join("; ");
};

const flattenMetaToPropertyValues = (prefix, obj, out) => {
  if (!obj || typeof obj !== 'object') return;
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (['url', 'photoId', 'filename', 'isPrimary', 'instagramProfileEmbedLink'].includes(key)) continue;
    const name = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(val)) {
      const text = val.map((item) => cleanText(item)).filter(Boolean).join(', ');
      if (text) out.push({ '@type': 'PropertyValue', name, value: text });
    } else if (typeof val === 'object') {
      flattenMetaToPropertyValues(name, val, out);
    } else {
      const text = cleanText(val);
      if (text) out.push({ '@type': 'PropertyValue', name, value: text });
    }
  }
};

const buildPhotoPropertyValues = (photo) => {
  const out = [];
  flattenMetaToPropertyValues('', photo || {}, out);
  return out;
};

const buildContentLocation = (photo) => {
  const location = photo.iptc?.locationShown || photo.iptc?.locationCreated;
  if (!location) return undefined;

  const address = {
    '@type': 'PostalAddress',
    addressLocality: cleanText(location.city),
    addressRegion: cleanText(location.provinceState),
    addressCountry: cleanText(location.countryName || location.countryIsoCode),
  };

  Object.keys(address).forEach((key) => !address[key] && delete address[key]);

  const place = {
    '@type': 'Place',
    name: cleanText(location.sublocation || location.city),
    address: Object.keys(address).length ? address : undefined,
  };

  Object.keys(place).forEach((key) => place[key] === undefined && delete place[key]);
  return Object.keys(place).length ? place : undefined;
};

const buildImageObject = (photo, peakName, isPrimary, langCode, imageId) => {
  const normalizedUrl = normalizePhotoUrl(photo.url) || FALLBACK_IMAGE;
  const thumbnailUrl = normalizedUrl.replace(
    /cdn-cgi\/image\/[^/]+/,
    'cdn-cgi/image/width=400,format=webp,metadata=keep'
  );
  const { width: parsedWidth, height: parsedHeight } = resolvePhotoDimensions(photo);
  const width = parsedWidth || undefined;
  const height = parsedHeight || undefined;
  const { alt, altLang, extendedDescription, extendedDescriptionLang } = buildPhotoTexts(
    photo,
    peakName,
    langCode
  );
  const headline =
    cleanText(photo[`headline_${langCode}`]) || cleanText(photo.headline) || `${peakName} â€” White Mountain National Forest`;
  const description = cleanText(extendedDescription || photo.caption || '') || alt;
  const creatorName = AUTHOR_NAME;
  const creditText = AUTHOR_NAME;
  const publisherName = cleanText(photo.iptc?.featuredOrgName) || TWITTER_HANDLE;
  const copyrightNotice = `Â© ${AUTHOR_NAME}`;
  const copyrightHolderName = AUTHOR_NAME;
  const rightsUsageTerms = cleanText(photo.iptc?.rightsUsageTerms || photo.rightsUsageTerms);
  const licenseUrl = IMAGE_LICENSE_URL;
  const keywords = buildKeywords(photo);
  const exifData = buildCanonicalExifData(photo);
  const exifSummary = buildExifSummary(photo);
  const propertyValues = buildPhotoPropertyValues(photo);
  const isFineArt = !!photo.isFineArt;
  const imageTypes = isFineArt
    ? ['ImageObject', 'Photograph', 'VisualArtwork']
    : ['ImageObject', 'Photograph'];
  const imageObject = {
    '@type': imageTypes,
    '@id': imageId,
    url: normalizedUrl,
    contentUrl: normalizedUrl,
    name: headline || alt,
    caption: alt,
    alternateName: alt,
    description: description || alt,
    creditText,
    creator: { '@type': 'Person', name: creatorName },
    author: { '@type': 'Person', name: creatorName },
    copyrightNotice,
    license: licenseUrl,
    acquireLicensePage: licenseUrl,
    usageInfo: rightsUsageTerms || licenseUrl,
    copyrightHolder: { '@type': 'Person', name: copyrightHolderName },
    thumbnailUrl,
    contentSize: cleanText(photo.fileSize),
    uploadDate: cleanText(photo.fileCreateDate || photo.captureDate),
    dateCreated: cleanText(photo.captureDate || photo.fileCreateDate),
    datePublished: cleanText(photo.captureDate),
    exifData,
    keywords: keywords.length ? keywords : undefined,
    additionalProperty: propertyValues.length ? propertyValues : undefined,
    representativeOfPage: !!isPrimary,
    width,
    height,
  };
  if (isFineArt) {
    imageObject.artform = 'Photography';
    imageObject.artEdition = 'Open edition';
    imageObject.artMedium = 'Digital photography';
  }

  const contentLocation = buildContentLocation(photo);
  if (contentLocation) {
    imageObject.contentLocation = contentLocation;
  }

  if (publisherName) {
    imageObject.publisher = { '@type': 'Organization', name: publisherName };
  }

  Object.keys(imageObject).forEach((key) => imageObject[key] === undefined && delete imageObject[key]);

  return {
    imageObject,
    alt,
    altLang,
    headline,
    description,
    extendedDescription: cleanText(extendedDescription || ''),
    extendedDescriptionLang,
    width,
    height,
    creator: creatorName,
    creditText,
    publisherName,
    keywords,
    exifData: exifSummary,
    exifPropertyValues: exifData,
    dateCreated: imageObject.dateCreated,
  };
};

const pickPrimaryPhoto = (photos, peakName, langCode, canonicalUrl) => {
  if (!Array.isArray(photos) || photos.length === 0) {
    const fallbackViewDescription = defaultHeroViewDescription(langCode);
    const fallbackAlt = buildForcePatternAlt(peakName, fallbackViewDescription, langCode);
    const fallbackKeywords = [
      peakName,
      "White Mountain National Forest",
      "NH48",
      "New Hampshire",
      "mountain landscape",
    ].filter(Boolean);
    const fallbackImageObject = {
      '@type': ['ImageObject', 'Photograph'],
      '@id': `${canonicalUrl}#img-001`,
      url: FALLBACK_IMAGE,
      contentUrl: FALLBACK_IMAGE,
      name: `${peakName} â€” White Mountain National Forest`,
      caption: fallbackAlt,
      alternateName: fallbackAlt,
      description: fallbackAlt,
      creditText: AUTHOR_NAME,
      creator: { '@type': 'Person', name: AUTHOR_NAME },
      author: { '@type': 'Person', name: AUTHOR_NAME },
      copyrightNotice: `Â© ${AUTHOR_NAME}`,
      license: IMAGE_LICENSE_URL,
      acquireLicensePage: IMAGE_LICENSE_URL,
      usageInfo: IMAGE_LICENSE_URL,
      copyrightHolder: { '@type': 'Person', name: AUTHOR_NAME },
      thumbnailUrl: FALLBACK_IMAGE,
      keywords: fallbackKeywords,
      contentLocation: {
        '@type': 'Place',
        name: 'White Mountain National Forest',
      },
      representativeOfPage: true,
      width: FALLBACK_IMAGE_WIDTH,
      height: FALLBACK_IMAGE_HEIGHT,
      exifData: buildCanonicalExifData({}),
    };
    return {
      primary: {
        url: FALLBACK_IMAGE,
        alt: fallbackAlt,
        altLang: langCode === 'en' ? undefined : 'en',
        headline: `${peakName} â€” White Mountain National Forest`,
        description: '',
        extendedDescription: '',
        extendedDescriptionLang: langCode === 'en' ? undefined : 'en',
        width: FALLBACK_IMAGE_WIDTH,
        height: FALLBACK_IMAGE_HEIGHT,
        creator: AUTHOR_NAME,
        creditText: AUTHOR_NAME,
        publisherName: TWITTER_HANDLE,
        keywords: [],
        exifData: buildExifSummary({}),
        exifPropertyValues: buildCanonicalExifData({}),
      },
      imageObjects: [fallbackImageObject],
    };
  }

  const primaryIndex = Math.max(
    0,
    photos.findIndex((photo) => photo && typeof photo === 'object' && photo.isPrimary)
  );

  const imageEntries = photos.map((photo, index) =>
    buildImageObject(
      photo,
      peakName,
      index === primaryIndex,
      langCode,
      `${canonicalUrl}#img-${String(index + 1).padStart(3, "0")}`
    )
  );
  const primary = imageEntries[primaryIndex];

  return {
    primary: {
      url: primary.imageObject.url,
      alt: primary.alt,
      altLang: primary.altLang,
      headline: primary.headline,
      description: primary.description,
      extendedDescription: primary.extendedDescription,
      extendedDescriptionLang: primary.extendedDescriptionLang,
      width: primary.width,
      height: primary.height,
      creator: primary.creator,
      creditText: primary.creditText,
      publisherName: primary.publisherName,
      keywords: primary.keywords,
      exifData: primary.exifData,
      exifPropertyValues: primary.exifPropertyValues,
    },
    imageObjects: imageEntries.map((entry) => entry.imageObject),
  };
};

const applyImageTransform = (url) => {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === PHOTO_BASE.hostname) {
      const normalizedPath = parsed.pathname.startsWith("/")
        ? parsed.pathname
        : `/${parsed.pathname}`;
      return `${IMAGE_TRANSFORM_PREFIX}${normalizedPath}`;
    }
  } catch (error) {
    return url;
  }
  return url;
};

const normalizePhotoUrl = (url) => {
  if (!url) return url;
  if (url.startsWith(PHOTO_BASE_URL)) return applyImageTransform(url);

  let normalized = url;

  if (url.includes("r2.cloudflarestorage.com/nh48-photos/")) {
    const [, tail] = url.split(PHOTO_PATH_PREFIX);
    normalized = tail ? `${PHOTO_BASE_URL}/${tail}` : url;
  }
  if (
    url.includes("cdn.jsdelivr.net/gh/natesobol/nh48-api@main/photos/") ||
    url.includes("raw.githubusercontent.com/natesobol/nh48-api/main/photos/")
  ) {
    const [, tail] = url.split("/photos/");
    normalized = tail ? `${PHOTO_BASE_URL}/${tail}` : url;
  }

  return applyImageTransform(normalized);
};

const pickLocalizedField = (photo, langCode, keys) => {
  if (!photo || typeof photo !== 'object') {
    return { text: '', isLocalized: false };
  }

  for (const key of keys) {
    const localizedKey = `${key}_${langCode}`;
    const localizedValue = cleanText(photo[localizedKey]);
    if (localizedValue) {
      return { text: localizedValue, isLocalized: true };
    }
  }

  for (const key of keys) {
    const value = cleanText(photo[key]);
    if (value) {
      return { text: value, isLocalized: false };
    }
  }

  return { text: '', isLocalized: false };
};

const resolveLangAttr = (isLocalized, langCode) => {
  if (isLocalized || langCode === 'en') return undefined;
  return 'en';
};

const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pickFirstNonEmpty = (...values) => {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }
  return "";
};

const normalizeLooseText = (value) =>
  cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const stripHeroAltPattern = (value, peakName) => {
  const text = cleanText(value);
  const safePeakName = cleanText(peakName);
  const suffix = " - NH48";
  const prefix = safePeakName ? `${safePeakName} - ` : "";
  if (!text) return "";
  if (prefix && text.startsWith(prefix) && text.endsWith(suffix) && text.length > prefix.length + suffix.length) {
    return text.slice(prefix.length, -suffix.length).trim();
  }
  return text;
};

const isFilenameLikeDescription = (value) => {
  const text = cleanText(value);
  if (!text) return true;
  const normalized = text.toLowerCase();
  if (/\.(?:jpe?g|png|webp|gif|heic|avif)\b/.test(normalized)) return true;
  if (/__\d{1,4}\b/.test(normalized)) return true;
  if (/(?:^|[\s_-])(?:img|dsc|pxl|photo|mount)[\s_-]*\d{2,6}\b/.test(normalized)) return true;
  if (/^[a-z0-9_-]{4,}$/.test(normalized) && /\d/.test(normalized)) return true;
  return false;
};

const isWeakViewDescription = (value, peakName) => {
  const text = cleanText(value);
  if (!text) return true;
  if (isFilenameLikeDescription(text)) return true;
  const normalized = normalizeLooseText(text);
  if (!normalized || normalized.length < 8) return true;

  const peakNormalized = normalizeLooseText(peakName);
  if (!peakNormalized) return false;
  const peakPattern = new RegExp(`\\b${escapeRegExp(peakNormalized).replace(/\s+/g, "\\s+")}\\b`, "gi");
  const remainder = normalized
    .replace(peakPattern, " ")
    .replace(/\b(?:mount|mont|mt|photo|image|summit|sommet|view|vue)\b/gi, " ")
    .replace(/\b\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return remainder.length < 4;
};

const defaultHeroViewDescription = (langCode) =>
  langCode === "fr" ? "Vue du sommet des White Mountains" : "Summit view in the White Mountains";

const buildContextualViewDescription = (photo, langCode) => {
  const bits = [
    cleanText(photo?.season),
    cleanText(photo?.timeOfDay),
    cleanText(photo?.orientation),
  ].filter(Boolean);
  if (!bits.length) return defaultHeroViewDescription(langCode);
  const contextual = bits.join(" ");
  return langCode === "fr"
    ? `Vue ${contextual} dans les White Mountains`
    : `${contextual} view in the White Mountains`;
};

const buildViewDescription = (peakName, photo, langCode) => {
  const { text: altText, isLocalized: isAltLocalized } = pickLocalizedField(photo, langCode, [
    "altText",
    "alt",
    "title",
    "headline",
  ]);
  const {
    text: descriptionText,
    isLocalized: isDescriptionLocalized,
  } = pickLocalizedField(photo, langCode, ["extendedDescription", "description", "caption", "headline", "title"]);
  const candidate = stripHeroAltPattern(
    pickFirstNonEmpty(descriptionText, altText),
    peakName
  );
  const viewDescription = isWeakViewDescription(candidate, peakName)
    ? buildContextualViewDescription(photo, langCode)
    : candidate;
  return {
    viewDescription: cleanText(viewDescription) || defaultHeroViewDescription(langCode),
    isLocalized: !!(isAltLocalized || isDescriptionLocalized),
    descriptionText: cleanText(descriptionText),
    isDescriptionLocalized: !!isDescriptionLocalized,
  };
};

const buildForcePatternAlt = (peakName, viewDescription, langCode) => {
  const safePeakName = cleanText(peakName) || (langCode === "fr" ? "Sommet NH48" : "NH48 Peak");
  const safeViewDescription = cleanText(viewDescription) || defaultHeroViewDescription(langCode);
  return `${safePeakName} - ${safeViewDescription} - NH48`;
};

const buildHeroImageAlt = (peakName, photo, langCode) => {
  const { viewDescription } = buildViewDescription(peakName, photo, langCode);
  return buildForcePatternAlt(peakName, viewDescription, langCode);
};

const buildPhotoTexts = (photo, peakName, langCode) => {
  const { viewDescription, isLocalized, descriptionText, isDescriptionLocalized } = buildViewDescription(
    peakName,
    photo,
    langCode
  );
  const alt = buildForcePatternAlt(peakName, viewDescription, langCode);
  const altLang = resolveLangAttr(isLocalized, langCode);
  const extendedDescription = descriptionText || viewDescription;
  const extendedDescriptionLang = extendedDescription
    ? resolveLangAttr(isDescriptionLocalized || isLocalized, langCode)
    : undefined;
  return { alt, altLang, extendedDescription, extendedDescriptionLang };
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
        .join(" â€¢ ");
      return `<li><strong>${escapeHtml(name)}</strong>${details ? ` â€” ${escapeHtml(details)}` : ""}</li>`;
    })
    .join("\n");
};

const buildRouteEntities = (routes, peak, canonicalUrl) => {
  if (!Array.isArray(routes) || routes.length === 0) return [];
  return routes
    .map((route, index) => {
      if (!route || typeof route !== "object") return null;
      const name = cleanText(route["Route Name"] || route.name || `Route ${index + 1}`);
      const distanceValue = numberFrom(route["Distance (mi)"]);
      const elevationGainValue = numberFrom(route["Elevation Gain (ft)"]);
      const difficulty = cleanText(route["Difficulty"] || "");
      const trailType = cleanText(route["Trail Type"] || "");
      const durationSource = cleanText(route["Typical Completion Time"] || peak?.["Typical Completion Time"] || "");
      const estimatedDuration = parseEstimatedDuration(durationSource);
      const isHikingTrail = [name, trailType]
        .filter(Boolean)
        .some((entry) => new RegExp(`\\b(${TRAIL_KEYWORDS.join("|")})\\b`, "i").test(entry));
      const additionalProperty = [];

      if (elevationGainValue !== null) {
        additionalProperty.push({
          "@type": "PropertyValue",
          name: "Elevation Gain (ft)",
          value: elevationGainValue,
          unitText: "FT",
        });
      }
      if (trailType) {
        additionalProperty.push({
          "@type": "PropertyValue",
          name: "Trail Type",
          value: trailType,
        });
      }
      if (durationSource && !estimatedDuration) {
        additionalProperty.push({
          "@type": "PropertyValue",
          name: "Typical Completion Time",
          value: durationSource,
        });
      }

      const routeEntity = {
        "@type": isHikingTrail ? "HikingTrail" : "Route",
        "@id": `${canonicalUrl}#route-${String(index + 1).padStart(2, "0")}`,
        name,
        distance:
          distanceValue !== null
            ? {
              "@type": "QuantitativeValue",
              value: distanceValue,
              unitText: "MI",
            }
            : undefined,
        difficulty: difficulty || undefined,
        description: undefined,
        estimatedDuration: estimatedDuration || undefined,
        additionalProperty: additionalProperty.length ? additionalProperty : undefined,
      };

      Object.keys(routeEntity).forEach((key) => routeEntity[key] === undefined && delete routeEntity[key]);
      return routeEntity;
    })
    .filter(Boolean);
};

const buildPhotoTitleLine = (photo, peakName, langCode, viewDescription) => {
  const explicitTitle = pickFirstNonEmpty(
    photo?.[`headline_${langCode}`],
    photo?.headline,
    photo?.[`title_${langCode}`],
    photo?.title,
    photo?.caption
  );
  if (explicitTitle && !isFilenameLikeDescription(explicitTitle)) {
    return explicitTitle;
  }
  return `${peakName} - ${viewDescription}`;
};

const buildGallery = (photos, peakName, peakSlug, langCode) => {
  const safeSlug = cleanText(peakSlug || "peak")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "peak";
  if (!Array.isArray(photos) || photos.length === 0) {
    const viewDescription = defaultHeroViewDescription(langCode);
    const alt = buildForcePatternAlt(peakName, viewDescription, langCode);
    return `<figure class="peak-photo" id="photo-${safeSlug}-001">
      <img src="${FALLBACK_IMAGE}" alt="${escapeHtml(alt)}" loading="lazy" width="${FALLBACK_IMAGE_WIDTH}" height="${FALLBACK_IMAGE_HEIGHT}" />
      <figcaption>
        <span class="photo-title">${escapeHtml(buildPhotoTitleLine({}, peakName, langCode, viewDescription))}</span>
        <div class="exif-data"><code>${escapeHtml(buildExifCodeText({}, langCode))}</code></div>
      </figcaption>
    </figure>`;
  }

  return photos
    .map((photo, index) => {
      const photoMeta = photo && typeof photo === "object" ? photo : { url: photo };
      const { alt, altLang, extendedDescription, extendedDescriptionLang } = buildPhotoTexts(
        photoMeta,
        peakName,
        langCode
      );
      const viewDescription = stripHeroAltPattern(alt, peakName) || cleanText(extendedDescription) || defaultHeroViewDescription(langCode);
      const titleText = buildPhotoTitleLine(photoMeta, peakName, langCode, viewDescription);
      const url = normalizePhotoUrl(photoMeta.url) || "";
      if (!url) {
        throw new Error(`Photo URL missing for ${peakName} (${safeSlug}) at index ${index + 1}.`);
      }
      const { width, height } = resolvePhotoDimensions(photoMeta);
      if (!width || !height) {
        throw new Error(
          `Missing image dimensions for ${peakName} (${safeSlug}) photo ${index + 1}. Expected width and height in data/nh48.json.`
        );
      }
      const figureId = `photo-${safeSlug}-${String(index + 1).padStart(3, "0")}`;
      const langAttr = altLang ? ` lang="${altLang}"` : "";
      const titleLangAttr = extendedDescriptionLang || altLang ? ` lang="${extendedDescriptionLang || altLang}"` : "";
      const exifCode = buildExifCodeText(photoMeta, langCode);

      return `<figure class="peak-photo" id="${figureId}">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" width="${width}" height="${height}"${langAttr} />
        <figcaption>
          <span class="photo-title"${titleLangAttr}>${escapeHtml(titleText)}</span>
          <div class="exif-data"><code>${escapeHtml(exifCode)}</code></div>
        </figcaption>
      </figure>`;
    })
    .join("\n");
};

const buildExperienceSection = (experience, labels) => {
  if (!experience || typeof experience !== "object") return "";

  const summary = cleanText(experience.experienceSummary);
  const conditions = cleanText(experience.conditionsFromExperience);
  const tip = cleanText(experience.planningTip);
  const firstAscent = cleanText(experience.firstAscent);
  const historyNotes = cleanText(experience.historyNotes);
  const historySourceUrl = cleanText(experience.historySourceUrl);
  const historySourceLabel = cleanText(experience.historySourceLabel);
  const lastReviewed = cleanText(experience.lastReviewed);
  if (!summary && !conditions && !tip && !historyNotes) return "";

  const items = [
    summary
      ? `<article class="experience-item"><h3>${escapeHtml(labels.experienceSummary || "Experience summary")}</h3><p>${escapeHtml(summary)}</p></article>`
      : "",
    conditions
      ? `<article class="experience-item"><h3>${escapeHtml(labels.conditionsFromExperience || "Conditions from experience")}</h3><p>${escapeHtml(conditions)}</p></article>`
      : "",
    tip
      ? `<article class="experience-item"><h3>${escapeHtml(labels.planningTip || "Planning tip")}</h3><p>${escapeHtml(tip)}</p></article>`
      : "",
    historyNotes
      ? `<article class="experience-item"><h3>${escapeHtml(labels.historyNotes || "History notes")}</h3><p>${escapeHtml(
        [firstAscent ? `First ascent: ${firstAscent}.` : "", historyNotes].filter(Boolean).join(" ")
      )}</p>${historySourceUrl ? `<p><a href="${escapeHtml(historySourceUrl)}" target="_blank" rel="noopener">${escapeHtml(historySourceLabel || "Source")}</a></p>` : ""}</article>`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const reviewed = lastReviewed
    ? `<p class="experience-updated"><small>Last reviewed: ${escapeHtml(lastReviewed)}</small></p>`
    : "";

  return `<section class="experience-panel" aria-labelledby="trailTestedHeading">
        <h2 id="trailTestedHeading">${escapeHtml(labels.trailTestedNotes || "Trail-tested notes")}</h2>
        <div class="experience-grid">
          ${items}
        </div>
        ${reviewed}
      </section>`;
};

const escapeScriptJson = (value) => String(value).replace(/<\/script/gi, "<\\/script");

const buildBreadcrumbData = (pageName, canonicalUrl, homeUrl, labels, rangeContext = {}) => ({
  "@type": "BreadcrumbList",
  "@id": `${canonicalUrl}#breadcrumb`,
  name: `${pageName} breadcrumb trail`,
  description: `Navigation path to ${pageName} within the White Mountains peak guides`,
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      item: {
        "@type": "WebPage",
        "@id": homeUrl || HOME_URL,
        url: homeUrl || HOME_URL,
        name: labels?.breadcrumbHome || "Home",
      },
    },
    {
      "@type": "ListItem",
      position: 2,
      item: {
        "@type": "WebPage",
        "@id": rangeContext.whiteMountainsUrl || WHITE_MOUNTAINS_HUB_EN,
        url: rangeContext.whiteMountainsUrl || WHITE_MOUNTAINS_HUB_EN,
        name: labels?.breadcrumbWhiteMountains || "White Mountains",
      },
    },
    {
      "@type": "ListItem",
      position: 3,
      item: {
        "@type": "WebPage",
        "@id": rangeContext.rangeUrl || `${HOME_URL}`,
        url: rangeContext.rangeUrl || `${HOME_URL}`,
        name: rangeContext.rangeName || "White Mountains",
      },
    },
    {
      "@type": "ListItem",
      position: 4,
      item: {
        "@type": "WebPage",
        "@id": canonicalUrl,
        url: canonicalUrl,
        name: pageName,
      },
    },
  ],
});

const buildBreadcrumbJson = (pageName, canonicalUrl, homeUrl, labels, rangeContext, breadcrumbData) => JSON.stringify(
  {
    "@context": "https://schema.org",
    ...(breadcrumbData || buildBreadcrumbData(pageName, canonicalUrl, homeUrl, labels, rangeContext)),
  },
  null,
  2
);

const buildWebPageSchema = (
  pageName,
  canonicalUrl,
  descriptionText,
  primaryImage,
  langCode,
  mapId,
  organizationNode,
  webSiteNode
) => {
  const webSiteId = cleanText(webSiteNode?.["@id"]) || "https://nh48.info/#website";
  const organizationId = cleanText(organizationNode?.["@id"]) || "https://nh48.info/#organization";
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${canonicalUrl}#webpage`,
      name: `${pageName} â€” White Mountain National Forest`,
      description: descriptionText,
      url: canonicalUrl,
      inLanguage: langCode === 'fr' ? 'fr-FR' : 'en-US',
      hasMap: mapId ? { "@id": mapId } : undefined,
      mainEntity: {
        "@type": "Mountain",
        "@id": `${canonicalUrl}#mountain`,
        name: pageName,
      },
      isPartOf: { "@id": webSiteId },
      publisher: { "@id": organizationId },
      primaryImageOfPage: primaryImage?.url ? {
        "@type": "ImageObject",
        url: primaryImage.url,
        width: primaryImage.width,
        height: primaryImage.height
      } : undefined,
      breadcrumb: {
        "@id": `${canonicalUrl}#breadcrumb`
      },
      potentialAction: {
        "@type": "ReadAction",
        target: canonicalUrl
      }
    },
    null,
    2
  );
};

const buildMapSchema = (peakName, canonicalUrl, coordinates) => {
  if (!coordinates?.latitude || !coordinates?.longitude) return null;
  const mapId = `${canonicalUrl}#peak-trail-map`;
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "Map",
      "@id": mapId,
      name: `Topographic trail map for ${peakName}`,
      url: `${canonicalUrl}#peak-trail-map`,
      contentLocation: {
        "@type": "GeoCoordinates",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      },
      about: { "@type": "Mountain", "@id": `${canonicalUrl}#mountain` },
    },
    null,
    2
  );
};

const buildFAQSchema = (peakName, routes, difficulty, time, langCode) => {
  const isEnglish = langCode === 'en';
  const faqs = [];

  // Add route question if routes exist
  if (Array.isArray(routes) && routes.length > 0) {
    const routeNames = routes.map(r => cleanText(r["Route Name"] || r.name || "")).filter(Boolean);
    if (routeNames.length > 0) {
      faqs.push({
        "@type": "Question",
        name: isEnglish ? `What are the main hiking routes to ${peakName}?` : `Quels sont les principaux itinÃ©raires de randonnÃ©e vers ${peakName} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: isEnglish
            ? `The main routes to ${peakName} include: ${routeNames.join(', ')}.`
            : `Les principaux itinÃ©raires vers ${peakName} incluent : ${routeNames.join(', ')}.`
        }
      });
    }
  }

  // Add difficulty question
  if (difficulty && difficulty !== 'Unknown' && difficulty !== 'Inconnu') {
    faqs.push({
      "@type": "Question",
      name: isEnglish ? `How difficult is hiking ${peakName}?` : `Quelle est la difficultÃ© de la randonnÃ©e vers ${peakName} ?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: isEnglish
          ? `${peakName} is rated as ${difficulty} difficulty.`
          : `${peakName} est classÃ© comme ${difficulty} en difficultÃ©.`
      }
    });
  }

  // Add time question
  if (time && time !== 'Varies' && time !== 'Variable') {
    faqs.push({
      "@type": "Question",
      name: isEnglish ? `How long does it take to hike ${peakName}?` : `Combien de temps faut-il pour faire la randonnÃ©e vers ${peakName} ?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: isEnglish
          ? `Typically, hiking ${peakName} takes ${time}.`
          : `Typiquement, la randonnÃ©e vers ${peakName} prend ${time}.`
      }
    });
  }

  if (faqs.length === 0) return null;

  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs
    },
    null,
    2
  );
};

const formatRouteSummary = (route) => {
  if (!route || typeof route !== "object") return "";
  const name = cleanText(route["Route Name"] || route.name || "");
  const distance = cleanText(route["Distance (mi)"] || route.distance || "");
  const gain = cleanText(route["Elevation Gain (ft)"] || route.elevationGain || "");
  const difficulty = cleanText(route["Difficulty"] || route.difficulty || "");
  const trailType = cleanText(route["Trail Type"] || route.trailType || "");
  const details = [distance && `${distance} mi`, gain && `${gain} ft gain`, trailType, difficulty]
    .filter(Boolean)
    .join(" â€¢ ");
  if (!name && !details) return "";
  return details ? `${name || "Route"} (${details})` : name;
};

const normalizePeakValue = (value) => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizePeakValue(item))
      .filter(Boolean)
      .join("; ");
  }
  if (typeof value === "object") {
    if (
      "Route Name" in value ||
      "Distance (mi)" in value ||
      "Elevation Gain (ft)" in value ||
      "Trail Type" in value
    ) {
      return formatRouteSummary(value);
    }
    return Object.entries(value)
      .map(([key, val]) => {
        const text = normalizePeakValue(val);
        return text ? `${key}: ${text}` : "";
      })
      .filter(Boolean)
      .join(", ");
  }
  return cleanText(value);
};

const buildPeakAdditionalProperties = (peak) => {
  const properties = [];
  const addProperty = (name, value) => {
    const text = normalizePeakValue(value);
    if (!text) return;
    properties.push({ "@type": "PropertyValue", name, value: text });
  };

  addProperty("Standard Routes", peak["Standard Routes"]);
  addProperty("Typical Completion Time", peak["Typical Completion Time"]);
  addProperty("Best Seasons to Hike", peak["Best Seasons to Hike"]);
  addProperty("Exposure Level", peak["Exposure Level"]);
  addProperty("Terrain Character", peak["Terrain Character"]);
  addProperty("Scramble Sections", peak["Scramble Sections"]);
  addProperty("Water Availability", peak["Water Availability"]);
  addProperty("Cell Reception Quality", peak["Cell Reception Quality"]);
  addProperty("Weather Exposure Rating", peak["Weather Exposure Rating"]);
  addProperty("Emergency Bailout Options", peak["Emergency Bailout Options"]);
  addProperty("Dog Friendly", peak["Dog Friendly"]);
  addProperty("Summit Marker Type", peak["Summit Marker Type"]);
  addProperty("View Type", peak["View Type"]);
  addProperty("Flora/Environment Zones", peak["Flora/Environment Zones"]);
  addProperty("Nearby Notable Features", peak["Nearby Notable Features"]);
  addProperty("Nearby 4000-footer Connections", peak["Nearby 4000-footer Connections"]);
  addProperty("Trail Names", peak["Trail Names"]);
  addProperty("Most Common Trailhead", peak["Most Common Trailhead"]);
  addProperty("Parking Notes", peak["Parking Notes"]);

  return properties;
};

const dedupeJsonLdNodesById = (nodes) => {
  const seen = new Set();
  const deduped = [];

  nodes.forEach((node) => {
    if (!node || typeof node !== "object") return;
    const nodeId = cleanText(node["@id"] || "");
    if (nodeId) {
      if (seen.has(nodeId)) return;
      seen.add(nodeId);
    }
    deduped.push(node);
  });

  return deduped;
};

const normalizeSchemaNode = (node, fallback) => {
  if (!node || typeof node !== "object") return fallback;
  const copy = { ...node };
  delete copy["@context"];
  return { ...fallback, ...copy };
};

const buildCreativeSameAs = () => [
  HOME_URL,
  INSTAGRAM_URL,
  "https://www.facebook.com/natedumpspics",
  "https://www.etsy.com/shop/NH48pics"
];

const resolveImageBySlug = (imageObjects, imageSlug) => {
  if (!imageSlug) return null;
  return (imageObjects || []).find((img) => {
    const imgId = cleanText(img?.["@id"] || "");
    const imgUrl = cleanText(img?.url || "");
    return imgId.includes(imageSlug) || imgUrl.includes(imageSlug);
  }) || null;
};

const buildCreativeWorkForPeak = ({
  entry,
  canonicalUrl,
  peakName,
  descriptionText,
  primaryImage,
  imageObjects,
  publisherNode,
  personNode,
  webPageNode
}) => {
  const type = entry?.type || "Photograph";
  const typeList = Array.isArray(type) ? type : [type];
  const creativeTypes = typeList.includes("CreativeWork")
    ? typeList
    : ["CreativeWork", ...typeList];
  const resolvedPrimary = resolveImageBySlug(imageObjects, entry?.imageSlug) || primaryImage;
  const associatedMedia = Array.isArray(entry?.associatedMediaSlugs) && entry.associatedMediaSlugs.length
    ? entry.associatedMediaSlugs
      .map((slug) => resolveImageBySlug(imageObjects, slug))
      .filter(Boolean)
      .map((img) => ({ "@id": img["@id"] }))
    : (imageObjects || []).map((img) => ({ "@id": img["@id"] }));

  const node = {
    "@type": creativeTypes,
    "@id": `${canonicalUrl}#creativework`,
    url: canonicalUrl,
    name: entry?.name || `${peakName} fine-art photograph`,
    description: entry?.description || descriptionText,
    thumbnailUrl: entry?.thumbnail || resolvedPrimary?.url || undefined,
    datePublished: entry?.datePublished,
    publisher: { "@id": publisherNode["@id"] },
    creator: { "@id": personNode["@id"] },
    sameAs: buildCreativeSameAs(),
    isPartOf: { "@id": publisherNode["@id"] },
    mainEntityOfPage: { "@id": webPageNode["@id"] },
    image: resolvedPrimary?.["@id"] ? [{ "@id": resolvedPrimary["@id"] }] : undefined,
    associatedMedia: associatedMedia.length ? associatedMedia : undefined
  };

  Object.keys(node).forEach((key) => node[key] === undefined && delete node[key]);
  return node;
};

const buildJsonLd = (
  peak,
  canonicalUrl,
  coordinates,
  photoSet,
  descriptionText,
  range,
  langConfig,
  englishName,
  localizedName,
  geographyRefs,
  organizationData,
  websiteData,
  personData,
  creativeEntry,
  seoContext = {}
) => {
  const peakName = cleanText(localizedName || peak.peakName || peak["Peak Name"] || peak.slug);
  const elevationFt = numberFrom(peak["Elevation (ft)"]);
  const prominenceFt = numberFrom(peak["Prominence (ft)"]);
  const difficulty = cleanText(peak["Difficulty"]);
  const trailType = cleanText(peak["Trail Type"]);
  const routeEntities = buildRouteEntities(peak["Standard Routes"], peak, canonicalUrl);
  const routeRefs = routeEntities.map((route) => ({ "@id": route["@id"] }));
  const sameAsLinks = Array.isArray(peak.sameAs)
    ? peak.sameAs.filter(Boolean)
    : peak.sameAs
      ? [peak.sameAs]
      : [];
  const peakSlug = cleanText(peak.slug || peak.slug_en || peak.Slug || "");
  const parkingEntry = seoContext?.parkingLookup?.[peakSlug] || null;
  const difficultyEntry = seoContext?.difficultyLookup?.[peakSlug] || null;
  const riskEntry = seoContext?.riskLookup?.[peakSlug] || null;
  const monthName = seoContext?.monthName || getEasternMonthName();
  const monthlyWeather = seoContext?.monthlyWeather?.[monthName] || null;
  const experience = seoContext?.experience && typeof seoContext.experience === "object"
    ? seoContext.experience
    : null;
  const technicalDifficultyValue = Number.isFinite(Number(difficultyEntry?.technicalDifficulty))
    ? Number(difficultyEntry.technicalDifficulty)
    : "Unknown";
  const physicalEffortValue = Number.isFinite(Number(difficultyEntry?.physicalEffort))
    ? Number(difficultyEntry.physicalEffort)
    : "Unknown";
  const currentWindSpeedValue = Number.isFinite(Number(monthlyWeather?.avgWindMph))
    ? Number(monthlyWeather.avgWindMph)
    : "Unknown";
  const currentTemperatureValue = Number.isFinite(Number(monthlyWeather?.avgTempF))
    ? Number(monthlyWeather.avgTempF)
    : "Unknown";
  const overviewText =
    cleanText(descriptionText) ||
    cleanText(peak["Terrain Character"]) ||
    cleanText(peak["View Type"]) ||
    `${peakName} is one of New Hampshire's 4,000-foot peaks.`;
  const narrativeParts = [
    {
      "@type": "WebPageElement",
      "@id": `${canonicalUrl}#overview`,
      name: "Mountain Overview",
      text: overviewText
    }
  ];

  if (experience) {
    const pushNarrativePart = (name, text, suffix) => {
      const normalized = cleanText(text);
      if (!normalized) return;
      narrativeParts.push({
        "@type": "WebPageElement",
        "@id": `${canonicalUrl}#${suffix}`,
        name,
        text: normalized
      });
    };
    pushNarrativePart(`${peakName} Summary`, experience.experienceSummary, "trail-tested-summary");
    pushNarrativePart(`Conditions on ${peakName}`, experience.conditionsFromExperience, "trail-tested-conditions");
    pushNarrativePart("Planning Trip", experience.planningTip, "trail-tested-planning");
  }

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
    {
      "@type": "PropertyValue",
      name: "Technical Difficulty (1-10)",
      value: technicalDifficultyValue
    },
    {
      "@type": "PropertyValue",
      name: "Physical Effort (1-10)",
      value: physicalEffortValue
    },
    {
      "@type": "PropertyValue",
      name: "Current Wind Speed (mph)",
      value: currentWindSpeedValue
    },
    {
      "@type": "PropertyValue",
      name: "Current Temperature (F)",
      value: currentTemperatureValue
    },
    Array.isArray(riskEntry?.risk_factors) && riskEntry.risk_factors.length
      ? {
        "@type": "PropertyValue",
        name: "Risk Factors",
        value: riskEntry.risk_factors.join(", "),
      }
      : null,
    cleanText(riskEntry?.prep_notes)
      ? {
        "@type": "PropertyValue",
        name: "Preparation Notes",
        value: cleanText(riskEntry.prep_notes),
      }
      : null,
    ...buildPeakAdditionalProperties(peak),
  ].filter(Boolean);

  const imageObjects = Array.isArray(photoSet?.imageObjects) && photoSet.imageObjects.length
    ? photoSet.imageObjects
    : photoSet?.primary?.url
      ? [
        {
          '@type': 'ImageObject',
          '@id': `${canonicalUrl}#img-001`,
          url: photoSet.primary.url,
          contentUrl: photoSet.primary.url,
          name: photoSet.primary.headline || peakName,
          caption: photoSet.primary.alt || photoSet.primary.description || descriptionText,
          description: photoSet.primary.extendedDescription || photoSet.primary.description || descriptionText,
          creditText: AUTHOR_NAME,
          creator: { '@type': 'Person', name: AUTHOR_NAME },
          author: { '@type': 'Person', name: AUTHOR_NAME },
          copyrightNotice: `Â© ${AUTHOR_NAME}`,
          license: IMAGE_LICENSE_URL,
          acquireLicensePage: IMAGE_LICENSE_URL,
          usageInfo: IMAGE_LICENSE_URL,
          copyrightHolder: { '@type': 'Person', name: AUTHOR_NAME },
          thumbnailUrl: photoSet.primary.url || undefined,
          keywords: photoSet.primary.keywords?.length ? photoSet.primary.keywords : undefined,
          contentLocation: {
            '@type': 'Place',
            name: 'White Mountain National Forest',
          },
          dateCreated: photoSet.primary.dateCreated || undefined,
          representativeOfPage: true,
          width: photoSet.primary.width || undefined,
          height: photoSet.primary.height || undefined,
          exifData: Array.isArray(photoSet.primary.exifPropertyValues)
            ? photoSet.primary.exifPropertyValues
            : buildCanonicalExifData({}),
        },
      ]
      : undefined;

  const primaryImage = imageObjects?.find((img) => img.representativeOfPage) || imageObjects?.[0];
  const imageList = imageObjects ? [...imageObjects] : [];
  if (primaryImage && !imageList.find((img) => img['@id'] === primaryImage['@id'])) {
    imageList.unshift(primaryImage);
  }

  const imageGallery = imageObjects?.length
    ? {
      '@type': 'ImageGallery',
      '@id': `${canonicalUrl}#image-gallery`,
      name: `${peakName} photo gallery`,
      description: `Photos of ${peakName} in the White Mountains`,
      associatedMedia: imageObjects.map((img) => ({ '@id': img['@id'] })),
    }
    : undefined;

  const geoNode = coordinates.latitude && coordinates.longitude
    ? {
      "@type": "GeoCoordinates",
      "@id": `${canonicalUrl}#geo`,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    }
    : undefined;

  const whiteMountainForestNode = {
    "@type": "Place",
    "@id": `${canonicalUrl}#white-mountain-national-forest`,
    name: "White Mountain National Forest",
  };

  const publisherNode = normalizeSchemaNode(organizationData, {
    "@type": "Organization",
    "@id": "https://nh48.info/#organization",
    name: "NH48pics",
    legalName: "NH48pics.com",
    url: HOME_URL,
    logo: {
      "@type": "ImageObject",
      url: "https://nh48.info/nh48API_logo.png",
      width: 512,
      height: 512
    },
    description: "Professional mountain photography covering the New Hampshire 4,000-footers and beyond.",
    sameAs: [
      "https://www.instagram.com/nate_dumps_pics/",
      "https://www.facebook.com/natedumpspics",
      "https://www.etsy.com/shop/NH48pics"
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "White Mountains",
      addressRegion: "NH",
      addressCountry: "US"
    },
    founder: { "@id": "https://nh48.info/#person-nathan-sobol" }
  });

  const dataCatalogNode = {
    "@type": "DataCatalog",
    "@id": `${canonicalUrl}#nh48-peak-dataset`,
    name: "NH48 Peak Dataset",
    url: "https://nh48.info/catalog",
    publisher: { "@id": publisherNode["@id"] },
  };

  const personNode = normalizeSchemaNode(personData, {
    "@type": "Person",
    "@id": "https://nh48.info/#person-nathan-sobol",
    name: "Nathan Sobol",
    alternateName: "Nathan Sobol Photography",
    url: "https://nh48.info/about/",
    sameAs: [
      "https://www.instagram.com/nate_dumps_pics/",
      "https://www.facebook.com/natedumpspics",
      "https://www.etsy.com/shop/NH48pics"
    ],
    worksFor: { "@id": publisherNode["@id"] }
  });

  const webSiteNode = normalizeSchemaNode(websiteData, {
    "@type": "WebSite",
    "@id": "https://nh48.info/#website",
    name: "NH48pics",
    url: HOME_URL,
    description: "Fine-art photography and trail resources for the NH 48 4,000-footers.",
    sameAs: [
      "https://www.nh48pics.com/",
      "https://www.nh48.app/",
      "https://www.instagram.com/nate_dumps_pics/",
      "https://www.etsy.com/shop/NH48pics"
    ],
    publisher: { "@id": publisherNode["@id"] },
    copyrightHolder: { "@id": publisherNode["@id"] },
    inLanguage: ["en", "fr"],
    potentialAction: {
      "@type": "SearchAction",
      target: "https://nh48.info/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  });

  const webPageNode = {
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: `${peakName} â€” White Mountain National Forest`,
    isPartOf: { "@id": webSiteNode["@id"] },
  };

  const creativeWorkNode = buildCreativeWorkForPeak({
    entry: creativeEntry,
    canonicalUrl,
    peakName,
    descriptionText,
    primaryImage,
    imageObjects: imageObjects || [],
    publisherNode,
    personNode,
    webPageNode
  });

  const parkingPlaceNode = (() => {
    const trailhead = cleanText(parkingEntry?.trailheadName || peak["Most Common Trailhead"] || "");
    const parkingNotes = cleanText(parkingEntry?.notes || peak["Parking Notes"] || "");
    const parkingLat = numberFrom(parkingEntry?.parkingLat);
    const parkingLng = numberFrom(parkingEntry?.parkingLng);
    const capacity = numberFrom(parkingEntry?.capacity);
    const fullBy = cleanText(parkingEntry?.fullBy || "");
    if (!trailhead && !parkingNotes && parkingLat == null && parkingLng == null) return undefined;
    const place = {
      "@type": "ParkingFacility",
      name: trailhead || `${peakName} trailhead parking`,
      description: parkingNotes || undefined,
      geo: parkingLat != null && parkingLng != null
        ? {
          "@type": "GeoCoordinates",
          latitude: parkingLat,
          longitude: parkingLng
        }
        : undefined,
      maximumAttendeeCapacity: capacity != null ? capacity : undefined,
      additionalProperty: fullBy
        ? [{
          "@type": "PropertyValue",
          name: "Full By",
          value: fullBy
        }]
        : undefined
    };
    Object.keys(place).forEach((key) => place[key] === undefined && delete place[key]);
    return place;
  })();

  const weatherObservationNode = (() => {
    if (!monthlyWeather) return undefined;
    const avgWind = numberFrom(monthlyWeather.avgWindMph);
    const avgTemp = numberFrom(monthlyWeather.avgTempF);
    const avgGust = numberFrom(monthlyWeather.avgWindGustMph);
    if (avgWind == null && avgTemp == null && avgGust == null) return undefined;
    const node = {
      "@type": "WeatherObservation",
      dateObserved: new Date().toISOString().slice(0, 10),
      description: `${monthName} summit averages for White Mountains conditions`,
      windSpeed: avgWind != null ? `${avgWind} mph` : undefined,
      temperature: avgTemp != null ? `${avgTemp} F` : undefined,
      additionalProperty: avgGust != null
        ? [{
          "@type": "PropertyValue",
          name: `${monthName} Average Wind Gust (mph)`,
          value: avgGust,
          unitText: "MPH"
        }]
        : undefined
    };
    Object.keys(node).forEach((key) => node[key] === undefined && delete node[key]);
    return node;
  })();

  const historyCreativeWorkNode = (() => {
    const firstAscent = cleanText(experience?.firstAscent || "");
    const historyNotes = cleanText(experience?.historyNotes || "");
    const historySourceUrl = cleanText(experience?.historySourceUrl || "");
    const historySourceLabel = cleanText(experience?.historySourceLabel || "");
    if (!historySourceUrl || (!firstAscent && !historyNotes)) return undefined;
    return {
      "@type": "CreativeWork",
      "@id": `${canonicalUrl}#history`,
      name: `${peakName} history notes`,
      description: [firstAscent ? `First ascent: ${firstAscent}.` : "", historyNotes]
        .filter(Boolean)
        .join(" "),
      url: historySourceUrl,
      isBasedOn: historySourceUrl,
      publisher: historySourceLabel || undefined
    };
  })();

  const mountainNode = {
    "@type": ["Mountain", "TouristAttraction"],
    "@id": `${canonicalUrl}#mountain`,
    name: peakName,
    alternateName:
      langConfig.code !== "en" && englishName && englishName !== peakName ? englishName : undefined,
    description: descriptionText,
    url: canonicalUrl,
    author: AUTHOR_NAME,
    inLanguage: langConfig.code === "fr" ? "fr-FR" : "en-US",
    image: imageList.length ? imageList.map((img) => ({ '@id': img['@id'] })) : undefined,
    primaryImageOfPage: primaryImage ? { '@id': primaryImage['@id'] } : undefined,
    geo: geoNode ? { "@id": geoNode["@id"] } : undefined,
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
    containedInPlace: [
      geographyRefs.wmnf,
      geographyRefs.newHampshire,
      geographyRefs.newEngland,
      geographyRefs.usa,
    ].map((ref) => ({ "@id": ref["@id"] })),
    landManager: { "@id": geographyRefs.usfs["@id"] },
    additionalProperty: additionalProperty.length ? additionalProperty : undefined,
    containsPlace: parkingPlaceNode,
    isPartOf: { "@id": dataCatalogNode["@id"] },
    publisher: { "@id": publisherNode["@id"] },
    sameAs: sameAsLinks.length ? sameAsLinks : undefined,
    subjectOf: [imageGallery ? { '@id': imageGallery['@id'] } : null, historyCreativeWorkNode ? { "@id": historyCreativeWorkNode["@id"] } : null].filter(Boolean),
    weather: weatherObservationNode,
    mainEntityOfPage: { "@id": webPageNode["@id"] },
    hasPart: narrativeParts,
  };

  if (!mountainNode.subjectOf || !mountainNode.subjectOf.length) {
    mountainNode.subjectOf = undefined;
  }

  Object.keys(mountainNode).forEach((key) => mountainNode[key] === undefined && delete mountainNode[key]);

  const peakTrailGuideNode = {
    "@type": "HikingTrail",
    "@id": `${canonicalUrl}#peak-trail-guide`,
    name: `${peakName} standard route guide`,
    description: `Standard hiking routes and planning details for ${peakName}.`,
    about: { "@id": mountainNode["@id"] },
    isPartOf: { "@id": webPageNode["@id"] },
    hasPart: routeRefs.length ? routeRefs : undefined,
  };
  Object.keys(peakTrailGuideNode).forEach((key) => peakTrailGuideNode[key] === undefined && delete peakTrailGuideNode[key]);

  const graph = dedupeJsonLdNodesById([
    mountainNode,
    peakTrailGuideNode,
    webPageNode,
    dataCatalogNode,
    publisherNode,
    personNode,
    webSiteNode,
    creativeWorkNode,
    historyCreativeWorkNode,
    whiteMountainForestNode,
    geoNode,
    imageGallery,
    ...(imageObjects || []),
    ...routeEntities,
  ]);

  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@graph": graph,
    },
    null,
    2
  );
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

const buildPeakBootstrapPayload = ({
  slug,
  langCode,
  peak,
  localizedName,
  summaryText,
  heroImage,
  heroAlt
}) => {
  const payload = {
    slug,
    locale: langCode,
    localizedName,
    summary: summaryText,
    heroImage,
    heroAlt,
    peak
  };
  return JSON.stringify(payload);
};

const readFile = (filePath, label) => {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error(`Failed to read ${label} at ${filePath}:`, err);
    throw err;
  }
};

const readJsonFile = (filePath, label) => {
  const raw = readFile(filePath, label);
  const cleaned = raw.replace(/^\uFEFF/, "");
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    const match = message.match(/position (\d+)/);
    if (match) {
      const pos = Number(match[1]);
      const start = Math.max(0, pos - 120);
      const end = Math.min(cleaned.length, pos + 120);
      const context = cleaned.slice(start, end);
      console.error(`Failed to parse ${label} at ${filePath} (position ${pos}).`);
      console.error("Context:", context);
    } else {
      console.error(`Failed to parse ${label} at ${filePath}.`);
    }

    const lastClose = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (lastClose > -1 && lastClose < cleaned.length - 1) {
      const truncated = cleaned.slice(0, lastClose + 1).trimEnd();
      try {
        console.warn(`Recovered ${label} by truncating trailing data after position ${lastClose}.`);
        return JSON.parse(truncated);
      } catch (recoveryErr) {
        console.error("Recovery parse failed:", recoveryErr);
      }
    }
    throw err;
  }
};

const main = () => {
  try {
    const selectedLanguageConfigs = parseSelectedLanguageConfigs(process.argv.slice(2));

    console.log("Starting peak prerender...");
    console.log(`Template path: ${TEMPLATE_PATH}`);
    console.log(`Data path: ${DATA_PATH}`);
    console.log(`Output directory: ${OUTPUT_DIR}`);

    const template = readFile(TEMPLATE_PATH, "template");
    const data = readJsonFile(DATA_PATH, "data");
    const geographyData = readJsonFile(GEOGRAPHY_PATH, "geography data");
    const sameAsLookup = readJsonFile(PEAK_SAMEAS_PATH, "peak sameAs lookup");
    const organizationData = readJsonFile(ORGANIZATION_PATH, "organization data");
    const websiteData = readJsonFile(WEBSITE_PATH, "website data");
    const personData = readJsonFile(PERSON_PATH, "person data");
    const creativeWorks = readJsonFile(CREATIVEWORKS_PATH, "creative works");
    const wmnfRanges = readJsonFile(WMNF_RANGES_PATH, "wmnf ranges");
    const peakExperiencesEn = readJsonFile(PEAK_EXPERIENCES_EN_PATH, "peak experiences en");
    const parkingPayload = readJsonFile(PARKING_DATA_PATH, "parking data");
    const monthlyWeather = readJsonFile(MONTHLY_WEATHER_PATH, "monthly weather data");
    const peakDifficulty = readJsonFile(PEAK_DIFFICULTY_PATH, "peak difficulty data");
    const riskOverlayPayload = readJsonFile(RISK_OVERLAY_PATH, "risk overlay data");
    const rangeLookup = buildRangeLookup(wmnfRanges);
    const parkingLookup = buildIndexBySlug(parkingPayload);
    const riskLookup = buildIndexBySlug(riskOverlayPayload);
    const monthName = getEasternMonthName();

    const geographyEntries = Array.isArray(geographyData)
      ? geographyData
      : Array.isArray(geographyData?.places)
        ? geographyData.places
        : Array.isArray(geographyData?.items)
          ? geographyData.items
          : Array.isArray(geographyData?.["@graph"])
            ? geographyData["@graph"]
            : [];
    const geographyById = Object.fromEntries(
      geographyEntries
        .map((entry) => [cleanText(entry?.id || entry?.identifier || entry?.slug), entry])
        .filter(([id, entry]) => id && entry)
    );
    const resolveGeographyRef = (label, candidates) => {
      const match = candidates
        .map((candidate) => geographyById[candidate])
        .find((entry) => entry && cleanText(entry["@id"]));
      if (!match) {
        throw new Error(`Missing geography reference for ${label}. Checked ids: ${candidates.join(', ')}`);
      }
      return match;
    };
    const geographyRefs = {
      usfs: resolveGeographyRef("USFS organization", ["org-usfs", "usfs", "organization-usfs"]),
      usa: resolveGeographyRef("USA", ["country-usa", "usa", "us", "united-states"]),
      newEngland: resolveGeographyRef("New England", ["region-new-england", "new-england"]),
      newHampshire: resolveGeographyRef("New Hampshire", ["state-nh", "new-hampshire", "nh"]),
      wmnf: resolveGeographyRef("WMNF", ["place-wmnf", "wmnf", "white-mountain-national-forest"]),
    };
    Object.entries(data).forEach(([slug, peak]) => {
      const links = Array.isArray(sameAsLookup?.[slug]) ? sameAsLookup[slug].filter(Boolean) : [];
      if (links.length) {
        peak.sameAs = links;
      }
    });
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

      selectedLanguageConfigs.forEach((lang) => {
        const canonicalUrl = `${lang.canonicalBase}/${slug}/`;
        const localizedName = localizePeakName(name, lang.code);
        const formattedElevation = formatFeet(elevation);
        const elevationText = formattedElevation || (elevation ? `${elevation} ft` : lang.defaults.unknown);
        const prominenceText = prominence ? `${prominence} ft` : lang.defaults.unknown;
        const metaTitle = buildMetaTitle(
          lang.code,
          {
            name: localizedName,
            elevation: elevationText,
            elevationFormatted: formattedElevation || elevationText,
            range: rangeValue || lang.defaults.range,
            suffix: lang.titleSuffix || lang.siteName || DEFAULT_SITE_NAME,
            site: lang.siteName || DEFAULT_SITE_NAME,
          },
          (values) => `${values.name} (${values.elevationFormatted || values.elevation}) â€“ ${values.suffix}`
        );
        const { primary: primaryPhoto, imageObjects } = pickPrimaryPhoto(
          peak.photos,
          localizedName,
          lang.code,
          canonicalUrl
        );
        const descriptionValues = {
          name: localizedName,
          elevation: elevation || lang.defaults.unknown,
          prominence: prominence || lang.defaults.unknown,
          range: rangeValue || lang.defaults.range,
        };
        const generatedDescription = buildLocalizedDescription(
          lang.code,
          descriptionValues,
          summary,
          (peakNameText) => lang.descriptionTemplate(peakNameText)
        );
        const descriptionText =
          primaryPhoto.description ||
          primaryPhoto.extendedDescription ||
          generatedDescription;
        const range = rangeValue || lang.defaults.range;
        const difficulty = difficultyValue || lang.defaults.difficulty;
        const trailType = trailTypeValue || lang.defaults.trailType;
        const time = timeValue || lang.defaults.time;
        const heroAlt = buildHeroImageAlt(localizedName, primaryPhoto, lang.code);
        const heroLangAttr = primaryPhoto.altLang ? ` lang="${primaryPhoto.altLang}"` : '';
        const heroCaptionText =
          cleanText(primaryPhoto.extendedDescription) || descriptionText || cleanText(primaryPhoto.description || '');
        const heroCaptionLangAttr =
          primaryPhoto.extendedDescriptionLang || primaryPhoto.altLang
            ? ` lang="${primaryPhoto.extendedDescriptionLang || primaryPhoto.altLang}"`
            : '';
        const mapId =
          coordinates.latitude && coordinates.longitude
            ? `${canonicalUrl}#peak-trail-map`
            : null;
        const mapSchema = mapId ? buildMapSchema(localizedName, canonicalUrl, coordinates) : null;
        const rangeContext = resolveRangeContext(rangeValue, rangeLookup, lang.defaults.range);
        const whiteMountainsUrl = lang.code === "fr" ? WHITE_MOUNTAINS_HUB_FR : WHITE_MOUNTAINS_HUB_EN;
        const breadcrumbRangeName = rangeContext.rangeName || range || lang.defaults.range;
        const breadcrumbRangeUrl = rangeContext.rangeUrl || whiteMountainsUrl;
        const experience = lang.code === "en" ? peakExperiencesEn?.[slug] : null;
        const experienceSection = lang.code === "en" ? buildExperienceSection(experience, lang.labels) : "";

        const values = {
          LANG: lang.hreflang,
          TITLE: escapeHtml(metaTitle),
          DESCRIPTION: escapeHtml(descriptionText),
          OG_SITE_NAME: escapeHtml(lang.siteName || DEFAULT_SITE_NAME),
          OG_LOCALE: lang.ogLocale || "en_US",
          OG_LOCALE_ALT: lang.ogLocaleAlternate || "en_US",
          CANONICAL_URL: canonicalUrl,
          CANONICAL_EN_URL: `${CANONICAL_BASE}/${slug}/`,
          CANONICAL_FR_URL: `https://nh48.info/fr/peak/${slug}/`,
          CANONICAL_XDEFAULT_URL: `${CANONICAL_BASE}/${slug}/`,
          OG_IMAGE: primaryPhoto.url,
          OG_IMAGE_WIDTH: primaryPhoto.width || "",
          OG_IMAGE_HEIGHT: primaryPhoto.height || "",
          OG_IMAGE_ALT: escapeHtml(heroAlt),
          AUTHOR_NAME: AUTHOR_NAME,
          PAGE_CREATOR: escapeHtml(primaryPhoto.creator || AUTHOR_NAME),
          PHOTO_CREDIT: escapeHtml(primaryPhoto.creditText || primaryPhoto.creator || AUTHOR_NAME),
          PHOTO_PUBLISHER: escapeHtml(primaryPhoto.publisherName || TWITTER_HANDLE),
          PHOTO_KEYWORDS: escapeHtml((primaryPhoto.keywords || []).join(", ")),
          PHOTO_EXIF: escapeHtml(primaryPhoto.exifData || ""),
          THEME_COLOR: "#0a0a0a",
          TWITTER_SITE: TWITTER_HANDLE,
          TWITTER_CREATOR: TWITTER_HANDLE,
          PEAK_NAME: escapeHtml(localizedName),
          HOME_URL: lang.homeUrl || HOME_URL,
          BREADCRUMB_HOME: escapeHtml(lang.labels.breadcrumbHome || "Home"),
          BREADCRUMB_WHITE_MOUNTAINS: escapeHtml(lang.labels.breadcrumbWhiteMountains || "White Mountains"),
          BREADCRUMB_WHITE_MOUNTAINS_URL: whiteMountainsUrl,
          BREADCRUMB_RANGE_NAME: escapeHtml(breadcrumbRangeName),
          BREADCRUMB_RANGE_URL: breadcrumbRangeUrl,
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
          GALLERY_IMAGES: buildGallery(peak.photos, localizedName, slug, lang.code),
          APP_URL: lang.appUrl(slug),
          CATALOG_URL: lang.catalogUrl,
          HERO_IMAGE: primaryPhoto.url,
          HERO_ALT: escapeHtml(heroAlt),
          HERO_LANG_ATTR: heroLangAttr,
          HERO_CAPTION: escapeHtml(heroCaptionText || heroAlt),
          HERO_CAPTION_LANG_ATTR: heroCaptionLangAttr,
          HERO_DIMENSIONS:
            primaryPhoto.width && primaryPhoto.height
              ? `width="${primaryPhoto.width}" height="${primaryPhoto.height}"`
              : "",
          HERO_PRELOAD: primaryPhoto.url,
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
          EXPERIENCE_SECTION: experienceSection,
          PEAK_BOOTSTRAP_JSON: escapeScriptJson(
            buildPeakBootstrapPayload({
              slug,
              langCode: lang.code,
              peak,
              localizedName,
              summaryText: summary || lang.summaryFallback(localizedName),
              heroImage: primaryPhoto.url,
              heroAlt
            })
          ),
          JSON_LD: escapeScriptJson(
            buildJsonLd(
              peak,
              canonicalUrl,
              coordinates,
              { primary: primaryPhoto, imageObjects },
              descriptionText,
              rangeValue || null,
              lang,
              name,
              localizedName,
              geographyRefs,
              organizationData,
              websiteData,
              personData,
              creativeWorks?.[`peak/${slug}`] || creativeWorks?.[slug],
              {
                parkingLookup,
                monthlyWeather,
                difficultyLookup: peakDifficulty,
                riskLookup,
                monthName,
                experience
              }
            )
          ),
          BREADCRUMB_LD: escapeScriptJson(
            buildBreadcrumbJson(lang.code === "fr" ? name : localizedName, canonicalUrl, lang.homeUrl, lang.labels, {
              rangeName: breadcrumbRangeName,
              rangeUrl: breadcrumbRangeUrl,
              whiteMountainsUrl,
            })
          ),
          WEBPAGE_SCHEMA: escapeScriptJson(
            buildWebPageSchema(
              localizedName,
              canonicalUrl,
              descriptionText,
              primaryPhoto,
              lang.code,
              mapId,
              organizationData,
              websiteData
            )
          ),
          MAP_SCHEMA: mapSchema
            ? `<script type="application/ld+json">${escapeScriptJson(mapSchema)}</script>`
            : "",
          FAQ_SCHEMA: (() => {
            const faqJson = buildFAQSchema(localizedName, peak["Standard Routes"], difficulty, time, lang.code);
            return faqJson ? `<script type="application/ld+json">${escapeScriptJson(faqJson)}</script>` : "";
          })(),
          GEO_POSITION: coordinates.latitude && coordinates.longitude
            ? `${coordinates.latitude};${coordinates.longitude}`
            : "",
          GEO_PLACENAME: escapeHtml(localizedName),
          GEO_REGION: "US-NH",
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


