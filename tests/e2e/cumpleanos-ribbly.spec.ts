import { expect, test, type Page } from '@playwright/test'

/**
 * La Ribbly de Cumpleaños (base de pantallas: 20 pantallas / 34 vistas),
 * recorrida como la recibe quien cumple: se soplan las velas, se abre la
 * tarjeta, se juega la trivia (sin premio y con premio), sale el jackpot, se
 * canjea un vale, se piden los deseos, se guarda la cápsula, se rompe la
 * piñata y se abre el regalo sorpresa.
 */

const activa = (page: Page) => page.locator('.bx-slide.is-active')

/** Avanza hasta la slide cuyo contenido tiene ese texto. */
async function irHasta(page: Page, texto: string | RegExp) {
  const siguiente = page.getByRole('button', { name: 'Slide siguiente' })
  for (let i = 0; i < 20; i++) {
    if (await activa(page).getByText(texto).first().isVisible()) return
    await siguiente.click()
    // La slide activa cambia al instante; solo se espera a que se monte.
    await page.waitForTimeout(250)
  }
  await expect(activa(page).getByText(texto).first()).toBeVisible()
}

/**
 * Toca un botón cuando terminó de entrar: si se toca mientras se mueve, el
 * clic cae donde estaba antes. Los que laten en loop nunca quedan quietos:
 * después de unos segundos se tocan igual.
 */
async function tocar(page: Page, nombre: string | RegExp) {
  const boton = activa(page).getByRole('button', { name: nombre }).first()
  await expect(boton).toBeVisible()
  await boton.click({ trial: true, timeout: 2500 }).catch(() => {})
  await boton.click({ force: true })
}

// Hay que pasar hasta 19 pantallas animadas: más margen que el de por defecto.
test.describe.configure({ timeout: 90_000 })

test.beforeEach(async ({ page }) => {
  await page.goto('/ejemplo/cumpleanos')
  await expect(activa(page)).toContainText('RIBBLY')
})

test('la portada: se soplan las velas de la edad', async ({ page }) => {
  await irHasta(page, 'Hoy es un día especial para...')
  await expect(activa(page)).toContainText('Sofía')
  await expect(page.getByRole('img', { name: 'Torta con velas del 28' })).toBeVisible()

  await tocar(page, 'Soplar las velitas')
  await expect(activa(page)).toContainText('¡Deseo pedido!')
})

test('la tarjeta sale del sobre con la carta y la firma', async ({ page }) => {
  await irHasta(page, 'Tu tarjeta de cumple')
  await tocar(page, 'Abrir la tarjeta')
  await expect(activa(page)).toContainText('Sofía:')
  await expect(activa(page)).toContainText('— Lean')
  await tocar(page, /Cerrar/)
  await expect(activa(page).getByRole('button', { name: 'Abrir la tarjeta' })).toBeVisible()
})

test('la trivia: sin las tres no hay premio; al reintentar, sí', async ({ page }) => {
  await irHasta(page, '¿CUÁNTO SABÉS DE MÍ?')
  const opciones = activa(page).locator('.rb-q-option')
  /** Espera a que la pregunta esté en pantalla (la anterior sale animada) y responde. */
  const responder = async (numero: number, indice: number) => {
    await expect(activa(page)).toContainText(`PREGUNTA ${numero}/3`)
    await expect(opciones.nth(indice)).toBeEnabled()
    await opciones.nth(indice).click({ force: true })
  }
  const seguir = () => tocar(page, /Siguiente/)

  await tocar(page, 'JUGAR')
  await responder(1, 1)
  await expect(activa(page)).toContainText('¡CORRECTO!')
  await seguir()
  await responder(2, 0)
  await expect(activa(page)).toContainText('¡CASI!')
  await expect(activa(page)).toContainText('ERA ESTA')
  await seguir()
  await responder(3, 0)
  await seguir()

  await expect(activa(page)).toContainText('¡Uy, casi!')
  await expect(activa(page)).toContainText('2 de 3 correctas')

  await tocar(page, /Volver a intentar/)
  await responder(1, 1)
  await seguir()
  await responder(2, 1)
  await seguir()
  await responder(3, 0)
  await seguir()
  await expect(activa(page)).toContainText('¡Jugada maestra!')
  await expect(activa(page)).toContainText('Una merienda con todo pago')
})

test('el tragamonedas siempre da el premio mayor', async ({ page }) => {
  await irHasta(page, 'RIBBLY SLOTS')
  await tocar(page, /GIRAR/)
  await expect(activa(page)).toContainText('¡JACKPOT!', { timeout: 10_000 })
  await expect(activa(page)).toContainText('Noche de karaoke')
})

test('un vale se abre, se canjea y queda canjeado', async ({ page }) => {
  await irHasta(page, 'VALES DE CUMPLE')
  await expect(activa(page)).toContainText('0 de 8 vales canjeados')
  await activa(page).locator('.rb-voucher').nth(1).click({ force: true })
  await expect(activa(page)).toContainText('VALE POR')

  await tocar(page, 'Canjear vale')
  await expect(activa(page)).toContainText('¡CANJEADO!')
  await tocar(page, 'Volver a los vales')
  await expect(activa(page)).toContainText('1 de 8 vales canjeados')
})

test('las velitas piden tres deseos y la cápsula guarda la carta', async ({ page }) => {
  await irHasta(page, 'Antes de soplar')
  await tocar(page, /Pedir mis deseos/)
  for (const deseo of ['Viajar a Brasil', 'Aprender a surfear', 'Más domingos de mate']) {
    await activa(page).getByRole('textbox').fill(deseo)
    await activa(page).getByRole('textbox').press('Enter')
  }
  await expect(activa(page)).toContainText('¡Deseos pedidos!')

  await irHasta(page, 'Una carta para tu')
  await expect(activa(page)).toContainText('Sofía de 29')
  await tocar(page, /Escribirle a mi yo del futuro/)
  await activa(page).getByRole('textbox').fill('Hoy cumplo 28 y quiero acordarme de este día.')
  await tocar(page, 'Guardar en la cápsula')
  await expect(activa(page)).toContainText('Guardada en tu cápsula')
})

test('la piñata se rompe al tercer golpe y deja su mensaje', async ({ page }) => {
  await irHasta(page, '¡Rompé la piñata!')
  const pinata = activa(page).getByRole('button', { name: /Golpear la piñata/ })
  await pinata.click({ force: true })
  await pinata.click({ force: true })
  await expect(activa(page)).toContainText('¡Otro más!')
  await pinata.click({ force: true })
  await expect(activa(page)).toContainText('LO QUE TE TRAE ESTE AÑO')
})

test('el cierre: resumen, regalo sorpresa y ¡feliz cumple!', async ({ page }) => {
  await irHasta(page, 'Todo lo que festejamos')
  await expect(activa(page)).toContainText('15 Anécdota')

  await irHasta(page, 'Una última cosa...')
  await tocar(page, 'Ver mi regalo')
  await expect(activa(page)).toContainText('Gift card para tu librería favorita')
  await tocar(page, /Seguir/)
  await expect(activa(page)).toContainText('¡Feliz')
  await expect(activa(page).getByRole('link', { name: /Regalá una Ribbly/ })).toHaveAttribute(
    'href',
    /utm_campaign=cierre_cumple/,
  )
  await tocar(page, /Repetir Ribbly/)
  await expect(activa(page)).toContainText('Una experiencia digital para vos.')
})
