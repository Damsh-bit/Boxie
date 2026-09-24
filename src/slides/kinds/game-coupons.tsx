import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { LogoPattern } from '../player/effects'
import { Appear, ease, frames, Loop, spring } from './motion'
import type { Props } from './shared'

interface Ticket {
  id: number
  icon: string
  title: string
  detail: string
  color: string
}

/**
 * Cuponera. En el prototipo el comprador cargaba 8 vales en el editor y el
 * player los ignoraba: mostraba siempre los mismos 6 de ejemplo. Acá se
 * muestran los del comprador; los de ejemplo quedan si no cargó ninguno.
 */
export function GameCoupons({ theme, buyer, ctx }: Props<'game.coupons'>) {
  const active = ctx.active
  const [open, setOpen] = useState<Ticket | null>(null)
  const [read, setRead] = useState<number[]>([])

  const styles = theme.examples.length
    ? theme.examples
    : [{ icon: '🎁', title: '', detail: '', color: '#FF9A9E' }]
  const own = buyer.coupons.filter((c) => c.title.trim())
  const tickets: Ticket[] = own.length
    ? own.map((c, i) => {
        const style = styles[i % styles.length]!
        return {
          id: i,
          icon: style.icon,
          color: style.color,
          title: c.title,
          detail: c.detail.trim() || theme.fallbackDetail,
        }
      })
    : styles.map((s, i) => ({ id: i, ...s }))

  const close = () => {
    if (open && !read.includes(open.id)) setRead((r) => [...r, open.id])
    setOpen(null)
  }

  return (
    <div className="bx-coupons">
      <LogoPattern logoUrl={ctx.logoUrl} />
      <div style={{ position: 'relative', zIndex: 2, marginBottom: 20, textAlign: 'center' }}>
        <Loop
          active={active}
          duration={3}
          frames={frames.float(8, -6)}
          style={{ fontSize: '3rem', filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.1))' }}
        >
          {theme.emoji}
        </Loop>
        <Appear as="h2" active={active} y={14} className="bx-coupons-title">
          {theme.title}
        </Appear>
        <Appear
          as="p"
          active={active}
          delay={0.1}
          y={10}
          style={{ color: '#888', fontSize: '0.9rem' }}
        >
          {theme.subtitle}
        </Appear>
      </div>
      <motion.div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 15,
          padding: '0 20px',
          position: 'relative',
          zIndex: 2,
        }}
        initial="hidden"
        animate={active ? 'show' : 'hidden'}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
        }}
      >
        {tickets.map((t) => {
          const isRead = read.includes(t.id)
          return (
            <motion.button
              type="button"
              key={t.id}
              className="bx-ticket"
              onClick={() => setOpen(t)}
              variants={{
                hidden: { opacity: 0, y: 24, scale: 0.95 },
                show: {
                  opacity: isRead ? 0.8 : 1,
                  y: 0,
                  scale: 1,
                  transition: { duration: 0.5, ease: ease.out },
                },
              }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.95 }}
            >
              <div
                style={{
                  background: `linear-gradient(135deg, ${t.color} 0%, white 150%)`,
                  height: 70,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                }}
              >
                {t.icon}
              </div>
              <div className="bx-ticket-divider" />
              <div
                style={{
                  padding: 10,
                  flex: 1,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    color: '#333',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  {t.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.65rem',
                    color: '#888',
                    marginTop: 5,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  {theme.ctaLabel}
                </p>
              </div>
              <AnimatePresence>
                {isRead && (
                  <motion.div
                    className="bx-ticket-read"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* El sello cae y queda estampado. */}
                    <motion.div
                      initial={{ scale: 2.2, rotate: -35, opacity: 0 }}
                      animate={{ scale: 1, rotate: -15, opacity: 0.8 }}
                      transition={{ ...spring.bouncy, delay: 0.25 }}
                      style={{
                        border: '3px solid #555',
                        color: '#555',
                        padding: '5px 10px',
                        borderRadius: 8,
                        fontWeight: 900,
                        fontSize: '0.9rem',
                      }}
                    >
                      {theme.readLabel}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )
        })}
      </motion.div>
      <AnimatePresence>
        {open && (
          <motion.div
            key="vale"
            className="bx-coupon-overlay"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.05 } }}
          >
            <motion.div
              className="bx-coupon-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ borderTop: `10px solid ${open.color}` }}
              role="dialog"
              aria-modal
              initial={{ opacity: 0, scale: 0.8, y: 40, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.18 } }}
              transition={spring.bouncy}
            >
              <Loop
                active
                delay={0.4}
                duration={1}
                frames={frames.bounce(8)}
                className="bx-coupon-modal-icon"
                style={{ background: open.color }}
              >
                {open.icon}
              </Loop>
              <h3 className="bx-coupon-modal-title">{open.title}</h3>
              <div className="bx-coupon-modal-desc">&quot;{open.detail}&quot;</div>
              <motion.button
                type="button"
                className="bx-coupon-claim"
                onClick={close}
                style={{ background: open.color }}
                whileTap={{ scale: 0.96 }}
              >
                {theme.claimLabel}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
