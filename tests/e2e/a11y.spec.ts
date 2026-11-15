import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function expectNoSevereAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  const severe = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  expect(severe).toEqual([]);
}

test.describe("AURA•CARE Automated WCAG 2.1 AA Accessibility Audit", () => {
  test("Landing (/) and Emergency Medical ID modal have zero critical or serious axe-core violations", async ({
    page,
  }) => {
    await page.goto("/");
    await expectNoSevereAxeViolations(page);

    await page
      .getByRole("button", { name: /Emergency Medical ID/i })
      .first()
      .click();
    await expect(
      page.getByRole("dialog", { name: /First-Responder Emergency Medical ID/i })
    ).toBeVisible();
    await page.waitForTimeout(350);
    await expectNoSevereAxeViolations(page);
  });

  test("Elder Sovereign Mode (/elder) has zero critical or serious axe-core violations", async ({
    page,
  }) => {
    await page.goto("/");
    for (const digit of "111111") {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }
    await page.waitForURL("**/elder**", { timeout: 15000 });
    await expect(page.getByText(/Good Morning, Arthur/i)).toBeVisible();

    await expectNoSevereAxeViolations(page);
  });

  test("Care-Circle Command Center (/dashboard) and Add / Propose Medication modal have zero critical or serious axe-core violations", async ({
    page,
  }) => {
    await page.goto("/");
    for (const digit of "222222") {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    await expect(page.getByText(/Care-Circle Command Center/i)).toBeVisible();
    await expectNoSevereAxeViolations(page);

    await page
      .getByRole("button", { name: /Add \/ Propose Medication/i })
      .click();
    await expect(
      page.getByRole("dialog", { name: /Add or Propose Medication/i })
    ).toBeVisible();
    await page.waitForTimeout(350);
    await expectNoSevereAxeViolations(page);
  });

  test("Physician Brief (/appointments/brief/appt-cardio-1/) has zero critical or serious axe-core violations", async ({
    page,
  }) => {
    await page.goto("/");
    for (const digit of "222222") {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    await page.goto("/appointments/brief/appt-cardio-1/");
    await expect(page.getByText(/Vance/i).first()).toBeVisible();

    await expectNoSevereAxeViolations(page);
  });
});
