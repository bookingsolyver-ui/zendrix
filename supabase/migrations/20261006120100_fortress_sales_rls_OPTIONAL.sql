-- ZETRIX FORTRESS (OPCIONAL, defesa em profundidade): um vendedor (papel STAFF) só lê os clientes que lhe estão
-- atribuídos; OWNER e MANAGER leem todos da sua organização.
--
-- LEIA ANTES DE APLICAR
-- 1. A aplicação liga-se como `postgres` (BYPASSRLS): estas políticas NÃO a afetam. Quem protege os dados na aplicação
--    é o FortressScope (lib/fortress/scope.ts). Isto só vale para quem aceder pela API do Supabase com a chave anon.
-- 2. A migração 20261003120000_rls_hardening.sql fecha a API pública de propósito (revoke all + apaga TODAS as políticas
--    sempre que corre). Este ficheiro reabre UM só acesso (SELECT em "Contact") e, por isso, NÃO está ligado por
--    omissão: o `grant` do fim está comentado. Se o ligar, volte a corrê-lo SEMPRE depois do hardening.
-- 3. O vendedor é o papel STAFF; a atribuição vive em "ClientAssignment" (assigned_to = "User"."id" cujo "authId" = auth.uid()).

create or replace function public.can_read_contact(p_contact_id text, p_workspace_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public."User" u
    where u."authId" = auth.uid()::text
      and u."workspaceId" = p_workspace_id
      and (
        u."role" in ('OWNER', 'MANAGER')
        or exists (
          select 1 from public."ClientAssignment" ca
          where ca."contactId" = p_contact_id and ca."workspaceId" = p_workspace_id and ca."assignedToUserId" = u."id"
        )
      )
  )
$$;
revoke all on function public.can_read_contact(text, text) from public, anon;
grant execute on function public.can_read_contact(text, text) to authenticated;

drop policy if exists contact_select_assigned_or_manager on public."Contact";
create policy contact_select_assigned_or_manager on public."Contact"
  for select to authenticated
  using (public.can_read_contact("id", "workspaceId"));

-- Sem INSERT/UPDATE/DELETE para ninguém pela API: só o servidor escreve.

-- Para ativar de facto (reabre o SELECT na API pública, só com o filtro acima):
-- grant select on public."Contact" to authenticated;
