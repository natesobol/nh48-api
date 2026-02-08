const fs = require('fs');

const content = fs.readFileSync('data/nh48.json', 'utf8');

// Try to parse and catch error
try {
  JSON.parse(content);
  console.log('No error found - JSON is valid');
} catch (e) {
  console.log('Error:', e.message);
  
  // Extract position from error
  const match = e.message.match(/position (\d+)/);
  if (match) {
    const pos = parseInt(match[1]);
    
    // Show context
    const start = Math.max(0, pos - 150);
    const end = Math.min(content.length, pos + 150);
    const snippet = content.substring(start, end);
    
    console.log('\n=== Context (150 chars before/after position ' + pos + ') ===');
    console.log(snippet);
    console.log('\n' + ' '.repeat(Math.min(150, pos - start)) + '^ ERROR HERE');
    
    // Count line number
    const lines = content.substring(0, pos).split('\n');
    console.log('\nApproximate line number:', lines.length);
    console.log('Column:', lines[lines.length - 1].length + 1);
    
    // Show the lines around error
    const allLines = content.split('\n');
    const errorLine = lines.length - 1;
    console.log('\n=== Lines around error ===');
    for (let i = Math.max(0, errorLine - 3); i < Math.min(allLines.length, errorLine + 4); i++) {
      const marker = i === errorLine ? '>>> ' : '    ';
      console.log(marker + (i + 1) + ': ' + allLines[i]);
    }
  }
}
