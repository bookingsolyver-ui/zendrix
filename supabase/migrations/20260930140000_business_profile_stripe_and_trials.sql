-- Ficha do negócio estruturada, ligação ao Stripe e prazo do período de teste.
-- Só ADICIONA colunas/índices (e preenche o prazo de teste em falta): idempotente. O schema.prisma reflete isto.

-- 1) Ficha do negócio: os campos que o cliente preenche (nome, descrição, produtos, regras...). O texto que
--    o agente lê continua em "agent_knowledge" e é COMPILADO a partir deste JSON pelo servidor ao guardar.
alter table public."Workspace"
  add column if not exists agent_profile jsonb;

-- 2) Stripe -------------------------------------------------------------------------------------------------
-- stripe_subscription_id: só a subscrição ATUAL da organização governa o estado (o cancelamento de uma
--   subscrição antiga não pode cancelar a nova).
-- stripe_event_at: quando foi criado o último evento aplicado. O Stripe não garante a ordem de entrega: um
--   "deleted" atrasado não pode ressuscitar uma subscrição, nem um "updated" antigo sobrepor um novo.
alter table public."Workspace"
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_event_at        timestamp(3);

create unique index if not exists "Workspace_stripe_subscription_id_key"
  on public."Workspace" (stripe_subscription_id);

-- 3) Período de teste de 14 dias. As organizações novas recebem o prazo ao serem criadas (no código);
--    as que já existiam em teste, sem prazo, recebem 14 dias a partir de agora.
update public."Workspace"
   set trial_ends_at = (now() at time zone 'utc') + interval '14 days'
 where sub_status = 'trialing' and trial_ends_at is null;
