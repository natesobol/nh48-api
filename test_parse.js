// Quick test to validate JSON parsing
const fs = require('fs');

function cleanJSON(raw){
  // Remove contentReference annotations
  let cleaned = raw.replace(/:contentReference\[.*?\]\{index=\d+\}/g, '');
  // Remove comments that look like: /* ... omitted */
  cleaned = cleaned.replace(/\/\*\s*Lines?\s+\d+[\d\-,\s]*omitted\s*\*\//g, '');
  return cleaned;
}

const raw = fs.readFileSync('/workspaces/nh48-api/data/nh48.json', 'utf8');
const cleaned = cleanJSON(raw);

try {
  const obj = JSON.parse(cleaned);
  const arr = Object.keys(obj).map(slug => {
    const p = obj[slug] || {};
    p.slug = slug;
    p.peakName = p.peakName || p['Peak Name'] || slug;
    return p;
  });
  
  console.log(`✓ Total peaks parsed: ${arr.length}`);
  
  const with_photos = arr.filter(p => p.photos && p.photos.length > 0);
  console.log(`✓ Peaks with photos: ${with_photos.length}`);
  
  console.log('\nPeaks with photos:');
  with_photos.forEach(p => {
    const first = p.photos[0];
    const url = typeof first === 'string' ? first : (first && first.url ? first.url : 'MISSING');
    console.log(`  ${p.peakName}: ${p.photos.length} photos, first URL: ${url.substring(0, 50)}...`);
  });
  
} catch (err) {
  console.error('JSON Parse Error:', err.message);
  console.error('Error position:', err.toString());
}
