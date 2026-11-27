import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { api } from "../lib/api";
import { EMAIL_MESSAGE, isEmail } from "../lib/validate";

/** The company settings as the API sends them (B3). The tax rate is text, such as "8.875", so it stays exact. */
export type CompanySettings = {
  company_name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  tax_label: string | null;
  tax_rate: string;
  payment_terms_days: number;
  quote_prefix: string;
  invoice_prefix: string;
  updated_at: string;
  updated_by: { id: string; name: string } | null;
};

type Field = Exclude<keyof CompanySettings, "updated_at" | "updated_by">;

export const MESSAGES = {
  company_name: "Enter the company name",
  email: EMAIL_MESSAGE,
  tax_rate: "Enter a percentage from 0 to 100, with up to 3 decimal places",
  payment_terms_days: "Enter a whole number of days from 0 to 365",
  quote_prefix: "Use 1 to 10 letters, digits or hyphens, such as QT-",
  invoice_prefix: "Use 1 to 10 letters, digits or hyphens, such as INV-",
} as const;

// The backend checks these too and has the last word.
const TAX_RATE = /^(\d+(\.\d{0,3})?|\.\d{1,3})$/;
const WHOLE_NUMBER = /^\d+$/;
const PREFIX = /^[A-Za-z0-9-]{1,10}$/;
const MAX_TAX_RATE = 100;
const MAX_PAYMENT_TERMS = 365;

function prefix(message: string) {
  return z.string().trim().regex(PREFIX, message);
}

export const schema = z.object({
  company_name: z.string().trim().min(1, MESSAGES.company_name),
  address: z.string().trim(),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || isEmail(value), MESSAGES.email),
  phone: z.string().trim(),
  tax_label: z.string().trim(),
  tax_rate: z
    .string()
    .trim()
    .refine((value) => TAX_RATE.test(value) && Number(value) <= MAX_TAX_RATE, MESSAGES.tax_rate),
  payment_terms_days: z
    .string()
    .trim()
    .refine((value) => WHOLE_NUMBER.test(value) && Number(value) <= MAX_PAYMENT_TERMS, MESSAGES.payment_terms_days),
  quote_prefix: prefix(MESSAGES.quote_prefix),
  invoice_prefix: prefix(MESSAGES.invoice_prefix),
});

/** What the form holds: every field as the text in its box. */
export type SettingsValues = z.infer<typeof schema>;

export type SettingsChanges = Partial<Record<Field, string | number | null>>;

const OPTIONAL: Field[] = ["address", "email", "phone", "tax_label"];

export function formValues(settings: CompanySettings): SettingsValues {
  return {
    company_name: settings.company_name,
    address: settings.address ?? "",
    email: settings.email ?? "",
    phone: settings.phone ?? "",
    tax_label: settings.tax_label ?? "",
    tax_rate: settings.tax_rate,
    payment_terms_days: String(settings.payment_terms_days),
    quote_prefix: settings.quote_prefix,
    invoice_prefix: settings.invoice_prefix,
  };
}

/**
 * Only the fields that changed, so two people changing different fields both keep
 * their change (B8). A blank optional field is sent as null.
 */
export function changes(values: SettingsValues, changed: Partial<Record<Field, boolean | undefined>>): SettingsChanges {
  const body: SettingsChanges = {};
  for (const field of Object.keys(values) as Field[]) {
    if (!changed[field]) continue;
    const value = values[field];
    if (field === "payment_terms_days") body[field] = Number(value);
    else if (OPTIONAL.includes(field)) body[field] = value || null;
    else body[field] = value;
  }
  return body;
}

export function useCompanySettings() {
  return useQuery({ queryKey: ["company-settings"], queryFn: () => api<CompanySettings>("/settings") });
}

export function useSaveCompanySettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SettingsChanges) => api<CompanySettings>("/settings", { method: "PATCH", body }),
    onSuccess: () => client.invalidateQueries(),
  });
}
