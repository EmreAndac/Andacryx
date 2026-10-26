
import { useEffect, useMemo, useState } from "react";
import { ReactFlow, Background, Controls, MarkerType, useNodesInitialized, useReactFlow, type Node, type Edge } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import "@xyflow/react/dist/style.css";
import FlowNode from "./FlowNode";

const elk = new ELK();
const NODE_WIDTH = 240;
const NODE_HEIGHT = 65;

export type FlowNodeDto = {
  id: string;
  type: string;
  label: string;
  code: string;
  startLine: number;
  endLine: number;
};

export type FlowEdgeDto = {
  id: string;
  source: string;
  target: string;
  label: string | null;
  kind: "normal" | "true" | "false" | "back" | "return" | "break" | "continue";
};

export type MethodFlowDto = {
  name: string;
  startLine: number;
  endLine: number;
  nodes: FlowNodeDto[];
  edges: FlowEdgeDto[];
};

type Props = {
  method: MethodFlowDto;
  onNodeSelect: (node: FlowNodeDto) => void;
};

function AutoFit({ ready }: { ready: boolean }) {
  const initialized = useNodesInitialized();
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (ready && initialized) {
      fitView({ padding: 0.2, duration: 350 });
    }
  }, [ready, initialized, fitView]);

  return null;
}

const nodeTypes = { flowNode: FlowNode };

export default function FlowDiagram({ method, onNodeSelect }: Props) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [layoutReady, setLayoutReady] = useState(false);

  const edges = useMemo<Edge[]>(() => method.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.kind === "false" ? "false" : "out",
    targetHandle: method.nodes.find(node => node.id === edge.target)?.type === "loop" &&
        method.nodes.find(node => node.id === edge.source)?.type !== "start"
            ? "back"
            : "in",
    label: edge.label ?? undefined,
    type: "smoothstep",
    labelBgBorderRadius: 4,
    pathOptions: { borderRadius: 16, offset: 30 },
    animated: edge.kind === "back" || edge.kind === "continue",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
        stroke: edge.kind === "true" ? "#22c55e" :
                edge.kind === "false" ? "#f59e0b" :
                edge.kind === "back" ? "#38bdf8" : "#94a3b8",
        strokeWidth: edge.kind === "back" ? 2.5 : 1.5
    },
    labelStyle: { fill: "#e2e8f0", fontSize: 11 },
    labelBgStyle: { fill: "#0f172a" },
    labelBgPadding: [5, 3] as [number, number]
  })), [method]);

  useEffect(() => {
    let cancelled = false;
    setLayoutReady(false);

    async function calculateLayout() {
      const orderedNodes = [...method.nodes].sort((a, b) => {
        if (a.type === "start") return -1;
        if (b.type === "start") return 1;
        if (a.type === "end") return 1;
        if (b.type === "end") return -1;
        return a.startLine - b.startLine;
      });

      const nodeOrder = new Map(orderedNodes.map((node, index) => [node.id, index]));

      const layoutEdges = method.edges.filter(edge => {
      const sourceIndex = nodeOrder.get(edge.source);
      const targetIndex = nodeOrder.get(edge.target);

      return edge.kind !== "back" &&
        edge.kind !== "continue" &&
        sourceIndex !== undefined &&
        targetIndex !== undefined &&
        sourceIndex < targetIndex;
      });
      const graph = {
        id: "root",
        layoutOptions: {
            "elk.algorithm": "layered",
            "elk.direction": "DOWN",
            "elk.edgeRouting": "ORTHOGONAL",
            "elk.layered.cycleBreaking.strategy": "GREEDY",
            "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
            "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
            "elk.spacing.nodeNode": "80",
            "elk.layered.spacing.nodeNodeBetweenLayers": "100",
            "elk.spacing.edgeNode": "35",
            "elk.spacing.edgeEdge": "20"
        },
        children: orderedNodes.map(node => ({
          id: node.id,
          width: NODE_WIDTH,
          height: NODE_HEIGHT
        })),
        edges: layoutEdges.map(edge => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target]
        }))
      };

      try {
        const layout = await elk.layout(graph);
        if (cancelled) return;

        const positionedNodes: Node[] = method.nodes.map(node => {
          const position = layout.children?.find(item => item.id === node.id);

          return {
            id: node.id,
            type: "flowNode",
            position: { x: position?.x ?? 0, y: position?.y ?? 0 },
            data: { label: node.label, kind: node.type }
          };
        });

        setNodes(positionedNodes);
        setLayoutReady(true);
      } catch (error) {
        console.error("ELK layout error:", error);
        if (!cancelled) setLayoutReady(true);
      }
    }

    calculateLayout();
    return () => { cancelled = true; };
  }, [method]);

  return (
    <div style={{ height: 650, width: "100%", position: "relative" }}>
      {!layoutReady && <p style={{ padding: 16 }}>Diyagram hazırlanıyor...</p>}

      <ReactFlow
        key={`${method.name}-${method.startLine}`}
        nodes={nodes}
        nodeTypes={nodeTypes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        colorMode="dark"
        minZoom={0.1}
        maxZoom={2}
        onNodeClick={(_, node) => {
          const selected = method.nodes.find(item => item.id === node.id);
          if (selected) onNodeSelect(selected);
        }}
      >
        <AutoFit ready={layoutReady} />
        <Background gap={20} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
