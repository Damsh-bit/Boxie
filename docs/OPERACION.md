# Operación

## Variables de entorno

Todas documentadas en [`.env.example`](../.env.example). En Vercel van en _Settings → Environment
Variables_; nunca en el repo.

| Variable                                                    | Dónde se consigue                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API                                      |
| `SUPABASE_SERVICE_ROLE_KEY`                                 | Idem (secreta: solo servidor)                                          |
| `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY`                    | `openssl rand -base64 32` (una distinta por entorno)                   |
| `MP_ACCESS_TOKEN`                                           | Mercado Pago → Tus integraciones → Credenciales (el **nuevo**, rotado) |
| `MP_WEBHOOK_SECRET`                                         | Mercado Pago → Tus integraciones → Webhooks                            |
| `RESEND_API_KEY`                                            | Resend, con el dominio verificado (DKIM)                               |

## Supabase: primera vez

> **Estado (23/09/2026):** el proyecto todavía no existe. Al crearlo, Supabase respondió que la
> cuenta `Damsh-bit` ya tiene los **2 proyectos gratis activos** que permite el plan free (en otras
> organizaciones). Para crearlo hay que pausar o borrar uno de esos proyectos, o pasar la
> organización a Pro. Las migraciones están listas y probadas.

1. Crear el proyecto `boxie` en la organización _Damsh-bit's Org_, región `sa-east-1` (São Paulo).
2. Aplicar las migraciones: `npx supabase link --project-ref <ref>` y `npx supabase db push`
   (son 6: esquema, funciones, RLS, storage, catálogo inicial y editor).
3. Revisar los avisos de seguridad del panel (_Advisors_): tienen que estar en cero.
4. Crear el primer admin: registrar el usuario en _Authentication_ y agregarlo a `admin_users`:
   `insert into public.admin_users (user_id) values ('<uuid del usuario>');`
5. Cargar en Vercel las variables de la tabla de arriba y sacar `DEMO_MODE`.

La base cambia solo por migraciones. Nunca desde el panel.

**Región de Vercel:** conviene fijar las funciones en `gru1` (São Paulo), al lado de la base. Cada
página del editor hace varias consultas: desde `iad1` (el default, EE.UU.) cada una suma ~120 ms.

## Deploy

- `main` → producción en Vercel. Cada PR → deploy de preview.
- El modo demo (`DEMO_MODE=1`) es solo para deploys de muestra sin secretos. En demo, el editor
  funciona en modo prueba (`/ejemplo/<temática>/personalizar`) y `/g/<token>` no existe.

## Editor y regalo

| Ruta                               | Qué es                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `/editor/<token>`                  | El link del mail. Se canjea por una cookie firmada y redirige a `/editor` |
| `/editor`                          | El editor del comprador (sin cookie: explica cómo entrar)                 |
| `/editor/foto`                     | Subida de fotos (POST, con la cookie del editor)                          |
| `/g/<token>`                       | El regalo. Sin clave, salvo que el comprador le ponga una                 |
| `/ejemplo/<temática>/personalizar` | El mismo editor en modo prueba: guarda en el navegador, no compra nada    |
| `/api/dev/boxies`                  | Solo con `PAYMENTS_PROVIDER=fake` (desarrollo y E2E): crea una Boxie paga |

Para probar el editor real en local (con Supabase levantado y `PAYMENTS_PROVIDER=fake`):

```bash
curl -X POST http://localhost:3000/api/dev/boxies -H "content-type: application/json" -d "{\"tematica\":\"pareja\"}"
```

Devuelve el link del editor y el del regalo (en la vida real llegan por mail).

## Límites y abuso

Los límites de pedidos (contacto, checkout, editor, fotos, clave del regalo) viven en memoria de
cada instancia: frenan lo obvio. Para límites globales, activar reglas de rate limiting en el
Firewall de Vercel sobre `/api/*`, `/editor/*` y `/g/*`.

Cada Boxie admite hasta 30 fotos (lo exige la base); al bloquearla se borran las que se
reemplazaron.

## Checklist de seguridad (Sprint 0)

- [x] Revocar el `MP_ACCESS_TOKEN` expuesto en `Damsh-bit/boxiedigital` y generar uno nuevo
      (tarea del equipo, en el panel de Mercado Pago).
- [ ] Pasar `Damsh-bit/boxiedigital` a privado (GitHub → Settings → Change visibility).
- [ ] Purgar el historial y forzar el push. El historial ya está reescrito sin el `.env` en un clon
      local (con un respaldo espejo del original); falta el push forzado, que hace el dueño del
      repo. Aun purgado, GitHub sirve el commit viejo por su hash un tiempo: por eso el repo tiene
      que quedar privado y el token, rotado.
- [ ] `.gitignore` en el prototipo (`.env`, `node_modules`, `dist`): sale junto con ese push.
- [x] Revisar movimientos de la cuenta de Mercado Pago (tarea del equipo).
- [x] Auditar las reglas de Firestore del prototipo (tarea del equipo).
