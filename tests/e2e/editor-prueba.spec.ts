import { join } from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * El editor en modo prueba (/ejemplo/<temática>/personalizar): el mismo
 * editor del comprador, guardando en el navegador. Corre igual con base o en
 * modo demo.
 */

const FOTO = join(process.cwd(), 'public', 'themes', 'pareja.jpg')
const OTRA_FOTO = join(process.cwd(), 'public', 'themes', 'amistad.jpg')

// En escritorio la vista previa del regalo está al lado, con sus propios títulos.
const title = (name: string) => ({ name, exact: true, level: 1 }) as const

test('se personaliza, se revisa y se "regala" sin comprar', async ({ page }) => {
  await page.goto('/ejemplo/pareja/personalizar')
  await expect(page.getByRole('heading', title('Personalizá tu Boxie Pareja'))).toBeVisible()

  await page.locator('#editor-para').fill('Sofía')
  await page.locator('#editor-de').fill('Lean')
  // La vista previa (en escritorio) o la portada del regalo muestran el nombre.
  await expect(page.getByRole('status').filter({ hasText: 'Guardado' })).toBeVisible()

  await page.getByRole('button', { name: /^Dedicatoria/ }).click()
  await page.locator('#m-dedicatoria-text').fill('Gracias por cada risa.')
  await page.locator('#m-dedicatoria-photo').setInputFiles(FOTO)
  await expect(page.locator('#seccion-dedicatoria img[alt="Foto elegida"]')).toBeVisible()

  await page.getByRole('button', { name: /^Anécdota/ }).click()
  await page.locator('#m-anecdota-photo').setInputFiles(OTRA_FOTO)
  await expect(page.locator('#seccion-anecdota img[alt="Foto elegida"]')).toBeVisible()
  await expect(page.getByText('¡Lista para regalar!')).toBeVisible()

  // Lo cargado sobrevive a una recarga (queda en el navegador).
  await expect(page.getByRole('status').filter({ hasText: 'Guardado' })).toBeVisible()
  await page.reload()
  await expect(page.locator('#editor-para')).toHaveValue('Sofía')
  await expect(page.locator('#seccion-dedicatoria img[alt="Foto elegida"]')).toHaveCount(1)

  await page.getByRole('button', { name: 'Regalar', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Revisión final')
  await expect(dialog).toContainText('2 cargadas')
  await dialog.getByRole('button', { name: 'Bloquear y regalar' }).click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('¡Así se regala una Boxie!')
  await page.getByRole('button', { name: 'Ver el regalo como Sofía' }).click()
  await page.getByRole('button', { name: 'Slide siguiente' }).click()
  await expect(page.locator('.bx-overlay:not(.bx-embedded) .bx-slide.is-active')).toContainText(
    'Sofía',
  )
})

test('no deja regalar si faltan los datos obligatorios, y lleva a completarlos', async ({
  page,
}) => {
  await page.goto('/ejemplo/amistad/personalizar')
  await page.getByRole('button', { name: 'Regalar', exact: true }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Foto de la dedicatoria')
  await expect(dialog).toContainText('Foto de la anécdota')
  await expect(dialog.getByRole('button', { name: 'Bloquear y regalar' })).toBeDisabled()

  await dialog.getByRole('button', { name: /Dedicatoria: Foto de la dedicatoria/ }).click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('#m-dedicatoria-photo')).toBeAttached()
  await expect(page.getByRole('button', { name: /^Dedicatoria/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
})

test('se llega desde la ficha de la temática', async ({ page }) => {
  await page.goto('/tematicas/cumpleanos')
  await page.getByRole('link', { name: /Probá cómo se personaliza/ }).click()
  await expect(page).toHaveURL(/\/ejemplo\/cumpleanos\/personalizar$/)
  await expect(page.getByRole('heading', title('Personalizá tu Boxie Cumpleaños'))).toBeVisible()
})
