// Form fields. Each one has a visible label, shows its error under the
// control in Raspberry with an icon (UI-FORM-02), and links the two for
// screen readers.

import { CircleAlert } from 'lucide-react';
import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  createContext,
  forwardRef,
  useContext,
  useId,
} from 'react';

import { STAGES } from '../lib/stages';
import styles from './fields.module.css';

const FieldIds = createContext<{ id: string; errorId: string; invalid: boolean }>({
  id: '',
  errorId: '',
  invalid: false,
});

export function useFieldIds() {
  return useContext(FieldIds);
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p className={styles.error} id={id} role="alert">
      <CircleAlert size={14} aria-hidden />
      {message}
    </p>
  );
}

export function Field({
  label,
  required = false,
  error,
  full = false,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  full?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <FieldIds.Provider value={{ id, errorId, invalid: !!error }}>
      <div className={`${styles.field} ${full ? styles.full : ''}`}>
        <label className={styles.label} htmlFor={id}>
          {label}
          {required ? (
            <span className={styles.required} aria-hidden>
              {' '}
              *
            </span>
          ) : null}
        </label>
        {children}
        {hint && !error ? <p className={styles.hint}>{hint}</p> : null}
        <FieldError id={errorId} message={error} />
      </div>
    </FieldIds.Provider>
  );
}

function controlProps(ids: { id: string; errorId: string; invalid: boolean }) {
  return { id: ids.id, 'aria-invalid': ids.invalid || undefined, 'aria-describedby': ids.invalid ? ids.errorId : undefined };
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...rest },
  ref,
) {
  const ids = useFieldIds();
  return <input ref={ref} className={`${styles.input} ${className ?? ''}`} {...controlProps(ids)} {...rest} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { className, ...rest },
  ref,
) {
  const ids = useFieldIds();
  return <textarea ref={ref} className={`${styles.input} ${styles.textarea} ${className ?? ''}`} {...controlProps(ids)} {...rest} />;
});

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function SelectInput(
  { className, children, ...rest },
  ref,
) {
  const ids = useFieldIds();
  return (
    <select ref={ref} className={`${styles.input} ${styles.select} ${className ?? ''}`} {...controlProps(ids)} {...rest}>
      {children}
    </select>
  );
});

/** Money as typed: $ in front, 12.500,00 inside (DEC-04). */
export const MoneyInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function MoneyInput(
  props,
  ref,
) {
  const ids = useFieldIds();
  return (
    <div className={styles.affix}>
      <span className={styles.prefix} aria-hidden>
        $
      </span>
      <input
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        className={`${styles.input} ${styles.withPrefix} mono`}
        {...controlProps(ids)}
        {...props}
      />
    </div>
  );
});

export const PercentInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function PercentInput(
  props,
  ref,
) {
  const ids = useFieldIds();
  return (
    <div className={styles.affix}>
      <input
        ref={ref}
        inputMode="numeric"
        autoComplete="off"
        className={`${styles.input} ${styles.withSuffix} mono`}
        {...controlProps(ids)}
        {...props}
      />
      <span className={styles.suffix} aria-hidden>
        %
      </span>
    </div>
  );
});

export const DateInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function DateInput(
  props,
  ref,
) {
  return <TextInput ref={ref} type="date" {...props} />;
});

export const DateTimeInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function DateTimeInput(props, ref) {
    return <TextInput ref={ref} type="datetime-local" step={60} {...props} />;
  },
);

export const StageSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function StageSelect(
  props,
  ref,
) {
  return (
    <SelectInput ref={ref} {...props}>
      {STAGES.map((s) => (
        <option key={s.key} value={s.key}>
          {s.name} ({s.probability}%)
        </option>
      ))}
    </SelectInput>
  );
});

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
