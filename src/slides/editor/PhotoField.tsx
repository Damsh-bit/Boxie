'use client'

import { ImagePlus, LoaderCircle, RefreshCw, Trash2 } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { cn } from '@/ui/cn'
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

  return (
    <div>
      {busy ? (
        <div className="flex items-center gap-4 rounded-2xl border border-brand-muted bg-brand-soft p-4">
          <LoaderCircle className="size-6 shrink-0 animate-spin text-brand" aria-hidden />
          <div className="flex-1" role="status">
            <p className="text-sm font-semibold text-ink">
              {phase.step === 'optimizing'
                ? 'Optimizando la foto…'
                : `Subiendo… ${Math.round((phase.step === 'uploading' ? phase.progress : 0) * 100)}%`}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-200"
                style={{
                  width: `${phase.step === 'uploading' ? Math.max(8, phase.progress * 100) : 8}%`,
                }}
              />
            </div>
          </div>
        </div>
      ) : value && url ? (
        <div className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
          <img
            src={url}
            alt="Foto elegida"
            className="size-20 shrink-0 rounded-xl object-cover shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-green-700">✓ Foto cargada</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <label
                htmlFor={id}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand hover:text-brand',
                  disabled && 'pointer-events-none opacity-50',
                )}
              >
                <RefreshCw className="size-3.5" aria-hidden /> Cambiar
              </label>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" aria-hidden /> Quitar
              </button>
            </div>
          </div>
          {input}
        </div>
      ) : (
        <label
          htmlFor={id}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition',
            dragging
              ? 'border-brand bg-brand-soft'
              : 'border-neutral-300 bg-neutral-50 hover:border-brand hover:bg-brand-soft',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          <ImagePlus className="size-7 text-brand" aria-hidden />
          <span className="font-semibold text-ink">
            {value ? 'Volvé a subir la foto' : 'Subir foto'}
          </span>
          <span className="text-xs text-neutral-500">
            o arrastrala acá · la achicamos automáticamente
          </span>
          {input}
        </label>
      )}
      {error && (
        <p className="mt-2 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
