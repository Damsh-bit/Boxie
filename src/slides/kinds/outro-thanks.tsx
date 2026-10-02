import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { EmojiText } from '@/ui/Icon'
import { Appear, Pop, spring } from './motion'
import type { Props } from './shared'

export function OutroThanks({ theme, ctx }: Props<'outro.thanks'>) {
  const active = ctx.active
  return (
    <div>
      <Pop as="h1" active={active} from={0.5} style={{ fontSize: '3rem', color: 'white' }}>
        <EmojiText text={theme.title} />
      </Pop>
      <Appear as="p" active={active} delay={0.25} style={{ color: 'white' }}>
        <EmojiText text={theme.text} />
      </Appear>
      <Appear active={active} delay={0.45}>
        <motion.button
          type="button"
          onClick={() => ctx.goTo(0)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={spring.snappy}
          style={{
            background: 'white',
            color: 'var(--bx-primary)',
            padding: '10px 20px',
            borderRadius: 30,
            border: 'none',
            marginTop: 20,
            cursor: 'pointer',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <RotateCcw size={16} /> <EmojiText text={theme.replayLabel} />
        </motion.button>
      </Appear>
    </div>
  )
}
