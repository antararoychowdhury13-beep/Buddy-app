import type { ComponentType } from 'react';
import { Dashboard, Calendar, Chat, Favorite, Plug } from '@carbon/icons-react';

export interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly description: string;
  readonly icon: ComponentType<{ size?: number }>;
}

/**
 * Primary navigation. Order and labels follow IBM Content Design: short,
 * specific, sentence-case nouns that name the destination.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/home', label: 'Home', description: 'Your daily operating plan', icon: Dashboard },
  { path: '/today', label: 'Today', description: 'Your day, orchestrated', icon: Calendar },
  { path: '/ask', label: 'Ask Buddy', description: 'Plan and run work across your apps', icon: Chat },
  { path: '/life', label: 'Life', description: 'Coordinate your personal life', icon: Favorite },
  { path: '/connections', label: 'Connections', description: 'Connect and manage integrations', icon: Plug },
];

export const DEFAULT_ROUTE = '/home';
