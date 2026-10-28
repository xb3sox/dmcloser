import { defineConfig, devices } from "@playwright/test";

// The browser suite runs the API against a PGlite directory (DATA_DIR below).
// Nothing removed it, so every run left ~40 MB behind. The directory is named
// after the runner pid, so only the server this run started can have written
// it, and Playwright stops that server before the teardown runs.
const dataDir = `.data/browser-tests-${process.pid}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 1440, height: 1000 },
    colorScheme: "light",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5173",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npx tsx server/index.ts",
      url: "http://127.0.0.1:3001/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        NODE_ENV: "development",
        PORT: "3001",
        APP_URL: "http://127.0.0.1:5173",
        API_PUBLIC_URL: "http://127.0.0.1:3001",
        DATA_DIR: dataDir,
        ENCRYPTION_KEY: "cd".repeat(32),
        OPENAI_API_KEY: "",
        META_APP_SECRET: "",
        INSTAGRAM_APP_ID: "",
        INSTAGRAM_APP_SECRET: "",
        META_WEBHOOK_VERIFY_TOKEN: "",
        STRIPE_SECRET_KEY: "",
        SMTP_HOST: "",
        RATE_LIMIT_MAX: "10000",
        AUTH_RATE_LIMIT_MAX: "10000",
        RECOVERY_RATE_LIMIT_MAX: "10000",
      },
    },
  ],
  globalTeardown: "tests/global-teardown.ts",
});
