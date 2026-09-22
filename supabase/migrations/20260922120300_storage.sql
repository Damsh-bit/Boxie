-- ════════════════════════════════════════════════════════════════════════════
-- Boxie · Storage
--
-- boxie-media   (privado) Fotos que sube el comprador. Reemplaza al Base64
--               dentro del documento de Firestore. Se sube y se lee solo con
--               URLs firmadas que emite el servidor.
-- theme-assets  (público) Videos e imágenes de las temáticas que carga el
--               dueño desde el panel.
-- ════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('boxie-media', 'boxie-media', false, 8388608,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('theme-assets', 'theme-assets', true, 52428800,
   array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'])
on conflict (id) do nothing;

-- Sin políticas para anon/authenticated en boxie-media: las URLs firmadas las
-- genera el servidor. El admin puede verlas para soporte.
create policy boxie_media_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'boxie-media' and (select public.is_admin()));

create policy theme_assets_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'theme-assets' and (select public.is_admin()));
create policy theme_assets_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'theme-assets' and (select public.is_admin()));
create policy theme_assets_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'theme-assets' and (select public.is_admin()))
  with check (bucket_id = 'theme-assets' and (select public.is_admin()));
create policy theme_assets_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'theme-assets' and (select public.is_admin()));
