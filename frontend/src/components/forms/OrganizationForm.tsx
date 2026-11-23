import { Controller, useForm } from 'react-hook-form';

import { useIndustries, useSaveOrganization } from '../../api/hooks';
import type { Organization, OrganizationDetail } from '../../api/types';
import { type OrganizationFormValues, type OrganizationPayload, organizationResolver } from '../../lib/schemas';
import { Button } from '../Button';
import { Field, FormActions, FormGrid, TextArea, TextInput } from '../fields';
import { SuggestField } from '../SuggestField';
import { useSubmit } from './useSubmit';

export function OrganizationForm({
  organization,
  onDone,
  onCancel,
}: {
  organization?: Organization;
  onDone: (saved: OrganizationDetail) => void;
  onCancel: () => void;
}) {
  const industries = useIndustries();
  const save = useSaveOrganization();
  const form = useForm<OrganizationFormValues>({
    resolver: organizationResolver,
    mode: 'onTouched',
    defaultValues: {
      name: organization?.name ?? '',
      website: organization?.website ?? '',
      industry: organization?.industry ?? '',
      notes: organization?.notes ?? '',
    },
  });
  const { register, handleSubmit, control, formState, setError } = form;
  const submit = useSubmit('organization', setError);
  const errors = formState.errors;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) =>
        submit(
          () => save.mutateAsync({ id: organization?.id, body: values as unknown as OrganizationPayload }),
          onDone,
        ),
      )}
    >
      <FormGrid>
        <Field label="Name" required error={errors.name?.message} full>
          <TextInput {...register('name')} autoComplete="off" />
        </Field>
        <Field label="Website" error={errors.website?.message}>
          <TextInput {...register('website')} placeholder="acme.example" autoComplete="off" />
        </Field>
        <Field label="Industry" error={errors.industry?.message}>
          <Controller
            control={control}
            name="industry"
            render={({ field }) => (
              <SuggestField
                ref={field.ref}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                suggestions={industries.data ?? []}
              />
            )}
          />
        </Field>
        <Field label="Notes" error={errors.notes?.message} full>
          <TextArea {...register('notes')} rows={4} />
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
