import { writeFileSync } from 'node:fs';
import { portalConfigJsonSchema } from '../apps/ohs-player-web/src/config/portalConfigSchema.ts';

const OUTPUT = 'apps/ohs-player-web/public/portal-config.schema.json';

writeFileSync(OUTPUT, `${JSON.stringify(portalConfigJsonSchema(), null, 2)}\n`);
console.log(`Wrote ${OUTPUT}`);
