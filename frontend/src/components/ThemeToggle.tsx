import * as Tooltip from '@radix-ui/react-tooltip';
import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';

import { currentTheme, setTheme, type Theme } from '../lib/theme';
import styles from './RailLink.module.css';

/**
 * The light and dark toggle at the foot of the rail (spec: Layout, "Light and
 * dark toggle"). It starts from the mode index.html already set, and switches
 * the whole app through one attribute on <html>.
 */
export function ThemeToggle() {
  const [theme, setShown] = useState<Theme>(currentTheme);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${next} mode`;
  const Icon = theme === 'dark' ? Sun : Moon;

  function toggle() {
    setTheme(next);
    setShown(next);
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button type="button" aria-label={label} className={`${styles.link} ${styles.button}`} onClick={toggle}>
          <Icon size={20} strokeWidth={2} aria-hidden />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="right" sideOffset={10} className={styles.tip}>
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
