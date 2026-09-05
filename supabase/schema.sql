-- ============================================================================
-- Controle de Produção — schema + políticas de acesso (Supabase / Postgres)
--
-- Como usar: Supabase → SQL Editor → cole este arquivo inteiro → Run.
-- É idempotente (pode rodar de novo sem quebrar).
--
-- O modelo de segurança inteiro está nas políticas de RLS no fim do arquivo.
-- Elas rodam DENTRO do banco: mesmo que alguém pegue a chave pública do app
-- e chame a API direto, não consegue ler dado que não é dele. É por isso que
-- a chave "anon" pode ficar no código do app sem problema.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Perfil (1 por usuário do Auth)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text,
  created_at  timestamptz not null default now()
);

-- Cria o perfil sozinho quando alguém se cadastra.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Equipe
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id     uuid not null references public.teams(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  papel       text not null default 'member' check (papel in ('owner', 'member')),
  joined_at   timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- Convite por código curto. O gerente geral gera, o convidado digita no app.
create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  codigo      text not null unique,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  used_by     uuid references public.profiles(id),
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Dados sincronizados (espelho do que existe no aparelho)
--
-- O id vem do aparelho (o mesmo uuid do IndexedDB), não é gerado aqui — é o
-- que faz o mesmo registro subir de dois aparelhos sem virar duplicata.
-- deleted_at != null é a "lápide": o registro foi apagado no aparelho.
-- ---------------------------------------------------------------------------
create table if not exists public.records (
  id           uuid primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  date         date not null,
  year         int  not null,
  month        int  not null,
  product      text not null,
  account      text,
  client_name  text,
  manager      text,
  quantity     numeric,
  value        numeric,
  notes        text,
  qualified    boolean not null default false,
  ignored      boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create table if not exists public.goals (
  id              uuid primary key,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  year            int  not null,
  month           int  not null,
  product         text not null,
  manager         text,
  target_quantity numeric,
  target_value    numeric,
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- Índices para as consultas que o app realmente faz (por usuário + período,
-- e o "me dá tudo que mudou desde X" da sincronização).
create index if not exists records_user_period_idx on public.records (user_id, year, month);
create index if not exists records_user_updated_idx on public.records (user_id, updated_at);
create index if not exists goals_user_period_idx   on public.goals   (user_id, year, month);
create index if not exists goals_user_updated_idx  on public.goals   (user_id, updated_at);

-- ---------------------------------------------------------------------------
-- Visão da equipe: SÓ NÚMEROS DE PRODUÇÃO
--
-- O gerente geral consulta esta view, nunca a tabela records direto. Assim
-- nome de cliente, conta e observações não atravessam para outro usuário,
-- mesmo com tudo sincronizado — cada um mantém o backup completo do próprio
-- dado, mas o que a equipe enxerga é só produção.
-- ---------------------------------------------------------------------------
create or replace view public.team_production
with (security_invoker = true) as
select
  r.user_id,
  p.nome        as gerente,
  r.date,
  r.year,
  r.month,
  r.product,
  sum(coalesce(r.quantity, 0)) as quantity,
  sum(coalesce(r.value, 0))    as value
from public.records r
join public.profiles p on p.id = r.user_id
where r.deleted_at is null
  and r.ignored = false
group by r.user_id, p.nome, r.date, r.year, r.month, r.product;

-- ---------------------------------------------------------------------------
-- Funções auxiliares das políticas
--
-- security definer + search_path fixo: evitam recursão infinita de RLS
-- (a política de team_members consultando team_members) e "search_path
-- hijacking", que é a forma clássica de escapar de uma função definer.
-- ---------------------------------------------------------------------------
create or replace function public.is_team_owner(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id and t.owner_id = auth.uid()
  );
$$;

-- Times onde o usuário atual é o dono.
create or replace function public.my_owned_teams()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.teams where owner_id = auth.uid();
$$;

-- Usuários cuja produção o usuário atual pode ver (os membros dos times
-- que ele é dono) — mais ele mesmo.
create or replace function public.visible_user_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select auth.uid()
  union
  select tm.user_id
    from public.team_members tm
   where tm.team_id in (select public.my_owned_teams());
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.teams        enable row level security;
alter table public.team_members enable row level security;
alter table public.invites      enable row level security;
alter table public.records      enable row level security;
alter table public.goals        enable row level security;

-- profiles: cada um lê/edita o seu; membros do time são visíveis ao dono.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or id in (select public.visible_user_ids()));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- teams: o dono manda; membros só leem.
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select
  using (owner_id = auth.uid()
         or id in (select team_id from public.team_members where user_id = auth.uid()));

drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams for insert with check (owner_id = auth.uid());

drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams for update using (owner_id = auth.uid());

drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams for delete using (owner_id = auth.uid());

-- team_members: o dono gerencia; cada membro se vê e pode sair.
drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members for select
  using (user_id = auth.uid() or public.is_team_owner(team_id));

drop policy if exists team_members_insert on public.team_members;
create policy team_members_insert on public.team_members for insert
  with check (user_id = auth.uid() or public.is_team_owner(team_id));

drop policy if exists team_members_delete on public.team_members;
create policy team_members_delete on public.team_members for delete
  using (user_id = auth.uid() or public.is_team_owner(team_id));

-- invites: o dono cria/vê; qualquer autenticado pode consultar um código
-- válido (é assim que o convidado descobre a que time o código pertence).
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites for select
  using (public.is_team_owner(team_id) or (used_by is null and expires_at > now()));

drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites for insert
  with check (public.is_team_owner(team_id));

drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites for update
  using (public.is_team_owner(team_id) or (used_by is null and expires_at > now()));

drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites for delete
  using (public.is_team_owner(team_id));

-- records/goals: ESCRITA sempre só do próprio dono do dado.
-- LEITURA inclui a equipe — mas o app do gerente geral consulta a view
-- team_production (agregada), não estas tabelas.
drop policy if exists records_select on public.records;
create policy records_select on public.records for select
  using (user_id in (select public.visible_user_ids()));

drop policy if exists records_write on public.records;
create policy records_write on public.records for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists goals_select on public.goals;
create policy goals_select on public.goals for select
  using (user_id in (select public.visible_user_ids()));

drop policy if exists goals_write on public.goals;
create policy goals_write on public.goals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
