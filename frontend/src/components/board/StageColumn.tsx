import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';

import type { Deal } from '../../api/types';
import { type StageInfo, totals } from '../../lib/stages';
import { ColumnHeader } from './ColumnHeader';
import { SortableDealCard } from './DealCard';
import styles from './StageColumn.module.css';

/** A white panel per stage. An empty column stays a drop target (UI-PIPE-08). */
export function StageColumn({
  stage,
  ids,
  deals,
  today,
  onAdd,
  onOpen,
}: {
  stage: StageInfo;
  ids: number[];
  deals: Map<number, Deal>;
  today: string;
  onAdd: () => void;
  onOpen: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${stage.key}` });
  const inColumn = ids.map((id) => deals.get(id)).filter((d): d is Deal => !!d);
  const valueCents = inColumn.reduce((sum, d) => sum + d.value_cents, 0);
  const expectedCents = stage.open ? totals(inColumn.map((d) => ({ ...d, stage: stage.key }))).expectedCents : null;

  return (
    <section className={styles.column} aria-label={`${stage.name} column`} data-stage={stage.key}>
      <ColumnHeader stage={stage} count={inColumn.length} valueCents={valueCents} expectedCents={expectedCents} />
      {stage.open ? (
        <button type="button" className={styles.add} onClick={onAdd} aria-label={`Add deal in ${stage.name}`}>
          <Plus size={14} aria-hidden /> Add deal
        </button>
      ) : null}
      <SortableContext id={`column:${stage.key}`} items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={styles.cards}>
          {inColumn.length === 0 ? (
            <div
              className={styles.empty}
              style={isOver ? { background: stage.badgeTint, boxShadow: `inset 0 0 0 2px ${stage.fill}` } : undefined}
            >
              No deals
            </div>
          ) : (
            inColumn.map((deal) => (
              <SortableDealCard key={deal.id} deal={deal} stage={stage} today={today} onOpen={() => onOpen(deal.id)} />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}
