#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NAV_PATH = path.join(ROOT, 'pages', 'nav.html');
const BASE_URL = process.env.NAV_HEADER_AUDIT_URL || getArgValue('--url') || '';

const REMOTE_ROUTES = [
  '/',
  '/catalog',
  '/peak/mount-washington',
  '/fr/peak/mount-washington',
  '/trails'
];

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) return '';
  return process.argv[index + 1];
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countMatches(content, regex) {
  const expression = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  const matches = String(content || '').match(expression);
  return matches ? matches.length : 0;
}

function requirePattern(content, regex, message, failures) {
  if (!regex.test(String(content || ''))) {
    failures.push(message);
  }
}

function requireUniqueId(content, id, label, failures) {
  const regex = new RegExp(`id=["']${escapeRegExp(id)}["']`, 'gi');
  const count = countMatches(content, regex);
  if (count !== 1) {
    failures.push(`${label}: expected exactly one #${id}, found ${count}.`);
  }
}

function runContractChecks(content, label, failures) {
  requirePattern(content, /<nav\b[^>]*class=["'][^"']*\bsite-nav\b/i, `${label}: missing .site-nav root nav.`, failures);
  requirePattern(content, /<nav\b[^>]*aria-label=["']Site navigation["']/i, `${label}: nav missing aria-label=\"Site navigation\".`, failures);
  requirePattern(content, /class=["'][^"']*\bsite-nav-links\b/i, `${label}: missing .site-nav-links container.`, failures);
  requirePattern(content, /class=["'][^"']*\bsite-nav-utility\b/i, `${label}: missing .site-nav-utility container.`, failures);
  requirePattern(
    content,
    /<div\b[^>]*class=["'][^"']*\bsite-nav-utility\b[^"']*["'][^>]*aria-label=["'][^"']+["']/i,
    `${label}: .site-nav-utility missing aria-label.`,
    failures
  );
  requireUniqueId(content, 'langPicker', label, failures);
  requireUniqueId(content, 'a11yTextDecrease', label, failures);
  requireUniqueId(content, 'a11yTextIncrease', label, failures);
  requireUniqueId(content, 'siteNavPeakSearchForm', label, failures);
  requireUniqueId(content, 'siteNavPeakSearch', label, failures);
}

function runLocalAudit() {
  const failures = [];
  if (!fs.existsSync(NAV_PATH)) {
    failures.push(`Missing nav source: ${path.relative(ROOT, NAV_PATH)}`);
  } else {
    const navHtml = fs.readFileSync(NAV_PATH, 'utf8');
    runContractChecks(navHtml, path.relative(ROOT, NAV_PATH), failures);
    requirePattern(navHtml, /__NH48_NAV_MENU_READY/, 'pages/nav.html: missing idempotent nav init guard.', failures);
    requirePattern(navHtml, /nh48_text_scale/, 'pages/nav.html: missing nh48_text_scale storage key.', failures);
    requirePattern(navHtml, /data-text-scale/, 'pages/nav.html: missing html[data-text-scale] contract hooks.', failures);
  }

  if (failures.length) {
    console.error(`Nav header contract audit failed with ${failures.length} issue(s):`);
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
  }

  console.log('Nav header contract audit passed for local source (pages/nav.html).');
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'NH48-Nav-Header-Audit/1.0'
    }
  });
  const text = await response.text();
  return { response, text };
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
      runContractChecks(text, url, failures);
    } catch (error) {
      failures.push(`${url}: ${error.message}`);
    }
  }

  if (failures.length) {
    console.error(`Nav header contract audit failed with ${failures.length} issue(s):`);
    failures.forEach((failure) => console.error(` - ${failure}`));
    process.exit(1);
  }

  console.log(`Nav header contract audit passed for ${REMOTE_ROUTES.length} live route(s): ${baseUrl}`);
}

async function main() {
  if (BASE_URL) {
    await runRemoteAudit(BASE_URL);
    return;
  }
  runLocalAudit();
}

main().catch((error) => {
  console.error(`Nav header contract audit failed: ${error.message}`);
  process.exit(1);
});

