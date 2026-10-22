import { test, expect } from "@playwright/test";

test.describe("presenter view on a projector", () => {
  test.skip(({ isMobile }) => isMobile, "projector checks run on a 1080p screen");
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("/present/ opens presenter mode with big type", async ({ page }) => {
    await page.goto("/present/");
    await expect(page).toHaveURL(/mode=present/);
    await expect(page.locator("#revealBtn")).toBeVisible();
    const px = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    expect(px).toBeGreaterThanOrEqual(24);
  });

  test("every slide fits the screen in presenter mode, with no scrolling", async ({ page }) => {
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto("/?mode=present");
    const ids = await page.$$eval(".slide", s => s.map(x => x.id));
    for (const id of ids) {
      await page.evaluate(i => { location.hash = i; }, id);
      await expect(page.locator(`#${id}`)).toBeVisible();
      const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      expect(sw, `slide ${id} scrolls sideways`).toBeLessThanOrEqual(cw);
      await expect.poll(() => page.evaluate(i => { const s = document.getElementById(i); return s.scrollHeight - s.clientHeight; }, id),
        { message: `slide ${id} scrolls down` }).toBeLessThanOrEqual(2);
    }
    expect(errors).toEqual([]);
  });

  const revealOn = async (page, id) => {
    await page.goto(`/?mode=present#${id}`);
    await page.locator("#revealBtn").click();
    return page.locator(`#${id}`);
  };

  test("Reveal puts every document in its owner's lane", async ({ page }) => {
    const slide = await revealOn(page, "owners");
    await expect(slide.locator(".tray .chip")).toHaveCount(0);
    await expect(slide.locator(".lane .chip.ok")).toHaveCount(12);
  });

  test("Reveal pairs every criterion with its evidence", async ({ page }) => {
    const slide = await revealOn(page, "evidence");
    await expect(slide.locator(".tally")).toHaveText("8 of 8 matched");
  });

  test("Reveal circles every mistake in the letter", async ({ page }) => {
    const slide = await revealOn(page, "letter");
    await expect(slide.locator(".rp.found")).toHaveCount(7);
  });

  test("Reveal shows the planted Claude mistake", async ({ page }) => {
    const slide = await revealOn(page, "claude-check");
    await expect(slide.locator(".claim.caught")).toHaveCount(1);
  });

  test("Reveal fills the GeM simulator with the answer key", async ({ page }) => {
    const slide = await revealOn(page, "gem-sim");
    await expect(slide.locator(".sim-alert.ok")).toBeVisible();
    await expect(slide.getByLabel("Additional Doc 4 (Requested in ATC)", { exact: true })).toHaveValue("Audited_Financials_3FY_compressed.pdf");
  });

  test("Reveal opens the exercise answers and Reset closes them", async ({ page }) => {
    const slide = await revealOn(page, "exercises");
    await expect(slide.locator("details.answer[open]")).toHaveCount(6);
    await page.locator("#resetBtn").click();
    await expect(slide.locator("details.answer[open]")).toHaveCount(0);
  });

  test("Reset puts a game back to the start", async ({ page }) => {
    const slide = await revealOn(page, "where-look");
    await expect(slide.locator(".opt.right")).toHaveCount(1); // presenter rounds show one question at a time
    await page.locator("#resetBtn").click();
    await expect(slide.locator(".opt.right")).toHaveCount(0);
  });
});

test("attendee view hides trainer notes, reveal controls and answers", async ({ page }) => {
  await page.goto("/#exercises");
  await expect(page.locator("#revealBtn")).toBeHidden();
  await expect(page.locator("#notesBtn")).toBeHidden();
  const first = page.locator("#exercises details.answer").first();
  await first.locator("summary").click();
  await expect(first.locator(".a")).toBeHidden();
  await page.keyboard.press("n");
  await expect(page.locator("#notesPanel")).toBeHidden();
});
