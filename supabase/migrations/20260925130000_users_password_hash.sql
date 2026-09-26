-- ════════════════════════════════════════════════════════════════════════════
-- Boxie · Contraseñas directas en public.users
--
-- Agrega soporte para guardar contraseñas (hashes scrypt) en public.users
-- y desacopla la tabla de auth.users para permitir administración directa.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Agregar columna password_hash si no existe
alter table public.users add column if not exists password_hash text;

-- 2. Permitir que user_id se genere automáticamente sin requerir auth.users
alter table public.users alter column user_id set default gen_random_uuid();

-- 3. Quitar la restricción obligatoria que forzaba a que user_id existiera en auth.users
alter table public.users drop constraint if exists admin_users_user_id_fkey;
alter table public.users drop constraint if exists users_user_id_fkey;

-- 4. Índice único por email en minúsculas para búsquedas de login rápidas y seguras
create unique index if not exists users_email_unique on public.users (lower(email)) where email is not null;

-- 5. Columnas para invitaciones de equipo (token con expiración)
alter table public.users add column if not exists invite_token_hash text;
alter table public.users add column if not exists invite_expires_at timestamptz;
create index if not exists users_invite_token_idx on public.users (invite_token_hash) where invite_token_hash is not null;

