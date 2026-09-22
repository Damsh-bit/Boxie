import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * Navegación vertical tipo historias.
 *
 * Porta la lógica del prototipo (arrastrar más de 80 px cambia de slide, con
 * resistencia en los extremos) y le agrega lo que le faltaba:
 *  · scroll anidado: en las slides que son listas (playlists, cuponera,
 *    revista) el dedo primero scrollea la lista y recién en el borde pasa de
 *    slide; en el prototipo las dos cosas pasaban a la vez.
 *  · rueda del mouse y teclado, para escritorio.
 *  · un arrastre no dispara el click del botón donde empezó.
 */

const THRESHOLD = 80
const WHEEL_COOLDOWN_MS = 700

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
  { index, count, onChange }: { index: number; count: number; onChange: (next: number) => void },
) {
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState(0)
  const state = useRef({ index, count })
  useLayoutEffect(() => {
    state.current = { index, count }
  }, [index, count])

  const go = useCallback(
    (delta: number) => {
      const { index: i, count: n } = state.current
      const next = Math.max(0, Math.min(n - 1, i + delta))
      if (next !== i) onChange(next)
    },
    [onChange],
  )

  useEffect(() => {
    const root = ref.current
    if (!root) return

    let startY = 0
    let startX = 0
    let mode: 'undecided' | 'slide' | 'scroll' | 'ignore' = 'ignore'
    let scroller: HTMLElement | null = null
    let current = 0
    let moved = false
    let lastWheel = 0

    const resist = (dy: number) => {
      const { index: i, count: n } = state.current
      return (i === 0 && dy > 0) || (i === n - 1 && dy < 0) ? dy * 0.3 : dy
    }

    const begin = (x: number, y: number, target: EventTarget | null) => {
      if (isEditable(target as Element)) {
        mode = 'ignore'
        return
      }
      startX = x
      startY = y
      current = 0
      moved = false
      mode = 'undecided'
      scroller = scrollableAncestor(target as Element, root)
    }

    const move = (x: number, y: number, event: Event) => {
      if (mode === 'ignore' || mode === 'scroll') return
      const dy = y - startY
      const dx = x - startX
      if (mode === 'undecided') {
        if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return
        if (Math.abs(dx) > Math.abs(dy)) {
          mode = 'ignore'
          return
        }
        mode = scroller && canScroll(scroller, dy) ? 'scroll' : 'slide'
        if (mode === 'scroll') return
        setDragging(true)
      }
      if (event.cancelable) event.preventDefault()
      moved = moved || Math.abs(dy) > 10
      current = resist(dy)
      setOffset(current)
    }

    const end = () => {
      if (mode === 'slide') {
        if (current < -THRESHOLD) go(1)
        else if (current > THRESHOLD) go(-1)
      }
      mode = 'ignore'
      setDragging(false)
      setOffset(0)
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
  }, [ref, go])

  return { dragging, offset, go }
}
