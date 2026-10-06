# Automação Zetrix: Auto-Sync, Alertas Inteligentes, Magic Importer

Tudo é **acrescentado**: ficheiros novos e 3 modelos novos no schema. Nenhum ficheiro existente foi alterado (para além de `package.json`/`package-lock.json`, que ganharam `papaparse` e `read-excel-file`, e de `prisma/schema.prisma`, que só ganhou modelos no fim). Para ligar, siga os passos de «Plugar».

## O que há de novo

| Pilar | Ficheiros |
|---|---|
| Notas de voz → CRM | `lib/integrations/audio-notes.ts`, `app/api/cron/auto-sync/route.ts`, `app/api/contacts/[id]/notes/route.ts` |
| Pagamentos (banco, AGT) | `lib/integrations/{hmac,signed-webhook,payment-sync,bank-sync,agt-invoice}.ts`, `app/api/integrations/{bank-sync,agt}/route.ts` |
| Alertas Inteligentes | `lib/alerts/{risk,engine,notification-service}.ts`, `app/api/cron/smart-alerts/route.ts`, `app/api/alerts/route.ts`, `components/alerts/smart-alert-toast.tsx` |
| Magic Importer | `lib/import/{fuzzy,records,service,handler}.ts`, `app/api/import/{magic,competitor}/route.ts`, `components/dashboard/import/magic-importer.tsx`, página `contacts/import` |

Adaptações ao que já existia no Zetrix (e porquê):
- **«Negócio»** não é uma entidade aqui: é um contacto numa fase ativa (`Contact.leadStage`) mais os `PaymentLink`. «Pago» = `PaymentLink PAID` + contacto `WON`, a mesma regra do webhook do Stripe.
- **Campos**: `client_name`/`phone` do pedido são `Contact.name`/`Contact.waId` (número só com dígitos, internacional).
- **Áudio**: o webhook da Meta e a transcrição Whisper **já existiam** (`AUDIO_INBOUND=true`). A Meta só permite um URL de webhook por app, por isso não há um segundo webhook: o varrimento `auto-sync` transforma as transcrições em `ContactNote`.

## Plugar (por esta ordem)

1. **Base de dados** (localmente, como em `DEPLOY.md`): `npx prisma db push`, e depois voltar a correr `supabase/migrations/20261003120000_rls_hardening.sql` (as 3 tabelas novas têm de ficar com RLS forçado).
2. **Variáveis de ambiente** (Vercel → Production):
   - `BANK_SYNC_WEBHOOK_SECRET`, `AGT_WEBHOOK_SECRET`: segredos partilhados com o banco/AGT (sem eles os endpoints respondem 503).
   - `SMART_ALERT_CHURN_DAYS` (7), `SMART_ALERT_MARGIN_DRIFT_PERCENT` (3), `BASE_CURRENCY` (EUR).
   - `FX_RATES_BASELINE` e `FX_RATES_TODAY`, ex.: `{"USD":0.92}` / `{"USD":0.88}` (câmbio **simulado**; ver `lib/alerts/risk.ts`).
   - `IMPORT_DEFAULT_DIAL_CODE` (351): indicativo para números sem ele.
   - `AUDIO_INBOUND=true` (já existente) para haver transcrições.
3. **Crons**: acrescentar `smart-alerts` e `auto-sync` ao `for path in ...` de `.github/workflows/outbox.yml` (ambos são idempotentes, por isso correr de 5 em 5 minutos é seguro; o varrimento de risco só cria um aviso por situação). Em alternativa, uma entrada diária em `vercel.json` (`/api/cron/smart-alerts`), se o plano da Vercel permitir mais crons.
4. **Toast**: em `app/[locale]/dashboard/layout.tsx`, importar `SmartAlertToast` de `@/components/alerts/smart-alert-toast` e pôr `<SmartAlertToast />` ao lado do `<ChannelsHealthBanner />`.
5. **Importador**: já existe em `/{locale}/dashboard/contacts/import`; falta pôr um link (por exemplo no cabeçalho de `contacts-table.tsx`).

## Assinar os webhooks (banco e AGT)

Cabeçalhos: `x-zetrix-timestamp: <segundos unix>` e `x-zetrix-signature: sha256=<hex>`, com `HMAC-SHA256(segredo, "<timestamp>.<corpo em bruto>")`. Janela de 5 minutos. Corpo do banco: `{ eventId, workspaceId, reference, amountMinor, currency }` onde `reference` é o id do `PaymentLink`. Um evento com valor ou moeda diferentes do negócio **não** o marca como pago: avisa o dono.

## Placeholders (não fingem funcionar)

- `AGTInvoiceService.issueInvoice` devolve `not_configured` até haver certificado e credenciais da AGT.
- `BankSyncController` espera o formato Zetrix; um banco real precisa de um adaptador pequeno para este formato.
- O câmbio vem de variáveis de ambiente; ligar um fornecedor real em `lib/alerts/risk.ts` / `engine.ts`.
