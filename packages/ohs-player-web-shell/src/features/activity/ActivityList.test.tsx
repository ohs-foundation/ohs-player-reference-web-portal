import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ActivityItem } from './useRecentActivity';

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, dir: 'ltr', locale: 'en' }),
  };
});

const { ActivityList } = await import('./ActivityList');

describe('ActivityList', () => {
  it('shows the empty state when there is no recent activity', () => {
    render(<ActivityList items={[]} loading={false} error={null} />);
    expect(screen.getByText('activityEmpty')).toBeInTheDocument();
  });

  it('renders the verb + resource and the agent for a created AuditEvent', () => {
    const items: ActivityItem[] = [
      { id: 'ae1', action: 'C', resourceType: 'Location', resourceId: '1001', who: 'Portal user', recorded: '2026-06-18T06:24:07.347Z' },
    ];
    render(<ActivityList items={items} loading={false} error={null} />);
    expect(screen.getByText('activityCreated Location 1001')).toBeInTheDocument();
    expect(screen.getByText(/Portal user/)).toBeInTheDocument();
  });

  it('falls back to a generic verb when the AuditEvent recorded no action', () => {
    const items: ActivityItem[] = [
      { id: 'ae2', resourceType: 'Organization', resourceId: 'o1', who: '', recorded: undefined },
    ];
    render(<ActivityList items={items} loading={false} error={null} />);
    expect(screen.getByText('activityChanged Organization o1')).toBeInTheDocument();
  });
});
