import { Mail, Phone, StickyNote } from 'lucide-react';
import { useEffect } from 'react';
import { type UseFormReturn, useForm } from 'react-hook-form';

import { useSaveActivity } from '../../api/hooks';
import type { TimelineEntry } from '../../api/types';
import { type ActivityFormValues, type ActivityPayload, activityResolver } from '../../lib/schemas';
import { toDateTimeInput, useTodayValue } from '../../lib/today';
import { Button } from '../Button';
import { DateInput, DateTimeInput, Field, FieldError, FormActions, TextArea } from '../fields';
import styles from './ActivityForm.module.css';
import { useSubmit } from './useSubmit';

const TYPES = [
  { key: 'note', label: 'Note', icon: StickyNote },
  { key: 'call', label: 'Call', icon: Phone },
  { key: 'email', label: 'Email', icon: Mail },
] as const;

function TypeButtons({ form }: { form: UseFormReturn<ActivityFormValues> }) {
  const current = form.watch('type');
  return (
    <div className={styles.types} role="radiogroup" aria-label="Type">
      {TYPES.map(({ key, label, icon: Icon }) => (
        <label key={key} className={`${styles.type} ${current === key ? styles.on : ''}`}>
          <input type="radio" value={key} className="visually-hidden" {...form.register('type')} />
          <Icon size={15} aria-hidden />
          {label}
        </label>
      ))}
    </div>
  );
}

function ActivityFields({ form, compact }: { form: UseFormReturn<ActivityFormValues>; compact?: boolean }) {
  const { register, formState } = form;
  const errors = formState.errors as typeof formState.errors & { record?: { message?: string } };
  return (
    <div className={compact ? styles.compact : styles.fields}>
      <TypeButtons form={form} />
      <Field label="What happened" required error={errors.description?.message} full>
        <TextArea {...register('description')} rows={compact ? 2 : 4} placeholder="What happened?" />
      </Field>
      <div className={styles.row}>
        <Field label="When" required error={errors.occurred_at?.message}>
          <DateTimeInput {...register('occurred_at')} />
        </Field>
        <Field label="Follow-up date" error={errors.follow_up_date?.message}>
          <DateInput {...register('follow_up_date')} />
        </Field>
      </div>
      <FieldError message={errors.record?.message} />
    </div>
  );
}

/** UI-REC-05: logging inside the timeline panel, without leaving the page. */
export function LogActivityForm({ record }: { record: { contact_id: number | null; deal_id: number | null } }) {
  const { now } = useTodayValue();
  const save = useSaveActivity();
  const form = useForm<ActivityFormValues>({
    resolver: activityResolver(record),
    mode: 'onTouched',
    defaultValues: { type: 'note', description: '', occurred_at: toDateTimeInput(now), follow_up_date: '' },
  });
  const submit = useSubmit('activity', form.setError);

  // Fill in "now" once the server's clock has answered.
  useEffect(() => {
    if (now && !form.getValues('occurred_at')) form.setValue('occurred_at', toDateTimeInput(now));
  }, [now, form]);

  return (
    <form
      noValidate
      aria-label="Log activity"
      className={styles.log}
      onSubmit={form.handleSubmit((values) =>
        submit(
          () => save.mutateAsync({ body: values as unknown as ActivityPayload }),
          () =>
            form.reset({
              type: form.getValues('type'),
              description: '',
              occurred_at: toDateTimeInput(now),
              follow_up_date: '',
            }),
        ),
      )}
    >
      <h3 className={styles.logTitle}>Log activity</h3>
      <ActivityFields form={form} compact />
      <div className={styles.logActions}>
        <Button variant="primary" type="submit" disabled={form.formState.isSubmitting}>
          Log it
        </Button>
      </div>
    </form>
  );
}

/** Editing an activity from its timeline menu. */
export function ActivityForm({
  activity,
  onDone,
  onCancel,
}: {
  activity: TimelineEntry;
  onDone: () => void;
  onCancel: () => void;
}) {
  const save = useSaveActivity();
  const form = useForm<ActivityFormValues>({
    resolver: activityResolver({
      contact_id: activity.contact_id,
      deal_id: activity.deal_id,
      follow_up_done: activity.follow_up_done,
    }),
    mode: 'onTouched',
    defaultValues: {
      type: activity.type ?? 'note',
      description: activity.description ?? '',
      occurred_at: toDateTimeInput(activity.occurred_at),
      follow_up_date: activity.follow_up_date ?? '',
    },
  });
  const submit = useSubmit('activity', form.setError);
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) =>
        submit(() => save.mutateAsync({ id: activity.id, body: values as unknown as ActivityPayload }), onDone),
      )}
    >
      <ActivityFields form={form} />
      <FormActions>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={form.formState.isSubmitting}>
          Save
        </Button>
      </FormActions>
    </form>
  );
}
