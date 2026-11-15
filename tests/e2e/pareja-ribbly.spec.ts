import { expect, test, type Page } from '@playwright/test'

/**
 * La Ribbly de Pareja (base de pantallas de Pareja: 20 pantallas / 34 vistas),
 * recorrida como la recibe la otra persona: se abre el regalo, la carta sale
 * del sobre, se juega la trivia, se canjea un vale, se responde la gratitud,
 * se escribe el diario, se parte la galletita y se abre el regalo sorpresa.
 */

const activa = (page: Page) => page.locator('.bx-slide.is-active')

async function irHasta(page: Page, texto: string | RegExp) {
  const siguiente = page.getByRole('button', { name: 'Slide siguiente' })
  for (let i = 0; i < 20; i++) {
    if (await activa(page).getByText(texto).first().isVisible()) return
    await siguiente.click()
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

test.describe.configure({ timeout: 90_000 })

test.beforeEach(async ({ page }) => {
  await page.goto('/ejemplo/pareja')
  await expect(activa(page)).toContainText('RIBBLY')
})

test('la portada: el regalo se abre al tocarlo', async ({ page }) => {
  await irHasta(page, 'Este regalo especial es para...')
  await expect(activa(page)).toContainText('Sofía')
  await tocar(page, 'Abrir el regalo')
  await expect(activa(page)).toContainText('¡Sorpresa!')
})

test('la dedicatoria sale del sobre al tocar el lacre', async ({ page }) => {
  await irHasta(page, 'Mi dedicatoria')
  await tocar(page, 'Abrir la carta')
  await expect(activa(page)).toContainText('Sofía:')
  await expect(activa(page)).toContainText('Te elijo todos los días')
  await expect(activa(page)).toContainText('— Lean')
})

test('la trivia de pareja: sin las tres no hay premio; al reintentar, sí', async ({ page }) => {
  await irHasta(page, '¿CUÁNTO ME CONOCÉS?')
  const opciones = activa(page).locator('.rb-q-option')
  const responder = async (numero: number, indice: number) => {
    await expect(activa(page)).toContainText(`PREGUNTA ${numero}/3`)
    await expect(opciones.nth(indice)).toBeEnabled()
    await opciones.nth(indice).click({ force: true })
  }
  const seguir = () => tocar(page, /Siguiente/)

  await tocar(page, 'JUGAR')
  await responder(1, 2)
  await expect(activa(page)).toContainText('Fue en ese café de Palermo')
  await seguir()
  await responder(2, 0)
  await expect(activa(page)).toContainText('ERA ESTA')
  await seguir()
  await responder(3, 1)
  await seguir()
  await expect(activa(page)).toContainText('¡Uy, casi!')

  await tocar(page, /Volver a intentar/)
  for (const [numero, indice] of [
    [1, 2],
    [2, 1],
    [3, 0],
  ] as const) {
    await responder(numero, indice)
    await seguir()
  }
  await expect(activa(page)).toContainText('Una cena romántica')
})

test('la cuponera de amor: un vale se abre y se canjea', async ({ page }) => {
  await irHasta(page, 'CUPONERA DE AMOR')
  await activa(page).locator('.rb-voucher').nth(5).click({ force: true })
  await expect(activa(page)).toContainText('Escapada')
  await tocar(page, 'Canjear vale')
  await expect(activa(page)).toContainText('¡CANJEADO!')
  await tocar(page, 'Volver a la cuponera')
  await expect(activa(page)).toContainText('1 de 8 vales canjeados')
})

test('la revista sale del banco de Pareja', async ({ page }) => {
  await irHasta(page, 'COMPARTIR STORY')
  // Ningún texto del banco de Pareja usa la edad ni habla de cumpleaños.
  await expect(activa(page).locator('.rb-mag')).not.toContainText(/cumple|vuelta al sol/i)
})

test('gratitud: tres respuestas y el cierre las muestra', async ({ page }) => {
  await irHasta(page, 'un segundo.')
  await tocar(page, /Comenzar/)
  for (const respuesta of ['Nuestro viaje a Mendoza', 'Vos', 'Animarme a más']) {
    await activa(page).getByRole('textbox').fill(respuesta)
    await activa(page).getByRole('textbox').press('Enter')
  }
  await expect(activa(page)).toContainText('Gracias.')
  await expect(activa(page)).toContainText('Nuestro viaje a Mendoza')
})

test('el diario se abre, se escribe y queda guardado', async ({ page }) => {
  await irHasta(page, 'Diario de Sofía')
  await tocar(page, /Abrir mi diario/)
  await activa(page)
    .getByRole('textbox', { name: 'Página del diario' })
    .fill('Hoy fue un gran día.')
  await tocar(page, 'Guardar en mi diario')
  await expect(activa(page)).toContainText('Guardado en tu diario')
  await expect(activa(page).getByRole('button', { name: /Seguir escribiendo/ })).toBeVisible()
})

test('la galletita se parte y deja su mensaje', async ({ page }) => {
  await irHasta(page, 'Tu destino')
  await tocar(page, /galletita II/)
  await expect(activa(page)).toContainText('MENSAJE DEL UNIVERSO')
  await expect(activa(page)).toContainText('Confiá.')
})

test('el cierre: resumen, entradas sorpresa y gracias', async ({ page }) => {
  await irHasta(page, 'Todo lo que vivimos')
  await expect(activa(page)).toContainText('Para Sofía')
  await expect(activa(page)).toContainText('11 10 razones')

  await irHasta(page, 'Una última cosa...')
  await tocar(page, 'Ver mi regalo')
  await expect(activa(page)).toContainText('2 entradas para el recital')
  await tocar(page, /Seguir/)
  await expect(activa(page)).toContainText('Gracias')
  await expect(activa(page).getByRole('link', { name: /Regalá una Ribbly/ })).toHaveAttribute(
    'href',
    /utm_campaign=cierre_pareja/,
  )
})
