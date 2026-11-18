import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Emoji, EmojiText } from '@/ui/Icon'
import { Burst, Confetti, ROSE } from '../ribbly/art'
import { Btn, Chip, editable, Stage, T, u, useStored } from '../ribbly/ui'
import { shortDate } from '../ribbly/vars'
import { Appear, ease, spring } from './motion'
import type { Props } from './shared'

type Vars = React.CSSProperties & Record<`--${string}`, string>

/**
 * 12 · Vales de cumple. Tres vistas: la grilla, el vale abierto (un ticket
 * que entra girando) y el vale canjeado, con un sello de goma que baja con
 * anticipación, golpe y tinta que se asienta. Lo canjeado queda guardado en
 * el dispositivo de quien recibe.
 */
export function GameVouchers({ theme, buyer, ctx }: Props<'game.vouchers'>) {
  const active = ctx.active
  const calm = useReducedMotion()
  const mine = buyer.vouchers.filter((v) => v.title.trim())
  const styles = theme.examples
  const vouchers = (mine.length ? mine : styles).map((v, i) => {
    const style = styles[i % styles.length]!
    return { title: v.title, detail: v.detail, icon: style.icon, color: style.color }
  })

  /** índice del vale → fecha en que se canjeó. */
  const [redeemed, setRedeemed] = useStored<Record<string, string>>(ctx, 'canjeados', {})
  const [open, setOpen] = useState<number | null>(null)
  const [justRedeemed, setJustRedeemed] = useState(false)
  if (!active && open !== null) setOpen(null)

  const current = open === null ? null : vouchers[open]
  const usedOn = open === null ? undefined : redeemed[String(open)]
  const usedCount = vouchers.filter((_, i) => redeemed[String(i)]).length

  const close = () => {
    setOpen(null)
    setJustRedeemed(false)
  }
  const redeem = () => {
    if (open === null) return
    setRedeemed((map) => ({ ...map, [String(open)]: shortDate() }))
    setJustRedeemed(true)
    if (!calm) setTimeout(() => navigator.vibrate?.(40), 420)
  }

  return (
    <Stage
      tone="soft"
      bg={
        theme.look === 'pareja'
          ? 'linear-gradient(180deg, #FFE4E9 0%, #FFCCD5 55%, #F7A8B8 100%)'
          : 'linear-gradient(180deg, #EAF6FE 0%, #E9E4FA 55%, #F9D5E0 100%)'
      }
      className={theme.look === 'pareja' ? 'is-pareja' : ''}
    >
      <div className="rb-bg">
        <Confetti
          seed={12}
          count={14}
          opacity={0.7}
          colors={theme.look === 'pareja' ? ROSE : undefined}
        />
      </div>

      <div className="rb-body" style={{ color: 'var(--rb-noche)', paddingTop: u(62) }}>
        <Appear active={active} y={-16} className="rb-band">
          <T text={theme.title} ctx={ctx} />
        </Appear>
        <Appear
          as="p"
          active={active}
          delay={0.12}
          className="rb-sub"
          style={{ margin: `${u(14)} 0 ${u(12)}` }}
        >
          <T text={theme.subtitle} ctx={ctx} />
        </Appear>

        <div className="rb-vouchers rb-scroll">
          {vouchers.map((voucher, i) => {
            const used = !!redeemed[String(i)]
            return (
              <Appear
                key={i}
                {...editable(ctx, 'vouchers')}
                active={active}
                delay={0.2 + i * 0.06}
                y={24}
                duration={0.5}
                style={{ display: 'flex' }}
              >
                <motion.button
                  type="button"
                  className={`rb-voucher ${used ? 'is-used' : ''}`}
                  style={{ '--c': voucher.color, flex: 1 } as Vars}
                  onClick={() => setOpen(i)}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ y: -3 }}
                  transition={spring.snappy}
                >
                  <span className="rb-voucher-tab">
                    <span>
                      <T text={theme.tabLabel} ctx={ctx} />
                    </span>
                  </span>
                  <span
                    className="rb-voucher-icon"
                    style={{ filter: used ? 'grayscale(1)' : undefined }}
                  >
                    <Emoji value={voucher.icon} size={u(22)} />
                  </span>
                  <span className="rb-voucher-info">
                    <b>
                      <EmojiText text={voucher.title} />
                    </b>
                    <small>
                      <T text={used ? theme.redeemedLabel : theme.viewLabel} ctx={ctx} />
                    </small>
                  </span>
                </motion.button>
              </Appear>
            )
          })}
        </div>

        <Appear
          active={active && open === null}
          delay={open === null ? 0.7 : 0}
          style={{ marginBottom: u(2), paddingRight: u(26) }}
        >
          <Chip style={{ padding: `${u(9)} ${u(16)}` }}>
            <T
              text={theme.counter}
              ctx={ctx}
              extra={{ n: String(usedCount), total: String(vouchers.length) }}
            />
          </Chip>
        </Appear>
      </div>

      <AnimatePresence>
        {current && open !== null && (
          <motion.div
            key="vale"
            className="rb-ticket-back"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.22 } }}
          >
            {/* "El vale gira 180° al abrirse." */}
            <motion.div
              className="rb-ticket-wrap"
              initial={calm ? { opacity: 0 } : { rotateY: 180, scale: 0.5, y: 60 }}
              animate={{ rotateY: 0, scale: 1, y: 0, opacity: 1, rotate: -2 }}
              exit={{ scale: 0.7, y: 40, opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.7, ease: ease.out }}
            >
              <motion.div
                className="rb-ticket"
                style={{ '--c': current.color } as Vars}
                animate={
                  justRedeemed && !calm ? { y: [0, 0, 7, 0], scale: [1, 1, 0.985, 1] } : undefined
                }
                transition={{ duration: 0.62, times: [0, 0.66, 0.74, 1] }}
              >
                <div className="rb-ticket-top">
                  <p className="rb-kicker" style={{ fontSize: u(11), opacity: 0.85 }}>
                    <T text={theme.ticketKicker} ctx={ctx} />
                  </p>
                  <motion.div
                    style={{ margin: `${u(10)} 0 ${u(6)}` }}
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0, transition: { ...spring.pop, delay: 0.4 } }}
                  >
                    <Emoji value={current.icon} size={u(72)} large />
                  </motion.div>
                  <h3
                    className="rb-title"
                    style={{
                      fontSize: u(current.title.length > 18 ? 22 : 27),
                      overflowWrap: 'anywhere',
                    }}
                  >
                    <EmojiText text={current.title} />
                  </h3>
                  <p className="rb-sub" style={{ marginTop: u(5) }}>
                    <EmojiText text={current.detail || theme.fallbackDetail} />
                  </p>
                </div>
                <div className="rb-ticket-stub">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: u(10) }}>
                    <span style={{ minWidth: 0 }}>
                      <small
                        style={{
                          display: 'block',
                          fontSize: u(10),
                          color: 'var(--rb-tinta-2)',
                          fontWeight: 500,
                        }}
                      >
                        <T text={theme.forLabel} ctx={ctx} />
                      </small>
                      <b className="rb-fredoka" style={{ fontSize: u(18), fontWeight: 600 }}>
                        {ctx.recipientName}
                      </b>
                    </span>
                    <span style={{ minWidth: 0, textAlign: 'right' }}>
                      <small
                        style={{
                          display: 'block',
                          fontSize: u(10),
                          color: 'var(--rb-tinta-2)',
                          fontWeight: 500,
                        }}
                      >
                        <T text={theme.fromLabel} ctx={ctx} />
                      </small>
                      <b
                        className="rb-caveat"
                        style={{ fontSize: u(21), fontWeight: 700, lineHeight: 1 }}
                      >
                        {ctx.senderName}
                      </b>
                    </span>
                  </div>
                  <p style={{ fontSize: u(11), fontWeight: 600, margin: `${u(10)} 0 ${u(8)}` }}>
                    <T
                      text={usedOn ? theme.redeemedOn : theme.validity}
                      ctx={ctx}
                      extra={{ fecha_canje: usedOn ?? '' }}
                    />
                  </p>
                  <i className="rb-barcode" style={{ width: '64%' }} aria-hidden />
                </div>
              </motion.div>

              {/* Sello de goma: se levanta, golpea y se asienta. */}
              {usedOn && (
                <motion.span
                  className="rb-rubber"
                  initial={
                    justRedeemed && !calm
                      ? { x: '-50%', y: '-50%', scale: 2.6, rotate: -22, opacity: 0 }
                      : { x: '-50%', y: '-50%', scale: 1, rotate: -8, opacity: 0.95 }
                  }
                  animate={{
                    x: '-50%',
                    y: '-50%',
                    scale: justRedeemed && !calm ? [2.6, 2.9, 0.9, 1.05, 1] : 1,
                    rotate: -8,
                    opacity: justRedeemed && !calm ? [0, 1, 1, 0.95, 0.95] : 0.95,
                  }}
                  transition={{ duration: 0.75, times: [0, 0.35, 0.6, 0.8, 1], ease: 'easeIn' }}
                >
                  <T text={theme.stamp} ctx={ctx} />
                </motion.span>
              )}
              {justRedeemed && <Burst key="canje" y="40%" count={44} />}
            </motion.div>

            <div style={{ marginTop: 'auto', width: '100%' }}>
              {usedOn ? (
                <>
                  <motion.p
                    className="rb-hand"
                    style={{ fontSize: u(24), marginBottom: u(16) }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: justRedeemed ? 0.8 : 0.3 } }}
                  >
                    <T text={theme.confirm} ctx={ctx} />
                  </motion.p>
                  <div className="rb-actions" style={{ marginTop: 0 }}>
                    <Btn variant="white" mods="is-wide" onClick={close}>
                      <T text={theme.backLabel} ctx={ctx} />
                    </Btn>
                  </div>
                </>
              ) : (
                <div className="rb-actions" style={{ marginTop: 0 }}>
                  <Btn variant="primary" mods="is-wide is-flat" onClick={redeem}>
                    <T text={theme.redeemLabel} ctx={ctx} />
                  </Btn>
                  <Btn variant="glass" mods="is-wide" onClick={close} style={{ fontWeight: 500 }}>
                    <T text={theme.closeLabel} ctx={ctx} />
                  </Btn>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Stage>
  )
}
