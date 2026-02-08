#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "templates", "peak-page-template.html");
const NAV_PARTIAL_PATH = path.join(ROOT, "pages", "nav.html");
const QUICK_FOOTER_PATH = path.join(ROOT, "pages", "footer.html");
const DATA_PATH = path.join(ROOT, "data", "nh48.json");
const GEOGRAPHY_PATH = path.join(ROOT, "data", "geography.json");
const OUTPUT_DIR = path.join(ROOT, "peaks");
const CANONICAL_BASE = "https://nh48.info/peak";
const HOME_URL = "https://nh48.info/";
const APP_BASE_EN = "https://nh48.info/peak";
const APP_BASE_FR = "https://nh48.info/fr/peak";
const DEFAULT_CATALOG_URL = "https://nh48.info/catalog";
const FALLBACK_IMAGE = "https://nh48.info/nh48-preview.png";
const PHOTO_BASE_URL = "https://photos.nh48.info";
const PHOTO_BASE = new URL(PHOTO_BASE_URL);
const PHOTO_PATH_PREFIX = "/nh48-photos/";
const IMAGE_TRANSFORM_OPTIONS = "format=webp,quality=85,metadata=keep";
const IMAGE_TRANSFORM_PREFIX = `${PHOTO_BASE.origin}/cdn-cgi/image/${IMAGE_TRANSFORM_OPTIONS}`;
const DEFAULT_SITE_NAME = "NH48 Peak Guide";
const IMAGE_LICENSE_URL = "https://creativecommons.org/licenses/by-nc-nd/4.0/";
const PEAK_SAMEAS_PATH = path.join(ROOT, "data", "peak-sameas.json");
const AUTHOR_NAME = "Nathan Sobol";
const TWITTER_HANDLE = "@nate_dumps_pics";

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
    siteName: "NH48 Peak Guide",
    ogLocale: "en_US",
    ogLocaleAlternate: "fr_FR",
    titleSuffix: "NH 48 Peak Guide",
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
      footer: "NH48 pre-rendered info page.",
      noRoutes: "No standard routes are listed for this peak.",
      noRelated: "No related trails listed yet.",
      routeSuffix: " route",
      breadcrumbHome: "Home",
      breadcrumbCatalog: "Peak Catalog",
    },
    appUrl: (slug) => `${APP_BASE_EN}/${slug}`,
  },
  {
    code: "fr",
    hreflang: "fr",
    outputDir: path.join(ROOT, "fr", "peaks"),
    canonicalBase: "https://nh48.info/fr/peaks",
    homeUrl: "https://nh48.info/fr/",
    catalogUrl: DEFAULT_CATALOG_URL,
    siteName: "Guide des sommets NH48",
    ogLocale: "fr_FR",
    ogLocaleAlternate: "en_US",
    titleSuffix: "Guide des sommets NH48",
    descriptionTemplate: (name) => `${name} : page d'info avec itinéraires, altitude et photos.`,
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
      footer: "Page d'info NH48 pré-rendue.",
      noRoutes: "Aucun itinéraire standard n’est listé pour ce sommet.",
      noRelated: "Aucun sentier associé pour le moment.",
      routeSuffix: " itinéraire",
      breadcrumbHome: "Accueil",
      breadcrumbCatalog: "Catalogue des sommets",
    },
    appUrl: (slug) => `${APP_BASE_FR}/${slug}`,
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
  const rangeSplit = lower.split(/(?:-|–|to)/).map((entry) => entry.trim());
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
    .replace(/×/g, 'x')
    .match(/(\d+)\s*x\s*(\d+)/i);
  if (!match) return { width: null, height: null };
  const [, w, h] = match;
  return { width: Number(w), height: Number(h) };
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

const buildExifSummary = (photo) => {
  const parts = [];
  const add = (label, value) => {
    const cleaned = cleanText(value);
    if (cleaned) parts.push(`${label}: ${cleaned}`);
  };

  add('Camera Make', photo.cameraMaker || photo.camera);
  add('Camera Model', photo.cameraModel);
  add('Lens', photo.lens);
  add('F-Stop', photo.fStop);
  add('Shutter Speed', photo.shutterSpeed);
  add('ISO', photo.iso);
  add('Exposure Bias', photo.exposureBias);
  add('Focal Length', photo.focalLength);
  add('Flash Mode', photo.flashMode);
  add('Metering Mode', photo.meteringMode);
  add('Max Aperture', photo.maxAperture);

  return parts.join('; ');
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
  const { width: parsedWidth, height: parsedHeight } = parseDimensions(photo.dimensions || photo.dimension || '');
  const width = parsedWidth || undefined;
  const height = parsedHeight || undefined;
  const { alt, altLang, extendedDescription, extendedDescriptionLang } = buildPhotoTexts(
    photo,
    peakName,
    langCode
  );
  const headline =
    cleanText(photo[`headline_${langCode}`]) || cleanText(photo.headline) || `${peakName} — White Mountain National Forest`;
  const description = cleanText(extendedDescription || photo.caption || '');
  const creatorName = AUTHOR_NAME;
  const creditText = AUTHOR_NAME;
  const publisherName = cleanText(photo.iptc?.featuredOrgName) || TWITTER_HANDLE;
  const copyrightNotice = `© ${AUTHOR_NAME}`;
  const copyrightHolderName = AUTHOR_NAME;
  const rightsUsageTerms = cleanText(photo.iptc?.rightsUsageTerms || photo.rightsUsageTerms);
  const licenseUrl = IMAGE_LICENSE_URL;
  const keywords = buildKeywords(photo);
  const exifData = buildExifSummary(photo);
  const propertyValues = buildPhotoPropertyValues(photo);
  const imageObject = {
    '@type': 'ImageObject',
    '@id': imageId,
    url: normalizedUrl,
    contentUrl: normalizedUrl,
    name: headline || alt,
    caption: description || alt,
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
    exifData: exifData || undefined,
    keywords: keywords.length ? keywords : undefined,
    additionalProperty: propertyValues.length ? propertyValues : undefined,
    representativeOfPage: !!isPrimary,
    width,
    height,
  };

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
    exifData,
    dateCreated: imageObject.dateCreated,
  };
};

const pickPrimaryPhoto = (photos, peakName, langCode, canonicalUrl) => {
  if (!Array.isArray(photos) || photos.length === 0) {
    const fallbackKeywords = [
      peakName,
      "White Mountain National Forest",
      "NH48",
      "New Hampshire",
      "mountain landscape",
    ].filter(Boolean);
    const fallbackImageObject = {
      '@type': 'ImageObject',
      '@id': `${canonicalUrl}#img-001`,
      url: FALLBACK_IMAGE,
      contentUrl: FALLBACK_IMAGE,
      name: `${peakName} — White Mountain National Forest`,
      caption: `${peakName} in the White Mountains`,
      alternateName: `${peakName} in the White Mountains`,
      description: `${peakName} in the White Mountains`,
      creditText: AUTHOR_NAME,
      creator: { '@type': 'Person', name: AUTHOR_NAME },
      author: { '@type': 'Person', name: AUTHOR_NAME },
      copyrightNotice: `© ${AUTHOR_NAME}`,
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
    };
    return {
      primary: {
        url: FALLBACK_IMAGE,
        alt: `${peakName} in the White Mountains`,
        altLang: langCode === 'en' ? undefined : 'en',
        headline: `${peakName} — White Mountain National Forest`,
        description: '',
        extendedDescription: '',
        extendedDescriptionLang: langCode === 'en' ? undefined : 'en',
        width: null,
        height: null,
        creator: AUTHOR_NAME,
        creditText: AUTHOR_NAME,
        publisherName: TWITTER_HANDLE,
        keywords: [],
        exifData: '',
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

const buildPhotoTexts = (photo, peakName, langCode) => {
  const { text: altText, isLocalized: isAltLocalized } = pickLocalizedField(photo, langCode, [
    'altText',
    'alt',
  ]);
  const {
    text: descriptionText,
    isLocalized: isDescriptionLocalized,
  } = pickLocalizedField(photo, langCode, ['extendedDescription', 'description', 'caption', 'headline']);

  let alt = altText || descriptionText;
  let altLang = resolveLangAttr(isAltLocalized || isDescriptionLocalized, langCode);

  if (!alt) {
    const tags = Array.isArray(photo?.tags) ? photo.tags.filter(Boolean) : [];
    if (tags.length) {
      alt = `${peakName} – ${tags.join(', ')}`;
    } else {
      alt = `${peakName} in the White Mountains`;
    }
    altLang = resolveLangAttr(false, langCode);
  }

  const extendedDescription = descriptionText;
  const extendedDescriptionLang = extendedDescription
    ? resolveLangAttr(isDescriptionLocalized, langCode)
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
        .join(" • ");
      return `<li><strong>${escapeHtml(name)}</strong>${details ? ` — ${escapeHtml(details)}` : ""}</li>`;
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

const buildGallery = (photos, peakName, fallbackAlt, langCode) => {
  if (!Array.isArray(photos) || photos.length === 0) {
    const descriptionText = `${peakName} in the White Mountains`;
    return `<figure class="gallery-figure">
      <img src="${FALLBACK_IMAGE}" alt="${escapeHtml(descriptionText)}" loading="lazy" />
      <figcaption>${escapeHtml(descriptionText)}</figcaption>
    </figure>`;
  }

  return photos
    .slice(0, 4)
    .map((photo, index) => {
      const { alt, altLang, extendedDescription, extendedDescriptionLang } = buildPhotoTexts(
        photo,
        peakName,
        langCode
      );
      const descriptionText =
        cleanText(extendedDescription) || cleanText(fallbackAlt) || alt || `${peakName} in the White Mountains`;
      const url = normalizePhotoUrl(photo.url) || FALLBACK_IMAGE;
      const { width, height } = parseDimensions(photo.dimensions || photo.dimension || '');
      const dimensionsAttr = width && height ? ` width="${width}" height="${height}"` : "";
      const langAttr = altLang ? ` lang="${altLang}"` : "";
      const descriptionLangAttr = extendedDescriptionLang || altLang ? ` lang="${extendedDescriptionLang || altLang}"` : "";
      const describedBy = descriptionText ? ` aria-describedby="photo-desc-${index}"` : "";

      return `<figure class="gallery-figure">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy"${dimensionsAttr}${langAttr}${describedBy} />
        ${descriptionText
          ? `<span id="photo-desc-${index}" class="sr-only"${descriptionLangAttr}>${escapeHtml(descriptionText)}</span>
        <figcaption${descriptionLangAttr}>${escapeHtml(descriptionText)}</figcaption>`
          : ''}
      </figure>`;
    })
    .join("\n");
};

const escapeScriptJson = (value) => String(value).replace(/<\/script/gi, "<\\/script");

const buildBreadcrumbData = (pageName, canonicalUrl, catalogUrl, homeUrl, labels) => ({
  "@type": "BreadcrumbList",
  "@id": `${canonicalUrl}#breadcrumb`,
  name: `${pageName} breadcrumb trail`,
  description: `Navigation path to ${pageName} within the NH48 peak catalog`,
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
        "@type": "CollectionPage",
        "@id": catalogUrl || DEFAULT_CATALOG_URL,
        url: catalogUrl || DEFAULT_CATALOG_URL,
        name: labels?.breadcrumbCatalog || "NH48 Peak Catalog",
      },
    },
    {
      "@type": "ListItem",
      position: 3,
      item: {
        "@type": "WebPage",
        "@id": canonicalUrl,
        url: canonicalUrl,
        name: pageName,
      },
    },
  ],
});

const buildBreadcrumbJson = (pageName, canonicalUrl, catalogUrl, homeUrl, labels, breadcrumbData) => JSON.stringify(
  {
    "@context": "https://schema.org",
    ...(breadcrumbData || buildBreadcrumbData(pageName, canonicalUrl, catalogUrl, homeUrl, labels)),
  },
  null,
  2
);

const buildWebPageSchema = (pageName, canonicalUrl, descriptionText, primaryImage, langCode, mapId) => JSON.stringify(
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    name: `${pageName} — White Mountain National Forest`,
    description: descriptionText,
    url: canonicalUrl,
    inLanguage: langCode === 'fr' ? 'fr-FR' : 'en-US',
    hasMap: mapId ? { "@id": mapId } : undefined,
    mainEntity: {
      "@type": "Mountain",
      "@id": `${canonicalUrl}#mountain`,
      name: pageName,
    },
    isPartOf: {
      "@type": "WebSite",
      name: "NH48 Peak Guide",
      url: "https://nh48.info/",
      publisher: {
        "@type": "Organization",
        name: "NH48 Peak Guide",
        url: "https://nh48.info/",
        logo: {
          "@type": "ImageObject",
          url: "https://nh48.info/nh48API_logo.png",
          width: 512,
          height: 512
        }
      }
    },
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
        name: isEnglish ? `What are the main hiking routes to ${peakName}?` : `Quels sont les principaux itinéraires de randonnée vers ${peakName} ?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: isEnglish 
            ? `The main routes to ${peakName} include: ${routeNames.join(', ')}.`
            : `Les principaux itinéraires vers ${peakName} incluent : ${routeNames.join(', ')}.`
        }
      });
    }
  }

  // Add difficulty question
  if (difficulty && difficulty !== 'Unknown' && difficulty !== 'Inconnu') {
    faqs.push({
      "@type": "Question",
      name: isEnglish ? `How difficult is hiking ${peakName}?` : `Quelle est la difficulté de la randonnée vers ${peakName} ?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: isEnglish
          ? `${peakName} is rated as ${difficulty} difficulty.`
          : `${peakName} est classé comme ${difficulty} en difficulté.`
      }
    });
  }

  // Add time question
  if (time && time !== 'Varies' && time !== 'Variable') {
    faqs.push({
      "@type": "Question",
      name: isEnglish ? `How long does it take to hike ${peakName}?` : `Combien de temps faut-il pour faire la randonnée vers ${peakName} ?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: isEnglish
          ? `Typically, hiking ${peakName} takes ${time}.`
          : `Typiquement, la randonnée vers ${peakName} prend ${time}.`
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
    .join(" • ");
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
  geographyRefs
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
          caption: photoSet.primary.description || descriptionText,
          description: photoSet.primary.extendedDescription || photoSet.primary.description || descriptionText,
          creditText: AUTHOR_NAME,
          creator: { '@type': 'Person', name: AUTHOR_NAME },
          author: { '@type': 'Person', name: AUTHOR_NAME },
          copyrightNotice: `© ${AUTHOR_NAME}`,
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

  const publisherNode = {
    "@type": "Organization",
    "@id": "https://nh48.info/#organization",
    name: "NH48 Peak Guide",
    url: HOME_URL,
  };

  const dataCatalogNode = {
    "@type": "DataCatalog",
    "@id": `${canonicalUrl}#nh48-peak-dataset`,
    name: "NH48 Peak Dataset",
    url: "https://nh48.info/catalog",
    publisher: { "@id": publisherNode["@id"] },
  };

  const webSiteNode = {
    "@type": "WebSite",
    "@id": "https://nh48.info/#website",
    name: "NH48 Peak Guide",
    url: HOME_URL,
    publisher: { "@id": publisherNode["@id"] },
  };

  const webPageNode = {
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: `${peakName} — White Mountain National Forest`,
    isPartOf: { "@id": webSiteNode["@id"] },
  };

  const mountainNode = {
    "@type": "Mountain",
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
    containedInPlace: { "@id": whiteMountainForestNode["@id"] },
    containedInPlace: [
      geographyRefs.wmnf,
      geographyRefs.newHampshire,
      geographyRefs.newEngland,
      geographyRefs.usa,
    ].map((ref) => ({ "@id": ref["@id"] })),
    landManager: { "@id": geographyRefs.usfs["@id"] },
    additionalProperty: additionalProperty.length ? additionalProperty : undefined,
    hasPart: routeRefs.length ? routeRefs : undefined,
    containsPlace: (() => {
      const trailhead = cleanText(peak["Most Common Trailhead"] || "");
      const parking = cleanText(peak["Parking Notes"] || "");
      if (!trailhead && !parking) return undefined;
      const place = { "@type": "Place" };
      if (trailhead) place.name = trailhead;
      if (parking) place.description = parking;
      return place;
    })(),
    isPartOf: { "@id": dataCatalogNode["@id"] },
    sameAs: sameAsLinks.length ? sameAsLinks : undefined,
    subjectOf: imageGallery ? [{ '@id': imageGallery['@id'] }] : undefined,
    mainEntityOfPage: { "@id": webPageNode["@id"] },
  };

  Object.keys(mountainNode).forEach((key) => mountainNode[key] === undefined && delete mountainNode[key]);

  const graph = dedupeJsonLdNodesById([
    mountainNode,
    webPageNode,
    dataCatalogNode,
    publisherNode,
    webSiteNode,
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
    const navMenuPartial = readFile(NAV_PARTIAL_PATH, "navigation menu partial");
    const quickBrowseFooterPartial = readFile(QUICK_FOOTER_PATH, "quick browse footer partial");
    const data = JSON.parse(readFile(DATA_PATH, "data"));
    const geographyData = JSON.parse(readFile(GEOGRAPHY_PATH, "geography data"));
    const sameAsLookup = JSON.parse(readFile(PEAK_SAMEAS_PATH, "peak sameAs lookup"));

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

      LANGUAGE_CONFIGS.forEach((lang) => {
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
          (values) => `${values.name} (${values.elevationFormatted || values.elevation}) – ${values.suffix}`
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
        const heroAlt =
          cleanText(primaryPhoto.extendedDescription || primaryPhoto.description) ||
          descriptionText ||
          primaryPhoto.alt;
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
          NAV_MENU: navMenuPartial,
          QUICK_BROWSE_FOOTER: quickBrowseFooterPartial,
          OG_IMAGE: primaryPhoto.url,
          OG_IMAGE_WIDTH: primaryPhoto.width || "",
          OG_IMAGE_HEIGHT: primaryPhoto.height || "",
          OG_IMAGE_ALT: escapeHtml(primaryPhoto.alt),
          AUTHOR_NAME: AUTHOR_NAME,
          PAGE_CREATOR: escapeHtml(primaryPhoto.creator || AUTHOR_NAME),
          PHOTO_CREDIT: escapeHtml(primaryPhoto.creditText || primaryPhoto.creator || AUTHOR_NAME),
          PHOTO_PUBLISHER: escapeHtml(primaryPhoto.publisherName || TWITTER_HANDLE),
          PHOTO_KEYWORDS: escapeHtml((primaryPhoto.keywords || []).join(", ")),
          PHOTO_EXIF: escapeHtml(primaryPhoto.exifData || ""),
          THEME_COLOR: "#0a0a0a",
          FAVICON_32: "/favicon-32.png",
          FAVICON_16: "/favicon-16.png",
          APPLE_TOUCH_ICON: "/apple-touch-icon.png",
          TWITTER_SITE: TWITTER_HANDLE,
          TWITTER_CREATOR: TWITTER_HANDLE,
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
          GALLERY_IMAGES: buildGallery(peak.photos, localizedName, descriptionText, lang.code),
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
              geographyRefs
            )
          ),
          BREADCRUMB_LD: escapeScriptJson(
            buildBreadcrumbJson(localizedName, canonicalUrl, lang.catalogUrl, lang.homeUrl, lang.labels)
          ),
          WEBPAGE_SCHEMA: escapeScriptJson(
            buildWebPageSchema(localizedName, canonicalUrl, descriptionText, primaryPhoto, lang.code, mapId)
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
