import { screen, within } from "@testing-library/react";
import { Toaster } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { mockApi, renderApp, user } from "../test-utils";
import { CompanySettings } from "./CompanySettings";
import { MESSAGES, type CompanySettings as Settings } from "./settings";

const SETTINGS: Settings = {
  company_name: "Fieldstone Digital",
  address: "48 Larkspur Avenue, Suite 210\nBrooklyn, NY 11201",
  email: "hello@fieldstone.example",
  phone: "(718) 555-0134",
  tax_label: "Sales tax",
  tax_rate: "8.875",
  payment_terms_days: 30,
  quote_prefix: "QT-",
  invoice_prefix: "INV-",
  updated_at: "2026-11-20T15:00:00Z",
  updated_by: { id: "teammate-dana-whitfield", name: "Dana Whitfield" },
};

const ALEX = { id: "teammate-alex-rivera", name: "Alex Rivera" };

function open() {
  return renderApp(
    <>
      <CompanySettings />
      <Toaster />
    </>,
  );
}

function box(label: string) {
  return screen.getByLabelText(label) as HTMLInputElement;
}

async function opened() {
  open();
  await screen.findByDisplayValue("Fieldstone Digital");
}

async function retype(label: string, text: string) {
  await user().clear(box(label));
  if (text) await user().type(box(label), text);
}

function patches(calls: { method: string; body: unknown }[]) {
  return calls.filter((call) => call.method === "PATCH").map((call) => call.body);
}

describe("the Company settings page", () => {
  it("shows the settings in their three groups, with who last changed them", async () => {
    mockApi({ "GET /settings": SETTINGS });
    await opened();

    const company = within(screen.getByRole("region", { name: "Company" }));
    expect((company.getByLabelText("Address") as HTMLTextAreaElement).value).toBe(SETTINGS.address);
    expect((company.getByLabelText("Email") as HTMLInputElement).value).toBe("hello@fieldstone.example");
    const tax = within(screen.getByRole("region", { name: "Tax and payment" }));
    expect((tax.getByLabelText("Tax rate") as HTMLInputElement).value).toBe("8.875");
    expect((tax.getByLabelText("Payment terms") as HTMLInputElement).value).toBe("30");
    const numbers = within(screen.getByRole("region", { name: "Document numbers" }));
    expect((numbers.getByLabelText("Invoice prefix") as HTMLInputElement).value).toBe("INV-");
    expect(screen.getByText(/Last changed by Dana Whitfield on/).textContent).toBe(
      "Last changed by Dana Whitfield on Nov 20, 2026",
    );
  });

  it("says nobody has changed settings nobody has changed", async () => {
    mockApi({ "GET /settings": { ...SETTINGS, updated_by: null } });
    await opened();
    expect(screen.getByText("Nobody has changed these yet.")).toBeTruthy();
  });

  it("shows each rule's message beside its field and sends nothing", async () => {
    const calls = mockApi({ "GET /settings": SETTINGS });
    await opened();

    await retype("Company name", "");
    await retype("Email", "hello");
    await retype("Tax rate", "150");
    await retype("Payment terms", "400");
    await retype("Quote prefix", "Q T");
    await retype("Invoice prefix", "INVOICE-2026");
    await user().click(screen.getByRole("button", { name: "Save settings" }));

    for (const message of Object.values(MESSAGES)) expect(await screen.findByText(message)).toBeTruthy();
    expect(box("Tax rate").getAttribute("aria-invalid")).toBe("true");
    expect(patches(calls)).toEqual([]);
  });

  it("sends only what changed, and then shows what was saved", async () => {
    let current = SETTINGS;
    const calls = mockApi({
      "GET /settings": () => ({ body: current }),
      "PATCH /settings": () => {
        current = { ...SETTINGS, tax_rate: "8.5", updated_by: ALEX, updated_at: "2026-11-26T10:00:00Z" };
        return { body: current };
      },
    });
    await opened();

    await retype("Tax rate", "8.50");
    await user().click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByText("Settings saved.")).toBeTruthy();
    expect(patches(calls)).toEqual([{ tax_rate: "8.50" }]);
    expect(box("Tax rate").value).toBe("8.5");
    expect(screen.getByText(/Last changed by Alex Rivera/)).toBeTruthy();
  });

  it("saves once however fast Save settings is pressed while the save is on its way", async () => {
    let reply: (value: Response) => void = () => {};
    const calls: unknown[] = [];
    mockApi({ "GET /settings": SETTINGS });
    const getOnly = globalThis.fetch;
    vi.stubGlobal("fetch", (url: string, init: RequestInit = {}) => {
      if (init.method !== "PATCH") return getOnly(url, init);
      calls.push(JSON.parse(String(init.body)));
      return new Promise<Response>((resolve) => (reply = resolve));
    });
    await opened();

    await retype("Tax rate", "8.5");
    const save = screen.getByRole("button", { name: "Save settings" });
    await user().click(save);
    await user().click(save);
    await user().keyboard("{Enter}");
    reply(new Response(JSON.stringify({ ...SETTINGS, tax_rate: "8.5" }), { status: 200 }));

    expect(await screen.findByText("Settings saved.")).toBeTruthy();
    expect(calls).toEqual([{ tax_rate: "8.5" }]);
  });

  it("sends nothing when nothing changed, so who changed them last stays as it was", async () => {
    const calls = mockApi({ "GET /settings": SETTINGS });
    await opened();

    await user().click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByText("Settings saved.")).toBeTruthy();
    expect(patches(calls)).toEqual([]);
    expect(screen.getByText(/Last changed by Dana Whitfield/)).toBeTruthy();
  });

  it("puts the backend's messages beside their fields", async () => {
    mockApi({
      "GET /settings": SETTINGS,
      "PATCH /settings": () => ({
        status: 422,
        body: { detail: "Check the form.", fields: { payment_terms_days: MESSAGES.payment_terms_days } },
      }),
    });
    await opened();

    await retype("Payment terms", "45");
    await user().click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByText(MESSAGES.payment_terms_days)).toBeTruthy();
    expect(box("Payment terms").value).toBe("45");
  });

  it("keeps what was typed when a save fails, and says so", async () => {
    mockApi({
      "GET /settings": SETTINGS,
      "PATCH /settings": () => ({ status: 500, body: { detail: "Something went wrong." } }),
    });
    await opened();

    await retype("Phone", "(718) 555-0199");
    await user().click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByText("Something went wrong.")).toBeTruthy();
    expect(box("Phone").value).toBe("(718) 555-0199");
  });

  it("keeps a field with unsaved changes when a teammate's save arrives, and takes the rest", async () => {
    let current = SETTINGS;
    mockApi({ "GET /settings": () => ({ body: current }) });
    const { client } = open();
    await screen.findByDisplayValue("Fieldstone Digital");

    await retype("Phone", "(718) 555-0199");
    current = { ...SETTINGS, email: "billing@fieldstone.example", phone: "(212) 555-0100", updated_by: ALEX };
    await client.invalidateQueries();

    expect(await screen.findByDisplayValue("billing@fieldstone.example")).toBeTruthy();
    expect(box("Phone").value).toBe("(718) 555-0199");
    expect(screen.getByText(/Last changed by Alex Rivera/)).toBeTruthy();
  });

  it("shows Try again and no form when the settings can't be read", async () => {
    let broken = true;
    mockApi({
      "GET /settings": () => (broken ? { status: 500, body: { detail: "Something went wrong." } } : { body: SETTINGS }),
    });
    open();

    expect(await screen.findByText("Couldn't load this.")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();

    broken = false;
    await user().click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByDisplayValue("Fieldstone Digital")).toBeTruthy();
  });

  it("saves on Enter in a one-line field, and starts a new line on Enter in the address", async () => {
    const calls = mockApi({ "GET /settings": SETTINGS, "PATCH /settings": () => ({ body: SETTINGS }) });
    await opened();

    await user().type(screen.getByLabelText("Address"), "{Enter}Floor 3");
    expect(patches(calls)).toEqual([]);
    expect((screen.getByLabelText("Address") as HTMLTextAreaElement).value).toBe(`${SETTINGS.address}\nFloor 3`);

    await user().type(box("Tax label"), " (NY){Enter}");
    expect(await screen.findByText("Settings saved.")).toBeTruthy();
    expect(patches(calls)).toEqual([{ address: `${SETTINGS.address}\nFloor 3`, tax_label: "Sales tax (NY)" }]);
  });

  it("marks the required fields for screen readers", async () => {
    mockApi({ "GET /settings": SETTINGS });
    await opened();
    for (const label of ["Company name", "Tax rate", "Payment terms", "Quote prefix", "Invoice prefix"]) {
      expect(box(label).getAttribute("aria-required")).toBe("true");
    }
    expect(box("Phone").getAttribute("aria-required")).toBeNull();
  });
});
