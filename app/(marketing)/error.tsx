'use client'

import { motion } from 'framer-motion'
import { Home, LifeBuoy, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'
import { Button, ButtonLink } from '@/ui/Button'
import { spring } from '@/ui/motion'
import { SupportButton } from '@/ui/SupportButton'

/**
 * Algo falló al armar la página (la base no respondió, un error nuestro).
 * Se puede reintentar sin perder la navegación, o avisarnos: el reporte
 * viaja con el código del error para encontrarlo en los logs.
 */
export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center bg-[linear-gradient(180deg,#fff0f3_0%,#ffffff_55%)] px-5 pt-[120px] pb-20 text-center">
      <motion.span
        className="mb-5 text-7xl"
        aria-hidden
        initial={{ scale: 0.3, rotate: -25 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={spring.bouncy}
      >
        🙈
      </motion.span>
      <h1 className="max-w-lg font-display text-4xl leading-tight font-bold text-balance text-ink">
        Uy, algo se trabó
      </h1>
      <p className="mt-3 max-w-md text-lg text-ink/65">
        No pudimos mostrar esta página. Probá de nuevo; si sigue pasando, avisanos y lo arreglamos.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-ink/40">Código: {error.digest}</p>}
      <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        <Button size="lg" onClick={() => reset()}>
          <RotateCcw className="size-5" aria-hidden /> Reintentar
        </Button>
        <ButtonLink href="/" variant="white" size="lg">
          <Home className="size-5 text-brand" aria-hidden /> Ir al inicio
        </ButtonLink>
        <SupportButton
          variant="ghost"
          size="lg"
          detail={{
            topic: 'error',
            message: `La página no cargó${error.digest ? ` (código ${error.digest})` : ''}.`,
          }}
        >
          <LifeBuoy className="size-5" aria-hidden /> Reportar el error
        </SupportButton>
      </div>
    </div>
  )
}
