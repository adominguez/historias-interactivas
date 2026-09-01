import { test, expect } from '@playwright/test';

// Solo comprobamos que la página renderiza la cuadrícula con los cuentos
// reales. Deliberadamente NO pulsamos ningún "Regenerar imagen": dispara una
// llamada real a OpenAI/Cloudinary con coste real, igual que en
// admin-crear-historia.
test.describe('/admin/regenerar-imagen', () => {
  test('renderiza la cuadrícula de cuentos con miniatura, título y botón por cada uno', async ({ page }) => {
    await page.goto('/admin/regenerar-imagen');

    await expect(page.locator('main h1')).toHaveText('Regenerar imágenes');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

    await expect(page.getByPlaceholder('Filtrar por título...')).toBeVisible();

    const regenerateButtons = page.getByRole('button', { name: 'Regenerar imagen' });
    await expect(regenerateButtons.first()).toBeVisible();
    const buttonCount = await regenerateButtons.count();
    expect(buttonCount).toBeGreaterThan(1); // un botón por cada cuento real

    // Filtrar reduce la cuadrícula a los cuentos que coinciden.
    await page.getByPlaceholder('Filtrar por título...').fill('xyz-no-deberia-existir-ningun-cuento-con-esto');
    await expect(page.getByRole('button', { name: 'Regenerar imagen' })).toHaveCount(0);
  });
});
