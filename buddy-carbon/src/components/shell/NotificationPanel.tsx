import { Button, Tag } from '@carbon/react';
import { CheckmarkFilled, WarningAltFilled, Information, AiGenerate } from '@carbon/icons-react';
import { SlidePanel } from './SlidePanel';
import { useNotifications, unreadCount, type AppNotification, type NotificationCategory } from '../../hooks/useNotifications';
import styles from './NotificationPanel.module.scss';

const KIND_ICON = {
  priority: WarningAltFilled,
  ai: AiGenerate,
  success: CheckmarkFilled,
  info: Information,
} as const;

const CATEGORIES: readonly NotificationCategory[] = ['Work', 'Personal', 'System'];

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Notification panel: sticky header with mark-all/clear, grouped by category,
 * unread indicators, priority + AI notifications, and mark-as-read on tap. */
export function NotificationPanel({ open, onClose }: Props) {
  const { items, markRead, markAllRead, clearAll } = useNotifications();
  const unread = unreadCount(items);

  const row = (n: AppNotification) => {
    const Icon = KIND_ICON[n.kind];
    return (
      <button key={n.id} type="button" className={`${styles.item} ${n.read ? '' : styles.unread}`} onClick={() => markRead(n.id)}>
        <span className={`${styles.icon} ${styles[`icon_${n.kind}`]}`}><Icon size={18} /></span>
        <span className={styles.content}>
          <span className={styles.itemHead}>
            <span className={styles.itemTitle}>{n.title}</span>
            {!n.read && <span className={styles.dot} aria-label="Unread" />}
          </span>
          <span className={styles.body}>{n.body}</span>
          <span className={styles.meta}>
            {n.kind === 'priority' && <Tag type="red" size="sm">Priority</Tag>}
            {n.kind === 'ai' && <Tag type="purple" size="sm">AI</Tag>}
            <span className={styles.time}>{n.time}</span>
          </span>
        </span>
      </button>
    );
  };

  return (
    <SlidePanel
      open={open}
      title="Notifications"
      onClose={onClose}
      headerExtra={
        <Button kind="ghost" size="sm" disabled={unread === 0} onClick={markAllRead}>Mark all read</Button>
      }
    >
      {items.length === 0 ? (
        <p className={styles.empty}>You&apos;re all caught up. New updates will appear here.</p>
      ) : (
        <>
          {CATEGORIES.map((cat) => {
            const group = items.filter((n) => n.category === cat);
            if (group.length === 0) return null;
            return (
              <section key={cat} className={styles.section} aria-label={cat}>
                <h3 className={styles.sectionTitle}>{cat}</h3>
                {group.map(row)}
              </section>
            );
          })}
          <div className={styles.footer}>
            <Button kind="danger--ghost" size="sm" onClick={clearAll}>Clear all</Button>
          </div>
        </>
      )}
    </SlidePanel>
  );
}
