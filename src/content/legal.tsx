import type { ReactNode } from 'react'
import { site } from './site'

/**
 * Textos legales. Portados de src/data/legalTexts.js del prototipo, sin HTML
 * en strings (el prototipo usaba dangerouslySetInnerHTML).
 *
 * PENDIENTE (dueño del producto, con asesoramiento legal): completar los datos
 * entre corchetes en src/content/site.ts y revisar el punto de vigencia, que
 * cambió respecto del prototipo: los 60 días corren desde que la Boxie se
 * bloquea para regalar, no desde la compra (docs/DECISIONES.md).
 */

const { companyName, cuit, address, jurisdiction } = site.legal

export interface LegalDoc {
  slug: string
  title: string
  summary: string
  icon: string
  updated: string
  body: ReactNode
}

const terms: LegalDoc = {
  slug: 'terminos',
  title: 'Términos y Condiciones',
  summary: 'Las reglas del juego. Leé nuestro contrato de servicio.',
  icon: '📜',
  updated: '2026-09-22',
  body: (
    <>
      <h3>1. Introducción</h3>
      <p>
        Bienvenido a Boxie. Al acceder a nuestro sitio web y utilizar nuestros servicios, aceptás
        cumplir con estos Términos y Condiciones. Este servicio es operado por{' '}
        <strong>{companyName}</strong>, CUIT <strong>{cuit}</strong>, con domicilio legal en{' '}
        <strong>{address}</strong>.
      </p>

      <h3>2. Descripción del Servicio</h3>
      <p>
        Boxie ofrece una plataforma para la creación de experiencias digitales personalizadas
        (&quot;Boxies&quot;). El usuario proporciona contenido (fotos, textos, música) que nosotros
        procesamos y alojamos en una dirección web única para ser compartida como regalo.
      </p>

      <h3>3. Personalización y Bloqueo</h3>
      <p>
        El usuario entiende que Boxie es un producto <strong>personalizado</strong>. Una vez
        realizada la compra, el usuario recibe por correo electrónico un link de acceso para editar
        el contenido. Al finalizar la edición y presionar el botón de &quot;Finalizar y
        regalar&quot;, el contenido se considera final y entregado. No se podrán realizar
        modificaciones posteriores.
      </p>

      <h3>4. Excepción al Derecho de Retracto (Arrepentimiento)</h3>
      <p>
        Conforme al{' '}
        <strong>Artículo 1116 del Código Civil y Comercial de la Nación Argentina</strong>, el
        derecho de retracto no es aplicable a contratos referidos a:
      </p>
      <ul>
        <li>
          Productos confeccionados conforme a las especificaciones suministradas por el consumidor o
          claramente personalizados.
        </li>
        <li>
          Suministro de contenido digital que no se preste en un soporte material cuando la
          ejecución haya comenzado.
        </li>
      </ul>
      <p>
        Por lo tanto,{' '}
        <strong>
          una vez que el usuario ha accedido a la plataforma de edición o ha bloqueado su Boxie, no
          se aceptarán devoluciones ni reembolsos
        </strong>
        , dado que el servicio se considera ejecutado y personalizado.
      </p>

      <h3>5. Vigencia del Servicio</h3>
      <p>
        Cada Boxie permanece disponible online durante{' '}
        <strong>60 (sesenta) días corridos desde que se bloquea para regalar</strong>. Una Boxie que
        no se bloquea puede editarse durante 60 días corridos desde la compra. Pasados esos plazos,
        el regalo deja de estar disponible y Boxie se reserva el derecho de eliminar el contenido de
        sus servidores para garantizar la privacidad y optimización del espacio.
      </p>

      <h3>6. Responsabilidad del Contenido</h3>
      <p>
        El usuario es el único responsable del contenido (imágenes, textos) que sube a Boxie. Queda
        prohibido subir contenido ilegal, pornográfico, violento u ofensivo. Boxie se reserva el
        derecho de dar de baja cualquier Boxie que viole estas normas sin derecho a reembolso.
      </p>

      <h3>7. Ley Aplicable y Jurisdicción</h3>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa será
        resuelta en los Tribunales Ordinarios de <strong>{jurisdiction}</strong>.
      </p>
    </>
  ),
}

const privacy: LegalDoc = {
  slug: 'privacidad',
  title: 'Política de Privacidad',
  summary: 'Cómo cuidamos tus datos y fotos (Ley 25.326).',
  icon: '🔒',
  updated: '2026-09-22',
  body: (
    <>
      <h3>1. Responsable de los Datos</h3>
      <p>
        Tus datos personales son tratados por <strong>{companyName}</strong> (&quot;Boxie&quot;) en
        cumplimiento de la Ley N° 25.326 de Protección de Datos Personales.
      </p>

      <h3>2. Qué datos recolectamos</h3>
      <p>
        Recolectamos únicamente los datos necesarios para brindar el servicio: nombre, correo
        electrónico, teléfono y el contenido multimedia que subís voluntariamente para crear tu
        regalo. Los pagos los procesa Mercado Pago: Boxie no recibe ni almacena datos de tarjetas.
      </p>

      <h3>3. Uso de la Información</h3>
      <p>Tus datos se utilizan exclusivamente para:</p>
      <ul>
        <li>Procesar tu pedido y enviarte el acceso de edición.</li>
        <li>Alojar tu Boxie para que pueda ser vista por el destinatario.</li>
        <li>Enviarte notificaciones relacionadas con el estado de tu servicio.</li>
      </ul>
      <p>
        <strong>Boxie no vende ni comparte tus datos con terceros para fines publicitarios.</strong>
      </p>

      <h3>4. Privacidad de las Fotos</h3>
      <p>
        Entendemos que el contenido de una Boxie es íntimo. Las fotos se guardan en almacenamiento
        privado y solo se muestran a través del link único del regalo, que no se puede adivinar.
        Boxie no utiliza tus fotos personales para publicidad sin tu consentimiento expreso.
      </p>

      <h3>5. Tus Derechos</h3>
      <p>
        Tenés derecho a acceder, rectificar o suprimir tus datos personales. Para ejercer estos
        derechos, enviá un correo a <a href={`mailto:${site.emails.hello}`}>{site.emails.hello}</a>.
      </p>
    </>
  ),
}

const payments: LegalDoc = {
  slug: 'pagos',
  title: 'Pagos y Reembolsos',
  summary: 'Política de Mercado Pago y derecho de arrepentimiento.',
  icon: '💳',
  updated: '2026-09-22',
  body: (
    <>
      <h3>1. Medios de Pago</h3>
      <p>
        Los pagos son procesados de forma segura a través de <strong>Mercado Pago</strong>.
        Aceptamos tarjetas de crédito, débito y dinero en cuenta de Mercado Pago. Boxie no almacena
        datos de tarjetas de crédito.
      </p>

      <h3>2. Facturación</h3>
      <p>
        Se emitirá una factura electrónica tipo &quot;C&quot; (Consumidor Final) por cada compra,
        que será enviada al correo electrónico registrado.
      </p>

      <h3>3. Política de Reembolsos</h3>
      <p>
        Debido a la naturaleza personalizada del producto (ver Términos y Condiciones), solo se
        realizarán reembolsos en los siguientes casos:
      </p>
      <ul>
        <li>
          Fallas técnicas imputables a Boxie que impidan el uso del servicio y no puedan ser
          resueltas en 48 horas.
        </li>
        <li>Compras duplicadas por error del sistema.</li>
      </ul>
      <p>
        No se realizan reembolsos por &quot;arrepentimiento&quot; una vez que se ha comenzado a
        utilizar el editor o se ha enviado el regalo, amparados en el Art. 1116 del CCCN.
      </p>
    </>
  ),
}

const ip: LegalDoc = {
  slug: 'propiedad-intelectual',
  title: 'Propiedad Intelectual',
  summary: 'Sobre la marca Boxie y el uso de contenidos.',
  icon: '©️',
  updated: '2026-09-22',
  body: (
    <>
      <h3>1. Marca Registrada</h3>
      <p>
        El nombre &quot;Boxie&quot;, su logotipo y diseño del sitio web son propiedad intelectual de{' '}
        <strong>{companyName}</strong>. Queda prohibida su reproducción total o parcial sin
        autorización.
      </p>

      <h3>2. Contenido de Terceros</h3>
      <p>
        El usuario garantiza que posee los derechos sobre las imágenes y textos que sube a la
        plataforma. Boxie actúa como mero intermediario de alojamiento y no se hace responsable por
        infracciones de derechos de autor cometidas por los usuarios al subir contenido protegido.
      </p>
    </>
  ),
}

export const legalDocs = [terms, privacy, payments, ip]

export function getLegalDoc(slug: string): LegalDoc | undefined {
  return legalDocs.find((d) => d.slug === slug)
}
