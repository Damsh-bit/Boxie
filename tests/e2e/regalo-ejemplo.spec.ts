import { expect, test } from '@playwright/test'

/**
 * La Ribbly de ejemplo usa el mismo player que el regalo real: sirve de
 * prueba de humo de que una temática publicada se renderiza completa.
 */

for (const [slug, portada] of [
  ['pareja', 'Este regalo especial es para...'],
  ['amistad', 'FRIENDSHIP EDITION'],
  // Cumpleaños usa las pantallas nuevas de Ribbly (portada con la torta).
  ['cumpleanos', 'Hoy es un día especial para...'],
] as const) {
  test(`la Ribbly de ejemplo de ${slug} se recorre con los botones`, async ({ page }) => {
    await page.goto(`/ejemplo/${slug}`)
    const activa = page.locator('.bx-slide.is-active')
    await expect(activa).toContainText('Una experiencia digital para vos.')

    await page.getByRole('button', { name: 'Slide siguiente' }).click()
    await expect(activa).toContainText(portada)
    await expect(activa).toContainText('Sofía')

    // 20 segmentos de progreso: las 20 pantallas de cada temática.
    await expect(page.locator('.bx-progress-segment')).toHaveCount(20)
    await expect(page.getByRole('link', { name: 'Quiero la mía' })).toHaveAttribute(
      'href',
      `/checkout?tematica=${slug}`,
    )
  })
}
