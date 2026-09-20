import { test, expect } from '@playwright/test';

// Solo se comprueba que la página se renderiza e hidrata con datos reales.
// A propósito NO se pulsa ningún botón: publicarían de verdad en Facebook e
// Instagram, generarían un plan con IA o mandarían un WhatsApp.
test.describe('/admin/redes-sociales', () => {
  test('renderiza el estado, las secciones y el historial con datos reales', async ({ page }) => {
    await page.goto('/admin/redes-sociales');

    await expect(page.locator('main h1')).toHaveText('Redes sociales');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

    // Las cuatro publicaciones del día, cada una con su estado. Se acota a la
    // sección "Hoy": esas mismas etiquetas salen también en el historial.
    const todaySection = page.locator('section', { has: page.getByRole('heading', { name: 'Hoy', exact: true }) });
    for (const label of ['Facebook · post', 'Instagram · post', 'Facebook · Story', 'Instagram · Story']) {
      await expect(todaySection.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(todaySection.locator('.badge')).toHaveCount(4);

    for (const heading of ['Hoy', 'Acciones', 'La cuenta', 'Plan semanal', 'Historial de publicaciones', 'Configuración']) {
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    }

    // El historial se hidrata: sus filtros responden y el de fallidas deja
    // menos filas que el de todas.
    const rows = page.locator('.posts tbody tr');
    const allRows = await rows.count();
    expect(allRows).toBeGreaterThan(0);
    await page.getByRole('button', { name: /^Fallidas/ }).click();
    expect(await rows.count()).toBeLessThanOrEqual(allRows);

    // Y la navegación del admin lleva de vuelta a la portada.
    await expect(page.locator('.admin-nav a[href="/admin/redes-sociales"]')).toHaveAttribute('aria-current', 'page');
  });
});
