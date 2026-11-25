import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Check, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { useState } from 'react';

import { useSession } from '../../auth/session';
import { type ThemeChoice, chooseTheme, readChoice } from '../../lib/theme';
import styles from './AccountMenu.module.css';

const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/**
 * UI-MENU-01: the circle with your initials, on the right of the top bar. Its
 * menu holds who you are, the theme choice (UI-THEME-01) and signing out. Radix
 * gives the keys: Enter, Space or the down arrow open it, the arrows move, Escape
 * closes it and returns focus to the initials.
 */
export function AccountMenu() {
  const { user, signOut } = useSession();
  const [choice, setChoice] = useState<ThemeChoice>(readChoice);
  if (!user) return null;
  const label = `Account menu for ${user.name}`;

  return (
    <DropdownMenu.Root>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <DropdownMenu.Trigger className={styles.initials} aria-label={label}>
            <span aria-hidden>{user.initials}</span>
          </DropdownMenu.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side="bottom" align="end" sideOffset={8} className={styles.tip}>
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.menu} align="end" sideOffset={8}>
          <DropdownMenu.Label className={styles.who}>
            <span className={styles.name}>{user.name}</span>
            <span className={styles.email}>{user.email}</span>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className={styles.separator} />
          <DropdownMenu.Label className={styles.heading}>Theme</DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={choice}
            onValueChange={(next) => {
              chooseTheme(next as ThemeChoice);
              setChoice(next as ThemeChoice);
            }}
          >
            {THEMES.map(({ value, label: name, icon: Icon }) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className={styles.item}
                // Choosing a theme keeps the menu open, to see the result.
                onSelect={(event) => event.preventDefault()}
              >
                <Icon size={16} aria-hidden />
                <span className={styles.label}>{name}</span>
                <DropdownMenu.ItemIndicator className={styles.tick}>
                  <Check size={15} aria-hidden />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className={styles.separator} />
          <DropdownMenu.Item className={styles.item} onSelect={() => void signOut()}>
            <LogOut size={16} aria-hidden />
            <span className={styles.label}>Sign out</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
