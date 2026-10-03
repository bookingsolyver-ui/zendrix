import "server-only";
import { applyLeadUpdate } from "@/lib/leads/service";
import { nextStage, sanitizeLeadUpdate, type LeadStageName } from "@/lib/leads/lead";
import { createPaymentLink, loadPaymentCapability, type PaymentCapability } from "@/lib/payments/service";
import { formatMoney } from "@/lib/payments/catalog";
import { prisma } from "@/lib/prisma";
import type { ScheduleConfig } from "@/lib/schedule/config";
import { bookAppointment, freeSlotsFor, loadScheduleConfig } from "@/lib/schedule/service";
import { formatSlotHuman, isValidDateISO } from "@/lib/schedule/slots";

// As ferramentas que a IA pode usar numa conversa. O modelo só PEDE; quem decide e executa é este código, que
// valida tudo (a IA pode enganar-se ou ser enganada pelo cliente). Cada ferramenta só existe se a organização
// a tem mesmo: sem agenda configurada não há ferramentas de agenda; sem Stripe ligado e sem itens no catálogo
// não há ferramenta de pagamento. O modelo nunca "inventa" uma capacidade que o negócio não tem.

export interface AgentCapabilities {
  schedule: ScheduleConfig | null;
  payments: PaymentCapability;
}

export async function loadAgentCapabilities(workspaceId: string): Promise<AgentCapabilities> {
  const [schedule, payments] = await Promise.all([loadScheduleConfig(workspaceId), loadPaymentCapability(workspaceId)]);
  return { schedule, payments };
}

export interface ToolContext {
  workspaceId: string;
  conversationId: string;
  contactId: string;
  contactWaId: string; // para as ofertas de horários (por cliente)
  returnBase: string; // https://<dominio>/<lingua>/payment-return
  capabilities: AgentCapabilities;
}

export interface ToolDefinition {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export function buildTools(capabilities: AgentCapabilities): ToolDefinition[] {
  const tools: ToolDefinition[] = [
    {
      type: "function",
      function: {
        name: "atualizar_lead",
        description:
          "Guarda o que sabes do cliente: nome, e-mail, a necessidade principal e a intenção. Chama-a sempre que o cliente disser um destes dados ou mostrar (ou perder) interesse. Só guardas o que ele disse, nunca inventes.",
        parameters: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Como o cliente se chama, se o disser." },
            email: { type: "string", description: "O e-mail do cliente, se o disser." },
            dor_principal: { type: "string", description: "A necessidade ou problema principal, em poucas palavras, como o cliente o descreve." },
            intencao: {
              type: "string",
              enum: ["none", "interested", "ready_to_buy", "not_interested"],
              description: "interested = mostra interesse; ready_to_buy = quer avançar (comprar, marcar); not_interested = recusa; none = não sabes.",
            },
          },
        },
      },
    },
  ];

  if (capabilities.schedule) {
    tools.push(
      {
        type: "function",
        function: {
          name: "ver_horarios",
          description: "Lista os horários livres de um dia na agenda.",
          parameters: {
            type: "object",
            properties: { data: { type: "string", description: "Dia AAAA-MM-DD, tirado da tabela de datas." } },
            required: ["data"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "criar_agendamento",
          description: "Marca um horário. Só depois de o cliente confirmar por escrito o dia e a hora.",
          parameters: {
            type: "object",
            properties: {
              data: { type: "string", description: "AAAA-MM-DD" },
              hora: { type: "string", description: "HH:MM, exatamente como veio de ver_horarios" },
              nome: { type: "string", description: "Nome do cliente" },
              servico: { type: "string", description: "O motivo ou serviço da marcação" },
              email: { type: "string", description: "E-mail do cliente, se o tiver dito" },
            },
            required: ["data", "hora", "nome"],
          },
        },
      },
    );
  }

  if (capabilities.payments.connected && capabilities.payments.items.length > 0) {
    tools.push({
      type: "function",
      function: {
        name: "criar_link_pagamento",
        description:
          "Cria um link de pagamento seguro para um item do catálogo. Usa-a quando o cliente confirmar que quer comprar. Depois envia-lhe o link na resposta.",
        parameters: {
          type: "object",
          properties: {
            item_id: { type: "string", enum: capabilities.payments.items.map((item) => item.id), description: "O id exato do item do catálogo." },
          },
          required: ["item_id"],
        },
      },
    });
  }
  return tools;
}

// Texto do catálogo para o prompt (id, nome, preço): o preço que o modelo vê é o da base de dados.
export function catalogForPrompt(payments: PaymentCapability): string {
  return payments.items
    .map((item) => `- id=${item.id} · ${item.name} · ${formatMoney(item.amountMinor, item.currency)}${item.description ? ` · ${item.description}` : ""}`)
    .join("\n");
}

// ----------------------------------------------------------------------------------------------- execução
const OFFER_HOURS = 12;
const slotLabel = (date: string, time: string) => `${date} ${time}`;

type Args = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" ? value : "");

export async function executeTool(context: ToolContext, name: string, args: Args): Promise<Record<string, unknown>> {
  switch (name) {
    case "atualizar_lead": {
      const update = sanitizeLeadUpdate(args);
      const hasAnything = Boolean(update.name || update.email || update.painPoint || update.intent);
      if (!hasAnything) return { erro: "Nenhum dado válido para guardar.", rejeitado: update.rejected };
      const result = await applyLeadUpdate({ workspaceId: context.workspaceId, contactId: context.contactId, update });
      if (!result) return { erro: "Contacto não encontrado." };
      return { ok: true, estado: result.stage, guardado: result.saved, rejeitado: result.rejected };
    }

    case "ver_horarios": {
      const config = context.capabilities.schedule;
      if (!config) return { erro: "Não há agenda configurada." };
      const date = text(args.data);
      if (!isValidDateISO(date)) return { erro: "Data em formato inválido. Use AAAA-MM-DD da tabela de datas." };
      const slots = await freeSlotsFor(context.workspaceId, config, date);
      await prisma.offeredSlot.deleteMany({ where: { expiresAt: { lt: new Date() } } });
      if (slots.length === 0) return { data: date, livres: [], aviso: "Nenhum horário livre neste dia." };

      const expiresAt = new Date(Date.now() + OFFER_HOURS * 3_600_000);
      // Só se marca o que foi mostrado a ESTE cliente: guardam-se as ofertas (na base de dados, não em memória).
      await prisma.offeredSlot.createMany({
        data: slots.map((slot) => ({ workspaceId: context.workspaceId, contact: context.contactWaId, slot: slotLabel(date, slot.time), expiresAt })),
        skipDuplicates: true,
      });
      await prisma.offeredSlot.updateMany({
        where: { workspaceId: context.workspaceId, contact: context.contactWaId, slot: { in: slots.map((slot) => slotLabel(date, slot.time)) } },
        data: { expiresAt },
      });
      return { data: date, livres: slots.map((slot) => slot.time) };
    }

    case "criar_agendamento": {
      const config = context.capabilities.schedule;
      if (!config) return { erro: "Não há agenda configurada." };
      const date = text(args.data);
      const time = text(args.hora).trim();
      const nameInput = sanitizeLeadUpdate({ nome: args.nome }).name;
      if (!isValidDateISO(date) || !/^\d{2}:\d{2}$/.test(time)) return { erro: "Data ou hora em formato inválido." };
      if (!nameInput) return { erro: "Falta o nome do cliente." };

      const offered = await prisma.offeredSlot.findUnique({
        where: { workspaceId_contact_slot: { workspaceId: context.workspaceId, contact: context.contactWaId, slot: slotLabel(date, time) } },
        select: { expiresAt: true },
      });
      if (!offered || offered.expiresAt.getTime() < Date.now()) {
        return { erro: `O horário ${slotLabel(date, time)} não foi mostrado como livre. Chame ver_horarios antes.` };
      }

      const lead = sanitizeLeadUpdate({ email: args.email });
      const service = sanitizeLeadUpdate({ dor_principal: args.servico }).painPoint ?? null;
      const booked = await bookAppointment({
        workspaceId: context.workspaceId,
        config,
        date,
        time,
        customerName: nameInput,
        customerEmail: lead.email ?? null,
        service,
        conversationId: context.conversationId,
        contactId: context.contactId,
      });
      if (!booked.ok) {
        return {
          erro: booked.error === "slot_taken" ? "Esse horário acabou de ser ocupado. Chame ver_horarios e proponha outro." : "Esse horário já não está livre. Chame ver_horarios e proponha outro.",
        };
      }
      await prisma.offeredSlot.deleteMany({ where: { workspaceId: context.workspaceId, contact: context.contactWaId, slot: slotLabel(date, time) } });

      // Quem marca uma reunião é um lead qualificado (as regras de estado nunca recuam).
      const contact = await prisma.contact.findFirst({ where: { id: context.contactId, workspaceId: context.workspaceId }, select: { leadStage: true } });
      if (contact) {
        const stage = nextStage(contact.leadStage as LeadStageName, "ready_to_buy");
        await prisma.contact.update({
          where: { id: context.contactId },
          data: { name: nameInput, ...(lead.email ? { email: lead.email } : {}), ...(stage !== contact.leadStage ? { leadStage: stage, qualifiedAt: new Date() } : {}) },
        });
      }
      return { ok: true, id: booked.id, data: date, hora: time, quando: formatSlotHuman(booked.startMs, config.timezone) };
    }

    case "criar_link_pagamento": {
      const result = await createPaymentLink({
        workspaceId: context.workspaceId,
        conversationId: context.conversationId,
        contactId: context.contactId,
        itemId: text(args.item_id),
        returnBase: context.returnBase,
      });
      if (!result.ok) {
        const mensagens = {
          not_connected: "O pagamento online não está disponível. Diz que a equipa envia o pagamento.",
          item_not_found: "Esse item não existe no catálogo. Usa um item_id exato da lista.",
          too_many_links: "Já enviaste vários links nesta conversa. Pede ao cliente para usar o link anterior ou diz que a equipa ajuda.",
          stripe_error: "Não foi possível criar o link agora. Diz que a equipa envia o pagamento.",
        } as const;
        return { erro: mensagens[result.error] };
      }
      // `url` é lido por quem chama (cerebro.ts) para garantir que o link vai mesmo na resposta.
      return { ok: true, url: result.url, item: result.itemName, valor: result.amountLabel };
    }

    default:
      return { erro: `Ferramenta desconhecida: ${name}` };
  }
}
