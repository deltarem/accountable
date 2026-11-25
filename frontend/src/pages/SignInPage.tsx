import { type FormEvent, useState } from 'react';

import { useSession } from '../auth/session';
import { TEST_USER } from '../auth/config';
import { SignInError, UNREACHABLE } from '../auth/service';
import { Button } from '../components/Button';
import { Field, TextInput } from '../components/fields';
import styles from './SignInPage.module.css';

/**
 * UI-AUTH-01: the only screen with no rail and no top bar. Signed out, every
 * address shows it, and the address stays, so signing in opens the page that was
 * asked for (UI-AUTH-02).
 */
export function SignInPage() {
  const session = useSession();
  const [email, setEmail] = useState(session.local ? TEST_USER.email : '');
  const [password, setPassword] = useState(session.local ? TEST_USER.password : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!email.trim()) return setError('Enter your email');
    if (!password) return setError('Enter your password');
    setError(null);
    setBusy(true);
    try {
      await session.signIn(email, password);
    } catch (failure) {
      setError(failure instanceof SignInError ? failure.message : UNREACHABLE);
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.panel} onSubmit={submit} noValidate aria-labelledby="sign-in-title">
        <div className={styles.mark} aria-hidden>
          A
        </div>
        <h1 id="sign-in-title" className={styles.title}>
          Sign in to Accountable
        </h1>
        {session.endedMessage ? (
          <p className={styles.notice} role="status">
            {session.endedMessage}
          </p>
        ) : null}
        <Field label="Email">
          <TextInput
            type="email"
            autoComplete="username"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            // The screen exists to sign in, so the email field takes focus (UI-AUTH-01).
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </Field>
        {/* Every sign-in error shows under the password, as form errors do (UI-FORM-02). */}
        <Field label="Password" error={error ?? undefined}>
          <TextInput
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {session.local ? (
          <p className={styles.muted}>Local mode: you&apos;re signing in as the built-in test user.</p>
        ) : null}
        <Button type="submit" variant="primary" className={styles.submit} disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in'}
        </Button>
        <p className={styles.muted}>New here? Ask your team to add you to Accountable.</p>
      </form>
    </main>
  );
}
