// Every case in shared/validation-cases.json passes or fails in zod as listed (ARC-11).

import { describe, expect, test } from 'vitest';

import cases from '../../../shared/validation-cases.json';
import { dealResolver, issuesByField, organizationResolver, payloadSchemas, withScheme } from './schemas';

type Form = keyof typeof payloadSchemas;

function expand(value: unknown) {
  if (value && typeof value === 'object' && 'repeat' in value) {
    const v = value as { repeat: string; times: number };
    return v.repeat.repeat(v.times);
  }
  return value;
}

for (const [form, spec] of Object.entries(cases.forms) as [Form, (typeof cases.forms)[Form]][]) {
  describe(form, () => {
    spec.cases.forEach((c, i) => {
      const set = Object.fromEntries(Object.entries(c.set).map(([k, v]) => [k, expand(v)]));
      test(`${i}: ${JSON.stringify(c.set).slice(0, 50)} is ${c.valid ? 'valid' : 'invalid'}`, () => {
        const result = payloadSchemas[form].safeParse({ ...spec.base, ...set });
        if (c.valid) {
          expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
        } else {
          expect(result.success).toBe(false);
          const errors = issuesByField(result.error!);
          expect(errors[(c as { field: string }).field]).toBe((c as { message: string }).message);
        }
      });
    });
  });
}

describe('form resolvers', () => {
  test('the organization form adds https:// to a website', async () => {
    expect(withScheme('acme.example')).toBe('https://acme.example');
    expect(withScheme('http://acme.example')).toBe('http://acme.example');
    const result = await organizationResolver(
      { name: 'Acme', website: 'acme.example', industry: '', notes: '' },
      undefined,
      { fields: {}, shouldUseNativeValidation: false },
    );
    expect(result.values).toMatchObject({ website: 'https://acme.example', industry: null });
  });

  test('the deal form turns money text into cents and reports unclear amounts', async () => {
    const base = { name: 'X', organization_id: 1, contact_id: null, stage: 'new', probability: '10', close_date: '' };
    const ok = await dealResolver({ ...base, value_cents: '12.500,50' }, undefined, { fields: {}, shouldUseNativeValidation: false });
    expect(ok.values).toMatchObject({ value_cents: 1_250_050, probability: 10, close_date: null });
    const bad = await dealResolver({ ...base, value_cents: '12.5', probability: '120' }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });
    expect(bad.errors.value_cents?.message).toBe('Use a comma for cents, like 12.500,50');
    expect(bad.errors.probability?.message).toBe('Probability must be between 0 and 100');
  });
});
