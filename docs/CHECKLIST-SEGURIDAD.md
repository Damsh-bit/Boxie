# Boxie · Checklist de Seguridad y Plan de Lanzamiento

**Documento operativo de seguimiento.**  
Derivado de la auditoría de seguridad del 28/09/2026 (`docs/Boxie-auditoria-seguridad-2026-09-28.md`).

---

## 🛑 PARTE 1 · BLOQUEANTES PRE-LANZAMIENTO

> **Objetivo:** Tareas obligatorias e imprescindibles que deben completarse **antes** de abrir las ventas al público real. Garantizan que nadie acceda indebidamente al panel, que las credenciales no estén expuestas y que los cobros y entregas operen sobre datos limpios.

### ⚠️ Pendientes Críticos para Go-Live

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

- [ ] **P0.2 · Configurar / Rotar `SESSION_SECRET` y `TOKEN_ENCRYPTION_KEY` en Vercel**
  - **Dónde:** Dashboard de Vercel (_Settings → Environment Variables_).
  - **Acción:**
    1. Generar una nueva clave aleatoria de 32 bytes para `SESSION_SECRET`:
       ```bash
       openssl rand -base64 32
       ```
    2. Asegurarse de que `TOKEN_ENCRYPTION_KEY` en Vercel coincida con la clave usada para cifrar los secretos en la base de datos (2FA, gift tokens).
    3. Hacer redeploy en Vercel para que las variables entren en vigencia e invaliden sesiones residuales.

- [ ] **P0.4 · Pasar repositorios a Privados y revocar token MP**
  - **Dónde:** GitHub y Mercado Pago Developers.
  - **Acción:**
    1. En Mercado Pago Developers (_Tus integraciones → Credenciales_), confirmar que cualquier token expuesto previamente esté revocado y reemplazado por credenciales de producción.
    2. Borrar o pasar a privado el repositorio anterior `Damsh-bit/boxiedigital`.
    3. Pasar el repositorio actual `Damsh-bit/Boxie` a **Private** (_Settings → Danger Zone → Change visibility_). Vercel seguirá desplegando normalmente.

- [ ] **P1.6 · Limpiar datos de muestra y regenerar cupones comerciales**
  - **Dónde:** Base de datos de producción (Supabase).
  - **Acción:**
    1. Purgar las 82 órdenes y 47 Boxies de muestra generadas por el seed inicial para que las métricas de venta arranquen en cero real.
    2. Crear los cupones comerciales reales con códigos secretos, límites de usos (`max_uses`) y fechas de vencimiento.

---

### ✅ Completados y Blindados para el Lanzamiento

- [x] **P1.11 · Alinear Historial de Migraciones en Producción [COMPLETADO / VERIFICADO]**
  - **Acción:** Inspeccionada la base de datos de producción (`ftnwgjsyynsnojlewtsv.supabase.co`). Se verificó la presencia efectiva del 100% de las tablas y columnas críticas de las 12 migraciones del proyecto: columnas de 2FA (`totp_enabled`, `totp_secret_enc`, `totp_backup_codes`), contraseñas directas en `public.users` (`password_hash`, `invite_*`), tablas de soporte, marketing, sponsors y audit log. No hay discrepancias de esquema.

- [x] **P0.3 · Limpiar usuarios de prueba en Supabase Auth [COMPLETADO]**
  - **Acción:** Borrados los usuarios demo en Supabase Auth y desactivada la opción "Allow new users to sign up" para impedir registros públicos en el backend.

- [x] **P0.5 · Blindar script de creación de administradores [COMPLETADO]**
  - **Acción:** Argumentos `email` y `password` obligatorios, rechazo de credenciales demo, validación sintáctica de email, contraseña oculta en consola y mínimo 12 caracteres forzado en `scripts/create-admin.mjs`.

- [x] **P1.1 · Webhook de Mercado Pago y Conciliación Automática [COMPLETADO]**
  - **Acción:** Webhook oficial implementado en `app/api/webhooks/mercadopago/route.ts` con validación HMAC SHA-256 (`x-signature` y `MP_WEBHOOK_SECRET`), consulta atómica a la API de MP y aplicación idempotente del pago.

- [x] **P1.2 · Revocación activa de sesiones del Panel [COMPLETADO]**
  - **Acción:** Relectura en tiempo real en `getAdminSession` de `is_active`, `role` y huella SHA-256 (`fp`) del `password_hash`. Si un usuario es eliminado, desactivado o cambia su clave, el acceso se corta en el acto. Opción "recordarme" limitada a 7 días.

- [x] **P1.3 · Endurecer Login del Panel [COMPLETADO]**
  - **Acción:** Función `escapeIlike()` implementada contra evasión de rate limiting, comparación estricta de hashes Scrypt (eliminado soporte de texto plano), log con email canónico y contraseñas de mínimo 12 caracteres.

- [x] **P1.4 · Gestión de Claves y 2FA (TOTP) [COMPLETADO]**
  - **Acción:** 2FA TOTP blindado con secretos cifrados AES-256-GCM en base de datos, 8 códigos de respaldo con quema de un solo uso, tolerancia horaria de ±90s, retención de preAuthToken y pantalla `/admin/seguridad` para cambio de clave con feedback visual.

- [x] **P1.5 · Configurar envío de Mails en Producción (Resend) [COMPLETADO / VERIFICADO]**
  - **Acción:** Dominio `boxiedigital.com.ar` configurado y verificado en Resend con registros DNS (SPF, DKIM, DMARC). Remitente activo `Boxie <hola@boxiedigital.com.ar>`, reply-to `ayuda@boxiedigital.com.ar` y prueba de envío exitosa realizada a `zaxloro02@gmail.com` (ID: `01a0ed39-6a12-7759-b22f-510cbe7c4109`).

---

## 🚀 PARTE 2 · POST-LANZAMIENTO (Con la web ya publicada)

> **Objetivo:** Mejoras de observabilidad, endurecimiento progresivo y escalabilidad que se pueden ir incorporando con la plataforma ya en línea y facturando.

### 📅 Semana 1 a 2 · Operación y Observabilidad

- [ ] **P1.7 · Activar Monitoreo con Sentry**
  - **Dónde:** Código (`instrumentation.ts`) y Vercel.
  - **Acción:** Configurar `NEXT_PUBLIC_SENTRY_DSN`, filtrar datos personales sensibles en `beforeSend` y configurar alertas automáticas por correo ante errores en cobros o webhooks.

- [ ] **P1.8 · Rate Limiting Global / Distribuido (Upstash Redis)**
  - **Dónde:** Vercel Firewall o Upstash Redis.
  - **Acción:** Migrar los límites de tasa locales en memoria hacia Redis para persistir conteos entre distintas instancias serverless en `/admin/login`, `/api/checkout/*`, `/g/*`, `/editor/*` y `/soporte/*`.

- [ ] **P1.9 · Backups automáticos y Plan Pro en Supabase**
  - **Dónde:** Dashboard de Supabase.
  - **Acción:** Migrar al plan Pro para habilitar copias de seguridad automáticas diarias point-in-time y asegurar que el proyecto no se pause por periodos de baja actividad.

- [ ] **P1.10 · Subdominio exclusivo del Panel**
  - **Dónde:** DNS y Vercel.
  - **Acción:** Configurar `admin.boxiedigital.com.ar` y activar la variable `ADMIN_HOST` para aislar el panel de administración del tráfico del dominio principal.

---

### 🛡️ Mes 1 · Endurecimiento Progresivo (Fase 2)

- [ ] **P2.1 · Content Security Policy (CSP)**
  - Configurar encabezados CSP en `next.config.ts` (comenzando en modo `Report-Only`), autorizando exclusivamente Mercado Pago, Meta Pixel, Supabase Storage, Sentry y YouTube.
- [ ] **P2.2 · Permisos estrictos en DB (Defensa en Profundidad)**
  - Revocar permisos directos de `SELECT` e `INSERT` al rol `anon` en tablas privadas y revocar lectura de columnas sensibles al rol `authenticated`.
- [ ] **P2.3 · Control atómico de topes de cupones**
  - En `apply_payment`, verificar `used_count < max_uses` de forma estrictamente atómica para evitar colisiones en cupones de alta concurrencia.
- [ ] **P2.4 · Sanitización de retorno de Mercado Pago**
  - Validar formato numérico de `payment_id` en `/api/checkout/return` y evitar registrar datos personales de clientes en los logs.
- [ ] **P2.5 · Principio de mínimo privilegio en el Panel**
  - Restringir la exportación de bases de clientes y reembolsos exclusivamente a usuarios con rol `owner` y `admin`.
- [ ] **P2.6 · Protección contra Bots (Cloudflare Turnstile)**
  - Incorporar captcha invisible en formularios públicos (Soporte, Contacto y `/mi-boxie`).
- [ ] **P2.7 · Evitar DoS por rotación de tokens en Recuperar Acceso**
  - En `/mi-boxie`, no regenerar el link de edición si ya se generó uno hace menos de 15 minutos.
- [ ] **P2.8 · Paginación en lecturas de órdenes**
  - Paginar la consulta `dataset()` en `src/server/admin/supabase-repo.ts` al superar las 1.000 ventas.
- [ ] **P2.9 · Protección de rama `main` en GitHub**
  - Exigir Pull Request con CI en verde antes de mergear, activando Dependabot y escaneo de secretos.
- [ ] **P2.10 · Protocolo contra Ingeniería Social en Soporte**
  - Documentar en `docs/ADMIN.md` la obligatoriedad de verificar coincidencia de email antes de reenviar accesos manualmente.

---

### 📋 Mes 2+ · Cumplimiento Legal y Auditoría (Fase 3)

- [ ] **P3.1 · Protección de Datos Personales (Ley 25.326)**
  - Inscribir la base de datos ante la Agencia de Acceso a la Información Pública (AAIP) y definir políticas de retención/purga de datos de órdenes viejas.
- [ ] **P3.2 · Protocolo de Respuesta a Incidentes**
  - Documentar manual operativo de rotación de cada credencial y secreto ante incidentes.
- [ ] **P3.3 · Elevar costo de scrypt**
  - Elevar el parámetro de costo a $N = 2^{17}$ para contraseñas de administradores según recomendaciones OWASP.
