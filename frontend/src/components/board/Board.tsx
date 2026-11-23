// The pipeline board (UI-PIPE-02 to UI-PIPE-08). dnd-kit's sortable preset
// with one SortableContext per column, the pointer and keyboard sensors and a
// drag overlay. The board's state while dragging is a plain map from stage to
// ordered deal ids; the server renumbers positions on every move.

import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  type UniqueIdentifier,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';

import type { Deal } from '../../api/types';
import { type Columns, findColumn, toColumns } from '../../lib/board';
import { STAGES, type StageKey } from '../../lib/stages';
import styles from './Board.module.css';
import { DealCardOverlay } from './DealCard';
import { boardKeyboardCoordinates } from './keyboard';
import { StageColumn } from './StageColumn';

export const columnId = (stage: StageKey) => `column:${stage}`;

function containerOf(columns: Columns, id: UniqueIdentifier): StageKey | undefined {
  if (typeof id === 'string' && id.startsWith('column:')) return id.slice(7) as StageKey;
  return findColumn(columns, Number(id));
}

const ANNOUNCE = {
  onDragStart: () => 'Picked up the deal. Use the arrow keys to move it, Space to drop it, Escape to cancel.',
  onDragOver: () => 'Moving the deal.',
  onDragEnd: () => 'Dropped the deal.',
  onDragCancel: () => 'Move cancelled. The deal is back where it was.',
};

export function Board({
  deals,
  today,
  onMove,
  onAdd,
  onOpen,
}: {
  deals: Deal[];
  today: string;
  onMove: (id: number, stage: StageKey, index: number) => void;
  onAdd: (stage: StageKey) => void;
  onOpen: (id: number) => void;
}) {
  const [dragColumns, setDragColumns] = useState<Columns | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [origin, setOrigin] = useState<{ stage: StageKey; index: number } | null>(null);
  const byId = useMemo(() => new Map(deals.map((d) => [d.id, d])), [deals]);
  const serverColumns = useMemo(() => toColumns(deals), [deals]);
  const columns = dragColumns ?? serverColumns;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: boardKeyboardCoordinates,
      // Space picks up and drops; Enter is left free to open the deal.
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    const id = Number(active.id);
    const stage = findColumn(serverColumns, id);
    setActiveId(id);
    setDragColumns(serverColumns);
    if (stage) setOrigin({ stage, index: serverColumns[stage].indexOf(id) });
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !dragColumns) return;
    const from = containerOf(dragColumns, active.id);
    const to = containerOf(dragColumns, over.id);
    if (!from || !to || from === to) return;
    setDragColumns((current) => {
      if (!current) return current;
      const id = Number(active.id);
      const target = current[to];
      const overIndex = typeof over.id === 'number' ? target.indexOf(over.id) : -1;
      const index = overIndex >= 0 ? overIndex : target.length;
      return {
        ...current,
        [from]: current[from].filter((x) => x !== id),
        [to]: [...target.slice(0, index), id, ...target.slice(index)],
      };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = Number(active.id);
    let final = dragColumns ?? serverColumns;
    const stage = containerOf(final, active.id);
    if (over && stage) {
      const overStage = containerOf(final, over.id);
      if (overStage === stage && typeof over.id === 'number') {
        const from = final[stage].indexOf(id);
        const to = final[stage].indexOf(over.id);
        if (from !== to) final = { ...final, [stage]: arrayMove(final[stage], from, to) };
      }
    }
    setActiveId(null);
    setDragColumns(null);
    setOrigin(null);
    if (!over || !stage) return;
    const index = final[stage].indexOf(id);
    if (!origin || origin.stage !== stage || origin.index !== index) onMove(id, stage, index);
  };

  const onDragCancel = () => {
    setActiveId(null);
    setDragColumns(null);
    setOrigin(null);
  };

  const active = activeId !== null ? byId.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
      accessibility={{
        announcements: ANNOUNCE,
        screenReaderInstructions: {
          draggable:
            'To move a deal, press Space. Use the arrow keys to move it, then Space to drop it. Press Enter to open it.',
        },
      }}
    >
      <div className={styles.board} data-testid="board">
        {STAGES.map((s) => (
          <StageColumn
            key={s.key}
            stage={s}
            ids={columns[s.key]}
            deals={byId}
            today={today}
            onAdd={() => onAdd(s.key)}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>{active ? <DealCardOverlay deal={active} today={today} /> : null}</DragOverlay>
    </DndContext>
  );
}
