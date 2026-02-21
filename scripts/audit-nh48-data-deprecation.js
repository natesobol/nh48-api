#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');

const TOKENS = [
  { label: 'NH48_DATA', pattern: /\bNH48_DATA\b/g },
  { label: 'nh48-data', pattern: /['"`]nh48-data['"`]/g },
  { label: 'sync-r2-data.yml', pattern: /['"`]sync-r2-data\.yml['"`]/g }
];

const ALLOWLIST = new Set([
  'Documentation/CHANGES_SUMMARY.md',
  'Documentation/SEO_SYSTEM_RUNBOOK.md'
]);

function listTrackedFiles() {
  const result = spawnSync('git', ['ls-files'], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`Unable to list tracked files via git ls-files${stderr ? `: ${stderr}` : ''}`);
  }
  return String(result.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isExcluded(relPath) {
  if (ALLOWLIST.has(relPath)) return true;
  if (relPath === 'scripts/audit-nh48-data-deprecation.js') return true;
  if (/backup/i.test(path.basename(relPath))) return true;
  if (relPath.startsWith('Documentation/')) return true;
  return false;
}

function run() {
  const failures = [];
  const files = listTrackedFiles();
  files.forEach((relPath) => {
    if (isExcluded(relPath)) return;
    const absPath = path.join(ROOT, relPath);
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) return;
    const content = fs.readFileSync(absPath, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      TOKENS.forEach(({ label, pattern }) => {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          failures.push(`${relPath}:${idx + 1}: found deprecated token "${label}"`);
        }
      });
    });
  });

  if (failures.length) {
    console.error(`NH48 data deprecation audit failed with ${failures.length} issue(s):`);
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
  }

  console.log('NH48 data deprecation audit passed.');
}

try {
  run();
} catch (error) {
  console.error(`NH48 data deprecation audit failed: ${error.message}`);
  process.exit(1);
}
