'use client'

import { motion } from 'framer-motion'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  arsToUsdCents,
  formatARS,
  formatMoney as formatMoneyDomain,
  formatUSD,
  type Cents,
  type Currency,
} from '@/domain/money'
import { cn } from '@/ui/cn'
import { spring } from '@/ui/motion'

interface CurrencyContextValue {
  currency: Currency
  setCurrency: (currency: Currency) => void
  toggleCurrency: () => void
  rate: number
  formatPrice: (arsCents: Cents) => string
  formatRaw: (arsCents: Cents) => {
    formatted: string
    currency: Currency
    usdCents?: Cents
    arsCents: Cents
  }
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

const STORAGE_KEY = 'boxie_preferred_currency'

export function CurrencyProvider({
  children,
  initialRate = 1500,
}: {
  children: ReactNode
  initialRate?: number
}) {
  const [currency, setCurrencyState] = useState<Currency>('ARS')
  const [rate, setRate] = useState<number>(initialRate)

  // Sincronizar preferencia guardada del usuario en localStorage
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved === 'USD' || saved === 'ARS') {
          setCurrencyState(saved)
        }
      } catch {
        // Sin acceso a localStorage (ej: modo incógnito estricto)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  // Si initialRate no vino o queremos refrescar
  useEffect(() => {
    if (!initialRate || initialRate <= 0) {
      void fetch('/api/currency/rate')
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { rate?: number } | null) => {
          if (data?.rate && data.rate > 0) setRate(data.rate)
        })
        .catch(() => {})
    }
  }, [initialRate])

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c)
    try {
      localStorage.setItem(STORAGE_KEY, c)
    } catch {}
  }, [])

  const toggleCurrency = useCallback(() => {
    setCurrencyState((prev) => {
      const next = prev === 'ARS' ? 'USD' : 'ARS'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {}
      return next
    })
  }, [])

  const formatPrice = useCallback(
    (arsCents: Cents) => {
      return formatMoneyDomain(arsCents, currency, rate)
    },
    [currency, rate],
  )

  const formatRaw = useCallback(
    (arsCents: Cents) => {
      const isUsd = currency === 'USD'
      const usdCents = isUsd ? arsToUsdCents(arsCents, rate) : undefined
      const formatted = isUsd && usdCents !== undefined ? formatUSD(usdCents) : formatARS(arsCents)
      return { formatted, currency, usdCents, arsCents }
    },
    [currency, rate],
  )

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      toggleCurrency,
      rate,
      formatPrice,
      formatRaw,
    }),
    [currency, setCurrency, toggleCurrency, rate, formatPrice, formatRaw],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (!ctx) {
    // Fallback seguro si se usa fuera de CurrencyProvider (ej. en tests)
    return {
      currency: 'ARS',
      setCurrency: () => {},
      toggleCurrency: () => {},
      rate: 1500,
      formatPrice: (c: Cents) => formatARS(c),
      formatRaw: (c: Cents) => ({ formatted: formatARS(c), currency: 'ARS', arsCents: c }),
    }
  }
  return ctx
}

/**
 * Toggle visual y accesible para alternar entre ARS y USD.
 */
export function CurrencyToggle({
  size = 'md',
  className,
  variant = 'default',
}: {
  size?: 'sm' | 'md'
  className?: string
  variant?: 'default' | 'brand' | 'subtle'
}) {
  const instanceId = useId()
  const { currency, setCurrency } = useCurrency()

  const isSmall = size === 'sm'

  return (
    <div
      role="radiogroup"
      aria-label="Moneda de visualización"
      className={cn(
        'relative inline-flex items-center rounded-full border border-neutral-200/90 bg-neutral-100 p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] select-none',
        className,
      )}
    >
      {(['ARS', 'USD'] as const).map((curr) => {
        const active = currency === curr
        return (
          <button
            key={curr}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setCurrency(curr)}
            className={cn(
              'relative z-10 rounded-full font-bold transition-colors duration-150',
              isSmall ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1 text-xs',
              active ? 'text-white' : 'text-ink/65 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`currency-pill-${instanceId}`}
                className={cn(
                  'absolute inset-0 rounded-full shadow-sm',
                  variant === 'brand'
                    ? 'bg-brand shadow-[0_2px_8px_rgba(244,78,99,0.35)]'
                    : 'bg-ink shadow-[0_2px_6px_rgba(27,24,33,0.25)]',
                )}
                transition={spring.snappy}
                aria-hidden
              />
            )}
            <span className="relative z-10">{curr}</span>
          </button>
        )
      })}
    </div>
  )
}
