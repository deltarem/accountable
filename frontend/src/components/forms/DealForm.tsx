import { Controller, useForm, useWatch } from 'react-hook-form';

import { useContacts, useOrganizations, useSaveDeal } from '../../api/hooks';
import type { Contact, Deal, DealDetail } from '../../api/types';
import { formatMoneyInput } from '../../lib/format';
import { parseMoney } from '../../lib/money';
import { type DealFormValues, type DealPayload, dealResolver } from '../../lib/schemas';
import { stage as stageInfo } from '../../lib/stages';
import { useTodayValue } from '../../lib/today';
import { Button } from '../Button';
import { DateInput, Field, FormActions, FormGrid, MoneyInput, PercentInput, StageSelect, TextInput } from '../fields';
import { type RecordOption, RecordSelect } from '../RecordSelect';
import { useSubmit } from './useSubmit';

type DealDefaults = { stage?: string; organization_id?: number | null; contact_id?: number | null };

/** The organization and contact the form starts with: the deal's, else the ones it was opened with. */
function startingLinks(deal: Deal | undefined, defaults: DealDefaults | undefined) {
  return {
    organization_id: deal?.organization_id ?? defaults?.organization_id ?? null,
    contact_id: deal?.contact_id ?? defaults?.contact_id ?? null,
  };
}

function dealDefaults(deal: Deal | undefined, defaults: DealDefaults | undefined, today: string | undefined) {
  const startStage = deal?.stage ?? defaults?.stage ?? 'new';
  const info = stageInfo(startStage);
  return {
    ...startingLinks(deal, defaults),
    name: deal?.name ?? '',
    stage: startStage,
    value_cents: deal ? formatMoneyInput(deal.value_cents) : '',
    probability: String(deal?.probability ?? info.probability),
    close_date: deal?.close_date ?? (info.open ? '' : (today ?? '')),
  } satisfies DealFormValues;
}

/** UI-FORM-03: the chosen organization's contacts come first, grouped under its name. */
function contactOptions(
  contacts: Contact[],
  organizationId: number | null,
  orgName: string | undefined,
): RecordOption[] {
  const atOrganization = (c: Contact) => c.organization_id === organizationId;
  const grouped = Boolean(organizationId && orgName);
  return [...contacts]
    .sort((a, b) => Number(atOrganization(b)) - Number(atOrganization(a)))
    .map((c) => ({
      value: c.id,
      label: c.name,
      hint: c.organization_name,
      group: grouped ? (atOrganization(c) ? `At ${orgName}` : 'Other contacts') : undefined,
    }));
}

export function DealForm({
  deal,
  defaults,
  onDone,
  onCancel,
}: {
  deal?: Deal;
  defaults?: DealDefaults;
  onDone: (saved: DealDetail) => void;
  onCancel: () => void;
}) {
  const organizations = useOrganizations();
  const contacts = useContacts();
  const { today } = useTodayValue();
  const save = useSaveDeal();
  const form = useForm<DealFormValues>({
    resolver: dealResolver,
    mode: 'onTouched',
    defaultValues: dealDefaults(deal, defaults, today),
  });
  const { register, handleSubmit, control, formState, setError, setValue } = form;
  const submit = useSubmit('deal', setError);
  const errors = formState.errors;
  const organizationId = useWatch({ control, name: 'organization_id' });

  const orgOptions: RecordOption[] = (organizations.data ?? []).map((o) => ({ value: o.id, label: o.name }));
  const orgName = organizations.data?.find((o) => o.id === organizationId)?.name;
  const contactChoices = contactOptions(contacts.data ?? [], organizationId, orgName);

  const stageField = register('stage', {
    onChange: (event) => {
      // UI-FORM-04: a new stage fills in its probability; Won or Lost fills in today.
      const info = stageInfo(event.target.value);
      setValue('probability', String(info.probability), { shouldValidate: formState.isSubmitted });
      if (!info.open && today) setValue('close_date', today);
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) =>
        submit(() => save.mutateAsync({ id: deal?.id, body: values as unknown as DealPayload }), onDone),
      )}
    >
      <FormGrid>
        <Field label="Name" required error={errors.name?.message} full>
          <TextInput {...register('name')} autoComplete="off" />
        </Field>
        <Field label="Organization" required error={errors.organization_id?.message}>
          <Controller
            control={control}
            name="organization_id"
            render={({ field }) => (
              <RecordSelect
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={orgOptions}
                placeholder="Choose an organization"
                searchPlaceholder="Search organizations"
              />
            )}
          />
        </Field>
        <Field label="Main contact" error={errors.contact_id?.message}>
          <Controller
            control={control}
            name="contact_id"
            render={({ field }) => (
              <RecordSelect
                ref={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={contactChoices}
                placeholder="No main contact"
                searchPlaceholder="Search contacts"
                noneLabel="No main contact"
              />
            )}
          />
        </Field>
        <Field label="Stage" error={errors.stage?.message}>
          <StageSelect {...stageField} />
        </Field>
        <Field label="Probability" error={errors.probability?.message}>
          <PercentInput {...register('probability')} />
        </Field>
        <Field label="Value (USD)" error={errors.value_cents?.message}>
          <Controller
            control={control}
            name="value_cents"
            render={({ field }) => (
              <MoneyInput
                ref={field.ref}
                name={field.name}
                value={field.value}
                placeholder="0,00"
                onChange={field.onChange}
                onBlur={() => {
                  const parsed = parseMoney(field.value, { allowEmpty: true });
                  if (parsed.ok && field.value.trim() !== '') field.onChange(formatMoneyInput(parsed.cents));
                  field.onBlur();
                }}
              />
            )}
          />
        </Field>
        <Field label="Close date" error={errors.close_date?.message}>
          <DateInput {...register('close_date')} />
        </Field>
      </FormGrid>
      <FormActions>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={formState.isSubmitting}>
          Save
        </Button>
      </FormActions>
    </form>
  );
}
