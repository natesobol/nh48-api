#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TRAILS_DATA_PATH = path.join(ROOT, "data", "wmnf-trails", "wmnf-normalized.json");
const TRAILS_PAGE_PATH = path.join(ROOT, "trails", "index.html");
const TRAILS_JSONLD_SCRIPT_ID = "trailsJsonLd";
const AREA_SERVED = "White Mountain National Forest";

const DIFFICULTY_MAP = {
  easy: "Beginner",
  beginner: "Beginner",
  intermediate: "Intermediate",
  moderate: "Intermediate",
  difficult: "Advanced",
  hard: "Advanced",
  advanced: "Advanced",
};

const cleanText = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const metersToMiles = (value) => {
  if (value === undefined || value === null) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Number((numeric / 1609.344).toFixed(2));
};

const toQuantitativeValue = (value, unitText) => {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  return {
    "@type": "QuantitativeValue",
    value,
    unitText,
  };
};

const mapDifficulty = (trail) => {
  const rawDifficulty =
    trail.difficulty ||
    trail.trail_difficulty ||
    trail.rawTags?.difficulty ||
    trail.rawTags?.["piste:difficulty"] ||
    trail.rawTags?.["sac_scale"];
  const normalized = cleanText(rawDifficulty).toLowerCase();
  return DIFFICULTY_MAP[normalized] || null;
};

const buildMaintainer = (trail) => {
  const maintainerName = cleanText(trail.maintainer || trail.rawTags?.operator || trail.rawTags?.owner);
  if (!maintainerName) return null;
  return {
    "@type": "Organization",
    name: maintainerName,
  };
};

const buildTrailSchema = (trail) => {
  const name = cleanText(trail.trail_name || trail.name) || "Unnamed Trail";
  const lengthMiles = metersToMiles(trail.distance_meters ?? trail.distance);
  const elevationGain = toQuantitativeValue(trail.elevation_gain_ft, "FT");
  const length = toQuantitativeValue(lengthMiles, "MI");
  const difficultyLevel = mapDifficulty(trail);
  const maintainer = buildMaintainer(trail);
  const geo = Number.isFinite(trail.lat) && Number.isFinite(trail.lon)
    ? {
      "@type": "GeoCoordinates",
      latitude: trail.lat,
      longitude: trail.lon,
    }
    : null;

  const item = {
    "@type": "HikingTrail",
    name,
    areaServed: AREA_SERVED,
  };

  if (length) item.length = length;
  if (elevationGain) item.elevationGain = elevationGain;
  if (difficultyLevel) item.difficultyLevel = difficultyLevel;
  if (trail.surface) item.trailSurface = cleanText(trail.surface);
  if (trail.type) item.trailType = cleanText(trail.type);
  if (maintainer) item.maintainer = maintainer;
  if (geo) item.geo = geo;

  return item;
};

const buildTrailsItemList = (trails) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "White Mountain National Forest Trails",
  itemListElement: trails.map((trail, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item: buildTrailSchema(trail),
  })),
});

const injectJsonLd = (html, jsonText) => {
  const pattern = new RegExp(
    `<script id=\"${TRAILS_JSONLD_SCRIPT_ID}\" type=\"application/ld\\+json\">[\\s\\S]*?<\\/script>`
  );
  if (!pattern.test(html)) {
    throw new Error("Could not find trails JSON-LD script tag to replace.");
  }
  return html.replace(
    pattern,
    `  <script id="${TRAILS_JSONLD_SCRIPT_ID}" type="application/ld+json">\n${jsonText}\n  </script>`
  );
};

const main = () => {
  const trails = JSON.parse(fs.readFileSync(TRAILS_DATA_PATH, "utf8"));
  const itemList = buildTrailsItemList(trails);
  const jsonText = JSON.stringify(itemList, null, 2);
  const trailsPage = fs.readFileSync(TRAILS_PAGE_PATH, "utf8");
  const updatedPage = injectJsonLd(trailsPage, jsonText);
  fs.writeFileSync(TRAILS_PAGE_PATH, updatedPage);
  console.log(`Embedded JSON-LD for ${trails.length} trails into trails page.`);
};

main();
