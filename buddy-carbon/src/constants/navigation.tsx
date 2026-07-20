import type { ComponentType } from 'react';
import {
  Home, Calendar, Bot, Favorite, Portfolio, Plug, SettingsAdjust, Application,
  WatsonHealthAiResults, Notification, ColorPalette, Security, Locked, Help,
  Information, Logout, Language,
} from '@carbon/icons-react';

type CarbonIcon = ComponentType<{ size?: number }>;

export interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly description: string;
  readonly icon: CarbonIcon;
}

/**
 * Bottom navigation — the five thumb-reachable destinations. Ask Buddy sits in
 * the centre as the elevated primary action. Order and labels follow IBM
 * Content Design: short, specific, sentence-case nouns.
 */
export const BOTTOM_NAV: readonly NavItem[] = [
  { path: '/home', label: 'Home', description: 'Your daily operating plan', icon: Home },
  { path: '/today', label: 'Today', description: 'Your day, orchestrated', icon: Calendar },
  { path: '/ask', label: 'Ask Buddy', description: 'Plan and run work across your apps', icon: Bot },
  { path: '/life', label: 'Life', description: 'Coordinate your personal life', icon: Favorite },
  { path: '/work', label: 'Work', description: 'Your work in one place', icon: Portfolio },
];

/** The Ask Buddy centre action is rendered separately as a FAB. */
export const ASK_NAV = BOTTOM_NAV[2];

export interface MenuLink {
  readonly label: string;
  readonly to: string;
  readonly icon: CarbonIcon;
}

export interface MenuSection {
  readonly title?: string;
  readonly items: readonly MenuLink[];
}

/**
 * The hamburger side menu. Primary destinations first, then Configuration and
 * Settings groups, then support. Settings-family items land on /settings and
 * open the matching panel via the hash.
 */
export const MENU_SECTIONS: readonly MenuSection[] = [
  {
    items: [
      { label: 'Home', to: '/home', icon: Home },
      { label: "Today's summary", to: '/today', icon: Calendar },
      { label: 'Life', to: '/life', icon: Favorite },
      { label: 'Work', to: '/work', icon: Portfolio },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Connected apps', to: '/connections', icon: Plug },
      { label: 'Integrations', to: '/connections#integrations', icon: Application },
      { label: 'AI preferences', to: '/settings#ai', icon: WatsonHealthAiResults },
      { label: 'Notifications', to: '/settings#notifications', icon: Notification },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Appearance', to: '/settings#appearance', icon: ColorPalette },
      { label: 'Security', to: '/settings#security', icon: Security },
      { label: 'Privacy', to: '/settings#privacy', icon: Locked },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Help & support', to: '/settings#help', icon: Help },
      { label: 'About', to: '/settings#about', icon: Information },
    ],
  },
];

export interface ProfileLink {
  readonly label: string;
  readonly to?: string;
  readonly icon: CarbonIcon;
  readonly danger?: boolean;
}

/** Profile menu items. */
export const PROFILE_LINKS: readonly ProfileLink[] = [
  { label: 'Profile', to: '/settings#profile', icon: Application },
  { label: 'Account', to: '/settings#account', icon: SettingsAdjust },
  { label: 'Preferences', to: '/settings#ai', icon: WatsonHealthAiResults },
  { label: 'Theme', to: '/settings#appearance', icon: ColorPalette },
  { label: 'Accessibility', to: '/settings#accessibility', icon: Help },
  { label: 'Language', to: '/settings#language', icon: Language },
  { label: 'Connected accounts', to: '/connections', icon: Plug },
  { label: 'Security', to: '/settings#security', icon: Security },
  { label: 'Sign out', icon: Logout, danger: true },
];

export const DEFAULT_ROUTE = '/home';

// Re-export the old name so existing imports keep working during the migration.
export const NAV_ITEMS = BOTTOM_NAV;
