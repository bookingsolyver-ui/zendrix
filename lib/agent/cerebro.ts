import { buildSystemPrompt } from "./negocio";
import { AGENDAMENTO_ATIVO, agenda } from "./agenda";

// Cérebro do agente: ficha do negócio + histórico + modelo (OpenRouter) [+ ferramentas de agenda].
// Não toca na base de dados nem no WhatsApp: recebe o histórico e devolve o texto da resposta.

const FUSO = process.env.FUSO || "Europe/Lisbon";
const MODELO = process.env.MODELO || "google/gemini-3.8-flash";
const MAX_MENSAGENS = 20; // quantas mensagens da conversa voltam ao modelo
const EXPIRA_HORAS = 24; // mensagens anteriores a isto (antes da última) são esquecidas
const TIMEOUT_MS = 30_000;
const MAX_RESPOSTA = 1500;
const MAX_PASSOS = 6; // voltas modelo <-> ferramentas

// O que é específico da organização a quem o agente está a responder.
export interface ContextoDoAgente {
  // Ficha do negócio (Workspace.agentKnowledge). Obrigatória: não há ficha por omissão, para o agente de
  // uma organização nunca responder com dados de outra.
  conhecimento: string;
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

// ---------------------------------------------------------------- datas (só usadas com agenda ligada)
const fmtData = (d: Date, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-PT", { timeZone: FUSO, ...o }).format(d);
const isoDia = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

function calendario(dias = 21) {
  const linhas: string[] = [];
  for (let i = 0; i < dias; i++) {
    const d = new Date(Date.now() + i * 86400e3);
    const nota = i === 0 ? " (hoje)" : i === 1 ? " (amanhã)" : "";
    linhas.push(
      `${isoDia(d)} = ${fmtData(d, { weekday: "long", day: "2-digit", month: "2-digit" })}${nota}`,
    );
  }
  return linhas.join("\n");
}

function validarData(data: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || ""))
    return "Data em formato inválido. Use AAAA-MM-DD da tabela de datas.";
  const [a, m, d] = data.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (
    dt.getUTCFullYear() !== a ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return `A data ${data} não existe no calendário.`;
  }
  if (data < isoDia(new Date())) return `A data ${data} já passou.`;
  if (data > isoDia(new Date(Date.now() + 60 * 86400e3)))
    return "Só marcamos até 60 dias à frente.";
  return null;
}

// ---------------------------------------------------------------- prompt de sistema
// O texto fixo (comportamento + base de conhecimento) vive em negocio.ts. Aqui só se acrescenta
// o que muda a cada pedido: o estado da agenda e a data/hora atuais.
export function promptDeSistema(
  contexto: ContextoDoAgente,
  agora = new Date(),
) {
  const agenda = AGENDAMENTO_ATIVO
    ? `AGENDA
- Para ver horários livres usa a ferramenta ver_horarios. Nunca inventes um horário.
- Para marcar usa criar_agendamento, e SÓ depois de o cliente confirmar por escrito o serviço, o dia e a hora.
- Datas: usa SEMPRE a tabela de datas abaixo para converter "amanhã", "quinta-feira" etc. em AAAA-MM-DD.

TABELA DE DATAS (fuso ${FUSO})
${calendario()}`
    : `AGENDA
- Não tens acesso a nenhuma agenda: não marques, não proponhas nem confirmes horários. Se pedirem uma marcação ou uma demonstração, diz que a equipa entra em contacto.`;

  return `${buildSystemPrompt(contexto.conhecimento)}

${agenda}

DATA E HORA ATUAIS (fuso ${FUSO}): ${fmtData(agora, { dateStyle: "full", timeStyle: "short" })}`;
}

// ---------------------------------------------------------------- ferramentas (só com agenda ligada)
const FERRAMENTAS = AGENDAMENTO_ATIVO
  ? [
      {
        type: "function",
        function: {
          name: "ver_horarios",
          description: "Lista os horários livres de um dia na agenda.",
          parameters: {
            type: "object",
            properties: {
              data: {
                type: "string",
                description: "Dia AAAA-MM-DD, tirado da tabela de datas.",
              },
            },
            required: ["data"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "criar_agendamento",
          description:
            "Marca um horário. Só depois de o cliente confirmar por escrito serviço, dia e hora.",
          parameters: {
            type: "object",
            properties: {
              data: { type: "string", description: "AAAA-MM-DD" },
              hora: {
                type: "string",
                description: "HH:MM, exatamente como veio de ver_horarios",
              },
              nome: { type: "string", description: "Nome do cliente" },
              servico: { type: "string", description: "Serviço da ficha" },
            },
            required: ["data", "hora", "nome", "servico"],
          },
        },
      },
    ]
  : [];

// Horários mostrados a cada cliente: só se marca o que a agenda ofereceu a ESSA pessoa.
const ofertados = new Map<string, Set<string>>();

async function executar(
  contacto: string,
  nome: string,
  args: Record<string, string>,
) {
  if (nome === "ver_horarios") {
    const erro = validarData(args.data);
    if (erro) return { erro };
    const horas = await agenda.horariosLivres(args.data, FUSO);
    const set = ofertados.get(contacto) ?? new Set<string>();
    horas.forEach((h) => set.add(`${args.data} ${h}`));
    ofertados.set(contacto, set);
    return horas.length
      ? { data: args.data, livres: horas }
      : {
          data: args.data,
          livres: [],
          aviso: "Nenhum horário livre neste dia.",
        };
  }
  if (nome === "criar_agendamento") {
    const erro = validarData(args.data);
    if (erro) return { erro };
    const chave = `${args.data} ${args.hora}`;
    if (!ofertados.get(contacto)?.has(chave))
      return {
        erro: `O horário ${chave} não foi mostrado como livre. Chame ver_horarios antes.`,
      };
    const r = await agenda.marcar({
      data: args.data,
      hora: args.hora,
      nome: args.nome,
      servico: args.servico,
      telefone: contacto,
      fuso: FUSO,
    });
    return { ok: true, data: args.data, hora: args.hora, id: r.id };
  }
  return { erro: `Ferramenta desconhecida: ${nome}` };
}

// ---------------------------------------------------------------- modelo (OpenRouter)
export const chaveOk = () =>
  /^sk-or-/.test(process.env.OPENROUTER_API_KEY ?? "");

const PAUSA_REPETICAO_MS = 2000;

// O webhook tem um tempo máximo (maxDuration) e depois do modelo ainda há voz e envio. A cadeia inteira
// de modelos, com repetições, tem de caber num orçamento: passado este tempo desiste e o agente avisa
// o cliente de que a equipa responde. Configurável em MODELO_ORCAMENTO_MS.
const orcamentoMs = () => Number(process.env.MODELO_ORCAMENTO_MS) || 40_000;

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
async function chamarModelo(
  messages: ChatMsg[],
): Promise<{ content: string | null; tool_calls?: ToolCall[] }> {
  const cadeia = cadeiaDeModelos();
  const limite = Date.now() + orcamentoMs();
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

      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "X-Title": "Zentrix",
        },
        body: JSON.stringify({
          model: modelo,
          messages,
          temperature: 0.3,
          // Modelos que "pensam" gastam parte deste limite no raciocínio: com pouco, a resposta vem vazia.
          max_tokens: 1500,
          ...(FERRAMENTAS.length ? { tools: FERRAMENTAS } : {}),
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
// `contacto` = número do cliente (só usado pelas ferramentas de agenda).
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

  let repetiu = false;
  for (let passo = 0; passo < MAX_PASSOS; passo++) {
    const msg = await chamarModelo(messages);
    if (!msg.tool_calls?.length) {
      const texto = (msg.content ?? "").trim();
      if (texto) return texto.slice(0, MAX_RESPOSTA);
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
      let args: Record<string, string> = {};
      try {
        args = JSON.parse(tc.function.arguments || "{}");
      } catch {
        // argumentos partidos: a ferramenta devolve o erro ao modelo
      }
      let saida: unknown;
      try {
        saida = await executar(contacto, tc.function.name, args);
      } catch (e) {
        saida = { erro: e instanceof Error ? e.message : String(e) };
      }
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(saida),
      });
    }
  }
  return ""; // demasiadas voltas sem resposta final
}
