import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router';

import { useDeals } from '../api/hooks';
import type { Deal } from '../api/types';
import { LateBadge, StageBadge } from '../components/Badges';
import { Button } from '../components/Button';
import { useForms } from '../components/forms/FormsProvider';
import { LoadError } from '../components/LoadError';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { DataTable } from '../components/table/DataTable';
import { RowActions } from '../components/table/RowActions';
import { formatDate, formatMoney, formatPercent } from '../lib/format';
import { STAGE_KEYS } from '../lib/stages';
import styles from './DealsPage.module.css';

const columns: ColumnDef<Deal, unknown>[] = [
  { id: 'name', header: 'Name', accessorFn: (d) => d.name, sortingFn: 'text' },
  {
    id: 'organization',
    header: 'Organization',
    accessorFn: (d) => d.organization_name ?? '',
    sortingFn: 'text',
    cell: ({ row }) => row.original.organization_name ?? <span className="muted-text">No organization</span>,
  },
  {
    id: 'contact',
    header: 'Main contact',
    accessorFn: (d) => d.contact_name ?? '',
    sortingFn: 'text',
  },
  {
    id: 'stage',
    header: 'Stage',
    accessorFn: (d) => d.stage,
    sortingFn: (a, b) => STAGE_KEYS.indexOf(a.original.stage) - STAGE_KEYS.indexOf(b.original.stage),
    cell: ({ row }) => <StageBadge stage={row.original.stage} />,
  },
  {
    id: 'value',
    header: 'Value',
    accessorFn: (d) => d.value_cents,
    cell: ({ getValue }) => formatMoney(getValue() as number),
    meta: { align: 'right', mono: true },
  },
  {
    id: 'probability',
    header: 'Probability',
    accessorFn: (d) => d.probability,
    cell: ({ getValue }) => formatPercent(getValue() as number),
    meta: { align: 'right', mono: true },
  },
  {
    id: 'close_date',
    header: 'Close date',
    accessorFn: (d) => d.close_date ?? '',
    sortingFn: 'text',
    cell: ({ row }) =>
      row.original.close_date ? (
        <span className={row.original.late ? styles.late : undefined}>
          {row.original.late ? <LateBadge /> : null}
          {formatDate(row.original.close_date)}
        </span>
      ) : null,
    meta: { align: 'right', mono: true },
  },
];

export function DealsPage() {
  const query = useDeals();
  const navigate = useNavigate();
  const { openForm, confirmDelete } = useForms();
  const newButton = (
    <Button variant="dark" onClick={() => openForm({ kind: 'deal' })}>
      <Plus size={16} aria-hidden /> New deal
    </Button>
  );
  return (
    <>
      <PageHeader title="Deals" action={newButton} />
      {query.isError ? (
        <Panel>
          <LoadError what="deals" onRetry={() => query.refetch()} />
        </Panel>
      ) : (
        <DataTable
          data={query.data}
          columns={columns}
          loading={query.isPending}
          noun="deal"
          nounPlural="deals"
          rowLabel={(d) => d.name}
          onOpen={(d) => navigate(`/deals/${d.id}`)}
          emptyAction={newButton}
          rowActions={(d) => (
            <RowActions
              name={d.name}
              onEdit={() => openForm({ kind: 'deal', record: d })}
              onDelete={() => confirmDelete({ kind: 'deals', id: d.id })}
            />
          )}
        />
      )}
    </>
  );
}
