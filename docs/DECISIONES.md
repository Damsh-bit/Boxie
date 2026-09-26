# Decisiones de implementación

Complementa el [documento de arquitectura](https://boxie-roadmap.vercel.app/#documento). Acá queda lo
que se decidió al bajarlo a código, sobre todo donde se aparta del documento.

## Stack

- **Next.js 16 en vez de 15.** El documento dice 15; al empezar (septiembre 2026) la estable es 16.3 y
  15 está en mantenimiento. El modelo (App Router, Server Components, Route Handlers) es el mismo. Cambia
  un nombre: el middleware ahora es `proxy.ts`.
- **TypeScript 6.0**, no 7: `typescript-eslint` todavía no soporta 7.
- **Server Components + Server Actions en el admin, sin TanStack Query.** Menos piezas para el mismo
  resultado; si el panel necesita caché de cliente se suma después.
- **Mails con plantillas HTML propias** (no React Email: su paquete de componentes quedó deprecado).

## Datos

- **Tests de base sin Docker.** Las migraciones se prueban sobre PGlite (Postgres real compilado a
  WASM) con un shim de los roles de Supabase. Cubren RLS, pagos idempotentes, inmutabilidad y analítica,
  y corren en CI en segundos.
- **Tipos de la base generados desde las migraciones** (`npm run db:types:gen`), con el mismo formato
  que `supabase gen types`.
- **Idempotencia del pago por (proveedor, pago, estado)**, no solo por pago: Mercado Pago avisa
  `pending` y después `approved` para el mismo pago, y los dos se tienen que procesar. El evento y el
  cambio de estado van en la misma transacción (`apply_payment`), así un error a mitad de camino no
  deja el aviso marcado como procesado.
- **La orden guarda la versión de la temática vigente al comprar.** Lo que se vendió queda fijo.
- **Un pago por un monto distinto al calculado no crea la Boxie** (queda marcado para revisar).
- **Los tokens de las Boxies no se exponen ni al panel**: permisos por columna además de RLS.

## Acceso

- **El link del regalo se guarda hasheado y además cifrado** (AES-256-GCM, clave fuera de la base),
  para poder volver a mostrárselo al comprador sin guardarlo en claro. El de edición se guarda solo
  hasheado: reenviarlo lo rota.
- **60 días desde el bloqueo, no desde la compra** (pregunta abierta 2 del documento). Una Boxie que se
  compra con anticipación no pierde días. Sin bloquear, se edita hasta 60 días desde la compra. Los
  textos legales se actualizaron: **revisarlos con quien corresponda**.
- **Regalo sin clave, con clave opcional** (pregunta abierta 1, como recomendaba el documento).

## Motor de temáticas

- **Se construyó primero**, antes que el editor y el regalo: el player ya nace leyendo temáticas como
  datos, en vez de portarlo hardcodeado y reescribirlo en el Sprint 5.
- **Al publicar se guarda la configuración resuelta** (con todos los valores por defecto aplicados). Si
  mañana cambia un default en el código, los regalos ya vendidos no cambian.
- **Evolución del registro:** los cambios a un schema tienen que ser compatibles hacia atrás (campos
  nuevos con default). Nunca renombrar ni quitar campos que usan versiones publicadas.
- **El repaso final se arma solo** con las slides de la temática (el prototipo tenía la lista fija).

## Editor del comprador

- **Los módulos salen de la temática.** Uno por cada slide con `buyerSchema` (dedicatoria, canción,
  cuponera, razones, anécdota), más la portada (para quién es) y la clave opcional. Una temática
  nueva con otras slides trae sus módulos sin tocar el editor.
- **`<SchemaForm>` arma los formularios desde los schemas de Zod**, con todos los widgets (también
  los del panel: texto enriquecido, color, selector, listas de grupos). El constructor de temáticas
  del Sprint 5 lo reutiliza con el `themeSchema`.
- **Vista previa en vivo con el player real**: lo que se escribe se ve en el celular de al lado, en
  la slide del módulo que se está editando.
- **Guardado automático**, sin botón. El guardado es una función SQL (`save_boxie_content`) que
  rechaza editar una Boxie bloqueada, vencida o reembolsada aunque la app tenga un bug.
- **Fotos comprimidas en el navegador** (WebP, 1600 px; JPEG si el navegador no encodea WebP): una
  foto de celular de 4 MB queda en unos cientos de KB. El servidor valida el formato real por los
  primeros bytes (no el tipo que declara el navegador) y la guarda en el bucket privado. Se ven
  solo con URLs firmadas. Tope de 30 fotos por Boxie en la base; al bloquear se borran las
  reemplazadas.
- **Sesión del editor:** el link del mail se canjea por una cookie firmada `httpOnly` limitada a
  `/editor`, y la URL queda limpia. La cookie lleva una huella del token de edición: si se reenvía
  el link (se rota el token), las sesiones viejas dejan de valer.
- **Modo prueba** (`/ejemplo/<temática>/personalizar`): el mismo editor guardando en el navegador.
  Sirve para probar antes de comprar y para mostrar el producto en la demo sin base.
- **Regalo (`/g/<token>`)**: la apertura la registra el navegador, no el servidor, así los robots
  que arman la vista previa de WhatsApp no cuentan como aperturas. La clave opcional se valida en el
  servidor y da una cookie firmada por regalo (cambiar la clave la invalida). Cada regalo tiene su
  imagen de Open Graph con el nombre de quien lo recibe.
- **El alta de la Boxie al aprobarse un pago ya está** (`applyPaymentNotice`: tokens, Boxie y mail
  con el link del editor). El webhook de Mercado Pago solo va a tener que validar la firma, consultar
  el pago y llamarla. En desarrollo y E2E la llama `/api/dev/boxies` con el proveedor falso.

## Movimiento y experiencia

- **Un solo motor de animación: framer-motion.** Nada se anima con keyframes de CSS (se sacó
  `tw-animate-css`). Las curvas y resortes están en `src/ui/motion.tsx` (sitio y editor) y en
  `src/slides/player/motion.ts` (el player es autónomo); las piezas de las slides, en
  `src/slides/kinds/motion.tsx` (`Appear`, `Pop`, `Loop`), que dependen de `ctx.active`: entran al
  llegar a la slide y se repiten si se vuelve a ella, como hacía `.is-active` en el prototipo.
- **Los loops decorativos animan `transform`/`opacity` como string** (`transform: ['…', '…']`):
  framer-motion los manda al compositor (WAAPI) y siguen fluidos aunque el hilo principal esté
  ocupado, por ejemplo cuando el editor re-renderiza la vista previa en cada tecla. El fondo que
  se mueve de la intro y de la fortuna dejó de animar `background-position` (repintaba toda la
  slide en cada cuadro): ahora se desliza una capa con `transform`.
- **El player no re-renderiza al deslizar.** La slide actual es un valor de movimiento continuo
  (`position`); el dedo lo mueve directo, y al soltar decide por distancia o por velocidad (un
  flick corto también pasa) y el resorte sigue con la inercia del gesto. La transición es un mazo:
  la que viene sube tapando a la actual, que se achica y se oscurece. Un salto de varias slides
  (el editor abre un módulo lejano) se ve como un solo paso.
- **Reducir movimiento:** `MotionConfig reducedMotion="user"` saca los desplazamientos y los
  loops no arrancan. Nunca se decide qué se dibuja según `useReducedMotion()` (en el servidor no
  se sabe y rompe la hidratación): lo decorativo se dibuja siempre y se oculta con
  `motion-reduce:hidden` o `.bx-decor`.
- **Lo que aparece al scrollear no puede quedar invisible:** sin JavaScript lo muestra un
  `<noscript>`, y si la hidratación tarda más de 2,5 s, un keyframe de respaldo en
  `globals.css` (se apaga solo cuando MotionProvider marca `<html data-hydrated>`). Lo que está
  arriba de la ficha (la foto, que es el LCP) no arranca invisible.
- **Lo que se toca no late:** un botón que se escala en loop es más difícil de tocar y Playwright
  nunca lo ve "estable" para hacer clic. Late un anillo detrás; el botón queda quieto.
- **Un aviso que se va ya no vale:** lo que sale de un `AnimatePresence` se sigue viendo unos
  instantes. Los avisos ("Guardado", el del cupón, los errores) usan `Notice.p/span/div` de
  `src/ui/motion.tsx`, que los marca `aria-hidden` mientras salen. Sin eso, un "Guardado" que se
  estaba yendo parecía vigente: el E2E del editor real (CI) recargó en ese instante y perdió la
  última foto. A una persona la frena el aviso de cambios sin guardar, pero un lector de pantalla
  leía un estado viejo.
- **La tapa del regalo:** sin clave, `/g/<token>` arranca con "Abrir mi regalo". Además de la
  emoción, ese toque cuenta como interacción con la página y habilita que la canción suene
  después (los navegadores bloquean el audio hasta entonces). La apertura se registra al abrir
  la tapa. Con clave, la pantalla de la clave ya hizo de tapa.
- **Mejoras de uso que salieron de la auditoría:** barra de navegación fija (se esconde al bajar),
  barra de compra fija en el celular cuando el botón de la ficha sale de pantalla, galería de
  fotos que se desliza con el dedo, flecha en los `<select>`, "Cómo funciona" en la home,
  "Faltan N datos" lleva al primero que falta, "Empezar de nuevo" con confirmación propia (no
  `window.confirm`), revisión final como hoja deslizable en el celular, esqueleto mientras carga
  el editor de prueba y la barra de la Boxie de ejemplo debajo del teléfono (antes tapaba las
  flechas).
- **Bug corregido:** si se escribía mientras subía una foto, al terminar la subida se perdía lo
  escrito (el cambio se aplicaba sobre el borrador de cuando empezó). Ahora los cambios que
  llegan tarde se aplican sobre el último valor.

## Home de venta

- **Embudo:** portada con armador en vivo (temática + nombre → el celular lo muestra) → ocasiones
  → temáticas con precio → demos jugables de lo que trae → 4 pasos → reacción → precio con
  comparador → beneficios → preguntas → cierre. Barra de compra fija en el celular entre la
  portada y el cierre. Los componentes viven en `app/(marketing)/_home/` y los textos en
  `src/content/home.ts`.
- **Referencias de la competencia:** vista previa en vivo antes de pagar y selector de ocasiones
  (Digital Love Story, MiYo Gift, iLoveYou.gift), precio visible y "pago único, sin suscripción"
  (Love4U, QLovy), demo navegable (Tiempo Juntos) y navegación por ocasión (Bigbox).
- **El precio sale del catálogo**, el mismo que cobra el checkout: la home nunca promete un precio
  distinto. En demo es un precio de referencia ($4.990, `DEMO_SETTINGS`). Los precios del
  comparador (flores, desayuno…) son valores de referencia ficticios y lo dicen.
- **Sin reseñas ni cifras inventadas:** la charla de WhatsApp está rotulada "Recreación de ejemplo"
  y los números son del producto (20 pantallas, días online, 0 apps). Cuando haya reseñas reales,
  van en esa sección. La única excepción son los ejemplos de relleno de la cinta de compras (abajo).
- **Prueba social en la portada:** la cinta "María acaba de comprar una Boxie · con Mercado Pago"
  (`_home/PurchaseTicker.tsx`) lee las ventas pagadas de los últimos 14 días
  (`src/server/social-proof.ts`, con la clave de servicio, a lo sumo cada 5 minutos por
  instancia): del servidor sale solo el nombre de pila, la temática y hace cuánto, nunca apellido,
  mail ni monto; los nombres que no lo parecen ("test", "asdf") se descartan. Mientras haya menos
  de 8 ventas recientes, la completan **ejemplos inventados** (`src/content/social-proof.ts`,
  pedido explícito del dueño) con horarios escalonados y en otro orden en cada visita; con 8 o más
  dejan de salir solos, `examplesUntil: 0` los apaga y con las ventas pausadas nunca salen. Ojo:
  compras inventadas pueden leerse como publicidad engañosa (Ley 24.240, DNU 274/2019): apagarlos
  apenas haya ventas. El contador "+N Boxies regaladas" es solo con ventas reales y aparece desde
  100 (redondeado para abajo). La cinta se frena con el mouse encima, fuera de pantalla y con la
  pestaña oculta. La fila de confianza lleva el logo de Mercado Pago y "Hecho en Argentina" (lo que
  decía la etiqueta que reemplazó la cinta).
- **SEO:** título y descripción propios, canonical, Open Graph y JSON-LD (Organization, WebSite,
  Product con AggregateOffer y FAQPage). Un solo `h1`; cada sección con su `h2` con palabras que
  se buscan (regalo digital, regalo personalizado, a distancia, cumpleaños, aniversario).
- **Demos de la home:** son maquetas livianas (`_home/demos.tsx`), no el player: cargan rápido y
  no dependen del contrato de las slides. Las pestañas pasan solas como historias y se frenan al
  tocar, al pasar el mouse por el celular o fuera de pantalla.

## Bugs del prototipo que se corrigieron al portar

- La cuponera ignoraba los vales que cargaba el comprador (mostraba siempre los mismos 6).
- En Amigos y Cumpleaños, las partículas y el confeti quedaban tapados por el fondo y no se veían.
- El ícono de regalo "flotaba" con la animación de las partículas (mismo nombre) y desaparecía.
- Las secuencias con timers arrancaban una slide antes de verse; el video de la canción empezaba a
  sonar sobre la dedicatoria.
- "Tus respuestas se han guardado" / "Entrada guardada en tu Boxie": no se guardaba nada. Se cambió
  el texto.
- El swipe no convivía con las listas scrolleables (playlists, cuponera): ahora primero scrollea.

## Panel de administración

Detalle de uso en [ADMIN.md](ADMIN.md). Lo que se decidió:

- **Un contrato de datos (`AdminRepo`) con dos implementaciones**, demo y Supabase. Las páginas no
  saben cuál corre. Permitió construir y probar todo el panel sin base, y conectar la base es cambiar
  de implementación, no reescribir pantallas.
- **La analítica se calcula en el servidor con funciones puras** (`src/domain/admin`) sobre las
  órdenes del período, no en SQL. Con el volumen actual (cientos de órdenes por mes) sobra y deja
  todo testeado sin base. Las funciones SQL (`admin_kpis`, etc.) quedan para cuando haga falta.
- **Sesión propia del panel** (cookie firmada limitada a `/admin`), no la de Supabase en el
  navegador: el panel no expone la base al cliente y todo pasa por Server Actions con el rol
  verificado en cada una. El login cuenta solo los intentos fallidos (para no bloquear a quien entra
  y sale seguido).
- **Roles simples** (dueño, administrador, editor, soporte) en vez de permisos por sección: alcanza
  para un equipo chico y se entiende de un vistazo.
- **Bitácora inmutable** (`admin_audit_log`): cada cambio del panel queda con quién y cuándo, y la base
  no deja editarla ni borrarla.
- **Planes como niveles del mismo regalo**, no temáticas distintas: cada slide dice desde qué plan
  entra y un plan incluye todo lo de abajo. Sin planes cargados, todo sigue como antes (precio
  base). El plan se guarda en la orden y manda sobre el editor, el regalo, las fotos, la clave y los
  días online. Un plan que se vendió no se borra (se pausa).
- **El generador es determinístico y sin IA**: arquetipos con textos escritos a mano, paletas y
  fotos verificadas. Resultado predecible, gratis, sin depender de un proveedor y siempre válido
  contra el contrato de las slides. El servidor vuelve a generar al crear, no confía en el
  navegador.
- **Márgenes con costos configurables** (comisión de Mercado Pago con IVA, impuestos, costo variable
  por venta, gastos fijos prorrateados por día). Son estimaciones para decidir, no contabilidad.
- **Los cambios del panel revalidan solo lo que tocan**: las páginas públicas de a una (revalidar el
  layout raíz rompía las estáticas), el panel entero por layout.

## El sitio lee el panel (vidriera)

- **Un solo resumen por pedido, `getStorefront()`** (`src/server/storefront.ts`): planes, precio
  "desde", días online por plan, pantallas de la Boxie más completa, desde qué plan viene cada
  pantalla, cupón de bienvenida, datos del negocio y ventas pausadas. La home, la galería,
  /precios y la ayuda leen de ahí: ningún número queda fijo en el código ("20 pantallas", "60
  días", "10% OFF") y nunca se promete algo distinto de lo que cobra el checkout o entrega el
  regalo.
- **Lo que el panel crea se ve bien sin tocar código.** Una temática generada trae su emoji (el de
  su guía) y suma su ocasión en "¿A quién querés emocionar hoy?"; el selector de la portada y el
  carrusel escalan a cualquier cantidad de temáticas.
- **Dos bugs de diseño responsive que aparecían con datos del panel:** con más de 3 temáticas
  publicadas, el selector de la portada ensanchaba toda la grilla en el celular (544 px en una
  pantalla de 375); y el carrusel centrado con `justify-center` cortaba la primera tarjeta en
  escritorio. Regla desde ahora: las grillas de una columna van con `grid-cols-1` (minmax(0,1fr))
  y los carruseles con `justify-center-safe`.
- **El cupón de bienvenida se valida contra la base**: si en el panel se pausa, vence o agota, la
  home deja de ofrecerlo; el descuento que se muestra es el del cupón real.
- **Datos del negocio del panel** (mail de soporte, WhatsApp, Instagram) en el pie, contacto,
  ayuda y datos estructurados. Si la base no responde (el build de CI no tiene base), el pie usa
  los de `site.ts`. Redes sin perfil cargado no se muestran (antes linkeaban a la portada de
  TikTok, YouTube y Facebook).
- **La tienda (anon) ya no puede leer la rentabilidad**: con la clave pública se podía pedir
  `settings` entera (meta de facturación, comisiones, costos). La migración de soporte le deja a
  anon solo las columnas públicas.
- **"Entrar a mi Boxie" recupera el acceso de verdad** (la ayuda lo prometía y no existía): se
  reenvía el link de edición (rotado) o el del regalo, responde siempre igual y enseguida (el
  envío sigue con `after()`), así no sirve para averiguar quién compró.
- **Páginas nuevas:** /precios (planes y comparación pantalla por pantalla), /soporte, 404 con
  marca, error con "reintentar" y "reportar", `sitemap.xml`, `robots.txt` y manifest.

## Soporte

Detalle de uso en [ADMIN.md](ADMIN.md#soporte). Lo que se decidió:

- **Tickets con chat, no un formulario de contacto.** El botón de ayuda (abajo a la izquierda, en
  el sitio, el editor y el editor de prueba; no en el regalo) abre una consulta sobre una Boxie,
  un error, un pago u otra cosa, y la conversación sigue ahí. El formulario de contacto queda
  para ventas, prensa y trabajo.
- **Sin cuentas: cada consulta tiene un token** (192 bits; en la base, el hash y una copia
  cifrada como el link del regalo). El navegador guarda los tokens en una cookie httpOnly que
  solo viaja a `/api/soporte`; el mail de confirmación trae `/soporte/<token>` para seguir desde
  otro dispositivo (se canjea por la cookie y la URL queda limpia). Cada respuesta del equipo
  manda el mismo link personal.
- **Tiempo real con Server-Sent Events**, no WebSockets ni Supabase Realtime en el navegador: el
  navegador nunca habla con la base (igual que el panel). El stream escucha un bus en memoria (lo
  instantáneo) y, con la base real, relee cada 2,5 s una ventana de los últimos 15 s para
  enterarse de lo que pasó en otra instancia de Vercel (una ventana y no "desde lo último visto":
  una transacción que confirma tarde no se pierde). Cierra a los 50 s y el navegador reconecta
  pidiendo el estado completo, así ninguna función queda abierta más de lo que permite Vercel.
  Si hace falta más escala, el paso siguiente es Supabase Realtime (broadcast) solo como aviso.
- **Publicar un mensaje es una función de la base** (`support_post_message`): inserta el mensaje
  y actualiza el ticket (estado, primera respuesta, lectura) en la misma transacción. Una
  consulta cerrada no se reabre y los mensajes no se editan, aunque la app tenga un bug.
- **Estados:** abierto (le toca al equipo) → esperando al cliente (el equipo respondió) →
  resuelto (si el cliente escribe, se reabre) → cerrado (hay que abrir otra). Las notas internas
  no cambian el estado ni le llegan al cliente.
- **Mails sin llenar bandejas:** al cliente, uno por respuesta como mucho cada 10 minutos; al
  equipo, siempre por una consulta nueva y cada 30 minutos si el cliente vuelve a escribir.
- **Prioridad y "atrasada":** los pagos entran con prioridad alta; una consulta se marca
  atrasada según su prioridad (2 h urgente, 8 h alta, 24 h normal, 48 h baja). Quien responde
  primero se queda con la consulta.
- **"Escribiendo…"** viaja solo por el bus (es efímero): entre instancias puede no verse.

## Modo demo

`DEMO_MODE=1` levanta el sitio sin Supabase ni Mercado Pago, con el catálogo de `supabase/seed`.
Existe para mostrar el producto en un deploy sin secretos. Nunca se activa solo. En demo el editor
se usa en modo prueba y `/editor` explica cómo llegar a él. El panel usa un año de ventas simuladas
(semilla fija: siempre los mismos números) y lo que se cambia en él se ve en la tienda.

## Rendering

Las páginas que leen la base se renderizan por request (`force-dynamic`): el build no depende de la
base (los deploys de preview no fallan por datos). Si el tráfico lo pide, se agrega caché por tags.
