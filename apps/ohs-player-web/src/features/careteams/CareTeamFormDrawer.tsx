import { type FormEvent, useState } from 'react';
import { RiCloseLine, RiGroupLine, RiTeamLine } from '@remixicon/react';
import {
  FhirError,
  formatOperationOutcomeMessage,
  useCreateResource,
  useFhirClient,
  useTranslation,
  useUpdateResource,
  writeAuditEvent,
} from 'ohs-player-web-core';
import { Button, Drawer, ErrorState, IconButton, Stack } from '../../components/ui';
import { careTeamFromForm } from '../sdc/resourceFromAnswers';
import { MultiSelect, RadioRow, Section, StackedInput, StackedTextArea } from '../users/userFormControls';
import type { Option } from '../users/userFormOptions';
import type { CareTeamRow } from './CareTeamDetailsDrawer';

function toErrorMessage(error: unknown): string {
  if (error instanceof FhirError) return formatOperationOutcomeMessage(error.outcome);
  if (error instanceof Error) return error.message;
  return String(error);
}

function memberIdsOf(team: CareTeamRow | undefined): string[] {
  return (team?.participant ?? [])
    .map((p) => p.member?.reference?.replace(/^Practitioner\//, '') ?? '')
    .filter(Boolean);
}

/** Add or Edit a Care Team. Pass `team` to edit (prefills + PUTs); omit it to create (POSTs). */
export function CareTeamFormDrawer({
  team,
  practOptions,
  onClose,
  onSuccess,
}: Readonly<{
  team?: CareTeamRow;
  practOptions: Option[];
  onClose: () => void;
  onSuccess: () => void;
}>): React.ReactElement {
  const { t } = useTranslation();
  const client = useFhirClient();
  const create = useCreateResource('CareTeam');
  const update = useUpdateResource('CareTeam');
  const editing = Boolean(team?.id);

  const [name, setName] = useState(team?.name ?? '');
  const [description, setDescription] = useState(team?.note?.[0]?.text ?? '');
  const [statusActive, setStatusActive] = useState<'active' | 'inactive'>(
    (team?.status ?? 'active') === 'active' ? 'active' : 'inactive',
  );
  const [memberIds, setMemberIds] = useState<string[]>(memberIdsOf(team));
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = (): void => {
    setError(null);
    if (!name.trim()) {
      setNameError(t('careTeamNameRequired'));
      return;
    }
    const body = careTeamFromForm({ name, description, status: statusActive, memberIds }, team);
    void (async () => {
      setSubmitting(true);
      try {
        let resourceId = team?.id;
        if (editing && team?.id) {
          await update.mutateAsync({ id: team.id, body });
        } else {
          resourceId = ((await create.mutateAsync(body)) as { id?: string }).id;
        }
        await writeAuditEvent(client, {
          action: editing ? 'update' : 'create',
          resourceType: 'CareTeam',
          resourceId,
        });
        onSuccess();
      } catch (err) {
        setError(toErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const onFormSubmit = (e: FormEvent): void => {
    e.preventDefault();
    submit();
  };

  const header = (
    <div className="ohs-form-drawer__head">
      <div>
        <h2 className="ohs-form-drawer__title">{editing ? t('editCareTeam') : t('addCareTeam')}</h2>
        <p className="ohs-form-drawer__subtitle">
          {editing ? t('editCareTeamSubtitle') : t('addCareTeamSubtitle')}
        </p>
      </div>
      <IconButton label={t('close')} onClick={onClose}>
        <RiCloseLine size={24} />
      </IconButton>
    </div>
  );

  const footer = (
    <div className="ohs-user-drawer__foot">
      <Button variant="outlined" type="button" onClick={onClose} disabled={submitting} style={{ flex: 1 }}>
        {t('cancel')}
      </Button>
      <Button type="button" onClick={submit} loading={submitting} disabled={submitting} style={{ flex: 1 }}>
        {t('save')}
      </Button>
    </div>
  );

  return (
    <Drawer
      open
      onClose={onClose}
      title={editing ? t('editCareTeam') : t('addCareTeam')}
      header={header}
      footer={footer}
    >
      <form className="ohs-detail-body" onSubmit={onFormSubmit}>
        <button type="submit" aria-hidden="true" tabIndex={-1} style={{ display: 'none' }} />
        {error ? <ErrorState description={error} /> : null}

        <Section icon={RiTeamLine} title={t('sectionBasicInfo')}>
          <Stack gap={5}>
            <StackedInput
              full
              required
              label={t('careTeamName')}
              value={name}
              error={nameError}
              onChange={(v) => {
                setName(v);
                if (nameError) setNameError(undefined);
              }}
            />
            <StackedTextArea
              full
              label={t('careTeamDescription')}
              value={description}
              onChange={setDescription}
            />
            <RadioRow
              label={t('columnStatus')}
              name="careteam-status"
              value={statusActive}
              onChange={(v) => setStatusActive(v === 'inactive' ? 'inactive' : 'active')}
              options={[
                { value: 'inactive', label: t('statusInactive') },
                { value: 'active', label: t('statusActive') },
              ]}
            />
          </Stack>
        </Section>

        <Section icon={RiGroupLine} title={t('sectionMembers')}>
          <MultiSelect
            label={t('usersLabel')}
            options={practOptions}
            value={memberIds}
            onChange={setMemberIds}
            placeholder={practOptions.length > 0 ? t('selectPlaceholder') : t('detailNone')}
          />
        </Section>
      </form>
    </Drawer>
  );
}
