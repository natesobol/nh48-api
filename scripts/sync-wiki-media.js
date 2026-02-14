#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_BASE_URL = 'https://wikiphotos.nh48.info';
const IMAGE_EXT_RE = /\.(jpe?g|png|webp)$/i;
const EMPTY_FILE_NAME = '.gitkeep';
const CREDIT_TEXT = '\u00A9 Nathan Sobol / NH48pics.com';
const LICENSE_URL = 'https://nh48.info/license';

const DATASETS = [
  {
    kind: 'plants',
    jsonPath: path.join(ROOT, 'data', 'wiki', 'plants.json'),
    mediaDir: path.join(ROOT, 'whitemountains-wiki', 'plants'),
    getEntries(root) {
      return Array.isArray(root) ? root : [];
    },
    setEntries(_root, entries) {
      return entries;
    },
    getSlug(entry) {
      return normalizeSlug(entry?.slug);
    },
    getDisplayName(entry, slug) {
      return firstNonEmpty(entry?.commonName, entry?.scientificName, entry?.name, humanize(slug));
    },
  },
  {
    kind: 'animals',
    jsonPath: path.join(ROOT, 'data', 'wiki', 'animals.json'),
    mediaDir: path.join(ROOT, 'whitemountains-wiki', 'animals'),
    getEntries(root) {
      return Array.isArray(root) ? root : [];
    },
    setEntries(_root, entries) {
      return entries;
    },
    getSlug(entry) {
      return normalizeSlug(entry?.slug);
    },
    getDisplayName(entry, slug) {
      return firstNonEmpty(entry?.commonName, entry?.scientificName, entry?.name, humanize(slug));
    },
  },
  {
    kind: 'plant-diseases',
    jsonPath: path.join(ROOT, 'data', 'wiki', 'plant-disease.json'),
    mediaDir: path.join(ROOT, 'whitemountains-wiki', 'plant-diseases'),
    getEntries(root) {
      return Array.isArray(root?.diseases) ? root.diseases : [];
    },
    setEntries(root, entries) {
      return { ...root, diseases: entries };
    },
    getSlug(entry) {
      return normalizeSlug(entry?.slug || entry?.id);
    },
    getDisplayName(entry, slug) {
      return firstNonEmpty(entry?.name, entry?.scientific_name, humanize(slug));
    },
  },
];

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

function humanize(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function listSubdirs(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name && !name.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true }));
}

function listImageFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => IMAGE_EXT_RE.test(name))
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true }));
}

function buildPhotoObjects(kind, slug, displayName, imageFiles, baseUrl) {
  const titleBase = displayName || humanize(slug) || 'White Mountain Wiki Entry';
  return imageFiles.map((fileName, index) => {
    const idx = String(index + 1).padStart(3, '0');
    const encodedSlug = encodeURIComponent(slug);
    const encodedFile = encodeURIComponent(fileName).replace(/%2F/gi, '/');
    return {
      photoId: `${kind}__${slug}__${idx}`,
      filename: fileName,
      url: `${baseUrl}/${kind}/${encodedSlug}/${encodedFile}`,
      alt: `${titleBase} in the White Mountains`,
      title: `${titleBase} photo ${index + 1}`,
      caption: `${titleBase} reference photo`,
      creditText: CREDIT_TEXT,
      license: LICENSE_URL,
      isPrimary: index === 0,
    };
  });
}

function deepEqualJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function removeGitkeepIfNeeded(dirPath, write, logs) {
  const markerPath = path.join(dirPath, EMPTY_FILE_NAME);
  if (write && fs.existsSync(markerPath)) {
    fs.rmSync(markerPath, { force: true });
    logs.push(`Removed ${path.relative(ROOT, markerPath)}`);
    return true;
  }
  return false;
}

function ensureGitkeepIfNeeded(dirPath, write, logs) {
  const markerPath = path.join(dirPath, EMPTY_FILE_NAME);
  if (write && !fs.existsSync(markerPath)) {
    fs.writeFileSync(markerPath, '', 'utf8');
    logs.push(`Created ${path.relative(ROOT, markerPath)}`);
    return true;
  }
  return false;
}

function runDataset(spec, options, report) {
  const { mode, baseUrl } = options;
  const write = mode === 'write';
  const source = readJson(spec.jsonPath);
  const entries = spec.getEntries(source);
  let datasetModified = false;

  if (!Array.isArray(entries)) {
    report.errors.push(`${path.relative(ROOT, spec.jsonPath)}: expected entries array.`);
    return;
  }

  ensureDir(spec.mediaDir);

  const slugMap = new Map();
  entries.forEach((entry, index) => {
    const slug = spec.getSlug(entry);
    if (!slug) {
      report.errors.push(`${spec.kind}: entry index ${index} is missing slug/id.`);
      return;
    }
    if (slugMap.has(slug)) {
      report.errors.push(`${spec.kind}: duplicate slug "${slug}" in JSON.`);
      return;
    }
    slugMap.set(slug, entry);
  });

  const jsonSlugs = Array.from(slugMap.keys()).sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true })
  );
  const folderSlugs = listSubdirs(spec.mediaDir);

  jsonSlugs.forEach((slug) => {
    const dirPath = path.join(spec.mediaDir, slug);
    if (fs.existsSync(dirPath)) return;
    if (write) {
      ensureDir(dirPath);
      ensureGitkeepIfNeeded(dirPath, true, report.logs);
      report.logs.push(`Created missing folder ${path.relative(ROOT, dirPath)}`);
      report.modified = true;
      return;
    }
    report.drift.push(`${spec.kind}: missing folder for slug "${slug}" at ${path.relative(ROOT, dirPath)}.`);
  });

  folderSlugs.forEach((slug) => {
    if (!slugMap.has(slug)) {
      report.errors.push(
        `${spec.kind}: extra folder "${path.relative(ROOT, path.join(spec.mediaDir, slug))}" has no matching JSON slug.`
      );
    }
  });

  jsonSlugs.forEach((slug) => {
    const entry = slugMap.get(slug);
    const dirPath = path.join(spec.mediaDir, slug);
    const imageFiles = listImageFiles(dirPath);
    const expectedPhotos = buildPhotoObjects(spec.kind, slug, spec.getDisplayName(entry, slug), imageFiles, baseUrl);
    const hasExistingPhotos = Object.prototype.hasOwnProperty.call(entry, 'photos');
    const existingPhotos = entry.photos;

    if (hasExistingPhotos && !Array.isArray(existingPhotos)) {
      report.errors.push(`${spec.kind}/${slug}: photos must be an array when present.`);
      return;
    }

    if (imageFiles.length === 0) {
      const markerChanged = ensureGitkeepIfNeeded(dirPath, write, report.logs);
      if (markerChanged) report.modified = true;

      if (Array.isArray(existingPhotos) && existingPhotos.length) {
        if (write) {
          delete entry.photos;
          datasetModified = true;
          report.modified = true;
          report.logs.push(`${spec.kind}/${slug}: removed stale photos array (no local images).`);
        } else {
          report.drift.push(`${spec.kind}/${slug}: has photos[] but local folder has no images.`);
        }
      }
      return;
    }

    const markerChanged = removeGitkeepIfNeeded(dirPath, write, report.logs);
    if (markerChanged) report.modified = true;

    if (!Array.isArray(existingPhotos) || !deepEqualJson(existingPhotos, expectedPhotos)) {
      if (write) {
        entry.photos = expectedPhotos;
        datasetModified = true;
        report.modified = true;
        report.logs.push(`${spec.kind}/${slug}: synced ${expectedPhotos.length} photo metadata object(s).`);
      } else {
        report.drift.push(
          `${spec.kind}/${slug}: photos[] is out of sync with ${expectedPhotos.length} local image file(s).`
        );
      }
    }
  });

  if (write && datasetModified) {
    const next = spec.setEntries(source, entries);
    writeJson(spec.jsonPath, next);
    report.changedFiles.add(path.relative(ROOT, spec.jsonPath));
  }
}

function runSync(options = {}) {
  const mode = options.mode === 'check' ? 'check' : 'write';
  const baseUrl = String(options.baseUrl || process.env.WIKI_PHOTO_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const report = {
    mode,
    baseUrl,
    logs: [],
    drift: [],
    errors: [],
    changedFiles: new Set(),
    modified: false,
  };

  DATASETS.forEach((spec) => runDataset(spec, { mode, baseUrl }, report));

  return {
    ...report,
    changedFiles: Array.from(report.changedFiles),
    ok: report.errors.length === 0 && report.drift.length === 0,
  };
}

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    mode: args.has('--check') ? 'check' : 'write',
  };
}

function printResult(result) {
  result.logs.forEach((line) => console.log(line));

  if (result.errors.length) {
    console.error(`Wiki media sync found ${result.errors.length} hard issue(s):`);
    result.errors.forEach((line) => console.error(`- ${line}`));
  }

  if (result.drift.length) {
    console.error(`Wiki media sync found ${result.drift.length} drift issue(s):`);
    result.drift.forEach((line) => console.error(`- ${line}`));
  }

  if (result.mode === 'write') {
    if (result.changedFiles.length) {
      console.log(`Updated ${result.changedFiles.length} JSON file(s):`);
      result.changedFiles.forEach((file) => console.log(`- ${file}`));
    } else if (!result.errors.length) {
      console.log('Wiki media sync: no file changes needed.');
    }
  } else if (result.ok) {
    console.log('Wiki media sync check passed.');
  } else {
    console.error('Run `node scripts/sync-wiki-media.js --write` to repair drift.');
  }
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  const result = runSync({ mode: args.mode });
  printResult(result);
  process.exit(result.ok ? 0 : 1);
}

module.exports = {
  DEFAULT_BASE_URL,
  DATASETS,
  runSync,
};
