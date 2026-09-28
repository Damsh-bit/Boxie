# Ideas para vender más Boxies (y que comprar sea más fácil)

Análisis del 28/09/2026 recorriendo la tienda como un cliente desde el celular (home → ficha de la
temática → checkout → Mercado Pago → editor → regalo) y mirando los números del panel de Marketing.
Cada idea dice **qué problema resuelve**, **qué hacer** y una estimación de impacto y esfuerzo.

## Cómo está hoy

Lo que ya funciona bien y conviene cuidar:

- La home vende desde la primera pantalla: el armador "¿Para quién es?" con vista previa, la cinta
  de compras reales con Mercado Pago y "+3.000 Boxies regaladas".
- La ficha explica los planes con lo que incluye cada uno en esa temática y tiene barra de compra
  fija en el celular.
- Después de pagar, Mercado Pago devuelve directo al editor (sin pasar por un mail).
- El editor guarda solo, muestra la vista previa real y cuenta qué falta para regalar.

Lo que encontré en el recorrido:

| #   | Fricción                                                                                                                     | Dónde            | Estado                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------- |
| 1   | El nombre que escriben en la home ("Sofi") se pierde: la ficha, el checkout y el editor lo vuelven a pedir.                  | Home → editor    | ✅ Resuelto (28/09)     |
| 2   | En el celular el checkout arranca con "¿Cómo funciona?" (toda la pantalla) y el total queda al final, debajo del formulario. | Checkout         | ✅ Resuelto (28/09)     |
| 3   | El botón de pagar queda gris hasta tildar los términos, sin explicar por qué.                                                | Checkout         | ✅ Resuelto (28/09)     |
| 4   | El teléfono es obligatorio aunque el acceso llega por mail.                                                                  | Checkout         | ✅ Ahora es opcional    |
| 5   | "QUIERO MI BOXIE CON DESCUENTO" se corta en pantallas chicas.                                                                | Ficha            | ✅ Resuelto (28/09)     |
| 6   | Un cupón que llega en un link (anuncio, creadora) solo se aplicaba si el link iba directo al checkout.                       | Toda la tienda   | ✅ Se guarda una semana |
| 7   | Lo que armaron en "Probá cómo se personaliza" no pasa a la Boxie comprada: después de pagar empiezan de cero.                | Editor de prueba | ✅ Se trae al comprar   |
| 8   | El botón flotante de ayuda tapa parte de los botones de compra y del total en el celular.                                    | Toda la tienda   | Pendiente (idea 13)     |
| 9   | El regalo termina y no invita a regalar: quien lo recibe (alguien que acaba de emocionarse) no tiene cómo hacer uno.         | Regalo `/g/…`    | ✅ Tarjeta al final     |
| 10  | Las compras abandonadas solo se recuperan a mano (Clientes → "abandonaron").                                                 | Post-checkout    | Pendiente (idea 4)      |
| 11  | Meta y Google no reciben las compras: optimizan por clics, no por ventas.                                                    | Medición         | ✅ Meta listo, apagado  |
| 12  | La oferta "Si comprás ya, 25 % OFF" aparece a los 15 segundos a todos: se aprende rápido y enseña a no pagar precio lleno.   | Ficha            | Pendiente (idea 10)     |

## Las ideas, por prioridad

### Ahora (más impacto, poco o mediano esfuerzo)

**1. "Armala gratis, pagala cuando esté lista".** ✅ _Hecho (28/09): al abrir el editor de una
Boxie recién comprada, si en ese navegador hay una prueba de la misma temática, aparece "Traer lo
que armé" (textos y fotos, que se suben en ese momento). El editor de prueba tiene "Comprarla" a
mano y al final dice que lo armado pasa a la Boxie. Falta: que la home y la ficha lleven primero
a armarla._ Hoy el editor de prueba guarda en el navegador y
se descarta. Si al pagar la Boxie nace con lo que ya armaron (textos y fotos), el pago pasa a ser
el último paso de algo que ya quieren regalar (efecto IKEA: lo que uno arma vale más). Qué hacer:
en el editor real, si el borrador está vacío y hay uno de prueba de la misma temática, ofrecer
"Traer lo que armaste" (las fotos se suben en ese momento). En la ficha y en la home, el botón
principal puede pasar a ser "Empezar a armarla" y el de pago aparecer arriba del editor de prueba
("Pagar y guardar"). _Impacto alto · esfuerzo medio._

**2. Checkout en un paso.** Con Mercado Pago Checkout Bricks (o el botón de billetera) se paga sin
salir de Boxie: tarjeta, dinero en cuenta y cuotas en la misma pantalla. Menos redirecciones =
menos pagos abandonados (hoy 1 de cada 3 pagos iniciados no se completa en la demo). Sumar
`statement_descriptor: "BOXIE"` (el resumen de la tarjeta dice qué se compró: menos
desconocimientos) y excluir los medios en efectivo (Rapipago/Pago Fácil) para un regalo que se
quiere al instante. _Impacto alto · esfuerzo medio._

**3. El regalo como canal de venta (loop viral).** ✅ _Hecho (28/09): al llegar a la última
pantalla del regalo aparece "¿Te emocionó?" con "Responderle con una Boxie" y "Regalar a otra
persona", con el cupón de bienvenida si está vigente. Se mide como el canal "Regalos
recibidos"._ Al final del regalo, una pantalla: "¿Te gustó?
Regalale una Boxie a alguien" y "Respondé con una Boxie a {quien te la regaló}", con un cupón de
bienvenida y links etiquetados (`utm_source=boxie&utm_medium=regalo`: se mide solo en Marketing ›
Canales). Cada regalo abierto es alguien que acaba de vivir el producto. _Impacto alto · esfuerzo
bajo._

**4. Recuperación automática de compras abandonadas.** Si alguien inicia el pago y no termina, a la
hora un mail (y WhatsApp si dejó el número) con el link para retomar y, a las 24 h, un cupón chico.
Es la automatización con mejor retorno en e-commerce. _Impacto alto · esfuerzo bajo._

**5. Píxel de Meta + API de conversiones y conversión de Google Ads.** ✅ _Meta hecho (28/09),
apagado hasta cargar `NEXT_PUBLIC_META_PIXEL_ID` y `META_CAPI_TOKEN`; antes hay que actualizar la
Política de Privacidad (hoy dice que no se comparten datos con terceros para publicidad). Falta
Google Ads._ Mandar la compra (con valor,
temática y plan) a las plataformas para que optimicen por ventas y para armar públicos de
remarketing ("vio una temática y no compró", "compró hace 11 meses"). El panel ya tiene el lugar
en Marketing › Herramientas › Medición. _Impacto alto · esfuerzo bajo-medio._

### Próximo (profundizan el valor por cliente)

**6. Programar la entrega.** "Que le llegue el 18 de octubre a las 9:00": el regalo se bloquea hoy
y Boxie manda el link por mail o WhatsApp en la fecha elegida. Saca la ansiedad de "me voy a
olvidar" y permite comprar con anticipación (las fechas fuertes se venden antes). _Impacto alto ·
esfuerzo medio._

**7. Recordatorio de fechas (recompra).** En el editor, pedir la fecha especial ("¿cuándo es su
cumple / su aniversario?"). Diez días antes del año siguiente, un mail: "Se viene el cumple de
Sofi". Con el cupón de aniversario que ya existe, la recompra sube sin pauta. _Impacto medio-alto
· esfuerzo bajo._

**8. Subir de plan desde el editor.** Cuando alguien llega al tope de fotos o quiere la clave o más
días, ofrecer "Pasá a Premium por la diferencia ($ 3.000)" sin salir del editor. Se vende en el
momento en que la persona siente que le falta algo. _Impacto medio · esfuerzo medio._

**9. Boxie colaborativa (regalo de grupo).** Un link para que amigos, compañeros o la familia suban
fotos y mensajes a la misma Boxie (Día del Amigo, Día del Maestro, despedidas, egresados). Sube el
ticket y cada colaborador conoce Boxie (más loop viral). _Impacto alto · esfuerzo alto._

**10. Urgencia honesta en vez de la oferta a los 15 segundos.** ✅ _En parte (28/09): la ficha
muestra la próxima fecha real del calendario ("Día de la Madre en 20 días · llega al instante").
La oferta a los 15 segundos sigue: sacarla o guardarla para la recuperación es decisión del
negocio._ Mostrar urgencia real: "Llega a
tiempo para el Día de la Madre", "Envío instantáneo: si comprás a las 23:50 llega a las 23:51",
contador hasta la fecha. Guardar el descuento para quien abandona (idea 4) y para campañas. Además
de convertir igual o mejor, evita problemas con la normativa de defensa del consumidor sobre
urgencias engañosas. _Impacto medio · esfuerzo bajo._

**11. Packs y "comprá 2" para fechas grupales.** Día del Amigo, Día del Maestro, Navidad: "3
Boxies Esencial por $ 8.990". Un solo pago, tres links para editar. _Impacto medio · esfuerzo
medio._

**12. Reseñas y reacciones reales en la ficha.** Videos cortos de reacciones (con permiso) y
reseñas con foto por temática, pedidas automáticamente 2 días después de que se abre el regalo.
Es la prueba social que más convierte en regalos. _Impacto medio · esfuerzo medio._

### Pulido (rápido y suma)

**13. El botón de ayuda no tapa lo importante.** En el celular, achicarlo o subirlo cuando hay una
barra de compra o un total a la vista (ya existe `useBottomBar` para la barra del editor: usarlo
también en la home, la ficha y el checkout).

**14. El ejemplo con su nombre.** ✅ _Hecho (28/09)._ "Ver ejemplo" desde el armador de la home puede abrir el ejemplo
con el nombre escrito ("Así se vería la Boxie de Sofi"): es la vista previa más convincente.

**15. Landings por búsqueda.** Una página por intención ("regalo para mi novia a distancia",
"regalo de último momento", "regalo para el Día de la Madre") generadas con el Generador y
medidas por página de entrada en Marketing › Canales.

**16. Precio en cuotas visible.** "Hasta 3 cuotas sin interés" (si se configura en Mercado Pago)
cerca del precio: baja la percepción del Premium.

**17. Pruebas A/B con la medición nueva.** Guardar la variante en la visita (el tracker ya tiene
la sesión) y comparar en Marketing › Herramientas › Prueba A/B: primer botón de la home, orden de
los planes, precio del Clásico, con o sin oferta.

**18. Velocidad de la primera pantalla.** Medir LCP en producción desde el celular: la home anima
la entrada del título y la marca; para quien llega de un anuncio (tiene UTM) conviene mostrar el
armador sin esperar la animación.

## Cómo medir cada cambio

Todo lo anterior se ve en **Marketing**: el embudo del sitio (visitas → temática → checkout → pago
→ venta), la conversión por página de entrada y dispositivo, el CPA y el ROAS por canal. Antes de
cada cambio grande, anotar la conversión de las últimas 2 semanas; después, comparar con la
calculadora A/B para saber si la diferencia es real.
