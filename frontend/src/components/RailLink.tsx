import * as Tooltip from '@radix-ui/react-tooltip';
import type { LucideIcon } from 'lucide-react';
import { Link, useMatch } from 'react-router';

import styles from './RailLink.module.css';

/** An icon button with an accessible name and a tooltip on hover and focus. */
export function RailLink({ to, label, icon: Icon, end }: { to: string; label: string; icon: LucideIcon; end: boolean }) {
  // Radix's Slot can't merge NavLink's className function, so work out "current" here.
  const active = useMatch({ path: to, end }) !== null;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Link
          to={to}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          className={active ? `${styles.link} ${styles.on}` : styles.link}
        >
          <Icon size={20} strokeWidth={2} aria-hidden />
        </Link>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="right" sideOffset={10} className={styles.tip}>
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
