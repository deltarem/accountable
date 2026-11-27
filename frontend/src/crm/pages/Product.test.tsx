import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { queryDefaults } from "../../lib/queryDefaults";
import { mockApi, user } from "../../test-utils";
import type { ProductDetail } from "../queries";
import { Product } from "./Product";

const ALEX = { id: "alex", name: "Alex Rivera" };
const DANA = { id: "dana", name: "Dana Whitfield" };

const TRAINING: ProductDetail = {
  id: 7,
  name: "On-site training day",
  description: "A full day at the customer's site.\nUp to 12 people.",
  unit_price_cents: 145000,
  active: true,
  created_at: "2026-10-12T12:00:00Z",
  created_by: ALEX,
  updated_at: "2026-10-30T12:00:00Z",
  updated_by: DANA,
};

function show(address: string) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: queryDefaults })}>
      <MemoryRouter initialEntries={[address]}>
        <Routes>
          <Route path="/products/:id" element={<Product />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function showTraining(product: Partial<ProductDetail> = {}, routes: Record<string, unknown> = {}) {
  const calls = mockApi({ "GET /products/7": { ...TRAINING, ...product }, ...routes });
  show("/products/7");
  await screen.findByRole("heading", { level: 1, name: product.name ?? TRAINING.name });
  return calls;
}

function details() {
  return within(screen.getByRole("region", { name: "Details" }));
}

/** What the details panel shows beside, or under, a label. */
function detail(label: string) {
  return details().getByText(label).nextElementSibling?.textContent;
}

describe("a product's page", () => {
  it("names the product and shows its price in dollars and cents, and its description", async () => {
    await showTraining();
    expect(document.title).toBe("On-site training day | Accountable");
    expect(detail("Unit price")).toBe("$1,450.00");
    expect(detail("Description")).toBe("A full day at the customer's site.\nUp to 12 people.");
    expect(screen.queryByText("Archived")).toBeNull();
  });

  it("shows None for a product with no description", async () => {
    await showTraining({ description: null });
    expect(detail("Description")).toBe("None");
  });

  it("says who added it and who last changed it, and when", async () => {
    await showTraining();
    expect(details().getByText(/^Added by/).textContent).toBe("Added by Alex Rivera on Oct 12, 2026");
    expect(details().getByText(/^Last changed/).textContent).toBe("Last changed by Dana Whitfield on Oct 30, 2026");
  });

  it("has no timeline", async () => {
    await showTraining();
    expect(screen.queryByRole("button", { name: "Log activity" })).toBeNull();
    expect(screen.queryByText("Nothing logged yet.")).toBeNull();
  });

  it("Edit opens the product's form, filled in, with the price as it was typed", async () => {
    await showTraining();
    await user().click(screen.getByRole("button", { name: "Edit" }));
    const form = within(await screen.findByRole("dialog", { name: "Edit product" }));
    expect((form.getByLabelText("Name") as HTMLInputElement).value).toBe("On-site training day");
    expect((form.getByLabelText("Unit price") as HTMLInputElement).value).toBe("1450.00");
  });
});

describe("archiving and restoring from the page", () => {
  it("Archive archives it, says so and shows it archived, staying on the page", async () => {
    let archived = false;
    const calls = mockApi({
      "GET /products/7": () => ({ body: { ...TRAINING, active: !archived } }),
      "PATCH /products/7": (body: unknown) => {
        archived = !(body as { active: boolean }).active;
        return { body: { ...TRAINING, active: !archived } };
      },
    });
    const success = vi.spyOn(toast, "success");
    show("/products/7");
    await user().click(await screen.findByRole("button", { name: "Archive" }));

    await waitFor(() => expect(success).toHaveBeenCalledWith("On-site training day archived."));
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({ active: false });
    expect(await screen.findByRole("button", { name: "Restore" })).toBeTruthy();
    expect(screen.getByText("Archived")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "On-site training day" })).toBeTruthy();
  });

  it("an archived product has its chip and Restore, which restores it", async () => {
    const success = vi.spyOn(toast, "success");
    const calls = await showTraining({ active: false }, { "PATCH /products/7": { ...TRAINING, active: true } });
    expect(screen.getByText("Archived")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
    await user().click(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(success).toHaveBeenCalledWith("On-site training day restored."));
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({ active: true });
  });

  it("sends once however quickly it's pressed", async () => {
    const success = vi.spyOn(toast, "success");
    const calls = await showTraining({}, { "PATCH /products/7": { ...TRAINING, active: false } });
    const archive = screen.getByRole("button", { name: "Archive" });
    archive.click();
    archive.click();
    await waitFor(() => expect(success).toHaveBeenCalled());
    expect(calls.filter((call) => call.method === "PATCH")).toHaveLength(1);
  });

  it("says so if it can't be saved, and leaves the product as it was", async () => {
    const failure = vi.spyOn(toast, "error");
    await showTraining({}, { "PATCH /products/7": () => ({ status: 500, body: { detail: "Something went wrong." } }) });
    await user().click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() =>
      expect(failure).toHaveBeenCalledWith("Couldn't archive On-site training day, so it's still active."),
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Archive" })).toBeTruthy());
    expect(screen.queryByText("Archived")).toBeNull();
  });
});

describe("a product that can't be shown", () => {
  it("says so when it no longer exists, with a link back to Products", async () => {
    mockApi({});
    show("/products/99");
    expect(await screen.findByRole("heading", { name: "This product no longer exists" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to Products" }).getAttribute("href")).toBe("/products");
  });

  it("says so for an address that couldn't be a product, without asking the backend", () => {
    const calls = mockApi({});
    show("/products/abc");
    expect(screen.getByRole("heading", { name: "This product no longer exists" })).toBeTruthy();
    expect(calls).toEqual([]);
  });
});
