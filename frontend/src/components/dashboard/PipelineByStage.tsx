import { useNavigate } from 'react-router';

import type { Dashboard } from '../../api/types';
import { formatMoneyWhole, plural } from '../../lib/format';
import { stage as stageInfo } from '../../lib/stages';
import styles from './PipelineByStage.module.css';

/** UI-DASH-04: one solid row per open stage; clicking a row opens the pipeline. */
export function PipelineByStage({ rows }: { rows: Dashboard['pipeline_by_stage'] }) {
  const navigate = useNavigate();
  return (
    <div className={styles.rows}>
      {rows.map((r) => {
        const s = stageInfo(r.stage);
        return (
          <button
            key={r.stage}
            type="button"
            className={styles.row}
            style={{ background: s.fill, color: s.ink }}
            onClick={() => navigate('/pipeline')}
            aria-label={`${s.name}, ${plural(r.count, 'deal')}, ${formatMoneyWhole(r.value_cents)}. Open the pipeline`}
            data-testid={`stage-row-${r.stage}`}
          >
            <span className={styles.name}>
              {s.name} · {s.probability}%
            </span>
            <span className={styles.value}>{formatMoneyWhole(r.value_cents)}</span>
            <span className={styles.meta}>{plural(r.count, 'deal')}</span>
            <span className={styles.expected}>exp {formatMoneyWhole(r.expected_cents)}</span>
          </button>
        );
      })}
    </div>
  );
}
