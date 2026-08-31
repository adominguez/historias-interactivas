import { defineConfig } from '@playwright/test';

// Las páginas /admin y /api ahora piden autenticación HTTP Basic (ver
// src/middleware.ts); sin esto, cualquier test que las visite recibiría 401.
try {
  process.loadEnvFile();
} catch {
  // Sin .env (p. ej. en CI, donde las variables ya vienen del entorno).
}

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4321',
    trace: 'retain-on-failure',
    httpCredentials: {
      username: process.env.ADMIN_USERNAME ?? '',
      password: process.env.ADMIN_PASSWORD ?? '',
    },
  },
  // No arrancamos el servidor automáticamente: create-story hace llamadas
  // reales a OpenAI/Cloudinary, así que preferimos apuntar siempre a un
  // `pnpm dev` que ya esté corriendo a propósito, no a uno efímero de test.
});
