import {
  OhsDropdownMenu,
  useAuth,
  useFlag,
  usePermission,
  useTranslation,
} from 'ohs-player-web-core';
import {
  RiBuildingFill,
  RiBuildingLine,
  RiDashboardFill,
  RiDashboardLine,
  RiMapPin3Fill,
  RiMapPin3Line,
  RiMenuLine,
  RiTeamFill,
  RiTeamLine,
  RiUserFill,
  RiUserLine,
  type RemixiconComponentType,
} from '@remixicon/react';
import { IconButton } from '../components/ui';
import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { BrandMark } from './BrandMark';

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
] as const;

export function AppLayout() {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

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
    <div className="app-shell" data-sidebar-open={open ? 'true' : undefined}>
      <header className="app-topbar">
        <div className="app-topbar__brand">
          <IconButton
            label={t('navToggle')}
            className="app-topbar__menu-toggle"
            onClick={() => setOpen((v) => !v)}
          >
            <RiMenuLine size={ICON_SIZE} />
          </IconButton>
          <BrandMark size={40} />
          <span className="app-topbar__title">{t('appTopbarTitle')}</span>
        </div>
        <UserMenu
          name={auth.user?.preferred_username ?? auth.user?.name ?? auth.user?.sub ?? ''}
          email={auth.user?.email}
          onSignOut={() => void auth.logout()}
          signOutLabel={t('signOut')}
        />
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
          <span className="app-topbar__avatar" aria-hidden="true">
            {name.slice(0, 1).toUpperCase() || 'U'}
          </span>
          <span className="app-topbar__user-name">{name || 'User'}</span>
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

