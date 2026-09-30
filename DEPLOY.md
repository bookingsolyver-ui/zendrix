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
- O limitador de pedidos, o cache de URLs assinados e o estado do TTS são **em memória, por instância**: na Vercel cada instância conta à parte.
- O webhook pede `maxDuration = 60`, o máximo do plano gratuito; o agente tem um orçamento de 40 s para o modelo.
- Rode as chaves que tenham passado por conversas ou terminais partilhados antes de as pôr em produção.
