import { z } from 'zod';
import { colourPinProblems, isThemeColourValue, THEME_COLOUR_PATTERN } from 'ohs-player-web-core';
import { BUILTIN_WIDGET_IDS, NAV_IDS } from 'ohs-player-web-shell';

export const FLAG_NAMES = [
  'userMgmt',
  'locationMgmt',
  'careTeams',
  'dashboard',
  'orgMgmt',
  'setupWizard',
  'fhirViewer',
  'auditLog',
  'configEditor',
  'configAssist',
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

const COLOUR_ERROR = 'must be a CSS colour such as #094F9A, rgb(9 79 154) or a named colour';

const colourValue = z
  .string()
  .regex(THEME_COLOUR_PATTERN, { error: COLOUR_ERROR, abort: true })
  .refine(isThemeColourValue, { error: COLOUR_ERROR });

function noPinLoops(pins: Partial<Record<string, string>>, context: z.RefinementCtx): void {
  for (const { role, message } of colourPinProblems(pins)) {
    context.addIssue({ code: 'custom', path: [role], message });
  }
}

const portalPath = z.string().regex(/^\/(?!\/)[^\s\\]*$/, {
  error: 'must be a path inside the portal, such as /users',
});

const colorPins = z.partialRecord(z.enum(SYS_COLOR_ROLES), colourValue).superRefine(noPinLoops);

const navEntrySchema = z.strictObject({
  id: z.enum(NAV_IDS),
  to: portalPath,
  labelKey: z.string().min(1),
  order: z.number().int(),
  requires: z
    .strictObject({
      flag: z.enum(FLAG_NAMES).optional(),
      permission: z.string().min(1).optional(),
    })
    .optional(),
});

const WIDGET_ID = /^[A-Za-z][\w-]*(\.[\w-]+)+$/;
const AVAILABLE_ENTRY = /^[A-Za-z][\w-]*(\.[\w-]+)*\.([\w-]+|\*)$/;

const widgetId = z
  .string()
  .regex(WIDGET_ID, { error: 'must be a widget id such as kpi.users or schedules.active' })
  .meta({ examples: [...BUILTIN_WIDGET_IDS] });

const widgetIds = z.array(widgetId).optional();

const dashboardSchema = z.strictObject({
  layout: z.strictObject({ kpi: widgetIds, main: widgetIds, side: widgetIds }).optional(),
  available: z
    .array(
      z.string().regex(AVAILABLE_ENTRY, {
        error: 'must be a widget id such as kpi.users, or a pattern such as chart.*',
      }),
    )
    .optional(),
  userCustomization: z.boolean().optional(),
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
  dashboard: dashboardSchema.optional(),
});

export type PortalConfig = z.infer<typeof portalConfigSchema>;

export type PortalConfigValidation =
  | { success: true; data: PortalConfig }
  | { success: false; error: string };

export function validatePortalConfig(input: unknown): PortalConfigValidation {
  const result = portalConfigSchema.safeParse(input);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: z.prettifyError(result.error) };
}

export interface PortalConfigIssue {
  path: string;
  message: string;
}

export function portalConfigIssues(input: unknown): PortalConfigIssue[] {
  const result = portalConfigSchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => ({
        path: z.core.toDotPath(issue.path),
        message: issue.message,
      }));
}

export function portalConfigJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(portalConfigSchema);
}
