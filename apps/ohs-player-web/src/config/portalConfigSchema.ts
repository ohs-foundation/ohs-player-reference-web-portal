import { z } from 'zod';
import { NAV_IDS } from './navigation';

export const FLAG_NAMES = [
  'userMgmt',
  'locationMgmt',
  'careTeams',
  'dashboard',
  'orgMgmt',
  'setupWizard',
  'fhirViewer',
] as const;

export const SYS_COLOR_ROLES = [
  'primary',
  'on-primary',
  'primary-container',
  'on-primary-container',
  'primary-hover',
  'secondary',
  'on-secondary',
  'secondary-container',
  'on-secondary-container',
  'tertiary',
  'on-tertiary',
  'error',
  'on-error',
  'error-container',
  'on-error-container',
  'surface',
  'on-surface',
  'on-surface-variant',
  'on-surface-secondary',
  'surface-container-lowest',
  'surface-container-low',
  'surface-container',
  'surface-container-high',
  'surface-container-highest',
  'surface-dim',
  'surface-bright',
  'outline',
  'outline-variant',
  'outline-secondary',
  'outline-tertiary',
  'inverse-surface',
  'inverse-on-surface',
  'inverse-primary',
  'scrim',
  'shadow',
  'success',
  'success-container',
  'on-success-container',
  'warning',
  'warning-container',
  'on-warning-container',
  'info',
  'info-container',
  'on-info-container',
  'focus-ring',
  'focus-ring-error',
] as const;

const colorPins = z.partialRecord(z.enum(SYS_COLOR_ROLES), z.string().min(1));

const navEntrySchema = z.strictObject({
  id: z.enum(NAV_IDS),
  to: z.string().startsWith('/'),
  labelKey: z.string().min(1),
  order: z.number().int(),
  requires: z
    .strictObject({
      flag: z.enum(FLAG_NAMES).optional(),
      permission: z.string().min(1).optional(),
    })
    .optional(),
});

export const portalConfigSchema = z.strictObject({
  $schema: z.string().optional(),
  product: z.strictObject({ name: z.string().min(1).optional() }).optional(),
  fhirBaseUrl: z.string().min(1).optional(),
  fhirVersion: z.enum(['R4', 'R5', 'STU3']).optional(),
  oidcIssuer: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  brand: z
    .strictObject({ overrides: colorPins.optional(), darkOverrides: colorPins.optional() })
    .optional(),
  flags: z.partialRecord(z.enum(FLAG_NAMES), z.boolean()).optional(),
  navigation: z.array(navEntrySchema).optional(),
  permissionMap: z.record(z.string(), z.array(z.string())).optional(),
  locale: z.string().min(1).optional(),
  messages: z.record(z.string(), z.string()).optional(),
  customEndpoints: z.record(z.string(), z.string().startsWith('/')).optional(),
  questionnaireVariant: z.string().min(1).optional(),
});

export type PortalConfig = z.infer<typeof portalConfigSchema>;
export type NavEntry = z.infer<typeof navEntrySchema>;

export type PortalConfigValidation =
  | { success: true; data: PortalConfig }
  | { success: false; error: string };

export function validatePortalConfig(input: unknown): PortalConfigValidation {
  const result = portalConfigSchema.safeParse(input);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: z.prettifyError(result.error) };
}

export function portalConfigJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(portalConfigSchema);
}
