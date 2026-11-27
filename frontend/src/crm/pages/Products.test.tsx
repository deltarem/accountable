import { screen, waitFor, within } from "@testing-library/react";
import { useLocation } from "react-router";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { firstColumn, mockApi, renderApp, user } from "../../test-utils";
import type { ProductRow } from "../queries";
import { Products } from "./Products";

function product(id: number, name: string, extra: Partial<ProductRow> = {}): ProductRow {
  return { id, name, description: null, unit_price_cents: 10000, active: true, ...extra };
}

const LICENSE = product(1, "Platform license, per user per year", {
  description: "One person's use of Accountable for a year",
  unit_price_cents: 48000,
});
const TABLET = product(2, "Tablet kit", { description: "A tablet with a stand", unit_price_cents: 38999 });
const TRAINING = product(3, "On-site training day", { unit_price_cents: 145000 });
const BASIC = product(4, "Basic support plan", { unit_price_cents: 240000, active: false });
const PRODUCTS = [LICENSE, TABLET, TRAINING, BASIC];

function Address() {
  const location = useLocation();
  return <output data-testid="address">{location.pathname + location.search}</output>;
}

async function showProducts(
  rows: ProductRow[] = PRODUCTS,
  routes: Record<string, unknown> = {},
  address = "/products",
) {
  const calls = mockApi({ "GET /products": rows, ...routes });
  renderApp(
    <>
      <Products />
      <Address />
    </>,
    address,
  );
  await screen.findByRole("heading", { level: 1, name: "Products" });
  return calls;
}

function address() {
  return screen.getByTestId("address").textContent;
}

function view(name: string) {
  return within(screen.getByRole("group", { name: "Show products" })).getByRole("button", {
    name: new RegExp(`^${name}`),
  });
}

async function rowOf(name: string) {
  return within(await screen.findByRole("row", { name: new RegExp(`^${name}`) }));
}

describe("the products table", () => {
  it("lists active products by name, each with its price in dollars and cents, linking to its page", async () => {
    await showProducts();
    await screen.findByRole("link", { name: "Tablet kit" });
    expect(document.title).toBe("Products | Accountable");
    expect(firstColumn()).toEqual(["On-site training day", "Platform license, per user per year", "Tablet kit"]);
    expect((await rowOf("Tablet kit")).getByText("$389.99")).toBeTruthy();
    expect((await rowOf("On-site training day")).getByText("$1,450.00")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tablet kit" }).getAttribute("href")).toBe("/products/2");
  });

  it("puts prices on the right, after the description", async () => {
    await showProducts();
    const headings = (await screen.findAllByRole("columnheader")).map((heading) => heading.textContent);
    expect(headings.slice(0, 3)).toEqual(["Name", "Description", "Unit price"]);
    expect(screen.getByRole("columnheader", { name: "Unit price" }).className).toContain("text-right");
  });

  it("sorts by price as an amount, so $389.99 comes before $1,450.00", async () => {
    await showProducts();
    await user().click(await screen.findByRole("button", { name: "Unit price" }));
    expect(firstColumn()).toEqual(["Tablet kit", "Platform license, per user per year", "On-site training day"]);
  });

  it("finds a product by a word in its description", async () => {
    await showProducts();
    await user().type(await screen.findByRole("searchbox"), "stand");
    expect(firstColumn()).toEqual(["Tablet kit"]);
  });

  it("opens a product's page when its row is clicked", async () => {
    await showProducts();
    await user().click((await rowOf("Tablet kit")).getByText("$389.99"));
    expect(address()).toBe("/products/2");
  });
});

describe("the filter", () => {
  it("starts on Active, with a count for each view", async () => {
    await showProducts();
    expect(await within(view("Active")).findByText("3")).toBeTruthy();
    expect(view("Active").getAttribute("aria-pressed")).toBe("true");
    expect(within(view("Archived")).getByText("1")).toBeTruthy();
    expect(within(view("All")).getByText("4")).toBeTruthy();
  });

  it("shows archived products under Archived, keeping the choice in the address", async () => {
    await showProducts();
    await user().click(view("Archived"));
    expect(firstColumn()).toEqual(["Basic support plan"]);
    expect(address()).toBe("/products?show=archived");
  });

  it("shows every product under All, with an Archived chip after an archived one's name", async () => {
    await showProducts();
    await user().click(view("All"));
    expect(address()).toBe("/products?show=all");
    expect(firstColumn()).toEqual([
      "Basic support planArchived",
      "On-site training day",
      "Platform license, per user per year",
      "Tablet kit",
    ]);
  });

  it("goes back to Active when a search with no matches is cleared", async () => {
    await showProducts(PRODUCTS, {}, "/products?show=archived&q=zzz");
    await user().click(await screen.findByRole("button", { name: "Clear search" }));
    expect(address()).toBe("/products");
  });

  it("says when there are no archived products", async () => {
    await showProducts([LICENSE], {}, "/products?show=archived");
    expect(await screen.findByText("No archived products.")).toBeTruthy();
  });

  it("says when every product is archived, rather than inviting the first", async () => {
    await showProducts([BASIC]);
    expect(await screen.findByText("No active products.")).toBeTruthy();
    expect(screen.queryByText("No products yet. Add the first one.")).toBeNull();
  });

  it("invites the first product when there are none at all", async () => {
    await showProducts([]);
    expect(await screen.findByText("No products yet. Add the first one.")).toBeTruthy();
  });
});

describe("archiving and restoring from a row", () => {
  it("Archive sends it, says so, and the product leaves the Active view", async () => {
    let rows = PRODUCTS;
    const success = vi.spyOn(toast, "success");
    const calls = await showProducts(PRODUCTS, {
      "GET /products": () => ({ body: rows }),
      "PATCH /products/2": () => {
        rows = PRODUCTS.map((row) => (row.id === 2 ? { ...row, active: false } : row));
        return { body: { ...TABLET, active: false } };
      },
    });
    await user().click(await screen.findByRole("button", { name: "Archive Tablet kit" }));

    await waitFor(() => expect(success).toHaveBeenCalledWith("Tablet kit archived."));
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({ active: false });
    await waitFor(() => expect(screen.queryByRole("link", { name: "Tablet kit" })).toBeNull());
  });

  it("Restore sends it and says so", async () => {
    const success = vi.spyOn(toast, "success");
    const calls = await showProducts(
      PRODUCTS,
      { "PATCH /products/4": { ...BASIC, active: true } },
      "/products?show=all",
    );
    await user().click(await screen.findByRole("button", { name: "Restore Basic support plan" }));
    await waitFor(() => expect(success).toHaveBeenCalledWith("Basic support plan restored."));
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({ active: true });
  });

  it("sends once however quickly it's pressed", async () => {
    const success = vi.spyOn(toast, "success");
    const calls = await showProducts(PRODUCTS, { "PATCH /products/2": { ...TABLET, active: false } });
    const archive = await screen.findByRole("button", { name: "Archive Tablet kit" });
    archive.click();
    archive.click();
    await waitFor(() => expect(success).toHaveBeenCalled());
    expect(calls.filter((call) => call.method === "PATCH")).toHaveLength(1);
  });

  it("says so if it can't be saved, and puts nothing back", async () => {
    const failure = vi.spyOn(toast, "error");
    await showProducts(PRODUCTS, {
      "PATCH /products/2": () => ({ status: 500, body: { detail: "Something went wrong." } }),
    });
    await user().click(await screen.findByRole("button", { name: "Archive Tablet kit" }));
    await waitFor(() => expect(failure).toHaveBeenCalledWith("Couldn't archive Tablet kit, so it's still active."));
    expect(screen.getByRole("link", { name: "Tablet kit" })).toBeTruthy();
  });
});
