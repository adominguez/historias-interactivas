import { test, expect } from '@playwright/test';

// Solo comprobamos que la cuadrícula renderiza con cuentos reales.
// Deliberadamente NO pulsamos ningún "Eliminar este cuento": es irreversible.
test.describe('/admin/eliminar-historia', () => {
  test('renderiza la cuadrícula de cuentos con un botón por cada uno', async ({ page }) => {
    await page.goto('/admin/eliminar-historia');

    await expect(page.locator('main h1')).toHaveText('Eliminar cuento');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

    const buttons = page.getByRole('button', { name: 'Eliminar este cuento' });
    await expect(buttons.first()).toBeVisible();
    expect(await buttons.count()).toBeGreaterThan(1);
  });
});
