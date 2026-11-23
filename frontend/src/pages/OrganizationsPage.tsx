import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router';

import { useOrganizations } from '../api/hooks';
import type { Organization } from '../api/types';
import { Button } from '../components/Button';
import { useForms } from '../components/forms/FormsProvider';
import { LoadError } from '../components/LoadError';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { DataTable } from '../components/table/DataTable';
import { RowActions } from '../components/table/RowActions';
import { displayWebsite, formatMoney } from '../lib/format';

const columns: ColumnDef<Organization, unknown>[] = [
  { id: 'name', header: 'Name', accessorFn: (o) => o.name, sortingFn: 'text' },
  {
    id: 'industry',
    header: 'Industry',
    accessorFn: (o) => o.industry ?? '',
    sortingFn: 'text',
  },
  {
    id: 'website',
    header: 'Website',
    accessorFn: (o) => o.website ?? '',
    sortingFn: 'text',
    cell: ({ row }) =>
      row.original.website ? (
        <a href={row.original.website} target="_blank" rel="noreferrer noopener">
          {displayWebsite(row.original.website)}
        </a>
      ) : null,
  },
  { id: 'contacts', header: 'Contacts', accessorFn: (o) => o.contact_count, meta: { align: 'right', mono: true } },
  { id: 'open_deals', header: 'Open deals', accessorFn: (o) => o.open_deal_count, meta: { align: 'right', mono: true } },
  {
    id: 'open_value',
    header: 'Open value',
    accessorFn: (o) => o.open_value_cents,
    cell: ({ getValue }) => formatMoney(getValue() as number),
    meta: { align: 'right', mono: true },
  },
];

export function OrganizationsPage() {
  const query = useOrganizations();
  const navigate = useNavigate();
  const { openForm, confirmDelete } = useForms();
  const newButton = (
    <Button variant="dark" onClick={() => openForm({ kind: 'organization' })}>
      <Plus size={16} aria-hidden /> New organization
    </Button>
  );
  return (
    <>
      <PageHeader title="Organizations" action={newButton} />
      {query.isError ? (
        <Panel>
          <LoadError what="organizations" onRetry={() => query.refetch()} />
        </Panel>
      ) : (
        <DataTable
          data={query.data}
          columns={columns}
          loading={query.isPending}
          noun="organization"
          nounPlural="organizations"
          rowLabel={(o) => o.name}
          onOpen={(o) => navigate(`/organizations/${o.id}`)}
          emptyAction={newButton}
          rowActions={(o) => (
            <RowActions
              name={o.name}
              onEdit={() => openForm({ kind: 'organization', record: o })}
              onDelete={() => confirmDelete({ kind: 'organizations', id: o.id })}
            />
          )}
        />
      )}
    </>
  );
}
