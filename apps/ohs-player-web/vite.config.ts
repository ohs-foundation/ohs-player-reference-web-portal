import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const coreRoot = path.resolve(appDir, '../../packages/ohs-player-web-core');
const envDir = path.resolve(appDir, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '');
  // Dev proxy: keep the SPA same-origin so `/api/*` (which has no CORS) works and FHIR reads skip the
  // gateway access-checker. `/fhir` → HAPI directly; `/api` → the gateway plugin. Prod serves both same-origin.
  const fhirTarget = env.VITE_DEV_FHIR_TARGET || 'http://localhost:8080';
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:8180';
  return {
  // Load `.env` from the monorepo root (where QUICKSTART/`.env.example` live), not the app dir.
  envDir,
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
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/fhir': { target: fhirTarget, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    passWithNoTests: true,
  },
  };
});
