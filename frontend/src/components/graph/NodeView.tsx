"use client";

import { useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

type NodeViewData = {
  label: string;
  status: string;
  expanded?: boolean;
  onExpand?: (nodeId: string) => void;
};

export default function NodeView({ id, data }: NodeProps) {
  const { label, status, expanded, onExpand } = data as NodeViewData;

  const handleExpand = useCallback(() => {
    if (onExpand && !expanded) {
      onExpand(id);
    }
  }, [id, onExpand, expanded]);

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 shadow-md min-w-[140px]">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-100">{label}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            status === "loading"
              ? "bg-yellow-700 text-yellow-200"
              : status === "error"
                ? "bg-red-700 text-red-200"
                : status === "explored"
                  ? "bg-emerald-700 text-emerald-200"
                  : "bg-zinc-600 text-zinc-300"
          }`}
        >
          {status}
        </span>
      </div>

      {!expanded && status !== "loading" && (
        <button
          onClick={handleExpand}
          className="mt-2 w-full rounded-md bg-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-600 transition-colors"
        >
          Expand
        </button>
      )}

      <Handle
        type="target"
        position={Position.Top}
        className="!bg-zinc-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-zinc-500"
      />
    </div>
  );
}
