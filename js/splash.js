const SPLASH_ICON_PATH = "/UI-Elements/splash-icons/";
const MAX_SPLASH_ICONS = 40;
const SPLASH_LIFETIME_MS = 6000;

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

const loadSplashIcons = async () => {
  try {
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
          .map((entry) => new URL(entry, `${window.location.origin}${SPLASH_ICON_PATH}`))
          .map((url) => url.pathname);
      }
    }
    return parseIconListFromHtml(text);
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
    const size = 24 + Math.random() * 32;
    const x = Math.random() * viewportW;
    const y = Math.random() * viewportH;
    imgEl.style.width = `${size}px`;
    imgEl.style.left = `${x}px`;
    imgEl.style.top = `${y}px`;
    container.appendChild(imgEl);

    const delay = Math.random() * 3;
    imgEl.style.transition = `opacity 1s ease ${delay}s, transform 5s linear ${delay}s`;
    imgEl.style.opacity = "1";
    imgEl.style.transform = `translateY(-20px) rotate(${Math.random() * 360}deg)`;
  });

  setTimeout(() => {
    container.style.display = "none";
  }, SPLASH_LIFETIME_MS);
};

window.addEventListener("load", initSplash);
