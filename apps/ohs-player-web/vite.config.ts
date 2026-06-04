import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const coreRoot = path.resolve(appDir, '../../packages/ohs-player-web-core');

export default defineConfig({
  // Load `.env` from the monorepo root (where QUICKSTART/`.env.example` live), not the app dir.
  envDir: path.resolve(appDir, '../..'),
  plugins: [react()],
  resolve: {
    alias: [
      // Workspace lib is consumed from source so dev/build work without a prebuilt `dist/` (see package `exports` pointing at dist).
      {
        find: 'ohs-player-web-core/styles.css',
        replacement: path.join(coreRoot, 'src/styles.css'),
      },
      {
        find: 'ohs-player-web-core',
        replacement: path.join(coreRoot, 'src/index.ts'),
      },
    ],
  },
  server: {
    host: true,
    port: 5173,
    // Fail instead of drifting to 5174+ — the OIDC redirect URIs are pinned to :5173.
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    passWithNoTests: true,
  },
});
