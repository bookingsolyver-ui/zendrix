// Gateway local para partilhar UM túnel (o plano gratuito do ngrok só dá um domínio) entre o OpenWA e a Voicebox:
//   /_voicebox/...  -> proxy com chave da Voicebox (scripts/voicebox-proxy.mjs, porta 17600), sem o prefixo
//   tudo o resto    -> OpenWA (porta 2785, que tem a sua própria chave de API)
// Aponte o túnel a esta porta:  ngrok http 2790 --url=<o-seu-dominio>.ngrok-free.dev
// Sem dependências. Só para testes/demonstração: em produção, cada serviço tem o seu domínio.
import { createServer, request as httpRequest } from "node:http";

const PORT = Number(process.env.PORT) || 2790;
const OPENWA = new URL(process.env.OPENWA_TARGET ?? "http://127.0.0.1:2785");
const VOICE = new URL(process.env.VOICEBOX_PROXY_TARGET ?? "http://127.0.0.1:17600");
const PREFIX = "/_voicebox";

createServer((req, res) => {
  const url = req.url ?? "/";
  const isVoice = url === PREFIX || url.startsWith(`${PREFIX}/`) || url.startsWith(`${PREFIX}?`);
  const target = isVoice ? VOICE : OPENWA;
  const path = isVoice ? url.slice(PREFIX.length) || "/" : url;

  const upstream = httpRequest(
    { host: target.hostname, port: target.port, path, method: req.method, headers: { ...req.headers, host: target.host } },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.setTimeout(120_000, () => upstream.destroy());
  upstream.on("error", () => { if (!res.headersSent) res.writeHead(502).end("upstream unavailable"); else res.end(); });
  req.pipe(upstream);
}).listen(PORT, "127.0.0.1", () => console.log(`Gateway em http://127.0.0.1:${PORT}  (${PREFIX}/* -> ${VOICE.origin}, resto -> ${OPENWA.origin})`));
