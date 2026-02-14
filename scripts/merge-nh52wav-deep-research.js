const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NH52WAV_PATH = path.join(ROOT, 'data', 'NH52WAV.json');
const REPORT_ONE_PATH = path.join(ROOT, 'data', 'deep-research-report (1).md');
const REPORT_TWO_PATH = path.join(ROOT, 'data', 'deep-research-report (2).md');

const REPORT_TWO_RESERVED_KEYS = new Set([
  '_executive_summary',
  '_assumptions',
  '_sources_used',
  '_source_comparison_tables',
]);

const NO_VALUE = null;

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').trim();
}

function parseJsonFromMarkdown(filePath) {
  const raw = readText(filePath);
  try {
    return JSON.parse(raw);
  } catch (_) {
    // continue
  }

  const fencedBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedBlock) {
    try {
      return JSON.parse(fencedBlock[1]);
    } catch (_) {
      // continue
    }
  }

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
  }

  throw new Error(`Could not parse JSON payload from ${filePath}`);
}

function uniqueStrings(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function sanitizeScalar(value) {
  if (value === undefined) return NO_VALUE;
  if (value === null) return NO_VALUE;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || NO_VALUE;
  }
  return value;
}

function sanitizeDeep(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDeep(item));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = sanitizeDeep(child);
    }
    return out;
  }
  return sanitizeScalar(value);
}

function dedupeSources(sources) {
  const out = [];
  const seen = new Set();
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    const normalized = {
      url: sanitizeScalar(source.url),
      site: sanitizeScalar(source.site),
      checkedDate: sanitizeScalar(source.checkedDate),
      note: sanitizeScalar(source.note),
    };
    const key = `${normalized.url || ''}|${normalized.site || ''}|${normalized.checkedDate || ''}|${normalized.note || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function escapeUnicode(jsonString) {
  return jsonString.replace(/[\u007F-\uFFFF]/g, (char) => {
    return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
  });
}

function main() {
  const nh52wav = JSON.parse(readText(NH52WAV_PATH));
  const reportOne = parseJsonFromMarkdown(REPORT_ONE_PATH);
  const reportTwo = parseJsonFromMarkdown(REPORT_TWO_PATH);

  const reportOneBySlug = new Map();
  for (const peak of reportOne.peaks || []) {
    if (!peak || !peak.slug) continue;
    reportOneBySlug.set(peak.slug, peak);
  }

  const reportTwoBySlug = new Map();
  for (const [key, value] of Object.entries(reportTwo)) {
    if (REPORT_TWO_RESERVED_KEYS.has(key)) continue;
    reportTwoBySlug.set(key, value || {});
  }

  const schemaFieldSet = uniqueStrings(
    [
      ...Array.from(reportOneBySlug.values()).flatMap((peak) => peak.fieldsToCheck || []),
      ...Array.from(reportTwoBySlug.values()).flatMap((peak) => Object.keys(peak || {})),
    ]
  );

  let reportOneCount = 0;
  let reportTwoCount = 0;

  for (const [slug, peakData] of Object.entries(nh52wav)) {
    const reportOnePeak = reportOneBySlug.get(slug);
    const reportTwoPeak = reportTwoBySlug.get(slug);

    if (reportOnePeak) reportOneCount += 1;
    if (reportTwoPeak) reportTwoCount += 1;

    const resolvedFields = uniqueStrings(Object.keys(reportTwoPeak || {}));

    if (reportTwoPeak) {
      for (const [fieldName, fieldValue] of Object.entries(reportTwoPeak)) {
        peakData[fieldName] = sanitizeDeep(fieldValue);
      }
    }

    const todoFields = uniqueStrings(reportOnePeak?.fieldsToCheck || []);
    const pendingFields = todoFields.filter((field) => !resolvedFields.includes(field));

    const fieldNotes = {};
    const reportOneNotes = reportOnePeak?.fieldNotes || {};
    for (const fieldName of pendingFields) {
      if (!Object.prototype.hasOwnProperty.call(reportOneNotes, fieldName)) continue;
      fieldNotes[fieldName] = sanitizeScalar(reportOneNotes[fieldName]);
    }

    peakData.deepResearch = {
      mergedFrom: ['deep-research-report (1).md', 'deep-research-report (2).md'],
      reportCoverage: {
        reportOne: Boolean(reportOnePeak),
        reportTwo: Boolean(reportTwoPeak),
      },
      schemaFieldSet,
      resolvedFields,
      pendingFields,
      fieldNotes,
      recommendedNextAction: sanitizeScalar(reportOnePeak?.recommendedNextAction),
      confidence: sanitizeScalar(reportOnePeak?.confidence),
      estimatedEffortMinutes: sanitizeScalar(reportOnePeak?.estimatedEffortMinutes),
      sourcesChecked: dedupeSources(reportOnePeak?._sourcesChecked || []),
      reportTwoSourceReference: reportTwoPeak ? 'data/deep-research-report (2).md#_sources_used' : NO_VALUE,
      reportTwoAssumptionsReference: reportTwoPeak ? 'data/deep-research-report (2).md#_assumptions' : NO_VALUE,
    };
  }

  const serialized = escapeUnicode(JSON.stringify(nh52wav, null, 2));
  fs.writeFileSync(NH52WAV_PATH, `${serialized}\n`, 'utf8');

  // eslint-disable-next-line no-console
  console.log(
    `Merged deep research into NH52WAV.json: ${Object.keys(nh52wav).length} peaks, ` +
      `${reportOneCount} with report(1), ${reportTwoCount} with report(2).`
  );
}

main();
