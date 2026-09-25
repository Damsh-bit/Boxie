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
| `ADMIN_DEMO_EMAIL`, `ADMIN_DEMO_PASSWORD`                   | Solo en modo demo: el usuario del panel (si no, el de muestra)         |

## Supabase: primera vez

> **Estado (23/09/2026):** el proyecto todavía no existe. Al crearlo, Supabase respondió que la
> cuenta `Damsh-bit` ya tiene los **2 proyectos gratis activos** que permite el plan free (en otras
> organizaciones). Para crearlo hay que pausar o borrar uno de esos proyectos, o pasar la
> organización a Pro. Las migraciones están listas y probadas.

1. Crear el proyecto `boxie` en la organización _Damsh-bit's Org_, región `sa-east-1` (São Paulo).
2. Aplicar las migraciones: `npx supabase link --project-ref <ref>` y `npx supabase db push`
   (son 8: esquema, funciones, RLS, storage, catálogo inicial, editor, panel de administración y
   soporte).
3. Revisar los avisos de seguridad del panel (_Advisors_): tienen que estar en cero.
4. Crear el primer admin: registrar el usuario en _Authentication_ y agregarlo a `users` con rol
   (después suma al resto del equipo desde el panel, en _Equipo_). O usar `npm run admin:create`:
   `insert into public.users (user_id, email, name, role) values ('<uuid>', '<mail>', '<nombre>', 'owner');`
5. Cargar en Vercel las variables de la tabla de arriba y sacar `DEMO_MODE`.
6. Recorrer el panel con la checklist de [ADMIN.md](ADMIN.md#conectar-supabase) (planes, gastos,
   configuración).

La base cambia solo por migraciones. Nunca desde el panel.

**Región de Vercel:** conviene fijar las funciones en `gru1` (São Paulo), al lado de la base. Cada
página del editor hace varias consultas: desde `iad1` (el default, EE.UU.) cada una suma ~120 ms.

## Deploy

- `main` → producción en Vercel. Cada PR → deploy de preview.
- El modo demo (`DEMO_MODE=1`) es solo para deploys de muestra sin secretos. En demo, el editor
  funciona en modo prueba (`/ejemplo/<temática>/personalizar`) y `/g/<token>` no existe.
- En demo, el panel (`/admin`) funciona con datos de muestra y lo que se cambia ahí (temáticas,
  planes, cupones, precio) se ve en la tienda. Esos cambios viven en la memoria de cada instancia:
  se pierden con cada deploy o cuando la instancia se recicla. En Vercel la clave de muestra no sirve: el
  panel queda cerrado hasta **definir `ADMIN_DEMO_PASSWORD`** (_Settings → Environment Variables_).

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

## Panel de administración

Todo en [ADMIN.md](ADMIN.md): secciones, roles, planes, generador, soporte y cómo conectarlo a la
base.

## Soporte

| Ruta                     | Qué es                                                                   |
| ------------------------ | ------------------------------------------------------------------------ |
| Botón de ayuda           | Widget del sitio, el editor y el editor de prueba (abajo a la izquierda) |
| `/soporte`               | Las consultas de este navegador, a pantalla completa                     |
| `/soporte/<token>`       | El link personal del mail: se canjea por la cookie y vuelve a /soporte   |
| `/api/soporte/*`         | La API del cliente (cookie httpOnly que solo viaja a esta ruta)          |
| `/api/soporte/eventos`   | Stream en vivo del cliente (SSE)                                         |
| `/admin/soporte`         | La bandeja del equipo                                                    |
| `/admin/soporte/eventos` | Stream en vivo de la bandeja (SSE)                                       |

- **Vercel:** los streams cierran solos a los 50 s y el navegador reconecta (las rutas declaran
  `maxDuration = 60`). Con la base real, cada stream abierto consulta los cambios cada 2,5 s (una
  consulta chica e indexada): con unos pocos agentes y clientes conectados a la vez, sobra.
- **Mails:** salen por Resend como el resto; el equipo los recibe en el mail de soporte de
  **Configuración**. Sin `TOKEN_ENCRYPTION_KEY`, los avisos de respuesta llevan el link a
  `/soporte` (sirve en el mismo navegador) en vez del link personal.
- **Límites:** 10 consultas nuevas por hora por IP, 40 mensajes cada 10 minutos, y la recuperación
  de links por mail tiene tope por IP y por mail.
- **En la demo de Vercel** las consultas viven en la memoria de cada instancia, como todo lo de la
  demo: si Vercel atiende con otra instancia, una consulta puede no aparecer. Para probar el chat
  de punta a punta, en local (`boxie-demo`) o con la base real (migración 8 aplicada).

## Límites y abuso

Los límites de pedidos (contacto, checkout, editor, fotos, clave del regalo, soporte) viven en
memoria de cada instancia: frenan lo obvio. Para límites globales, activar reglas de rate limiting
en el Firewall de Vercel sobre `/api/*`, `/editor/*`, `/g/*` y `/soporte/*`.

Cada Boxie admite hasta 30 fotos (lo exige la base) y el plan comprado puede bajar ese tope; al
bloquearla se borran las que se reemplazaron.

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
