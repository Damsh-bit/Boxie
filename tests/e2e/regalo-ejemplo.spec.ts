import { expect, test } from '@playwright/test'

/**
 * La Boxie de ejemplo usa el mismo player que el regalo real: sirve de
 * prueba de humo de que una temática publicada se renderiza completa.
 */

for (const [slug, portada] of [
  ['pareja', 'Este regalo especial es para...'],
  ['amistad', 'FRIENDSHIP EDITION'],
  ['cumpleanos', 'CUMPLE!'],
] as const) {
  test(`la Boxie de ejemplo de ${slug} se recorre con los botones`, async ({ page }) => {
    await page.goto(`/ejemplo/${slug}`)
    const activa = page.locator('.bx-slide.is-active')
    await expect(activa.locator('.bx-intro-tagline')).toHaveText(
      'Una experiencia digital para vos.',
    )

    await page.getByRole('button', { name: 'Slide siguiente' }).click()
    await expect(activa).toContainText(portada)
    await expect(activa).toContainText('Sofía')

    // 20 segmentos de progreso: las 20 slides del prototipo.
    await expect(page.locator('.bx-progress-segment')).toHaveCount(20)
    await expect(page.getByRole('link', { name: 'Quiero la mía' })).toHaveAttribute(
      'href',
      `/checkout?tematica=${slug}`,
    )
  })
}
