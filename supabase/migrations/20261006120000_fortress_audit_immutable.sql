-- ZETRIX FORTRESS / HANDOFF: o registo de auditoria ("AuditEvent") só se acrescenta.
-- Nem o servidor nem ninguém consegue alterar ou apagar uma linha: um trigger recusa UPDATE e DELETE.
-- Correr DEPOIS de `npx prisma db push`. Idempotente.
--
-- Nota: TRUNCATE não passa por este trigger; está coberto por o papel da aplicação não ter esse privilégio em produção.
-- Para apagar dados de uma organização eliminada (ON DELETE) seria preciso desativar o trigger: de propósito, as
-- auditorias NÃO têm chave estrangeira para a organização e sobrevivem-lhe.

create or replace function public.audit_event_is_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'AuditEvent é só de acrescentar (% recusado)', tg_op using errcode = '42501';
end
$$;

drop trigger if exists audit_event_no_update on public."AuditEvent";
create trigger audit_event_no_update before update or delete on public."AuditEvent"
  for each row execute function public.audit_event_is_append_only();

-- RLS fechado como em todas as tabelas (ver 20261003120000_rls_hardening.sql).
alter table public."AuditEvent" enable row level security;
alter table public."AuditEvent" force row level security;
