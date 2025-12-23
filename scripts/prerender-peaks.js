#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "data", "nh48.json");
const OUTPUT_DIR = path.join(ROOT, "peaks");
const CANONICAL_BASE = "https://nh48.info/peaks";
const APP_BASE = "https://nh48.info/pages/nh48_peak.html";
const LANGUAGE_CONFIGS = [
  {
    code: "en",
    outputDir: OUTPUT_DIR,
    canonicalBase: CANONICAL_BASE,
    appUrl: (slug) => `${APP_BASE}?slug=${slug}`,
  },
  {
    code: "fr",
    outputDir: path.join(ROOT, "fr", "peaks"),
    canonicalBase: "https://nh48.info/fr/peaks",
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

const buildRedirectPage = ({ canonicalUrl, appUrl }) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=${appUrl}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta name="robots" content="index,follow" />
    <title>Redirecting…</title>
    <script>
      window.location.replace(${JSON.stringify(appUrl)});
    </script>
  </head>
  <body>
    <p>Redirecting to peak details...</p>
    <p><a href="${appUrl}">Continue</a></p>
  </body>
</html>`;

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
    console.log(`Data path: ${DATA_PATH}`);
    console.log(`Output directory: ${OUTPUT_DIR}`);

    const data = JSON.parse(readFile(DATA_PATH, "data"));
    const slugs = Object.keys(data).sort();

    console.log(`Rendering ${slugs.length} peak pages...`);
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    slugs.forEach((slug) => {
      LANGUAGE_CONFIGS.forEach((lang) => {
        const canonicalUrl = `${lang.canonicalBase}/${slug}/`;
        const appUrl = lang.appUrl(slug);
        const outputDir = path.join(lang.outputDir, slug);
        const html = buildRedirectPage({ canonicalUrl, appUrl });
        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(path.join(outputDir, "index.html"), html);
        console.log(`Rendered ${slug} (${lang.code})`);
      });
    });
  } catch (err) {
    console.error("Error during prerender:", err);
    process.exit(1);
  }
};

main();
