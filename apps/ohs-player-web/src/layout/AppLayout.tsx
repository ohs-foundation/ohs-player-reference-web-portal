import {
  OhsDropdownMenu,
  useAuth,
  useFlag,
  usePermission,
  useTranslation,
} from 'ohs-player-web-core';
import { IconButton } from '../components/ui';
import { NavLink, Outlet } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { BrandMark } from './BrandMark';

interface NavItem {
  to: string;
  label: string;
  permission: string;
  flag?: string;
  icon: ReactNode;
}

const NAV_DEFS = [
  { to: '/', labelKey: 'navDashboard', permission: 'dashboard.view', flag: 'dashboard', icon: <DashboardIcon /> },
  { to: '/users', labelKey: 'navUsers', permission: 'users.view', flag: 'userMgmt', icon: <UsersIcon /> },
  { to: '/locations', labelKey: 'navLocations', permission: 'locations.view', flag: 'locationMgmt', icon: <LocationIcon /> },
  { to: '/organizations', labelKey: 'navOrganizations', permission: 'orgs.view', flag: 'orgMgmt', icon: <OrgIcon /> },
  { to: '/care-teams', labelKey: 'navCareTeams', permission: 'careteams.view', flag: 'careTeams', icon: <TeamIcon /> },
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
            <MenuIcon />
          </IconButton>
          <BrandMark />
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
                  icon: def.icon,
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
        <span className="app-sidebar__icon" aria-hidden="true">
          {item.icon}
        </span>
        <span>{item.label}</span>
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

function MenuIcon(): React.ReactElement {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function DashboardIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  );
}
function UsersIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function LocationIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function OrgIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 21V9h6v12" />
      <path d="M3 9h18" />
    </svg>
  );
}
function TeamIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
