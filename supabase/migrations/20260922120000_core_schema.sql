-- ════════════════════════════════════════════════════════════════════════════
-- Boxie · Esquema base
--
-- Modelo de datos de docs/ARQUITECTURA.md §3.2. Toda la base cambia por
-- migración versionada: nunca desde el panel de Supabase.
--
-- Montos: enteros en centavos (ARS). Nada de float para dinero.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ── Tipos ───────────────────────────────────────────────────────────────────

create type public.theme_status as enum ('draft', 'published', 'archived');
create type public.coupon_kind  as enum ('percent', 'fixed');
create type public.order_status as enum ('pending', 'paid', 'refunded', 'cancelled');
create type public.boxie_status as enum ('active', 'refunded', 'expired');
create type public.media_owner  as enum ('boxie', 'theme');
-- Rol del equipo en el panel. Va acá porque public.users lo usa.
create type public.admin_role   as enum ('owner', 'admin', 'editor', 'support');

-- ── Utilidades ──────────────────────────────────────────────────────────────

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- ── Usuarios ─────────────────────────────────────────────────────────────────
-- Tabla unificada de perfiles. Todos los usuarios que hacen login tienen una
-- fila aquí (se crea en el primer acceso vía trigger o desde la app).
-- Un admin tiene role IS NOT NULL. Se da de alta con `npm run admin:create`.

create table public.users (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  email        text check (email is null or length(email) <= 254),
  name         text not null default '' check (length(name) <= 80),
  -- null = usuario común. Valor = admin con ese rol.
  role         public.admin_role,
  phone        text check (phone is null or length(phone) <= 40),
  avatar_url   text check (avatar_url is null or length(avatar_url) <= 500),
  is_active    boolean not null default true,
  preferences  jsonb not null default '{}'::jsonb,
  invited_at   timestamptz,
  last_seen_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ── Catálogo ────────────────────────────────────────────────────────────────

create table public.themes (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique
                     check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  name               text not null check (length(name) between 1 and 80),
  category           text not null check (length(category) between 1 and 40),
  description        text not null default '',
  status             public.theme_status not null default 'draft',
  -- null = se cobra el precio base de `settings`.
  price_cents        integer check (price_cents > 0),
  sort_order         integer not null default 0,
  -- Contenido de la ficha comercial (títulos, fotos, bullets). Validado con Zod en la app.
  listing            jsonb not null default '{}'::jsonb,
  -- Borrador del constructor de temáticas. Publicar lo congela en theme_versions.
  draft_config       jsonb,
  current_version_id uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint themes_published_has_version
    check (status <> 'published' or current_version_id is not null)
);

create trigger themes_updated_at before update on public.themes
  for each row execute function public.set_updated_at();

-- INMUTABLE. Cada Boxie apunta a una versión, no a la temática: editar una
-- temática nunca cambia un regalo ya vendido.
create table public.theme_versions (
  id           uuid primary key default gen_random_uuid(),
  theme_id     uuid not null references public.themes (id) on delete restrict,
  version      integer not null check (version > 0),
  config       jsonb not null,
  published_at timestamptz not null default now(),
  -- Sin FK a auth.users a propósito: la tabla es inmutable y un ON DELETE
  -- SET NULL sería un UPDATE.
  created_by   uuid,
  unique (theme_id, version),
  unique (id, theme_id)
);

alter table public.themes
  add constraint themes_current_version_fk
  foreign key (current_version_id, id)
  references public.theme_versions (id, theme_id);

create function public.forbid_theme_version_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'theme_versions es inmutable: publicá una versión nueva'
    using errcode = 'check_violation';
end
$$;

create trigger theme_versions_immutable before update or delete on public.theme_versions
  for each row execute function public.forbid_theme_version_mutation();

-- ── Comercio ────────────────────────────────────────────────────────────────

-- Fuera del alcance del MVP, pero el lugar queda preparado (§5 Post-MVP).
create table public.affiliates (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(name) between 1 and 120),
  code           text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
  commission_bps integer not null default 0 check (commission_bps between 0 and 10000),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table public.coupons (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
  kind         public.coupon_kind not null,
  -- percent: 1..100 · fixed: centavos
  value        integer not null check (value > 0),
  active       boolean not null default true,
  max_uses     integer check (max_uses > 0),
  used_count   integer not null default 0 check (used_count >= 0),
  starts_at    timestamptz,
  expires_at   timestamptz,
  affiliate_id uuid references public.affiliates (id) on delete set null,
  description  text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint coupons_percent_range check (kind <> 'percent' or value <= 100),
  constraint coupons_window check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create trigger coupons_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();

-- Una fila por intento de compra, se pague o no: es lo que permite medir
-- cuánto del checkout se cae.
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  status            public.order_status not null default 'pending',
  theme_id          uuid not null references public.themes (id),
  -- La versión vigente al momento de comprar: es lo que se vendió.
  theme_version_id  uuid not null,
  currency          char(3) not null default 'ARS',
  list_price_cents  integer not null check (list_price_cents > 0),
  discount_cents    integer not null default 0 check (discount_cents >= 0),
  amount_cents      integer not null check (amount_cents >= 0),
  coupon_id         uuid references public.coupons (id) on delete set null,
  -- Copia del código tal como se aplicó (el cupón puede editarse después).
  coupon_code       text,
  affiliate_id      uuid references public.affiliates (id) on delete set null,
  buyer_name        text not null check (length(buyer_name) between 2 and 120),
  buyer_email       text not null check (buyer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(buyer_email) <= 254),
  buyer_phone       text check (length(buyer_phone) <= 40),
  payment_provider  text not null check (payment_provider in ('mercadopago', 'fake', 'free')),
  mp_preference_id  text,
  mp_payment_id     text,
  -- Último estado informado por el proveedor (approved, pending, rejected…).
  provider_status   text,
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint orders_amount_math check (amount_cents = list_price_cents - discount_cents),
  constraint orders_paid_at check ((status in ('paid', 'refunded')) = (paid_at is not null)),
  constraint orders_version_fk foreign key (theme_version_id, theme_id)
    references public.theme_versions (id, theme_id)
);

create unique index orders_provider_payment_uidx on public.orders (payment_provider, mp_payment_id)
  where mp_payment_id is not null;
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_paid_at_idx on public.orders (paid_at desc) where status = 'paid';
create index orders_buyer_email_idx on public.orders (lower(buyer_email));
create index orders_coupon_idx on public.orders (coupon_id) where coupon_id is not null;

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- Bitácora de notificaciones de pago. La unicidad por (proveedor, pago,
-- estado) hace idempotente el webhook: Mercado Pago reintenta, y el mismo
-- aviso procesado dos veces no puede crear dos Boxies.
create table public.payment_events (
  id                  bigint generated always as identity primary key,
  order_id            uuid references public.orders (id) on delete set null,
  provider            text not null,
  provider_payment_id text not null,
  status              text not null,
  source              text not null check (source in ('webhook', 'return', 'admin', 'checkout')),
  outcome             text,
  raw                 jsonb not null default '{}'::jsonb,
  received_at         timestamptz not null default now(),
  unique (provider, provider_payment_id, status)
);

create index payment_events_order_idx on public.payment_events (order_id, received_at desc);

-- ── Producto ────────────────────────────────────────────────────────────────

create table public.boxies (
  id                   uuid primary key default gen_random_uuid(),
  -- Referencia corta para soporte ("mi Boxie es la K7M2-Q9XD"). NO es una
  -- credencial: el acceso siempre es por token.
  code                 text not null unique check (code ~ '^[2-9A-HJ-NP-Z]{8}$'),
  order_id             uuid not null unique references public.orders (id) on delete restrict,
  theme_version_id     uuid not null references public.theme_versions (id),
  status               public.boxie_status not null default 'active',
  -- Tokens: en la base solo está el hash (para buscar). Un volcado de la base
  -- no alcanza para abrir ni editar ninguna Boxie.
  gift_token_hash      text not null unique,
  -- Copia cifrada (AES-256-GCM, clave fuera de la base) para poder volver a
  -- mostrarle el link del regalo al comprador.
  gift_token_enc       text not null,
  edit_token_hash      text not null unique,
  -- Clave opcional que el comprador puede exigirle al destinatario (scrypt).
  gift_password_hash   text,
  recipient_name       text not null default '' check (length(recipient_name) <= 40),
  sender_name          text not null default '' check (length(sender_name) <= 40),
  locked_at            timestamptz,
  -- Antes del bloqueo: fin de la ventana de edición. Después: vencimiento del regalo.
  expires_at           timestamptz not null,
  access_email_sent_at timestamptz,
  gift_email_sent_at   timestamptz,
  first_opened_at      timestamptz,
  open_count           integer not null default 0 check (open_count >= 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index boxies_created_at_idx on public.boxies (created_at desc);
create index boxies_recipient_idx on public.boxies (lower(recipient_name));

create trigger boxies_updated_at before update on public.boxies
  for each row execute function public.set_updated_at();

-- Capa 2 del motor de temáticas: lo que carga el comprador, por slide.
create table public.boxie_content (
  boxie_id   uuid not null references public.boxies (id) on delete cascade,
  slide_key  text not null check (slide_key ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
  props      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (boxie_id, slide_key)
);

create trigger boxie_content_updated_at before update on public.boxie_content
  for each row execute function public.set_updated_at();

create table public.media_assets (
  id         uuid primary key default gen_random_uuid(),
  owner_type public.media_owner not null,
  owner_id   uuid not null,
  bucket     text not null,
  path       text not null,
  mime       text not null,
  bytes      integer not null check (bytes > 0),
  width      integer check (width > 0),
  height     integer check (height > 0),
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

create index media_assets_owner_idx on public.media_assets (owner_type, owner_id);

-- ── Configuración ───────────────────────────────────────────────────────────
-- Una sola fila. Lo que el dueño ajusta sin deploy.

create table public.settings (
  id                         boolean primary key default true check (id),
  base_price_cents           integer not null check (base_price_cents > 0),
  currency                   char(3) not null default 'ARS',
  gift_lifetime_days         integer not null default 60 check (gift_lifetime_days between 1 and 3650),
  -- Oferta de urgencia de la ficha de producto (cupón que se ofrece a los N segundos).
  offer_coupon_id            uuid references public.coupons (id) on delete set null,
  offer_delay_seconds        integer not null default 15 check (offer_delay_seconds between 0 and 600),
  updated_at                 timestamptz not null default now()
);

create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();
