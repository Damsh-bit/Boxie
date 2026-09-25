'use client'

import { useCallback, useState, useTransition } from 'react'
import type { ActionResult } from '../_lib/action-result'
import { useToast } from './Toast'

/**
 * Corre una Server Action del panel y avisa el resultado. Devuelve el
 * resultado para que el formulario muestre los errores por campo.
 */
export function useAdminAction() {
  const toast = useToast()
  const [pending, start] = useTransition()
  const [fields, setFields] = useState<Record<string, string>>({})

  const run = useCallback(
    <T>(
      action: () => Promise<ActionResult<T>>,
      options: {
        success?: string
        onSuccess?: (data: T | undefined) => void
        quiet?: boolean
      } = {},
    ) =>
      new Promise<ActionResult<T>>((resolve) => {
        start(async () => {
          const result = await action()
          if (result.ok) {
            setFields({})
            if (!options.quiet) toast.success(result.message ?? options.success ?? 'Listo')
            options.onSuccess?.(result.data)
          } else {
            setFields(result.fields ?? {})
            toast.error(result.error)
          }
          resolve(result)
        })
      }),
    [toast],
  )

  return { run, pending, fields, setFields }
}
