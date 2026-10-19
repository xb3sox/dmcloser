import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const sofia = (page: Page) =>
  page.getByRole("button", { name: /Open conversation with Sofia Mitchell/ });
const alex = (page: Page) =>
  page.getByRole("button", { name: /Open conversation with Alex Rivera/ });
const workspaceNav = (page: Page) =>
  page.getByRole("navigation", { name: "Workspace navigation", exact: true });
const openSettings = (page: Page) =>
  workspaceNav(page)
    .getByRole("button", { name: "Settings", exact: true })
    .click();

test.beforeEach(async ({ page }) => {
  await page.goto("/app");
});

test("shares the brand and keeps the conversation list visible on desktop", async ({
  page,
}) => {
  await expect(page.locator(".app-brand-link .closer-brand")).toHaveText(
    "dmcloser.",
  );
  await expect(
    page.getByRole("heading", { name: "Inbox", exact: true }),
  ).toBeVisible();
  await sofia(page).click();
  await expect(page.locator(".inbox-panel")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sofia Mitchell", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".chat-suggestion")).toBeVisible();
  await expect(page).toHaveTitle("Sofia Mitchell - DMCloser");
});

test("filters channels and searches message content", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Conversation channels" })
    .getByRole("button", { name: /WhatsApp/ })
    .click();
  await expect(page.locator(".conversation-row")).toHaveCount(3);
  await page
    .getByRole("searchbox", { name: "Search conversations" })
    .fill("boutiques");
  await expect(page.locator(".conversation-row")).toHaveCount(1);
  await expect(page.locator(".conversation-row")).toContainText("James Liu");
  await page.getByRole("button", { name: "Clear conversation search" }).click();
  await expect(page.getByRole("searchbox")).toBeFocused();
  await expect(page.locator(".conversation-row")).toHaveCount(3);
});

test("provides recoverable empty states and working intent filters", async ({
  page,
}) => {
  await page
    .getByRole("group", { name: "Filter by intent" })
    .getByRole("button", { name: "Spam" })
    .click();
  await expect(page.locator(".conversation-row")).toHaveCount(1);
  await page.getByRole("searchbox").fill("no such contact");
  await expect(
    page.getByRole("heading", { name: "No conversations found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".conversation-row")).toHaveCount(8);
});

test("marks conversations read without losing the active chat", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Unread", exact: true }).click();
  await expect(page.locator(".conversation-row")).toHaveCount(3);
  await sofia(page).click();
  await expect(page.locator(".conversation-row")).toHaveCount(2);
  await expect(page.locator(".chat-contact")).toContainText("Sofia Mitchell");
  await expect(workspaceNav(page)).toContainText("2");
});

test("preserves each contact draft across switches and reloads", async ({
  page,
}) => {
  await sofia(page).click();
  await page
    .getByRole("textbox", { name: "Message Sofia Mitchell" })
    .fill("Sofia draft stays here");
  await alex(page).click();
  await expect(
    page.getByRole("textbox", { name: "Message Alex Rivera" }),
  ).toHaveValue("");
  await page
    .getByRole("textbox", { name: "Message Alex Rivera" })
    .fill("Alex has a different draft");
  await sofia(page).click();
  await expect(
    page.getByRole("textbox", { name: "Message Sofia Mitchell" }),
  ).toHaveValue("Sofia draft stays here");
  await page.reload();
  await sofia(page).click();
  await expect(
    page.getByRole("textbox", { name: "Message Sofia Mitchell" }),
  ).toHaveValue("Sofia draft stays here");
  await alex(page).click();
  await expect(
    page.getByRole("textbox", { name: "Message Alex Rivera" }),
  ).toHaveValue("Alex has a different draft");
});

test("supports multiline replies and prevents blank sends", async ({
  page,
}) => {
  await sofia(page).click();
  const composer = page.getByRole("textbox", {
    name: "Message Sofia Mitchell",
  });
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeDisabled();
  await composer.fill("First line");
  await composer.press("Shift+Enter");
  await composer.pressSequentially("Second line");
  await composer.press("Enter");
  await expect(
    page.locator(".chat-message.outgoing").last().locator("p"),
  ).toHaveText("First line\nSecond line");
  await expect(composer).toHaveValue("");
  await expect(page.locator(".chat-suggestion")).toHaveCount(0);
  await page.reload();
  await sofia(page).click();
  await expect(
    page.locator(".chat-message.outgoing").last().locator("p"),
  ).toHaveText("First line\nSecond line");
});

test("keeps a manual draft when cancelling suggested-reply edits", async ({
  page,
}) => {
  await sofia(page).click();
  const composer = page.getByRole("textbox", {
    name: "Message Sofia Mitchell",
  });
  await composer.fill("My original draft");
  await page
    .locator(".chat-suggestion")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const editor = page.getByRole("textbox", { name: "Edit suggested reply" });
  await expect(editor).toBeFocused();
  await editor.fill("");
  await expect(
    page
      .locator(".chat-suggestion")
      .getByRole("button", { name: "Send reply" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(composer).toHaveValue("My original draft");
  await page
    .locator(".chat-suggestion")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await editor.fill("A personal reply for Sofia.");
  await editor.press("Enter");
  await expect(page.locator(".chat-message.outgoing").last()).toContainText(
    "A personal reply for Sofia.",
  );
});

test("requires workspace and contact opt-in before simulated auto-send", async ({
  page,
}) => {
  await sofia(page).click();
  await expect(page.getByRole("switch")).not.toBeChecked();
  await page.getByRole("switch").click();
  await page.waitForTimeout(3000);
  await expect(page.locator(".chat-suggestion")).toBeVisible();
  await openSettings(page);
  await page.getByRole("switch", { name: "Workspace auto-reply" }).click();
  await workspaceNav(page).getByRole("button", { name: /Inbox/ }).click();
  await sofia(page).click();
  await expect(page.locator(".chat-suggestion")).toHaveCount(0, {
    timeout: 5000,
  });
  await expect(page.locator(".chat-composer-footer")).toContainText(
    "No real message was sent",
  );
});

test("pauses auto-send while a person is drafting", async ({ page }) => {
  await openSettings(page);
  await page.getByRole("switch", { name: "Workspace auto-reply" }).click();
  await workspaceNav(page).getByRole("button", { name: /Inbox/ }).click();
  await sofia(page).click();
  await page.getByRole("switch").click();
  await page
    .getByRole("textbox", { name: "Message Sofia Mitchell" })
    .fill("I am writing this one");
  await page.waitForTimeout(3000);
  await expect(page.locator(".chat-suggestion")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Message Sofia Mitchell" }),
  ).toHaveValue("I am writing this one");
});

test("never auto-sends low-confidence or spam replies", async ({ page }) => {
  await openSettings(page);
  await page.getByRole("switch", { name: "Workspace auto-reply" }).click();
  await workspaceNav(page).getByRole("button", { name: /Inbox/ }).click();
  await page
    .getByRole("button", { name: /Open conversation with Daniel Brooks/ })
    .click();
  await page.getByRole("switch").click();
  await expect(page.locator(".chat-suggestion")).toContainText(
    "Review before sending",
  );
  await page.waitForTimeout(3000);
  await expect(page.locator(".chat-suggestion")).toBeVisible();
  await page
    .getByRole("button", { name: /Open conversation with Follower Promotions/ })
    .click();
  await expect(page.getByRole("switch")).toBeDisabled();
  await expect(page.locator(".chat-suggestion")).toHaveCount(0);
  await expect(page.locator(".chat-quiet-note")).toContainText("disabled");
});

test("saves lead memory and conversion status per contact", async ({
  page,
}) => {
  await sofia(page).click();
  await page.locator(".lead-memory summary").click();
  await page
    .getByRole("textbox", { name: "Notes for this contact" })
    .fill("Prefers olive. Follow up about delivery.");
  await page.getByRole("button", { name: "Save memory" }).click();
  await expect(page.locator(".lead-memory-actions")).toContainText(
    "Lead memory saved",
  );
  await page
    .getByRole("combobox", { name: "Conversion status" })
    .selectOption("converted");
  await expect(sofia(page)).toContainText("Converted");
  await expect(page.locator(".chat-suggestion")).toHaveCount(0);
  await page.reload();
  await sofia(page).click();
  await page.locator(".lead-memory summary").click();
  await expect(
    page.getByRole("textbox", { name: "Notes for this contact" }),
  ).toHaveValue("Prefers olive. Follow up about delivery.");
  await expect(
    page.getByRole("combobox", { name: "Conversion status" }),
  ).toHaveValue("converted");
});

test("validates settings and keeps save confirmation visible", async ({
  page,
}) => {
  await openSettings(page);
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Business name", exact: true })
    .fill("   ");
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Business name", exact: true })
    .fill("Olive & Oak");
  await page
    .getByRole("textbox", { name: "What do you sell?" })
    .fill("Handmade candles");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".settings-save-row")).toContainText(
    "Changes saved",
  );
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeDisabled();
  await workspaceNav(page).getByRole("button", { name: /Inbox/ }).click();
  await sofia(page).click();
  await expect(page.locator(".chat-suggestion")).toContainText("Olive & Oak");
  await expect(page.locator(".chat-suggestion")).toContainText(
    "Handmade candles",
  );
  await expect(page.locator(".chat-suggestion")).not.toContainText(
    "3-5 business days",
  );
});

test("uses the same tone choices as the landing page", async ({ page }) => {
  await openSettings(page);
  await page.getByRole("radio", { name: /Premium/ }).check();
  await workspaceNav(page).getByRole("button", { name: /Inbox/ }).click();
  await sofia(page).click();
  await expect(page.locator(".chat-suggestion")).toContainText(
    "An excellent choice.",
  );
  await openSettings(page);
  await page.getByRole("radio", { name: /Sales-focused/ }).check();
  await workspaceNav(page).getByRole("button", { name: /Inbox/ }).click();
  await sofia(page).click();
  await expect(page.locator(".chat-suggestion")).toContainText(
    "Let's get your order started",
  );
});

test("explains account connections instead of pretending to connect", async ({
  page,
}) => {
  await openSettings(page);
  for (const channel of ["Instagram", "WhatsApp"]) {
    const button = page.getByRole("button", { name: `View ${channel} setup` });
    await button.click();
    await expect(page.getByRole("dialog")).toContainText(
      "does not connect to a real messaging account",
    );
    await expect(page.getByRole("dialog")).toContainText(
      "Never paste access tokens",
    );
    await page.keyboard.press("Escape");
    await expect(button).toBeFocused();
  }
});

test("provides usable mobile navigation and channel filters", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("combobox", { name: "Channel", exact: true })
    .selectOption("whatsapp");
  await expect(page.locator(".conversation-row")).toHaveCount(3);
  await alex(page).click();
  await expect(page.locator(".inbox-panel")).toBeHidden();
  await expect(page.locator(".chat-panel")).toBeVisible();
  await expect(page.locator("#chat-contact-name")).toBeFocused();
  await page.getByRole("button", { name: "Back to conversations" }).click();
  await expect(page.locator(".inbox-panel")).toBeVisible();
  await expect(alex(page)).toBeFocused();
  await page
    .getByRole("navigation", { name: "Mobile workspace navigation" })
    .getByRole("button", { name: "Settings" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
});

test.describe("touch-device readability", () => {
  test.use({
    isMobile: true,
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });

  test("uses input sizes that avoid automatic mobile zoom", async ({
    page,
  }) => {
    await sofia(page).click();
    expect(
      await page
        .locator("#chat-reply")
        .evaluate((element) => getComputedStyle(element).fontSize),
    ).toBe("16px");
    await page
      .getByRole("navigation", { name: "Mobile workspace navigation" })
      .getByRole("button", { name: "Settings" })
      .click();
    expect(
      await page
        .locator("#business-name")
        .evaluate((element) => getComputedStyle(element).fontSize),
    ).toBe("16px");
    await page.getByRole("link", { name: "Back to DMCloser website" }).click();
    await page
      .getByRole("button", { name: "Get started", exact: true })
      .click();
    expect(
      await page
        .locator("#setup-business")
        .evaluate((element) => getComputedStyle(element).fontSize),
    ).toBe("16px");
  });

  test("keeps browser chrome synchronized with the selected theme", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#131b15",
    );
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#fafbf7",
    );
  });
});

test("keeps the reply input above mobile navigation at short viewport heights", async ({
  page,
}) => {
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 660 },
    { width: 767, height: 700 },
  ]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(120);
    await page
      .getByRole("navigation", { name: "Mobile workspace navigation" })
      .getByRole("button", { name: /Inbox/ })
      .click();
    await sofia(page).click();
    const metrics = await page.evaluate(() => ({
      messagesHeight: document.querySelector(".chat-messages")!.clientHeight,
      composerBottom: document
        .querySelector(".chat-composer")!
        .getBoundingClientRect().bottom,
      navTop: document
        .querySelector(".app-mobile-tabs")!
        .getBoundingClientRect().top,
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    expect(metrics.messagesHeight).toBeGreaterThan(25);
    expect(metrics.composerBottom).toBeLessThanOrEqual(metrics.navTop);
    expect(metrics.width).toBeLessThanOrEqual(metrics.viewport);
  }
});

test("recovers safely from malformed saved conversations", async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem(
      "dmcloser-workspace-v1",
      JSON.stringify({
        settings: { tone: "invalid", autoSendConfidenceThreshold: -999 },
        conversations: [{ id: "broken", messages: [] }],
        drafts: { broken: null },
      }),
    ),
  );
  await page.reload();
  await expect(page.locator(".conversation-row")).toHaveCount(8);
  await sofia(page).click();
  await expect(page.locator(".chat-suggestion")).toBeVisible();
});

test("works without browser storage and discloses session-only saving", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage unavailable", "QuotaExceededError");
    };
    Storage.prototype.getItem = () => {
      throw new DOMException("Storage unavailable", "SecurityError");
    };
  });
  await page.reload();
  await expect(page.locator(".storage-warning")).toContainText(
    "only for this session",
  );
  await sofia(page).click();
  await page
    .getByRole("textbox", { name: "Message Sofia Mitchell" })
    .fill("Works without storage");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".chat-message.outgoing").last()).toContainText(
    "Works without storage",
  );
});

for (const theme of ["light", "dark"] as const) {
  for (const mobile of [false, true]) {
    test(`passes automated workspace accessibility checks in ${theme} ${mobile ? "mobile" : "desktop"} mode`, async ({
      page,
    }) => {
      if (mobile) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(120);
      }
      if (theme === "dark") {
        if (mobile)
          await page
            .getByRole("button", { name: "Switch to dark mode" })
            .click();
        else
          await page
            .getByRole("button", { name: "Dark mode", exact: true })
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
      await sofia(page).click();
      await audit();
      if (mobile)
        await page
          .getByRole("navigation", { name: "Mobile workspace navigation" })
          .getByRole("button", { name: "Settings" })
          .click();
      else await openSettings(page);
      await audit();
      await page.getByRole("button", { name: "View Instagram setup" }).click();
      await audit();
    });
  }
}
