// Puro (sem servidor): o caminho guiado dos novos clientes, "ligar canal -> preencher a ficha -> ligar a IA".
// A ordem importa: a IA sem ficha inventava, e sem canal não tem a quem responder.

export interface SetupFacts {
  channelConnected: boolean;
  profileComplete: boolean; // nome comercial + descrição, o mínimo para a IA responder
  agentOn: boolean;
}

export type SetupStepId = "channel" | "profile" | "agent";

export interface SetupStep {
  id: SetupStepId;
  title: string;
  description: string;
  href: string; // onde se faz este passo
  done: boolean;
}

export interface SetupProgress {
  steps: SetupStep[];
  doneCount: number;
  complete: boolean;
  // O primeiro passo por fazer: é para onde se encaminha o utilizador. null se já está tudo feito.
  current: SetupStepId | null;
}

export function buildSetupProgress(facts: SetupFacts): SetupProgress {
  const steps: SetupStep[] = [
    {
      id: "channel",
      title: "Ligar um canal",
      description: "Ligue o WhatsApp, o Instagram ou o Messenger para as conversas chegarem à Inbox.",
      href: "/dashboard/settings/channels",
      done: facts.channelConnected,
    },
    {
      id: "profile",
      title: "Preencher a ficha do negócio",
      description: "Diga à IA o que vende, os preços e as regras. Só responde com o que estiver aqui.",
      href: "/dashboard/settings/business",
      done: facts.profileComplete,
    },
    {
      id: "agent",
      title: "Ligar a IA",
      description: "Ative o assistente: passa a responder aos clientes por si. Pode pausá-lo em cada conversa.",
      href: "/dashboard/settings/business",
      done: facts.agentOn,
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  return {
    steps,
    doneCount,
    complete: doneCount === steps.length,
    current: steps.find((step) => !step.done)?.id ?? null,
  };
}
