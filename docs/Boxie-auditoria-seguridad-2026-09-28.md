# Boxie · Auditoría de seguridad antes del lanzamiento

**Fecha:** 28/09/2026 · **Para:** Santiago · **Estado del sitio:** en producción en www.boxiedigital.com.ar (con datos de muestra, sin clientes reales)

> ⚠️ **Documento sensible.** Describe fallas que hoy se pueden explotar. No lo subas al repo
> `Damsh-bit/Boxie` (es público) ni lo compartas por fuera del equipo hasta cerrar las tareas P0.

## Qué se revisó

- **Código completo** (≈500 archivos): checkout y pagos, login y permisos del panel, editor, regalo,
  soporte, mails, exportaciones, subida de fotos, headers.
- **Base de Supabase en vivo** (proyecto `Boxie`, `ca-central-1`): RLS, permisos reales por rol,
  funciones, storage, usuarios de Auth, datos cargados, advisors de seguridad.
- **Vercel** (proyecto `boxie-digital`): variables de entorno (solo nombres y entornos), dominios,
  protección de deploys, firewall.
- **GitHub:** visibilidad de los repos e historial de git buscando secretos.
- **Dependencias:** `npm audit` → **0 vulnerabilidades conocidas**.
- **Sitio en vivo:** headers de seguridad y rutas sensibles (`/api/dev/*`, `/.env`, `/admin`).

## Resumen

La arquitectura está bien pensada: RLS en todas las tablas, tokens de 192 bits guardados solo como
hash, cobro atómico e idempotente que valida monto y moneda, sesión del editor atada al token,
y más (ver "Lo que está bien" al final). **Pero hay un problema crítico que hoy se puede explotar**:
la única cuenta dueña del panel de producción usa las credenciales de demo, que están publicadas en
GitHub. Además faltan piezas que bloquean salir a vender: webhook de Mercado Pago, sesiones del panel
que se puedan revocar, backups, mails y monitoreo.

| Prioridad | Cuándo | Tareas |
| --- | --- | --- |
| **P0** | **Hoy** | 4 |
| **P1** | Antes de abrir la venta | 11 |
| **P2** | Primeras semanas | 10 |
| **P3** | Cumplimiento y operación | 4 |

---

## P0 · Hoy

### [ ] P0-1 · La cuenta dueña del panel usa las credenciales públicas de demo

- **Qué pasa:** el único usuario con rol en `public.users` es `admin@boxie.demo` (rol `owner`), y su
  clave es la que viene por defecto en `scripts/seed.mjs` y `scripts/create-admin.mjs`. Lo confirmé
  comparando el hash de la base. Como el repo es público, cualquiera puede entrar a
  `www.boxiedigital.com.ar/admin/login` como dueño.
- **Qué puede hacer quien entre:** ver y exportar todos los clientes (nombre, mail, teléfono),
  crear cupones del 100 %, cambiar precios, pausar ventas, invitarse como `owner`, marcar reembolsos
  y ver los links de los regalos.
- **Qué hacer:**
  1. Con `.env.local` apuntando a producción, crear un owner real:
     `npm run admin:create <mail-real> <clave-larga> <nombre> owner`. La clave, de un gestor de
     contraseñas y de 16 caracteres o más. Después borrarla del historial de la terminal.
  2. Entrar con esa cuenta y eliminar `admin@boxie.demo` desde **Equipo**.
  3. **Rotar `SESSION_SECRET`** en Vercel (`openssl rand -base64 32`) y redeployar. Es la única forma
     de cortar sesiones abiertas del panel (ver P1-2). Cierra también las sesiones del editor y del
     regalo con clave; hoy no hay clientes reales, así que no cuesta nada.
  4. Sacar los valores por defecto de `scripts/create-admin.mjs`: que exija mail y clave y rechace la
     de demo. Fue así como la clave de demo llegó a producción.
- **Revisar:** en la bitácora (**Actividad**) aparece `zaxloro02@gmail.com` invitando y eliminando
  miembros el 25 y el 26/09, y hoy no figura en el equipo. Confirmar que es de ustedes.

### [ ] P0-2 · Usuarios del seed en Supabase Auth con claves públicas

- **Qué pasa:** en *Authentication → Users* hay 6 cuentas del seed (`admin@`, `socio@`, `soporte@`,
  `contenido@` de `boxie.demo` y 2 de `ejemplo.com`), todas con las claves de `scripts/seed.mjs`.
  `admin@boxie.demo` comparte el `user_id` con el owner de `public.users`. Con la anon key, alguien
  puede loguearse contra la API de Supabase, conseguir un JWT con `is_admin() = true` y leer o
  modificar la base entera por REST sin pasar por la app (incluidos los `password_hash`).
  Hoy la anon key no llega al navegador, lo que hace menos probable el ataque, pero una anon key se
  considera pública.
- **Qué hacer:**
  1. Borrar los 6 usuarios en *Authentication → Users*. Verifiqué que `public.users` no tiene FK
     hacia `auth.users`, así que borrarlos no toca el panel.
  2. *Authentication → Sign In / Providers → Email:* apagar **Allow new users to sign up**.
  3. Cuando esté hecho P1-4 (sacar el fallback a Supabase Auth), apagar el proveedor Email completo.
     El panel ya no usa Supabase Auth.

### [ ] P0-3 · El repo viejo `Damsh-bit/boxiedigital` sigue público con el `.env`

- **Qué pasa:** el `.env` sigue en la raíz del repo, con un `MP_ACCESS_TOKEN` (`APP_USR-…`, 75
  caracteres). La checklist de `docs/OPERACION.md` lo marca como revocado, pero el repo sigue público
  y sin purgar. No probé el token contra Mercado Pago.
- **Qué hacer:** confirmar en Mercado Pago (*Tus integraciones → Credenciales*) que ese token está
  revocado. Después **borrar el repo** o pasarlo a privado y revisar los movimientos de la cuenta.

### [ ] P0-4 · Pasar `Damsh-bit/Boxie` a privado

- **Qué pasa:** además de las credenciales del seed, el repo publica los cupones que están activos
  en producción: `INFLUENCER50` (50 %), `LOQUIEROYA25`, `PAREJA20`, `MAMA15`, `SOFI10`, `BOXIE10`.
  También publica todo el funcionamiento interno del cobro y del panel.
- **Qué hacer:** *GitHub → Settings → Change visibility → Private*. Vercel sigue deployando igual.

---

## P1 · Antes de abrir la venta

### [ ] P1-1 · Webhook de Mercado Pago y conciliación

- **Qué pasa:** el pago solo se confirma cuando el comprador vuelve a `/api/checkout/return`.
  - Si paga y cierra la pestaña, **le cobramos y no recibe nada**.
  - Con medios diferidos (Rapipago, Pago Fácil) queda `pending` para siempre.
  - Los contracargos y reembolsos hechos en MP nunca desactivan el regalo.
  - Hoy hay 29 órdenes `pending` de más de un día (son de muestra, pero muestran el problema).
- **Qué hacer:**
  1. Crear `/api/webhooks/mercadopago`, validar la firma `x-signature` con `MP_WEBHOOK_SECRET` y
     rechazar avisos viejos (`ts`).
  2. Consultar el pago en la API de MP y pasarlo por `applyPaymentNotice` (`source: 'webhook'`),
     que ya es idempotente.
  3. Agregar `notification_url` en la preferencia (`app/api/checkout/preference/route.ts`).
  4. Sumar un cron diario que revise contra MP las órdenes `pending` de más de 1 hora.
  5. Pasar `MP_WEBHOOK_READY` a `true` en `app/admin/_lib/capabilities.ts`.

### [ ] P1-2 · Las sesiones del panel no se pueden revocar

- **Qué pasa:** el rol viaja dentro de la cookie firmada, que dura 12 h o 30 días con "recordarme".
  Ni `proxy.ts`, ni `requireAdminAction` ni las rutas de soporte vuelven a mirar la base. Quitar a
  alguien del equipo o bajarle el rol **no le corta el acceso** hasta que venza la cookie.
  Además, la columna `users.is_active` no se verifica en ningún lado.
- **Qué hacer:** en `getAdminSession` (`src/server/admin/session.ts`) releer `role` e `is_active` y
  una huella de `password_hash`, igual que hace el editor con `fp`. Si no coinciden, no hay sesión.
  Bajar "recordarme" a 7 días.

### [ ] P1-3 · MFA y gestión de claves del panel

- **Qué pasa:** un panel que maneja plata, clientes y reembolsos se protege solo con mail y clave de
  8 caracteres. Tampoco hay forma de cambiar ni recuperar la clave desde el panel.
- **Qué hacer:**
  - TOTP obligatorio para `owner` y `admin`.
  - Pantalla "Cambiar clave" (invalida las sesiones gracias a P1-2).
  - Mínimo de 12 caracteres y chequeo contra claves filtradas.

### [ ] P1-4 · Endurecer el login del panel

Cuatro arreglos, en `src/server/admin/auth.ts`, `src/server/admin/password.ts` e
`src/server/admin/invite.ts`:

- [ ] **Comodines en el mail:** el login busca con `.ilike('email', email)`, así que `%` y `_` son
  comodines (`admin%` encuentra la cuenta). Eso permite **evadir el límite de intentos por mail**
  cambiando el patrón en cada intento, y la sesión guarda el patrón en lugar del mail real.
  Usar `exactIlike()` (ya existe en `src/server/recovery.ts`) o comparar con `lower(email)`.
  Lo mismo en `invite.ts`.
- [ ] **Clave en texto plano:** `verifyPassword` acepta claves en texto plano ("por si se carga a
  mano en Supabase") y las compara sin tiempo constante. Sacarlo.
- [ ] **Fallback a Supabase Auth:** sacar el fallback de `authenticateUser` (líneas 123 a 156) y la
  sincronización con `auth.admin` de `invite.ts`. Después, apagar el proveedor (P0-2).
- [ ] **Actor en la bitácora:** que el login use el mail de la base, no el que tipeó la persona.

### [ ] P1-5 · Límites de pedidos que funcionen de verdad

- **Qué pasa:** todos los límites (login, checkout, cupones, clave del regalo, soporte) viven en la
  memoria de cada instancia de Vercel. Con varias instancias no suman entre sí, y el mapa se vacía
  entero al llegar a 10.000 claves. En Vercel no hay ninguna regla de firewall configurada.
- **Qué hacer:** reglas de rate limit en *Vercel Firewall* para `/admin/login`, `/admin/activar`,
  `/api/*`, `/editor/*`, `/g/*` y `/soporte/*`, o migrar `rate-limit.ts` a Upstash o Vercel KV.

### [ ] P1-6 · Monitoreo de errores

- **Qué pasa:** `log.ts` reporta a Sentry, pero **nada llama a `Sentry.init`** (no hay
  `instrumentation.ts`; `SENTRY_READY = false`). Si falla un cobro, nadie se entera.
- **Qué hacer:**
  - Sumar `instrumentation.ts` y `NEXT_PUBLIC_SENTRY_DSN`.
  - Filtrar datos personales antes de enviar (`beforeSend`).
  - Configurar alertas por mail para los errores de pagos.

### [ ] P1-7 · Backups de la base

- **Qué pasa:** la organización de Supabase está en el **plan Free**: no hay backups restaurables ni
  PITR, y el proyecto se pausa si no tiene actividad.
- **Qué hacer:** pasar a **Pro** antes de cobrar plata real y evaluar PITR. Probar una restauración
  una vez.

### [ ] P1-8 · Limpiar los datos de muestra de producción

- **Qué hay:** 82 órdenes (45 pagas), 47 Boxies, tickets de soporte, 63 filas de bitácora y gastos
  del seed.
- **Cupones activos:** los 6 del seed, cuatro de ellos sin tope de usos (`PAREJA20`, `LOQUIEROYA25`,
  `BOXIE10`, `MAMA15`).
- **Qué hacer:** borrar todo antes de abrir y crear los cupones reales con tope y vencimiento, con
  códigos que no estén en el repo.

### [ ] P1-9 · Mails transaccionales

- **Qué pasa:** `RESEND_API_KEY` no está en producción, así que **no sale ningún mail**: ni el link
  del editor, ni el del regalo, ni invitaciones, ni soporte, ni recuperar acceso.
- **Qué hacer:**
  - Cargar la key.
  - Verificar el dominio con **SPF, DKIM y DMARC** (`p=quarantine` como mínimo). DMARC también evita
    que usen `boxiedigital.com.ar` para mandar phishing con nuestra marca.
  - Definir `MAIL_FROM` y `MAIL_REPLY_TO`.

### [ ] P1-10 · Panel en su propio subdominio

- **Qué pasa:** `ADMIN_HOST` no está definido: `/admin/login` responde en el dominio público.
- **Qué hacer:** crear `admin.boxiedigital.com.ar` y definir `ADMIN_HOST` (el código ya lo soporta).
  Opcional: regla de firewall por IP o país para ese host.

### [ ] P1-11 · Alinear el historial de migraciones

- **Qué pasa:** como dice `docs/OPERACION.md`, el historial de `supabase_migrations` de producción no
  coincide con el repo y un `db push` fallaría a mitad de camino.
- **Qué hacer:** hacer el `migration repair` documentado antes de la próxima migración y volver a
  correr los Advisors después de cada una.

---

## P2 · Primeras semanas

### [ ] P2-1 · Content-Security-Policy

- **Qué pasa:** no hay CSP (el resto de los headers está bien: HSTS, `X-Frame-Options`, `nosniff`).
- **Qué hacer:** empezar en modo `Report-Only` con nonces de Next. Permitir YouTube, el píxel de
  Meta, el storage de Supabase e Unsplash. Pasar a modo bloqueo cuando no haya reportes.

### [ ] P2-2 · Defensa en profundidad en la base

- **Qué pasa:** `anon` tiene permiso de SELECT e INSERT sobre `orders`, `payment_events`, `users`,
  `coupons`, `boxie_content`, `media_assets`, `settings` y otras, y lo único que lo frena es RLS.
  Además, `authenticated` puede leer `users.password_hash` y `users.invite_token_hash`.
- **Qué hacer:** una migración que:
  - Haga `revoke all ... from anon` en todas las tablas que no son del catálogo público.
  - Revoque esas dos columnas a `authenticated`, como ya se hizo con los tokens de `boxies`.
  - Revoque `execute` de `is_admin()` a `anon` (advisor de Supabase).

### [ ] P2-3 · Tope real de los cupones

- **Qué pasa:** `max_uses` se revisa al cotizar, pero `apply_payment` incrementa `used_count` sin
  tope. Con varias órdenes pendientes a la vez, un cupón de 150 usos se puede usar más veces.
- **Qué hacer:** en `apply_payment`, hacer el `update ... where used_count < max_uses` y registrar
  un outcome `coupon_exhausted` para revisar a mano.

### [ ] P2-4 · Validar el retorno de Mercado Pago

- **Qué pasa:** en `/api/checkout/return`, `payment_id` sale de la URL y se pega en la ruta de la API
  de MP sin validar, con nuestro token. Además, los errores de MP se loguean con el cuerpo completo,
  que puede traer datos del pagador.
- **Qué hacer:** exigir que `payment_id` coincida con `^\d+$` y loguear solo el status y el código
  de error.

### [ ] P2-5 · Mínimo privilegio en el panel

- **Qué pasa:** el rol `support` puede exportar el CSV completo de clientes y de ventas y marcar
  reembolsos (`refundOrder` usa `SUPPORT_ROLES`). Las exportaciones no quedan en la bitácora.
- **Qué hacer:** restringir exportar y reembolsar a `owner` y `admin`, y registrar cada exportación
  en `admin_audit_log`.

### [ ] P2-6 · Un secreto por propósito

- **Qué pasa:** `SESSION_SECRET` firma las cookies del panel, del editor, del regalo y del checkout.
- **Qué hacer:** usar `ADMIN_SESSION_SECRET` aparte, o derivar una clave por propósito con HKDF.
  Así, rotar el del panel no cierra los editores de los clientes.

### [ ] P2-7 · Abuso de formularios públicos

Tres casos, todos con límites que hoy solo viven en memoria:

- **Soporte:** crear un ticket manda un mail a *cualquier* dirección, así que se puede usar para
  mandar spam con nuestra marca.
- **Contacto:** el mismo riesgo de abuso.
- **Recuperar acceso** (`/mi-boxie`): cada pedido **rota el link de edición**. Alguien que conoce el
  mail de un comprador le puede cerrar la sesión del editor una y otra vez.

**Qué hacer:** Cloudflare Turnstile en los tres formularios y no rotar el link si el último envío
fue hace menos de 15 minutos.

### [ ] P2-8 · El panel lee las órdenes sin paginar

- **Qué pasa:** `dataset()` (`src/server/admin/supabase-repo.ts`) hace `select('*')` sobre `orders`
  sin paginar. A partir de 1000 órdenes (`max_rows`), el panel, Finanzas y los CSV **quedan
  truncados sin avisar**.
- **Qué hacer:** paginar como ya se hizo en Marketing (commit `12574f8`).

### [ ] P2-9 · GitHub y CI

- Protección de `main`: PR y CI en verde obligatorios. Hoy los dos pushean directo a `main`, que
  deploya a producción.
- Activar Dependabot, *secret scanning* y *push protection*.
- Sumar `npm audit --omit=dev` al CI.
- Fijar las GitHub Actions por SHA y `supabase/setup-cli` a una versión fija (hoy es `latest`).

### [ ] P2-10 · Procedimiento de soporte contra ingeniería social

- **Qué pasa:** cualquiera puede abrir un ticket con el código de una Boxie ajena y el panel lo
  vincula a esa orden.
- **Qué hacer:** antes de reenviar links o cambiar datos, el agente verifica que el mail del ticket
  sea el del comprador. Dejarlo escrito en `docs/ADMIN.md`.

---

## P3 · Cumplimiento y operación

### [ ] P3-1 · Datos personales (Ley 25.326)

- Inscribir la base en el Registro Nacional de Bases de Datos (AAIP).
- Tener un proceso para pedidos de acceso y borrado.
- Definir cuánto se guardan las órdenes abandonadas y los tickets (hoy, para siempre) y sumar un job
  de purga.
- Antes de prender el píxel y la API de conversiones de Meta, actualizar la Política de Privacidad
  (ya lo advierte `.env.example`).

### [ ] P3-2 · Inventario de secretos y plan de incidentes

Escribir, para cada secreto, cómo se rota: MP, service role, `SESSION_SECRET`,
`TOKEN_ENCRYPTION_KEY` (rotarla requiere re-cifrar los links) y Resend. Sumar quién hace qué si hay
una filtración.

### [ ] P3-3 · Revisión externa

Un pentest corto antes de escalar la pauta, y revisar los Advisors de Supabase en cada migración.

### [ ] P3-4 · Parámetros de hash

Subir scrypt a `N = 2^17` para las claves del panel (recomendación de OWASP). Los hashes viejos se
migran solos al próximo login con `needsRehash`.

---

## Lo que está bien (no romperlo)

- RLS en todas las tablas. Los tokens de `boxies` y `support_tickets` no se exponen ni al panel.
- Los tokens del regalo, del editor y de soporte tienen 192 bits y en la base solo está su SHA-256.
  El link del regalo se guarda cifrado con AES-256-GCM y la clave vive fuera de la base.
- `apply_payment` es atómica e idempotente, valida monto y moneda, y detecta pagos dobles.
- El precio se calcula siempre en el servidor. El proveedor `fake` se rechaza en producción y
  `/api/dev/boxies` responde 404 en vivo (verificado).
- La sesión del editor está atada a la huella del token: rotar el link invalida las sesiones viejas.
- Las fotos se validan por sus primeros bytes, van a un bucket privado con URLs firmadas y tienen
  tope por Boxie en la base.
- El contenido del comprador se valida contra el esquema de cada slide. Los links exigen `https://`
  y no hay HTML crudo; el JSON-LD está escapado.
- Todas las Server Actions del panel verifican sesión y rol (revisé una por una).
- El CSV está protegido contra inyección de fórmulas y los mails escapan HTML.
- Headers: HSTS con preload, `X-Frame-Options: DENY` y `nosniff`. Las rutas con token llevan
  `no-referrer`, `noindex` y `no-store`.
- Los deploys de preview corren en modo demo, sin secretos de producción y con protección SSO de
  Vercel.
- El historial de git de `Damsh-bit/Boxie` no tiene secretos y `npm audit` da 0 vulnerabilidades.

## Lo que no se pudo verificar

- **GitHub:** no revisé la protección de ramas, porque no hay `gh` instalado en esta máquina.
- **Supabase Auth:** no pude leer por API si el registro está abierto. Revisarlo en el dashboard
  (P0-2).
- **Token de Mercado Pago del repo viejo:** no lo probé contra MP a propósito (P0-3).
