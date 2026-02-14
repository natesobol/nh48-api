const { test, expect } = require('@playwright/test');

const ROUTES = [
  '/peak/mount-washington',
  '/peak/mount-isolation',
  '/fr/peak/mount-washington'
];

const VIEWPORTS = [
  { name: 'mobile', width: 320, height: 740 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];

function slugFromRoute(route) {
  return route
    .replace(/^\/+/, '')
    .replace(/\/+/g, '-')
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase();
}

for (const route of ROUTES) {
  for (const viewport of VIEWPORTS) {
    test(`peak visual snapshot ${route} @ ${viewport.name}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(route, { waitUntil: 'networkidle' });

      await expect(page.locator('.site-nav')).toBeVisible({ timeout: 60000 });
      await expect(page.locator('#printBtn')).toBeVisible({ timeout: 60000 });
      await expect(page.locator('#shareBtn')).toBeVisible({ timeout: 60000 });
      await expect(page.locator('#unitsSelect')).toBeVisible({ timeout: 60000 });
      await expect(page.locator('#getDirectionsBtn')).toBeVisible({ timeout: 60000 });

      await expect(page.locator('#routesGrid')).toBeVisible({ timeout: 60000 });
      await expect(page.locator('#trailsHubSection')).toBeVisible({ timeout: 60000 });
      await expect(page.locator('#relatedTrailsGrid')).toBeVisible({ timeout: 60000 });
      await expect(page.locator('#parkingAccessGrid')).toBeVisible({ timeout: 60000 });
      await expect(page.locator('#riskPrepGrid')).toBeVisible({ timeout: 60000 });

      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation: none !important;
            transition: none !important;
            scroll-behavior: auto !important;
          }
        `
      });

      const snapshotName = `${slugFromRoute(route)}-${viewport.name}.png`;
      await page.screenshot({
        path: testInfo.outputPath(snapshotName),
        fullPage: true
      });
    });
  }
}
