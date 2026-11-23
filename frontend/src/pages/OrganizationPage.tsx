import { useNavigate, useParams } from 'react-router';

import { useOrganization } from '../api/hooks';
import type { OrganizationDetail } from '../api/types';
import { StageBadge, StatusBadge } from '../components/Badges';
import { useForms } from '../components/forms/FormsProvider';
import { Panel } from '../components/Panel';
import { HeaderFact, LinkedList, RecordColumns, RecordHeader } from '../components/record/RecordParts';
import { Timeline } from '../components/record/Timeline';
import { displayWebsite, formatMoney } from '../lib/format';
import { BackLink, RecordLoadFailure } from './recordShared';

function OrganizationFacts({ org }: { org: OrganizationDetail }) {
  return (
    <>
      <HeaderFact label="Industry">{org.industry ?? <span className="muted-text">Not set</span>}</HeaderFact>
      <HeaderFact label="Website">
        {org.website ? (
          <a href={org.website} target="_blank" rel="noreferrer noopener">
            {displayWebsite(org.website)}
          </a>
        ) : (
          <span className="muted-text">Not set</span>
        )}
      </HeaderFact>
      <HeaderFact label="Open value">
        <span className="mono">{formatMoney(org.open_value_cents)}</span>
      </HeaderFact>
      {org.notes ? (
        <HeaderFact label="Notes">
          <span className="pre-line">{org.notes}</span>
        </HeaderFact>
      ) : null}
    </>
  );
}

export function OrganizationPage() {
  const id = Number(useParams().id);
  const query = useOrganization(id);
  const navigate = useNavigate();
  const { openForm, confirmDelete } = useForms();
  const org = query.data;

  if (query.isError) {
    return (
      <RecordLoadFailure
        what="organization"
        listPath="/organizations"
        listLabel="Organizations"
        error={query.error}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <>
      <BackLink to="/organizations" label="Organizations" />
      <RecordHeader
        loading={!org}
        name={org?.name}
        onEdit={() => org && openForm({ kind: 'organization', record: org })}
        onDelete={() =>
          org &&
          confirmDelete({
            kind: 'organizations',
            id: org.id,
            onDeleted: () => navigate('/organizations', { replace: true }),
          })
        }
        facts={org ? <OrganizationFacts org={org} /> : null}
      />
      <RecordColumns
        left={
          <Panel>
            <LinkedList
              title="Contacts"
              emptyText="No contacts yet"
              onNew={org ? () => openForm({ kind: 'contact', defaults: { organization_id: org.id } }) : undefined}
              newLabel="New contact at this organization"
              rows={(org?.contacts ?? []).map((c) => ({
                id: c.id,
                to: `/contacts/${c.id}`,
                name: c.name,
                detail: c.job_title ?? undefined,
                aside: <StatusBadge status={c.status} />,
              }))}
            />
            <LinkedList
              title="Deals"
              emptyText="No deals yet"
              onNew={org ? () => openForm({ kind: 'deal', defaults: { organization_id: org.id } }) : undefined}
              newLabel="New deal with this organization"
              rows={(org?.deals ?? []).map((d) => ({
                id: d.id,
                to: `/deals/${d.id}`,
                name: d.name,
                aside: (
                  <>
                    <StageBadge stage={d.stage} />
                    <span className="mono">{formatMoney(d.value_cents)}</span>
                  </>
                ),
              }))}
            />
          </Panel>
        }
        right={
          <Panel title="Timeline" note="Activity on its contacts and deals">
            <Timeline entries={org?.timeline} loading={!org} />
          </Panel>
        }
      />
    </>
  );
}
