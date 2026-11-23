import { Link } from 'react-router';

import { buttonClass } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Page not found" />
      <Panel>
        <EmptyState
          message="There's nothing at this address."
          action={
            <Link to="/" className={buttonClass('secondary')}>
              Go to the dashboard
            </Link>
          }
        />
      </Panel>
    </>
  );
}
