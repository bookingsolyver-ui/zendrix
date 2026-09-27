import type { ReactNode } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { FLOW_NODES, type FlowNodeId } from "@/components/dashboard/automations/flow-data";

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-xs font-medium text-white/50">{children}</label>;
}

function FakeSelect({ value }: { value: string }) {
  return (
    <div className="mt-1.5 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
      <span className="text-sm text-white">{value}</span>
      <ChevronDown className="h-4 w-4 text-white/40" />
    </div>
  );
}

function TriggerProperties() {
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Evento</FieldLabel>
        <FakeSelect value="Carrinho Abandonado" />
      </div>
      <div>
        <FieldLabel>Aguardar antes de disparar</FieldLabel>
        <FakeSelect value="1 hora" />
      </div>
      <div>
        <FieldLabel>Aplicar a</FieldLabel>
        <FakeSelect value="Todos os clientes" />
      </div>
    </div>
  );
}

function LogicProperties() {
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Duração da espera</FieldLabel>
        <div className="mt-1.5 flex gap-2">
          <div className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white">
            20
          </div>
          <div className="flex-1">
            <FakeSelect value="Minutos" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
        <span className="text-sm text-white/70">Ignorar fora do horário comercial</span>
        <span className="flex h-5 w-9 items-center rounded-full bg-emerald-500/80 p-0.5">
          <span className="ml-auto h-4 w-4 rounded-full bg-white" />
        </span>
      </div>
    </div>
  );
}

function ActionProperties() {
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Selecionar Template</FieldLabel>
        <FakeSelect value="black-friday-v1" />
      </div>

      <div>
        <FieldLabel>Preview da mensagem</FieldLabel>
        <div className="mt-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm leading-relaxed text-white/70">
          Oi {"{{nome}}"}! O teu carrinho ainda está à tua espera — usa o código{" "}
          <span className="font-semibold text-emerald-400">15OFF</span> e garante 15% de
          desconto antes que acabe. 🛒
        </div>
      </div>

      <button
        type="button"
        className="neon-green-btn flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 py-2.5 text-sm font-semibold text-background hover:bg-green-400"
      >
        <Sparkles className="h-4 w-4" />
        Melhorar com IA ✨
      </button>
    </div>
  );
}

export function PropertiesPanel({ selectedNodeId }: { selectedNodeId: FlowNodeId }) {
  const node = FLOW_NODES.find((item) => item.id === selectedNodeId)!;
  const Icon = node.icon;

  return (
    <aside className="w-full shrink-0 border-t border-white/10 bg-[#111111] md:h-full md:w-[320px] md:border-l md:border-t-0">
      <div className="border-b border-white/5 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/30">
          Propriedades do Nó
        </p>
        <div className="mt-2 flex items-center gap-2.5">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${node.iconClassName}`}>
            <Icon className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-white">{node.title}</p>
        </div>
      </div>

      <div className="px-5 py-5">
        {node.kind === "trigger" && <TriggerProperties />}
        {node.kind === "logic" && <LogicProperties />}
        {node.kind === "action" && <ActionProperties />}
      </div>
    </aside>
  );
}
