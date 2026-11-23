import { useDashboard } from '../api/hooks';
import styles from './DashboardPage.module.css';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { FollowUpList } from '../components/dashboard/FollowUpList';
import { FunnelChart } from '../components/dashboard/FunnelChart';
import { HeadlinePanel } from '../components/dashboard/HeadlinePanel';
import { PipelineByStage } from '../components/dashboard/PipelineByStage';
import { WonLostChart } from '../components/dashboard/WonLostChart';
import chartStyles from '../components/dashboard/charts.module.css';
import { LoadError } from '../components/LoadError';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { Skeleton } from '../components/Skeleton';
import { formatLongDate, plural } from '../lib/format';

function Placeholder({ rows = 4, height = 36 }: { rows?: number; height?: number }) {
  return (
    <div className={styles.placeholder} aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={height} radius={12} />
      ))}
    </div>
  );
}

export function DashboardPage() {
  const query = useDashboard();
  const data = query.data;

  if (query.isError) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Panel>
          <LoadError what="dashboard" onRetry={() => query.refetch()} />
        </Panel>
      </>
    );
  }

  const toDo = data ? data.follow_ups.length : 0;
  return (
    <>
      <PageHeader
        title="Dashboard"
        action={
          <span className={styles.date} data-testid="today">
            {data ? formatLongDate(data.today) : <Skeleton width={200} height={24} />}
          </span>
        }
      />
      <HeadlinePanel data={data} />
      <div className={styles.three}>
        <Panel title="Sales funnel" note="Value reaching each stage">
          {data ? <FunnelChart funnel={data.funnel} /> : <Placeholder rows={1} height={200} />}
        </Panel>
        <Panel title="Pipeline by stage" note="Open today">
          {data ? <PipelineByStage rows={data.pipeline_by_stage} /> : <Placeholder rows={4} height={52} />}
        </Panel>
        <Panel
          title="Won and lost"
          note={
            <span className={chartStyles.legend}>
              <span>
                <i className={styles.wonSwatch} aria-hidden />
                Won
              </span>
              <span>
                <i className={styles.lostSwatch} aria-hidden />
                Lost
              </span>
            </span>
          }
        >
          {data ? (
            <WonLostChart months={data.months} wonCount={data.won_count} lostCount={data.lost_count} />
          ) : (
            <Placeholder rows={1} height={200} />
          )}
        </Panel>
      </div>
      <div className={styles.two}>
        <Panel title="Follow-ups" note={data ? `${plural(toDo, 'to do', 'to do')}` : undefined}>
          {data ? <FollowUpList items={data.follow_ups} today={data.today} /> : <Placeholder rows={5} height={52} />}
        </Panel>
        <Panel title="Recent activity" note="Newest first">
          {data ? <ActivityFeed entries={data.recent_activity} /> : <Placeholder rows={6} height={40} />}
        </Panel>
      </div>
    </>
  );
}
