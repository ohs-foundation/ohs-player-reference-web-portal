import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const coreRoot = path.resolve(appDir, '../../packages/ohs-player-web-core');
const shellRoot = path.resolve(appDir, '../../packages/ohs-player-web-shell');
const envDir = path.resolve(appDir, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '');
  return {
    envDir,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        {
          find: 'ohs-player-web-core/styles.css',
          replacement: path.join(coreRoot, 'src/styles.css'),
        },
        { find: 'ohs-player-web-core', replacement: path.join(coreRoot, 'src/index.ts') },
        { find: /^ohs-player-web-shell$/, replacement: path.join(shellRoot, 'src/index.ts') },
      ],
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: env.VITE_DEV_API_TARGET || 'http://localhost:8180', changeOrigin: true },
        '/fhir': { target: env.VITE_DEV_FHIR_TARGET || 'http://localhost:8080', changeOrigin: true },
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
