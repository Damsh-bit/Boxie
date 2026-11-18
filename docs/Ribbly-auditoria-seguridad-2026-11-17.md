# Ribbly · Auditoría de seguridad, pagos y venta internacional

**Fecha:** 17/11/2026 · **Alcance:** todo el código en `main` (75b6d6f) más los cambios de esta auditoría.
Sigue a la auditoría del 28/09/2026 (`docs/Boxie-auditoria-seguridad-2026-09-28.md`): acá se
revisó sobre todo lo que se agregó después (portal de clientes `/cuenta`, recuperar clave del panel,
clave del regalo, recordatorios por cron, checkout gratuito) y se rechequeó la pasarela completa.

## Resumen

| #   | Severidad   | Hallazgo                                                                    | Estado                           |
| --- | ----------- | --------------------------------------------------------------------------- | -------------------------------- |
| C1  | **Crítica** | Tomar los regalos de cualquier comprador desde `/cuenta` con `signUp()`     | Corregido en código + **acción** |
| H1  | **Alta**    | Un admin con sesión de Supabase (Google/magic link) saltea clave y 2FA      | Corregido (migración)            |
| H2  | **Alta**    | Restablecer la clave del panel abría sesión sin pedir el 2FA                | Corregido                        |
| M1  | Media       | El tope de usos de los cupones no era atómico (gratis por encima del tope)  | Corregido (migración)            |
| M2  | Media       | El límite de pedidos se podía resetear entero (incluido el login del panel) | Corregido                        |
| M3  | Media       | El cron usaba `TOKEN_ENCRYPTION_KEY` como contraseña                        | Corregido + **acción**           |
| M4  | Media       | `zod` < 4.6.6: agotamiento de memoria al validar colecciones grandes        | Corregido (`npm audit fix`)      |
| L1  | Baja        | `payment_id` sin validar en la URL de la API de Mercado Pago                | Corregido                        |
| L2  | Baja        | Orden gratis con cupón agotado: mandaba a `/editor` sin sesión              | Corregido                        |
| L3  | Baja        | `/cuenta/ribblys/<id>/editar` rotaba el link desde un `<img>` de otro sitio | Corregido                        |
| L4  | Baja        | La pantalla de activación pedía 8 caracteres y el servidor 12               | Corregido                        |

**La pasarela de pago está bien construida.** El precio sale siempre del servidor. `apply_payment` es
atómica e idempotente, bloquea la orden y no entrega nada si el monto o la moneda no coinciden con
lo calculado. El webhook valida la firma HMAC y vuelve a consultar el pago en la API de MP, y el
retorno no le cree a los parámetros de la URL. El proveedor `fake` se rechaza en producción. Lo
que encontré en pagos son bordes (M1, L1, L2), no agujeros en el cobro.

**Lo grave estaba en la autenticación nueva** (C1, H1, H2): el portal de clientes y la recuperación
de clave se sumaron después de la auditoría anterior y abrían caminos alrededor del 2FA y de la
propiedad de los regalos.

---

## 🛑 Acciones que tenés que hacer vos (no se pueden hacer desde el código)

1. **Supabase → Authentication → Sign In / Providers → Email:** activar **"Confirm email"**. Es
   la mitad de C1. Mientras esté apagado, el código nuevo ya bloquea el ataque, pero no hay que
   depender de una sola barrera.
2. **Supabase → Authentication → "Allow new users to sign up":** el checklist dice que lo
   desactivaste (P0.3). Con eso apagado, **un comprador nuevo no puede entrar a `/cuenta`** (el
   magic link y Google fallan con "Signups not allowed"). Si querés el portal, hay que activarlo,
   y con "Confirm email" activado (punto 1) es seguro.
3. **Aplicar la migración** `supabase/migrations/20261117120000_security_hardening.sql` en
   producción (`supabase db push` con el proyecto linkeado). Sin esto, H1 y M1 siguen abiertos.
4. **Vercel → Environment Variables:**
   - `CRON_SECRET`: un valor aleatorio (`openssl rand -base64 32`). **Sin esta variable, los
     recordatorios anuales ahora responden 503** en vez de usar la clave de cifrado. Además no hay
     `vercel.json` con `crons`: revisá con qué se dispara hoy `/api/cron/reminders`.
   - `MP_WEBHOOK_SECRET`: confirmá que está cargada. Sin ella, el webhook acepta avisos sin firma
     (el daño queda acotado porque cada aviso se verifica contra la API de MP, pero cualquiera
     puede hacerte gastar llamadas).
5. **Si algún admin usó alguna vez la clave del panel en Supabase Auth** (se copiaba ahí al
   activar la cuenta): con la migración ya no sirve para nada, pero conviene cambiarla desde
   Supabase → Authentication → Users por una aleatoria.

---

## Hallazgos

### C1 · Crítica · Cualquiera podía tomar los regalos de un comprador desde `/cuenta`

**Qué pasaba.** El portal (`src/server/customer/session.ts`) identificaba al cliente solo por el
mail de su sesión de Supabase. Con ese mail, `getCustomerPortalData` mostraba los links de los regalos
(descifrados) y `getOrRotateEditorUrl` generaba un link de edición nuevo para cualquier Ribbly de una
orden con ese mail. En `supabase/config.toml` estaban `enable_signup = true` y
`enable_confirmations = false`. Si producción está igual, el ataque era:

```js
// En la consola de cualquier navegador, con la clave anon (es pública):
await supabase.auth.signUp({ email: 'compradora@gmail.com', password: 'loquesea123' })
// → sesión inmediata con ese mail → /cuenta muestra sus regalos y su link de edición.
```

No pude verificar la configuración de producción. El checklist dice que los signups están
apagados (P0.3), y en ese caso el ataque no funcionaba, pero tampoco funcionaba el portal para
clientes nuevos (ver Acción 2).

**Qué cambié.** `getCustomerSession` ahora exige un mail confirmado y que la sesión venga de un
método que pruebe que el mail es de quien entra: el claim `amr` del JWT tiene que ser `oauth`,
`magiclink` u `otp` (o confirmación por link). Una sesión con `password` o anónima ya no ve nada. El
portal nunca ofreció login con clave, así que nadie legítimo queda afuera. Además activé
`enable_confirmations` en `config.toml`. Test: `src/server/customer/session.test.ts`.

### H1 · Alta · Admin por la API de Supabase sin clave ni 2FA

**Qué pasaba.** El panel usa su propia cookie (clave + TOTP) y opera con el service role. Pero
la RLS seguía dando permisos de admin a cualquier JWT `authenticated` cuyo usuario estuviera en
`public.users`: `is_admin()` y `admin_role()` solo miraban `auth.uid()`. Los admins existen en
`auth.users` con el mail confirmado (los crea `invite.ts`). Dos caminos:

- **Portal de clientes:** un admin (o quien tenga acceso a su casilla) entra a `/cuenta` con Google o
  magic link, y el JWT que recibe permite leer todas las órdenes (datos personales de todos los
  clientes), crear cupones 100% OFF, cambiar precios y temáticas o, si es el dueño, editar el
  equipo, todo por la API REST con la clave anon.
- **Clave copiada:** `activateMemberAccount` copiaba la clave del panel a Supabase Auth. Con la
  clave alcanzaba `signInWithPassword()` para obtener el mismo JWT sin pasar por el 2FA.

**Qué cambié.** La migración nueva hace que `is_admin()` y `admin_role()` exijan `aal = 'aal2'` en el
JWT, o sea MFA verificado por Supabase Auth, que el panel no usa. En la práctica, los privilegios de
admin por JWT quedan cerrados, y el service role no cambia. También dejé de copiar la clave a
Supabase Auth. Tests: `tests/db/backoffice.test.ts`, "admin por JWT sin MFA de Supabase".

### H2 · Alta · Restablecer la clave salteaba el 2FA

**Qué pasaba.** Después de "¿Olvidaste tu clave?", `/admin/activar` abría una sesión completa del
panel. El 2FA está justamente para que el acceso a la casilla no alcance.

**Qué cambié.** Si la cuenta tiene TOTP activo, después de guardar la clave nueva se manda a
`/admin/login?clave=restablecida`, y ahí se entra con clave y código. Una invitación nueva, sin TOTP,
sigue entrando directo.

### M1 · Media · Tope de cupones no atómico (P2.3 del checklist)

**Qué pasaba.** `evaluateCoupon` mira `used_count` al cotizar, y `apply_payment` sumaba el uso sin
mirar el tope. Varias compras simultáneas, o varias órdenes pendientes pagadas más tarde, pasaban
el límite. Con un cupón 100% OFF de 1 uso, varias pestañas a la vez se llevaban varias Ribblys gratis.

**Qué cambié.** El cupo se toma dentro de `apply_payment` con un
`update … where used_count < max_uses`, en la misma transacción. Una orden **gratis** sin cupo se
cancela (`coupon_exhausted`) y el checkout muestra "Ese cupón ya alcanzó su límite de usos". Una
orden **pagada** se entrega igual, porque el comprador ya pagó, y queda marcada como
`paid_coupon_over_limit` en `payment_events`. Tests en `tests/db/payments.test.ts`.

### M2 · Media · El límite de pedidos se podía resetear entero

Al pasar las 10.000 claves, `rate-limit.ts` borraba todo el mapa. Pedir "recuperar acceso" con miles
de mails distintos reseteaba también el contador de claves erradas del login del panel. Ahora hay
un mapa por espacio de nombres (`admin-login-fail`, `recover`, …), así que llenar uno no toca a los
otros, y al podar se descartan primero las claves vencidas. Sigue siendo un límite por instancia: el
límite global real lo tiene que poner el firewall de Vercel (P1.8).

### M3 · Media · El cron usaba la clave de cifrado como contraseña

`/api/cron/reminders` aceptaba `Bearer <TOKEN_ENCRYPTION_KEY>` si faltaba `CRON_SECRET`. Así, una
clave que protege los links de todos los regalos viajaba en un header, y la comparación no era de
tiempo constante. Ahora exige `CRON_SECRET` (en producción sin ella responde 503) y compara en tiempo
constante.

### M4 · Media · Dependencias

`npm audit fix` subió `zod` a 4.6.7, que era la única vulnerable en runtime y valida todo lo que entra.
Quedan avisos en `@sentry/nextjs` → `@rollup/plugin-commonjs@28.0.1` (picomatch, fdir, glob,
minimatch). Es tooling que corre solo en el build sobre nuestro propio código, sin datos de usuarios:
se resuelve cuando Sentry actualice esa dependencia, y no vale un `--force`.

### L1–L4 · Bajas

- **L1:** `/api/checkout/return` y el webhook pasaban `payment_id` tal cual a
  `api.mercadopago.com/v1/payments/<id>` con nuestro token, así que un `../` le pegaba a otro
  endpoint. Ahora solo se aceptan dígitos (en las rutas y en `getPayment`), y `external_reference`
  tiene que ser un UUID.
- **L2:** una orden gratis que no se entregaba devolvía `/editor` sin sesión. Ahora responde 409
  con el motivo.
- **L3:** la ruta que rota el link del editor desde el portal rechaza las cargas cross-site que no
  son navegación (`<img>`, `fetch`). Un clic desde un mail sigue andando.
- **L4:** la pantalla de activación ahora pide 12 caracteres, igual que el servidor.

---

## Pendientes que no toqué (en orden de prioridad)

1. **CSP (P2.1).** Sigue sin Content-Security-Policy. Es la mejor defensa si algún día entra un XSS.
   Arrancar en `Report-Only`.
2. **Límite global en Vercel Firewall (P1.8).** Hacen falta reglas de rate limit para
   `/api/checkout/*`, `/admin/login`, `/api/mi-ribbly/*` y `/g/*`.
3. **Minimizar datos de pago.** `payment_events.raw` guarda el pago completo de MP (mail, DNI, últimos
   4 dígitos, IP). El portal solo usa el medio de pago y las cuotas. Guardar solo eso (Ley 25.326,
   P3.1).
4. **Vencimiento de la preferencia de MP.** Una orden pendiente se puede pagar meses después al precio
   viejo, porque la preferencia no tiene `expiration_date_to`. Agregar 48 h y probarlo contra MP antes
   de subirlo.
5. **`RECORDAR15`** se crea solo la primera vez que alguien lo escribe: 15% sin tope ni vencimiento
   para quien conozca el código. Si es a propósito, está bien; si no, ponerle `max_uses` o atarlo a
   la cuenta.
6. **Enumeración de admins por tiempo.** "¿Olvidaste tu clave?" tarda más cuando el mail es de un
   admin, porque manda el correo. Es menor, y se arregla con `after()` como en `/mi-ribbly`.
7. **Webhook sin ventana de tiempo.** Se acepta un `ts` viejo. Como todo es idempotente, repetir un
   aviso no hace nada.

## Lo que no pude verificar

- La configuración real de Supabase Auth en producción (confirmación de mail, signups) y si los
  admins tienen clave en `auth.users`.
- Las variables de entorno de Vercel (`MP_WEBHOOK_SECRET`, `CRON_SECRET`).
- Los E2E de Playwright: necesitan Supabase local con Docker. Pasaron typecheck, lint, build y los
  562 tests unitarios y de base (con 8 nuevos).

---

# Venta internacional: cómo cobrarle a alguien de afuera

## Cómo está hoy

El sitio tiene un selector ARS/USD que **solo cambia lo que se muestra**: convierte con el dólar
oficial (DolarApi). Se cobra siempre en pesos por Mercado Pago, y el checkout lo aclara bien. Para un
estadounidense hoy pasa esto:

- Ve "US$ 10", entra a Mercado Pago y le cobran en **pesos argentinos**. Su banco convierte con su
  propio tipo de cambio y casi siempre suma un 3% de "foreign transaction fee", así que paga más de lo
  que vio.
- Mercado Pago Argentina está pensado para tarjetas y cuentas argentinas. No encontré ninguna fuente
  oficial que garantice que acepta tarjetas emitidas afuera, y en la práctica el rechazo es alto. Eso
  es una venta perdida.

## La decisión

**Dos carriles según dónde está el comprador:**

| Comprador         | Cobro                                                  | Moneda                                       |
| ----------------- | ------------------------------------------------------ | -------------------------------------------- |
| Desde Argentina   | **Mercado Pago** (como hoy)                            | ARS, con cuotas, efectivo y dinero en cuenta |
| Desde el exterior | **Un Merchant of Record: Paddle** (alternativa: Polar) | USD, o su moneda local si el MoR la localiza |

**Por qué un Merchant of Record (MoR).** Un MoR es una empresa que le vende al cliente final en tu
nombre: cobra, factura y **liquida el IVA o sales tax de cada país**, y a vos te paga en USD. Si un
europeo compra un producto digital, la ley de la UE dice que el vendedor tiene que cobrarle el IVA de
su país y declararlo. Con un MoR eso deja de ser problema tuyo. Para un emprendimiento argentino de
una persona, es la diferencia entre poder vender afuera o no.

**Por qué Paddle primero:**

- Es el MoR más establecido. Acepta tarjetas internacionales, Apple Pay, Google Pay y PayPal, y
  muestra el precio en la moneda del comprador.
- Trabaja con negocios de cualquier país salvo una lista de sancionados, y **Argentina no está en esa
  lista**.
- Comisión de referencia: 5% + US$0,50 por venta. Sobre un ticket de unos US$10 es cerca del 10%.

**Riesgo honesto:** Paddle se orienta a software y SaaS, y aprueba a mano. Ribbly es una app web, así
que encaja, pero la aprobación no está garantizada. Por eso, en paralelo, conviene aplicar a
**Polar**, que es MoR, paga a Argentina vía Stripe Connect Express (figura explícitamente en su
lista) y tiene comisiones parecidas. Se usa el que apruebe primero.

**Lo que descarté y por qué:**

- **Mercado Pago para extranjeros:** rechaza muchas tarjetas de afuera, cobra en ARS y no resuelve
  impuestos.
- **Stripe directo:** no acepta cuentas argentinas; hace falta una LLC en EE.UU. Es mucho costo fijo
  para esta etapa.
- **PayPal directo:** comisiones altas, retirar fondos en Argentina es engorroso y no resuelve
  impuestos.
- **dLocal Go:** es más barato (alrededor de 3,5% + IVA) y fuerte en medios locales de Latinoamérica
  (Pix, OXXO), pero **no es MoR**: los impuestos de cada país siguen siendo tuyos. Tiene sentido
  más adelante, si Latinoamérica pesa mucho.

## Cómo se arma (cuando tengas la cuenta aprobada)

1. **Precio propio en USD por plan**, no convertido del peso. Conviene un precio redondo pensado para
   ese mercado (por ejemplo US$ 9,99). El peso se mueve y los precios argentinos no tienen por qué ser
   los de afuera. El MoR se encarga de pasarlo a EUR, GBP, MXN, etc.
2. **Elegir el carril:** por defecto según el país de la IP (Vercel manda el header
   `x-vercel-ip-country`), con un selector visible "¿Pagás desde Argentina?" para corregirlo.
3. **Código:** la base ya está preparada. `orders.currency` existe y `apply_payment` ya valida moneda
   y monto. Falta:
   - Columna `price_usd_cents` en `plans` y un precio en USD en el panel.
   - Proveedor `paddle` en `PaymentNotice` y en `payment_provider`.
   - Checkout de Paddle (overlay de Paddle.js) con el `order.id` en `custom_data`.
   - Webhook `/api/webhooks/paddle` que valide la firma `Paddle-Signature` y llame a
     `applyPaymentNotice`. Ojo: con precios con impuesto incluido, hay que comparar contra el
     subtotal sin impuesto.
   - Estimado: 1 a 2 días de trabajo más pruebas en el sandbox de Paddle.
4. **Contador:** con un MoR, tu cliente pasa a ser una sola empresa del exterior. Lo normal es emitir
   una factura de exportación (tipo E) por cada liquidación. Confirmá con tu contador cómo encaja con
   tu categoría y cómo te conviene recibir los dólares.

**Qué necesito de vos para avanzar:** crear la cuenta en Paddle (y en Polar, en paralelo) y pasarme
las credenciales del **sandbox**. Con eso integro el carril internacional y lo pruebo de punta a punta
sin tocar dinero real.

### Fuentes

- [Paddle · países soportados](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle)
- [Polar · países soportados para pagos](https://polar.sh/docs/merchant-of-record/supported-countries)
- [Paddle · pricing 2026 (5% + 50¢)](https://adlega.com/compare/paddle-pricing/)
- [dLocal Go · costos](https://helpcenter.dlocalgo.com/es/articles/9251261-que-costos-tengo-por-vender-con-dlocal-go)
- [Stripe Managed Payments no cubre Argentina](https://www.paddle.com/resources/stripe-managed-payments)
- [Mercado Pago · Checkout Pro](https://www.mercadopago.com.ar/herramientas-para-vender/check-out)
