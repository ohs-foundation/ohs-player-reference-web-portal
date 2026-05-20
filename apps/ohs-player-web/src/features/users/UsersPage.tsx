import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  buildQuestionnaireResponse,
  FhirError,
  formatOperationOutcomeMessage,
  OhsDialog,
  PermissionGuard,
  QuestionnaireFields,
  useCreateResource,
  useCustomEndpoint,
  useFhirClient,
  useQuestionnaireFormState,
  useResource,
  useSearch,
  useTranslation,
  useUpdateResource,
  writeAuditEvent,
} from 'ohs-player-web-core';
import { Button, Card, ChipSet, DataTable, EmptyState, ErrorState, FilterChip, Inline, LinearProgress, Page, PageHeader, SelectField, Spinner, Stack, StatusBadge, TextField } from '../../components/ui';
import { Link } from 'react-router-dom';
import { getBundledQuestionnaires } from '../../questionnaires/registry';
import { USER_LINK_IDS, userBodyFromAnswers } from '../sdc/resourceFromAnswers';

type Bundle = { entry?: { resource?: { resourceType?: string; id?: string } }[]; total?: number };

type PractitionerRow = {
  id?: string;
  active?: boolean;
  name?: { family?: string; given?: string[] }[];
};

function practitionerIdFromReference(ref: string | undefined): string | undefined {
  if (!ref) return undefined;
  return ref.replace(/^Practitioner\//, '');
}

function buildPractitionerRoleMap(
  bundle: { entry?: { resource?: Record<string, unknown> }[] } | undefined,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const ent of bundle?.entry ?? []) {
    const pr = ent.resource as {
      practitioner?: { reference?: string };
      code?: { coding?: { code?: string }[] }[];
    };
    const pid = practitionerIdFromReference(pr.practitioner?.reference);
    if (!pid) continue;
    const codes =
      pr.code?.flatMap((c) => c.coding?.map((x) => x.code).filter(Boolean) as string[]) ?? [];
    if (!map.has(pid)) map.set(pid, new Set());
    for (const c of codes) map.get(pid)!.add(c);
  }
  return map;
}

function UserCreateForm({
  questionnaire,
  onSuccess,
  onCancel,
}: Readonly<{
  questionnaire: ReturnType<typeof getBundledQuestionnaires>['user'];
  onSuccess: () => void;
  onCancel: () => void;
}>) {
  const { t } = useTranslation();
  const { post } = useCustomEndpoint('users');
  const createQr = useCreateResource('QuestionnaireResponse');
  const client = useFhirClient();

  const { answers, setAnswer, validateRequired } = useQuestionnaireFormState(questionnaire, {
    [USER_LINK_IDS.given]: '',
    [USER_LINK_IDS.family]: '',
    [USER_LINK_IDS.email]: '',
    [USER_LINK_IDS.roles]: 'admin',
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSubmitError(null);
    const missing = validateRequired();
    if (missing.length > 0) {
      setValidationError(t('questionnaireRequiredFields'));
      return;
    }
    void (async () => {
      try {
        const body = userBodyFromAnswers(answers);
        await post.mutateAsync(body);
        const qr = buildQuestionnaireResponse({ questionnaire, answers, status: 'completed' });
        await createQr.mutateAsync(qr);
        await writeAuditEvent(client, {
          action: 'create',
          resourceType: 'Practitioner',
          description: 'User created via gateway',
        });
        onSuccess();
      } catch (error_) {
        let msg: string;
        if (error_ instanceof FhirError) {
          msg = formatOperationOutcomeMessage(error_.outcome);
        } else if (error_ instanceof Error) {
          msg = error_.message;
        } else {
          msg = String(error_);
        }
        setSubmitError(msg);
      }
    })();
  };

  const isPending = post.isPending || createQr.isPending;

  return (
    <form id="user-create-form" onSubmit={onSubmit}>
      <Stack gap={3}>
        {validationError ? <ErrorState description={validationError} /> : null}
        {submitError ? <ErrorState description={submitError} /> : null}
        <QuestionnaireFields
          questionnaire={questionnaire}
          answers={answers}
          setAnswer={setAnswer}
        />
        <Inline justify="end" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="outlined" type="button" onClick={onCancel} disabled={isPending}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={isPending} loading={isPending}>
            {t('saveAndClose')}
          </Button>
        </Inline>
      </Stack>
    </form>
  );
}

export function UsersPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const questionnaire = getBundledQuestionnaires().user;

  const params: Record<string, string> = {
    _count: '500',
    ...(q.trim() ? { name: q.trim() } : {}),
  };

  const search = useSearch('Practitioner', params);
  const roleSearch = useSearch('PractitionerRole', { _count: '500' });

  const bundle = search.data as Bundle | undefined;
  const rawRows = useMemo(
    () =>
      (bundle?.entry?.map((e) => e.resource).filter(Boolean) ?? []) as PractitionerRow[],
    [bundle?.entry],
  );

  const roleMap = useMemo(
    () =>
      buildPractitionerRoleMap(
        roleSearch.data as { entry?: { resource?: Record<string, unknown> }[] },
      ),
    [roleSearch.data],
  );

  const roleOptions = useMemo(() => {
    const codes = new Set<string>();
    for (const s of roleMap.values()) {
      for (const c of s) codes.add(c);
    }
    const sorted = [...codes].sort((a, b) => a.localeCompare(b));
    return [
      { value: 'all', label: t('filterRoleAll') },
      ...sorted.map((code) => ({ value: code, label: code })),
    ];
  }, [roleMap, t]);

  const filteredRows = useMemo(() => {
    return rawRows.filter((p) => {
      if (!p.id) return false;
      if (statusFilter === 'active' && p.active === false) return false;
      if (statusFilter === 'inactive' && p.active !== false) return false;
      if (roleFilter !== 'all') {
        const roles = roleMap.get(p.id);
        if (!roles?.has(roleFilter)) return false;
      }
      return true;
    });
  }, [rawRows, statusFilter, roleFilter, roleMap]);

  let searchError: string | null = null;
  if (search.error) {
    searchError = search.error instanceof Error ? search.error.message : String(search.error);
  }

  return (
    <Page>
      <PageHeader
        title={t('pageUsers')}
        description={t('pageUsersDescription')}
        actions={
          <PermissionGuard permission="users.create">
            <Button
              type="button"
              onClick={() => {
                setResetKey((k) => k + 1);
                setModalOpen(true);
              }}
            >
              {t('createUser')}
            </Button>
          </PermissionGuard>
        }
      />

      {search.isLoading ? <LinearProgress /> : null}

      <OhsDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        headline={t('dialogCreateUser')}
        minWidth="min(96vw, 560px)"
      >
        <UserCreateForm
          key={resetKey}
          questionnaire={questionnaire}
          onCancel={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            globalThis.location.reload();
          }}
        />
      </OhsDialog>

      <Stack gap={4}>
        <Card>
          <Stack gap={3}>
            <div style={{ flex: '1 1 220px', minWidth: 200 }}>
              <TextField
                label={t('search')}
                name="userSearch"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. Smith"
              />
            </div>
            <Inline justify="start" style={{ flexWrap: 'wrap', gap: 'var(--ohs-spacing-3, 12px)' }}>
              <ChipSet>
                <FilterChip
                  label={t('filterStatusAll')}
                  selected={statusFilter === 'all'}
                  onChange={() => setStatusFilter('all')}
                />
                <FilterChip
                  label={t('filterStatusActive')}
                  selected={statusFilter === 'active'}
                  onChange={() => setStatusFilter('active')}
                />
                <FilterChip
                  label={t('filterStatusInactive')}
                  selected={statusFilter === 'inactive'}
                  onChange={() => setStatusFilter('inactive')}
                />
              </ChipSet>
              <div style={{ flex: '0 1 220px', minWidth: 180 }}>
                <SelectField
                  label={t('filterRole')}
                  name="roleFilter"
                  options={roleOptions}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                />
              </div>
            </Inline>
          </Stack>
        </Card>

        <DataTable<PractitionerRow>
          caption={undefined}
          columns={[
            {
              key: 'name',
              header: t('columnName'),
              sortable: true,
              sortValue: (p) => {
                const given = p.name?.[0]?.given?.join(' ') ?? '';
                const fam = p.name?.[0]?.family ?? '';
                return `${fam} ${given}`.trim().toLowerCase();
              },
              render: (p) => {
                const given = p.name?.[0]?.given?.join(' ') ?? '';
                const fam = p.name?.[0]?.family ?? '';
                return `${given} ${fam}`.trim() || p.id;
              },
            },
            {
              key: 'active',
              header: t('columnActive'),
              sortable: true,
              sortValue: (p) => (p.active === false ? 0 : 1),
              render: (p) =>
                p.active === false ? (
                  <StatusBadge tone="neutral">{t('no')}</StatusBadge>
                ) : (
                  <StatusBadge tone="success">{t('yes')}</StatusBadge>
                ),
            },
            {
              key: 'roles',
              header: t('columnRoles'),
              render: (p) => {
                const codes = p.id
                  ? [...(roleMap.get(p.id) ?? [])].sort((a, b) => a.localeCompare(b)).join(', ')
                  : '';
                return codes || '—';
              },
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (p) => <Link to={`/users/${p.id}/edit`}>{t('edit')}</Link>,
            },
          ]}
          rows={filteredRows}
          rowKey={(p) => p.id ?? ''}
          loading={search.isLoading}
          errorState={searchError ? <ErrorState description={searchError} /> : undefined}
          emptyState={
            <EmptyState
              title={t('emptyTitle')}
              description={
                !search.isLoading && rawRows.length > 0 && filteredRows.length === 0
                  ? t('filterEmpty')
                  : t('emptyDescription')
              }
            />
          }
        />
      </Stack>
    </Page>
  );
}

export function UserEditPage({ id }: Readonly<{ id: string }>) {
  const { t } = useTranslation();
  const read = useResource('Practitioner', id);
  const pract = read.data as Record<string, unknown> | undefined;
  const update = useUpdateResource('Practitioner');
  const client = useFhirClient();
  const { post: deactivateReq } = useCustomEndpoint('userDeactivate');

  const [family, setFamily] = useState('');
  useEffect(() => {
    if (pract) {
      const n = pract.name as { family?: string }[] | undefined;
      setFamily(n?.[0]?.family ?? '');
    }
  }, [pract]);

  if (read.isLoading) {
    return (
      <Page>
        <Inline justify="start" style={{ gap: 'var(--ohs-spacing-2, 8px)', padding: 'var(--ohs-spacing-4, 16px) 0' }}>
          <Spinner />
          <span style={{ color: 'var(--ohs-color-text-muted)' }}>{t('loading')}</span>
        </Inline>
      </Page>
    );
  }
  if (!pract) {
    return (
      <Page>
        <p>{t('empty')}</p>
      </Page>
    );
  }

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    void update
      .mutateAsync({
        id,
        body: {
          ...pract,
          name: [
            {
              family,
              given: (pract.name as { given?: string[] }[])?.[0]?.given ?? [],
            },
          ],
        },
      })
      .then(async () => {
        await writeAuditEvent(client, {
          action: 'update',
          resourceType: 'Practitioner',
          resourceId: id,
        });
        globalThis.location.href = '/users';
      });
  };

  const onDeactivate = () => {
    void (async () => {
      const inactive = { ...pract, active: false };
      await update.mutateAsync({ id, body: inactive });
      try {
        await deactivateReq.mutateAsync({ practitionerId: id });
      } catch {
        /* gateway optional */
      }
      const ctSearch = (await client.search('CareTeam', {
        participant: `Practitioner/${id}`,
      })) as Bundle;
      for (const ent of ctSearch.entry ?? []) {
        const ct = ent.resource as {
          id?: string;
          resourceType?: string;
          participant?: { member?: { reference?: string } }[];
        };
        if (!ct.id) continue;
        const next = {
          ...ct,
          participant: (ct.participant ?? []).filter(
            (p) => p.member?.reference !== `Practitioner/${id}`,
          ),
        };
        await client.update('CareTeam', ct.id, next);
      }
      await writeAuditEvent(client, {
        action: 'update',
        resourceType: 'Practitioner',
        resourceId: id,
        description: 'Deactivated',
      });
      globalThis.location.href = '/users';
    })().catch(console.error);
  };

  return (
    <Page>
      <PageHeader title={t('pageUserEdit')} />
      <Card>
        <Stack gap={3}>
          <form onSubmit={onSave}>
            <Stack gap={3}>
              <TextField
                label={t('familyName')}
                name="family"
                value={family}
                onChange={(e) => setFamily(e.target.value)}
              />
              <Inline justify="start">
                <Button type="submit">{t('save')}</Button>
              </Inline>
            </Stack>
          </form>
          <PermissionGuard permission="users.deactivate">
            <Inline justify="start">
              <Button variant="danger" size="sm" type="button" onClick={onDeactivate}>
                {t('deactivateUser')}
              </Button>
            </Inline>
          </PermissionGuard>
          <p>
            <Link to="/users">{t('back')}</Link>
          </p>
        </Stack>
      </Card>
    </Page>
  );
}
