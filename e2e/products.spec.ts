import type { APIRequestContext, Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { API, SIGNED_IN, emptyDatabase, resetToSampleData } from "./helpers";

// The price list (G1 to G11), on a database holding only what each test adds, apart from the first.

test.beforeEach(emptyDatabase);

type Product = { id: number; name: string };

async function addProduct(request: APIRequestContext, name: string, unit_price_cents: number, values: object = {}) {
  const reply = await request.post(`${API}/products`, { data: { name, unit_price_cents, ...values } });
  expect(reply.ok(), await reply.text()).toBe(true);
  return (await reply.json()) as Product;
}

function dialog(page: Page) {
  return page.getByRole("dialog");
}

function row(page: Page, name: string) {
  return page.getByRole("row", { name: new RegExp(`^${name}`) });
}

function heading(page: Page, name: string) {
  return page.getByRole("heading", { level: 1, name });
}

function searchBox(page: Page) {
  return page.getByRole("combobox", { name: "Search organizations, contacts, deals and products" });
}

function savedProduct(page: Page, method: "POST" | "PATCH") {
  return page.waitForResponse((reply) => reply.url().includes("/api/products") && reply.request().method() === method);
}

async function fillForm(page: Page, name: string, price: string) {
  await dialog(page).getByLabel("Name").fill(name);
  await dialog(page).getByLabel("Unit price").fill(price);
}

test("Products in the top bar opens the table, with the sample products and their prices in dollars and cents", async ({
  page,
}) => {
  resetToSampleData();
  await page.goto("/");
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Products" }).click();

  await expect(page).toHaveURL("/products");
  await expect(heading(page, "Products")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await expect(row(page, "Custom report")).toContainText("$649.50");
  await expect(row(page, "Tablet kit for taprooms and counters")).toContainText("$389.99");
  await expect(row(page, "Group-wide license, per site per year")).toContainText("$9,600.00");
  await expect(row(page, "Basic support plan, per year")).toHaveCount(0);
});

test("a product added with a price of 49.5 shows as $49.50, with who added it, and an edit shows who changed it", async ({
  page,
  requestAs,
}) => {
  await page.goto("/products");
  await page.getByRole("button", { name: "Add product" }).first().click();
  await fillForm(page, "Training day", "49.5");
  await dialog(page).getByLabel("Description").fill("A full day on site.\nUp to 12 people.");
  const added = savedProduct(page, "POST");
  await dialog(page).getByRole("button", { name: "Save product" }).click();
  await added;
  await expect(page.getByText("Product saved.")).toBeVisible();
  await expect(row(page, "Training day")).toContainText("$49.50");

  await page.getByRole("link", { name: "Training day" }).click();
  await expect(heading(page, "Training day")).toBeVisible();
  const details = page.getByRole("region", { name: "Details" });
  await expect(details).toContainText("$49.50");
  await expect(details).toContainText(`Added by ${SIGNED_IN.name} on`);
  await expect(details).not.toContainText("Last changed");

  // Someone else's edit, so the page shows who last changed it.
  const id = Number(page.url().split("/").at(-1));
  const dana = await requestAs("Dana Whitfield");
  expect((await dana.patch(`${API}/products/${id}`, { data: { unit_price_cents: 5000 } })).ok()).toBe(true);
  await page.reload();
  await expect(details).toContainText("$50.00");
  await expect(details).toContainText("Last changed by Dana Whitfield on");

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(dialog(page).getByLabel("Unit price")).toHaveValue("50.00");
  await fillForm(page, "Training day, full", "1,200");
  const edited = savedProduct(page, "PATCH");
  await dialog(page).getByRole("button", { name: "Save product" }).click();
  await edited;
  await expect(heading(page, "Training day, full")).toBeVisible();
  await expect(details).toContainText("$1,200.00");
  await expect(details).toContainText(`Last changed by ${SIGNED_IN.name} on`);
});

test("a name another product has in another case shows its message beside the name, keeping what was typed", async ({
  page,
  request,
}) => {
  await addProduct(request, "Training day", 145000);
  await page.goto("/products");
  await page.getByRole("button", { name: "Add product" }).first().click();
  await fillForm(page, "TRAINING DAY", "99");
  await dialog(page).getByRole("button", { name: "Save product" }).click();

  await expect(dialog(page).getByRole("alert")).toHaveText("There's already a product called Training day.");
  await expect(dialog(page).getByLabel("Name")).toHaveValue("TRAINING DAY");
  await expect(dialog(page).getByLabel("Unit price")).toHaveValue("99");
});

test("archiving from a row hides it from the Active view and the search box, and restoring from its page brings it back", async ({
  page,
  request,
}) => {
  await addProduct(request, "Training day", 145000);
  await addProduct(request, "Setup", 250000);
  await page.goto("/products");

  const archived = savedProduct(page, "PATCH");
  await page.getByRole("button", { name: "Archive Training day" }).click();
  await archived;
  await expect(page.getByText("Training day archived.")).toBeVisible();
  await expect(row(page, "Training day")).toHaveCount(0);

  await page
    .getByRole("group", { name: "Show products" })
    .getByRole("button", { name: /^Archived/ })
    .click();
  await expect(page).toHaveURL("/products?show=archived");
  await expect(row(page, "Training day")).toBeVisible();
  await page.getByRole("group", { name: "Show products" }).getByRole("button", { name: /^All/ }).click();
  await expect(row(page, "Training day")).toContainText("Archived");
  await expect(row(page, "Setup")).not.toContainText("Archived");

  await searchBox(page).fill("training");
  await expect(page.getByRole("status")).toHaveText('No organizations, contacts, deals or products match "training".');
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: "Training day" }).click();
  await expect(page.getByRole("button", { name: "Archive", exact: true })).toHaveCount(0);
  const restored = savedProduct(page, "PATCH");
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await restored;
  await expect(page.getByText("Training day restored.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Archive", exact: true })).toBeVisible();

  await searchBox(page).fill("training");
  await expect(
    page.getByRole("listbox", { name: "Search results" }).getByRole("option", { name: /^Training day/ }),
  ).toContainText("$1,450.00");
});

test("a name an archived product has gets the archived message", async ({ page, request }) => {
  const product = await addProduct(request, "Training day", 145000);
  expect((await request.patch(`${API}/products/${product.id}`, { data: { active: false } })).ok()).toBe(true);
  await page.goto("/products");
  await page.getByRole("button", { name: "Add product" }).first().click();
  await fillForm(page, "training day", "10");
  await dialog(page).getByRole("button", { name: "Save product" }).click();

  await expect(dialog(page).getByRole("alert")).toHaveText(
    "An archived product is already called Training day. Restore it or choose another name.",
  );
});

test("a product that doesn't exist says so", async ({ page, expectConsoleError }) => {
  expectConsoleError(/404/);
  await page.goto("/products/999999");
  await expect(heading(page, "This product no longer exists")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Products" })).toHaveAttribute("href", "/products");
});
