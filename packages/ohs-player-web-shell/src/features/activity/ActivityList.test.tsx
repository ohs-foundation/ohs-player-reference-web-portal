import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityItem } from './useRecentActivity';

const { catalogue } = vi.hoisted(() => {
  const catalogue: { current: Record<string, string> } = { current: {} };
  return { catalogue };
});

vi.mock('ohs-player-web-core', async (): Promise<object> => {
  const actual = await vi.importActual<object>('ohs-player-web-core');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, vars: Record<string, string> = {}) =>
        (catalogue.current[key] ?? key).replace(
          /\{\{(\w+)\}\}/g,
          (_, name: string) => vars[name] ?? '',
        ),
      dir: 'ltr',
      locale: 'en',
    }),
  };
});

const { ActivityList } = await import('./ActivityList');

const ENGLISH = {
  activityCreated: 'Created',
  activityChanged: 'Changed',
  activityLine: '{{verb}} {{resource}} {{id}}',
  resourceTypeLocation: 'Site',
  resourceTypeOrganization: 'Organisation',
};

function item(partial: Partial<ActivityItem>): ActivityItem {
  return {
    id: 'ae1',
    action: 'C',
    resourceType: 'Location',
    resourceId: '1001',
    who: '',
    ...partial,
  };
}

function line(items: ActivityItem[]): string | null {
  const { container } = render(<ActivityList items={items} loading={false} error={null} />);
  return container.querySelector('.app-activity__text')?.textContent ?? null;
}

beforeEach(() => {
  catalogue.current = ENGLISH;
});

describe('ActivityList', () => {
  it('shows the empty state when there is no recent activity', () => {
    render(<ActivityList items={[]} loading={false} error={null} />);
    expect(screen.getByText('activityEmpty')).toBeInTheDocument();
  });

  it('names the resource with its catalogue label, not the FHIR type', () => {
    expect(line([item({ who: 'Portal user', recorded: '2026-06-18T06:24:07.347Z' })])).toBe(
      'Created Site 1001',
    );
    expect(screen.getByText(/Portal user/)).toBeInTheDocument();
  });

  it('falls back to the FHIR type when the catalogue has no label for it', () => {
    expect(line([item({ resourceType: 'Schedule', resourceId: 's1' })])).toBe(
      'Created Schedule s1',
    );
  });

  it('lets the activityLine message decide the word order', () => {
    catalogue.current = { ...ENGLISH, activityLine: '{{id}} · {{resource}} · {{verb}}' };
    expect(line([item({})])).toBe('1001 · Site · Created');
  });

  it('shows the verb alone for an event that names no resource', () => {
    expect(line([item({ resourceType: '', resourceId: '' })])).toBe('Created');
  });

  it('falls back to a generic verb when the AuditEvent recorded no action', () => {
    expect(
      line([item({ action: undefined, resourceType: 'Organization', resourceId: 'o1' })]),
    ).toBe('Changed Organisation o1');
  });
});
