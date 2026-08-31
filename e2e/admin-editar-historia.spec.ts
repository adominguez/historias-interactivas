import { test, expect } from '@playwright/test';

// Comprobamos que la página y el buscador renderizan, y que al elegir un
// cuento real se carga su contenido de verdad (endpoint de lectura, sin
// coste). Deliberadamente NO pulsamos "Guardar": persistiría un cambio real
// en producción en cada ejecución de la suite.
test.describe('/admin/editar-historia', () => {
  test('renderiza el buscador y carga el contenido real de un cuento al elegirlo', async ({ page }) => {
    await page.goto('/admin/editar-historia');

    await expect(page.locator('main h1')).toHaveText('Editar cuento');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

    const input = page.locator('input[list="edit-stories-datalist"]');
    await expect(input).toBeVisible();
    await expect(page.locator('datalist#edit-stories-datalist option').first()).toBeAttached();

    const firstOptionValue = await page.locator('datalist#edit-stories-datalist option').first().getAttribute('value');
    await input.fill(firstOptionValue!);

    await expect(page.getByText('Escena a editar')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeVisible();
  });
});
