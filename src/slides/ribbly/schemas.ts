import { z } from 'zod'
import { field } from '../fields'
import type { SlideDefinition, SlideVariant } from '../types'

/**
 * El contrato de las pantallas nuevas de Ribbly (base de pantallas de
 * Cumpleaños, 20 pantallas / 34 vistas). Como en schemas.ts: `themeSchema` es
 * lo que edita el admin (los textos del diseño son los valores por defecto) y
 * `buyerSchema` lo que carga quien regala.
 *
 * Los textos aceptan {{variables}}: {{nombre}}, {{de}}, {{edad}},
 * {{edad_siguiente}}, {{anio}}, {{anio_anterior}}, {{fecha_proximo_cumple}},
 * {{rol}}, {{titulo_cumple}}, {{querida}}, {{a_la}} y, en Pareja, {{dias_juntos}} y
 * {{anios}} (ribbly/vars.ts).
 *
 * Sin React: el servidor valida con esto sin cargar el player.
 */

const FRAME = { background: 'none', fullScreen: true } as const
const FRAME_LIGHT = { ...FRAME, chrome: 'dark' } as const

/** Las ocasiones que tienen su estilo propio (colores, escenas, adornos). */
export const LOOKS = [
  { value: 'cumple', label: 'Cumpleaños' },
  { value: 'pareja', label: 'Pareja' },
] as const
export type Look = (typeof LOOKS)[number]['value']

/**
 * Lo que tienen todas las pantallas: el estilo de la ocasión y cómo se llama
 * la pantalla en esta temática (src/slides/labels.ts). Vacío = el del tipo.
 */
function screen(look: Look = 'cumple') {
  return {
    look: field.select('Estilo', LOOKS, {
      default: look,
      advanced: true,
      help: 'Colores, fondos y adornos de la ocasión.',
    }),
    screenTitle: field.text('Nombre de la pantalla', {
      max: 30,
      advanced: true,
      help: 'En el repaso final y en el editor. Vacío = el de siempre.',
    }),
    editorTitle: field.text('Título en el editor', { max: 40, advanced: true }),
    editorIntro: field.textarea('Explicación en el editor', { max: 240, advanced: true }),
  }
}

// ── 01 · Intro ──────────────────────────────────────────────────────────────

const introBrand = {
  label: 'Ribbly · Intro',
  description: 'La marca sobre el cielo celeste, con guirnalda, globos y confeti.',
  category: 'intro',
  themeSchema: z.object({
    ...screen(),
    tagline: field.text('Frase', { default: 'Una experiencia digital para vos.' }),
    hint: field.text('Indicación para deslizar', { default: 'Deslizá para comenzar', max: 40 }),
  }),
  buyerSchema: null,
  frame: FRAME,
  summary: null,
} satisfies SlideDefinition

// ── 02 · Portada de festejo ─────────────────────────────────────────────────

const coverCake = {
  label: 'Ribbly · Portada de festejo',
  description: 'El nombre, la torta con las velas de la edad y un toque para soplarlas.',
  category: 'intro',
  themeSchema: z.object({
    ...screen(),
    kicker: field.text('Texto de arriba', { default: 'Hoy es un día especial para...' }),
    greeting: field.text('Saludo', { default: '¡Feliz cumple! 🎉', max: 40 }),
    cta: field.text('Botón', { default: '🎂 Tocá para soplar las velitas', max: 50 }),
    blown: field.text('Después de soplar', {
      default: '¡Deseo pedido! Deslizá para seguir',
      max: 50,
    }),
    senderPrefix: field.text('Antes del remitente', { default: 'DE PARTE DE:', max: 30 }),
  }),
  buyerSchema: z.object({
    age: field.text('¿Cuántos cumple?', {
      max: 3,
      required: true,
      placeholder: '28',
      help: 'Va en las velas de la torta y en todo el regalo.',
    }),
    treatment: field.select(
      '¿Cómo le decimos?',
      [
        { value: 'ella', label: 'La cumpleañera' },
        { value: 'el', label: 'El cumpleañero' },
        { value: 'neutro', label: 'Sin género' },
      ],
      { default: 'neutro' },
    ),
    birthday: field.text('Fecha del cumple (día/mes)', {
      max: 10,
      placeholder: '14/05',
      help: 'Opcional. La cápsula del tiempo la usa para decir cuándo se abre.',
    }),
  }),
  frame: FRAME,
  summary: { icon: 'party', title: 'Festejo', text: 'La torta, las velas y tu nombre.' },
  editor: {
    title: 'El festejo',
    intro:
      'Lo primero que ve: su nombre y la torta con las velas de la edad que cumple. La edad aparece en varias pantallas.',
  },
  variables: { edad: 'age', trato: 'treatment', cumple: 'birthday' },
} satisfies SlideDefinition

// ── 03 · Edición cumple ─────────────────────────────────────────────────────

export const COVER_AGE_VARIANTS: SlideVariant[] = [
  { value: 'rosa', label: 'Rosa y dorado', swatch: ['#F9C7D3', '#D9B98C'] },
  { value: 'celeste', label: 'Celeste y dorado', swatch: ['#B2DBF9', '#BF9964'] },
]

const coverAge = {
  label: 'Ribbly · Edición cumple',
  description:
    'Su foto en un marco orgánico dorado, con globos, confeti y el saludo en dos colores. Dos diseños (rosa o celeste) y se comparte como historia de Instagram.',
  category: 'intro',
  themeSchema: z.object({
    ...screen(),
    defaultTitle: field.text('Saludo si el comprador no escribe', {
      default: 'Feliz cumpleaños',
      max: 30,
      help: 'La última palabra va destacada. Para elegir otra, marcala con *asteriscos*.',
    }),
    defaultWish: field.text('Deseo si el comprador no escribe', {
      default: 'Que todos tus deseos se hagan realidad.',
      max: 90,
    }),
    shareLabel: field.text('Botón para compartir', { default: 'Compartir en Instagram', max: 30 }),
    photoFromKind: field.text('Si no hay foto, la primera de', {
      default: 'story.moments',
      advanced: true,
    }),
  }),
  buyerSchema: z.object({
    variant: field.variant('Diseño', ['rosa', 'celeste']),
    photo: field.photo('Su foto', {
      help: 'Va grande, en el marco dorado. Si no subís una, va la primera de tus fotos.',
    }),
    caption: field.text('Texto a mano sobre la foto (opcional)', {
      max: 24,
      placeholder: 'mi persona favorita',
    }),
    title: field.text('El saludo', { max: 30, placeholder: 'Feliz cumpleaños' }),
    wish: field.text('Un deseo para empezar', {
      max: 80,
      placeholder: 'Que todos tus deseos se hagan realidad.',
      help: 'Va a mano, en dos renglones, debajo del saludo.',
    }),
  }),
  frame: FRAME_LIGHT,
  summary: null,
  editor: {
    title: 'Edición cumple',
    intro:
      'La tapa de su cumple: su foto en un marco dorado con globos, el saludo y un deseo tuyo. Elegí el diseño que más te guste.',
  },
  variants: () => COVER_AGE_VARIANTS,
} satisfies SlideDefinition

// ── 04 · Tarjeta de cumple ──────────────────────────────────────────────────

const storyCard = {
  label: 'Ribbly · Tarjeta',
  description: 'Un sobre que se abre tocando el sticker y deja ver la tarjeta escrita a mano.',
  category: 'story',
  themeSchema: z.object({
    ...screen(),
    kicker: field.text('Etiqueta', { default: 'PARA VOS', max: 30 }),
    title: field.text('Título', { default: 'Tu tarjeta de cumple', max: 40 }),
    subtitle: field.text('Subtítulo', { default: 'de {{de}}', max: 40 }),
    envelopeLine: field.text('Texto del sobre', { default: '¡Feliz cumple, {{nombre}}!', max: 50 }),
    hint: field.text('Indicación', {
      default: 'Tocá el sticker para abrir tu tarjeta 🎂',
      max: 60,
    }),
    openLabel: field.text('Botón abrir', { default: 'Abrir mi tarjeta', max: 30 }),
    spine: field.text('Lomo de la tarjeta', { default: '{{edad}}!', max: 12 }),
    defaultText: field.textarea('Carta si el comprador no escribe', {
      default:
        '¡Feliz cumple! Gracias por estar siempre, por organizar todo y por reírte más fuerte que nadie. Que este año sea enorme. Te quiero mucho 🎉',
      max: 260,
    }),
    closeLabel: field.text('Botón cerrar', { default: '↺ Cerrar', max: 20, advanced: true }),
    saveLabel: field.text('Botón guardar', { default: 'Guardar tarjeta', max: 30, advanced: true }),
  }),
  buyerSchema: z.object({
    text: field.textarea('Tu carta', {
      max: 260,
      required: true,
      placeholder: '¡Feliz cumple! Gracias por…',
      help: 'Es lo más importante de la Ribbly: escribila como le hablás. Hasta 260 caracteres.',
    }),
  }),
  frame: FRAME_LIGHT,
  summary: { icon: 'heart', title: 'Tarjeta', text: 'Tu carta, escrita a mano.' },
  editor: {
    title: 'La tarjeta',
    intro:
      'Llega en un sobre: lo abre tocando el sticker y adentro está tu carta, con su nombre arriba y tu firma abajo.',
  },
} satisfies SlideDefinition

// ── 05 · Recorrido ──────────────────────────────────────────────────────────

export const MOMENTS_CUMPLE_VARIANTS: SlideVariant[] = [
  { value: 'celeste', label: 'Celeste y dorado', swatch: ['#BBD9EF', '#C8A257'] },
  { value: 'crema', label: 'Crema y rosa', swatch: ['#F8F2E6', '#E33A75'] },
]

const storyMoments = {
  label: 'Ribbly · Mejores momentos',
  description:
    'Cuatro polaroids en grilla. En Cumpleaños, con moños y globos en dos diseños (celeste o crema); en Pareja, con cinta washi.',
  category: 'story',
  themeSchema: z.object({
    ...screen(),
    kicker: field.text('Etiqueta', { default: 'RECORRIDO', max: 30 }),
    title: field.text('Título', { default: 'Tus mejores momentos', max: 40 }),
    phrase: field.text('Frase', { default: 'Un año más de recuerdos lindos 📸', max: 60 }),
    counter: field.text('Contador', {
      default: '{{n}} de {{total}} · deslizá para ver la próxima →',
      max: 60,
      help: '{{n}} y {{total}} se reemplazan solos.',
      advanced: true,
    }),
    lastCounter: field.text('Contador en la última', {
      default: '{{n}} de {{total}} · ¡qué recorrido!',
      max: 60,
      advanced: true,
    }),
    defaultCaption: field.text('Pie de foto de ejemplo', {
      default: 'El cumple {{anio_anterior}} 🎂',
      max: 40,
    }),
    daysLabel: field.text('Contador de días juntos', {
      default: '{{dias_juntos}} días juntos',
      max: 40,
      advanced: true,
      help: 'Solo con el estilo Pareja. Sale de la fecha que carga quien regala en la Love edition.',
    }),
    shareLabel: field.text('Botón para compartir', {
      default: 'Compartir en Instagram',
      max: 30,
      advanced: true,
      help: 'Solo con el estilo Pareja: arma la grilla como historia de Instagram.',
    }),
  }),
  buyerSchema: z.object({
    variant: field.variant('Diseño', ['celeste', 'crema']),
    moments: field.list(
      'Momentos',
      field.group('Momento', {
        photo: field.photo('Foto'),
        year: field.text('Año', { max: 4, placeholder: '2025' }),
        caption: field.text('Pie de foto', { max: 40, placeholder: 'El cumple del año pasado 🎂' }),
      }),
      {
        max: 10,
        required: true,
        itemLabel: 'Momento {n}',
        help: 'De 1 a 10 fotos. Cada una con su año y un pie cortito.',
      },
    ),
    title: field.text('Título (opcional)', { max: 40, advanced: true }),
    phrase: field.text('Frase (opcional)', { max: 60, advanced: true }),
    since: field.text('¿Desde cuándo se conocen? (opcional)', {
      max: 10,
      placeholder: '14/02/2019',
      advanced: true,
      help: 'Día/mes/año. En algunos diseños contamos los días juntos.',
    }),
  }),
  frame: FRAME,
  summary: { icon: 'camera', title: 'Momentos', text: 'Sus mejores fotos, año por año.' },
  editor: {
    title: 'Mejores momentos',
    intro:
      'Tus fotos como polaroids en una grilla, con moños y globos. Subí de 1 a 10: en la grilla van las primeras 4 y tocando una se ven todas.',
  },
  variables: { inicio: 'since' },
  variants: (props) => (props.look === 'cumple' ? MOMENTS_CUMPLE_VARIANTS : []),
} satisfies SlideDefinition

// ── 06 · Su canción ─────────────────────────────────────────────────────────

const mediaVideo = {
  label: 'Ribbly · Su canción',
  description: 'El video de YouTube a pantalla completa, con controles propios.',
  category: 'media',
  themeSchema: z.object({
    ...screen(),
    badge: field.text('Etiqueta de arriba', { default: 'YouTube · pantalla completa', max: 40 }),
    kicker: field.text('Etiqueta', { default: 'SU CANCIÓN', max: 30 }),
    defaultTitle: field.text('Título si no hay', { default: 'Tu canción', max: 40 }),
    caption: field.text('Dedicatoria', {
      default: '{{de}} dice que esta canción es 100% vos 🎉',
      max: 90,
    }),
    unmute: field.text('Aviso para activar el sonido', {
      default: 'Tocá para activar el sonido',
      max: 40,
      advanced: true,
    }),
    emptyLabel: field.text('Si no hay video', {
      default: 'Acá va la canción que elijas',
      max: 60,
      advanced: true,
    }),
  }),
  buyerSchema: z.object({
    youtubeUrl: field.youtube('Link de YouTube', { placeholder: 'https://youtu.be/…' }),
    songTitle: field.text('Nombre de la canción', { max: 50, placeholder: 'Celebration' }),
  }),
  frame: FRAME,
  summary: { icon: 'music', title: 'Su canción', text: 'El tema que es 100% suyo.' },
  editor: {
    title: 'Su canción',
    intro:
      'El tema que te hace acordar a esa persona, sonando a pantalla completa. Pegá el link de YouTube.',
  },
} satisfies SlideDefinition

// ── 07 · Playlist ───────────────────────────────────────────────────────────

const mixPlaylist = field.group('Playlist', {
  name: field.text('Nombre', { max: 40 }),
  description: field.text('Descripción', { max: 50 }),
  color: field.color('Color', { default: '#5ED6A8' }),
  url: field.url('Link', { default: 'https://open.spotify.com' }),
})

const MIX_DEFAULTS = [
  ['Fiesta Latina', 'Para arrancar la noche.', '#5ED6A8'],
  ['Hits del Momento', 'Lo que suena ahora.', '#FF8FB1'],
  ['Cumbia Pop', 'Imposible no bailar.', '#F2A93B'],
  ['2000s Party', 'Clásicos que todos saben.', '#FFD35C'],
  ['Reggaetón Clásico', 'Para perrear.', '#5ED6A8'],
  ['Karaoke Hits', 'Para gritar el estribillo.', '#FF8FB1'],
  ['Dance Pop', 'Energía pura.', '#F2A93B'],
  ['Rock Nacional', 'Para los clásicos.', '#B28DFF'],
].map(([name, description, color]) => ({
  name: name!,
  description: description!,
  color: color!,
  // Búsqueda de Spotify con el nombre: siempre lleva a algo que existe.
  url: `https://open.spotify.com/search/${encodeURIComponent(name!)}`,
}))

const mediaMix = {
  label: 'Ribbly · Playlists',
  description: 'Una lista de playlists para festejar, estilo app de música.',
  category: 'media',
  themeSchema: z.object({
    ...screen(),
    kicker: field.text('Etiqueta', { default: 'PLAYLISTS PARA FESTEJAR', max: 40 }),
    title: field.text('Título', { default: 'Cumple Mix', max: 30 }),
    subtitle: field.text('Subtítulo', {
      default: 'Armado para {{nombre}} · {{n}} playlists',
      max: 60,
      help: '{{n}} es la cantidad de playlists.',
    }),
    listenLabel: field.text('Botón', { default: 'Escuchar', max: 20 }),
    playlists: field.list('Playlists', mixPlaylist, {
      min: 1,
      max: 12,
      itemLabel: 'Playlist {n}',
      default: MIX_DEFAULTS,
    }),
  }),
  buyerSchema: null,
  frame: FRAME,
  summary: { icon: 'headphones', title: 'Playlist', text: 'Música para festejar.' },
} satisfies SlideDefinition

// ── 08 · Trivia ─────────────────────────────────────────────────────────────

const quizFields = {
  question: field.text('Pregunta', { max: 80 }),
  options: field.list('Opciones', field.text('Opción', { max: 34 }), {
    max: 4,
    itemLabel: 'Opción {n}',
  }),
  correct: field.number('Opción correcta (1 a 4)', { min: 1, max: 4, default: 1 }),
  hint: field.text('Pista (opcional)', { max: 80 }),
  comment: field.text('Tu comentario al ver la respuesta', {
    max: 60,
    placeholder: 'Obvio, dulce de leche siempre 🍨',
  }),
}

const QUIZ_EXAMPLES = [
  {
    question: '¿Cuál es mi gusto de helado favorito?',
    options: ['Chocolate 🍫', 'Dulce de leche 🍨', 'Frutilla 🍓', 'Limón 🍋'],
    correct: 2,
    hint: 'Es bien argentino.',
    comment: 'Obvio, dulce de leche siempre 🍨',
  },
  {
    question: '¿En qué año nos conocimos?',
    options: ['2015', '2017', '2019', '2012'],
    correct: 2,
    hint: 'Fue un año impar.',
    comment: 'Fue en 2017, en la facu 📚',
  },
  {
    question: '¿Cuál es mi plan ideal con vos?',
    options: ['Mates y charla', 'Salir a bailar', 'Maratón de series', 'Escapada sorpresa'],
    correct: 1,
    hint: 'No hace falta salir de casa.',
    comment: 'Mates y charla, siempre 🧉',
  },
]

const gameQuiz = {
  label: 'Ribbly · Trivia',
  description: 'Preguntas escritas por quien regala; si acierta todas, hay premio.',
  category: 'game',
  themeSchema: z.object({
    ...screen(),
    ribbon: field.text('Cinta', { default: 'DESAFÍO DE CUMPLE', max: 30 }),
    title: field.text('Título', { default: '¿CUÁNTO SABÉS DE MÍ?', max: 30 }),
    chipQuestions: field.text('Chip de preguntas', { default: '🧠 {{total}} preguntas', max: 30 }),
    chipPrize: field.text('Chip de premio', { default: '🎁 1 premio', max: 30 }),
    chipHints: field.text('Chip de pistas', { default: '💡 pistas', max: 30 }),
    playLabel: field.text('Botón jugar', { default: 'JUGAR', max: 20 }),
    progressLabel: field.text('Progreso', { default: 'PREGUNTA {{n}}/{{total}}', max: 30 }),
    hintLabel: field.text('Botón pista', { default: 'Ver pista', max: 20, advanced: true }),
    correctLabel: field.text('Sello de acierto', { default: '¡CORRECTO! 🎉', max: 24 }),
    wrongLabel: field.text('Sello de error', { default: '¡CASI! 😄', max: 24 }),
    revealLabel: field.text('Marca de la correcta', { default: '✓ ERA ESTA', max: 20 }),
    nextLabel: field.text('Botón siguiente', { default: 'Siguiente →', max: 20, advanced: true }),
    winTitle: field.text('Final con premio · título', { default: '¡Jugada maestra!', max: 30 }),
    scoreLabel: field.text('Puntaje', { default: '{{n}} de {{total}} correctas', max: 40 }),
    prizeKicker: field.text('Premio · rótulo', { default: 'TU PREMIO', max: 20 }),
    defaultPrize: field.text('Premio si el comprador no carga uno', {
      default: 'Una merienda con todo pago',
      max: 50,
    }),
    prizeBy: field.text('Premio · quién lo eligió', {
      default: 'Premio elegido por {{de}}',
      max: 50,
    }),
    prizeNote: field.text('Premio · aclaración', {
      default: '📸 Hacé captura para canjearlo',
      max: 50,
    }),
    continueLabel: field.text('Botón seguir', { default: 'Seguir →', max: 20, advanced: true }),
    loseTitle: field.text('Final sin premio · título', { default: '¡Uy, casi!', max: 30 }),
    lockedTitle: field.text('Premio bloqueado · título', {
      default: 'Tu premio sigue esperando',
      max: 40,
    }),
    lockedNote: field.text('Premio bloqueado · texto', {
      default: 'Acertá las {{total}} para desbloquearlo',
      max: 50,
    }),
    retryLabel: field.text('Botón reintentar', { default: '↺ Volver a intentar', max: 30 }),
    skipLabel: field.text('Botón seguir sin premio', { default: 'Seguir sin premio', max: 30 }),
    maxAttempts: field.number('Intentos', { min: 1, max: 9, default: 3, advanced: true }),
    examples: field.list('Preguntas de ejemplo', field.group('Pregunta', quizFields), {
      min: 1,
      max: 5,
      itemLabel: 'Pregunta {n}',
      help: 'El editor del comprador arranca con estas; las cambia por las suyas.',
      default: QUIZ_EXAMPLES,
    }),
  }),
  buyerSchema: z.object({
    questions: field.list('Preguntas', field.group('Pregunta', quizFields), {
      max: 5,
      itemLabel: 'Pregunta {n}',
      help: 'Lo ideal son 3. Cada una con hasta 4 opciones, cuál es la correcta, una pista y tu comentario.',
    }),
    prize: field.text('Premio si acierta todas', {
      max: 50,
      placeholder: 'Una merienda con todo pago',
    }),
  }),
  frame: FRAME,
  summary: { icon: 'smile', title: 'Trivia', text: '¿Cuánto sabe de vos?' },
  editor: {
    title: 'Trivia',
    intro:
      '"¿Cuánto sabés de mí?": preguntas sobre vos o sobre ustedes. Vienen ejemplos: cambialos por los tuyos y elegí el premio.',
  },
} satisfies SlideDefinition

// ── 09 · Cine ───────────────────────────────────────────────────────────────

const connectorPremiere = {
  label: 'Ribbly · Función de cine',
  description: 'Se abre el telón: pochoclos, marquesina y una entrada VIP a su nombre.',
  category: 'media',
  themeSchema: z.object({
    ...screen(),
    kicker: field.text('Etiqueta', { default: 'FUNCIÓN DE CUMPLE', max: 30 }),
    title: field.text('Título', { default: 'Prepará los pochoclos...', max: 40 }),
    subtitle: field.text('Subtítulo', { default: 'Hoy la peli la elegís vos 🎬', max: 50 }),
    marquee: field.text('Marquesina', { default: 'CINE', max: 10 }),
    ticketKicker: field.text('Entrada · rótulo', { default: 'ENTRADA VIP', max: 20 }),
    ticketName: field.text('Entrada · nombre', { default: '{{titulo_cumple}}', max: 30 }),
    ticketDetail: field.text('Entrada · detalle', {
      default: 'Fila 1 · butaca {{edad}} 🍿',
      max: 40,
    }),
    autoAdvance: field.number('Avance automático (segundos, 0 = no)', {
      min: 0,
      max: 20,
      default: 5,
      advanced: true,
    }),
  }),
  buyerSchema: null,
  frame: FRAME,
  summary: null,
} satisfies SlideDefinition

// ── 10 · Recomendado para vos ───────────────────────────────────────────────

const pickFields = {
  platform: field.text('Plataforma', { max: 20, placeholder: 'Netflix' }),
  title: field.text('Título', { max: 40, placeholder: 'Noche de risas' }),
  tags: field.text('Géneros', { max: 50, placeholder: 'Comedia • Amigos' }),
  link: field.url('Link (opcional)'),
}

const mediaPoster = {
  label: 'Ribbly · Recomendado para vos',
  description: 'Un póster a pantalla completa por cada recomendación, con solapas por plataforma.',
  category: 'media',
  themeSchema: z.object({
    ...screen(),
    kicker: field.text('Etiqueta', { default: 'RECOMENDADO PARA VOS', max: 40 }),
    watchLabel: field.text('Botón ver', { default: 'Ver ahora', max: 20 }),
    nextLabel: field.text('Botón siguiente', { default: 'Siguiente', max: 20 }),
    suggestions: field.list('Recomendaciones de ejemplo', field.group('Título', pickFields), {
      min: 1,
      max: 6,
      itemLabel: 'Recomendación {n}',
      help: 'El editor del comprador arranca con estas.',
      default: [
        {
          platform: 'Netflix',
          title: 'Maratón de series',
          tags: 'Sofá • Manta • Pochoclos',
          link: 'https://www.netflix.com',
        },
        {
          platform: 'Prime Video',
          title: 'Noche de risas',
          tags: 'Comedia • Amigos • HD',
          link: 'https://www.primevideo.com',
        },
        {
          platform: 'Disney+',
          title: 'Clásicos de siempre',
          tags: 'Animación • Nostalgia',
          link: 'https://www.disneyplus.com',
        },
      ],
    }),
  }),
  buyerSchema: z.object({
    picks: field.list('Recomendaciones', field.group('Título', pickFields), {
      max: 6,
      itemLabel: 'Recomendación {n}',
      help: 'Series o pelis que tiene que ver sí o sí. Poné la plataforma y, si querés, el link.',
    }),
  }),
  frame: FRAME,
  summary: { icon: 'film', title: 'Cine', text: 'Lo que tiene que ver sí o sí.' },
  editor: {
    title: 'Recomendado para vos',
    intro:
      'Tus recomendaciones para ver: una por pantalla, agrupadas por plataforma. Vienen ejemplos para que los cambies.',
  },
} satisfies SlideDefinition

// ── 11 · Tragamonedas ───────────────────────────────────────────────────────

const gameSlots = {
  label: 'Ribbly · Tragamonedas',
  description: 'Tres rodillos que frenan de a uno y siempre dan el premio mayor.',
  category: 'game',
  themeSchema: z.object({
    ...screen(),
    kicker: field.text('Etiqueta', { default: 'LLUVIA DE REGALOS', max: 30 }),
    title: field.text('Título', { default: '¡Tirá y ganá!', max: 30 }),
    machine: field.text('Nombre de la máquina', { default: 'RIBBLY SLOTS', max: 20 }),
    prizesLabel: field.text('Rótulo de premios', { default: 'Premios en juego', max: 30 }),
    spinLabel: field.text('Botón', { default: '🎰 ¡GIRAR!', max: 20 }),
    spinningLabel: field.text('Mientras gira', { default: 'Girando...', max: 20 }),
    cheer: field.text('Aliento', { default: '¡Que salga, que salga! 🤞', max: 40 }),
    jackpot: field.text('Al ganar · título', { default: '¡JACKPOT!', max: 20 }),
    stamp: field.text('Al ganar · cinta', { default: '¡PREMIO MAYOR!', max: 24 }),
    wonKicker: field.text('Al ganar · rótulo', { default: 'GANASTE', max: 20 }),
    wonBy: field.text('Al ganar · quién lo eligió', {
      default: 'El premio lo eligió {{de}} para vos',
      max: 50,
    }),
    ctaLabel: field.text('Botón final', { default: 'Ver mis vales ↓', max: 30 }),
    symbols: field.list('Símbolos que giran', field.icon('Símbolo'), {
      min: 3,
      max: 8,
      default: ['globo', 'torta', 'cotillon', 'regalo', 'estrella', 'cara-de-fiesta'],
      advanced: true,
    }),
    winSymbol: field.icon('Símbolo ganador', { default: 'regalo', advanced: true }),
    suggestions: field.list('Premios sugeridos', field.text('Premio', { max: 28 }), {
      min: 1,
      max: 3,
      itemLabel: 'Premio {n}',
      default: ['🍕 Pizza party', '🎤 Noche de karaoke', '🛍️ Tarde de shopping'],
    }),
  }),
  buyerSchema: z.object({
    prizes: field.list('Premios en juego', field.text('Premio', { max: 28 }), {
      max: 3,
      itemLabel: 'Premio {n}',
      help: 'Hasta 3. Podés arrancar cada uno con un emoji.',
    }),
    winner: field.number('¿Cuál sale? (1 a 3)', { min: 1, max: 3, default: 2 }),
  }),
  frame: FRAME,
  summary: { icon: 'sun', title: 'Tragamonedas', text: 'Tirá de la palanca: siempre gana.' },
  editor: {
    title: 'Tragamonedas',
    intro:
      'Tira de la palanca y siempre sale el premio mayor. Cargá hasta 3 premios y elegí cuál gana.',
  },
} satisfies SlideDefinition

// ── 12 · Vales de cumple ────────────────────────────────────────────────────

const voucherStyle = field.group('Vale', {
  icon: field.icon('Ícono'),
  title: field.text('Título', { max: 30 }),
  detail: field.text('Detalle', { max: 70 }),
  color: field.color('Color', { default: '#F2A93B' }),
})

const VOUCHER_EXAMPLES = [
  ['torta', 'Torta a elección', 'La que vos quieras, la pago yo.', '#F44E63'],
  ['pizza', 'Pizza party', 'Pizza, birra y sobremesa larga.', '#F2A93B'],
  ['juego', 'Noche de juegos', 'Elegís el juego y te dejo ganar.', '#4FC3F7'],
  ['bola-disco', 'Salida a bailar', 'Hasta que nos echen.', '#B28DFF'],
  ['compras', 'Tarde de shopping', 'Yo cargo las bolsas.', '#FF8FB1'],
  ['relax', 'Día sin culpa', 'Cero planes, cero reloj.', '#5ED6A8'],
  ['microfono', 'Noche de karaoke', 'Vos elegís las canciones, yo pago.', '#8B5CF6'],
  ['regalo', 'Regalo extra', 'Uno más, porque sí.', '#1E88C9'],
].map(([icon, title, detail, color]) => ({
  icon: icon!,
  title: title!,
  detail: detail!,
  color: color!,
}))

const gameVouchers = {
  label: 'Ribbly · Vales',
  description: 'Una grilla de vales: cada uno se abre como un ticket y se canjea con un sello.',
  category: 'game',
  themeSchema: z.object({
    ...screen(),
    title: field.text('Título', { default: 'VALES DE CUMPLE', max: 30 }),
    subtitle: field.text('Subtítulo', {
      default: 'Tocá un vale para abrirlo y canjearlo 🎁',
      max: 60,
    }),
    counter: field.text('Contador', {
      default: '🎈 {{n}} de {{total}} vales canjeados',
      max: 50,
    }),
    tabLabel: field.text('Lomo de cada vale', { default: 'VALE', max: 10, advanced: true }),
    viewLabel: field.text('Rótulo de cada vale', {
      default: 'VER VALE →',
      max: 20,
      advanced: true,
    }),
    redeemedLabel: field.text('Rótulo de canjeado', {
      default: '✓ CANJEADO',
      max: 20,
      advanced: true,
    }),
    ticketKicker: field.text('Ticket · rótulo', { default: 'VALE POR', max: 20 }),
    forLabel: field.text('Ticket · para', { default: 'PARA', max: 10, advanced: true }),
    fromLabel: field.text('Ticket · de', { default: 'DE', max: 10, advanced: true }),
    validity: field.text('Ticket · validez', {
      default: 'Válido todo el año · sin vencimiento',
      max: 50,
    }),
    redeemLabel: field.text('Botón canjear', { default: 'Canjear vale', max: 20 }),
    closeLabel: field.text('Botón cerrar', { default: 'Cerrar', max: 20, advanced: true }),
    stamp: field.text('Sello', { default: '¡CANJEADO!', max: 14 }),
    redeemedOn: field.text('Ticket canjeado', {
      default: 'Canjeado el {{fecha_canje}}',
      max: 50,
    }),
    confirm: field.text('Confirmación', {
      default: '¡Listo! Avisale a {{de}} que lo canjeaste 🎉',
      max: 60,
    }),
    backLabel: field.text('Botón volver', { default: 'Volver a los vales', max: 30 }),
    fallbackDetail: field.text('Detalle si no hay', {
      default: 'Canjealo cuando quieras.',
      max: 70,
      advanced: true,
    }),
    examples: field.list('Vales de ejemplo', voucherStyle, {
      min: 1,
      max: 8,
      itemLabel: 'Vale {n}',
      help: 'El editor del comprador arranca con estos. Sus íconos y colores se usan también para los del comprador.',
      default: VOUCHER_EXAMPLES,
    }),
  }),
  buyerSchema: z.object({
    vouchers: field.list(
      'Vales',
      field.group('Vale', {
        title: field.text('Vale', { max: 30 }),
        detail: field.text('Detalle (opcional)', { max: 70 }),
      }),
      { max: 8, itemLabel: 'Vale {n}', help: 'Hasta 8 vales para canjear cuando quiera.' },
    ),
  }),
  frame: FRAME_LIGHT,
  summary: { icon: 'ticket', title: 'Vales', text: 'Para canjear cuando quiera.' },
  editor: {
    title: 'Vales de cumple',
    intro:
      'Vales simbólicos que abre y canjea con un sello: una torta, una salida, un día sin planes. Vienen 8 de ejemplo.',
  },
} satisfies SlideDefinition

// ── 13 · Revista ────────────────────────────────────────────────────────────

export const MAGAZINE_RELATIONS = [
  { value: 'generico', label: 'Prefiero no decir' },
  { value: 'amiga', label: 'Amiga' },
  { value: 'amigo', label: 'Amigo' },
  { value: 'pareja', label: 'Pareja' },
  { value: 'hermana', label: 'Hermana' },
  { value: 'hermano', label: 'Hermano' },
  { value: 'mama', label: 'Mamá' },
  { value: 'papa', label: 'Papá' },
  { value: 'hija', label: 'Hija' },
  { value: 'hijo', label: 'Hijo' },
  { value: 'prima', label: 'Prima' },
  { value: 'primo', label: 'Primo' },
  { value: 'abuela', label: 'Abuela' },
  { value: 'abuelo', label: 'Abuelo' },
  { value: 'tia', label: 'Tía' },
  { value: 'tio', label: 'Tío' },
  { value: 'sobrina', label: 'Sobrina' },
  { value: 'ahijado', label: 'Ahijado' },
  { value: 'companera', label: 'Compañera' },
  { value: 'companero', label: 'Compañero' },
  { value: 'equipo', label: 'Alguien del equipo' },
  { value: 'jefa', label: 'Jefa' },
  { value: 'socio', label: 'Socio' },
] as const

export const MAGAZINE_TONES = [
  { value: 'cualquiera', label: 'El que mejor quede' },
  { value: 'calido', label: 'Cálido' },
  { value: 'emotivo', label: 'Emotivo' },
  { value: 'festivo', label: 'Festivo' },
  { value: 'divertido', label: 'Divertido' },
  { value: 'inspirador', label: 'Inspirador' },
  { value: 'romantico', label: 'Romántico' },
] as const

/** Bancos de textos de la revista (ribbly/magazine.ts). */
export const MAGAZINE_BANKS = [
  { value: 'cumple', label: 'Cumpleaños' },
  { value: 'pareja', label: 'Pareja' },
] as const

const storyMagazine = {
  label: 'Ribbly · Revista',
  description:
    'Tapa editorial sobre papel. El texto sale de un banco de 100 variaciones según el vínculo y el tono.',
  category: 'story',
  themeSchema: z.object({
    ...screen(),
    bank: field.select('Banco de textos', MAGAZINE_BANKS, { default: 'cumple', advanced: true }),
    shareLabel: field.text('Botón compartir', { default: 'COMPARTIR STORY', max: 30 }),
    photoFromKind: field.text('Usar la primera foto de', {
      default: 'story.moments',
      help: 'Tipo de slide de donde sale la foto si el comprador no sube una acá.',
      advanced: true,
    }),
  }),
  buyerSchema: z.object({
    relation: field.select('¿Qué es para vos?', MAGAZINE_RELATIONS, {
      default: 'generico',
      help: 'Con esto elegimos un texto que les quede.',
    }),
    tone: field.select('Tono', MAGAZINE_TONES, { default: 'cualquiera' }),
    version: field.number('Versión del texto', {
      min: 1,
      max: 30,
      default: 1,
      help: 'Subí el número para probar otro texto con el mismo vínculo y tono.',
    }),
    ownText: field.textarea('O escribí el tuyo (opcional)', {
      max: 320,
      placeholder: 'Si escribís acá, reemplaza al texto de la revista.',
    }),
    photo: field.photo('Foto de la tapa (opcional)', {
      help: 'Si no subís una, va la primera de tus momentos.',
    }),
  }),
  frame: FRAME_LIGHT,
  summary: { icon: 'pen-tool', title: 'Revista', text: 'Una nota de tapa sobre vos.' },
  editor: {
    title: 'La revista',
    intro:
      'Una tapa de revista con un texto sobre esa persona. Decinos qué es para vos y el tono: elegimos entre 100 textos distintos.',
  },
} satisfies SlideDefinition

// ── 14 · 10 deseos ──────────────────────────────────────────────────────────

export const WISHES_CUMPLE_VARIANTS: SlideVariant[] = [
  { value: 'cielo', label: 'Notas sobre cielo', swatch: ['#4FC3F7', '#FFF3C8'] },
  { value: 'noche', label: 'Noche dorada', swatch: ['#1B345C', '#DCBE88'] },
]

const storyWishes = {
  label: 'Ribbly · Deseos',
  description: 'Notas pegadas con cinta, una por deseo, que aparecen de a una.',
  category: 'story',
  themeSchema: z.object({
    ...screen(),
    title: field.text('Título', { default: 'deseos', max: 20 }),
    subtitle: field.text('Subtítulo', { default: 'para tus {{edad}}', max: 40 }),
    subtitleNoAge: field.text('Subtítulo sin edad', {
      default: 'para tu nuevo año',
      max: 40,
      advanced: true,
    }),
    nightTitle: field.text('Título del diseño Noche', {
      default: 'razones',
      max: 20,
      advanced: true,
    }),
    nightSubtitle: field.text('Subtítulo del diseño Noche', {
      default: 'por las que te elijo',
      max: 40,
      advanced: true,
    }),
    nightSuggestions: field.list(
      'Notas sugeridas del diseño Noche',
      field.text('Nota', { max: 40 }),
      {
        max: 10,
        itemLabel: 'Nota #{n}',
        advanced: true,
        help: 'Si quien regala no cambió las notas y elige el diseño Noche, van estas.',
        default: [
          'Por tu forma de mirarme',
          'Por cómo me hacés reír',
          'Por tus abrazos que arreglan todo',
          'Por bancarme siempre',
          'Por los mates de los domingos',
          'Por cómo cantás en el auto',
          'Por hacerme sentir en casa',
          'Por tus ganas de todo',
          'Por soñar conmigo',
          'Porque sos vos 💛',
        ],
      },
    ),
    suggestions: field.list('Deseos sugeridos', field.text('Deseo', { max: 40 }), {
      max: 10,
      itemLabel: 'Deseo #{n}',
      help: 'El editor del comprador arranca con estos.',
      default: [
        'Que viajes muchísimo ✈️',
        'Que te rías hasta llorar',
        'Que nunca falte torta 🍰',
        'Que cumplas tus planes',
        'Que tu playlist nunca falle',
        'Que tengas más días de sol',
        'Que adoptes ese perrito 🐶',
        'Que bailes hasta tarde',
        'Que te animes a todo',
        'Que sigas siendo vos 🎉',
      ],
    }),
  }),
  buyerSchema: z.object({
    variant: field.variant('Diseño', ['cielo', 'noche']),
    // Nombres neutros: la misma pantalla es "10 deseos" y "10 razones".
    wishes: field.list('Notas', field.text('Nota', { max: 40 }), {
      max: 10,
      itemLabel: 'Nota #{n}',
      help: 'Hasta 10, cortitas: van en notas pegadas con cinta.',
    }),
    title: field.text('Título (opcional)', { max: 20, advanced: true, placeholder: 'deseos' }),
    subtitle: field.text('Subtítulo (opcional)', {
      max: 40,
      advanced: true,
      placeholder: 'para tus 28',
    }),
  }),
  frame: FRAME,
  summary: { icon: 'sparkles', title: '10 deseos', text: 'Todo lo que te deseo este año.' },
  editor: {
    title: '10 deseos',
    intro:
      'Tus deseos para su nuevo año, en notas de colores. Arrancan con los nuestros: dejá los que te gusten y cambiá el resto.',
  },
  variants: (props) => (props.look === 'cumple' ? WISHES_CUMPLE_VARIANTS : []),
} satisfies SlideDefinition

// ── 15 · Velitas ────────────────────────────────────────────────────────────

const reflectCandles = {
  label: 'Ribbly · Velitas',
  description: 'Un momento a oscuras: quien recibe escribe sus deseos antes de soplar.',
  category: 'reflect',
  themeSchema: z.object({
    ...screen(),
    kicker: field.text('Etiqueta', { default: 'UN MOMENTO PARA VOS', max: 30 }),
    title1: field.text('Título · línea 1', { default: 'Antes de soplar', max: 30 }),
    title2: field.text('Título · línea 2', { default: 'las velitas…', max: 30 }),
    subtitle: field.text('Texto', {
      default: 'Cerrá los ojos, respirá hondo y pedí tus {{total}} deseos para este nuevo año.',
      max: 120,
    }),
    cta: field.text('Botón', { default: 'Pedir mis deseos ✨', max: 30 }),
    wishCount: field.number('Cantidad de deseos', { min: 1, max: 5, default: 3 }),
    stepLabel: field.text('Progreso', { default: '🕯️ DESEO {{n}} DE {{total}}', max: 30 }),
    promptTitle1: field.text('Consigna · línea 1', { default: 'Este año', max: 20 }),
    promptTitle2: field.text('Consigna · línea 2', { default: 'deseo…', max: 20 }),
    placeholder: field.text('Ayuda', { default: 'Escribí tu deseo…', max: 40 }),
    nextLabel: field.text('Botón siguiente', { default: 'Siguiente →', max: 20, advanced: true }),
    doneLabel: field.text('Botón del último', { default: 'Soplar las velitas ✨', max: 30 }),
    outroTitle: field.text('Final · título', { default: '¡Deseos pedidos!', max: 30 }),
    outroText: field.text('Final · texto', {
      default: 'No se los cuentes a nadie. Quedaron guardados para tu cápsula del tiempo.',
      max: 110,
    }),
    againLabel: field.text('Botón cambiar', {
      default: 'Cambiar mis deseos',
      max: 30,
      advanced: true,
    }),
  }),
  buyerSchema: null,
  frame: FRAME,
  summary: { icon: 'moon', title: 'Velitas', text: 'Tres deseos antes de soplar.' },
} satisfies SlideDefinition

// ── 16 · Cápsula del tiempo ─────────────────────────────────────────────────

const reflectCapsule = {
  label: 'Ribbly · Cápsula del tiempo',
  description: 'Un frasco con papelitos y una carta para su yo del futuro.',
  category: 'reflect',
  themeSchema: z.object({
    ...screen(),
    kicker: field.text('Etiqueta', { default: 'CÁPSULA DEL TIEMPO', max: 30 }),
    title1: field.text('Título · línea 1', { default: 'Una carta para tu', max: 30 }),
    title2: field.text('Título · línea 2', { default: 'yo del futuro.', max: 30 }),
    subtitle: field.text('Texto', {
      default:
        'Escribile {{a_la}} {{nombre}} de {{edad_siguiente}}. La cápsula se guarda y se abre en tu próximo cumple.',
      max: 140,
    }),
    subtitleNoAge: field.text('Texto sin edad', {
      default:
        'Escribite para dentro de un año. La cápsula se guarda y se abre en tu próximo cumple.',
      max: 140,
      advanced: true,
    }),
    jarLabel: field.text('Etiqueta del frasco', {
      default: 'Abrir en mi cumple {{edad_siguiente}}',
      max: 40,
    }),
    cta: field.text('Botón', { default: '✍️ Escribirle a mi yo del futuro', max: 40 }),
    greeting: field.text('Saludo de la carta', {
      default: '{{querida}} {{nombre}} de {{edad_siguiente}}:',
      max: 50,
    }),
    placeholder: field.textarea('Ayuda de la carta', {
      default:
        'Hoy cumplo {{edad}} y quiero acordarme de este momento. Ojalá hayas viajado, bailado mucho y sigas con esta gente hermosa…',
      max: 200,
    }),
    lockChip: field.text('Chip con fecha', {
      default: '🔒 Se abre el {{fecha_proximo_cumple}}',
      max: 50,
    }),
    lockChipNoDate: field.text('Chip sin fecha', {
      default: '🔒 Se abre en tu próximo cumple',
      max: 50,
      advanced: true,
    }),
    closeLabel: field.text('Botón cerrar', { default: 'Cerrar', max: 20, advanced: true }),
    saveLabel: field.text('Botón guardar', { default: 'Guardar en la cápsula', max: 30 }),
    savedLabel: field.text('Al guardar', { default: 'Guardada en tu cápsula ✨', max: 40 }),
    editLabel: field.text('Botón con carta guardada', {
      default: '✍️ Leer mi carta',
      max: 40,
      advanced: true,
    }),
    wishesFromKind: field.text('Papelitos: deseos de', {
      default: 'reflect.candles',
      help: 'Tipo de slide de donde salen los deseos que van en el frasco.',
      advanced: true,
    }),
  }),
  buyerSchema: null,
  frame: FRAME,
  summary: { icon: 'check-circle', title: 'Cápsula', text: 'Una carta para tu yo del futuro.' },
} satisfies SlideDefinition

// ── 17 · Piñata ─────────────────────────────────────────────────────────────

const gamePinata = {
  label: 'Ribbly · Piñata',
  description: 'Tres toques rompen la piñata y cae un mensaje sobre el año que empieza.',
  category: 'game',
  themeSchema: z.object({
    ...screen(),
    kicker: field.text('Etiqueta', { default: 'TU AÑO NUEVO', max: 30 }),
    title: field.text('Título', { default: '¡Rompé la piñata!', max: 30 }),
    subtitle: field.text('Subtítulo', {
      default: 'Adentro hay un mensaje sobre lo que viene 👀',
      max: 60,
    }),
    hits: field.number('Golpes necesarios', { min: 1, max: 6, default: 3 }),
    cheers: field.list('Aliento después de cada golpe', field.text('Frase', { max: 30 }), {
      min: 1,
      max: 6,
      default: ['¡Dale con todo!', '¡Otro más!', '¡Un golpe más!'],
    }),
    messageKicker: field.text('Rótulo del mensaje', {
      default: 'LO QUE TE TRAE ESTE AÑO',
      max: 40,
    }),
    messages: field.list('Banco de mensajes', field.text('Mensaje', { max: 110 }), {
      min: 1,
      max: 12,
      itemLabel: 'Mensaje {n}',
      help: 'Se usa uno si el comprador no escribe el suyo.',
      default: [
        'Va a ser un año lleno de primeras veces. Animate a todas.',
        'Este año lo que venís soñando deja de ser un plan.',
        'Se vienen risas nuevas, lugares nuevos y la misma gente linda.',
        'Lo mejor de este año todavía no lo imaginás.',
        'Este año te toca a vos: pedí en grande.',
      ],
    }),
    celebration: field.text('Festejo', { default: '¡A romperla! 🎉', max: 30 }),
    saveLabel: field.text('Botón', { default: 'Guardar mi mensaje', max: 30 }),
  }),
  buyerSchema: z.object({
    message: field.textarea('Mensaje de la piñata', {
      max: 110,
      placeholder: 'Va a ser un año lleno de primeras veces. Animate a todas.',
      help: 'Lo que le espera este año, en una frase. Si lo dejás vacío elegimos uno.',
    }),
  }),
  frame: FRAME,
  summary: { icon: 'gamepad', title: 'Piñata', text: 'Un mensaje sobre lo que viene.' },
  editor: {
    title: 'La piñata',
    intro:
      'Con tres toques la rompe y cae tu mensaje sobre el año que empieza. Si no escribís uno, va uno de los nuestros.',
  },
} satisfies SlideDefinition

// ── 18 · Anécdota ───────────────────────────────────────────────────────────

const storyMemory = {
  label: 'Ribbly · Anécdota',
  description: 'Tarjeta con foto y un recuerdo contado por quien regala, lista para Stories.',
  category: 'story',
  themeSchema: z.object({
    ...screen(),
    defaultTitle: field.text('Título de ejemplo', {
      default: 'El cumple sorpresa del {{anio_anterior}}',
      max: 50,
    }),
    defaultText: field.textarea('Texto de ejemplo', {
      default: 'Llegaste temprano, nos encontraste inflando globos y fingiste no darte cuenta.',
      max: 160,
    }),
    shareLabel: field.text('Botón compartir', { default: 'Compartir Story', max: 30 }),
  }),
  buyerSchema: z.object({
    title: field.text('Título del recuerdo', {
      max: 50,
      placeholder: 'El cumple sorpresa del 2022',
    }),
    text: field.textarea('El recuerdo', {
      max: 160,
      placeholder: 'Llegaste temprano, nos encontraste inflando globos…',
    }),
    photo: field.photo('Foto del recuerdo', { required: true }),
  }),
  frame: FRAME,
  summary: { icon: 'film', title: 'Anécdota', text: 'Ese recuerdo que siempre vuelve.' },
  editor: {
    title: 'Anécdota',
    intro: 'Un recuerdo de un cumple (o de cualquier día): una foto, un título y dos líneas tuyas.',
  },
} satisfies SlideDefinition

// ── 19 · Todo lo que festejamos ─────────────────────────────────────────────

const outroRecap = {
  label: 'Ribbly · Resumen',
  description: 'Tarjeta para compartir con las fotos, los números y el índice de la Ribbly.',
  category: 'outro',
  themeSchema: z.object({
    ...screen(),
    kicker: field.text('Etiqueta', { default: '¡QUÉ FESTEJO!', max: 30 }),
    title: field.text('Título', { default: 'Todo lo que festejamos', max: 40 }),
    personChip: field.text('Chip de la persona', { default: '{{nombre}} · {{edad}} 🎂', max: 40 }),
    surprisesLabel: field.text('Dato 1', { default: 'sorpresas', max: 20 }),
    quizLabel: field.text('Dato 2', { default: 'trivia', max: 20 }),
    wishesLabel: field.text('Dato 3', { default: 'deseos', max: 20 }),
    songLabel: field.text('Rótulo de la canción', { default: 'Su canción', max: 20 }),
    shareLabel: field.text('Botón', { default: 'Compartir mi Ribbly', max: 30 }),
  }),
  buyerSchema: null,
  frame: FRAME,
  summary: null,
} satisfies SlideDefinition

// ── 20 · Cierre ─────────────────────────────────────────────────────────────

const outroFinale = {
  label: 'Ribbly · Cierre',
  description: 'El regalo sorpresa (si hay) y el ¡Feliz cumple! final, con repetir y regalar.',
  category: 'outro',
  themeSchema: z.object({
    ...screen(),
    lastThing: field.text('Regalo · título', { default: 'Una última cosa...', max: 30 }),
    giftKicker: field.text('Regalo · rótulo', { default: 'TU REGALO SORPRESA', max: 30 }),
    giftNote: field.text('Regalo · nota', { default: 'Guardalo, es tuyo ✨', max: 40 }),
    giftCta: field.text('Regalo · botón', { default: 'Ver mi regalo', max: 30 }),
    giftOpenLabel: field.text('Regalo · botón del link', {
      default: 'Abrir mi regalo',
      max: 30,
      advanced: true,
    }),
    continueLabel: field.text('Regalo · seguir', { default: 'Seguir →', max: 20, advanced: true }),
    title1: field.text('Final · línea 1', { default: '¡Feliz', max: 20 }),
    title2: field.text('Final · línea 2', { default: 'cumple!', max: 20 }),
    subtitle: field.text('Final · frase', {
      default: 'que sea el mejor año de tu vida.',
      max: 60,
    }),
    credit: field.text('Crédito', { default: 'Hecho con 🎉 por {{de}}', max: 50 }),
    replayLabel: field.text('Botón repetir', { default: '↺ Repetir Ribbly', max: 30 }),
    shopLabel: field.text('Botón regalar', { default: '🎁 Regalá una Ribbly', max: 30 }),
    shopUrl: field.url('Link de regalar', {
      default:
        'https://ribbly.com.ar/?utm_source=ribbly&utm_medium=regalo&utm_campaign=cierre_cumple',
    }),
    handle: field.text('Cuenta', { default: '@ribbly', max: 30 }),
  }),
  buyerSchema: z.object({
    gift: field.text('Regalo sorpresa (opcional)', {
      max: 60,
      placeholder: 'Gift card para tu librería favorita 📚',
      help: 'Si cargás uno, antes del final aparece una caja que se abre con tu regalo.',
    }),
    giftDetail: field.text('Detalle del regalo (opcional)', {
      max: 50,
      placeholder: 'Sábado · 21 h · Campo VIP 🎟️',
    }),
    giftSignature: field.text('Firma del regalo', {
      max: 40,
      placeholder: 'de Juli y los chicos',
    }),
    giftLink: field.url('Link del regalo (opcional)'),
  }),
  frame: FRAME,
  summary: null,
  editor: {
    title: 'Regalo sorpresa',
    intro:
      'Opcional. Si hay un regalo de verdad (una gift card, una entrada), aparece en una caja antes del saludo final.',
  },
} satisfies SlideDefinition

// ════════════════════════════════════════════════════════════════════════════
// Pareja (base de pantallas de Pareja). Las que comparten estructura con las de
// Cumpleaños son las mismas pantallas con `look: 'pareja'`; estas son propias.
// ════════════════════════════════════════════════════════════════════════════

// ── 02 · Portada con regalo ─────────────────────────────────────────────────

const coverGift = {
  label: 'Ribbly · Portada con regalo',
  description: 'Su nombre subrayado a mano y una caja de regalo que se abre al tocarla.',
  category: 'intro',
  themeSchema: z.object({
    ...screen('pareja'),
    kicker: field.text('Texto de arriba', { default: 'Este regalo especial es para...' }),
    hint: field.text('Indicación', { default: '👆 Tocá para abrir', max: 40 }),
    opened: field.text('Después de abrir', {
      default: '¡Sorpresa! Deslizá para empezar',
      max: 50,
    }),
    senderPrefix: field.text('Antes del remitente', { default: 'DE PARTE DE:', max: 30 }),
  }),
  buyerSchema: null,
  frame: FRAME,
  summary: { icon: 'gift', title: 'El inicio', text: 'Una sorpresa con tu nombre.' },
} satisfies SlideDefinition

// ── 03 · Love edition ───────────────────────────────────────────────────────

const coverEdition = {
  label: 'Ribbly · Love edition',
  description:
    'Su foto enmarcada en ondas rosas, con la marca arriba y tu frase grande al pie. Se comparte como historia de Instagram.',
  category: 'intro',
  themeSchema: z.object({
    ...screen('pareja'),
    defaultWish: field.text('Frase si el comprador no escribe', {
      default: 'Porque sos mi persona favorita.',
      max: 90,
      help: 'Las últimas dos palabras van en rosa. Para elegir otras, marcalas con *asteriscos*.',
    }),
    defaultCaption: field.text('Texto sobre la foto si no hay', { default: 'nosotros', max: 30 }),
    shareLabel: field.text('Botón para compartir', {
      default: 'Compartir en Instagram',
      max: 30,
    }),
    photoFromKind: field.text('Si no hay foto, la primera de', {
      default: 'story.moments',
      advanced: true,
    }),
  }),
  buyerSchema: z.object({
    photo: field.photo('Su foto juntos', {
      help: 'Va grande, enmarcada en ondas rosas. Si no subís una, va la primera de tus fotos.',
    }),
    caption: field.text('Texto sobre la foto', { max: 30, placeholder: 'nosotros' }),
    wish: field.text('Una frase para empezar', {
      max: 80,
      placeholder: 'Porque sos mi persona favorita.',
      help: 'Va firmada con tu nombre. Las últimas dos palabras quedan en rosa.',
    }),
    since: field.text('¿Desde cuándo están juntos?', {
      max: 10,
      placeholder: '14/02/2021',
      help: 'Opcional (día/mes/año). Con esto contamos los días juntos en la pantalla de fotos.',
    }),
  }),
  frame: FRAME_LIGHT,
  summary: null,
  editor: {
    title: 'Love edition',
    intro:
      'La tapa de su edición especial: una foto de ustedes enmarcada en ondas rosas y una frase tuya, firmada. Se puede compartir como historia de Instagram.',
  },
  variables: { inicio: 'since' },
} satisfies SlideDefinition

// ── 13 · Revista (pareja) ───────────────────────────────────────────────────

export const LOVE_RELATIONS = [
  { value: 'neutro', label: 'Prefiero no decir' },
  { value: 'novia', label: 'Mi novia' },
  { value: 'novio', label: 'Mi novio' },
  { value: 'esposa', label: 'Mi esposa' },
  { value: 'esposo', label: 'Mi esposo' },
] as const

export const LOVE_TONES = [
  { value: 'cualquiera', label: 'El que mejor quede' },
  { value: 'romantico', label: 'Romántico' },
  { value: 'tierno', label: 'Tierno' },
  { value: 'apasionado', label: 'Apasionado' },
  { value: 'profundo', label: 'Profundo' },
  { value: 'agradecido', label: 'Agradecido' },
  { value: 'cotidiano', label: 'Cotidiano' },
  { value: 'divertido', label: 'Divertido' },
  { value: 'nostalgico', label: 'Nostálgico' },
] as const

/** La misma revista, con el banco de Pareja y sus vínculos. */
const storyMagazineLove = {
  ...storyMagazine,
  label: 'Ribbly · Revista (pareja)',
  themeSchema: z.object({
    ...screen('pareja'),
    bank: field.select('Banco de textos', MAGAZINE_BANKS, { default: 'pareja', advanced: true }),
    shareLabel: field.text('Botón compartir', { default: 'COMPARTIR STORY', max: 30 }),
    photoFromKind: field.text('Usar la primera foto de', {
      default: 'story.moments',
      advanced: true,
    }),
  }),
  buyerSchema: z.object({
    relation: field.select('¿Qué es para vos?', LOVE_RELATIONS, {
      default: 'neutro',
      help: 'Con esto elegimos un texto que les quede.',
    }),
    tone: field.select('Tono', LOVE_TONES, { default: 'cualquiera' }),
    version: field.number('Versión del texto', {
      min: 1,
      max: 30,
      default: 1,
      help: 'Subí el número para probar otro texto con el mismo vínculo y tono.',
    }),
    ownText: field.textarea('O escribí el tuyo (opcional)', {
      max: 320,
      placeholder: 'Si escribís acá, reemplaza al texto de la revista.',
    }),
    photo: field.photo('Foto de la tapa (opcional)', {
      help: 'Si no subís una, va la primera de tus fotos.',
    }),
  }),
  summary: { icon: 'pen-tool', title: 'Revista', text: 'Una nota de tapa sobre vos.' },
  editor: {
    title: 'La revista',
    intro:
      'Una tapa de revista que habla de esa persona. Decinos qué es para vos y el tono: elegimos entre 100 textos.',
  },
} satisfies SlideDefinition

// ── 15 · Gratitud ───────────────────────────────────────────────────────────

const pauseQuestion = field.group('Pregunta', {
  label: field.text('Rótulo', { max: 20 }),
  line1: field.text('Pregunta · línea 1', { max: 40 }),
  line2: field.text('Pregunta · final en cursiva', { max: 30 }),
  placeholder: field.text('Ayuda', { max: 60 }),
})

const reflectPause = {
  label: 'Ribbly · Gratitud',
  description: 'Una pausa para respirar y tres preguntas de gratitud que responde quien recibe.',
  category: 'reflect',
  themeSchema: z.object({
    ...screen('pareja'),
    kicker: field.text('Etiqueta', { default: 'UN MOMENTO PARA VOS', max: 30 }),
    title1: field.text('Título', { default: 'Pausa', max: 20 }),
    title2: field.text('Título · cursiva', { default: 'un segundo.', max: 20 }),
    subtitle: field.textarea('Texto', {
      default:
        'En la velocidad del día a día, a veces olvidamos valorar lo importante. Quiero invitarte a hacer un pequeño ejercicio de gratitud juntos.',
      max: 200,
    }),
    breath: field.text('Respiración', { default: 'INHALÁ · EXHALÁ', max: 30 }),
    cta: field.text('Botón', { default: 'Comenzar ✨', max: 30 }),
    questions: field.list('Preguntas', pauseQuestion, {
      min: 1,
      max: 5,
      itemLabel: 'Pregunta {n}',
      default: [
        {
          label: 'EL MOMENTO',
          line1: '¿Qué fue lo mejor que te pasó',
          line2: 'este año?',
          placeholder: 'Ese recuerdo que te saca una sonrisa…',
        },
        {
          label: 'LA PERSONA',
          line1: '¿Quién hizo tus días',
          line2: 'más lindos?',
          placeholder: 'Alguien que estuvo ahí…',
        },
        {
          label: 'EL LOGRO',
          line1: '¿Qué desafío',
          line2: 'te animaste a superar?',
          placeholder: 'Algo difícil que dejaste atrás…',
        },
      ],
    }),
    stepLabel: field.text('Progreso', { default: '✨ {{label}} · {{n}} DE {{total}}', max: 40 }),
    nextLabel: field.text('Botón siguiente', { default: 'Siguiente →', max: 20, advanced: true }),
    doneLabel: field.text('Botón del último', { default: 'Terminar ✨', max: 20 }),
    outroTitle: field.text('Final · título', { default: 'Gracias.', max: 30 }),
    outroText: field.text('Final · texto', {
      default: 'Por regalarte este momento. Nunca dejes de agradecer.',
      max: 100,
    }),
    againLabel: field.text('Botón ver respuestas', {
      default: 'Ver mis respuestas',
      max: 30,
      advanced: true,
    }),
  }),
  buyerSchema: null,
  frame: FRAME,
  summary: { icon: 'heart', title: 'Gratitud', text: 'Una pausa para valorar lo bueno.' },
} satisfies SlideDefinition

// ── 16 · Diario ─────────────────────────────────────────────────────────────

const reflectDiary = {
  label: 'Ribbly · Diario',
  description: 'Una libreta sobre la mesa con su nombre: adentro escribe lo que quiere recordar.',
  category: 'reflect',
  themeSchema: z.object({
    ...screen('pareja'),
    kicker: field.text('Etiqueta', { default: 'JOURNALING', max: 30 }),
    title1: field.text('Título', { default: 'Espacio', max: 20 }),
    title2: field.text('Título · segunda línea', { default: 'libre.', max: 20 }),
    subtitle: field.text('Texto', {
      default: 'Despejá tu mente. Este es un lugar seguro para tus pensamientos más grandes.',
      max: 120,
    }),
    phrase: field.text('Frase', { default: 'Escribir es aclarar.', max: 40 }),
    coverLabel: field.text('Tapa', { default: 'Diario de {{nombre}}', max: 30 }),
    openLabel: field.text('Botón', { default: '🖊️ Abrir mi diario', max: 30 }),
    placeholder: field.textarea('Ayuda de la página', {
      default: 'Querido diario: hoy…',
      max: 120,
    }),
    listTitle: field.text('Título de la lista', {
      default: 'Cosas que quiero recordar:',
      max: 40,
    }),
    listPlaceholders: field.list('Ayudas de la lista', field.text('Ayuda', { max: 30 }), {
      min: 1,
      max: 5,
      default: ['su risa', 'el café de la mañana', 'ese viaje'],
    }),
    photoCaption: field.text('Pie de la foto', { default: 'hoy ♥', max: 20 }),
    photoFromKind: field.text('Foto: la primera de', {
      default: 'story.moments',
      advanced: true,
    }),
    closeLabel: field.text('Botón cerrar', { default: 'Cerrar', max: 20, advanced: true }),
    saveLabel: field.text('Botón guardar', { default: 'Guardar en mi diario', max: 30 }),
    savedLabel: field.text('Al guardar', { default: 'Guardado en tu diario ✨', max: 40 }),
    editLabel: field.text('Botón con página escrita', {
      default: '🖊️ Seguir escribiendo',
      max: 30,
      advanced: true,
    }),
  }),
  buyerSchema: null,
  frame: FRAME,
  summary: { icon: 'pen-tool', title: 'Diario', text: 'Un espacio para escribir.' },
} satisfies SlideDefinition

// ── 17 · Fortuna ────────────────────────────────────────────────────────────

const gameCookie = {
  label: 'Ribbly · Galletita de la fortuna',
  description: 'Tres galletitas bajo las estrellas: elige una, se parte y sale tu mensaje.',
  category: 'game',
  themeSchema: z.object({
    ...screen('pareja'),
    kicker: field.text('Arriba', { default: 'Todo pasa por algo...', max: 30 }),
    title: field.text('Título', { default: 'Tu destino', max: 24 }),
    subtitle: field.text('Texto', {
      default: 'Elegí una galletita. Tu elección es la clave.',
      max: 60,
    }),
    instinct: field.text('Abajo', { default: 'Tu instinto sabe cuál es ✨', max: 40 }),
    labels: field.list('Rótulos de las galletitas', field.text('Rótulo', { max: 6 }), {
      min: 3,
      max: 3,
      default: ['I', 'II', 'III'],
      advanced: true,
    }),
    messageKicker: field.text('Rótulo del mensaje', { default: 'MENSAJE DEL UNIVERSO', max: 30 }),
    messages: field.list('Banco de mensajes', field.text('Mensaje', { max: 140 }), {
      min: 1,
      max: 12,
      itemLabel: 'Mensaje {n}',
      help: 'Se usa uno si el comprador no escribe el suyo.',
      default: [
        'La suerte no es casualidad, es preparación encontrando oportunidad. Estás listo.',
        'Lo que buscás también te está buscando. Mantené el corazón abierto.',
        'Se viene un año de abrazos largos y planes que se cumplen.',
        'Tu intuición es tu superpoder: si sentís que es por ahí, no lo dudes.',
        'Lo mejor todavía no pasó. Y lo vas a vivir bien acompañado.',
      ],
    }),
    closing1: field.text('Remate · línea 1', {
      default: 'Tu instinto te trajo hasta acá.',
      max: 50,
    }),
    closing2: field.text('Remate', { default: 'Confiá.', max: 20 }),
    saveLabel: field.text('Botón', { default: 'Guardar mi fortuna', max: 30 }),
  }),
  buyerSchema: z.object({
    message: field.textarea('Mensaje de la galletita', {
      max: 140,
      placeholder: 'La suerte no es casualidad, es preparación encontrando oportunidad.',
      help: 'Lo que le espera, en una frase. Si lo dejás vacío elegimos uno.',
    }),
  }),
  frame: FRAME,
  summary: { icon: 'moon', title: 'Fortuna', text: 'Un mensaje del universo.' },
  editor: {
    title: 'Galletita de la fortuna',
    intro:
      'Elige una de tres galletitas, se parte y sale tu mensaje. Si no escribís uno, va uno de los nuestros.',
  },
} satisfies SlideDefinition

export const ribblyDefinitions = {
  'intro.brand': introBrand,
  'cover.cake': coverCake,
  'cover.age': coverAge,
  'story.card': storyCard,
  'story.moments': storyMoments,
  'media.video': mediaVideo,
  'media.mix': mediaMix,
  'game.quiz': gameQuiz,
  'connector.premiere': connectorPremiere,
  'media.poster': mediaPoster,
  'game.slots': gameSlots,
  'game.vouchers': gameVouchers,
  'story.magazine': storyMagazine,
  'story.wishes': storyWishes,
  'reflect.candles': reflectCandles,
  'reflect.capsule': reflectCapsule,
  'game.pinata': gamePinata,
  'story.memory': storyMemory,
  'outro.recap': outroRecap,
  'outro.finale': outroFinale,
  // Pareja
  'cover.gift': coverGift,
  'cover.edition': coverEdition,
  'story.magazine-love': storyMagazineLove,
  'reflect.pause': reflectPause,
  'reflect.diary': reflectDiary,
  'game.cookie': gameCookie,
} as const

/** Contenido con el que arranca el editor del comprador en estas pantallas. */
export function ribblyInitialBuyerProps(
  kind: string,
  themeProps: Record<string, unknown>,
): Record<string, unknown> | null {
  switch (kind) {
    case 'game.quiz':
      return { questions: themeProps.examples ?? [] }
    case 'media.poster':
      return { picks: themeProps.suggestions ?? [] }
    case 'game.slots':
      return { prizes: themeProps.suggestions ?? [], winner: 2 }
    case 'game.vouchers':
      return {
        vouchers: (
          (themeProps.examples as { title: string; detail: string }[] | undefined) ?? []
        ).map(({ title, detail }) => ({ title, detail })),
      }
    case 'story.wishes':
      return { wishes: themeProps.suggestions ?? [] }
    default:
      return null
  }
}
