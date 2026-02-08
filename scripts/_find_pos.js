const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const data = fs.readFileSync(path.join(rootDir, 'data', 'nh48.json'), 'utf8');
// Show context around position 593
const pos = 593;
console.log('Character at position', pos, ':', JSON.stringify(data[pos]));
console.log('Context (580-610):', JSON.stringify(data.substring(580, 620)));

// Count lines up to that position
let line = 1, col = 1;
for (let i = 0; i < pos; i++) {
  if (data[i] === '\n') { line++; col = 1; } else { col++; }
}
console.log('Line:', line, 'Column:', col);

// Try parsing to confirm the error
try { JSON.parse(data); console.log('JSON is valid!'); }
catch(e) { console.log('Parse error:', e.message); }
