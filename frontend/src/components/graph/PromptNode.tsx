"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export default function PromptNode({ data }: NodeProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (data.onSubmit && typeof data.onSubmit === "function") {
      (data.onSubmit as (topic: string) => void)(trimmed);
    }
  }, [value, data]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="w-72 rounded-lg border border-zinc-600 bg-zinc-800 p-4 shadow-lg">
      <p className="mb-3 text-sm font-medium text-zinc-300">
        What new area do you want to learn today?
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. Machine Learning"
        className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-400"
      />
      <button
        onClick={handleSubmit}
        className="mt-2 w-full rounded-md bg-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-100 hover:bg-zinc-500 transition-colors"
      >
        Start
      </button>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-zinc-500"
      />
    </div>
  );
}
