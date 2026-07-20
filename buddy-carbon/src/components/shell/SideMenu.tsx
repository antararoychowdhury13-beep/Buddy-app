import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  SideNav, SideNavItems, SideNavLink, SideNavDivider, SideNavMenu, SideNavMenuItem,
} from '@carbon/react';
import { Logout } from '@carbon/icons-react';
import { MENU_SECTIONS } from '../../constants/navigation';
import { useUiStore } from '../../hooks/useUiStore';
import styles from './SideMenu.module.scss';

interface SideMenuProps {
  expanded: boolean;
  onClose: () => void;
  onLogout: () => void;
}

/** The hamburger menu — a Carbon SideNav overlay with primary destinations,
 * configuration, settings, support, and a theme quick-toggle. */
export function SideMenu({ expanded, onClose, onLogout }: SideMenuProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  const goto = (to: string) => { onClose(); navigate(to); };

  return (
    <SideNav
      aria-label="Main menu"
      expanded={expanded}
      isChildOfHeader={false}
      isPersistent={false}
      onOverlayClick={onClose}
      onSideNavBlur={onClose}
      className={styles.side}
    >
      <SideNavItems>
        <li className={styles.brandRow}>
          <span className={styles.brand}>Buddy</span>
          <span className={styles.brandSub}>AI chief of staff</span>
        </li>
        <SideNavDivider />

        {MENU_SECTIONS.map((section, i) => (
          <SideNavMenu key={section.title ?? `primary-${i}`} title={section.title ?? 'Navigate'} defaultExpanded={!section.title}>
            {section.items.map((item) => {
              const active = pathname === item.to || (item.to.startsWith('/') && pathname.startsWith(item.to.split('#')[0]) && !item.to.includes('#'));
              return (
                <SideNavMenuItem key={item.to} as={Link} to={item.to} isActive={active} onClick={onClose}>
                  {item.label}
                </SideNavMenuItem>
              );
            })}
          </SideNavMenu>
        ))}

        <SideNavDivider />
        <SideNavLink as="button" onClick={() => { toggleTheme(); }}>
          {theme === 'white' ? 'Dark appearance' : 'Light appearance'}
        </SideNavLink>
        <SideNavLink as="button" onClick={() => goto('/settings#account')}>
          Account &amp; settings
        </SideNavLink>
        <SideNavLink as="button" renderIcon={Logout} onClick={() => { onClose(); onLogout(); }} className={styles.logout}>
          Log out
        </SideNavLink>
      </SideNavItems>
    </SideNav>
  );
}
