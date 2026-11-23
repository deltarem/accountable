import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router';

import { ApiError } from '../api/client';
import { useDeals, useMoveDeal } from '../api/hooks';
import { Board } from '../components/board/Board';
import { BoardTotals } from '../components/board/BoardTotals';
import { Button } from '../components/Button';
import { useForms } from '../components/forms/FormsProvider';
import { LoadError } from '../components/LoadError';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toaster';
import { STAGES } from '../lib/stages';
import { useTodayValue } from '../lib/today';
import styles from './PipelinePage.module.css';

export function PipelinePage() {
  const deals = useDeals();
  const { today } = useTodayValue();
  const move = useMoveDeal(today);
  const navigate = useNavigate();
  const { openForm } = useForms();
  const toast = useToast();

  const onMove = (id: number, stage: string, index: number) => {
    const name = deals.data?.find((d) => d.id === id)?.name ?? 'the deal';
    move.mutate(
      { id, stage, index },
      {
        onError: (error) => {
          // UI-PIPE-07: the card goes back, and the message says why.
          const why =
            error instanceof ApiError && error.status !== 0 && error.status < 500
              ? error.message
              : error instanceof ApiError && error.status === 0
                ? error.message
                : 'The server ran into a problem.';
          toast(`Couldn't move ${name}. ${why}`, 'error');
        },
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Pipeline"
        action={
          <Button variant="dark" onClick={() => openForm({ kind: 'deal' })}>
            <Plus size={16} aria-hidden /> New deal
          </Button>
        }
      />
      {deals.isError ? (
        <Panel>
          <LoadError what="pipeline" onRetry={() => deals.refetch()} />
        </Panel>
      ) : (
        <>
          <BoardTotals deals={deals.data} />
          {deals.data && today ? (
            <Board
              deals={deals.data}
              today={today}
              onMove={onMove}
              onAdd={(stage) => openForm({ kind: 'deal', defaults: { stage } })}
              onOpen={(id) => navigate(`/deals/${id}`)}
            />
          ) : (
            <div className={styles.loading} aria-busy>
              {STAGES.map((s) => (
                <div key={s.key} className={styles.column}>
                  <Skeleton height={86} radius={14} />
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} height={104} radius={14} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
