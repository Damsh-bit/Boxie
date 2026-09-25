'use client'

import { motion } from 'framer-motion'
import { Check, Copy, Mail, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { formatRelative, initials } from '@/domain/admin/format'
import type { MemberInput } from '@/domain/admin/inputs'
import { ADMIN_ROLES, type AdminRole, type AdminUser } from '@/domain/admin/types'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Field, Input } from '@/ui/form'
import { spring, Spinner } from '@/ui/motion'
import { useConfirm } from '../../_ui/Confirm'
import { Badge, Card, CardHeader } from '../../_ui/primitives'
import { Sheet } from '../../_ui/Sheet'
import { useAdminAction } from '../../_ui/use-action'
import { inviteMember, removeMember, updateMemberRole } from './actions'

const ACCESS: Record<AdminRole, string[]> = {
  owner: ['Todo el panel', 'Equipo y roles', 'Restablecer la demo'],
  admin: ['Todo el panel', 'Finanzas, precios y cupones'],
  editor: ['Temáticas, generador', 'Tareas y actividad'],
  support: ['Ventas, Boxies y clientes', 'Reembolsos y reenvíos'],
}

export function TeamBoard({
  team,
  me,
  canManage,
}: {
  team: AdminUser[]
  me: string
  canManage: boolean
}) {
  const confirm = useConfirm()
  const { run, pending, fields } = useAdminAction()
  const [inviting, setInviting] = useState(false)
  const [draft, setDraft] = useState<MemberInput>({ email: '', name: '', role: 'support' })
  const [inviteUrlResult, setInviteUrlResult] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card padded={false}>
        <div className="flex items-center justify-between gap-3 p-5 pb-3 sm:p-6 sm:pb-3">
          <CardHeader
            className="mb-0"
            title={`${team.length} personas`}
            description="Cada una entra con su mail y su clave."
          />
          {canManage && (
            <Button
              size="sm"
              onClick={() => {
                setInviteUrlResult(null)
                setInviting(true)
              }}
            >
              <UserPlus className="size-4" aria-hidden /> Invitar
            </Button>
          )}
        </div>
        <ul className="divide-y divide-line border-t border-line">
          {team.map((m, i) => (
            <motion.li
              key={m.id}
              className="flex flex-wrap items-center gap-3 px-6 py-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.soft, delay: i * 0.05 }}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-lilac text-sm font-bold text-white">
                {initials(m.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                  {m.name}
                  {m.email === me && <Badge tone="brand">Vos</Badge>}
                  {m.pending && <Badge tone="warning">Invitación pendiente</Badge>}
                </p>
                <p className="truncate text-sm text-neutral-500">{m.email}</p>
                <p className="text-xs text-neutral-400">
                  {m.lastSeenAt ? `Entró ${formatRelative(m.lastSeenAt)}` : 'Todavía no entró'}
                </p>
              </div>
              {canManage && m.email !== me ? (
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    disabled={pending}
                    onChange={(e) => void run(() => updateMemberRole(m.id, e.target.value))}
                    className="h-9 cursor-pointer rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink outline-none hover:border-neutral-300 focus:border-brand"
                    aria-label={`Rol de ${m.name}`}
                  >
                    {ADMIN_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: `¿Sacar a ${m.name} del equipo?`,
                          description:
                            'Deja de poder entrar al panel. Lo que hizo queda en la actividad.',
                          confirm: 'Sacar',
                          danger: true,
                        })
                      )
                        void run(() => removeMember(m.id))
                    }}
                    className="grid size-9 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-[#fdeaea] hover:text-critical"
                    aria-label={`Sacar a ${m.name}`}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              ) : (
                <Badge tone="dark">{ADMIN_ROLES.find((r) => r.value === m.role)?.label}</Badge>
              )}
            </motion.li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader icon={<ShieldCheck />} title="Roles" description="Qué puede hacer cada uno" />
        <ul className="space-y-3">
          {ADMIN_ROLES.map((r) => (
            <li key={r.value} className="rounded-2xl border border-line p-3">
              <p className="font-semibold text-ink">{r.label}</p>
              <p className="text-xs text-neutral-500">{r.description}</p>
              <ul className="mt-2 flex flex-wrap gap-1">
                {ACCESS[r.value].map((a) => (
                  <li key={a}>
                    <Badge>{a}</Badge>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-neutral-500">
          Los permisos se verifican en el servidor en cada acción, no solo escondiendo botones.
        </p>
      </Card>

      <Sheet
        open={inviting}
        onOpenChange={(open) => {
          setInviting(open)
          if (!open) setInviteUrlResult(null)
        }}
        locked={pending}
        title={inviteUrlResult ? 'Invitación enviada' : 'Invitar al equipo'}
        description={
          inviteUrlResult
            ? 'Le enviamos un correo con el link de activación. También podés copiarlo acá abajo.'
            : 'Le llega un mail de Boxie para crear su contraseña y activar su cuenta.'
        }
        footer={
          inviteUrlResult ? (
            <Button
              onClick={() => {
                setInviting(false)
                setInviteUrlResult(null)
              }}
            >
              Listo
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setInviting(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button
                disabled={pending}
                onClick={() =>
                  void run(() => inviteMember(draft), {
                    onSuccess: (data: unknown) => {
                      const res = data as { inviteUrl?: string } | undefined
                      if (res?.inviteUrl) {
                        setInviteUrlResult(res.inviteUrl)
                      } else {
                        setInviting(false)
                      }
                      setDraft({ email: '', name: '', role: 'support' })
                    },
                  })
                }
              >
                {pending ? <Spinner /> : <Mail className="size-4" aria-hidden />} Invitar
              </Button>
            </>
          )
        }
      >
        {inviteUrlResult ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <p className="text-sm font-bold">¡Invitación creada con éxito!</p>
              <p className="mt-1 text-xs text-emerald-700">
                El enlace es válido por 48 horas. Podés copiarlo a continuación para enviarlo
                directamente:
              </p>
            </div>
            <div className="space-y-2">
              <Input readOnly value={inviteUrlResult} className="font-mono text-xs select-all" />
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteUrlResult)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2500)
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? '¡Enlace copiado al portapapeles!' : 'Copiar enlace de invitación'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Nombre" htmlFor="m-name" error={fields.name}>
              <Input
                id="m-name"
                value={draft.name}
                maxLength={80}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field label="Mail" htmlFor="m-email" error={fields.email}>
              <Input
                id="m-email"
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </Field>
            <div>
              <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">Rol</p>
              <div className="grid gap-2">
                {ADMIN_ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setDraft({ ...draft, role: r.value })}
                    className={cn(
                      'rounded-2xl border p-3 text-left transition-colors',
                      draft.role === r.value
                        ? 'border-brand bg-brand-soft/50'
                        : 'border-line hover:border-neutral-300',
                    )}
                    aria-pressed={draft.role === r.value}
                  >
                    <p className="text-sm font-semibold text-ink">{r.label}</p>
                    <p className="text-xs text-neutral-500">{r.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
