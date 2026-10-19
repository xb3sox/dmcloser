import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const backend = "http://127.0.0.1:3001";
async function register(page: Page) {
  await page.goto("/workspace");
  await page
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("Revenue Owner");
  await page
    .getByRole("textbox", { name: "Business name", exact: true })
    .fill("Linen Revenue Studio");
  await page
    .getByRole("textbox", { name: "Work email" })
    .fill(`revenue-ui-${crypto.randomUUID()}@example.com`);
  await page
    .getByLabel("Password", { exact: true })
    .fill("a unique revenue browser password");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Inbox", exact: true }),
  ).toBeVisible();
}
const nav = (page: Page) =>
  page.getByRole("navigation", { name: "Workspace navigation", exact: true });
async function mutate(
  page: Page,
  path: string,
  body: unknown,
  method = "POST",
) {
  const snapshot = await (
    await page.request.get(`${backend}/api/bootstrap`)
  ).json();
  const response = await page.request.fetch(`${backend}/api${path}`, {
    method,
    headers: {
      Origin: "http://127.0.0.1:5173",
      "X-CSRF-Token": snapshot.csrf,
      "Idempotency-Key": crypto.randomUUID(),
    },
    data: body,
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}
async function addLead(page: Page) {
  await mutate(page, "/development/inbound", {
    platform: "instagram",
    name: "Sofia Revenue",
    text: "I am ready to buy the olive set today.",
  });
  await page
    .getByRole("button", { name: /Open conversation with Sofia Revenue/ })
    .click();
  await page.locator(".deal-intelligence > summary").click();
  await expect(
    page.getByRole("button", { name: "Edit opportunity", exact: true }),
  ).toBeVisible();
}
async function approvedProduct(page: Page) {
  return mutate(page, "/brain/entries", {
    kind: "product",
    title: "Olive linen set",
    content: "The olive set is $80.",
    priceMinor: 8000,
    currency: "USD",
    approved: true,
    expiresAt: null,
  });
}

test("adds a verified product without changing the existing inbox or settings", async ({
  page,
}) => {
  await register(page);
  await nav(page)
    .getByRole("button", { name: "Business Brain", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your knowledge. Working together." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add knowledge" }).click();
  await page
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Olive linen set");
  await page
    .getByRole("textbox", { name: "Approved details" })
    .fill("The olive set is $80.");
  await page.getByRole("textbox", { name: "Price (optional)" }).fill("80.00");
  await page
    .getByRole("checkbox", {
      name: "I verified this entry and approve it for business use.",
    })
    .check();
  await page
    .getByRole("button", { name: "Save knowledge", exact: true })
    .click();
  await expect(page.locator(".brain-row")).toContainText("Olive linen set");
  await expect(page.locator(".brain-row")).toContainText("Approved");
  await nav(page)
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Business name", exact: true }),
  ).toHaveValue("Linen Revenue Studio");
  await nav(page).getByRole("button", { name: /Inbox/ }).click();
  await expect(
    page.getByRole("heading", { name: "Inbox", exact: true }),
  ).toBeVisible();
});

test("records a commercial win separately from a confirmed receipt and attributes it", async ({
  page,
}) => {
  await register(page);
  await addLead(page);
  await page
    .getByRole("button", { name: "Edit opportunity", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Confirmed deal value", exact: true })
    .fill("80.00");
  await page
    .locator("#deal-close-date")
    .fill(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  await page
    .getByRole("textbox", { name: "Campaign (team-entered, optional)" })
    .fill("Summer launch");
  await page
    .getByRole("button", { name: "Save opportunity", exact: true })
    .click();
  await expect(page.locator(".deal-intelligence > summary")).toContainText(
    "$80.00",
  );
  await page
    .getByRole("combobox", { name: "Deal actions", exact: true })
    .selectOption("won");
  await page.getByRole("button", { name: "Confirm won outcome" }).click();
  await expect(page.locator(".deal-intelligence > summary")).toContainText(
    "Won",
  );
  let report = await (
    await page.request.get(`${backend}/api/revenue?currency=USD`)
  ).json();
  expect(report.wonMinor).toBe(8000);
  expect(report.revenueMinor).toBe(0);
  await page
    .getByRole("combobox", { name: "Deal actions", exact: true })
    .selectOption("payment");
  await page
    .getByRole("textbox", { name: "Amount received (USD)" })
    .fill("80.00");
  await page
    .getByRole("textbox", { name: "Receipt / transaction reference" })
    .fill("receipt-test-001");
  await page
    .getByRole("checkbox", {
      name: "I verified this receipt outside DMCloser.",
    })
    .check();
  await page.getByRole("button", { name: "Record confirmed amount" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await nav(page).getByRole("button", { name: "Revenue", exact: true }).click();
  await expect(
    page.locator(".revenue-totals > div").first().locator("dd").first(),
  ).toHaveText("$80.00");
  await page
    .locator(".revenue-disclosure")
    .filter({ hasText: "Win/loss reasons & revenue attribution" })
    .locator("summary")
    .click();
  await expect(page.locator(".revenue-analysis-columns")).toContainText(
    "Summer launch",
  );
  await expect(page.locator(".revenue-analysis-columns")).toContainText(
    "instagram",
  );
});

test("keeps unconfirmed BANT unknown and only drafts a recommended next action", async ({
  page,
}) => {
  await register(page);
  await addLead(page);
  await page
    .locator(".deal-evidence > summary")
    .filter({ hasText: "Why this score?" })
    .click();
  await expect(page.locator(".deal-bant-summary")).toContainText("unknown");
  await page.getByRole("button", { name: "Use suggested action" }).click();
  await expect(
    page.getByRole("textbox", { name: "Message Sofia Revenue" }),
  ).not.toHaveValue("");
  await expect(page.locator(".chat-message.outgoing")).toHaveCount(0);
  await page.getByRole("button", { name: "Use suggested action" }).click();
  await expect(
    page.locator(".deal-intelligence-content").getByRole("alert"),
  ).toContainText("existing draft was kept");
});

test("prepares an approved quote snapshot and books an internal appointment with ICS export", async ({
  page,
}) => {
  await register(page);
  await approvedProduct(page);
  await addLead(page);
  await page
    .getByRole("combobox", { name: "Deal actions", exact: true })
    .selectOption("quote");
  await page
    .getByRole("combobox", { name: "Approved product / service" })
    .selectOption({ label: "Olive linen set · $80.00" });
  await page.getByRole("spinbutton", { name: "Quantity" }).fill("2");
  await page
    .getByRole("button", { name: "Prepare quote", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Deal actions", exact: true })
    .selectOption("book");
  await page
    .getByRole("button", { name: "Record internal appointment" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator(".deal-evidence > summary")
    .filter({ hasText: "Quotes, appointments & deal history" })
    .click();
  await expect(page.locator(".deal-workflow-item")).toContainText([
    "Quote · $160.00",
    "Consultation · confirmed",
  ]);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Calendar file" }).click();
  expect((await downloadEvent).suggestedFilename()).toBe(
    "dmcloser-appointment.ics",
  );
  await expect(page.locator(".deal-workflow-item")).toContainText([
    "Quote",
    "internal booking",
  ]);
});

test("industry mode is explicit and escalation leaves messaging under human control", async ({
  page,
}) => {
  await register(page);
  await nav(page)
    .getByRole("button", { name: "Business Brain", exact: true })
    .click();
  await page.locator(".brain-context > summary").click();
  await page
    .getByRole("combobox", { name: "Industry mode" })
    .selectOption("medical");
  await expect(page.locator(".brain-context")).toContainText("Never diagnose");
  await nav(page).getByRole("button", { name: /Inbox/ }).click();
  await addLead(page);
  await page
    .getByRole("combobox", { name: "Deal actions", exact: true })
    .selectOption("escalate");
  await page
    .getByRole("textbox", { name: "Reason", exact: true })
    .fill("Needs a clinic specialist");
  await page
    .getByRole("button", { name: "Escalate to human", exact: true })
    .click();
  await expect(page.locator(".deal-risk-list")).toContainText(
    "Needs a clinic specialist",
  );
  await expect(
    page.getByRole("switch", { name: "Auto-send replies to Sofia Revenue" }),
  ).not.toBeChecked();
});

test("revenue and Brain remain readable and accessible on mobile in both themes", async ({
  page,
}) => {
  await register(page);
  await approvedProduct(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = page.getByRole("navigation", {
    name: "Mobile workspace navigation",
  });
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page.getByRole("button", { name: "Switch to dark mode" }).click();
    for (const name of ["Revenue", "Brain"]) {
      await mobile.getByRole("button", { name, exact: true }).click();
      await expect(page.locator(".revenue-page")).toBeVisible();
      await expect(page.locator(".revenue-loading")).toHaveCount(0);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map((item) => ({
          id: item.id,
          targets: item.nodes.map((node) => node.target),
        })),
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test("a concurrent opportunity update cannot silently overwrite an open editor", async ({
  page,
}) => {
  await register(page);
  await addLead(page);
  await page
    .getByRole("button", { name: "Edit opportunity", exact: true })
    .click();
  const snapshot = await (
    await page.request.get(`${backend}/api/bootstrap`)
  ).json();
  const detail = await (
    await page.request.get(
      `${backend}/api/conversations/${snapshot.conversations[0].id}/deal`,
    )
  ).json();
  await mutate(
    page,
    `/deals/${detail.deal.id}`,
    { version: detail.deal.version, valueMinor: 25000 },
    "PATCH",
  );
  await page
    .getByRole("textbox", { name: "Confirmed deal value", exact: true })
    .fill("80.00");
  await page
    .getByRole("button", { name: "Save opportunity", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "opportunity changed",
  );
  const latest = await (
    await page.request.get(
      `${backend}/api/conversations/${snapshot.conversations[0].id}/deal`,
    )
  ).json();
  expect(latest.deal.valueMinor).toBe(25000);
});
