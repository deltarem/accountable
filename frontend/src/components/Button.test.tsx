import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, test, vi } from 'vitest';

import { Button, IconButton, buttonClass } from './Button';

describe('Button', () => {
  test('is a plain button by default, so it never submits a form by accident', async () => {
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    render(
      <form onSubmit={(e) => onSubmit(e.nativeEvent as SubmitEvent)}>
        <Button>Cancel</Button>
        <Button type="submit" variant="dark">
          Save
        </Button>
      </form>,
    );
    expect(screen.getByRole('button', { name: 'Cancel' }).getAttribute('type')).toBe('button');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('variants and the small size give different looks, and extra classes are kept', () => {
    render(
      <>
        <Button>Secondary</Button>
        <Button variant="danger">Danger</Button>
        <Button size="sm">Small</Button>
        <Button className="extra">Extra</Button>
      </>,
    );
    const cls = (name: string) => screen.getByRole('button', { name }).className;
    expect(cls('Danger')).not.toBe(cls('Secondary'));
    expect(cls('Small')).not.toBe(cls('Secondary'));
    expect(cls('Extra').split(' ')).toContain('extra');
  });

  test('passes its ref and other props to the button', async () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    render(
      <Button ref={ref} onClick={onClick} disabled>
        Delete
      </Button>,
    );
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Delete' }));
    expect(ref.current?.disabled).toBe(true);
    await userEvent.click(ref.current!);
    expect(onClick).not.toHaveBeenCalled();
  });
});

test('buttonClass styles a link like a button, matching Button', () => {
  render(
    <>
      <Button variant="primary" size="sm">
        Real
      </Button>
      <a href="/" className={buttonClass('primary', 'sm')}>
        Link
      </a>
      <a href="/" className={buttonClass()}>
        Default
      </a>
    </>,
  );
  const button = screen.getByRole('button', { name: 'Real' }).className.trim();
  expect(screen.getByRole('link', { name: 'Link' }).className.trim()).toBe(button);
  expect(screen.getByRole('link', { name: 'Default' }).className).not.toBe(
    screen.getByRole('link', { name: 'Link' }).className,
  );
});

describe('IconButton', () => {
  test('has an accessible name and a matching title for icon-only controls', async () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Edit Acme Ltd" onClick={onClick} className="row-action">
        <svg aria-hidden />
      </IconButton>,
    );
    const button = screen.getByRole('button', { name: 'Edit Acme Ltd' });
    expect(button.getAttribute('title')).toBe('Edit Acme Ltd');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.className.split(' ')).toContain('row-action');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('works without an extra class', () => {
    render(<IconButton label="Close">x</IconButton>);
    expect(screen.getByRole('button', { name: 'Close' }).className).not.toContain('undefined');
  });
});
