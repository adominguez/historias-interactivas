import { test, expect } from '@playwright/test';

test.describe('/admin', () => {
  test('renderiza los enlaces a todas las herramientas de admin', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.locator('main h1')).toHaveText('Admin');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

    for (const href of ['/admin/crear-historia', '/admin/editar-historia', '/admin/reparar-cuentos', '/admin/regenerar-imagen']) {
      await expect(page.locator(`a[href="${href}"]`)).toBeVisible();
    }
  });
});
