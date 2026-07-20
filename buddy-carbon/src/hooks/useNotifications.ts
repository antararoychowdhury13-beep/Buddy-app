import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationKind = 'priority' | 'ai' | 'info' | 'success';
export type NotificationCategory = 'Work' | 'Personal' | 'System';

export interface AppNotification {
  readonly id: string;
  readonly kind: NotificationKind;
  readonly category: NotificationCategory;
  readonly title: string;
  readonly body: string;
  readonly time: string;
  read: boolean;
}

const SEED: AppNotification[] = [
  { id: 'n1', kind: 'priority', category: 'Work', title: 'Approval needed before 5 PM', body: "Rahul's API readiness task is overdue and blocks Ananya's integration work.", time: '5m', read: false },
  { id: 'n2', kind: 'ai', category: 'Work', title: 'Buddy drafted the sprint summary', body: 'Ready to review — it saves about 20 minutes of focus time today.', time: '22m', read: false },
  { id: 'n3', kind: 'ai', category: 'Personal', title: 'Leave by 5:45 PM for pickup', body: "Traffic to Aarav's school is building. I protected your calendar.", time: '40m', read: false },
  { id: 'n4', kind: 'info', category: 'Work', title: 'Stakeholder review booked', body: '25 Jul, 6 attendees — all free, no conflicts.', time: '1h', read: true },
  { id: 'n5', kind: 'success', category: 'System', title: 'Jira connected', body: 'Project Phoenix is now syncing tasks and owners.', time: '3h', read: true },
  { id: 'n6', kind: 'info', category: 'Personal', title: 'Grocery order ready', body: 'Your weekly essentials are ready to confirm.', time: 'Yst', read: true },
];

interface NotificationState {
  items: AppNotification[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

export const useNotifications = create<NotificationState>()(
  persist(
    (set) => ({
      items: SEED.map((n) => ({ ...n })),
      markRead: (id) => set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: () => set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) })),
      clearAll: () => set({ items: [] }),
    }),
    { name: 'buddy.notifications.v1' },
  ),
);

export function unreadCount(items: AppNotification[]): number {
  return items.filter((n) => !n.read).length;
}
