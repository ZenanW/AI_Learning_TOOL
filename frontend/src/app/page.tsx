import LearningGraph from "@/components/graph/LearningGraph";

export default function Home() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-900">
      {/* Left: Graph Canvas */}
      <div className="flex-1 relative">
        <LearningGraph />
      </div>

      {/* Right: Side Panel */}
      <aside className="w-80 shrink-0 border-l border-zinc-700 bg-zinc-850 p-6 flex flex-col">
        <h2 className="text-lg font-semibold text-zinc-100">Details</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Select a node to view details.
        </p>
      </aside>
    </div>
  );
}
