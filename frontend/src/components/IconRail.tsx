import { Building2, Columns3, DollarSign, LayoutDashboard, Users } from 'lucide-react';
import { Link } from 'react-router';

import styles from './IconRail.module.css';
import { RailLink } from './RailLink';

export const SECTIONS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/pipeline', label: 'Pipeline', icon: Columns3, end: false },
  { to: '/deals', label: 'Deals', icon: DollarSign, end: false },
  { to: '/contacts', label: 'Contacts', icon: Users, end: false },
  { to: '/organizations', label: 'Organizations', icon: Building2, end: false },
];

/** UI-LAY-01: a fixed Midnight rail with the mark and five section buttons. */
export function IconRail() {
  return (
    <nav className={styles.rail} aria-label="Sections">
      <Link to="/" className={styles.mark} aria-label="Accountable, go to the dashboard">
        A
      </Link>
      {SECTIONS.map((s) => (
        <RailLink key={s.to} to={s.to} label={s.label} icon={s.icon} end={s.end} />
      ))}
    </nav>
  );
}
