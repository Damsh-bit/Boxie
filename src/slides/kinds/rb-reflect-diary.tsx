import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { BuyerPhoto } from '../fields'
import { Confetti, CoupleScene, PETALS } from '../ribbly/art'
import { Btn, Chip, piece, slideOfKind, Stage, T, u, useStored } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { ease, frames, Loop, spring } from './motion'
import type { Props } from './shared'

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

interface Entry {
  text: string
  items: string[]
}

/** Taza de café vista desde arriba, con un corazón en la espuma. */
function Cup() {
  return (
    <svg className="rb-cup" viewBox="0 0 120 120" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="#FBF6EF" />
      <circle cx="60" cy="60" r="44" fill="#fff" />
      <circle cx="60" cy="60" r="36" fill="#7A4A2E" />
      <circle cx="60" cy="60" r="30" fill="#A06A42" />
      <path
        d="M60 74 C48 66 44 60 44 54 C44 48 49 44 54 44 C57 44 59 46 60 48 C61 46 63 44 66 44 C71 44 76 48 76 54 C76 60 72 66 60 74 Z"
        fill="#F3E2CF"
      />
      <path d="M104 46 h12 a8 8 0 0 1 0 28 h-12" fill="none" stroke="#FBF6EF" strokeWidth="7" />
    </svg>
  )
}

/**
 * 16 · Diario: una libreta sobre la mesa con su nombre en la tapa. Adentro,
 * la página para escribir y la lista de lo que quiere recordar, con una foto
 * de ellos pegada. Lo escribe quien recibe y queda en su dispositivo.
 */
export function ReflectDiary({ theme, ctx }: Props<'reflect.diary'>) {
  const active = ctx.active
  const slots = theme.listPlaceholders.length
  const [entry, setEntry] = useStored<Entry>(ctx, 'pagina', { text: '', items: [] })
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Entry>(entry)
  const [saved, setSaved] = useState(false)
  if (!active && open) setOpen(false)

  const today = new Date()
  const date = `${DAYS[today.getDay()]} ${today.getDate()}`
  const momentsKey = slideOfKind(ctx, theme.photoFromKind)
  const moments = momentsKey
    ? (ctx.buyerContent(momentsKey)?.moments as { photo?: BuyerPhoto | null }[] | undefined)
    : undefined
  const photo = ctx.noPhotos ? undefined : ctx.resolveMedia(moments?.find((m) => m.photo)?.photo)
  const written = !!entry.text || entry.items.some(Boolean)

  const begin = () => {
    setDraft({ text: entry.text, items: [...entry.items] })
    setSaved(false)
    setOpen(true)
  }
  const save = () => {
    setEntry({ text: draft.text.trim(), items: draft.items.map((i) => i.trim()) })
    setOpen(false)
    setSaved(!!draft.text.trim() || draft.items.some((i) => i.trim()))
  }
  const setItem = (index: number, value: string) =>
    setDraft((d) => {
      const items = [...d.items]
      items[index] = value
      return { ...d, items }
    })

  return (
    <Stage bg="#7a4e30">
      <div className="rb-bg">
        <i className="rb-wood" />
        <Confetti seed={16} count={8} petals colors={PETALS} opacity={0.85} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!open ? (
          <motion.div
            key="cerrado"
            className="rb-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: active ? 1 : 0, transition: { duration: 0.5 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <Cup />
            <div
              style={{
                alignSelf: 'stretch',
                textAlign: 'left',
                marginTop: u(8),
                paddingRight: u(90),
              }}
            >
              <p className="rb-kicker" style={{ fontSize: u(11) }}>
                <T text={theme.kicker} ctx={ctx} />
              </p>
              <h2
                className="rb-playfair"
                style={{
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontSize: u(40),
                  lineHeight: 1,
                  marginTop: u(10),
                }}
              >
                <T text={theme.title1} ctx={ctx} />
                <br />
                <T text={theme.title2} ctx={ctx} />
              </h2>
              <p
                className="rb-sub"
                style={{ fontSize: u(13), marginTop: u(12), textWrap: 'pretty' }}
              >
                <T text={theme.subtitle} ctx={ctx} />
              </p>
              <p
                className="rb-hand"
                style={{ color: '#FFCCD5', fontSize: u(23), marginTop: u(8), textAlign: 'left' }}
              >
                <T text={theme.phrase} ctx={ctx} />
              </p>
            </div>

            <div className="rb-grow">
              <Loop active={active} duration={6} frames={frames.float(6, 0.8)}>
                <motion.div
                  className="rb-notebook"
                  {...piece(ctx, 'libreta')}
                  initial={false}
                  animate={
                    saved ? { rotate: [-4, -7, -3, -4], scale: [1, 1.04, 1] } : { rotate: -4 }
                  }
                  transition={{ duration: 0.6 }}
                >
                  <i
                    className="rb-mark"
                    style={{ height: u(58), color: 'rgba(120,10,40,0.45)', position: 'relative' }}
                    aria-hidden
                  />
                  <p
                    className="rb-caveat"
                    style={{
                      fontWeight: 600,
                      fontSize: u(23),
                      marginTop: u(14),
                      position: 'relative',
                    }}
                  >
                    <T text={theme.coverLabel} ctx={ctx} />
                  </p>
                  <i className="rb-ribbon-mark" aria-hidden />
                </motion.div>
              </Loop>
              {saved && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { ...spring.pop, delay: 0.3 },
                  }}
                  style={{ marginTop: u(40) }}
                >
                  <Chip mods="is-glass">
                    <T text={theme.savedLabel} ctx={ctx} />
                  </Chip>
                </motion.div>
              )}
            </div>

            <div className="rb-actions">
              <Btn variant="white" onClick={begin} style={{ fontSize: u(15) }}>
                <T text={written ? theme.editLabel : theme.openLabel} ctx={ctx} />
              </Btn>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="abierto"
            className="rb-body"
            style={{ paddingTop: u(64) }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            <motion.div
              className="rb-diary"
              initial={{ y: 60, rotate: 4, opacity: 0, scaleX: 0.6 }}
              animate={{
                y: 0,
                rotate: -1.5,
                opacity: 1,
                scaleX: 1,
                transition: { duration: 0.6, ease: ease.out },
              }}
              exit={{ y: 120, scale: 0.4, opacity: 0, transition: { duration: 0.35 } }}
            >
              <div className="rb-diary-page">
                <div className="rb-diary-photo" {...piece(ctx, 'foto')}>
                  <div
                    style={{ aspectRatio: '1 / 0.9', overflow: 'hidden', background: '#2b1b4e' }}
                  >
                    {photo ? (
                      <img
                        src={photo}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <CoupleScene />
                    )}
                  </div>
                  <p
                    className="rb-caveat"
                    style={{ textAlign: 'center', fontWeight: 600, fontSize: u(15) }}
                  >
                    <T text={theme.photoCaption} ctx={ctx} />
                  </p>
                </div>
                <p
                  className="rb-caveat"
                  style={{ fontWeight: 600, fontSize: u(19), lineHeight: 1.1 }}
                >
                  <T text={theme.listTitle} ctx={ctx} />
                </p>
                <div style={{ display: 'grid', gap: u(4), marginTop: u(6) }}>
                  {theme.listPlaceholders.map((placeholder, i) => (
                    <label key={i} className="rb-diary-item">
                      <span aria-hidden style={{ color: 'var(--rb-coral)' }}>
                        ♡
                      </span>
                      <input
                        className="rb-input"
                        value={draft.items[i] ?? ''}
                        onChange={(e) => setItem(i, e.target.value)}
                        maxLength={40}
                        placeholder={fill(placeholder, ctx.vars)}
                        aria-label={`Cosa para recordar ${i + 1} de ${slots}`}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="rb-diary-page" style={{ paddingLeft: u(16) }}>
                <p
                  className="rb-caveat"
                  style={{ color: 'var(--rb-coral)', fontWeight: 700, fontSize: u(23) }}
                >
                  {date}
                </p>
                <textarea
                  className="rb-input rb-diary-lines rb-scroll"
                  value={draft.text}
                  onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                  maxLength={800}
                  placeholder={fill(theme.placeholder, ctx.vars)}
                  aria-label="Página del diario"
                  autoFocus={!ctx.preview}
                />
              </div>
            </motion.div>

            <div
              className="rb-actions is-row"
              style={{ marginTop: u(18), padding: `0 ${u(30)} 0 0` }}
            >
              <Btn variant="glass" onClick={() => setOpen(false)} style={{ fontSize: u(15) }}>
                <T text={theme.closeLabel} ctx={ctx} />
              </Btn>
              <Btn variant="primary" mods="is-flat" onClick={save} style={{ fontSize: u(15) }}>
                <T text={theme.saveLabel} ctx={ctx} />
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Stage>
  )
}
