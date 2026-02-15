#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  const full = path.join(ROOT, relativePath);
  if (!fs.existsSync(full)) {
    return { missing: true, text: '', path: relativePath };
  }
  return { missing: false, text: fs.readFileSync(full, 'utf8'), path: relativePath };
}

function assertMatch(target, regex, message, failures) {
  if (!regex.test(target.text)) {
    failures.push(`${target.path}: ${message}`);
  }
}

function main() {
  const failures = [];

  const peak = read('pages/nh48_peak.html');
  const catalog = read('catalog/index.html');
  const hrt = read('pages/hrt_info.html');
  const hrtFr = read('pages/hrt_info.fr.html');
  const howker = read('pages/howker_ridge.html');
  const photos = read('photos/index.html');
  const photosJs = read('js/photos.js');

  [peak, catalog, hrt, hrtFr, howker, photos, photosJs].forEach((file) => {
    if (file.missing) failures.push(`Missing file: ${file.path}`);
  });
  if (failures.length) {
    console.error(`Tooltip integration audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  assertMatch(peak, /\/css\/ui-tooltips\.css/i, 'missing shared tooltip stylesheet include', failures);
  assertMatch(peak, /\/js\/ui-tooltips\.js/i, 'missing shared tooltip script include', failures);
  assertMatch(peak, /NH48Tooltips\s*\.\s*init\s*\(/i, 'missing NH48Tooltips.init call', failures);
  assertMatch(
    peak,
    /monthlyWeatherMonthSelect\s*:\s*['"]common\.tooltips\.monthDropdown['"]/i,
    'missing month dropdown tooltip override mapping',
    failures
  );

  [catalog, hrt, hrtFr, howker, photos].forEach((file) => {
    assertMatch(file, /\/css\/ui-tooltips\.css/i, 'missing shared tooltip stylesheet include', failures);
    assertMatch(file, /\/js\/ui-tooltips\.js/i, 'missing shared tooltip script include', failures);
    assertMatch(file, /NH48Tooltips\s*\.\s*init\s*\(/i, 'missing NH48Tooltips.init call', failures);
  });

  assertMatch(howker, /<script\s+type="module"\s+src="\/js\/i18n\.js"\s*>/i, 'missing /js/i18n.js module include', failures);
  assertMatch(photosJs, /NH48Tooltips\s*\.\s*refresh\s*\(/i, 'missing NH48Tooltips.refresh integration after dynamic renders', failures);

  if (failures.length) {
    console.error(`Tooltip integration audit failed with ${failures.length} issue(s).`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log('Tooltip integration audit passed for peak, catalog, hrt, howker, and photos surfaces.');
}

main();
