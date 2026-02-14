#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { DEFAULT_BASE_URL, DATASETS, runSync } = require('./sync-wiki-media');

const ROOT = path.resolve(__dirname, '..');
const IMAGE_EXT_RE = /\.(jpe?g|png|webp)$/i;
const EXPECTED_HOST = new URL(DEFAULT_BASE_URL).hostname;

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
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

function basenameFromUrl(url) {
  try {
    const parsed = new URL(String(url || '').trim());
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments.length ? decodeURIComponent(segments[segments.length - 1]) : '';
  } catch (_) {
    return '';
  }
}

function runAudit() {
  const issues = [];

  const syncCheck = runSync({ mode: 'check' });
  syncCheck.errors.forEach((line) => issues.push(line));
  syncCheck.drift.forEach((line) => issues.push(line));

  const globalPhotoIds = new Set();

  DATASETS.forEach((spec) => {
    const rootData = readJson(spec.jsonPath);
    const entries = spec.getEntries(rootData);
    if (!Array.isArray(entries)) {
      issues.push(`${path.relative(ROOT, spec.jsonPath)}: expected entries array.`);
      return;
    }

    entries.forEach((entry, index) => {
      const slug = spec.getSlug(entry) || '';
      if (!slug) {
        issues.push(`${spec.kind}: entry index ${index} missing slug/id.`);
        return;
      }

      const dirPath = path.join(spec.mediaDir, normalizeSlug(slug));
      const files = listImageFiles(dirPath);
      const fileSet = new Set(files.map((name) => name.toLowerCase()));

      const hasPhotosKey = Object.prototype.hasOwnProperty.call(entry, 'photos');
      if (hasPhotosKey && !Array.isArray(entry.photos)) {
        issues.push(`${spec.kind}/${slug}: photos must be an array when present.`);
        return;
      }

      const photos = Array.isArray(entry.photos) ? entry.photos : [];

      if (!files.length) {
        if (photos.length) {
          issues.push(`${spec.kind}/${slug}: photos[] present but local folder has no images.`);
        }
        return;
      }

      if (!photos.length) {
        issues.push(`${spec.kind}/${slug}: local folder has ${files.length} image(s) but photos[] is empty.`);
        return;
      }

      if (photos.length !== files.length) {
        issues.push(`${spec.kind}/${slug}: photos[] count ${photos.length} does not match local image count ${files.length}.`);
      }

      const seenPhotoIds = new Set();
      const seenFilenames = new Set();

      photos.forEach((photo, photoIndex) => {
        const photoId = String(photo?.photoId || '').trim();
        const fileName = String(photo?.filename || '').trim();
        const url = String(photo?.url || '').trim();

        if (!photoId) {
          issues.push(`${spec.kind}/${slug}: photos[${photoIndex}] is missing photoId.`);
        } else {
          if (seenPhotoIds.has(photoId)) {
            issues.push(`${spec.kind}/${slug}: duplicate photoId "${photoId}".`);
          }
          if (globalPhotoIds.has(photoId)) {
            issues.push(`${spec.kind}/${slug}: global duplicate photoId "${photoId}".`);
          }
          seenPhotoIds.add(photoId);
          globalPhotoIds.add(photoId);
        }

        const effectiveFilename = fileName || basenameFromUrl(url);
        if (!effectiveFilename) {
          issues.push(`${spec.kind}/${slug}: photos[${photoIndex}] missing filename and could not derive from URL.`);
        } else {
          const key = effectiveFilename.toLowerCase();
          if (seenFilenames.has(key)) {
            issues.push(`${spec.kind}/${slug}: duplicate filename "${effectiveFilename}" in photos[].`);
          }
          seenFilenames.add(key);
          if (!fileSet.has(key)) {
            issues.push(`${spec.kind}/${slug}: photos[] filename "${effectiveFilename}" not found in local folder.`);
          }
        }

        if (!url) {
          issues.push(`${spec.kind}/${slug}: photos[${photoIndex}] missing url.`);
          return;
        }

        let parsed;
        try {
          parsed = new URL(url);
        } catch (_) {
          issues.push(`${spec.kind}/${slug}: invalid photo URL "${url}".`);
          return;
        }

        if (parsed.hostname !== EXPECTED_HOST) {
          issues.push(`${spec.kind}/${slug}: photo host "${parsed.hostname}" does not match ${EXPECTED_HOST}.`);
        }

        const pathSegments = parsed.pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
        if (pathSegments.length < 3) {
          issues.push(`${spec.kind}/${slug}: URL path "${parsed.pathname}" is not in /<kind>/<slug>/<file> format.`);
          return;
        }

        if (pathSegments[0] !== spec.kind) {
          issues.push(`${spec.kind}/${slug}: URL kind segment "${pathSegments[0]}" does not match "${spec.kind}".`);
        }
        if (normalizeSlug(pathSegments[1]) !== normalizeSlug(slug)) {
          issues.push(`${spec.kind}/${slug}: URL slug segment "${pathSegments[1]}" does not match entry slug.`);
        }
      });
    });
  });

  return issues;
}

function main() {
  const issues = runAudit();
  if (issues.length) {
    console.error(`Wiki media sync audit failed with ${issues.length} issue(s).`);
    issues.forEach((line) => console.error(`- ${line}`));
    console.error('Suggested repair: node scripts/sync-wiki-media.js --write');
    process.exit(1);
  }

  console.log('Wiki media sync audit passed.');
}

main();
