import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("AURA•CARE Automated WCAG 2.1 AA Accessibility Audit", () => {
  test("Landing (/) has zero critical or serious axe-core violations", async ({
    page,
  }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const severe = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(severe).toEqual([]);
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

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const severe = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(severe).toEqual([]);
  });

  test("Care-Circle Command Center (/dashboard) has zero critical or serious axe-core violations", async ({
    page,
  }) => {
    await page.goto("/");
    for (const digit of "222222") {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    await expect(page.getByText(/Care-Circle Command Center/i)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const severe = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(severe).toEqual([]);
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

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const severe = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(severe).toEqual([]);
  });
});
