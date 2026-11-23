import type { ReactNode } from 'react';

import styles from './Panel.module.css';

/** A white panel: 20px corners, no outline, a faint shadow (DES-04). */
export function Panel({
  title,
  note,
  children,
  className,
  dark = false,
  as: Tag = 'section',
  labelledBy,
}: {
  title?: ReactNode;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
  dark?: boolean;
  as?: 'section' | 'div';
  labelledBy?: string;
}) {
  const classes = [styles.panel, dark ? styles.dark : '', className ?? ''].join(' ');
  return (
    <Tag className={classes} aria-labelledby={labelledBy}>
      {title || note ? (
        <div className={styles.head}>
          {title ? (
            <h2 className={styles.title} id={labelledBy}>
              {title}
            </h2>
          ) : (
            <span />
          )}
          {note ? <div className={styles.note}>{note}</div> : null}
        </div>
      ) : null}
      {children}
    </Tag>
  );
}
