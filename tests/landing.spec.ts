import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("presents the brand and a loaded full-bleed hero", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "DMCloser.",
  );
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "More closing.",
  );
  await expect(page.locator(".hero-image")).toBeVisible();
  expect(
    await page
      .locator(".hero-image")
      .evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
  ).toBe(true);
  await page.getByRole("link", { name: "See it in action" }).click();
  await expect(page).toHaveURL(/#product$/);
  await expect(
    page.getByLabel("Interactive DMCloser inbox demo"),
  ).toBeInViewport();
});

test("edits, sends, and resets a suggested demo reply", async ({ page }) => {
  const demo = page.getByLabel("Interactive DMCloser inbox demo");
  await demo.getByRole("button", { name: "Edit", exact: true }).click();
  await demo
    .getByRole("textbox", { name: "Edit suggested reply" })
    .fill("Your olive set is ready. Shall I send the checkout link?");
  await demo.getByRole("button", { name: "Send reply", exact: true }).click();
  await expect(demo.locator(".demo-bubble.sent")).toHaveText(
    /Your olive set is ready/,
  );
  await expect(demo.locator(".demo-suggestion")).toHaveCount(0);
  await expect(demo.getByRole("status")).toContainText(
    "No real message was sent",
  );
  await demo.getByRole("button", { name: "Reset demo" }).click();
  await expect(demo.locator(".demo-suggestion")).toBeVisible();
});

test("switches channels and searches demo conversations", async ({ page }) => {
  const demo = page.getByLabel("Interactive DMCloser inbox demo");
  await demo
    .locator(".demo-sidebar")
    .getByRole("button", { name: /WhatsApp/ })
    .click();
  await expect(demo.locator(".demo-conversation")).toHaveCount(1);
  await expect(demo.locator(".demo-chat-heading")).toContainText("Alex Rivera");
  await demo
    .locator(".demo-sidebar")
    .getByRole("button", { name: /All conversations/ })
    .click();
  await demo.getByRole("button", { name: "Search demo conversations" }).click();
  await demo
    .getByRole("textbox", { name: "Search demo conversations" })
    .fill("Maya");
  await expect(demo.locator(".demo-conversation")).toHaveCount(1);
  await demo.locator(".demo-conversation").click();
  await expect(demo.locator(".demo-chat-heading")).toContainText("Maya Chen");
});

test("auto-sends only within the demo when enabled", async ({ page }) => {
  const demo = page.getByLabel("Interactive DMCloser inbox demo");
  await demo.getByRole("switch", { name: "Auto-send demo replies" }).click();
  await expect(demo.getByRole("switch")).toBeChecked();
  await expect(demo.locator(".demo-replied")).toBeVisible();
  await expect(demo.getByRole("status")).toContainText("auto-sent");
});

test("sends a manually composed demo reply", async ({ page }) => {
  const demo = page.getByLabel("Interactive DMCloser inbox demo");
  await demo
    .getByRole("textbox", { name: "Write a demo reply" })
    .fill("Happy to help you find your perfect set.");
  await demo.getByRole("button", { name: "Send your demo reply" }).click();
  await expect(demo.locator(".demo-bubble.sent")).toContainText(
    "Happy to help",
  );
});

test("previews each brand voice", async ({ page }) => {
  const tones = page.getByRole("group", { name: "Preview a reply tone" });
  await tones.getByRole("button", { name: "Premium" }).click();
  await expect(page.locator(".tone-reply p")).toContainText("delighted");
  await tones.getByRole("button", { name: "Sales-focused" }).click();
  await expect(page.locator(".tone-reply p")).toContainText(
    "Let's get your order started",
  );
  await tones.getByRole("button", { name: "Friendly" }).click();
  await expect(page.locator(".tone-reply p")).toContainText("Absolutely!");
});

test("updates pricing and discloses demo-only billing", async ({ page }) => {
  const pricing = page.locator("#pricing");
  await pricing.getByRole("button", { name: /Yearly/ }).click();
  await expect(pricing.locator(".plan-price").first()).toContainText("24");
  await expect(pricing.locator(".plan-price").last()).toContainText("64");
  await expect(pricing).toContainText("$288 billed yearly");
  await pricing.getByRole("button", { name: "Monthly", exact: true }).click();
  await expect(pricing.locator(".plan-price").first()).toContainText("29");
  await pricing.getByRole("button", { name: "Make room to grow" }).click();
  await expect(page.getByRole("dialog")).toContainText("Growth");
  await expect(page.getByRole("dialog")).toContainText(
    "no paid subscription is created",
  );
});

test("opens accessible FAQs one at a time", async ({ page }) => {
  const first = page.locator(".faq-list details").nth(0);
  const second = page.locator(".faq-list details").nth(1);
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");
  await expect(first.locator("p")).toBeVisible();
  await second.locator("summary").click();
  await expect(second).toHaveAttribute("open", "");
  await expect(first).not.toHaveAttribute("open", "");
});

test("creates a local workspace, enters the app, and preserves settings", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Try DMCloser", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Business name" })
    .fill("Olive & Oak");
  await page
    .getByRole("textbox", { name: "What do you sell?" })
    .fill("Linen homeware");
  await page
    .getByRole("combobox", { name: "Your reply tone" })
    .selectOption("premium");
  await page.getByRole("button", { name: "Create demo workspace" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: "Inbox", exact: true }),
  ).toBeVisible();
  await page
    .locator("aside nav")
    .getByRole("button", { name: "Settings" })
    .click();
  await expect(page.locator('main input[type="text"]').first()).toHaveValue(
    "Olive & Oak",
  );
  await page.reload();
  await page
    .locator("aside nav")
    .getByRole("button", { name: "Settings" })
    .click();
  await expect(page.locator('main input[type="text"]').first()).toHaveValue(
    "Olive & Oak",
  );
  await page.getByRole("button", { name: "Back to website" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("supports Escape and returns modal focus to its trigger", async ({
  page,
}) => {
  const trigger = page.getByRole("button", {
    name: "Get started",
    exact: true,
  });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Business name" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("persists the selected theme", async ({ page }) => {
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveClass("light");
});

test("provides a mobile menu and avoids horizontal page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Pricing" })
    .click();
  await expect(page).toHaveURL(/#pricing$/);
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toHaveCount(0);
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(120);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("preserves independent preview drafts and never sends to the previous contact", async ({
  page,
}) => {
  const demo = page.getByLabel("Interactive DMCloser inbox demo");
  const composer = demo.getByRole("textbox", { name: "Write a demo reply" });
  await composer.fill("Sofia manual draft");
  await demo.locator(".demo-conversation").nth(1).click();
  await expect(composer).toHaveValue("");
  await demo.getByRole("button", { name: "Send reply", exact: true }).click();
  await expect(demo.getByRole("status")).toContainText("Alex");
  await expect(demo.locator(".demo-replied")).toBeVisible();
  await demo.locator(".demo-conversation").nth(0).click();
  await expect(composer).toHaveValue("Sofia manual draft");
  await expect(demo.locator(".demo-suggestion")).toBeVisible();
  await demo.getByRole("button", { name: "Edit", exact: true }).click();
  await demo
    .getByRole("textbox", { name: "Edit suggested reply" })
    .fill("An edited suggestion");
  await demo.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(composer).toHaveValue("Sofia manual draft");
});

test("does not auto-send over a manually drafted preview reply", async ({
  page,
}) => {
  const demo = page.getByLabel("Interactive DMCloser inbox demo");
  await demo
    .getByRole("textbox", { name: "Write a demo reply" })
    .fill("Let me answer personally.");
  await demo.getByRole("switch").click();
  await page.waitForTimeout(1800);
  await expect(demo.locator(".demo-suggestion")).toBeVisible();
  await expect(demo.locator(".demo-bubble.sent")).toHaveCount(0);
});

test("keeps the complete header within narrow viewport bounds", async ({
  page,
}) => {
  for (const width of [320, 360, 375, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(120);
    const bounds = await page.locator(".header-inner").evaluate((header) => {
      const container = header.getBoundingClientRect();
      return [...header.querySelectorAll("a,button")]
        .filter((element) => element.getBoundingClientRect().width > 0)
        .map((element) => ({
          left: element.getBoundingClientRect().left,
          right: element.getBoundingClientRect().right,
          containerLeft: container.left,
          containerRight: container.right,
        }));
    });
    for (const item of bounds) {
      expect(item.left).toBeGreaterThanOrEqual(item.containerLeft - 1);
      expect(item.right).toBeLessThanOrEqual(item.containerRight + 1);
    }
  }
});

test("returns focus on mobile Escape and closes the menu on desktop resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.click();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  await trigger.click();
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toHaveCount(0);
});

test("opens privacy and demo terms without navigating away", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "locally in your browser",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Terms", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "prices are illustrative",
  );
});

test("keeps the interactive inbox usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const demo = page.getByLabel("Interactive DMCloser inbox demo");
  await demo.locator(".demo-conversation").nth(1).click();
  await expect(demo.locator(".demo-chat-heading")).toContainText("Alex Rivera");
  await demo.getByRole("button", { name: "Send reply", exact: true }).click();
  await expect(demo.locator(".demo-replied")).toBeVisible();
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

for (const scheme of ["light", "dark"] as const) {
  test(`has no detected WCAG A/AA violations in ${scheme} mode`, async ({
    page,
  }) => {
    if (scheme === "dark")
      await page.getByRole("button", { name: "Switch to dark mode" }).click();
    for (const section of await page
      .locator(".landing-section, .closing-section")
      .all()) {
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(180);
    }
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
