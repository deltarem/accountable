import { useNavigate, useParams } from 'react-router';
import { Link } from 'react-router';

import { useDeal } from '../api/hooks';
import type { DealDetail } from '../api/types';
import { LateBadge, StageBadge } from '../components/Badges';
import { LogActivityForm } from '../components/forms/ActivityForm';
import { useForms } from '../components/forms/FormsProvider';
import { Panel } from '../components/Panel';
import { FactList, HeaderFact, RecordColumns, RecordHeader } from '../components/record/RecordParts';
import { Timeline } from '../components/record/Timeline';
import { formatDate, formatMoney, formatPercent } from '../lib/format';
import { stage as stageInfo } from '../lib/stages';
import { whoLine } from '../lib/who';
import { BackLink, RecordLoadFailure } from './recordShared';

function CloseDate({ deal }: { deal: DealDetail }) {
  if (!deal.close_date) return <span className="muted-text">Not set</span>;
  return (
    <span className={deal.late ? 'late-text' : undefined}>
      <span className="mono">{formatDate(deal.close_date)}</span> {deal.late ? <LateBadge /> : null}
    </span>
  );
}

function DealFacts({ deal }: { deal: DealDetail }) {
  return (
    <>
      <StageBadge stage={deal.stage} />
      <HeaderFact label="Value">
        <span className="mono">{formatMoney(deal.value_cents)}</span>
      </HeaderFact>
      <HeaderFact label="Probability">
        <span className="mono">{formatPercent(deal.probability)}</span>
      </HeaderFact>
      <HeaderFact label="Expected">
        <span className="mono">{stageInfo(deal.stage).open ? formatMoney(deal.expected_cents) : '-'}</span>
      </HeaderFact>
      <HeaderFact label="Close date">
        <CloseDate deal={deal} />
      </HeaderFact>
    </>
  );
}

function DealDetails({ deal }: { deal: DealDetail }) {
  return (
    <FactList
      items={[
        {
          label: 'Organization',
          value: deal.organization_id ? (
            <Link to={`/organizations/${deal.organization_id}`}>{deal.organization_name}</Link>
          ) : (
            <span className="muted-text">No organization</span>
          ),
        },
        {
          label: 'Main contact',
          value: deal.contact_id ? (
            <Link to={`/contacts/${deal.contact_id}`}>{deal.contact_name}</Link>
          ) : (
            <span className="muted-text">No main contact</span>
          ),
        },
        { label: 'Stage', value: stageInfo(deal.stage).name },
        { label: 'Value', value: <span className="mono">{formatMoney(deal.value_cents)}</span> },
        { label: 'Probability', value: <span className="mono">{formatPercent(deal.probability)}</span> },
        {
          label: 'Expected revenue',
          value: <span className="mono">{formatMoney(stageInfo(deal.stage).open ? deal.expected_cents : 0)}</span>,
        },
        { label: 'Close date', value: <CloseDate deal={deal} /> },
      ]}
    />
  );
}

export function DealPage() {
  const id = Number(useParams().id);
  const query = useDeal(id);
  const navigate = useNavigate();
  const { openForm, confirmDelete } = useForms();
  const deal = query.data;

  if (query.isError) {
    return (
      <RecordLoadFailure
        what="deal"
        listPath="/deals"
        listLabel="Deals"
        error={query.error}
        onRetry={() => query.refetch()}
      />
    );
  }

  return (
    <>
      <BackLink to="/deals" label="Deals" />
      <RecordHeader
        loading={!deal}
        name={deal?.name}
        onEdit={() => deal && openForm({ kind: 'deal', record: deal })}
        onDelete={() =>
          deal && confirmDelete({ kind: 'deals', id: deal.id, onDeleted: () => navigate('/deals', { replace: true }) })
        }
        facts={deal ? <DealFacts deal={deal} /> : null}
        who={deal ? whoLine(deal) : undefined}
      />
      <RecordColumns
        left={<Panel title="Details">{deal ? <DealDetails deal={deal} /> : null}</Panel>}
        right={
          <Panel title="Timeline">
            {deal ? <LogActivityForm key={deal.id} record={{ contact_id: null, deal_id: deal.id }} /> : null}
            <Timeline entries={deal?.timeline} loading={!deal} />
          </Panel>
        }
      />
    </>
  );
}
