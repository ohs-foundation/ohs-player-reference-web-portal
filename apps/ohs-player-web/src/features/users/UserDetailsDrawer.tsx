import { type ReactNode, useMemo, useState } from 'react';
import {
  RiArrowDownSLine,
  RiBriefcaseLine,
  RiBuildingLine,
  RiCloseLine,
  RiMapPinLine,
  RiTeamLine,
  RiUserLine,
  type RemixiconComponentType,
} from '@remixicon/react';
import {
  OhsDialog,
  PermissionGuard,
  useFhirClient,
  useResource,
  useSearch,
  useStatusBar,
  useTranslation,
  writeAuditEvent,
} from 'ohs-player-web-core';
import type { Bundle } from '@medplum/fhirtypes';
import { Avatar, Button, Drawer, IconButton, Spinner, StatusBadge } from '../../components/ui';
import { buildDeactivateBundle, NATIONAL_ID_IDENTIFIER_SYSTEM } from '../sdc/resourceFromAnswers';

function refName(reference: string | undefined, byId: Map<string, string>): string | undefined {
  if (!reference) return undefined;
  const id = reference.split('/').pop() ?? '';
  return byId.get(id);
}

function nameMap(bundle: Bundle | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const ent of bundle?.entry ?? []) {
    const r = ent.resource as { id?: string; name?: string } | undefined;
    if (r?.id) map.set(r.id, r.name ?? r.id);
  }
  return map;
}

function Field({ label, value }: Readonly<{ label: string; value?: string }>): React.ReactElement {
  return (
    <div className="ohs-detail-field">
      <span className="ohs-detail-field__label">{label}</span>
      <span className="ohs-detail-field__value">{value && value.trim() ? value : '—'}</span>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: Readonly<{ icon: RemixiconComponentType; title: string; children: ReactNode }>): React.ReactElement {
  return (
    <details className="ohs-detail-section" open>
      <summary className="ohs-detail-section__header">
        <span className="ohs-detail-section__title">
          <Icon size={20} />
          {title}
        </span>
        <RiArrowDownSLine size={20} className="ohs-detail-section__chevron" aria-hidden="true" />
      </summary>
      <div className="ohs-detail-section__body">{children}</div>
    </details>
  );
}

export function UserDetailsDrawer({
  id,
  onClose,
  onEdit,
  onDeleted,
}: Readonly<{ id: string; onClose: () => void; onEdit: () => void; onDeleted: () => void }>): React.ReactElement {
  const { t } = useTranslation();
  const client = useFhirClient();
  const status = useStatusBar();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const read = useResource('Practitioner', id);
  const roleSearch = useSearch('PractitionerRole', { practitioner: `Practitioner/${id}`, _count: '50' });
  const careTeamSearch = useSearch('CareTeam', { participant: `Practitioner/${id}`, _count: '100' });
  const orgSearch = useSearch('Organization', { _count: '500' });
  const locSearch = useSearch('Location', { _count: '500' });

  const pract = read.data as Record<string, unknown> | undefined;
  const orgNames = useMemo(() => nameMap(orgSearch.data as Bundle | undefined), [orgSearch.data]);
  const locNames = useMemo(() => nameMap(locSearch.data as Bundle | undefined), [locSearch.data]);

  const details = useMemo(() => {
    const name = (pract?.name as { family?: string; given?: string[] }[] | undefined)?.[0];
    const given = name?.given?.join(' ') ?? '';
    const family = name?.family ?? '';
    const telecom = (pract?.telecom as { system?: string; value?: string }[] | undefined) ?? [];
    const role = (roleSearch.data as Bundle | undefined)?.entry?.[0]?.resource as
      | { code?: { coding?: { display?: string; code?: string }[] }[]; organization?: { reference?: string }; location?: { reference?: string }[] }
      | undefined;
    const roleCode = role?.code?.[0]?.coding?.[0];
    const careTeams = ((careTeamSearch.data as Bundle | undefined)?.entry ?? [])
      .map((e) => e.resource as { id?: string; name?: string; participant?: unknown[] } | undefined)
      .filter((r): r is { id?: string; name?: string; participant?: unknown[] } => Boolean(r?.id));
    return {
      given,
      family,
      fullName: `${given} ${family}`.trim() || id,
      email: telecom.find((tc) => tc.system === 'email')?.value ?? '',
      phone: telecom.find((tc) => tc.system === 'phone')?.value ?? '',
      gender: typeof pract?.gender === 'string' ? pract.gender : '',
      identifier: id,
      dob: typeof pract?.birthDate === 'string' ? pract.birthDate : '',
      nationalId:
        (pract?.identifier as { system?: string; value?: string }[] | undefined)?.find(
          (i) => i.system === NATIONAL_ID_IDENTIFIER_SYSTEM,
        )?.value ?? '',
      active: (pract?.active as boolean | undefined) !== false,
      role: roleCode?.display ?? roleCode?.code ?? '',
      orgName: refName(role?.organization?.reference, orgNames),
      locName: refName(role?.location?.[0]?.reference, locNames),
      careTeams,
    };
  }, [pract, roleSearch.data, careTeamSearch.data, orgNames, locNames, id]);

  const titleText = details.fullName;

  const header = (
    <div className="ohs-user-drawer__head">
      <div className="ohs-user-drawer__identity">
        <Avatar name={details.fullName} className="ohs-avatar--lg" />
        <div>
          <div className="ohs-user-drawer__name-row">
            <h2 className="ohs-user-drawer__name">{details.fullName}</h2>
            <StatusBadge tone={details.active ? 'success' : 'neutral'} icon={<span className="ohs-badge__dot" />}>
              {details.active ? t('statusActive') : t('statusInactive')}
            </StatusBadge>
          </div>
          {details.role ? <p className="ohs-user-drawer__subtitle">{details.role}</p> : null}
          <span className="ohs-user-drawer__id-chip">{details.identifier}</span>
        </div>
      </div>
      <IconButton label={t('close')} className="ohs-user-drawer__close" onClick={onClose}>
        <RiCloseLine size={24} />
      </IconButton>
    </div>
  );

  const onConfirmDeactivate = (): void => {
    if (!pract) return;
    const roles = ((roleSearch.data as Bundle | undefined)?.entry ?? [])
      .map((e) => e.resource as Record<string, unknown> | undefined)
      .filter((r): r is Record<string, unknown> => Boolean(r));
    const careTeams = ((careTeamSearch.data as Bundle | undefined)?.entry ?? [])
      .map((e) => e.resource as Record<string, unknown> | undefined)
      .filter((r): r is Record<string, unknown> => Boolean(r));
    void (async () => {
      setDeactivating(true);
      try {
        const { bundle, endedRoleCount, removedCareTeamCount } = buildDeactivateBundle(
          pract,
          roles,
          careTeams,
          new Date().toISOString(),
        );
        await client.transaction(bundle);
        await writeAuditEvent(client, {
          action: 'update',
          resourceType: 'Practitioner',
          resourceId: id,
          description: `Deactivated (active:false; ${endedRoleCount} role(s) end-dated; ${removedCareTeamCount} care-team membership(s) removed)`,
        });
        setConfirmOpen(false);
        onDeleted();
      } catch {
        status.notify({ tone: 'error', title: t('saveFailed') });
      } finally {
        setDeactivating(false);
      }
    })();
  };

  const footer = (
    <div className="ohs-user-drawer__foot">
      {details.active ? (
        <PermissionGuard permission="users.deactivate">
          <Button
            variant="outlined"
            className="ohs-btn-danger"
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={deactivating || read.isLoading || roleSearch.isLoading || careTeamSearch.isLoading}
          >
            {t('deactivateUser')}
          </Button>
        </PermissionGuard>
      ) : null}
      <Button type="button" onClick={onEdit} style={{ marginLeft: 'auto' }}>
        {t('editDetails')}
      </Button>
    </div>
  );

  return (
    <>
    <Drawer open onClose={onClose} title={titleText} header={header} footer={footer}>
      {read.isLoading ? (
        <div style={{ padding: 'var(--ohs-spacing-6, 32px)' }}>
          <Spinner label={t('loading')} />
        </div>
      ) : (
        <div className="ohs-detail-body">
          <Section icon={RiUserLine} title={t('sectionBasicInfo')}>
            <div className="ohs-detail-grid">
              <Field label={t('givenName')} value={details.given} />
              <Field label={t('familyName')} value={details.family} />
              <Field label={t('emailAddress')} value={details.email} />
              <Field label={t('phoneNumber')} value={details.phone} />
              <Field label={t('gender')} value={details.gender} />
              <Field label={t('dateOfBirth')} value={details.dob} />
              <Field label={t('nationalId')} value={details.nationalId} />
              <Field label={t('columnIdentifier')} value={details.identifier} />
            </div>
          </Section>

          <Section icon={RiBriefcaseLine} title={t('sectionRoleStatus')}>
            <div className="ohs-detail-grid">
              <Field label={t('columnRole')} value={details.role} />
              <Field label={t('columnStatus')} value={details.active ? t('statusActive') : t('statusInactive')} />
            </div>
          </Section>

          <Section icon={RiBuildingLine} title={t('sectionPrimaryOrg')}>
            {details.orgName ? (
              <div className="ohs-detail-rel">
                <RiBuildingLine size={20} className="ohs-detail-rel__icon" />
                <span className="ohs-detail-rel__title">{details.orgName}</span>
              </div>
            ) : (
              <p className="ohs-detail-empty">{t('detailNone')}</p>
            )}
          </Section>

          <Section icon={RiMapPinLine} title={t('sectionLocation')}>
            {details.locName ? (
              <div className="ohs-detail-rel">
                <RiMapPinLine size={20} className="ohs-detail-rel__icon" />
                <span className="ohs-detail-rel__title">{details.locName}</span>
              </div>
            ) : (
              <p className="ohs-detail-empty">{t('detailNone')}</p>
            )}
          </Section>

          <Section icon={RiTeamLine} title={t('sectionCareTeams')}>
            {details.careTeams.length > 0 ? (
              <div className="ohs-detail-list">
                {details.careTeams.map((ct) => (
                  <div className="ohs-detail-rel" key={ct.id}>
                    <RiTeamLine size={20} className="ohs-detail-rel__icon" />
                    <span>
                      <span className="ohs-detail-rel__title">{ct.name ?? ct.id}</span>
                      <span className="ohs-detail-rel__sub" style={{ display: 'block' }}>
                        {t('membersCount', { count: ct.participant?.length ?? 0 })}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ohs-detail-empty">{t('detailNone')}</p>
            )}
          </Section>
        </div>
      )}
    </Drawer>
    <OhsDialog
      open={confirmOpen}
      onClose={() => setConfirmOpen(false)}
      headline={t('confirmDeactivateTitle')}
      actions={
        <>
          <Button variant="outlined" type="button" onClick={() => setConfirmOpen(false)} disabled={deactivating}>
            {t('cancel')}
          </Button>
          <Button variant="danger" type="button" onClick={onConfirmDeactivate} loading={deactivating} disabled={deactivating}>
            {t('deactivate')}
          </Button>
        </>
      }
    >
      <p>{t('confirmDeactivateBody')}</p>
    </OhsDialog>
    </>
  );
}
