/**
 * Textos de la home. Están escritos para vender y para buscadores: cada
 * sección nombra lo que la gente busca ("regalo digital personalizado",
 * "regalo de cumpleaños", "regalo a distancia", "regalo para mi novia") sin
 * repetirlo de más.
 *
 * El precio de la Boxie NO vive acá: sale del catálogo (el mismo que cobra el
 * checkout). Los precios de los otros regalos del comparador son valores de
 * referencia ficticios, para mostrar la diferencia; se ajustan a mano.
 */

/** Ocasiones que se eligen en "¿A quién querés emocionar hoy?". `theme` es el slug recomendado. */
export const occasions = [
  {
    id: 'aniversario',
    emoji: '💘',
    label: 'Aniversario',
    theme: 'pareja',
    pitch: 'Su historia en fotos, su canción y una carta que se abre como un sobre.',
  },
  {
    id: 'san-valentin',
    emoji: '🌹',
    label: 'San Valentín',
    theme: 'pareja',
    pitch: 'El regalo romántico que no se marchita: llega al instante y dura 60 días.',
  },
  {
    id: 'distancia',
    emoji: '✈️',
    label: 'Amor a distancia',
    theme: 'pareja',
    pitch: 'Cruza cualquier distancia: la abre desde su celular, esté donde esté.',
  },
  {
    id: 'cumpleanos',
    emoji: '🎂',
    label: 'Cumpleaños',
    theme: 'cumpleanos',
    pitch: 'Un regalo de cumpleaños con fiesta, deseos, juegos y sus mejores momentos.',
  },
  {
    id: 'grupal',
    emoji: '🎉',
    label: 'Saludo grupal',
    theme: 'cumpleanos',
    pitch: 'Juntá fotos y mensajes de todos en un solo regalo para su día.',
  },
  {
    id: 'amigo',
    emoji: '🤝',
    label: 'Día del Amigo',
    theme: 'amistad',
    pitch: 'Selfies, anécdotas y ese temazo que cantan a los gritos.',
  },
  {
    id: 'gracias',
    emoji: '🙏',
    label: 'Para agradecer',
    theme: 'amistad',
    pitch: 'Para esa persona que está en todas: decile gracias de una forma que no olvide.',
  },
] as const

export type Occasion = (typeof occasions)[number]

/** La cinta que corre debajo de la portada. */
export const marqueeWords = [
  'Regalo de aniversario',
  'Regalo de cumpleaños',
  'Regalo para mi novia',
  'Regalo para mi novio',
  'Regalo a distancia',
  'Día del Amigo',
  'San Valentín',
  'Regalo de último momento',
]

/** Lo que trae una Boxie (las pestañas con demos jugables). */
export const experiences = [
  {
    id: 'dedicatoria',
    emoji: '💌',
    label: 'Dedicatoria',
    title: 'Una carta que se abre como un sobre',
    text: 'Escribí lo que sentís, con tu estilo y tus emojis. Se lee con calma, como una carta de verdad.',
  },
  {
    id: 'fotos',
    emoji: '📸',
    label: 'Fotos',
    title: 'Sus mejores momentos, en polaroids',
    text: 'Subí fotos desde el celular y armá un recorrido por viajes, cumpleaños y risas compartidas.',
  },
  {
    id: 'cancion',
    emoji: '🎵',
    label: 'Su canción',
    title: 'La canción que es de ustedes',
    text: 'Elegí el tema que los representa y hacelo sonar mientras recorre su regalo.',
  },
  {
    id: 'trivia',
    emoji: '🧠',
    label: 'Trivia',
    title: '¿Cuánto me conocés?',
    text: 'Armá preguntas sobre ustedes. Si acierta, desbloquea un premio que elegís vos.',
  },
  {
    id: 'jackpot',
    emoji: '🎰',
    label: 'Tragamonedas',
    title: 'Un jackpot que siempre gana',
    text: 'Gira los rodillos y el premio lo decidís vos: una cena, una salida, un abrazo eterno.',
  },
  {
    id: 'cuponera',
    emoji: '🎟️',
    label: 'Cuponera',
    title: 'Vales para canjear cuando quiera',
    text: 'Masajes, desayunos en la cama, elegir la peli: vales que canjea con un toque.',
  },
] as const

export type ExperienceId = (typeof experiences)[number]['id']

/**
 * Otros regalos para comparar el precio. VALORES DE REFERENCIA FICTICIOS
 * (en centavos): se muestran como "valores de referencia", no como precios de
 * terceros.
 */
export const giftComparisons = [
  {
    id: 'flores',
    emoji: '💐',
    label: 'Ramo de flores',
    priceCents: 3_200_000,
    note: 'con envío, y a la semana se marchita',
  },
  {
    id: 'desayuno',
    emoji: '🥐',
    label: 'Desayuno sorpresa',
    priceCents: 3_800_000,
    note: 'solo si vive en tu ciudad',
  },
  {
    id: 'peluche',
    emoji: '🧸',
    label: 'Peluche y tarjeta',
    priceCents: 2_400_000,
    note: 'más el envío, y a esperar',
  },
  {
    id: 'bombones',
    emoji: '🍫',
    label: 'Caja de bombones',
    priceCents: 1_800_000,
    note: 'dura lo que dura la caja',
  },
] as const

/**
 * Cupón de bienvenida que se muestra en la sección de precio. Tiene que
 * existir y estar activo en la base (lo carga la migración inicial).
 */
export const welcomeCoupon = { code: 'BOXIE10', label: '10% OFF en tu primera Boxie' }

/** Preguntas frecuentes de la home (también van como datos estructurados FAQPage). */
export const homeFaqs = [
  {
    question: '¿Qué es una Boxie?',
    answer:
      'Es un regalo digital personalizado: una experiencia tipo historias, con fotos, dedicatoria, su canción y juegos como trivia, tragamonedas y cuponera. La armás en minutos y se la mandás con un link único que se abre desde el celular.',
  },
  {
    question: '¿Cuánto cuesta un regalo digital Boxie?',
    answer:
      'Cada Boxie tiene un precio único y todo incluido: todas las pantallas, las fotos, la música y los juegos, sin suscripciones ni costos de envío. Pagás una sola vez con Mercado Pago.',
  },
  {
    question: '¿Cómo se envía? ¿Llega al instante?',
    answer:
      'Sí. Apenas se acredita el pago entrás al editor, la personalizás y, cuando está lista, la bloqueás y le mandás el link por WhatsApp, mail o donde quieras. No hay que esperar ningún envío.',
  },
  {
    question: '¿Sirve como regalo a distancia?',
    answer:
      'Es ideal para eso: la persona la abre desde su celular esté en otra ciudad o en otro país. Solo necesita el link (y la clave, si le pusiste una).',
  },
  {
    question: '¿Hay que descargar una app o crear una cuenta?',
    answer:
      'No. Ni vos ni quien la recibe instalan nada: todo funciona desde el navegador del celular o la computadora.',
  },
  {
    question: '¿Puedo probarla antes de comprar?',
    answer:
      'Sí: podés ver una Boxie de ejemplo completa y probar el editor gratis, cargando tus textos y fotos, antes de pagar.',
  },
  {
    question: '¿Puedo editarla después de pagar?',
    answer:
      'Todas las veces que quieras hasta que la bloquees para regalar. Desde ese momento queda disponible 60 días para que la abra cuantas veces quiera.',
  },
] as const
