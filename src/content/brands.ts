/**
 * Textos de "Boxie para marcas" (/marcas) y de los espacios de sponsor del
 * sitio mientras no hay un aliado activo en ese lugar (la invitación a
 * sumarse).
 *
 * Los rubros son EJEMPLOS de hacia dónde va Boxie (una Boxie para cada rubro,
 * con sus módulos): las marcas y campañas que aparecen son inventadas y se
 * presentan como ejemplos, no como clientes.
 */

export interface Industry {
  id: string
  emoji: string
  label: string
  /** Color de la maqueta. */
  color: string
  /** Marca de ejemplo de la maqueta. */
  brand: string
  /** La campaña de ejemplo. */
  campaign: string
  /** Módulos pensados para el rubro. */
  modules: string[]
  /** Cómo llega la Boxie a la gente. */
  channel: string
}

export const industries: Industry[] = [
  {
    id: 'cafeteria',
    emoji: '☕',
    label: 'Cafeterías',
    color: '#8B5E3C',
    brand: 'Café de la Esquina',
    campaign: 'Con tu café, una Ribbly para regalarle a quien quieras',
    modules: ['Cuponera con un 2x1', 'Trivia del barrio', 'Su canción del día'],
    channel: 'QR en el vaso para llevar',
  },
  {
    id: 'floreria',
    emoji: '💐',
    label: 'Florerías',
    color: '#C2185B',
    brand: 'Flores del Jardín',
    campaign: 'Con cada ramo, la dedicatoria llega en una Ribbly',
    modules: ['Carta que se abre como sobre', 'Fotos del ramo', 'Galleta de la fortuna'],
    channel: 'Tarjeta con QR dentro del ramo',
  },
  {
    id: 'gaming',
    emoji: '🎮',
    label: 'Gaming',
    color: '#2A78D6',
    brand: 'Level Up Bar',
    campaign: 'El cumple en el bar de juegos, con su Ribbly gamer',
    modules: ['Trivia gamer', 'Tragamonedas con premios del local', 'Pantalla de juego'],
    channel: 'Pantallas del local y reservas',
  },
  {
    id: 'cine',
    emoji: '🎬',
    label: 'Cine y series',
    color: '#D03B3B',
    brand: 'Cine Club Centro',
    campaign: 'Un estreno para ver de a dos, con entrada y pochoclos adentro',
    modules: ['Telón de cine', 'Cine y series', 'Pochoclos en la cuponera'],
    channel: 'Con la entrada online',
  },
  {
    id: 'eventos',
    emoji: '🎉',
    label: 'Eventos',
    color: '#EDA100',
    brand: 'Salón Aurora',
    campaign: 'Casamientos, 15 y egresos: los saludos de todos en una Ribbly',
    modules: ['Saludos de todos', 'Fotos del evento', 'Playlist de la fiesta'],
    channel: 'QR en las mesas',
  },
  {
    id: 'retail',
    emoji: '🛍️',
    label: 'Moda y tiendas',
    color: '#7A4FC4',
    brand: 'Tienda Lila',
    campaign: 'Con tu compra, una Ribbly con descuento para quien elijas',
    modules: ['Cupón para la próxima compra', 'Tapa de revista', 'Repaso final'],
    channel: 'En el ticket o el mail de compra',
  },
]

/** Las formas de trabajar juntos. */
export const partnershipFormats = [
  {
    id: 'sponsor',
    emoji: '🌐',
    title: 'Sponsor en Ribbly',
    text: 'Tu marca en el sitio (la portada, la galería y precios) con tu propuesta, tu cupón y tu link.',
    ideal: 'Comercios que abren o quieren llegar a más gente de su ciudad.',
  },
  {
    id: 'cobranding',
    emoji: '🎁',
    title: 'Una Ribbly con tu marca',
    text: 'Una temática con tus colores, tu logo y módulos pensados para tu rubro: una trivia de tu local, una cuponera con tus promos.',
    ideal: 'Marcas con comunidad que quieren un regalo propio.',
  },
  {
    id: 'campana',
    emoji: '📅',
    title: 'Campañas y fechas',
    text: 'Día de la Madre, San Valentín o un lanzamiento: un QR o un cupón que regala Ribbly con tu producto, con resultados medidos.',
    ideal: 'Picos de venta y fechas fuertes.',
  },
  {
    id: 'corporativo',
    emoji: '💼',
    title: 'Regalos corporativos',
    text: 'Ribbly para tu equipo o tus clientes: fin de año, aniversarios, bienvenidas. Un regalo que no termina en un cajón.',
    ideal: 'Empresas y equipos de cualquier tamaño.',
  },
] as const

/** Cómo es trabajar con Ribbly, de la primera charla a los resultados. */
export const partnershipSteps = [
  {
    title: 'Charlamos',
    text: 'Nos contás tu negocio, a quién le querés llegar y qué fecha o producto querés empujar.',
  },
  {
    title: 'Armamos la propuesta',
    text: 'Elegimos el formato, los módulos y dónde aparece tu marca. Si hace falta, diseñamos una temática para vos.',
  },
  {
    title: 'Sale a la calle',
    text: 'QR en tu local, un cupón, tu banner en Ribbly: la gente arma su regalo y lo manda por WhatsApp.',
  },
  {
    title: 'Medimos juntos',
    text: 'Visitas, regalos creados y cupones usados, con links propios de tu campaña.',
  },
]

/** La invitación que ocupa un espacio de sponsor mientras no hay un aliado activo ahí. */
export const houseAd = {
  eyebrow: 'Ribbly para marcas',
  title: '¿Tenés un café, una florería o una marca?',
  text: 'Regalá Ribbly con tus productos y llegá a las personas que más quieren a tus clientes.',
  cta: 'Sumate como aliado',
  band: {
    title: 'Tu marca, dentro de un regalo que emociona',
    text: 'Cafeterías, florerías, bares, cines y eventos ya pueden tener su Ribbly: con tu logo, tus módulos y una campaña que se regala sola.',
  },
}
