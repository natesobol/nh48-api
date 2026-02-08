const fs = require('fs');

const filePath = process.argv[2] || 'data/nh48.json';

try {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  console.log('✓ JSON is valid');
  console.log(`✓ File has ${Object.keys(data).length} top-level keys`);
} catch (e) {
  console.error('✗ JSON Error:', e.message);
  
  if (e.message.includes('position')) {
    const match = e.message.match(/position (\d+)/);
    if (match) {
      const pos = parseInt(match[1]);
      const content = fs.readFileSync(filePath, 'utf8');
      const start = Math.max(0, pos - 100);
      const end = Math.min(content.length, pos + 100);
      
      console.log('\nContext around error position:');
      console.log('---');
      console.log(content.substring(start, end));
      console.log('---');
      console.log(' '.repeat(Math.min(100, pos - start)) + '^');
    }
  }
  
  process.exit(1);
}
