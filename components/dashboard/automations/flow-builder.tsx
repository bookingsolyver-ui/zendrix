"use client";

import { useState } from "react";
import { ToolboxPanel } from "@/components/dashboard/automations/toolbox-panel";
import { CanvasPanel } from "@/components/dashboard/automations/canvas-panel";
import { PropertiesPanel } from "@/components/dashboard/automations/properties-panel";
import type { FlowNodeId } from "@/components/dashboard/automations/flow-data";

export function FlowBuilder() {
  const [selectedNodeId, setSelectedNodeId] = useState<FlowNodeId>("node-3");

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[640px] flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40 md:flex-row">
      <ToolboxPanel />
      <CanvasPanel selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
      <PropertiesPanel selectedNodeId={selectedNodeId} />
    </div>
  );
}
