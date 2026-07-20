import { useState, type ReactNode } from 'react';
import { Modal, Theme } from '@carbon/react';
import { TopBar } from '../components/shell/TopBar';
import { BottomNav } from '../components/shell/BottomNav';
import { SideMenu } from '../components/shell/SideMenu';
import { GlobalSearch } from '../components/shell/GlobalSearch';
import { NotificationPanel } from '../components/shell/NotificationPanel';
import { ProfileMenu } from '../components/shell/ProfileMenu';
import { useNotifications, unreadCount } from '../hooks/useNotifications';
import { useUiStore } from '../hooks/useUiStore';
import styles from './AppShell.module.scss';

interface AppShellProps {
  children: ReactNode;
}

/**
 * Mobile-app shell: a sticky top bar (hamburger · AI search · notifications ·
 * profile), a scrollable content region, and a sticky bottom navigation with
 * the elevated Ask Buddy action. The hamburger, search, notifications and
 * profile each open their own Carbon surface. Everything is theme-aware.
 */
export function AppShell({ children }: AppShellProps) {
  const theme = useUiStore((s) => s.theme);
  const items = useNotifications((s) => s.items);
  const unread = unreadCount(items);

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <Theme theme={theme}>
      <div className={styles.shell}>
        <TopBar
          unread={unread}
          onMenu={() => setMenuOpen(true)}
          onSearch={() => setSearchOpen(true)}
          onNotifications={() => setNotifsOpen(true)}
          onProfile={() => setProfileOpen(true)}
        />

        <main id="main-content" className={styles.content}>
          {children}
        </main>

        <BottomNav />

        <SideMenu expanded={menuOpen} onClose={() => setMenuOpen(false)} onLogout={() => setLogoutOpen(true)} />
        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
        <NotificationPanel open={notifsOpen} onClose={() => setNotifsOpen(false)} />
        <ProfileMenu open={profileOpen} onClose={() => setProfileOpen(false)} onLogout={() => setLogoutOpen(true)} />

        <Modal
          open={logoutOpen}
          modalHeading="Sign out of Buddy?"
          primaryButtonText="Sign out"
          secondaryButtonText="Stay signed in"
          danger
          size="sm"
          onRequestClose={() => setLogoutOpen(false)}
          onSecondarySubmit={() => setLogoutOpen(false)}
          onRequestSubmit={() => setLogoutOpen(false)}
        >
          <p>You&apos;ll need to sign in again to reach your plan, tasks and connected apps. This demo keeps your data locally.</p>
        </Modal>
      </div>
    </Theme>
  );
}
