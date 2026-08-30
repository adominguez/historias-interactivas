import { test, expect } from '@playwright/test';

// El diagnóstico en sí es de lectura y sin coste (regex/diccionario/grafo,
// sin llamar a la IA), así que sí lo dejamos correr de verdad aquí. Lo que
// NO hacemos es pulsar "Reparar" ni "Eliminar": eso sí dispara una llamada
// real a OpenAI o borra datos, y se comprueba a mano cuando haga falta.
test.describe('/admin/reparar-cuentos', () => {
  test('diagnostica los cuentos reales y renderiza el resultado sin reparar ni eliminar nada', async ({ page }) => {
    await page.goto('/admin/reparar-cuentos');

    await expect(page.locator('main h1')).toHaveText('Reparar cuentos');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

    await expect(page.getByText(/cuentos analizados/)).toBeVisible({ timeout: 30000 });
  });
});
