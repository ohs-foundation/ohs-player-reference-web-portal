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
  useStatusBar,
  useTranslation,
  writeAuditEvent,
} from 'ohs-player-web-core';
import {
  Avatar,
  Button,
  Drawer,
  ErrorState,
  IconButton,
  Spinner,
  StatusBadge,
} from '../../components/ui';
import { buildDeactivateBundle, NATIONAL_ID_IDENTIFIER_SYSTEM } from '../sdc/resourceFromAnswers';
import { toErrorMessage } from '../sdc/toErrorMessage';
import { usePractitionerDetails } from './usePractitionerDetails';

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
  const { practitioner, roleDetails, roles, careTeams, isLoading, error } =
    usePractitionerDetails(id);

  const details = useMemo(() => {
    const name = practitioner?.name?.[0];
    const given = name?.given?.join(' ') ?? '';
    const family = name?.family ?? '';
    const telecom = practitioner?.telecom ?? [];
    const primaryRole = roleDetails[0];
    const roleCode = primaryRole?.practitionerRole?.code?.[0]?.coding?.[0];
    return {
      given,
      family,
      fullName: `${given} ${family}`.trim() || id,
      email: telecom.find((tc) => tc.system === 'email')?.value ?? '',
      phone: telecom.find((tc) => tc.system === 'phone')?.value ?? '',
      gender: practitioner?.gender ?? '',
      identifier: id,
      dob: practitioner?.birthDate ?? '',
      nationalId:
        practitioner?.identifier?.find((i) => i.system === NATIONAL_ID_IDENTIFIER_SYSTEM)?.value ??
        '',
      active: practitioner?.active !== false,
      role: roleCode?.display ?? roleCode?.code ?? '',
      orgName: primaryRole?.organization?.name ?? '',
      locations: primaryRole?.locations ?? [],
    };
  }, [practitioner, roleDetails, id]);

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
    if (!practitioner) return;
    void (async () => {
      setDeactivating(true);
      try {
        const { bundle, endedRoleCount, removedCareTeamCount } = buildDeactivateBundle(
          practitioner as unknown as Record<string, unknown>,
          roles as unknown as Record<string, unknown>[],
          careTeams as unknown as Record<string, unknown>[],
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
      {practitioner && details.active ? (
        <PermissionGuard permission="users.deactivate">
          <Button
            variant="outlined"
            className="ohs-btn-danger"
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={deactivating || isLoading}
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
    <Drawer open onClose={onClose} title={details.fullName} header={header} footer={footer}>
      {isLoading ? (
        <div style={{ padding: 'var(--ohs-spacing-6, 32px)' }}>
          <Spinner label={t('loading')} />
        </div>
      ) : error ? (
        <div style={{ padding: 'var(--ohs-spacing-6, 32px)' }}>
          <ErrorState description={toErrorMessage(error)} />
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
            {details.locations.length > 0 ? (
              <div className="ohs-detail-list">
                {details.locations.map((loc) => (
                  <div className="ohs-detail-rel" key={loc.id}>
                    <RiMapPinLine size={20} className="ohs-detail-rel__icon" />
                    <span className="ohs-detail-rel__title">{loc.name ?? loc.id}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ohs-detail-empty">{t('detailNone')}</p>
            )}
          </Section>

          <Section icon={RiTeamLine} title={t('sectionCareTeams')}>
            {careTeams.length > 0 ? (
              <div className="ohs-detail-list">
                {careTeams.map((ct) => (
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
