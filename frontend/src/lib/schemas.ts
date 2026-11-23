// zod schemas for the four forms (ARC-11). The payload schemas apply the same
// rules, with the same words, as backend/schemas.py; both are checked against
// shared/validation-cases.json. The form resolvers turn what was typed into a
// payload first (money text into cents, blanks into null), then validate it.

import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import { z } from 'zod';

import { parseMoney } from './money';

export const MSG = {
  name: 'Enter a name',
  nameLong: 'Use 200 characters or fewer',
  textLong: 'Use 5.000 characters or fewer',
  shortLong: 'Use 200 characters or fewer',
  email: 'Enter an email like name@company.com',
  organization: 'Choose an organization',
  status: 'Choose lead, qualified or customer',
  stage: 'Choose a stage',
  value: "Value can't be negative",
  probability: 'Probability must be between 0 and 100',
  type: 'Choose note, call or email',
  description: 'Describe what happened',
  occurredAt: 'Enter when it happened',
  record: 'Choose a contact or a deal',
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : v);
const blankToNull = (v: unknown) => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string') return v.trim() === '' ? null : v.trim();
  return v;
};

const requiredText = (max: number, longMsg: string, requiredMsg: string) =>
  z.preprocess(trim, z.string({ error: requiredMsg }).min(1, requiredMsg).max(max, longMsg));

const optionalText = (max: number, longMsg: string) =>
  z.preprocess(blankToNull, z.string().max(max, longMsg).nullable());

const optionalId = z.preprocess(blankToNull, z.number().int().nullable());

export const organizationPayload = z.object({
  name: requiredText(200, MSG.nameLong, MSG.name),
  website: optionalText(500, MSG.shortLong),
  industry: optionalText(200, MSG.shortLong),
  notes: optionalText(5000, MSG.textLong),
});

export const contactPayload = z.object({
  name: requiredText(200, MSG.nameLong, MSG.name),
  email: z.preprocess(blankToNull, z.string().regex(EMAIL, MSG.email).max(320, MSG.email).nullable()),
  phone: optionalText(200, MSG.shortLong),
  job_title: optionalText(200, MSG.shortLong),
  organization_id: optionalId,
  status: z.enum(['lead', 'qualified', 'customer'], { error: MSG.status }),
});

const probability = z
  .number({ error: MSG.probability })
  .int(MSG.probability)
  .min(0, MSG.probability)
  .max(100, MSG.probability);

export const dealPayload = z.object({
  name: requiredText(200, MSG.nameLong, MSG.name),
  organization_id: z.number({ error: MSG.organization }).int(),
  contact_id: optionalId,
  stage: z.enum(['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'], { error: MSG.stage }),
  value_cents: z.number().int().min(0, MSG.value),
  probability: probability.nullable(),
  close_date: z.preprocess(blankToNull, z.string().nullable()),
});

export const activityPayload = z
  .object({
    type: z.enum(['note', 'call', 'email'], { error: MSG.type }),
    contact_id: optionalId,
    deal_id: optionalId,
    description: requiredText(5000, MSG.textLong, MSG.description),
    occurred_at: z.string({ error: MSG.occurredAt }).min(1, MSG.occurredAt),
    follow_up_date: z.preprocess(blankToNull, z.string().nullable()),
    follow_up_done: z.boolean().default(false),
  })
  .refine((a) => (a.contact_id === null) !== (a.deal_id === null), { message: MSG.record, path: ['record'] });

export const payloadSchemas = {
  organization: organizationPayload,
  contact: contactPayload,
  deal: dealPayload,
  activity: activityPayload,
};

export type OrganizationPayload = z.output<typeof organizationPayload>;
export type ContactPayload = z.output<typeof contactPayload>;
export type DealPayload = z.output<typeof dealPayload>;
export type ActivityPayload = z.output<typeof activityPayload>;

/** One message per field, keyed by the payload's field names. */
export function issuesByField(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'record');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/**
 * A React Hook Form resolver: toPayload turns the typed values into a payload
 * (and may report its own errors, such as unreadable money), then the zod
 * schema checks it. Form fields share the payload's names, so each error lands
 * on its field.
 */
export function payloadResolver<TForm extends FieldValues, TPayload>(
  schema: z.ZodType<TPayload>,
  toPayload: (values: TForm) => { payload: unknown; errors?: Record<string, string> },
): Resolver<TForm> {
  return async (values) => {
    const { payload, errors: own = {} } = toPayload(values);
    const result = schema.safeParse(payload);
    const messages = { ...(result.success ? {} : issuesByField(result.error)), ...own };
    if (Object.keys(messages).length === 0 && result.success) {
      return { values: result.data as unknown as TForm, errors: {} };
    }
    const errors: Record<string, { type: string; message: string }> = {};
    for (const [field, message] of Object.entries(messages)) errors[field] = { type: 'validation', message };
    return { values: {}, errors: errors as FieldErrors<TForm> };
  };
}

// The forms' typed values. Money and probability are text until saved.

export interface OrganizationFormValues {
  name: string;
  website: string;
  industry: string;
  notes: string;
}

export interface ContactFormValues {
  name: string;
  email: string;
  phone: string;
  job_title: string;
  organization_id: number | null;
  status: 'lead' | 'qualified' | 'customer';
}

export interface DealFormValues {
  name: string;
  organization_id: number | null;
  contact_id: number | null;
  stage: string;
  value_cents: string;
  probability: string;
  close_date: string;
}

export interface ActivityFormValues {
  type: 'note' | 'call' | 'email';
  description: string;
  occurred_at: string;
  follow_up_date: string;
}

/** Adds https:// to a website with no scheme (UI-FORM-07). */
export function withScheme(website: string): string {
  const text = website.trim();
  if (!text || /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(text)) return text;
  return `https://${text}`;
}

export const organizationResolver = payloadResolver<OrganizationFormValues, OrganizationPayload>(
  organizationPayload,
  (v) => ({ payload: { ...v, website: withScheme(v.website ?? '') } }),
);

export const contactResolver = payloadResolver<ContactFormValues, ContactPayload>(contactPayload, (v) => ({
  payload: v,
}));

export function dealToPayload(v: DealFormValues) {
  const errors: Record<string, string> = {};
  const money = parseMoney(v.value_cents, { allowEmpty: true });
  if (!money.ok) errors.value_cents = money.error;
  const probText = (v.probability ?? '').trim().replace(/%$/, '').trim();
  let prob: number | null = null;
  if (probText !== '') {
    prob = /^-?\d+$/.test(probText) ? Number(probText) : Number.NaN;
    if (Number.isNaN(prob)) errors.probability = MSG.probability;
  }
  return {
    payload: { ...v, value_cents: money.ok ? money.cents : 0, probability: Number.isNaN(prob) ? null : prob },
    errors,
  };
}

export const dealResolver = payloadResolver<DealFormValues, DealPayload>(dealPayload, dealToPayload);

/** The activity form doesn't choose its record; the page supplies it. */
export function activityResolver(record: {
  contact_id: number | null;
  deal_id: number | null;
  follow_up_done?: boolean;
}) {
  return payloadResolver<ActivityFormValues, ActivityPayload>(activityPayload, (v) => ({
    payload: {
      ...v,
      contact_id: record.contact_id,
      deal_id: record.deal_id,
      occurred_at: v.occurred_at && v.occurred_at.length === 16 ? `${v.occurred_at}:00` : v.occurred_at,
      follow_up_done: record.follow_up_done ?? false,
    },
  }));
}
