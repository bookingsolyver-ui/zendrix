-- Organizações (tenants) e credenciais do WhatsApp por organização.
--
-- Uma organização = uma linha de "Workspace" (não se cria uma tabela nova: renomear o Workspace tocaria em
-- todas as tabelas, em todas as consultas e no RLS). Acrescentam-se as colunas de subscrição e de agente.
-- As credenciais do WhatsApp de cada cliente já vivem em "SocialIntegration":
--   providerAccountId = phone_number_id · accessToken = token CIFRADO (AES-256-GCM) · waba_id (novo).
--
-- Só ADICIONA colunas/índices: não altera nem apaga dados. Idempotente. O schema.prisma reflete exatamente isto.

-- 1) Organização: dono, faturação, estado da subscrição e agente de IA -------------------------------------
alter table public."Workspace"
  add column if not exists owner_email       text,
  add column if not exists stripe_customer_id text,
  add column if not exists sub_status        text        not null default 'trialing',
  add column if not exists plan              text,
  add column if not exists trial_ends_at     timestamp(3),
  add column if not exists agent_enabled     boolean     not null default false,
  add column if not exists agent_knowledge   text;

create unique index if not exists "Workspace_stripe_customer_id_key"
  on public."Workspace" (stripe_customer_id);

alter table public."Workspace" drop constraint if exists workspace_sub_status_check;
alter table public."Workspace" add constraint workspace_sub_status_check
  check (sub_status in ('trialing', 'active', 'past_due', 'canceled'));

comment on column public."Workspace".sub_status      is 'Estado da subscrição: trialing | active | past_due | canceled. O agente só responde em trialing/active.';
comment on column public."Workspace".agent_enabled   is 'Interruptor do agente de IA desta organização (o global é AGENT_ENABLED no servidor).';
comment on column public."Workspace".agent_knowledge is 'Base de conhecimento (ficha do negócio) que o agente desta organização usa. Sem ela o agente não responde.';

-- 2) Credenciais do WhatsApp: a conta (WABA) e a unicidade do número ------------------------------------------
alter table public."SocialIntegration"
  add column if not exists waba_id text;

-- Um phone_number_id só pode pertencer a UMA organização. É esta unicidade que garante que o webhook
-- encaminha cada mensagem para o cliente certo (sem ela, dois clientes com o mesmo número misturavam dados).
create unique index if not exists "SocialIntegration_platform_providerAccountId_key"
  on public."SocialIntegration" (platform, "providerAccountId");
