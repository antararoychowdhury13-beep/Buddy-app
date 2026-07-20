import { Link, useLocation } from 'react-router-dom';
import { AiGenerate } from '@carbon/icons-react';
import { BOTTOM_NAV, ASK_NAV } from '../../constants/navigation';
import styles from './BottomNav.module.scss';

/**
 * Sticky bottom navigation. Four thumb-reachable tabs plus the Ask Buddy centre
 * action, rendered as an elevated circular FAB — the app's primary action.
 * Active state is derived from the route.
 */
export function BottomNav() {
  const { pathname } = useLocation();
  const sideItems = BOTTOM_NAV.filter((i) => i.path !== ASK_NAV.path);
  const isActive = (path: string) => pathname.startsWith(path);

  const tab = (item: (typeof BOTTOM_NAV)[number]) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`${styles.tab} ${active ? styles.tabActive : ''}`}
        aria-current={active ? 'page' : undefined}
      >
        <Icon size={20} />
        <span className={styles.label}>{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className={styles.nav} aria-label="Primary">
      {tab(sideItems[0])}
      {tab(sideItems[1])}

      <div className={styles.fabSlot}>
        <Link
          to={ASK_NAV.path}
          className={`${styles.fab} ${isActive(ASK_NAV.path) ? styles.fabActive : ''}`}
          aria-label={ASK_NAV.label}
          aria-current={isActive(ASK_NAV.path) ? 'page' : undefined}
        >
          <AiGenerate size={24} />
        </Link>
        <span className={styles.fabLabel}>{ASK_NAV.label}</span>
      </div>

      {tab(sideItems[2])}
      {tab(sideItems[3])}
    </nav>
  );
}
