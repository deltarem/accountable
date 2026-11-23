import * as Toast from '@radix-ui/react-toast';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

import styles from './Toaster.module.css';

type Tone = 'success' | 'error';
interface Message {
  id: number;
  text: string;
  tone: Tone;
}

const ToastContext = createContext<(text: string, tone?: Tone) => void>(() => {});

/** Short messages at the bottom right: "Deal saved", or what failed (UI-FORM-05, UI-ERR-01). */
export function Toaster({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const show = useCallback((text: string, tone: Tone = 'success') => {
    setMessages((list) => [...list.slice(-2), { id: Date.now() + Math.random(), text, tone }]);
  }, []);
  const remove = (id: number) => setMessages((list) => list.filter((m) => m.id !== id));
  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      <Toast.Provider swipeDirection="right" duration={4000}>
        {children}
        {messages.map((m) => (
          <Toast.Root
            key={m.id}
            className={`${styles.toast} ${m.tone === 'error' ? styles.error : ''}`}
            duration={m.tone === 'error' ? 7000 : 3500}
            type={m.tone === 'error' ? 'foreground' : 'background'}
            onOpenChange={(open) => {
              if (!open) remove(m.id);
            }}
          >
            {m.tone === 'error' ? (
              <CircleAlert size={18} className={styles.icon} aria-hidden />
            ) : (
              <CircleCheck size={18} className={styles.icon} aria-hidden />
            )}
            <Toast.Description className={styles.text}>{m.text}</Toast.Description>
            <Toast.Close className={styles.close} aria-label="Dismiss">
              <X size={16} aria-hidden />
            </Toast.Close>
          </Toast.Root>
        ))}
        <Toast.Viewport className={styles.viewport} label="Messages ({hotkey})" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
