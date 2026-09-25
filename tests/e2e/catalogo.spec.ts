import { expect, test, type Page } from '@playwright/test'

/**
 * Del catálogo al checkout: lo que hoy se puede recorrer sin pagar. El precio
 * y los cupones salen del servidor (en CI, de Supabase con el catálogo
 * inicial de la migración; en modo demo, del precio de referencia). Por eso
 * las cuentas se hacen sobre el subtotal que muestra la página.
 */

/** "$ 4.990" → 4990 · "$ 3.742,50" → 3742.5 */
const pesos = (texto: string) => Number(texto.replace(/[^\d,]/g, '').replace(',', '.'))

/** Subtotal y total del resumen del checkout. */
async function resumen(page: Page) {
  const dl = page.locator('aside dl')
  const monto = async (fila: string) =>
    pesos(
      await dl
        .locator('div', { has: page.locator('dt', { hasText: new RegExp(`^${fila}$`) }) })
        .locator('dd')
        .innerText(),
    )
  return { subtotal: await monto('Subtotal'), total: await monto('Total') }
}

test('la home muestra las temáticas publicadas, empezando por el catálogo inicial', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('BOXIE')
  const tarjetas = page.locator('#emocionar a[href^="/tematicas/"]')
  await expect(tarjetas.first()).toHaveAttribute('href', '/tematicas/pareja')
  // Las tres iniciales siempre; el panel puede publicar más (la demo trae algunas).
  expect(await tarjetas.count()).toBeGreaterThanOrEqual(3)
})

test('la ficha muestra el precio de la base y el link a la Boxie de ejemplo', async ({ page }) => {
  await page.goto('/tematicas/cumpleanos')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Boxie de Cumpleaños')
  await expect(page.locator('[aria-live="polite"]')).toHaveText(/\$\s?\d{1,3}(\.\d{3})*/)
  await expect(page.getByRole('link', { name: /Ver cómo queda una Boxie/ })).toHaveAttribute(
    'href',
    '/ejemplo/cumpleanos',
  )
})

test('el checkout calcula el cupón en el servidor (LOQUIEROYA25 = 25%, no 50%)', async ({
  page,
}) => {
  await page.goto('/checkout?tematica=pareja&cupon=LOQUIEROYA25')
  await expect(page.locator('aside dl')).toContainText('25% OFF')
  const { subtotal, total } = await resumen(page)
  // El descuento se redondea a pesos enteros.
  expect(Math.abs(total - subtotal * 0.75)).toBeLessThanOrEqual(1)
})

test('un cupón inexistente se rechaza con un mensaje claro', async ({ page }) => {
  await page.goto('/checkout?tematica=amistad')
  await page.getByLabel('Código de cupón').fill('NOEXISTE')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByRole('status')).toHaveText('Ese cupón no existe.')
  const { subtotal, total } = await resumen(page)
  expect(total).toBe(subtotal)
})

test('el consentimiento legal apunta a páginas que existen (hallazgo F17)', async ({ page }) => {
  await page.goto('/checkout?tematica=pareja')
  for (const href of ['/legales/terminos', '/legales/privacidad']) {
    await expect(page.locator(`label a[href="${href}"]`)).toBeVisible()
    const response = await page.request.get(href)
    expect(response.status()).toBe(200)
  }
})

test('las rutas del prototipo redirigen', async ({ request }) => {
  const terminos = await request.get('/terminos', { maxRedirects: 0 })
  expect(terminos.status()).toBe(308)
  expect(terminos.headers().location).toContain('/legales/terminos')
  const producto = await request.get('/producto/pareja', { maxRedirects: 0 })
  expect(producto.headers().location).toContain('/tematicas/pareja')
})
