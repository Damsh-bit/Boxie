import { RichText } from '../RichText'
import type { Props } from './shared'

const CANDLES = [
  { x: 35, y: 40, color: '#FF69B4', delay: 0 },
  { x: 55, y: 35, color: '#4682B4', delay: 0.1 },
  { x: 75, y: 30, color: '#FF69B4', delay: 0.2 },
  { x: 95, y: 35, color: '#4682B4', delay: 0.3 },
  { x: 115, y: 40, color: '#FF69B4', delay: 0.4 },
]

export function CoverBirthday({ theme, ctx }: Props<'cover.birthday'>) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '15%',
          width: '100%',
          textAlign: 'center',
          zIndex: 20,
          animation: ctx.active ? 'bx-cover-pop 0.8s ease-out' : undefined,
        }}
      >
        <h1
          className="bx-font-fredoka"
          style={{
            fontSize: '3.5rem',
            color: 'white',
            textTransform: 'uppercase',
            lineHeight: 0.9,
            margin: 0,
            textShadow: '2px 2px 0px rgba(0,0,0,0.1)',
          }}
        >
          <RichText value={theme.title} marks={{ accent: '' }} />
        </h1>
        <h2
          className="bx-font-fredoka"
          style={{
            fontSize: '4.2rem',
            color: '#FFF9C4',
            margin: '10px 0 0 0',
            textShadow: '3px 3px 0px #F06292',
            overflowWrap: 'anywhere',
            padding: '0 12px',
          }}
        >
          {ctx.recipientName || 'Alguien especial'}
        </h2>
      </div>

      <div
        style={{ width: '100%', height: '65%', position: 'relative', zIndex: 10, marginBottom: -5 }}
      >
        <svg
          viewBox="0 0 300 300"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: '100%',
            height: '100%',
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))',
          }}
          role="img"
          aria-label="Torta de cumpleaños"
        >
          <ellipse cx="150" cy="260" rx="130" ry="30" fill="rgba(0,0,0,0.1)" />
          <path
            d="M40 280 Q 60 250, 80 270 T 120 280"
            fill="none"
            stroke="#4682B4"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle cx="50" cy="275" r="12" fill="#FFC0CB" />

          <g transform="translate(210, 220) rotate(-5) scale(1.1)">
            <path d="M0,20 L40,0 L80,20 L40,40 Z" fill="#87CEEB" />
            <path d="M0,20 L40,40 L40,80 L0,60 Z" fill="#4682B4" />
            <path d="M40,40 L80,20 L80,60 L40,80 Z" fill="#5F9EA0" />
            <path d="M20,10 L60,30 M40,0 L40,40" stroke="#FFC0CB" strokeWidth="6" />
            <path d="M20,10 L20,50" stroke="#FFC0CB" strokeWidth="6" opacity="0.8" />
            <path d="M60,30 L60,70" stroke="#FFC0CB" strokeWidth="6" opacity="0.8" />
            <path
              d="M40,10 C 20,-10, 10,20, 40,20 C 70,20, 60,-10, 40,10"
              fill="#FFC0CB"
              stroke="#F48FB1"
              strokeWidth="2"
            />
          </g>

          <g transform="translate(75, 110) scale(1.1)">
            <ellipse cx="75" cy="140" rx="80" ry="25" fill="#F8C8D8" />
            <ellipse cx="75" cy="135" rx="75" ry="22" fill="#FFFFFF" />
            <path d="M10,80 L10,110 A65,20 0 0,0 140,110 L140,80" fill="#4E342E" />
            <path
              d="M10,95 L10,105 A65,20 0 0,0 140,105 L140,95 A65,20 0 0,1 10,95"
              fill="#FFC0CB"
            />
            <path
              d="M10,80 Q10,105 75,105 Q140,105 140,80 L140,85 Q120,115 100,90 Q80,120 60,95 Q40,115 20,90 Q10,100 10,80 Z"
              fill="#5D4037"
            />
            <ellipse cx="75" cy="80" rx="65" ry="25" fill="#5D4037" />
            <text
              x="75"
              y="90"
              textAnchor="middle"
              fill="white"
              fontSize="16"
              fontFamily="'Brush Script MT', cursive"
              transform="rotate(-3, 75, 90)"
            >
              {theme.cakeLine1}
            </text>
            <text
              x="75"
              y="105"
              textAnchor="middle"
              fill="white"
              fontSize="16"
              fontFamily="'Brush Script MT', cursive"
              transform="rotate(-3, 75, 105)"
            >
              {theme.cakeLine2}
            </text>
            <g transform="translate(0, -10)">
              {CANDLES.map((c) => (
                <g key={c.x}>
                  <rect x={c.x} y={c.y} width="5" height="40" fill={c.color} rx="2" />
                  <circle
                    cx={c.x + 2.5}
                    cy={c.y - 5}
                    r="4"
                    fill="#FFD700"
                    className="bx-flame"
                    style={{ animationDelay: `${c.delay}s` }}
                  />
                </g>
              ))}
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
}
