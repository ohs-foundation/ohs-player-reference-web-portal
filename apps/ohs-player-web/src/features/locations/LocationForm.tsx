import { useState } from 'react';
import { useTranslation } from 'ohs-player-web-core';
import { Button, Combobox } from '../../components/ui';
import { RadioRow, StackedInput, StackedSelect } from '../users/userFormControls';
import { LOCATION_LINK_IDS, parentLocationIdFromAnswer } from '../sdc/resourceFromAnswers';
import type { DraftLocation } from '../setup-wizard/types';

const STATUS_OPTIONS = [
  { value: 'active', labelKey: 'locationStatusActive' },
  { value: 'suspended', labelKey: 'locationStatusSuspended' },
  { value: 'inactive', labelKey: 'locationStatusInactive' },
] as const;
const MODE_OPTIONS = [
  { value: 'instance', labelKey: 'locationsModeInstance' },
  { value: 'kind', labelKey: 'locationsModeKind' },
] as const;

export interface ParentOption {
  value: string;
  label: string;
}

export interface LocationFormFieldsProps {
  parentOptions: ParentOption[];
  initialAnswers?: Record<string, string>;
  selfId?: string;
  draftLocations?: DraftLocation[];
  onSubmit: (answers: Record<string, string>) => void;
  submitLabel: string;
  formId?: string;
  /** After a successful parent handler, clear the form (wizard add flow). */
  clearOnSubmit?: boolean;
  /** When set, shows a reset/cancel control at the top of the form (wizard edit). */
  onCancel?: () => void;
  /** Extra class on the form (e.g. bordered panel in the setup wizard). */
  formClassName?: string;
}

/** Shared location field set used by create drawer and setup wizard. */
export function LocationFormFields({
  parentOptions,
  initialAnswers,
  selfId,
  draftLocations = [],
  onSubmit,
  submitLabel,
  formId = 'location-form',
  clearOnSubmit = false,
  onCancel,
  formClassName,
}: Readonly<LocationFormFieldsProps>): React.ReactElement {
  const { t } = useTranslation();
  const emptyAnswers = (): Record<string, string> => ({
    [LOCATION_LINK_IDS.name]: '',
    [LOCATION_LINK_IDS.status]: 'active',
    [LOCATION_LINK_IDS.mode]: 'instance',
    [LOCATION_LINK_IDS.addressLine]: '',
    [LOCATION_LINK_IDS.parent]: '__root__',
  });
  const [answers, setAnswers] = useState<Record<string, string>>(() => ({
    ...emptyAnswers(),
    ...initialAnswers,
  }));
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const setAnswer = (linkId: string, value: string): void => {
    setAnswers((prev) => ({ ...prev, [linkId]: value }));
  };

  const wouldCycle = (targetParentId: string | undefined): boolean => {
    if (!targetParentId || !selfId) return false;
    let parentRef: string | undefined = targetParentId;
    const seen = new Set<string>();
    while (parentRef) {
      if (parentRef === selfId || parentRef === `Location/${selfId}`) return true;
      if (seen.has(parentRef)) break;
      seen.add(parentRef);
      const match = draftLocations.find(
        (l) => l.fullUrl === parentRef || l.fullUrl.endsWith(parentRef as string),
      );
      parentRef = match?.resource.partOf?.reference;
    }
    return false;
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    setNameError(null);
    setFormError(null);
    if (!answers[LOCATION_LINK_IDS.name]?.trim()) {
      setNameError(t('questionnaireRequiredFields'));
      return;
    }
    const parentId = parentLocationIdFromAnswer(answers[LOCATION_LINK_IDS.parent]);
    if (wouldCycle(parentId)) {
      setFormError(t('circularReferenceBlocked'));
      return;
    }
    onSubmit(answers);
    if (clearOnSubmit) {
      setAnswers(emptyAnswers());
      setNameError(null);
      setFormError(null);
    }
  };

  return (
    <form
      id={formId}
      className={['ohs-setup-form', formClassName].filter(Boolean).join(' ')}
      onSubmit={handleSubmit}
    >
      {onCancel ? (
        <div className="ohs-setup-form__toolbar">
          <Button type="button" variant="outlined" onClick={onCancel}>
            {t('cancel')}
          </Button>
        </div>
      ) : null}
      {formError ? <p role="alert">{formError}</p> : null}
      <div className="ohs-detail-grid">
        <StackedInput
          required
          label={t('locationName')}
          value={answers[LOCATION_LINK_IDS.name] ?? ''}
          error={nameError ?? undefined}
          onChange={(v) => {
            setAnswer(LOCATION_LINK_IDS.name, v);
            setNameError(null);
          }}
        />
        <RadioRow
          label={t('columnStatus')}
          name={`${formId}-status`}
          value={answers[LOCATION_LINK_IDS.status] ?? 'active'}
          onChange={(v) => setAnswer(LOCATION_LINK_IDS.status, v)}
          options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
        />
        <StackedInput
          label={t('locationsAddressLine')}
          value={answers[LOCATION_LINK_IDS.addressLine] ?? ''}
          onChange={(v) => setAnswer(LOCATION_LINK_IDS.addressLine, v)}
        />
        <StackedSelect
          label={t('locationsMode')}
          value={answers[LOCATION_LINK_IDS.mode] ?? 'instance'}
          onChange={(v) => setAnswer(LOCATION_LINK_IDS.mode, v)}
          options={MODE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
          placeholder={t('selectPlaceholder')}
        />
        <Combobox
          full
          label={t('locationsParentLocation')}
          value={answers[LOCATION_LINK_IDS.parent] ?? '__root__'}
          onChange={(v) => setAnswer(LOCATION_LINK_IDS.parent, v || '__root__')}
          options={parentOptions}
          placeholder={t('locationsParentSearch')}
        />
      </div>
      <div className="ohs-setup-form__actions">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
