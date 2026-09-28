-- Boxie · Autenticación de Dos Factores (2FA / TOTP) en public.users
-- Permite proteger las cuentas del panel con Google Authenticator / 1Password.

alter table public.users
  add column if not exists totp_secret_enc text,
  add column if not exists totp_enabled boolean not null default false,
  add column if not exists totp_backup_codes text[];

comment on column public.users.totp_secret_enc is 'Secreto TOTP cifrado con AES-256-GCM.';
comment on column public.users.totp_enabled is 'Si el administrador tiene 2FA activo.';
comment on column public.users.totp_backup_codes is 'Hashes SHA-256 de los códigos de respaldo de un solo uso.';
