/**
 * El hilo de la historia: lo que une todas las pantallas de una Ribbly.
 *
 * Una Ribbly regala muchas cosas distintas (una carta, fotos, una canción,
 * juegos, vales, algo para que escriba quien recibe). Sin un hilo parecen
 * regalos sueltos. El prólogo (`story.bond`) cuenta quiénes son el uno para el
 * otro y cada pocas pantallas un capítulo (`story.thread`) dice qué pensó
 * quien regala y para qué: "Lean pensó en la canción que los une" → para
 * regalarte: su canción y la playlist.
 *
 * El tema de cada capítulo sale solo de las pantallas que vienen después (así
 * sirve en cualquier temática y en cualquier plan), y la voz, del vínculo y el
 * tono que eligió quien regala en el prólogo. Los textos son determinísticos:
 * los mismos nombres dan siempre el mismo texto y `version` prueba otro.
 *
 * Sin React: lo usan las pantallas, los tests y el servidor.
 */

// ── Tipos de pantalla del hilo ──────────────────────────────────────────────

export const BOND_KINDS = ['story.bond', 'story.bond-love'] as const
export const CHAPTER_KIND = 'story.thread' as const

/** El prólogo o un capítulo: las pantallas que cuentan la historia entre las demás. */
export function isThreadKind(kind: string): boolean {
  return kind === CHAPTER_KIND || (BOND_KINDS as readonly string[]).includes(kind)
}

// ── Vínculo y tono ──────────────────────────────────────────────────────────

export type BondGroup = 'pareja' | 'amistad' | 'familia' | 'trabajo' | 'generico'

export const THREAD_TONES = [
  { value: 'cualquiera', label: 'El que mejor quede' },
  { value: 'calido', label: 'Cálido' },
  { value: 'emotivo', label: 'Emotivo' },
  { value: 'divertido', label: 'Divertido' },
  { value: 'romantico', label: 'Romántico' },
] as const

export type ThreadTone = Exclude<(typeof THREAD_TONES)[number]['value'], 'cualquiera'>
const TONES: readonly ThreadTone[] = ['calido', 'emotivo', 'divertido', 'romantico']

/** Las ocasiones con su estilo (colores de fondo y de la cinta). */
export const THREAD_LOOKS = [
  { value: 'cumple', label: 'Cumpleaños' },
  { value: 'pareja', label: 'Pareja' },
  { value: 'amistad', label: 'Amistad' },
] as const

const GROUP_OF: Record<string, BondGroup> = {
  pareja: 'pareja',
  novia: 'pareja',
  novio: 'pareja',
  esposa: 'pareja',
  esposo: 'pareja',
  amiga: 'amistad',
  amigo: 'amistad',
  hermana: 'familia',
  hermano: 'familia',
  mama: 'familia',
  papa: 'familia',
  hija: 'familia',
  hijo: 'familia',
  prima: 'familia',
  primo: 'familia',
  abuela: 'familia',
  abuelo: 'familia',
  tia: 'familia',
  tio: 'familia',
  sobrina: 'familia',
  ahijado: 'familia',
  companera: 'trabajo',
  companero: 'trabajo',
  equipo: 'trabajo',
  jefa: 'trabajo',
  socio: 'trabajo',
}

/**
 * Qué son el uno para el otro, en grandes grupos. Sin vínculo declarado
 * ("Prefiero no decir") manda la ocasión: en Pareja es pareja.
 */
export function bondGroup(relation: string | undefined, look?: string): BondGroup {
  const group = GROUP_OF[relation ?? '']
  if (group) return group
  if (look === 'pareja') return 'pareja'
  if (look === 'amistad') return 'amistad'
  return 'generico'
}

const AUTO_TONE: Record<BondGroup, ThreadTone> = {
  pareja: 'romantico',
  amistad: 'divertido',
  familia: 'emotivo',
  trabajo: 'calido',
  generico: 'calido',
}

/** El tono elegido o, con "El que mejor quede", el que mejor le va al vínculo. */
export function resolveTone(tone: string | undefined, group: BondGroup): ThreadTone {
  return (TONES as readonly string[]).includes(tone ?? '') ? (tone as ThreadTone) : AUTO_TONE[group]
}

// ── Temas de los capítulos ──────────────────────────────────────────────────

export const THREAD_TOPICS = [
  { value: 'auto', label: 'Según lo que sigue' },
  { value: 'carta', label: 'Carta' },
  { value: 'fotos', label: 'Fotos' },
  { value: 'musica', label: 'Música' },
  { value: 'juego', label: 'Juego' },
  { value: 'cine', label: 'Cine' },
  { value: 'premios', label: 'Premios y vales' },
  { value: 'palabras', label: 'Palabras' },
  { value: 'turno', label: 'Le toca escribir' },
  { value: 'sorpresa', label: 'Sorpresa' },
  { value: 'recuerdo', label: 'Recuerdo' },
  { value: 'final', label: 'Final' },
  { value: 'general', label: 'General' },
] as const

export type ThreadTopic = Exclude<(typeof THREAD_TOPICS)[number]['value'], 'auto'>

/** De qué se trata cada tipo de pantalla, para el capítulo que la anuncia. */
const KIND_TOPIC: Record<string, ThreadTopic> = {
  'story.card': 'carta',
  'story.dedication': 'carta',
  'story.moments': 'fotos',
  'media.video': 'musica',
  'media.song': 'musica',
  'media.mix': 'musica',
  'media.playlists': 'musica',
  'game.quiz': 'juego',
  'game.trivia': 'juego',
  'connector.gamer': 'juego',
  'connector.premiere': 'cine',
  'connector.cinema': 'cine',
  'media.poster': 'cine',
  'media.streaming': 'cine',
  'game.slots': 'premios',
  'game.jackpot': 'premios',
  'game.vouchers': 'premios',
  'game.coupons': 'premios',
  'story.magazine': 'palabras',
  'story.magazine-love': 'palabras',
  'story.editorial': 'palabras',
  'story.wishes': 'palabras',
  'story.reasons': 'palabras',
  'story.intro': 'palabras',
  'reflect.candles': 'turno',
  'reflect.capsule': 'turno',
  'reflect.pause': 'turno',
  'reflect.diary': 'turno',
  'reflect.gratitude': 'turno',
  'reflect.journal': 'turno',
  'game.pinata': 'sorpresa',
  'game.cookie': 'sorpresa',
  'game.fortune': 'sorpresa',
  'story.memory': 'recuerdo',
  'story.anecdote': 'recuerdo',
  'outro.recap': 'final',
  'outro.summary': 'final',
  'outro.finale': 'final',
  'outro.thanks': 'final',
}

export interface ThreadSlideRef {
  key: string
  kind: string
}

/**
 * Las pantallas que anuncia un capítulo: las que siguen hasta el próximo
 * capítulo (o el final). Es lo que quien regala "pensó para regalarte".
 */
export function chapterSlides(slides: readonly ThreadSlideRef[], index: number): ThreadSlideRef[] {
  const out: ThreadSlideRef[] = []
  for (let i = index + 1; i < slides.length; i++) {
    const slide = slides[i]!
    if (isThreadKind(slide.kind)) break
    out.push(slide)
  }
  return out
}

/** El tema del capítulo: el de la primera pantalla que lo tiene. */
export function chapterTopic(slides: readonly ThreadSlideRef[], index: number): ThreadTopic {
  for (const slide of chapterSlides(slides, index)) {
    const topic = KIND_TOPIC[slide.kind]
    if (topic) return topic
  }
  return 'general'
}

/** El tema que eligió la temática para el capítulo o, en automático, el de lo que sigue. */
export function resolveChapterTopic(
  slides: readonly ThreadSlideRef[],
  index: number,
  override: string | undefined,
): ThreadTopic {
  return override && Object.hasOwn(TOPIC_COPY, override)
    ? (override as ThreadTopic)
    : chapterTopic(slides, index)
}

/** Prólogo y capítulos en orden, para numerarlos y dibujar los nudos del hilo. */
export function threadKnots(slides: readonly ThreadSlideRef[]): number[] {
  return slides.flatMap((s, i) => (isThreadKind(s.kind) ? [i] : []))
}

/** "Capítulo 3": el número entre los capítulos (el prólogo no cuenta). */
export function chapterNumber(slides: readonly ThreadSlideRef[], index: number): number {
  let n = 0
  for (let i = 0; i <= index && i < slides.length; i++) {
    if (slides[i]!.kind === CHAPTER_KIND) n++
  }
  return n
}

/** "Capítulo 3 · La banda sonora"; el último, "Epílogo". */
export function chapterLabel(
  slides: readonly ThreadSlideRef[],
  index: number,
  override?: string,
): string {
  const topic = resolveChapterTopic(slides, index, override)
  const name = TOPIC_COPY[topic].chapter
  return topic === 'final' ? name : `Capítulo ${chapterNumber(slides, index)} · ${name}`
}

/**
 * Con planes, una temática pierde pantallas: un capítulo puede quedar sin
 * nada que anunciar (seguido de otro capítulo o al final). Esos se sacan; el
 * prólogo queda siempre que haya algo después.
 */
export function withoutEmptyChapters<T extends ThreadSlideRef>(slides: readonly T[]): T[] {
  return slides.filter((slide, i) => {
    if (!isThreadKind(slide.kind)) return true
    const next = slides[i + 1]
    if (!next) return false
    return slide.kind !== CHAPTER_KIND || !isThreadKind(next.kind)
  })
}

// ── Textos ──────────────────────────────────────────────────────────────────

export interface TopicCopy {
  /** El nombre del capítulo: "La banda sonora". */
  chapter: string
  /** Lo que pensó quien regala: "{{de}} pensó en" + esto. */
  thought: string
  /** El rótulo de lo que viene: "Para regalarte". */
  gift: string
}

export const TOPIC_COPY: Record<ThreadTopic, TopicCopy> = {
  carta: { chapter: 'Lo que siente', thought: 'las palabras justas', gift: 'Para regalarte' },
  fotos: {
    chapter: 'Lo que vivieron',
    thought: 'todo lo que vivieron juntos',
    gift: 'Para regalarte',
  },
  musica: {
    chapter: 'La banda sonora',
    thought: 'la canción que los une',
    gift: 'Para regalarte',
  },
  juego: {
    chapter: 'Cuánto se conocen',
    thought: 'cuánto se conocen de verdad',
    gift: 'Para jugar',
  },
  cine: { chapter: 'Plan de sillón', thought: 'una noche de peli con vos', gift: 'Para regalarte' },
  premios: {
    chapter: 'Lo que viene',
    thought: 'los planes que tienen pendientes',
    gift: 'Para regalarte',
  },
  palabras: {
    chapter: 'Lo que ve en vos',
    thought: 'todo lo que ve en vos',
    gift: 'Para regalarte',
  },
  turno: { chapter: 'Tu turno', thought: 'lo que vos tenés para decir', gift: 'Para vos' },
  sorpresa: { chapter: 'Una más', thought: 'una última sorpresa', gift: 'Para regalarte' },
  recuerdo: { chapter: 'Ese recuerdo', thought: 'un momento inolvidable', gift: 'Para regalarte' },
  final: { chapter: 'Epílogo', thought: 'vos, todo el tiempo', gift: 'Para cerrar' },
  general: {
    chapter: 'Un capítulo más',
    thought: 'algo especial para vos',
    gift: 'Para regalarte',
  },
}

type Bank = Record<ThreadTone, readonly [string, string]>

/** La nota de cada capítulo, en la voz de quien regala. */
export const CHAPTER_NOTES: Record<ThreadTopic, Bank> = {
  carta: {
    calido: [
      'Antes que nada, quería escribirte. Hay cosas que se dicen mejor así, despacio y en una carta.',
      'Arranqué por lo más simple y lo más difícil: decirte lo que siento. Acá va.',
    ],
    emotivo: [
      'Pensé mucho por dónde empezar y la respuesta fue fácil: por lo que siento. Así que te escribí.',
      'Hay palabras que tenía guardadas hace rato. Esta carta es el lugar donde por fin las dejo.',
    ],
    divertido: [
      'Arranco por lo clásico: una carta. Sí, como en las pelis. Leela con voz dramática, por favor.',
      'Te escribí una carta. A mano no, porque mi letra es un crimen, pero con todo el corazón.',
    ],
    romantico: [
      'Antes de todo lo demás, una carta. Porque lo nuestro también se escribe con palabras.',
      'Si tuviera que empezar a contarte cuánto te quiero, empezaría así: escribiéndote.',
    ],
  },
  fotos: {
    calido: [
      'Junté algunos de nuestros momentos. No están todos porque no entran, pero estos me sacan una sonrisa siempre.',
      'Busqué fotos y terminé repasando años. Elegí las que mejor cuentan lo que somos.',
    ],
    emotivo: [
      'Revisé fotos durante horas. En cada una me acordé de algo que todavía me llena el pecho.',
      'Una foto dura un segundo, pero lo que sentimos ahí sigue intacto. Mirá.',
    ],
    divertido: [
      'Hice una curaduría profesional de fotos. Las peores me las guardo para extorsionarte.',
      'Elegí las fotos donde salimos bien. Fue difícil, pero lo logré.',
    ],
    romantico: [
      'Elegí estos momentos porque en todos estás vos, y eso alcanza para que sean mis favoritos.',
      'Cada una de estas fotos es un día en el que me volví a enamorar de vos.',
    ],
  },
  musica: {
    calido: [
      'Hay canciones que me hacen pensar en vos apenas suenan. Elegí una para que la escuches pensando en mí.',
      'Toda historia tiene su música. La nuestra suena más o menos así.',
    ],
    emotivo: [
      'Si esta historia tuviera banda sonora, empezaría con esta canción. Subile el volumen.',
      'Esta canción me trae un montón de recuerdos con vos. Ahora también es tuya.',
    ],
    divertido: [
      'Momento musical. Tranqui: esta vez no la canto yo.',
      'Te dejo un temazo. Si no lo bailás, hacé de cuenta que sí.',
    ],
    romantico: [
      'Esta canción es nuestra, aunque nadie más lo sepa. Te la dejo para cuando me extrañes.',
      'Cada vez que suena, pienso en vos. Ahora vas a saber por qué.',
    ],
  },
  juego: {
    calido: [
      '¿Cuánto nos conocemos de verdad? Armé un juego para averiguarlo. Sin presión… bueno, un poco.',
      'Te preparé unas preguntas con cosas nuestras. Respondé con el corazón.',
    ],
    emotivo: [
      'Te conozco más de lo que te imaginás. Y quiero saber cuánto me conocés vos.',
      'Las respuestas de este juego son pedacitos de nuestra historia.',
    ],
    divertido: [
      'Se viene la prueba de fuego. Si perdés, lo hablamos en persona.',
      'Juego de preguntas. No vale googlear ni llamar a nadie.',
    ],
    romantico: [
      'Te armé un juego con cosas que solo sabemos nosotros. Ganes o pierdas, ya ganaste.',
      '¿Te acordás de todo lo nuestro? Vamos a ver.',
    ],
  },
  cine: {
    calido: [
      'Pensé en esos planes tranquilos que tanto me gustan con vos. Así que preparé una función.',
      'Algunas de mis noches favoritas fueron así de simples: algo para ver y buena compañía.',
    ],
    emotivo: [
      'Hay noches que no tienen nada de especial y, sin embargo, son las que más recuerdo. Como estas.',
      'Lo mejor de una peli siempre fue con quién la vi.',
    ],
    divertido: [
      'Apagá las luces y buscá los pochoclos. Elijo yo, así que no se aceptan quejas.',
      'Función privada. Prohibido mirar el celular… salvo este.',
    ],
    romantico: [
      'Mi plan favorito no es la peli: es verla con vos. Te dejo una para la próxima.',
      'Sillón, manta y vos. No necesito más.',
    ],
  },
  premios: {
    calido: [
      'Ahora, algo para usar en serio. Porque un regalo también son los planes que todavía no hicimos.',
      'Te guardé algunas cosas para canjear cuando quieras. Sin vencimiento.',
    ],
    emotivo: [
      'Lo mejor de esto no está en la pantalla: son los momentos que vienen. Acá te dejo algunos.',
      'Quiero que este regalo siga después de hoy. Por eso, esto.',
    ],
    divertido: [
      'Probá suerte. Y si no sale, tranqui: igual te dejo vales para cobrarme favores.',
      'Atención: lo que viene tiene validez legal (más o menos).',
    ],
    romantico: [
      'Te debo un montón de planes. Acá están, y vencen nunca.',
      'Todo lo que quiero hacer con vos, en versión canjeable.',
    ],
  },
  palabras: {
    calido: [
      'Hay cosas que pienso de vos y casi nunca te digo. Esta vez quedaron escritas.',
      'Si alguien me preguntara cómo sos, esto es lo que le contaría.',
    ],
    emotivo: [
      'Me cuesta decir estas cosas en voz alta, así que las dejé acá para que las leas cuando quieras.',
      'Pocas veces te digo lo que veo en vos. Hoy no me lo guardo.',
    ],
    divertido: [
      'Te conseguí una nota exclusiva. Con declaraciones mías, obvio.',
      'Primicia: tengo un par de cosas para decir sobre vos. Todas buenas, lo juro.',
    ],
    romantico: [
      'Nunca alcanzan las palabras, pero acá van algunas de las razones por las que te elijo.',
      'Podría escribir un libro sobre vos. Por ahora, empiezo por acá.',
    ],
  },
  turno: {
    calido: [
      'Hasta acá hablé yo. Ahora te toca a vos: lo que escribas queda guardado en tu Ribbly.',
      'Este regalo también se completa con vos. Tomate un ratito para lo que sigue.',
    ],
    emotivo: [
      'Te conté un montón de lo que siento. Ahora quiero que te escuches a vos.',
      'Lo que viene es para frenar un minuto y pensar en vos. Te lo merecés.',
    ],
    divertido: [
      'Basta de mí. Agarrá el teclado: te toca. No vale escribir «jaja».',
      'Tu turno de participar. Sí, esto tiene tarea.',
    ],
    romantico: [
      'Te conté lo que siento yo. Ahora quiero leerte a vos.',
      'Esta parte la escribís vos. Prometo leerla con el corazón.',
    ],
  },
  sorpresa: {
    calido: [
      'Casi llegamos al final, pero me guardé una sorpresa.',
      'Antes de terminar, una cosita más. Tocá con ganas.',
    ],
    emotivo: [
      'Antes de terminar, una cosa más. Me costó guardarla hasta acá.',
      'No todo se dice: algunas cosas se descubren. Como lo que viene.',
    ],
    divertido: [
      'Pensabas que ya estaba, ¿no? Falta lo mejor.',
      'Giro inesperado: todavía queda una sorpresa.',
    ],
    romantico: [
      'No podía terminar sin una última sorpresa. Con vos, siempre hay una más.',
      'Te guardé algo para el final, porque lo mejor se hace esperar.',
    ],
  },
  recuerdo: {
    calido: [
      'Para cerrar, quiero contarte un recuerdo que tengo guardado con mucho cariño.',
      'Hay una historia nuestra que me encanta contar. Esta.',
    ],
    emotivo: [
      'Hay un momento que no me voy a olvidar nunca. Te lo quiero contar.',
      'De todo lo que vivimos, este recuerdo me sigue emocionando.',
    ],
    divertido: [
      'Y ahora, la anécdota. Sí, esa. No te enojes.',
      'Cierro con un clásico que siempre nos hace reír.',
    ],
    romantico: [
      'De todo lo que vivimos, hay un recuerdo que vuelvo a mirar seguido.',
      'Si tuviera que elegir un solo momento con vos, sería este.',
    ],
  },
  final: {
    calido: [
      'Todo esto lo armé pensando en vos: cada canción, cada foto, cada palabra. Gracias por estar.',
      'Llegamos al final de este regalo, pero no de lo nuestro. Gracias por ser parte de mi vida.',
    ],
    emotivo: [
      'Esto es lo que quería que supieras: que pienso en vos mucho más de lo que te digo.',
      'Si este regalo te sacó una sonrisa, valió cada minuto que le dediqué.',
    ],
    divertido: [
      'Y así termina esta historia… por ahora. Spoiler: hay segunda temporada.',
      'Fin. Aplausos, lágrimas y créditos. Ah, y te quiero.',
    ],
    romantico: [
      'Esta historia no termina acá. Sigue cada día que elegimos estar juntos.',
      'Todo lo que viste lo pensé para vos. Y lo volvería a hacer mil veces.',
    ],
  },
  general: {
    calido: [
      'Cada parte de este regalo la pensé para vos. Esta también.',
      'Seguimos. Lo que viene también tiene tu nombre.',
    ],
    emotivo: [
      'Cada pantalla de este regalo tiene un pedacito de lo que siento.',
      'Lo que sigue también lo pensé en vos.',
    ],
    divertido: ['Seguimos con la programación. No te muevas.', 'Y esto no termina acá. Deslizá.'],
    romantico: [
      'Todo lo que viene lo pensé con amor. Como siempre que pienso en vos.',
      'Un capítulo más de lo nuestro.',
    ],
  },
}

/** El prólogo: quiénes son el uno para el otro, en la voz de quien regala. */
export const BOND_NOTES: Record<BondGroup, Bank> = {
  pareja: {
    calido: [
      'Esta historia no empieza hoy: empieza con vos y conmigo. Te armé este regalo para contarte, pantalla por pantalla, lo que pienso cuando pienso en vos.',
      'Cada cosa de este regalo la elegí pensando en nosotros. Vení, que te la cuento.',
    ],
    emotivo: [
      'Hay personas que llegan y lo cambian todo. Vos sos la mía. Esto es lo que quiero que sepas.',
      'Desde que estás, todo tiene otro color. Este regalo es mi manera de contarte por qué.',
    ],
    divertido: [
      'Advertencia: lo que sigue contiene altas dosis de amor y algún que otro chiste malo. Seguí bajo tu responsabilidad.',
      'Te preparé algo. Sí, me puse cursi. No, no me arrepiento.',
    ],
    romantico: [
      'Si me preguntan cuál es mi historia favorita, la respuesta es la nuestra. Te la cuento de nuevo, a mi manera.',
      'Todo lo que vas a ver lo pensé con vos en la cabeza y en el corazón.',
    ],
  },
  amistad: {
    calido: [
      'Hay amistades que son casa. La nuestra es una de esas. Te armé esto para recordarte por qué.',
      'Te preparé un regalo con todo lo que hace que nuestra amistad sea tan nuestra.',
    ],
    emotivo: [
      'No sé qué haría sin vos, y tampoco quiero averiguarlo. Esto es para decirte gracias.',
      'Algunas personas se eligen todos los días. Vos sos una de esas.',
    ],
    divertido: [
      'Sos la persona a la que le cuento todo (y la única que sabe demasiado). Esto es para vos.',
      'Después de tantas anécdotas, te debía un regalo a la altura. Bueno, acá está.',
    ],
    romantico: [
      'Te quiero más de lo que te lo digo. Este regalo es para que no queden dudas.',
      'Algunas personas se eligen todos los días. Vos sos una de esas.',
    ],
  },
  familia: {
    calido: [
      'La familia no se elige, pero si pudiera, te elegiría igual. Esto es para vos.',
      'Te armé un regalo con un poquito de todo lo que compartimos.',
    ],
    emotivo: [
      'Hay amores que están desde siempre. El nuestro es uno de esos. Te lo quería decir así.',
      'Gracias por estar en cada etapa. Este regalo es para contarte cuánto te quiero.',
    ],
    divertido: [
      'Compartimos sangre, mañas y un humor que nadie más entiende. Esto es para vos.',
      'Te hice un regalo. Que no se entere el resto de la familia.',
    ],
    romantico: [
      'Hay amores que están desde siempre. El nuestro es uno de esos. Te lo quería decir así.',
      'Gracias por estar en cada etapa. Este regalo es para contarte cuánto te quiero.',
    ],
  },
  trabajo: {
    calido: [
      'Compartir los días con vos los hace mucho mejores. Te armé esto para decírtelo.',
      'Hay personas que hacen que todo sea más fácil. Vos sos una de ellas.',
    ],
    emotivo: [
      'Gracias por todo lo que compartimos, adentro y afuera del trabajo. Esto es para vos.',
      'No todos los días se encuentra a alguien como vos. Por eso, este regalo.',
    ],
    divertido: [
      'Entre tanto mail y tanta reunión, me hice un ratito para esto. Es para vos.',
      'Sin presentación ni planilla: un regalo de verdad, para vos.',
    ],
    romantico: [
      'Gracias por todo lo que compartimos, adentro y afuera del trabajo. Esto es para vos.',
      'No todos los días se encuentra a alguien como vos. Por eso, este regalo.',
    ],
  },
  generico: {
    calido: [
      'Te armé este regalo para contarte, pantalla por pantalla, lo que pienso cuando pienso en vos.',
      'Cada parte de lo que sigue la elegí para vos. Vení, que te la cuento.',
    ],
    emotivo: [
      'Hay cosas que se sienten más de lo que se dicen. Este regalo es para decirlas.',
      'Pensé mucho en vos mientras armaba esto. Ojalá se note.',
    ],
    divertido: [
      'Te preparé algo. Buscá un lugar tranqui, que esto tiene varios capítulos.',
      'Aviso: lo que sigue es un regalo. Sí, para vos. Sí, en serio.',
    ],
    romantico: [
      'Hay cosas que se sienten más de lo que se dicen. Este regalo es para decirlas.',
      'Pensé mucho en vos mientras armaba esto. Ojalá se note.',
    ],
  },
}

function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Todas las frases de un banco, empezando por las del tono elegido: la
 * versión 1 y 2 son de ese tono; las siguientes prueban los otros.
 */
function ordered(bank: Bank, tone: ThreadTone): string[] {
  return [tone, ...TONES.filter((t) => t !== tone)].flatMap((t) => [...bank[t]])
}

export interface PickOptions {
  tone: ThreadTone
  /** 1 = la que toca; cada número siguiente, otra. */
  version: number
  /** Lo que distingue a este regalo y a esta pantalla (nombres + clave). */
  seed: string
}

function pick(bank: Bank, { tone, version, seed }: PickOptions): string {
  const pool = ordered(bank, tone)
  // Entre las dos del tono elegido, cuál va primero depende del regalo: dos
  // Ribblys con el mismo tono no arrancan con la misma frase.
  const flip = hash(seed) % 2
  const n = Math.max(1, Math.floor(version)) - 1
  const index = n < 2 ? (n + flip) % 2 : n
  return pool[index % pool.length]!
}

export function chapterNote(topic: ThreadTopic, options: PickOptions): string {
  return pick(CHAPTER_NOTES[topic], options)
}

export function bondNote(group: BondGroup, options: PickOptions): string {
  return pick(BOND_NOTES[group], options)
}

/** "2016" → "Desde 2016"; "desde la primaria" queda igual; vacío → "". */
export function sinceLabel(since: string | undefined): string {
  const text = since?.trim() ?? ''
  if (!text) return ''
  return /^desde\b/i.test(text) ? text[0]!.toUpperCase() + text.slice(1) : `Desde ${text}`
}
