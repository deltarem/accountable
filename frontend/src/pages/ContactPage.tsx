import { Link, useNavigate, useParams } from 'react-router';

import { useContact } from '../api/hooks';
import { StageBadge, StatusBadge } from '../components/Badges';
import { LogActivityForm } from '../components/forms/ActivityForm';
import { useForms } from '../components/forms/FormsProvider';
import { Panel } from '../components/Panel';
import { HeaderFact, LinkedList, RecordColumns, RecordHeader } from '../components/record/RecordParts';
import { Timeline } from '../components/record/Timeline';
import { formatMoney } from '../lib/format';
import { BackLink, RecordLoadFailure } from './recordShared';

export function ContactPage() {
  const id = Number(useParams().id);
  const query = useContact(id);
  const navigate = useNavigate();
  const { openForm, confirmDelete } = useForms();
  const contact = query.data;

  if (query.isError) {
    return (
      <RecordLoadFailure
        what="contact"
        listPath="/contacts"
        listLabel="Contacts"
        error={query.error}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <>
      <BackLink to="/contacts" label="Contacts" />
      <RecordHeader
        loading={!contact}
        name={contact?.name}
        onEdit={() => contact && openForm({ kind: 'contact', record: contact })}
        onDelete={() =>
          contact &&
          confirmDelete({ kind: 'contacts', id: contact.id, onDeleted: () => navigate('/contacts', { replace: true }) })
        }
        facts={
          contact ? (
            <>
              <StatusBadge status={contact.status} />
              <HeaderFact label="Organization">
                {contact.organization_id ? (
                  <Link to={`/organizations/${contact.organization_id}`}>{contact.organization_name}</Link>
                ) : (
                  <span className="muted-text">No organization</span>
                )}
              </HeaderFact>
              {contact.job_title ? <HeaderFact label="Job title">{contact.job_title}</HeaderFact> : null}
              {contact.email ? (
                <HeaderFact label="Email">
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </HeaderFact>
              ) : null}
              {contact.phone ? (
                <HeaderFact label="Phone">
                  <span className="mono">{contact.phone}</span>
                </HeaderFact>
              ) : null}
            </>
          ) : null
        }
      />
      <RecordColumns
        left={
          <Panel>
            <LinkedList
              title="Deals as main contact"
              emptyText="No deals with this contact yet"
              onNew={
                contact
                  ? () =>
                      openForm({
                        kind: 'deal',
                        defaults: { organization_id: contact.organization_id, contact_id: contact.id },
                      })
                  : undefined
              }
              newLabel="New deal with this contact"
              rows={(contact?.deals ?? []).map((d) => ({
                id: d.id,
                to: `/deals/${d.id}`,
                name: d.name,
                detail: d.organization_name ?? 'No organization',
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
          <Panel title="Timeline">
            {contact ? <LogActivityForm key={contact.id} record={{ contact_id: contact.id, deal_id: null }} /> : null}
            <Timeline entries={contact?.timeline} loading={!contact} />
          </Panel>
        }
      />
    </>
  );
}
