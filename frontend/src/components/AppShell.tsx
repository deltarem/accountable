import { Outlet } from 'react-router';

import styles from './AppShell.module.css';
import { FormsProvider } from './forms/FormsProvider';
import { IconRail } from './IconRail';
import { AccountMenu } from './topbar/AccountMenu';
import { TopBar } from './topbar/TopBar';

/** The rail stays fixed on the left; the main area scrolls, top bar and all (UI-LAY-05). */
export function AppShell() {
  return (
    <FormsProvider>
      <div className={styles.shell}>
        <IconRail />
        <main className={styles.main} id="main">
          <TopBar end={<AccountMenu />} />
          <Outlet />
        </main>
      </div>
    </FormsProvider>
  );
}
