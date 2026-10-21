import { test, expect } from "@playwright/test";

const watchErrors = page => {
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
  return errors;
};

test("every slide opens without errors or sideways scrolling", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  const ids = await page.$$eval(".slide", s => s.map(x => x.id));
  expect(ids.length).toBeGreaterThan(30);
  for (const id of ids) {
    await page.evaluate(i => { location.hash = i; }, id);
    await expect(page.locator(`#${id}`)).toBeVisible();
    const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    expect(sw, `slide ${id} scrolls sideways`).toBeLessThanOrEqual(cw);
  }
  expect(errors).toEqual([]);
});

test("arrow keys move between slides", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#count")).toHaveText(/^1 \//);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#contents")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#start")).toBeVisible();
});

test("every widget initialises", async ({ page }) => {
  await page.goto("/");
  const pending = await page.$$eval("[data-widget]", nodes => nodes.filter(n => !n.dataset.ready).map(n => n.dataset.widget));
  expect(pending).toEqual([]);
});
