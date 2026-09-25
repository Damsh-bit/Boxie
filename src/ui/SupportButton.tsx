'use client'

import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import type { ComponentProps } from 'react'
import { Button } from './Button'
import { openSupport, supportPageHref, type OpenSupportDetail } from './support-bridge'

/**
 * Un botón que abre el chat de soporte (el widget flotante) en un tema. Si
 * el widget no está en la página, lleva a /soporte con el formulario abierto.
 */
export function SupportButton({
  detail,
  onClick,
  ...props
}: ComponentProps<typeof Button> & { detail?: OpenSupportDetail }) {
  const router = useRouter()
  return (
    <Button
      type="button"
      onClick={(e) => {
        onClick?.(e)
        if (!openSupport(detail)) router.push(supportPageHref(detail) as Route)
      }}
      {...props}
    />
  )
}
