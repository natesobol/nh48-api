#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASE_URL = process.env.FAVICON_AUDIT_URL || getArgValue('--url') || '';

const REQUIRED_LINK_RULES = [
  {
    label: 'icon 48',
    regex: /<link\b[^>]*rel=["']icon["'][^>]*href=["']https:\/\/nh48\.info\/favicon\.png["'][^>]*sizes=["']48x48["'][^>]*type=["']image\/png["'][^>]*>/i
  },
  {
    label: 'icon 192',
    regex: /<link\b[^>]*rel=["']icon["'][^>]*href=["']https:\/\/nh48\.info\/icon-192\.png["'][^>]*sizes=["']192x192["'][^>]*type=["']image\/png["'][^>]*>/i
  },
  {
    label: 'apple touch icon',
    regex: /<link\b[^>]*rel=["']apple-touch-icon["'][^>]*href=["']https:\/\/nh48\.info\/apple-touch-icon\.png["'][^>]*>/i
  },
  {
    label: 'icon ico',
    regex: /<link\b[^>]*rel=["']icon["'][^>]*href=["']https:\/\/nh48\.info\/favicon\.ico["'][^>]*sizes=["']any["'][^>]*type=["']image\/x-icon["'][^>]*>/i
  },
  {
    label: 'manifest',
    regex: /<link\b[^>]*rel=["']manifest["'][^>]*href=["']\/manifest\.json["'][^>]*>/i
  }
];

const LOCAL_REQUIRED_FILES = [
  { file: 'favicon.png', type: 'png', width: 48, height: 48 },
  { file: 'icon-192.png', type: 'png', width: 192, height: 192 },
  { file: 'icon-512.png', type: 'png', width: 512, height: 512 },
  { file: 'apple-touch-icon.png', type: 'png', width: 180, height: 180 },
  { file: 'favicon.ico', type: 'ico', sizes: [16, 32, 48] },
  { file: path.join('favicons', 'favicon.ico'), type: 'ico', sizes: [16, 32, 48] },
  { file: path.join('favicons', 'apple-touch-icon.png'), type: 'png', width: 180, height: 180 },
  { file: path.join('favicons', 'android-chrome-192x192.png'), type: 'png', width: 192, height: 192 },
  { file: path.join('favicons', 'android-chrome-512x512.png'), type: 'png', width: 512, height: 512 }
];

const REMOTE_ROUTES = [
  '/',
  '/catalog',
  '/peak/mount-washington',
  '/fr/peak/mount-washington',
  '/nh48-map',
  '/plant-catalog'
];

const REMOTE_REQUIRED_ASSETS = [
  '/favicon.png',
  '/icon-192.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/manifest.json'
];

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return '';
  return process.argv[index + 1];
}

function listTrackedHtmlFiles() {
  const output = execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8' });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((file) => ({ rel: file, abs: path.join(ROOT, file) }));
}

function extractHead(html) {
  const match = String(html).match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  return match ? match[1] : '';
}

function isHtmlDocument(html) {
  const content = String(html || '');
  return /<!doctype\s+html/i.test(content) || /<html\b/i.test(content);
}

function checkHeadContract(head, label, failures) {
  if (!head) {
    failures.push(`${label}: missing <head> section.`);
    return;
  }
  if (/<link\b[^>]*href=["'][^"']*\/favicons\//i.test(head)) {
    failures.push(`${label}: contains legacy /favicons/ link href in head.`);
  }
  for (const rule of REQUIRED_LINK_RULES) {
    const matches = String(head || '').match(new RegExp(rule.regex.source, 'gi'));
    const count = matches ? matches.length : 0;
    if (count !== 1) {
      failures.push(`${label}: expected exactly one required favicon link (${rule.label}), found ${count}.`);
    }
  }
}

function parsePngDimensions(buffer) {
  const signature = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.slice(0, 8).toString('hex') !== signature) {
    throw new Error('invalid PNG signature');
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function parseIcoSizes(buffer) {
  if (buffer.length < 6) {
    throw new Error('invalid ICO header');
  }
  const type = buffer.readUInt16LE(2);
  if (type !== 1) {
    throw new Error('invalid ICO type');
  }
  const count = buffer.readUInt16LE(4);
  if (!count || buffer.length < 6 + count * 16) {
    throw new Error('invalid ICO entry count');
  }
  const sizes = [];
  for (let i = 0; i < count; i += 1) {
    const offset = 6 + i * 16;
    const widthByte = buffer.readUInt8(offset);
    const heightByte = buffer.readUInt8(offset + 1);
    const width = widthByte === 0 ? 256 : widthByte;
    const height = heightByte === 0 ? 256 : heightByte;
    sizes.push({ width, height });
  }
  return sizes;
}

function ensureLocalFiles(failures) {
  for (const entry of LOCAL_REQUIRED_FILES) {
    const filePath = path.join(ROOT, entry.file);
    if (!fs.existsSync(filePath)) {
      failures.push(`Missing required favicon file: ${entry.file}`);
      continue;
    }
    const bytes = fs.readFileSync(filePath);
    try {
      if (entry.type === 'png') {
        const dims = parsePngDimensions(bytes);
        if (dims.width !== entry.width || dims.height !== entry.height) {
          failures.push(
            `${entry.file}: expected ${entry.width}x${entry.height}, found ${dims.width}x${dims.height}.`
          );
        }
      } else if (entry.type === 'ico') {
        const sizes = parseIcoSizes(bytes).map((item) => item.width);
        for (const needed of entry.sizes) {
          if (!sizes.includes(needed)) {
            failures.push(`${entry.file}: missing ${needed}x${needed} entry.`);
          }
        }
      }
    } catch (error) {
      failures.push(`${entry.file}: ${error.message}`);
    }
  }
}

async function runLocalAudit() {
  const failures = [];
  const files = listTrackedHtmlFiles();
  for (const file of files) {
    const html = fs.readFileSync(file.abs, 'utf8');
    if (!isHtmlDocument(html)) {
      continue;
    }
    checkHeadContract(extractHead(html), file.rel, failures);
  }
  ensureLocalFiles(failures);

  if (failures.length) {
    console.error(`Favicon contract audit failed with ${failures.length} issue(s):`);
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
  }

  console.log(`Favicon contract audit passed for ${files.length} local HTML file(s).`);
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'NH48-Favicon-Audit/1.0' } });
  const text = await response.text();
  return { response, text };
}

async function fetchBytes(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'NH48-Favicon-Audit/1.0' } });
  const arrayBuffer = await response.arrayBuffer();
  return { response, bytes: Buffer.from(arrayBuffer) };
}

async function runRemoteAudit(baseUrl) {
  const failures = [];

  for (const route of REMOTE_ROUTES) {
    const url = new URL(route, baseUrl).toString();
    try {
      const { response, text } = await fetchText(url);
      if (!response.ok) {
        failures.push(`${url}: expected 200, got ${response.status}.`);
        continue;
      }
      checkHeadContract(extractHead(text), url, failures);
    } catch (error) {
      failures.push(`${url}: ${error.message}`);
    }
  }

  for (const assetPath of REMOTE_REQUIRED_ASSETS) {
    const url = new URL(assetPath, baseUrl).toString();
    try {
      const { response, bytes } = await fetchBytes(url);
      if (!response.ok) {
        failures.push(`${url}: expected 200, got ${response.status}.`);
        continue;
      }

      if (assetPath.endsWith('.png')) {
        const dims = parsePngDimensions(bytes);
        const expected =
          assetPath === '/favicon.png'
            ? { width: 48, height: 48 }
            : assetPath === '/icon-192.png'
              ? { width: 192, height: 192 }
              : { width: 180, height: 180 };
        if (dims.width !== expected.width || dims.height !== expected.height) {
          failures.push(
            `${url}: expected ${expected.width}x${expected.height}, found ${dims.width}x${dims.height}.`
          );
        }
      } else if (assetPath.endsWith('.ico')) {
        const sizes = parseIcoSizes(bytes).map((item) => item.width);
        for (const needed of [16, 32, 48]) {
          if (!sizes.includes(needed)) {
            failures.push(`${url}: missing ${needed}x${needed} entry.`);
          }
        }
      }
    } catch (error) {
      failures.push(`${url}: ${error.message}`);
    }
  }

  if (failures.length) {
    console.error(`Live favicon contract audit failed with ${failures.length} issue(s):`);
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
  }

  console.log(`Live favicon contract audit passed for ${REMOTE_ROUTES.length} route(s) at ${baseUrl}.`);
}

async function main() {
  if (BASE_URL) {
    await runRemoteAudit(BASE_URL);
  } else {
    await runLocalAudit();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
