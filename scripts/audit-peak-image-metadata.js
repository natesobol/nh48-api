#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NH48_PATH = path.join(ROOT, 'data', 'nh48.json');
const PEAK_TEMPLATE_PATH = path.join(ROOT, 'pages', 'nh48_peak.html');
const BASE_URL = process.env.PEAK_IMAGE_METADATA_AUDIT_URL || getArgValue('--url') || '';

const LOCALES = ['en', 'fr'];

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return '';
  return process.argv[idx + 1];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function loadSourceNh48() {
  if (!BASE_URL) {
    return readJson(NH48_PATH);
  }

  const dataUrl = new URL('/data/nh48.json', BASE_URL).toString();
  const response = await fetch(dataUrl, {
    headers: { 'User-Agent': 'NH48-Peak-Image-Metadata-Audit/1.0' }
  });
  if (!response.ok) {
    throw new Error(`Unable to load canonical source dataset ${dataUrl} (${response.status})`);
  }
  return response.json();
}

function extractFunctionBody(content, functionName) {
  const signature = `function ${functionName}`;
  const start = content.indexOf(signature);
  if (start === -1) return '';
  const braceStart = content.indexOf('{', start);
  if (braceStart === -1) return '';
  let depth = 0;
  for (let i = braceStart; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(braceStart + 1, i);
      }
    }
  }
  return '';
}

function extractJsonLdDocs(html) {
  const docs = [];
  const errors = [];
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  matches.forEach((match) => {
    const raw = (match[1] || '').trim();
    if (!raw) return;
    try {
      docs.push(JSON.parse(raw));
    } catch (error) {
      errors.push(error.message);
    }
  });
  return { docs, errors };
}

function collectNodes(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((entry) => collectNodes(entry, out));
    return out;
  }
  if (Array.isArray(node['@graph'])) {
    node['@graph'].forEach((entry) => collectNodes(entry, out));
    return out;
  }
  out.push(node);
  Object.values(node).forEach((value) => {
    if (value && typeof value === 'object') collectNodes(value, out);
  });
  return out;
}

function getTypes(node) {
  const type = node && node['@type'];
  if (Array.isArray(type)) return type.map((entry) => String(entry));
  if (typeof type === 'string') return [type];
  return [];
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x2026;/gi, '...')
    .replace(/&#8230;/gi, '...');
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeaningfulH1(html) {
  const matches = [...String(html || '').matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  const values = matches
    .map((match) => stripHtml(match[1]))
    .filter((text) => text && !/^loading(?:\s*(?:\.{3}))?$/i.test(text));
  return values[0] || '';
}

function extractMetaContent(html, selector) {
  const match = String(html || '').match(selector);
  return match ? decodeHtmlEntities(match[1] || '').trim() : '';
}

function extractHeroImageAlt(html) {
  const scoped = String(html || '').match(/<figure\b[^>]*class=["'][^"']*\bhero-image\b[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*\balt=["']([^"']+)["'][^>]*>/i);
  if (scoped && scoped[1]) return decodeHtmlEntities(scoped[1]).trim();
  const fallback = String(html || '').match(/<img\b[^>]*\balt=["']([^"']+)["'][^>]*>/i);
  return fallback ? decodeHtmlEntities(fallback[1]).trim() : '';
}

function extractTagAttribute(tag, attrName) {
  const match = String(tag || '').match(new RegExp(`\\b${attrName}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? decodeHtmlEntities(match[1] || '').trim() : '';
}

function extractGalleryImageTags(html) {
  const matches = [...String(html || '').matchAll(/<figure\b[^>]*class=["'][^"']*\bpeak-photo\b[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*>/gi)];
  return matches.map((match) => match[0]);
}

function assertGalleryImageContract(html, slug, locale, failures) {
  const label = `${slug} [${locale}]`;
  const h1 = extractMeaningfulH1(html);
  const galleryImages = extractGalleryImageTags(html);
  if (!galleryImages.length) {
    failures.push(`${label}: no gallery images found under figure.peak-photo.`);
    return;
  }

  galleryImages.forEach((figureMarkup, index) => {
    const imgMatch = figureMarkup.match(/<img\b[^>]*>/i);
    const imgTag = imgMatch ? imgMatch[0] : '';
    const alt = extractTagAttribute(imgTag, 'alt');
    const width = extractTagAttribute(imgTag, 'width');
    const height = extractTagAttribute(imgTag, 'height');
    const loading = extractTagAttribute(imgTag, 'loading');
    const itemLabel = `${label}: gallery image #${index + 1}`;

    if (!alt) {
      failures.push(`${itemLabel} missing alt text.`);
    } else {
      if (!/^.+\s-\s.+\s-\sNH48$/.test(alt)) {
        failures.push(`${itemLabel} alt does not match required force-pattern.`);
      }
      if (h1 && !alt.startsWith(`${h1} - `)) {
        failures.push(`${itemLabel} alt should start with page H1 "${h1}".`);
      }
      const viewDescription = alt.replace(/^.+?\s-\s/, '').replace(/\s-\sNH48$/, '').trim();
      if (!viewDescription) {
        failures.push(`${itemLabel} alt is missing the view-description segment.`);
      } else if (isFilenameLikeDescription(viewDescription)) {
        failures.push(`${itemLabel} alt view description appears filename-like ("${viewDescription}").`);
      }
    }

    if (!/^\d+$/.test(width) || Number(width) <= 0) {
      failures.push(`${itemLabel} missing valid numeric width attribute.`);
    }
    if (!/^\d+$/.test(height) || Number(height) <= 0) {
      failures.push(`${itemLabel} missing valid numeric height attribute.`);
    }
    if (loading.toLowerCase() !== 'lazy') {
      failures.push(`${itemLabel} must use loading=\"lazy\".`);
    }
  });
}

function isFilenameLikeDescription(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return true;
  if (/\.(?:jpe?g|png|webp|gif|heic|avif)\b/.test(text)) return true;
  if (/__\d{1,4}\b/.test(text)) return true;
  if (/(?:^|[\s_-])(?:img|dsc|pxl|photo|mount)[\s_-]*\d{2,6}\b/.test(text)) return true;
  if (/^[a-z0-9_-]{4,}$/.test(text) && /\d/.test(text)) return true;
  return false;
}

function assertHeroAltContract(html, slug, locale, failures) {
  const label = `${slug} [${locale}]`;
  const heroAlt = extractHeroImageAlt(html);
  if (!heroAlt) {
    failures.push(`${label}: missing hero image alt text.`);
    return;
  }
  if (!/^.+\s-\s.+\s-\sNH48$/.test(heroAlt)) {
    failures.push(`${label}: hero alt does not match required pattern "[Peak Name] - [View Description] - NH48".`);
  }
  const pageH1 = extractMeaningfulH1(html);
  if (pageH1 && !heroAlt.startsWith(`${pageH1} - `)) {
    failures.push(`${label}: hero alt should start with page H1 "${pageH1}".`);
  }
  const viewDescription = heroAlt.replace(/^.+?\s-\s/, '').replace(/\s-\sNH48$/, '').trim();
  if (!viewDescription) {
    failures.push(`${label}: hero alt is missing the view description segment.`);
  } else if (isFilenameLikeDescription(viewDescription)) {
    failures.push(`${label}: hero alt view description appears filename-like ("${viewDescription}").`);
  }

  const ogAlt = extractMetaContent(html, /<meta\b[^>]*property=["']og:image:alt["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const twitterAlt = extractMetaContent(html, /<meta\b[^>]*name=["']twitter:image:alt["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (!ogAlt) {
    failures.push(`${label}: missing og:image:alt meta content.`);
  } else if (ogAlt !== heroAlt) {
    failures.push(`${label}: og:image:alt must match hero alt text.`);
  }
  if (!twitterAlt) {
    failures.push(`${label}: missing twitter:image:alt meta content.`);
  } else if (twitterAlt !== heroAlt) {
    failures.push(`${label}: twitter:image:alt must match hero alt text.`);
  }
}

function normalizeUrlToBasename(input) {
  if (!input) return '';
  try {
    const url = new URL(String(input));
    const cleanPath = url.pathname.replace(/\/+$/, '');
    return cleanPath.split('/').pop() || '';
  } catch {
    const clean = String(input).split('?')[0].split('#')[0].replace(/\/+$/, '');
    return clean.split('/').pop() || '';
  }
}

function extractSourcePhotoBasenames(peak) {
  const list = Array.isArray(peak && peak.photos) ? peak.photos : [];
  const names = new Set();
  list.forEach((photo) => {
    const rawUrl = typeof photo === 'string' ? photo : (photo && (photo.originalUrl || photo.url));
    const basename = normalizeUrlToBasename(rawUrl);
    if (basename) names.add(basename);
  });
  return names;
}

function extractImageObjectBasenames(nodes, slug, sourceNames = new Set()) {
  const names = new Set();
  nodes.forEach((node) => {
    if (!getTypes(node).includes('ImageObject')) return;
    const contentUrl = node.contentUrl || node.url || '';
    const basename = normalizeUrlToBasename(contentUrl);
    if (!basename) return;
    if (sourceNames.has(basename)) {
      names.add(basename);
      return;
    }
    if (slug && !basename.toLowerCase().includes(slug.toLowerCase())) return;
    names.add(basename);
  });
  return names;
}

function assertTemplateTitleFallbacks(template, failures) {
  const titleBody = extractFunctionBody(template, 'buildPhotoTitleText');
  if (!titleBody) {
    failures.push('Missing buildPhotoTitleText() helper in peak template.');
    return;
  }
  if (!/headline/i.test(titleBody) || !/title/i.test(titleBody) || !/caption/i.test(titleBody)) {
    failures.push('buildPhotoTitleText() is missing metadata priority keys (headline/title/caption).');
  }
  if (!/altText/i.test(titleBody) || !/alt/i.test(titleBody)) {
    failures.push('buildPhotoTitleText() is missing alt fallback keys (altText/alt).');
  }
  if (!/buildPhotoAltText\s*\(/.test(titleBody)) {
    failures.push('buildPhotoTitleText() must fall back to buildPhotoAltText().');
  }

  const carouselBody = extractFunctionBody(template, 'buildCarousel');
  if (!carouselBody) {
    failures.push('Missing buildCarousel() function in peak template.');
    return;
  }
  if (!/img\.title\s*=/.test(carouselBody)) {
    failures.push('buildCarousel() does not set img.title from metadata fallback chain.');
  }
}

function assertImgMarkupHasAlt(html, slug, failures) {
  const imgMatches = [...html.matchAll(/<img\b[^>]*>/gi)];
  if (!imgMatches.length) {
    failures.push(`${slug}: no <img> tags found in rendered page.`);
    return;
  }
  imgMatches.forEach((match, index) => {
    const tag = match[0];
    const altMatch = tag.match(/\balt\s*=\s*["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1].trim() : '';
    if (!alt) {
      failures.push(`${slug}: image tag #${index + 1} is missing non-empty alt text.`);
    }
  });
}

function assertImageObjectRequirements(nodes, slug, failures) {
  const imageObjects = nodes.filter((node) => getTypes(node).includes('ImageObject'));
  if (!imageObjects.length) {
    failures.push(`${slug}: no ImageObject nodes found in JSON-LD.`);
    return;
  }

  const concreteObjects = imageObjects.filter((node) => {
    return String(node.contentUrl || '').trim().length > 0;
  });
  if (!concreteObjects.length) {
    failures.push(`${slug}: no concrete ImageObject nodes with contentUrl/url found.`);
    return;
  }

  const relevant = concreteObjects.filter((node) => {
    const candidate = `${node.contentUrl || ''} ${node.url || ''}`.toLowerCase();
    return candidate.includes(slug.toLowerCase());
  });
  const scoped = relevant.length ? relevant : concreteObjects;

  scoped.forEach((node, index) => {
    const label = `${slug}: ImageObject #${index + 1}`;
    if (!String(node.contentUrl || '').trim()) failures.push(`${label} missing contentUrl.`);
    if (!String(node.name || '').trim()) failures.push(`${label} missing name.`);
    if (!String(node.caption || node.description || '').trim()) failures.push(`${label} missing caption/description.`);
    if (!node.creator) failures.push(`${label} missing creator.`);
    if (!String(node.license || '').trim()) failures.push(`${label} missing license.`);
    if (!String(node.creditText || '').trim()) failures.push(`${label} missing creditText.`);
    if (!String(node.copyrightNotice || '').trim()) failures.push(`${label} missing copyrightNotice.`);
  });
}

async function loadRenderedPage(slug, locale = 'en') {
  const route = locale === 'fr' ? `/fr/peak/${slug}` : `/peak/${slug}`;
  if (BASE_URL) {
    const url = new URL(route, BASE_URL).toString();
    const response = await fetch(url, {
      headers: { 'User-Agent': 'NH48-Peak-Image-Metadata-Audit/1.0' }
    });
    if (!response.ok) {
      throw new Error(`${url} returned ${response.status}`);
    }
    return response.text();
  }

  const filePath = locale === 'fr'
    ? path.join(ROOT, 'fr', 'peaks', slug, 'index.html')
    : path.join(ROOT, 'peaks', slug, 'index.html');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing prerendered file: ${path.relative(ROOT, filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

async function main() {
  const failures = [];
  const nh48 = await loadSourceNh48();
  const template = fs.readFileSync(PEAK_TEMPLATE_PATH, 'utf8');
  assertTemplateTitleFallbacks(template, failures);
  const targetSlugs = Object.keys(nh48 || {}).sort();
  let routeChecks = 0;

  for (const slug of targetSlugs) {
    const peak = nh48?.[slug];
    if (!peak) {
      failures.push(`Missing peak entry in data/nh48.json for slug "${slug}".`);
      continue;
    }

    for (const locale of LOCALES) {
      let html = '';
      try {
        // eslint-disable-next-line no-await-in-loop
        html = await loadRenderedPage(slug, locale);
      } catch (error) {
        failures.push(`${slug} [${locale}]: ${error.message}`);
        continue;
      }
      routeChecks += 1;

      assertHeroAltContract(html, slug, locale, failures);
      assertGalleryImageContract(html, slug, locale, failures);
      assertImgMarkupHasAlt(html, `${slug} [${locale}]`, failures);
      const { docs, errors } = extractJsonLdDocs(html);
      if (errors.length) {
        failures.push(`${slug} [${locale}]: invalid JSON-LD detected (${errors.join('; ')})`);
        continue;
      }
      const nodes = [];
      docs.forEach((doc) => collectNodes(doc, nodes));
      assertImageObjectRequirements(nodes, `${slug} [${locale}]`, failures);

      const sourceNames = extractSourcePhotoBasenames(peak);
      const imageNames = extractImageObjectBasenames(nodes, slug, sourceNames);
      sourceNames.forEach((name) => {
        if (!imageNames.has(name)) {
          failures.push(`${slug} [${locale}]: missing ImageObject entry for source photo "${name}".`);
        }
      });
    }
  }

  if (failures.length) {
    console.error(`Peak image metadata audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  if (BASE_URL) {
    console.log(`Peak image metadata audit passed for ${routeChecks} route(s): ${BASE_URL}`);
  } else {
    console.log(`Peak image metadata audit passed for ${routeChecks} local prerendered route(s).`);
  }
}

main().catch((error) => {
  console.error(`Peak image metadata audit crashed: ${error.message}`);
  process.exit(1);
});
