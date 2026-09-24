import { animate, type MotionValue } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { SLIDE_SPRING } from './motion'

/**
 * Navegación vertical tipo historias.
 *
 * El dedo mueve directamente `position` (un valor de movimiento: la slide
 * "actual" como número continuo, 2.3 = un 30% camino a la 3). No hay estado
 * de React en el medio, así que arrastrar no re-renderiza el player y va a la
 * par del dedo aunque el teléfono sea modesto. Al soltar decide por distancia
 * o por velocidad (un "flick" corto también pasa de slide) y el resorte sigue
 * con la inercia del gesto.
 *
 * Además:
 *  · scroll anidado: en las slides que son listas (playlists, cuponera,
 *    revista) el dedo primero scrollea la lista y recién en el borde pasa de
 *    slide; en el prototipo las dos cosas pasaban a la vez.
 *  · rueda del mouse y teclado, para escritorio.
 *  · un arrastre no dispara el click del botón donde empezó.
 */

/** Cuánto hay que arrastrar (en slides) para pasar sin velocidad. */
const DISTANCE = 0.14
/** Velocidad (slides por segundo) que alcanza para pasar con un flick. */
const FLICK = 0.55
/** Resistencia más allá de la primera/última slide. */
const RUBBER = 0.28
const WHEEL_COOLDOWN_MS = 650

function isEditable(el: Element | null): boolean {
  return !!el?.closest('input, textarea, select, [contenteditable="true"]')
}

function scrollableAncestor(target: Element | null, root: Element): HTMLElement | null {
  let el = target as HTMLElement | null
  while (el && el !== root) {
    const style = getComputedStyle(el)
    if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) return el
    el = el.parentElement
  }
  return null
}

/** ¿El contenedor puede scrollear en la dirección del gesto? delta > 0 = el dedo baja (ir hacia atrás). */
function canScroll(el: HTMLElement, delta: number): boolean {
  return delta > 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1
}

export function useSwipe(
  ref: RefObject<HTMLElement | null>,
  {
    index,
    count,
    position,
    onChange,
  }: {
    index: number
    count: number
    position: MotionValue<number>
    onChange: (next: number) => void
  },
) {
  // Lo que cambia entre renders se lee de acá: los listeners se enganchan una
  // sola vez y un re-render en medio de un arrastre no lo corta.
  const state = useRef({ index, count, onChange })
  useLayoutEffect(() => {
    state.current = { index, count, onChange }
  }, [index, count, onChange])

  const go = useCallback((delta: number) => {
    const { index: i, count: n, onChange: change } = state.current
    const next = Math.max(0, Math.min(n - 1, i + delta))
    if (next !== i) change(next)
  }, [])

  useEffect(() => {
    const root = ref.current
    if (!root) return

    let startY = 0
    let startX = 0
    let from = 0
    let height = 1
    let mode: 'undecided' | 'slide' | 'scroll' | 'ignore' = 'ignore'
    let scroller: HTMLElement | null = null
    let moved = false
    let lastWheel = 0

    const begin = (x: number, y: number, target: EventTarget | null) => {
      if (isEditable(target as Element)) {
        mode = 'ignore'
        return
      }
      startX = x
      startY = y
      moved = false
      mode = 'undecided'
      scroller = scrollableAncestor(target as Element, root)
    }

    const move = (x: number, y: number, event: Event) => {
      if (mode === 'ignore' || mode === 'scroll') return
      if (mode === 'undecided') {
        const dy = y - startY
        const dx = x - startX
        if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return
        if (Math.abs(dx) > Math.abs(dy)) {
          mode = 'ignore'
          return
        }
        mode = scroller && canScroll(scroller, dy) ? 'scroll' : 'slide'
        if (mode === 'scroll') return
        // Se agarra el mazo donde esté (aunque venga animándose) y sin salto.
        position.stop()
        from = position.get()
        height = root.clientHeight || window.innerHeight
        startY = y
      }
      if (event.cancelable) event.preventDefault()
      const dy = y - startY
      moved = moved || Math.abs(dy) > 10
      const { index: i, count: n } = state.current
      const min = Math.max(0, i - 1)
      const max = Math.min(n - 1, i + 1)
      let next = from - dy / height
      if (next < min) next = min - (min - next) * RUBBER
      if (next > max) next = max + (next - max) * RUBBER
      position.set(next)
    }

    const end = () => {
      if (mode === 'slide') {
        const { index: i, count: n, onChange: change } = state.current
        const offset = position.get() - i
        const velocity = position.getVelocity()
        let target = i
        if (offset > DISTANCE || (velocity > FLICK && offset > 0.02)) target = i + 1
        else if (offset < -DISTANCE || (velocity < -FLICK && offset < -0.02)) target = i - 1
        target = Math.max(0, Math.min(n - 1, target))
        // Si cambia de slide, el player anima hacia la nueva; si no, vuelve.
        if (target !== i) change(target)
        else animate(position, i, SLIDE_SPRING)
      }
      mode = 'ignore'
    }

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) begin(t.clientX, t.clientY, e.target)
    }
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) move(t.clientX, t.clientY, e)
    }
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      begin(e.clientX, e.clientY, e.target)
      if (mode === 'undecided') scroller = null // con mouse, la lista se scrollea con la rueda
    }
    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY, e)
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation()
        e.preventDefault()
        moved = false
      }
    }
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 12) return
      const target = scrollableAncestor(e.target as Element, root)
      if (target && canScroll(target, -e.deltaY)) return
      const now = Date.now()
      if (now - lastWheel < WHEEL_COOLDOWN_MS) return
      lastWheel = now
      go(e.deltaY > 0 ? 1 : -1)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(document.activeElement)) return
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault()
        go(1)
      } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault()
        go(-1)
      }
    }

    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchmove', onTouchMove, { passive: false })
    root.addEventListener('touchend', end)
    root.addEventListener('touchcancel', end)
    root.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', end)
    root.addEventListener('click', onClickCapture, true)
    root.addEventListener('wheel', onWheel, { passive: true })
    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchmove', onTouchMove)
      root.removeEventListener('touchend', end)
      root.removeEventListener('touchcancel', end)
      root.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', end)
      root.removeEventListener('click', onClickCapture, true)
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('keydown', onKeyDown)
    }
  }, [ref, go, position])

  return { go }
}
