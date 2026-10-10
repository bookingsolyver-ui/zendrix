# Camada C-Level: Predictive CFO, Kwanza Flow Portal, Immutable Audit Ledger

Só ficheiros novos e 2 modelos novos no fim de `prisma/schema.prisma` (`Proposal`, `ZetrixAuditLog`, sem relações). Única extensão a código anterior: dois valores novos em `NotificationKind` (`lib/alerts/notification-service.ts`).

## Plugar
1. `npx prisma db push` → `supabase/migrations/20261007120000_audit_ledger_immutable.sql` (trigger que recusa UPDATE/DELETE) → voltar a correr o `rls_hardening`.
2. Sem novas variáveis obrigatórias. `HANDOFF_SINCE` (já existente) decide se aprovar uma proposta também dispara o Handoff.
3. Links no menu: `/contacts/forecast` (Previsão) e `/contacts/proposals` (Propostas). A página pública do cliente é `/{locale}/portal/{token}`: não precisa de menu.
4. Para auditar qualquer mutação (nas **suas** rotas, quando quiser):
```ts
const ctx = await auditContext(request, who);
const updated = await AuditLedger.wrap(ctx, { entityType: "Receivable", entityId: id, action: "UPDATE" },
  () => prisma.receivable.update({ where: { id }, data }),
  { previous: () => prisma.receivable.findUnique({ where: { id } }), mode: "sync" /* dinheiro/permissões */ });
// Exportações de dados pessoais:  await AuditLedger.recordExport(ctx, "Contact", { count: rows.length });
```

## Predictive CFO (`lib/finance`)
- Risco por cliente (0–1) a partir do histórico de `Receivable` (pago − vencimento): faturas recentes pesam mais; **as últimas 3 pagas com >10 dias de atraso ⇒ risco ≥ 0,70**. Sem histórico: 0,30 (neutro).
- `/api/analytics/forecast` (OWNER/MANAGER): próximo mês civil (UTC), por moeda: faturas a vencer × (1 − risco) + vencidas × (1 − risco) + propostas abertas × taxa de ganho × (1 − risco). Taxa de ganho = contactos `WON` vs `LOST`, suavizada para 30% com poucos dados. Cada número vem com a razão.
- É estatística explicável, não um modelo treinado: com poucos dados um modelo seria pior.

## Kwanza Flow Portal (`lib/portal`)
- Criar proposta (`POST /api/proposals`) gera um token de 256 bits; só o **hash** fica na base de dados (hash e não cifra: o servidor nunca precisa de o recuperar). Válido 7 dias; «Novo link» invalida o anterior.
- Ver o link não consome nada (os pré-visualizadores do WhatsApp e os antivírus abrem links). Aprovar é um POST explícito, **uma só vez**, com verificação de origem e limite por IP; guarda IP e user-agent e regista no livro de auditoria.
- A aprovação põe o contacto em `WON` na mesma transação (não é um webhook HTTP para si próprio: seria menos fiável). **Decisão de produto a confirmar**: no resto do Kwanza Flow `WON` só vinha de pagamento confirmado; agora também vem de uma aprovação de orçamento. «Proposta» não existia no funil: é a entidade `Proposal`.
- O link só chega ao cliente por WhatsApp dentro da janela de 24 h; fora dela devolve o motivo e o gestor copia o link.
- A página do cliente está em pt/en/es (`TEXT` no ficheiro), noindex e sem referrer.

## Immutable Audit Ledger (`lib/audit`)
- `ZetrixAuditLog` (campos `entity_id`, `action`, `previous_payload`, `new_payload`, `actor_id`, `ip_address`), imutável por trigger. Coexiste com o `AuditEvent` do pacote anterior (eventos de sistema); podem unificar-se mais tarde.
- `AuditLedger` (singleton): `wrap` / `record` / `recordExport` / `list`. Modo `async` grava depois da resposta (`after`), sem a atrasar, mas uma linha pode perder-se se o processo morrer nesse instante; `sync` grava antes de responder. Segredos (`password`, `token`, `apiKey`...) são redigidos à entrada.
- Já usado nas propostas (criação, novo link, aprovação). **Nenhuma rota existente foi envolvida**: o interceptor audita o que o chamar.
- `GET /api/audit-ledger` (só OWNER). RGPD: o livro não se reescreve; trate pedidos de eliminação pseudonimizando na origem, e defina a política com o seu DPO.
