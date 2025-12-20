const SPLASH_ICON_PATH = "/UI-Elements/";
const SPLASH_ALT_TEXT_PATH = "/UI-Elements/alt-text.json";
const MAX_SPLASH_ICONS = 40;
const SPLASH_MIN_DURATION_S = 18;
const SPLASH_MAX_DURATION_S = 32;
const SPLASH_MIN_SIZE_MULTIPLIER = 1;
const SPLASH_MAX_SIZE_MULTIPLIER = 4;
const SPLASH_DIAGONAL_SPEED_PX = 12;
const SPLASH_SPEED_VARIANCE = 0.35;
const SPLASH_MASK_PADDING_PX = 24;
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

const loadAltTextMap = async () => {
  const response = await fetch(SPLASH_ALT_TEXT_PATH, { cache: "no-store" });
  if (!response.ok) {
    return new Map();
  }
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.images)) {
    return new Map();
  }
  return new Map(
    payload.images
      .filter((entry) => entry && typeof entry.file === "string")
      .map((entry) => [entry.file, entry.alt || ""])
  );
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

  const [iconList, altTextMap] = await Promise.all([
    loadSplashIcons(),
    loadAltTextMap()
  ]);
  if (!iconList.length) {
    return;
  }

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const shuffledIcons = iconList.sort(() => 0.5 - Math.random());
  const selectedIcons = shuffledIcons.slice(0, MAX_SPLASH_ICONS);
  const maskEl = document.getElementById("splash-mask");
  const mainEl = document.querySelector("main");
  let viewportWidth = viewportW;
  let viewportHeight = viewportH;

  const getMaskRect = () => {
    if (!mainEl || !maskEl) {
      return null;
    }
    const rect = mainEl.getBoundingClientRect();
    const left = Math.max(0, rect.left - SPLASH_MASK_PADDING_PX);
    const top = Math.max(0, rect.top - SPLASH_MASK_PADDING_PX);
    const right = Math.min(
      window.innerWidth,
      rect.right + SPLASH_MASK_PADDING_PX
    );
    const bottom = Math.min(
      window.innerHeight,
      rect.bottom + SPLASH_MASK_PADDING_PX
    );
    return {
      left,
      top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
    };
  };

  const updateMask = () => {
    if (!maskEl) {
      return;
    }
    const rect = getMaskRect();
    if (!rect) {
      maskEl.style.display = "none";
      return;
    }
    maskEl.style.display = "block";
    maskEl.style.left = `${rect.left}px`;
    maskEl.style.top = `${rect.top}px`;
    maskEl.style.width = `${rect.width}px`;
    maskEl.style.height = `${rect.height}px`;
  };

  updateMask();

  const isInMask = (x, y, size, maskRect) => {
    if (!maskRect) {
      return false;
    }
    const right = x + size;
    const bottom = y + size;
    const maskRight = maskRect.left + maskRect.width;
    const maskBottom = maskRect.top + maskRect.height;
    return !(
      right < maskRect.left ||
      x > maskRight ||
      bottom < maskRect.top ||
      y > maskBottom
    );
  };

  const icons = [];
  const maskRect = getMaskRect();
  selectedIcons.forEach((iconPath) => {
    const imgEl = document.createElement("img");
    imgEl.src = iconPath;
    imgEl.className = "splash-icon";
    const fileName = decodeURIComponent(iconPath.split("/").pop() || "");
    imgEl.alt = altTextMap.get(fileName) || "";
    if (imgEl.alt) {
      imgEl.title = imgEl.alt;
    }
    const baseSize = 24 + Math.random() * 32;
    const sizeMultiplier =
      SPLASH_MIN_SIZE_MULTIPLIER +
      Math.random() * (SPLASH_MAX_SIZE_MULTIPLIER - SPLASH_MIN_SIZE_MULTIPLIER);
    const size = baseSize * sizeMultiplier;
    let x = Math.random() * viewportW;
    let y = Math.random() * viewportH;
    let attempts = 0;
    while (isInMask(x, y, size, maskRect) && attempts < 20) {
      x = Math.random() * viewportW;
      y = Math.random() * viewportH;
      attempts += 1;
    }
    imgEl.style.width = `${size}px`;
    imgEl.style.left = "0";
    imgEl.style.top = "0";
    const duration =
      SPLASH_MIN_DURATION_S +
      Math.random() * (SPLASH_MAX_DURATION_S - SPLASH_MIN_DURATION_S);
    const delay = Math.random() * SPLASH_MAX_DURATION_S;
    imgEl.style.animationDuration = `${duration}s, ${duration}s`;
    imgEl.style.animationDelay = `-${delay}s, -${delay}s`;
    container.appendChild(imgEl);
    const speedVariance = 1 + (Math.random() * 2 - 1) * SPLASH_SPEED_VARIANCE;
    icons.push({
      el: imgEl,
      x,
      y,
      size,
      speed: SPLASH_DIAGONAL_SPEED_PX * speedVariance
    });
  });

  let lastTime = performance.now();
  const tick = (now) => {
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    icons.forEach((icon) => {
      const dx = icon.speed * delta;
      const dy = icon.speed * delta;
      icon.x += dx;
      icon.y += dy;
      if (icon.x > viewportWidth + icon.size) {
        icon.x = -icon.size;
      }
      if (icon.y > viewportHeight + icon.size) {
        icon.y = -icon.size;
      }
      icon.el.style.transform = `translate(${icon.x}px, ${icon.y}px)`;
    });
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);

  window.addEventListener("resize", () => {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    updateMask();
  });
};

window.addEventListener("load", initSplash);
