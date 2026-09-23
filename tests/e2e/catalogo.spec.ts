import { expect, test } from '@playwright/test'

/**
 * Del catálogo al checkout: lo que hoy se puede recorrer sin pagar. El precio
 * y los cupones salen del servidor (en CI, de Supabase con el catálogo
 * inicial de la migración).
 */

const precio = (texto: string) => texto.replace(/\s/g, ' ')

test('la home muestra las tres temáticas del catálogo inicial', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('BOXIE')
  const tarjetas = page.locator('#emocionar a[href^="/tematicas/"]')
  await expect(tarjetas).toHaveCount(3)
  await expect(tarjetas.first()).toHaveAttribute('href', '/tematicas/pareja')
})

test('la ficha muestra el precio de la base y el link a la Boxie de ejemplo', async ({ page }) => {
  await page.goto('/tematicas/cumpleanos')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Boxie de Cumpleaños')
  await expect(page.locator('[aria-live="polite"]')).toHaveText(/15\.000/)
  await expect(page.getByRole('link', { name: /Ver cómo queda una Boxie/ })).toHaveAttribute(
    'href',
    '/ejemplo/cumpleanos',
  )
})

test('el checkout calcula el cupón en el servidor (LOQUIEROYA25 = 25%, no 50%)', async ({
  page,
}) => {
  await page.goto('/checkout?tematica=pareja&cupon=LOQUIEROYA25')
  const resumen = page.locator('aside dl')
  await expect(resumen).toContainText('25% OFF')
  expect(precio(await resumen.innerText())).toContain('11.250')
})

test('un cupón inexistente se rechaza con un mensaje claro', async ({ page }) => {
  await page.goto('/checkout?tematica=amistad')
  await page.getByLabel('Código de cupón').fill('NOEXISTE')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByRole('status')).toHaveText('Ese cupón no existe.')
  expect(precio(await page.locator('aside dl').innerText())).toContain('15.000')
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
