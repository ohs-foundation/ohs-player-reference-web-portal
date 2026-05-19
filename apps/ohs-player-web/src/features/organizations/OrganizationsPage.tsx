import { useState, type FormEvent, type ReactElement } from 'react';
import type { Questionnaire } from 'ohs-player-web-core';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Inline,
  LinearProgress,
  OhsM3Dialog,
  Page,
  PageHeader,
  PermissionGuard,
  Stack,
  StatusBadge,
  useCreateResource,
  useFhirClient,
  useSearch,
  useTranslation,
  writeAuditEvent,
  QuestionnaireFields,
  useQuestionnaireFormState,
  buildQuestionnaireResponse,
} from 'ohs-player-web-core';
import { getBundledQuestionnaires } from '../../questionnaires/registry';
import { ORGANIZATION_LINK_IDS, organizationFromAnswers } from '../sdc/resourceFromAnswers';

type OrgRow = { id?: string; name?: string; active?: boolean; identifier?: { value?: string }[] };

function OrganizationCreateForm({
  questionnaire,
  onSuccess,
  onCancel,
}: Readonly<{
  questionnaire: Questionnaire;
  onSuccess: () => void;
  onCancel: () => void;
}>): ReactElement {
  const { t } = useTranslation();
  const { answers, setAnswer, validateRequired } = useQuestionnaireFormState(questionnaire, {
    [ORGANIZATION_LINK_IDS.active]: 'true',
    [ORGANIZATION_LINK_IDS.name]: '',
    [ORGANIZATION_LINK_IDS.identifierValue]: '',
  });

  const createOrg = useCreateResource('Organization');
  const createQr = useCreateResource('QuestionnaireResponse');
  const client = useFhirClient();
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
        const org = organizationFromAnswers(answers);
        await createOrg.mutateAsync(org);
        await writeAuditEvent(client, { action: 'create', resourceType: 'Organization' });
        const qr = buildQuestionnaireResponse({ questionnaire, answers, status: 'completed' });
        await createQr.mutateAsync(qr);
        onSuccess();
      } catch (error_) {
        setSubmitError(error_ instanceof Error ? error_.message : String(error_));
      }
    })();
  };

  const isPending = createOrg.isPending || createQr.isPending;

  return (
    <form id="org-create-form" onSubmit={onSubmit}>
      <Stack gap={3}>
        {validationError ? <ErrorState description={validationError} /> : null}
        {submitError ? <ErrorState description={submitError} /> : null}
        <QuestionnaireFields questionnaire={questionnaire} answers={answers} setAnswer={setAnswer} />
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

export function OrganizationsPage() {
  const { t } = useTranslation();
  const search = useSearch('Organization', { _count: '200' });
  const bundle = search.data as { entry?: { resource?: OrgRow }[] };
  const rows =
    bundle?.entry
      ?.map((e) => e.resource)
      .filter((o): o is OrgRow => o !== undefined && o !== null) ?? [];

  const questionnaire = getBundledQuestionnaires().organization;
  const [modalOpen, setModalOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  let err: string | null = null;
  if (search.error) {
    err = search.error instanceof Error ? search.error.message : String(search.error);
  }

  const openModal = () => {
    setResetKey((k) => k + 1);
    setModalOpen(true);
  };

  return (
    <Page>
      <PageHeader
        title={t('pageOrganizations')}
        description={t('pageOrganizationsDescription')}
        actions={
          <PermissionGuard permission="orgs.create">
            <Button type="button" onClick={openModal}>
              {t('createOrganization')}
            </Button>
          </PermissionGuard>
        }
      />

      <OhsM3Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        headline={t('dialogCreateOrganization')}
        minWidth="min(96vw, 520px)"
      >
        <OrganizationCreateForm
          key={resetKey}
          questionnaire={questionnaire}
          onCancel={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            globalThis.location.reload();
          }}
        />
      </OhsM3Dialog>

      {search.isLoading ? <LinearProgress style={{ marginBottom: 'var(--ohs-spacing-4, 16px)' }} /> : null}
      {!search.isLoading && err ? <ErrorState description={err} /> : null}
      {!search.isLoading && !err ? (
        <DataTable<OrgRow>
          caption={t('pageOrganizations')}
          columns={[
            {
              key: 'name',
              header: t('organizationName'),
              render: (o) => o.name ?? '—',
            },
            {
              key: 'identifier',
              header: 'Identifier',
              render: (o) => o.identifier?.[0]?.value ?? '—',
            },
            {
              key: 'active',
              header: t('columnActive'),
              render: (o) =>
                o.active === false ? (
                  <StatusBadge tone="neutral">{t('no')}</StatusBadge>
                ) : (
                  <StatusBadge tone="success">{t('yes')}</StatusBadge>
                ),
            },
          ]}
          rows={rows}
          rowKey={(o) => o.id ?? o.name ?? ''}
          emptyState={
            <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
          }
        />
      ) : null}
    </Page>
  );
}
