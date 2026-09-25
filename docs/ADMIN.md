# Panel de administración

El centro de control de Boxie para los dueños y el equipo: ventas, rentabilidad, temáticas,
planes, cupones, soporte y el trabajo del día a día. Vive en **`/admin`** (o en el subdominio que
diga `ADMIN_HOST`).

Hoy corre en **modo demo**: todo el panel funciona sobre datos de muestra (un año de ventas
simuladas) y lo que se cambia se ve en la tienda. Al conectar Supabase, el mismo panel pasa a la
base real sin tocar la interfaz (ver [Conectar Supabase](#conectar-supabase)).

## Entrar

| Entorno              | Cómo se entra                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Demo (`DEMO_MODE=1`) | Usuario de muestra: `admin@boxie.demo` / `boxie-admin`. Se cambian con `ADMIN_DEMO_EMAIL` y `ADMIN_DEMO_PASSWORD`. |
| Con Supabase         | Mail y clave de Supabase Auth; la cuenta tiene que estar en `admin_users` (con su rol).                            |

La sesión es una cookie firmada `httpOnly` limitada a `/admin` (12 horas, o 30 días con "mantener la
sesión"). El proxy (`proxy.ts`) manda al login a quien no tiene sesión, y además **cada página y cada
acción** vuelven a verificarla (y el rol): el proxy es la primera barrera, no la única. Los intentos
fallidos de login se limitan por IP y por mail.

> La clave de muestra solo sirve en local y en CI: es pública (está en este repo). En un deploy de
> Vercel en modo demo, **el panel queda cerrado hasta definir `ADMIN_DEMO_PASSWORD`** (y opcionalmente
> `ADMIN_DEMO_EMAIL`); el login lo explica.

## Secciones

| Sección           | Para qué                                                                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Resumen**       | Facturación vs. el período anterior, meta del mes con proyección, KPIs, temáticas y planes que más venden, embudo, alertas, movimientos y cupones.                                                                  |
| **Finanzas**      | Estado de resultados (cobrado → comisiones → impuestos → contribución → gastos fijos → resultado), mes a mes, rentabilidad por temática y por plan, gastos fijos, punto de equilibrio y simulador "¿qué pasa si…?". |
| **Analítica**     | Embudo con lo que se pierde en cada paso, checkouts vs. ventas, mapa de calor por día y hora, conversión por temática, tiempos del regalo, cupones y recompra por cohorte.                                          |
| **Ventas**        | Todas las órdenes (se paguen o no) con filtros, exportación a CSV y detalle con el historial de pagos, lo que dejó la venta y el reembolso.                                                                         |
| **Boxies**        | Buscador de soporte (código `K7M2-Q9XD`, mail o destinatario) y detalle: módulos completos, vista previa del regalo, extender, desbloquear, reenviar mails y corregir nombres.                                      |
| **Clientes**      | Las órdenes agrupadas por mail: recurrentes, nuevos, top 5 %, los que no compraron (con un mail listo para recuperarlos) y exportación.                                                                             |
| **Cupones**       | Alta y edición, estados (activo, programado, agotado, vencido, pausado), uso con tope, vista previa del descuento por plan y la oferta de la ficha.                                                                 |
| **Afiliados**     | Códigos de creadores y comercios, comisión y lo que hay que liquidar cada mes.                                                                                                                                      |
| **Temáticas**     | El catálogo. Cada temática tiene su editor: módulos (orden, textos, marco, plan), grilla de planes, ficha de la tienda, paleta y versiones, con la vista previa del regalo real.                                    |
| **Generador**     | Se pega una lista de ocasiones y cada temática se arma sola (ver [Generador](#generador)).                                                                                                                          |
| **Planes**        | Los niveles de precio y qué incluye cada uno (ver [Planes](#planes)).                                                                                                                                               |
| **Tareas**        | Tablero kanban del equipo (por hacer, haciendo, hecho).                                                                                                                                                             |
| **Actividad**     | Bitácora: cada cambio del panel queda registrado con quién y cuándo.                                                                                                                                                |
| **Equipo**        | Administradores, roles e invitaciones (solo el dueño).                                                                                                                                                              |
| **Configuración** | Precio base, vida del regalo, oferta, pausar ventas, costos por venta, meta mensual y datos del negocio.                                                                                                            |
| **Sistema**       | Qué está conectado, qué falta y qué parte del panel necesita qué tabla de la base.                                                                                                                                  |

Atajo: **Ctrl/⌘ K** abre el buscador (secciones, acciones y búsqueda directa de Boxies y clientes).

### Roles

| Rol           | Puede                                                                         |
| ------------- | ----------------------------------------------------------------------------- |
| Dueño         | Todo, incluido el equipo y restablecer la demo.                               |
| Administrador | Todo menos el equipo.                                                         |
| Editor        | Resumen, temáticas, generador, tareas y actividad.                            |
| Soporte       | Resumen, ventas, Boxies (reembolsos, reenvíos), clientes, tareas y actividad. |

El menú muestra solo lo que el rol puede usar, y las acciones lo verifican en el servidor
(`runAction` con `roles`). En la base, solo el dueño escribe en `admin_users` y siempre queda uno.

## Planes

El mismo regalo en niveles de precio (en la demo: Esencial, Clásica y Premium). Un plan tiene precio
(y precio tachado opcional), días online, tope de fotos, si permite clave, beneficios y color.

**Qué pantallas entran en cada plan se decide en cada temática**: cada slide dice desde qué plan se
incluye (`plan` en la configuración) y un plan incluye todo lo de los de abajo. Las de apertura y
cierre van siempre. En el editor de la temática, la pestaña **Planes** es una grilla: un toque en
una celda hace que esa pantalla se incluya desde ese plan. "Reparto sugerido" vuelve al criterio por
defecto (lo esencial en todos, los juegos desde el segundo, lo más elaborado en el último).

En la tienda:

- La ficha de cada temática muestra los planes con lo que incluye cada uno **en esa temática**
  ("14 pantallas · 5 para personalizar · 3 juegos · online 60 días").
- El checkout cobra el precio del plan elegido (lo calcula el servidor) y se puede cambiar ahí; la
  orden guarda el plan.
- El editor y el regalo muestran solo las pantallas del plan comprado; el tope de fotos, la clave y
  los días online salen del plan.
- `/ejemplo/<temática>?plan=<plan>` muestra la Boxie de ejemplo de ese plan.

**Sin planes cargados, todo funciona como antes** (un precio base). Los regalos vendidos no cambian
nunca: cada Boxie apunta a la versión de la temática que se vendió y a su plan.

## Generador

De un nombre ("Día del Padre", "Mascotas", "Egresados 2026") a una temática completa, lista para
revisar y publicar. Vive en `src/slides/generator/`:

1. **Detecta la ocasión** con una biblioteca de 22 arquetipos (amor, casamiento, distancia,
   amistad, cumpleaños, mamá, papá, abuelos, bebé, día del niño, graduación, jubilación, navidad,
   halloween, mascotas, viajes, gamers, fútbol, música, docentes, agradecimiento, ánimo, perdón) y
   una general para lo demás. Cada palabra clave suma su largo: la más específica gana.
2. **Elige paleta y fotos** (fotos de Unsplash verificadas una por una) y la portada que corresponde.
3. **Escribe los textos** de cada slide: bienvenida, dedicatoria, 10 razones, 8 vales de la
   cuponera, trivia de 3 preguntas sobre la ocasión, frases de la fortuna, cierre.
4. **Reparte las slides en los planes** con el criterio por defecto.
5. **Valida** contra el contrato de las slides: si no pasa, es un error del generador (hay un test
   que genera todos los arquetipos en las dos estructuras).

Es determinístico: el mismo nombre da la misma temática; "otra variante" cambia paleta y fotos. El
servidor vuelve a generar al crear (no confía en lo que armó el navegador). Estructura **completa**
(20 pantallas) o **compacta** (12).

Para sumar una ocasión: agregar un arquetipo en `archetypes.ts` (palabras clave, paletas, fotos y
textos; lo que falte sale del arquetipo base) y un caso en `generate.test.ts`.

## Cómo está armado

```
app/admin/login/            login (fuera del marco del panel)
app/admin/(panel)/          las secciones; cada una con su page.tsx, sus componentes y actions.ts
app/admin/_ui/              kit del panel: marco, tarjetas, gráficos, tablas, filtros, avisos
app/admin/_lib/             runAction (sesión + rol + errores + revalidación), filtros, CSV
src/domain/admin/           lógica pura: períodos, métricas, finanzas, entradas validadas (Zod)
src/domain/plans.ts         reglas de los planes
src/slides/plans.ts         planes dentro de una temática (qué pantallas incluye cada uno)
src/slides/generator/       el generador de temáticas
src/server/admin/           sesión, login, contrato de datos (repo.ts) y sus dos implementaciones
proxy.ts                    /admin exige sesión; ADMIN_HOST
```

**El contrato de datos (`AdminRepo`, en `src/server/admin/repo.ts`)** es lo único que las páginas y
las acciones conocen. Tiene dos implementaciones:

- `demo/repo.ts` sobre una base en memoria (`demo/store.ts`) sembrada por `demo/seed.ts`. En
  desarrollo se guarda en `.cache/admin-demo-db.json` (sobrevive a reiniciar); en un deploy vive en
  la memoria de la instancia. El sitio público en demo lee el catálogo de ahí.
- `supabase-repo.ts` sobre la base real, con el service role (cada acción ya validó sesión y rol).

`adminRepo()` elige según `DEMO_MODE`.

Gráficos: SVG propios animados con framer-motion (`_ui/charts.tsx`), paleta de series validada para
daltonismo (`--color-series-1…6`), tooltip, cursor, leyenda y vista de tabla en cada uno.

## Qué necesita la base

La lista viva está en **Sistema** (`app/admin/_lib/capabilities.ts`). Resumen:

| Ya existe en la base                                                                                                                  | Llega con `20260925120000_admin_backoffice.sql`                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `orders`, `payment_events`, `boxies`, `boxie_content`, `coupons`, `themes`, `theme_versions`, `settings`, `affiliates`, `admin_users` | `plans` (+ `orders.plan_id`), `expenses`, `admin_audit_log` (inmutable), `admin_tasks`                                     |
| `admin_kpis()`, `admin_sales_by_day()`, `admin_theme_ranking()`, `admin_coupon_ranking()`, `admin_refund_boxie()`, `publish_theme()`  | `admin_plan_ranking()`, `admin_role()`, vista `admin_boxie_stats`, `lock_boxie()` con días del plan                        |
|                                                                                                                                       | Columnas: rol/nombre/mail del equipo, costos y datos del negocio en `settings`, `themes.origin`, mail y notas de afiliados |

La migración es aditiva (columnas con default, tablas nuevas) y está probada sobre Postgres (PGlite)
en `tests/db/backoffice.test.ts`, RLS incluida.

Pendiente fuera de la base: subir fotos de temáticas a Storage (hoy se cargan por link) y visitas
del sitio (Vercel Web Analytics).

## Conectar Supabase

1. Crear (o liberar) el proyecto y aplicar las migraciones: `npx supabase link --project-ref <ref>`
   y `npx supabase db push` (son 7; la última es `admin_backoffice`).
2. Crear el primer admin: registrar el usuario en _Authentication_ y darle rol de dueño:
   ```sql
   insert into public.admin_users (user_id, email, name, role)
   values ('<uuid del usuario>', 'vos@boxiedigital.com.ar', 'Tu nombre', 'owner');
   ```
3. En Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY` (y los de Mercado Pago y Resend, ver OPERACION.md).
4. Sacar `DEMO_MODE`. El panel pasa solo a `supabase-repo.ts`.
5. Cargar los planes en **Planes** (sin planes, la tienda cobra el precio base) y los gastos fijos en
   **Finanzas**. Revisar **Configuración** (comisión de Mercado Pago, impuestos, meta).

**Checklist de la primera vez con la base real** (el repositorio real está escrito contra los tipos
generados y compila, pero no se pudo correr contra un proyecto de verdad):

- [ ] Login con el admin real; `Equipo` muestra su nombre y rol.
- [ ] `Resumen`, `Finanzas` y `Analítica` cargan (con pocas órdenes, casi en cero).
- [ ] Crear un plan, un cupón y un gasto; editarlos; verlos en `Actividad`.
- [ ] Generar una temática, publicarla y verla en la tienda.
- [ ] Una compra de prueba (sandbox): la orden aparece en `Ventas` con su plan; la Boxie en `Boxies`.
- [ ] Reenviar el mail del editor desde la Boxie (rota el link) y probar el link nuevo.
- [ ] Reembolsar la orden de prueba: el regalo deja de abrirse.

## Pendientes y próximos pasos

- Subir fotos de las temáticas a Storage desde el panel (bucket `theme-media`).
- Métricas de visitas y fuentes (Vercel Web Analytics) en Analítica.
- Mails automáticos de recuperación de compras abandonadas (hoy: un mail listo para mandar a mano).
- Con volumen, pasar la analítica a las funciones SQL (`admin_kpis`, etc.) en vez de traer todas las
  órdenes: el contrato ya lo permite sin tocar las páginas.
