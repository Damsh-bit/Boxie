import type { ParsedThemeConfig } from './config'
import { initialBuyerProps } from './schemas'

/**
 * Contenido de ejemplo para mostrar una temática como si fuera un regalo
 * real ("Ver cómo queda", la vista previa del panel). Las fotos son de
 * Unsplash; en un regalo de verdad son las que sube el comprador. No importa
 * nada del servidor: lo usan también los componentes del panel.
 */

const PHOTOS = {
  dedication: '5a5a5a5a-1111-4111-8111-111111111111',
  anecdote: '5a5a5a5a-2222-4222-8222-222222222222',
  couple: '5a5a5a5a-3333-4333-8333-333333333333',
  together: '5a5a5a5a-4444-4444-8444-444444444444',
}

const isLove = (props: unknown) => (props as { look?: string } | null)?.look === 'pareja'

export function sampleGift(
  config: ParsedThemeConfig,
  names: { recipientName?: string; senderName?: string } = {},
) {
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
    // Pantallas nuevas de Ribbly: lo mínimo para que el ejemplo se vea completo.
    if (slide.kind === 'cover.cake') {
      content[slide.key] = { age: '28', treatment: 'ella', birthday: '14/05' }
    }
    if (slide.kind === 'media.video') {
      content[slide.key] = { youtubeUrl: 'https://youtu.be/450p7goxZqg', songTitle: 'All of Me' }
    }
    if (slide.kind === 'outro.finale') {
      content[slide.key] = isLove(slide.props)
        ? { gift: '2 entradas para el recital', giftDetail: 'Sábado · 21 h · Campo VIP 🎟️' }
        : { gift: 'Gift card para tu librería favorita 📚' }
    }
    // Pareja: las fotos de ellos (en Cumpleaños se ven las escenas de ejemplo).
    if (slide.kind === 'cover.edition') {
      content[slide.key] = { photo: { assetId: PHOTOS.dedication }, since: '14/02/2022' }
    }
    if (slide.kind === 'story.moments' && !isLove(slide.props)) {
      content[slide.key] = {
        moments: [
          { photo: { assetId: PHOTOS.anecdote }, year: '2022', caption: 'Mendoza 🍇' },
          { photo: { assetId: PHOTOS.dedication }, year: '2023', caption: 'La nieve ❄️' },
          { photo: { assetId: PHOTOS.couple }, year: '2024', caption: 'El recital' },
          { photo: { assetId: PHOTOS.together }, year: '2025', caption: 'Atardecer' },
        ],
      }
    }
    if (slide.kind === 'story.moments' && isLove(slide.props)) {
      content[slide.key] = {
        moments: [
          { photo: { assetId: PHOTOS.anecdote }, year: '2021', caption: 'Mendoza 🍇' },
          {
            photo: { assetId: PHOTOS.dedication },
            year: '2023',
            caption: 'Nuestro primer viaje ✈️',
          },
          { photo: { assetId: PHOTOS.couple }, year: '2025', caption: 'Atardecer en la costa' },
          { photo: { assetId: PHOTOS.together }, year: '2026', caption: 'Nuestro lugar' },
        ],
      }
    }
    if (slide.kind === 'story.memory' && isLove(slide.props)) {
      content[slide.key] = { photo: { assetId: PHOTOS.anecdote } }
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
    recipientName: names.recipientName || 'Sofía',
    senderName: names.senderName || 'Lean',
    content,
    media: {
      [PHOTOS.dedication]:
        'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1200&auto=format&fit=crop',
      [PHOTOS.anecdote]:
        'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1200&auto=format&fit=crop',
      [PHOTOS.couple]:
        'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1200&auto=format&fit=crop',
      [PHOTOS.together]:
        'https://images.unsplash.com/photo-1529619768328-e37af76c6fe5?q=80&w=1200&auto=format&fit=crop',
    },
  }
}
