-- ════════════════════════════════════════════════════════════════════════════
-- Boxie · Soporte
--
-- Los tickets que se abren desde el botón de ayuda del sitio y la
-- conversación con el equipo (chat en el panel, /admin/soporte).
--
--   · El cliente no tiene cuenta: cada ticket tiene un token de acceso (se
--     guarda solo el hash). El navegador lo guarda en una cookie httpOnly y el
--     mail de confirmación trae un link para seguir desde otro dispositivo.
--   · El servidor usa el service role (cada ruta valida el token o la sesión
--     del panel); anon no ve ni escribe nada.
--   · Los mensajes son inmutables. Publicar un mensaje y actualizar el ticket
--     (estado, tiempos, primera respuesta) es una sola operación atómica:
--     support_post_message.
--
-- Además: la tienda (anon) deja de poder leer las columnas de rentabilidad de
-- `settings` (comisiones, impuestos, meta del mes): solo las públicas.
-- ════════════════════════════════════════════════════════════════════════════

create type public.support_topic as enum ('boxie', 'error', 'pago', 'otro');
create type public.support_status as enum ('open', 'pending', 'resolved', 'closed');
create type public.support_priority as enum ('baja', 'normal', 'alta', 'urgente');

-- Número para hablar del ticket ("#1042"): corto y correlativo.
create sequence public.support_ticket_number start 1001;

create table public.support_tickets (
  id                       uuid primary key default gen_random_uuid(),
  number                   integer not null unique default nextval('public.support_ticket_number'),
  topic                    public.support_topic not null,
  status                   public.support_status not null default 'open',
  priority                 public.support_priority not null default 'normal',
  subject                  text not null check (length(subject) between 1 and 120),
  customer_name            text not null check (length(customer_name) between 1 and 80),
  customer_email           text not null check (length(customer_email) between 3 and 254),
  -- El código que escribió el cliente; la Boxie y la orden, si existe.
  boxie_code               text check (boxie_code is null or boxie_code ~ '^[2-9A-HJ-NP-Z]{8}$'),
  boxie_id                 uuid references public.boxies (id) on delete set null,
  order_id                 uuid references public.orders (id) on delete set null,
  -- Mail del admin que lo atiende (texto: no ata el ticket a una cuenta).
  assignee                 text check (assignee is null or length(assignee) <= 254),
  -- Página, navegador y pantalla de un reporte de error (con permiso del cliente).
  context                  jsonb not null default '{}'::jsonb
                           check (jsonb_typeof(context) = 'object' and pg_column_size(context) <= 4096),
  -- SHA-256 (hex) del token de acceso del cliente (para buscar) y una copia
  -- cifrada (AES-256-GCM, clave fuera de la base) para volver a mandarle su
  -- link en cada respuesta, como el link del regalo. Ni el panel las lee.
  access_token_hash        text not null unique check (access_token_hash ~ '^[0-9a-f]{64}$'),
  access_token_enc         text check (access_token_enc is null or length(access_token_enc) <= 200),
  rating                   text check (rating in ('good', 'bad')),
  first_response_at        timestamptz,
  resolved_at              timestamptz,
  last_message_at          timestamptz not null default now(),
  last_customer_message_at timestamptz,
  last_agent_message_at    timestamptz,
  customer_read_at         timestamptz,
  agent_read_at            timestamptz,
  -- Último aviso por mail (para no mandar uno por mensaje).
  customer_notified_at     timestamptz,
  team_notified_at         timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index support_tickets_inbox_idx on public.support_tickets (status, last_message_at desc);
create index support_tickets_email_idx on public.support_tickets (lower(customer_email));
create index support_tickets_updated_idx on public.support_tickets (updated_at);
create index support_tickets_boxie_idx on public.support_tickets (boxie_id) where boxie_id is not null;

create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table public.support_messages (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.support_tickets (id) on delete cascade,
  author       text not null check (author in ('customer', 'agent', 'system')),
  author_name  text not null check (length(author_name) between 1 and 80),
  -- Del equipo: quién respondió (bitácora). Del cliente: null.
  author_email text check (author_email is null or length(author_email) <= 254),
  body         text not null check (length(body) between 1 and 4000),
  -- Nota interna del equipo: el cliente nunca la ve.
  internal     boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint support_messages_internal_agents check (not internal or author = 'agent')
);

create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);
create index support_messages_created_idx on public.support_messages (created_at);

-- Lo que se dijo no se edita (se borra solo con el ticket).
create function public.forbid_support_message_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Los mensajes de soporte no se editan' using errcode = 'check_violation';
end
$$;

create trigger support_messages_immutable before update on public.support_messages
  for each row execute function public.forbid_support_message_update();

-- ── Publicar un mensaje ─────────────────────────────────────────────────────
-- Inserta el mensaje y actualiza el ticket en la misma transacción:
--   · cliente: vuelve a quedar del lado del equipo (open); una cerrada no se reabre.
--   · equipo: por defecto queda esperando al cliente (pending); la primera
--     respuesta pública queda registrada; una nota interna no cambia el estado.
--   · p_status fuerza el estado (responder y resolver en un paso).

create function public.support_post_message(
  p_ticket_id    uuid,
  p_author       text,
  p_author_name  text,
  p_body         text,
  p_author_email text default null,
  p_internal     boolean default false,
  p_status       public.support_status default null
)
returns public.support_messages
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.support_status;
  v_message public.support_messages%rowtype;
  v_status  public.support_status;
begin
  if not public.is_admin_or_service() then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;

  -- Solo el estado: el panel no puede leer el hash del token (ni hace falta).
  select t.status into v_current from public.support_tickets t where t.id = p_ticket_id for update;
  if v_current is null then
    raise exception 'La consulta no existe' using errcode = 'no_data_found';
  end if;

  if p_author = 'customer' then
    if v_current = 'closed' then
      raise exception 'Esta consulta está cerrada. Abrí una nueva y te ayudamos.'
        using errcode = 'check_violation';
    end if;
    v_status := 'open';
  elsif p_author = 'agent' then
    v_status := coalesce(p_status, case when p_internal then v_current else 'pending' end);
  else
    v_status := coalesce(p_status, v_current);
  end if;

  insert into public.support_messages (ticket_id, author, author_name, author_email, body, internal)
  values (p_ticket_id, p_author, p_author_name, p_author_email, p_body, coalesce(p_internal, false))
  returning * into v_message;

  update public.support_tickets t
     set status                   = v_status,
         last_message_at          = case when v_message.internal then t.last_message_at else v_message.created_at end,
         last_customer_message_at = case when p_author = 'customer' then v_message.created_at else t.last_customer_message_at end,
         last_agent_message_at    = case when p_author = 'agent' and not v_message.internal
                                         then v_message.created_at else t.last_agent_message_at end,
         first_response_at        = case when p_author = 'agent' and not v_message.internal
                                         then coalesce(t.first_response_at, v_message.created_at)
                                         else t.first_response_at end,
         -- Quien escribe ya leyó todo lo anterior.
         customer_read_at         = case when p_author = 'customer' then v_message.created_at else t.customer_read_at end,
         agent_read_at            = case when p_author = 'agent' then v_message.created_at else t.agent_read_at end,
         resolved_at              = case when v_status = 'resolved' then coalesce(t.resolved_at, now())
                                         when v_status in ('open', 'pending') then null
                                         else t.resolved_at end
   where t.id = p_ticket_id;

  return v_message;
end
$$;

-- ── RLS y permisos ──────────────────────────────────────────────────────────

alter table public.support_tickets  enable row level security;
alter table public.support_messages enable row level security;

-- Solo el equipo (el servidor usa el service role, que no pasa por RLS).
create policy support_tickets_admin_select on public.support_tickets
  for select to authenticated using ((select public.is_admin()));
create policy support_tickets_admin_update on public.support_tickets
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy support_messages_admin_select on public.support_messages
  for select to authenticated using ((select public.is_admin()));
create policy support_messages_admin_insert on public.support_messages
  for insert to authenticated with check ((select public.is_admin()) and author = 'agent');

-- Anónimos: nada. El hash del token no lo ve ni el panel por la API.
revoke all on public.support_tickets, public.support_messages from anon;
revoke all on sequence public.support_ticket_number from anon;
revoke select, insert, update, delete on public.support_tickets from authenticated;
grant select (
  id, number, topic, status, priority, subject, customer_name, customer_email, boxie_code,
  boxie_id, order_id, assignee, context, rating, first_response_at, resolved_at, last_message_at,
  last_customer_message_at, last_agent_message_at, customer_read_at, agent_read_at,
  customer_notified_at, team_notified_at, created_at, updated_at
) on public.support_tickets to authenticated;
grant update (
  status, priority, assignee, agent_read_at, first_response_at, resolved_at, last_message_at,
  last_customer_message_at, last_agent_message_at, customer_read_at
) on public.support_tickets to authenticated;
revoke update, delete, truncate on public.support_messages from authenticated;

revoke execute on function public.support_post_message(uuid, text, text, text, text, boolean, public.support_status)
  from public, anon;
grant execute on function public.support_post_message(uuid, text, text, text, text, boolean, public.support_status)
  to authenticated, service_role;

-- ── Configuración: la tienda lee solo lo público ────────────────────────────
-- La clave anónima es pública (va en el navegador). Con `select *` cualquiera
-- podía leer la meta de facturación, las comisiones y los costos. Un REVOKE
-- por columna no alcanza con permiso sobre la tabla: se revoca la tabla y se
-- otorgan las columnas públicas una por una.
revoke select on public.settings from anon;
grant select (
  id, base_price_cents, currency, gift_lifetime_days, sales_paused, business_name,
  support_email, whatsapp, instagram, updated_at
) on public.settings to anon;
