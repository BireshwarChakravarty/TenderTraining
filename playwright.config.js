import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  webServer: { command: "node scripts/serve.mjs 4173", url: "http://localhost:4173", reuseExistingServer: !process.env.CI },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
    // Safari's engine at a MacBook Air screen size. Runs in CI; locally with WEBKIT=1 once WebKit is installed.
    ...(process.env.CI || process.env.WEBKIT ? [{ name: "safari", use: { ...devices["Desktop Safari"], viewport: { width: 1470, height: 956 } } }] : []),
  ],
});
