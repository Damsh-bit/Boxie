-- ════════════════════════════════════════════════════════════════════════════
-- Boxie · Panel de administración (backoffice)
--
-- Lo que el panel necesita además del esquema base:
--   · Planes (el mismo regalo en niveles de precio) y el plan de cada orden.
--   · Gastos fijos y parámetros de rentabilidad (comisiones, impuestos, meta).
--   · Bitácora de cambios del panel (inmutable).
--   · Tablero de tareas del equipo.
--   · Roles del equipo (dueño, administrador, editor, soporte).
--   · Datos del negocio, pausa de ventas y detalles de temáticas/afiliados.
--
-- Todo es aditivo: columnas con default y tablas nuevas. La app sigue
-- funcionando igual si no hay planes cargados (cobra el precio base).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Equipo ──────────────────────────────────────────────────────────────────

-- Nota: el tipo public.admin_role y la tabla public.users con todas las
-- columnas del equipo (email, name, role, phone, avatar_url, is_active,
-- preferences, invited_at, last_seen_at) vienen de core_schema.

-- El rol del usuario de la sesión (null si no es admin).
create function public.admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.users where user_id = (select auth.uid()) and role is not null
$$;

-- Solo el dueño administra el equipo (la lectura ya la tienen todos los admins).
create policy users_owner_insert on public.users
  for insert to authenticated with check ((select public.admin_role()) = 'owner');
create policy users_owner_update on public.users
  for update to authenticated
  using ((select public.admin_role()) = 'owner')
  with check ((select public.admin_role()) = 'owner');
create policy users_owner_delete on public.users
  for delete to authenticated using ((select public.admin_role()) = 'owner');

-- Nunca queda el equipo sin dueño.
create function public.keep_one_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and (new.role is null or new.role <> 'owner')) then
    if not exists (
      select 1 from public.users where role = 'owner' and user_id <> old.user_id
    ) then
      raise exception 'Tiene que quedar al menos un dueño' using errcode = 'check_violation';
    end if;
  end if;
  return coalesce(new, old);
end
$$;

create trigger users_keep_owner before update or delete on public.users
  for each row execute function public.keep_one_owner();

-- ── Planes ──────────────────────────────────────────────────────────────────

create table public.plans (
  id                 uuid primary key default gen_random_uuid(),
  -- Las slides de las temáticas guardan este slug (`plan` en la configuración).
  slug               text not null unique
                     check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 40),
  name               text not null check (length(name) between 2 and 40),
  tagline            text not null default '' check (length(tagline) <= 80),
  price_cents        integer not null check (price_cents > 0),
  compare_at_cents   integer check (compare_at_cents is null or compare_at_cents > price_cents),
  rank               integer not null check (rank between 1 and 20),
  color              text not null default '#F44E63' check (color ~ '^#[0-9a-fA-F]{6}$'),
  features           jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  gift_lifetime_days integer not null default 60 check (gift_lifetime_days between 1 and 3650),
  max_photos         integer not null default 30 check (max_photos between 0 and 30),
  allow_password     boolean not null default true,
  highlighted        boolean not null default false,
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Un solo plan destacado ("el más elegido") entre los activos.
create unique index plans_one_highlighted on public.plans (highlighted) where highlighted and active;

create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- El plan que se compró. Null en las órdenes anteriores a los planes.
alter table public.orders
  add column plan_id uuid references public.plans (id) on delete restrict;
create index orders_plan_idx on public.orders (plan_id) where plan_id is not null;

-- ── Temáticas y afiliados ───────────────────────────────────────────────────

alter table public.themes
  add column origin text not null default 'manual'
    check (origin in ('seed', 'generator', 'manual', 'duplicate'));

update public.themes set origin = 'seed' where slug in ('pareja', 'cumpleanos', 'amistad');

alter table public.affiliates
  add column email text not null default '' check (length(email) <= 254),
  add column notes text not null default '' check (length(notes) <= 500);

-- ── Configuración ───────────────────────────────────────────────────────────

alter table public.settings
  -- Rentabilidad (puntos básicos: 629 = 6,29 %).
  add column gateway_fee_bps     integer not null default 629 check (gateway_fee_bps between 0 and 5000),
  add column gateway_vat_bps     integer not null default 2100 check (gateway_vat_bps between 0 and 5000),
  add column gateway_fixed_cents integer not null default 0 check (gateway_fixed_cents >= 0),
  add column tax_bps             integer not null default 350 check (tax_bps between 0 and 5000),
  add column variable_cost_cents integer not null default 2500 check (variable_cost_cents >= 0),
  add column monthly_goal_cents  bigint not null default 0 check (monthly_goal_cents >= 0),
  -- Datos del negocio.
  add column business_name       text not null default 'Boxie Digital' check (length(business_name) between 1 and 80),
  add column support_email       text not null default 'ayuda@boxiedigital.com.ar' check (length(support_email) <= 254),
  add column whatsapp            text not null default '' check (length(whatsapp) <= 40),
  add column instagram           text not null default '@boxie.app' check (length(instagram) <= 40),
  -- Pausa de ventas: el checkout avisa y no cobra.
  add column sales_paused        boolean not null default false;

-- ── Gastos ──────────────────────────────────────────────────────────────────

create type public.expense_category as enum (
  'infraestructura', 'marketing', 'herramientas', 'equipo', 'impuestos', 'otros'
);

create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  category     public.expense_category not null,
  description  text not null check (length(description) between 2 and 120),
  vendor       text not null default '' check (length(vendor) <= 80),
  amount_cents bigint not null check (amount_cents >= 0),
  -- monthly: todos los meses desde starts_on (hasta ends_on). once: un pago en starts_on.
  recurrence   text not null check (recurrence in ('monthly', 'once')),
  starts_on    date not null,
  ends_on      date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint expenses_window check (ends_on is null or ends_on >= starts_on),
  constraint expenses_once_has_no_end check (recurrence = 'monthly' or ends_on is null)
);

create trigger expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

-- ── Bitácora ────────────────────────────────────────────────────────────────
-- Quién hizo qué en el panel. Inmutable: no se edita ni se borra.

create table public.admin_audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,
  actor_email text not null check (length(actor_email) <= 254),
  action      text not null check (length(action) between 1 and 60),
  entity      text not null check (length(entity) between 1 and 30),
  entity_id   text check (entity_id is null or length(entity_id) <= 64),
  summary     text not null check (length(summary) between 1 and 300)
);

create index admin_audit_log_at_idx on public.admin_audit_log (at desc);

create function public.forbid_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'La bitácora es inmutable' using errcode = 'check_violation';
end
$$;

create trigger admin_audit_log_immutable before update or delete on public.admin_audit_log
  for each row execute function public.forbid_audit_mutation();

-- ── Tareas ──────────────────────────────────────────────────────────────────

create type public.task_status as enum ('todo', 'doing', 'done');
create type public.task_priority as enum ('alta', 'media', 'baja');

create table public.admin_tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(title) between 2 and 120),
  description text not null default '' check (length(description) <= 2000),
  status      public.task_status not null default 'todo',
  priority    public.task_priority not null default 'media',
  -- Mail del responsable (un admin; texto libre para no atar la tarea a una cuenta).
  assignee    text check (assignee is null or length(assignee) <= 254),
  tags        text[] not null default '{}' check (cardinality(tags) <= 6),
  due_on      date,
  position    integer not null default 0,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index admin_tasks_board_idx on public.admin_tasks (status, position);

create trigger admin_tasks_updated_at before update on public.admin_tasks
  for each row execute function public.set_updated_at();

-- ── Analítica por plan ──────────────────────────────────────────────────────

create function public.admin_plan_ranking(p_from timestamptz, p_to timestamptz)
returns table (plan_id uuid, plan_name text, orders_paid bigint, revenue_cents bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin_or_service() then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;

  return query
  select p.id, p.name, count(*), sum(o.amount_cents)::bigint
    from public.orders o
    join public.plans p on p.id = o.plan_id
   where o.status = 'paid' and o.paid_at >= p_from and o.paid_at < p_to
   group by p.id, p.name
   order by sum(o.amount_cents) desc;
end
$$;

-- ── Días online según el plan ───────────────────────────────────────────────
-- Al bloquear, el regalo queda disponible los días del plan que se compró
-- (sin plan, los de la configuración general, como antes).

create or replace function public.lock_boxie(p_boxie_id uuid)
returns public.boxies
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_boxie public.boxies%rowtype;
begin
  update public.boxies b
     set locked_at = now(),
         expires_at = now() + make_interval(days => coalesce(
           (select p.gift_lifetime_days
              from public.orders o
              join public.plans p on p.id = o.plan_id
             where o.id = b.order_id),
           (select s.gift_lifetime_days from public.settings s where s.id)
         ))
   where b.id = p_boxie_id
     and b.locked_at is null
     and b.status = 'active'
     and b.expires_at > now()
  returning * into v_boxie;

  if v_boxie.id is null then
    raise exception 'La Boxie no se puede bloquear (ya está bloqueada, vencida o reembolsada)'
      using errcode = 'check_violation';
  end if;
  return v_boxie;
end
$$;

-- ── Estadísticas por Boxie ──────────────────────────────────────────────────
-- Lo que el panel muestra de cada Boxie sin leer su contenido: cuándo se editó
-- por última vez, cuántas slides tienen algo cargado, cuántas fotos y si tiene
-- clave. Solo el servidor (service role): lee columnas que el panel no ve.

create view public.admin_boxie_stats
with (security_invoker = true) as
select b.id as boxie_id,
       (select max(c.updated_at) from public.boxie_content c where c.boxie_id = b.id) as last_edited_at,
       (select count(*) from public.boxie_content c
         where c.boxie_id = b.id and c.props <> '{}'::jsonb)::integer as filled_slides,
       (select count(*) from public.media_assets m
         where m.owner_type = 'boxie' and m.owner_id = b.id)::integer as photos,
       (b.gift_password_hash is not null) as has_password
  from public.boxies b;

revoke all on public.admin_boxie_stats from public, anon, authenticated;
grant select on public.admin_boxie_stats to service_role;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.plans           enable row level security;
alter table public.expenses        enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.admin_tasks     enable row level security;

-- Los planes activos son públicos (la tienda los muestra); el resto, solo admins.
create policy plans_select on public.plans
  for select to anon, authenticated using (active or (select public.is_admin()));
create policy plans_admin_write on public.plans
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy expenses_admin on public.expenses
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy admin_tasks_admin on public.admin_tasks
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- La bitácora se lee entre admins y cada uno escribe solo a su nombre.
create policy admin_audit_log_select on public.admin_audit_log
  for select to authenticated using ((select public.is_admin()));
create policy admin_audit_log_insert on public.admin_audit_log
  for insert to authenticated
  with check ((select public.is_admin()) and actor_id = (select auth.uid()));

-- Anónimos: nada de gastos, tareas ni bitácora (sin política = sin filas) y
-- tampoco escritura en planes.
revoke insert, update, delete, truncate on public.plans from anon;
revoke insert, update, delete, truncate on public.expenses, public.admin_tasks, public.admin_audit_log from anon;

revoke execute on function public.admin_role() from public, anon;
revoke execute on function public.admin_plan_ranking(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_role() to authenticated, service_role;
grant execute on function public.admin_plan_ranking(timestamptz, timestamptz) to authenticated, service_role;
