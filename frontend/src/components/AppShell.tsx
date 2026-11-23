import { Outlet } from 'react-router';

import styles from './AppShell.module.css';
import { FormsProvider } from './forms/FormsProvider';
import { IconRail } from './IconRail';

/** The rail stays fixed on the left; the main area scrolls. */
export function AppShell() {
  return (
    <FormsProvider>
      <div className={styles.shell}>
        <IconRail />
        <main className={styles.main} id="main">
          <Outlet />
        </main>
      </div>
    </FormsProvider>
  );
}
