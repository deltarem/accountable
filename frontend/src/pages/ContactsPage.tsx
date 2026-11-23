import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import { useContacts } from '../api/hooks';
import type { Contact } from '../api/types';
import { StatusBadge } from '../components/Badges';
import { Button } from '../components/Button';
import { useForms } from '../components/forms/FormsProvider';
import { LoadError } from '../components/LoadError';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { DataTable } from '../components/table/DataTable';
import { RowActions } from '../components/table/RowActions';
import { type StatusChoice, StatusFilter } from '../components/table/StatusFilter';
import { STATUSES } from '../lib/stages';

const STATUS_ORDER: Record<string, number> = Object.fromEntries(STATUSES.map((s, i) => [s.key, i]));

const columns: ColumnDef<Contact, unknown>[] = [
  { id: 'name', header: 'Name', accessorFn: (c) => c.name, sortingFn: 'text' },
  {
    id: 'organization',
    header: 'Organization',
    accessorFn: (c) => c.organization_name ?? '',
    sortingFn: 'text',
    cell: ({ row }) => row.original.organization_name ?? <span className="muted-text">No organization</span>,
  },
  { id: 'job_title', header: 'Job title', accessorFn: (c) => c.job_title ?? '', sortingFn: 'text' },
  {
    id: 'email',
    header: 'Email',
    accessorFn: (c) => c.email ?? '',
    sortingFn: 'text',
    cell: ({ row }) => (row.original.email ? <a href={`mailto:${row.original.email}`}>{row.original.email}</a> : null),
  },
  { id: 'phone', header: 'Phone', accessorFn: (c) => c.phone ?? '', sortingFn: 'text' },
  {
    id: 'status',
    header: 'Status',
    accessorFn: (c) => c.status,
    sortingFn: (a, b) => STATUS_ORDER[a.original.status] - STATUS_ORDER[b.original.status],
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function ContactsPage() {
  const query = useContacts();
  const navigate = useNavigate();
  const { openForm, confirmDelete } = useForms();
  const [status, setStatus] = useState<StatusChoice>('all');
  const all = query.data ?? [];
  const byStatus = useCallback((c: Contact) => c.status === status, [status]);
  const counts = {
    all: all.length,
    lead: all.filter((c) => c.status === 'lead').length,
    qualified: all.filter((c) => c.status === 'qualified').length,
    customer: all.filter((c) => c.status === 'customer').length,
  };
  const newButton = (
    <Button variant="dark" onClick={() => openForm({ kind: 'contact' })}>
      <Plus size={16} aria-hidden /> New contact
    </Button>
  );
  return (
    <>
      <PageHeader title="Contacts" action={newButton} />
      {query.isError ? (
        <Panel>
          <LoadError what="contacts" onRetry={() => query.refetch()} />
        </Panel>
      ) : (
        <DataTable
          data={query.data}
          columns={columns}
          loading={query.isPending}
          noun="contact"
          nounPlural="contacts"
          rowLabel={(c) => c.name}
          onOpen={(c) => navigate(`/contacts/${c.id}`)}
          emptyAction={newButton}
          filters={<StatusFilter value={status} onChange={setStatus} counts={counts} />}
          filterRows={status === 'all' ? undefined : byStatus}
          rowActions={(c) => (
            <RowActions
              name={c.name}
              onEdit={() => openForm({ kind: 'contact', record: c })}
              onDelete={() => confirmDelete({ kind: 'contacts', id: c.id })}
            />
          )}
        />
      )}
    </>
  );
}
