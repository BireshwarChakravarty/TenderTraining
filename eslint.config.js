import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "test-results/", "playwright-report/", "_site/"] },
  js.configs.recommended,
  {
    files: ["assets/js/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: { ...globals.browser, TT: "readonly" } },
    rules: { "no-unused-vars": ["error", { args: "none" }] },
  },
  {
    files: ["scripts/**/*.mjs", "playwright.config.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.node } },
  },
  {
    // Test bodies run in Node, but page.evaluate callbacks run in the browser.
    files: ["tests/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.node, ...globals.browser } },
  },
];
