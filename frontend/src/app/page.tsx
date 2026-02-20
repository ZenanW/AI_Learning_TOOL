"use client";

import { useState } from "react";
import LearningGraph, {
  type SelectedNodeData,
} from "@/components/graph/LearningGraph";

export default function Home() {
  const [selected, setSelected] = useState<SelectedNodeData | null>(null);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-900">
      {/* Left: Graph Canvas */}
      <div className="flex-1 relative">
        <LearningGraph onNodeSelect={setSelected} />
      </div>

      {/* Right: Side Panel */}
      <aside className="w-80 shrink-0 border-l border-zinc-700 bg-zinc-850 p-6 flex flex-col">
        {selected ? (
          <>
            <h2 className="text-lg font-semibold text-zinc-100">
              {selected.label}
            </h2>
            <span
              className={`mt-2 inline-block self-start rounded-full px-2 py-0.5 text-xs ${
                selected.status === "explored"
                  ? "bg-emerald-700 text-emerald-200"
                  : selected.status === "error"
                    ? "bg-red-700 text-red-200"
                    : "bg-zinc-600 text-zinc-300"
              }`}
            >
              {selected.status}
            </span>
            {selected.description && (
              <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                {selected.description}
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-zinc-100">Details</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Click a node to view details.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
