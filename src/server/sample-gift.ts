import 'server-only'
import type { ParsedThemeConfig } from '@/slides/config'
import { initialBuyerProps } from '@/slides/schemas'

/**
 * Contenido de ejemplo para mostrar una temática como si fuera un regalo
 * real ("Ver cómo queda"). Las fotos son de Unsplash; en un regalo de verdad
 * son las que sube el comprador.
 */

const PHOTOS = {
  dedication: '5a5a5a5a-1111-4111-8111-111111111111',
  anecdote: '5a5a5a5a-2222-4222-8222-222222222222',
}

export function sampleGift(config: ParsedThemeConfig) {
  const content: Record<string, Record<string, unknown>> = {}
  for (const slide of config.slides) {
    content[slide.key] = initialBuyerProps(slide.kind, slide.props as Record<string, unknown>)
    if (slide.kind === 'story.dedication') {
      content[slide.key] = {
        text: 'Gracias por cada risa, cada abrazo y cada día. Este regalo es para recordarte lo mucho que te quiero.',
        photo: { assetId: PHOTOS.dedication },
      }
    }
    if (slide.kind === 'media.song') {
      content[slide.key] = { youtubeUrl: 'https://youtu.be/450p7goxZqg', songTitle: 'All of Me' }
    }
    if (slide.kind === 'story.anecdote') {
      content[slide.key] = {
        title: 'El viaje a Mendoza',
        text: 'Nos perdimos tres veces, llegamos tarde a todo y fue el mejor finde de nuestras vidas.',
        photo: { assetId: PHOTOS.anecdote },
      }
    }
  }
  return {
    recipientName: 'Sofía',
    senderName: 'Lean',
    content,
    media: {
      [PHOTOS.dedication]:
        'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1200&auto=format&fit=crop',
      [PHOTOS.anecdote]:
        'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1200&auto=format&fit=crop',
    },
  }
}
