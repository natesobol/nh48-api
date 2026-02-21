#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

function getArgValue(flag, fallback = '') {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return fallback;
  return String(process.argv[index + 1] || fallback).trim();
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function collectFilesRecursive(dirPath) {
  const output = [];
  const stack = [dirPath];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
      } else if (entry.isFile()) {
        output.push(absolute);
      }
    });
  }
  return output.sort();
}

function normalizePosix(value) {
  return String(value || '').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\//, '');
}

function contentTypeForFile(filePath) {
  const lower = String(filePath || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.pbf')) return 'application/x-protobuf';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}

function cacheControlForRelativePath(relativePath) {
  if (normalizePosix(relativePath) === 'metadata.json') {
    return 'public, max-age=300';
  }
  return 'public, max-age=31536000, immutable';
}

function main() {
  const sourceDirArg = getArgValue('--source-dir', path.join('tmp', 'wmnf-stylized', 'v1'));
  const bucket = getArgValue('--bucket', process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || 'nh48-photos');
  const prefix = normalizePosix(getArgValue('--prefix', 'tiles/wmnf-stylized/v1'));
  const dryRun = hasFlag('--dry-run');

  const sourceDir = path.isAbsolute(sourceDirArg) ? sourceDirArg : path.join(ROOT, sourceDirArg);
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory not found: ${sourceDir}`);
  }

  const files = collectFilesRecursive(sourceDir)
    .map((absolutePath) => ({
      absolutePath,
      relativePath: normalizePosix(path.relative(sourceDir, absolutePath))
    }))
    .filter((entry) => (
      entry.relativePath.startsWith('hillshade/')
      || entry.relativePath.startsWith('contours/')
      || entry.relativePath === 'metadata.json'
    ));

  if (!files.length) {
    throw new Error(
      `No WMNF stylized assets found in ${sourceDir}. `
      + 'Expected hillshade/**, contours/**, and metadata.json.'
    );
  }

  const wranglerBin = process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler';
  let uploadedCount = 0;

  files.forEach((entry, index) => {
    const key = normalizePosix(`${prefix}/${entry.relativePath}`);
    const contentType = contentTypeForFile(entry.relativePath);
    const cacheControl = cacheControlForRelativePath(entry.relativePath);
    const objectTarget = `${bucket}/${key}`;
    const args = [
      'r2', 'object', 'put', objectTarget,
      '--file', entry.absolutePath,
      '--content-type', contentType,
      '--cache-control', cacheControl
    ];

    console.log(
      `[publish-wmnf-stylized] ${index + 1}/${files.length} ${entry.relativePath} -> ${objectTarget}`
    );
    if (dryRun) return;

    const result = spawnSync(wranglerBin, args, {
      cwd: ROOT,
      stdio: 'inherit'
    });
    if (result.status !== 0) {
      throw new Error(`Wrangler upload failed for ${entry.relativePath} (exit ${result.status}).`);
    }
    uploadedCount += 1;
  });

  if (dryRun) {
    console.log(`[publish-wmnf-stylized] Dry run complete. ${files.length} file(s) discovered.`);
    return;
  }

  console.log(`[publish-wmnf-stylized] Upload complete. ${uploadedCount} file(s) published.`);
}

try {
  main();
} catch (error) {
  console.error(`[publish-wmnf-stylized] ERROR: ${error.message}`);
  process.exit(1);
}
