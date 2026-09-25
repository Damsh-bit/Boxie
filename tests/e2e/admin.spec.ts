import { expect, test, type Page } from '@playwright/test'

/**
 * El panel de administración en modo demo (datos de muestra, usuario de
 * demo). Con la base real el login es Supabase Auth: estas pruebas se
 * saltean fuera de la demo.
 */

test.skip(process.env.DEMO_MODE !== '1', 'El panel se prueba en modo demo')

async function login(page: Page, next = '/admin') {
  await page.goto(next)
  await expect(page).toHaveURL(/\/admin\/login/)
  await page.getByLabel('Mail').fill('admin@boxie.demo')
  await page.getByLabel('Clave', { exact: true }).fill('boxie-admin')
  await page.getByRole('button', { name: 'Entrar' }).click()
  // La primera vez el servidor arma los datos de muestra (un año de ventas): puede tardar.
  await page.waitForURL((url) => !url.pathname.startsWith('/admin/login'), { timeout: 30_000 })
}

test('sin sesión el panel lleva al login y una clave mala se rechaza', async ({ page }) => {
  await page.goto('/admin/finanzas')
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Ffinanzas/)
  await page.getByLabel('Mail').fill('admin@boxie.demo')
  await page.getByLabel('Clave', { exact: true }).fill('otra-clave')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('Mail o clave incorrectos.')).toBeVisible({ timeout: 15_000 })
})

test('entra y vuelve a la página que pidió', async ({ page }) => {
  await login(page, '/admin/finanzas')
  await expect(page).toHaveURL(/\/admin\/finanzas$/)
  await expect(page.getByRole('heading', { name: 'Finanzas', level: 1 })).toBeVisible()
  await expect(page.getByText('Estado de resultados')).toBeVisible()
})

test('el tablero muestra la facturación y las alertas', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('heading', { name: 'Así viene Boxie', level: 1 })).toBeVisible()
  await expect(page.getByText(/Facturación · últimos 30 días/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Para revisar' })).toBeVisible()
})

test('el generador arma temáticas desde una lista y las crea como borradores', async ({ page }) => {
  await login(page, '/admin/generador')
  await page.getByLabel('Lista de temáticas').fill('Día del Maestro\nHinchas de fútbol')
  await page.getByRole('button', { name: 'Generar 2' }).click()
  await expect(page.getByText('2 temáticas generadas')).toBeVisible()
  await expect(page.getByText(/Docentes \(por "maestr"/)).toBeVisible()
  await page.getByRole('button', { name: 'Crear 2 borradores' }).click()
  await expect(page.getByRole('heading', { name: '2 temáticas listas' })).toBeVisible()
  await page.getByRole('link', { name: 'Ver el catálogo' }).click()
  await expect(page.getByRole('heading', { name: 'Temáticas', level: 1 })).toBeVisible()
})

test('la ficha de la tienda vende por plan y el checkout cobra el plan elegido', async ({
  page,
}) => {
  await page.goto('/tematicas/pareja')
  const plans = page.getByRole('radiogroup', { name: 'Elegí el plan' })
  await expect(plans.getByRole('radio')).toHaveCount(3)
  await plans.getByRole('radio', { name: /Premium/ }).click()
  await page
    .getByRole('link', { name: /Quiero mi Boxie/ })
    .first()
    .click()
  await expect(page).toHaveURL(/plan=premium/)
  await expect(page.getByRole('heading', { name: /Boxie Pareja · Premium/ })).toBeVisible()
})

test('una temática nueva se publica desde el panel y aparece en la tienda', async ({ page }) => {
  const stamp = Date.now().toString(36)
  await login(page, '/admin/tematicas')
  await page.getByRole('button', { name: 'Nueva temática' }).click()
  await page.getByLabel('Nombre de la temática').fill(`Prueba E2E ${stamp}`)
  await page.getByRole('button', { name: 'Crear borrador' }).click()
  await expect(page.getByRole('heading', { name: `Prueba E2E ${stamp}`, level: 1 })).toBeVisible()

  // Antes de publicar, la tienda no la muestra.
  expect((await page.request.get(`/tematicas/prueba-e2e-${stamp}`)).status()).toBe(404)
  await page.getByRole('button', { name: 'Publicar' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Publicar' }).click()
  await expect(page.getByText('Publicaste la versión 1')).toBeVisible()
  expect((await page.request.get(`/tematicas/prueba-e2e-${stamp}`)).status()).toBe(200)
})
