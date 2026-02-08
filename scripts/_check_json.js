const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const data = fs.readFileSync(path.join(rootDir, 'data', 'nh48.json'), 'utf8');
console.log('File length:', data.length);
console.log('First 3 bytes (BOM check):', data.charCodeAt(0), data.charCodeAt(1), data.charCodeAt(2));
console.log('Chars 585-615:', JSON.stringify(data.substring(585, 615)));
console.log('Char at 593:', JSON.stringify(data[593]), 'code:', data.charCodeAt(593));

// Find the position where JSON.parse fails
try {
  JSON.parse(data);
  console.log('Parse OK!');
} catch(e) {
  console.log('Parse Error:', e.message);
  // Try to find what JSON.parse considers the end of valid JSON
  // by parsing progressively
  let lastGoodEnd = 0;
  for (let i = 1; i <= Math.min(data.length, 700); i++) {
    try {
      JSON.parse(data.substring(0, i));
      lastGoodEnd = i;
    } catch(e2) {}
  }
  console.log('Last position where substring was valid JSON:', lastGoodEnd);
  if (lastGoodEnd > 0) {
    console.log('Valid JSON ends at:', JSON.stringify(data.substring(Math.max(0,lastGoodEnd-20), lastGoodEnd+20)));
    console.log('The valid JSON parsed was:', JSON.stringify(JSON.parse(data.substring(0, lastGoodEnd))).substring(0, 200));
  }
}
