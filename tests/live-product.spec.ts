import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const password = "my-unique-test-password-2026";
async function register(page: Page, business = "Olive Live Studio") {
  const email = `browser-${crypto.randomUUID()}@example.com`;
  await page.goto("/workspace");
  await page
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("Taylor");
  await page
    .getByRole("textbox", { name: "Business name", exact: true })
    .fill(business);
  await page
    .getByRole("textbox", { name: "Work email", exact: true })
    .fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Inbox", exact: true }),
  ).toBeVisible();
  return email;
}
const settings = (page: Page) =>
  page
    .getByRole("navigation", { name: "Workspace navigation", exact: true })
    .getByRole("button", { name: "Settings", exact: true });

test("creates a private server workspace, saves context, signs out and signs in", async ({
  page,
}) => {
  const email = await register(page);
  await expect(page.locator(".app-workspace-name")).toContainText(
    "Your workspace",
  );
  await expect(page.locator(".conversation-row")).toHaveCount(0);
  await settings(page).click();
  await page
    .getByRole("textbox", { name: "What do you sell?" })
    .fill("Handmade candles");
  await page
    .getByRole("textbox", { name: "Business context" })
    .fill("Our cedar candle is $24. Shipping takes 5 business days.");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".settings-save-row")).toContainText(
    "Changes saved to your workspace",
  );
  await page.reload();
  await settings(page).click();
  await expect(
    page.getByRole("textbox", { name: "What do you sell?" }),
  ).toHaveValue("Handmade candles");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your next chapter starts here." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Already have an account? Sign in" })
    .click();
  await page.getByRole("textbox", { name: "Work email" }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".app-workspace-name")).toContainText(
    "Olive Live Studio",
  );
});

test("exercises durable inbound ingestion and exposes missing AI and simulator delivery honestly", async ({
  page,
}) => {
  await register(page);
  await page.getByRole("button", { name: "Test an inbound message" }).click();
  await page.getByRole("textbox", { name: "Contact name" }).fill("Casey");
  await page
    .getByRole("textbox", { name: "Inbound message" })
    .fill("Is the cedar candle still available?");
  await page.getByRole("button", { name: "Add test message" }).click();
  await page
    .getByRole("button", { name: /Open conversation with Casey/ })
    .click();
  await expect(page.locator(".chat-messages")).toContainText(
    "Is the cedar candle still available?",
  );
  await expect(page.locator(".chat-quiet-note")).toContainText(
    "AI is not configured",
    { timeout: 10000 },
  );
  await page
    .getByRole("textbox", { name: "Message Casey" })
    .fill("I can help you find the right candle.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".chat-message.outgoing")).toContainText(
    "I can help",
  );
  await expect(page.locator(".message-delivery-problem")).toContainText(
    "no real provider delivery was attempted",
    { timeout: 10000 },
  );
  await page.reload();
  await page
    .getByRole("button", { name: /Open conversation with Casey/ })
    .click();
  await expect(page.locator(".chat-message.outgoing")).toContainText(
    "I can help",
  );
});

test("streams new conversations to another signed-in tab", async ({
  page,
  context,
}) => {
  await register(page);
  const other = await context.newPage();
  await other.goto("/workspace");
  await expect(
    other.getByRole("heading", { name: "Inbox", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Test an inbound message" }).click();
  await page
    .getByRole("textbox", { name: "Contact name" })
    .fill("Realtime Lead");
  await page.getByRole("button", { name: "Add test message" }).click();
  await expect(
    other.getByRole("button", { name: /Open conversation with Realtime Lead/ }),
  ).toBeVisible({ timeout: 10000 });
  await other.close();
});

test("does not put live workspace data in demo browser storage", async ({
  page,
}) => {
  await register(page, "Never Local Live Workspace");
  await settings(page).click();
  const local = await page.evaluate(
    () => localStorage.getItem("dmcloser-workspace-v1") || "",
  );
  expect(local).not.toContain("Never Local Live Workspace");
  await expect(
    page.getByRole("button", { name: "Choose Starter" }),
  ).toBeDisabled();
  await expect(page.locator(".settings-sections")).toContainText(
    "Payments are not configured",
  );
  await page
    .getByRole("button", { name: "Connect", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "service owner must configure",
  );
  await expect(
    page.getByRole("button", { name: "Continue with Instagram" }),
  ).toBeDisabled();
});

test("exports complete workspace data and requires confirmation before deletion", async ({
  page,
}) => {
  await register(page);
  await settings(page).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export workspace" }).click();
  expect((await downloadEvent).suggestedFilename()).toBe(
    "dmcloser-workspace.json",
  );
  await page
    .getByRole("button", { name: "Delete workspace", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Permanently delete workspace" }),
  ).toBeDisabled();
  await page.getByLabel("Confirm your password").fill(password);
  await page
    .getByRole("checkbox", { name: "I understand this cannot be undone." })
    .check();
  await page
    .getByRole("button", { name: "Permanently delete workspace" })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "DMCloser",
  );
});

test("fails gracefully when the API is unavailable, without pretending to create an account", async ({
  page,
}) => {
  await page.route("**/api/session", (route) => route.abort());
  await page.goto("/workspace");
  await expect(page.getByRole("alert")).toContainText(
    "server could not be reached",
  );
  await expect(
    page.getByRole("link", { name: "Explore the offline demo" }),
  ).toHaveAttribute("href", "/app");
});

test("has accessible authentication and live settings in both themes", async ({
  page,
}) => {
  await page.goto("/workspace");
  let results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((item) => ({
      id: item.id,
      targets: item.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  await register(page);
  await settings(page).click();
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") {
      await page
        .getByRole("button", { name: "Dark mode", exact: true })
        .click();
      await expect(page.locator("html")).toHaveClass("dark");
    }
    results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((item) => ({
        id: item.id,
        targets: item.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  }
});
