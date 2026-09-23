-- ════════════════════════════════════════════════════════════════════════════
-- Boxie · Editor del comprador
--
-- El editor guarda con el service role, después de validar la cookie firmada
-- y el contenido contra el registro de slides. Acá quedan las reglas que no
-- dependen de la app: una Boxie bloqueada, vencida o reembolsada no se edita
-- aunque la app tenga un bug, y las fotos de una Boxie viven en su carpeta.
-- ════════════════════════════════════════════════════════════════════════════

-- Guarda el borrador completo (nombres + contenido de cada slide) en una sola
-- transacción. El `for update` ordena los guardados de dos pestañas abiertas.
create function public.save_boxie_content(
  p_boxie_id       uuid,
  p_recipient_name text,
  p_sender_name    text,
  p_slides         jsonb
)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_boxie public.boxies%rowtype;
  v_slide record;
begin
  select * into v_boxie from public.boxies where id = p_boxie_id for update;
  if v_boxie.id is null then
    raise exception 'Boxie inexistente' using errcode = 'no_data_found';
  end if;
  if v_boxie.status <> 'active' or v_boxie.locked_at is not null or v_boxie.expires_at <= now() then
    raise exception 'La Boxie ya no se puede editar (bloqueada, vencida o reembolsada)'
      using errcode = 'check_violation';
  end if;
  if p_slides is null or jsonb_typeof(p_slides) <> 'object' then
    raise exception 'El contenido tiene que ser un objeto con una clave por slide'
      using errcode = 'invalid_parameter_value';
  end if;

  update public.boxies
     set recipient_name = coalesce(p_recipient_name, ''),
         sender_name = coalesce(p_sender_name, '')
   where id = p_boxie_id;

  for v_slide in select key, value from jsonb_each(p_slides) loop
    if jsonb_typeof(v_slide.value) <> 'object' then
      raise exception 'El contenido de la slide % no es un objeto', v_slide.key
        using errcode = 'invalid_parameter_value';
    end if;
    insert into public.boxie_content (boxie_id, slide_key, props)
    values (p_boxie_id, v_slide.key, v_slide.value)
    on conflict (boxie_id, slide_key) do update
      set props = excluded.props
      where public.boxie_content.props is distinct from excluded.props;
  end loop;

  return now();
end
$$;

-- ── Fotos del comprador ─────────────────────────────────────────────────────

-- Cada foto de una Boxie vive en boxie-media/boxies/<id de la Boxie>/: un error
-- en la app no puede registrar como propia la foto de otra Boxie.
alter table public.media_assets
  add constraint media_assets_boxie_path check (
    owner_type <> 'boxie'
    or (bucket = 'boxie-media' and starts_with(path, 'boxies/' || owner_id::text || '/'))
  );

-- Tope de fotos por Boxie: el editor usa unas pocas (y las reemplazadas se
-- limpian al bloquear), así que un link de edición filtrado no sirve para
-- usar el storage como disco gratis.
create function public.limit_boxie_media()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_type = 'boxie' and (
    select count(*) from public.media_assets m
     where m.owner_type = 'boxie' and m.owner_id = new.owner_id
  ) >= 30 then
    raise exception 'La Boxie llegó al máximo de fotos' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger media_assets_limit before insert on public.media_assets
  for each row execute function public.limit_boxie_media();

-- ── Permisos ────────────────────────────────────────────────────────────────

revoke execute on function public.save_boxie_content(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_boxie_content(uuid, text, text, jsonb) to service_role;
