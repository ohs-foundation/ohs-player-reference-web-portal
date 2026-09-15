import { useTranslation } from 'ohs-player-web-core';
import { Button, Stack } from '../../../components/ui';
import { DraftList } from '../DraftList';
import { draftResourceName, type DraftUser, type SetupWizardDraft } from '../types';

export function ReviewStep({
  draft,
  onJumpToStep,
  onRemoveUser,
  onRetryUser,
  committing,
  commitError,
  commitStatus,
  phase1Done,
}: Readonly<{
  draft: SetupWizardDraft;
  onJumpToStep: (index: number) => void;
  onRemoveUser: (localId: string) => void;
  onRetryUser: (localId: string) => void;
  committing: boolean;
  commitError: string | null;
  commitStatus: string | null;
  phase1Done: boolean;
}>): React.ReactElement {
  const { t } = useTranslation();

  const failedUsers = draft.users.filter((u) => u.status === 'failed');
  const successUsers = draft.users.filter((u) => u.status === 'success');

  return (
    <Stack gap={6}>
      <p className="ohs-wizard-review__intro">{t('setupReviewIntro')}</p>

      <div className="ohs-setup-review-summary" aria-label={t('setupReviewSummary')}>
        <SummaryChip label={t('setupStepLocations')} count={draft.locations.length} />
        <SummaryChip label={t('setupStepOrganizations')} count={draft.organizations.length} />
        <SummaryChip label={t('setupStepCareTeams')} count={draft.careTeams.length} />
        <SummaryChip label={t('setupStepUsers')} count={draft.users.length} />
      </div>

      {commitStatus ? (
        <p className="ohs-setup-commit-status" role="status">
          {commitStatus}
        </p>
      ) : null}
      {commitError ? (
        <p role="alert" className="ohs-setup-commit-error">
          {commitError}
        </p>
      ) : null}

      <ReviewBlock
        title={t('setupStepLocations')}
        count={draft.locations.length}
        onEdit={!phase1Done ? () => onJumpToStep(0) : undefined}
      >
        <DraftList
          readOnly
          items={draft.locations.map((l) => ({
            id: l.fullUrl,
            title: l.resource.name,
            meta: l.resource.status,
          }))}
          emptyTitle={t('detailNone')}
        />
      </ReviewBlock>

      <ReviewBlock
        title={t('setupStepOrganizations')}
        count={draft.organizations.length}
        onEdit={!phase1Done ? () => onJumpToStep(1) : undefined}
      >
        <DraftList
          readOnly
          items={draft.organizations.map((o) => ({
            id: o.fullUrl,
            title: draftResourceName(o.resource),
            meta: t('setupOrgDraftMeta', { count: String(o.managedLocationRefs.length) }),
          }))}
          emptyTitle={t('detailNone')}
        />
      </ReviewBlock>

      <ReviewBlock
        title={t('setupStepCareTeams')}
        count={draft.careTeams.length}
        onEdit={!phase1Done ? () => onJumpToStep(2) : undefined}
      >
        <DraftList
          readOnly
          items={draft.careTeams.map((c) => ({
            id: c.fullUrl,
            title: draftResourceName(c.resource),
          }))}
          emptyTitle={t('detailNone')}
        />
      </ReviewBlock>

      <ReviewBlock
        title={t('setupStepUsers')}
        count={draft.users.length}
        onEdit={!phase1Done ? () => onJumpToStep(3) : undefined}
      >
        {draft.users.length === 0 ? (
          <DraftList readOnly items={[]} emptyTitle={t('detailNone')} />
        ) : (
          <ul className="ohs-setup-draft-list">
            {draft.users.map((u) => (
              <UserReviewRow
                key={u.localId}
                user={u}
                phase1Done={phase1Done}
                committing={committing}
                onRemove={() => onRemoveUser(u.localId)}
                onRetry={() => onRetryUser(u.localId)}
              />
            ))}
          </ul>
        )}
      </ReviewBlock>

      {phase1Done && failedUsers.length > 0 ? (
        <p role="status">{t('setupPartialUserFailure', { count: String(failedUsers.length) })}</p>
      ) : null}
      {phase1Done && successUsers.length > 0 && failedUsers.length === 0 && draft.users.length > 0 ? (
        <p role="status">{t('setupAllUsersCommitted')}</p>
      ) : null}
    </Stack>
  );
}

function SummaryChip({ label, count }: Readonly<{ label: string; count: number }>): React.ReactElement {
  return (
    <div className="ohs-setup-review-summary__chip">
      <span className="ohs-setup-review-summary__count">{count}</span>
      <span className="ohs-setup-review-summary__label">{label}</span>
    </div>
  );
}

function ReviewBlock({
  title,
  count,
  onEdit,
  children,
}: Readonly<{
  title: string;
  count: number;
  onEdit?: () => void;
  children: React.ReactNode;
}>): React.ReactElement {
  const { t } = useTranslation();
  return (
    <section className="ohs-setup-review-block">
      <div className="ohs-setup-review-block__head">
        <h3 className="ohs-setup-review-block__title">
          {title} <span className="ohs-setup-review-block__count">({count})</span>
        </h3>
        {onEdit ? (
          <Button type="button" variant="outlined" size="sm" onClick={onEdit}>
            {t('setupEditStep')}
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function UserReviewRow({
  user,
  phase1Done,
  committing,
  onRemove,
  onRetry,
}: Readonly<{
  user: DraftUser;
  phase1Done: boolean;
  committing: boolean;
  onRemove: () => void;
  onRetry: () => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const statusLabel =
    user.status === 'success'
      ? t('setupUserStatusSuccess')
      : user.status === 'failed'
        ? t('setupUserStatusFailed')
        : t('setupUserStatusPending');

  return (
    <li className="ohs-setup-draft-list__item">
      <div className="ohs-setup-draft-list__main">
        <span className="ohs-setup-draft-list__title">
          {user.fields.givenName} {user.fields.familyName}
        </span>
        <span className="ohs-setup-draft-list__meta">
          {user.fields.email} · {statusLabel}
          {user.error ? ` — ${user.error}` : ''}
        </span>
      </div>
      {!phase1Done ? (
        <Button type="button" variant="outlined" size="sm" onClick={onRemove}>
          {t('removeAssignment')}
        </Button>
      ) : null}
      {phase1Done && user.status === 'failed' ? (
        <Button type="button" size="sm" onClick={onRetry} disabled={committing} loading={committing}>
          {t('retry')}
        </Button>
      ) : null}
    </li>
  );
}
