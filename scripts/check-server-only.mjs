// Verificação estática da fronteira cliente/servidor (corre em `npm run check`):
//
//  1. Nenhum ficheiro "use client" pode importar (direta ou indiretamente) um módulo marcado com
//     `import "server-only"`. O Next também falha no build, mas isto diz QUAL é o caminho.
//     Imports só de tipos (`import type`) não contam: desaparecem na compilação.
//  2. Todo o módulo de lib/ que toque na base de dados, em segredos ou em APIs de servidor TEM de ter
//     `import "server-only"`. Assim um módulo novo não fica de fora por esquecimento.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const SOURCE = /\.(ts|tsx)$/;
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "supabase", "public"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (SOURCE.test(name) && !name.endsWith(".d.ts")) out.push(path);
  }
  return out;
}

const files = walk(root);
const text = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));

const isClient = (src) => /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/|\s)*["']use client["']/.test(src);
const isServerOnly = (src) => /^\s*import\s+["']server-only["']/m.test(src);

// Imports de VALOR de um ficheiro (ignora `import type` e listas só com `type X`).
function valueImports(src) {
  const specs = [];
  const re = /(?:import|export)\s+(type\s+)?([\s\S]*?)\s*from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g;
  for (const m of src.matchAll(re)) {
    const [, typeOnly, clause, from, dynamic, bare] = m;
    if (from !== undefined) {
      if (typeOnly) continue;
      const names = clause.match(/\{([^}]*)\}/)?.[1];
      const hasDefault = /^[A-Za-z_$*]/.test(clause.trim());
      if (names && !hasDefault && names.split(",").map((n) => n.trim()).filter(Boolean).every((n) => n.startsWith("type "))) continue;
      specs.push(from);
    } else specs.push(dynamic ?? bare);
  }
  return specs;
}

function resolveSpec(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = join(root, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else return null; // pacote de node_modules
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (text.has(candidate)) return candidate;
  }
  return null;
}

const errors = [];
const rel = (f) => relative(root, f);

// 1) cliente -> servidor
for (const entry of files.filter((f) => isClient(text.get(f)))) {
  const seen = new Set([entry]);
  const queue = [[entry, [entry]]];
  while (queue.length) {
    const [file, trail] = queue.shift();
    for (const spec of valueImports(text.get(file))) {
      if (spec === "server-only" || spec === "next/headers") {
        errors.push(`${rel(entry)} (client) chega a "${spec}" via ${trail.map(rel).join(" -> ")}`);
        continue;
      }
      const target = resolveSpec(spec, file);
      if (!target || seen.has(target)) continue;
      seen.add(target);
      if (isServerOnly(text.get(target))) {
        errors.push(`${rel(entry)} (client) importa o módulo só-de-servidor ${rel(target)} via ${[...trail, target].map(rel).join(" -> ")}`);
        continue;
      }
      queue.push([target, [...trail, target]]);
    }
  }
}

// 2) lib/ sensível tem de ter server-only
const SERVER_IMPORTS = /["'](?:@\/lib\/prisma|@\/lib\/supabase\/server|@prisma\/client|@prisma\/adapter-pg|pg|next\/headers|node:[a-z/]+)["']/;
const PUBLIC_ENV = /process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+|NODE_ENV)\b/g;
for (const file of files.filter((f) => rel(f).startsWith("lib/") && !rel(f).includes(".test."))) {
  const src = text.get(file);
  if (isServerOnly(src) || isClient(src)) continue;
  const secretEnv = [...src.matchAll(/process\.env\.([A-Z0-9_]+)/g)].some(([full]) => !full.match(new RegExp(PUBLIC_ENV.source)));
  const serverImport = valueImports(src).some((s) => SERVER_IMPORTS.test(`"${s}"`));
  if (secretEnv || serverImport) {
    errors.push(`${rel(file)} usa recursos de servidor (${secretEnv ? "segredos/env" : "importa módulos de servidor"}) mas não tem import "server-only"`);
  }
}

if (errors.length) {
  console.error(`check:server-only — ${errors.length} problema(s):\n` + errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`check:server-only — ok (${files.length} ficheiros analisados)`);
