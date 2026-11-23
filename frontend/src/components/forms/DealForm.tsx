import { Controller, useForm } from 'react-hook-form';

import { useContacts, useOrganizations, useSaveDeal } from '../../api/hooks';
import type { Deal, DealDetail } from '../../api/types';
import { formatMoneyInput } from '../../lib/format';
import { parseMoney } from '../../lib/money';
import { type DealFormValues, type DealPayload, dealResolver } from '../../lib/schemas';
import { stage as stageInfo } from '../../lib/stages';
import { useTodayValue } from '../../lib/today';
import { Button } from '../Button';
import { DateInput, Field, FormActions, FormGrid, MoneyInput, PercentInput, StageSelect, TextInput } from '../fields';
import { type RecordOption, RecordSelect } from '../RecordSelect';
import { useSubmit } from './useSubmit';

export function DealForm({
  deal,
  defaults,
  onDone,
  onCancel,
}: {
  deal?: Deal;
  defaults?: { stage?: string; organization_id?: number | null; contact_id?: number | null };
  onDone: (saved: DealDetail) => void;
  onCancel: () => void;
}) {
  const organizations = useOrganizations();
  const contacts = useContacts();
  const { today } = useTodayValue();
  const save = useSaveDeal();
  const startStage = deal?.stage ?? defaults?.stage ?? 'new';
  const form = useForm<DealFormValues>({
    resolver: dealResolver,
    mode: 'onTouched',
    defaultValues: {
      name: deal?.name ?? '',
      organization_id: deal?.organization_id ?? defaults?.organization_id ?? null,
      contact_id: deal?.contact_id ?? defaults?.contact_id ?? null,
      stage: startStage,
      value_cents: deal ? formatMoneyInput(deal.value_cents) : '',
      probability: String(deal?.probability ?? stageInfo(startStage).probability),
      close_date: deal?.close_date ?? (stageInfo(startStage).open ? '' : (today ?? '')),
    },
  });
  const { register, handleSubmit, control, formState, setError, setValue, watch } = form;
  const submit = useSubmit('deal', setError);
  const errors = formState.errors;
  const organizationId = watch('organization_id');

  const orgOptions: RecordOption[] = (organizations.data ?? []).map((o) => ({ value: o.id, label: o.name }));
  const orgName = organizations.data?.find((o) => o.id === organizationId)?.name;
  // UI-FORM-03: the chosen organization's contacts come first.
  const contactOptions: RecordOption[] = [...(contacts.data ?? [])]
    .sort((a, b) => Number(b.organization_id === organizationId) - Number(a.organization_id === organizationId))
    .map((c) => ({
      value: c.id,
      label: c.name,
      hint: c.organization_name,
      group: organizationId && orgName ? (c.organization_id === organizationId ? `At ${orgName}` : 'Other contacts') : undefined,
    }));

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
                options={contactOptions}
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
