import { test, expect } from '@playwright/test';

// El enlace "Editar este cuento" en la propia página del cuento solo debe
// verse si el visitante ya está logado como admin (ver isAuthorized en
// src/utils/auth.ts, usado también por LayoutStory.astro).
test.describe('Enlace de edición en la página del cuento', () => {
  test.use({ httpCredentials: undefined });

  test('no aparece para un visitante sin autenticar', async ({ page }) => {
    await page.goto('/lago-brillante');
    await expect(page.getByRole('link', { name: /Editar este cuento/ })).toHaveCount(0);
  });
});

test.describe('Enlace de edición en la página del cuento (logado)', () => {
  test('aparece y enlaza al editor con esta historia', async ({ page }) => {
    // Los navegadores reales cachean las credenciales HTTP Basic por origen
    // en cuanto se autentican una vez, y las reenvían solas a partir de ahí
    // aunque la página siguiente no las pida con un 401 (por eso funciona
    // el enlace en una página pública para alguien ya logado en /admin).
    // Playwright con httpCredentials solo las adjunta quien responde con un
    // 401 primero, así que hay que "activar" esa caché visitando antes una
    // página de admin.
    await page.goto('/admin');
    await page.goto('/lago-brillante');
    const editLink = page.getByRole('link', { name: /Editar este cuento/ });
    await expect(editLink).toBeVisible();
    await expect(editLink).toHaveAttribute('href', '/admin/editar-historia?storySlug=lago-brillante');
  });
});
