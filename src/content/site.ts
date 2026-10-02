/**
 * Datos institucionales en un solo lugar. El dominio principal del proyecto
 * es ribbly.com.ar.
 */

export const site = {
  name: 'Ribbly',
  shortName: 'Ribbly',
  tagline: 'Conectando emociones y rompiendo distancias. Regalos digitales con alma.',
  location: 'Buenos Aires, Argentina',
  instagramHandle: '@ribbly.app',
  emails: {
    /** Envíos automáticos: entrega de regalos, links de edición, avisos de apertura y cupones anuales */
    gifts: 'regalos@ribbly.com.ar',

    /** Atención al cliente y soporte: dudas con fotos, pagos, consultas de compradores y agasajados */
    help: 'ayuda@ribbly.com.ar',

    /** Contacto general e institucional: consultas de marcas, colaboraciones, empresas y prensa */
    hello: 'hola@ribbly.com.ar',

    /** Defensa del consumidor: obligatorio por ley en Argentina para botón de arrepentimiento y reclamos formales */
    complaints: 'reclamos@ribbly.com.ar',

    /** Marketing y creadoras: alianzas comerciales, afiliadas, influencers y sponsors */
    marketing: 'marketing@ribbly.com.ar',

    /** Búsquedas laborales y talento del equipo */
    jobs: 'rrhh@ribbly.com.ar',
  },
  social: {
    instagram: 'https://instagram.com/ribbly.app',
    tiktok: 'https://tiktok.com',
    youtube: 'https://youtube.com',
    facebook: 'https://facebook.com',
  },
  /** Datos del responsable para los textos legales. */
  legal: {
    companyName: '[NOMBRE COMPLETO O RAZÓN SOCIAL]',
    cuit: '[CUIT]',
    address: '[DIRECCIÓN FISCAL COMPLETA]',
    jurisdiction: '[CIUDAD / JURISDICCIÓN]',
    /** Link al formulario de Data Fiscal de ARCA (ex AFIP). Vacío = no se muestra. */
    dataFiscalUrl: '',
    dataFiscalImage: '',
  },
  consumerDefenseUrl: 'https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario',
} as const

/** URL pública del sitio (metadatos, links absolutos y datos estructurados). */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000')
  )
}

/** Cómo funciona una Boxie, de la compra al regalo (home y checkout). */
export const howItWorks = [
  {
    icon: 'bag',
    title: 'Elegís y comprás',
    text: 'Elegís la temática, completás tus datos y pagás de forma segura.',
  },
  {
    icon: 'mail',
    title: 'Recibís el acceso',
    text: 'Entrás directo al editor y te llega un mail con tu link personal.',
  },
  {
    icon: 'pen',
    title: 'Personalizás',
    text: 'Cargás fotos, dedicatoria, su canción y anécdotas, con la vista previa en vivo.',
  },
  {
    icon: 'gift',
    title: 'Regalás',
    text: 'La bloqueás y le mandás el link único por WhatsApp.',
  },
] as const

export type HowItWorksIcon = (typeof howItWorks)[number]['icon']

export type ContactArea = 'ayuda' | 'marketing' | 'comercial' | 'reclamos' | 'rrhh' | 'general'

export const contactAreas: { value: ContactArea; label: string; email: string }[] = [
  { value: 'ayuda', label: 'Quiero editar mi regalo / Ayuda', email: site.emails.help },
  { value: 'marketing', label: 'Quiero contactarme con Publicidad', email: site.emails.marketing },
  { value: 'comercial', label: 'Área Comercial / Ventas', email: site.emails.marketing },
  { value: 'reclamos', label: 'Reclamos o Problemas Técnicos', email: site.emails.complaints },
  { value: 'rrhh', label: 'Enviar mi Curriculum (RRHH)', email: site.emails.jobs },
  { value: 'general', label: 'Otras consultas generales', email: site.emails.hello },
]
