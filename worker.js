export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const segments = url.pathname.split("/").filter(Boolean);

    // Expected:
    //   /peak/{slug}
    //   /fr/peak/{slug}
    const isFrench = segments[0] === "fr";
    const isPeakRoute = isFrench ? segments[1] === "peak" : segments[0] === "peak";
    const slug = isFrench ? segments[2] : segments[1];

    // Only SSR peak routes. Everything else: pass-through.
    // (If you already route only /peak/* to this Worker, this is extra safety.)
    if (!isPeakRoute || !slug) {
      return new Response("Not Found", { status: 404 });
    }

    const SITE = "https://nh48.info";

    // ---------- helpers ----------
    const escHtml = (s = "") =>
      String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

    const safeJsonLd = (obj) => {
      // Prevent </script> from breaking out of the JSON-LD script tag
      return JSON.stringify(obj).replaceAll("</", "<\\/");
    };

    const pickFirstPhoto = (photos) => {
      if (!Array.isArray(photos) || photos.length === 0) return null;
      const p = photos[0];
      if (!p) return null;
      if (typeof p === "string") return { url: p };
      if (typeof p === "object" && p.url) return p;
      return null;
    };

    const makeEtag = (str) => {
      // Simple deterministic etag; good enough for HTML that’s mostly stable
      let h = 0;
      for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
      return `"${h.toString(16)}"`;
    };

    // ---------- 1) Load NH48 JSON (R2 -> fallback URL) ----------
    let peaksData;
    let peaksDataRaw = null;

    try {
      if (env.NH48_DATA) {
        const obj = await env.NH48_DATA.get("nh48.json");
        if (obj) {
          peaksDataRaw = await obj.text();
          peaksData = JSON.parse(peaksDataRaw);
        }
      }
    } catch (e) {
      // ignore, fallback below
    }

    if (!peaksData) {
      const resp = await fetch(`${SITE}/data/nh48.json`, {
        cf: { cacheTtl: 3600, cacheEverything: true }
      });
      if (!resp.ok) {
        return new Response("Data source unavailable", { status: 502 });
      }
      peaksData = await resp.json();
      // not strictly needed, but helps stable ETag sometimes
      try { peaksDataRaw = JSON.stringify(peaksData); } catch {}
    }

    // ---------- 2) Find peak by slug ----------
    let peak = null;

    if (Array.isArray(peaksData)) {
      peak = peaksData.find((p) => p?.slug === slug || p?.slug_en === slug || p?.Slug === slug);
    } else if (peaksData && typeof peaksData === "object") {
      peak =
        peaksData[slug] ||
        Object.values(peaksData).find((p) => p?.slug === slug || p?.slug_en === slug || p?.Slug === slug);
    }

    if (!peak) {
      // Return a simple HTML 404 so Google sees valid HTML and users don’t get a weird raw text
      return new Response(
        `<!doctype html><meta charset="utf-8"><title>Peak not found | NH48</title>
         <meta name="robots" content="noindex">
         <h1>Peak not found</h1>
         <p>No peak matches <code>${escHtml(slug)}</code>.</p>`,
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // ---------- 3) Extract fields (mirror SPA inputs with fallbacks) ----------
    const peakName = peak.peakName || peak.name || peak["Peak Name"] || slug;

    const elevation =
      peak["Elevation (ft)"] ??
      peak.elevation_ft ??
      peak.elevation ??
      "";

    const prominence =
      peak["Prominence (ft)"] ??
      peak.prominence_ft ??
      peak.prominence ??
      "";

    const range =
      peak["Range / Subrange"] ??
      peak.range ??
      peak.subrange ??
      "White Mountain National Forest";

    const difficulty =
      peak["Difficulty"] ??
      peak.difficulty ??
      "";

    const trailType =
      peak["Trail Type"] ??
      peak.trail_type ??
      "";

    const time =
      peak.time_estimate ??
      peak.Time ??
      peak.time ??
      "";

    const lat =
      peak.lat ??
      peak.latitude ??
      "";

    const lon =
      peak.lng ??
      peak.longitude ??
      peak.lon ??
      "";

    const coords = (lat && lon) ? `${lat}, ${lon}` : "";

    const summary =
      (peak.summary || peak.description || peak["Description"] || "").toString().trim() ||
      `${peakName} peak details in the White Mountain National Forest (NH48).`;

    const photos = Array.isArray(peak.photos) ? peak.photos : [];
    const hero = pickFirstPhoto(photos);
    const heroImage = hero?.url || `${SITE}/nh48-preview.png`;
    const heroAlt =
      hero?.alt ||
      `${peakName} — White Mountain National Forest`;

    const routesList = Array.isArray(peak.routes)
      ? peak.routes.map((r) => `<li>${escHtml(r)}</li>`).join("")
      : "";

    const relatedTrailsList = Array.isArray(peak.related_trails)
      ? peak.related_trails.map((t) => `<li>${escHtml(t)}</li>`).join("")
      : "";

    // ---------- 4) Canonical / hreflang ----------
    const canonical = isFrench ? `${SITE}/fr/peak/${encodeURIComponent(slug)}` : `${SITE}/peak/${encodeURIComponent(slug)}`;
    const canonicalEn = `${SITE}/peak/${encodeURIComponent(slug)}`;
    const canonicalFr = `${SITE}/fr/peak/${encodeURIComponent(slug)}`;
    const canonicalXDefault = canonicalEn;

    // This keeps your "beautiful JS graphics" because the SSR page can still load your SPA
    const appUrl = isFrench
      ? `${SITE}/pages/nh48_peak.html?slug=${encodeURIComponent(slug)}&lang=fr`
      : `${SITE}/pages/nh48_peak.html?slug=${encodeURIComponent(slug)}`;

    // ---------- 5) JSON-LD ----------
    const mountainSchema = {
      "@context": "https://schema.org",
      "@type": "Mountain",
      name: peakName,
      url: canonical,
      description: summary,
      image: heroImage,
      geo: (lat && lon) ? { "@type": "GeoCoordinates", latitude: lat, longitude: lon } : undefined,
      additionalProperty: [
        elevation !== "" && {
          "@type": "PropertyValue",
          name: "Elevation (ft)",
          value: String(elevation)
        },
        prominence !== "" && {
          "@type": "PropertyValue",
          name: "Prominence (ft)",
          value: String(prominence)
        },
        range && { "@type": "PropertyValue", name: "Range / Subrange", value: range },
        difficulty && { "@type": "PropertyValue", name: "Difficulty", value: difficulty },
        trailType && { "@type": "PropertyValue", name: "Trail Type", value: trailType },
        time && { "@type": "PropertyValue", name: "Time Estimate", value: time }
      ].filter(Boolean)
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: isFrench ? "Accueil" : "Home",
          item: isFrench ? `${SITE}/fr/` : `${SITE}/`
        },
        {
          "@type": "ListItem",
          position: 2,
          name: isFrench ? "Catalogue des sommets" : "Peak Catalog",
          item: isFrench ? `${SITE}/fr/catalog` : `${SITE}/catalog`
        },
        {
          "@type": "ListItem",
          position: 3,
          name: peakName,
          item: canonical
        }
      ]
    };

    // ---------- 6) Load HTML template (R2 -> fallback URL) ----------
    let html;

    // Prefer template from R2 (if uploaded)
    try {
      if (env.NH48_DATA) {
        const t = await env.NH48_DATA.get("templates/peak-page-template.html");
        if (t) html = await t.text();
      }
    } catch (e) {
      // ignore, fallback below
    }

    // Fallback to site-hosted template
    if (!html) {
      const tmplResp = await fetch(`${SITE}/templates/peak-page-template.html`, {
        cf: { cacheTtl: 3600, cacheEverything: true }
      });
      if (!tmplResp.ok) {
        return new Response("Template unavailable", { status: 502 });
      }
      html = await tmplResp.text();
    }

    // ---------- 7) Fill placeholders ----------
    html = html
      .replace(/{{LANG}}/g, isFrench ? "fr" : "en")
      .replace(/{{TITLE}}/g, escHtml(`${peakName} | NH48`))
      .replace(/{{DESCRIPTION}}/g, escHtml(summary))
      .replace(/{{AUTHOR_NAME}}/g, "Nathan Sobol")
      .replace(/{{CANONICAL_URL}}/g, canonical)
      .replace(/{{CANONICAL_EN_URL}}/g, canonicalEn)
      .replace(/{{CANONICAL_FR_URL}}/g, canonicalFr)
      .replace(/{{CANONICAL_XDEFAULT_URL}}/g, canonicalXDefault)
      .replace(/{{APP_URL}}/g, appUrl)

      .replace(/{{PEAK_NAME}}/g, escHtml(peakName))
      .replace(/{{ELEVATION}}/g, elevation !== "" ? escHtml(`${elevation} ft`) : "—")
      .replace(/{{PROMINENCE}}/g, prominence !== "" ? escHtml(`${prominence} ft`) : "—")
      .replace(/{{RANGE}}/g, escHtml(range))
      .replace(/{{DIFFICULTY}}/g, escHtml(difficulty || "—"))
      .replace(/{{TRAIL_TYPE}}/g, escHtml(trailType || "—"))
      .replace(/{{TIME}}/g, escHtml(time || "—"))
      .replace(/{{COORDINATES}}/g, escHtml(coords || "—"))

      .replace(/{{HERO_IMAGE}}/g, heroImage)
      .replace(/{{HERO_ALT}}/g, escHtml(heroAlt))
      .replace(/{{HERO_CAPTION}}/g, escHtml(summary))
      .replace(/{{HERO_PRELOAD}}/g, heroImage)

      .replace(/{{ROUTES_LIST}}/g, routesList)
      .replace(/{{RELATED_TRAILS_LI}}/g, relatedTrailsList)

      .replace(/{{JSON_LD}}/g, safeJsonLd(mountainSchema))
      .replace(/{{BREADCRUMB_LD}}/g, safeJsonLd(breadcrumbSchema));

    // IMPORTANT: remove any UA-based redirect script (avoid soft redirects / cloaking)
    html = html.replace(
      /<script>[\s\S]*redirectToApp[\s\S]*?<\/script>/g,
      ""
    );

    // ---------- 8) Headers + caching ----------
    // ETag lets Google and browsers do conditional GETs; cheap and useful.
    const etag = makeEtag(`${canonical}|${peaksDataRaw || ""}|${peakName}|${heroImage}|${summary}`);

    // Respect If-None-Match
    const inm = request.headers.get("If-None-Match");
    if (inm && inm === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          "ETag": etag,
          "Cache-Control": "public, max-age=0, s-maxage=86400"
        }
      });
    }

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "index,follow",
        "Cache-Control": "public, max-age=0, s-maxage=86400",
        "ETag": etag
      }
    });
  }
};
