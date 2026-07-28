import {
  OhsDropdownMenu,
  OhsTooltip,
  useAuth,
  useFlag,
  usePermission,
  useTranslation,
} from 'ohs-player-web-core';
import {
  IconBuilding,
  IconBuildingFill,
  IconChevronDown,
  IconDashboard,
  IconDashboardFill,
  IconDatabase,
  IconDatabaseFill,
  IconMagic,
  IconMagicFill,
  IconMapPin,
  IconMapPinFill,
  IconMenu,
  IconMenuFold,
  IconMoon,
  IconSun,
  IconTeam,
  IconTeamFill,
  IconUser,
  IconUserFill,
  type IconComponent,
} from '../components/ui/icons';
import { Avatar, IconButton } from '../components/ui';
import { NavLink, Outlet, useMatch } from 'react-router-dom';
import { useState } from 'react';
import { BrandMark } from './BrandMark';
import { useThemeMode } from '../theme/themeModeContext';
import { GlobalSearch } from '../features/search/GlobalSearch';
import { NotificationsBell } from '../features/activity/NotificationsBell';
import { useSetupWizardAutoRedirect } from '../features/setup-wizard/useSetupWizardAutoRedirect';

const ICON_SIZE = 20;

interface NavItem {
  to: string;
  label: string;
  permission: string;
  flag?: string;
  LineIcon: IconComponent;
  FillIcon: IconComponent;
}

const NAV_DEFS = [
  { to: '/', labelKey: 'navDashboard', permission: 'dashboard.view', flag: 'dashboard', LineIcon: IconDashboard, FillIcon: IconDashboardFill },
  { to: '/users', labelKey: 'navUsers', permission: 'users.view', flag: 'userMgmt', LineIcon: IconUser, FillIcon: IconUserFill },
  { to: '/locations', labelKey: 'navLocations', permission: 'locations.view', flag: 'locationMgmt', LineIcon: IconMapPin, FillIcon: IconMapPinFill },
  { to: '/organizations', labelKey: 'navOrganizations', permission: 'orgs.view', flag: 'orgMgmt', LineIcon: IconBuilding, FillIcon: IconBuildingFill },
  { to: '/care-teams', labelKey: 'navCareTeams', permission: 'careteams.view', flag: 'careTeams', LineIcon: IconTeam, FillIcon: IconTeamFill },
  { to: '/resources', labelKey: 'navFhirViewer', permission: 'fhir-viewer.view', flag: 'fhirViewer', LineIcon: IconDatabase, FillIcon: IconDatabaseFill },
  { to: '/setup', labelKey: 'navSetup', permission: 'setup.view', flag: 'setupWizard', LineIcon: IconMagic, FillIcon: IconMagicFill },
] as const;

export function AppLayout() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useTranslation();
  const { mode, toggle } = useThemeMode();
  useSetupWizardAutoRedirect();

  if (auth.status !== 'authenticated') {
    return (
      <div className="app-shell app-shell--bare-root">
        <main className="app-shell__main app-shell__main--bare">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div
      className="app-shell"
      data-sidebar-open={open ? 'true' : undefined}
      data-sidebar-collapsed={collapsed ? 'true' : undefined}
    >
      <a className="app-skip-link" href="#main-content">
        {t('skipToContent')}
      </a>
      <header className="app-topbar">
        <div className="app-topbar__brand">
          <IconButton
            label={t('navToggle')}
            className="app-topbar__menu-toggle"
            onClick={() => setOpen((v) => !v)}
          >
            <IconMenu size={24} />
          </IconButton>
          <span className="app-topbar__logo">
            <BrandMark size={40} />
            <span className="app-topbar__title">{t('appTopbarTitle')}</span>
          </span>
          <IconButton
            label={t(collapsed ? 'expandSidebar' : 'collapseSidebar')}
            className="app-topbar__collapse"
            onClick={() => setCollapsed((v) => !v)}
          >
            <IconMenuFold size={24} />
          </IconButton>
        </div>
        <div className="app-topbar__actions">
          <GlobalSearch />
          <IconButton
            label={mode === 'dark' ? t('themeLight') : t('themeDark')}
            className="app-topbar__bell"
            onClick={toggle}
          >
            {mode === 'dark' ? <IconSun size={24} /> : <IconMoon size={24} />}
          </IconButton>
          <NotificationsBell />
          <UserMenu
            name={auth.user?.preferred_username ?? auth.user?.name ?? auth.user?.sub ?? ''}
            email={auth.user?.email}
            onSignOut={() => void auth.logout()}
            signOutLabel={t('signOut')}
          />
        </div>
      </header>

      <aside
        className="app-sidebar"
        aria-label="Primary navigation"
        data-collapsed={collapsed ? 'true' : undefined}
      >
        <nav>
          <OhsTooltip.Provider delayDuration={200}>
            <ul className="app-sidebar__list">
              {NAV_DEFS.map((def) => (
                <NavRow
                  key={def.to}
                  collapsed={collapsed}
                  item={{
                    to: def.to,
                    label: t(def.labelKey),
                    permission: def.permission,
                    flag: def.flag,
                    LineIcon: def.LineIcon,
                    FillIcon: def.FillIcon,
                  }}
                />
              ))}
            </ul>
          </OhsTooltip.Provider>
        </nav>
      </aside>

      <main className="app-shell__main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

function NavRow({
  item,
  collapsed,
}: Readonly<{ item: NavItem; collapsed: boolean }>): React.ReactElement | null {
  const flagOn = useFlag(item.flag ?? '__always_on__');
  const enabled = item.flag ? flagOn : true;
  const { can } = usePermission(item.permission);
  // Resolved here rather than via NavLink's render props: Radix's `asChild` stringifies a function
  // `className`, which silently strips the link's styling when railed.
  const isActive = Boolean(useMatch({ path: item.to, end: item.to === '/' }));
  if (!enabled || !can) return null;

  const Icon = isActive ? item.FillIcon : item.LineIcon;
  const link = (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={isActive ? 'app-sidebar__link app-sidebar__link--active' : 'app-sidebar__link'}
    >
      <span className="app-sidebar__icon" aria-hidden="true">
        <Icon size={ICON_SIZE} />
      </span>
      <span className="app-sidebar__label">{item.label}</span>
    </NavLink>
  );

  return (
    <li>
      {collapsed ? (
        <OhsTooltip.Root>
          <OhsTooltip.Trigger asChild>{link}</OhsTooltip.Trigger>
          <OhsTooltip.Portal>
            <OhsTooltip.Content className="ohs-tooltip-content" side="right" sideOffset={8}>
              {item.label}
            </OhsTooltip.Content>
          </OhsTooltip.Portal>
        </OhsTooltip.Root>
      ) : (
        link
      )}
    </li>
  );
}

function UserMenu({
  name,
  email,
  onSignOut,
  signOutLabel,
}: {
  name: string;
  email?: string;
  onSignOut: () => void;
  signOutLabel: string;
}): React.ReactElement {
  return (
    <OhsDropdownMenu.Root>
      <OhsDropdownMenu.Trigger asChild>
        <button
          type="button"
          className="app-topbar__user"
          aria-label={name ? `User menu (${name})` : 'User menu'}
        >
          <span className="app-topbar__user-main">
            <Avatar name={name || 'User'} />
            <span className="app-topbar__user-text">
              <span className="app-topbar__user-name">{name || 'User'}</span>
              {email ? <span className="app-topbar__user-email-inline">{email}</span> : null}
            </span>
          </span>
          <IconChevronDown size={16} className="app-topbar__user-chevron" aria-hidden="true" />
        </button>
      </OhsDropdownMenu.Trigger>
      <OhsDropdownMenu.Portal>
        <OhsDropdownMenu.Content className="ohs-dropdown-content" sideOffset={6} align="end">
          {email ? (
            <OhsDropdownMenu.Label className="app-topbar__user-email">{email}</OhsDropdownMenu.Label>
          ) : null}
          <OhsDropdownMenu.Separator className="app-topbar__divider" />
          <OhsDropdownMenu.Item className="ohs-dropdown-item" onSelect={onSignOut}>
            {signOutLabel}
          </OhsDropdownMenu.Item>
        </OhsDropdownMenu.Content>
      </OhsDropdownMenu.Portal>
    </OhsDropdownMenu.Root>
  );
}

