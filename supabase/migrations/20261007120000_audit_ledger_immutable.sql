-- IMMUTABLE AUDIT LEDGER: "ZetrixAuditLog" só se acrescenta. Um trigger recusa UPDATE e DELETE, para qualquer papel
-- (incluindo o da aplicação). Correr DEPOIS de `npx prisma db push`, e depois voltar a correr o rls_hardening. Idempotente.
--
-- RGPD: um livro imutável não permite «apagar» linhas. Por isso o código NÃO guarda segredos (redigidos antes de gravar)
-- e os dados pessoais devem entrar com o mínimo necessário. Um pedido de eliminação resolve-se pseudonimizando na ORIGEM
-- (o contacto), não reescrevendo o histórico: decida a política com o seu DPO. Se for mesmo preciso purgar, faça-o com um
-- procedimento excecional que desative o trigger numa transação auditada, nunca pela aplicação.

create or replace function public.zetrix_audit_log_is_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'ZetrixAuditLog é só de acrescentar (% recusado)', tg_op using errcode = '42501';
end
$$;

drop trigger if exists zetrix_audit_log_append_only on public."ZetrixAuditLog";
create trigger zetrix_audit_log_append_only before update or delete on public."ZetrixAuditLog"
  for each row execute function public.zetrix_audit_log_is_append_only();

alter table public."ZetrixAuditLog" enable row level security;
alter table public."ZetrixAuditLog" force row level security;
