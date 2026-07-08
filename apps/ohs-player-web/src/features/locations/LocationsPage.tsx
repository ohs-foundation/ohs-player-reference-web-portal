import { useMemo, useState, type FormEvent, type ReactElement } from 'react';
import {
  QuestionnaireFields,
  useCreateResource,
  useQuestionnaireFormState,
  useResource,
  useSearch,
  useTranslation,
  useUpdateResource,
} from 'ohs-player-web-core';
import { Button, Card, ErrorState, Inline, Page, PageHeader, Spinner, Stack } from '../../components/ui';
import { Link, useNavigate } from 'react-router-dom';
import { getBundledQuestionnaires } from '../../questionnaires/registry';
import { useWriteAudit } from '../audit/useWriteAudit';
import {
  LOCATION_LINK_IDS,
  locationBodyFromAnswers,
  parentLocationIdFromAnswer,
} from '../sdc/resourceFromAnswers';

type Loc = {
  id?: string;
  name?: string;
  partOf?: { reference?: string };
  status?: string;
  mode?: string;
  address?: { text?: string };
};

/** Root-first chain from root down to `leafId`. */
function ancestorChain(locList: Loc[], leafId: string): Loc[] {
  const byId = new Map<string, Loc>();
  for (const l of locList) {
    if (l.id) byId.set(l.id, l);
  }
  const chain: Loc[] = [];
  let cur: Loc | undefined = byId.get(leafId);
  while (cur) {
    chain.unshift(cur);
    const pid = cur.partOf?.reference?.replace('Location/', '');
    cur = pid ? byId.get(pid) : undefined;
  }
  return chain;
}

function LocationBreadcrumbs({ locList, leafId }: { locList: Loc[]; leafId: string }): ReactElement {
  const { t } = useTranslation();
  const chain = useMemo(() => ancestorChain(locList, leafId), [locList, leafId]);

  return (
    <nav aria-label="Breadcrumb">
      <ol
        className="flex flex-row flex-wrap items-center"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: '0 0 1rem',
          gap: 'var(--ohs-spacing-2, 8px)',
        }}
      >
        <li>
          <Link to="/locations">{t('breadcrumbLocations')}</Link>
        </li>
        {chain.map((loc, i) => {
          const last = i === chain.length - 1;
          return (
            <li key={loc.id} className="flex flex-row flex-wrap items-center" style={{ gap: 8 }}>
              <span aria-hidden="true" style={{ opacity: 0.6 }}>
                /
              </span>
              {last ? (
                <span aria-current="page">{loc.name ?? loc.id}</span>
              ) : (
                <Link to={`/locations/${loc.id}`}>{loc.name ?? loc.id}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// The Locations landing page is the hierarchy browser (Tree + Columns); its full implementation lives in
// LocationsHierarchyPage. LocationEditPage (below) remains the /locations/:id SDC edit form.
export { LocationsHierarchyPage as LocationsPage } from './LocationsHierarchyPage';

export function LocationEditPage({ id }: { id: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const writeAudit = useWriteAudit();
  const all = useSearch('Location', { _count: '500' });
  const updateLoc = useUpdateResource('Location');
  const createQr = useCreateResource('QuestionnaireResponse');

  const [cycleError, setCycleError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const self = useResource('Location', id);
  const current = self.data as Loc | undefined;

  const questionnaire = getBundledQuestionnaires().location;

  const initialAnswers = useMemo((): Record<string, string> | undefined => {
    if (!current) return undefined;
    return {
      [LOCATION_LINK_IDS.name]: current.name ?? '',
      [LOCATION_LINK_IDS.status]: current.status ?? 'active',
      [LOCATION_LINK_IDS.mode]: current.mode ?? 'instance',
      [LOCATION_LINK_IDS.addressLine]: current.address?.text ?? '',
      [LOCATION_LINK_IDS.parent]: current.partOf?.reference ?? '__root__',
    };
  }, [current]);

  const {
    answers,
    setAnswer,
    validateRequired,
    buildQuestionnaireResponse: buildCapturedQuestionnaireResponse,
  } = useQuestionnaireFormState(questionnaire, initialAnswers);

  const locList = (
    all.data as { entry?: { resource?: Loc }[] } | undefined
  )?.entry
    ?.map((e) => e.resource)
    .filter(Boolean) as Loc[] | undefined;

  const wouldCycle = (targetParentId: string | undefined): boolean => {
    if (!targetParentId) return false;
    let cur: string | undefined = targetParentId;
    const seen = new Set<string>();
    while (cur) {
      if (cur === id) return true;
      if (seen.has(cur)) break;
      seen.add(cur);
      const node = locList?.find((x) => x.id === cur);
      cur = node?.partOf?.reference?.replace('Location/', '');
    }
    return false;
  };

  const parentOptions = useMemo(() => {
    const root = { value: '__root__', label: t('rootLocation') };
    const rest =
      (locList ?? [])
        .filter((l) => l.id && l.id !== id)
        .map((l) => ({ value: `Location/${l.id as string}`, label: l.name ?? l.id })) ?? [];
    return [root, ...rest];
  }, [locList, id, t]);

  const referenceOptionsByLinkId = useMemo(
    () => ({
      [LOCATION_LINK_IDS.parent]: parentOptions,
    }),
    [parentOptions],
  );

  if (self.isLoading) {
    return (
      <Page>
        <Inline justify="start" style={{ gap: 'var(--ohs-spacing-2, 8px)', padding: 'var(--ohs-spacing-4, 16px) 0' }}>
          <Spinner />
          <span style={{ color: 'var(--ohs-color-text-muted)' }}>{t('loading')}</span>
        </Inline>
      </Page>
    );
  }

  if (self.isError) {
    const msg =
      self.error instanceof Error ? self.error.message : self.error ? String(self.error) : t('pageUnauthorized');
    return (
      <Page>
        <ErrorState description={msg} />
        <p style={{ marginTop: '1rem' }}>
          <Link to="/locations">{t('breadcrumbLocations')}</Link>
        </p>
      </Page>
    );
  }

  if (!current) {
    return (
      <Page>
        <ErrorState description={t('emptyDescription')} />
        <p style={{ marginTop: '1rem' }}>
          <Link to="/locations">{t('breadcrumbLocations')}</Link>
        </p>
      </Page>
    );
  }

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    setCycleError(null);
    setValidationError(null);
    setSubmitError(null);

    const missing = validateRequired();
    if (missing.length > 0) {
      setValidationError(t('questionnaireRequiredFields'));
      return;
    }

    const parentId = parentLocationIdFromAnswer(answers[LOCATION_LINK_IDS.parent]);
    if (wouldCycle(parentId)) {
      setCycleError(t('circularReferenceBlocked'));
      return;
    }

    const partial = locationBodyFromAnswers(answers);
    const body: Record<string, unknown> = { ...partial };

    void (async () => {
      try {
        await updateLoc.mutateAsync({
          id,
          body: { ...(current ?? {}), ...body },
        });
        await writeAudit({
          action: 'update',
          resourceType: 'Location',
          resourceId: id,
        });

        const qr = buildCapturedQuestionnaireResponse();
        await createQr.mutateAsync(qr);
        await writeAudit({ action: 'create', resourceType: 'QuestionnaireResponse' });

        void navigate('/locations');
      } catch (x) {
        setSubmitError(x instanceof Error ? x.message : String(x));
      }
    })();
  };

  return (
    <Page>
      <LocationBreadcrumbs locList={locList ?? []} leafId={id} />
      <PageHeader title={t('pageLocationEdit')} />
      <Card>
        <form onSubmit={onSave}>
          <Stack gap={3}>
            {cycleError ? <ErrorState description={cycleError} /> : null}
            {validationError ? <ErrorState description={validationError} /> : null}
            {submitError ? <ErrorState description={submitError} /> : null}
            <QuestionnaireFields
              questionnaire={questionnaire}
              answers={answers}
              setAnswer={setAnswer}
              referenceOptionsByLinkId={referenceOptionsByLinkId}
            />
            <Inline justify="start">
              <Button type="submit" disabled={updateLoc.isPending || createQr.isPending}>
                {t('save')}
              </Button>
            </Inline>
          </Stack>
        </form>
        <p style={{ marginTop: 'var(--ohs-spacing-3, 12px)' }}>
          <Link to="/locations">{t('back')}</Link>
        </p>
      </Card>
    </Page>
  );
}
