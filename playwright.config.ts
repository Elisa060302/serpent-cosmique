import { defineConfig } from '@playwright/test';

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const IN_CI = Boolean(process.env['CI']);

const ANDROID_LANDSCAPE = {
  viewport: { width: 780, height: 360 },
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
};
const IPHONE_SE_LANDSCAPE = {
  viewport: { width: 667, height: 375 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
};

export default defineConfig({
  testDir: 'tests/acceptance',
  fullyParallel: true,
  forbidOnly: IN_CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    // La trace d'un échec est conservée (et envoyée comme artefact par la CI) pour pouvoir l'analyser.
    trace: 'retain-on-failure' as const,
  },
  projects: [
    { name: 'Android paysage', use: { browserName: 'chromium', ...ANDROID_LANDSCAPE } },
    { name: 'iPhone SE paysage', use: { browserName: 'chromium', ...IPHONE_SE_LANDSCAPE } },
    ...(IN_CI
      ? [
          {
            name: 'Android paysage (WebKit)',
            use: { browserName: 'webkit' as const, ...ANDROID_LANDSCAPE },
          },
          {
            name: 'iPhone SE paysage (WebKit)',
            use: { browserName: 'webkit' as const, ...IPHONE_SE_LANDSCAPE },
          },
        ]
      : []),
  ],
  webServer: {
    command: 'node scripts/serve.mjs',
    url: BASE_URL,
    env: { PORT: String(PORT) },
    reuseExistingServer: !IN_CI,
    timeout: 20_000,
  },
});
