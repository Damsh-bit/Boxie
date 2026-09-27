-- ════════════════════════════════════════════════════════════════════════════
-- Boxie · Marketing
--
-- Lo que necesita la sección de Marketing del panel (/admin/marketing):
--
--   · marketing_campaigns: las campañas (Meta, Google, TikTok, creadoras,
--     afiliados, mails…) con su utm_campaign, fechas, presupuesto y cupón.
--   · marketing_spend: lo que reporta el administrador de anuncios por día
--     (inversión, impresiones, clics, compras que dice la plataforma).
--   · marketing_traffic: visitas del sitio AGREGADAS por día, origen,
--     dispositivo y página de entrada (no hay una fila por persona) y cuántas
--     de esas visitas llegaron a una temática y al checkout.
--   · order_attribution: de dónde vino cada orden (primer y último toque).
--   · marketing_settings: presupuesto del mes, margen objetivo y modelo de
--     atribución por defecto.
--
-- El sitio escribe con el service role (la ruta /api/marketing/track y el
-- checkout); el panel lee y escribe con el service role después de validar
-- sesión y rol. anon no ve ni escribe nada. Es aditiva: sin estas tablas el
-- sitio y el panel siguen andando (el panel avisa que falta la migración).
-- ════════════════════════════════════════════════════════════════════════════

create table public.marketing_settings (
  id                   boolean primary key default true check (id),
  monthly_budget_cents bigint not null default 0 check (monthly_budget_cents >= 0),
  target_margin_bps    integer not null default 2500 check (target_margin_bps between 0 and 9000),
  default_model        text not null default 'last' check (default_model in ('last', 'first', 'linear')),
  updated_at           timestamptz not null default now()
);
insert into public.marketing_settings default values;

create trigger marketing_settings_updated_at before update on public.marketing_settings
  for each row execute function public.set_updated_at();

create table public.marketing_campaigns (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (length(name) between 2 and 120),
  channel            text not null check (channel in (
                       'meta', 'google', 'tiktok', 'influencers', 'afiliados',
                       'email', 'whatsapp', 'social', 'otros')),
  objective          text not null default 'ventas'
                     check (objective in ('ventas', 'remarketing', 'trafico', 'alcance', 'marca')),
  status             text not null default 'active' check (status in ('draft', 'active', 'paused')),
  -- El utm_campaign de sus links: así se le atribuyen visitas y ventas.
  utm_campaign       text not null unique
                     check (utm_campaign ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(utm_campaign) <= 80),
  starts_on          date not null,
  ends_on            date check (ends_on is null or ends_on >= starts_on),
  daily_budget_cents bigint not null default 0 check (daily_budget_cents >= 0),
  theme_id           uuid references public.themes (id) on delete set null,
  -- Las ventas con este cupón cuentan para la campaña.
  coupon_id          uuid references public.coupons (id) on delete set null,
  audience           text not null default '' check (length(audience) <= 300),
  notes              text not null default '' check (length(notes) <= 2000),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index marketing_campaigns_coupon_idx on public.marketing_campaigns (coupon_id)
  where coupon_id is not null;

create trigger marketing_campaigns_updated_at before update on public.marketing_campaigns
  for each row execute function public.set_updated_at();

create table public.marketing_spend (
  id                   uuid primary key default gen_random_uuid(),
  campaign_id          uuid not null references public.marketing_campaigns (id) on delete cascade,
  day                  date not null,
  spend_cents          bigint not null default 0 check (spend_cents >= 0),
  impressions          bigint not null default 0 check (impressions >= 0),
  clicks               bigint not null default 0 check (clicks >= 0),
  platform_conversions integer not null default 0 check (platform_conversions >= 0),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (campaign_id, day)
);

create index marketing_spend_day_idx on public.marketing_spend (day);

create trigger marketing_spend_updated_at before update on public.marketing_spend
  for each row execute function public.set_updated_at();

create table public.marketing_traffic (
  day         date not null,
  source      text not null check (length(source) between 1 and 100),
  medium      text not null default '' check (length(medium) <= 100),
  campaign    text not null default '' check (length(campaign) <= 100),
  device      text not null check (device in ('mobile', 'tablet', 'desktop')),
  landing     text not null check (landing ~ '^/[a-z0-9/-]{0,79}$'),
  sessions    integer not null default 0 check (sessions >= 0),
  theme_views integer not null default 0 check (theme_views >= 0),
  checkouts   integer not null default 0 check (checkouts >= 0),
  primary key (day, source, medium, campaign, device, landing)
);

create table public.order_attribution (
  order_id       uuid primary key references public.orders (id) on delete cascade,
  first_source   text check (length(first_source) between 1 and 100),
  first_medium   text check (length(first_medium) <= 100),
  first_campaign text check (length(first_campaign) <= 100),
  first_content  text check (length(first_content) <= 100),
  first_term     text check (length(first_term) <= 100),
  first_landing  text check (first_landing ~ '^/[a-z0-9/-]{0,79}$'),
  first_at       timestamptz,
  last_source    text check (length(last_source) between 1 and 100),
  last_medium    text check (length(last_medium) <= 100),
  last_campaign  text check (length(last_campaign) <= 100),
  last_content   text check (length(last_content) <= 100),
  last_term      text check (length(last_term) <= 100),
  last_landing   text check (last_landing ~ '^/[a-z0-9/-]{0,79}$'),
  last_at        timestamptz,
  device         text check (device in ('mobile', 'tablet', 'desktop')),
  created_at     timestamptz not null default now(),
  check ((first_source is null) = (first_at is null)),
  check ((last_source is null) = (last_at is null))
);

-- ── Contar una visita (o un paso del embudo) ──────────────────────────────
-- Suma 1 en la fila del día y origen de la visita, en una sola operación
-- (dos visitas al mismo tiempo no se pisan).
create function public.marketing_track(
  p_day      date,
  p_source   text,
  p_medium   text,
  p_campaign text,
  p_device   text,
  p_landing  text,
  p_step     text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_step not in ('session', 'theme', 'checkout') then
    raise exception 'Paso desconocido: %', p_step;
  end if;
  insert into public.marketing_traffic as t
    (day, source, medium, campaign, device, landing, sessions, theme_views, checkouts)
  values (
    p_day, p_source, coalesce(p_medium, ''), coalesce(p_campaign, ''), p_device, p_landing,
    (p_step = 'session')::int, (p_step = 'theme')::int, (p_step = 'checkout')::int
  )
  on conflict (day, source, medium, campaign, device, landing) do update set
    sessions    = t.sessions + excluded.sessions,
    theme_views = t.theme_views + excluded.theme_views,
    checkouts   = t.checkouts + excluded.checkouts;
end;
$$;

-- ── Permisos ──────────────────────────────────────────────────────────────
alter table public.marketing_settings  enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.marketing_spend     enable row level security;
alter table public.marketing_traffic   enable row level security;
alter table public.order_attribution   enable row level security;

-- Los admins leen y escriben (el panel usa el service role, pero la regla
-- queda para cualquier cliente autenticado del equipo).
create policy marketing_settings_admin on public.marketing_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy marketing_campaigns_admin on public.marketing_campaigns
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy marketing_spend_admin on public.marketing_spend
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy marketing_traffic_admin on public.marketing_traffic
  for select to authenticated using ((select public.is_admin()));
create policy order_attribution_admin on public.order_attribution
  for select to authenticated using ((select public.is_admin()));

revoke all on public.marketing_settings, public.marketing_campaigns, public.marketing_spend,
  public.marketing_traffic, public.order_attribution from anon;

revoke execute on function public.marketing_track(date, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.marketing_track(date, text, text, text, text, text, text)
  to service_role;
