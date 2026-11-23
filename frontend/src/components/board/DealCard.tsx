import { useDndContext } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as Tooltip from '@radix-ui/react-tooltip';

import type { Deal } from '../../api/types';
import { formatDate, formatMoney, initials } from '../../lib/format';
import { type StageInfo, isLate } from '../../lib/stages';
import styles from './DealCard.module.css';

/** The main contact's initials in a Midnight circle; a ringed circle with none. */
export function ContactInitials({ name }: { name: string | null }) {
  if (!name) {
    return <span className={`${styles.initials} ${styles.none}`} role="img" aria-label="No main contact" />;
  }
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className={styles.initials} role="img" aria-label={name}>
          {initials(name)}
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className={styles.tip} sideOffset={6}>
          {name}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** The close date in a white pill; pale Raspberry with "Late ·" for a late deal. */
export function DatePill({ date, late }: { date: string | null; late: boolean }) {
  if (!date) return <span className={styles.pill}>No date</span>;
  return (
    <span className={`${styles.pill} ${late ? styles.late : ''}`}>
      {late ? 'Late · ' : ''}
      {formatDate(date)}
    </span>
  );
}

function CardBody({ deal, today }: { deal: Deal; today: string }) {
  return (
    <>
      <div className={styles.value}>{formatMoney(deal.value_cents)}</div>
      <div className={styles.name}>{deal.name}</div>
      <div className={styles.org}>{deal.organization_name ?? 'No organization'}</div>
      <div className={styles.foot}>
        <ContactInitials name={deal.contact_name} />
        <DatePill date={deal.close_date} late={isLate(deal, today)} />
      </div>
    </>
  );
}

/** UI-PIPE-04: value first, then the name and organization; click to open. */
export function SortableDealCard({
  deal,
  stage,
  today,
  onOpen,
}: {
  deal: Deal;
  stage: StageInfo;
  today: string;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });
  const { active } = useDndContext();
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    // Where the card would land: a gap the size of the card, tinted in the column's stage colour.
    ...(isDragging ? { background: stage.badgeTint, boxShadow: `inset 0 0 0 2px ${stage.fill}` } : {}),
  };
  // dnd-kit's attributes already make the card a focusable button; the role
  // and tabIndex are repeated so they are visible in the markup, and a div is
  // used because an article cannot take an interactive role.
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.placeholder : ''}`}
      data-testid="deal-card"
      data-deal-id={deal.id}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-roledescription="deal card"
      aria-label={`${deal.name}, ${formatMoney(deal.value_cents)}`}
      onClick={() => {
        if (!active) onOpen();
      }}
      onKeyDown={(event) => {
        listeners?.onKeyDown?.(event);
        if (event.key === 'Enter' && !active) onOpen();
      }}
    >
      <CardBody deal={deal} today={today} />
    </div>
  );
}

/** The card while dragging: white, lifted, tilted 2 degrees (DES-04). */
export function DealCardOverlay({ deal, today }: { deal: Deal; today: string }) {
  return (
    <article className={`${styles.card} ${styles.overlay}`}>
      <CardBody deal={deal} today={today} />
    </article>
  );
}
