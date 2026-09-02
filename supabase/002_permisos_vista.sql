-- Permisos por vista — controla qué vistas puede ver cada usuario
create table if not exists permisos_vista (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  vista text not null,
  permitido boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(email, vista)
);

alter table permisos_vista enable row level security;

-- Solo service_role puede leer/escribir (via API con SUPABASE_SERVICE_ROLE_KEY)
create policy "service_role all" on permisos_vista
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create index if not exists idx_permisos_vista_email on permisos_vista(email);
create index if not exists idx_permisos_vista_vista on permisos_vista(vista);
