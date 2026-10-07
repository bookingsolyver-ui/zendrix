# ZETRIX: Codex de Arquitetura e Regras

Este documento é lido pelo Claude Code (via `CLAUDE.md`) e por qualquer pessoa que toque no código. Descreve as regras que se mantêm e, na última secção, onde o código **ainda não** as cumpre.

## 1. Stack
- **Frontend e backend:** Next.js (App Router). Esta versão tem diferenças face ao que se conhece: ver `AGENTS.md` e `node_modules/next/dist/docs/` antes de escrever código.
- **Base de dados:** Supabase (PostgreSQL) através do Prisma. O schema muda com `npx prisma db push`, corrido localmente.
- **Deploy:** Vercel.
- **CI/CD:** GitHub Actions. Os crons correm em `.github/workflows/outbox.yml`.

## 2. Regra de ouro: Append-Only
- Não se reescreve, refatora nem apaga código existente para acrescentar uma funcionalidade.
- O código novo vive em componentes, rotas, serviços e tabelas isoladas. Os modelos novos não têm relações para os existentes (só ids em texto), para nunca bloquearem consultas.
- A estabilidade do sistema base está acima de tudo. Se houver erros de tipos, corrige-se com extensões flexíveis, sem partir o que existe.
- Exceção só quando é pedida de forma explícita e limitada (por exemplo, a navegação e o CI/CD, ligados na entrega «Ligar os Fios»).

## 3. Segurança e infraestrutura
- **Auditoria:** as modificações críticas (UPDATE/DELETE) passam pelo `AuditLedger` (`lib/audit/ledger.ts`). A tabela `ZetrixAuditLog` é imutável por trigger SQL, tal como `AuditEvent`. Em dinheiro e permissões, use o modo `sync`.
- **Nave-Mãe (God Mode):** a administração global vive só em `/super-admin` e em `/api/super-admin/*`. Acesso = administrador da plataforma **e** e-mail em `SUPER_ADMIN_EMAILS`. Quem falha recebe 404.
- **Erros:** as rotas críticas usam o `SaaSErrorLogger` (`withErrorCapture`, e o `instrumentation.ts` como rede global) para registar e avisar os erros graves no Discord/Slack (`ALERT_WEBHOOK_URL`).
- **Quota de IA:** as chamadas de IA passam por `withAiQuota` (`lib/superadmin/quota.ts`): limite diário por organização em Postgres, com texto fixo de recurso e aviso de upsell.
- **Flags e torneira:** as funcionalidades premium respeitam `requireFeature` / `TenantFlags` (`lib/superadmin/flags.ts`).
- **RLS:** todas as tabelas ficam com RLS ligado e forçado, e `anon`/`authenticated` sem privilégios. Depois de cada `prisma db push` com tabelas novas, correr `supabase/migrations/20261003120000_rls_hardening.sql` com `node scripts/apply-sql.mjs`. A política opcional `..._OPTIONAL.sql` não está aplicada de propósito.

## 4. Filosofia
- O Zetrix não é só um CRM: é um sistema operativo empresarial.
- Em cada funcionalidade nova, pensar primeiro em **prevenção de falhas**, **idempotência** (nunca repetir uma cobrança ou um aviso: chaves únicas e reivindicação atómica) e **proteção extrema dos dados do cliente** (RLS, isolamento por organização, privilégio mínimo).

## 5. Estado atual / dívida técnica

As regras acima valem para todo o código **novo**. Há três exceções conhecidas, todas por causa da regra Append-Only (fechá-las obriga a editar código existente):

### 5.1 «Auto-healing» é só deteção e alerta
- **O que é:** o `SaaSErrorLogger` deteta (5xx, timeouts da Meta/OpenAI, erros de base de dados, assinaturas recusadas) e avisa a equipa. **Não repete** nenhum handler automaticamente.
- **Porquê:** os handlers não são idempotentes; repetir um pedido de pagamento ou um envio seria pior do que o erro. As filas (outbox) e os crons já repetem sozinhos o que é seguro repetir.
- **Para fechar:** só vale a pena por rota, e só onde a operação for idempotente (por exemplo, uma consulta).

### 5.2 `lib/agent/cerebro.ts` está fora da quota de IA
- **O que é:** o agente principal (o maior consumidor de IA) chama `chamarModelo` diretamente. Só o Nightwatch usa `withAiQuota`. As flags `ai_agent` e `whatsapp_integration` também não cortam nada nas rotas anteriores (envio de WhatsApp, agente, inbox).
- **Risco:** uma organização em modo spam gasta o orçamento de IA sem limite, e a «torneira» não a trava aí. A suspensão total do Admin clássico (`blockedAt`) funciona em todas as rotas.
- **Para fechar:** envolver a chamada do modelo no sítio onde o agente gera a resposta: `withAiQuota(workspaceId, () => chamarModelo(...), () => "Texto fixo")`, e acrescentar `TenantFlags.isEnabled(workspaceId, "ai_agent")` no início do agente, em `lib/meta/handler.ts` e em `authenticateRequest` (`lib/api-auth.ts`).

### 5.3 As rotas antigas não passam pelo `AuditLedger`
- **O que é:** as rotas anteriores às camadas de automação (contactos, campanhas, definições, equipa, chaves de API, etc.) não registam o antes/depois no livro de auditoria. O interceptor só audita o que o chama (hoje: propostas, alterações de flags e quotas). O Fortress (escopo por vendedor e anti-exportação) também só protege as rotas que o chamam.
- **Risco:** não há rastreabilidade completa (RGPD) das alterações feitas pelas rotas antigas, e um vendedor continua a ver todos os contactos nas páginas existentes.
- **Para fechar:** envolver as mutações com `AuditLedger.wrap(...)` (exemplo em `docs/zetrix-clevel.md`), e usar `Fortress.contactWhere` nas consultas de contactos e `Fortress.isLocked` em `authenticateRequest`. Um registo do que já foi feito: nada do passado se reconstrói; o livro começa quando cada rota é envolvida.

### 5.4 Outros limites registados
Detalhados nos guias `docs/zetrix-automation.md`, `-expansion.md`, `-clevel.md` e `-mothership.md`: o WhatsApp só deixa escrever dentro da janela de 24 h (sem envio de modelos); `Contact` não tem `deletedAt` (os duplicados fundidos continuam visíveis na lista); a aprovação de uma proposta passa o negócio a `WON` sem pagamento; o câmbio dos alertas de margem é simulado; a emissão de faturas AGT e o adaptador bancário são placeholders.
