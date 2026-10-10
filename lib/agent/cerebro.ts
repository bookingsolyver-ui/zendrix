import "server-only";
import { buildSystemPrompt } from "./negocio";
import { buildTools, catalogForPrompt, executeTool, type AgentCapabilities, type ToolDefinition } from "./tools";
import { addDaysISO, todayISO, zonedToUtcMs } from "@/lib/schedule/slots";

// Cérebro do agente: ficha do negócio + histórico + modelo (OpenRouter) + ferramentas (qualificar o lead,
// agenda, link de pagamento: só as que a organização tem). Recebe o histórico e devolve o texto da resposta;
// as ferramentas executam-se em ./tools (validadas pelo servidor, nunca pelo modelo).

const FUSO = process.env.FUSO || "Europe/Lisbon";
const MODELO = process.env.MODELO || "google/gemini-3.8-flash";
const MAX_MENSAGENS = 20; // quantas mensagens da conversa voltam ao modelo
const EXPIRA_HORAS = 24; // mensagens anteriores a isto (antes da última) são esquecidas
const TIMEOUT_MS = 30_000;
const MAX_RESPOSTA = 1500;
const MAX_PASSOS = 6; // voltas modelo <-> ferramentas

// O que é específico da organização (e da conversa) a quem o agente está a responder.
export interface ContextoDoAgente {
  // A organização: isola tudo o que é de cada cliente (e de cada organização).
  workspaceId: string;
  // Ficha do negócio (Workspace.agentKnowledge). Obrigatória: não há ficha por omissão, para o agente de
  // uma organização nunca responder com dados de outra.
  conhecimento: string;
  conversationId: string;
  contactId: string;
  // O que esta organização tem de facto (agenda, pagamentos): decide as ferramentas e as regras do prompt.
  capabilities: AgentCapabilities;
  // Para onde o Stripe devolve o cliente depois de pagar: https://<dominio>/<lingua>/payment-return
  returnBase: string;
}

export interface HistoricoMensagem {
  direction: "IN" | "OUT";
  type?: string;
  body: string;
  createdAt: Date;
}

interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
}
interface ChatMsg {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

// ---------------------------------------------------------------- histórico -> mensagens do modelo
export function construirHistorico(historico: HistoricoMensagem[]): ChatMsg[] {
  if (historico.length === 0) return [];
  const ordenado = [...historico].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const ultima = ordenado[ordenado.length - 1].createdAt.getTime();
  return ordenado
    .filter((m) => ultima - m.createdAt.getTime() <= EXPIRA_HORAS * 3600e3)
    .slice(-MAX_MENSAGENS)
    .map((m): ChatMsg => ({
      role: m.direction === "IN" ? "user" : "assistant",
      // O cliente falou em vez de escrever: o modelo vê a transcrição, marcada como tal.
      content:
        m.direction === "IN" && m.type === "audio"
          ? `[Áudio recebido]: ${m.body}`
          : m.body,
    }));
}

// ---------------------------------------------------------------- datas (só com agenda configurada)
const fmtData = (d: Date, timeZone: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-PT", { timeZone, ...o }).format(d);

// "Amanhã", "quinta-feira"... convertidos em AAAA-MM-DD no fuso da agenda: o modelo não faz contas de datas.
function calendario(timeZone: string, dias = 21) {
  const hoje = todayISO(Date.now(), timeZone);
  const linhas: string[] = [];
  for (let i = 0; i < dias; i++) {
    const data = addDaysISO(hoje, i);
    const meioDia = new Date(zonedToUtcMs(data, "12:00", timeZone));
    const nota = i === 0 ? " (hoje)" : i === 1 ? " (amanhã)" : "";
    linhas.push(`${data} = ${fmtData(meioDia, timeZone, { weekday: "long", day: "2-digit", month: "2-digit" })}${nota}`);
  }
  return linhas.join("\n");
}

// ---------------------------------------------------------------- prompt de sistema
// O texto fixo (comportamento + base de conhecimento) vive em negocio.ts. Aqui acrescenta-se o que muda a cada
// pedido: o que esta organização consegue fazer (qualificar, vender, marcar) e a data/hora atuais.
export function promptDeSistema(
  contexto: ContextoDoAgente,
  agora = new Date(),
) {
  const { schedule, payments } = contexto.capabilities;

  const qualificacao = `QUALIFICAÇÃO DO CLIENTE (ferramenta atualizar_lead)
- Quando o cliente disser o nome, o e-mail ou o que precisa, guarda-o com atualizar_lead. Pergunta uma coisa de cada vez e só quando fizer sentido na conversa; nunca faças um interrogatório.
- Indica a intencao: "interested" se mostra interesse, "ready_to_buy" se quer avançar (comprar ou marcar), "not_interested" se recusa, "none" se não sabes.
- Só guardas o que o cliente disse. Nunca inventes dados.
- Se o cliente pedir para não receber mais mensagens, respeita e não insistas.`;

  const pagamentos =
    payments.connected && payments.items.length > 0
      ? `PAGAMENTOS (ferramenta criar_link_pagamento; esta secção prevalece sobre a regra geral de pagamentos acima)
- Só vendes os itens desta lista, ao preço indicado. Não há descontos nem outros valores.
${catalogForPrompt(payments)}
- Quando o cliente confirmar que quer comprar, usa criar_link_pagamento com o id EXATO do item e envia-lhe o link na resposta, com uma frase curta.
- Nunca digas que um pagamento foi recebido: só a plataforma o confirma. Se o cliente disser que já pagou, diz que a confirmação chega em instantes.
- Se pedirem outra forma de pagar, um reembolso ou algo que não está aqui, diz que a equipa dá seguimento.`
      : `PAGAMENTOS
- Não consegues cobrar nem enviar links de pagamento. Se o cliente quiser pagar, diz que a equipa lhe envia o pagamento.`;

  const agenda = schedule
    ? `AGENDA (tens acesso direto à Agenda: marcas tu, sem passar pela equipa)
- Se o cliente falar em reunião, demonstração, chamada, visita ou marcação, NUNCA digas que a equipa entra em contacto. Chama logo proximos_horarios e propõe 2 ou 3 horários concretos na mesma mensagem (ex.: "Tenho quinta às 10:00 ou às 15:00, ou sexta às 11:00. Qual prefere?").
- Se o cliente indicar um dia ou uma hora, usa ver_horarios para esse dia. Se o horário pedido não estiver livre, propõe os mais próximos, sem desistir.
- Quando o cliente escolher um horário que lhe propuseste, isso já é a confirmação: chama criar_agendamento de imediato. Se ainda não sabes o nome, pergunta-o antes (uma pergunta curta) e marca logo a seguir.
- Depois de marcar, confirma o dia e a hora numa frase (ex.: "Fica marcado para quinta-feira às 15:00. Até lá! 🙂"). Só dizes que está marcado se criar_agendamento devolveu ok.
- Nunca inventes um horário: só os que as ferramentas devolveram. Se a ferramenta falhar, tenta outra vez ou propõe outro horário.
- Datas: usa SEMPRE a tabela de datas abaixo para converter "amanhã", "quinta-feira" etc. em AAAA-MM-DD.

TABELA DE DATAS (fuso ${schedule.timezone})
${calendario(schedule.timezone)}`
    : `AGENDA
- Esta organização ainda não tem a agenda ligada, por isso não consegues marcar sozinho. Não digas apenas "a equipa entra em contacto": se o cliente pedir uma reunião ou demonstração, pergunta-lhe já o dia e a hora que preferem e o nome, guarda isso com atualizar_lead (dor_principal = "Pediu reunião: <dia e hora>", intencao = "ready_to_buy") e diz que a equipa confirma esse horário. Não confirmes nenhum horário.`;

  const postura = `POSTURA COMERCIAL (prevalece sobre qualquer instrução anterior mais passiva)
- Ages: quando consegues fazer o que o cliente pede com as tuas ferramentas, fazes e dizes o resultado. Não prometas que "alguém vai ver" aquilo que tu próprio podes resolver.
- Só passas para a equipa o que realmente não consegues fazer: contratos, reclamações, reembolsos, ou se o cliente pedir expressamente uma pessoa. Nesses casos, diz o que fica combinado e quando.
- Se o cliente mostra interesse, avança para o passo seguinte (marcar, enviar o link, esclarecer o preço) na mesma mensagem, e termina com uma pergunta ou proposta concreta.
- Respostas curtas, diretas e já com a ação. Nada de desculpas genéricas.`;

  const fuso = schedule?.timezone ?? FUSO;
  return `${buildSystemPrompt(contexto.conhecimento)}

${qualificacao}

${pagamentos}

${postura}

${agenda}

DATA E HORA ATUAIS (fuso ${fuso}): ${fmtData(agora, fuso, { dateStyle: "full", timeStyle: "short" })}`;
}

// ---------------------------------------------------------------- modelo (OpenRouter)
export const chaveOk = () =>
  /^sk-or-/.test(process.env.OPENROUTER_API_KEY ?? "");

const PAUSA_REPETICAO_MS = 2000;

// O webhook tem um tempo máximo (maxDuration) e depois do modelo ainda há voz e envio. A cadeia inteira
// de modelos, com repetições, tem de caber num orçamento: passado este tempo desiste e o agente avisa
// o cliente de que a equipa responde. Configurável em MODELO_ORCAMENTO_MS.
const orcamentoMs = () => Number(process.env.MODELO_ORCAMENTO_MS) || 40_000;

// OPENROUTER_API_URL só serve para testes (um servidor falso); por omissão é o OpenRouter.
const urlDoModelo = () => process.env.OPENROUTER_API_URL?.trim() || "https://openrouter.ai/api/v1/chat/completions";

// Modelos de recurso, por ordem, quando o principal (MODELO) está limitado ou em baixo. Os modelos
// gratuitos entram em limite de pedidos com frequência, por isso um só modelo é um ponto de falha.
// MODELO_FALLBACKS="a,b" substitui a lista; MODELO_FALLBACKS="" desliga os recursos.
const FALLBACKS_POR_OMISSAO = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

export function cadeiaDeModelos() {
  const env = process.env.MODELO_FALLBACKS;
  const extra =
    env === undefined
      ? FALLBACKS_POR_OMISSAO
      : env
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean);
  return [MODELO, ...extra.filter((m) => m !== MODELO)];
}

// Alguns modelos "a pensar" despejam o raciocínio como se fosse a resposta ("Okay, the user is asking…
// Let me check the knowledge base…"). Isso NUNCA pode chegar ao cliente: expõe o prompt e está em inglês.
// Uma resposta normal de WhatsApp são 1 a 3 frases curtas, em português.
const MAX_RESPOSTA_NORMAL = 1000;
const CABECALHOS_DO_PROMPT =
  /BASE DE CONHECIMENTO|ABORDAGEM DE VENDAS|IDIOMA E TOM|FORMATO \(é WhatsApp\)|LIMITES \(importantes\)/;
const RACIOCINIO_EM_INGLES =
  /\b(the user|the customer|let me (check|see|think|structure)|i need to|i should|first, looking at|wait,)\b/i;

export function respostaSuspeita(texto: string) {
  return (
    texto.length > MAX_RESPOSTA_NORMAL ||
    CABECALHOS_DO_PROMPT.test(texto) ||
    RACIOCINIO_EM_INGLES.test(texto)
  );
}

// Erros da CONTA (chave inválida, sem crédito, sem permissão): nenhum outro modelo os resolve.
const ERRO_DE_CONTA = new Set([401, 402, 403]);

// Uma chamada ao modelo. Se o principal falhar por algo passageiro (429, 5xx, corpo inválido) ou
// específico dele (400/404), passa logo ao seguinte da cadeia. Esgotada a cadeia, espera um pouco
// e percorre-a UMA vez mais. Só falha se todos falharem.
export async function chamarModelo(
  messages: ChatMsg[],
  tools: ToolDefinition[] = [],
  // Orçamento próprio (os seguimentos automáticos correm em lote e não podem gastar 40 s cada).
  orcamento?: number,
): Promise<{ content: string | null; tool_calls?: ToolCall[] }> {
  const cadeia = cadeiaDeModelos();
  const limite = Date.now() + (orcamento ?? orcamentoMs());
  let ultimoErro = "";

  for (let volta = 0; volta < 2; volta++) {
    if (volta > 0) await new Promise((r) => setTimeout(r, PAUSA_REPETICAO_MS));
    let houvePassageiro = false;

    for (const modelo of cadeia) {
      const restante = limite - Date.now();
      if (restante <= 0)
        throw new Error(
          `${ultimoErro || "OpenRouter"} (orçamento de tempo esgotado)`,
        );

      const r = await fetch(urlDoModelo(), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "X-Title": "Kwanza Flow",
        },
        body: JSON.stringify({
          model: modelo,
          messages,
          temperature: 0.3,
          // Modelos que "pensam" gastam parte deste limite no raciocínio: com pouco, a resposta vem vazia.
          max_tokens: 1500,
          ...(tools.length ? { tools } : {}),
        }),
        // Nunca mais do que o tempo que resta do orçamento (mas o suficiente para uma resposta rápida).
        signal: AbortSignal.timeout(
          Math.max(3_000, Math.min(TIMEOUT_MS, restante)),
        ),
      }).catch((err: unknown) => {
        // Rede em baixo ou tempo esgotado: trata como passageiro e tenta o seguinte.
        return { fetchError: err instanceof Error ? err.message : String(err) };
      });

      if ("fetchError" in r) {
        ultimoErro = `OpenRouter (${modelo}): ${r.fetchError}`;
        houvePassageiro = true;
        continue;
      }

      const j = await r.json().catch(() => null);
      if (r.ok && j?.choices?.[0]?.message) {
        const mensagem = j.choices[0].message;
        // Resposta com raciocínio exposto: este modelo não serve para este pedido, tenta o seguinte.
        if (
          !mensagem.tool_calls?.length &&
          respostaSuspeita(String(mensagem.content ?? ""))
        ) {
          console.error(
            `[agent] resposta de ${modelo} rejeitada: parece raciocínio interno, não uma resposta ao cliente`,
          );
          ultimoErro = `OpenRouter (${modelo}): resposta rejeitada (raciocínio exposto)`;
          houvePassageiro = true;
          continue;
        }
        if (modelo !== cadeia[0])
          console.warn(
            `[agent] modelo principal indisponível; resposta gerada por ${modelo}`,
          );
        return mensagem;
      }

      ultimoErro = `OpenRouter ${r.status} (${modelo}): ${JSON.stringify(j?.error ?? "resposta inválida").slice(0, 200)}`;
      if (ERRO_DE_CONTA.has(r.status)) throw new Error(ultimoErro);
      if (r.status === 429 || r.status >= 500 || r.ok) houvePassageiro = true;
    }

    if (!houvePassageiro) break; // só erros definitivos de modelo: repetir a volta não muda nada
  }
  throw new Error(ultimoErro);
}

// ---------------------------------------------------------------- a resposta
// `contacto` = identificador do cliente no canal (número, IGSID ou PSID; usado nas ofertas de horários).
// Devolve "" se o modelo não produzir texto: quem chama decide não enviar nada.
export async function gerarResposta(
  historico: HistoricoMensagem[],
  contacto: string,
  contexto: ContextoDoAgente,
): Promise<string> {
  const messages: ChatMsg[] = [
    { role: "system", content: promptDeSistema(contexto) },
    ...construirHistorico(historico),
  ];
  const tools = buildTools(contexto.capabilities);
  const toolContext = {
    workspaceId: contexto.workspaceId,
    conversationId: contexto.conversationId,
    contactId: contexto.contactId,
    contactWaId: contacto,
    returnBase: contexto.returnBase,
    capabilities: contexto.capabilities,
  };

  let repetiu = false;
  // O link de pagamento criado nesta resposta: tem de ir MESMO na mensagem (o modelo pode esquecer-se dele
  // ou alterá-lo), por isso garante-se aqui, com o endereço devolvido pelo servidor.
  let linkDePagamento: string | null = null;
  const comLink = (texto: string) => {
    if (!linkDePagamento || texto.includes(linkDePagamento)) return texto.slice(0, MAX_RESPOSTA);
    if (!texto) return `Aqui está o seu link de pagamento seguro: ${linkDePagamento}`;
    return `${texto.slice(0, Math.max(0, MAX_RESPOSTA - linkDePagamento.length - 2))}\n\n${linkDePagamento}`;
  };

  for (let passo = 0; passo < MAX_PASSOS; passo++) {
    const msg = await chamarModelo(messages, tools);
    if (!msg.tool_calls?.length) {
      const texto = (msg.content ?? "").trim();
      if (texto || linkDePagamento) return comLink(texto);
      // Resposta vazia (o modelo gastou tudo a raciocinar): tenta uma vez mais antes de desistir.
      if (!repetiu) {
        repetiu = true;
        continue;
      }
      return "";
    }

    messages.push({
      role: "assistant",
      content: msg.content ?? "",
      tool_calls: msg.tool_calls,
    });
    for (const tc of msg.tool_calls) {
      let args: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(tc.function.arguments || "{}");
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) args = parsed;
      } catch {
        // argumentos partidos: a ferramenta devolve o erro ao modelo
      }
      let saida: Record<string, unknown>;
      try {
        // Só se executa o que foi oferecido ao modelo nesta conversa.
        saida = tools.some((t) => t.function.name === tc.function.name)
          ? await executeTool(toolContext, tc.function.name, args)
          : { erro: `Ferramenta indisponível: ${tc.function.name}` };
      } catch (e) {
        console.error("[agent] ferramenta falhou", tc.function.name, e instanceof Error ? e.message : e);
        saida = { erro: "Não foi possível executar a ação agora." };
      }
      if (tc.function.name === "criar_link_pagamento" && saida.ok === true && typeof saida.url === "string") {
        linkDePagamento = saida.url;
      }
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(saida),
      });
    }
  }
  return linkDePagamento ? comLink("") : ""; // demasiadas voltas sem resposta final
}

// ---------------------------------------------------------------- seguimento automático (reengajamento)
const INSTRUCOES_SEGUIMENTO = (passo: number, total: number) => `SEGUIMENTO AUTOMÁTICO
O cliente deixou de responder à tua última mensagem. Escreve UMA mensagem curta (no máximo 2 frases) a retomar o que estavam a tratar, a partir do histórico.
- Este é o seguimento ${passo} de ${total}.${passo >= total ? " É o último: despede-te com simpatia e diz que fica à disposição, sem insistir." : " Sê leve: uma pergunta simples que facilite a resposta."}
- Retoma o ÚLTIMO assunto concreto. Não repitas a mensagem anterior nem te apresentes outra vez.
- Sem pressão, sem urgência artificial, sem descontos nem ofertas, sem inventar nada que não esteja na base de conhecimento.
- Não incluas ligações. Responde só com o texto da mensagem.`;

// O texto de um seguimento, ou null se o modelo falhar ou produzir algo que não serve (o chamador usa o texto
// de recurso). Sem ferramentas: um seguimento só escreve, nunca marca nem cobra.
export async function gerarSeguimento(input: {
  historico: HistoricoMensagem[];
  passo: number;
  totalPassos: number;
  conhecimento: string;
}): Promise<string | null> {
  const messages: ChatMsg[] = [
    { role: "system", content: `${buildSystemPrompt(input.conhecimento)}\n\n${INSTRUCOES_SEGUIMENTO(input.passo, input.totalPassos)}` },
    ...construirHistorico(input.historico),
  ];
  try {
    const msg = await chamarModelo(messages, [], 12_000);
    const texto = (msg.content ?? "").trim();
    const anterior = [...input.historico].reverse().find((m) => m.direction === "OUT")?.body.trim();
    if (texto.length < 5 || texto.length > 400) return null;
    if (respostaSuspeita(texto) || /https?:\/\/|www\./i.test(texto)) return null;
    if (anterior && texto === anterior) return null;
    return texto;
  } catch (err) {
    console.error("[followup] o modelo falhou:", err instanceof Error ? err.message : err);
    return null;
  }
}
