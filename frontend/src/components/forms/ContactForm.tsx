import { Controller, useForm } from 'react-hook-form';

import { useOrganizations, useSaveContact } from '../../api/hooks';
import type { Contact, ContactDetail } from '../../api/types';
import { type ContactFormValues, type ContactPayload, contactResolver } from '../../lib/schemas';
import { STATUSES } from '../../lib/stages';
import { Button } from '../Button';
import { Field, FormActions, FormGrid, SelectInput, TextInput } from '../fields';
import { RecordSelect } from '../RecordSelect';
import { useSubmit } from './useSubmit';

/** The contact's own values when editing; blanks, or the given organization, for a new one. */
function contactDefaults(contact: Contact | undefined, organizationId: number | null | undefined): ContactFormValues {
  return {
    name: contact?.name ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    job_title: contact?.job_title ?? '',
    organization_id: contact?.organization_id ?? organizationId ?? null,
    status: contact?.status ?? 'lead',
  };
}

export function ContactForm({
  contact,
  defaults,
  onDone,
  onCancel,
}: {
  contact?: Contact;
  defaults?: { organization_id?: number | null };
  onDone: (saved: ContactDetail) => void;
  onCancel: () => void;
}) {
  const organizations = useOrganizations();
  const save = useSaveContact();
  const form = useForm<ContactFormValues>({
    resolver: contactResolver,
    mode: 'onTouched',
    defaultValues: contactDefaults(contact, defaults?.organization_id),
  });
  const { register, handleSubmit, control, formState, setError } = form;
  const submit = useSubmit('contact', setError);
  const errors = formState.errors;
  const orgOptions = (organizations.data ?? []).map((o) => ({ value: o.id, label: o.name }));

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) =>
        submit(() => save.mutateAsync({ id: contact?.id, body: values as unknown as ContactPayload }), onDone),
      )}
    >
      <FormGrid>
        <Field label="Name" required error={errors.name?.message} full>
          <TextInput {...register('name')} autoComplete="off" />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <TextInput {...register('email')} type="email" placeholder="name@company.com" autoComplete="off" />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <TextInput {...register('phone')} type="tel" autoComplete="off" />
        </Field>
        <Field label="Job title" error={errors.job_title?.message}>
          <TextInput {...register('job_title')} autoComplete="off" />
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <SelectInput {...register('status')}>
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Organization" error={errors.organization_id?.message} full>
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
                placeholder="No organization"
                searchPlaceholder="Search organizations"
                noneLabel="No organization"
              />
            )}
          />
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
