import { NAV_IDS } from 'ohs-player-web-shell';
import { z } from 'zod';

const HEX_COLOUR = '#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})';
const COLOUR_KEYWORD = '[a-zA-Z]+';
const COLOUR_FUNCTION =
  '(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|var)\\(.*\\)';
const UNSAFE_IN_COLOUR = `[;{}<>\\\\"'\\t\\n\\r\\f\\v]|[uU][rR][lL]\\(`;
const COLOUR_VALUE = new RegExp(
  `^(?!.*(?:${UNSAFE_IN_COLOUR}))(?:${HEX_COLOUR}|${COLOUR_KEYWORD}|${COLOUR_FUNCTION})$`,
);

const colourValue = z.string().regex(COLOUR_VALUE, {
  error: 'must be a CSS colour such as #094F9A, rgb(9 79 154) or a named colour',
});

const portalPath = z.string().regex(/^\/(?!\/)[^\s\\]*$/, {
  error: 'must be a path inside the portal, such as /users',
});

const colorPins = z.record(z.string(), colourValue);

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
