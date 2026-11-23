import { type ButtonHTMLAttributes, forwardRef } from 'react';

import styles from './Button.module.css';

type Variant = 'dark' | 'primary' | 'secondary' | 'danger' | 'ghost';

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'sm' }
>(function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={[styles.button, styles[variant], size === 'sm' ? styles.sm : '', className ?? ''].join(' ')}
      {...rest}
    />
  );
});

export function buttonClass(variant: Variant = 'secondary', size: 'md' | 'sm' = 'md') {
  return [styles.button, styles[variant], size === 'sm' ? styles.sm : ''].join(' ');
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={`${styles.icon} ${className ?? ''}`} {...rest}>
      {children}
    </button>
  );
}
