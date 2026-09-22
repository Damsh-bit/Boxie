import { Fragment } from 'react'
import type { RichMark, RichText as RichTextValue } from './rich-text'

const DEFAULT_MARK_CLASS: Record<RichMark, string> = {
  accent: 'bx-rt-accent',
  bold: 'bx-rt-bold',
  highlight: 'bx-rt-highlight',
  italic: 'bx-rt-italic',
}

interface Props {
  value: RichTextValue | string | null | undefined
  /** Cada slide decide cómo se ve cada marca (el acento de un título no es el de un párrafo). */
  marks?: Partial<Record<RichMark, string>>
}

export function RichText({ value, marks }: Props) {
  if (!value) return null
  if (typeof value === 'string') return <>{value}</>
  return (
    <>
      {value.v.map((node, i) => {
        if ('br' in node) return <br key={i} />
        if (!node.mark) return <Fragment key={i}>{node.text}</Fragment>
        return (
          <span key={i} className={marks?.[node.mark] ?? DEFAULT_MARK_CLASS[node.mark]}>
            {node.text}
          </span>
        )
      })}
    </>
  )
}
