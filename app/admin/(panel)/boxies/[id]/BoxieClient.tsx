'use client'

import { CalendarPlus, LockOpen, Mail, PencilLine, Send, Undo2 } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { ParsedThemeConfig } from '@/slides/config'
import { Player } from '@/slides/player/Player'
import { sampleGift } from '@/slides/sample'
import { Button } from '@/ui/Button'
import { Field, Input } from '@/ui/form'
import { Spinner } from '@/ui/motion'
import { useConfirm } from '../../../_ui/Confirm'
import { Menu } from '../../../_ui/Menu'
import { Sheet } from '../../../_ui/Sheet'
import { useAdminAction } from '../../../_ui/use-action'
import { extendBoxie, resendBoxieEmail, unlockBoxie, updateBoxieNames } from '../actions'

export function BoxieActions({
  boxie,
  orderId,
}: {
  boxie: {
    id: string
    code: string
    locked: boolean
    refunded: boolean
    recipientName: string
    senderName: string
  }
  orderId: string
}) {
  const router = useRouter()
  const confirm = useConfirm()
  const { run, pending, fields } = useAdminAction()
  const [editing, setEditing] = useState(false)
  const [names, setNames] = useState({ recipient: boxie.recipientName, sender: boxie.senderName })

  const extend = (days: number) => void run(() => extendBoxie(boxie.id, days))

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        className="h-10"
        disabled={pending || boxie.refunded}
        onClick={() => setEditing(true)}
      >
        <PencilLine className="size-4" aria-hidden /> Corregir nombres
      </Button>
      <Menu
        trigger={
          <Button
            variant="secondary"
            size="sm"
            className="h-10"
            disabled={pending || boxie.refunded}
          >
            {pending ? <Spinner /> : <CalendarPlus className="size-4" aria-hidden />} Extender
          </Button>
        }
        items={[7, 15, 30, 60].map((d) => ({
          label: `${d} días más`,
          icon: <CalendarPlus />,
          onSelect: () => extend(d),
        }))}
      />
      <Menu
        trigger={
          <Button
            variant="secondary"
            size="sm"
            className="h-10"
            disabled={pending || boxie.refunded}
          >
            <Send className="size-4" aria-hidden /> Reenviar mail
          </Button>
        }
        items={[
          {
            label: 'El link del editor',
            icon: <Mail />,
            onSelect: () => void run(() => resendBoxieEmail(boxie.id, 'access')),
          },
          {
            label: 'El link del regalo',
            icon: <Mail />,
            disabled: !boxie.locked,
            onSelect: () => void run(() => resendBoxieEmail(boxie.id, 'gift')),
          },
        ]}
      />
      {boxie.locked && !boxie.refunded && (
        <Button
          variant="secondary"
          size="sm"
          className="h-10"
          disabled={pending}
          onClick={async () => {
            const ok = await confirm({
              icon: '🔓',
              title: `¿Desbloquear ${boxie.code}?`,
              description:
                'El comprador vuelve a poder editarla (tiene al menos 7 días). Si ya la regaló, el destinatario ve los cambios cuando la vuelva a bloquear.',
              confirm: 'Desbloquear',
            })
            if (ok) void run(() => unlockBoxie(boxie.id))
          }}
        >
          <LockOpen className="size-4" aria-hidden /> Desbloquear
        </Button>
      )}
      {!boxie.refunded && (
        <Button
          variant="ghost"
          size="sm"
          className="h-10 text-critical hover:bg-[#fdeaea] hover:text-critical"
          onClick={() => router.push(`/admin/ventas/${orderId}` as Route)}
        >
          <Undo2 className="size-4" aria-hidden /> Reembolsar
        </Button>
      )}

      <Sheet
        open={editing}
        onOpenChange={setEditing}
        locked={pending}
        title="Corregir nombres"
        description="Para cuando el comprador se equivocó y ya no puede editar. Se ve en la portada y en la imagen del link."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                void run(() => updateBoxieNames(boxie.id, names.recipient, names.sender), {
                  onSuccess: () => setEditing(false),
                })
              }
            >
              {pending && <Spinner />} Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Para (destinatario)" htmlFor="b-recipient" error={fields.recipientName}>
            <Input
              id="b-recipient"
              value={names.recipient}
              maxLength={40}
              onChange={(e) => setNames({ ...names, recipient: e.target.value })}
            />
          </Field>
          <Field label="De parte de" htmlFor="b-sender" error={fields.senderName}>
            <Input
              id="b-sender"
              value={names.sender}
              maxLength={40}
              onChange={(e) => setNames({ ...names, sender: e.target.value })}
            />
          </Field>
        </div>
      </Sheet>
    </div>
  )
}

/** El regalo tal como lo ve el destinatario (en demo, con contenido de ejemplo). */
export function BoxiePreview({
  config,
  content,
  recipientName,
  senderName,
  empty,
}: {
  config: ParsedThemeConfig
  content: Record<string, Record<string, unknown>>
  recipientName: string
  senderName: string
  empty: boolean
}) {
  const data = useMemo(() => {
    const sample = sampleGift(config, { recipientName, senderName })
    return {
      recipientName: recipientName || 'Quien la recibe',
      senderName: senderName || 'Quien la regala',
      content: empty ? {} : { ...sample.content, ...content },
      media: sample.media,
    }
  }, [config, content, recipientName, senderName, empty])
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">
          Así la ve {recipientName || 'quien la recibe'}
        </p>
        {empty && <span className="text-xs text-neutral-500">Sin contenido todavía</span>}
      </div>
      <div className="mx-auto aspect-[9/19] h-[min(660px,calc(100dvh-12rem))] max-w-full">
        <Player config={config} data={data} variant="embedded" preview />
      </div>
    </div>
  )
}
