/**
 * Enforces a gzip size budget for ohs-player-web-core ESM entry (Phase 5 hardening).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const bundlePath = join(root, 'packages/ohs-player-web-core/dist/index.js');

/** ~64 KiB gzip headroom over current ~6 KiB build */
const MAX_GZIP_BYTES = 64 * 1024;

if (!existsSync(bundlePath)) {
  console.error(`Missing ${bundlePath}; run pnpm exec turbo run build --filter=ohs-player-web-core first.`);
  process.exit(1);
}

const raw = readFileSync(bundlePath);
const gz = gzipSync(raw).length;

if (gz > MAX_GZIP_BYTES) {
  console.error(
    `ohs-player-web-core dist/index.js gzip size ${gz} bytes exceeds budget ${MAX_GZIP_BYTES} bytes.`,
  );
  process.exit(1);
}

console.log(`ohs-player-web-core dist/index.js gzip: ${gz} bytes (budget ${MAX_GZIP_BYTES})`);
