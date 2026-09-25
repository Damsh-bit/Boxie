import type { FaqItem } from './home'

/**
 * El centro de ayuda (/ayuda): preguntas por tema. Las respuestas que
 * dependen de lo que se decide en el panel (planes, días online, fotos,
 * clave, cupón) reciben esos datos: nunca prometen un número fijo.
 */

export interface HelpContext {
  /** "desde $ 3.490" o "$ 4.990". */
  price: string
  /** Hay más de un plan a la venta. */
  plans: boolean
  /** "30 a 120 días" o "60 días". */
  lifetime: string
  /** Sin bloquear, días que se puede editar desde la compra. */
  editWindowDays: number
  /** Tope de fotos del plan más completo. */
  maxPhotos: number
  /** Algún plan no permite clave. */
  passwordByPlan: boolean
  /** El cupón de bienvenida vigente ("BOXIE10 · 10% OFF"), si hay. */
  welcome: { code: string; discount: string } | null
}

export interface HelpCategory {
  id: string
  emoji: string
  title: string
  items: FaqItem[]
}

export function helpCategories(ctx: HelpContext): HelpCategory[] {
  const byPlan = ctx.plans && ctx.lifetime.includes(' a ')
  return [
    {
      id: 'comprar',
      emoji: '🛍️',
      title: 'Comprar',
      items: [
        {
          question: '¿Qué es exactamente una Boxie?',
          answer:
            'Es un regalo 100% digital: una experiencia tipo historias, única y personalizada, con fotos, dedicatoria, su canción y juegos. La armás en minutos y se la mandás con un link que se abre desde el celular.',
        },
        {
          question: '¿Cuánto cuesta?',
          answer: ctx.plans
            ? `Hay planes ${ctx.price}, con pago único: sin suscripciones ni costos de envío. Cada plan suma pantallas, juegos y días online, y todas las temáticas traen lo mismo en cada plan. Los comparás en "Precios".`
            : `Cuesta ${ctx.price}, todo incluido y en cualquier temática: sin suscripciones ni costos de envío.`,
        },
        {
          question: '¿Cómo se paga? ¿Es seguro?',
          answer:
            'Pagás con Mercado Pago: tarjeta de crédito, débito o dinero en cuenta. Nosotros nunca vemos los datos de tu tarjeta, y el precio lo calcula el servidor (no se puede alterar desde el navegador).',
        },
        {
          question: '¿Tienen descuentos?',
          answer: ctx.welcome
            ? `Sí: con el código ${ctx.welcome.code} tenés ${ctx.welcome.discount} en tu primera Boxie. Lo cargás en el checkout y el descuento se ve al instante.`
            : 'Cada tanto hay promociones: seguinos en Instagram para enterarte primero.',
        },
        {
          question: '¿Puedo probarla antes de comprar?',
          answer:
            'Sí: podés ver una Boxie de ejemplo completa y probar el editor gratis (guarda en tu navegador), cargando tus textos y fotos, antes de pagar.',
        },
      ],
    },
    {
      id: 'personalizar',
      emoji: '✏️',
      title: 'Personalizar',
      items: [
        {
          question: '¿Cómo recibo el acceso después de pagar?',
          answer:
            'Apenas se acredita el pago entrás directo al editor, y además te llega un mail con tu link personal de edición. Si lo perdiste, pedilo de nuevo en "Ya compré: entrar a mi Boxie" con el mail que usaste al comprar.',
        },
        {
          question: '¿Puedo editarla después de pagar?',
          answer: `Todas las veces que quieras hasta que la bloquees para regalar: se guarda sola mientras escribís. Sin bloquearla, podés editarla hasta ${ctx.editWindowDays} días desde la compra.`,
        },
        {
          question: '¿Cuántas fotos puedo subir?',
          answer: ctx.plans
            ? `Hasta ${ctx.maxPhotos} en el plan más completo (cada plan tiene su tope). Las comprimimos en tu celular antes de subirlas, así suben rápido aunque sean pesadas.`
            : `Hasta ${ctx.maxPhotos}. Las comprimimos en tu celular antes de subirlas, así suben rápido aunque sean pesadas.`,
        },
        {
          question: '¿Puedo seguir desde otro dispositivo?',
          answer:
            'Sí: abrí el link de tu mail en el otro dispositivo y seguís donde quedaste. Todo lo que cargaste queda guardado.',
        },
      ],
    },
    {
      id: 'regalar',
      emoji: '🎁',
      title: 'Regalar',
      items: [
        {
          question: '¿Cómo se la mando?',
          answer:
            'Cuando está lista, la bloqueás para regalar y te damos un link único para mandarle por WhatsApp, mail o donde quieras. No hay envíos ni esperas.',
        },
        {
          question: '¿La persona que la recibe necesita una clave?',
          answer: ctx.passwordByPlan
            ? 'No hace falta: el link es único y no se puede adivinar. En los planes que la incluyen, podés agregarle una clave opcional y pasársela vos.'
            : 'No hace falta: el link es único y no se puede adivinar. Si querés, podés agregarle una clave opcional desde el editor y pasársela vos.',
        },
        {
          question: '¿Sirve como regalo a distancia?',
          answer:
            'Es ideal para eso: la abre desde su celular esté en otra ciudad o en otro país. Solo necesita el link.',
        },
        {
          question: '¿Hay que descargar una app o crear una cuenta?',
          answer:
            'No. Ni vos ni quien la recibe instalan nada: todo funciona desde el navegador del celular o la computadora.',
        },
      ],
    },
    {
      id: 'despues',
      emoji: '⏳',
      title: 'Después de regalarla',
      items: [
        {
          question: '¿Cuánto tiempo queda disponible el regalo?',
          answer: `${ctx.lifetime}${byPlan ? ' según el plan' : ''}, contados desde que la bloqueás para regalar (no desde la compra). Mientras tanto la puede abrir todas las veces que quiera.`,
        },
        {
          question: '¿Puedo cambiar algo después de bloquearla?',
          answer:
            'Al bloquearla, el contenido queda final: así quien la recibe ve exactamente lo que armaste. Si hay un error importante (un nombre mal escrito, por ejemplo), escribinos por el chat de ayuda y lo revisamos.',
        },
      ],
    },
    {
      id: 'problemas',
      emoji: '🛟',
      title: 'Problemas',
      items: [
        {
          question: 'Perdí el link para editar mi Boxie',
          answer:
            'Entrá a "Ya compré: entrar a mi Boxie", poné el mail con el que compraste y te mandamos un link nuevo (el anterior deja de funcionar, por seguridad).',
        },
        {
          question: 'Pagué pero no me llegó el mail',
          answer:
            'Revisá spam y promociones. Si en unos minutos no aparece, pedilo de nuevo en "Ya compré: entrar a mi Boxie" o abrí el chat de ayuda con el mail de la compra y lo resolvemos.',
        },
        {
          question: 'El regalo no abre o pide una clave',
          answer:
            'Fijate que el link esté completo (a veces se corta al copiarlo). Si tiene clave, te la tiene que pasar quien te la regaló. Si sigue sin abrir, escribinos por el chat de ayuda con el código de la Boxie.',
        },
        {
          question: 'Encontré un error en el sitio',
          answer:
            '¡Gracias por avisar! Abrí el chat de ayuda, elegí "Encontré un error" y contanos qué pasó: nos llega con el detalle de la página y del dispositivo para arreglarlo rápido.',
        },
      ],
    },
    {
      id: 'privacidad',
      emoji: '🔒',
      title: 'Privacidad',
      items: [
        {
          question: '¿Quién puede ver mi Boxie?',
          answer:
            'Solo quien tenga el link del regalo: es único, larguísimo y no se puede adivinar ni buscar. El link para editar es otro, personal, y nunca se comparte con quien la recibe.',
        },
        {
          question: '¿Qué hacen con mis fotos?',
          answer:
            'Se guardan en un almacenamiento privado y solo se muestran dentro de tu Boxie, con enlaces temporales. No las usamos para nada más. Todo el detalle está en la Política de Privacidad.',
        },
      ],
    },
  ]
}
