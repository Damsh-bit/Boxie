/**
 * Textos de /nosotros.
 *
 * OJO, TEXTOS DE EJEMPLO (septiembre 2026): la historia, los roles, las bios, las
 * frases y los datos de cada fundador son un borrador para ver el diseño con
 * contenido real de largo. Los reemplazan los dueños; el diseño se acomoda
 * solo (más o menos capítulos, principios o datos).
 *
 * Los números de la página NO viven acá: salen del catálogo y de las ventas
 * (temáticas publicadas, sorpresas por Boxie, días online, Boxies regaladas).
 */

export interface Founder {
  id: string
  name: string
  /** Iniciales del avatar mientras no haya foto. */
  initials: string
  role: string
  /** De qué se ocupa en Boxie, en pocas palabras. */
  focus: string
  /** Color del avatar (uno de la marca). */
  color: string
  /** Foto cuadrada (/public o una URL de Supabase). null: avatar con iniciales. */
  photo: string | null
  bio: string
  quote: string
  facts: { label: string; value: string }[]
}

export const founders: Founder[] = [
  {
    id: 'agustin',
    name: 'Agustín del Puerto',
    initials: 'AP',
    role: 'CEO · Cofundador',
    focus: 'Estrategia y alianzas',
    color: '#F44E63',
    photo: null,
    bio: 'Pone el rumbo y las ganas. Se pasa el día pensando cómo hacer que un regalo digital se sienta tan real como uno que se abre con las manos, y en quién más tendría que conocer Ribbly.',
    quote: 'Un buen regalo no se mide en precio: se mide en cuánto tiempo lo seguís recordando.',
    facts: [
      { label: 'Su Ribbly favorita', value: 'Pareja 💘' },
      { label: 'Si no fuera Ribbly', value: 'Armando viajes para amigos' },
      { label: 'Nunca le falta', value: 'Una playlist para cada ocasión' },
    ],
  },
  {
    id: 'santiago',
    name: 'Santiago Almirón',
    initials: 'SA',
    role: 'Cofundador · Producto',
    focus: 'Producto y experiencia',
    color: '#C893D7',
    photo: null,
    bio: 'Obsesionado con los detalles: que el sobre se abra justo, que la canción arranque en el momento indicado y que armar una Ribbly desde el celular no lleve más de diez minutos.',
    quote: 'Si hay que explicarlo, todavía no está terminado.',
    facts: [
      { label: 'Su Ribbly favorita', value: 'Cumpleaños 🎂' },
      { label: 'Superpoder', value: 'Probar todo desde el celular' },
      { label: 'Nunca le falta', value: 'El mate al lado del teclado' },
    ],
  },
  {
    id: 'damian',
    name: 'Damián Coronel',
    initials: 'DC',
    role: 'Cofundador · Tecnología',
    focus: 'Tecnología y operaciones',
    color: '#73CFEE',
    photo: null,
    bio: 'Construye lo que no se ve: el editor, los pagos y que cada link llegue y funcione en cualquier celular del mundo, a cualquier hora. Si algo falla, es el primero en enterarse.',
    quote: 'Lo más lindo de hacer Ribbly es leer las reacciones cuando la abren.',
    facts: [
      { label: 'Su Ribbly favorita', value: 'Amistad 🤝' },
      { label: 'Superpoder', value: 'Arreglar cosas a las 3 AM' },
      { label: 'Nunca le falta', value: 'Café, mucho café' },
    ],
  },
]

/** La historia, en capítulos. `{temáticas}` se reemplaza por las publicadas. */
export const chapters = [
  {
    id: 'pregunta',
    emoji: 'viaje',
    kicker: 'La pregunta',
    title: 'Un cumpleaños a 10.000 km',
    text: 'Un amigo se había ido a vivir afuera y se venía su cumple. Una gift card nos parecía fría y mandar algo por correo, imposible a tiempo. ¿Cómo se abraza a alguien que está tan lejos?',
  },
  {
    id: 'primer-regalo',
    emoji: 'regalo',
    kicker: 'El primer regalo',
    title: 'Fotos, su canción y un audio llorando de risa',
    text: 'Armamos a mano una página con fotos de toda la vida, su canción y un mensaje de cada uno. Se la mandamos por WhatsApp y a los cinco minutos llegó la respuesta: un audio que todavía guardamos.',
  },
  {
    id: 'ribbly',
    emoji: 'envio',
    kicker: 'Nace Ribbly',
    title: 'Todos tenemos a alguien a quien abrazar',
    text: 'Nos dimos cuenta de que todos tenemos a alguien lejos, o a alguien cerca a quien no le decimos lo suficiente. Le pusimos nombre, diseñamos las primeras temáticas y empezamos a regalarlas a amigos y familia.',
  },
  {
    id: 'hoy',
    emoji: 'carta-de-amor',
    kicker: 'Hoy',
    title: 'Un regalo que cualquiera arma en minutos',
    text: 'Un editor para armar la tuya desde el celular, {temáticas} temáticas, pagos con Mercado Pago y un chat donde te respondemos nosotros. La idea sigue siendo la misma: que llegue el abrazo.',
  },
]

/** Lo que nos importa (el manifiesto). */
export const principles = [
  {
    title: 'Un regalo tiene que tener alma.',
    text: 'Nada de plantillas frías: cada Ribbly se arma con fotos, palabras y canciones que solo ustedes entienden.',
  },
  {
    title: 'La distancia no es excusa.',
    text: 'Llega al instante a cualquier celular del mundo. Sin envíos, sin esperas y sin “se me pasó la fecha”.',
  },
  {
    title: 'Simple de armar, imposible de olvidar.',
    text: 'Si tenés diez minutos y un par de fotos, tenés un regalo. De que se vea increíble nos encargamos nosotros.',
  },
  {
    title: 'Del otro lado hay personas.',
    text: 'Cuando algo no sale, te responde uno de nosotros: por el chat, por mail o por WhatsApp.',
  },
]

/** El pase de abordar de la portada: de dónde sale y a dónde llega una Boxie. */
export const boardingPass = {
  from: { code: 'BUE', city: 'Buenos Aires', who: 'Vos' },
  to: { code: 'MAD', city: 'Madrid', who: 'Tu persona' },
  distance: '10.000 km',
  luggage: 'Fotos, su canción y una carta',
}
