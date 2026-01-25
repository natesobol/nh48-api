(() => {
  'use strict';

  const THUMBNAIL_CONFIG = {
    baseUrl: 'https://photos.nh48.info',
    format: 'webp',
    quality: 70,
    size: 28,
    cdn: 'cloudflare'
  };

  const THUMBNAIL_FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${THUMBNAIL_CONFIG.size}" height="${THUMBNAIL_CONFIG.size}"><rect width="100%" height="100%" fill="#0f172a"/></svg>`
  );

  const getPeakSlug = (href = '') => {
    const cleaned = href.split('/peak/')[1] || '';
    return cleaned.replace(/\/$/, '');
  };

  const getThumbnailSrc = (slug) => {
    if (!slug) return '';
    return `${THUMBNAIL_CONFIG.baseUrl}/cdn-cgi/image/format=${THUMBNAIL_CONFIG.format},quality=${THUMBNAIL_CONFIG.quality},width=${THUMBNAIL_CONFIG.size}/${slug}/${slug}__001.jpg`;
  };

  const createThumbnailElement = (peakName, slug) => {
    const img = document.createElement('img');
    img.className = 'nh48-quick-footer__link-thumb';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = THUMBNAIL_CONFIG.size;
    img.height = THUMBNAIL_CONFIG.size;
    img.alt = `${peakName} thumbnail`;
    img.src = getThumbnailSrc(slug);
    img.setAttribute('data-photo-peak', peakName);
    img.setAttribute('data-photo-alt', `${peakName} thumbnail`);
    img.setAttribute('data-photo-slug', slug);
    img.setAttribute('data-photo-format', THUMBNAIL_CONFIG.format);
    img.setAttribute('data-photo-quality', String(THUMBNAIL_CONFIG.quality));
    img.setAttribute('data-photo-width', String(THUMBNAIL_CONFIG.size));
    img.setAttribute('data-photo-height', String(THUMBNAIL_CONFIG.size));
    img.setAttribute('data-photo-cdn', THUMBNAIL_CONFIG.cdn);
    img.setAttribute('data-photo-source', THUMBNAIL_CONFIG.baseUrl);
    img.addEventListener('error', () => {
      img.src = THUMBNAIL_FALLBACK;
    }, { once: true });
    return img;
  };

  const createLinkLabel = (text) => {
    const label = document.createElement('span');
    label.className = 'nh48-quick-footer__link-label';
    label.textContent = text;
    return label;
  };

  // Footer configuration with all data
  const FOOTER_CONFIG = {
    styles: `
      .nh48-quick-footer {
        --nh48-footer-grid-min: clamp(220px, 21vw, 260px);
        --nh48-footer-surface: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%);
        --nh48-footer-card: color-mix(in srgb, #141833 70%, rgba(10, 12, 26, 0.55) 30%);
        --nh48-footer-border: #ffffff;
        --nh48-footer-ink: #ffffff;
        --nh48-footer-accent: #22c55e;
        margin: 24px 0 0;
        width: 100%;
        max-width: none;
        background: var(--nh48-footer-surface);
        border: 0;
        border-top: 1px solid var(--nh48-footer-border);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
        padding: clamp(12px, 1.5vw, 18px) 0 0;
        color: var(--nh48-footer-ink);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        height: auto;
        max-height: none;
        overflow: visible;
        text-align: center;
        box-sizing: border-box;
        border-radius: 0;
        position: relative;
        isolation: isolate;
        left: auto;
        transform: none;
        z-index: 1;
      }

      /* Special handling for map pages with fixed layouts */
      body[data-route="trails"] .nh48-quick-footer,
      body[data-route="long-trails"] .nh48-quick-footer {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        transform: none !important;
        z-index: 999 !important;
      }

      .nh48-quick-footer__header {
        text-align: center;
        max-width: 1080px;
        margin: 0 auto 0;
        padding: 0 clamp(16px, 3vw, 32px);
      }

      .nh48-quick-footer__eyebrow {
        display: none;
      }

      .nh48-quick-footer__header h2 {
        margin: 4px 0 4px;
        font-size: clamp(19px, 2.4vw, 24px);
        letter-spacing: 0.35px;
        color: var(--nh48-footer-accent);
      }

      .nh48-quick-footer__header p {
        margin: 0 0 4px;
        color: color-mix(in srgb, var(--nh48-footer-ink) 80%, #cbd5e1 20%);
        line-height: 1.45;
        font-size: 0.95rem;
      }

      .nh48-quick-footer .nh48-quick-footer__grid {
        display: grid;
        grid-template-columns: 1fr;
        align-items: stretch;
        justify-items: stretch;
        gap: clamp(12px, 2vw, 18px);
        width: min(1400px, 98vw);
        max-width: none;
        margin: 6px auto 0;
        padding: clamp(8px, 2vw, 14px) clamp(12px, 2.5vw, 18px);
        overflow-x: hidden;
        overflow-y: auto;
        max-height: 500px;
        min-height: 0;
        flex: 1 1 auto;
        scrollbar-width: thin;
        scrollbar-color: var(--nh48-footer-accent) color-mix(in srgb, var(--nh48-footer-card) 80%, #000 20%);
        -webkit-overflow-scrolling: touch;
        scroll-snap-type: y proximity;
      }

      /* Desktop: Show all cards in one horizontal row */
      @media (min-width: 801px) {
        .nh48-quick-footer .nh48-quick-footer__grid {
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          align-items: stretch;
          justify-content: center;
          gap: clamp(8px, 1.5vw, 16px);
          width: min(1800px, 98vw);
          max-width: none;
          margin: 6px auto 0;
          padding: 12px clamp(16px, 3vw, 32px);
          overflow-x: auto;
          overflow-y: hidden;
          max-height: none;
          min-height: 0;
          flex: 1 1 auto;
          scrollbar-width: thin;
          scrollbar-color: var(--nh48-footer-accent) color-mix(in srgb, var(--nh48-footer-card) 80%, #000 20%);
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x proximity;
          scroll-padding: 0 20px;
        }

        .nh48-quick-footer .nh48-quick-footer__group {
          flex: 0 1 clamp(150px, 11vw, 210px);
          min-width: clamp(140px, 11vw, 190px);
          max-width: clamp(170px, 13vw, 230px);
          border: 1px solid var(--nh48-footer-border);
          border-radius: 14px;
          padding: 12px 14px;
          background: var(--nh48-footer-card);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 6px 18px rgba(0, 0, 0, 0.28);
          text-align: left;
          scroll-snap-align: start;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: flex-start;
        }

        .nh48-quick-footer__group h2 {
          margin: 0 0 6px;
          font-size: 13px;
          letter-spacing: 0.1px;
          color: var(--nh48-footer-ink);
          line-height: 1.2;
        }

        .nh48-quick-footer__list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }

        .nh48-quick-footer__list li {
          width: 100%;
        }

        .nh48-quick-footer__link {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 8px 10px;
          min-height: 34px;
          text-align: left;
          border-radius: 8px;
          border: 1px solid color-mix(in srgb, var(--nh48-footer-accent) 85%, var(--nh48-footer-ink) 15%);
          color: #ffffff;
          text-decoration: none;
          background: color-mix(in srgb, var(--nh48-footer-card) 50%, var(--nh48-footer-accent) 50%);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, transform 0.2s ease;
          line-height: 1.2;
          white-space: normal;
          width: 100%;
          font-size: 0.85rem;
          align-self: stretch;
          box-sizing: border-box;
        }

        .nh48-quick-footer__link-label {
          display: inline-flex;
          align-items: center;
          flex: 1;
          min-width: 0;
        }

        .nh48-quick-footer__link-thumb {
          width: ${THUMBNAIL_CONFIG.size}px;
          height: ${THUMBNAIL_CONFIG.size}px;
          border-radius: 6px;
          object-fit: cover;
          flex-shrink: 0;
          background: rgba(15, 23, 42, 0.75);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
        }

        .nh48-quick-footer__link:hover,
        .nh48-quick-footer__link:focus-visible {
          border-color: var(--nh48-footer-accent);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--nh48-footer-accent) 28%, transparent);
          background: color-mix(in srgb, var(--nh48-footer-card) 40%, var(--nh48-footer-accent) 60%);
          transform: translateY(-1px);
          outline: none;
        }

        .nh48-quick-footer__grid::-webkit-scrollbar {
          height: 8px;
          width: auto;
        }

        .nh48-quick-footer__grid::-webkit-scrollbar-track {
          background: color-mix(in srgb, var(--nh48-footer-card) 80%, #000 20%);
          border-radius: 4px;
        }

        .nh48-quick-footer__grid::-webkit-scrollbar-thumb {
          background: var(--nh48-footer-accent);
          border-radius: 4px;
          border: 1px solid rgba(26, 26, 46, 0.9);
        }
      }

      /* Mobile/Tablet: Keep original stacked layout */
      @media (max-width: 800px) {
        .nh48-quick-footer .nh48-quick-footer__grid {
          grid-template-columns: 1fr;
          max-height: 500px;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 8px clamp(14px, 4vw, 22px) 10px;
        }

        .nh48-quick-footer .nh48-quick-footer__group {
          max-width: 100%;
        }
      }

      /* Base styles (non-desktop) */
      .nh48-quick-footer .nh48-quick-footer__group {
        border: 1px solid var(--nh48-footer-border);
        border-radius: 14px;
        padding: clamp(12px, 2vw, 16px);
        background: var(--nh48-footer-card);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 6px 18px rgba(0, 0, 0, 0.28);
        min-width: 0;
        max-width: none;
        width: 100%;
        text-align: left;
        scroll-snap-align: start;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-start;
      }

      .nh48-quick-footer__group h2 {
        margin: 0 0 8px;
        font-size: 15px;
        letter-spacing: 0.2px;
        color: var(--nh48-footer-ink);
      }

      .nh48-quick-footer__list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 7px;
        width: 100%;
      }

      .nh48-quick-footer__list li {
        width: 100%;
      }

      .nh48-quick-footer__link {
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 10px;
        min-height: 40px;
        text-align: left;
        border-radius: 10px;
        border: 1px solid color-mix(in srgb, var(--nh48-footer-accent) 85%, var(--nh48-footer-ink) 15%);
        color: #ffffff;
        text-decoration: none;
        background: color-mix(in srgb, var(--nh48-footer-card) 50%, var(--nh48-footer-accent) 50%);
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, transform 0.2s ease;
        line-height: 1.32;
        white-space: normal;
        width: 100%;
        align-self: stretch;
        box-sizing: border-box;
      }

      .nh48-quick-footer__link-label {
        display: inline-flex;
        align-items: center;
        flex: 1;
        min-width: 0;
      }

      .nh48-quick-footer__link-thumb {
        width: ${THUMBNAIL_CONFIG.size}px;
        height: ${THUMBNAIL_CONFIG.size}px;
        border-radius: 6px;
        object-fit: cover;
        flex-shrink: 0;
        background: rgba(15, 23, 42, 0.75);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
      }

      .nh48-quick-footer__link:hover,
      .nh48-quick-footer__link:focus-visible {
        border-color: var(--nh48-footer-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--nh48-footer-accent) 28%, transparent);
        background: color-mix(in srgb, var(--nh48-footer-card) 40%, var(--nh48-footer-accent) 60%);
        transform: translateY(-1px);
        outline: none;
      }

      .nh48-quick-footer__meta {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        border-top: 1px solid var(--nh48-footer-border);
        padding: 12px clamp(16px, 3vw, 32px) 12px;
        font-size: 14px;
        text-align: left;
        width: min(1200px, 98vw);
        margin: 0 auto;
        box-sizing: border-box;
      }

      .nh48-quick-footer__meta-main {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: flex-start;
        flex: 1 1 320px;
        min-width: 0;
      }

      .nh48-quick-footer__meta-links {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        justify-content: center;
      }

      .nh48-quick-footer__meta-links a {
        color: #f8fafc;
        text-decoration: none;
        padding: 6px 10px;
        border-radius: 9px;
        border: 1px solid color-mix(in srgb, var(--nh48-footer-ink) 60%, var(--nh48-footer-accent) 40%);
        background: color-mix(in srgb, var(--nh48-footer-card) 55%, #000 45%);
        transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
      }

      .nh48-quick-footer__meta-links a:hover,
      .nh48-quick-footer__meta-links a:focus-visible {
        color: #ffffff;
        background: color-mix(in srgb, var(--nh48-footer-card) 45%, var(--nh48-footer-accent) 55%);
        border-color: color-mix(in srgb, var(--nh48-footer-accent) 60%, transparent);
        outline: none;
      }

      .nh48-quick-footer__meta-links a.nh48-quick-footer__meta-link--instagram,
      .nh48-quick-footer__meta-links a[href*="instagram.com/nate_dumps_pics"] {
        background: #22c55e;
        border-color: #16a34a;
        color: #f0fdf4;
        font-weight: 700;
      }

      .nh48-quick-footer__meta-links a.nh48-quick-footer__meta-link--instagram:hover,
      .nh48-quick-footer__meta-links a.nh48-quick-footer__meta-link--instagram:focus-visible,
      .nh48-quick-footer__meta-links a[href*=\"instagram.com/nate_dumps_pics\"]:hover,
      .nh48-quick-footer__meta-links a[href*=\"instagram.com/nate_dumps_pics\"]:focus-visible {
        background: #16a34a;
        border-color: #15803d;
        color: #ffffff;
      }

      .nh48-quick-footer__legal {
        color: color-mix(in srgb, var(--nh48-footer-ink) 80%, #cbd5e1 20%);
      }

      .nh48-quick-footer__status {
        font-size: 12px;
        color: color-mix(in srgb, var(--nh48-footer-ink) 70%, #cbd5e1 30%);
        margin-top: 4px;
      }

      @media (max-width: 768px) {
        .nh48-quick-footer {
          margin: 24px auto 10px;
          padding: 14px clamp(12px, 4vw, 18px) 0;
          width: min(720px, 100%);
          min-height: 0;
          max-height: none;
        }

        .nh48-quick-footer .nh48-quick-footer__grid {
          gap: 12px;
          padding: 6px 8px 10px;
          max-height: 420px;
          min-height: 0;
        }

        .nh48-quick-footer__list {
          gap: 6px;
        }

      .nh48-quick-footer__link {
        justify-content: space-between;
        gap: 8px;
        min-height: 38px;
        padding: 8px 9px;
      }

        .nh48-quick-footer__meta {
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .nh48-quick-footer__meta-main {
          align-items: center;
          text-align: center;
        }

        .nh48-quick-footer__meta-links {
          justify-content: center;
        }

      }
    `,
    
    content: {
      header: {
        title: "Quick browse the White Mountains of New Hampshire",
        description: "Jump directly into every New Hampshire 4,000-footer detail page to quickly find summit info, photos, and route details."
      },
      
      groups: [
        {
          title: "Presidential Range",
          links: [
            { href: "/peak/mount-washington", text: "Washington" },
            { href: "/peak/mount-adams", text: "Adams" },
            { href: "/peak/mount-jefferson", text: "Jefferson" },
            { href: "/peak/mount-monroe", text: "Monroe" },
            { href: "/peak/mount-eisenhower", text: "Eisenhower" },
            { href: "/peak/mount-pierce", text: "Pierce" },
            { href: "/peak/mount-jackson", text: "Jackson" },
            { href: "/peak/mount-madison", text: "Madison" },
            { href: "/peak/mount-isolation", text: "Isolation" }
          ]
        },
        {
          title: "Franconia Ridge",
          links: [
            { href: "/peak/mount-lafayette", text: "Lafayette" },
            { href: "/peak/mount-lincoln", text: "Lincoln" },
            { href: "/peak/mount-liberty", text: "Liberty" },
            { href: "/peak/mount-flume", text: "Flume" },
            { href: "/peak/mount-garfield", text: "Garfield" }
          ]
        },
        {
          title: "Twins & Bonds",
          links: [
            { href: "/peak/south-twin-mountain", text: "South Twin" },
            { href: "/peak/north-twin-mountain", text: "North Twin" },
            { href: "/peak/galehead-mountain", text: "Galehead" },
            { href: "/peak/zealand-mountain", text: "Zealand" },
            { href: "/peak/west-bond", text: "West Bond" },
            { href: "/peak/mount-bond", text: "Bond" },
            { href: "/peak/bondcliff", text: "Bondcliff" },
            { href: "/peak/owls-head", text: "Owl's Head" }
          ]
        },
        {
          title: "Carter-Moriah & Wildcats",
          links: [
            { href: "/peak/carter-dome", text: "Carter Dome" },
            { href: "/peak/south-carter-mountain", text: "South Carter" },
            { href: "/peak/middle-carter-mountain", text: "Middle Carter" },
            { href: "/peak/mount-moriah", text: "Moriah" },
            { href: "/peak/wildcat-mountain-a", text: "Wildcat A" },
            { href: "/peak/wildcat-mountain-d", text: "Wildcat D" }
          ]
        },
        {
          title: "Kinsman Range",
          links: [
            { href: "/peak/north-kinsman-mountain", text: "North Kinsman" },
            { href: "/peak/south-kinsman-mountain", text: "South Kinsman" },
            { href: "/peak/cannon-mountain", text: "Cannon" }
          ]
        },
        {
          title: "Osceolas & Trips",
          links: [
            { href: "/peak/mount-passaconaway", text: "Passaconaway" },
            { href: "/peak/mount-whiteface", text: "Whiteface" },
            { href: "/peak/north-tripyramid", text: "North Tripyramid" },
            { href: "/peak/middle-tripyramid", text: "Middle Tripyramid" },
            { href: "/peak/mount-osceola", text: "Osceola" },
            { href: "/peak/mount-osceola-east", text: "Osceola East" },
            { href: "/peak/mount-tecumseh", text: "Tecumseh" }
          ]
        },
        {
          title: "Pemigewasset",
          links: [
            { href: "/peak/mount-carrigain", text: "Carrigain" },
            { href: "/peak/mount-hancock", text: "Hancock North" },
            { href: "/peak/mount-hancock-south", text: "Hancock South" },
            { href: "/peak/mount-hale", text: "Hale" }
          ]
        },
        {
          title: "Northern Summits",
          links: [
            { href: "/peak/mount-cabot", text: "Cabot" },
            { href: "/peak/mount-waumbek", text: "Waumbek" }
          ]
        },
        {
          title: "Western & Outlying",
          links: [
            { href: "/peak/mount-moosilauke", text: "Moosilauke" },
            { href: "/peak/mount-willey", text: "Willey" },
            { href: "/peak/mount-field", text: "Field" },
            { href: "/peak/mount-tom", text: "Tom" }
          ]
        }
      ],
      
      meta: {
        legal: '© 2026 Nathan Sobol · <a href="/catalog" class="legal-link nh48-link">NH 48</a>, <a href="/trails" class="legal-link tracing-link">White Mountain Tracing</a>, <a href="/long-trails" class="legal-link long-trail-link">Scenic & Long Trail</a> – Data, Routes, and Photos',
        links: [
          { href: "/catalog", text: "Catalog" },
          { href: "/trails", text: "White Mountain Trails" },
          { href: "/long-trails", text: "Long Trails" },
          { href: "https://nh48pics.com", text: "NH48 Pics", external: true },
          { href: "https://nh48.app", text: "Peak Bagger", external: true },
          { href: "https://www.instagram.com/nate_dumps_pics/", text: "@nate_dumps_pics", external: true, className: "nh48-quick-footer__meta-link--instagram" }
        ],
        }
      }
    },
    
    // Peak data for sorting functionality
    peaks: [
      { slug: 'mount-washington', name: 'Mount Washington', elevation: 6288 },
      { slug: 'mount-adams', name: 'Mount Adams', elevation: 5793 },
      { slug: 'mount-jefferson', name: 'Mount Jefferson', elevation: 5712 },
      { slug: 'mount-monroe', name: 'Mount Monroe', elevation: 5372 },
      { slug: 'mount-eisenhower', name: 'Mount Eisenhower', elevation: 4780 },
      { slug: 'mount-pierce', name: 'Mount Pierce', elevation: 4310 },
      { slug: 'mount-jackson', name: 'Mount Jackson', elevation: 4052 },
      { slug: 'mount-madison', name: 'Mount Madison', elevation: 5367 },
      { slug: 'mount-isolation', name: 'Mount Isolation', elevation: 4035 },
      { slug: 'mount-lafayette', name: 'Mount Lafayette', elevation: 5260 },
      { slug: 'mount-lincoln', name: 'Mount Lincoln', elevation: 5089 },
      { slug: 'mount-liberty', name: 'Mount Liberty', elevation: 4459 },
      { slug: 'mount-flume', name: 'Mount Flume', elevation: 4328 },
      { slug: 'mount-garfield', name: 'Mount Garfield', elevation: 6000 },
      { slug: 'south-twin-mountain', name: 'South Twin Mountain', elevation: 4902 },
      { slug: 'north-twin-mountain', name: 'North Twin Mountain', elevation: 4760 },
      { slug: 'galehead-mountain', name: 'Galehead Mountain', elevation: 4024 },
      { slug: 'zealand-mountain', name: 'Zealand Mountain', elevation: 4260 },
      { slug: 'west-bond', name: 'West Bond', elevation: 4540 },
      { slug: 'mount-bond', name: 'Mount Bond', elevation: 4698 },
      { slug: 'bondcliff', name: 'Bondcliff', elevation: 4260 },
      { slug: 'owls-head', name: "Owl's Head", elevation: 4025 },
      { slug: 'carter-dome', name: 'Carter Dome', elevation: 4832 },
      { slug: 'south-carter-mountain', name: 'South Carter Mountain', elevation: 4440 },
      { slug: 'middle-carter-mountain', name: 'Middle Carter Mountain', elevation: 4610 },
      { slug: 'mount-moriah', name: 'Mount Moriah', elevation: 4049 },
      { slug: 'wildcat-mountain-a', name: 'Wildcat Mountain – A Peak', elevation: 4422 },
      { slug: 'wildcat-mountain-d', name: 'Wildcat Mountain – D Peak', elevation: 4062 },
      { slug: 'north-kinsman-mountain', name: 'North Kinsman Mountain', elevation: 4293 },
      { slug: 'south-kinsman-mountain', name: 'South Kinsman Mountain', elevation: 4358 },
      { slug: 'cannon-mountain', name: 'Cannon Mountain', elevation: 4100 },
      { slug: 'mount-passaconaway', name: 'Mount Passaconaway', elevation: 4043 },
      { slug: 'mount-whiteface', name: 'Mount Whiteface', elevation: 4020 },
      { slug: 'north-tripyramid', name: 'North Tripyramid', elevation: 4180 },
      { slug: 'middle-tripyramid', name: 'Middle Tripyramid', elevation: 4140 },
      { slug: 'mount-osceola', name: 'Mount Osceola', elevation: 4315 },
      { slug: 'mount-osceola-east', name: 'Mount Osceola – East Peak', elevation: 4156 },
      { slug: 'mount-tecumseh', name: 'Mount Tecumseh', elevation: 4003 },
      { slug: 'mount-carrigain', name: 'Mount Carrigain', elevation: 4700 },
      { slug: 'mount-hancock', name: 'Mount Hancock – North Peak', elevation: 4420 },
      { slug: 'mount-hancock-south', name: 'Mount Hancock – South Peak', elevation: 4319 },
      { slug: 'mount-hale', name: 'Mount Hale', elevation: 4054 },
      { slug: 'mount-cabot', name: 'Mount Cabot', elevation: 4170 },
      { slug: 'mount-waumbek', name: 'Mount Waumbek', elevation: 4006 },
      { slug: 'mount-moosilauke', name: 'Mount Moosilauke', elevation: 4802 },
      { slug: 'mount-willey', name: 'Mount Willey', elevation: 4285 },
      { slug: 'mount-field', name: 'Mount Field', elevation: 4340 },
      { slug: 'mount-tom', name: 'Mount Tom', elevation: 4051 }
    ]
  };

  const buildThumbnailMarkup = (link) => {
    const slug = getPeakSlug(link.href);
    const src = getThumbnailSrc(slug);
    return `
      <img
        class="nh48-quick-footer__link-thumb"
        src="${src}"
        width="${THUMBNAIL_CONFIG.size}"
        height="${THUMBNAIL_CONFIG.size}"
        alt="${link.text} thumbnail"
        loading="lazy"
        decoding="async"
        data-photo-peak="${link.text}"
        data-photo-alt="${link.text} thumbnail"
        data-photo-slug="${slug}"
        data-photo-format="${THUMBNAIL_CONFIG.format}"
        data-photo-quality="${THUMBNAIL_CONFIG.quality}"
        data-photo-width="${THUMBNAIL_CONFIG.size}"
        data-photo-height="${THUMBNAIL_CONFIG.size}"
        data-photo-cdn="${THUMBNAIL_CONFIG.cdn}"
        data-photo-source="${THUMBNAIL_CONFIG.baseUrl}"
      />
    `;
  };

  // Popularity index for sorting
  const renderGrid = (gridEl) => {
    gridEl.innerHTML = '';
    
    // Create groups based on the configuration
    const groups = FOOTER_CONFIG.content.groups;
    groups.forEach(group => {
      const groupEl = document.createElement('div');
      groupEl.className = 'nh48-quick-footer__group';
      
      const titleEl = document.createElement('h2');
      titleEl.textContent = group.title;
      groupEl.appendChild(titleEl);
      
      const listEl = document.createElement('ul');
      listEl.className = 'nh48-quick-footer__list';
      
      group.links.forEach(link => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'nh48-quick-footer__link';
        a.href = link.href;
        const label = createLinkLabel(link.text);
        const slug = getPeakSlug(link.href);
        const thumb = createThumbnailElement(link.text, slug);
        a.appendChild(label);
        a.appendChild(thumb);
        
        // Add elevation data if available
        const peak = FOOTER_CONFIG.peaks.find(p => p.slug === getPeakSlug(link.href));
        if (peak && peak.elevation) {
          a.setAttribute('data-elevation', peak.elevation);
        }
        
        li.appendChild(a);
        listEl.appendChild(li);
      });
      
      groupEl.appendChild(listEl);
      gridEl.appendChild(groupEl);
    });
  };

  const enhanceFooter = (footerEl) => {
    const grid = footerEl.querySelector('.nh48-quick-footer__grid');
    if (!grid) return;

    renderGrid(grid);
  };

  const setBuildStatus = (footerEl) => {
    const statusEl = footerEl.querySelector('.nh48-quick-footer__status');
    if (!statusEl) return;
    const isoString = window.NH48_BUILD_DATE;
    if (!isoString) return;
    const date = new Date(isoString);
    const formatted = date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/New_York'
    });
    statusEl.textContent = `Last updated: ${formatted}`;
  };

  const generateFooterHTML = () => {
    const content = FOOTER_CONFIG.content;
    
    return `
      <footer class="nh48-quick-footer" aria-labelledby="nh48-quick-footer-title" data-nh48-quick-footer>
        <div class="nh48-quick-footer__header">
          <h2 id="nh48-quick-footer-title">${content.header.title}</h2>
          <p>${content.header.description}</p>
        </div>
        <div class="nh48-quick-footer__grid" aria-label="NH48 quick browse footer links">
          ${content.groups.map(group => `
            <div class="nh48-quick-footer__group">
              <h2>${group.title}</h2>
              <ul class="nh48-quick-footer__list">
                ${group.links.map(link => `
                  <li><a class="nh48-quick-footer__link" href="${link.href}"><span class="nh48-quick-footer__link-label">${link.text}</span>${buildThumbnailMarkup(link)}</a></li>
                `).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
        <div class="nh48-quick-footer__meta">
          <div class="nh48-quick-footer__meta-main">
            <div class="nh48-quick-footer__legal">${content.meta.legal}</div>
            <div class="nh48-quick-footer__meta-links" aria-label="Footer navigation links">
              ${content.meta.links.map(link => `
                <a href="${link.href}" ${link.external ? 'target="_blank" rel="noopener"' : ''} ${link.className ? `class="${link.className}"` : ''}>${link.text}</a>
              `).join('')}
            </div>
            <div class="nh48-quick-footer__status" aria-live="polite"></div>
          </div>
        </div>
      </footer>
    `;
  };

  const injectFooter = () => {
    const route = document.body?.dataset?.route || document.body?.dataset?.page || '';
    if (route === 'trails' || route === 'long-trails') {
      return;
    }

    // Check if footer already exists
    if (document.querySelector('.nh48-quick-footer') || document.querySelector('[data-nh48-quick-footer]')) {
      return;
    }

    // Check for footer-placeholder and inject there if found
    const placeholder = document.getElementById('footer-placeholder');
    const targetParent = placeholder ? placeholder.parentNode : document.body;
    const insertBefore = placeholder ? placeholder.nextSibling : null;

    // Create style element
    const styleEl = document.createElement('style');
    styleEl.textContent = FOOTER_CONFIG.styles;
    document.head.appendChild(styleEl);

    // Create footer element
    const wrapper = document.createElement('div');
    wrapper.innerHTML = generateFooterHTML();
    const footer = wrapper.firstElementChild;

    // Remove the placeholder if it exists
    if (placeholder) {
      placeholder.remove();
    }

    // Insert the footer
    if (insertBefore) {
      targetParent.insertBefore(footer, insertBefore);
    } else {
      targetParent.appendChild(footer);
    }

    // Enhance with interactive features
    enhanceFooter(footer);
    setBuildStatus(footer);
  };

  // Initialize when DOM is ready
  const boot = () => {
    injectFooter();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
