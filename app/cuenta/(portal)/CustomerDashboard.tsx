'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  Gift,
  Heart,
  MessageCircle,
  PartyPopper,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import { useState, useTransition } from 'react'
import type { CustomerPortalData } from '@/server/customer/data'
import type { CustomerSpecialDate } from '@/server/customer/reminders'
import { giftShareMessage, whatsappShareUrl } from '@/slides/editor/share'
import { Button } from '@/ui/Button'
import { addSpecialDateAction, deleteSpecialDateAction } from './actions'

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

export function CustomerDashboard({ name, data }: { name: string; data: CustomerPortalData }) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  // Form states
  const [formName, setFormName] = useState('')
  const [formOccasion, setFormOccasion] = useState('Cumpleaños')
  const [formDay, setFormDay] = useState(1)
  const [formMonth, setFormMonth] = useState(10)
  const [formNotes, setFormNotes] = useState('')

  const handleCopyLink = (boxieId: string, url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(boxieId)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleSaveDate = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formName.trim()) {
      setFormError('Indicá el nombre de la persona.')
      return
    }

    startTransition(async () => {
      const res = await addSpecialDateAction({
        recipientName: formName.trim(),
        occasion: formOccasion,
        day: Number(formDay),
        month: Number(formMonth),
        notes: formNotes.trim(),
      })

      if (!res.ok) {
        setFormError(res.error || 'Error al guardar la fecha')
      } else {
        setShowForm(false)
        setFormName('')
        setFormNotes('')
      }
    })
  }

  const handleDeleteDate = (dateId: string) => {
    if (!confirm('¿Seguro que querés eliminar este recordatorio?')) return
    startTransition(async () => {
      await deleteSpecialDateAction(dateId)
    })
  }

  const handleQuickSuggest = (recipientName: string) => {
    setFormName(recipientName)
    setFormOccasion('Cumpleaños')
    setShowForm(true)
  }

  // Encontrar agasajados de Boxies que todavía no tienen recordatorio
  const existingNames = new Set(
    (data.specialDates || []).map((d) => d.recipientName.trim().toLowerCase()),
  )
  const suggestedRecipients = data.boxies
    .map((b) => b.recipientName.trim())
    .filter((n) => n && n !== 'Agasajado/a' && !existingNames.has(n.toLowerCase()))
    .filter((v, i, a) => a.indexOf(v) === i) // únicos

  return (
    <div className="space-y-10">
      {/* Encabezado con bienvenida */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            ¡Hola, {name}! 👋
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Acá podés seguir tus regalos, editarlos, compartirlos por WhatsApp y enterarte apenas
            los abran.
          </p>
        </div>

        <Link href="/galeria">
          <Button size="sm" className="gap-2">
            <Gift className="size-4" /> Crear nuevo regalo
          </Button>
        </Link>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              Mis Regalos
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-brand/10 text-brand">
              <Gift className="size-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-ink">{data.stats.totalBoxies}</p>
          <p className="mt-1 text-xs text-neutral-500">Regalos comprados en total</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-emerald-800 uppercase">
              ¡Ya Abiertas!
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
              <PartyPopper className="size-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-emerald-950">
            {data.stats.openedCount}
          </p>
          <p className="mt-1 text-xs text-emerald-700">Abiertas por el agasajado</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-amber-800 uppercase">
              En Edición
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-amber-100 text-amber-600">
              <Edit3 className="size-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-amber-950">
            {data.stats.inDraftCount}
          </p>
          <p className="mt-1 text-xs text-amber-700">Pendientes de finalizar</p>
        </div>
      </div>

      {/* Lista de Boxies */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">Tus Regalos</h2>
          {data.boxies.length > 0 && (
            <span className="text-xs text-neutral-500">{data.boxies.length} en total</span>
          )}
        </div>

        {data.boxies.length === 0 ? (
          <div className="rounded-3xl border border-line bg-white p-12 text-center shadow-sm">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand/10 text-brand">
              <Sparkles className="size-8" />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink">
              Todavía no tenés ningún regalo
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
              Cuando compres tu primer regalo interactivo, vas a poder editar fotos, música y ver
              las visitas desde acá.
            </p>
            <div className="mt-6">
              <Link href="/galeria">
                <Button>Elegir un regalo para preparar</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.boxies.map((boxie) => (
              <motion.div
                key={boxie.id}
                className="flex flex-col justify-between rounded-3xl border border-line bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div>
                  {/* Encabezado de la tarjeta */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-[11px] font-semibold text-neutral-400">
                        {boxie.code}
                      </span>
                      <h3 className="font-display text-lg font-bold text-ink">{boxie.themeName}</h3>
                      <p className="text-xs text-neutral-600">
                        Para: <span className="font-semibold text-ink">{boxie.recipientName}</span>
                      </p>
                    </div>

                    {/* Badge de estado */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        boxie.status === 'opened'
                          ? 'bg-emerald-100 text-emerald-800'
                          : boxie.status === 'ready'
                            ? 'bg-violet-100 text-violet-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {boxie.status === 'opened' ? (
                        <>
                          <PartyPopper className="size-3.5" /> ¡Abierta!
                        </>
                      ) : boxie.status === 'ready' ? (
                        <>
                          <Gift className="size-3.5" /> Lista
                        </>
                      ) : (
                        <>
                          <Edit3 className="size-3.5" /> En edición
                        </>
                      )}
                    </span>
                  </div>

                  {/* Métricas de apertura */}
                  <div className="mt-5 rounded-2xl bg-neutral-50 p-3.5 text-xs text-neutral-600">
                    {boxie.openCount > 0 ? (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-emerald-700">
                          <Eye className="size-4" /> Abierta {boxie.openCount}{' '}
                          {boxie.openCount === 1 ? 'vez' : 'veces'}
                        </span>
                        {boxie.firstOpenedAt && (
                          <span className="text-[11px] text-neutral-400">
                            Primera vez: {new Date(boxie.firstOpenedAt).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-neutral-500">
                        <Calendar className="size-3.5" /> Aún no fue abierta por el agasajado
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
                  {boxie.giftUrl && (
                    <>
                      {/* Botón enviar por WhatsApp */}
                      <a
                        href={whatsappShareUrl(
                          giftShareMessage({
                            recipientName: boxie.recipientName,
                            url: boxie.giftUrl,
                            hasPassword: false,
                          }),
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#20ba5a]"
                      >
                        <MessageCircle className="size-3.5" /> Enviar por WhatsApp
                      </a>

                      {/* Botón copiar link */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(boxie.id, boxie.giftUrl!)}
                        className="gap-1.5 text-xs"
                      >
                        {copiedId === boxie.id ? (
                          <>
                            <Check className="size-3.5 text-emerald-600" /> ¡Link copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" /> Copiar link
                          </>
                        )}
                      </Button>

                      {/* Ver regalo */}
                      <a
                        href={boxie.giftUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-500 transition hover:text-ink"
                      >
                        Ver <ExternalLink className="size-3" />
                      </a>
                    </>
                  )}

                  {/* Si está en edición, permitir continuar editando */}
                  {boxie.status === 'draft' && (
                    <Link href={`/cuenta/boxies/${boxie.id}/editar` as Route}>
                      <Button size="sm" variant="secondary" className="gap-1.5 text-xs">
                        <Edit3 className="size-3.5" /> Seguir editando
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sección de Fechas Especiales y Recordatorios Anuales ──────────────── */}
      <div className="space-y-4 rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎂</span>
              <h2 className="font-display text-xl font-bold text-ink">
                Fechas Especiales y Recordatorios
              </h2>
            </div>
            <p className="mt-1 text-xs text-neutral-600">
              Guardá cumpleaños y aniversarios. Te avisamos 10 días antes por mail con un cupón de{' '}
              <strong>15% OFF (RECORDAR15)</strong> para armarles una nueva sorpresa con descuento.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? 'outline' : 'primary'}
            className="gap-1.5 self-start text-xs sm:self-auto"
          >
            {showForm ? (
              <>
                <X className="size-3.5" /> Cancelar
              </>
            ) : (
              <>
                <Plus className="size-3.5" /> Agregar fecha
              </>
            )}
          </Button>
        </div>

        {/* Sugerencia inteligente de agasajados pasados */}
        {suggestedRecipients.length > 0 && !showForm && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-brand/5 p-3 text-xs text-ink">
            <span className="font-medium text-brand">💡 Sugerencia rápida:</span>
            <span>¿Querés agendar la fecha de</span>
            {suggestedRecipients.slice(0, 3).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleQuickSuggest(r)}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 font-semibold text-brand shadow-xs transition hover:bg-brand hover:text-white"
              >
                + {r}
              </button>
            ))}
            <span>para no olvidarte el año próximo?</span>
          </div>
        )}

        {/* Formulario desplegable para agregar fecha */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              onSubmit={handleSaveDate}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-2xl border border-brand/20 bg-brand/[0.03] p-5"
            >
              <h3 className="font-display text-sm font-bold text-ink">Nuevo Recordatorio Anual</h3>

              {formError && (
                <p className="mt-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">{formError}</p>
              )}

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700">
                    Nombre de la persona
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej: Sofi, Mamá, Lucas"
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink shadow-xs focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-700">Ocasión</label>
                  <select
                    value={formOccasion}
                    onChange={(e) => setFormOccasion(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink shadow-xs focus:border-brand focus:outline-none"
                  >
                    <option value="Cumpleaños">Cumpleaños 🎂</option>
                    <option value="Aniversario">Aniversario ❤️</option>
                    <option value="Día del Amigo">Día del Amigo 🥂</option>
                    <option value="Fecha especial">Otra fecha especial ✨</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700">Día</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      required
                      value={formDay}
                      onChange={(e) => setFormDay(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink shadow-xs focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-700">Mes</label>
                    <select
                      value={formMonth}
                      onChange={(e) => setFormMonth(Number(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink shadow-xs focus:border-brand focus:outline-none"
                    >
                      {MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs font-semibold text-neutral-700">
                  Notas u observaciones (opcional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ej: Le gustan las flores, el año pasado le regalé la temática Pareja"
                  className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink shadow-xs focus:border-brand focus:outline-none"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="gap-1.5 text-xs">
                  {isPending ? 'Guardando...' : 'Guardar recordatorio'}
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Lista de fechas guardadas */}
        {(!data.specialDates || data.specialDates.length === 0) && !showForm ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-8 text-center">
            <p className="text-sm font-semibold text-ink">No tenés fechas guardadas todavía</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500">
              Agregá los cumpleaños y aniversarios de las personas a las que te gusta regalar. Te
              avisamos 10 días antes con el cupón con descuento para que nunca te tome por sorpresa.
            </p>
            <div className="mt-4">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowForm(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="size-3.5" /> Agregar mi primera fecha
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data.specialDates || []).map((date: CustomerSpecialDate) => (
              <div
                key={date.id}
                className="flex items-center justify-between rounded-2xl border border-line bg-neutral-50/50 p-4 transition hover:bg-neutral-50"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-white shadow-xs">
                    {date.occasion === 'Aniversario' ? (
                      <Heart className="size-5 text-rose-500" />
                    ) : (
                      <span className="text-lg">🎂</span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-ink">{date.recipientName}</h4>
                    <p className="text-[11px] text-neutral-500">
                      {date.occasion} · {date.nextDateFormatted}
                    </p>

                    {/* Badge de cuenta regresiva */}
                    <div className="mt-1">
                      {date.status === 'today' ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          ¡Es hoy! 🥳
                        </span>
                      ) : date.status === 'urgent' ? (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                          Faltan {date.daysUntil} días · 15% OFF
                        </span>
                      ) : date.status === 'soon' ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                          En {date.daysUntil} días
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-neutral-200/70 px-2 py-0.5 text-[10px] text-neutral-600">
                          Faltan {date.daysUntil} días
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteDate(date.id)}
                  disabled={isPending}
                  className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                  title="Eliminar recordatorio"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
