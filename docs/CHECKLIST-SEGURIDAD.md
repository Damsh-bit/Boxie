# Ribbly · Checklist de Seguridad y Plan de Lanzamiento

**Documento operativo de seguimiento.**  
Derivado de la auditoría de seguridad del 28/09/2026 (`docs/Boxie-auditoria-seguridad-2026-09-28.md`).

---

## 🛑 PARTE 1 · BLOQUEANTES PRE-LANZAMIENTO

> **Objetivo:** Tareas obligatorias e imprescindibles que deben completarse **antes** de abrir las ventas al público real. Garantizan que nadie acceda indebidamente al panel, que las credenciales no estén expuestas y que los cobros y entregas operen sobre datos limpios.

### ⚠️ Pendientes Críticos para Go-Live

- [ ] **P0.6 · Auditoría 17-18/11/2026: acciones fuera del código** (`docs/Ribbly-auditoria-seguridad-2026-11-17.md`)
  - [x] Supabase → "Confirm email" activado y "Allow new users to sign up" activado (18/11, verificado con captura).
  - [ ] Aplicar en producción la migración `20261117120000_security_hardening.sql` (`supabase db push`). Cierra H1 (admin por JWT sin 2FA) y M1 (tope de cupones).
  - [ ] Vercel: `CRON_SECRET` (sin ella los recordatorios responden 503), confirmar `MP_WEBHOOK_SECRET` y `NEXT_PUBLIC_SENTRY_DSN`; redeploy.
  - [ ] Revisar con qué se dispara `/api/cron/reminders` (no hay `crons` en `vercel.json`).

- [ ] **P0.7 · Entorno de desarrollo separado de producción**
  - **Por qué:** `.env.local` usa la base de producción y el token real de Mercado Pago: una prueba de compra en local cobra de verdad y escribe en la base real, y una laptop comprometida da acceso total a producción.
  - **Acción:** crear un vendedor y un comprador de prueba en Mercado Pago (_Tus integraciones → Cuentas de prueba_) y un proyecto (o branch) de Supabase para desarrollo; poner esas credenciales en `.env.local` y dejar las de producción solo en Vercel.

- [x] **P0.1 · Crear cuenta Owner real y borrar usuario demo [COMPLETADO · 02/10/2026]**
  - **Acción:** Cuenta Owner real creada, usuario demo `admin@boxie.demo` eliminado del equipo e invitaciones enviadas a los usuarios reales desde `/admin/equipo`.

- [ ] **P0.2 · Configurar / Rotar `SESSION_SECRET` y `TOKEN_ENCRYPTION_KEY` en Vercel**
  - **Dónde:** Dashboard de Vercel (_Settings → Environment Variables_).
  - **Acción:**
    1. Generar una nueva clave aleatoria de 32 bytes para `SESSION_SECRET`:
       ```bash
       openssl rand -base64 32
       ```
    2. Asegurarse de que `TOKEN_ENCRYPTION_KEY` en Vercel coincida con la clave usada para cifrar los secretos en la base de datos (2FA, gift tokens).
    3. Hacer redeploy en Vercel para que las variables entren en vigencia e invaliden sesiones residuales.

- [x] **P0.4 · Pasar repositorios a Privados y revocar token MP**
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
  - **Acción:** Dominio `ribbly.com.ar` configurado y verificado en Resend con registros DNS (SPF, DKIM, DMARC). Remitente activo `Ribbly <regalos@ribbly.com.ar>`, reply-to `soporte@ribbly.com.ar` y prueba de envío exitosa realizada a `santiago.n.almiron@gmail.com` (ID: `01a0fd11-1985-7149-bbfc-68205c9bc17f`).

---

## 🚀 PARTE 2 · POST-LANZAMIENTO (Con la web ya publicada)

> **Objetivo:** Mejoras de observabilidad, endurecimiento progresivo y escalabilidad que se pueden ir incorporando con la plataforma ya en línea y facturando.

### 📅 Semana 1 a 2 · Operación y Observabilidad

- [x] **P1.7 · Monitoreo con Sentry [CÓDIGO COMPLETADO · 18/11/2026]**
  - Antes había DSN pero Sentry nunca se inicializaba. Ahora `instrumentation.ts` lo inicia del lado del servidor, captura los errores de cada request y limpia mails, tokens y cookies antes de enviar (`src/server/sentry-scrub.ts`). Falta: confirmar `NEXT_PUBLIC_SENTRY_DSN` en Vercel y crear una alerta por mail para errores con "webhook" o "Mercado Pago".
- [ ] **P1.8 · Límite de pedidos global (Vercel Firewall)**
  - El límite actual vive en memoria de cada instancia (desde el 17/11 aislado por espacio de nombres). Para un límite real entre instancias: Vercel → Firewall → Rate Limiting, reglas por IP: `/api/checkout/preference` 10/10 min · `/api/checkout/quote` 30/10 min · `/admin/login` 20/15 min · `/api/mi-ribbly` 10/h · `/api/contact` y `/api/marcas` 5/h · `/editor/` 30/10 min.
- [ ] **P1.9 · Backups automáticos y Plan Pro en Supabase**
  - **Dónde:** Dashboard de Supabase.
  - **Acción:** Migrar al plan Pro para habilitar copias de seguridad automáticas diarias point-in-time y asegurar que el proyecto no se pause por periodos de baja actividad.

- [ ] **P1.10 · Subdominio exclusivo del Panel**
  - **Dónde:** DNS y Vercel.
  - **Acción:** Configurar `admin.ribbly.com.ar` y activar la variable `ADMIN_HOST` para aislar el panel de administración del tráfico del dominio principal.

---

### 🛡️ Mes 1 · Endurecimiento Progresivo (Fase 2)

- [x] **P2.1 · Content Security Policy (CSP) [COMPLETADO · 18/11/2026]**
  - CSP con nonce por pedido y `strict-dynamic` en `proxy.ts` (sin `unsafe-inline` ni `eval` en scripts, `connect-src` acotado, solo YouTube en frames). Probada página por página en un build de producción sin violaciones; tests en `tests/unit/csp.test.ts`.
- [x] **P2.2 · Permisos estrictos en DB [RESUELTO · 17/11/2026]**
  - Las tablas privadas no tienen políticas para `anon`, y los privilegios de admin por JWT ahora exigen MFA de Supabase (aal2), que el panel no usa: en la práctica la API REST no da acceso a nada privado.
- [x] **P2.3 · Control atómico de topes de cupones [COMPLETADO · 17/11/2026, falta aplicar la migración]**
  - En `apply_payment`, verificar `used_count < max_uses` de forma estrictamente atómica para evitar colisiones en cupones de alta concurrencia.
- [x] **P2.4 · Sanitización de retorno de Mercado Pago [COMPLETADO · 17-18/11/2026: `payment_id` numérico, `external_reference` UUID y `payment_events.raw` reducido a un resumen sin datos personales]**
  - Validar formato numérico de `payment_id` en `/api/checkout/return` y evitar registrar datos personales de clientes en los logs.
- [x] **P2.5 · Mínimo privilegio en el Panel [COMPLETADO · 18/11/2026]**
  - Exportar clientes/ventas y reembolsar: solo dueño y administración (el rol Soporte ya no puede, ni por URL). Cada exportación queda en el log.
- [ ] **P2.6 · Protección contra Bots (Cloudflare Turnstile)**
  - Incorporar captcha invisible en formularios públicos (Soporte, Contacto y `/mi-boxie`).
- [x] **P2.7 · Evitar DoS por rotación de tokens en Recuperar Acceso [COMPLETADO · 18/11/2026]**
  - Un link de edición mandado hace menos de 15 minutos no se vuelve a rotar.
- [ ] **P2.8 · Paginación en lecturas de órdenes**
  - Paginar la consulta `dataset()` en `src/server/admin/supabase-repo.ts` al superar las 1.000 ventas.
- [ ] **P2.9 · GitHub: escaneo de secretos y alertas de dependencias**
  - Exigir pull requests choca con el flujo acordado (push directo a `main`). Lo que sí suma sin cambiar el flujo: _Settings → Code security_ → activar **Secret scanning + Push protection** y **Dependabot alerts / security updates**.
- [x] **P2.10 · Protocolo contra ingeniería social en Soporte [COMPLETADO · 18/11/2026]**
  - Documentado en `docs/ADMIN.md` → Soporte → "Protocolo contra ingeniería social".

---

### 📋 Mes 2+ · Cumplimiento Legal y Auditoría (Fase 3)

- [ ] **P3.1 · Protección de Datos Personales (Ley 25.326)**
  - Inscribir la base de datos ante la Agencia de Acceso a la Información Pública (AAIP) y definir políticas de retención/purga de datos de órdenes viejas.
- [ ] **P3.2 · Protocolo de Respuesta a Incidentes**
  - Documentar manual operativo de rotación de cada credencial y secreto ante incidentes.
- [x] **P3.3 · Costo de scrypt [RIESGO ACEPTADO · 18/11/2026]**
  - Se deja N=2^14: subirlo a 2^17 con el hash síncrono actual bloquea la instancia ~400 ms por login (en Fluid Compute frena otros pedidos) y obliga a rehacer la huella de sesión. Las claves tienen ≥12 caracteres, hay 2FA y los hashes ya no son legibles por la API. Revisar si se pasa a scrypt asíncrono.
