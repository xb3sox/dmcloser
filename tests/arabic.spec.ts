import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Arabic / RTL coverage (NFR-006, AC-026).
 *
 * The locale is applied by a boot script before the first paint, so every test
 * here asserts on the document's own `lang`/`dir` rather than on a React state
 * change.
 */

const storeLocale = (page: Page, locale: "en" | "ar") =>
  page.addInitScript((value) => {
    try {
      window.localStorage.setItem("dmcloser-locale", value);
    } catch {
      // Storage can be unavailable; the boot script falls back to English.
    }
  }, locale);

const documentLocale = (page: Page) =>
  page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
  }));

const overflow = (page: Page) =>
  page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));

const localeSwitch = (page: Page) => page.locator("[data-locale-switch]");

test.beforeEach(async ({ page }) => {
  await page.goto("/app");
});

test("applies the stored locale before the first paint", async ({ page }) => {
  await storeLocale(page, "ar");
  await page.goto("/app");
  expect(await documentLocale(page)).toEqual({ lang: "ar", dir: "rtl" });
});

test("switches the document direction and keeps it across a reload", async ({
  page,
}) => {
  expect(await documentLocale(page)).toEqual({ lang: "en", dir: "ltr" });
  await localeSwitch(page).first().click();
  expect(await documentLocale(page)).toEqual({ lang: "ar", dir: "rtl" });
  await page.reload();
  expect(await documentLocale(page)).toEqual({ lang: "ar", dir: "rtl" });
  await localeSwitch(page).first().click();
  expect(await documentLocale(page)).toEqual({ lang: "en", dir: "ltr" });
  await page.reload();
  expect(await documentLocale(page)).toEqual({ lang: "en", dir: "ltr" });
});

test("renders the interface in Arabic with no horizontal overflow at 360px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await storeLocale(page, "ar");
  await page.goto("/app");
  expect(await documentLocale(page)).toEqual({ lang: "ar", dir: "rtl" });
  await expect(page.locator(".conversation-row").first()).toBeVisible();
  const metrics = await overflow(page);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport);
});

test("keeps the interface readable in Arabic on a narrow workspace viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await storeLocale(page, "ar");
  await page.goto("/app");
  await page
    .getByRole("navigation", { name: "تنقل مساحة العمل على الجوال" })
    .getByRole("button", { name: "الإعدادات" })
    .click();
  await expect(page.locator(".settings-page")).toBeVisible();
  const metrics = await overflow(page);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewport);
});

for (const theme of ["light", "dark"] as const) {
  for (const mobile of [false, true]) {
    test(`passes automated accessibility checks in Arabic ${theme} ${mobile ? "mobile" : "desktop"} mode`, async ({
      page,
    }) => {
      await storeLocale(page, "ar");
      await page.goto("/app");
      if (mobile) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(120);
      }
      if (theme === "dark") {
        await page
          .getByRole("button", { name: /الوضع الداكن|dark mode/i })
          .first()
          .click();
      }
      const audit = async () => {
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(
          results.violations.map((violation) => ({
            id: violation.id,
            targets: violation.nodes.map((node) => node.target),
          })),
        ).toEqual([]);
      };
      await audit();
      await page
        .getByRole("button", { name: /فتح محادثة|Open conversation/i })
        .first()
        .click();
      await audit();
    });
  }
}
