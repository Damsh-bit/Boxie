import type { Route } from 'next'
import type { ReactNode } from 'react'
import { ButtonLink } from '@/ui/Button'
import { SupportButton } from '@/ui/SupportButton'
import type { OpenSupportDetail } from '@/ui/support-bridge'

/** Los botones de las páginas de resultado del pago: la acción principal y la ayuda. */
export function ResultActions({
  primary,
  secondary,
  support,
}: {
  primary: { href: Route; label: ReactNode }
  secondary?: { href: Route; label: ReactNode }
  support: OpenSupportDetail & { label: string }
}) {
  const { label, ...detail } = support
  return (
    <div className="mt-7 flex flex-col gap-3">
      <ButtonLink href={primary.href} size="lg" block>
        {primary.label}
      </ButtonLink>
      {secondary && (
        <ButtonLink href={secondary.href} variant="secondary" size="lg" block>
          {secondary.label}
        </ButtonLink>
      )}
      <SupportButton variant="ghost" size="md" detail={detail} className="text-ink/70">
        {label}
      </SupportButton>
    </div>
  )
}
