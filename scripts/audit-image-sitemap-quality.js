#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOCAL_IMAGE_SITEMAP_PATH = path.join(ROOT, 'image-sitemap.xml');

function getArgValue(flag, fallback = '') {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

function toPositiveInt(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseUrlEntries(xmlText) {
  const urlEntries = [];
  const urlBlockRegex = /<url>([\s\S]*?)<\/url>/gi;
  let blockMatch;
  while ((blockMatch = urlBlockRegex.exec(xmlText)) !== null) {
    const block = blockMatch[1] || '';
    const pageLocMatch = block.match(/<loc>([\s\S]*?)<\/loc>/i);
    const pageLoc = decodeXml(pageLocMatch ? pageLocMatch[1] : '').trim();
    if (!pageLoc) continue;

    const imageLocs = [];
    const imageLocRegex = /<image:loc>([\s\S]*?)<\/image:loc>/gi;
    let imageLocMatch;
    while ((imageLocMatch = imageLocRegex.exec(block)) !== null) {
      const imageLoc = decodeXml(imageLocMatch[1]).trim();
      if (imageLoc) imageLocs.push(imageLoc);
    }
    urlEntries.push({ pageLoc, imageLocs });
  }
  return urlEntries;
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return await response.text();
}

async function checkImageReachability(urls, sampleSize) {
  const issues = [];
  const targets = urls.slice(0, sampleSize);
  const concurrency = 8;

  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (url) => {
        try {
          const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: AbortSignal.timeout(15000),
          });
          const contentType = (response.headers.get('content-type') || '').toLowerCase();
          if (response.status < 200 || response.status >= 300) {
            return `Image URL returned non-2xx status (${response.status}): ${url}`;
          }
          if (!contentType.startsWith('image/')) {
            return `Image URL did not return image/* content-type (${contentType || '[missing]'}): ${url}`;
          }
          return '';
        } catch (error) {
          return `Image URL reachability check failed: ${url} (${error.message})`;
        }
      }),
    );
    results.forEach((issue) => {
      if (issue) issues.push(issue);
    });
  }

  return { checked: targets.length, issues };
}

function runStaticChecks(xmlText, sourceLabel) {
  const issues = [];
  const transformedHosts = new Set([
    'photos.nh48.info',
    'plants.nh48.info',
    'wikiphotos.nh48.info',
    'howker.nh48.info',
  ]);

  if (!/<urlset\b/i.test(xmlText)) {
    issues.push(`${sourceLabel}: missing <urlset> root.`);
  }
  if (!/xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/i.test(xmlText)) {
    issues.push(`${sourceLabel}: missing image namespace declaration on <urlset>.`);
  }

  const urlEntries = parseUrlEntries(xmlText);
  if (!urlEntries.length) {
    issues.push(`${sourceLabel}: no <url> entries were parsed.`);
  }

  const imageToPages = new Map();
  let imageNodeCount = 0;
  const titleOrCaptionCount = (xmlText.match(/<image:(title|caption)>([\s\S]*?)<\/image:(title|caption)>/gi) || []).length;

  urlEntries.forEach((entry) => {
    if (!/^https:\/\//i.test(entry.pageLoc)) {
      issues.push(`${sourceLabel}: page <loc> is not absolute HTTPS: ${entry.pageLoc}`);
    }
    entry.imageLocs.forEach((imageLoc) => {
      imageNodeCount += 1;
      if (!/^https:\/\//i.test(imageLoc)) {
        issues.push(`${sourceLabel}: image URL is not absolute HTTPS: ${imageLoc}`);
      }
      let parsed = null;
      try {
        parsed = new URL(imageLoc);
      } catch (error) {
        parsed = null;
      }
      const host = parsed ? String(parsed.hostname || '').toLowerCase() : '';
      const isTransformed = /\/cdn-cgi\/image\//i.test(imageLoc);
      if (transformedHosts.has(host)) {
        if (!isTransformed) {
          issues.push(`${sourceLabel}: transformed host image URL must use /cdn-cgi/image/: ${imageLoc}`);
        } else if (!/\/cdn-cgi\/image\/[^/]*format=jpg[^/]*quality=88[^/]*width=1600/i.test(imageLoc)) {
          issues.push(`${sourceLabel}: transformed host URL missing expected options (format=jpg,quality=88,width=1600): ${imageLoc}`);
        }
      }
      if (!imageToPages.has(imageLoc)) {
        imageToPages.set(imageLoc, new Set());
      }
      imageToPages.get(imageLoc).add(entry.pageLoc);
    });
  });

  const duplicateImages = [];
  const multiPageMapped = [];
  for (const [imageLoc, pages] of imageToPages.entries()) {
    if (pages.size > 1) {
      multiPageMapped.push({ imageLoc, pages: Array.from(pages).sort((a, b) => a.localeCompare(b)) });
    }
  }

  if (imageNodeCount !== imageToPages.size) {
    issues.push(
      `${sourceLabel}: duplicate image nodes detected (nodes=${imageNodeCount}, unique=${imageToPages.size}).`,
    );
  }
  if (multiPageMapped.length) {
    multiPageMapped.slice(0, 25).forEach((entry) => {
      issues.push(
        `${sourceLabel}: one-to-one mapping violated for image ${entry.imageLoc} (pages=${entry.pages.join(', ')})`,
      );
    });
    if (multiPageMapped.length > 25) {
      issues.push(`${sourceLabel}: ${multiPageMapped.length - 25} additional multi-page image mappings omitted.`);
    }
  }
  if (!titleOrCaptionCount) {
    issues.push(`${sourceLabel}: expected <image:title> and/or <image:caption> metadata, but none were found.`);
  }

  return {
    issues,
    stats: {
      urls: urlEntries.length,
      imageNodes: imageNodeCount,
      uniqueImages: imageToPages.size,
      titleOrCaptionCount,
    },
    uniqueImages: Array.from(imageToPages.keys()).sort((a, b) => a.localeCompare(b)),
  };
}

async function main() {
  const baseUrl = getArgValue('--url', '');
  const sampleSize = toPositiveInt(getArgValue('--sample', '50'), 50);

  let sourceLabel = path.relative(ROOT, LOCAL_IMAGE_SITEMAP_PATH);
  let xmlText = '';
  if (baseUrl) {
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const sitemapUrl = `${normalizedBase}/image-sitemap.xml`;
    sourceLabel = sitemapUrl;
    xmlText = await fetchText(sitemapUrl);
  } else {
    if (!fs.existsSync(LOCAL_IMAGE_SITEMAP_PATH)) {
      console.error(`Missing local image sitemap: ${sourceLabel}`);
      process.exit(1);
    }
    xmlText = fs.readFileSync(LOCAL_IMAGE_SITEMAP_PATH, 'utf8');
  }

  const { issues, stats, uniqueImages } = runStaticChecks(xmlText, sourceLabel);

  let reachability = null;
  if (baseUrl && uniqueImages.length) {
    reachability = await checkImageReachability(uniqueImages, sampleSize);
    reachability.issues.forEach((issue) => issues.push(issue));
  }

  if (issues.length) {
    console.error(`Image sitemap quality audit failed with ${issues.length} issue(s).`);
    issues.forEach((issue) => console.error(`- ${issue}`));
    process.exit(1);
  }

  let summary = `Image sitemap quality audit passed (${sourceLabel}) - URL entries: ${stats.urls}, image nodes: ${stats.imageNodes}, unique images: ${stats.uniqueImages}, image metadata nodes (title/caption): ${stats.titleOrCaptionCount}.`;
  if (reachability) {
    summary += ` Reachability sampled: ${reachability.checked}.`;
  }
  console.log(summary);
}

main().catch((error) => {
  console.error(`Image sitemap quality audit crashed: ${error.message}`);
  process.exit(1);
});
