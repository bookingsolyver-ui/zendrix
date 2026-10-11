// Proxy com chave à frente da Voicebox local (que NÃO tem autenticação). Só deixa passar o que o Kwanza Flow usa para
// gerar voz; tudo o resto (importar/apagar perfis, descarregar modelos, histórico...) recebe 404. Sem dependências.
//
//   VOICEBOX_PROXY_KEY=<chave longa> node scripts/voicebox-proxy.mjs
//   (opcional) VOICEBOX_TARGET=http://127.0.0.1:17493  PORT=17600
//
// Expõe-se este proxy (porta 17600), NUNCA a porta da Voicebox diretamente, e na Vercel a VOICEBOX_API_KEY é a mesma chave.
import { createServer, request as httpRequest } from "node:http";
import { timingSafeEqual } from "node:crypto";

const key = process.env.VOICEBOX_PROXY_KEY ?? "";
const target = new URL(process.env.VOICEBOX_TARGET ?? "http://127.0.0.1:17493");
const port = Number(process.env.PORT) || 17600;
if (key.length < 32) {
  console.error("Defina VOICEBOX_PROXY_KEY com pelo menos 32 caracteres (openssl rand -hex 32).");
  process.exit(1);
}

// Método + caminho permitidos. Os ids de geração são texto simples ([\w-]).
const ALLOWED = [
  ["GET", /^\/health$/],
  ["GET", /^\/profiles$/],
  ["POST", /^\/generate$/],
  ["GET", /^\/history\/[\w-]{1,64}$/],
  ["GET", /^\/generate\/[\w-]{1,64}\/status$/],
  ["POST", /^\/generate\/[\w-]{1,64}\/cancel$/],
  ["GET", /^\/audio\/[\w-]{1,64}$/],
];

const authorised = (header) => {
  const given = Buffer.from((header ?? "").replace(/^Bearer\s+/i, ""));
  const wanted = Buffer.from(key);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
};

createServer((req, res) => {
  const path = (req.url ?? "").split("?")[0];
  if (!authorised(req.headers.authorization)) return void res.writeHead(401).end("unauthorized");
  if (!ALLOWED.some(([method, re]) => req.method === method && re.test(path))) return void res.writeHead(404).end("not found");

  // A chave NÃO segue para a Voicebox (ela não a usa e não tem de a conhecer).
  const forward = { ...req.headers, host: target.host };
  delete forward.authorization;
  const upstream = httpRequest(
    { host: target.hostname, port: target.port, path: req.url, method: req.method, headers: forward },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  upstream.setTimeout(120_000, () => upstream.destroy());
  upstream.on("error", () => { if (!res.headersSent) res.writeHead(502).end("voicebox unavailable"); else res.end(); });
  req.pipe(upstream);
}).listen(port, "127.0.0.1", () => console.log(`Proxy do Voicebox em http://127.0.0.1:${port} → ${target.origin}`));
