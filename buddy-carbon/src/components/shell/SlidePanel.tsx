import { useEffect, useRef, type ReactNode } from 'react';
import { IconButton } from '@carbon/react';
import { Close } from '@carbon/icons-react';
import styles from './SlidePanel.module.scss';

interface SlidePanelProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  headerExtra?: ReactNode;
  side?: 'end' | 'start';
}

/** A right-side (or left) slide-over with a sticky header and a scrim. Used for
 * the notification and profile panels. Closes on Escape and scrim click. */
export function SlidePanel({ open, title, onClose, children, headerExtra, side = 'end' }: SlidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.scrim} onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className={`${styles.panel} ${side === 'start' ? styles.start : styles.end}`}
        role="dialog"
        aria-label={title}
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <div className={styles.headerActions}>
            {headerExtra}
            <IconButton label="Close" kind="ghost" size="sm" onClick={onClose}>
              <Close size={20} />
            </IconButton>
          </div>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
