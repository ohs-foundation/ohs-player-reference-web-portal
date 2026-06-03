import { type FormEvent, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiArrowDownSLine, RiFilter3Line, RiMore2Fill, RiUserFill } from '@remixicon/react';
import {
  buildQuestionnaireResponse,
  FhirError,
  formatOperationOutcomeMessage,
  OhsDialog,
  OhsDropdownMenu,
  PermissionGuard,
  QuestionnaireFields,
  useCreateResource,
  useCustomEndpoint,
  useFhirClient,
  useQuestionnaireFormState,
  useResource,
  useSearch,
  useStatusBar,
  useTranslation,
  useUpdateResource,
  writeAuditEvent,
} from 'ohs-player-web-core';
import { Avatar, Button, Card, ChipSet, DataTable, EmptyState, ErrorState, FilterChip, IconButton, Inline, LinearProgress, Page, PageHeader, SearchField, SelectField, type SelectFieldOption, Spinner, Stack, StatusBadge } from '../../components/ui';
import { Link, useNavigate } from 'react-router-dom';
import { getBundledQuestionnaires } from '../../questionnaires/registry';
import {
  ASSIGNABLE_ROLES,
  PRACTITIONER_ROLE_CODES,
  PRACTITIONER_ROLE_SYSTEM,
} from '../../config/roles';
import {
  applyUserAnswersToPractitioner,
  buildCreateUserBundle,
  buildCreateUserPayload,
  type PractitionerRoleAssignment,
  USER_LINK_IDS,
  userAnswersFromPractitioner,
} from '../sdc/resourceFromAnswers';
import { env } from '../../config/env';

function toErrorMessage(error: unknown): string {
  if (error instanceof FhirError) return formatOperationOutcomeMessage(error.outcome);
  if (error instanceof Error) return error.message;
  return String(error);
}

type Bundle = { entry?: { resource?: { resourceType?: string; id?: string } }[]; total?: number };

type PractitionerRow = {
  id?: string;
  active?: boolean;
  name?: { family?: string; given?: string[] }[];
  identifier?: { system?: string; value?: string }[];
  telecom?: { system?: string; value?: string }[];
};

function fullName(p: PractitionerRow): string {
  const n = p.name?.[0];
  return `${n?.given?.join(' ') ?? ''} ${n?.family ?? ''}`.trim();
}
function emailOf(p: PractitionerRow): string {
  return p.telecom?.find((tc) => tc.system === 'email')?.value ?? '';
}
function identifierOf(p: PractitionerRow): string {
  return p.identifier?.[0]?.value ?? p.id ?? '—';
}

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

/** Practitioner id → organisation id, from PractitionerRole.organization references. */
function buildPractitionerOrgMap(
  bundle: { entry?: { resource?: Record<string, unknown> }[] } | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const ent of bundle?.entry ?? []) {
    const pr = ent.resource as {
      practitioner?: { reference?: string };
      organization?: { reference?: string };
    };
    const pid = practitionerIdFromReference(pr.practitioner?.reference);
    const orgRef = pr.organization?.reference;
    if (!pid || !orgRef || map.has(pid)) continue;
    map.set(pid, orgRef.replace(/^Organization\//, ''));
  }
  return map;
}

/** Organisation id → display name, from an Organization search bundle. */
function buildOrgNameMap(
  bundle: { entry?: { resource?: { id?: string; name?: string } }[] } | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const ent of bundle?.entry ?? []) {
    const org = ent.resource;
    if (org?.id) map.set(org.id, org.name ?? org.id);
  }
  return map;
}

type AssignmentRow = { rowId: number; organization: string; location: string; role: string };

function referenceOptions(
  bundle: unknown,
  resourceType: string,
): SelectFieldOption[] {
  const entries = (bundle as { entry?: { resource?: { id?: string; name?: string } }[] } | undefined)
    ?.entry;
  return (entries ?? [])
    .map((e) => e.resource)
    .filter((r): r is { id?: string; name?: string } => Boolean(r?.id))
    .map((r) => ({ value: `${resourceType}/${r.id ?? ''}`, label: r.name ?? r.id ?? '' }));
}

function keycloakIdFromCreated(created: unknown): string | undefined {
  const identifiers = (created as { identifier?: { value?: string }[] } | undefined)?.identifier;
  return identifiers?.find((i) => i.value)?.value;
}

export function UserCreateForm({
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

  const orgSearch = useSearch('Organization', { _count: '200' });
  const locSearch = useSearch('Location', { _count: '500' });
  const orgOptions = useMemo(() => referenceOptions(orgSearch.data, 'Organization'), [orgSearch.data]);
  const locOptions = useMemo(() => referenceOptions(locSearch.data, 'Location'), [locSearch.data]);
  const roleCodeOptions = useMemo<SelectFieldOption[]>(
    () => PRACTITIONER_ROLE_CODES.map((r) => ({ value: r.value, label: r.label })),
    [],
  );
  const refDataLoading = orgSearch.isLoading || locSearch.isLoading;
  const refDataEmpty = !refDataLoading && (orgOptions.length === 0 || locOptions.length === 0);

  const { answers, setAnswer, validateRequired } = useQuestionnaireFormState(questionnaire, {
    [USER_LINK_IDS.given]: '',
    [USER_LINK_IDS.family]: '',
    [USER_LINK_IDS.email]: '',
  });

  const [roles, setRoles] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const rowIdRef = useRef(0);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleRole = (value: string, selected: boolean) => {
    setRoles((prev) => (selected ? [...prev, value] : prev.filter((r) => r !== value)));
  };

  const addAssignment = () => {
    rowIdRef.current += 1;
    setAssignments((prev) => [
      ...prev,
      { rowId: rowIdRef.current, organization: '', location: '', role: '' },
    ]);
  };
  const updateAssignment = (rowId: number, key: keyof AssignmentRow, value: string) => {
    setAssignments((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, [key]: value } : r)));
  };
  const removeAssignment = (rowId: number) => {
    setAssignments((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setRolesError(null);
    setAssignmentError(null);
    setSubmitError(null);

    let valid = true;
    if (validateRequired().length > 0) {
      setValidationError(t('questionnaireRequiredFields'));
      valid = false;
    }
    if (roles.length === 0) {
      setRolesError(t('rolesRequired'));
      valid = false;
    }
    if (assignments.some((a) => !a.organization || !a.location || !a.role)) {
      setAssignmentError(t('assignmentIncomplete'));
      valid = false;
    }
    if (!valid) return;

    void (async () => {
      setSubmitting(true);
      try {
        const payloadAssignments: PractitionerRoleAssignment[] = assignments.map((a) => ({
          organization: a.organization,
          location: a.location,
          role: { system: PRACTITIONER_ROLE_SYSTEM, code: a.role },
        }));
        const payload = buildCreateUserPayload(answers, roles, payloadAssignments);

        let auditDescription: string;
        if (env.usersDirectFhir) {
          await client.transaction(buildCreateUserBundle(payload));
          auditDescription = 'User created (direct FHIR, dev)';
        } else {
          const created = await post.mutateAsync(payload);
          const keycloakId = keycloakIdFromCreated(created);
          auditDescription = keycloakId
            ? `User created via gateway (Keycloak ${keycloakId})`
            : 'User created via gateway';
        }

        const qr = buildQuestionnaireResponse({ questionnaire, answers, status: 'completed' });
        await createQr.mutateAsync(qr);
        await writeAuditEvent(client, {
          action: 'create',
          resourceType: 'Practitioner',
          description: auditDescription,
        });
        onSuccess();
      } catch (error_) {
        setSubmitError(toErrorMessage(error_));
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const isPending = submitting || post.isPending || createQr.isPending;

  return (
    <form id="user-create-form" onSubmit={onSubmit} noValidate>
      <Stack gap={4}>
        {validationError ? <ErrorState description={validationError} /> : null}
        {submitError ? <ErrorState description={submitError} /> : null}

        <QuestionnaireFields questionnaire={questionnaire} answers={answers} setAnswer={setAnswer} />

        <Stack gap={2}>
          <span style={{ fontSize: 'var(--ohs-text-label)', fontWeight: 600 }}>{t('rolesLabel')}</span>
          <ChipSet>
            {ASSIGNABLE_ROLES.map((r) => (
              <FilterChip
                key={r.value}
                label={r.label}
                selected={roles.includes(r.value)}
                onChange={(selected) => toggleRole(r.value, selected)}
              />
            ))}
          </ChipSet>
          {rolesError ? (
            <span role="alert" style={{ color: 'var(--ohs-color-error)', fontSize: 'var(--ohs-text-label)' }}>
              {rolesError}
            </span>
          ) : null}
        </Stack>

        <Stack gap={2}>
          <span style={{ fontSize: 'var(--ohs-text-label)', fontWeight: 600 }}>{t('assignmentsLabel')}</span>
          <span style={{ color: 'var(--ohs-color-text-muted)', fontSize: 'var(--ohs-text-label)' }}>
            {t('assignmentsHint')}
          </span>
          {refDataLoading ? <Spinner label={t('loading')} /> : null}
          {refDataEmpty ? (
            <span style={{ color: 'var(--ohs-color-text-muted)', fontSize: 'var(--ohs-text-label)' }}>
              {t('assignmentsNeedData')}
            </span>
          ) : null}
          {assignments.map((row) => (
            <Inline key={row.rowId} justify="start" style={{ gap: 'var(--ohs-spacing-3, 12px)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 180px', minWidth: 160 }}>
                <SelectField
                  label={t('contextOrganization')}
                  name={`assignment-org-${row.rowId}`}
                  options={orgOptions}
                  value={row.organization}
                  onChange={(e) => updateAssignment(row.rowId, 'organization', e.target.value)}
                />
              </div>
              <div style={{ flex: '1 1 180px', minWidth: 160 }}>
                <SelectField
                  label={t('contextLocation')}
                  name={`assignment-loc-${row.rowId}`}
                  options={locOptions}
                  value={row.location}
                  onChange={(e) => updateAssignment(row.rowId, 'location', e.target.value)}
                />
              </div>
              <div style={{ flex: '1 1 160px', minWidth: 140 }}>
                <SelectField
                  label={t('contextRole')}
                  name={`assignment-role-${row.rowId}`}
                  options={roleCodeOptions}
                  value={row.role}
                  onChange={(e) => updateAssignment(row.rowId, 'role', e.target.value)}
                />
              </div>
              <Button variant="outlined" size="sm" type="button" onClick={() => removeAssignment(row.rowId)}>
                {t('removeAssignment')}
              </Button>
            </Inline>
          ))}
          {assignmentError ? (
            <span role="alert" style={{ color: 'var(--ohs-color-error)', fontSize: 'var(--ohs-text-label)' }}>
              {assignmentError}
            </span>
          ) : null}
          <Inline justify="start">
            <Button variant="outlined" size="sm" type="button" onClick={addAssignment} disabled={refDataLoading}>
              {t('addAssignment')}
            </Button>
          </Inline>
        </Stack>

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
  const status = useStatusBar();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const activeFilterCount = (statusFilter === 'all' ? 0 : 1) + (roleFilter === 'all' ? 0 : 1);

  const questionnaire = getBundledQuestionnaires().user;

  // Name search is client-side (below) so typing never refires the query — keeps the table from flickering.
  const search = useSearch('Practitioner', { _count: '500' });
  const roleSearch = useSearch('PractitionerRole', { _count: '500' });
  const orgSearch = useSearch('Organization', { _count: '500' });

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

  const orgIdByPractitioner = useMemo(
    () =>
      buildPractitionerOrgMap(
        roleSearch.data as { entry?: { resource?: Record<string, unknown> }[] },
      ),
    [roleSearch.data],
  );

  const orgNameById = useMemo(
    () => buildOrgNameMap(orgSearch.data as { entry?: { resource?: { id?: string; name?: string } }[] }),
    [orgSearch.data],
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
    const term = q.trim().toLowerCase();
    return rawRows.filter((p) => {
      if (!p.id) return false;
      if (term) {
        const haystack = `${fullName(p)} ${identifierOf(p)} ${emailOf(p)}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (statusFilter === 'active' && p.active === false) return false;
      if (statusFilter === 'inactive' && p.active !== false) return false;
      if (roleFilter !== 'all') {
        const roles = roleMap.get(p.id);
        if (!roles?.has(roleFilter)) return false;
      }
      return true;
    });
  }, [rawRows, q, statusFilter, roleFilter, roleMap]);

  let searchError: string | null = null;
  if (search.error) {
    searchError = search.error instanceof Error ? search.error.message : String(search.error);
  }

  const openCreate = (): void => {
    setResetKey((k) => k + 1);
    setModalOpen(true);
  };

  const isFiltering = q.trim() !== '' || statusFilter !== 'all' || roleFilter !== 'all';
  // Only the genuine "no users at all" case hides the toolbar; a no-match search keeps it.
  const noUsers = !search.isLoading && !searchError && rawRows.length === 0 && !isFiltering;

  return (
    <Page>
      <PageHeader
        title={t('pageUsers')}
        description={t('pageUsersDescription')}
        actions={
          <>
            {rawRows.length > 0 ? (
              <Button
                variant="secondary"
                type="button"
                iconRight={<RiArrowDownSLine size={20} />}
                onClick={() => status.notify({ tone: 'info', title: t('exportComingSoon') })}
              >
                {t('exportLabel')}
              </Button>
            ) : null}
            <PermissionGuard permission="users.create">
              <Button type="button" iconLeft={<RiAddLine size={20} />} onClick={openCreate}>
                {t('addUser')}
              </Button>
            </PermissionGuard>
          </>
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
            status.notify({ tone: 'success', title: t('userCreated') });
            void search.refetch();
            void roleSearch.refetch();
          }}
        />
      </OhsDialog>

      {noUsers ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState
            illustration={
              <span className="ohs-users-empty-art">
                <RiUserFill size={56} />
                <span className="ohs-users-empty-art__badge">
                  <RiAddLine size={18} />
                </span>
              </span>
            }
            title={t('usersEmptyTitle')}
            description={t('usersEmptyDescription')}
            action={
              <PermissionGuard permission="users.create">
                <Button type="button" iconLeft={<RiAddLine size={20} />} onClick={openCreate}>
                  {t('addUser')}
                </Button>
              </PermissionGuard>
            }
          />
        </div>
      ) : (
      <DataTable<PractitionerRow>
        toolbar={
          <Stack gap={3}>
            <Inline justify="between" style={{ flexWrap: 'wrap', gap: 'var(--ohs-spacing-3, 12px)', alignItems: 'center' }}>
              <SearchField
                label={t('search')}
                name="userSearch"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('searchByNameOrId')}
              />
              <Button
                variant="secondary"
                type="button"
                iconLeft={<RiFilter3Line size={20} />}
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((v) => !v)}
              >
                {activeFilterCount > 0 ? `${t('filterLabel')} (${activeFilterCount})` : t('filterLabel')}
              </Button>
            </Inline>
            {filtersOpen ? (
              <Inline
                justify="start"
                style={{
                  flexWrap: 'wrap',
                  gap: 'var(--ohs-spacing-4, 16px)',
                  alignItems: 'center',
                  paddingTop: 'var(--ohs-spacing-3, 12px)',
                  borderTop: '1px solid var(--ohs-color-border, #ededed)',
                }}
              >
                <ChipSet>
                  <FilterChip label={t('filterStatusAll')} selected={statusFilter === 'all'} onChange={() => setStatusFilter('all')} />
                  <FilterChip label={t('filterStatusActive')} selected={statusFilter === 'active'} onChange={() => setStatusFilter('active')} />
                  <FilterChip label={t('filterStatusInactive')} selected={statusFilter === 'inactive'} onChange={() => setStatusFilter('inactive')} />
                </ChipSet>
                <div style={{ flex: '0 1 240px', minWidth: 200 }}>
                  <SelectField
                    label={t('filterRole')}
                    name="roleFilter"
                    options={roleOptions}
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  />
                </div>
              </Inline>
            ) : null}
          </Stack>
        }
        columns={[
          {
            key: 'identifier',
            header: t('columnIdentifier'),
            render: (p) => identifierOf(p),
          },
          {
            key: 'name',
            header: t('columnName'),
            sortable: true,
            sortValue: (p) => fullName(p).toLowerCase(),
            render: (p) => {
              const name = fullName(p) || (p.id ?? '');
              const email = emailOf(p);
              return (
                <Inline justify="start" style={{ gap: 'var(--ohs-spacing-3, 12px)', alignItems: 'center' }}>
                  <Avatar name={name} />
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Link to={`/users/${p.id}/edit`} style={{ fontSize: 16, fontWeight: 500 }}>
                      {name}
                    </Link>
                    {email ? (
                      <span style={{ fontSize: 'var(--ohs-font-text-s-size, 12px)', color: 'var(--ohs-color-text-muted, #696969)' }}>
                        {email}
                      </span>
                    ) : null}
                  </span>
                </Inline>
              );
            },
          },
          {
            key: 'role',
            header: t('columnRole'),
            render: (p) => {
              const codes = p.id
                ? [...(roleMap.get(p.id) ?? [])].sort((a, b) => a.localeCompare(b)).join(', ')
                : '';
              return codes || '—';
            },
          },
          {
            key: 'organisation',
            header: t('columnOrganisation'),
            render: (p) => {
              const orgId = p.id ? orgIdByPractitioner.get(p.id) : undefined;
              return (orgId ? orgNameById.get(orgId) : undefined) ?? '—';
            },
          },
          {
            key: 'status',
            header: t('columnStatus'),
            sortable: true,
            sortValue: (p) => (p.active === false ? 0 : 1),
            render: (p) =>
              p.active === false ? (
                <StatusBadge tone="neutral" icon={<span className="ohs-badge__dot" />}>{t('statusInactive')}</StatusBadge>
              ) : (
                <StatusBadge tone="success" icon={<span className="ohs-badge__dot" />}>{t('statusActive')}</StatusBadge>
              ),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (p) => (
              <OhsDropdownMenu.Root>
                <OhsDropdownMenu.Trigger asChild>
                  <IconButton label={t('rowActions')}>
                    <RiMore2Fill size={20} />
                  </IconButton>
                </OhsDropdownMenu.Trigger>
                <OhsDropdownMenu.Portal>
                  <OhsDropdownMenu.Content className="ohs-dropdown-content" align="end" sideOffset={4}>
                    <OhsDropdownMenu.Item
                      className="ohs-dropdown-item"
                      onSelect={() => {
                        void navigate(`/users/${p.id}/edit`);
                      }}
                    >
                      {t('edit')}
                    </OhsDropdownMenu.Item>
                  </OhsDropdownMenu.Content>
                </OhsDropdownMenu.Portal>
              </OhsDropdownMenu.Root>
            ),
          },
        ]}
        rows={filteredRows}
        rowKey={(p) => p.id ?? ''}
        loading={search.isLoading}
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
        pagination
        initialPageSize={10}
        errorState={searchError ? <ErrorState description={searchError} /> : undefined}
        emptyState={
          <EmptyState
            title={t('emptyTitle')}
            description={isFiltering ? t('filterEmpty') : t('emptyDescription')}
          />
        }
      />
      )}
    </Page>
  );
}

export function UserEditForm({
  id,
  practitioner,
}: Readonly<{ id: string; practitioner: Record<string, unknown> }>) {
  const { t } = useTranslation();
  const client = useFhirClient();
  const navigate = useNavigate();
  const questionnaire = getBundledQuestionnaires().userEdit;

  const initialAnswers = useMemo(
    () => userAnswersFromPractitioner(practitioner),
    [practitioner],
  );
  const { answers, setAnswer, validateRequired } = useQuestionnaireFormState(
    questionnaire,
    initialAnswers,
  );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const goToList = () => {
    Promise.resolve(navigate('/users')).catch(() => undefined);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSubmitError(null);
    if (validateRequired().length > 0) {
      setValidationError(t('questionnaireRequiredFields'));
      return;
    }
    void (async () => {
      setSubmitting(true);
      try {
        const updated = applyUserAnswersToPractitioner(practitioner, answers);
        await client.transaction({
          resourceType: 'Bundle',
          type: 'transaction',
          entry: [{ resource: updated, request: { method: 'PUT', url: `Practitioner/${id}` } }],
        });
        await writeAuditEvent(client, {
          action: 'update',
          resourceType: 'Practitioner',
          resourceId: id,
        });
        goToList();
      } catch (error_) {
        setSubmitError(toErrorMessage(error_));
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <form id="user-edit-form" onSubmit={onSubmit} noValidate>
      <Stack gap={3}>
        {validationError ? <ErrorState description={validationError} /> : null}
        {submitError ? <ErrorState description={submitError} /> : null}
        <QuestionnaireFields questionnaire={questionnaire} answers={answers} setAnswer={setAnswer} />
        <Inline justify="end" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button variant="outlined" type="button" onClick={goToList} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={submitting} loading={submitting}>
            {t('save')}
          </Button>
        </Inline>
      </Stack>
    </form>
  );
}

export function UserEditPage({ id }: Readonly<{ id: string }>) {
  const { t } = useTranslation();
  const read = useResource('Practitioner', id);
  const pract = read.data as Record<string, unknown> | undefined;
  const update = useUpdateResource('Practitioner');
  const client = useFhirClient();
  const { post: deactivateReq } = useCustomEndpoint('userDeactivate');

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
  if (read.error) {
    return (
      <Page>
        <PageHeader title={t('pageUserEdit')} />
        <ErrorState description={toErrorMessage(read.error)} />
        <p>
          <Link to="/users">{t('back')}</Link>
        </p>
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
          <UserEditForm id={id} practitioner={pract} />
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
