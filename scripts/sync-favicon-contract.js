#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const HTML_FILES = listTrackedHtmlFiles();

const FAVICON_LINES = [
  '<link rel="icon" href="https://nh48.info/favicon.png" sizes="48x48" type="image/png">',
  '<link rel="icon" href="https://nh48.info/icon-192.png" sizes="192x192" type="image/png">',
  '<link rel="apple-touch-icon" href="https://nh48.info/apple-touch-icon.png">',
  '<link rel="icon" href="https://nh48.info/favicon.ico" sizes="any" type="image/x-icon">',
  '<link rel="manifest" href="/manifest.json">'
];

function listTrackedHtmlFiles() {
  const output = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((file) => path.join(ROOT, file));
}

function replaceHeadFaviconLinks(html) {
  const headOpen = html.search(/<head\b[^>]*>/i);
  if (headOpen === -1) return { changed: false, html };
  const openTagEnd = html.indexOf('>', headOpen);
  if (openTagEnd === -1) return { changed: false, html };
  const headClose = html.search(/<\/head>/i);
  if (headClose === -1 || headClose <= openTagEnd) return { changed: false, html };

  const headContent = html.slice(openTagEnd + 1, headClose);
  const lineBreak = headContent.includes('\r\n') ? '\r\n' : '\n';
  const lines = headContent.split(/\r?\n/);

  const filtered = lines.filter((line) => {
    const normalized = line.trim();
    if (/^<!--\s*Favicons\s*-|^<!--\s*PNG fallbacks/i.test(normalized)) {
      return false;
    }
    if (!normalized.toLowerCase().startsWith('<link')) return true;
    return !/\brel\s*=\s*["'](?:icon|shortcut icon|apple-touch-icon|manifest|mask-icon)["']/i.test(normalized);
  });

  const charsetIndex = filtered.findIndex((line) => /<meta\b[^>]*charset=/i.test(line));
  const insertIndex = charsetIndex >= 0 ? charsetIndex + 1 : 0;

  const firstIndentedLine = filtered.find((line) => line.trim().length > 0);
  const indentMatch = firstIndentedLine ? firstIndentedLine.match(/^(\s+)/) : null;
  const indent = indentMatch ? indentMatch[1] : '    ';

  const block = FAVICON_LINES.map((line) => `${indent}${line}`);
  const next = [...filtered.slice(0, insertIndex), ...block, ...filtered.slice(insertIndex)];

  const before = headContent.replace(/\s+/g, ' ').trim();
  const after = next.join(lineBreak).replace(/\s+/g, ' ').trim();
  if (before === after) {
    return { changed: false, html };
  }

  return {
    changed: true,
    html: `${html.slice(0, openTagEnd + 1)}${next.join(lineBreak)}${html.slice(headClose)}`
  };
}

let changedCount = 0;

for (const filePath of HTML_FILES) {
  const original = fs.readFileSync(filePath, 'utf8');
  const result = replaceHeadFaviconLinks(original);
  if (!result.changed) continue;
  fs.writeFileSync(filePath, result.html, 'utf8');
  changedCount += 1;
}

console.log(`Synced favicon contract in ${changedCount} HTML file(s).`);
