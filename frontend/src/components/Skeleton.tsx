import styles from './Skeleton.module.css';

/** A grey placeholder shape that holds the layout while data loads (UI-EMPTY-05). */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 6,
  dark = false,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  dark?: boolean;
}) {
  return (
    <span
      className={`${styles.skeleton} ${dark ? styles.dark : ''}`}
      style={{ width, height, borderRadius: radius }}
      data-testid="skeleton"
      aria-hidden
    />
  );
}
