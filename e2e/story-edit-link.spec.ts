import { test, expect } from '@playwright/test';

// No fijamos un slug de historia a mano: los admins de esta suite regeneran
// contenido real y pueden cambiarle el slug a cualquier cuento (ver
// slug_redirects). Cogemos el primero que la portada enlace en cada momento.
const getFirstStorySlug = async (page: import('@playwright/test').Page) => {
  await page.goto('/');
  const href = await page.locator('a[href^="/"]:not([href^="/cuentos"]):not([href="/"]):not([href="/sobre-mi"])').first().getAttribute('href');
  return (href ?? '').replace(/^\//, '');
};

// El enlace "Editar este cuento" en la propia página del cuento solo debe
// verse si el visitante ya está logado como admin (ver isAuthorized en
// src/utils/auth.ts, usado también por LayoutStory.astro).
test.describe('Enlace de edición en la página del cuento', () => {
  test.use({ httpCredentials: undefined });

  test('no aparece para un visitante sin autenticar', async ({ page }) => {
    const slug = await getFirstStorySlug(page);
    await page.goto(`/${slug}`);
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
    const slug = await getFirstStorySlug(page);
    await page.goto(`/${slug}`);
    const editLink = page.getByRole('link', { name: /Editar este cuento/ });
    await expect(editLink).toBeVisible();
    await expect(editLink).toHaveAttribute('href', `/admin/editar-historia?storySlug=${slug}`);
  });
});
