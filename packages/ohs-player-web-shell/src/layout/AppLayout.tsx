import {
  OhsDropdownMenu,
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
import { useSignOut } from './useSignOut';
import { useMemo, useState, type ReactNode } from 'react';
import { BrandMark } from './BrandMark';
import { useThemeMode } from '../theme/themeModeContext';
import { GlobalSearch } from '../features/search/GlobalSearch';
import { NotificationsBell } from '../features/activity/NotificationsBell';
import type { NavId } from '../config/navigation';
import { usePortalConfig } from '../config/portalConfigContext';

const ICON_SIZE = 20;

interface NavItem {
  to: string;
  label: string;
  permission?: string;
  flag?: string;
  LineIcon: IconComponent;
  FillIcon: IconComponent;
}

const NAV_ICONS: Record<NavId, Pick<NavItem, 'LineIcon' | 'FillIcon'>> = {
  dashboard: { LineIcon: IconDashboard, FillIcon: IconDashboardFill },
  users: { LineIcon: IconUser, FillIcon: IconUserFill },
  locations: { LineIcon: IconMapPin, FillIcon: IconMapPinFill },
  organizations: { LineIcon: IconBuilding, FillIcon: IconBuildingFill },
  careTeams: { LineIcon: IconTeam, FillIcon: IconTeamFill },
  fhirViewer: { LineIcon: IconDatabase, FillIcon: IconDatabaseFill },
  setup: { LineIcon: IconMagic, FillIcon: IconMagicFill },
};

/** The portal frame around the routed page. `children` render only for a signed-in session. */
export function AppLayout({ children }: Readonly<{ children?: ReactNode }>) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const onSignOut = useSignOut();
  const { mode, toggle } = useThemeMode();
  const { navigation } = usePortalConfig();
  const entries = useMemo(() => [...navigation].sort((a, b) => a.order - b.order), [navigation]);

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
            onSignOut={onSignOut}
            signOutLabel={t('signOut')}
          />
        </div>
      </header>

      <aside className="app-sidebar" aria-label="Primary navigation">
        <nav>
          <ul className="app-sidebar__list">
            {entries.map((entry) => (
              <NavRow
                key={entry.id}
                item={{
                  to: entry.to,
                  label: t(entry.labelKey),
                  permission: entry.requires?.permission,
                  flag: entry.requires?.flag,
                  ...NAV_ICONS[entry.id],
                }}
              />
            ))}
          </ul>
        </nav>
      </aside>

      <main className="app-shell__main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      {children}
    </div>
  );
}

function NavRow({ item }: Readonly<{ item: NavItem }>): React.ReactElement | null {
  const flagOn = useFlag(item.flag ?? '__always_on__');
  const enabled = item.flag ? flagOn : true;
  const { can } = usePermission(item.permission ?? '__always_allowed__');
  const permitted = item.permission ? can : true;
  const isActive = Boolean(useMatch({ path: item.to, end: item.to === '/' }));
  if (!enabled || !permitted) return null;

  const Icon = isActive ? item.FillIcon : item.LineIcon;

  return (
    <li>
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

