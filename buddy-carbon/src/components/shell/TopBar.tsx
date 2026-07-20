import { IconButton, Search } from '@carbon/react';
import { Menu, Notification, UserAvatar } from '@carbon/icons-react';
import styles from './TopBar.module.scss';

interface TopBarProps {
  unread: number;
  onMenu: () => void;
  onSearch: () => void;
  onNotifications: () => void;
  onProfile: () => void;
}

/**
 * Sticky mobile top app bar: hamburger (left), AI-powered global search
 * (centre), notifications + profile (right). The centre search is a trigger —
 * focusing or clicking it opens the full AI search experience.
 */
export function TopBar({ unread, onMenu, onSearch, onNotifications, onProfile }: TopBarProps) {
  return (
    <header className={styles.bar}>
      <IconButton label="Open menu" kind="ghost" size="lg" align="bottom-left" onClick={onMenu}>
        <Menu size={20} />
      </IconButton>

      <div className={styles.search}>
        <Search
          size="lg"
          labelText="Search work and personal content with AI"
          placeholder="Ask or search…"
          closeButtonLabelText="Clear"
          value=""
          onClick={onSearch}
          onFocus={onSearch}
          onChange={onSearch}
        />
      </div>

      <div className={styles.actions}>
        <IconButton label="Notifications" kind="ghost" size="lg" align="bottom" onClick={onNotifications}>
          <span className={styles.bellWrap}>
            <Notification size={20} />
            {unread > 0 && <span className={styles.badge} aria-hidden />}
          </span>
        </IconButton>
        <IconButton label="Profile" kind="ghost" size="lg" align="bottom-right" onClick={onProfile}>
          <UserAvatar size={20} />
        </IconButton>
      </div>
    </header>
  );
}
