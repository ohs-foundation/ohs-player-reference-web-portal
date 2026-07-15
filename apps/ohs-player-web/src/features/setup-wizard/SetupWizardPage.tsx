import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCustomEndpoint,
  useFhirClient,
  useSearch,
  useStatusBar,
  useTranslation,
} from 'ohs-player-web-core';
import { Button, ErrorState, Page, PageHeader } from '../../components/ui';
import { useWriteAudit } from '../audit/useWriteAudit';
import { toErrorMessage } from '../sdc/toErrorMessage';
import { referenceOptions } from '../users/userFormOptions';
import { clearDraft, loadDraft, saveDraft } from './draftStore';
import { commitPhase1, commitPhase2 } from './commitSetupWizard';
import { maxReachableStep } from './maxReachableStep';
import { SetupWizardStepper } from './SetupWizardStepper';
import { LocationsStep } from './steps/LocationsStep';
import { CareTeamsStep } from './steps/CareTeamsStep';
import { OrganizationsStep } from './steps/OrganizationsStep';
import { ReviewStep } from './steps/ReviewStep';
import { UsersStep } from './steps/UsersStep';
import { EMPTY_DRAFT, SETUP_WIZARD_STEPS, type SetupWizardDraft } from './types';

function canAdvance(draft: SetupWizardDraft, step: number): boolean {
  if (step === 0) return draft.locations.length > 0;
  if (step === 1) return draft.organizations.length > 0;
  return true;
}

export function SetupWizardPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useFhirClient();
  const writeAudit = useWriteAudit();
  const statusBar = useStatusBar();
  const usersEndpoint = useCustomEndpoint('users');

  const [draft, setDraft] = useState<SetupWizardDraft>(() => loadDraft());
  const [stepError, setStepError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitStatus, setCommitStatus] = useState<string | null>(null);

  const locSearch = useSearch('Location', { _count: '500' });
  const orgSearch = useSearch('Organization', { _count: '200', active: 'true' });

  const serverLocationOptions = useMemo(() => referenceOptions(locSearch.data, 'Location'), [locSearch.data]);
  const serverOrgOptions = useMemo(() => referenceOptions(orgSearch.data, 'Organization'), [orgSearch.data]);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  const updateDraft = useCallback(
    (patch: Partial<SetupWizardDraft> | ((prev: SetupWizardDraft) => SetupWizardDraft)) => {
      setDraft((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }));
    },
    [],
  );

  const step = draft.currentStep;
  const isReview = step === SETUP_WIZARD_STEPS.length - 1;
  const maxReachable = maxReachableStep(draft, step);

  const goBack = (): void => {
    setStepError(null);
    if (step === 0) {
      void navigate('/');
      return;
    }
    updateDraft({ currentStep: step - 1 });
  };

  const goNext = (): void => {
    setStepError(null);
    if (!canAdvance(draft, step)) {
      setStepError(t('setupStepIncomplete'));
      return;
    }
    updateDraft({ currentStep: Math.min(step + 1, SETUP_WIZARD_STEPS.length - 1) });
  };

  const resetAll = (): void => {
    clearDraft();
    setDraft(EMPTY_DRAFT());
    setCommitError(null);
    setCommitStatus(null);
    setStepError(null);
  };

  const runCommit = async (retryLocalIds?: string[]): Promise<void> => {
    setCommitError(null);
    setCommitting(true);
    try {
      let next = draft;
      if (!next.phase1Complete) {
        setCommitStatus(t('setupCreatingStructure'));
        const phase1 = await commitPhase1(client, next);
        next = phase1.draft;
        setDraft(next);
        await writeAudit({
          action: 'create',
          resourceType: 'Bundle',
          description: 'Setup wizard phase 1 transaction',
        });
      }

      if (next.users.some((u) => (retryLocalIds ? retryLocalIds.includes(u.localId) : u.status !== 'success'))) {
        setCommitStatus(t('setupCreatingUsers', { done: '0', total: String(next.users.length) }));
      }

      next = await commitPhase2(
        client,
        { post: (body) => usersEndpoint.post.mutateAsync(body) as Promise<Record<string, unknown>> },
        next,
        {
          onlyLocalIds: retryLocalIds,
          onProgress: (done, total) => {
            setCommitStatus(t('setupCreatingUsers', { done: String(done), total: String(total) }));
          },
        },
      );
      setDraft(next);

      const failed = next.users.filter((u) => u.status === 'failed');
      const pending = next.users.filter((u) => u.status === 'pending');
      if (failed.length === 0 && pending.length === 0) {
        for (const u of next.users) {
          if (u.createdPractitionerId) {
            await writeAudit({
              action: 'create',
              resourceType: 'Practitioner',
              resourceId: u.createdPractitionerId,
              description: 'Setup wizard user create',
            });
          }
        }
        clearDraft();
        setCommitStatus(null);
        statusBar.notify({ tone: 'success', title: t('setupCommitSuccess') });
        void navigate('/users');
        return;
      }
      if (failed.length > 0) {
        statusBar.notify({
          tone: 'warning',
          title: t('setupPartialUserFailure', { count: failed.length }),
        });
      }
      setCommitStatus(null);
    } catch (err) {
      setCommitError(toErrorMessage(err));
      setCommitStatus(null);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Page>
      <div className="ohs-setup-wizard">
        <div className="ohs-setup-wizard__header">
          <PageHeader title={t('pageSetupWizard')} description={t('pageSetupWizardDescription')} />
          <p className="ohs-setup-wizard__autosave">{t('setupDraftAutosave')}</p>
        </div>

        <SetupWizardStepper
          currentStep={step}
          maxReachable={maxReachable}
          draft={draft}
          onSelect={(i) => {
            if (draft.phase1Complete && i < SETUP_WIZARD_STEPS.length - 1) return;
            updateDraft({ currentStep: i });
          }}
        />

        {stepError ? <ErrorState description={stepError} /> : null}

        <div className="ohs-setup-wizard__body">
          {step === 0 ? (
            <LocationsStep
              locations={draft.locations}
              onChange={(locations) => updateDraft({ locations })}
            />
          ) : null}
          {step === 1 ? (
            <OrganizationsStep
              organizations={draft.organizations}
              locations={draft.locations}
              serverLocationOptions={serverLocationOptions}
              serverOrgOptions={serverOrgOptions}
              onChange={(organizations) => updateDraft({ organizations })}
            />
          ) : null}
          {step === 2 ? (
            <CareTeamsStep
              careTeams={draft.careTeams}
              organizations={draft.organizations}
              onChange={(careTeams) => updateDraft({ careTeams })}
            />
          ) : null}
          {step === 3 ? (
            <UsersStep
              users={draft.users}
              organizations={draft.organizations}
              locations={draft.locations}
              careTeams={draft.careTeams}
              onChange={(users) => updateDraft({ users })}
            />
          ) : null}
          {step === 4 ? (
            <ReviewStep
              draft={draft}
              phase1Done={draft.phase1Complete}
              committing={committing}
              commitError={commitError}
              commitStatus={commitStatus}
              onJumpToStep={(i) => updateDraft({ currentStep: i })}
              onRemoveUser={(localId) =>
                updateDraft({ users: draft.users.filter((u) => u.localId !== localId) })
              }
              onRetryUser={(localId) => void runCommit([localId])}
            />
          ) : null}
        </div>

        <div className="ohs-setup-wizard__footer">
          <Button
            type="button"
            variant="ghost"
            onClick={resetAll}
            disabled={committing || draft.phase1Complete}
          >
            {t('setupResetDraft')}
          </Button>
          <div className="ohs-setup-wizard__footer-nav">
            <Button variant="outlined" type="button" onClick={goBack} disabled={committing}>
              {t('back')}
            </Button>
            {isReview ? (
              <Button
                type="button"
                onClick={() => void runCommit()}
                loading={committing}
                disabled={
                  committing ||
                  (draft.phase1Complete &&
                    draft.users.every((u) => u.status === 'success') &&
                    draft.users.length > 0) ||
                  (draft.locations.length === 0 &&
                    draft.organizations.length === 0 &&
                    draft.careTeams.length === 0 &&
                    draft.users.length === 0)
                }
              >
                {draft.phase1Complete ? t('setupRetryFailedUsers') : t('setupSubmit')}
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
                {t('next')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
