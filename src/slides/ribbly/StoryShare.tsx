'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { site } from '@/content/site'
import { SocialIcon } from '@/ui/SocialIcon'
import { spring } from '../player/motion'
import { readFamilies, shareImage, type Families } from './story-image'
import { Sheet } from './ui'

/**
 * Botón "Compartir en Instagram" de las pantallas 03 y 05 de Pareja. Arma la
 * imagen de la historia (1080 × 1920) apenas la pantalla está a la vista, así
 * el toque comparte al instante: los navegadores del teléfono solo abren la
 * hoja de compartir si es enseguida del toque.
 *
 * `draw` dibuja la imagen; `deps` es lo que la cambia (fotos, textos).
 */
export function StoryShare({
  active,
  label,
  fileName,
  draw,
  deps,
  className = '',
}: {
  active: boolean
  label: string
  fileName: string
  draw: (families: Families) => Promise<Blob>
  deps: string
  className?: string
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [image, setImage] = useState<{ deps: string; blob: Blob } | null>(null)
  const [busy, setBusy] = useState(false)
  const [sheet, setSheet] = useState<'downloaded' | 'retry' | 'failed' | null>(null)
  const drawRef = useRef(draw)
  useEffect(() => {
    drawRef.current = draw
  })

  const ready = image?.deps === deps ? image.blob : null

  // Con la pantalla a la vista, la imagen se prepara de fondo.
  useEffect(() => {
    if (!active || ready || !ref.current) return
    let cancelled = false
    drawRef
      .current(readFamilies())
      .then((blob) => {
        if (!cancelled) setImage({ deps, blob })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [active, deps, ready])

  const share = async () => {
    if (busy) return
    setBusy(true)
    try {
      const blob = ready ?? (await drawRef.current(readFamilies()))
      if (!ready) setImage({ deps, blob })
      const result = await shareImage(blob, fileName)
      if (result === 'downloaded' || result === 'retry' || result === 'failed') setSheet(result)
    } catch {
      setSheet('failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <motion.button
        ref={ref}
        type="button"
        className={`rb-ig-share ${className}`}
        onClick={(e) => {
          e.stopPropagation()
          void share()
        }}
        whileTap={{ scale: 0.94 }}
        whileHover={{ y: -2 }}
        transition={spring.snappy}
        aria-busy={busy}
      >
        <span className="rb-ig-share-icon" aria-hidden>
          <SocialIcon network="instagram" size={15} />
        </span>
        {busy && !ready ? 'Preparando…' : label}
      </motion.button>

      <Sheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        icon={<SocialIcon network="instagram" size={40} />}
        title={
          sheet === 'downloaded'
            ? '¡Tu historia está lista!'
            : sheet === 'retry'
              ? 'Ya casi'
              : 'No pudimos armarla'
        }
        closeLabel={sheet === 'retry' ? 'Dale' : '¡Entendido!'}
      >
        {sheet === 'downloaded' ? (
          <>
            Guardamos la imagen en tus descargas. Abrí Instagram, creá una <strong>historia</strong>{' '}
            y elegila de tu galería. Etiquetanos: <strong>{site.instagramHandle}</strong>
          </>
        ) : sheet === 'retry' ? (
          <>
            La imagen ya está lista: tocá <strong>Compartir</strong> otra vez y elegí{' '}
            <strong>Instagram → Historia</strong>.
          </>
        ) : (
          <>
            Hacé una <strong>captura de pantalla</strong> y subila a tus historias. Etiquetanos:{' '}
            <strong>{site.instagramHandle}</strong>
          </>
        )}
      </Sheet>
    </>
  )
}
