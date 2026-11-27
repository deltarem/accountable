import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { SIGNED_IN, resetToSampleData, signInAs } from "./helpers";

// Every test starts from the made-up company's settings, and puts them back for the next file (B11).
test.beforeEach(resetToSampleData);

const DANA = { id: "teammate-dana-whitfield", name: "Dana Whitfield" };
const MESSAGES = {
  company_name: "Enter the company name",
  tax_rate: "Enter a percentage from 0 to 100, with up to 3 decimal places",
  payment_terms_days: "Enter a whole number of days from 0 to 365",
  quote_prefix: "Use 1 to 10 letters, digits or hyphens, such as QT-",
};

/** Today's date as the page shows it, such as Nov 3, 2026. */
function today() {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function box(page: Page, label: string) {
  return page.getByLabel(label, { exact: true });
}

function lastChanged(page: Page) {
  return page.getByText(/^(Last changed by .+ on .+|Nobody has changed these yet\.)$/);
}

/** Opens the page and waits for the saved settings to fill it. */
async function openSettings(page: Page) {
  await page.goto("/settings");
  await expect(box(page, "Company name")).not.toHaveValue("");
}

function save(page: Page) {
  return page.getByRole("button", { name: "Save settings" });
}

/** Saves, and waits for the backend's reply. */
async function saved(page: Page) {
  const reply = page.waitForResponse(
    (response) => response.url().endsWith("/api/settings") && response.request().method() === "PATCH",
  );
  await save(page).click();
  expect((await reply).status()).toBe(200);
  await expect(page.getByText("Settings saved.")).toBeVisible();
}

test("the menu opens the Company settings page with the made-up company", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("banner")
    .getByRole("button", { name: `Menu for ${SIGNED_IN.name}` })
    .click();
  await page.getByRole("menuitem", { name: "Company settings" }).click();

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { level: 1, name: "Company settings" })).toBeVisible();
  await expect(box(page, "Company name")).toHaveValue("Fieldstone Digital");
  await expect(box(page, "Address")).toHaveValue("48 Larkspur Avenue, Suite 210\nBrooklyn, NY 11201");
  await expect(box(page, "Email")).toHaveValue("hello@fieldstone.example");
  await expect(box(page, "Phone")).toHaveValue("(718) 555-0134");
  await expect(box(page, "Tax label")).toHaveValue("Sales tax");
  await expect(box(page, "Tax rate")).toHaveValue("8.875");
  await expect(box(page, "Payment terms")).toHaveValue("30");
  await expect(box(page, "Quote prefix")).toHaveValue("QT-");
  await expect(box(page, "Invoice prefix")).toHaveValue("INV-");
  await expect(lastChanged(page)).toHaveText(
    /^Last changed by (Alex Rivera|Dana Whitfield|Theo Brandt|robin@accountable\.example) on /,
  );
  // It isn't one of the five sections, so none shows as current.
  await expect(page.getByRole("navigation", { name: "Sections" }).locator("[aria-current]")).toHaveCount(0);

  await page.reload();
  await expect(box(page, "Company name")).toHaveValue("Fieldstone Digital");
});

test("saved settings are what every teammate sees", async ({ page, browser, requestAs }) => {
  await openSettings(page);
  await box(page, "Company name").fill("Harbor Works");
  await box(page, "Address").fill("12 Quay Street\nPortland, ME 04101");
  await box(page, "Tax rate").fill("8.875");
  await box(page, "Payment terms").fill("45");
  await saved(page);

  await expect(lastChanged(page)).toHaveText(`Last changed by ${SIGNED_IN.name} on ${today()}`);
  await page.reload();
  await expect(box(page, "Company name")).toHaveValue("Harbor Works");
  await expect(box(page, "Address")).toHaveValue("12 Quay Street\nPortland, ME 04101");
  await expect(box(page, "Payment terms")).toHaveValue("45");

  const danasPage = await browser.newPage({ baseURL: page.url() });
  try {
    await danasPage.goto("/");
    await signInAs(danasPage, DANA.id);
    await openSettings(danasPage);
    await expect(box(danasPage, "Company name")).toHaveValue("Harbor Works");
    await expect(box(danasPage, "Payment terms")).toHaveValue("45");
    await expect(lastChanged(danasPage)).toHaveText(`Last changed by ${SIGNED_IN.name} on ${today()}`);
  } finally {
    await danasPage.close();
  }

  const danasApi = await requestAs(DANA.name);
  expect((await (await danasApi.get("/api/settings")).json()).company_name).toBe("Harbor Works");
});

test("the page refuses values out of range, beside each field, and sends nothing", async ({ page }) => {
  await openSettings(page);
  let sent = 0;
  page.on("request", (request) => {
    if (request.method() === "PATCH" && request.url().endsWith("/api/settings")) sent += 1;
  });

  await box(page, "Company name").fill("");
  await box(page, "Tax rate").fill("150");
  await box(page, "Payment terms").fill("400");
  await box(page, "Quote prefix").fill("Q T");
  await save(page).click();

  for (const message of Object.values(MESSAGES)) await expect(page.getByText(message)).toBeVisible();
  await expect(box(page, "Tax rate")).toHaveAttribute("aria-invalid", "true");
  expect(sent).toBe(0);

  await page.reload();
  await expect(box(page, "Tax rate")).toHaveValue("8.875");
  await expect(box(page, "Payment terms")).toHaveValue("30");
});

test("the API refuses values out of range, with a message for each", async ({ request }) => {
  const reply = await request.patch("/api/settings", { data: { tax_rate: "150", payment_terms_days: 400 } });
  expect(reply.status()).toBe(422);
  expect((await reply.json()).fields).toEqual({
    tax_rate: MESSAGES.tax_rate,
    payment_terms_days: MESSAGES.payment_terms_days,
  });

  const settings = await (await request.get("/api/settings")).json();
  expect([settings.tax_rate, settings.payment_terms_days]).toEqual(["8.875", 30]);
});

test("a save with nothing changed leaves who and when alone", async ({ page, requestAs }) => {
  const danasApi = await requestAs(DANA.name);
  expect((await danasApi.patch("/api/settings", { data: { phone: "(718) 555-0101" } })).status()).toBe(200);

  await openSettings(page);
  await expect(lastChanged(page)).toHaveText(`Last changed by ${DANA.name} on ${today()}`);
  await save(page).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  await page.reload();
  await expect(lastChanged(page)).toHaveText(`Last changed by ${DANA.name} on ${today()}`);
});

test("typing survives a teammate's save, and the rest of the page takes it", async ({ page, requestAs }) => {
  await openSettings(page);
  await box(page, "Phone").fill("(718) 555-0199");

  const danasApi = await requestAs(DANA.name);
  await danasApi.patch("/api/settings", { data: { email: "billing@fieldstone.example" } });
  const reread = page.waitForResponse(
    (response) => response.url().endsWith("/api/settings") && response.request().method() === "GET",
  );
  // What the browser does when someone comes back to the window, which is when TanStack Query reads again.
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange", { bubbles: true })));
  await reread;

  await expect(box(page, "Email")).toHaveValue("billing@fieldstone.example");
  await expect(box(page, "Phone")).toHaveValue("(718) 555-0199");
  await expect(lastChanged(page)).toHaveText(`Last changed by ${DANA.name} on ${today()}`);

  await saved(page);
  const settings = await (await danasApi.get("/api/settings")).json();
  expect([settings.email, settings.phone]).toEqual(["billing@fieldstone.example", "(718) 555-0199"]);
});

test("a failed read shows Try again and no form", async ({ page, expectConsoleError }) => {
  expectConsoleError(/500 \(Internal Server Error\)/);
  const broken = { on: true };
  await page.route(
    (url) => url.pathname === "/api/settings",
    (route) =>
      broken.on
        ? route.fulfill({ status: 500, contentType: "application/json", body: '{"detail":"Something went wrong."}' })
        : route.continue(),
  );

  await page.goto("/settings");
  await expect(page.getByText("Couldn't load this.")).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);

  broken.on = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(box(page, "Company name")).toHaveValue("Fieldstone Digital");
});

test("the page works by keyboard", async ({ page }) => {
  await page.goto("/");
  const menuButton = page.getByRole("banner").getByRole("button", { name: `Menu for ${SIGNED_IN.name}` });
  await expect(menuButton).toBeVisible();
  await menuButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitemradio", { name: "Light" })).toBeFocused();
  for (const next of [
    page.getByRole("menuitemradio", { name: "Dark" }),
    page.getByRole("menuitemradio", { name: "System" }),
    page.getByRole("menuitem", { name: "Company settings" }),
  ]) {
    await page.keyboard.press("ArrowDown");
    await expect(next).toBeFocused();
  }
  await page.keyboard.press("Enter");
  await expect(box(page, "Company name")).toHaveValue("Fieldstone Digital");

  await box(page, "Company name").focus();
  const order = [
    "Address",
    "Email",
    "Phone",
    "Tax label",
    "Tax rate",
    "Payment terms",
    "Quote prefix",
    "Invoice prefix",
  ];
  for (const label of order) {
    await page.keyboard.press("Tab");
    await expect(box(page, label)).toBeFocused();
    await expect(box(page, label)).toHaveCSS("outline-style", "solid");
  }
  await page.keyboard.press("Tab");
  await expect(save(page)).toBeFocused();
  await expect(save(page)).toHaveCSS("outline-style", "solid");

  await box(page, "Tax rate").fill("7.25");
  const reply = page.waitForResponse((response) => response.request().method() === "PATCH");
  await box(page, "Tax rate").press("Enter");
  expect((await reply).status()).toBe(200);
  await expect(page.getByText("Settings saved.")).toBeVisible();
  await expect(box(page, "Tax rate")).toHaveValue("7.25");
});
