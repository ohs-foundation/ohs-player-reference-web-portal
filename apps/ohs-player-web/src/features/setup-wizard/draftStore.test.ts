import { describe, expect, it, beforeEach, vi } from 'vitest';
import { clearDraft, loadDraft, saveDraft, SETUP_WIZARD_STORAGE_KEY } from './draftStore';
import { EMPTY_DRAFT } from './types';
import { buildPhase1Entries, mapUrnsFromResponse } from './commitSetupWizard';

describe('setup wizard draftStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns empty draft when storage is empty', () => {
    expect(loadDraft().locations).toEqual([]);
    expect(loadDraft().currentStep).toBe(0);
  });

  it('persists and reloads a draft', () => {
    const draft = EMPTY_DRAFT();
    draft.currentStep = 2;
    draft.locations = [
      {
        fullUrl: 'urn:uuid:loc-1',
        resource: { resourceType: 'Location', name: 'Kenya', status: 'active' },
      },
    ];
    saveDraft(draft);
    expect(sessionStorage.getItem(SETUP_WIZARD_STORAGE_KEY)).toBeTruthy();
    const loaded = loadDraft();
    expect(loaded.currentStep).toBe(2);
    expect(loaded.locations).toHaveLength(1);
    expect(loaded.locations[0]?.resource.name).toBe('Kenya');
  });

  it('clears the draft', () => {
    saveDraft(EMPTY_DRAFT());
    clearDraft();
    expect(sessionStorage.getItem(SETUP_WIZARD_STORAGE_KEY)).toBeNull();
  });
});

describe('buildPhase1Entries', () => {
  it('emits locations with partOf urn cross-refs and org managingOrganization on draft locs', () => {
    const locUrl = 'urn:uuid:aaaa-bbbb-cccc-dddd';
    const orgUrl = 'urn:uuid:1111-2222-3333-4444';
    const entries = buildPhase1Entries({
      ...EMPTY_DRAFT(),
      locations: [
        {
          fullUrl: locUrl,
          resource: {
            resourceType: 'Location',
            name: 'Nairobi',
            status: 'active',
            partOf: { reference: 'Location/ke' },
          },
        },
      ],
      organizations: [
        {
          fullUrl: orgUrl,
          resource: { resourceType: 'Organization', name: 'MoH', active: true },
          managedLocationRefs: [locUrl],
        },
      ],
    });

    const locEntry = entries.find((e) => e.fullUrl === locUrl);
    expect(locEntry?.request).toEqual({ method: 'POST', url: 'Location' });
    expect(locEntry?.resource).toMatchObject({
      name: 'Nairobi',
      partOf: { reference: 'Location/ke' },
      managingOrganization: { reference: orgUrl },
    });

    const orgEntry = entries.find((e) => e.fullUrl === orgUrl);
    expect(orgEntry?.request).toEqual({ method: 'POST', url: 'Organization' });

    const affiliation = entries.find((e) => e.request.url === 'OrganizationAffiliation');
    expect(affiliation?.resource).toMatchObject({
      organization: { reference: orgUrl },
      location: [{ reference: locUrl }],
    });
  });

  it('maps urns from transaction response by entry index', () => {
    const entries = [
      { fullUrl: 'urn:uuid:a', request: { method: 'POST' as const, url: 'Location' }, resource: {} },
      { request: { method: 'PATCH' as const, url: 'Location/x' }, resource: {} },
      { fullUrl: 'urn:uuid:b', request: { method: 'POST' as const, url: 'Organization' }, resource: {} },
    ];
    const map = mapUrnsFromResponse(entries, {
      resourceType: 'Bundle',
      type: 'transaction-response',
      entry: [
        { response: { location: 'Location/100/_history/1' } },
        { response: { status: '200' } },
        { response: { location: 'Organization/200/_history/1' } },
      ],
    });
    expect(map).toEqual({
      'urn:uuid:a': 'Location/100',
      'urn:uuid:b': 'Organization/200',
    });
  });
});

describe('commitOneUser retry semantics', () => {
  it('marks success and failure per user', async () => {
    const { commitPhase2 } = await import('./commitSetupWizard');
    const post = vi
      .fn()
      .mockResolvedValueOnce({ id: 'p1' })
      .mockRejectedValueOnce(new Error('boom'));

    const draft = {
      ...EMPTY_DRAFT(),
      phase1Complete: true,
      users: [
        {
          localId: 'u1',
          fields: {
            givenName: 'A',
            familyName: 'B',
            email: 'a@example.com',
            phone: '',
            gender: '',
            dob: '',
            nationalId: '',
            active: true,
            role: null,
            organizations: [],
            locations: [],
          },
          careTeamIds: [],
          status: 'pending' as const,
        },
        {
          localId: 'u2',
          fields: {
            givenName: 'C',
            familyName: 'D',
            email: 'c@example.com',
            phone: '',
            gender: '',
            dob: '',
            nationalId: '',
            active: true,
            role: null,
            organizations: [],
            locations: [],
          },
          careTeamIds: [],
          status: 'pending' as const,
        },
      ],
    };

    const client = { transaction: vi.fn().mockResolvedValue({ entry: [] }) } as never;
    const next = await commitPhase2(client, { post }, draft);
    expect(next.users[0]?.status).toBe('success');
    expect(next.users[1]?.status).toBe('failed');
    expect(next.users[1]?.error).toContain('boom');
  });
});
