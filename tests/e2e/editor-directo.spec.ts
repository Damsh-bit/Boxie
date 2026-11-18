import { expect, test, type Page } from '@playwright/test'

/**
 * El editor directo de Cumpleaños (config `editor: 'inline'`): se edita
 * tocando el diseño. Cada cosa editable tiene un recuadro con un lápiz; al
 * tocarla se abre el campo ahí mismo y el cambio se ve en vivo. Las pantallas
 * con dos diseños (03, 05 y 14) se eligen con tarjetas.
 */

const activa = (page: Page) => page.locator('.bx-slide.is-active')

async function irA(page: Page, pantalla: number) {
  await page.getByRole('combobox', { name: 'Ir a la pantalla' }).selectOption(String(pantalla - 1))
  await expect(page.getByText(`Pantalla ${pantalla} de 20`)).toBeVisible()
}

test.describe.configure({ timeout: 60_000 })

test.beforeEach(async ({ page }) => {
  await page.goto('/ejemplo/cumpleanos/personalizar')
  await expect(
    page.getByRole('heading', { name: 'Personalizá tu Ribbly Cumpleaños' }),
  ).toBeVisible()
})

test('el nombre se cambia tocándolo en la portada', async ({ page }) => {
  await irA(page, 2)
  await page.getByRole('button', { name: 'Editar: Para quién es' }).click()
  await page.getByRole('dialog', { name: 'Para quién es' }).getByRole('textbox').fill('Martu')
  await expect(activa(page)).toContainText('Martu')
  await page.getByRole('button', { name: 'Listo' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  // Es el mismo dato que el campo "Para" del costado.
  await expect(page.locator('#editor-para')).toHaveValue('Martu')
})

test('la edición cumple: el saludo en vivo y los dos diseños', async ({ page }) => {
  await irA(page, 3)
  await page.getByRole('button', { name: 'Editar: El saludo' }).click()
  await page
    .getByRole('dialog', { name: 'El saludo' })
    .getByRole('textbox')
    .fill('Feliz cumple Martu')
  await expect(activa(page).locator('svg[role=img]')).toContainText('Martu')
  await page.keyboard.press('Escape')

  const celeste = page.getByRole('radio', { name: /Celeste y dorado/ })
  await celeste.click()
  await expect(celeste).toHaveAttribute('aria-checked', 'true')
})

test('los 10 deseos: el diseño Noche trae las razones y cada nota se edita tocándola', async ({
  page,
}) => {
  await irA(page, 14)
  await page.getByRole('radio', { name: /Noche dorada/ }).click()
  await expect(activa(page)).toContainText('razones')
  await expect(activa(page)).toContainText('Por tu forma de mirarme')

  await page.getByRole('button', { name: 'Editar: Nota #1', exact: true }).click()
  await page.getByRole('dialog', { name: 'Nota #1' }).getByRole('textbox').fill('Por tu risa')
  await expect(activa(page)).toContainText('Por tu risa')
})
