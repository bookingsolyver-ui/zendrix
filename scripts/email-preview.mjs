// Pré-visualizador local dos e-mails da Zetrix:  npm run email:preview   (abre http://localhost:3030)
// Mostra o HTML REAL que o Resend envia (os mesmos modelos de lib/email/templates.ts), em PT, EN e ES, em largura
// de computador ou de telemóvel, com o assunto, o texto simples e os dados de exemplo. Só escuta em 127.0.0.1.
import { createServer } from "node:http";
import {
  accountApprovedEmail,
  accountRejectedEmail,
  confirmSignupEmail,
  endingSoonEmail,
  inviteEmail,
  passwordResetEmail,
  pendingReviewEmail,
  subscriptionRenewedEmail,
  systemNoticeEmail,
  welcomeEmail,
} from "../lib/email/templates.ts";

const PORT = Number(process.env.PORT) || 3030;
const BASE = "https://app.zetrix.test";
const days = (n) => new Date(Date.now() + n * 86_400_000);

// Os exemplos de cada modelo. `group` separa os e-mails de notificação dos de autenticação.
const SAMPLES = [
  { id: "pending", group: "Notificações", label: "1 · Conta em análise", build: (lang) => pendingReviewEmail({ name: "Ana Silva", lang }) },
  { id: "approved", group: "Notificações", label: "2 · Conta aprovada", build: (lang) => accountApprovedEmail({ name: "Ana Silva", loginUrl: `${BASE}/${lang}/login`, lang }) },
  { id: "rejected", group: "Notificações", label: "3 · Conta não aprovada", build: (lang) => accountRejectedEmail({ name: "Ana Silva", reason: "Não conseguimos confirmar a empresa.\nIndique o NIF e a página do negócio.", supportEmail: "ajuda@zetrix.test", lang }) },
  { id: "ending-trial", group: "Notificações", label: "4a · Fim do teste (5 dias)", build: (lang) => endingSoonEmail({ name: "Ana Silva", orgName: "Loja da Ana", kind: "trial", daysLeft: 5, endsAt: days(5), billingUrl: `${BASE}/${lang}/dashboard/settings/billing`, lang }) },
  { id: "ending-sub", group: "Notificações", label: "4b · Fim da subscrição (5 dias)", build: (lang) => endingSoonEmail({ name: "Ana Silva", orgName: "Loja da Ana", kind: "subscription", daysLeft: 5, endsAt: days(5), billingUrl: `${BASE}/${lang}/dashboard/settings/billing`, lang }) },
  { id: "renewed", group: "Notificações", label: "5a · Subscrição renovada (com recibo)", build: (lang) => subscriptionRenewedEmail({ name: "Ana Silva", orgName: "Loja da Ana", plan: "Zetrix Pro", renewedUntil: days(30), amountLabel: "29,90 €", receiptUrl: "https://invoice.stripe.com/i/acct_demo/test_123", billingUrl: `${BASE}/${lang}/dashboard/settings/billing`, lang }) },
  { id: "renewed-no-receipt", group: "Notificações", label: "5b · Subscrição renovada (sem recibo)", build: (lang) => subscriptionRenewedEmail({ name: "Ana Silva", orgName: "Loja da Ana", plan: null, renewedUntil: days(30), billingUrl: `${BASE}/${lang}/dashboard/settings/billing`, lang }) },
  { id: "maintenance", group: "Notificações", label: "6a · Manutenção programada", build: (lang) => systemNoticeEmail({ name: "Ana Silva", kind: "maintenance", text: { subject: "Manutenção programada no sábado", body: "Vamos atualizar a infraestrutura para melhorar o desempenho.\n\nPode haver breves interrupções no envio de mensagens." }, startsAt: days(7), endsAt: days(7.1), lang }) },
  { id: "notice", group: "Notificações", label: "6b · Aviso importante", build: (lang) => systemNoticeEmail({ name: "Ana Silva", kind: "notice", text: { subject: "Novidades na Zetrix", body: "Já pode criar popups de captação de contactos.\n\nExperimente em Marketing → Popups." }, lang }) },
  { id: "confirm", group: "Conta e acesso", label: "Confirmar o registo", build: (lang) => confirmSignupEmail({ name: "Ana Silva", url: `${BASE}/${lang}/confirm?token_hash=abc&type=signup`, lang }) },
  { id: "welcome", group: "Conta e acesso", label: "Boas-vindas", build: (lang) => welcomeEmail({ name: "Ana Silva", dashboardUrl: `${BASE}/${lang}/dashboard`, lang }) },
  { id: "reset", group: "Conta e acesso", label: "Recuperar a palavra-passe", build: (lang) => passwordResetEmail({ url: `${BASE}/${lang}/confirm?token_hash=abc&type=recovery`, lang }) },
  { id: "invite", group: "Conta e acesso", label: "Convite para a equipa", build: (lang) => inviteEmail({ workspaceName: "Loja da Ana", inviterName: "Ana Silva", role: "MANAGER", url: `${BASE}/${lang}/invite/token123`, lang }) },
];

const PAGE = `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>E-mails · Zetrix</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#0a0a0b;color:#e5e7eb;display:grid;grid-template-columns:280px 1fr;height:100vh}
aside{border-right:1px solid #222;overflow:auto;padding:16px}h1{font-size:15px;margin:0 0 14px}h2{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin:18px 0 6px}
aside button{display:block;width:100%;text-align:left;background:none;border:0;color:#9ca3af;padding:8px 10px;border-radius:8px;font-size:13px;cursor:pointer}
aside button:hover{background:#17171a;color:#fff}aside button.on{background:#14291f;color:#34d399}
main{display:flex;flex-direction:column;min-width:0}.bar{display:flex;gap:10px;align-items:center;padding:12px 18px;border-bottom:1px solid #222;flex-wrap:wrap}
.seg{display:flex;background:#17171a;border-radius:999px;padding:3px}.seg button{border:0;background:none;color:#9ca3af;padding:6px 14px;border-radius:999px;font-size:12px;cursor:pointer}.seg button.on{background:#10b981;color:#06281d;font-weight:600}
.meta{padding:10px 18px;border-bottom:1px solid #222;font-size:12px;color:#9ca3af}.meta b{color:#e5e7eb}.stage{flex:1;overflow:auto;display:flex;justify-content:center;background:#16161a;padding:18px}
iframe{border:0;background:#fff;border-radius:10px;height:100%;min-height:600px;width:100%;max-width:640px}iframe.m{max-width:390px}
pre{margin:0;padding:18px;white-space:pre-wrap;font:12px/1.6 ui-monospace,monospace;color:#d1d5db;width:100%;max-width:760px}
.hide{display:none}
</style></head><body>
<aside><h1>E-mails da Zetrix</h1><div id="list"></div></aside>
<main>
 <div class="bar">
  <div class="seg" id="lang"><button data-v="pt" class="on">PT</button><button data-v="en">EN</button><button data-v="es">ES</button></div>
  <div class="seg" id="view"><button data-v="d" class="on">Computador</button><button data-v="m">Telemóvel</button><button data-v="t">Texto simples</button></div>
 </div>
 <div class="meta"><div>Assunto: <b id="subject"></b></div></div>
 <div class="stage"><iframe id="frame" title="Pré-visualização"></iframe><pre id="text" class="hide"></pre></div>
</main>
<script>
let items=[],cur=null,lang='pt',view='d';
const $=s=>document.querySelector(s);
async function load(){items=await (await fetch('/api/list')).json();let h='',g='';for(const i of items){if(i.group!==g){g=i.group;h+='<h2>'+g+'</h2>'}h+='<button data-id="'+i.id+'">'+i.label+'</button>'}$('#list').innerHTML=h;
 $('#list').addEventListener('click',e=>{const b=e.target.closest('button');if(b){cur=b.dataset.id;show()}});cur=items[0].id;show()}
async function show(){document.querySelectorAll('#list button').forEach(b=>b.classList.toggle('on',b.dataset.id===cur));
 const r=await (await fetch('/api/render?id='+cur+'&lang='+lang)).json();$('#subject').textContent=r.subject;$('#frame').srcdoc=r.html;$('#text').textContent=r.text;
 $('#frame').className=view==='m'?'m':'';$('#frame').classList.toggle('hide',view==='t');$('#text').classList.toggle('hide',view!=='t')}
for(const [id,set] of [['#lang',v=>lang=v],['#view',v=>view=v]]){$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;set(b.dataset.v);document.querySelectorAll(id+' button').forEach(x=>x.classList.toggle('on',x===b));show()})}
load();
</script></body></html>`;

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const json = (body, status = 200) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(body)); };
  if (url.pathname === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(PAGE); }
  if (url.pathname === "/api/list") return json(SAMPLES.map(({ id, group, label }) => ({ id, group, label })));
  if (url.pathname === "/api/render") {
    const sample = SAMPLES.find((s) => s.id === url.searchParams.get("id"));
    const lang = ["pt", "en", "es"].includes(url.searchParams.get("lang")) ? url.searchParams.get("lang") : "pt";
    return sample ? json(sample.build(lang)) : json({ error: "not_found" }, 404);
  }
  res.writeHead(404); res.end("not found");
}).listen(PORT, "127.0.0.1", () => console.log(`Pré-visualização dos e-mails: http://localhost:${PORT}`));
