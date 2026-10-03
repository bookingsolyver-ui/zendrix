// Garante que nada "Em breve" chega aos clientes: os componentes que usam SoonButton/notifySoon só podem
// existir dentro dos módulos escondidos (lib/features.ts). Se alguém pôr um botão "Em breve" numa página
// operacional, `npm run check` falha. Os módulos escondidos têm as rotas a 404 (FeatureGate) e saem do menu.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Onde "Em breve" é aceitável: módulos ainda não lançados, o checkout de e-commerce e o próprio componente.
const HIDDEN = [
  "app/[locale]/dashboard/(app)/crm/",
  "app/[locale]/dashboard/(app)/marketing/",
  "app/[locale]/dashboard/(app)/ecommerce/",
  "app/[locale]/dashboard/(app)/analytics/",
  "app/[locale]/dashboard/(app)/webhooks/",
  "app/[locale]/dashboard/(app)/integrations/",
  "app/[locale]/dashboard/(app)/automations/",
  "app/[locale]/dashboard/(app)/ai/settings/",
  "components/dashboard/crm/",
  "components/dashboard/marketing/",
  "components/dashboard/ecommerce/",
  "components/dashboard/analytics/",
  "components/dashboard/webhooks/",
  "components/dashboard/integrations/",
  "components/dashboard/automations/",
  "components/dashboard/ai/settings/",
  "components/checkout/",
  "components/ui/soon-button.tsx",
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

const offenders = [];
for (const root of ["app", "components"]) {
  for (const file of walk(root)) {
    if (HIDDEN.some((prefix) => file.startsWith(prefix))) continue;
    if (/SoonButton|notifySoon|SoonToaster/.test(readFileSync(file, "utf8")) && file !== "app/[locale]/layout.tsx") offenders.push(file);
  }
}

if (offenders.length) {
  console.error(`check:features — ${offenders.length} ficheiro(s) com "Em breve" fora dos módulos escondidos:\n` + offenders.map((f) => `  ✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log("check:features — ok (nenhum botão \"Em breve\" nas áreas operacionais)");
