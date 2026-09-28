'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Link2 } from 'lucide-react'
import { useState } from 'react'
import { formatARS, formatMultiple, formatNumber, formatPercent } from '@/domain/admin/format'
import {
  abTest,
  buildUtmUrl,
  sampleSizePerVariant,
  slugify,
  UTM_PRESETS,
} from '@/domain/marketing/tools'
import { cn } from '@/ui/cn'
import { Field, Input, Select } from '@/ui/form'
import { spring } from '@/ui/motion'
import { MoneyInput } from '../../../_ui/fields'
import { Metric } from '../_ui/bits'

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-neutral-500">{label}</p>
      <div className="flex items-start gap-2">
        <code className="min-w-0 flex-1 rounded-xl bg-canvas px-3 py-2.5 font-mono text-xs break-all text-ink">
          {value}
        </code>
        <button
          type="button"
          onClick={() =>
            void navigator.clipboard?.writeText(value).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            })
          }
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 text-xs font-semibold text-white transition-colors hover:bg-ink/90"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={copied ? 'ok' : 'copy'}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={spring.snappy}
            >
              {copied ? (
                <Check className="size-3.5" aria-hidden />
              ) : (
                <Copy className="size-3.5" aria-hidden />
              )}
            </motion.span>
          </AnimatePresence>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}

/**
 * Armado de links con UTM: plantilla por plataforma, página de destino y
 * nombre de campaña (de las cargadas o uno nuevo). El link sale normalizado
 * (minúsculas y guiones): así todas las visitas de una campaña caen juntas.
 */
export function UtmBuilder({
  baseUrl,
  destinations,
  campaigns,
}: {
  baseUrl: string
  destinations: { path: string; label: string }[]
  campaigns: { utm: string; name: string }[]
}) {
  const [presetId, setPresetId] = useState(UTM_PRESETS[0]!.id)
  const preset = UTM_PRESETS.find((p) => p.id === presetId)!
  const [path, setPath] = useState(destinations[0]?.path ?? '/')
  const [source, setSource] = useState(preset.source)
  const [medium, setMedium] = useState(preset.medium)
  const [campaign, setCampaign] = useState(campaigns[0]?.utm ?? '')
  const [content, setContent] = useState('')
  const [term, setTerm] = useState('')
  const [coupon, setCoupon] = useState('')

  const base = `${baseUrl}${path}${coupon ? `?cupon=${encodeURIComponent(coupon.toUpperCase())}` : ''}`
  const url = buildUtmUrl(base, { source, medium, campaign, content, term })
  const template = preset.platformTemplate?.replace(
    'NOMBRE-DE-LA-CAMPANA',
    campaign || 'nombre-de-la-campana',
  )

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Field label="Dónde se publica" htmlFor="u-preset">
          <Select
            id="u-preset"
            value={presetId}
            onChange={(e) => {
              const next = UTM_PRESETS.find((p) => p.id === e.target.value)!
              setPresetId(next.id)
              setSource(next.source)
              setMedium(next.medium)
            }}
          >
            {UTM_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Página de destino" htmlFor="u-path">
          <Select id="u-path" value={path} onChange={(e) => setPath(e.target.value)}>
            {destinations.map((d) => (
              <option key={d.path} value={d.path}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Origen (utm_source)" htmlFor="u-source">
            <Input id="u-source" value={source} onChange={(e) => setSource(e.target.value)} />
          </Field>
          <Field label="Medio (utm_medium)" htmlFor="u-medium">
            <Input id="u-medium" value={medium} onChange={(e) => setMedium(e.target.value)} />
          </Field>
        </div>
        <Field
          label="Campaña (utm_campaign)"
          htmlFor="u-campaign"
          hint="Elegí una cargada (así se le atribuyen las ventas) o escribí una nueva."
        >
          <Input
            id="u-campaign"
            list="u-campaigns"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            onBlur={() => setCampaign(slugify(campaign, 80))}
            className="font-mono text-sm"
          />
          <datalist id="u-campaigns">
            {campaigns.map((c) => (
              <option key={c.utm} value={c.utm}>
                {c.name}
              </option>
            ))}
          </datalist>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Pieza (utm_content)"
            htmlFor="u-content"
            hint="El anuncio, la historia o la creadora"
          >
            <Input
              id="u-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="video-reaccion"
            />
          </Field>
          <Field label="Palabra clave (utm_term)" htmlFor="u-term" hint="Opcional, para buscadores">
            <Input
              id="u-term"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="regalo digital"
            />
          </Field>
        </div>
        <Field
          label="Cupón que se aplica solo"
          htmlFor="u-coupon"
          hint="Opcional: se guarda una semana y el checkout lo aplica solo, entre por donde entre"
        >
          <Input
            id="u-coupon"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.replace(/\s/g, ''))}
            placeholder="MAMA15"
            className="uppercase"
          />
        </Field>
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-line p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <Link2 className="size-4 text-brand" aria-hidden /> Tu link
          </p>
          {url ? (
            <CopyField value={url} label="Link con UTM" />
          ) : (
            <p className="text-sm text-critical">La dirección no es válida.</p>
          )}
          {template && (
            <div className="mt-4">
              <CopyField
                value={template}
                label="O pegá esto en la plataforma (etiqueta cada anuncio solo)"
              />
            </div>
          )}
          <p className="mt-3 text-xs text-neutral-500">{preset.tip}</p>
        </div>
        <div className="rounded-2xl bg-canvas p-4 text-sm text-neutral-600">
          <p className="mb-2 font-semibold text-ink">Reglas para que los números cierren</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Siempre en minúsculas y con guiones (el panel ya los normaliza).</li>
            <li>
              Un <code>utm_campaign</code> por campaña, igual al que cargás en Campañas.
            </li>
            <li>
              <code>utm_content</code> para distinguir anuncios: así sabés qué pieza vende.
            </li>
            <li>Nunca uses UTM en links internos del sitio: pisan el origen real.</li>
            <li>
              Los links a WhatsApp, la bio y las difusiones también llevan UTM (si no, caen en
              “Directo”).
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

/** ¿La variante B convierte distinto que la A, o es azar? Y cuántas visitas hacen falta. */
export function AbCalculator() {
  const [a, setA] = useState({ visitors: 4200, conversions: 84 })
  const [b, setB] = useState({ visitors: 4150, conversions: 108 })
  const [base, setBase] = useState(2)
  const [mde, setMde] = useState(20)
  const result = abTest(a, b)
  const needed = sampleSizePerVariant(base / 100, mde / 100)
  const num = (v: string) => Math.max(0, Math.round(Number(v || 0)))
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="grid grid-cols-[auto_1fr_1fr] items-end gap-3">
          <span />
          <p className="text-xs font-semibold text-neutral-500">Visitas</p>
          <p className="text-xs font-semibold text-neutral-500">Ventas</p>
          {(
            [
              ['A', a, setA],
              ['B', b, setB],
            ] as const
          ).map(([name, v, set]) => (
            <div key={name} className="contents">
              <span className="grid size-10 place-items-center rounded-xl bg-canvas font-bold text-ink">
                {name}
              </span>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={`Visitas de ${name}`}
                value={v.visitors}
                onChange={(e) => set({ ...v, visitors: num(e.target.value) })}
                className="tabular-nums"
              />
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={`Ventas de ${name}`}
                value={v.conversions}
                onChange={(e) => set({ ...v, conversions: num(e.target.value) })}
                className="tabular-nums"
              />
            </div>
          ))}
        </div>
        {result && (
          <motion.div
            layout
            transition={spring.soft}
            className={cn(
              'mt-4 rounded-2xl p-4',
              result.significant ? 'bg-[#e7f6e7]' : 'bg-canvas',
            )}
          >
            <p className={cn('font-semibold', result.significant ? 'text-good-ink' : 'text-ink')}>
              {result.significant
                ? `Gana ${result.winner} con ${formatPercent(result.confidence, 1)} de confianza`
                : 'Todavía no se puede decir: puede ser azar'}
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              A convierte {formatPercent(result.rateA, 2)} · B {formatPercent(result.rateB, 2)} (
              {result.uplift === null
                ? '—'
                : `${result.uplift >= 0 ? '+' : ''}${formatPercent(result.uplift, 1)}`}
              ).
              {!result.significant && ' Dejá correr la prueba hasta tener más visitas.'}
            </p>
          </motion.div>
        )}
      </div>
      <div className="rounded-2xl border border-line p-4">
        <p className="text-sm font-semibold text-ink">¿Cuántas visitas necesito?</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Conversión de hoy (%)" htmlFor="ab-base">
            <Input
              id="ab-base"
              type="number"
              step="0.1"
              min={0.1}
              value={base}
              onChange={(e) => setBase(Number(e.target.value || 0))}
            />
          </Field>
          <Field label="Mejora a detectar (%)" htmlFor="ab-mde">
            <Input
              id="ab-mde"
              type="number"
              step="1"
              min={1}
              value={mde}
              onChange={(e) => setMde(Number(e.target.value || 0))}
            />
          </Field>
        </div>
        <p className="mt-4 text-3xl font-semibold text-ink">
          {needed === null ? '—' : formatNumber(needed)}
          <span className="ml-2 text-sm font-normal text-neutral-500">visitas por variante</span>
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Con 95 % de confianza y 80 % de potencia. Cuanto más chica la mejora que querés ver, más
          visitas hacen falta: probá cambios grandes (precio, oferta, primera pantalla).
        </p>
      </div>
    </div>
  )
}

/** Calculadora rápida: con la inversión, las ventas y el ticket, todos los indicadores. */
export function QuickCalculator({ contributionMargin }: { contributionMargin: number }) {
  const [spend, setSpend] = useState(15_000_000)
  const [sales, setSales] = useState(80)
  const [ticket, setTicket] = useState(499_000)
  const [clicks, setClicks] = useState(5200)
  const revenue = sales * ticket
  const cpa = sales ? spend / sales : null
  const roas = spend ? revenue / spend : null
  const poas = spend ? (revenue * contributionMargin) / spend : null
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Inversión" htmlFor="q-spend">
          <MoneyInput id="q-spend" cents={spend} onChange={(v) => setSpend(v ?? 0)} />
        </Field>
        <Field label="Ventas" htmlFor="q-sales">
          <Input
            id="q-sales"
            type="number"
            min={0}
            value={sales}
            onChange={(e) => setSales(Math.max(0, Math.round(Number(e.target.value || 0))))}
          />
        </Field>
        <Field label="Ticket promedio" htmlFor="q-ticket">
          <MoneyInput id="q-ticket" cents={ticket} onChange={(v) => setTicket(v ?? 0)} />
        </Field>
        <Field label="Clics" htmlFor="q-clicks">
          <Input
            id="q-clicks"
            type="number"
            min={0}
            value={clicks}
            onChange={(e) => setClicks(Math.max(0, Math.round(Number(e.target.value || 0))))}
          />
        </Field>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="CPA" value={cpa === null ? '—' : formatARS(Math.round(cpa / 100) * 100)} />
        <Metric label="ROAS" value={formatMultiple(roas)} />
        <Metric
          label="POAS"
          value={formatMultiple(poas)}
          hint={`margen ${formatPercent(contributionMargin, 0)}`}
        />
        <Metric
          label="CPC"
          value={clicks ? formatARS(Math.round(spend / clicks / 100) * 100) : '—'}
        />
        <Metric label="Conv. del clic" value={clicks ? formatPercent(sales / clicks, 2) : '—'} />
      </div>
    </div>
  )
}
