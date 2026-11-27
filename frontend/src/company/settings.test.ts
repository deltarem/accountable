import { describe, expect, it } from "vitest";

import cases from "../../../shared/company-settings-cases.json";
import { MESSAGES, changes, formValues, schema, type CompanySettings, type SettingsValues } from "./settings";

type Field = keyof typeof MESSAGES;
type Case = { typed: string; saved?: unknown };

const SETTINGS: CompanySettings = {
  company_name: "Fieldstone Digital",
  address: "48 Larkspur Avenue, Suite 210\nBrooklyn, NY 11201",
  email: "hello@fieldstone.example",
  phone: null,
  tax_label: "Sales tax",
  tax_rate: "8.875",
  payment_terms_days: 30,
  quote_prefix: "QT-",
  invoice_prefix: "INV-",
  updated_at: "2026-11-20T15:00:00Z",
  updated_by: { id: "teammate-dana-whitfield", name: "Dana Whitfield" },
};

const fields = cases.fields as Record<string, { accepted: Case[]; refused: Case[] }>;

function checked(field: string, typed: string) {
  return schema.safeParse({ ...formValues(SETTINGS), [field]: typed });
}

describe("the rules, from the cases the backend uses too", () => {
  it("uses the backend's messages", () => {
    expect(MESSAGES).toEqual(cases.messages);
  });

  const accepted = Object.entries(fields).flatMap(([field, both]) => both.accepted.map((one) => [field, one] as const));
  it.each(accepted)("accepts %s typed as %j", (field, { typed }) => {
    expect(checked(field, typed).success).toBe(true);
  });

  const refused = Object.entries(fields).flatMap(([field, both]) => both.refused.map((one) => [field, one] as const));
  it.each(refused)("refuses %s typed as %j, with its message", (field, { typed }) => {
    const result = checked(field, typed);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => [issue.path.join("."), issue.message])).toEqual([
      [field, MESSAGES[field as Field]],
    ]);
  });
});

describe("the body a save sends", () => {
  function parsed(values: Partial<SettingsValues>): SettingsValues {
    return schema.parse({ ...formValues(SETTINGS), ...values });
  }

  it("holds only the fields that changed", () => {
    const values = parsed({ phone: "(718) 555-0134", tax_rate: "8.5" });
    expect(changes(values, { phone: true, tax_rate: true })).toEqual({ phone: "(718) 555-0134", tax_rate: "8.5" });
  });

  it("keeps the tax rate as the text typed, without its spaces, so it never becomes a floating-point number", () => {
    expect(changes(parsed({ tax_rate: " 8.875 " }), { tax_rate: true })).toEqual({ tax_rate: "8.875" });
  });

  it("sends payment terms as a whole number and a blank optional field as null", () => {
    expect(changes(parsed({ payment_terms_days: "45", email: "" }), { payment_terms_days: true, email: true })).toEqual(
      { payment_terms_days: 45, email: null },
    );
  });

  it("is empty when nothing changed", () => {
    expect(changes(parsed({}), {})).toEqual({});
  });
});

describe("the form's values", () => {
  it("come from the reply, with blank optional fields as empty text and payment terms as text", () => {
    expect(formValues(SETTINGS)).toEqual({
      company_name: "Fieldstone Digital",
      address: "48 Larkspur Avenue, Suite 210\nBrooklyn, NY 11201",
      email: "hello@fieldstone.example",
      phone: "",
      tax_label: "Sales tax",
      tax_rate: "8.875",
      payment_terms_days: "30",
      quote_prefix: "QT-",
      invoice_prefix: "INV-",
    });
  });
});
