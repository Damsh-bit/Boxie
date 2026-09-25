'use client'

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/ui/Button'
import { Modal } from '@/ui/Modal'

interface ConfirmOptions {
  title: string
  description?: ReactNode
  confirm?: string
  cancel?: string
  danger?: boolean
  icon?: ReactNode
}

type Ask = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<Ask | null>(null)

/**
 * Confirmaciones propias (no `window.confirm`): mismo diálogo de la casa, con
 * el botón peligroso en rojo. `await confirm({...})` devuelve true o false.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const ask = useCallback<Ask>(
    (next) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve
        setOptions(next)
      }),
    [],
  )

  const close = (value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOptions(null)
  }

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <Modal
        open={options !== null}
        onOpenChange={(open) => !open && close(false)}
        title={options?.title ?? ''}
        description={options?.description}
        icon={options?.icon}
      >
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => close(false)}>
            {options?.cancel ?? 'Cancelar'}
          </Button>
          <Button variant={options?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
            {options?.confirm ?? 'Confirmar'}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext)
  if (!ask) throw new Error('useConfirm fuera de <ConfirmProvider>')
  return ask
}
