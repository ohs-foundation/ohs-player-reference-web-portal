import { colourPinProblems, isThemeColourValue, THEME_COLOUR_PATTERN } from 'ohs-player-web-core';
import { NAV_IDS } from 'ohs-player-web-shell';
import { z } from 'zod';

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

const colorPins = z.record(z.string(), colourValue).superRefine(noPinLoops);

const navEntrySchema = z.strictObject({
  id: z.enum(NAV_IDS),
  to: portalPath,
  labelKey: z.string().min(1),
  order: z.number().int(),
  requires: z
    .strictObject({
      flag: z.string().min(1).optional(),
      permission: z.string().min(1).optional(),
    })
    .optional(),
});

const widgetIds = z
  .array(
    z.string().regex(/^[A-Za-z][\w-]*(\.[\w-]+)+$/, {
      error: 'must be a widget id such as kpi.users or schedules.active',
    }),
  )
  .optional();

const dashboardSchema = z.strictObject({
  layout: z.strictObject({ kpi: widgetIds, main: widgetIds, side: widgetIds }).optional(),
  available: z
    .array(
      z.string().regex(/^[A-Za-z][\w-]*(\.[\w-]+)*\.([\w-]+|\*)$/, {
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
  flags: z.record(z.string(), z.boolean()).optional(),
  navigation: z.array(navEntrySchema).optional(),
  permissionMap: z.record(z.string(), z.array(z.string())).optional(),
  locale: z.string().min(1).optional(),
  messages: z.record(z.string(), z.string()).optional(),
  customEndpoints: z.record(z.string(), z.string().startsWith('/')).optional(),
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
