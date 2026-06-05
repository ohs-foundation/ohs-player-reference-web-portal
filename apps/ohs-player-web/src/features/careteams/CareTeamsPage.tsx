import { type FormEvent, useMemo, useState } from 'react';
import {
  buildQuestionnaireResponse,
  OhsDialog,
  PermissionGuard,
  QuestionnaireFields,
  useCreateResource,
  useFhirClient,
  useQuestionnaireFormState,
  useSearch,
  useTranslation,
  useUpdateResource,
  writeAuditEvent,
} from 'ohs-player-web-core';
import { Button, Card, EmptyState, ErrorState, Inline, LinearProgress, Page, PageHeader, SelectField, Stack, StatusBadge } from '../../components/ui';
import { getBundledQuestionnaires } from '../../questionnaires/registry';
import { CARETEAM_LINK_IDS, careTeamBodyFromAnswers } from '../sdc/resourceFromAnswers';

type CareTeamRow = {
  id?: string;
  name?: string;
  participant?: { member?: { reference?: string } }[];
  managingOrganization?: { reference?: string }[];
};

function CareTeamCreateForm({
  questionnaire,
  orgOptions,
  onSuccess,
  onCancel,
}: Readonly<{
  questionnaire: ReturnType<typeof getBundledQuestionnaires>['careteam'];
  orgOptions: { value: string; label: string | undefined }[];
  onSuccess: () => void;
  onCancel: () => void;
}>) {
  const { t } = useTranslation();
  const create = useCreateResource('CareTeam');
  const createQr = useCreateResource('QuestionnaireResponse');
  const client = useFhirClient();

  const { answers, setAnswer, validateRequired } = useQuestionnaireFormState(questionnaire, {
    [CARETEAM_LINK_IDS.name]: '',
    [CARETEAM_LINK_IDS.org]: '',
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
        const body = careTeamBodyFromAnswers(answers);
        await create.mutateAsync(body);
        const qr = buildQuestionnaireResponse({ questionnaire, answers, status: 'completed' });
        await createQr.mutateAsync(qr);
        await writeAuditEvent(client, { action: 'create', resourceType: 'CareTeam' });
        onSuccess();
      } catch (error_) {
        setSubmitError(error_ instanceof Error ? error_.message : String(error_));
      }
    })();
  };

  const isPending = create.isPending || createQr.isPending;

  return (
    <form id="careteam-create-form" onSubmit={onSubmit}>
      <Stack gap={3}>
        {validationError ? <ErrorState description={validationError} /> : null}
        {submitError ? <ErrorState description={submitError} /> : null}
        <QuestionnaireFields
          questionnaire={questionnaire}
          answers={answers}
          setAnswer={setAnswer}
          referenceOptionsByLinkId={{ [CARETEAM_LINK_IDS.org]: orgOptions }}
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

export function CareTeamsPage() {
  const { t } = useTranslation();
  const orgs = useSearch('Organization', { _count: '100' });
  const teams = useSearch('CareTeam', { _count: '200' });
  const pract = useSearch('Practitioner', { active: 'true', _count: '200' });
  const update = useUpdateResource('CareTeam');
  const client = useFhirClient();

  const questionnaire = getBundledQuestionnaires().careteam;

  const [modalOpen, setModalOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const orgList = useMemo(() => {
    const b = orgs.data as { entry?: { resource?: { id?: string; name?: string } }[] };
    return (
      b?.entry
        ?.map((e) => e.resource)
        .filter((r): r is { id?: string; name?: string } => r !== undefined && r !== null) ?? []
    );
  }, [orgs.data]);

  const orgNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of orgList) {
      if (o.id) m.set(o.id, o.name ?? o.id);
    }
    return m;
  }, [orgList]);

  const orgOptions = useMemo(
    () =>
      orgList
        .filter((o) => o.id)
        .map((o) => ({ value: o.id as string, label: o.name ?? o.id })),
    [orgList],
  );

  const teamList = useMemo(() => {
    const b = teams.data as { entry?: { resource?: CareTeamRow }[] };
    return (
      b?.entry
        ?.map((e) => e.resource)
        .filter((r): r is CareTeamRow => r !== undefined && r !== null) ?? []
    );
  }, [teams.data]);

  const practList = useMemo(() => {
    const b = pract.data as {
      entry?: { resource?: { id?: string; name?: { family?: string; given?: string[] }[] } }[];
    };
    return (
      b?.entry
        ?.map((e) => e.resource)
        .filter((r): r is { id?: string; name?: { family?: string; given?: string[] }[] } =>
          Boolean(r),
        ) ?? []
    );
  }, [pract.data]);

  const practOptions = useMemo(
    () =>
      practList.map((p) => {
        const fam = p.name?.[0]?.family ?? '';
        const given = p.name?.[0]?.given?.join(' ') ?? '';
        const label = `${given} ${fam}`.trim() || (p.id ?? '');
        return { value: p.id ?? '', label };
      }),
    [practList],
  );

  const addParticipant = (teamId: string, practId: string) => {
    const team = teamList.find((x) => x.id === teamId);
    if (!team?.id) return;
    const next = {
      ...team,
      participant: [
        ...(team.participant ?? []),
        {
          member: { reference: `Practitioner/${practId}` },
          role: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/care-team-roles',
                  code: 'clinical',
                  display: 'Clinical',
                },
              ],
            },
          ],
        },
      ],
    };
    void update.mutateAsync({ id: team.id, body: next }).then(async () => {
      await writeAuditEvent(client, {
        action: 'update',
        resourceType: 'CareTeam',
        resourceId: team.id,
        description: 'Participant added',
      });
      globalThis.location.reload();
    });
  };

  const teamsError = teams.error
    ? teams.error instanceof Error
      ? teams.error.message
      : String(teams.error)
    : null;

  return (
    <Page>
      <PageHeader
        title={t('pageCareTeams')}
        description={t('pageCareTeamsDescription')}
        actions={
          <PermissionGuard permission="careteams.manage">
            <Button
              type="button"
              onClick={() => {
                setResetKey((k) => k + 1);
                setModalOpen(true);
              }}
            >
              {t('createCareTeam')}
            </Button>
          </PermissionGuard>
        }
      />

      <OhsDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        headline={t('dialogCreateCareTeam')}
        minWidth="min(96vw, 520px)"
      >
        <CareTeamCreateForm
          key={resetKey}
          questionnaire={questionnaire}
          orgOptions={orgOptions}
          onCancel={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            globalThis.location.reload();
          }}
        />
      </OhsDialog>

      <Stack gap={4}>
        <section aria-labelledby="care-teams-list-heading">
          <h3
            id="care-teams-list-heading"
            className="ohs-page-header__title"
            style={{ fontSize: 'var(--ohs-text-title, 18px)', marginBottom: 'var(--ohs-spacing-3, 12px)' }}
          >
            {t('teamsHeading')}
          </h3>
          {teams.isLoading ? <LinearProgress style={{ marginBottom: 'var(--ohs-spacing-4, 16px)' }} /> : null}
          {teamsError ? <ErrorState description={teamsError} /> : null}
          {!teamsError && !teams.isLoading && teamList.length === 0 ? (
            <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
          ) : null}
          {!teamsError && !teams.isLoading && teamList.length > 0 ? (
            <Stack gap={3}>
              {teamList.map((tm) => {
                const orgRef = tm.managingOrganization?.[0]?.reference?.replace('Organization/', '');
                const orgLabel = orgRef ? orgNameById.get(orgRef) ?? orgRef : '—';
                const participantCount = tm.participant?.length ?? 0;
                return (
                  <Card key={tm.id}>
                    <Stack gap={3}>
                      <Inline justify="between">
                        <div>
                          <strong style={{ fontSize: 'var(--ohs-text-title, 18px)' }}>{tm.name}</strong>
                          <span style={{ color: 'var(--ohs-color-text-muted)', fontSize: 'var(--ohs-text-label, 14px)', marginLeft: '0.5rem' }}>
                            {tm.id}
                          </span>
                        </div>
                        <StatusBadge tone="info">{orgLabel}</StatusBadge>
                      </Inline>

                      <Inline justify="start" style={{ gap: 'var(--ohs-spacing-2, 8px)' }}>
                        <StatusBadge tone={participantCount > 0 ? 'success' : 'neutral'}>
                          {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
                        </StatusBadge>
                        {(tm.participant ?? [])
                          .map((p) => p.member?.reference?.replace('Practitioner/', ''))
                          .filter(Boolean)
                          .map((ref) => (
                            <StatusBadge key={ref} tone="neutral">
                              {ref}
                            </StatusBadge>
                          ))}
                      </Inline>

                      <PermissionGuard permission="careteams.manage">
                        <SelectField
                          label={t('addPractitioner')}
                          name={`add-${tm.id}`}
                          options={practOptions}
                          value=""
                          placeholder={t('selectPlaceholder')}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v && tm.id) addParticipant(tm.id, v);
                          }}
                        />
                      </PermissionGuard>
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          ) : null}
        </section>

      </Stack>
    </Page>
  );
}
