import {
  checkPortalConfigFile,
  portalConfigFile,
} from '../apps/ohs-player-web/portalConfigCheck.ts';

const problem = checkPortalConfigFile();
if (problem) {
  console.error(problem);
  process.exit(1);
}
console.log(`${portalConfigFile} is valid.`);
