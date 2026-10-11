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

| Variável                     | Valor                                                                      |
| ---------------------------- | -------------------------------------------------------------------------- |
| `OPENWA_URL`                 | `https://wa.o-teu-dominio.com`                                             |
| `OPENWA_API_KEY`             | a `API_MASTER_KEY` do OpenWA                                               |
| `INTEGRATION_ENCRYPTION_KEY` | já existe: assina também os webhooks do OpenWA (não a mudes)               |
| `NEXT_PUBLIC_APP_URL`        | `https://kwanzaflow.com` (o OpenWA tem de alcançar `…/api/openwa/webhook`) |

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

## Testar em segurança (número dedicado)

1. Use um **chip/número dedicado a testes**, nunca o de um cliente nem o seu pessoal.
2. Defina na Vercel `OPENWA_ALLOWED_NUMBERS=2449XXXXXXXX,3519XXXXXXXX` (só os números de quem vai testar, com indicativo). Com isto o canal **só envia e só responde** a esses números: tudo o resto é ignorado e nada é guardado. Remova a variável quando passar a produção.
3. Mantenha o ritmo humano: poucas mensagens por hora no número novo (os limites de aquecimento já o impõem), conversas iniciadas pelo cliente, sem mensagens idênticas repetidas e sem campanhas em massa.
4. Se o número for restringido, pare de enviar e não ligue outro de imediato: reveja o que enviou.

## Isolamento por tenant e limpeza (session-manager)

- **Causa do «O servidor do OpenWA recusou o pedido»:** o OpenWA responde 409 a um nome de sessão repetido e o nome era determinístico por organização. Dois cliques/separadores em simultâneo, ou uma sessão que ficou no servidor depois de um reset, bloqueavam o tenant para sempre.
- `lib/openwa/session-manager.ts`: uma sessão por organização, **nome único por geração** (`zx-<sha256 do tenant>-<nonce>`), criação sob um **lock por tenant** (linha `platform = WA_QR_LOCK`, aproveita a restrição única existente; expira em 75 s). A sessão nova é criada antes de largar a antiga.
- `POST /api/whatsapp-qr/regenerate` («Gerar novo QR»): descarta a sessão presa **deste** tenant e cria outra. Recusa (409 `already_connected`) se o número estiver ligado.
- `GET /api/whatsapp-qr/events`: SSE por tenant (o tenant vem do cookie, não do URL); o browser reconecta sozinho e o polling de `/status` é a alternativa.
- `GET /api/cron/openwa-gc` (de 5 em 5 min, no `outbox.yml`): apaga QR pendentes há mais de 10 min e sessões `zx-…` sem dono com mais de 30 min. **Nunca** toca numa sessão ligada.
- `lib/openwa/tenant-guard.ts`: o tenant e o id da sessão vêm sempre da base de dados, nunca do cliente.
- **Limite:** um único servidor OpenWA não aguenta 10 000 sessões Baileys ligadas (RAM). Para essa escala é preciso repartir os tenants por vários nós OpenWA (hoje `OPENWA_URL` é único).
