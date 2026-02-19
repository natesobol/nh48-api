(function bootstrapNH48AnalyticsCore() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  if (window.__NH48_ANALYTICS_CORE_READY) {
    return;
  }
  window.__NH48_ANALYTICS_CORE_READY = true;

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCUShYXwxGVEDNzMeIwSFPmDaYeXSqRK4A",
    authDomain: "nh48-info.firebaseapp.com",
    projectId: "nh48-info",
    storageBucket: "nh48-info.firebasestorage.app",
    messagingSenderId: "732743288228",
    appId: "1:732743288228:web:d82d62cae0c3999ee5ad31",
    measurementId: "G-Q9F2W8YB7D"
  };

  const DOWNLOAD_EXTENSIONS = new Set(["json", "geojson", "gpx", "kml", "csv", "xlsx", "txt", "zip"]);
  const MAX_PARAM_LENGTH = 120;
  const CLICK_DEDUPE_WINDOW_MS = 1000;
  const MAP_EVENT_THROTTLE_MS = 7000;

  const internalState = {
    mode: "init",
    analytics: null,
    firebaseLogEvent: null,
    firebaseSetUserProperties: null,
    legacyBridge: null,
    pendingEvents: [],
    pendingUserProps: [],
    pageLoadedSent: false,
    lastUserPropKey: "",
    mapThrottleMs: MAP_EVENT_THROTTLE_MS
  };

  const clickDedupe = new Map();

  function warn() {
    try {
      console.warn.apply(console, arguments);
    } catch (_err) {
      // no-op
    }
  }

  function sanitizeValue(value) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return "";
      return trimmed.length > MAX_PARAM_LENGTH ? trimmed.slice(0, MAX_PARAM_LENGTH) : trimmed;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "boolean") {
      return value;
    }
    return undefined;
  }

  function sanitizeParams(params) {
    const output = {};
    if (!params || typeof params !== "object" || Array.isArray(params)) {
      return output;
    }
    Object.keys(params).forEach((key) => {
      const safeKey = String(key || "").trim();
      if (!safeKey) return;
      const safeValue = sanitizeValue(params[key]);
      if (safeValue === undefined) return;
      output[safeKey] = safeValue;
    });
    return output;
  }

  function normalizeToken(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  function getPathWithoutLocale(pathname) {
    const source = String(pathname || window.location.pathname || "/");
    const stripped = source.replace(/^\/fr(?=\/|$)/i, "");
    return stripped || "/";
  }

  function resolveLang() {
    try {
      if (window.NH48_I18N && typeof window.NH48_I18N.getLang === "function") {
        const lang = window.NH48_I18N.getLang();
        if (lang) return String(lang).toLowerCase();
      }
    } catch (_err) {
      // no-op
    }

    const docLang = (document.documentElement && document.documentElement.lang) || "";
    if (docLang) return docLang.toLowerCase();

    if (/^\/fr(\/|$)/i.test(window.location.pathname || "")) {
      return "fr";
    }
    return "en";
  }

  function resolvePageRoute() {
    const body = document.body;
    if (body) {
      const route = body.getAttribute("data-route");
      if (route) return route;
      const page = body.getAttribute("data-page");
      if (page) return page;
    }

    const path = getPathWithoutLocale(window.location.pathname);
    if (path === "/" || path === "") return "home";

    const sectionsMatch = path.match(/^\/trails\/([^/]+)\/sections\/([^/]+)\/?$/i);
    if (sectionsMatch) {
      return "trail-section";
    }

    const parts = path.split("/").filter(Boolean);
    if (!parts.length) return "home";
    return parts.slice(0, 2).join("-");
  }

  function resolvePageFamily(pageRoute, pathname) {
    const routeToken = normalizeToken(pageRoute);
    const path = getPathWithoutLocale(pathname).toLowerCase();

    if (/^\/trails\/[^/]+\/sections\/[^/]+\/?$/.test(path) || routeToken.indexOf("trail_section") !== -1 || routeToken === "trail-section") {
      return "trail_section";
    }
    if (routeToken.indexOf("long_trails") !== -1 || path.indexOf("/long-trails") === 0) {
      return "long_trails";
    }
    if (routeToken === "trails" || path === "/trails" || path.indexOf("/trails/") === 0) {
      return "trails";
    }
    if (routeToken.indexOf("dataset") !== -1 || path === "/dataset" || path.indexOf("/dataset/") === 0) {
      return "dataset";
    }
    if (routeToken.indexOf("catalog") !== -1 || path === "/catalog" || path.indexOf("/catalog/") === 0) {
      return "catalog";
    }
    if (routeToken.indexOf("range") !== -1 || path === "/range" || path.indexOf("/range/") === 0) {
      return "range";
    }
    if (routeToken.indexOf("photo") !== -1 || path === "/photos" || path.indexOf("/photos/") === 0) {
      return "photos";
    }
    if (routeToken.indexOf("planner") !== -1 || path.indexOf("planner") !== -1) {
      return "planner";
    }
    if (routeToken.indexOf("nh48_map") !== -1 || path === "/nh48-map") {
      return "tools";
    }
    if (routeToken.indexOf("game") !== -1 || path.indexOf("game") !== -1 || path.indexOf("puzzle") !== -1) {
      return "games";
    }
    if (routeToken.indexOf("howker") !== -1 || path.indexOf("/howker-ridge") === 0 || path.indexOf("/projects/howker") === 0 || path.indexOf("/projects/hrt-info") === 0) {
      return "howker";
    }
    if (routeToken.indexOf("plant") !== -1 || path === "/plant-catalog" || path.indexOf("/plant/") === 0 || path.indexOf("/projects/plant") === 0) {
      return "plant";
    }
    if (routeToken.indexOf("tool") !== -1) {
      return "tools";
    }
    if (path === "/" || path === "" || routeToken === "home" || routeToken === "index") {
      return "home";
    }
    return "other";
  }

  function getContextSnapshot() {
    const lang = resolveLang();
    const pageRoute = resolvePageRoute();
    const pageFamily = resolvePageFamily(pageRoute, window.location.pathname);
    return {
      page_path: window.location.pathname || "/",
      page_route: pageRoute,
      page_family: pageFamily,
      lang: lang,
      is_fr: lang.indexOf("fr") === 0 || /^\/fr(\/|$)/i.test(window.location.pathname || "")
    };
  }

  function buildEventParams(params) {
    const context = getContextSnapshot();
    const cleanCustom = sanitizeParams(params);
    return Object.assign({}, context, cleanCustom);
  }

  function queueEvent(name, params) {
    internalState.pendingEvents.push({ name: name, params: params });
  }

  function queueUserProps(props) {
    internalState.pendingUserProps.push(props);
  }

  function flushQueues() {
    if (internalState.mode !== "firebase_mode" || !internalState.analytics || typeof internalState.firebaseLogEvent !== "function") {
      return;
    }

    while (internalState.pendingEvents.length) {
      const item = internalState.pendingEvents.shift();
      try {
        internalState.firebaseLogEvent(internalState.analytics, item.name, item.params);
      } catch (err) {
        warn("[NH48Analytics] Failed to flush event", err);
      }
    }

    while (internalState.pendingUserProps.length) {
      const props = internalState.pendingUserProps.shift();
      try {
        if (typeof internalState.firebaseSetUserProperties === "function") {
          internalState.firebaseSetUserProperties(internalState.analytics, props);
        }
      } catch (err) {
        warn("[NH48Analytics] Failed to flush user properties", err);
      }
    }
  }

  function dispatchEvent(name, params) {
    if (internalState.mode === "legacy_bridge_mode" && internalState.legacyBridge && typeof internalState.legacyBridge.logEvent === "function") {
      try {
        internalState.legacyBridge.logEvent(internalState.legacyBridge.analytics, name, params);
      } catch (err) {
        warn("[NH48Analytics] Legacy logEvent dispatch failed", err);
      }
      return;
    }

    if (internalState.mode === "firebase_mode") {
      if (internalState.analytics && typeof internalState.firebaseLogEvent === "function") {
        try {
          internalState.firebaseLogEvent(internalState.analytics, name, params);
          return;
        } catch (err) {
          warn("[NH48Analytics] Firebase logEvent failed", err);
        }
      }
      queueEvent(name, params);
      return;
    }

    if (internalState.mode === "init") {
      queueEvent(name, params);
    }
  }

  function dispatchUserProperties(props) {
    if (!props || !Object.keys(props).length) return;

    if (internalState.mode === "firebase_mode") {
      if (internalState.analytics && typeof internalState.firebaseSetUserProperties === "function") {
        try {
          internalState.firebaseSetUserProperties(internalState.analytics, props);
          return;
        } catch (err) {
          warn("[NH48Analytics] setUserProperties failed", err);
        }
      }
      queueUserProps(props);
      return;
    }

    if (internalState.mode === "init") {
      queueUserProps(props);
    }
  }

  function track(name, params) {
    const eventName = String(name || "").trim();
    if (!eventName) return;
    dispatchEvent(eventName, buildEventParams(params));
  }

  function setUserProps(props) {
    const cleanProps = sanitizeParams(props);
    if (!Object.keys(cleanProps).length) return;
    dispatchUserProperties(cleanProps);
  }

  function trackLinkClick(meta) {
    track("nh48_link_click", sanitizeParams(meta));
  }

  function ensureCompatibilityAlias() {
    const existing = window.NH48_INFO_ANALYTICS;
    if (existing && typeof existing.logEvent === "function") {
      internalState.legacyBridge = existing;
      return;
    }

    window.NH48_INFO_ANALYTICS = {
      analytics: internalState.analytics || { __nh48_bridge: true },
      logEvent: function (_analytics, name, params) {
        track(name, params);
      }
    };
  }

  function updateCompatibilityAnalyticsRef() {
    if (!window.NH48_INFO_ANALYTICS || typeof window.NH48_INFO_ANALYTICS !== "object") return;
    if (internalState.mode === "legacy_bridge_mode") return;
    window.NH48_INFO_ANALYTICS.analytics = internalState.analytics || window.NH48_INFO_ANALYTICS.analytics || { __nh48_bridge: true };
  }

  function refreshBaseUserProperties() {
    const snapshot = getContextSnapshot();
    const key = [snapshot.lang, snapshot.page_family].join("|");
    if (internalState.lastUserPropKey === key) return;
    internalState.lastUserPropKey = key;
    setUserProps({
      preferred_lang: snapshot.lang,
      site_locale: snapshot.lang,
      route_family_last: snapshot.page_family
    });
  }

  function emitPageLoadedOnce() {
    if (internalState.pageLoadedSent) return;
    internalState.pageLoadedSent = true;
    track("nh48_page_loaded");
  }

  function parseUrl(href) {
    try {
      return new URL(href, window.location.href);
    } catch (_err) {
      return null;
    }
  }

  function elementText(target) {
    if (!target) return "";
    return String(target.textContent || target.getAttribute("aria-label") || "").trim().slice(0, MAX_PARAM_LENGTH);
  }

  function getFileExtension(href) {
    const source = String(href || "").toLowerCase();
    const match = source.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
    if (!match || !match[1]) return "";
    return match[1].toLowerCase();
  }

  function cleanupClickDedupe(now) {
    if (clickDedupe.size < 100) return;
    clickDedupe.forEach(function (timestamp, key) {
      if (now - timestamp > CLICK_DEDUPE_WINDOW_MS) {
        clickDedupe.delete(key);
      }
    });
  }

  function shouldSkipClickEvent(eventName, target) {
    const now = Date.now();
    cleanupClickDedupe(now);
    const anchor = target && target.closest ? target.closest("a[href]") : null;
    const href = anchor ? (anchor.getAttribute("href") || anchor.href || "") : "";
    const signature = [eventName, href, Math.floor(now / CLICK_DEDUPE_WINDOW_MS)].join("|");
    const previous = clickDedupe.get(signature);
    if (previous && now - previous <= CLICK_DEDUPE_WINDOW_MS) {
      return true;
    }
    clickDedupe.set(signature, now);
    return false;
  }

  function getDatasetSlug() {
    const path = getPathWithoutLocale(window.location.pathname);
    if (path === "/dataset" || path === "/dataset/") return "dataset-home";
    const match = path.match(/^\/dataset\/([^/]+)\/?$/i);
    return match && match[1] ? match[1] : "";
  }

  function resolveDestinationType(anchorEl, parsedUrl, fileExt) {
    if ((anchorEl && anchorEl.hasAttribute && anchorEl.hasAttribute("download")) || (fileExt && DOWNLOAD_EXTENSIONS.has(fileExt))) {
      return "download";
    }
    if (parsedUrl && parsedUrl.pathname && /\/(map|maps)\b/i.test(parsedUrl.pathname)) {
      return "map";
    }
    return "map";
  }

  function getTrailSectionContext() {
    const path = getPathWithoutLocale(window.location.pathname);
    const match = path.match(/^\/trails\/([^/]+)\/sections\/([^/]+)\/?$/i);
    return {
      trail_slug: match && match[1] ? match[1] : "",
      section_slug: match && match[2] ? match[2] : ""
    };
  }

  function maybeTrackDownload(anchor, emit) {
    if (!anchor) return;
    const hrefAttr = anchor.getAttribute("href") || "";
    const parsed = parseUrl(hrefAttr);
    const absoluteHref = parsed ? parsed.href : (anchor.href || hrefAttr);
    const fileExt = getFileExtension(absoluteHref || hrefAttr);
    const hasDownloadAttr = anchor.hasAttribute("download");
    const isTrackedExtension = fileExt && DOWNLOAD_EXTENSIONS.has(fileExt);
    if (!hasDownloadAttr && !isTrackedExtension) return;

    emit("nh48_download_click", {
      link_url: absoluteHref,
      link_text: elementText(anchor),
      file_ext: fileExt || "",
      link_type: "download"
    }, true);
  }

  function maybeTrackOutbound(anchor, emit) {
    if (!anchor) return;
    const hrefAttr = anchor.getAttribute("href") || "";
    const parsed = parseUrl(hrefAttr);
    const targetBlank = String(anchor.getAttribute("target") || "").toLowerCase() === "_blank";
    const crossOrigin = !!(parsed && /^https?:$/i.test(parsed.protocol) && parsed.origin !== window.location.origin);

    if (!targetBlank && !crossOrigin) return;

    emit("nh48_outbound_click", {
      link_url: parsed ? parsed.href : (anchor.href || hrefAttr),
      link_text: elementText(anchor),
      link_type: "outbound",
      external: crossOrigin
    }, true);
  }

  function setupDelegatedClickTracking() {
    document.addEventListener("click", function (event) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const actionable = target.closest("a,button");
      if (!actionable) return;

      const emitted = new Set();
      const emit = function (eventName, params, useDedupe) {
        if (emitted.has(eventName)) return;
        emitted.add(eventName);
        if (useDedupe && shouldSkipClickEvent(eventName, actionable)) return;
        track(eventName, params);
      };

      const navTarget = actionable.closest(".site-nav a, .site-nav button[data-route]");
      if (navTarget) {
        emit("nh48_nav_click", {
          link_url: navTarget.getAttribute("href") || "",
          link_text: elementText(navTarget),
          nav_route: navTarget.getAttribute("data-route") || ""
        }, false);
      }

      const footerTarget = actionable.closest(".nh48-quick-footer a");
      if (footerTarget) {
        emit("nh48_footer_click", {
          link_url: footerTarget.href || footerTarget.getAttribute("href") || "",
          link_text: elementText(footerTarget)
        }, false);
      }

      const ctaTarget = actionable.closest(".cta-button");
      if (ctaTarget) {
        const ctaHref = ctaTarget.getAttribute("href") || "";
        const ctaUrl = parseUrl(ctaHref);
        const ctaExt = getFileExtension(ctaHref);
        emit("dataset_cta_click", {
          dataset_slug: getDatasetSlug(),
          link_url: ctaUrl ? ctaUrl.href : ctaHref,
          link_text: elementText(ctaTarget),
          destination_type: resolveDestinationType(ctaTarget, ctaUrl, ctaExt)
        }, false);
      }

      const downloadCard = actionable.closest(".download-card");
      if (downloadCard) {
        const cardHref = downloadCard.getAttribute("href") || "";
        const cardUrl = parseUrl(cardHref);
        const absoluteCardHref = cardUrl ? cardUrl.href : (downloadCard.href || cardHref);
        const cardExt = getFileExtension(absoluteCardHref || cardHref);
        const cardPathname = cardUrl && cardUrl.pathname ? cardUrl.pathname : cardHref;
        const fileName = cardPathname.split("/").filter(Boolean).pop() || "";
        emit("dataset_file_download_click", {
          dataset_slug: getDatasetSlug(),
          destination_type: resolveDestinationType(downloadCard, cardUrl, cardExt),
          file_name: fileName,
          file_ext: cardExt || "",
          link_url: absoluteCardHref,
          link_text: elementText(downloadCard)
        }, false);
      }

      const sectionNavLink = actionable.closest(".nav-links a");
      if (sectionNavLink) {
        const sectionMeta = getTrailSectionContext();
        const sectionHref = sectionNavLink.href || sectionNavLink.getAttribute("href") || "";
        const siblings = sectionNavLink.parentElement ? Array.from(sectionNavLink.parentElement.querySelectorAll("a")) : [];
        const index = siblings.indexOf(sectionNavLink);
        const textLower = String(sectionNavLink.textContent || "").toLowerCase();

        const explicitPrev = textLower.indexOf("prev") !== -1 || textLower.indexOf("\u2190") !== -1;
        const explicitNext = textLower.indexOf("next") !== -1 || textLower.indexOf("\u2192") !== -1;
        const inferredPrev = index === 0 && siblings.length > 1;
        const inferredNext = index === siblings.length - 1 && siblings.length > 1;

        if (explicitPrev || (!explicitNext && inferredPrev)) {
          emit("long_trail_section_prev_click", {
            trail_slug: sectionMeta.trail_slug,
            section_slug: sectionMeta.section_slug,
            link_url: sectionHref,
            link_text: elementText(sectionNavLink)
          }, false);
        } else if (explicitNext || inferredNext) {
          emit("long_trail_section_next_click", {
            trail_slug: sectionMeta.trail_slug,
            section_slug: sectionMeta.section_slug,
            link_url: sectionHref,
            link_text: elementText(sectionNavLink)
          }, false);
        }
      }

      const anchor = actionable.closest("a[href]");
      if (anchor) {
        maybeTrackOutbound(anchor, emit);
        maybeTrackDownload(anchor, emit);
      }
    }, true);
  }

  function setupLanguageTracking() {
    if (!window.NH48_I18N || typeof window.NH48_I18N.onLangChange !== "function") {
      return;
    }
    try {
      window.NH48_I18N.onLangChange(function (lang) {
        track("nh48_lang_change", { lang: lang || resolveLang() });
        refreshBaseUserProperties();
      });
    } catch (err) {
      warn("[NH48Analytics] Failed to subscribe to i18n changes", err);
    }
  }

  function setupRouteFamilyWatchers() {
    const update = function () {
      refreshBaseUserProperties();
    };
    window.addEventListener("popstate", update);
    window.addEventListener("hashchange", update);

    if (window.MutationObserver && document.body) {
      const observer = new MutationObserver(function (mutations) {
        for (let i = 0; i < mutations.length; i += 1) {
          const mutation = mutations[i];
          if (mutation.type === "attributes" && (mutation.attributeName === "data-route" || mutation.attributeName === "data-page")) {
            update();
            break;
          }
        }
      });
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["data-route", "data-page"]
      });
    }
  }

  function initializeDispatcher() {
    const existing = window.NH48_INFO_ANALYTICS;
    if (existing && typeof existing.logEvent === "function") {
      internalState.mode = "legacy_bridge_mode";
      internalState.legacyBridge = existing;
      return;
    }

    internalState.mode = "firebase_mode";
    Promise.all([
      import("https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js")
    ]).then(function (modules) {
      const firebaseAppModule = modules[0];
      const firebaseAnalyticsModule = modules[1];

      if (!firebaseAppModule || !firebaseAnalyticsModule) {
        throw new Error("Firebase modules unavailable");
      }

      if (typeof firebaseAppModule.initializeApp !== "function" || typeof firebaseAnalyticsModule.getAnalytics !== "function") {
        throw new Error("Firebase analytics API unavailable");
      }

      const app = firebaseAppModule.initializeApp(FIREBASE_CONFIG);
      const analytics = firebaseAnalyticsModule.getAnalytics(app);

      internalState.analytics = analytics;
      internalState.firebaseLogEvent = firebaseAnalyticsModule.logEvent;
      internalState.firebaseSetUserProperties = firebaseAnalyticsModule.setUserProperties;
      updateCompatibilityAnalyticsRef();
      flushQueues();
    }).catch(function (err) {
      warn("[NH48Analytics] Firebase initialization failed", err);
      internalState.mode = "noop";
      internalState.pendingEvents.length = 0;
      internalState.pendingUserProps.length = 0;
    });
  }

  window.NH48Analytics = {
    track: track,
    setUserProps: setUserProps,
    trackLinkClick: trackLinkClick,
    mapEventThrottleMs: MAP_EVENT_THROTTLE_MS
  };

  initializeDispatcher();
  ensureCompatibilityAlias();
  setupDelegatedClickTracking();
  setupLanguageTracking();
  setupRouteFamilyWatchers();
  refreshBaseUserProperties();
  emitPageLoadedOnce();
})();
