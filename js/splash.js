const SPLASH_ICON_PATH = "/UI-Elements/";
const MAX_SPLASH_ICONS = 40;
const SPLASH_MIN_DURATION_S = 10;
const SPLASH_MAX_DURATION_S = 20;
const SPLASH_MIN_SIZE_MULTIPLIER = 1;
const SPLASH_MAX_SIZE_MULTIPLIER = 4;
const SPLASH_ICON_EXCLUSIONS = [
  "og-cover.png",
  "nh48-preview.png",
  "nh48API_logo.png",
  "WMNF_Trails_API_logo.png",
  "nh48API_logo.png",
  "nh48API_logo.svg",
  "nh48API_logo.webp",
  "nh48API_logo.jpeg",
  "nh48API_logo.jpg",
  "logo.png"
];

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const parseIconListFromHtml = (htmlText) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, "text/html");
  const links = Array.from(doc.querySelectorAll("a"));
  const icons = links
    .map((link) => link.getAttribute("href"))
    .filter(Boolean)
    .filter((href) => href.toLowerCase().endsWith(".png"))
    .map((href) => new URL(href, `${window.location.origin}${SPLASH_ICON_PATH}`))
    .map((url) => url.pathname);

  return Array.from(new Set(icons));
};

const SPLASH_MANIFEST_PATH = "/UI-Elements/manifest.json";

const buildJsdelivrApiUrl = () =>
  "https://data.jsdelivr.com/v1/packages/gh/natesobol/nh48-api@main?path=/UI-Elements";

const loadManifestIcons = async () => {
  const response = await fetch(SPLASH_MANIFEST_PATH, { cache: "no-store" });
  if (!response.ok) {
    return [];
  }
  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .filter((entry) => typeof entry === "string")
    .filter((name) => name.toLowerCase().endsWith(".png"))
    .map((name) => `${SPLASH_ICON_PATH}${name}`);
};

const loadSplashIcons = async () => {
  try {
    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const manifestIcons = await loadManifestIcons();
    if (manifestIcons.length) {
      return manifestIcons;
    }
    if (isLocalhost) {
      const response = await fetch(SPLASH_ICON_PATH, { cache: "no-store" });
      if (!response.ok) {
        return [];
      }
      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();
      if (contentType.includes("text/html")) {
        return parseIconListFromHtml(text);
      }
      if (contentType.includes("application/json")) {
        const payload = JSON.parse(text);
        if (Array.isArray(payload)) {
          return payload
            .filter((entry) => typeof entry === "string")
            .map((entry) =>
              new URL(entry, `${window.location.origin}${SPLASH_ICON_PATH}`)
            )
            .map((url) => url.pathname);
        }
      }
      return parseIconListFromHtml(text);
    }

    const response = await fetch(buildJsdelivrApiUrl(), { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.files)) {
      return [];
    }
    return payload.files
      .filter((entry) => entry && entry.type === "file")
      .map((entry) => entry.name)
      .filter((path) => typeof path === "string")
      .filter((path) => path.toLowerCase().endsWith(".png"))
      .filter((path) => !SPLASH_ICON_EXCLUSIONS.includes(path))
      .map((path) => `${SPLASH_ICON_PATH}${path}`);
  } catch (error) {
    console.warn("Splash icons unavailable.", error);
    return [];
  }
};

const initSplash = async () => {
  if (prefersReducedMotion()) {
    return;
  }

  const container = document.getElementById("splash-background");
  if (!container) {
    return;
  }

  const iconList = await loadSplashIcons();
  if (!iconList.length) {
    return;
  }

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const shuffledIcons = iconList.sort(() => 0.5 - Math.random());
  const selectedIcons = shuffledIcons.slice(0, MAX_SPLASH_ICONS);

  selectedIcons.forEach((iconPath) => {
    const imgEl = document.createElement("img");
    imgEl.src = iconPath;
    imgEl.className = "splash-icon";
    imgEl.alt = "";
    imgEl.setAttribute("aria-hidden", "true");
    const baseSize = 24 + Math.random() * 32;
    const sizeMultiplier =
      SPLASH_MIN_SIZE_MULTIPLIER +
      Math.random() * (SPLASH_MAX_SIZE_MULTIPLIER - SPLASH_MIN_SIZE_MULTIPLIER);
    const size = baseSize * sizeMultiplier;
    const x = Math.random() * viewportW;
    const y = Math.random() * viewportH;
    imgEl.style.width = `${size}px`;
    imgEl.style.left = `${x}px`;
    imgEl.style.top = `${y}px`;
    const duration =
      SPLASH_MIN_DURATION_S +
      Math.random() * (SPLASH_MAX_DURATION_S - SPLASH_MIN_DURATION_S);
    const delay = Math.random() * SPLASH_MAX_DURATION_S;
    imgEl.style.animationDuration = `${duration}s`;
    imgEl.style.animationDelay = `-${delay}s`;
    container.appendChild(imgEl);
  });
};

window.addEventListener("load", initSplash);
