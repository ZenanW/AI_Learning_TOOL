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
const NODE_Y_SPACING = 140;
const NODE_X_OFFSET = 250;

/* ── API helpers ── */

interface PathNode {
  id: string;
  label: string;
  description: string;
}

interface PathEdge {
  source: string;
  target: string;
}

async function fetchLearningPath(
  topic: string
): Promise<{ nodes: PathNode[]; edges: PathEdge[] }> {
  const res = await fetch(`${API_BASE}/api/generate-path`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function fetchSubtopic(
  topic: string
): Promise<{ subtopic: string; description: string }> {
  const res = await fetch(`${API_BASE}/api/expand`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/* ── Props type for parent page ── */
export interface SelectedNodeData {
  label: string;
  description: string;
  status: string;
}

interface LearningGraphProps {
  onNodeSelect?: (data: SelectedNodeData | null) => void;
}

export default function LearningGraph({ onNodeSelect }: LearningGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([
    {
      id: PROMPT_NODE_ID,
      type: "prompt",
      position: { x: 0, y: 0 },
      data: {},
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const loadingRef = useRef<Set<string>>(new Set());

  /* ── Step 1: submit a topic → generate a full learning path ── */
  const handleTopicSubmit = useCallback(
    async (topic: string) => {
      // Replace prompt node with a loading indicator
      setNodes([
        {
          id: "loading-root",
          type: "custom",
          position: { x: 0, y: 0 },
          data: { label: topic, status: "loading", description: "" },
        },
      ]);

      try {
        const path = await fetchLearningPath(topic);

        // Convert API response into React Flow nodes + edges
        const flowNodes: Node[] = path.nodes.map((n, i) => ({
          id: n.id,
          type: "custom",
          position: {
            x: i === 0 ? 0 : (i % 2 === 0 ? -1 : 1) * NODE_X_OFFSET,
            y: i * NODE_Y_SPACING,
          },
          data: {
            label: n.label,
            description: n.description,
            status: i === 0 ? "explored" : "new",
          },
        }));

        const flowEdges: Edge[] = path.edges.map((e) => ({
          id: `edge-${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          style: { stroke: "#52525b" },
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch (err) {
        console.error("Failed to generate learning path:", err);
        setNodes([
          {
            id: "error-root",
            type: "custom",
            position: { x: 0, y: 0 },
            data: {
              label: topic,
              status: "error",
              description: "Failed to generate learning path. Please try again.",
            },
          },
        ]);
      }
    },
    [setNodes, setEdges]
  );

  /* ── Step 2: expand a node → get AI subtopic + description ── */
  const handleNodeExpand = useCallback(
    async (nodeId: string) => {
      if (loadingRef.current.has(nodeId)) return;

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
        return prevNodes;
      });

      if (!parentLabel || alreadyExpanded) return;

      loadingRef.current.add(nodeId);
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, status: "loading", expanded: true } }
            : n
        )
      );

      try {
        const { subtopic, description } = await fetchSubtopic(parentLabel);

        const uid = Date.now();
        const childId = `${nodeId}-child-${uid}`;

        const childNode: Node = {
          id: childId,
          type: "custom",
          position: {
            x: parentPos.x,
            y: parentPos.y + NODE_Y_SPACING,
          },
          data: { label: subtopic, description, status: "new" },
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

  /* ── Handle node click → show details in side panel ── */
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === "prompt" || !onNodeSelect) return;
      onNodeSelect({
        label: node.data.label as string,
        description: (node.data.description as string) || "",
        status: node.data.status as string,
      });
    },
    [onNodeSelect]
  );

  /* ── Handle pane click → deselect ── */
  const handlePaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

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
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
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
