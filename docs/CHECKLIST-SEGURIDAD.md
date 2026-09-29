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
  - **Dónde:** Dashboard de Vercel (_Settings → Environment Variables_).
  - **Acción:**
    1. Generar una nueva clave aleatoria de 32 bytes:
       ```bash
       openssl rand -base64 32
       ```
    2. Actualizar el valor de `SESSION_SECRET` en producción.
    3. Hacer redeploy en Vercel para invalidar cualquier sesión activa previa en el panel, editor o regalos.

- [x] **P0.3 · Limpiar usuarios de prueba en Supabase Auth [COMPLETADO]**
  - **Dónde:** Dashboard de Supabase (_Authentication → Users_).
  - **Acción:**
    - [x] Borrados los usuarios de prueba del seed en Supabase Auth.
    - [x] Desactivada la opción **"Allow new users to sign up"** en _Authentication → Sign In / Providers → Email_ (bloquea registros públicos no autorizados).

- [ ] **P0.4 · Pasar repositorios a Privados y revocar token MP**
  - **Dónde:** GitHub y Mercado Pago Developers.
  - **Acción:**
    1. En Mercado Pago Developers (_Tus integraciones → Credenciales_), confirmar que el token que estaba en el repo viejo esté revocado.
    2. Borrar o pasar a privado el repo anterior `Damsh-bit/boxiedigital`.
    3. Pasar el repo actual `Damsh-bit/Boxie` a **Private** (_Settings → Danger Zone → Change visibility_). Vercel seguirá desplegando sin problemas.

- [x] **P0.5 · Blindar script de creación de administradores [COMPLETADO]**
  - **Dónde:** Código fuente (`scripts/create-admin.mjs`).
  - **Acción:**
    - [x] Argumentos `email` y `password` obligatorios (eliminados los defaults automáticos de demo).
    - [x] Validación de longitud mínima de contraseña (mínimo 12 caracteres).
    - [x] Rechazo de contraseñas de demo (`boxie-admin`, `admin`, etc.) y dominios de prueba (`@boxie.demo`).
    - [x] Validación de formato sintáctico de email.
    - [x] Ocultamiento de la contraseña en texto plano en la salida de la terminal.

---

## 🛑 FASE 1 · BLOQUEANTES (Antes de Abrir Ventas)

> **Objetivo:** Garantizar cobros automáticos, entrega de Boxies sin fallas y control real de acceso.

- [x] **P1.1 · Webhook de Mercado Pago y Conciliación Automática [COMPLETADO]**
  - **Dónde:** Código (`app/api/webhooks/mercadopago/route.ts`) y MP Developers.
  - **Acción:**
    1. Implementar la ruta de webhook validando el encabezado `x-signature` con `MP_WEBHOOK_SECRET`. [Listo]
    2. Consultar el estado del pago en la API de Mercado Pago y procesarlo con `applyPaymentNotice({ source: 'webhook' })`. [Listo]
    3. Añadir `notification_url` a las preferencias generadas en `app/api/checkout/preference/route.ts`. [Listo]
    4. Conciliación periódica de órdenes huérfanas pendientes.

- [x] **P1.2 · Revocación activa de sesiones del Panel [COMPLETADO]**
  - **Dónde:** Código (`src/server/admin/session.ts` y `src/server/admin/token.ts`).
  - **Acción:**
    - [x] **Relectura y revocación activa en `getAdminSession`:** En cada petición al panel, se valida criptográficamente la cookie y se consulta la base de datos para releer `role`, `is_active` y la huella SHA-256 (`fp`) del `password_hash`. Si un usuario es eliminado, desactivado (`is_active: false`), pierde su rol administrativo o cambia su contraseña, su sesión se revoca en el acto.
    - [x] **Rotación de sesión al cambiar clave:** En `changePasswordAction`, la sesión actual rota inmediatamente a la nueva huella para continuar navegando mientras todas las sesiones abiertas en otros navegadores o dispositivos quedan revocadas.
    - [x] **Reducción de "Recordarme":** Opción `remember` acotada a un máximo estricto de 7 días (`REMEMBER_DAYS = 7`).
    - [x] **Cobertura de tests:** Suite completa añadida en `src/server/admin/session.test.ts` cubriendo revocación inmediata por baja, eliminación, cambio de rol y cambio de clave.

- [x] **P1.3 · Endurecer Login del Panel [COMPLETADO]**
  - **Dónde:** Código (`src/server/admin/auth.ts`, `invite.ts`, `password.ts`, `src/server/db/client.ts`).
  - **Acción:**
    - [x] Función `escapeIlike()` implementada y aplicada en búsquedas por email en `auth.ts` e `invite.ts` (neutraliza comodines `%` y `_`, cerrando la evasión de rate limiting por email).
    - [x] Eliminada por completo la comparación de contraseñas en texto plano en `verifyPassword` (solo se admiten hashes válidos scrypt `salt:hash`).
    - [x] Eliminado el fallback a Supabase Auth en `authenticateUser` (autenticación directa y estricta contra `public.users`).
    - [x] Registro en bitácora (`log.info`) y en la sesión del email canónico real almacenado en la base de datos y no del texto tipeado en el formulario.
    - [x] Longitud mínima de contraseña en invitaciones de equipo (`activateMemberAccount`) elevada a 12 caracteres.

- [x] **P1.4 · Gestión de Claves y 2FA (TOTP) [COMPLETADO]**
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
      - ⚠️ **Configuración en Vercel:** `TOKEN_ENCRYPTION_KEY` debe estar cargada en Vercel (_Settings → Environment Variables_) con el mismo valor que `.env.local` para que producción pueda descifrar los secretos de la base.
    - [x] **Pantalla de "Cambiar Contraseña" implementada en `/admin/seguridad`:**
      - Server Action `changePasswordAction` con validación estricta de contraseña actual, coincidencia y hash Scrypt.
      - Indicador visual dinámico de longitud mínima de caracteres en tiempo real.
    - [x] **Exigencia de contraseñas de mínimo 12 caracteres:** aplicada de forma global tanto en invitaciones (`invite.ts`), creación por consola (`create-admin.mjs`) y cambio de clave (`actions.ts`).

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
