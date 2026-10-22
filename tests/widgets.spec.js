import { test, expect } from "@playwright/test";

test.describe("games and tools", () => {
  test.skip(({ isMobile }) => isMobile, "interaction tests run once, on desktop");

  test("platform round scores a right answer", async ({ page }) => {
    await page.goto("/#where-look");
    const slide = page.locator("#where-look");
    await slide.getByRole("button", { name: "GeM", exact: true }).first().click();
    await expect(slide.locator(".tally")).toHaveText("1 of 6 right");
  });

  test("evidence matching completes", async ({ page }) => {
    await page.goto("/#evidence");
    const slide = page.locator("#evidence");
    const pairs = await slide.locator("script[type='application/json']").evaluate(n => JSON.parse(n.textContent).pairs);
    for (const [a, b] of pairs) {
      await slide.getByRole("button", { name: a, exact: true }).click();
      await slide.getByRole("button", { name: b, exact: true }).click();
    }
    await expect(slide.locator(".tally")).toHaveText(`${pairs.length} of ${pairs.length} matched`);
  });

  test("Claude simulator: the planted mistake can be caught", async ({ page }) => {
    await page.goto("/#claude-check");
    const slide = page.locator("#claude-check");
    await slide.getByRole("button", { name: "Bids close on 10-11-2026 at 15:00." }).click();
    await expect(slide.locator(".cs-fb")).toContainText("Good catch");
  });

  test("red pen finds all seven letter mistakes", async ({ page }) => {
    await page.goto("/#letter");
    const slide = page.locator("#letter");
    for (const t of await slide.locator(".rp[data-why]").all()) await t.click();
    await expect(slide.locator(".rp-tally")).toHaveText("7 of 7 found");
  });

  test("a failed gate stamps no bid", async ({ page }) => {
    await page.goto("/#decision");
    const slide = page.locator("#decision");
    await expect(slide.locator(".decision-note .stamp")).toHaveText("Bid");
    await slide.locator("#gate3").uncheck();
    await expect(slide.locator(".decision-note .stamp")).toHaveText("No bid");
  });

  test("QCBS: the stronger technical bid wins at a higher price", async ({ page }) => {
    await page.goto("/#qcbs");
    await expect(page.locator("#qcbs .q-out")).toContainText("Bidder A wins");
  });

  test("team sort can be checked", async ({ page }) => {
    await page.goto("/#owners");
    const slide = page.locator("#owners");
    const items = await slide.locator("script[type='application/json']").evaluate(n => JSON.parse(n.textContent).items);
    for (const it of items) {
      await slide.locator(".chip", { hasText: it.text }).click();
      await slide.locator(`.lane[data-lane="${it.lane}"] > b`).click();
    }
    await slide.getByRole("button", { name: "Check answers" }).click();
    await expect(slide.locator(".fb")).toHaveText("Every document has the right owner.");
  });

  test("GeM simulator: traps are caught and a clean run gets a receipt", async ({ page }) => {
    await page.goto("/#gem-sim");
    const sim = page.locator("#gem-sim .sim");
    await sim.getByLabel(/Hiring of Social Media Agency/).check();
    await sim.getByRole("button", { name: "Save and continue" }).click();

    await sim.getByLabel("Total offer price in rupees").fill("24000000");
    await sim.getByLabel("Price break-up file").selectOption("AnnexXI_Price_Breakup.pdf");
    await sim.getByRole("button", { name: "Save and continue" }).click();
    await expect(sim.locator(".sim-alert")).toContainText("more than 15% below");
    await sim.getByLabel("Total offer price in rupees").fill("28000000");
    await sim.getByRole("button", { name: "Save and continue" }).click();

    const put = { "Experience Criteria": "WorkOrders_CompletionCerts.pdf", "Bidder Turnover": "AnnexIV_CA_Turnover_NetWorth.pdf",
      "Certificate (Requested in ATC)": "ATC_Annexures_merged.pdf", "Additional Doc 1 (Requested in ATC)": "AnnexIII_Experience_Sheets.pdf",
      "Additional Doc 2 (Requested in ATC)": "AnnexX_CVs_10_members.pdf", "Additional Doc 3 (Requested in ATC)": "EPF_Employee_List.pdf",
      "Additional Doc 4 (Requested in ATC)": "Audited_Financials_3FY.pdf", "Technical Proposal and Presentation": "Technical_Proposal.pdf", "Power of Attorney": "PoA_Notarised.pdf" };
    for (const [slot, file] of Object.entries(put)) await sim.getByLabel(slot, { exact: true }).selectOption(file);
    await sim.getByLabel("GSTIN for transaction charges").selectOption({ index: 1 });
    await sim.locator("input[name=sim-mii]").first().check();
    await sim.locator("input[name=sim-emd]").first().check();
    await sim.getByRole("button", { name: "Save", exact: true }).click();
    await expect(sim.locator(".sim-alert")).toContainText("over the 10 MB limit");
    await expect(sim.locator(".sim-alert")).toContainText("Upload the proof for the EMD exemption");
    await sim.getByLabel("Additional Doc 4 (Requested in ATC)", { exact: true }).selectOption("Audited_Financials_3FY_compressed.pdf");
    await sim.getByLabel("EMD exemption document").selectOption("MSME_EM-II_Memorandum_2016.pdf");
    await sim.getByRole("button", { name: "Save", exact: true }).click();
    await expect(sim.locator(".sim-alert")).toContainText("EM-II memorandum is no longer valid");
    await sim.getByLabel("EMD exemption document").selectOption("Udyam_Registration_Certificate.pdf");
    await sim.getByRole("button", { name: "Save", exact: true }).click();

    await expect(sim).toContainText("No EMD to pay");
    await sim.getByRole("button", { name: "Save and continue" }).click();

    await sim.getByLabel(/I opened every uploaded file/).check();
    await sim.getByRole("button", { name: "e-Sign and submit" }).click();
    await sim.getByLabel("One-time password").fill("123456");
    await sim.getByRole("button", { name: "Submit bid" }).click();
    await expect(sim.locator(".receipt")).toContainText("Bid participation successful");
  });
});

test("practice tender: all eight traps can be found", async ({ page, isMobile }) => {
  test.skip(isMobile, "runs once, on desktop");
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/practice/tender.html");
  const traps = page.locator(".rp[data-why]");
  await expect(traps).toHaveCount(8);
  for (const t of await traps.all()) await t.click();
  await expect(page.locator(".rp-tally")).toHaveText("8 of 8 found");
  expect(errors).toEqual([]);
});
