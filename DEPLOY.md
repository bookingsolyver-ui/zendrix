# Deploy na Vercel

Este guia leva o Zentrix de `localhost` + túnel a um endereço fixo. Nenhum segredo vive neste repositório:
as variáveis estão descritas em [`.env.example`](.env.example) e os valores reais entram pelo painel da Vercel.

## 1. Repositório
A Vercel implanta a partir de um repositório Git (GitHub, GitLab ou Bitbucket).

```bash
git remote add origin git@github.com:<utilizador>/<repositorio>.git
git push -u origin <branch>
```

## 2. Projeto na Vercel
1. **Add New → Project** e escolha o repositório. A framework (Next.js) é detetada sozinha.
2. **Não altere** os comandos: `npm install` corre o `postinstall` (`prisma generate`) e depois `next build`.
3. Em **Settings → Functions**, confirme a região: o `vercel.json` pede `dub1` (Dublin), a mais próxima da base de dados no Supabase `eu-west-1`.

## 3. Variáveis de ambiente
Em **Settings → Environment Variables → Import .env**, importe o ficheiro `.env.vercel` (gerado localmente, ignorado pelo git).
Marque **apenas o ambiente Production**: os *Preview deployments* apontariam à mesma base de dados de produção.

| Variável | Notas |
|---|---|
| `DATABASE_URL` | pooler porta **6543**, com `?pgbouncer=true` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | públicas por desenho |
| `SUPABASE_SERVICE_ROLE_KEY` | **secreta**, ignora todas as regras de acesso |
| `INTEGRATION_ENCRYPTION_KEY` | **tem de ser o mesmo valor de sempre**: se mudar, os tokens da Meta guardados ficam ilegíveis |
| `WHATSAPP_VERIFY_TOKEN`, `META_APP_SECRET` | webhook da Meta |
| `AGENT_ENABLED`, `OPENROUTER_API_KEY`, `MODELO`, `FUSO` | agente de IA |
| `AUDIO_INBOUND`, `GROQ_API_KEY`, `WHISPER_LANGUAGE` | ouvir notas de voz |
| `AGENT_VOICE`, `AGENT_VOICE_MODE`, `AGENT_VOICE_MAX_CHARS`, `TTS_PROVIDER`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `OPENAI_TTS_VOICE` | responder por voz |

**Não são precisas em produção:** `DIRECT_URL` (só o CLI do Prisma), `META_WA_TOKEN` e `META_PHONE_ID` (obsoletas: o token da Meta vive cifrado na base de dados).

## 4. Depois do primeiro deploy (com o domínio `D`)
1. **Meta → WhatsApp → Configuração → Webhook**
   - URL de callback: `https://D/api/webhooks/whatsapp`
   - Verify Token: o valor de `WHATSAPP_VERIFY_TOKEN`
   - Subscrever o campo `messages`.
2. **Supabase → Authentication → URL Configuration**
   - Site URL: `https://D`
   - Redirect URLs: acrescentar `https://D/auth/callback`
3. **Vercel → Settings → Deployment Protection**: o domínio de produção não pode exigir login da Vercel, senão a Meta recebe 401.
4. Teste: `/pt/login`, entrar, abrir a Inbox, enviar e receber uma mensagem.

O túnel (`cloudflared`) deixa de ser necessário.

## 5. Base de dados
O schema muda com `npx prisma db push`, que se corre **localmente** (usa `DIRECT_URL`). Não corre na Vercel.

## Limitações a ter em conta
- O limitador de pedidos (tabela `RateLimitBucket`) e os horários oferecidos pelo agente (`OfferedSlot`) vivem na base de dados, partilhados por todas as instâncias. Os URLs assinados do Storage já não têm cache: assinam-se a cada pedido. O TTS passa tudo por memória dentro de um único pedido, sem estado entre instâncias.
- O webhook pede `maxDuration = 60`, o máximo do plano gratuito; o agente tem um orçamento de 40 s para o modelo.
- Rode as chaves que tenham passado por conversas ou terminais partilhados antes de as pôr em produção.

## Stripe: teste de 14 dias e subscrições

- Cada organização nova nasce `trialing` com `trial_ends_at` = agora + 14 dias. Passado esse prazo o agente (texto e voz) fica desligado até haver subscrição.
- No Stripe, crie um endpoint `https://<o-seu-dominio>/api/stripe/webhook` com os eventos `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` e `checkout.session.completed`, e copie o `whsec_...` para `STRIPE_WEBHOOK_SECRET` na Vercel. Em local: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
- Estados: `active` e `trialing` ligam o agente; `past_due`, `unpaid`, `paused` e `canceled` desligam-no.
- Para o Stripe saber a que organização pertence uma compra, o Checkout tem de enviar `client_reference_id = <id da organização>` e `subscription_data.metadata.workspace_id = <id da organização>`. Nunca se associa por e-mail.
- O Checkout e o portal já existem: `POST /api/stripe/checkout` e `POST /api/stripe/portal` (utilizador autenticado; devolvem `{ success, url }` e o cliente redireciona para esse URL). Corpo opcional `{ "locale": "pt" | "en" | "es" }`. Variáveis na Vercel: `STRIPE_SECRET_KEY` (sk_…), `STRIPE_PRICE_ID` (price_… do plano único), `STRIPE_WEBHOOK_SECRET`; opcionais `STRIPE_API_VERSION` e `NEXT_PUBLIC_APP_URL` (URL de regresso).
- Teste grátis: quem subscreve durante o teste continua com o que resta dos 14 dias (o Stripe só cobra no fim). Se restarem menos de ~48 h (mínimo do Stripe) ou o teste já acabou, cobra logo. Quem já tem subscrição ativa recebe 409 `already_subscribed` e deve usar o portal.
- No Stripe, ative o Customer Portal (Settings → Billing → Customer portal) antes de usar `/api/stripe/portal`.

## API Keys, papéis (RBAC) e validação
- Papéis por utilizador: `OWNER` > `MANAGER` > `STAFF` (`User.role`, por omissão `STAFF`; quem cria a organização é `OWNER`). Faturação (`/api/stripe/*`) e gestão de chaves exigem `OWNER` ou `MANAGER`. Em código: `requireRole(["OWNER", "MANAGER"], request?)` (`lib/rbac.ts`); sem `request` só aceita sessão (Server Actions).
- **Utilizadores que já existiam ficam `STAFF`**: corra `node scripts/backfill-roles.mjs` (`--dry` para ver) depois do `db push`, senão ninguém abre o Checkout.
- Chaves de API: `POST /api/keys` `{ "name": "CRM", "role": "STAFF", "expiresInDays": 365 }` (sessão) devolve a chave **uma única vez** (`zxk_…`); só o hash SHA-256 fica na base de dados. `GET /api/keys` lista, `DELETE /api/keys/<id>` revoga. Um cliente externo envia `x-api-key: zxk_…` (hoje aceite em `POST /api/whatsapp/send`); 120 pedidos/min por chave. Para aceitar chaves noutra rota, use `requireRole([...], request)` nela.
- Entradas externas validadas com Zod em `lib/validations/` (webhooks do Stripe e da Meta, chaves, envio): o que não encaixa é ignorado (webhooks) ou recusado com 400.

## Segurança e verificações
- `npm run check` corre lint, typecheck, `check:server-only` (nenhum componente de cliente chega a módulos de servidor e todo o `lib/` sensível tem `import "server-only"`), `check:i18n` (mesmas chaves e placeholders em pt/en/es), testes e o build. O mesmo corre no GitHub Actions (`.github/workflows/check.yml`).
- `supabase/migrations/20261003120000_rls_hardening.sql` fecha a base de dados à API pública do Supabase (RLS ligado e forçado em todas as tabelas, `anon`/`authenticated` sem privilégios). Correr **depois** de `npx prisma db push` e voltar a correr sempre que o schema ganhe tabelas.
- Scripts em `scripts/` que importam `lib/` correm com `node --conditions=react-server scripts/<nome>.mjs` (o `server-only` só o permite assim fora do Next).
