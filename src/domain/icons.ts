/**
 * Íconos propios de Ribbly: reemplazan a los emojis de stock en todo el sitio,
 * el panel, el editor y los regalos.
 *
 * Los archivos viven en public/icons (256 px) y public/icons/sm (96 px), en
 * WebP con fondo transparente. Los dibuja <Icon> (src/ui/Icon.tsx).
 *
 * Muchos datos siguen guardando emojis (las temáticas resueltas en la base,
 * lo que escribe el comprador, los arquetipos del generador): en vez de
 * migrarlos, cada emoji conocido se traduce al ícono equivalente al dibujar.
 * Un emoji que no está en la tabla se deja como está: si lo escribió el
 * comprador, es parte de su regalo.
 */

export const ICON_GROUPS = [
  {
    id: 'amor',
    label: 'Amor',
    icons: {
      corazon: 'Corazón',
      'corazon-brillo': 'Corazón brillante',
      'corazon-flechado': 'Corazón flechado',
      'carta-de-amor': 'Carta de amor',
      ramo: 'Ramo',
      rosa: 'Rosa',
      tulipan: 'Tulipán',
      flor: 'Flor',
      mariposa: 'Mariposa',
      infinito: 'Infinito',
      osito: 'Osito',
      destellos: 'Destellos',
      estrella: 'Estrella',
    },
  },
  {
    id: 'festejo',
    label: 'Festejo',
    icons: {
      regalo: 'Regalo',
      cotillon: 'Cotillón',
      torta: 'Torta',
      globo: 'Globo',
      'cara-de-fiesta': 'Cara de fiesta',
      brindis: 'Brindis',
      'bola-disco': 'Bola disco',
      trofeo: 'Trofeo',
    },
  },
  {
    id: 'juegos',
    label: 'Juegos y cine',
    icons: {
      musica: 'Música',
      auriculares: 'Auriculares',
      microfono: 'Micrófono',
      claqueta: 'Claqueta',
      pelicula: 'Película',
      pochoclos: 'Pochoclos',
      teatro: 'Teatro',
      juego: 'Juego',
      trivia: 'Trivia',
      tragamonedas: 'Tragamonedas',
      entrada: 'Entrada',
      'bola-de-cristal': 'Bola de cristal',
      galletita: 'Galletita de la fortuna',
      duelo: 'Duelo',
    },
  },
  {
    id: 'recuerdos',
    label: 'Recuerdos',
    icons: {
      camara: 'Cámara',
      cuadro: 'Cuadro',
      revista: 'Revista',
      diario: 'Diario',
      escribir: 'Escribir',
      pergamino: 'Pergamino',
      calendario: 'Calendario',
      'cuenta-regresiva': 'Cuenta regresiva',
      candado: 'Candado',
      link: 'Link',
      mensaje: 'Mensaje',
      envio: 'Envío',
    },
  },
  {
    id: 'comida',
    label: 'Comida',
    icons: {
      cafe: 'Café',
      medialuna: 'Medialuna',
      chocolate: 'Chocolate',
      chupetin: 'Chupetín',
      sandia: 'Sandía',
      hamburguesa: 'Hamburguesa',
      pizza: 'Pizza',
      pasta: 'Pasta',
      sushi: 'Sushi',
      asado: 'Asado',
      cerezas: 'Cerezas',
      frutilla: 'Frutilla',
      miel: 'Miel',
    },
  },
  {
    id: 'viajes',
    label: 'Viajes y naturaleza',
    icons: {
      viaje: 'Viaje',
      mundo: 'Mundo',
      mapa: 'Mapa',
      combi: 'Combi',
      carpa: 'Carpa',
      atardecer: 'Atardecer',
      mar: 'Mar',
      nube: 'Nube',
      arbol: 'Árbol',
      suerte: 'Suerte',
      fuego: 'Fuego',
      rayo: 'Rayo',
      diamante: 'Diamante',
      cohete: 'Cohete',
      ayuda: 'Ayuda',
      relax: 'Relax',
    },
  },
  {
    id: 'personas',
    label: 'Personas',
    icons: {
      gracias: 'Gracias',
      acuerdo: 'Acuerdo',
      'toca-aca': 'Tocá acá',
      senalar: 'Señalar',
      hola: 'Hola',
      paz: 'Paz',
      fuerza: 'Fuerza',
      amigas: 'Amigas',
      meditar: 'Meditar',
      masaje: 'Masaje',
      canchero: 'Canchero',
      uy: 'Uy',
      risa: 'Risa',
      emocion: 'Emoción',
      sorpresa: 'Sorpresa',
      pensar: 'Pensar',
      guino: 'Guiño',
      verguenza: 'Me da vergüenza',
    },
  },
  {
    id: 'sistema',
    label: 'Compras y avisos',
    icons: {
      compras: 'Compras',
      pago: 'Pago',
      empresas: 'Empresas',
      idea: 'Idea',
      buscar: 'Buscar',
      aviso: 'Aviso',
      atencion: 'Atención',
      'reportar-error': 'Reportar error',
    },
  },
] as const

type Group = (typeof ICON_GROUPS)[number]
export type IconName = { [G in Group as G['id']]: keyof G['icons'] }[Group['id']]

export const ICON_LABELS = Object.fromEntries(
  ICON_GROUPS.flatMap((g) => Object.entries(g.icons)),
) as Record<IconName, string>

export function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && Object.hasOwn(ICON_LABELS, value)
}

/**
 * Emoji → ícono. Las claves van sin selector de variación (U+FE0F) ni tono de
 * piel; las secuencias con ZWJ ("👯‍♀️") caen en su primer emoji.
 */
const EMOJI_GROUPS: Record<IconName, string> = {
  corazon: '❤♥❣💙💚💛💜🧡🤍🖤🤎🩷🩵🩶💓💕💞',
  'corazon-brillo': '💖💗💝💟🥰😍😘',
  'corazon-flechado': '💘',
  'carta-de-amor': '💌✉📩📨',
  ramo: '💐',
  rosa: '🌹🥀',
  tulipan: '🌷',
  flor: '🌸🌺🌻🌼💮🏵',
  mariposa: '🦋',
  infinito: '♾',
  osito: '🧸🐻',
  destellos: '✨💫🎇🎆',
  estrella: '⭐🌟🌠',
  regalo: '🎁🎀',
  cotillon: '🎉🎊',
  torta: '🎂🍰🧁',
  globo: '🎈',
  'cara-de-fiesta': '🥳',
  brindis: '🥂🍾🍷🍻🍺🍸🍹',
  'bola-disco': '🪩💃🕺',
  trofeo: '🏆🥇🏅🎖',
  musica: '🎵🎶🎼🎸🎹🎷🎺🎻🥁🔊🔉📻💿📀',
  auriculares: '🎧',
  microfono: '🎤🎙',
  claqueta: '🎬',
  pelicula: '🎞📽📺🎥',
  pochoclos: '🍿',
  teatro: '🎭',
  juego: '🎮🕹👾🎲🧩',
  trivia: '🧠❓❔',
  tragamonedas: '🎰',
  entrada: '🎫🎟',
  'bola-de-cristal': '🔮',
  galletita: '🥠',
  duelo: '⚔🤺',
  camara: '📸📷📹',
  cuadro: '🖼🏞',
  revista: '📰🗞',
  diario: '📔📓📕📖📒📚📗📘📙',
  escribir: '✏🖊🖋✍📝🖍',
  pergamino: '📜📃📄📋',
  calendario: '📅📆🗓',
  'cuenta-regresiva': '⏳⌛⏰⏱⏲🕰',
  candado: '🔒🔐🔓🔏🔑🗝',
  link: '🔗📎',
  mensaje: '💬🗨💭',
  envio: '📦📬📭📮📫📪🚚',
  cafe: '☕🍵🧉',
  medialuna: '🥐🥖🍞🥞🧇',
  chocolate: '🍫🍪🍩',
  chupetin: '🍭🍬🍡',
  sandia: '🍉',
  hamburguesa: '🍔🌭🍟',
  pizza: '🍕',
  pasta: '🍝🍜🍲🥘',
  sushi: '🍣🍱🍙',
  asado: '🥩🍖🍗🥓',
  cerezas: '🍒',
  frutilla: '🍓',
  miel: '🍯',
  viaje: '✈🛫🛬🧳',
  mundo: '🌎🌍🌏🌐',
  mapa: '🗺📍🧭',
  combi: '🚐🚌🚗🚙',
  carpa: '⛺🏕⛰🏔',
  atardecer: '🌅🌄🌇🌆☀🌞🌤',
  mar: '🌊🏖🏝🐳🐬🐟🐠',
  nube: '☁⛅🌥🌧❄',
  arbol: '🌳🌲🌴🌱🌿🍃🎄',
  suerte: '🍀☘🤞',
  fuego: '🔥',
  rayo: '⚡',
  diamante: '💎💍',
  cohete: '🚀',
  ayuda: '🛟🆘',
  relax: '♨🛁🛀🧖',
  gracias: '🙏🙌',
  acuerdo: '🤝',
  'toca-aca': '👆☝',
  senalar: '👉👈',
  hola: '👋',
  paz: '✌',
  fuerza: '💪',
  amigas: '👯👭👫👬👥',
  meditar: '🧘',
  masaje: '💆',
  canchero: '😎',
  uy: '😅😬😕🙃',
  risa: '😂🤣😄😁😆😃😀',
  emocion: '😭🥹🥲😢',
  sorpresa: '😱😮😲😯🤯',
  pensar: '🤔🧐🤨',
  guino: '😉😜😏',
  verguenza: '🙈🫣🤫',
  compras: '🛍🛒',
  pago: '💳💸💰💵🏦',
  empresas: '💼🏢🏬🏪',
  idea: '💡',
  buscar: '🔎🔍',
  aviso: '🔔📣📢',
  atencion: '⚠❗❕🚨🛑⛔',
  'reportar-error': '🐞🐛🪲',
}

const BY_EMOJI = new Map<string, IconName>(
  (Object.entries(EMOJI_GROUPS) as [IconName, string][]).flatMap(([name, emojis]) =>
    Array.from(emojis, (emoji) => [emoji, name] as const),
  ),
)

/** Una secuencia emoji completa: bandera, keycap o pictograma con modificadores y ZWJ. */
const EMOJI_SEQUENCE =
  /\p{RI}\p{RI}|[#*0-9]️?⃣|\p{Extended_Pictographic}(?:️|︎|\p{EMod})*(?:‍\p{Extended_Pictographic}(?:️|︎|\p{EMod})*)*/gu

function emojiKey(sequence: string): string {
  const first = sequence.split('‍')[0] ?? sequence
  return first.replace(/[︎️]|\p{EMod}/gu, '')
}

/** El ícono de un valor guardado: un nombre de ícono ("regalo") o un emoji ("🎁"). */
export function iconFor(value: string | null | undefined): IconName | null {
  if (!value) return null
  const trimmed = value.trim()
  if (isIconName(trimmed)) return trimmed
  const match = trimmed.match(EMOJI_SEQUENCE)
  if (!match || match.length !== 1 || match[0] !== trimmed) return null
  return BY_EMOJI.get(emojiKey(trimmed)) ?? null
}

export type TextPart = string | { icon: IconName; emoji: string }

/**
 * Parte un texto en tramos de texto e íconos. Solo se reemplazan los emojis
 * que tienen ícono; el resto (y los ©, ™, ✓…) queda como texto.
 */
export function splitEmoji(text: string): TextPart[] {
  const parts: TextPart[] = []
  let last = 0
  for (const match of text.matchAll(EMOJI_SEQUENCE)) {
    const icon = BY_EMOJI.get(emojiKey(match[0]))
    if (!icon) continue
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push({ icon, emoji: match[0] })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function hasIcons(text: string): boolean {
  return splitEmoji(text).some((p) => typeof p !== 'string')
}

/**
 * Saca los emojis de un texto que sale del sitio y no puede llevar íconos
 * (asuntos de mail, mensajes prearmados de WhatsApp). Respeta ©, ® y ™.
 */
export function stripEmoji(text: string): string {
  const withSpace = new RegExp(`[ \\t]*(?:${EMOJI_SEQUENCE.source})+[ \\t]*`, 'gu')
  return text.replace(withSpace, (match, offset: number) => {
    const seqs = match.trim().match(EMOJI_SEQUENCE) ?? []
    const isEmoji = (seq: string) =>
      BY_EMOJI.has(emojiKey(seq)) || /\p{Emoji_Presentation}|️|‍/u.test(seq)
    if (!seqs.every(isEmoji)) return match
    const before = text[offset - 1]
    const after = text[offset + match.length]
    const atEdge = before === undefined || before === '\n' || after === undefined || after === '\n'
    return atEdge || /[,.!?…:;)]/.test(after ?? '') ? '' : ' '
  })
}
