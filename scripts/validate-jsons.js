const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '..', 'data', 'long-trails');

fs.readdir(directoryPath, (err, files) => {
  if (err) return console.error('Unable to scan directory:', err);

  files.filter(file => file.endsWith('.json')).forEach(file => {
    const fullPath = path.join(directoryPath, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (!content.trim()) {
        console.error(`[EMPTY] ${file}`);
        return;
      }
      JSON.parse(content);
    } catch (e) {
      console.error(`[ERROR] ${file}: ${e.message}`);
    }
  });
});
