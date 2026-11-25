import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { SignInError, UNREACHABLE, WRONG_DETAILS } from '../auth/service';
import { fakeSession, renderSignedIn } from '../test/session';
import { SignInPage } from './SignInPage';

function renderPage(overrides: Parameters<typeof fakeSession>[0] = {}) {
  const session = fakeSession({ status: 'signed-out', user: null, local: false, ...overrides });
  renderSignedIn(<SignInPage />, { session });
  return session;
}

const email = () => screen.getByLabelText('Email') as HTMLInputElement;
const password = () => screen.getByLabelText('Password') as HTMLInputElement;

describe('the sign-in screen (UI-AUTH-01)', () => {
  test('has the title, the two fields with focus on the email, and the line for newcomers', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in to Accountable' })).toBeTruthy();
    expect(document.activeElement).toBe(email());
    expect(email().placeholder).toBe('name@company.com');
    expect(password().type).toBe('password');
    expect(screen.getByText('New here? Ask your team to add you to Accountable.')).toBeTruthy();
    expect(screen.queryByText(/Local mode/)).toBeNull();
  });

  test('Enter signs in with what was typed', async () => {
    const session = renderPage();
    await userEvent.type(email(), 'priya@company.com');
    await userEvent.type(password(), 'secret{Enter}');
    expect(session.signIn).toHaveBeenCalledWith('priya@company.com', 'secret');
  });

  test('a missing field says which, under the password, and sends nothing', async () => {
    const session = renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('alert').textContent).toBe('Enter your email');
    await userEvent.type(email(), 'priya@company.com{Enter}');
    expect(screen.getByRole('alert').textContent).toBe('Enter your password');
    expect(password().getAttribute('aria-invalid')).toBe('true');
    expect(session.signIn).not.toHaveBeenCalled();
  });

  test.each([WRONG_DETAILS, UNREACHABLE])('shows "%s" when signing in fails', async (message) => {
    renderPage({ signIn: vi.fn(async () => Promise.reject(new SignInError(message))) });
    await userEvent.type(email(), 'priya@company.com');
    await userEvent.type(password(), 'wrong{Enter}');
    expect((await screen.findByRole('alert')).textContent).toBe(message);
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveProperty('disabled', false);
  });

  test('reads "Signing in..." and can\'t be pressed twice while it waits', async () => {
    const session = renderPage({ signIn: vi.fn(() => new Promise<void>(() => {})) });
    await userEvent.type(email(), 'priya@company.com');
    await userEvent.type(password(), 'secret{Enter}');
    const button = screen.getByRole('button', { name: 'Signing in...' });
    expect(button).toHaveProperty('disabled', true);
    await userEvent.type(password(), '{Enter}');
    expect(session.signIn).toHaveBeenCalledOnce();
  });

  test('says when the session has ended', () => {
    renderPage({ endedMessage: 'Your session has ended. Sign in again.' });
    expect(screen.getByRole('status').textContent).toBe('Your session has ended. Sign in again.');
  });

  test('in local mode the test user is filled in, and the screen says so', async () => {
    const session = renderPage({ local: true });
    expect(email().value).toBe('test@example.com');
    expect(password().value).toBe('accountable');
    expect(screen.getByText("Local mode: you're signing in as the built-in test user.")).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(session.signIn).toHaveBeenCalledWith('test@example.com', 'accountable');
  });
});
