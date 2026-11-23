import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';

import { Field } from './fields';
import { SuggestField } from './SuggestField';

const INDUSTRIES = [
  'Software',
  'Logistics',
  'Retail',
  'Healthcare',
  'Hardware',
  'Finance',
  'Energy',
  'Education',
  'Media',
  'Travel',
];

function Harness({
  start = '',
  suggestions = INDUSTRIES,
  error,
  onBlur,
  onSubmit,
}: {
  start?: string;
  suggestions?: string[];
  error?: string;
  onBlur?: () => void;
  onSubmit?: () => void;
}) {
  const [value, setValue] = useState(start);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <Field label="Industry" error={error}>
        <SuggestField
          name="industry"
          value={value}
          onChange={setValue}
          onBlur={onBlur}
          suggestions={suggestions}
          placeholder="Software"
        />
      </Field>
      <output aria-label="Saved value">{value}</output>
    </form>
  );
}

const input = () => screen.getByRole('combobox', { name: 'Industry' }) as HTMLInputElement;
const options = () => screen.queryAllByRole('option').map((o) => o.textContent);

describe('SuggestField (UI-FORM-06)', () => {
  test('shows no list until the field has focus, then up to eight suggestions', async () => {
    render(<Harness />);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input().getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(input());
    expect(screen.getByRole('listbox', { name: 'Suggestions' })).toBeTruthy();
    expect(options()).toEqual(INDUSTRIES.slice(0, 8));
    expect(input().getAttribute('aria-expanded')).toBe('true');
  });

  test('filters as you type, ignoring case, and leaves out an exact match', async () => {
    render(<Harness />);
    await userEvent.type(input(), 'WARE');
    expect(options()).toEqual(['Software', 'Hardware']);
    await userEvent.clear(input());
    await userEvent.type(input(), 'software');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('arrow keys move through the suggestions and wrap around; Enter picks one', async () => {
    render(<Harness />);
    await userEvent.type(input(), 'ware');
    expect(input().getAttribute('aria-activedescendant')).toBeNull();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Software' }).getAttribute('aria-selected')).toBe('true');
    expect(input().getAttribute('aria-activedescendant')).toBe(screen.getByRole('option', { name: 'Software' }).id);
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Hardware' }).getAttribute('aria-selected')).toBe('true');
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Software' }).getAttribute('aria-selected')).toBe('true');
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('option', { name: 'Hardware' }).getAttribute('aria-selected')).toBe('true');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getByRole('option', { name: 'Hardware' }).getAttribute('aria-selected')).toBe('true');
    await userEvent.keyboard('{Enter}');
    expect(input().value).toBe('Hardware');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('UI-FORM-01: Enter picks a highlighted suggestion instead of saving, and saves otherwise', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await userEvent.type(input(), 'ret');
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(input().value).toBe('Retail');
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('UI-FORM-01: Escape hides the list without reaching the dialog; ArrowDown brings it back', async () => {
    // The dialog listens for Escape on the document.
    const outside = vi.fn();
    document.addEventListener('keydown', outside);
    render(<Harness />);
    await userEvent.type(input(), 'e');
    outside.mockClear();
    expect(screen.getByRole('listbox')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    document.removeEventListener('keydown', outside);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(outside).not.toHaveBeenCalled();
    // With the list hidden, other keys do nothing special.
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.queryByRole('listbox')).toBeNull();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(input().value).toBe('e');
  });

  test('clicking a suggestion picks it', async () => {
    render(<Harness />);
    await userEvent.type(input(), 'fin');
    await userEvent.click(screen.getByRole('option', { name: 'Finance' }));
    expect(input().value).toBe('Finance');
    expect(screen.getByLabelText('Saved value').textContent).toBe('Finance');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(input());
  });

  test('free text that matches nothing is kept as typed', async () => {
    render(<Harness />);
    await userEvent.type(input(), 'Aerospace');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input().getAttribute('aria-expanded')).toBe('false');
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByLabelText('Saved value').textContent).toBe('Aerospace');
  });

  test('leaving the field hides the list and reports the blur', async () => {
    const onBlur = vi.fn();
    render(<Harness onBlur={onBlur} />);
    await userEvent.click(input());
    expect(screen.getByRole('listbox')).toBeTruthy();
    await userEvent.tab();
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  test('works without a blur handler or any suggestions', async () => {
    render(<Harness suggestions={[]} start="Retail" />);
    await userEvent.click(input());
    expect(screen.queryByRole('listbox')).toBeNull();
    await userEvent.tab();
    expect(input().value).toBe('Retail');
  });

  test('UI-FORM-02: an error marks the field invalid and links the message', () => {
    render(<Harness error="Use 200 characters or fewer" />);
    expect(input().getAttribute('aria-invalid')).toBe('true');
    const describedBy = input().getAttribute('aria-describedby');
    expect(describedBy && document.getElementById(describedBy)?.textContent).toBe('Use 200 characters or fewer');
  });
});
