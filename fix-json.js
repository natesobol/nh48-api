#!/usr/bin/env node
/**
 * Fix the long-trails-full.json file by removing leftover merge conflict content.
 * Keeps only the first 44310 lines.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'data', 'long-trails-full.json');
const VALID_LINES = 44310;

console.log('Reading file...');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');
console.log(`Original file has ${lines.length} lines`);

// Keep only the first 44310 lines
const truncatedLines = lines.slice(0, VALID_LINES);
const newContent = truncatedLines.join('\n');

console.log('Writing truncated file...');
fs.writeFileSync(filePath, newContent, 'utf-8');

// Verify
const verifyContent = fs.readFileSync(filePath, 'utf-8');
const verifyLines = verifyContent.split('\n');
console.log(`New file has ${verifyLines.length} lines`);
console.log('Last 3 lines:');
verifyLines.slice(-3).forEach(line => console.log(JSON.stringify(line)));

// Validate JSON
try {
  JSON.parse(verifyContent);
  console.log('✓ Valid JSON!');
} catch (e) {
  console.error('✗ Invalid JSON:', e.message);
}
