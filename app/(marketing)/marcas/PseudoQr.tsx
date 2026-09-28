/**
 * Un QR de mentira para las maquetas (el vaso, la tarjeta del ramo): los tres
 * cuadrados de las esquinas y un patrón que sale del texto `seed`, así cada
 * rubro tiene el suyo y no cambia entre renders. No se puede escanear.
 */

const SIZE = 21

function hash(text: string): number {
  let h = 2166136261
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

function inFinder(x: number, y: number): boolean {
  const corner = (cx: number, cy: number) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7
  return corner(0, 0) || corner(SIZE - 7, 0) || corner(0, SIZE - 7)
}

export function PseudoQr({
  seed,
  color = '#2a2433',
  className,
}: {
  seed: string
  color?: string
  className?: string
}) {
  let state = hash(seed) || 1
  const next = () => {
    // xorshift32: el mismo seed da siempre el mismo dibujo.
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
  const cells: { x: number; y: number }[] = []
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const on = next() > 0.52
      if (!inFinder(x, y) && on) cells.push({ x, y })
    }
  }
  const finders: [number, number][] = [
    [0, 0],
    [SIZE - 7, 0],
    [0, SIZE - 7],
  ]
  return (
    <svg viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`} className={className} aria-hidden>
      <rect x="-1" y="-1" width={SIZE + 2} height={SIZE + 2} rx="2" fill="#fff" />
      {finders.map(([fx, fy]) => (
        <g key={`${fx}-${fy}`} fill={color}>
          <path fillRule="evenodd" d={`M${fx} ${fy}h7v7h-7z M${fx + 1} ${fy + 1}v5h5v-5z`} />
          <rect x={fx + 2} y={fy + 2} width="3" height="3" />
        </g>
      ))}
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width="1" height="1" fill={color} />
      ))}
    </svg>
  )
}
