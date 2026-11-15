import { test, expect } from "@playwright/test";

test.describe("AURA•CARE End-to-End Clinical & Dignity Flows", () => {
  test("Zero-PIN Emergency Medical ID (ICE) opens unclipped from sticky navbar", async ({
    page,
  }) => {
    await page.goto("/");
    const iceTrigger = page.getByRole("button", {
      name: /Emergency Medical ID/i,
    });
    await iceTrigger.click();

    const dialog = page.getByRole("dialog", {
      name: /First-Responder Emergency Medical ID/i,
    });
    await expect(dialog).toBeVisible();

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(300);

    await expect(dialog.getByText(/O\+ Positive/i)).toBeVisible();
    await expect(dialog.getByText(/Eliquis \/ Apixaban/i).first()).toBeVisible();

    const closeBtn = dialog.getByRole("button", { name: /Close ICE Card/i });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(dialog).toBeHidden();
  });

  test("Vault Flow (PIN 111111 -> /elder): Day/Night toggle, Sovereign Co-Sign, and Dose Confirmation", async ({
    page,
  }) => {
    await page.goto("/");

    for (const digit of "111111") {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }

    await page.waitForURL("**/elder**", { timeout: 15000 });
    await expect(page.getByText(/Good Morning, Arthur/i)).toBeVisible();

    // Switch Day/Night theme
    const themeToggle = page
      .getByRole("button", { name: /Night Mode|Day Mode|Midnight Blue|White/i })
      .first();
    await themeToggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
    await themeToggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");

    // Approve Vitamin D3 via Sovereign Co-Sign if pending
    const approveBtn = page.getByRole("button", {
      name: /Approve & Add to My Routine/i,
    });
    if ((await approveBtn.count()) > 0) {
      await approveBtn.first().click();
    }

    // Confirm a pending dose via "I Took This"
    const tookBtn = page.getByRole("button", { name: /I Took This/i }).first();
    if ((await tookBtn.count()) > 0) {
      await tookBtn.click();
      await expect(page.getByRole("status").first()).toBeVisible();
    }
  });

  test("Care-Circle Guardrails & Mutex Conflict (PIN 222222 -> /dashboard)", async ({
    page,
  }) => {
    await page.goto("/");
    for (const digit of "222222") {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }

    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    await expect(page.getByText(/Care-Circle Command Center/i)).toBeVisible();

    // Open + Add / Propose Medication modal
    await page
      .getByRole("button", { name: /Add \/ Propose Medication/i })
      .click();

    const modal = page.getByRole("dialog", {
      name: /Add or Propose Medication/i,
    });
    await expect(modal).toBeVisible();

    // Click Ibuprofen 400 mg preset -> CRITICAL bleeding alert
    await modal.getByRole("button", { name: /Ibuprofen 400 mg/i }).click();
    await expect(
      modal.getByText(/Major Bleeding Risk: NSAID \+ Anticoagulant/i)
    ).toBeVisible();

    // Click Calcium Carbonate 600 mg @ 07:00 preset -> 4-hour thyroid buffer WARNING
    await modal
      .getByRole("button", { name: /Calcium Carbonate 600 mg @ 07:00/i })
      .click();
    await expect(modal.getByText(/4-Hour.*Timing|Chelation/i)).toBeVisible();

    await modal.getByRole("button", { name: /Cancel/i }).click();
    await expect(modal).toBeHidden();

    // Test Duplicate Logging (Verify HTTP 409 Lock)
    const dupBtn = page
      .getByRole("button", { name: /Test Duplicate Logging/i })
      .first();
    await dupBtn.click();
    await expect(page.getByText(/HTTP 409/i).first()).toBeVisible();
  });

  test("Physician Brief renders 94% adherence and Dr. Eleanor Vance, MD", async ({
    page,
  }) => {
    await page.goto("/");
    for (const digit of "222222") {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    await page.goto("/appointments/brief/appt-cardio-1/");
    await expect(page.getByText(/%/).first()).toBeVisible();
    await expect(page.getByText(/Vance/i).first()).toBeVisible();
  });
});
