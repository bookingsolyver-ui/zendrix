-- Endurecimento total da base de dados: NADA é acessível pela API pública do Supabase.
--
-- MODELO
-- * Os papéis `anon` e `authenticated` (a chave anon vai no JavaScript do browser) ficam SEM qualquer acesso
--   às tabelas do schema `public`: nem leitura. O browser só usa o Supabase para Auth (auth.users).
-- * Toda a leitura e escrita de dados passa pelo servidor Next.js, com o Prisma, que se liga como `postgres`.
--   Esse papel tem BYPASSRLS, por isso o RLS não o afeta (mesmo com FORCE).
-- * RLS ligado e FORÇADO em TODAS as tabelas (incluindo as futuras, voltando a correr esta migração):
--   sem políticas, ninguém além de um papel com BYPASSRLS lê ou escreve.
--
-- SUBSTITUI o modelo da migração 20260930120000 (leitura da própria organização para `authenticated`):
-- as políticas e a função current_workspace_id() são removidas.
--
-- ORDEM: correr DEPOIS de `npx prisma db push` (para cobrir as tabelas novas).
-- Idempotente e transacional (scripts/apply-sql.mjs). Pode correr-se sempre que o schema ganhar tabelas.

do $$
declare
  r record;
begin
  -- 0) Rede de segurança: com FORCE, um papel SEM bypass ficava trancado fora das próprias tabelas.
  -- Se a ligação que corre isto (e a da app) não ignorar o RLS, aborta tudo antes de mexer em nada.
  if not exists (
    select 1 from pg_roles where rolname = current_user and (rolbypassrls or rolsuper)
  ) then
    raise exception 'O papel % não tem BYPASSRLS: com FORCE RLS a aplicação ficava sem acesso. Use o papel postgres (DIRECT_URL).', current_user;
  end if;

  -- 1) Retirar TODAS as políticas existentes do schema public ------------------------------------------------
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;

  -- 2) RLS ligado e forçado em todas as tabelas (inclui "_prisma_migrations", se existir) ---------------------
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('alter table public.%I force row level security', r.tablename);
  end loop;

  -- Vistas (se algum dia existirem): por omissão correm com os privilégios do dono e ignorariam o RLS.
  for r in select viewname from pg_views where schemaname = 'public' loop
    execute format('alter view public.%I set (security_invoker = true)', r.viewname);
  end loop;
end
$$;

-- 3) Função do modelo anterior: já nenhuma política a usa -------------------------------------------------------
drop function if exists public.current_workspace_id();

-- 4) Privilégios: anon e authenticated sem nada em public --------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- Objetos NOVOS (criados pelo Prisma) também nascem fechados. Não falha se o papel não existir/não for permitido.
do $$
declare
  owner_role text;
begin
  foreach owner_role in array array['postgres', 'supabase_admin'] loop
    begin
      execute format('alter default privileges for role %I in schema public revoke all on tables from anon, authenticated', owner_role);
      execute format('alter default privileges for role %I in schema public revoke all on sequences from anon, authenticated', owner_role);
      execute format('alter default privileges for role %I in schema public revoke execute on functions from public, anon, authenticated', owner_role);
    exception when others then
      raise notice 'default privileges de % não alterados: %', owner_role, sqlerrm;
    end;
  end loop;
end
$$;

-- 5) Verificação: se alguma tabela ficou sem RLS forçado ou com privilégios abertos, tudo é revertido ------------
do $$
declare
  open_tables text;
  granted text;
begin
  select string_agg(c.relname, ', ') into open_tables
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
    and not (c.relrowsecurity and c.relforcerowsecurity);
  if open_tables is not null then
    raise exception 'Tabelas sem RLS forçado: %', open_tables;
  end if;

  select string_agg(distinct table_name, ', ') into granted
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated');
  if granted is not null then
    raise exception 'anon/authenticated ainda têm privilégios em: %', granted;
  end if;
end
$$;
