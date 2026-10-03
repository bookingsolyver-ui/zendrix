// A central de diagnóstico: transforma factos técnicos de uma organização (filas, canais, subscrição, limites...) em
// explicações em linguagem natural, com o passo seguinte para a equipa de suporte. Puro (sem servidor): recebe os
// factos já recolhidos e devolve uma lista ordenada de problemas. Testável sem base de dados.

export type Severity = "critical" | "warning" | "info" | "ok";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  meaning: string; // o que se passa, em linguagem natural
  fix: string; // o que o suporte deve fazer a seguir
  evidence?: string; // os factos que o provam (números, datas)
}

// ---------------------------------------------------------------------------------------------- códigos de erro
// Os motivos que o sistema grava nas mensagens, execuções e destinatários, traduzidos.
export function explainReason(code: string): { meaning: string; fix: string; severity: Severity } {
  const known: Record<string, { meaning: string; fix: string; severity: Severity }> = {
    token_expired: { meaning: "A Meta recusou o acesso ao canal: o token expirou ou foi revogado. Enquanto não for renovado, nada é enviado por esse canal.", fix: "Peça ao cliente para voltar a ligar o canal em Definições → Canais.", severity: "critical" },
    window_closed: { meaning: "Tentou-se enviar texto a alguém que não escreveu nas últimas 24 horas. A Meta só permite mensagens livres dentro dessa janela.", fix: "Não é uma avaria. Só se pode contactar quem escreveu há menos de 24 h; fora disso seria preciso um template aprovado pela Meta (ainda não suportado). Explique ao cliente.", severity: "info" },
    no_integration: { meaning: "O canal não está ligado (ou foi desligado), por isso não há por onde enviar.", fix: "Peça ao cliente para ligar o canal em Definições → Canais.", severity: "critical" },
    subscription_required: { meaning: "O envio foi bloqueado porque o plano da organização não estava ativo nesse momento.", fix: "Confirme o estado da subscrição. Se for engano, ative-a nesta página; se não, peça ao cliente para regularizar a faturação.", severity: "critical" },
    invalid_payload: { meaning: "A mensagem ficou corrompida na fila e não pôde ser enviada.", fix: "Caso raro: recolha o id da organização e passe à equipa técnica.", severity: "warning" },
    worker_interrupted: { meaning: "O servidor foi interrompido a meio do envio. Por segurança a mensagem não se reenvia (evitava duplicados ao cliente).", fix: "Veja na Inbox se o cliente chegou a receber; se não, reenvie à mão.", severity: "warning" },
    network: { meaning: "Falha de rede ao falar com a Meta. O sistema volta a tentar sozinho com intervalos crescentes.", fix: "Normalmente passageiro. Se persistir, veja o estado da Meta (metastatus.com).", severity: "info" },
    opted_out: { meaning: "O contacto pediu para não receber mensagens automáticas: nunca recebe.", fix: "Nada a fazer: é uma proteção do cliente final.", severity: "info" },
    no_conversation: { meaning: "O contacto nunca escreveu (por exemplo, foi criado à mão ou por um popup), por isso não existe conversa nem janela de 24 h.", fix: "Só se consegue enviar depois de a pessoa escrever primeiro.", severity: "info" },
    human_took_over: { meaning: "Um humano assumiu a conversa, por isso as mensagens automáticas ficaram suspensas.", fix: "Nada a fazer. Para retomar a automação, o cliente despausa a conversa na Inbox.", severity: "info" },
    daily_cap: { meaning: "Atingiu-se o limite diário de mensagens automáticas da organização.", fix: "Reinicia à meia-noite (UTC). Se o limite for curto para o cliente, ajuste AUTOMATION_DAILY_CAP.", severity: "warning" },
    previous_failed: { meaning: "Uma ação anterior da mesma automação falhou, por isso as seguintes não correram.", fix: "Veja o motivo da primeira ação falhada.", severity: "info" },
    automation_inactive: { meaning: "A automação foi desligada antes de a ação correr.", fix: "Nada a fazer.", severity: "info" },
    too_many_tasks: { meaning: "O quadro de tarefas está cheio (500) e não aceita mais.", fix: "Peça ao cliente para arquivar ou apagar tarefas concluídas.", severity: "warning" },
    internal: { meaning: "Erro interno do sistema ao processar este passo.", fix: "Consulte os registos do servidor (Vercel) à hora indicada e passe à equipa técnica.", severity: "warning" },
    cancelled: { meaning: "A campanha foi cancelada antes de chegar a este contacto.", fix: "Nada a fazer.", severity: "info" },
    no_change: { meaning: "A fase do contacto já era a pedida: nada a alterar.", fix: "Nada a fazer.", severity: "info" },
  };
  const exact = known[code];
  if (exact) return exact;
  if (code.startsWith("rate_or_outage_") || code === "http_429" || /^http_5\d\d$/.test(code)) {
    return { meaning: "A Meta limitou o ritmo de envio ou teve uma falha temporária. O sistema volta a tentar sozinho, com esperas cada vez maiores.", fix: "Normalmente resolve-se sozinho. Se persistir durante horas, reduza o volume de campanhas e confirme o estado da Meta.", severity: "warning" };
  }
  const meta = /^meta_(\d+)$/.exec(code);
  if (meta) {
    const spam = ["131048", "131049", "368"].includes(meta[1]);
    return spam
      ? { meaning: `A Meta limitou o número por suspeita de spam ou baixa qualidade (código ${meta[1]}). Insistir piora a reputação.`, fix: "Pare as campanhas, reveja o conteúdo e a lista de destinatários, e consulte a qualidade do número no Gestor de Negócios da Meta.", severity: "critical" }
      : { meaning: `A Meta recusou o envio (código ${meta[1]}).`, fix: `Procure o código ${meta[1]} na documentação de erros da Graph API e confirme o canal em Definições → Canais.`, severity: "warning" };
  }
  return { meaning: `Motivo técnico não reconhecido: «${code}».`, fix: "Recolha o id da organização e a hora, e passe à equipa técnica.", severity: "warning" };
}

// ---------------------------------------------------------------------------------------------------------- factos
export interface DiagnosticFacts {
  now: Date;
  org: {
    subStatus: string;
    trialEndsAt: Date | null;
    approvalStatus: string;
    approvalNote: string | null;
    blocked: boolean;
    blockedReason: string | null;
    hasStripeSubscription: boolean;
    periodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    agentEnabled: boolean;
    hasKnowledge: boolean;
    hasConnectAccount: boolean;
    paymentItems: number;
    createdAt: Date;
  };
  integrations: { platform: string; status: string; tokenExpiresAt: Date | null }[];
  lastInboundAt: Date | null;
  outbox: { pending: number; oldestPendingAt: Date | null; staleProcessing: number; failed24h: Record<string, number> };
  campaigns: { stuckSending: number; skipped7d: Record<string, number>; failed7d: Record<string, number> };
  automations: { overdueSteps: number; failed24h: Record<string, number> };
  limits: { label: string; used: number; max: number; consequence: string }[];
  apiKeys: { active: number; revoked: number; neverUsed: number };
  platform: { missing: { label: string; consequence: string }[] };
}

const DAY = 86_400_000;
const MIN = 60_000;
const days = (ms: number) => Math.max(0, Math.round(ms / DAY));
const dateText = (date: Date) => new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Lisbon" }).format(date);
const ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2, ok: 3 };

// Lê os factos e devolve os problemas, dos mais graves para os menos. Sem nada a assinalar, devolve um único «ok».
export function diagnose(f: DiagnosticFacts): Finding[] {
  const out: Finding[] = [];
  const add = (finding: Finding) => out.push(finding);
  const { org, now } = f;

  // ---- acesso e subscrição
  if (org.approvalStatus === "PENDING_APPROVAL") {
    add({ id: "pending_approval", severity: "warning", title: "Conta por aprovar", meaning: "O registo ainda não foi aprovado pela administração: a empresa não consegue entrar no painel nem usar nada.", fix: "Reveja o registo em Aprovações e aprove ou rejeite.", evidence: `Criada em ${dateText(org.createdAt)}` });
  } else if (org.approvalStatus === "REJECTED") {
    add({ id: "rejected", severity: "info", title: "Registo rejeitado", meaning: "A conta foi rejeitada e não tem acesso.", fix: "Se foi engano, aprove-a em Aprovações.", evidence: org.approvalNote ? `Motivo: ${org.approvalNote}` : undefined });
  }
  if (org.blocked) {
    add({ id: "blocked", severity: "critical", title: "Conta suspensa pela administração", meaning: "A organização está suspensa: perdeu o acesso e os envios, campanhas, automações e popups estão parados.", fix: "Se a suspensão já não faz sentido, desbloqueie a organização nesta página.", evidence: org.blockedReason ? `Motivo: ${org.blockedReason}` : undefined });
  }
  if (org.subStatus === "trialing") {
    if (!org.trialEndsAt || org.trialEndsAt <= now) {
      add({ id: "trial_expired", severity: "critical", title: "Teste grátis terminado", meaning: "O período de teste acabou e a organização ainda não subscreveu: perdeu o acesso à Inbox, aos envios e à IA.", fix: "Prolongue o teste (cortesia) ou ative a subscrição à mão; ou peça ao cliente para subscrever em Definições → Faturação.", evidence: org.trialEndsAt ? `Terminou a ${dateText(org.trialEndsAt)}` : "Sem data de fim de teste" });
    } else if (org.trialEndsAt.getTime() - now.getTime() <= 3 * DAY) {
      add({ id: "trial_ending", severity: "warning", title: "O teste termina em breve", meaning: "O teste grátis acaba nos próximos dias; depois o acesso é cortado se não subscrever.", fix: "Contacte o cliente para subscrever, ou prolongue o teste.", evidence: `Termina a ${dateText(org.trialEndsAt)}` });
    }
  }
  if (org.subStatus === "past_due") add({ id: "past_due", severity: "critical", title: "O último pagamento falhou", meaning: "O Stripe não conseguiu cobrar a subscrição. O acesso está bloqueado de imediato, sem período de graça.", fix: "Peça ao cliente para atualizar o cartão em Definições → Faturação (portal do cliente). Quando o Stripe cobrar, o acesso volta sozinho.", evidence: undefined });
  if (org.subStatus === "canceled") add({ id: "canceled", severity: "critical", title: "Subscrição cancelada", meaning: "A subscrição foi cancelada (pelo cliente, pelo Stripe ou à mão): sem acesso à Inbox, aos envios e à IA.", fix: "Se o cliente quer voltar, peça-lhe para subscrever de novo, ou ative a subscrição à mão (cortesia).", evidence: undefined });
  if (org.subStatus === "active" && !org.hasStripeSubscription) add({ id: "manual_plan", severity: "info", title: "Plano definido à mão", meaning: "A organização está «Ativa» sem uma subscrição no Stripe (cortesia ou correção manual). Não há cobrança automática.", fix: "Confirme que é intencional. Quando o cliente subscrever, o Stripe passa a governar o estado.", evidence: undefined });
  if (org.cancelAtPeriodEnd && org.periodEnd) add({ id: "cancel_scheduled", severity: "warning", title: "Cancelamento agendado", meaning: "O cliente cancelou, mas mantém o acesso até ao fim do período pago; depois perde-o.", fix: "Se quiser retê-lo, contacte-o antes desta data.", evidence: `Acaba a ${dateText(org.periodEnd)}` });
  if (org.subStatus === "active" && org.hasStripeSubscription && !org.cancelAtPeriodEnd && org.periodEnd && now.getTime() - org.periodEnd.getTime() > 2 * DAY) {
    add({ id: "billing_silent", severity: "warning", title: "A data de renovação passou e o Stripe não atualizou", meaning: "A renovação devia ter ocorrido há dias, mas não chegou nenhum evento do Stripe: o webhook de faturação pode não estar a chegar, ou os dados estão desatualizados.", fix: "Use «Sincronizar com o Stripe» nesta página. Se a data não mudar, confirme o endpoint e o segredo do webhook de faturação no Stripe.", evidence: `Renovação prevista para ${dateText(org.periodEnd)} (há ${days(now.getTime() - org.periodEnd.getTime())} dias)` });
  }

  // ---- canais
  if (f.integrations.length === 0) {
    add({ id: "no_channel", severity: "warning", title: "Nenhum canal ligado", meaning: "A empresa ainda não ligou o WhatsApp, o Instagram nem o Messenger: não recebe nem envia mensagens.", fix: "Ajude-a a ligar um canal em Definições → Canais.", evidence: undefined });
  }
  for (const integration of f.integrations) {
    if (integration.status !== "ACTIVE") {
      add({ id: `integration_${integration.platform}`, severity: "critical", title: `Canal ${integration.platform} com problema`, meaning: "A Meta recusou o token deste canal (expirou ou foi revogado). Não se recebe nem se envia por ele.", fix: "Peça ao cliente para voltar a ligar o canal em Definições → Canais.", evidence: `Estado: ${integration.status}` });
    } else if (integration.tokenExpiresAt) {
      const left = integration.tokenExpiresAt.getTime() - now.getTime();
      if (left <= 0) add({ id: `token_${integration.platform}`, severity: "critical", title: `O token de ${integration.platform} expirou`, meaning: "O acesso ao canal expirou. Os envios vão falhar.", fix: "Peça ao cliente para voltar a ligar o canal.", evidence: `Expirou a ${dateText(integration.tokenExpiresAt)}` });
      else if (left <= 7 * DAY) add({ id: `token_${integration.platform}`, severity: "warning", title: `O token de ${integration.platform} expira em ${days(left)} dias`, meaning: "O acesso ao canal expira em breve. Depois disso os envios vão falhar.", fix: "Avise o cliente para voltar a ligar o canal antes dessa data.", evidence: `Expira a ${dateText(integration.tokenExpiresAt)}` });
    }
  }
  if (f.integrations.some((i) => i.status === "ACTIVE") && org.approvalStatus === "APPROVED") {
    const age = f.lastInboundAt ? now.getTime() - f.lastInboundAt.getTime() : now.getTime() - org.createdAt.getTime();
    if (age > 7 * DAY) add({ id: "no_inbound", severity: "info", title: "Sem mensagens recebidas há dias", meaning: "O canal está ligado, mas não chega nenhuma mensagem de clientes. Pode ser só falta de movimento, ou o webhook da Meta não estar a entregar.", fix: "Envie uma mensagem de teste para o número. Se não aparecer na Inbox, verifique o webhook e a subscrição de eventos na app da Meta.", evidence: f.lastInboundAt ? `Última mensagem recebida a ${dateText(f.lastInboundAt)}` : "Nunca recebeu mensagens" });
  }

  // ---- fila de saída
  if (f.outbox.oldestPendingAt && now.getTime() - f.outbox.oldestPendingAt.getTime() > 15 * MIN) {
    add({ id: "outbox_stuck", severity: "critical", title: "A fila de envio está parada", meaning: `Há ${f.outbox.pending} mensagem(ns) à espera há ${Math.round((now.getTime() - f.outbox.oldestPendingAt.getTime()) / MIN)} minutos. O envio de reserva (o workflow do GitHub, de 5 em 5 minutos) não está a correr, ou a Meta está a limitar o ritmo.`, fix: "Verifique se os secrets CRON_SECRET e APP_URL estão no GitHub e se o workflow «outbox» está a correr (separador Actions).", evidence: `${f.outbox.pending} pendentes` });
  }
  if (f.outbox.staleProcessing > 0) add({ id: "outbox_stale", severity: "warning", title: "Envios interrompidos a meio", meaning: "Algumas mensagens ficaram a meio de um envio (o servidor foi interrompido). Não são reenviadas, para não duplicar ao cliente.", fix: "Veja na Inbox se o cliente recebeu e reenvie à mão se for preciso.", evidence: `${f.outbox.staleProcessing} mensagem(ns)` });
  for (const [reason, count] of Object.entries(f.outbox.failed24h)) {
    const info = explainReason(reason);
    add({ id: `outbox_${reason}`, severity: info.severity, title: `Envios falhados: ${reason}`, meaning: info.meaning, fix: info.fix, evidence: `${count} nas últimas 24 h` });
  }

  // ---- campanhas e automações
  if (f.campaigns.stuckSending > 0) add({ id: "campaign_stuck", severity: "critical", title: "Campanha presa a enviar", meaning: "Há campanha(s) a enviar há mais de meia hora sem avançar: o cron das campanhas não está a correr.", fix: "Verifique o workflow «outbox» no GitHub (Actions) e os secrets CRON_SECRET e APP_URL.", evidence: `${f.campaigns.stuckSending} campanha(s)` });
  const skippedWindow = f.campaigns.skipped7d.window_closed ?? 0;
  if (skippedWindow > 0) {
    const info = explainReason("window_closed");
    add({ id: "campaign_window", severity: "info", title: "Campanhas: contactos fora da janela de 24 h", meaning: info.meaning, fix: info.fix, evidence: `${skippedWindow} ignorados nos últimos 7 dias` });
  }
  for (const [reason, count] of Object.entries(f.campaigns.failed7d)) {
    const info = explainReason(reason);
    add({ id: `campaign_failed_${reason}`, severity: info.severity === "info" ? "warning" : info.severity, title: `Campanhas: destinatários falhados (${reason})`, meaning: info.meaning, fix: info.fix, evidence: `${count} nos últimos 7 dias` });
  }
  if (f.automations.overdueSteps > 0) add({ id: "automation_overdue", severity: "critical", title: "Automações atrasadas", meaning: "Há ações de automações devidas há mais de 15 minutos que ainda não correram: o cron das automações não está a correr.", fix: "Verifique o workflow «outbox» no GitHub (Actions) e os secrets CRON_SECRET e APP_URL.", evidence: `${f.automations.overdueSteps} ação(ões) em atraso` });
  for (const [reason, count] of Object.entries(f.automations.failed24h)) {
    const info = explainReason(reason);
    add({ id: `automation_failed_${reason}`, severity: info.severity === "info" ? "warning" : info.severity, title: `Automações: ações falhadas (${reason})`, meaning: info.meaning, fix: info.fix, evidence: `${count} nas últimas 24 h` });
  }

  // ---- IA, pagamentos e chaves de API
  if (org.agentEnabled && !org.hasKnowledge) add({ id: "agent_no_knowledge", severity: "warning", title: "IA ligada mas sem ficha do negócio", meaning: "O agente está ligado, mas sem ficha do negócio não responde (não inventa informação). Os clientes ficam sem resposta automática.", fix: "Peça ao cliente para preencher a ficha em Definições → Negócio.", evidence: undefined });
  if (org.paymentItems > 0 && !org.hasConnectAccount) add({ id: "connect_missing", severity: "warning", title: "Catálogo de pagamentos sem Stripe ligado", meaning: "A empresa definiu itens para vender, mas não ligou a sua conta Stripe: a IA não consegue enviar links de pagamento.", fix: "Peça ao cliente para ligar o Stripe em Definições → Vendas.", evidence: `${org.paymentItems} item(ns)` });
  if (f.apiKeys.neverUsed > 0) add({ id: "api_unused", severity: "info", title: "Chaves de API nunca usadas", meaning: "Há chaves criadas que nunca receberam um pedido. Se o cliente diz que a integração falha, a chave pode estar errada, ter sido copiada incompleta ou não estar a ser enviada no cabeçalho x-api-key. As tentativas com chaves inválidas não ficam registadas.", fix: "Peça ao cliente para testar com curl e o cabeçalho x-api-key; se preciso, crie uma chave nova e revogue a antiga.", evidence: `${f.apiKeys.neverUsed} de ${f.apiKeys.active} ativas` });
  if (f.apiKeys.revoked > 0 && f.apiKeys.active === 0) add({ id: "api_all_revoked", severity: "info", title: "Todas as chaves de API foram revogadas", meaning: "Qualquer integração externa que use as chaves antigas recebe 401 (chave inválida).", fix: "Se o cliente ainda precisa da API, peça-lhe para criar uma chave nova em Definições → Chaves de API.", evidence: `${f.apiKeys.revoked} revogada(s)` });

  // ---- limites do plano
  for (const limit of f.limits) {
    if (limit.used >= limit.max) add({ id: `limit_${limit.label}`, severity: "warning", title: `Limite atingido: ${limit.label}`, meaning: `A organização chegou ao máximo permitido (${limit.max}). ${limit.consequence}`, fix: "Peça ao cliente para apagar o que já não usa. Os limites são fixos no produto.", evidence: `${limit.used}/${limit.max}` });
    else if (limit.used >= Math.ceil(limit.max * 0.9)) add({ id: `limit_${limit.label}`, severity: "info", title: `Perto do limite: ${limit.label}`, meaning: `Já usa ${limit.used} de ${limit.max}. ${limit.consequence}`, fix: "Avise o cliente se estiver a planear criar mais.", evidence: `${limit.used}/${limit.max}` });
  }

  // ---- plataforma (afeta todas as organizações)
  for (const item of f.platform.missing) add({ id: `platform_${item.label}`, severity: "critical", title: `Servidor: ${item.label} em falta`, meaning: item.consequence, fix: "É uma configuração do servidor (Vercel → Settings → Environment Variables). Não depende do cliente.", evidence: undefined });

  if (out.length === 0) return [{ id: "ok", severity: "ok", title: "Sem problemas detetados", meaning: "Não há falhas, atrasos nem limites atingidos nesta organização.", fix: "Se o cliente reporta um problema, peça uma captura do erro e a hora." }];
  return out.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}
