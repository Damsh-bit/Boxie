# Ribbly · Auditoría de seguridad (documento vivo)

**Última actualización:** 18/11/2026 · **Auditorías:** 28/09/2026 (`docs/Boxie-auditoria-seguridad-2026-09-28.md`),
17/11 y 18/11/2026 (este documento). Checklist operativo: `docs/CHECKLIST-SEGURIDAD.md`.

## Estado en una línea

**La pasarela de pago es sólida y está probada; el sitio quedó endurecido.** Lo que falta para cerrar
del todo son **acciones fuera del código** (Supabase, Vercel, GitHub) que solo puede hacer el dueño.

## 🛑 Lo que tenés que hacer vos

| #   | Dónde         | Acción                                                                                                        | Por qué                                                                        |
| --- | ------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | Supabase      | ~~"Confirm email" y "Allow new users to sign up" activados~~ ✅ **Hecho 18/11**                               | C1                                                                             |
| 2   | Supabase      | Aplicar `supabase/migrations/20261117120000_security_hardening.sql` (`supabase db push`)                      | **Sin esto H1 y M1 siguen abiertos en producción**                             |
| 3   | Vercel        | Cargar `CRON_SECRET`; confirmar `MP_WEBHOOK_SECRET` y `NEXT_PUBLIC_SENTRY_DSN`; redeploy                      | Sin `CRON_SECRET` los recordatorios responden 503; Sentry recién ahora reporta |
| 4   | Vercel        | Firewall → Rate Limiting con las reglas de P1.8 del checklist                                                 | El límite del código es por instancia                                          |
| 5   | MP + Supabase | Crear vendedor/comprador **de prueba** en Mercado Pago y un proyecto Supabase de desarrollo para `.env.local` | Hoy `.env.local` es producción (ver D1)                                        |
| 6   | GitHub        | Settings → Code security: Secret scanning + Push protection + Dependabot alerts                               | Detecta secretos commiteados y dependencias vulnerables                        |
| 7   | Sentry        | Alerta por mail para errores que mencionen "webhook" o "Mercado Pago"                                         | Una venta cobrada sin regalo tiene que avisar                                  |

---

## Pasarela de pago: cómo está y cómo se probó

**Diseño (bien):** el precio sale siempre del servidor. `apply_payment` es atómica e idempotente: bloquea la orden y
no entrega nada si monto o moneda no coinciden, y ahora toma el cupo del cupón en la misma transacción. El webhook valida la firma
HMAC y vuelve a consultar el pago en la API de MP. El retorno no le cree a la URL. El proveedor `fake` se
rechaza en producción.

**Pruebas automáticas (corren con `npm test`):**

- `tests/unit/payment-routes.test.ts`: **30 casos** con los handlers reales de `/api/checkout/preference`,
  `/api/checkout/return` y `/api/webhooks/mercadopago`. Cubre firma válida, firma de otro secreto, sin firma, firma
  de un pago con el cuerpo cambiado a otro, ids no numéricos, pagos sin referencia, montos con
  centavos, pago de otra orden, status falso en la URL, pendiente, rechazado, duplicado, orden gratis,
  cupón agotado, precio enviado por el navegador (se ignora), ventas pausadas, límite por IP y errores de MP
  sin filtrar detalles.
- `tests/db/payments.test.ts`: `apply_payment` contra Postgres real (PGlite) con todas las migraciones. Cubre
  idempotencia, monto/moneda distintos, pago doble, reembolso, tope atómico de cupón (orden gratis sin
  cupo no se entrega; pagada sí, marcada) y que la clave pública no la puede llamar.
- **API real de MP (18/11):** se validó que MP acepta la preferencia nueva (vencimiento,
  `statement_descriptor`, ítem con id/categoría). Fue una preferencia de $1 sin webhook, que vence sola.

**Lo que no se pudo probar de punta a punta:** un pago real completo (tarjeta → webhook → mail). Hoy
solo hay credenciales de producción, así que hacerlo cobra de verdad. Con la acción 5 se puede correr
el flujo completo con tarjetas de prueba (`docs/CHECKOUT_Y_PAGOS.md`).

---

## Hallazgos resueltos

| #   | Sev.        | Hallazgo                                                                                                        | Cómo se cerró                                                                                         | Fecha |
| --- | ----------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----- |
| C1  | **Crítica** | `/cuenta`: con `signUp()` y el mail de un comprador se veían y editaban sus regalos                             | Solo sesiones Google/magic link/OTP con mail confirmado (claim `amr`) + "Confirm email" en Supabase   | 17/11 |
| H1  | **Alta**    | Un admin con sesión de Supabase (Google, magic link o la clave copiada) tenía acceso de admin a la base sin 2FA | `is_admin()`/`admin_role()` exigen `aal2`; la clave ya no se copia a Supabase Auth (**falta migrar**) | 17/11 |
| H2  | **Alta**    | Restablecer la clave del panel abría sesión sin 2FA                                                             | Con TOTP activo, vuelve al login (clave + código)                                                     | 17/11 |
| M1  | Media       | Tope de cupones no atómico (gratis por encima del tope)                                                         | Cupo tomado en `apply_payment` (**falta migrar**)                                                     | 17/11 |
| M2  | Media       | El límite de pedidos se reseteaba entero (incluido el login del panel)                                          | Un mapa por espacio de nombres, poda de claves vencidas                                               | 17/11 |
| M3  | Media       | El cron usaba `TOKEN_ENCRYPTION_KEY` como contraseña                                                            | Exige `CRON_SECRET`, comparación en tiempo constante                                                  | 17/11 |
| M4  | Media       | `zod` < 4.6.6 (agotamiento de memoria)                                                                          | `zod` 4.6.7                                                                                           | 17/11 |
| M5  | Media       | **Sin CSP**: un XSS habría corrido sin freno                                                                    | CSP con nonce + `strict-dynamic` en `proxy.ts`, probada página por página                             | 18/11 |
| M6  | Media       | **Sentry nunca se inicializaba**: los errores de pago no avisaban a nadie                                       | `instrumentation.ts` + limpieza de mails/tokens/cookies                                               | 18/11 |
| M7  | Media       | Soporte podía exportar todos los clientes y reembolsar (dar de baja regalos)                                    | Solo dueño y administración; exportaciones logueadas                                                  | 18/11 |
| M8  | Media       | Fechas especiales sin tope: miles de fechas en `user_metadata` → miles de mails del cron                        | Máx. 30 fechas, 3 mails por usuario y corrida, solo mails confirmados, cron paginado                  | 18/11 |
| L1  | Baja        | `payment_id` sin validar en la URL de la API de MP                                                              | Solo dígitos (rutas y `getPayment`); referencia = UUID                                                | 17/11 |
| L2  | Baja        | Orden gratis con cupón agotado mandaba a `/editor` sin sesión                                                   | 409 con el motivo                                                                                     | 17/11 |
| L3  | Baja        | Rotar el link del editor desde un `<img>` de otro sitio                                                         | Bloqueo de cargas cross-site que no son navegación                                                    | 17/11 |
| L4  | Baja        | Activación pedía 8 caracteres, el servidor 12                                                                   | 12 en ambos                                                                                           | 17/11 |
| L5  | Baja        | `payment_events.raw` guardaba el pago completo (DNI, mail, IP)                                                  | Solo un resumen (medio de pago, cuotas, últimos 4)                                                    | 18/11 |
| L6  | Baja        | Una orden pendiente se podía pagar meses después al precio viejo                                                | Preferencia vence a las 48 h                                                                          | 18/11 |
| L7  | Baja        | Sin descriptor en el resumen de tarjeta (más contracargos por "no reconozco")                                   | `statement_descriptor: RIBBLY`                                                                        | 18/11 |
| L8  | Baja        | Llamadas a MP sin timeout                                                                                       | 10 s                                                                                                  | 18/11 |
| L9  | Baja        | "Recuperar acceso" permitía invalidar el link de otro una y otra vez                                            | No rota un link mandado hace < 15 min                                                                 | 18/11 |
| L10 | Baja        | "¿Olvidaste tu clave?" tardaba más con mails de admins (enumeración)                                            | Envío en segundo plano, respuesta igual                                                               | 18/11 |
| L11 | Baja        | Webhook sin `MP_WEBHOOK_SECRET` en producción pasaba en silencio                                                | Ahora es error (llega a Sentry)                                                                       | 18/11 |

## Hallazgos abiertos

| #   | Sev.                 | Hallazgo                                                                                                                                               | Qué hacer                                                                |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| D1  | **Alta** (operativa) | `.env.local` usa la base de producción y el token real de MP. Una prueba en local cobra de verdad, y una laptop comprometida = producción comprometida | Acción 5                                                                 |
| O1  | Media                | Límite de pedidos por instancia, no global                                                                                                             | Acción 4                                                                 |
| O2  | Baja                 | Cupones con códigos adivinables (`RIBBLY10`, `PAREJA20`): el tanteo está limitado por IP, pero con muchas IPs se pueden encontrar                      | Para cupones de valor alto, códigos largos y con `max_uses`              |
| O3  | Baja                 | `RECORDAR15` se crea solo y vale para cualquiera que conozca el código (15%, sin tope)                                                                 | Decisión comercial; si no es a propósito, ponerle `max_uses`             |
| O4  | Baja                 | Tooling de build de Sentry con avisos de `npm audit` (`@rollup/plugin-commonjs` 28.0.1)                                                                | Se va con la próxima versión de `@sentry/nextjs`; corre solo en el build |
| O5  | Baja                 | Sin captcha en formularios públicos (contacto, soporte, `/mi-ribbly`); hay honeypot y límite por IP                                                    | Cloudflare Turnstile si aparece abuso (P2.6)                             |

## Riesgos aceptados (decisión tomada, con motivo)

- **Webhook sin ventana de tiempo para `ts`:** no se sabe si MP reutiliza el `ts` al reintentar, y un límite rompería los reintentos. Repetir un aviso no hace nada (idempotente).
- **scrypt N=2^14 en claves del panel:** ver P3.3 del checklist.
- **Un solo `SESSION_SECRET` para todas las cookies:** cada cookie lleva su propósito firmado, así que una no sirve por otra. Separar claves derivadas del mismo secreto no achica el daño si se filtra.
- **`SameSite=Lax` en la cookie del panel:** las acciones son POST (Lax ya las bloquea desde otro sitio) y `Strict` rompería los links al panel desde el mail.

## Lo que está bien (no romperlo)

- RLS en todas las tablas. Los tokens del regalo, del editor y de soporte tienen 192 bits; en la base solo está su
  SHA-256, y el link del regalo está cifrado con AES-256-GCM y una clave fuera de la base.
- Todas las Server Actions del panel pasan por `runAction` con rol (revisado una por una el 18/11).
- Sin HTML crudo (el JSON-LD está escapado). Las URLs del comprador exigen `https://`. Fotos validadas por
  sus bytes, bucket privado con URLs firmadas.
- Headers: HSTS preload, `X-Frame-Options: DENY`, `nosniff`, CSP con nonce. Las rutas con token llevan `no-referrer`,
  `noindex` y `no-store`. Cookies `httpOnly`, `secure`, `SameSite=Lax` y con el path acotado.
- Panel: 2FA TOTP, revocación inmediata de sesiones y límite de intentos fallidos.

## Fuera de seguridad, encontrado de paso

- **Error de hidratación en la home** (React #418, también en producción): una parte del HTML del servidor no
  coincide con el del navegador, así que React re-renderiza en el cliente. No es de seguridad, pero hace la
  carga más lenta. Pendiente de revisar.

## Pagos internacionales

Postergado a propósito: por ahora se cobra solo en ARS con Mercado Pago. Se retoma cuando lo de seguridad esté
cerrado, con información actualizada sobre opciones sin LLC, gratuitas o de comisión baja.
