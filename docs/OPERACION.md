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

1. Crear el proyecto (región `sa-east-1`, São Paulo).
2. Aplicar las migraciones: `npx supabase link --project-ref <ref>` y `npx supabase db push`.
3. Crear el primer admin: registrar el usuario en _Authentication_ y agregarlo a `admin_users`:
   `insert into public.admin_users (user_id) values ('<uuid del usuario>');`

La base cambia solo por migraciones. Nunca desde el panel.

## Deploy

- `main` → producción en Vercel. Cada PR → deploy de preview.
- El modo demo (`DEMO_MODE=1`) es solo para deploys de muestra sin secretos.

## Límites y abuso

Los límites de pedidos del formulario de contacto y del checkout viven en memoria de cada instancia:
frenan lo obvio. Para límites globales, activar reglas de rate limiting en el Firewall de Vercel sobre
`/api/*`.

## Checklist de seguridad pendiente (Sprint 0)

- [ ] Revocar el `MP_ACCESS_TOKEN` expuesto en `Damsh-bit/boxiedigital` y generar uno nuevo.
- [ ] Pasar `Damsh-bit/boxiedigital` a privado y purgar el historial (`git filter-repo`).
- [ ] Revisar movimientos de la cuenta de Mercado Pago.
- [ ] Auditar las reglas de Firestore del prototipo.
