// Gera o script embebível de um popup. Puro (sem servidor). O script é JavaScript simples, sem dependências, e
// constrói tudo com createElement/textContent dentro de um Shadow DOM: o texto do cliente nunca é interpretado
// como HTML e o CSS do site não afeta o popup (nem o contrário).
import type { PopupConfig } from "./schema.ts";

// JSON seguro para pôr dentro de um <script>: sem "</script>", sem comentários HTML e sem os separadores de linha
// do Unicode (que partiam o JavaScript antigo).
export const safeJson = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

export const NOOP_SCRIPT = "/* Kwanza Flow: popup indisponível */\n";

export function buildEmbedScript(input: { key: string; apiBase: string; config: PopupConfig }): string {
  const { config } = input;
  const data = safeJson({
    k: input.key,
    api: input.apiBase,
    t: config.title,
    d: config.description,
    b: config.buttonText,
    s: config.successMessage,
    c: config.consentText,
    col: config.color,
    pos: config.position,
    trg: config.trigger,
    delay: config.delaySeconds,
    name: config.askName,
    email: config.askEmail,
    days: config.frequencyDays,
  });
  return `/* Kwanza Flow popup */
(function(){
"use strict";
var C=${data};
if(typeof document==="undefined"||window["__zx_"+C.k])return;
window["__zx_"+C.k]=1;
var LS="zx_popup_"+C.k,shown=false,host;
function seen(){try{var t=+localStorage.getItem(LS);return !!t&&C.days>0&&Date.now()-t<C.days*864e5}catch(e){return false}}
function mark(){try{localStorage.setItem(LS,String(Date.now()))}catch(e){}}
if(seen())return;
function post(path,body){return fetch(C.api+path,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify(body),keepalive:true})}
function el(tag,props,kids){var n=document.createElement(tag),k;for(k in props)n[k]=props[k];(kids||[]).forEach(function(c){n.appendChild(c)});return n}
var ERR={invalid_phone:"Número de telemóvel inválido.",invalid_email:"E-mail inválido.",name_required:"Indique o seu nome.",email_required:"Indique o seu e-mail.",consent_required:"É preciso aceitar para continuar.",rate_limited:"Demasiados pedidos. Tente mais tarde."};
var CSS=":host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}"+
".ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:16px}"+
".bx{position:fixed;z-index:2147483646;margin:16px}.bx.bottom-right{right:0;bottom:0}.bx.bottom-left{left:0;bottom:0}"+
".dg{background:#fff;color:#111;border-radius:16px;padding:24px;width:100%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,.35);position:relative}"+
"h2{margin:0 24px 6px 0;font-size:20px;line-height:1.25}p{margin:0 0 14px;font-size:14px;line-height:1.45;color:#444}"+
"input[type=text],input[type=email],input[type=tel]{width:100%;padding:10px 12px;margin:0 0 10px;border:1px solid #cfd4dc;border-radius:10px;font-size:15px;color:#111;background:#fff}"+
"label.cs{display:flex;gap:8px;align-items:flex-start;font-size:12px;color:#555;margin:2px 0 12px}"+
"button.go{width:100%;padding:12px;border:0;border-radius:999px;font-size:15px;font-weight:600;color:#fff;cursor:pointer}button.go:disabled{opacity:.6;cursor:default}"+
"button.x{position:absolute;top:10px;right:12px;border:0;background:none;font-size:22px;line-height:1;color:#777;cursor:pointer}"+
".er{color:#b42318;font-size:13px;margin:0 0 10px}.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}";
function build(){
host=document.createElement("div");
var root=host.attachShadow({mode:"open"});
var st=document.createElement("style");st.textContent=CSS;root.appendChild(st);
var fields=[];
function field(type,name,ph,ac){var i=el("input",{type:type,placeholder:ph,autocomplete:ac,name:name});i.setAttribute("aria-label",ph);fields.push(i);return i}
var nameI=C.name!=="off"?field("text","name","Nome"+(C.name==="required"?"":" (opcional)"),"name"):null;
var phoneI=field("tel","phone","Telemóvel (ex.: +351 912 345 678)","tel");
var mailI=C.email!=="off"?field("email","email","E-mail"+(C.email==="required"?"":" (opcional)"),"email"):null;
var hp=el("input",{type:"text",name:"website",tabIndex:-1,autocomplete:"off",className:"hp"});hp.setAttribute("aria-hidden","true");
var cb=el("input",{type:"checkbox"});
var cons=el("label",{className:"cs"},[cb,el("span",{textContent:C.c})]);
var err=el("p",{className:"er",role:"alert"});err.style.display="none";
var go=el("button",{type:"submit",className:"go",textContent:C.b});go.style.background=C.col;
var form=el("form",{noValidate:true},[].concat(nameI?[nameI]:[],[phoneI],mailI?[mailI]:[],[hp,cons,err,go]));
var close=el("button",{type:"button",className:"x",textContent:"\\u00d7"});close.setAttribute("aria-label","Fechar");
var dg=el("div",{className:"dg",role:"dialog"},[close,el("h2",{textContent:C.t})].concat(C.d?[el("p",{textContent:C.d})]:[],[form]));
dg.setAttribute("aria-modal","true");dg.setAttribute("aria-label",C.t);
var wrap=C.pos==="center"?el("div",{className:"ov"},[dg]):el("div",{className:"bx "+C.pos},[dg]);
root.appendChild(wrap);document.body.appendChild(host);
function done(){mark();if(host&&host.parentNode)host.parentNode.removeChild(host);document.removeEventListener("keydown",esc)}
function esc(e){if(e.key==="Escape")done()}
document.addEventListener("keydown",esc);
close.addEventListener("click",done);
if(C.pos==="center")wrap.addEventListener("click",function(e){if(e.target===wrap)done()});
form.addEventListener("submit",function(e){
e.preventDefault();err.style.display="none";
go.disabled=true;
post("/submit",{name:nameI?nameI.value:"",phone:phoneI.value,email:mailI?mailI.value:"",consent:cb.checked,website:hp.value})
.then(function(r){return r.json()})
.then(function(d){
if(d&&d.success){mark();dg.textContent="";dg.appendChild(el("h2",{textContent:C.s}));setTimeout(done,3500)}
else{go.disabled=false;err.textContent=ERR[d&&d.error]||"Não foi possível enviar. Tente novamente.";err.style.display="block"}})
.catch(function(){go.disabled=false;err.textContent="Sem ligação. Tente novamente.";err.style.display="block"});
});
(nameI||phoneI).focus();
}
function show(){if(shown)return;shown=true;build();post("/view",{}).catch(function(){})}
function start(){
if(C.trg==="exit"&&!(window.matchMedia&&window.matchMedia("(hover: none)").matches)){
document.addEventListener("mouseout",function(e){if(!e.relatedTarget&&e.clientY<=0)show()});
}else setTimeout(show,(C.trg==="exit"?20:C.delay)*1000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
`;
}
