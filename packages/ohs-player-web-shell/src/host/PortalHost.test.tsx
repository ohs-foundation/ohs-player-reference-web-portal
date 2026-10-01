import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PortalDocument } from '../config/resolvePortalConfig';
import type { PortalExtension } from './types';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useAuth: () => ({
      status: 'authenticated',
      user: { sub: 'u1', preferred_username: 'admin' },
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
    }),
    useFlag: () => true,
    usePermission: () => ({ can: true }),
    useSearch: () => ({ data: undefined, isLoading: false, error: null }),
  };
});

const { useCoreConfig, useTranslation } = await import('ohs-player-web-core');
const { testPortalDefaults } = await import('../test/testPlatformConfig');
const { createPortalHost } = await import('./createPortalHost');
const { useExtensionQuestionnaire } = await import('./extensionsContext');
const { PortalHost } = await import('./PortalHost');

function SchedulesPage(): React.ReactElement {
  const { t } = useTranslation();
  const { customEndpoints, flags } = useCoreConfig();
  const questionnaire = useExtensionQuestionnaire('schedules', 'schedule');
  return (
    <section>
      <h1>{t('schedulesTitle')}</h1>
      <p>endpoint {customEndpoints?.schedules}</p>
      <p>flag default {String(flags?.flags?.schedules)}</p>
      <p>questionnaire {questionnaire?.title}</p>
    </section>
  );
}

const schedules: PortalExtension = {
  id: 'schedules',
  routes: [
    { id: 'list', path: '/schedules', load: () => Promise.resolve({ default: SchedulesPage }) },
  ],
  nav: [{ id: 'list', to: '/schedules', labelKey: 'navSchedules', order: 25 }],
  messages: { schedulesTitle: 'Practitioner schedules', navSchedules: 'Schedules' },
  flags: { schedules: true },
  customEndpoints: { schedules: '/api/schedules' },
  questionnaires: { schedule: { resourceType: 'Questionnaire', title: 'Schedule' } },
};

const defaults = {
  ...testPortalDefaults,
  platform: {
    ...testPortalDefaults.platform,
    i18n: {
      ...testPortalDefaults.platform.i18n,
      messages: {
        ...testPortalDefaults.platform.i18n?.messages,
        configUnknownMessageKeys: 'Unknown message keys',
        configUnknownMessageKeySuggestion: '{{key}} (did you mean {{suggestion}}?)',
      },
    },
  },
};

function renderHostAt(path: string, document?: PortalDocument) {
  window.history.pushState({}, '', path);
  const host = createPortalHost({
    defaults,
    document,
    extensions: [schedules],
    development: true,
  });
  return render(<PortalHost host={host} />);
}

describe('PortalHost', () => {
  beforeEach(() => {
    window.localStorage.setItem('ohs-theme', 'light');
  });

  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  it("renders an extension's page under the frame with its merged configuration", async () => {
    renderHostAt('/schedules');

    expect(
      await screen.findByRole('heading', { name: 'Practitioner schedules' }),
    ).toBeInTheDocument();
    expect(screen.getByText('endpoint /api/schedules')).toBeInTheDocument();
    expect(screen.getByText('flag default true')).toBeInTheDocument();
    expect(screen.getByText('questionnaire Schedule')).toBeInTheDocument();
    expect(screen.getByLabelText('Primary navigation')).toBeInTheDocument();
  });

  it("places the extension's nav entry among the shell's entries by order", async () => {
    renderHostAt('/schedules');

    const sidebar = await screen.findByLabelText('Primary navigation');
    const hrefs = within(sidebar)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));

    expect(hrefs.slice(0, 4)).toEqual(['/', '/users', '/schedules', '/locations']);
    expect(within(sidebar).getByRole('link', { name: 'Schedules' })).toBeInTheDocument();
  });

  it('warns about a document message key nothing declares, naming the key it meant', async () => {
    renderHostAt('/schedules', { messages: { navSchedles: 'Rosters' } });

    expect(await screen.findByText('Unknown message keys')).toBeInTheDocument();
    expect(screen.getByText('navSchedles (did you mean navSchedules?)')).toBeInTheDocument();
  });

  it('shows no warning when every document message key is declared', async () => {
    renderHostAt('/schedules', { messages: { navSchedules: 'Rosters' } });

    expect(await screen.findByRole('link', { name: 'Rosters' })).toBeInTheDocument();
    expect(screen.queryByText('Unknown message keys')).not.toBeInTheDocument();
  });
});
