-- Isolamento multi-tenant no Supabase: RLS + privilégios.
--
-- PROBLEMA QUE ESTA MIGRAÇÃO CORRIGE
-- As tabelas criadas pelo Prisma nascem SEM row level security e com todos os privilégios para os papéis
-- `anon` e `authenticated`. O Supabase expõe o schema `public` pela API REST, e a chave `anon` é pública
-- (vai no JavaScript do browser): qualquer pessoa podia ler, alterar e apagar todos os dados.
--
-- MODELO
-- * A aplicação (Next.js) acede à base de dados SEMPRE pelo Prisma, com o papel `postgres`, que ignora o
--   RLS (BYPASSRLS). Por isso o RLS não afeta a app: protege apenas quem entra pela API do Supabase.
-- * `anon`: sem acesso a nada.
-- * `authenticated`: só LÊ os dados da sua própria organização (Workspace). Nunca escreve, e nunca vê a
--   tabela SocialIntegration (contém os tokens cifrados da Meta): só o servidor lhe toca.
-- * Uma organização = um Workspace. A pertença vem de "User"."authId" = auth.uid().
--
-- Idempotente: pode correr-se mais do que uma vez.

-- 1) Retirar o acesso que o Supabase dá por omissão --------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Tabelas/sequências/funções NOVAS criadas pelo Prisma (papel postgres) também nascem fechadas:
alter default privileges for role postgres in schema public revoke all on tables    from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

-- 2) RLS ligado em todas as tabelas (sem política = ninguém, exceto o dono) --------------------------------
alter table public."Workspace"         enable row level security;
alter table public."User"              enable row level security;
alter table public."SocialIntegration" enable row level security;
alter table public."Contact"           enable row level security;
alter table public."Conversation"      enable row level security;
alter table public."Message"           enable row level security;

-- 3) A organização do utilizador autenticado ---------------------------------------------------------------
-- SECURITY DEFINER: lê "User" sem depender das políticas dessa própria tabela (evita recursão).
create or replace function public.current_workspace_id()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select "workspaceId" from public."User" where "authId" = auth.uid()::text limit 1
$$;

revoke all on function public.current_workspace_id() from public, anon;
grant execute on function public.current_workspace_id() to authenticated;

-- 4) Leitura da própria organização (e só dela) -------------------------------------------------------------
-- (select ...) em volta da função: o Postgres avalia-a uma vez por consulta e não por linha.
grant select on public."Workspace", public."User", public."Contact", public."Conversation", public."Message"
  to authenticated;

drop policy if exists "workspace: membros leem a sua organização" on public."Workspace";
create policy "workspace: membros leem a sua organização" on public."Workspace"
  for select to authenticated
  using (id = (select public.current_workspace_id()));

drop policy if exists "user: membros leem a sua equipa" on public."User";
create policy "user: membros leem a sua equipa" on public."User"
  for select to authenticated
  using ("workspaceId" = (select public.current_workspace_id()));

drop policy if exists "contact: leitura da própria organização" on public."Contact";
create policy "contact: leitura da própria organização" on public."Contact"
  for select to authenticated
  using ("workspaceId" = (select public.current_workspace_id()));

drop policy if exists "conversation: leitura da própria organização" on public."Conversation";
create policy "conversation: leitura da própria organização" on public."Conversation"
  for select to authenticated
  using ("workspaceId" = (select public.current_workspace_id()));

drop policy if exists "message: leitura da própria organização" on public."Message";
create policy "message: leitura da própria organização" on public."Message"
  for select to authenticated
  using ("workspaceId" = (select public.current_workspace_id()));

-- "SocialIntegration": sem GRANT e sem política, de propósito. Tokens (mesmo cifrados) só o servidor lê.
