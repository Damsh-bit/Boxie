import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * El circuito real del regalo, contra Supabase local (CI): una compra pagada
 * con el proveedor falso crea la Boxie; el comprador entra con su link,
 * personaliza, sube fotos a Storage, bloquea, y el destinatario abre el regalo
 * desde otro dispositivo (Sprint 3, docs/ARQUITECTURA.md §5).
 */

test.skip(
  process.env.DEMO_MODE === '1' || process.env.PAYMENTS_PROVIDER !== 'fake',
  'Necesita la base (Supabase) y PAYMENTS_PROVIDER=fake',
)

const FOTO = join(process.cwd(), 'public', 'themes', 'pareja.jpg')
const OTRA_FOTO = join(process.cwd(), 'public', 'themes', 'cumpleanos.jpg')

test('comprar, personalizar, bloquear y abrir el regalo en otro dispositivo', async ({
  page,
  request,
  browser,
}) => {
  const response = await request.post('/api/dev/boxies', {
    data: { tematica: 'pareja', nombre: 'Leandro Pérez', email: 'leandro@example.com' },
  })
  expect(response.ok()).toBe(true)
  const { editorUrl, giftUrl, code } = (await response.json()) as {
    editorUrl: string
    giftUrl: string
    code: string
  }

  // Antes de bloquear, el link del regalo existe pero todavía no se abre.
  const otherDevice = await browser.newContext()
  const recipient = await otherDevice.newPage()
  await recipient.goto(giftUrl)
  await expect(recipient.getByRole('heading', { level: 1 })).toHaveText(
    'Tu regalo todavía se está preparando',
  )

  // El link del mail se canjea por una cookie y la URL queda limpia.
  await page.goto(editorUrl)
  await expect(page).toHaveURL(/\/editor$/)
  await expect(page.getByText(`Código ${code}`)).toBeVisible()
  // El remitente arranca con el nombre de pila del comprador.
  await expect(page.locator('#editor-de')).toHaveValue('Leandro')

  await page.locator('#editor-para').fill('Sofía')
  await page.getByRole('button', { name: /^Dedicatoria/ }).click()
  await page.locator('#m-dedicatoria-text').fill('Gracias por cada risa.')
  await page.locator('#m-dedicatoria-photo').setInputFiles(FOTO)
  await expect(page.locator('#seccion-dedicatoria img[alt="Foto elegida"]')).toBeVisible()
  await page.getByRole('button', { name: /^Anécdota/ }).click()
  await page.locator('#m-anecdota-photo').setInputFiles(OTRA_FOTO)
  await expect(page.locator('#seccion-anecdota img[alt="Foto elegida"]')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Guardado' })).toBeVisible({
    timeout: 10_000,
  })

  // Quedó guardado en la base: otra carga trae lo mismo (y las fotos, firmadas).
  await page.reload()
  await expect(page.locator('#editor-para')).toHaveValue('Sofía')
  await expect(page.locator('#m-dedicatoria-text')).toHaveValue('Gracias por cada risa.')
  await expect(page.locator('#seccion-anecdota img[alt="Foto elegida"]')).toHaveAttribute(
    'src',
    /\/storage\/v1\/object\/sign\/boxie-media\//,
  )

  await page.getByRole('button', { name: 'Regalar', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Bloquear y regalar' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('¡Boxie lista!')
  await expect(page.getByText(giftUrl)).toBeVisible()

  // Bloqueada: el editor ya no edita, muestra el link.
  await page.goto('/editor')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('¡Boxie lista!')
  await expect(page.locator('#editor-para')).toHaveCount(0)

  // El destinatario, en su celular, sin usuario ni clave.
  await recipient.reload()
  await recipient.getByRole('button', { name: 'Slide siguiente' }).click()
  await expect(recipient.locator('.bx-slide.is-active')).toContainText('Sofía')
  await otherDevice.close()
})

test('un link de edición inventado no abre ninguna Boxie', async ({ page }) => {
  await page.goto('/editor/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
  await expect(page).toHaveURL(/\/editor\?error=link$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ese link no funciona')
})

test('un link de regalo inventado da "no existe"', async ({ page }) => {
  const response = await page.goto('/g/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Este link no existe')
})
