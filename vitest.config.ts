import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // e2e/ son tests de Playwright (otro test runner, con su propio
    // `test`/`expect` y necesitan un servidor real corriendo) — no deben
    // ejecutarse con vitest.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
  resolve: {
    alias: {
      // `astro:env/server` es un módulo virtual que solo existe dentro del
      // build de Astro; sin este alias, cualquier test que importe un fichero
      // que lea variables de entorno tipadas (src/utils/auth.ts, src/turso.ts)
      // ni siquiera llega a ejecutarse. Ver src/test/astroEnvServer.stub.ts.
      'astro:env/server': path.resolve(__dirname, 'src/test/astroEnvServer.stub.ts'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@layouts': path.resolve(__dirname, 'src/layouts'),
      '@icons': path.resolve(__dirname, 'src/components/Icons'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@data': path.resolve(__dirname, 'src/data'),
      '@types': path.resolve(__dirname, 'src/types.ts'),
      '@src': path.resolve(__dirname, 'src'),
    },
  },
});
