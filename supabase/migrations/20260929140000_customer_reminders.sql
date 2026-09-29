-- ════════════════════════════════════════════════════════════════════════════
-- Boxie · Fechas Especiales y Recordatorios Anuales
--
-- Permite a los clientes guardar fechas anuales (cumpleaños, aniversarios)
-- en su portal de cliente (/cuenta) para recibir un recordatorio automático
-- por correo 10 días antes con el cupón exclusivo RECORDAR15 (15% OFF).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.customer_reminders (
  id                  uuid primary key default gen_random_uuid(),
  customer_email      text not null check (customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  recipient_name      text not null check (length(recipient_name) between 1 and 120),
  occasion            text not null check (length(occasion) between 2 and 60),
  day                 integer not null check (day between 1 and 31),
  month               integer not null check (month between 1 and 12),
  year                integer check (year is null or year between 1900 and 2100),
  notes               text not null default '' check (length(notes) <= 500),
  last_notified_year  integer,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists customer_reminders_email_idx on public.customer_reminders (customer_email);
create index if not exists customer_reminders_date_idx on public.customer_reminders (month, day);

create trigger customer_reminders_updated_at before update on public.customer_reminders
  for each row execute function public.set_updated_at();
