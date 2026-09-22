-- ════════════════════════════════════════════════════════════════════════════
-- Boxie · Funciones
--
-- Lo que tiene que ser atómico vive acá, en una transacción de Postgres, y no
-- repartido en varias llamadas desde la app: marcar una orden como pagada,
-- sumar el uso del cupón y crear la Boxie pasan juntos o no pasan.
--
-- Supabase le da EXECUTE a anon/authenticated sobre toda función nueva de
-- `public`. Cada función privilegiada lo revoca explícitamente al final.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Roles ───────────────────────────────────────────────────────────────────

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  )
$$;

-- El servidor usa el service role; el panel, la sesión del admin.
create function public.is_admin_or_service()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user = 'service_role' or public.is_admin()
$$;

-- ── Boxies ──────────────────────────────────────────────────────────────────

-- Código corto de soporte: 8 caracteres de un alfabeto de 32 sin ambiguos
-- (sin 0/O, 1/I). 32 divide a 256, así que `byte % 32` no tiene sesgo.
create function public.generate_boxie_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  bytes bytea;
  candidate text;
  i integer;
begin
  loop
    -- 16 bytes aleatorios de un UUIDv4; se saltean los bytes 6 y 8, que
    -- llevan los bits fijos de versión y variante.
    bytes := uuid_send(gen_random_uuid());
    candidate := '';
    foreach i in array array[0, 1, 2, 3, 4, 5, 9, 10] loop
      candidate := candidate || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.boxies where code = candidate);
  end loop;
  return candidate;
end
$$;

-- ── Pagos ───────────────────────────────────────────────────────────────────
--
-- Aplica un aviso de pago (webhook, retorno del checkout o acción del admin).
--
-- Idempotencia: el evento se inserta con unicidad (proveedor, pago, estado)
-- en la misma transacción que el cambio de estado. Si algo falla, se revierte
-- todo y el reintento del proveedor vuelve a procesarlo; si ya se procesó, el
-- insert no inserta y la función sale sin tocar nada.
--
-- Los tokens de la Boxie los genera la app (el cifrado usa una clave que no
-- vive en la base). Solo se usan si esta llamada es la que crea la Boxie.
--
-- `p_status` llega normalizado por la app:
--   approved · pending · rejected · cancelled · refunded · charged_back

create function public.apply_payment(
  p_order_id        uuid,
  p_provider        text,
  p_payment_id      text,
  p_status          text,
  p_amount_cents    integer,
  p_currency        text,
  p_source          text,
  p_raw             jsonb,
  p_gift_token_hash text,
  p_gift_token_enc  text,
  p_edit_token_hash text
)
returns table (outcome text, boxie_id uuid, created boolean)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_order     public.orders%rowtype;
  v_event_id  bigint;
  v_boxie_id  uuid;
  v_lifetime  integer;
  v_outcome   text;
begin
  select * into v_order from public.orders where id = p_order_id for update;

  insert into public.payment_events (order_id, provider, provider_payment_id, status, source, raw)
  values (case when found then p_order_id end, p_provider, p_payment_id, p_status, p_source, coalesce(p_raw, '{}'::jsonb))
  on conflict (provider, provider_payment_id, status) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return query
      select 'duplicate'::text, (select b.id from public.boxies b where b.order_id = p_order_id), false;
    return;
  end if;

  if v_order.id is null then
    v_outcome := 'order_not_found';

  elsif p_status = 'approved' then
    if v_order.status in ('paid', 'refunded') then
      -- Mismo pago avisado por otro canal, o un segundo pago de la misma orden
      -- (hay que devolverlo a mano: queda registrado para el admin).
      v_outcome := case when v_order.mp_payment_id = p_payment_id then 'already_paid' else 'double_payment' end;
    elsif v_order.status = 'cancelled' then
      v_outcome := 'order_cancelled';
    elsif p_amount_cents is distinct from v_order.amount_cents
       or upper(p_currency) is distinct from v_order.currency then
      -- Nunca se entrega una Boxie por un monto distinto al calculado en el servidor.
      update public.orders set provider_status = 'amount_mismatch' where id = v_order.id;
      v_outcome := 'amount_mismatch';
    else
      update public.orders
         set status = 'paid', paid_at = now(), mp_payment_id = p_payment_id, provider_status = p_status
       where id = v_order.id;

      if v_order.coupon_id is not null then
        update public.coupons set used_count = used_count + 1 where id = v_order.coupon_id;
      end if;

      select s.gift_lifetime_days into v_lifetime from public.settings s where s.id;

      insert into public.boxies (
        code, order_id, theme_version_id, gift_token_hash, gift_token_enc, edit_token_hash,
        sender_name, expires_at
      ) values (
        public.generate_boxie_code(), v_order.id, v_order.theme_version_id,
        p_gift_token_hash, p_gift_token_enc, p_edit_token_hash,
        left(split_part(trim(v_order.buyer_name), ' ', 1), 40),
        now() + make_interval(days => coalesce(v_lifetime, 60))
      )
      returning id into v_boxie_id;

      update public.payment_events set outcome = 'paid' where id = v_event_id;
      return query select 'paid'::text, v_boxie_id, true;
      return;
    end if;

  elsif p_status in ('refunded', 'charged_back') then
    if v_order.status = 'paid' and v_order.mp_payment_id = p_payment_id then
      update public.orders set status = 'refunded', provider_status = p_status where id = v_order.id;
      update public.boxies set status = 'refunded' where order_id = v_order.id;
      v_outcome := 'refunded';
    else
      v_outcome := 'ignored';
    end if;

  else
    -- pending · in_process · rejected · cancelled: la orden sigue abierta (el
    -- comprador puede reintentar el pago). Solo se registra el último estado.
    if v_order.status = 'pending' then
      update public.orders set provider_status = p_status where id = v_order.id;
    end if;
    v_outcome := 'recorded';
  end if;

  update public.payment_events set outcome = v_outcome where id = v_event_id;
  return query
    select v_outcome, (select b.id from public.boxies b where b.order_id = p_order_id), false;
end
$$;

-- Bloquea la Boxie para regalar: desde acá corre el vencimiento del regalo.
create function public.lock_boxie(p_boxie_id uuid)
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
         expires_at = now() + make_interval(days => (select s.gift_lifetime_days from public.settings s where s.id))
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

create function public.register_gift_open(p_boxie_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.boxies
     set open_count = open_count + 1,
         first_opened_at = coalesce(first_opened_at, now())
   where id = p_boxie_id
$$;

-- Reembolso desde el panel: el dinero se devuelve en Mercado Pago; acá cambia
-- el estado y el player deja de mostrar el regalo.
create function public.admin_refund_boxie(p_boxie_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order_id uuid;
begin
  if not public.is_admin_or_service() then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;

  update public.boxies set status = 'refunded' where id = p_boxie_id returning order_id into v_order_id;
  if v_order_id is null then
    raise exception 'Boxie inexistente' using errcode = 'no_data_found';
  end if;

  update public.orders set status = 'refunded' where id = v_order_id and status = 'paid';

  insert into public.payment_events (order_id, provider, provider_payment_id, status, source, outcome)
  values (v_order_id, 'admin', v_order_id::text, 'refunded', 'admin', 'refunded')
  on conflict (provider, provider_payment_id, status) do nothing;
end
$$;

-- ── Temáticas ───────────────────────────────────────────────────────────────

-- Congela una configuración (ya validada por la app contra el registro de
-- slides) como nueva versión inmutable y la deja vigente.
create function public.publish_theme(p_theme_id uuid, p_config jsonb)
returns public.theme_versions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version public.theme_versions%rowtype;
  v_next    integer;
begin
  if not public.is_admin_or_service() then
    raise exception 'forbidden' using errcode = 'insufficient_privilege';
  end if;

  perform 1 from public.themes where id = p_theme_id for update;
  if not found then
    raise exception 'Temática inexistente' using errcode = 'no_data_found';
  end if;

  select coalesce(max(version), 0) + 1 into v_next
    from public.theme_versions where theme_id = p_theme_id;

  insert into public.theme_versions (theme_id, version, config, created_by)
  values (p_theme_id, v_next, p_config, (select auth.uid()))
  returning * into v_version;

  update public.themes
     set current_version_id = v_version.id,
         draft_config = p_config,
         status = case when status = 'draft' then 'published'::public.theme_status else status end
   where id = p_theme_id;

  return v_version;
end
$$;

-- ── Analítica del panel ─────────────────────────────────────────────────────
-- Lo que en Firestore era una arquitectura de contadores: GROUP BY.
-- Los días se cortan en hora argentina.

create function public.admin_kpis(p_from timestamptz, p_to timestamptz)
returns table (
  orders_created   bigint,
  orders_paid      bigint,
  revenue_cents    bigint,
  discount_cents   bigint,
  avg_ticket_cents bigint,
  boxies_locked    bigint,
  gifts_opened     bigint
)
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
  with created as (
    select count(*) as n from public.orders o where o.created_at >= p_from and o.created_at < p_to
  ),
  paid as (
    select count(*) as n,
           coalesce(sum(o.amount_cents), 0)::bigint as revenue,
           coalesce(sum(o.discount_cents), 0)::bigint as discount
      from public.orders o
     where o.status = 'paid' and o.paid_at >= p_from and o.paid_at < p_to
  )
  select created.n,
         paid.n,
         paid.revenue,
         paid.discount,
         case when paid.n > 0 then (paid.revenue / paid.n)::bigint else 0::bigint end,
         (select count(*) from public.boxies b where b.locked_at >= p_from and b.locked_at < p_to),
         (select count(*) from public.boxies b where b.first_opened_at >= p_from and b.first_opened_at < p_to)
    from created, paid;
end
$$;

create function public.admin_sales_by_day(p_from timestamptz, p_to timestamptz)
returns table (day date, orders_created bigint, orders_paid bigint, revenue_cents bigint)
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
  with days as (
    select generate_series(
      (p_from at time zone 'America/Argentina/Buenos_Aires')::date,
      ((p_to - interval '1 microsecond') at time zone 'America/Argentina/Buenos_Aires')::date,
      interval '1 day'
    )::date as day
  ),
  created as (
    select (o.created_at at time zone 'America/Argentina/Buenos_Aires')::date as day, count(*) as n
      from public.orders o
     where o.created_at >= p_from and o.created_at < p_to
     group by 1
  ),
  paid as (
    select (o.paid_at at time zone 'America/Argentina/Buenos_Aires')::date as day,
           count(*) as n, sum(o.amount_cents)::bigint as revenue
      from public.orders o
     where o.status = 'paid' and o.paid_at >= p_from and o.paid_at < p_to
     group by 1
  )
  select d.day, coalesce(c.n, 0), coalesce(p.n, 0), coalesce(p.revenue, 0)::bigint
    from days d
    left join created c on c.day = d.day
    left join paid p on p.day = d.day
   order by d.day;
end
$$;

create function public.admin_theme_ranking(p_from timestamptz, p_to timestamptz)
returns table (theme_id uuid, theme_name text, orders_paid bigint, revenue_cents bigint)
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
  select t.id, t.name, count(*), sum(o.amount_cents)::bigint
    from public.orders o
    join public.themes t on t.id = o.theme_id
   where o.status = 'paid' and o.paid_at >= p_from and o.paid_at < p_to
   group by t.id, t.name
   order by count(*) desc, sum(o.amount_cents) desc;
end
$$;

create function public.admin_coupon_ranking(p_from timestamptz, p_to timestamptz)
returns table (coupon_id uuid, code text, uses bigint, discount_cents bigint, revenue_cents bigint)
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
  select o.coupon_id, max(o.coupon_code), count(*), sum(o.discount_cents)::bigint, sum(o.amount_cents)::bigint
    from public.orders o
   where o.status = 'paid' and o.coupon_id is not null and o.paid_at >= p_from and o.paid_at < p_to
   group by o.coupon_id
   order by count(*) desc;
end
$$;

-- ── Permisos ────────────────────────────────────────────────────────────────

revoke execute on function public.generate_boxie_code() from public, anon, authenticated;
revoke execute on function public.apply_payment(uuid, text, text, text, integer, text, text, jsonb, text, text, text) from public, anon, authenticated;
revoke execute on function public.lock_boxie(uuid) from public, anon, authenticated;
revoke execute on function public.register_gift_open(uuid) from public, anon, authenticated;
revoke execute on function public.admin_refund_boxie(uuid) from public, anon;
revoke execute on function public.publish_theme(uuid, jsonb) from public, anon;
revoke execute on function public.admin_kpis(timestamptz, timestamptz) from public, anon;
revoke execute on function public.admin_sales_by_day(timestamptz, timestamptz) from public, anon;
revoke execute on function public.admin_theme_ranking(timestamptz, timestamptz) from public, anon;
revoke execute on function public.admin_coupon_ranking(timestamptz, timestamptz) from public, anon;

grant execute on function public.generate_boxie_code() to service_role;
grant execute on function public.apply_payment(uuid, text, text, text, integer, text, text, jsonb, text, text, text) to service_role;
grant execute on function public.lock_boxie(uuid) to service_role;
grant execute on function public.register_gift_open(uuid) to service_role;
grant execute on function public.admin_refund_boxie(uuid) to authenticated, service_role;
grant execute on function public.publish_theme(uuid, jsonb) to authenticated, service_role;
grant execute on function public.admin_kpis(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.admin_sales_by_day(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.admin_theme_ranking(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.admin_coupon_ranking(timestamptz, timestamptz) to authenticated, service_role;
