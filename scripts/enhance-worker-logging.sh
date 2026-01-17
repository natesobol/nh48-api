#!/bin/bash
# Apply enhanced logging to worker.js

# This script adds enhanced error logging to the worker.js file
# for better debugging of peak route issues

WORKER_FILE="/workspaces/nh48-api/worker.js"

# Create backup
cp "$WORKER_FILE" "${WORKER_FILE}.backup"

# Add logging after line 1256 (where peak lookup happens)
# The sed command will add console.error statements after finding the peak

cat << 'EOF' > /tmp/worker_patch.txt
After finding the peak (around line 1256), add logging:

If peak not found:
  console.error(`[Worker] Peak not found for slug: ${slug}`);
  const availableSlugs = Object.keys(peaks || {});
  console.error(`[Worker] Total peaks in dataset: ${availableSlugs.length}`);
  console.error(`[Worker] First 10 slugs: ${availableSlugs.slice(0, 10).join(', ')}`);

If peak found:
  console.log(`[Worker] ✓ Found peak: ${peak.peakName || peak.name || slug}`);

Also add at the start of peak route handling (around line 1248):
  console.log(`[Worker] Processing peak route: ${pathname}, slug: ${slug}, lang: ${lang}`);
EOF

echo "Worker logging enhancement instructions saved to /tmp/worker_patch.txt"
echo "Manual edit required for worker.js - see instructions above"
