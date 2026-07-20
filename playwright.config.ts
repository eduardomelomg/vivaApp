import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block',
    launchOptions: { executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
