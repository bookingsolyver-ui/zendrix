# Kwanza Flow · WhatsApp por QR Code (OpenWA)

Canal **não oficial**: cada cliente liga o seu número lendo um QR Code (sessão do WhatsApp Web). Não passa pela Meta, mas o WhatsApp **proíbe automação não oficial nos Termos** e pode restringir ou banir números. A humanização reduz o risco, não o elimina. Diga isto aos clientes (já está no ecrã de ligação). Quando a verificação da Meta estiver concluída, o canal oficial continua a ser o recomendado.

## Arquitetura
```
Browser ──► kwanzaflow.com (Vercel) ──X-API-Key──► OpenWA (VPS, Docker, volume com as sessões)
                ▲                                        │
                └──── POST /api/openwa/webhook ◄─────────┘   (assinado: X-OpenWA-Signature)
```
- O OpenWA é um processo **permanente** com sessões em disco: não corre na Vercel. Precisa de uma VPS (≥ 2 GB de RAM com o motor Baileys, sem Chromium).
- Uma sessão por organização (`kf-<id>`), guardada em `SocialIntegration` com `providerAccountId = qr:<id da sessão>`. Não há tabelas novas.
- Entrada: webhook → `saveInboundMessage` → agente → fila de saída (a mesma da Meta). Saída: fila → `lib/openwa/transport.ts`.
- Uma organização usa um WhatsApp de cada vez (oficial **ou** QR).

## 1. OpenWA na VPS
```bash
git clone <o-teu-fork-ou-pasta-OpenWA-main> openwa && cd openwa
cp .env.example .env
```
No `.env` do OpenWA (descomenta só o que precisas):
```
NODE_ENV=production
ENGINE_TYPE=baileys            # sem Chromium: muito mais leve
AUTO_START_SESSIONS=true       # volta a ligar as sessões depois de um reinício (1 só instância!)
API_MASTER_KEY=<openssl rand -hex 32>   # chave ADMIN (mín. 32 caracteres). É o OPENWA_API_KEY da Vercel
```
```bash
docker compose up -d --build   # escuta em 127.0.0.1:2785; as sessões ficam no volume `openwa-data`
```
**Persistência:** não apagues o volume `openwa-data` (`docker compose down -v` apaga as sessões e todos os clientes têm de ler o QR de novo). Faz backup dele.

## 2. HTTPS (Caddy)
Expõe só a API, com TLS. O acesso é por chave (`X-API-Key`), por isso nunca ponhas a chave no browser.
```
wa.o-teu-dominio.com {
  reverse_proxy 127.0.0.1:2785
}
```
Para esconder o painel do OpenWA do público, restringe os caminhos: `@api path /api/*` + `respond 404` para o resto.

## 3. Vercel (Production)
| Variável | Valor |
|---|---|
| `OPENWA_URL` | `https://wa.o-teu-dominio.com` |
| `OPENWA_API_KEY` | a `API_MASTER_KEY` do OpenWA |
| `INTEGRATION_ENCRYPTION_KEY` | já existe: assina também os webhooks do OpenWA (não a mudes) |
| `NEXT_PUBLIC_APP_URL` | `https://kwanzaflow.com` (o OpenWA tem de alcançar `…/api/openwa/webhook`) |

Faz redeploy. Os clientes ligam em **Definições → Canais → «Ligar o WhatsApp por QR Code»** (`/dashboard/settings/whatsapp-qr`).

## 4. Humanização e anti-ban (`lib/openwa/humanize.ts`)
- **A escrever…:** presença `typing` durante ~35 ms/caractere (1,2 a 5 s, ±15%), depois envia. Voz: `recording` ~14 caracteres/s (2 a 7 s).
- **Jitter:** 0,9 a 2,6 s entre mensagens seguidas ao mesmo cliente.
- **Limites por número** (minuto/hora/dia, na base de dados, partilhados por todas as instâncias) com **aquecimento**: < 3 dias 6/40/150, < 14 dias 10/100/400, depois 15/200/800. O que passa do limite fica **adiado**, não perdido.
- Fila: a outbox Postgres existente (reivindicação atómica, nunca reenvia sem certeza, ordem por destinatário). Não precisa de Redis.
- Grupos e mensagens nossas são ignorados. Notas de voz **recebidas** por QR ainda não são transcritas (o agente pede ao cliente que escreva).

## Payloads (exemplos, API do OpenWA)
```
POST /api/sessions/{id}/chats/typing   {"chatId":"244923000111@c.us","state":"typing"}
POST /api/sessions/{id}/messages/send-text   {"chatId":"244923000111@c.us","text":"Olá!"}
POST /api/sessions/{id}/messages/send-audio  {"chatId":"…@c.us","base64":"…","mimetype":"audio/ogg; codecs=opus","ptt":true}
```
Webhook recebido: `{ "event":"message.received", "sessionId":"…", "data":{ "id","from","chatId","body","type","timestamp","fromMe","isGroup" } }` com `X-OpenWA-Signature: sha256=<hmac do corpo>`.

## Limites conhecidos
- Nada foi testado contra um OpenWA real: os caminhos foram conferidos com o `openapi.json` da v0.24. Se a tua versão divergir, o único ficheiro a ajustar é `lib/openwa/client.ts`.
- Contactos com endereço `@lid` (sem número visível) são ignorados.
- Modelos (templates) da Meta não existem neste canal; campanhas em massa por aqui são desaconselhadas (risco de banimento).
