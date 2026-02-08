const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'nh-4000-footers-info.html');
let content = fs.readFileSync(filePath, 'utf8');

// Find the problematic line and fix it
// The issue is: <h2>Seasonal Considerations</h2> "right"         <p>
// Should be:    <h2>Seasonal Considerations</h2>\n        <p>

// Look for the pattern with any kind of quote around "right"
content = content.replace(
  /<h2>Seasonal Considerations<\/h2>.*?<p>\s*Strategies shift/s,
  '<h2>Seasonal Considerations</h2>\n        <p>\n          Strategies shift'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Unicode issue in nh-4000-footers-info.html');
