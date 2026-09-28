# Boxie · Checklist de Seguridad y Plan de Acción

**Documento operativo de seguimiento.**  
Derivado de la auditoría de seguridad del 28/09/2026 (`docs/Boxie-auditoria-seguridad-2026-09-28.md`).

---

## 🚨 FASE 0 · URGENTE (Resolver Hoy)

> **Objetivo:** Eliminar accesos públicos no autorizados y proteger las credenciales expuestas en repositorios públicos.

- [ ] **P0.1 · Crear cuenta Owner real y borrar usuario demo**
  - **Dónde:** Terminal local y Panel Web (`/admin`).
  - **Acción:**
    1. Ejecutar con `.env.local` apuntando a producción:
       ```bash
       npm run admin:create <tu-mail-real> <clave-segura-16+-caracteres> <TuNombre> owner
       ```
    2. Ingresar a `https://www.boxiedigital.com.ar/admin` con esa cuenta.
    3. Ir a **Equipo** y eliminar definitivamente al usuario `admin@boxie.demo`.
  - **Verificación adicional:** Confirmar si el mail `zaxloro02@gmail.com` (que figura en la bitácora histórica de actividad) es legítimo del equipo.

- [ ] **P0.2 · Rotar `SESSION_SECRET` en Vercel**
  - **Dónde:** Dashboard de Vercel (*Settings → Environment Variables*).
  - **Acción:**
    1. Generar una nueva clave aleatoria de 32 bytes:
       ```bash
       openssl rand -base64 32
       ```
    2. Actualizar el valor de `SESSION_SECRET` en producción.
    3. Hacer redeploy en Vercel para invalidar cualquier sesión activa previa en el panel, editor o regalos.

- [ ] **P0.3 · Limpiar usuarios de prueba en Supabase Auth**
  - **Dónde:** Dashboard de Supabase (*Authentication → Users*).
  - **Acción:**
    1. Borrar los 6 usuarios de prueba del seed (`admin@boxie.demo`, `socio@boxie.demo`, etc.). *Nota: `public.users` no depende de estas cuentas.*
    2. En *Authentication → Sign In / Providers → Email*, desactivar la opción **"Allow new users to sign up"**.

- [ ] **P0.4 · Pasar repositorios a Privados y revocar token MP**
  - **Dónde:** GitHub y Mercado Pago Developers.
  - **Acción:**
    1. En Mercado Pago Developers (*Tus integraciones → Credenciales*), confirmar que el token que estaba en el repo viejo esté revocado.
    2. Borrar o pasar a privado el repo anterior `Damsh-bit/boxiedigital`.
    3. Pasar el repo actual `Damsh-bit/Boxie` a **Private** (*Settings → Danger Zone → Change visibility*). Vercel seguirá desplegando sin problemas.

- [ ] **P0.5 · Blindar script de creación de administradores**
  - **Dónde:** Código fuente (`scripts/create-admin.mjs`).
  - **Acción:** Quitar los valores por defecto (`admin@boxie.demo` / `boxie-admin`) para obligar a pasar mail y clave explícitos y rechazar contraseñas de demo.

---

## 🛑 FASE 1 · BLOQUEANTES (Antes de Abrir Ventas)

> **Objetivo:** Garantizar cobros automáticos, entrega de Boxies sin fallas y control real de acceso.

- [ ] **P1.1 · Webhook de Mercado Pago y Conciliación Automática**
  - **Dónde:** Código (`app/api/webhooks/mercadopago/route.ts`) y MP Developers.
  - **Acción:**
    1. Implementar la ruta de webhook validando el encabezado `x-signature` con `MP_WEBHOOK_SECRET`.
    2. Consultar el estado del pago en la API de Mercado Pago y procesarlo con `applyPaymentNotice({ source: 'webhook' })`.
    3. Añadir `notification_url` a las preferencias generadas en `app/api/checkout/preference/route.ts`.
    4. Crear un cron diario que concilie órdenes `pending` de más de 1 hora.

- [ ] **P1.2 · Revocación activa de sesiones del Panel**
  - **Dónde:** Código (`src/server/admin/session.ts` y `src/server/admin/token.ts`).
  - **Acción:** Releer `role`, `is_active` y la huella del hash de contraseña (`fp`) desde la base de datos en `getAdminSession` para que si se baja o elimina un miembro del equipo, su acceso se corte de inmediato. Reducir la opción "recordarme" a un máximo de 7 días.

- [ ] **P1.3 · Endurecer Login del Panel**
  - **Dónde:** Código (`src/server/admin/auth.ts`, `invite.ts`, `password.ts`).
  - **Acción:**
    1. Evitar comodines SQL en el mail (`%` o `_`) usando `exactIlike()` para impedir el bypass de rate limits por mail.
    2. Eliminar la comparación de contraseñas en texto plano de `verifyPassword`.
    3. Quitar el fallback a Supabase Auth en `authenticateUser`.
    4. Registrar en la bitácora el mail real obtenido de la base de datos y no el tipeado.

- [ ] **P1.4 · Gestión de Claves y 2FA (TOTP)**
  - **Dónde:** Código, base de datos Supabase y Vercel.
  - **Acción:**
    - [x] **2FA (TOTP) Implementado y Blindado:**
      - Módulo `src/server/admin/totp.ts` y tokens efímeros firmados (`admin_2fa_pending`, 5 min).
      - Cifrado en reposo AES-256-GCM (`totp_secret_enc`, `totp_enabled`, `totp_backup_codes`) con `TOKEN_ENCRYPTION_KEY`.
      - 8 códigos de respaldo de un solo uso hasheados con SHA-256 (burn-on-use).
      - Tolerancia temporal ampliada a ±90s (`epochTolerance: 90`) para evitar rechazos por diferencias de reloj entre celulares y servidores.
      - Retención de `preAuthToken` en reintentos fallidos en `LoginScreen.tsx`.
      - Pantalla `/admin/seguridad` en el panel y segundo factor en `/admin/login`.
      - Migración `supabase/migrations/20260928130000_admin_2fa.sql` aplicada.
      - Suite de tests automatizados (`src/server/admin/totp.test.ts`) validada.
      - ⚠️ **Configuración en Vercel:** `TOKEN_ENCRYPTION_KEY` debe estar cargada en Vercel (*Settings → Environment Variables*) con el mismo valor que `.env.local` para que producción pueda descifrar los secretos de la base.
    - [ ] Agregar pantalla para "Cambiar Contraseña" en `/admin/seguridad`.
    - [ ] Exigir contraseñas de mínimo 12 caracteres.

- [ ] **P1.5 · Configurar envío de Mails en Producción (Resend)**
  - **Dónde:** Vercel y Proveedor DNS del dominio.
  - **Acción:**
    - [x] `RESEND_API_KEY` configurada en `.env.local` y Vercel.
    - [x] Verificado dominio temporal de envío: `cabrown.com.ar` (remitente activo: `MAIL_FROM="Boxie <hola@cabrown.com.ar>"`).
    - [ ] Configurar en el DNS de `boxiedigital.com.ar` los registros **SPF, DKIM y DMARC** (`p=quarantine`) para poder enviar desde `@boxiedigital.com.ar`.
    - [ ] Validar `MAIL_FROM` definitivo a `Boxie <hola@boxiedigital.com.ar>` y `MAIL_REPLY_TO`.

- [ ] **P1.6 · Limpiar datos de muestra y regenerar cupones comerciales**
  - **Dónde:** Base de datos de producción (Supabase).
  - **Acción:**
    1. Purgar las 82 órdenes y 47 Boxies de muestra generadas por el seed.
    2. Crear los cupones comerciales reales con códigos secretos, límites de usos (`max_uses`) y fechas de vencimiento.

- [ ] **P1.7 · Activar Monitoreo con Sentry**
  - **Dónde:** Código (`instrumentation.ts`) y Vercel.
  - **Acción:** Inicializar Sentry, configurar `NEXT_PUBLIC_SENTRY_DSN`, filtrar datos personales sensibles en `beforeSend` y configurar alertas por correo ante fallos en cobros.

- [ ] **P1.8 · Rate Limiting Global / Distribuido**
  - **Dónde:** Vercel Firewall o Upstash Redis.
  - **Acción:** Evitar que los límites de tasa se reinicien entre distintas funciones o contenedores serverless en `/admin/login`, `/api/checkout/*`, `/g/*`, `/editor/*` y `/soporte/*`.

- [ ] **P1.9 · Backups en Supabase**
  - **Dónde:** Dashboard de Supabase.
  - **Acción:** Pasar al plan **Pro** antes de operar con dinero real para habilitar respaldos diarios restaurables y evitar que el proyecto se pause por inactividad.

- [ ] **P1.10 · Subdominio exclusivo del Panel**
  - **Dónde:** DNS y Vercel.
  - **Acción:** Configurar `admin.boxiedigital.com.ar` y activar la variable `ADMIN_HOST` para que el panel no responda en la raíz del sitio público.

- [ ] **P1.11 · Alinear Historial de Migraciones**
  - **Dónde:** Supabase CLI.
  - **Acción:** Ejecutar `supabase migration repair` contra producción para alinear la tabla `supabase_migrations` con los archivos locales del repositorio.

---

## ⏳ FASE 2 · ENDURECIMIENTO (Primeras Semanas)

> **Objetivo:** Blindaje contra ataques avanzados y optimización para escalar.

- [ ] **P2.1 · Content Security Policy (CSP)**
  - Configurar encabezados CSP en `next.config.ts` (arrancar en modo `Report-Only` y luego pasar a bloqueo), permitiendo únicamente Mercado Pago, Meta Pixel, Supabase Storage, Sentry y YouTube.
- [ ] **P2.2 · Permisos estrictos en DB (Defensa en Profundidad)**
  - Migración SQL para revocar permisos de `SELECT` e `INSERT` directos al rol `anon` en tablas que no pertenezcan al catálogo público, y revocar lectura de columnas de hash de claves al rol `authenticated`.
- [ ] **P2.3 · Control atómico de topes de cupones**
  - En `apply_payment`, verificar `used_count < max_uses` de forma atómica para evitar carreras concurrentes en cupones de cupo limitado.
- [ ] **P2.4 · Sanitización de retorno de Mercado Pago**
  - Validar que `payment_id` en `/api/checkout/return` cumpla con el formato `^\d+$` y loguear solo códigos de error sin volcar datos personales del pagador.
- [ ] **P2.5 · Principio de mínimo privilegio en el Panel**
  - Restringir la exportación de clientes y la marcación de reembolsos únicamente a `owner` y `admin`. Registrar cada exportación en `admin_audit_log`.
- [ ] **P2.6 · Protección contra Bots (Cloudflare Turnstile)**
  - Incorporar captcha invisible en los formularios de Soporte, Contacto y Recuperar acceso (`/mi-boxie`).
- [ ] **P2.7 · Evitar DoS por rotación de tokens en Recuperar Acceso**
  - En `/mi-boxie`, no rotar el enlace de edición si se generó uno hace menos de 15 minutos.
- [ ] **P2.8 · Paginación en lecturas de órdenes**
  - Paginar la consulta `dataset()` en `src/server/admin/supabase-repo.ts` para no truncar la vista al superar las 1.000 ventas.
- [ ] **P2.9 · Protección de rama `main` en GitHub**
  - Exigir Pull Request con CI en verde antes de mergear; activar Dependabot y escaneo de secretos en GitHub.
- [ ] **P2.10 · Protocolo contra Ingeniería Social en Soporte**
  - Documentar en `docs/ADMIN.md` la obligatoriedad de verificar que el email coincida con la orden antes de reenviar accesos manualmente.

---

## 📋 FASE 3 · CUMPLIMIENTO LEGAL Y OPERACIÓN

- [ ] **P3.1 · Protección de Datos Personales (Ley 25.326)**
  - Inscribir la base ante la Agencia de Acceso a la Información Pública (AAIP) y definir política de purga de órdenes abandonadas y tickets antiguos.
- [ ] **P3.2 · Protocolo de Respuesta a Incidentes**
  - Documentar procedimiento de rotación de cada secreto (`TOKEN_ENCRYPTION_KEY`, `SESSION_SECRET`, claves de API).
- [ ] **P3.3 · Elevar costo de scrypt**
  - Aumentar el parámetro de costo a $N = 2^{17}$ para contraseñas de administradores según recomendaciones OWASP.
