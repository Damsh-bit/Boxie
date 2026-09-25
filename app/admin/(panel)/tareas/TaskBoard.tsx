'use client'

import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Plus,
  Timer,
  Trash2,
} from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { formatDate, initials } from '@/domain/admin/format'
import type { TaskInput } from '@/domain/admin/inputs'
import type { AdminTask, TaskPriority, TaskStatus } from '@/domain/admin/types'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Field, Input, Select, Textarea } from '@/ui/form'
import { spring, Spinner } from '@/ui/motion'
import { useConfirm } from '../../_ui/Confirm'
import { ListInput, Segmented } from '../../_ui/fields'
import { Badge, type Tone } from '../../_ui/primitives'
import { Sheet } from '../../_ui/Sheet'
import { useAdminAction } from '../../_ui/use-action'
import { deleteTask, moveTask, saveTask } from './actions'

const COLUMNS: { id: TaskStatus; label: string; icon: typeof Circle; tone: string }[] = [
  { id: 'todo', label: 'Por hacer', icon: Circle, tone: 'text-neutral-500' },
  { id: 'doing', label: 'Haciendo', icon: Timer, tone: 'text-series-2' },
  { id: 'done', label: 'Hecho', icon: CheckCircle2, tone: 'text-good-ink' },
]

const PRIORITY: Record<TaskPriority, { label: string; tone: Tone }> = {
  alta: { label: 'Alta', tone: 'critical' },
  media: { label: 'Media', tone: 'warning' },
  baja: { label: 'Baja', tone: 'neutral' },
}

const todayKey = () =>
  new Date(Date.parse(new Date().toISOString()) - 3 * 3_600_000).toISOString().slice(0, 10)

export function TaskBoard({
  tasks: initial,
  team,
  me,
  openNew,
}: {
  tasks: AdminTask[]
  team: { email: string; name: string }[]
  me: string
  openNew: boolean
}) {
  // Estado optimista: la tarjeta se mueve al instante y el servidor confirma.
  const [tasks, setTasks] = useState(initial)
  const [lastInitial, setLastInitial] = useState(initial)
  if (initial !== lastInitial) {
    setLastInitial(initial)
    setTasks(initial)
  }
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<TaskStatus | null>(null)
  const [editing, setEditing] = useState<TaskInput | null>(
    openNew
      ? {
          title: '',
          description: '',
          status: 'todo',
          priority: 'media',
          assignee: me,
          tags: [],
          dueOn: null,
        }
      : null,
  )
  const { run } = useAdminAction()
  const today = todayKey()

  const move = (id: string, status: TaskStatus, position: number) => {
    setTasks((list) => {
      const task = list.find((t) => t.id === id)
      if (!task) return list
      const rest = list.filter((t) => t.id !== id)
      const column = rest.filter((t) => t.status === status).sort((a, b) => a.position - b.position)
      column.splice(position, 0, { ...task, status })
      const positions = new Map(column.map((t, i) => [t.id, i]))
      return [...rest.filter((t) => t.status !== status), ...column].map((t) =>
        positions.has(t.id)
          ? { ...t, status: t.id === id ? status : t.status, position: positions.get(t.id)! }
          : t,
      )
    })
    void run(() => moveTask(id, status, position), { quiet: true })
  }

  const onDrop = (e: DragEvent, status: TaskStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || dragging
    setOver(null)
    setDragging(null)
    if (!id) return
    const count = tasks.filter((t) => t.status === status && t.id !== id).length
    move(id, status, count)
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          size="sm"
          className="h-10"
          onClick={() =>
            setEditing({
              title: '',
              description: '',
              status: 'todo',
              priority: 'media',
              assignee: me,
              tags: [],
              dueOn: null,
            })
          }
        >
          <Plus className="size-4" aria-hidden /> Nueva tarea
        </Button>
      </div>
      <LayoutGroup>
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map((col, ci) => {
            const items = tasks
              .filter((t) => t.status === col.id)
              .sort((a, b) => a.position - b.position)
            const Icon = col.icon
            return (
              <motion.section
                key={col.id}
                aria-label={col.label}
                className={cn(
                  'flex min-h-72 flex-col rounded-[22px] border-2 border-dashed p-3 transition-colors',
                  over === col.id
                    ? 'border-brand/50 bg-brand-soft/40'
                    : 'border-transparent bg-white/60',
                )}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOver(col.id)
                }}
                onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
                onDrop={(e) => onDrop(e, col.id)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.soft, delay: ci * 0.06 }}
              >
                <header className="mb-3 flex items-center gap-2 px-2 pt-1">
                  <Icon className={cn('size-4', col.tone)} aria-hidden />
                  <h2 className="text-sm font-semibold text-ink">{col.label}</h2>
                  <span className="rounded-full bg-canvas px-2 text-xs font-semibold text-neutral-500 tabular-nums">
                    {items.length}
                  </span>
                </header>
                <ul className="flex flex-1 flex-col gap-2.5">
                  <AnimatePresence initial={false}>
                    {items.map((task) => {
                      const overdue = task.dueOn && task.status !== 'done' && task.dueOn < today
                      const member = team.find((m) => m.email === task.assignee)
                      const colIndex = COLUMNS.findIndex((c) => c.id === task.status)
                      return (
                        <motion.li
                          key={task.id}
                          layout
                          layoutId={task.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: dragging === task.id ? 0.4 : 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={spring.soft}
                        >
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', task.id)
                              e.dataTransfer.effectAllowed = 'move'
                              setDragging(task.id)
                            }}
                            onDragEnd={() => {
                              setDragging(null)
                              setOver(null)
                            }}
                            className="group cursor-grab rounded-2xl border border-line bg-white p-3.5 shadow-[0_1px_2px_rgba(42,36,51,0.04)] transition-shadow hover:shadow-[0_10px_28px_rgba(42,36,51,0.1)] active:cursor-grabbing"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const { createdAt: _c, updatedAt: _u, position: _p, ...rest } = task
                                setEditing(rest)
                              }}
                              className="block w-full text-left"
                            >
                              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                                <Badge tone={PRIORITY[task.priority].tone}>
                                  {PRIORITY[task.priority].label}
                                </Badge>
                                {task.tags.map((tag) => (
                                  <Badge key={tag}>{tag}</Badge>
                                ))}
                              </div>
                              <p
                                className={cn(
                                  'text-sm font-semibold text-ink',
                                  task.status === 'done' && 'text-neutral-500 line-through',
                                )}
                              >
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                                  {task.description}
                                </p>
                              )}
                            </button>
                            <div className="mt-3 flex items-center gap-2">
                              {member && (
                                <span
                                  className="grid size-6 place-items-center rounded-full bg-gradient-to-br from-brand to-lilac text-[10px] font-bold text-white"
                                  title={member.name}
                                >
                                  {initials(member.name)}
                                </span>
                              )}
                              {task.dueOn && (
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 text-xs',
                                    overdue ? 'font-semibold text-critical' : 'text-neutral-500',
                                  )}
                                >
                                  <CalendarDays className="size-3.5" aria-hidden />
                                  {formatDate(`${task.dueOn}T12:00:00-03:00`)}
                                  {overdue && ' · vencida'}
                                </span>
                              )}
                              <span className="ml-auto flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                <button
                                  type="button"
                                  disabled={colIndex === 0}
                                  onClick={() => move(task.id, COLUMNS[colIndex - 1]!.id, 0)}
                                  className="grid size-7 place-items-center rounded-full text-neutral-400 hover:bg-canvas hover:text-ink disabled:hidden"
                                  aria-label={`Mover a ${COLUMNS[colIndex - 1]?.label}`}
                                >
                                  <ArrowLeft className="size-3.5" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  disabled={colIndex === COLUMNS.length - 1}
                                  onClick={() => move(task.id, COLUMNS[colIndex + 1]!.id, 0)}
                                  className="grid size-7 place-items-center rounded-full text-neutral-400 hover:bg-canvas hover:text-ink disabled:hidden"
                                  aria-label={`Mover a ${COLUMNS[colIndex + 1]?.label}`}
                                >
                                  <ArrowRight className="size-3.5" aria-hidden />
                                </button>
                              </span>
                            </div>
                          </div>
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                  {items.length === 0 && (
                    <li className="grid flex-1 place-items-center rounded-2xl border border-dashed border-line p-6 text-center text-xs text-neutral-400">
                      Soltá una tarjeta acá
                    </li>
                  )}
                </ul>
              </motion.section>
            )
          })}
        </div>
      </LayoutGroup>
      <TaskSheet task={editing} team={team} onClose={() => setEditing(null)} />
    </>
  )
}

function TaskSheet({
  task,
  team,
  onClose,
}: {
  task: TaskInput | null
  team: { email: string; name: string }[]
  onClose(): void
}) {
  const [draft, setDraft] = useState(task)
  const [last, setLast] = useState(task)
  if (task !== last) {
    setLast(task)
    setDraft(task)
  }
  const confirm = useConfirm()
  const { run, pending, fields } = useAdminAction()
  if (!draft)
    return (
      <Sheet open={false} onOpenChange={onClose} title="">
        {null}
      </Sheet>
    )
  const set = (patch: Partial<TaskInput>) => setDraft({ ...draft, ...patch })
  return (
    <Sheet
      open={task !== null}
      onOpenChange={(o) => !o && onClose()}
      locked={pending}
      title={draft.id ? 'Tarea' : 'Nueva tarea'}
      footer={
        <>
          {draft.id && (
            <Button
              variant="ghost"
              className="mr-auto text-critical hover:bg-[#fdeaea] hover:text-critical"
              disabled={pending}
              onClick={async () => {
                if (await confirm({ title: '¿Borrar la tarea?', confirm: 'Borrar', danger: true }))
                  void run(() => deleteTask(draft.id!), { onSuccess: onClose })
              }}
            >
              <Trash2 className="size-4" aria-hidden /> Borrar
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            disabled={pending}
            onClick={() => void run(() => saveTask(draft), { onSuccess: onClose })}
          >
            {pending && <Spinner />} Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Qué hay que hacer" htmlFor="t-title" error={fields.title}>
          <Input
            id="t-title"
            autoFocus
            value={draft.title}
            maxLength={120}
            onChange={(e) => set({ title: e.target.value })}
          />
        </Field>
        <Field label="Detalle" htmlFor="t-desc" error={fields.description}>
          <Textarea
            id="t-desc"
            rows={4}
            maxLength={2000}
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </Field>
        <div>
          <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">Estado</p>
          <Segmented
            id="t-status"
            size="sm"
            value={draft.status}
            onChange={(v) => set({ status: v as TaskStatus })}
            options={COLUMNS.map((c) => ({ value: c.id, label: c.label }))}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
            Prioridad
          </p>
          <Segmented
            id="t-priority"
            size="sm"
            value={draft.priority}
            onChange={(v) => set({ priority: v as TaskPriority })}
            options={(['alta', 'media', 'baja'] as const).map((p) => ({
              value: p,
              label: PRIORITY[p].label,
            }))}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Responsable" htmlFor="t-who">
            <Select
              id="t-who"
              value={draft.assignee ?? ''}
              onChange={(e) => set({ assignee: e.target.value || null })}
            >
              <option value="">Sin asignar</option>
              {team.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.name} · {m.email}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Para cuándo" htmlFor="t-due" error={fields.dueOn}>
            <Input
              id="t-due"
              type="date"
              value={draft.dueOn ?? ''}
              onChange={(e) => set({ dueOn: e.target.value || null })}
            />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
            Etiquetas
          </p>
          <ListInput
            values={draft.tags}
            onChange={(tags) => set({ tags })}
            max={6}
            maxLength={24}
            placeholder="marketing, temáticas, pagos…"
          />
        </div>
      </div>
    </Sheet>
  )
}
