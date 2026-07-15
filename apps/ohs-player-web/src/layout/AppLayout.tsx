import {
  OhsDropdownMenu,
  useAuth,
  useFlag,
  usePermission,
  useTranslation,
} from 'ohs-player-web-core';
import {
  RiArrowDownSLine,
  RiBuildingFill,
  RiBuildingLine,
  RiDashboardFill,
  RiDashboardLine,
  RiMapPin3Fill,
  RiMapPin3Line,
  RiMenuFoldLine,
  RiMenuLine,
  RiMenuUnfoldLine,
  RiMoonLine,
  RiSunLine,
  RiTeamFill,
  RiTeamLine,
  RiUserFill,
  RiUserLine,
  RiMagicLine,
  RiMagicFill,
  type RemixiconComponentType,
} from '@remixicon/react';
import { Avatar, IconButton } from '../components/ui';
import { NavLink, Outlet } from 'react-router-dom';
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
  LineIcon: RemixiconComponentType;
  FillIcon: RemixiconComponentType;
}

const NAV_DEFS = [
  { to: '/', labelKey: 'navDashboard', permission: 'dashboard.view', flag: 'dashboard', LineIcon: RiDashboardLine, FillIcon: RiDashboardFill },
  { to: '/users', labelKey: 'navUsers', permission: 'users.view', flag: 'userMgmt', LineIcon: RiUserLine, FillIcon: RiUserFill },
  { to: '/locations', labelKey: 'navLocations', permission: 'locations.view', flag: 'locationMgmt', LineIcon: RiMapPin3Line, FillIcon: RiMapPin3Fill },
  { to: '/organizations', labelKey: 'navOrganizations', permission: 'orgs.view', flag: 'orgMgmt', LineIcon: RiBuildingLine, FillIcon: RiBuildingFill },
  { to: '/care-teams', labelKey: 'navCareTeams', permission: 'careteams.view', flag: 'careTeams', LineIcon: RiTeamLine, FillIcon: RiTeamFill },
  { to: '/setup', labelKey: 'navSetup', permission: 'setup.view', flag: 'setupWizard', LineIcon: RiMagicLine, FillIcon: RiMagicFill },
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
      <header className="app-topbar">
        <div className="app-topbar__brand">
          <IconButton
            label={t('navToggle')}
            className="app-topbar__menu-toggle"
            onClick={() => setOpen((v) => !v)}
          >
            <RiMenuLine size={24} />
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
            {collapsed ? <RiMenuUnfoldLine size={24} /> : <RiMenuFoldLine size={24} />}
          </IconButton>
        </div>
        <div className="app-topbar__actions">
          <GlobalSearch />
          <IconButton
            label={mode === 'dark' ? t('themeLight') : t('themeDark')}
            className="app-topbar__bell"
            onClick={toggle}
          >
            {mode === 'dark' ? <RiSunLine size={24} /> : <RiMoonLine size={24} />}
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

      <aside className="app-sidebar" aria-label="Primary navigation">
        <nav>
          <ul className="app-sidebar__list">
            {NAV_DEFS.map((def) => (
              <NavRow
                key={def.to}
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
        </nav>
      </aside>

      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  );
}

function NavRow({ item }: Readonly<{ item: NavItem }>): React.ReactElement | null {
  const flagOn = useFlag(item.flag ?? '__always_on__');
  const enabled = item.flag ? flagOn : true;
  const { can } = usePermission(item.permission);
  if (!enabled || !can) return null;

  return (
    <li>
      <NavLink
        to={item.to}
        end={item.to === '/'}
        className={({ isActive }) =>
          isActive ? 'app-sidebar__link app-sidebar__link--active' : 'app-sidebar__link'
        }
      >
        {({ isActive }) => {
          const Icon = isActive ? item.FillIcon : item.LineIcon;
          return (
            <>
              <span className="app-sidebar__icon" aria-hidden="true">
                <Icon size={ICON_SIZE} />
              </span>
              <span>{item.label}</span>
            </>
          );
        }}
      </NavLink>
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
          <RiArrowDownSLine size={16} className="app-topbar__user-chevron" aria-hidden="true" />
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

