/**
 * Las opciones de las piezas propias de cada pantalla (docs/PLAN-VARIACIONES.md).
 * Solo datos: las definiciones las usan para declarar los ejes (servidor) y
 * los componentes para dibujarlas. La primera de cada lista es la del diseño.
 */

export type PieceOptions = readonly (readonly [value: string, label: string])[]

/** 02 y 15 · La torta. */
export const CAKE_FLAVORS = [
  ['original', 'Clásica'],
  ['chocolate', 'Chocolate'],
  ['frutilla', 'Frutilla'],
  ['cupcake', 'Cupcake gigante'],
] as const satisfies PieceOptions

/** 02 y 15 · Las velas. */
export const CAKE_CANDLES = [
  ['original', 'Con el número'],
  ['finitas', 'Finitas'],
  ['bengalas', 'Bengalas'],
] as const satisfies PieceOptions

/** 01 · Los globos de la intro. */
export const INTRO_BALLOONS = [
  ['original', 'Redondos'],
  ['corazones', 'Corazones'],
  ['numero', 'Número de la edad'],
  ['sin', 'Sin globos'],
] as const satisfies PieceOptions

/** 03 · El marco de la foto. */
export const COVER_FRAMES = [
  ['original', 'Onda'],
  ['arco', 'Arco'],
  ['circulo', 'Círculo'],
  ['polaroid', 'Polaroid'],
] as const satisfies PieceOptions

/** 03 · Los globos. */
export const COVER_BALLOONS = [
  ['original', 'Redondos'],
  ['corazones', 'Corazones'],
  ['numero', 'Número de la edad'],
  ['sin', 'Sin globos'],
] as const satisfies PieceOptions

/** 03 · La letra del deseo. */
export const COVER_HANDS = [
  ['original', 'Cursiva'],
  ['caveat', 'A mano'],
  ['serif', 'Elegante'],
  ['moderna', 'Moderna'],
] as const satisfies PieceOptions

/** 03 · Confeti y garabatos. */
export const COVER_DETAILS = [
  ['original', 'Confeti y garabatos'],
  ['estrellas', 'Estrellas'],
  ['corazones', 'Corazones'],
  ['limpio', 'Limpio'],
] as const satisfies PieceOptions

/** 04 · El papel de la tarjeta. */
export const CARD_PAPERS = [
  ['original', 'Liso'],
  ['rayado', 'Rayado'],
  ['cuadros', 'Cuadriculado'],
  ['kraft', 'Kraft'],
  ['acuarela', 'Acuarela'],
] as const satisfies PieceOptions

/** 04 · El sticker del sobre. */
export const CARD_SEALS = [
  ['original', 'Torta'],
  ['corazon', 'Corazón'],
  ['estrella', 'Estrella'],
  ['regalo', 'Regalo'],
] as const satisfies PieceOptions

/** 05 · Lo que sostiene cada polaroid. */
export const MOMENTS_FASTENERS = [
  ['original', 'Moños'],
  ['washi', 'Cinta washi'],
  ['chinche', 'Chinches'],
  ['clip', 'Clips'],
] as const satisfies PieceOptions

/** 05 · Cómo se acomodan las fotos. */
export const MOMENTS_LAYOUTS = [
  ['original', 'Inclinadas'],
  ['derecha', 'Derechas'],
  ['collage', 'Collage'],
] as const satisfies PieceOptions

/** 05 · Los globos de los costados. */
export const MOMENTS_BALLOONS = [
  ['original', 'Redondos'],
  ['corazones', 'Corazones'],
  ['sin', 'Sin globos'],
] as const satisfies PieceOptions

/** 06 · El filtro del video. */
export const VIDEO_FILTERS = [
  ['original', 'Sin filtro'],
  ['calido', 'Cálido'],
  ['bn', 'Blanco y negro'],
  ['sonado', 'Soñado'],
  ['vhs', 'VHS'],
] as const satisfies PieceOptions

/** 07 · La portada de las playlists. */
export const MIX_COVERS = [
  ['original', 'Portadas'],
  ['vinilo', 'Vinilo'],
  ['cassette', 'Cassette'],
  ['parlante', 'Parlante'],
] as const satisfies PieceOptions

/** 08 · Las tarjetas del quiz. */
export const QUIZ_CARDS = [
  ['original', 'Blancas'],
  ['pizarra', 'Pizarra'],
  ['neon', 'Neón'],
  ['papel', 'Papel'],
] as const satisfies PieceOptions

/** 09 · El telón. */
export const PREMIERE_CURTAINS = [
  ['original', 'Rojo'],
  ['azul', 'Azul'],
  ['violeta', 'Violeta'],
  ['dorado', 'Dorado'],
  ['rosa', 'Rosa'],
] as const satisfies PieceOptions

/** 09 · Lo que se come en la función. */
export const PREMIERE_SNACKS = [
  ['original', 'Pochoclos'],
  ['gaseosa', 'Gaseosa'],
  ['golosinas', 'Golosinas'],
] as const satisfies PieceOptions

/** 10 · La escena de abajo del póster. */
export const POSTER_SCENES = [
  ['original', 'Gente festejando'],
  ['ciudad', 'Ciudad de noche'],
  ['butacas', 'Butacas'],
  ['cielo', 'Cielo con estrellas'],
] as const satisfies PieceOptions

/** 11 · La máquina. */
export const SLOTS_MACHINES = [
  ['original', 'Clásica'],
  ['neon', 'Neón'],
  ['dorada', 'Dorada'],
  ['caramelo', 'Caramelo'],
] as const satisfies PieceOptions

/** 11 · Los símbolos de los rodillos. */
export const SLOTS_SYMBOLS = [
  ['original', 'De cumple'],
  ['frutas', 'Frutas'],
  ['corazones', 'Corazones'],
  ['estrellas', 'Estrellas'],
] as const satisfies PieceOptions

/** 12 · Los colores de los vales. */
export const VOUCHER_COLORS = [
  ['original', 'De colores'],
  ['pastel', 'Pastel'],
  ['kraft', 'Kraft'],
  ['dorados', 'Dorados'],
  ['noche', 'Noche'],
] as const satisfies PieceOptions

/** 12 · El sello de canjeado. */
export const VOUCHER_STAMPS = [
  ['original', 'Rectangular'],
  ['redondo', 'Redondo'],
  ['dorado', 'Dorado'],
  ['corazon', 'Con corazones'],
] as const satisfies PieceOptions

/** 13 · El estilo de la tapa. */
export const MAGAZINE_COVERS = [
  ['original', 'Revista'],
  ['diario', 'Diario'],
  ['retro', 'Retro'],
  ['moderna', 'Moderna'],
] as const satisfies PieceOptions

/** 13 · El marco de la foto. */
export const MAGAZINE_FRAMES = [
  ['original', 'Recta'],
  ['redonda', 'Redonda'],
  ['polaroid', 'Polaroid'],
  ['arco', 'Arco'],
] as const satisfies PieceOptions

/** 14 · Cómo se sostienen las notas. */
export const WISH_FASTENERS = [
  ['original', 'Cinta'],
  ['chinche', 'Chinches'],
  ['clip', 'Clips'],
  ['corazon', 'Corazones'],
] as const satisfies PieceOptions

/** 14 · Cómo son las notas. */
export const WISH_NOTES = [
  ['original', 'De colores'],
  ['postit', 'Post-it'],
  ['kraft', 'Kraft'],
  ['rayadas', 'Rayadas'],
] as const satisfies PieceOptions

/** 16 · Dónde se guarda la cápsula. */
export const CAPSULE_VESSELS = [
  ['original', 'Frasco'],
  ['cofre', 'Cofre'],
  ['caja', 'Caja de regalo'],
  ['sobre', 'Sobre lacrado'],
] as const satisfies PieceOptions

/** 17 · La forma de la piñata. */
export const PINATA_SHAPES = [
  ['original', 'Estrella'],
  ['corazon', 'Corazón'],
  ['globo', 'Globo'],
  ['caramelo', 'Caramelo'],
] as const satisfies PieceOptions

/** 17 · Los colores de las tiras y de lo que cae. */
export const PINATA_COLORS = [
  ['original', 'Arcoíris'],
  ['pastel', 'Pastel'],
  ['dorado', 'Dorado'],
  ['fuego', 'Fuego'],
] as const satisfies PieceOptions

/** 18 · El estilo de la tarjeta del recuerdo. */
export const MEMORY_CARDS = [
  ['original', 'Tarjeta'],
  ['polaroid', 'Polaroid'],
  ['cine', 'Cine'],
  ['postal', 'Postal'],
] as const satisfies PieceOptions

/** 18 · La forma de la foto. */
export const MEMORY_FRAMES = [
  ['original', 'Recta'],
  ['redonda', 'Redonda'],
  ['arco', 'Arco'],
] as const satisfies PieceOptions

/** 19 · El estilo del resumen. */
export const RECAP_CARDS = [
  ['original', 'Tarjeta'],
  ['ticket', 'Ticket'],
  ['album', 'Álbum'],
  ['oscuro', 'Oscuro'],
] as const satisfies PieceOptions

/** 19 · Cómo se arman las fotos de arriba. */
export const RECAP_PHOTOS = [
  ['original', 'Columnas'],
  ['tira', 'Tira de película'],
  ['mosaico', 'Mosaico'],
  ['polaroids', 'Polaroids'],
] as const satisfies PieceOptions

/** 20 · El remate del final. */
export const FINALE_ENDINGS = [
  ['original', 'Confeti y globos'],
  ['globos', 'Globos que suben'],
  ['fuegos', 'Fuegos artificiales'],
  ['corazones', 'Corazones que suben'],
] as const satisfies PieceOptions

/** 20 · La caja del regalo sorpresa. */
export const FINALE_BOXES = [
  ['original', 'Blanca'],
  ['dorada', 'Dorada'],
  ['kraft', 'Kraft'],
  ['azul', 'Azul'],
  ['lunares', 'Lunares'],
] as const satisfies PieceOptions
