# Plan: variaciones de diseño por elemento

Objetivo: que cada pantalla de la Ribbly tenga **al menos cuatro formas de variar el diseño** (ejes), cada
una con 3 o 4 opciones, sin salirse de la temática. El comprador las elige tocando el elemento en el
editor directo; la temática define el menú de opciones.

Alcance: las 20 pantallas de **Cumpleaños**. 13 de ellas son kinds compartidos con Pareja (marcadas con
**P**): la infraestructura y los ejes comunes les sirven también; las piezas de arte propias de cada
temática se dibujan aparte.

## Cómo está hoy

- Cada pantalla puede tener **una** elección de diseño: el campo `variant` (`field.variant` en
  `src/slides/fields.ts`) y `variants` en la definición (`src/slides/types.ts`). Hoy la usan 03 (rosa /
  celeste), 05 (celeste / crema) y 14 (cielo / noche).
- Las escenas de cumpleaños (`src/slides/ribbly/cumple-art.ts`) son datos: una paleta (tabla de
  colores) más funciones de dibujo parametrizadas (`balloon`, `bow`, `partyHat`, `confetti`…). La misma
  escena se dibuja en pantalla (SVG) y en la historia de Instagram (canvas).
- El resto de las pantallas son componentes React con piezas de `src/slides/ribbly/art.tsx` (`Cake`,
  `Balloon`, `Bunting`, `Confetti`, `Stars`, `PartyScene`…) y los colores del `palette` de la temática.
- El editor directo (`src/slides/editor/InlineWorkspace.tsx`) encuentra lo editable por `data-edit` y
  abre el campo sobre el diseño.
- Hay 9 tipografías servidas con `next/font` (`app/fonts.ts`).

Lo que falta es poder elegir **varias cosas por pantalla** (torta, globos, paleta, tipografía…), no un
único "diseño".

## Diseño del sistema

### 1. Ejes de estilo

Un eje es una cosa que varía (por ejemplo `torta`) y sus opciones (`clasica`, `chocolate`, `cupcake`,
`frutilla`). En la definición de la slide:

```ts
styleAxes?: (themeProps) => StyleAxis[]

interface StyleAxis {
  key: string               // 'torta'
  label: string             // 'Torta'
  /** data-edit del elemento: tocarlo abre este selector. Sin anchor, va a la barra de la pantalla. */
  anchor?: string
  options: StyleOption[]    // la primera es la de la temática
}
interface StyleOption {
  value: string
  label: string
  preview: { swatch: [string, string] } | { thumb: string }
}
```

En el `buyerSchema`, un solo campo nuevo `estilo` (`field.style()`), un objeto `{ [eje]: valor }`. Vacío
o sin una clave = la opción por defecto de la temática. Es compatible hacia atrás: las Ribbly ya vendidas
no tienen `estilo` y se ven exactamente igual (regla de `docs/DECISIONES.md`).

`variant` sigue como está: es el **diseño base** de la pantalla y los ejes varían piezas dentro de él.
Donde haga falta, `variant` se muestra como un eje más ("Diseño") en el selector.

### 2. Ejes comunes (se hacen una vez, sirven en todas)

| Eje               | Qué cambia                                                                   | Opciones iniciales                                                        |
| ----------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Paleta**        | Fondo, títulos, acentos y los colores de la decoración, como un juego armado | Rosa y dorado · Celeste y dorado · Lila y menta · Crema y coral (+ Noche) |
| **Tipografía**    | Par título / texto                                                           | Fredoka + Nunito · Playfair + Outfit · Dancing + Nunito · Marker + Caveat |
| **Decoración**    | Lo que acompaña: globos, banderines, confeti, estrellas, nada                | Según la pantalla, del registro común                                     |
| **Marco de foto** | Forma de las fotos del comprador                                             | Polaroid · Redondeada · Onda orgánica · Marco dorado                      |

- **Las paletas traen todos sus colores** (fondo, título, globos, dorados): el comprador nunca arma una
  combinación que choque. No hay selector de color libre.
- **Paleta y tipografía, para todo el regalo o por pantalla:** se eligen una vez con "Aplicar a todo el
  regalo" (campo nuevo a nivel contenido, `estiloGlobal`) y cada pantalla puede pisarlas.
- Registro en `src/slides/ribbly/styles/`: `palettes.ts`, `type.ts`, `deco.ts`, `frames.ts`. Las slides
  React los leen como variables CSS sobre el `Stage`, y las escenas de `cumple-art.ts` como datos (la
  paleta reemplaza a las tablas `COVER` / `MOMENTS`).

### 3. Lo que decide la temática

En la configuración de cada slide del panel, qué ejes y opciones se ofrecen (`styles.allow`) y cuál es
la opción por defecto. Así una temática nueva puede usar los mismos ejes con otro menú, y nada de lo que
elige el comprador sale de lo que la temática permite. Se edita en el panel, en la pestaña Estilo
(`app/admin/(panel)/tematicas/[id]/StyleTab.tsx`).

### 4. Editor del comprador

- Tocar un elemento con `anchor` (la torta, un globo, la foto) abre el selector de ese eje con
  miniaturas, en el mismo globo/hoja del editor directo. El cambio se ve en vivo.
- Una barra **"Estilo de esta pantalla"** con los ejes sin elemento tocable (paleta, tipografía,
  decoración), y el botón "Aplicar a todo el regalo" para paleta y tipografía.
- En el editor de formulario (`form`), los mismos ejes como tarjetas en "Más opciones".
- Botón "Sorprendeme": elige una combinación al azar entre las permitidas.

### 5. Historia de Instagram y tipografías

- `story-image.ts` dibuja con el mismo estilo; antes de dibujar espera `document.fonts.load()` de la
  tipografía elegida.
- Los textos que se ajustan al espacio (`measure`) se prueban con cada tipografía: cada una tiene otra
  métrica.

## Los cuatro ejes de cada pantalla

**C** = eje común (se hace una vez). **Arte** = piezas nuevas de dibujo, con su tamaño: S (colores o
combinación de piezas existentes), M (piezas nuevas simples), L (piezas nuevas con animación o
interacción).

| #   | Pantalla (kind)                      | Eje 1                                                                        | Eje 2                                                                | Eje 3                                                                      | Eje 4                                                   |
| --- | ------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| 01  | Bienvenida (`intro.brand`) **P**     | Paleta **C**                                                                 | Tipografía **C**                                                     | Decoración **C**                                                           | Entrada: cinta · explosión · lluvia de confeti — Arte M |
| 02  | El festejo (`cover.cake`)            | **Torta**: clásica 2 pisos · chocolate · frutilla · cupcake gigante — Arte L | **Velas**: número · finitas · bengalas — Arte M                      | Paleta **C**                                                               | Fondo: rayos · banderines · confeti · liso — Arte S     |
| 03  | Edición cumple (`cover.age`)         | Diseño: rosa · celeste (+ lila · noche) — Arte M                             | Marco de foto **C**                                                  | **Globos**: redondos · corazones · número metalizado · sin globos — Arte M | Tipografía del deseo **C**                              |
| 04  | La carta (`story.card`) **P**        | **Papel**: liso · rayado · kraft · sobre — Arte M                            | Tipografía de la carta **C**                                         | Decoración **C**                                                           | Paleta **C**                                            |
| 05  | Recorrido (`story.moments`) **P**    | Diseño: celeste · crema — existe                                             | **Sujeción**: moño · washi · chinche · clip — Arte S/M               | **Disposición**: grilla 2×2 · collage inclinado · tira de fotos — Arte M   | Paleta **C**                                            |
| 06  | Video (`media.video`) **P**          | **Marco**: TV retro · celular · pantalla de cine · polaroid — Arte M         | Escena de fondo: fiesta · noche · confeti — Arte S                   | Paleta **C**                                                               | Tipografía **C**                                        |
| 07  | Canciones (`media.mix`) **P**        | **Reproductor**: vinilo · cassette · app · radio — Arte M/L                  | Paleta **C**                                                         | Tipografía **C**                                                           | Decoración **C**                                        |
| 08  | Quiz (`game.quiz`) **P**             | **Tarjetas de pregunta**: globos · sobres · pizarra · naipes — Arte M        | **Premio**: cofre · caja de regalo · sobre — Arte M                  | Paleta **C**                                                               | Tipografía **C**                                        |
| 09  | Estreno (`connector.premiere`) **P** | **Ambiente**: cine · teatro · autocine · alfombra roja — Arte M              | Luces: estrellas · focos · guirnaldas — Arte S                       | Paleta **C**                                                               | Tipografía de cartelera **C**                           |
| 10  | Afiche (`media.poster`) **P**        | **Estilo de afiche**: clásico · neón · minimal · polaroid — Arte M           | Escena de fondo: ciudad de noche · fiesta · estrellas — Arte S       | Paleta **C**                                                               | Tipografía **C**                                        |
| 11  | Tragamonedas (`game.slots`) **P**    | **Máquina**: clásica · neón · caramelo · dorada — Arte M                     | **Símbolos**: frutas · cumpleaños · corazones · estrellas — Arte S/M | Paleta **C**                                                               | Festejo al ganar: confeti · fuegos · globos — Arte S    |
| 12  | Cuponera (`game.vouchers`) **P**     | **Vale**: ticket · sobre · raspadita · etiqueta — Arte M (raspadita L)       | Sellos y detalles: sellos · cintas · stickers — Arte S               | Paleta **C**                                                               | Tipografía **C**                                        |
| 13  | Revista (`story.magazine`)           | **Tapa**: moda · diario · cómic · retro — Arte M                             | Tipografía del título **C**                                          | Marco de foto **C**                                                        | Paleta **C**                                            |
| 14  | 10 deseos (`story.wishes`) **P**     | Diseño: cielo · noche (+ 2) — existe                                         | **Nota**: estrella · sobre · nube · post-it — Arte M                 | Tipografía **C**                                                           | Fondo: liso · bokeh · estrellas · confeti — Arte S      |
| 15  | Velas (`reflect.candles`)            | **Torta**: la misma de la 02 — reusa                                         | Velas: la misma de la 02 — reusa                                     | Paleta **C**                                                               | Fondo: bokeh · estrellas · guirnaldas — Arte S          |
| 16  | Cápsula (`reflect.capsule`)          | **Recipiente**: frasco · caja · cofre · sobre lacrado — Arte M/L             | Fondo: estrellas · bokeh · liso — Arte S                             | Paleta **C**                                                               | Tipografía **C**                                        |
| 17  | Piñata (`game.pinata`)               | **Piñata**: estrella · globo · corazón · número — Arte L                     | **Qué cae**: caramelos · confeti · estrellas · corazones — Arte M    | Paleta **C**                                                               | Fondo: banderines · rayos · liso — Arte S               |
| 18  | El recuerdo (`story.memory`) **P**   | Marco de foto **C**                                                          | Tipografía **C**                                                     | Paleta **C**                                                               | Decoración **C**                                        |
| 19  | Repaso (`outro.recap`) **P**         | **Formato**: álbum · línea de tiempo · tarjetas — Arte M                     | Paleta **C**                                                         | Tipografía **C**                                                           | Decoración **C**                                        |
| 20  | Final (`outro.finale`) **P**         | **Remate**: globos que suben · fuegos · lluvia de confeti · moño — Arte M/L  | **Firma**: manuscrita · sello · etiqueta — Arte S                    | Paleta **C**                                                               | Tipografía **C**                                        |

Cuentas: los cuatro ejes comunes cubren unas 50 de las 80 casillas. Quedan unas 30 piezas de arte
propias, de las cuales 4 son grandes (torta, piñata, raspadita, recipiente de la cápsula) y la torta se
reusa en la 02 y la 15.

## Fases

**Fase 0 · Infraestructura** (sin cambios visibles todavía)

- `StyleAxis`, `field.style()`, campo `estilo` en el contenido y `estiloGlobal`, con valores por defecto.
- Registro de estilos en `src/slides/ribbly/styles/` y su lectura en `Stage` (variables CSS) y en las
  escenas.
- Selector en el editor directo (anchor + barra "Estilo de esta pantalla") y en el de formulario.
- `styles.allow` en la configuración de la slide y su edición en el panel.
- Historia de Instagram con el estilo y espera de tipografías.
- Tests: contenido viejo sin `estilo` se ve igual; opciones fuera de `allow` se ignoran.

**Fase 1 · Paleta y tipografía en las 20 pantallas**

- 4 paletas de Cumpleaños y 4 pares de tipografía. Pasar los colores fijos de cada slide (por ejemplo
  `ROSE`, `PARTY`, las tablas de `cumple-art.ts`) a la paleta.
- Al terminar, todas las pantallas tienen 2 ejes.

**Fase 2 · Decoración y marco de foto**

- Registro común de decoraciones (globos, banderines, confeti, estrellas, sin decoración) y de marcos de
  foto, con versión SVG y canvas.
- Al terminar, las pantallas 01, 04, 07, 18 y 19 ya tienen sus 4 ejes, y el resto tiene 3.

**Fase 3 · Piezas propias, por impacto**

1. 02 y 15: torta y velas (comparten pieza).
2. 03: globos y dos diseños más.
3. 05 y 14: sujeción, disposición, notas.
4. 17, 11 y 12: piñata, máquina y símbolos, vales.
5. El resto: 06, 08, 09, 10, 13, 16, 20.

Cada pantalla se cierra con sus cuatro ejes, test de que cada opción se dibuja (pantalla y historia), y
revisión en el celular.

**Al final de cada fase**: publicar la temática en producción (`npm run themes:publish -- cumpleanos
--apply`, después del simulacro). Un deploy solo no alcanza: produ lee la versión publicada en la base.

## Dependencias de diseño

El código no es el cuello de botella; el arte sí. Hace falta, antes de cada fase:

- Fase 1: las 4 paletas y los 4 pares tipográficos, aprobados.
- Fase 2: decoraciones y marcos (5 + 4 piezas).
- Fase 3: las ~30 piezas de la tabla, empezando por las tortas (4) y las velas (3).

Las piezas tienen que venir medidas sobre el lienzo de 360 × 640, como las pantallas de referencia de
03 y 05, para calcarlas en SVG.

## Riesgos

- **Combinaciones:** 4 ejes × 4 opciones son 256 combinaciones por pantalla. Se controla con paletas que
  traen sus propios colores de decoración y con tests por opción, no por combinación. Una revisión visual
  de las combinaciones más probables por pantalla.
- **Peso:** más tipografías y más arte. Las tipografías ya están cargadas; el arte es SVG en código, sin
  imágenes. Medir el tamaño del bundle de cada slide al cerrar cada fase.
- **Pareja:** los ejes comunes le llegan gratis, pero si no se le definen opciones en `styles.allow`,
  no ve nada nuevo. Decidir si entra en este plan o después.

## Decisiones abiertas

1. ¿Paleta y tipografía para todo el regalo con excepción por pantalla (lo propuesto), o solo por
   pantalla?
2. ¿Pareja (y Amistad) entran en este plan?
3. ¿Las variaciones son todas gratis, o alguna (por ejemplo las piezas L) es parte de un plan más caro?
4. ¿Quién hace el arte de la Fase 3, y en qué formato llega?
