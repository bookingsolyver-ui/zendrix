# Nave-Mãe (Super-Admin): God-Mode, Error Catcher, Quota de IA

Só ficheiros novos, 4 tabelas `ZetrixAdmin_*` no fim de `prisma/schema.prisma` e `instrumentation.ts` (ficheiro novo na raiz). Já existia um painel `/admin` (MRR, subscrições, diagnóstico, suspensão): a Nave-Mãe **reutiliza-o** (`getPlatformAdmin`, `loadOverview`) e acrescenta o que faltava.

## Ligar (por esta ordem)
1. `npx prisma db push` e voltar a correr `supabase/migrations/20261003120000_rls_hardening.sql` (as tabelas novas ficam fechadas).
2. Variáveis (Vercel → Production):
   | Variável | Para quê |
   |---|---|
   | `SUPER_ADMIN_EMAILS` | e-mails do fundador/CTO, separados por vírgulas. **Sem ela ninguém entra.** |
   | `ALERT_WEBHOOK_URL` | URL do webhook do Discord ou do Slack (distingue-se pelo endereço). Sem ela, os erros ficam só na tabela. |
   | `AI_CALLS_PER_DAY` | limite diário de IA por organização (omissão 500). |
3. O acesso é **dobrado**: `User.isPlatformAdmin` (`scripts/make-platform-admin.mjs`) **e** e-mail em `SUPER_ADMIN_EMAILS`. Quem falha vê 404. Páginas: `/{locale}/super-admin`, `/tenants`, `/events`.
4. `instrumentation.ts` fica ativo sozinho: apanha erros não tratados de **todas** as rotas e páginas, sem editar nenhuma.

## Onde está a «middleware»
O `proxy.ts` existente não se tocou (e exclui `/api`). O controlo vive em `lib/superadmin/guard.ts`: `requireSuperAdminPage()` no layout **e em cada página** (os layouts não voltam a correr na navegação do cliente) e `superAdminGuarded()` nas APIs `/api/super-admin/*` (404 + mesma origem). Fecha-se por omissão.

## 1. God-Mode
- **MRR**, clientes ativos e estados: do `loadOverview()` do Admin (preço lido do Stripe). **MRR em risco** = clientes a pagar sem login × preço unitário.
- **Churn risk**: organizações a pagar/em teste, com mais de 7 dias de vida e sem login há mais de 7 dias (`auth.users.last_sign_in_at`). Limite: só conta quando alguém **inicia sessão**; uma sessão renovada durante semanas não é login.
- **Feature flags por organização** (`lib/superadmin/catalog.ts`): `whatsapp_integration`, `ai_agent`, `ai_predictions`, `nightwatch`, `cash_collector`, `portal`, `data_cleaner`, `magic_importer`. Sem linha = ligado. A **torneira** (`*`) desliga todas de uma vez e manda sobre as individuais. Cada alteração vai para o livro de auditoria.
- **Onde a torneira corta**: `requireFeature(workspaceId, flag)` nas rotas e serviços criados nas entregas anteriores (previsões, propostas, cobranças, duplicados, importador, Nightwatch, Cash-Collector). Uma consulta indexada por chamada, sem cache: vale já. Falha aberta (se a base de dados falhar, não se corta quem paga).
- **LIMITE IMPORTANTE**: as rotas **anteriores a este pacote** (envio de WhatsApp, agente, inbox) não chamam `requireFeature`, logo `whatsapp_integration` e `ai_agent` ainda não cortam nada nelas. Para fechar: uma linha em `authenticateRequest` (`lib/api-auth.ts`) e uma em `lib/meta/handler.ts` / no início do agente: `if (!(await TenantFlags.isEnabled(workspaceId, "ai_agent"))) return;`. Para cortar **tudo** (incluindo o login) a suspensão do Admin clássico (`blockedAt`) já funciona hoje, em todas as rotas.

## 2. Error Catcher
- `SaaSErrorLogger` regista em `ZetrixAdmin_Event` e avisa o Discord/Slack: «🚨 CRITICAL: Tenant [ID] (nome) experienciou Erro 500 na Rota X. Detalhe: …».
- Cobertura: global via `instrumentation.ts` (erros não tratados; o tenant só se identifica com `x-api-key`), e `withErrorCapture("rota", handler)` nas rotas críticas (apanha exceções e respostas 5xx; descobre o tenant só no caminho de erro). Já aplicado ao `portal/approve`, aos crons novos e aos webhooks assinados (um 401 numa integração = alarme).
- Classifica timeout (Meta/OpenAI), base de dados, upstream, 401, 500. **Anti-inundação**: o mesmo erro avisa 1 vez por 10 min, máx. 30 avisos/h; o resto fica na tabela.
- **Nunca** guarda o corpo dos pedidos, cabeçalhos nem a query do URL; segredos em mensagens são redigidos.
- «Auto-healing»: o que está implementado é **deteção + alerta**. Não há retry automático de handlers (não são idempotentes e repetir um pagamento seria pior que o erro). As filas (outbox, crons) já repetem sozinhas.

## 3. Quota de IA
- `withAiQuota(workspaceId, () => chamarIA(), () => textoFixo)`: contador atómico por organização/dia em `ZetrixAdmin_Usage` (Postgres, sem Redis: um contador por organização/dia é barato e evita nova infraestrutura). Passado o limite devolve o texto fixo, sem tocar no modelo, e envia **um** aviso por organização e dia com a sugestão de upsell. Para rotas sem texto de recurso: `quotaExceededResponse()` (429).
- Limite próprio por organização no painel (`ZetrixAdmin_QuotaOverride`). Já aplicado ao Nightwatch.
- **LIMITE IMPORTANTE**: o agente principal (`chamarModelo` em `lib/agent/cerebro.ts`, o maior consumidor) **não** passa por aqui. Para o proteger, envolva a chamada no sítio onde o agente gera a resposta: `withAiQuota(workspaceId, () => chamarModelo(...), () => "Texto fixo")`.
