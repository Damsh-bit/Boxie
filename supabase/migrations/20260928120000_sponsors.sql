-- ════════════════════════════════════════════════════════════════════════════
-- Boxie · Sponsors
--
-- Marcas y comercios aliados (una cafetería que regala una Boxie con su café,
-- una marca con una campaña, un evento). Cada uno tiene su etapa (nuevo
-- contacto → en conversación → activo → pausado/finalizado) y, activo y dentro
-- de sus fechas, aparece en los lugares del sitio que eligió.
--
-- Lo cargan el panel (/admin/sponsors) y el formulario de /marcas, siempre con
-- el service role desde el servidor. El sitio también lee con el service role
-- y muestra solo lo público (nunca contacto ni notas): anon no ve ni escribe
-- nada. Es aditiva: sin esta tabla el sitio muestra la invitación a sumarse y
-- el panel avisa que falta la migración.
-- ════════════════════════════════════════════════════════════════════════════

create table public.sponsors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(name) between 2 and 80),
  kind          text not null default 'local'
                check (kind in ('local', 'marca', 'evento', 'creador', 'medio')),
  stage         text not null default 'lead'
                check (stage in ('lead', 'conversacion', 'activo', 'pausado', 'finalizado')),
  tagline       text not null default '' check (length(tagline) <= 90),
  offer         text not null default '' check (length(offer) <= 140),
  description   text not null default '' check (length(description) <= 400),
  emoji         text not null default '🤝' check (length(emoji) between 1 and 16),
  -- https://… o una ruta del sitio (/brand/logo.png).
  logo_url      text check (logo_url is null or logo_url ~ '^(https://[^[:space:]]+|/[^/[:space:]][^[:space:]]*)$'),
  color         text not null default '#F44E63' check (color ~ '^#[0-9a-fA-F]{6}$'),
  url           text check (url is null or url ~ '^https://[^[:space:]]+$'),
  city          text not null default '' check (length(city) <= 80),
  coupon_code   text check (coupon_code is null or coupon_code ~ '^[A-Z0-9_-]{3,32}$'),
  placements    text[] not null default '{}'
                check (placements <@ array['home', 'galeria', 'precios', 'marcas']::text[]),
  starts_on     date,
  ends_on       date check (ends_on is null or starts_on is null or ends_on >= starts_on),
  sort_order    integer not null default 0 check (sort_order between 0 and 999),
  contact_name  text not null default '' check (length(contact_name) <= 120),
  contact_email text not null default '' check (length(contact_email) <= 254),
  contact_phone text not null default '' check (length(contact_phone) <= 40),
  interests     text[] not null default '{}'
                check (interests <@ array['sponsor', 'cobranding', 'campana', 'corporativo']::text[]),
  notes         text not null default '' check (length(notes) <= 2000),
  source        text not null default 'panel' check (source in ('panel', 'web')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Un activo tiene que aparecer en algún lugar.
  check (stage <> 'activo' or cardinality(placements) > 0)
);

create index sponsors_stage_idx on public.sponsors (stage, sort_order);

create trigger sponsors_updated_at before update on public.sponsors
  for each row execute function public.set_updated_at();

-- ── Permisos ──────────────────────────────────────────────────────────────
alter table public.sponsors enable row level security;

-- Los admins leen y escriben (el panel usa el service role, pero la regla
-- queda para cualquier cliente autenticado del equipo).
create policy sponsors_admin on public.sponsors
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.sponsors from anon;
