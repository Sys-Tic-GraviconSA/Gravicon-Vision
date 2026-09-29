-- Migración 003: Blindaje de seguridad
-- Ejecutar completa en Supabase → SQL Editor. Es idempotente (se puede correr más de una vez).
--
-- Contexto: la anon key viaja dentro del JavaScript del frontend, así que cualquiera puede
-- usarla contra la API REST de Supabase. Toda la lectura de datos del dashboard pasa por
-- nuestro backend con service_role, por lo que ninguna tabla necesita acceso anon/authenticated.
-- service_role ignora RLS, así que el backend sigue funcionando igual.

-- ── 1. Tablas de seguridad que el backend espera ──────────────────────

create table if not exists public.login_attempts (
  identifier text primary key,              -- correo o IP
  attempt_count integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_login_attempts_updated_at on public.login_attempts(updated_at);

create table if not exists public.permisos_vista (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  vista text not null,
  permitido boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (email, vista)
);
create index if not exists idx_permisos_vista_email on public.permisos_vista(email);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor text not null,                      -- correo de quien hizo la acción
  action text not null,                     -- p. ej. user.create, perms.update, user.block
  target text,                              -- usuario afectado
  ip text,
  details jsonb not null default '{}'::jsonb
);
create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);

-- La auditoría es solo de inserción: nadie (ni por error) la edita o borra vía API.
create or replace function public.audit_log_inmutable() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_log es de solo inserción';
end $$;
drop trigger if exists trg_audit_log_inmutable on public.audit_log;
create trigger trg_audit_log_inmutable before update or delete on public.audit_log
  for each row execute function public.audit_log_inmutable();

-- ── 2. RLS activado y sin acceso anon/authenticated en TODAS las tablas ──

do $$
declare
  t text;
  pol record;
  tablas text[] := array[
    'login_attempts', 'permisos_vista', 'audit_log',
    'order_price', 'order_detail',
    'produccion_agregados_acacias', 'produccion_agregados_cuncia',
    'proyecciones_clientes', 'proyecciones_planta',
    'registros_zoho_creator_programacion_agregados'
  ];
begin
  foreach t in array tablas loop
    if to_regclass('public.' || t) is null then
      raise notice 'Tabla % no existe, se omite', t;
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    -- Elimina políticas previas (algunas tablas permitían lectura pública)
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

-- Tablas nuevas que se creen en el futuro en "public" tampoco quedan expuestas por defecto.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- ── 3. (OPCIONAL) Sincronización Zoho → Supabase ──────────────────────
-- Si la integración que carga datos desde Zoho escribe con la ANON key, después de esta
-- migración dejará de poder insertar. Lo recomendado es cambiarla para que use la
-- service_role key. Si no es posible, descomente SOLO la tabla que alimenta
-- (permite insertar/actualizar, pero no leer ni borrar):
--
-- grant insert, update on public.produccion_agregados_cuncia to anon;
-- create policy "zoho_sync_insert" on public.produccion_agregados_cuncia for insert to anon with check (true);
-- create policy "zoho_sync_update" on public.produccion_agregados_cuncia for update to anon using (true) with check (true);

-- ── 4. Verificación ───────────────────────────────────────────────────
-- Debe devolver rowsecurity = true en todas y ninguna política:
select c.relname as tabla, c.relrowsecurity as rls, c.relforcerowsecurity as rls_forzado,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as politicas
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;
