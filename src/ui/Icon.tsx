import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { iconFor, splitEmoji, type IconName } from '@/domain/icons'

/**
 * Íconos propios de Ribbly (src/domain/icons.ts). Hay dos tamaños de archivo:
 * 96 px para lo que se ve hasta 48 px (pantallas retina incluidas) y 256 px
 * para lo grande.
 */

export function iconSrc(name: IconName, px = 48): string {
  return px <= 48 ? `/icons/sm/${name}.webp` : `/icons/${name}.webp`
}

interface IconProps {
  name: IconName
  /** Lado en px, o una medida CSS ("1em") para que siga al tamaño del texto. */
  size?: number | string
  /** Texto alternativo; sin él, el ícono es decorativo. */
  label?: string
  /** Con una medida CSS que pase los 48 px: usa el archivo grande. */
  large?: boolean
  className?: string
  style?: CSSProperties
}

export function Icon({ name, size = 24, label, large, className, style }: IconProps) {
  const px = typeof size === 'number' ? size : large ? 256 : 48
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconSrc(name, px)}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      width={typeof size === 'number' ? size : undefined}
      height={typeof size === 'number' ? size : undefined}
      draggable={false}
      decoding="async"
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        maxWidth: 'none',
        flexShrink: 0,
        userSelect: 'none',
        ...style,
      }}
    />
  )
}

/**
 * Un valor guardado que puede ser un nombre de ícono o un emoji (temáticas,
 * sponsors, lo que eligió el comprador). Si el emoji no tiene ícono, se
 * muestra tal cual.
 */
export function Emoji({
  value,
  size = '1em',
  large,
  className,
  style,
}: Omit<IconProps, 'name' | 'label'> & { value: string | null | undefined }) {
  const name = iconFor(value)
  if (name)
    return <Icon name={name} size={size} large={large} className={className} style={style} />
  if (!value) return null
  return (
    <span
      aria-hidden
      className={className}
      style={{
        fontSize: typeof size === 'number' ? size * 0.85 : undefined,
        lineHeight: 1,
        ...style,
      }}
    >
      {value}
    </span>
  )
}

/**
 * Texto con emojis adentro ("Carta para vos 💌"): los conocidos pasan a ser
 * íconos. El ícono va pegado a la palabra de antes, para que no quede solo en
 * un renglón.
 */
export function EmojiText({
  text,
  size = '1.2em',
}: {
  text: string | null | undefined
  size?: string
}) {
  if (!text) return null
  const parts = splitEmoji(text)
  if (parts.length === 1 && typeof parts[0] === 'string') return <>{text}</>
  const nodes: ReactNode[] = []
  parts.forEach((part, i) => {
    if (typeof part === 'string') {
      // La última palabra se la lleva el ícono que sigue.
      const next = parts[i + 1]
      const tail = next && typeof next !== 'string' ? (part.match(/\S+\s*$/)?.[0] ?? '') : ''
      const head = part.slice(0, part.length - tail.length)
      if (head) nodes.push(<Fragment key={`t${i}`}>{head}</Fragment>)
      if (tail) nodes.push(tail)
      return
    }
    const icon = (
      <Icon
        key={`i${i}`}
        name={part.icon}
        size={size}
        style={{ verticalAlign: '-0.22em', margin: '0 0.04em' }}
      />
    )
    const word = typeof nodes.at(-1) === 'string' ? (nodes.pop() as string) : null
    nodes.push(
      word ? (
        <span key={`i${i}`} style={{ whiteSpace: 'nowrap' }}>
          {word}
          {icon}
        </span>
      ) : (
        icon
      ),
    )
  })
  return <>{nodes}</>
}
