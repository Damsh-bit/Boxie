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

## Bugs del prototipo que se corrigieron al portar

- La cuponera ignoraba los vales que cargaba el comprador (mostraba siempre los mismos 6).
- En Amigos y Cumpleaños, las partículas y el confeti quedaban tapados por el fondo y no se veían.
- El ícono de regalo "flotaba" con la animación de las partículas (mismo nombre) y desaparecía.
- Las secuencias con timers arrancaban una slide antes de verse; el video de la canción empezaba a
  sonar sobre la dedicatoria.
- "Tus respuestas se han guardado" / "Entrada guardada en tu Boxie": no se guardaba nada. Se cambió
  el texto.
- El swipe no convivía con las listas scrolleables (playlists, cuponera): ahora primero scrollea.

## Modo demo

`DEMO_MODE=1` levanta el sitio sin Supabase ni Mercado Pago, con el catálogo de `supabase/seed`.
Existe para mostrar el producto en un deploy sin secretos. Nunca se activa solo. En demo el editor
se usa en modo prueba y `/editor` explica cómo llegar a él.

## Rendering

Las páginas que leen la base se renderizan por request (`force-dynamic`): el build no depende de la
base (los deploys de preview no fallan por datos). Si el tráfico lo pide, se agrega caché por tags.
