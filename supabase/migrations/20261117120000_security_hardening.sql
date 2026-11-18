-- ════════════════════════════════════════════════════════════════════════════
-- Ribbly · Endurecimiento de seguridad (auditoría del 17/11/2026)
--
-- 1. Admin por JWT solo con MFA de Supabase (AAL2).
--    El panel no usa sesiones de Supabase Auth: entra con su propia cookie
--    (clave + TOTP) y opera con el service role. Pero los admins existen en
--    auth.users con el mail confirmado, y el portal de clientes (/cuenta) abre
--    sesiones de Supabase con Google o magic link. Con eso, un admin —o quien
--    tenga acceso a su casilla— conseguía un JWT `authenticated` cuyo
--    is_admin() daba true: lectura de todas las órdenes y escritura de
--    cupones, temáticas y equipo por la API REST, sin clave ni 2FA.
--    Desde acá los privilegios de admin por JWT exigen aal2 (MFA verificado
--    por Supabase Auth). El service role no cambia.
--
-- 2. Tope de cupones atómico (P2.3).
--    evaluateCoupon() mira used_count al cotizar, pero varias compras
--    simultáneas (o varias órdenes pendientes pagadas más tarde) podían pasar
--    el tope. Ahora el uso se suma solo si queda cupo, en la misma
--    transacción que el pago. Una orden gratuita (cupón 100% OFF) sin cupo no
--    se entrega; una pagada sí (el comprador ya pagó), y queda registrada.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Admin por JWT: solo AAL2 ─────────────────────────────────────────────

create or replace function public.jwt_is_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'aal',
    ''
  ) = 'aal2'
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.jwt_is_aal2() and exists (
    select 1 from public.users where user_id = (select auth.uid()) and role is not null
  )
$$;

create or replace function public.admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.users
   where public.jwt_is_aal2() and user_id = (select auth.uid()) and role is not null
$$;

revoke execute on function public.jwt_is_aal2() from public, anon;
grant execute on function public.jwt_is_aal2() to authenticated, service_role;

-- ── 2. apply_payment con tope de cupón atómico ──────────────────────────────

create or replace function public.apply_payment(
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
  v_coupon_ok boolean;
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
      v_outcome := case when v_order.mp_payment_id = p_payment_id then 'already_paid' else 'double_payment' end;
    elsif v_order.status = 'cancelled' then
      v_outcome := 'order_cancelled';
    elsif p_amount_cents is distinct from v_order.amount_cents
       or upper(p_currency) is distinct from v_order.currency then
      update public.orders set provider_status = 'amount_mismatch' where id = v_order.id;
      v_outcome := 'amount_mismatch';
    else
      -- El cupo del cupón se toma acá, con el pago: atómico frente a compras simultáneas.
      v_coupon_ok := true;
      if v_order.coupon_id is not null then
        update public.coupons c
           set used_count = c.used_count + 1
         where c.id = v_order.coupon_id
           and (c.max_uses is null or c.used_count < c.max_uses);
        v_coupon_ok := found;
      end if;

      if not v_coupon_ok and p_provider = 'free' then
        -- Orden gratis con un cupón sin cupo: no se entrega.
        update public.orders
           set status = 'cancelled', provider_status = 'coupon_exhausted'
         where id = v_order.id;
        v_outcome := 'coupon_exhausted';
      else
        if not v_coupon_ok then
          -- Ya pagó: se entrega igual y queda el uso por encima del tope.
          update public.coupons set used_count = used_count + 1 where id = v_order.coupon_id;
        end if;

        update public.orders
           set status = 'paid', paid_at = now(), mp_payment_id = p_payment_id, provider_status = p_status
         where id = v_order.id;

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

        update public.payment_events
           set outcome = case when v_coupon_ok then 'paid' else 'paid_coupon_over_limit' end
         where id = v_event_id;
        return query select 'paid'::text, v_boxie_id, true;
        return;
      end if;
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

revoke execute on function public.apply_payment(uuid, text, text, text, integer, text, text, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_payment(uuid, text, text, text, integer, text, text, jsonb, text, text, text) to service_role;
