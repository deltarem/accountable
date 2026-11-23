import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { DateTimeInput, Field, FieldError, MoneyInput, PercentInput, StageSelect, TextInput } from './fields';

describe('Field (UI-FORM-02)', () => {
  test('labels its control and marks required fields', () => {
    render(
      <Field label="Name" required>
        <TextInput />
      </Field>,
    );
    const input = screen.getByLabelText(/^Name/);
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeNull();
    expect(screen.getByText('*')).toBeTruthy();
  });

  test('shows a hint while there is no error', () => {
    render(
      <Field label="Website" hint="We add https:// for you">
        <TextInput />
      </Field>,
    );
    expect(screen.getByText('We add https:// for you')).toBeTruthy();
  });

  test('an error replaces the hint, is announced and is linked to the control', () => {
    render(
      <Field label="Website" hint="We add https:// for you" error="Use 200 characters or fewer">
        <TextInput />
      </Field>,
    );
    expect(screen.queryByText('We add https:// for you')).toBeNull();
    const input = screen.getByLabelText('Website');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Use 200 characters or fewer');
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);
  });

  test('a lone FieldError with no message shows nothing', () => {
    const { container } = render(<FieldError message={undefined} />);
    expect(container.textContent).toBe('');
  });
});

describe('inputs', () => {
  test('money has a $ in front and percent a % after, both invalid with an error', () => {
    render(
      <>
        <Field label="Value (USD)" error="Value can't be negative">
          <MoneyInput />
        </Field>
        <Field label="Probability">
          <PercentInput />
        </Field>
      </>,
    );
    const money = screen.getByLabelText('Value (USD)');
    expect(money.getAttribute('inputmode')).toBe('decimal');
    expect(money.getAttribute('aria-invalid')).toBe('true');
    expect(money.parentElement?.textContent).toContain('$');
    const percent = screen.getByLabelText('Probability');
    expect(percent.getAttribute('inputmode')).toBe('numeric');
    expect(percent.parentElement?.textContent).toContain('%');
  });

  test('the date-time input works to the minute and the stage select lists each stage with its probability', () => {
    render(
      <>
        <Field label="When">
          <DateTimeInput />
        </Field>
        <Field label="Stage">
          <StageSelect defaultValue="won" />
        </Field>
      </>,
    );
    expect(screen.getByLabelText('When').getAttribute('type')).toBe('datetime-local');
    expect(screen.getByLabelText('When').getAttribute('step')).toBe('60');
    const options = Array.from((screen.getByLabelText('Stage') as HTMLSelectElement).options).map((o) => o.text);
    expect(options).toContain('Won (100%)');
    expect(options).toContain('New (10%)');
  });
});
