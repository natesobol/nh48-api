const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: 'tests/peak-page-visual.spec.js',
  timeout: 180000,
  expect: {
    timeout: 60000
  },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-peak-visual', open: 'never' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:8787',
    headless: true
  },
  webServer: {
    command: 'npx wrangler dev --local --port 8787',
    url: 'http://127.0.0.1:8787',
    timeout: 180000,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    }
  ]
});

