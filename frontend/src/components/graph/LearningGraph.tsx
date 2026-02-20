"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import NodeView from "./NodeView";
import PromptNode from "./PromptNode";

const API_BASE = "http://localhost:8000";
const PROMPT_NODE_ID = "prompt";
const CHILD_Y_OFFSET = 120;

/** Call the backend to get the next subtopic for a given topic. */
async function fetchSubtopic(topic: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/expand`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const data = await res.json();
  return data.subtopic;
}

export default function LearningGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([
    {
      id: PROMPT_NODE_ID,
      type: "prompt",
      position: { x: 0, y: 0 },
      data: {},
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Track which nodes are currently loading to prevent double-clicks
  const loadingRef = useRef<Set<string>>(new Set());

  /* ── Step 1: submit a topic from the prompt ── */
  const handleTopicSubmit = useCallback(
    (topic: string) => {
      const rootId = `topic-${Date.now()}`;

      const rootNode: Node = {
        id: rootId,
        type: "custom",
        position: { x: 0, y: 0 },
        data: { label: topic, status: "new" },
      };

      setNodes((prev) =>
        prev.map((n) => (n.id === PROMPT_NODE_ID ? rootNode : n))
      );
    },
    [setNodes]
  );

  /* ── Step 2: expand a topic node via the AI backend ── */
  const handleNodeExpand = useCallback(
    async (nodeId: string) => {
      // Prevent concurrent expand on the same node
      if (loadingRef.current.has(nodeId)) return;

      // Read current node state
      let parentLabel = "";
      let parentPos = { x: 0, y: 0 };
      let alreadyExpanded = false;

      setNodes((prevNodes) => {
        const parent = prevNodes.find((n) => n.id === nodeId);
        if (parent) {
          parentLabel = parent.data.label as string;
          parentPos = { ...parent.position };
          alreadyExpanded = !!parent.data.expanded;
        }
        return prevNodes; // no mutation yet
      });

      if (!parentLabel || alreadyExpanded) return;

      // Mark as loading
      loadingRef.current.add(nodeId);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status: "loading", expanded: true } }
            : n
        )
      );

      try {
        const subtopic = await fetchSubtopic(parentLabel);

        const uid = Date.now();
        const childId = `${nodeId}-child-${uid}`;

        const childNode: Node = {
          id: childId,
          type: "custom",
          position: {
            x: parentPos.x,
            y: parentPos.y + CHILD_Y_OFFSET,
          },
          data: { label: subtopic, status: "new" },
        };

        const childEdge: Edge = {
          id: `edge-${nodeId}-${uid}`,
          source: nodeId,
          target: childId,
          style: { stroke: "#52525b" },
        };

        setNodes((prev) => {
          const updated = prev.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, status: "explored" } }
              : n
          );
          return [...updated, childNode];
        });

        setEdges((prev) => [...prev, childEdge]);
      } catch {
        // Revert on error
        setNodes((prev) =>
          prev.map((n) =>
            n.id === nodeId
              ? { ...n, data: { ...n.data, status: "error", expanded: false } }
              : n
          )
        );
      } finally {
        loadingRef.current.delete(nodeId);
      }
    },
    [setNodes, setEdges]
  );

  /* ── Inject callbacks into node data ── */
  const nodesWithCallbacks = useMemo(
    () =>
      nodes.map((node) => {
        if (node.id === PROMPT_NODE_ID) {
          return {
            ...node,
            data: { ...node.data, onSubmit: handleTopicSubmit },
          };
        }
        if (node.type === "custom") {
          return {
            ...node,
            data: { ...node.data, onExpand: handleNodeExpand },
          };
        }
        return node;
      }),
    [nodes, handleTopicSubmit, handleNodeExpand]
  );

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      custom: NodeView,
      prompt: PromptNode,
    }),
    []
  );

  return (
    <ReactFlow
      nodes={nodesWithCallbacks}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      nodesDraggable
      nodesConnectable={false}
      deleteKeyCode={null}
      proOptions={{ hideAttribution: true }}
      className="bg-zinc-900"
    >
      <Background color="#3f3f46" gap={20} />
      <Controls
        showInteractive={false}
        className="!bg-zinc-800 !border-zinc-700 !shadow-md [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-300 [&>button:hover]:!bg-zinc-700"
      />
    </ReactFlow>
  );
}
