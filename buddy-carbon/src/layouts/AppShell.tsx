import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Content,
  Header,
  HeaderContainer,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderName,
  SideNav,
  SideNavItems,
  SideNavLink,
  SkipToContent,
  Theme,
} from '@carbon/react';
import { Asleep, Light } from '@carbon/icons-react';
import { NAV_ITEMS } from '../constants/navigation';
import { useUiStore } from '../hooks/useUiStore';
import styles from './AppShell.module.scss';

interface AppShellProps {
  children: ReactNode;
}

/**
 * The Carbon UI Shell: a global Header, a collapsible SideNav, and the Content
 * region. The header stays fixed; the SideNav is a rail on large screens and a
 * slide-over on small screens (Carbon handles the responsive behaviour). A
 * SkipToContent link and a global theme toggle are provided.
 */
export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  return (
    <Theme theme={theme}>
      <HeaderContainer
        render={({ isSideNavExpanded, onClickSideNavExpand }) => (
          <>
            <Header aria-label="Buddy">
              <SkipToContent />
              <HeaderMenuButton
                aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'}
                onClick={onClickSideNavExpand}
                isActive={isSideNavExpanded}
                aria-expanded={isSideNavExpanded}
              />
              <HeaderName as={Link} to="/home" prefix="IBM">
                Buddy
              </HeaderName>
              <HeaderGlobalBar>
                <HeaderGlobalAction
                  aria-label={theme === 'white' ? 'Switch to dark theme' : 'Switch to light theme'}
                  onClick={toggleTheme}
                  tooltipAlignment="end"
                >
                  {theme === 'white' ? <Asleep size={20} /> : <Light size={20} />}
                </HeaderGlobalAction>
              </HeaderGlobalBar>
              <SideNav
                aria-label="Primary navigation"
                expanded={isSideNavExpanded}
                onSideNavBlur={onClickSideNavExpand}
                isPersistent
              >
                <SideNavItems>
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.path);
                    return (
                      <SideNavLink
                        key={item.path}
                        as={Link}
                        to={item.path}
                        renderIcon={Icon}
                        isActive={isActive}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {item.label}
                      </SideNavLink>
                    );
                  })}
                </SideNavItems>
              </SideNav>
            </Header>
            <Content id="main-content" className={styles.content}>
              {children}
            </Content>
          </>
        )}
      />
    </Theme>
  );
}
