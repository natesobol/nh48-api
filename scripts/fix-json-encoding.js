#!/usr/bin/env node
/**
 * Fix JSON encoding issues in data files
 * 
 * Removes:
 * - AI citation artifacts: :contentReference[oaicite:N]{index=N}
 * - Curly quotes to straight quotes in JSON string values
 * - Double spaces to single spaces
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');

// Files to process - get all JSON files in data directory
let filesToFix = [];
try {
  filesToFix = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.json'))
    .sort();
} catch (e) {
  console.error('Error reading data directory:', e.message);
  process.exit(1);
}

console.log(`Found ${filesToFix.length} JSON files to check...\\n`);

// Also check i18n directory
const i18nDir = path.join(__dirname, '..', 'i18n');
let i18nFiles = [];
try {
  i18nFiles = fs.readdirSync(i18nDir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ dir: i18nDir, file: f }));
  console.log(`Found ${i18nFiles.length} i18n JSON files to check...\\n`);
} catch (e) {
  console.log('No i18n directory found, skipping...');
}

// Patterns to fix
const fixes = [
  // Remove AI citation artifacts
  { pattern: /:contentReference\[oaicite:\d+\]\{index=\d+\}/g, replacement: '' },
  // Curly quotes to straight quotes
  { pattern: /[""]/g, replacement: '"' },
  // Curly apostrophes to straight
  { pattern: /['']/g, replacement: "'" },
  // Double spaces to single (but preserve intentional formatting)
  { pattern: /  +/g, replacement: ' ' },
  // Clean up trailing spaces before closing quotes
  { pattern: / "/g, replacement: '"' },
];

let totalFixed = 0;

for (const filename of filesToFix) {
  const filePath = path.join(dataDir, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping ${filename} (not found)`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fixCount = 0;
  
  for (const { pattern, replacement } of fixes) {
    const matches = content.match(pattern);
    if (matches) {
      fixCount += matches.length;
      content = content.replace(pattern, replacement);
    }
  }
  
  if (fixCount > 0) {
    // Validate JSON before writing
    try {
      JSON.parse(content);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed ${filename}: ${fixCount} issues`);
      totalFixed += fixCount;
    } catch (err) {
      console.error(`❌ JSON validation failed for ${filename}: ${err.message}`);
    }
  } else {
    console.log(`✓  ${filename}: No issues found`);
  }
}

// Process i18n files (don't fix &amp; since it's valid HTML in these files)
const i18nFixes = [
  // Remove AI citation artifacts
  { pattern: /:contentReference\[oaicite:\d+\]\{index=\d+\}/g, replacement: '' },
  // Double spaces to single
  { pattern: /  +/g, replacement: ' ' },
];

for (const { dir, file } of i18nFiles) {
  const filePath = path.join(dir, file);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fixCount = 0;
  
  for (const { pattern, replacement } of i18nFixes) {
    const matches = content.match(pattern);
    if (matches) {
      fixCount += matches.length;
      content = content.replace(pattern, replacement);
    }
  }
  
  if (fixCount > 0) {
    try {
      JSON.parse(content);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed i18n/${file}: ${fixCount} issues`);
      totalFixed += fixCount;
    } catch (err) {
      console.error(`❌ JSON validation failed for i18n/${file}: ${err.message}`);
    }
  } else {
    console.log(`✓  i18n/${file}: No issues found`);
  }
}

console.log(`\n📊 Total fixes: ${totalFixed}`);
