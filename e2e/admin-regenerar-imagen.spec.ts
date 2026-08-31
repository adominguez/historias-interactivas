import { test, expect } from '@playwright/test';

// Solo comprobamos que la página renderiza con la lista real de cuentos.
// Deliberadamente NO pulsamos "Regenerar imagen": dispara una llamada real
// a OpenAI/Cloudinary con coste real, igual que en admin-crear-historia.
test.describe('/admin/regenerar-imagen', () => {
  test('renderiza el buscador con cuentos reales y previsualiza la imagen actual', async ({ page }) => {
    await page.goto('/admin/regenerar-imagen');

    await expect(page.locator('main h1')).toHaveText('Regenerar imagen de un cuento');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

    const input = page.locator('input[list="stories-datalist"]');
    await expect(input).toBeVisible();
    await expect(page.locator('datalist#stories-datalist option').first()).toBeAttached();

    const submitButton = page.getByRole('button', { name: 'Regenerar imagen' });
    await expect(submitButton).toBeDisabled(); // sin cuento elegido todavía
  });
});
