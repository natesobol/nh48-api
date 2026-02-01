#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(repoRoot, 'data', 'nh48.json');

const {
  PEAK_BASE_URL = 'https://nh48.info/peak',
  BUCKET_PUBLIC_BASE_URL,
  BUCKET_UPLOAD_URL,
  BUCKET_TOKEN,
  SOCIAL_CARD_KEY_PREFIX = ''
} = process.env;

if (!BUCKET_PUBLIC_BASE_URL || !BUCKET_UPLOAD_URL || !BUCKET_TOKEN) {
  console.error('Missing required env vars: BUCKET_PUBLIC_BASE_URL, BUCKET_UPLOAD_URL, BUCKET_TOKEN.');
  process.exit(1);
}

let playwright;
try {
  playwright = await import('playwright');
} catch (error) {
  console.error('Playwright is required to run this script. Install it with `npm install playwright` before retrying.');
  process.exit(1);
}

const { chromium } = playwright;
const dataRaw = await fs.readFile(dataPath, 'utf-8');
const peaks = JSON.parse(dataRaw);
const slugs = Object.keys(peaks);

const bucketBase = BUCKET_PUBLIC_BASE_URL.replace(/\/$/, '');
const uploadUrl = BUCKET_UPLOAD_URL;
const keyPrefix = SOCIAL_CARD_KEY_PREFIX ? `${SOCIAL_CARD_KEY_PREFIX.replace(/\/$/, '')}/` : '';

const buildKey = (slug, orientation) => `${keyPrefix}${slug}/${slug}-social-${orientation}.jpg`;
const buildPublicUrl = (slug, orientation) => `${bucketBase}/${buildKey(slug, orientation)}`;

async function remoteExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch (error) {
    return false;
  }
}

async function uploadBuffer(buffer, slug, orientation) {
  const fileName = `${slug}-social-${orientation}.jpg`;
  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: 'image/jpeg' }), fileName);
  formData.append('slug', slug);
  formData.append('orientation', orientation);
  formData.append('key', buildKey(slug, orientation));

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${BUCKET_TOKEN}`
    },
    body: formData
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
}

async function captureCard(page, orientation) {
  await page.evaluate(orientationValue => {
    window.NH48_PEAK_SOCIAL?.openModal?.();
    window.NH48_PEAK_SOCIAL?.setOrientation?.(orientationValue);
  }, orientation);

  await page.evaluate(() => window.NH48_PEAK_SOCIAL?.waitForReady?.());
  const card = await page.$('#socialCardContainer');
  if (!card) {
    throw new Error('Social card container not found.');
  }
  return card.screenshot({ type: 'jpeg', quality: 92 });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

for (const slug of slugs) {
  const landscapeUrl = buildPublicUrl(slug, 'horizontal');
  const portraitUrl = buildPublicUrl(slug, 'vertical');
  const hasLandscape = await remoteExists(landscapeUrl);
  const hasPortrait = await remoteExists(portraitUrl);

  if (hasLandscape && hasPortrait) {
    console.log(`[skip] ${slug} already has both cards.`);
    continue;
  }

  const peakUrl = `${PEAK_BASE_URL.replace(/\/$/, '')}/${slug}/`;
  console.log(`[open] ${peakUrl}`);
  await page.goto(peakUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.NH48_PEAK_SOCIAL?.openModal);

  if (!hasLandscape) {
    console.log(`[capture] ${slug} landscape`);
    const buffer = await captureCard(page, 'landscape');
    await uploadBuffer(buffer, slug, 'horizontal');
  }

  if (!hasPortrait) {
    console.log(`[capture] ${slug} portrait`);
    const buffer = await captureCard(page, 'portrait');
    await uploadBuffer(buffer, slug, 'vertical');
  }
}

await browser.close();
console.log('Done.');
