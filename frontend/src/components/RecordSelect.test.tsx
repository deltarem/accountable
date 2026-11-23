import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';

import { Field } from './fields';
import { type RecordOption, RecordSelect } from './RecordSelect';

const CONTACTS: RecordOption[] = [
  { value: 11, label: 'Tom Becker', hint: 'Globex Corp', group: 'At Globex Corp' },
  { value: 12, label: 'Zoe Adams', hint: 'Globex Corp', group: 'At Globex Corp' },
  { value: 10, label: 'Aisha Khan', hint: null, group: 'Other contacts' },
  { value: 13, label: 'Maria Lopez', hint: 'Acme Ltd', group: 'Other contacts' },
];

function Harness({
  start = null,
  options = CONTACTS,
  noneLabel,
  error,
  onBlur,
}: {
  start?: number | null;
  options?: RecordOption[];
  noneLabel?: string;
  error?: string;
  onBlur?: () => void;
}) {
  const [value, setValue] = useState<number | null>(start);
  return (
    <>
      <Field label="Main contact" error={error}>
        <RecordSelect
          value={value}
          onChange={setValue}
          onBlur={onBlur}
          options={options}
          placeholder="No main contact"
          searchPlaceholder="Search contacts"
          noneLabel={noneLabel}
        />
      </Field>
      <output aria-label="Chosen">{String(value)}</output>
    </>
  );
}

const trigger = () => screen.getByRole('combobox', { name: 'Main contact' });
const chosen = () => screen.getByLabelText('Chosen').textContent;
const optionTexts = () =>
  within(screen.getByRole('listbox'))
    .queryAllByRole('option')
    .map((o) => o.textContent?.replace(/\s+/g, ' ').trim());

describe('RecordSelect (UI-FORM-03)', () => {
  test('shows the placeholder until a record is chosen, and the chosen name after', () => {
    render(<Harness />);
    expect(trigger().textContent).toBe('No main contact');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  test('shows the chosen record by name', () => {
    render(<Harness start={13} />);
    expect(trigger().textContent).toBe('Maria Lopez');
  });

  test('opens with ArrowDown and lists the records under their groups', async () => {
    render(<Harness />);
    trigger().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('At Globex Corp')).toBeTruthy();
    expect(within(listbox).getByText('Other contacts')).toBeTruthy();
    expect(optionTexts()).toEqual([
      'Tom Becker Globex Corp',
      'Zoe Adams Globex Corp',
      'Aisha Khan',
      'Maria Lopez Acme Ltd',
    ]);
  });

  test('other keys on the closed select do not open it', async () => {
    render(<Harness />);
    trigger().focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('searching narrows the list, by name or by the hint', async () => {
    render(<Harness />);
    await userEvent.click(trigger());
    await userEvent.type(screen.getByPlaceholderText('Search contacts'), 'zoe');
    expect(optionTexts()).toEqual(['Zoe Adams Globex Corp']);
    await userEvent.clear(screen.getByPlaceholderText('Search contacts'));
    await userEvent.type(screen.getByPlaceholderText('Search contacts'), 'acme');
    expect(optionTexts()).toEqual(['Maria Lopez Acme Ltd']);
    await userEvent.clear(screen.getByPlaceholderText('Search contacts'));
    await userEvent.type(screen.getByPlaceholderText('Search contacts'), 'nobody');
    expect(screen.getByText('Nothing matches')).toBeTruthy();
  });

  test('picking a record chooses it and closes the list', async () => {
    render(<Harness />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole('option', { name: /Aisha Khan/ }));
    expect(chosen()).toBe('10');
    expect(trigger().textContent).toBe('Aisha Khan');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  test('the keyboard picks too: type to search, Enter to choose', async () => {
    render(<Harness />);
    await userEvent.click(trigger());
    await userEvent.keyboard('tom{Enter}');
    expect(chosen()).toBe('11');
    expect(trigger().textContent).toBe('Tom Becker');
  });

  test('marks the chosen record in the list', async () => {
    render(<Harness start={12} noneLabel="No main contact" />);
    await userEvent.click(trigger());
    const zoe = screen.getByRole('option', { name: /Zoe Adams/ });
    const tom = screen.getByRole('option', { name: /Tom Becker/ });
    expect(zoe.querySelector('svg')).not.toBeNull();
    expect(tom.querySelector('svg')).toBeNull();
    expect(screen.getByRole('option', { name: 'No main contact' }).querySelector('svg')).toBeNull();
  });

  test('with a "none" choice, a record can be cleared', async () => {
    render(<Harness start={12} noneLabel="No main contact" />);
    await userEvent.click(trigger());
    expect(optionTexts()[0]).toBe('No main contact');
    await userEvent.click(screen.getByRole('option', { name: 'No main contact' }));
    expect(chosen()).toBe('null');
    expect(trigger().textContent).toBe('No main contact');
    await userEvent.click(trigger());
    expect(screen.getByRole('option', { name: 'No main contact' }).querySelector('svg')).not.toBeNull();
  });

  test('options without groups show as one plain list', async () => {
    render(
      <Harness
        options={[
          { value: 1, label: 'Acme Ltd' },
          { value: 2, label: 'Globex Corp' },
        ]}
      />,
    );
    await userEvent.click(trigger());
    expect(optionTexts()).toEqual(['Acme Ltd', 'Globex Corp']);
  });

  test('closing with Escape keeps the value and reports the blur, so a required select can show its error', async () => {
    const onBlur = vi.fn();
    render(<Harness start={11} onBlur={onBlur} />);
    await userEvent.click(trigger());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(chosen()).toBe('11');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  test('closing works without a blur handler', async () => {
    render(<Harness />);
    await userEvent.click(trigger());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(chosen()).toBe('null');
  });

  test('UI-FORM-02: an error marks the select invalid and links the message', () => {
    render(<Harness error="Choose an organization" />);
    expect(trigger().getAttribute('aria-invalid')).toBe('true');
    const describedBy = trigger().getAttribute('aria-describedby');
    expect(describedBy && document.getElementById(describedBy)?.textContent).toBe('Choose an organization');
  });
});
