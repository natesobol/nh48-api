const SPLASH_ICON_PATH = "/photos/";
const SPLASH_ALT_TEXT_PATH = "/photos/backgrounds/alt-text.json";
const MAX_SPLASH_ICONS = 40;
const SPLASH_MIN_DURATION_S = 18;
const SPLASH_MAX_DURATION_S = 32;
const SPLASH_MIN_SIZE_MULTIPLIER = 1.5;
const SPLASH_MAX_SIZE_MULTIPLIER = 6;
const SPLASH_DIAGONAL_SPEED_PX = 12;
// Speed multiplier range: 0.5× (50% slower) to 1.5× (50% faster)
const SPLASH_MIN_SPEED_MULTIPLIER = 0.5;
const SPLASH_MAX_SPEED_MULTIPLIER = 1.5;
// Maximum attempts when searching for a non-overlapping position
const MAX_SPAWN_ATTEMPTS = 100;
const SPLASH_MASK_PADDING_PX = 24;
const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SPLASH_MANIFEST_PATH = "/photos/backgrounds/manifest.json";

const whenImageReady = (imgEl) =>
  new Promise((resolve) => {
    const finish = () => resolve(imgEl);
    imgEl.addEventListener(
      "load",
      () => {
        if (typeof imgEl.decode === "function") {
          imgEl.decode().then(finish).catch(finish);
          return;
        }
        finish();
      },
      { once: true }
    );
    imgEl.addEventListener("error", finish, { once: true });
  });

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
    .filter((name) => name.toLowerCase().match(/\.(png|jpe?g|webp)$/))
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
    const manifestIcons = await loadManifestIcons();
    if (!manifestIcons.length) {
      return [];
    }
    return manifestIcons;
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

  // Determine if a new icon at (x,y) with size overlaps any existing icons
  const doesOverlap = (x, y, size) => {
    const newRadius = size / 2;
    for (const other of icons) {
      const dx = x + newRadius - (other.x + other.size / 2);
      const dy = y + newRadius - (other.y + other.size / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDist = newRadius + other.size / 2;
      if (distance < minDist) return true;
    }
    return false;
  };

  const resolveCollision = (a, b) => {
    const dx = b.x + b.size / 2 - (a.x + a.size / 2);
    const dy = b.y + b.size / 2 - (a.y + a.size / 2);
    const dist = Math.hypot(dx, dy);
    const overlap = (a.size + b.size) / 2 - dist;
    if (dist && overlap > 0) {
      // Normalized collision normal
      const nx = dx / dist;
      const ny = dy / dist;
      // Separate icons to remove overlap
      a.x -= (nx * overlap) / 2;
      a.y -= (ny * overlap) / 2;
      b.x += (nx * overlap) / 2;
      b.y += (ny * overlap) / 2;
      // Rotate velocities to collision frame
      const tx = -ny,
        ty = nx;
      const v1n = a.vx * nx + a.vy * ny;
      const v1t = a.vx * tx + a.vy * ty;
      const v2n = b.vx * nx + b.vy * ny;
      const v2t = b.vx * tx + b.vy * ty;
      // Swap normal components (elastic collision)
      const v1nAfter = v2n;
      const v2nAfter = v1n;
      // Rotate back
      a.vx = v1nAfter * nx + v1t * tx;
      a.vy = v1nAfter * ny + v1t * ty;
      b.vx = v2nAfter * nx + v2t * tx;
      b.vy = v2nAfter * ny + v2t * ty;
    }
  };

  const iconPromises = [];

  selectedIcons.forEach((iconPath) => {
    const imgEl = document.createElement("img");
    imgEl.className = "splash-icon";
    const fileName = decodeURIComponent(iconPath.split("/").pop() || "");
    imgEl.alt = altTextMap.get(fileName) || "";
    if (imgEl.alt) {
      imgEl.title = imgEl.alt;
    }
    const readyPromise = whenImageReady(imgEl);
    imgEl.src = iconPath;
    const baseSize = 24 + Math.random() * 32;
    const sizeMultiplier =
      SPLASH_MIN_SIZE_MULTIPLIER +
      Math.random() * (SPLASH_MAX_SIZE_MULTIPLIER - SPLASH_MIN_SIZE_MULTIPLIER);
    const size = baseSize * sizeMultiplier;
    let x = Math.random() * viewportW;
    let y = Math.random() * viewportH;
    let attempts = 0;
    while (
      (isInMask(x, y, size, maskRect) || doesOverlap(x, y, size)) &&
      attempts < MAX_SPAWN_ATTEMPTS
    ) {
      x = Math.random() * viewportW;
      y = Math.random() * viewportH;
      attempts += 1;
    }
    imgEl.style.width = `${size}px`;
    imgEl.style.left = "0";
    imgEl.style.top = "0";
    const rotation =
      Math.random() < 0.7 ? Math.random() * 30 - 15 : Math.random() * 360;
    const rotationSpeed = Math.random() * 6 - 3;
    const opacity = 0.6 + Math.random() * 0.4;
    imgEl.style.opacity = `${opacity}`;
    imgEl.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
    const speedMultiplier =
      SPLASH_MIN_SPEED_MULTIPLIER +
      Math.random() * (SPLASH_MAX_SPEED_MULTIPLIER - SPLASH_MIN_SPEED_MULTIPLIER);
    const theta = Math.random() * 2 * Math.PI;
    const vx = Math.cos(theta) * SPLASH_DIAGONAL_SPEED_PX * speedMultiplier;
    const vy = Math.sin(theta) * SPLASH_DIAGONAL_SPEED_PX * speedMultiplier;
    icons.push({
      el: imgEl,
      x,
      y,
      size,
      vx,
      vy,
      rotation,
      rotationSpeed,
      readyPromise
    });
    iconPromises.push(readyPromise);
  });

  await Promise.allSettled(iconPromises);

  const fragment = document.createDocumentFragment();
  icons.forEach((icon) => {
    fragment.appendChild(icon.el);
  });
  container.appendChild(fragment);
  requestAnimationFrame(() => {
    icons.forEach((icon) => {
      icon.el.classList.add("is-ready");
    });
  });

  let lastTime = performance.now();
  const tick = (now) => {
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    icons.forEach((icon) => {
      icon.x += icon.vx * delta;
      icon.y += icon.vy * delta;
      icon.rotation += icon.rotationSpeed * delta;

      const maxX = viewportWidth - icon.size;
      const maxY = viewportHeight - icon.size;

      if (icon.x < 0) {
        icon.x = 0;
        icon.vx *= -1;
      } else if (icon.x > maxX) {
        icon.x = maxX;
        icon.vx *= -1;
      }

      if (icon.y < 0) {
        icon.y = 0;
        icon.vy *= -1;
      } else if (icon.y > maxY) {
        icon.y = maxY;
        icon.vy *= -1;
      }
    });

    for (let i = 0; i < icons.length; i += 1) {
      for (let j = i + 1; j < icons.length; j += 1) {
        resolveCollision(icons[i], icons[j]);
      }
    }

    icons.forEach((icon) => {
      icon.el.style.transform = `translate(${icon.x}px, ${icon.y}px) rotate(${icon.rotation}deg)`;
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSplash);
} else {
  initSplash();
}
