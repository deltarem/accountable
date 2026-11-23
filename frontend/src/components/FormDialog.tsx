import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import styles from './FormDialog.module.css';

/**
 * UI-FORM-01: forms open in a dialog. The first field has focus, Tab moves
 * between fields, Enter saves (the form's own submit) and Escape closes.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  children,
  width = 560,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  width?: number;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          style={{ width }}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            const first = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(
              'input:not([type=hidden]), textarea, select, [role=combobox], [role=radio]',
            );
            if (first) {
              event.preventDefault();
              first.focus();
            }
          }}
        >
          <div className={styles.head}>
            <Dialog.Title className={styles.title}>{title}</Dialog.Title>
            <Dialog.Close className={styles.close} aria-label="Close">
              <X size={18} aria-hidden />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
