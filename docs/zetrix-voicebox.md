# Kwanza Flow · Voz com a Voicebox

As respostas em nota de voz do agente são geradas pela [Voicebox](https://voicebox.sh) (código aberto, MIT), que substitui a ElevenLabs.

## O que é (e o que não é)
- A Voicebox é um **servidor Python com modelos de IA locais** (PyTorch/MLX). Não corre na Vercel: tem de estar numa máquina tua (VPS, servidor com GPU, ou um Mac sempre ligado).
- O Kwanza Flow só tem um **cliente** (`lib/voicebox/`) que chama a rota compatível com a OpenAI: `POST {VOICEBOX_URL}/v1/audio/speech`, pedindo Ogg/Opus (o formato das notas de voz do WhatsApp). O ficheiro é verificado (mono) e, se não servir, passa a MP3.
- A Voicebox **não tem autenticação nem chaves**. O `VOICEBOX_API_KEY` é uma chave que **tu inventas** e que o proxy à frente da Voicebox valida.
- Se a Voicebox estiver em baixo, o agente responde só por texto (e não volta a tentar durante 1 minuto).

## 1. Pôr a Voicebox a correr (exemplo com Docker)
```bash
git clone https://github.com/jamiepine/voicebox && cd voicebox
docker compose up -d --build      # escuta em 127.0.0.1:17600 (só local)
```
Abre a interface (ou `http://127.0.0.1:17600/docs`), descarrega um motor com português (ex.: Qwen3-TTS, Chatterbox Multilingual ou Kokoro) e **cria um perfil de voz** em português. Sem GPU, prefere um motor leve (Kokoro): os grandes são lentos em CPU.

## 2. Expô-la com HTTPS e chave (Caddy)
Expõe **só** a rota de síntese e exige a chave:
```
voz.o-teu-dominio.com {
  @speech path /v1/audio/speech
  @auth header Authorization "Bearer {env.VOICEBOX_API_KEY}"
  handle @speech {
    handle @auth { reverse_proxy 127.0.0.1:17600 }
    respond 401
  }
  respond 404
}
```
Gera a chave com `openssl rand -hex 32` e define-a no Caddy (`VOICEBOX_API_KEY`) e na Vercel (o mesmo valor).

## 3. Variáveis na Vercel (Settings → Environment Variables → Production)
| Variável | Valor |
|---|---|
| `AGENT_VOICE` | `true` |
| `VOICEBOX_URL` | `https://voz.o-teu-dominio.com` (https obrigatório) |
| `VOICEBOX_API_KEY` | a chave do passo 2 |
| `VOICEBOX_VOICE` | nome do perfil criado no passo 1 |
| `VOICEBOX_ENGINE`, `VOICEBOX_SPEED`, `VOICEBOX_TIMEOUT_MS` | opcionais |
| `AGENT_VOICE_MODE` | `mirror` (voz só quando o cliente falou) ou `always` |
| `AGENT_VOICE_DELIVERY` | `text_then_voice` (por omissão: texto já + voz em paralelo) ou `voice_only` |

Depois de alterar variáveis, faz **redeploy**. Removeram-se `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` e `ELEVENLABS_MODEL`: podes apagá-las da Vercel.

## 4. Testar
```bash
curl -s -o teste.ogg -X POST https://voz.o-teu-dominio.com/v1/audio/speech \
  -H "Authorization: Bearer $VOICEBOX_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"tts-1","voice":"NOME_DO_PERFIL","input":"Olá, bem-vindo!","response_format":"opus"}'
file teste.ogg   # deve dizer Ogg data, Opus
```
Depois envia uma nota de voz ao WhatsApp do agente: deves receber o texto de imediato e a nota de voz a seguir.
