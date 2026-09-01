import { test, expect } from '@playwright/test';

// Solo comprobamos que la cuadrícula renderiza con cuentos reales.
// Deliberadamente NO pulsamos ningún "Regenerar cuento completo": dispara
// una llamada real a OpenAI con coste real, igual que en admin-crear-historia.
test.describe('/admin/regenerar-historia', () => {
  test('renderiza la cuadrícula de cuentos con un botón por cada uno', async ({ page }) => {
    await page.goto('/admin/regenerar-historia');

    await expect(page.locator('main h1')).toHaveText('Regenerar cuento completo');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

    const buttons = page.getByRole('button', { name: 'Regenerar cuento completo' });
    await expect(buttons.first()).toBeVisible();
    expect(await buttons.count()).toBeGreaterThan(1);
  });
});
