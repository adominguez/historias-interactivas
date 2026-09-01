import { test, expect } from '@playwright/test';

// Comprobamos que la página renderiza la cuadrícula real, y que al pulsar
// "Editar" en un cuento se carga su contenido de verdad (endpoint de
// lectura, sin coste). Deliberadamente NO pulsamos "Guardar": persistiría un
// cambio real en producción en cada ejecución de la suite.
test.describe('/admin/editar-historia', () => {
  test('renderiza la cuadrícula y carga el contenido real al elegir un cuento', async ({ page }) => {
    await page.goto('/admin/editar-historia');

    await expect(page.locator('main h1')).toHaveText('Editar cuento');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

    await expect(page.getByPlaceholder('Filtrar por título...')).toBeVisible();

    const editButtons = page.getByRole('button', { name: 'Editar' });
    await expect(editButtons.first()).toBeVisible();
    expect(await editButtons.count()).toBeGreaterThan(1); // un botón por cada cuento real

    await editButtons.first().click();

    await expect(page.getByText('Escena a editar')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeVisible();
  });
});
