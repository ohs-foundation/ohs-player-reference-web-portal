import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gatewaySearch, legacyWithoutAction, portalUpdate } from './__fixtures__/auditEvents';

const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));

vi.mock(
  'ohs-player-web-core',
  async (): Promise<object> => ({
    ...(await vi.importActual<object>('ohs-player-web-core')),
    useTranslation: () => ({
      t: (key: string, vars?: object) => (vars ? `${key} ${JSON.stringify(vars)}` : key),
      formatDateTime: (d: Date) => `at ${d.toISOString()}`,
      dir: 'ltr',
      locale: 'en',
    }),
    useStatusBar: () => ({ notify }),
  }),
);

const { AuditDetailsDrawer } = await import('./AuditDetailsDrawer');

function field(label: string): HTMLElement {
  const labelEl = screen.getByText(label, { selector: '.ohs-detail-field__label' });
  return labelEl.parentElement!.querySelector('.ohs-detail-field__value') as HTMLElement;
}

beforeEach(() => notify.mockReset());

describe('AuditDetailsDrawer', () => {
  it('summarises a portal event and shows its raw JSON', () => {
    render(<AuditDetailsDrawer event={portalUpdate} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');

    expect(
      within(dialog).getByText('Location/l1', { selector: '.ohs-user-drawer__id-chip' }),
    ).toBeInTheDocument();
    expect(field('auditDetailsRecorded').querySelector('time')).toHaveAttribute(
      'dateTime',
      '2026-09-22T08:30:00.000Z',
    );
    expect(field('auditDetailsAgent')).toHaveTextContent('admin-user');
    expect(field('auditDetailsAction')).toHaveTextContent(
      'auditDetailsActionValue {"verb":"activityUpdated","code":"U"}',
    );
    expect(field('auditDetailsEntity')).toHaveTextContent('Location/l1');
    expect(field('auditDetailsDescription')).toHaveTextContent('Linked to Organization/o1');
    expect(field('auditDetailsType')).toHaveTextContent('RESTful Operation');
    expect(field('auditDetailsOutcome')).toHaveTextContent('—');
    expect(field('auditDetailsSource')).toHaveTextContent('OHS Player Web');
    expect(screen.queryByText('auditDetailsAgentId')).toBeNull();
    expect(dialog.querySelector('pre')).toHaveTextContent('"resourceType": "AuditEvent"');
    expect(screen.getByRole('region', { name: 'auditDetailsRaw' })).toBeInTheDocument();
  });

  it('reads a gateway event: requestor identity, outcome, subtype, data entity', () => {
    render(<AuditDetailsDrawer event={gatewaySearch} onClose={vi.fn()} />);

    expect(field('auditDetailsAgent')).toHaveTextContent('manager-user');
    expect(field('auditDetailsAgentId')).toHaveTextContent('sub-123');
    expect(field('auditDetailsOutcome')).toHaveTextContent('auditOutcomeSuccess');
    expect(field('auditDetailsType')).toHaveTextContent('RESTful Operation · read');
    expect(field('auditDetailsEntity')).toHaveTextContent('Organization/o2');
  });

  it('shows a dangling reference as text and never links or loads it', () => {
    render(<AuditDetailsDrawer event={gatewaySearch} onClose={vi.fn()} />);
    expect(within(screen.getByRole('dialog')).queryByRole('link')).toBeNull();
  });

  it('renders dashes and the generic verb for an event without action, time or outcome', () => {
    render(<AuditDetailsDrawer event={legacyWithoutAction} onClose={vi.fn()} />);

    expect(field('auditDetailsRecorded')).toHaveTextContent('—');
    expect(field('auditDetailsAction')).toHaveTextContent('activityChanged');
    expect(field('auditDetailsDescription')).toHaveTextContent('—');
  });

  it('closes from the header button', () => {
    const onClose = vi.fn();
    render(<AuditDetailsDrawer event={portalUpdate} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('raises a toast when the JSON is copied, and another when copying fails', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const { unmount } = render(<AuditDetailsDrawer event={portalUpdate} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'fhirViewerCopyCode' }));
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith({ tone: 'success', title: 'fhirViewerCopiedToast' }),
    );
    unmount();

    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(<AuditDetailsDrawer event={portalUpdate} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'fhirViewerCopyCode' }));
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith({ tone: 'error', title: 'fhirViewerCopyFailed' }),
    );
  });

  it('has no serious or critical a11y violations', async () => {
    render(<AuditDetailsDrawer event={gatewaySearch} onClose={vi.fn()} />);
    const result = await axe(screen.getByRole('dialog'), {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(
      result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);
  });
});
