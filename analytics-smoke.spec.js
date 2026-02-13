const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { installGACapture, waitForEvent } = require('./ga-capture');

async function preventNavigationForSelectors(page, selectors) {
  await page.evaluate((selectorList) => {
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const shouldPrevent = selectorList.some((selector) => target.closest(selector));
        if (shouldPrevent) {
          event.preventDefault();
        }
      },
      true
    );
  }, selectors);
}

function normalizePath(path) {
  return String(path || '').replace(/\/+$/, '') || '/';
}

function readLocalFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, relativePath), 'utf8');
}

function injectAnalyticsCoreScript(html) {
  const scriptTag = '<script type="module" src="/js/analytics-core.js" data-nh48-analytics-core="1"></script>';
  if (html.includes('data-nh48-analytics-core="1"')) return html;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${scriptTag}\n</head>`);
  }
  return `${scriptTag}\n${html}`;
}

function buildLocalOverrides() {
  const rangeCatalogHtml = injectAnalyticsCoreScript(readLocalFile('catalog/ranges/index.html'));
  return {
    '/js/analytics-core.js': {
      contentType: 'application/javascript; charset=utf-8',
      body: readLocalFile('js/analytics-core.js')
    },
    '/js/photos.js': {
      contentType: 'application/javascript; charset=utf-8',
      body: readLocalFile('js/photos.js')
    },
    '/js/peakid-game.js': {
      contentType: 'application/javascript; charset=utf-8',
      body: readLocalFile('js/peakid-game.js')
    },
    '/js/nh48-planner.js': {
      contentType: 'application/javascript; charset=utf-8',
      body: readLocalFile('js/nh48-planner.js')
    },
    '/catalog/ranges': {
      contentType: 'text/html; charset=utf-8',
      body: rangeCatalogHtml
    },
    '/catalog/ranges/': {
      contentType: 'text/html; charset=utf-8',
      body: rangeCatalogHtml
    },
    '/catalog/ranges/index.html': {
      contentType: 'text/html; charset=utf-8',
      body: rangeCatalogHtml
    }
  };
}

test.describe.configure({ mode: 'serial' });

test('dataset emits page + CTA + download events', async ({ page }) => {
  const capture = await installGACapture(page, { localOverrides: buildLocalOverrides() });

  await page.goto('/dataset/');
  await waitForEvent(capture, 'nh48_page_loaded', {
    predicate: (event) => event.params.page_route === 'dataset-home'
  });

  await preventNavigationForSelectors(page, ['.cta-button']);
  await page.locator('.cta-button').first().click();
  await waitForEvent(capture, 'dataset_cta_click', {
    predicate: (event) => event.params.dataset_slug === 'dataset-home'
  });

  await page.goto('/dataset/wmnf-trails/');

  await preventNavigationForSelectors(page, ['.download-card']);
  await page.locator('.download-card').first().click();
  await waitForEvent(capture, 'dataset_file_download_click', {
    predicate: (event) => event.params.dataset_slug === 'wmnf-trails'
  });

  const datasetRootPageLoads = capture
    .getEvents('nh48_page_loaded')
    .filter((event) => event.params.page_route === 'dataset-home');
  expect(datasetRootPageLoads).toHaveLength(1);
});

test('range catalog emits search and sort events', async ({ page }) => {
  const capture = await installGACapture(page, { localOverrides: buildLocalOverrides() });

  await page.goto('/catalog/ranges');
  await waitForEvent(capture, 'nh48_page_loaded');
  await page.locator('#grid .card-link').first().waitFor({ state: 'visible' });
  await page.locator('#searchInput').fill('presidential');

  await waitForEvent(capture, 'range_catalog_search', {
    predicate: (event) => Number(event.params.search_length) >= 5
  });

  await page.locator('#sortSelect').selectOption('peaks-desc');
  await waitForEvent(capture, 'range_catalog_sort_change', {
    predicate: (event) => event.params.sort === 'peaks-desc'
  });
});

test('photos emits lightbox and pagination events', async ({ page }) => {
  const capture = await installGACapture(page, { localOverrides: buildLocalOverrides() });

  await page.goto('/photos/');
  await page.locator('.photo-figure').first().waitFor({ state: 'visible' });
  await page.locator('.photo-figure').first().click();
  await waitForEvent(capture, 'photos_lightbox_open');
  await page.keyboard.press('Escape');
  await page.locator('#photoLightbox[hidden]').waitFor({ state: 'attached' });

  await page.evaluate(() => {
    const nextButton = document.getElementById('paginationNext');
    if (nextButton) nextButton.disabled = false;
  });
  await page.locator('#paginationNext').click();
  await waitForEvent(capture, 'photos_pagination', {
    predicate: (event) => event.params.direction === 'next'
  });
});

test('peakid game emits start and round submit events', async ({ page }) => {
  const capture = await installGACapture(page, { localOverrides: buildLocalOverrides() });

  await page.goto('/peakid-game.html');
  await waitForEvent(capture, 'peakid_game_start');

  await page.evaluate(() => {
    const submitButton = document.getElementById('peakid-submit');
    if (submitButton) submitButton.disabled = false;
  });
  await page.locator('#peakid-submit').click();
  await waitForEvent(capture, 'peakid_round_submit');
});

test('planner emits search, filter, export, and share events', async ({ page }) => {
  const capture = await installGACapture(page, { localOverrides: buildLocalOverrides() });

  await page.goto('/nh48-planner.html');
  await page.locator('.command-search').waitFor({ state: 'visible' });

  await page.locator('.command-search').fill('washington');
  await waitForEvent(capture, 'planner_search', {
    predicate: (event) => Number(event.params.search_length) >= 3
  });

  await page.getByRole('button', { name: /Filters \(/i }).click();
  const firstFilterChip = page.locator('.planner-filters .chip-button').first();
  await firstFilterChip.waitFor({ state: 'visible' });
  await firstFilterChip.click();
  await waitForEvent(capture, 'planner_filter_change');

  await page.getByRole('button', { name: /^Export$/i }).click();
  await waitForEvent(capture, 'planner_export');

  const firstRow = page.locator('.itinerary-row').first();
  await firstRow.waitFor({ state: 'visible' });
  await firstRow.dispatchEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2
  });
  await page.locator('.context-menu .context-menu-item:has-text("Share Page")').click();

  const popupPromise = page.waitForEvent('popup').catch(() => null);
  await page.locator('.context-submenu .context-menu-item:has-text("Facebook")').click();
  const popup = await popupPromise;
  if (popup) await popup.close();

  await waitForEvent(capture, 'planner_share_click', {
    predicate: (event) => event.params.network === 'facebook'
  });
});
