import { test, expect } from '@playwright/test';

// Solo comprobamos que la página y el formulario se renderizan e hidratan
// bien. Deliberadamente NO enviamos el formulario aquí: hacerlo dispara una
// llamada real a OpenAI/Cloudinary con coste real cada vez que se ejecuten
// los tests, así que esa comprobación se hace a mano cuando hace falta, no
// en la suite automática.
test.describe('/admin/crear-historia', () => {
  test('renderiza el formulario con las categorías y edades reales', async ({ page }) => {
    await page.goto('/admin/crear-historia');

    // Astro inyecta su barra de desarrollo (con sus propios <h1> de
    // accesibilidad/rendimiento) solo en `astro dev`, así que acotamos al
    // contenido real de la página en vez de a cualquier <h1> del documento.
    await expect(page.locator('main h1')).toHaveText('Crear un nuevo cuento');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');

    const categorySelect = page.locator('select').first();
    const ageSelect = page.locator('select').nth(1);

    await expect(categorySelect.locator('option')).toHaveCount(17); // "Aleatoria" + 16 categorías
    await expect(ageSelect.locator('option')).toHaveCount(6); // "Aleatoria" + 5 edades

    await expect(categorySelect.locator('option[value="fantasy"]')).toHaveText(/Fantasía/i);
    await expect(ageSelect.locator('option[value="5-8"]')).toBeAttached();

    const submitButton = page.getByRole('button', { name: 'Crear cuento' });
    await expect(submitButton).toBeEnabled();
  });
});
