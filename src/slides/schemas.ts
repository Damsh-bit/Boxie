import { z } from 'zod'
import { field } from './fields'
import { accent, br, highlight, rich } from './rich-text'
import type { SlideDefinition } from './types'

/**
 * El contrato de cada tipo de slide: qué carga el admin (themeSchema, capa 1)
 * y qué carga el comprador (buyerSchema, capa 2).
 *
 * Los valores por defecto son los textos del prototipo: una temática nueva
 * arranca siendo idéntica a lo que existe y el admin cambia solo lo que quiere.
 * Este archivo no importa React: el servidor lo usa para validar temáticas y
 * contenido del comprador sin cargar el player.
 */

const UNSPLASH = (id: string, params = 'q=80&w=1200&auto=format&fit=crop') =>
  `https://images.unsplash.com/${id}?${params}`

// ── Intro ───────────────────────────────────────────────────────────────────

const introLogo = {
  label: 'Intro · Logo',
  description: 'El logo de Boxie entra rebotando. Primera pantalla del regalo.',
  category: 'intro',
  themeSchema: z.object({
    logo: field.image('Logo', { help: 'Vacío = logo de Boxie' }),
    tagline: field.text('Frase', { default: 'Una experiencia digital para vos.' }),
    hint: field.text('Indicación para deslizar', { default: 'Desliza para comenzar ➷' }),
  }),
  buyerSchema: null,
  frame: { background: 'intro' },
  summary: null,
} satisfies SlideDefinition

const coverRecipient = {
  label: 'Portada · Destinatario',
  description: 'El nombre de quien recibe, grande. Admite video o imagen de fondo.',
  category: 'intro',
  themeSchema: z.object({
    label: field.text('Texto de arriba', { default: 'Este regalo especial es para...' }),
    senderPrefix: field.text('Antes del remitente', { default: 'Con amor,' }),
    showGiftIcon: field.toggle('Ícono de regalo', { default: true }),
    backgroundVideo: field.video('Video de fondo', { help: 'Opcional. .mp4 o .webm, idealmente menos de 2 MB' }),
    backgroundImage: field.image('Imagen de fondo', { help: 'Opcional. Se usa si no hay video' }),
  }),
  buyerSchema: null,
  frame: { background: 'salmon', particles: 'heart' },
  summary: null,
} satisfies SlideDefinition

const coverFriends = {
  label: 'Portada · Amigos',
  description: 'Portada con tarjeta de frase y emojis flotando.',
  category: 'intro',
  themeSchema: z.object({
    badge: field.text('Etiqueta', { default: 'FRIENDSHIP EDITION' }),
    quote: field.richText('Frase', {
      default: rich('"La vida es mucho más divertida', br, 'cuando estamos juntos."'),
    }),
    thanks: field.text('Agradecimiento', { default: '¡Gracias por estar en todas! ✨' }),
    emojiTop: field.text('Emoji de arriba', { default: '👯‍♀️', max: 16 }),
    emojiBottom: field.text('Emoji de abajo', { default: '🥂', max: 16 }),
    senderPrefix: field.text('Antes del remitente', { default: 'De:' }),
  }),
  buyerSchema: null,
  frame: { background: 'none', particles: 'friend', fullScreen: true },
  summary: null,
} satisfies SlideDefinition

const coverBirthday = {
  label: 'Portada · Cumpleaños',
  description: 'Torta con velas, confeti y el nombre del cumpleañero.',
  category: 'intro',
  themeSchema: z.object({
    title: field.richText('Título', { default: rich('¡FELIZ', br, 'CUMPLE!') }),
    cakeLine1: field.text('Torta · línea 1', { default: 'Happy', max: 20 }),
    cakeLine2: field.text('Torta · línea 2', { default: 'Birthday', max: 20 }),
  }),
  buyerSchema: null,
  frame: { background: 'none', particles: 'bday-fest', fullScreen: true, confetti: true },
  summary: null,
} satisfies SlideDefinition

// ── Historia ────────────────────────────────────────────────────────────────

const storyIntro = {
  label: 'Historia · Stickers de bienvenida',
  description: 'Tres pantallas de stickers: saludo, "es una nueva experiencia" y el tema de la Boxie.',
  category: 'story',
  themeSchema: z.object({
    greeting: field.text('Saludo', { default: '¡HOLA!', max: 30 }),
    line1: field.text('Frase manuscrita', { default: 'Esto no es un regalo...' }),
    line2: field.text('Sticker 1', { default: 'ES UNA NUEVA', max: 40 }),
    line3: field.text('Sticker 2', { default: 'EXPERIENCIA', max: 40 }),
    line4: field.text('Sticker 3', { default: 'DISEÑADA PARA VOS', max: 40 }),
    tag: field.text('Etiqueta de la edición', { default: 'LOVE EDITION', max: 40 }),
    thoughtLabel: field.text('Antes del título', { default: 'Pensado en...' }),
    title: field.text('Título', { default: 'SENTIMIENTOS', max: 40 }),
    message: field.text('Mensaje', { default: 'Porque sos mi persona favorita.', max: 120 }),
    cta: field.text('Llamado final', { default: 'EMPEZAR AHORA', max: 40 }),
  }),
  buyerSchema: null,
  frame: { background: 'white', fullScreen: true },
  summary: { icon: 'gift', title: 'El Inicio', text: 'Una sorpresa preparada solo para vos.' },
} satisfies SlideDefinition

const storyDedication = {
  label: 'Historia · Dedicatoria',
  description: 'Carta del remitente sobre su foto, con botón para guardar el recuerdo.',
  category: 'story',
  themeSchema: z.object({
    heading: field.text('Encabezado', { default: 'Carta para vos 💌' }),
    defaultText: field.textarea('Texto si el comprador no escribe', {
      default: 'Te escribí esto pensando en todo lo que significas para mí. Espero que te guste este regalo.',
      max: 300,
    }),
    defaultImage: field.image('Foto de ejemplo', { default: UNSPLASH('photo-1518199266791-5375a83190b7', 'q=80&w=2070&auto=format&fit=crop') }),
    buttonLabel: field.text('Botón', { default: 'GUARDAR RECUERDO', max: 40 }),
  }),
  buyerSchema: z.object({
    text: field.textarea('Mensaje', {
      max: 250,
      placeholder: 'Te escribí esto pensando en todo lo que significás para mí...',
      help: 'Hasta 250 caracteres.',
    }),
    photo: field.photo('Foto de la dedicatoria', { required: true, help: 'Aparece de fondo de la carta y en la tapa de revista.' }),
  }),
  frame: { background: 'full', fullScreen: true },
  summary: { icon: 'heart', title: 'Dedicatoria', text: 'Palabras sinceras directo al corazón.' },
} satisfies SlideDefinition

const storyEditorial = {
  label: 'Historia · Tapa de revista',
  description: 'Diseño editorial con la foto de la dedicatoria en blanco y negro.',
  category: 'story',
  themeSchema: z.object({
    title: field.richText('Título', { default: rich('¿Quién', br, accent('eres tú'), br, 'para mí?') }),
    body1: field.richText('Primer párrafo', {
      default: rich(
        'Cuando pienso en vos, no solo pienso en la persona que amo, sino en todo lo que significas en mi vida. ',
        highlight('Eres mi lugar seguro'),
        ', mi confidente y la razón por la que los días grises tienen color.',
      ),
    }),
    body2: field.richText('Segundo párrafo', {
      default: rich(
        'Eres inspiración, calma en medio del caos y ese abrazo que me reinicia. A tu lado descubrí que los momentos sencillos son los más valiosos.',
      ),
    }),
    photoFromSlide: field.text('Usar la foto de la slide', {
      default: 'dedicatoria',
      help: 'Clave de la slide cuya foto se muestra (la del comprador).',
      advanced: true,
    }),
    fallbackImage: field.image('Foto si no hay', { default: UNSPLASH('photo-1494790108377-be9c29b29330', 'q=80&w=1887&auto=format&fit=crop') }),
    shareLabel: field.text('Botón compartir', { default: 'Compartir Story', advanced: true }),
  }),
  buyerSchema: null,
  frame: { background: 'full' },
  summary: { icon: 'camera', title: 'Editorial', text: 'Tu foto con estilo de revista. ¡Muy aesthetic!' },
} satisfies SlideDefinition

const storyReasons = {
  label: 'Historia · Razones',
  description: 'Las razones aparecen de a una, tipeándose.',
  category: 'story',
  themeSchema: z.object({
    title: field.text('Título', { default: '10 Razones' }),
    subtitle: field.text('Subtítulo', { default: 'Para recordarte lo especial que sos...' }),
    badgePrefix: field.text('Etiqueta de cada razón', { default: 'RAZÓN #', max: 20, advanced: true }),
    finalTitle: field.text('Cierre', { default: '¡Y un millón más! ✨' }),
    finalText: field.text('Cierre · segunda línea', { default: 'Te quiero infinito.' }),
    suggestions: field.list('Razones sugeridas', field.text('Razón', { max: 80 }), {
      max: 10,
      itemLabel: 'Razón #{n}',
      help: 'El editor del comprador arranca con estas; las puede cambiar.',
      default: [
        'Por tu forma de mirarme.',
        'Por cómo me hacés reír.',
        'Porque sos mi hogar.',
        'Por tu paciencia infinita.',
        'Porque me apoyás siempre.',
        'Por tus abrazos sanadores.',
        'Porque sos la persona más linda.',
        'Por nuestras charlas eternas.',
        'Porque me hacés mejor persona.',
        'Simplemente, porque Te Amo.',
      ],
    }),
  }),
  buyerSchema: z.object({
    reasons: field.list('10 Razones', field.text('Razón', { max: 80 }), {
      max: 10,
      itemLabel: 'Razón #{n}',
      help: 'Enumerá 10 motivos por los cuales querés a esta persona.',
    }),
  }),
  frame: { background: 'full' },
  summary: { icon: 'check-circle', title: '10 Razones', text: 'Un recordatorio de por qué sos especial.' },
} satisfies SlideDefinition

const storyAnecdote = {
  label: 'Historia · Anécdota',
  description: 'Tarjeta con foto y una historia compartida.',
  category: 'story',
  themeSchema: z.object({
    defaultTitle: field.text('Título si el comprador no pone uno', { default: 'Momento Inolvidable' }),
    defaultText: field.textarea('Texto de ejemplo', { default: 'Acá va esa historia increíble que compartimos...' }),
    fallbackImage: field.image('Foto de ejemplo', { default: UNSPLASH('photo-1524601500432-1e1a4c71d692', 'q=80&w=1000&auto=format&fit=crop') }),
    shareLabel: field.text('Botón compartir', { default: 'Compartir Story', advanced: true }),
  }),
  buyerSchema: z.object({
    title: field.text('Título de la anécdota', { max: 60, placeholder: 'Momento Inolvidable' }),
    text: field.textarea('Anécdota', { max: 400, placeholder: 'Esa historia que siempre recordamos...' }),
    photo: field.photo('Foto de la anécdota', { required: true }),
  }),
  frame: { background: 'full' },
  summary: { icon: 'film', title: 'Anécdota', text: 'Ese recuerdo imborrable. ¡Compartilo en Stories!' },
} satisfies SlideDefinition

// ── Música y pantallas ──────────────────────────────────────────────────────

const mediaSong = {
  label: 'Música · Nuestra canción',
  description: 'Video de YouTube a pantalla completa con la canción que eligió el comprador.',
  category: 'media',
  themeSchema: z.object({
    caption: field.text('Texto después del remitente', {
      default: 'siempre que se acuerda de vos, piensa en esta canción.',
      max: 160,
    }),
    emptyLabel: field.text('Si no hay video', { default: 'Sin Video', advanced: true }),
  }),
  buyerSchema: z.object({
    youtubeUrl: field.youtube('Link de YouTube', { placeholder: 'https://youtu.be/…' }),
    songTitle: field.text('Canción (título)', { max: 80, placeholder: 'Nuestra canción' }),
  }),
  frame: { background: 'full', fullScreen: true },
  summary: { icon: 'music', title: 'Nuestra Canción', text: 'Esa melodía que nos conecta.' },
} satisfies SlideDefinition

const playlist = field.group('Playlist', {
  title: field.text('Nombre', { max: 60 }),
  description: field.text('Descripción', { max: 80 }),
  image: field.image('Portada'),
  url: field.url('Link', { default: 'https://open.spotify.com' }),
})

const mediaPlaylists = {
  label: 'Música · Playlists',
  description: 'Lista estilo app de música, con la foto de la dedicatoria de portada.',
  category: 'media',
  themeSchema: z.object({
    title: field.text('Título', { default: 'Boxie Mix' }),
    subtitlePrefix: field.text('Subtítulo', { default: 'Creado especialmente para' }),
    photoFromSlide: field.text('Usar la foto de la slide', { default: 'dedicatoria', advanced: true }),
    fallbackImage: field.image('Portada si no hay foto', { default: UNSPLASH('photo-1493225255756-d9584f8606e9', 'q=80&w=800') }),
    playlists: field.list('Playlists', playlist, {
      min: 1,
      max: 12,
      itemLabel: 'Playlist {n}',
      default: [
        { title: 'Top 50: Global', description: 'Los hits mundiales.', image: UNSPLASH('photo-1493225255756-d9584f8606e9', 'w=300&q=80') },
        { title: 'Viva Latino', description: 'Los éxitos más calientes.', image: UNSPLASH('photo-1514525253440-b393452e2729', 'w=300&q=80') },
        { title: "Today's Top Hits", description: 'Lo que suena ahora.', image: UNSPLASH('photo-1470225620780-dba8ba36b745', 'w=300&q=80') },
        { title: 'Rock Classics', description: 'Leyendas del rock.', image: UNSPLASH('photo-1498038432885-c6f3f1b912ee', 'w=300&q=80') },
        { title: 'Chill Hits', description: 'Relájate y disfruta.', image: UNSPLASH('photo-1511671782779-c97d3d27a1d4', 'w=300&q=80') },
        { title: 'Mega Hit Mix', description: 'Una mezcla perfecta.', image: UNSPLASH('photo-1614613535308-eb5fbd3d2c17', 'w=300&q=80') },
        { title: 'All Out 2010s', description: 'La década dorada.', image: UNSPLASH('photo-1514320291840-2e0a9bf2a9ae', 'w=300&q=80') },
        { title: 'Reggaeton Viejo', description: 'Para perrear.', image: UNSPLASH('photo-1545128485-c400e7702796', 'w=300&q=80') },
      ].map((p) => ({ ...p, url: 'https://open.spotify.com' })),
    }),
  }),
  buyerSchema: null,
  frame: { background: 'full' },
  summary: { icon: 'headphones', title: 'Playlist', text: 'Una selección de temas para tu mood.' },
} satisfies SlideDefinition

const show = field.group('Título', {
  title: field.text('Nombre', { max: 60 }),
  tags: field.text('Géneros', { max: 60 }),
  image: field.image('Póster'),
  link: field.url('Link'),
})

const platform = field.group('Plataforma', {
  name: field.text('Nombre', { max: 30 }),
  logo: field.image('Logo'),
  shows: field.list('Títulos', show, { min: 1, max: 10, itemLabel: 'Título {n}' }),
})

const mediaStreaming = {
  label: 'Pantalla · Streaming',
  description: 'Recomendaciones de series y películas por plataforma.',
  category: 'media',
  themeSchema: z.object({
    badge: field.text('Etiqueta', { default: 'RECOMENDADO PARA VOS' }),
    watchLabel: field.text('Botón ver', { default: 'Ver Ahora', advanced: true }),
    nextLabel: field.text('Botón siguiente', { default: 'Siguiente', advanced: true }),
    platforms: field.list('Plataformas', platform, {
      min: 1,
      max: 5,
      itemLabel: 'Plataforma {n}',
      default: [
        {
          name: 'Netflix',
          logo: '/player/streaming/netflix.png',
          shows: [
            { title: 'Stranger Things', tags: 'Ciencia Ficción • Terror', image: '/player/streaming/stranger-things.jpg', link: 'https://www.netflix.com' },
            { title: 'Emily in Paris', tags: 'Romance • Comedia', image: '/player/streaming/emily-in-paris.jpg', link: 'https://www.netflix.com' },
            { title: 'Peaky Blinders', tags: 'Drama • Crimen', image: '/player/streaming/peaky-blinders.jpg', link: 'https://www.netflix.com' },
            { title: 'The Crown', tags: 'Drama • Historia', image: '', link: 'https://www.netflix.com' },
            { title: 'Dark', tags: 'Misterio • Sci-Fi', image: '', link: 'https://www.netflix.com' },
          ],
        },
        {
          name: 'Prime Video',
          logo: '/player/streaming/prime.png',
          shows: [
            { title: 'The Boys', tags: 'Acción • Superhéroes', image: '/player/streaming/the-boys.jpg', link: 'https://www.primevideo.com' },
            { title: 'Fleabag', tags: 'Comedia • Drama', image: '', link: 'https://www.primevideo.com' },
            { title: 'Fallout', tags: 'Post-apocalíptico', image: '', link: 'https://www.primevideo.com' },
            { title: 'Invincible', tags: 'Animación • Acción', image: '', link: 'https://www.primevideo.com' },
            { title: 'Reacher', tags: 'Crimen • Acción', image: '', link: 'https://www.primevideo.com' },
          ],
        },
        {
          name: 'Disney+',
          logo: '/player/streaming/disney.png',
          shows: [
            { title: 'El Rey León', tags: 'Animación • Clásico', image: '/player/streaming/el-rey-leon.jpg', link: 'https://www.disneyplus.com' },
            { title: 'Star Wars', tags: 'Sci-Fi • Aventura', image: '', link: 'https://www.disneyplus.com' },
            { title: 'Avengers', tags: 'Marvel • Acción', image: '', link: 'https://www.disneyplus.com' },
            { title: 'Avatar', tags: 'Fantasía • Épico', image: '', link: 'https://www.disneyplus.com' },
            { title: 'Bluey', tags: 'Familia • Kids', image: '', link: 'https://www.disneyplus.com' },
          ],
        },
      ],
    }),
  }),
  buyerSchema: null,
  frame: { background: 'full' },
  summary: null,
} satisfies SlideDefinition

// ── Conectores ──────────────────────────────────────────────────────────────

const connectorGamer = {
  label: 'Conector · Game start',
  description: 'Pantalla de transición antes de los juegos.',
  category: 'game',
  themeSchema: z.object({
    emoji: field.text('Emoji', { default: '🎮', max: 16 }),
    title: field.text('Título', { default: '¿Estás listo?' }),
    subtitle: field.text('Subtítulo', { default: 'GAME START' }),
  }),
  buyerSchema: null,
  frame: { background: 'full' },
  summary: null,
} satisfies SlideDefinition

const connectorCinema = {
  label: 'Conector · Telón de cine',
  description: 'Se abre el telón y el remitente presenta las recomendaciones.',
  category: 'media',
  themeSchema: z.object({
    title: field.text('Título', { default: 'Prepara los pochoclos...' }),
    subtitle: field.text('Subtítulo', { default: 'La función está por comenzar' }),
    emoji: field.text('Emoji', { default: '🍿', max: 16 }),
    secondEmoji: field.text('Emoji del mensaje', { default: '🎬', max: 16 }),
    message: field.text('Después del remitente', { default: 'quiere decirte algo...' }),
    quote: field.textarea('Mensaje', {
      default: '"No podés quedarte sin ver estas historias. Son recomendaciones imperdibles pensadas 100% para vos."',
      max: 240,
    }),
    footer: field.text('Pie', { default: '¡A maratonear!' }),
  }),
  buyerSchema: null,
  frame: { background: 'full' },
  summary: null,
} satisfies SlideDefinition

// ── Juegos ──────────────────────────────────────────────────────────────────

const question = field.group('Pregunta', {
  question: field.text('Pregunta', { max: 160 }),
  options: field.list('Opciones', field.text('Opción', { max: 60 }), { min: 2, max: 4, itemLabel: 'Opción {n}' }),
  correct: field.number('Opción correcta (1 a 4)', { min: 1, max: 4, default: 1 }),
  hint: field.text('Pista', { max: 160 }),
})

const gameTrivia = {
  label: 'Juego · Trivia',
  description: 'Preguntas con pista; al ganar aparece un premio.',
  category: 'game',
  themeSchema: z.object({
    introEmoji: field.text('Emoji de inicio', { default: '🎁', max: 16 }),
    introTitle: field.text('Título', { default: '¡Desafío Boxie!' }),
    introText: field.richText('Texto de inicio', {
      default: rich('Demostrá cuánto sabés.', br, '3 preguntas correctas = ', { text: 'Premio Sorpresa', mark: 'bold' }, '.'),
    }),
    startLabel: field.text('Botón empezar', { default: '¡Jugar Ahora!' }),
    hintLabel: field.text('Botón pista', { default: 'Ver Pista', advanced: true }),
    hintPrefix: field.text('Antes de la pista', { default: '💡 Pista:', advanced: true }),
    questions: field.list('Preguntas', question, {
      min: 1,
      max: 10,
      itemLabel: 'Pregunta {n}',
      default: [
        { question: '¿En qué país se encuentra la Torre Eiffel?', options: ['Italia', 'Francia', 'España', 'Alemania'], correct: 2, hint: 'Es el país del amor y los croissants 🥐' },
        { question: "¿Cuál es el planeta conocido como el 'Planeta Rojo'?", options: ['Venus', 'Marte', 'Júpiter', 'Saturno'], correct: 2, hint: 'Lleva el nombre del dios romano de la guerra ⚔️' },
        { question: "¿Quién escribió 'Romeo y Julieta'?", options: ['Cervantes', 'Hemingway', 'Shakespeare', 'Dickens'], correct: 3, hint: 'Es un dramaturgo inglés muy famoso 🎭' },
      ],
    }),
    prizeTitle: field.richText('Premio · título', { default: rich('¡Jugada', br, 'Maestra!') }),
    prizeText: field.text('Premio · texto', { default: 'Lo lograste. Acá está tu recompensa:' }),
    prizeBadge: field.text('Premio · insignia', { default: 'BOXIE-GENIO', max: 30 }),
    prizeDetail: field.text('Premio · detalle', { default: 'VALE POR 15% OFF', max: 60, help: 'Si ofrecés un cupón real, poné acá el código.' }),
    prizeFootnote: field.text('Premio · aclaración', { default: 'Hacé captura para canjear' }),
  }),
  buyerSchema: null,
  frame: { background: 'full' },
  summary: { icon: 'smile', title: 'Desafío Trivia', text: 'Jugaste y ganaste (¡esperamos!).' },
} satisfies SlideDefinition

const gameJackpot = {
  label: 'Juego · Tragamonedas',
  description: 'Se tira de la palanca y siempre sale premio mayor.',
  category: 'game',
  themeSchema: z.object({
    title: field.richText('Título', { default: rich('TU DÍA DE', br, accent('SUERTE')) }),
    spinLabel: field.text('Botón', { default: '¡GIRAR AHORA!' }),
    wonLabel: field.text('Al ganar', { default: '¡PREMIO MAYOR!' }),
    winTitle: field.text('Pantalla ganadora · título', { default: '¡JACKPOT!' }),
    winText: field.text('Pantalla ganadora · texto', { default: 'Has desbloqueado todos los deseos.' }),
    scrollHint: field.text('Indicación final', { default: 'Scrollea para ver tus premios ➷' }),
    symbols: field.list('Símbolos que giran', field.text('Símbolo', { max: 16 }), {
      min: 3,
      max: 10,
      default: ['💎', '🍭', '✨', '🍉', '⭐', '🎁'],
      advanced: true,
    }),
  }),
  buyerSchema: null,
  frame: { background: 'full' },
  summary: { icon: 'sun', title: 'Jackpot', text: 'La suerte estuvo de tu lado hoy.' },
} satisfies SlideDefinition

const couponStyle = field.group('Cupón de ejemplo', {
  icon: field.text('Emoji', { max: 16 }),
  title: field.text('Título', { max: 40 }),
  detail: field.text('Detalle', { max: 120 }),
  color: field.color('Color', { default: '#FF9A9E' }),
})

const gameCoupons = {
  label: 'Juego · Cuponera',
  description: 'Vales que el destinatario abre y canjea.',
  category: 'game',
  themeSchema: z.object({
    emoji: field.text('Emoji', { default: '🎫', max: 16 }),
    title: field.text('Título', { default: 'Cuponera' }),
    subtitle: field.text('Subtítulo', { default: 'Tocá para canjear tus regalos.' }),
    ctaLabel: field.text('Rótulo de cada vale', { default: 'Ver Detalle', advanced: true }),
    readLabel: field.text('Sello de visto', { default: 'VISTO', advanced: true }),
    claimLabel: field.text('Botón del detalle', { default: '¡Lo quiero! ✨', advanced: true }),
    fallbackDetail: field.text('Detalle si el comprador no escribe uno', { default: '¡Canjealo cuando quieras!', advanced: true }),
    examples: field.list('Vales de ejemplo', couponStyle, {
      min: 1,
      max: 8,
      itemLabel: 'Vale {n}',
      help: 'Se muestran si el comprador no cargó los suyos. Sus emojis y colores se reutilizan para los del comprador.',
      default: [
        { icon: '🍔', title: 'Cena Rica', detail: 'Yo invito y yo cocino (o delivery).', color: '#FF9A9E' },
        { icon: '💆‍♂️', title: 'Masajes', detail: 'Sesión de 30 minutos de relax total.', color: '#A18CD1' },
        { icon: '🎬', title: 'Cine en Casa', detail: 'Peli + Pochoclos + Manta.', color: '#84FAB0' },
        { icon: '🥐', title: 'Desayuno', detail: 'En la cama, un domingo cualquiera.', color: '#FFC3A0' },
        { icon: '🔥', title: 'Comodín', detail: 'Vale por lo que vos quieras...', color: '#FF9A9E' },
        { icon: '✈️', title: 'Escapada', detail: 'Un finde fuera de la ciudad.', color: '#A8EDEA' },
      ],
    }),
    suggestions: field.list('Vales sugeridos al comprador', field.text('Vale', { max: 40 }), {
      max: 8,
      itemLabel: 'Vale {n}',
      default: ['Cena Romántica', 'Masaje Relajante', 'Noche de Cine', 'Desayuno en la Cama', 'Deseo Hot', 'Escapada', 'Deseo Mágico', 'Vale por un Beso'],
    }),
  }),
  buyerSchema: z.object({
    coupons: field.list(
      'Cuponera',
      field.group('Vale', {
        title: field.text('Vale', { max: 40 }),
        detail: field.text('Detalle (opcional)', { max: 120 }),
      }),
      { max: 8, itemLabel: 'Vale {n}', help: 'Escribí hasta 8 "vales" simbólicos.' },
    ),
  }),
  frame: { background: 'full' },
  summary: { icon: 'ticket', title: 'Cuponera', text: 'Vales por momentos para canjear cuando quieras.' },
} satisfies SlideDefinition

const gameFortune = {
  label: 'Juego · Galleta de la fortuna',
  description: 'Se elige una galleta y aparece un mensaje del universo.',
  category: 'game',
  themeSchema: z.object({
    introLines: field.list('Frases de entrada', field.text('Frase', { max: 60 }), {
      min: 1,
      max: 5,
      default: ['Todo pasa por algo...', 'Tu intuición no falla...', 'El destino llama.'],
    }),
    introEmoji: field.text('Emoji', { default: '🔮', max: 16 }),
    chooseTitle: field.text('Título', { default: 'Tu Destino' }),
    chooseText: field.richText('Texto', { default: rich('Elegí con sabiduría.', br, { text: 'Tu elección es la clave.', mark: 'bold' }) }),
    optionLabel: field.text('Rótulo de cada galleta', { default: 'OPCIÓN', advanced: true }),
    fortunes: field.list('Mensajes', field.textarea('Mensaje', { max: 200 }), {
      min: 1,
      max: 20,
      itemLabel: 'Mensaje {n}',
      default: [
        'La suerte no es casualidad, es preparación encontrando oportunidad. Estás listo.',
        'Un gran cambio se acerca, y será exactamente lo que tu corazón estaba pidiendo.',
        'Tu intuición es tu superpoder. Si sentís que es por ahí, no lo dudes.',
        'Lo que buscás te está buscando a vos. Mantené los ojos (y el corazón) abiertos.',
        'Hoy es el día perfecto para empezar eso que venís postergando. El universo te avala.',
      ],
    }),
    resultLabel: field.text('Encabezado del mensaje', { default: 'Mensaje del Universo' }),
    resultFooter: field.richText('Pie del mensaje', { default: rich('Tu instinto te trajo hasta acá.', br, accent('Confiá.')) }),
  }),
  buyerSchema: null,
  frame: { background: 'full' },
  summary: { icon: 'moon', title: 'Fortuna', text: 'Un mensaje del universo para guiarte.' },
} satisfies SlideDefinition

// ── Reflexión ───────────────────────────────────────────────────────────────

const gratitudeQuestion = field.group('Pregunta', {
  icon: field.text('Emoji', { max: 16 }),
  label: field.text('Rótulo', { max: 30 }),
  question: field.text('Pregunta', { max: 120 }),
  placeholder: field.text('Ayuda', { max: 80 }),
})

const reflectGratitude = {
  label: 'Reflexión · Gratitud',
  description: 'Un ejercicio guiado de tres preguntas.',
  category: 'reflect',
  themeSchema: z.object({
    introEmoji: field.text('Emoji', { default: '🧘', max: 16 }),
    introTitle: field.text('Título', { default: 'Pausa un segundo.' }),
    introText: field.richText('Texto', {
      default: rich(
        'En la velocidad del día a día, a veces olvidamos valorar lo importante.',
        br,
        br,
        'Quiero invitarte a hacer un pequeño ',
        { text: 'ejercicio de gratitud', mark: 'bold' },
        ' juntos.',
      ),
    }),
    startLabel: field.text('Botón', { default: 'Comenzar ✨' }),
    questions: field.list('Preguntas', gratitudeQuestion, {
      min: 1,
      max: 5,
      itemLabel: 'Pregunta {n}',
      default: [
        { icon: '✨', label: 'EL MOMENTO', question: '¿Qué fue lo mejor que te pasó este año?', placeholder: 'Ese recuerdo que te saca una sonrisa...' },
        { icon: '❤️', label: 'LA PERSONA', question: '¿Quién hizo tus días más felices?', placeholder: 'Alguien que estuvo ahí para vos...' },
        { icon: '💪', label: 'EL LOGRO', question: '¿De qué desafío te sentís orgulloso/a?', placeholder: 'Algo difícil que superaste...' },
      ],
    }),
    outroEmoji: field.text('Emoji final', { default: '❤️', max: 16 }),
    outroTitle: field.text('Título final', { default: 'Gracias.' }),
    // El prototipo decía "Tus respuestas se han guardado": no se guardaban en ningún lado.
    outroText: field.richText('Texto final', { default: rich('Gracias por regalarte este momento.', br, 'Nunca dejes de agradecer.') }),
    outroBadge: field.text('Sello final', { default: 'Ejercicio completado' }),
  }),
  buyerSchema: null,
  frame: { background: 'full' },
  summary: { icon: 'heart', title: 'Gratitud', text: 'Pausa para valorar lo bueno del año.' },
} satisfies SlideDefinition

const reflectJournal = {
  label: 'Reflexión · Diario',
  description: 'Un espacio para escribir, con una consigna.',
  category: 'reflect',
  themeSchema: z.object({
    introEmoji: field.text('Emoji', { default: '☁️', max: 16 }),
    introTitle: field.text('Título', { default: 'Espacio Libre.' }),
    introText: field.richText('Texto', {
      default: rich(
        'Despejá tu mente. Este es un lugar seguro para tus pensamientos más grandes.',
        br,
        br,
        { text: 'Escribir es aclarar.', mark: 'bold' },
      ),
    }),
    openLabel: field.text('Botón', { default: 'Abrir mi Diario 🖊️' }),
    promptTitle: field.text('Consigna · título', { default: 'Tu Próximo Capítulo' }),
    promptText: field.textarea('Consigna', {
      default: 'Si tuvieras que escribir el título del próximo gran capítulo de tu vida, ¿cuál sería y por qué?',
      max: 240,
    }),
    placeholder: field.text('Ayuda', { default: 'Deja fluir tus ideas acá...' }),
    saveLabel: field.text('Botón guardar', { default: 'Guardar Pensamiento ✨' }),
    outroEmoji: field.text('Emoji final', { default: '🦋', max: 16 }),
    outroTitle: field.text('Título final', { default: 'Claridad.' }),
    outroQuote: field.textarea('Frase final', {
      default: '"Escribir es la forma más pura de escuchar lo que tu mente tiene para decir."',
      max: 240,
    }),
    // El prototipo decía "Entrada guardada en tu Boxie": no se guardaba.
    outroBadge: field.text('Sello final', { default: 'Un pensamiento para vos' }),
  }),
  buyerSchema: null,
  frame: { background: 'full' },
  summary: { icon: 'pen-tool', title: 'Journaling', text: 'Espacio para escribir tu futuro.' },
} satisfies SlideDefinition

// ── Cierre ──────────────────────────────────────────────────────────────────

const outroSummary = {
  label: 'Cierre · Repaso',
  description: 'Línea de tiempo con todo lo que tuvo la Boxie. Se arma sola con las slides de la temática.',
  category: 'outro',
  themeSchema: z.object({
    wait: field.text('Primera línea', { default: 'Espera...' }),
    badge1: field.text('Sticker 1', { default: '¡QUÉ VIAJE!' }),
    badge2: field.text('Sticker 2', { default: 'TODO LO QUE VIMOS' }),
    intro: field.text('Texto', { default: 'Repasemos juntos todo lo que incluía tu Boxie...' }),
    timelineTitle: field.text('Título de la línea de tiempo', { default: 'TU EXPERIENCIA' }),
    thanksTitle: field.text('Cierre · título', { default: 'GRACIAS.' }),
    thanksText: field.text('Cierre · texto', { default: 'Por vivir esta experiencia con nosotros de principio a fin.' }),
    favorTitle: field.text('Pedido · título', { default: 'Un último favor' }),
    favorText: field.richText('Pedido · texto', {
      default: rich('Si te gustó, compartí tus capturas favoritas en ', { text: 'Stories', mark: 'bold' }, '. ¡Nos ayudás muchísimo a seguir creando momentos así!'),
    }),
    handle: field.text('Cuenta de Instagram', { default: '@boxie.app' }),
    replayLabel: field.text('Repetir repaso', { default: 'Ver repaso de nuevo ↺', advanced: true }),
  }),
  buyerSchema: null,
  frame: { background: 'full' },
  summary: null,
} satisfies SlideDefinition

const outroThanks = {
  label: 'Cierre · Gracias',
  description: 'Última pantalla, con botón para ver la Boxie de nuevo.',
  category: 'outro',
  themeSchema: z.object({
    title: field.text('Título', { default: 'GRACIAS' }),
    text: field.text('Texto', { default: 'Por ser parte de mi vida.' }),
    replayLabel: field.text('Botón', { default: 'REPETIR BOXIE' }),
  }),
  buyerSchema: null,
  frame: { background: 'salmon', particles: 'heart' },
  summary: null,
} satisfies SlideDefinition

// ── Registro ────────────────────────────────────────────────────────────────

export const slideDefinitions = {
  'intro.logo': introLogo,
  'cover.recipient': coverRecipient,
  'cover.friends': coverFriends,
  'cover.birthday': coverBirthday,
  'story.intro': storyIntro,
  'story.dedication': storyDedication,
  'story.editorial': storyEditorial,
  'story.reasons': storyReasons,
  'story.anecdote': storyAnecdote,
  'media.song': mediaSong,
  'media.playlists': mediaPlaylists,
  'media.streaming': mediaStreaming,
  'connector.gamer': connectorGamer,
  'connector.cinema': connectorCinema,
  'game.trivia': gameTrivia,
  'game.jackpot': gameJackpot,
  'game.coupons': gameCoupons,
  'game.fortune': gameFortune,
  'reflect.gratitude': reflectGratitude,
  'reflect.journal': reflectJournal,
  'outro.summary': outroSummary,
  'outro.thanks': outroThanks,
} as const

export type SlideKind = keyof typeof slideDefinitions
export type SlideDefinitions = typeof slideDefinitions
export type ThemePropsOf<K extends SlideKind> = z.output<SlideDefinitions[K]['themeSchema']>
export type BuyerPropsOf<K extends SlideKind> = SlideDefinitions[K]['buyerSchema'] extends z.ZodType
  ? z.output<SlideDefinitions[K]['buyerSchema']>
  : Record<string, never>

export const SLIDE_KINDS = Object.keys(slideDefinitions) as SlideKind[]

export function isSlideKind(kind: string): kind is SlideKind {
  return Object.hasOwn(slideDefinitions, kind)
}

/**
 * Contenido inicial del editor del comprador: las sugerencias de la temática
 * (como hacía el prototipo al elegir el tipo de Boxie).
 */
export function initialBuyerProps(kind: SlideKind, themeProps: Record<string, unknown>): Record<string, unknown> {
  switch (kind) {
    case 'story.reasons':
      return { reasons: (themeProps.suggestions as string[] | undefined) ?? [] }
    case 'game.coupons':
      return {
        coupons: ((themeProps.suggestions as string[] | undefined) ?? []).map((title) => ({ title, detail: '' })),
      }
    default:
      return {}
  }
}
