import { stage as stageInfo, status as statusInfo } from '../lib/stages';
import styles from './Badges.module.css';

/** Pale tint with darker text in the same hue (DES-02). */
export function StageBadge({ stage }: { stage: string }) {
  const s = stageInfo(stage);
  return (
    <span className={styles.badge} style={{ color: s.badgeText, background: s.badgeTint }}>
      {s.name}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = statusInfo(status);
  return (
    <span className={styles.badge} style={{ color: s.text, background: s.tint }}>
      {s.name}
    </span>
  );
}

export function LateBadge() {
  return <span className={`${styles.badge} ${styles.late}`}>Late</span>;
}
