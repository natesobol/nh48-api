#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NH48_PATH = path.join(ROOT, 'data', 'nh48.json');
const OVERLAY_PATH = path.join(ROOT, 'data', 'nh48_enriched_overlay.json');
const OVERRIDES_PATH = path.join(ROOT, 'data', 'peak-difficulty-overrides.json');
const OUTPUT_PATH = path.join(ROOT, 'data', 'peak-difficulty.json');

const TEXT_BASELINE = {
  easy: { technical: 2, physical: 2 },
  moderate: { technical: 4, physical: 4 },
  difficult: { technical: 6, physical: 6 },
  'very difficult': { technical: 7, physical: 8 },
  'extremely difficult': { technical: 9, physical: 9 }
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function clean(value) {
  return String(value || '').trim();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function inferFromText(text) {
  const key = clean(text).toLowerCase();
  if (TEXT_BASELINE[key]) return { ...TEXT_BASELINE[key], source: key };
  if (!key) return { technical: 5, physical: 5, source: 'default' };
  if (key.includes('extreme')) return { technical: 9, physical: 9, source: key };
  if (key.includes('very')) return { technical: 7, physical: 8, source: key };
  if (key.includes('difficult')) return { technical: 6, physical: 6, source: key };
  if (key.includes('moderate')) return { technical: 4, physical: 4, source: key };
  if (key.includes('easy')) return { technical: 2, physical: 2, source: key };
  return { technical: 5, physical: 5, source: key };
}

function buildOverlayIndex(overlayPayload) {
  if (Array.isArray(overlayPayload)) {
    return Object.fromEntries(
      overlayPayload
        .map((entry) => [clean(entry?.slug), entry])
        .filter(([slug]) => Boolean(slug))
    );
  }
  return overlayPayload || {};
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function applyRiskAdjustments(base, overlayEntry) {
  const out = { ...base };
  if (!overlayEntry || typeof overlayEntry !== 'object') {
    return out;
  }

  const riskFactors = Array.isArray(overlayEntry.risk_factors) ? overlayEntry.risk_factors : [];
  const distanceMi = toNumber(overlayEntry.primary_distance_mi);
  const gainFt = toNumber(overlayEntry.primary_gain_ft);

  if (riskFactors.includes('AboveTreelineExposure')) out.technical += 1;
  if (riskFactors.includes('NavigationComplexity')) out.technical += 1;
  if (riskFactors.includes('SevereWeather')) out.technical += 1;
  if (riskFactors.includes('LongBailout')) out.physical += 1;
  if (riskFactors.includes('LimitedWater')) out.physical += 1;

  if (distanceMi !== null) {
    if (distanceMi >= 16) out.physical += 2;
    else if (distanceMi >= 11) out.physical += 1;
  }

  if (gainFt !== null) {
    if (gainFt >= 4500) out.physical += 2;
    else if (gainFt >= 3200) out.physical += 1;
  }

  out.technical = clamp(Math.round(out.technical), 1, 10);
  out.physical = clamp(Math.round(out.physical), 1, 10);
  return out;
}

function main() {
  const peaks = readJson(NH48_PATH);
  const overlayRaw = readJson(OVERLAY_PATH);
  const overlay = buildOverlayIndex(overlayRaw);
  const overrides = fs.existsSync(OVERRIDES_PATH) ? readJson(OVERRIDES_PATH) : {};
  const output = {};

  for (const slug of Object.keys(peaks).sort()) {
    const peak = peaks[slug] || {};
    const overlayEntry = overlay[slug] || null;
    const difficultyText = clean(
      overlayEntry?.difficulty_text_primary || peak['Difficulty'] || peak.difficulty
    );
    const baseline = inferFromText(difficultyText);
    const adjusted = applyRiskAdjustments(baseline, overlayEntry);

    const override = overrides[slug] || {};
    const technicalOverride = toNumber(override.technicalDifficulty);
    const physicalOverride = toNumber(override.physicalEffort);

    output[slug] = {
      technicalDifficulty: clamp(
        technicalOverride !== null ? technicalOverride : adjusted.technical,
        1,
        10
      ),
      physicalEffort: clamp(
        physicalOverride !== null ? physicalOverride : adjusted.physical,
        1,
        10
      ),
      source: {
        baseline: baseline.source,
        overlay: Boolean(overlayEntry),
        overrideApplied: technicalOverride !== null || physicalOverride !== null
      }
    };
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${Object.keys(output).length} entries -> ${path.relative(ROOT, OUTPUT_PATH)}`);
}

main();
