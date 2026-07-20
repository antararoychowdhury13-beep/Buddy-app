import { useEffect, useRef, useState } from 'react';
import { MOCK_CONTEXT } from './homeai/mock';
import { toast } from './homeai/ui/dom';
import { HomeApp } from './homeai/ui/app';
import { TodayApp } from './homeai/today/app';
import { AskApp } from './homeai/ask/app';
import { LifeApp } from './homeai/life/app';

type ModuleId = 'home' | 'today' | 'ask' | 'life' | 'work';

/**
 * The prototype phone frame, faithfully reproduced in React: status bar, the
 * scrollable content region, the bottom tab bar and the Ask Buddy mic FAB.
 * React owns the shell and the active-tab state; each module's original
 * renderer is mounted imperatively into the content ref, so the UI is identical
 * to the vanilla prototype (same home.css, same DOM).
 */
export function PhoneShell() {
  const rootRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<ModuleId>('home');

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.replaceChildren();
    root.scrollTop = 0;
    if (active === 'home') new HomeApp(root, MOCK_CONTEXT);
    else if (active === 'today') new TodayApp(root);
    else if (active === 'ask') new AskApp(root);
    else if (active === 'life') new LifeApp(root);
  }, [active]);

  const select = (id: ModuleId) => {
    if (id === 'work') {
      toast('Work module is part of Buddy — not in this AI prototype.');
      return;
    }
    setActive(id);
  };

  const tab = (id: ModuleId, label: string, icon: React.ReactNode) => (
    <button
      className={`tab${active === id ? ' active' : ''}`}
      data-module={id}
      aria-current={active === id ? 'page' : undefined}
      onClick={() => select(id)}
    >
      <span className="tab-ic" aria-hidden="true">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="stage">
      <div className="phone" role="application" aria-label="Buddy Home">
        <div className="status-bar" aria-hidden="true">
          <span className="sb-time">9:41</span>
          <span className="sb-right">
            <svg width="17" height="11" viewBox="0 0 19 12">
              <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill="#141824" />
              <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill="#141824" />
              <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill="#141824" />
              <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill="#141824" />
            </svg>
            <svg width="24" height="11" viewBox="0 0 27 13">
              <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="#141824" strokeOpacity="0.4" fill="none" />
              <rect x="2" y="2" width="18" height="9" rx="2" fill="#141824" />
              <path d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z" fill="#141824" fillOpacity="0.4" />
            </svg>
          </span>
        </div>

        <main id="hp-root" className="hp-scroll" tabIndex={-1} ref={rootRef} />

        <nav className="tabbar" aria-label="Primary">
          {tab('home', 'Home', (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
            </svg>
          ))}
          {tab('today', 'Today', (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="3" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
            </svg>
          ))}
          <span className="tab-spacer" aria-hidden="true" />
          {tab('life', 'Life', (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
          ))}
          {tab('work', 'Work', (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          ))}
        </nav>

        <button className={`fab${active === 'ask' ? ' fab-active' : ''}`} aria-label="Ask Buddy" onClick={() => select('ask')}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" /><path d="M5 11a7 7 0 0 0 14 0" /><line x1="12" y1="18" x2="12" y2="22" />
          </svg>
        </button>
      </div>
    </div>
  );
}
