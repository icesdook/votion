import { defineConfig, devices } from "@playwright/test";

// Pruebas de punta a punta contra la app en modo demo (datos de ejemplo en el navegador).
// CHROMIUM_PATH permite usar un Chromium propio cuando no se puede descargar el de Playwright.
const executablePath = process.env.CHROMIUM_PATH || undefined;
const port = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["json", { outputFile: "replica/test-results.json" }]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "es-CL",
    timezoneId: "America/Santiago",
    launchOptions: executablePath ? { executablePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] } : undefined,
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, grepInvert: /@movil/ },
    { name: "movil", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } }, grep: /@movil/ },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${port}`,
    port,
    reuseExistingServer: true,
    timeout: 240_000,
    env: { NEXT_PUBLIC_DEMO: "1" },
  },
});
