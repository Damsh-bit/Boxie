-- ════════════════════════════════════════════════════════════════════════════
-- Boxie · Row Level Security
--
-- Regla general:
--   · anon / authenticated ven solo el catálogo publicado y la configuración.
--   · Los admins (tabla admin_users) gestionan todo desde el panel con su sesión.
--   · El servidor usa el service role (bypassea RLS) solo en los flujos que
--     validan su propia credencial: checkout, webhook, editor y regalo por token.
--
-- Una tabla sin política para un rol = ese rol no ve nada. Por eso órdenes,
-- Boxies, cupones y pagos no tienen ninguna política pública.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.admin_users    enable row level security;
alter table public.themes         enable row level security;
alter table public.theme_versions enable row level security;
alter table public.affiliates     enable row level security;
alter table public.coupons        enable row level security;
alter table public.orders         enable row level security;
alter table public.payment_events enable row level security;
alter table public.boxies         enable row level security;
alter table public.boxie_content  enable row level security;
alter table public.media_assets   enable row level security;
alter table public.settings       enable row level security;

-- ── Catálogo público ────────────────────────────────────────────────────────

create policy themes_select on public.themes
  for select to anon, authenticated
  using (status = 'published' or (select public.is_admin()));

create policy themes_insert on public.themes
  for insert to authenticated with check ((select public.is_admin()));
create policy themes_update on public.themes
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy themes_delete on public.themes
  for delete to authenticated using ((select public.is_admin()));

create policy theme_versions_select on public.theme_versions
  for select to anon, authenticated
  using (
    exists (select 1 from public.themes t where t.id = theme_id and t.status = 'published')
    or (select public.is_admin())
  );
-- Sin UPDATE ni DELETE: la tabla es inmutable (además lo impide un trigger).
create policy theme_versions_insert on public.theme_versions
  for insert to authenticated with check ((select public.is_admin()));

create policy settings_select on public.settings
  for select to anon, authenticated using (true);
create policy settings_update on public.settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ── Solo administradores ────────────────────────────────────────────────────

create policy admin_users_select on public.admin_users
  for select to authenticated using ((select public.is_admin()));

create policy affiliates_admin on public.affiliates
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy coupons_admin on public.coupons
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy orders_admin_select on public.orders
  for select to authenticated using ((select public.is_admin()));
create policy orders_admin_update on public.orders
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy payment_events_admin_select on public.payment_events
  for select to authenticated using ((select public.is_admin()));

create policy boxies_admin_select on public.boxies
  for select to authenticated using ((select public.is_admin()));
create policy boxies_admin_update on public.boxies
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy boxie_content_admin on public.boxie_content
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy media_assets_admin on public.media_assets
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Los tokens (hash y copia cifrada) no se exponen ni siquiera al panel por la
-- API: el admin ve la Boxie, pero el link del regalo lo arma el servidor.
-- Un REVOKE por columna no alcanza si hay permiso sobre la tabla entera: se
-- revoca la tabla y se otorgan las columnas visibles una por una.
revoke select, insert, update, delete on public.boxies from anon, authenticated;
grant select (
  id, code, order_id, theme_version_id, status, recipient_name, sender_name, locked_at,
  expires_at, access_email_sent_at, gift_email_sent_at, first_opened_at, open_count,
  created_at, updated_at
) on public.boxies to authenticated;
grant update (recipient_name, sender_name, status, expires_at, locked_at, theme_version_id)
  on public.boxies to authenticated;
