"use client";

import { useState } from "react";
import { RfmKpiCards } from "@/components/dashboard/analytics/rfm/rfm-kpi-cards";
import { SegmentHeatmap } from "@/components/dashboard/analytics/rfm/segment-heatmap";
import { StrategicPanel } from "@/components/dashboard/analytics/rfm/strategic-panel";
import { RFM_SEGMENTS } from "@/components/dashboard/analytics/rfm/segment-data";

export function RfmBoard() {
  const [selectedId, setSelectedId] = useState("campeoes");
  const selectedSegment = RFM_SEGMENTS.find((segment) => segment.id === selectedId)!;

  return (
    <div>
      <RfmKpiCards />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <SegmentHeatmap selectedId={selectedId} onSelect={setSelectedId} />
        <StrategicPanel segment={selectedSegment} />
      </div>
    </div>
  );
}
