import { expect, test, type Page } from '@playwright/test'

/**
 * Soporte: el botón de ayuda del sitio (cliente) y la bandeja del panel
 * (equipo). El flujo del cliente corre con la base (CI) y en modo demo; el
 * del equipo necesita el login de la demo.
 */

const stamp = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

async function openWidget(page: Page) {
  await page.getByRole('button', { name: /^Ayuda/ }).click()
  await expect(page.getByRole('dialog', { name: 'Ayuda de Boxie' })).toBeVisible()
}

async function createTicket(page: Page, message: string) {
  await openWidget(page)
  const dialog = page.getByRole('dialog', { name: 'Ayuda de Boxie' })
  await dialog.getByRole('button', { name: 'Encontré un error' }).click()
  await dialog.getByLabel('Tu nombre').fill('Prueba E2E')
  await dialog.getByLabel('Tu mail').fill('prueba-e2e@ejemplo.com')
  await dialog.getByLabel('Tu mensaje').fill(message)
  await dialog.getByRole('button', { name: 'Enviar consulta' }).click()
  // La conversación queda abierta, del lado del equipo.
  await expect(dialog.getByRole('log')).toContainText(message)
  await expect(dialog).toContainText('Esperando al equipo')
  return dialog
}

test('el cliente abre una consulta, la retoma y sigue escribiendo', async ({ page }) => {
  const message = `El botón de subir foto no hace nada (${stamp()})`
  await page.goto('/ayuda')
  const dialog = await createTicket(page, message)

  // La consulta queda en este navegador (cookie): al volver, está en la lista.
  await page.reload()
  await openWidget(page)
  await expect(dialog.getByRole('heading', { name: 'Tus consultas' })).toBeVisible()
  await dialog.getByRole('button', { name: new RegExp(message.slice(0, 30)) }).click()
  await expect(dialog.getByRole('log')).toContainText(message)

  await dialog.getByLabel('Mensaje', { exact: true }).fill('Lo probé en Safari y en Chrome.')
  await dialog.getByRole('button', { name: 'Enviar', exact: true }).click()
  await expect(dialog.getByRole('log')).toContainText('Lo probé en Safari y en Chrome.')

  // Y también en /soporte, a pantalla completa.
  await page.goto('/soporte')
  await expect(page.getByRole('button', { name: new RegExp(message.slice(0, 30)) })).toBeVisible()
})

test('un código de Boxie mal escrito se explica antes de enviar', async ({ page }) => {
  await page.goto('/galeria')
  await openWidget(page)
  const dialog = page.getByRole('dialog', { name: 'Ayuda de Boxie' })
  await dialog.getByRole('button', { name: 'Tengo un problema con mi Boxie' }).click()
  await dialog.getByLabel('Tu nombre').fill('Prueba E2E')
  await dialog.getByLabel('Tu mail').fill('prueba-e2e@ejemplo.com')
  await dialog.getByLabel('Código de tu Boxie (opcional)').fill('K7M2-Q9X0')
  await dialog.getByLabel('Tu mensaje').fill('No puedo entrar al editor')
  await dialog.getByRole('button', { name: 'Enviar consulta' }).click()
  await expect(dialog.getByRole('alert').first()).toContainText('K7M2-Q9XD')
})

test('las consultas de otro navegador no se ven ni se pueden escribir', async ({
  page,
  browser,
}) => {
  await page.goto('/contacto')
  await createTicket(page, `Consulta privada (${stamp()})`)
  const { tickets } = (await (await page.request.get('/api/soporte/tickets')).json()) as {
    tickets: { id: string }[]
  }
  const id = tickets[0]!.id

  // Un contexto nuevo no hereda la configuración (baseURL): se usa el origen de la página.
  const origin = new URL(page.url()).origin
  const stranger = await browser.newContext()
  const response = await stranger.request.get(`${origin}/api/soporte/tickets/${id}`)
  expect(response.status()).toBe(403)
  const write = await stranger.request.post(`${origin}/api/soporte/tickets/${id}/mensajes`, {
    data: { body: 'hola' },
  })
  expect(write.status()).toBe(403)
  await stranger.close()
})

test.describe('bandeja del equipo', () => {
  test.skip(process.env.DEMO_MODE !== '1', 'El panel se prueba en modo demo')

  test('el equipo responde en vivo y el cliente lo ve sin recargar', async ({ page, browser }) => {
    const message = `No me llegó el mail del editor (${stamp()})`
    await page.goto('/galeria')
    const dialog = await createTicket(page, message)

    const team = await browser.newContext()
    const admin = await team.newPage()
    await admin.goto(`${new URL(page.url()).origin}/admin/soporte`)
    await admin.getByLabel('Mail').fill('admin@boxie.demo')
    await admin.getByLabel('Clave', { exact: true }).fill('boxie-admin')
    await admin.getByRole('button', { name: 'Entrar' }).click()
    await admin.waitForURL(/\/admin\/soporte/, { timeout: 30_000 })

    await admin.getByRole('button', { name: new RegExp(message.slice(0, 25)) }).click()
    await expect(admin.getByRole('log')).toContainText(message)
    const reply = `¡Hola! Ya te reenviamos el link (${stamp()})`
    await admin.getByLabel('Respuesta al cliente').fill(reply)
    await admin.getByRole('button', { name: 'Enviar', exact: true }).click()
    await expect(admin.getByLabel('Estado')).toHaveValue('pending')

    // El cliente lo recibe por el stream, sin recargar.
    await expect(dialog.getByRole('log')).toContainText(reply, { timeout: 15_000 })
    await expect(dialog).toContainText('Te respondimos')
    await team.close()
  })
})
