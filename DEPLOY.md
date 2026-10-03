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

## Omnichannel e fila de saída (anti-ban)
- **Webhook único da Meta:** `POST/GET /api/meta/webhook` recebe WhatsApp, Instagram e Messenger (`object` = `whatsapp_business_account` | `instagram` | `page`). O URL antigo `/api/webhooks/whatsapp` continua a funcionar (mesmo handler: `lib/meta/handler.ts`), por isso não é preciso reconfigurar a Meta. Para Instagram/Messenger, no painel da app subscreva o campo `messages` dos objetos `instagram` e `page`. A assinatura (`META_APP_SECRET`) e o `WHATSAPP_VERIFY_TOKEN` são os mesmos.
- **Ligar um canal:** `META_CHANNEL_TOKEN=… META_ACCOUNT_ID=… [META_PAGE_ID=…] node --conditions=react-server scripts/link-meta-channel.mjs <email> <INSTAGRAM|MESSENGER>` (`META_ACCOUNT_ID` é o `entry.id` dos webhooks: id da página no Messenger, id da conta profissional no Instagram). Cada conversa fica com a sua `platform`.
- **Fila de saída:** a IA e a Inbox já não falam com a Graph API: gravam em `OutboxMessage` (a mensagem aparece como "Na fila") e o worker (`lib/outbox/process.ts`) envia. É chamado pelo cron (`/api/cron/process-outbox`, protegido por `CRON_SECRET`) e logo a seguir a enfileirar. Garantias: reivindicação atómica (`FOR UPDATE SKIP LOCKED`, seguro com vários workers), ordem por destinatário, lotes de 10 em paralelo, teto de `OUTBOX_PER_SECOND` (20) por conta, tentativas com backoff (30 s … 8 min, máx. 5) só para erros passageiros (limites/instabilidade da Meta), e **nunca reenvia** uma mensagem de que não se sabe se a Meta recebeu (fica `FAILED`). Linhas `SENT` com mais de 7 dias são apagadas.
- **Cron por minuto exige o plano Pro da Vercel.** No plano Hobby só são permitidos crons diários e um `* * * * *` faz o deploy FALHAR. No Hobby, mude o `schedule` em `vercel.json` para `0 0 * * *`: as mensagens continuam a sair (o envio imediato após enfileirar não depende do cron), o cron só recolhe as que ficaram para trás.
- **Re-envio sem cron por minuto:** (1) cada evento que a Meta envia ao webhook também reenvia a fila; (2) o workflow `.github/workflows/outbox.yml` chama o endpoint de 5 em 5 minutos. Defina em GitHub → Settings → Secrets → Actions: `CRON_SECRET` (igual ao da Vercel) e `APP_URL` (ex.: `https://o-seu-dominio`). Sem eles o workflow avisa e não faz nada.
- **Variáveis:** `CRON_SECRET` (obrigatória para o cron), `OUTBOX_PER_SECOND`, `META_GRAPH_VERSION` (opcionais).
- **Limitações:** a nota de voz continua a ser enviada directamente (só WhatsApp, desligada por defeito). Instagram/Messenger: só texto, e anexos recebidos ficam como `[image]`/`[audio]`. Os envios para Instagram e Messenger não foram testados contra a Meta real.

## Ligar canais (self-serve, Facebook Login)
- Página `/dashboard/settings/channels`: cartões de WhatsApp, Instagram e Messenger. O WhatsApp abre o ecrã próprio (`/dashboard/settings/whatsapp`); Instagram e Messenger iniciam o OAuth em `GET /api/meta/oauth/start?platform=…`, que gera o `state` anti-CSRF (cookie httpOnly) e redireciona para o Facebook. O regresso é `GET /api/meta/oauth`: troca o `code` por token curto e depois por **Long-Lived Token**, lista as páginas (`/me/accounts`) e as contas de Instagram ligadas, subscreve cada página a `messages`, e guarda em `SocialIntegration` (token **cifrado**) na organização da sessão. Só `OWNER`/`MANAGER`. Uma conta que já pertence a outra organização nunca é transferida.
- **Variáveis (Vercel):** `NEXT_PUBLIC_META_APP_ID` (incorporada no build: faça redeploy depois de a definir), `META_APP_SECRET` (já existe), opcional `NEXT_PUBLIC_META_CONFIG_ID` (Login for Business). No painel da Meta adicione `https://<dominio>/api/meta/oauth` a "Valid OAuth Redirect URIs".
- **Permissões:** `instagram_basic`, `instagram_manage_messages`, `pages_manage_metadata`, `pages_read_engagement`, `pages_messaging` e `pages_show_list` (necessária para listar as páginas). Enquanto a app estiver em modo de desenvolvimento só funcionam contas com papel na app; para clientes reais é preciso **App Review** (acesso avançado) e verificação do negócio.
- **Desligar canal:** em cada conta ligada há "Desligar" (dois cliques; só OWNER/MANAGER). Apaga a ligação e as credenciais, deixa de receber os eventos da página na Meta (se nenhum outro canal a usar) e mantém o histórico de conversas. `DELETE /api/channels/<id>`.
- **Token recusado pela Meta (erro 190):** a integração passa a `TOKEN_EXPIRED`. Os eventos recebidos continuam a entrar (não precisam do token), os envios falham logo e um aviso no topo do dashboard pede para voltar a ligar. Ligar de novo (OAuth, ou novo token no ecrã do WhatsApp) reativa-a.

## E-mail (Resend): registo, boas-vindas, recuperação e convites
- **Configurar o Resend:** crie uma conta em resend.com, adicione o seu domínio e crie no DNS os registos que ele pede (SPF e DKIM) até ficar **Verified**. Crie uma API key. Na Vercel: `RESEND_API_KEY` e `EMAIL_FROM` (`Zentrix <no-reply@o-seu-dominio>`, do domínio verificado), opcional `EMAIL_REPLY_TO`. Valide com `node scripts/test-email.mjs o-seu-email@exemplo.com`.
- **O que passa a sair pelo Resend** (se `RESEND_API_KEY`, `EMAIL_FROM` e `SUPABASE_SERVICE_ROLE_KEY` estão definidas): confirmação do registo, e-mail de **boas-vindas** (depois de confirmar), **recuperação de palavra-passe** ("Esqueceu a palavra-passe?" no login) e **convites de equipa**. O utilizador é criado com `admin.generateLink`, que não envia nada, e o e-mail vai pelo nosso modelo (pt/en), com repetições em falhas passageiras e chave de idempotência.
- **Os links dos e-mails levam a `/<lingua>/confirm`**, que pede um clique antes de gastar o token de uso único (os antivírus de e-mail abrem os links e consumiriam-no). A palavra-passe nova invalida as outras sessões.
- **Recurso:** sem Resend, tudo continua a funcionar como antes, pelo SMTP do Supabase (com os limites dele). Se o Resend falhar a enviar a confirmação do registo, o Supabase envia o dele.
- **No Supabase (Authentication → URL Configuration):** *Site URL* = o seu domínio e, em *Redirect URLs*, `https://<dominio>/auth/callback`. Mantenha *Confirm email* ligado.
- Os modelos estão em `lib/email/templates.ts`.

## Módulos escondidos e polimento do painel
- O painel só mostra o que está operacional: Dashboard, Inbox, Contactos, IA (visão geral e ficha), Configurações (Primeiros passos, Canais, Faturação, Equipa, Perfil, WhatsApp). CRM, Marketing, E-commerce, Análises, Integrações, Webhooks, Persona e Segmentos estão **escondidos** (fora do menu e com a rota a 404) em `lib/features.ts`. Para lançar um, ponha-o a `true`; para os ver em desenvolvimento, `NEXT_PUBLIC_SHOW_UNFINISHED=true` (ignorado em produção).
- `npm run check:features` (parte do `check:static`) falha se aparecer um botão "Em breve" fora dos módulos escondidos.

## Meta: App Review e Embedded Signup
- Guia completo, textos para o revisor e roteiro do vídeo: **`docs/META_APP_REVIEW.md`**. Verificador: `npm run check:meta -- --url https://<dominio>` (configuração + páginas legais, cabeçalhos, callback de eliminação, webhook).
- **WhatsApp Embedded Signup:** com `NEXT_PUBLIC_META_WA_CONFIG_ID` o cartão do WhatsApp abre o popup da Meta (`POST /api/meta/whatsapp/signup` confirma os ids na Graph API, subscreve a conta e guarda o token cifrado). Sem ele, fica o ecrã manual.
- Cabeçalhos de segurança em todas as respostas (`next.config.ts`): `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`. Sem CSP, de propósito (o SDK do Facebook).

## Legal, Meta App Review e eliminação de dados
- Páginas públicas: `/<lingua>/terms`, `/<lingua>/privacy` (pt e en; es mostra a versão em inglês) e `/<lingua>/data-deletion` (instruções + formulário) com estado em `/data-deletion/status?code=…`. Definam `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_COMPANY_ADDRESS` e `NEXT_PUBLIC_SUPPORT_EMAIL` na Vercel. **O texto é uma base e deve ser revisto por um advogado antes de lançar.** Mantenha `lib/legal/content.ts` em linha com o que o produto faz (novos subcontratantes, finalidades).
- **Painel da Meta (Definições da app → Básico):** URL da Política de Privacidade = `https://<dominio>/en/privacy`; URL dos Termos = `https://<dominio>/en/terms`; **Callback de eliminação de dados** = `https://<dominio>/api/meta/data-deletion` (verifica a assinatura com `META_APP_SECRET`, apaga as ligações feitas pelo utilizador e devolve `{url, confirmation_code}`). Só as ligações feitas DEPOIS desta versão ficam associadas ao utilizador do Facebook (`SocialIntegration.metaUserId`).
- **Eliminar conta:** Configurações → Perfil → Eliminar conta (só o proprietário; escrever ELIMINAR). Cancela a subscrição no Stripe (se falhar, não apaga nada), apaga ficheiros de áudio, canais, utilizadores, conversas, mensagens, contactos, chaves e convites, e as contas de Auth. Funciona mesmo sem plano ativo.
- **Pedidos do formulário público** ficam em `DataDeletionRequest` (estado `received`) e exigem tratamento manual **depois de verificar o e-mail**: `node scripts/list-deletion-requests.mjs`. Prazo legal: 30 dias.

## Equipa, convites e onboarding
- Papéis: Proprietário (OWNER), Gestor (MANAGER), Agente (STAFF, o nome visível). Convidar (Configurações → Equipa): o proprietário convida gestores e agentes; o gestor só agentes. Cada pessoa pertence a **uma** organização (um e-mail com conta noutra organização não pode ser convidado). Lugares: 5 (membros + convites pendentes). Convites valem 7 dias e uma vez; só o hash do token fica guardado.
- **E-mail dos convites:** configure `RESEND_API_KEY` e `EMAIL_FROM` (domínio verificado no Resend). Sem isso o convite é criado e o ecrã mostra o link para copiar e enviar.
- O convidado abre `/<lingua>/invite/<token>`, escolhe a palavra-passe e entra na organização com o papel do convite. Quem já tinha conta e inicia sessão com o e-mail convidado (verificado) também o recebe.
- **Papéis nas rotas:** ficha do negócio (escrita), ligar IA, credenciais do WhatsApp, canais, chaves de API, faturação e equipa exigem OWNER/MANAGER; mudar papéis e eliminar a conta, só OWNER.
- **Primeiros passos:** o painel mostra "ligar canal → preencher ficha → ligar a IA" (estado real, lido da base de dados) enquanto houver passos por fazer; também em `/dashboard/settings/setup`.

## API Keys, papéis (RBAC) e validação
- Papéis por utilizador: `OWNER` > `MANAGER` > `STAFF` (`User.role`, por omissão `STAFF`; quem cria a organização é `OWNER`). Faturação (`/api/stripe/*`) e gestão de chaves exigem `OWNER` ou `MANAGER`. Em código: `requireRole(["OWNER", "MANAGER"], request?)` (`lib/rbac.ts`); sem `request` só aceita sessão (Server Actions).
- **Utilizadores que já existiam ficam `STAFF`**: corra `node scripts/backfill-roles.mjs` (`--dry` para ver) depois do `db push`, senão ninguém abre o Checkout.
- Chaves de API: `POST /api/keys` `{ "name": "CRM", "role": "STAFF", "expiresInDays": 365 }` (sessão) devolve a chave **uma única vez** (`zxk_…`); só o hash SHA-256 fica na base de dados. `GET /api/keys` lista, `DELETE /api/keys/<id>` revoga. Um cliente externo envia `x-api-key: zxk_…` (hoje aceite em `POST /api/whatsapp/send`); 120 pedidos/min por chave. Para aceitar chaves noutra rota, use `requireRole([...], request)` nela.
- Entradas externas validadas com Zod em `lib/validations/` (webhooks do Stripe e da Meta, chaves, envio): o que não encaixa é ignorado (webhooks) ou recusado com 400.

## Segurança e verificações
- `npm run check` corre lint, typecheck, `check:server-only` (nenhum componente de cliente chega a módulos de servidor e todo o `lib/` sensível tem `import "server-only"`), `check:i18n` (mesmas chaves e placeholders em pt/en/es), testes e o build. O mesmo corre no GitHub Actions (`.github/workflows/check.yml`).
- `supabase/migrations/20261003120000_rls_hardening.sql` fecha a base de dados à API pública do Supabase (RLS ligado e forçado em todas as tabelas, `anon`/`authenticated` sem privilégios). Correr **depois** de `npx prisma db push` e voltar a correr sempre que o schema ganhe tabelas.
- Scripts em `scripts/` que importam `lib/` correm com `node --conditions=react-server scripts/<nome>.mjs` (o `server-only` só o permite assim fora do Next).
