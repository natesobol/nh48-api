const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'nh-4000-footers-info.html');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize common mojibake artifacts on the NH48 guide page.
const replacements = [
  ['\u00e2\u20ac\u201c', '\u2013'], // â€“ -> –
  ['\u00e2\u20ac\u201d', '\u2014'], // â€” -> —
  ['\u00e2\u20ac\u2122', '\u2019'], // â€™ -> ’
  ['\u00e2\u20ac\u00a2', '\u2022'], // â€¢ -> •
  ['\u00e2\u2013\u00b2', '\u25b2'], // â–² -> ▲
  ['\u00e2\u2013\u00bc', '\u25bc']  // â–¼ -> ▼
];

for (const [bad, good] of replacements) {
  content = content.split(bad).join(good);
}

// Fix warning icon mojibake in-context to avoid brittle byte matching.
content = content.replace(
  /<span class="icon-warning" aria-hidden="true">[^<]*<\/span>/g,
  '<span class="icon-warning" aria-hidden="true">&#9888;&#65039;</span>'
);

// Fix strategy icon mojibake via nearby stable labels.
content = content.replace(
  /(<span class="strategy-icon">)[^<]*(<\/span>\s*\r?\n\s*<span class="strategy-name">Fast Finish<\/span>)/g,
  '$1&#128640;$2'
);
content = content.replace(
  /(<span class="strategy-icon">)[^<]*(<\/span>\s*\r?\n\s*<span class="strategy-name">Weekend Warrior<\/span>)/g,
  '$1&#128467;&#65039;$2'
);
content = content.replace(
  /(<span class="strategy-icon">)[^<]*(<\/span>\s*\r?\n\s*<span class="strategy-name">Scenic Journey<\/span>)/g,
  '$1&#127748;$2'
);

// Keep this legacy structural cleanup (idempotent).
content = content.replace(
  /<h2>Seasonal Considerations<\/h2>.*?<p>\s*Strategies shift/s,
  '<h2>Seasonal Considerations</h2>\n        <p>\n          Strategies shift'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Normalized encoding artifacts in nh-4000-footers-info.html');
