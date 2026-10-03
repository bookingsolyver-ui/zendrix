// Verificação do next-intl (corre em `npm run check`): os ficheiros de messages/ têm de ter as MESMAS chaves
// que o idioma por omissão (pt), e cada chave os mesmos {placeholders} ICU, senão uma tradução rebenta ou
// mostra "{name}" em bruto em produção. Também verifica que cada locale de i18n/routing.ts tem ficheiro.
import { readdirSync, readFileSync } from "node:fs";

const DEFAULT = "pt";
const load = (locale) => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"));

const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === "object" ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, String(value)]],
  );
const placeholders = (text) => [...new Set([...text.matchAll(/\{\s*([A-Za-z0-9_]+)\s*[,}]/g)].map((m) => m[1]))].sort().join(",");

const routing = readFileSync("i18n/routing.ts", "utf8");
const declared = [...(routing.match(/locales:\s*\[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
const onDisk = readdirSync("messages").filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));

const errors = [];
for (const locale of declared) if (!onDisk.includes(locale)) errors.push(`messages/${locale}.json não existe (locale declarado em i18n/routing.ts)`);
for (const locale of onDisk) if (!declared.includes(locale)) errors.push(`messages/${locale}.json não está em i18n/routing.ts`);

const base = new Map(flatten(load(DEFAULT)));
for (const locale of onDisk.filter((l) => l !== DEFAULT)) {
  const other = new Map(flatten(load(locale)));
  for (const key of base.keys()) {
    if (!other.has(key)) errors.push(`${locale}: falta a chave "${key}"`);
    else if (placeholders(base.get(key)) !== placeholders(other.get(key))) {
      errors.push(`${locale}: "${key}" tem placeholders diferentes de ${DEFAULT} ({${placeholders(other.get(key))}} vs {${placeholders(base.get(key))}})`);
    }
  }
  for (const key of other.keys()) if (!base.has(key)) errors.push(`${locale}: chave a mais "${key}" (não existe em ${DEFAULT})`);
}

if (errors.length) {
  console.error(`check:i18n — ${errors.length} problema(s):\n` + errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`check:i18n — ok (${onDisk.length} idiomas, ${base.size} chaves)`);
