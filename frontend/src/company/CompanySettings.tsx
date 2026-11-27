import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Field } from "../components/Field";
import { LoadFailed } from "../components/LoadFailed";
import { PageHeader } from "../components/PageHeader";
import { formatDate } from "../lib/dates";
import { showSaveError } from "../lib/server-errors";
import {
  changes,
  formValues,
  schema,
  useCompanySettings,
  useSaveCompanySettings,
  type CompanySettings as Settings,
  type SettingsValues,
} from "./settings";

/** The team's one set of business details for its documents (B1 to B10). */
export function CompanySettings() {
  const settings = useCompanySettings();
  return (
    <>
      <PageHeader title="Company settings" />
      {/* With nothing read, a failed read shows no form, so blank fields never pass for the real settings (B10). */}
      <LoadFailed error={settings.error} onRetry={() => void settings.refetch()} onPage keeping={!!settings.data} />
      {settings.data && <SettingsForm settings={settings.data} />}
    </>
  );
}

function SettingsForm({ settings }: { settings: Settings }) {
  const save = useSaveCompanySettings();
  const values = useMemo(() => formValues(settings), [settings]);
  const {
    register,
    handleSubmit,
    setError,
    getValues,
    reset,
    formState: { errors, dirtyFields, isSubmitting },
  } = useForm<SettingsValues>({
    resolver: zodResolver(schema),
    // A teammate's save arriving from a refetch updates the fields nobody has touched, and keeps what's typed (B9).
    values,
    resetOptions: { keepDirtyValues: true },
  });

  async function submit(typed: SettingsValues) {
    const body = changes(typed, dirtyFields);
    try {
      // With nothing changed there's nothing to send, and who changed them last stays as it was (B7).
      // The form's resetOptions apply to this reset too, and would keep what was typed in place of what was saved.
      if (Object.keys(body).length > 0) reset(formValues(await save.mutateAsync(body)), { keepDirtyValues: false });
      toast.success("Settings saved.");
    } catch (error) {
      showSaveError(error, { setError, getValues });
    }
  }

  const input = (name: keyof SettingsValues, figures = false) => ({
    id: `settings-${name}`,
    className: figures ? "input num" : "input",
    "aria-invalid": !!errors[name],
    ...register(name),
  });

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(submit)(event)}
      className="panel mx-5 mb-4 flex max-w-[720px] flex-col gap-6 px-6 py-5"
    >
      <Group title="Company">
        <Field label="Company name" htmlFor="settings-company_name" error={errors.company_name?.message}>
          <input {...input("company_name")} aria-required="true" />
        </Field>
        <Field label="Address" htmlFor="settings-address">
          <textarea {...input("address")} rows={4} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" htmlFor="settings-email" error={errors.email?.message}>
            <input {...input("email")} type="email" />
          </Field>
          <Field label="Phone" htmlFor="settings-phone">
            <input {...input("phone")} type="tel" />
          </Field>
        </div>
      </Group>

      <Group title="Tax and payment">
        <div className="grid grid-cols-[minmax(0,1fr)_176px_176px] items-start gap-4">
          <Field label="Tax label" htmlFor="settings-tax_label">
            <input {...input("tax_label")} />
          </Field>
          <Field label="Tax rate" htmlFor="settings-tax_rate" error={errors.tax_rate?.message}>
            <WithUnit unit="%">
              <input
                {...input("tax_rate", true)}
                inputMode="decimal"
                aria-required="true"
                className="input num min-w-0 flex-1"
              />
            </WithUnit>
          </Field>
          <Field label="Payment terms" htmlFor="settings-payment_terms_days" error={errors.payment_terms_days?.message}>
            <WithUnit unit="days">
              <input
                {...input("payment_terms_days", true)}
                inputMode="numeric"
                aria-required="true"
                className="input num min-w-0 flex-1"
              />
            </WithUnit>
          </Field>
        </div>
      </Group>

      <Group title="Document numbers">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quote prefix" htmlFor="settings-quote_prefix" error={errors.quote_prefix?.message}>
            <input {...input("quote_prefix", true)} aria-required="true" />
          </Field>
          <Field label="Invoice prefix" htmlFor="settings-invoice_prefix" error={errors.invoice_prefix?.message}>
            <input {...input("invoice_prefix", true)} aria-required="true" />
          </Field>
        </div>
      </Group>

      <div className="flex items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting || save.isPending}>
          Save settings
        </button>
        <LastChanged settings={settings} />
      </div>
    </form>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function WithUnit({ unit, children }: { unit: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {children}
      <span className="text-muted">{unit}</span>
    </div>
  );
}

function LastChanged({ settings }: { settings: Settings }) {
  if (!settings.updated_by)
    return <p className="text-[13px] leading-[18px] text-muted">Nobody has changed these yet.</p>;
  return (
    <p className="text-[13px] leading-[18px] text-muted">
      {`Last changed by ${settings.updated_by.name} on `}
      <span className="num text-[12px]">{formatDate(settings.updated_at)}</span>
    </p>
  );
}
