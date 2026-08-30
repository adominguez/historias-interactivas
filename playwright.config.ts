import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4321',
    trace: 'retain-on-failure',
  },
  // No arrancamos el servidor automáticamente: create-story hace llamadas
  // reales a OpenAI/Cloudinary, así que preferimos apuntar siempre a un
  // `pnpm dev` que ya esté corriendo a propósito, no a uno efímero de test.
});
