'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { cn } from '@/ui/cn'
import { FieldMessage } from '@/ui/form'
import { AutoHeight, ease, Notice, Spinner, spring } from '@/ui/motion'
import type { BuyerPhoto } from '../fields'
import { compressImage, ImageError, type CompressedImage } from './compress-image'
import type { UploadResult } from './contract'

/** Cómo se suben y se muestran las fotos: el editor real las manda al servidor, el de prueba las guarda en el navegador. */
export interface MediaAdapter {
  upload(image: CompressedImage, onProgress: (fraction: number) => void): Promise<UploadResult>
  resolve(ref: BuyerPhoto | null | undefined): string | undefined
}

interface Props {
  id: string
  value: BuyerPhoto | null
  onChange(value: BuyerPhoto | null): void
  media?: MediaAdapter
  disabled?: boolean
  describedBy?: string
}

type Phase = { step: 'idle' } | { step: 'optimizing' } | { step: 'uploading'; progress: number }

const swap = {
  initial: { opacity: 0, scale: 0.97, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: -6 },
  transition: { duration: 0.25, ease: ease.out },
}

export function PhotoField({ id, value, onChange, media, disabled, describedBy }: Props) {
  const [phase, setPhase] = useState<Phase>({ step: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const url = media?.resolve(value)
  const busy = phase.step !== 'idle'

  async function handle(file: File | undefined) {
    if (!file || !media || busy) return
    setError(null)
    setPhase({ step: 'optimizing' })
    try {
      const image = await compressImage(file)
      setPhase({ step: 'uploading', progress: 0 })
      const result = await media.upload(image, (progress) =>
        setPhase({ step: 'uploading', progress }),
      )
      if (result.ok) onChange(result.photo)
      else setError(result.error)
    } catch (e) {
      setError(
        e instanceof ImageError
          ? e.message
          : 'No pudimos subir la foto. Probá de nuevo en un rato.',
      )
    } finally {
      setPhase({ step: 'idle' })
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!disabled) void handle(e.dataTransfer.files[0])
  }

  if (!media) {
    return (
      <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
        Las fotos se cargan desde el editor de la Boxie.
      </p>
    )
  }

  const input = (
    <input
      id={id}
      type="file"
      accept="image/*"
      className="sr-only"
      disabled={disabled || busy}
      aria-describedby={describedBy}
      onChange={(e) => {
        void handle(e.target.files?.[0])
        e.target.value = ''
      }}
    />
  )

  const percent = phase.step === 'uploading' ? Math.round(phase.progress * 100) : 0
  const state = busy ? 'busy' : value && url ? 'loaded' : 'empty'

  return (
    <div>
      <AutoHeight>
        <AnimatePresence mode="wait" initial={false}>
          {state === 'busy' && (
            <Notice.div
              key="busy"
              {...swap}
              className="flex items-center gap-4 rounded-2xl border border-brand-muted bg-brand-soft p-4"
            >
              <Spinner className="size-6 text-brand" />
              <div className="flex-1" role="status">
                <p className="text-sm font-semibold text-ink">
                  {phase.step === 'optimizing' ? 'Optimizando la foto…' : `Subiendo… ${percent}%`}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                  <motion.div
                    className="h-full rounded-full bg-brand"
                    initial={{ width: '6%' }}
                    animate={{ width: `${Math.max(8, percent)}%` }}
                    transition={spring.soft}
                  />
                </div>
              </div>
            </Notice.div>
          )}

          {state === 'loaded' && (
            <motion.div
              key={`loaded-${value?.assetId}`}
              {...swap}
              className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3"
            >
              <motion.img
                src={url}
                alt="Foto elegida"
                className="size-20 shrink-0 rounded-xl object-cover shadow-sm"
                initial={{ scale: 0.6, rotate: -6, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ ...spring.bouncy, delay: 0.05 }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-green-700">✓ Foto cargada</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <motion.label
                    htmlFor={id}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand hover:text-brand',
                      disabled && 'pointer-events-none opacity-50',
                    )}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RefreshCw className="size-3.5" aria-hidden /> Cambiar
                  </motion.label>
                  <motion.button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(null)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    whileTap={{ scale: 0.95 }}
                  >
                    <Trash2 className="size-3.5" aria-hidden /> Quitar
                  </motion.button>
                </div>
              </div>
              {input}
            </motion.div>
          )}

          {state === 'empty' && (
            <motion.label
              key="empty"
              {...swap}
              htmlFor={id}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors duration-300',
                dragging
                  ? 'border-brand bg-brand-soft'
                  : 'border-neutral-300 bg-neutral-50 hover:border-brand hover:bg-brand-soft',
                disabled && 'pointer-events-none opacity-50',
              )}
              whileTap={{ scale: 0.98 }}
            >
              <motion.span
                className="grid size-12 place-items-center rounded-2xl bg-white text-brand shadow-sm"
                animate={
                  dragging ? { scale: 1.15, y: -4, rotate: -6 } : { scale: 1, y: 0, rotate: 0 }
                }
                whileHover={{ y: -3, rotate: -4 }}
                transition={spring.bouncy}
              >
                <ImagePlus className="size-6" aria-hidden />
              </motion.span>
              <span className="mt-1 font-semibold text-ink">
                {dragging ? '¡Soltala acá!' : value ? 'Volvé a subir la foto' : 'Subir foto'}
              </span>
              <span className="text-xs text-neutral-500">
                o arrastrala acá · la achicamos automáticamente
              </span>
              {input}
            </motion.label>
          )}
        </AnimatePresence>
      </AutoHeight>
      <FieldMessage error={error} className="mt-2" />
    </div>
  )
}
