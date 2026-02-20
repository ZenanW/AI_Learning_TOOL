"use client";

import { useState, useEffect, useRef } from "react";
import LearningGraph, {
  type SelectedNodeData,
} from "@/components/graph/LearningGraph";

const API_BASE = "http://localhost:8000";

interface LessonContent {
  summary: string;
  key_concepts: string[];
  explanation: string;
  practice_question: string;
  further_reading: string;
}

export default function Home() {
  const [selected, setSelected] = useState<SelectedNodeData | null>(null);
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache lessons so we don't re-fetch for the same topic
  const cacheRef = useRef<Map<string, LessonContent>>(new Map());

  useEffect(() => {
    if (!selected) {
      setLesson(null);
      setError(null);
      return;
    }

    const topic = selected.label;

    // Check cache first
    const cached = cacheRef.current.get(topic);
    if (cached) {
      setLesson(cached);
      setError(null);
      return;
    }

    // Fetch from API
    let cancelled = false;
    setLoading(true);
    setLesson(null);
    setError(null);

    fetch(`${API_BASE}/api/generate-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((data: LessonContent) => {
        if (cancelled) return;
        cacheRef.current.set(topic, data);
        setLesson(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch lesson:", err);
        setError("Failed to generate lesson. Try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-900">
      {/* Left: Graph Canvas */}
      <div className="flex-1 relative">
        <LearningGraph onNodeSelect={setSelected} />
      </div>

      {/* Right: Side Panel */}
      <aside className="w-96 shrink-0 border-l border-zinc-700 bg-zinc-850 p-6 flex flex-col overflow-y-auto">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-3xl mb-3">📚</div>
            <h2 className="text-lg font-semibold text-zinc-100">
              Learning Panel
            </h2>
            <p className="mt-2 text-sm text-zinc-400 max-w-[220px]">
              Click any node on the graph to generate a mini-lesson.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-zinc-100">
                {selected.label}
              </h2>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
                  selected.status === "explored"
                    ? "bg-emerald-700 text-emerald-200"
                    : selected.status === "error"
                      ? "bg-red-700 text-red-200"
                      : selected.status === "loading"
                        ? "bg-yellow-700 text-yellow-200"
                        : "bg-zinc-600 text-zinc-300"
                }`}
              >
                {selected.status}
              </span>
            </div>

            {/* Brief description from the graph */}
            {selected.description && (
              <p className="text-sm text-zinc-400 mb-4 italic">
                {selected.description}
              </p>
            )}

            {/* Loading state */}
            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
                <p className="text-sm text-zinc-400">
                  Generating lesson...
                </p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-900/30 p-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Lesson content */}
            {lesson && !loading && (
              <div className="flex flex-col gap-5">
                {/* Summary */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Overview
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-200">
                    {lesson.summary}
                  </p>
                </section>

                {/* Key Concepts */}
                {lesson.key_concepts.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                      Key Concepts
                    </h3>
                    <ul className="space-y-1">
                      {lesson.key_concepts.map((concept, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-zinc-300"
                        >
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                          {concept}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Explanation */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Explanation
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {lesson.explanation}
                  </p>
                </section>

                {/* Practice Question */}
                {lesson.practice_question && (
                  <section className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                      💡 Practice Question
                    </h3>
                    <p className="text-sm leading-relaxed text-zinc-200">
                      {lesson.practice_question}
                    </p>
                  </section>
                )}

                {/* Further Reading */}
                {lesson.further_reading && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                      📖 Further Reading
                    </h3>
                    <p className="text-sm leading-relaxed text-zinc-400">
                      {lesson.further_reading}
                    </p>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
