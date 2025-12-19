#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'long-trails');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'long-trails-manifest.json');

function buildManifest(){
  if(!fs.existsSync(DATA_DIR)){
    return { generatedAt: new Date().toISOString(), files: [] };
  }

  const files = fs.readdirSync(DATA_DIR)
    .filter(file => file.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b));

  return { generatedAt: new Date().toISOString(), files };
}

const manifest = buildManifest();
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2));

console.log(`Wrote ${OUTPUT_PATH}`);
