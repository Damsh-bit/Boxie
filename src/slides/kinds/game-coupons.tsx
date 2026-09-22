import { useState } from 'react'
import { LogoPattern } from '../player/effects'
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
        <div style={{ fontSize: '3rem', filter: 'drop-shadow(0 5px 10px rgba(0,0,0,0.1))' }}>
          {theme.emoji}
        </div>
        <h2 className="bx-coupons-title">{theme.title}</h2>
        <p style={{ color: '#888', fontSize: '0.9rem' }}>{theme.subtitle}</p>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 15,
          padding: '0 20px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {tickets.map((t, i) => {
          const isRead = read.includes(t.id)
          return (
            <button
              type="button"
              key={t.id}
              className="bx-ticket"
              onClick={() => setOpen(t)}
              style={{ animationDelay: `${i * 0.1}s`, opacity: isRead ? 0.8 : 1 }}
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
              {isRead && (
                <div className="bx-ticket-read">
                  <div
                    style={{
                      border: '3px solid #555',
                      color: '#555',
                      padding: '5px 10px',
                      borderRadius: 8,
                      fontWeight: 900,
                      transform: 'rotate(-15deg)',
                      fontSize: '0.9rem',
                      opacity: 0.8,
                    }}
                  >
                    {theme.readLabel}
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
      {open && (
        <div className="bx-coupon-overlay" onClick={close}>
          <div
            className="bx-coupon-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ borderTop: `10px solid ${open.color}` }}
            role="dialog"
            aria-modal
          >
            <div className="bx-coupon-modal-icon" style={{ background: open.color }}>
              {open.icon}
            </div>
            <h3 className="bx-coupon-modal-title">{open.title}</h3>
            <div className="bx-coupon-modal-desc">&quot;{open.detail}&quot;</div>
            <button
              type="button"
              className="bx-coupon-claim"
              onClick={close}
              style={{ background: open.color }}
            >
              {theme.claimLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
