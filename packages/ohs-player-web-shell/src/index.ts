export * from './components/ui';
export * from './components/ui/icons';
export { cn } from './lib/cn';

export { DEFAULT_NAVIGATION, NAV_IDS, type NavEntry, type NavId } from './config/navigation';
export { PortalConfigContext, usePortalConfig } from './config/portalConfigContext';
export {
  resolvePortalConfig,
  type PortalDefaults,
  type PortalDocument,
  type ResolvedPortalConfig,
} from './config/resolvePortalConfig';

export {
  createPortalHost,
  type PortalHostInput,
  type ResolvedPortalHost,
} from './host/createPortalHost';
export { useExtensionQuestionnaire } from './host/extensionsContext';
export { PortalHost, type PortalHostProps } from './host/PortalHost';
export type {
  DashboardRegion,
  ExtensionContributions,
  PortalExtension,
  SlotContexts,
  SlotName,
} from './host/types';
export type { PortalRoute } from './routes/types';

export { useClearFilterParams, useFilterParam } from './features/search/useFilterParam';
export { useDebounced } from './features/search/useGlobalSearch';
export { useInitialSearchTerm } from './features/search/useInitialSearchTerm';

export { AppLayout } from './layout/AppLayout';
export { LoginPage } from './pages/LoginPage';
