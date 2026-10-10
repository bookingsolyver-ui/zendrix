// Valida o OpenWA depois do deploy: saúde, autenticação (chave certa, errada e em falta) e listagem de sessões.
//   OPENWA_URL=https://wa.kwanzaflow.com OPENWA_API_KEY=... node scripts/check-openwa.mjs
// Só leitura: não cria nem altera nada. Sai com código 1 se algo falhar.
const base = process.env.OPENWA_URL?.replace(/\/+$/, "");
const key = process.env.OPENWA_API_KEY;
if (!base || !key) {
  console.error("Defina OPENWA_URL e OPENWA_API_KEY.");
  process.exit(1);
}
if (!base.startsWith("https://") && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(base)) {
  console.error("OPENWA_URL tem de ser https:// (ou localhost).");
  process.exit(1);
}

let failed = 0;
async function check(label, path, headers, expectStatus, inspect) {
  try {
    const res = await fetch(`${base}/api${path}`, { headers, signal: AbortSignal.timeout(15000) });
    const body = await res.json().catch(() => null);
    const okStatus = Array.isArray(expectStatus) ? expectStatus.includes(res.status) : res.status === expectStatus;
    const extra = okStatus && inspect ? inspect(body) : "";
    console.log(`${okStatus ? "✔" : "✖"} ${label} → HTTP ${res.status}${extra ? ` (${extra})` : ""}`);
    if (!okStatus) failed++;
  } catch (err) {
    console.log(`✖ ${label} → ${err instanceof Error ? err.message : "erro"}`);
    failed++;
  }
}

await check("Saúde (sem chave)", "/health", {}, 200);
await check("Sem chave é recusado", "/sessions", {}, [401, 403]);
await check("Chave errada é recusada", "/sessions", { "X-API-Key": "chave-errada-0000000000000000000000" }, [401, 403]);
await check("Chave correta lista sessões", "/sessions", { "X-API-Key": key }, 200, (b) => {
  const list = Array.isArray(b) ? b : Array.isArray(b?.data) ? b.data : [];
  return `${list.length} sessão(ões)`;
});

console.log(failed ? `\n${failed} verificação(ões) falharam.` : "\nOpenWA acessível e autenticação a funcionar.");
process.exit(failed ? 1 : 0);
