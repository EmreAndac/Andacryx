import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  useNodesInitialized,
  useReactFlow,
  useNodesState,
  type XYPosition,
  type Node,
  type Edge,
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import "@xyflow/react/dist/style.css";
import FlowNode from "./FlowNode";
import FlowEdge from "./FlowEdge";

const elk = new ELK();
const NODE_WIDTH = 240;
const savedNodePositions = new Map<string, Record<string, XYPosition>>();

function getNodeHeight(type: string) {
  if (type === "condition") return 130;
  if (type === "loop") return 90;
  return 70;
}

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
  diagramKey: string;
  onNodeSelect: (node: FlowNodeDto) => void;
};

function AutoFit({ ready }: { ready: boolean }) {
  const initialized = useNodesInitialized();
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (ready && initialized) fitView({ padding: 0.2, duration: 350 });
  }, [ready, initialized, fitView]);

  return null;
}

const nodeTypes = { flowNode: FlowNode };
const edgeTypes = { flowEdge: FlowEdge };

export default function FlowDiagram({
  method,
  diagramKey,
  onNodeSelect,
}: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [layoutReady, setLayoutReady] = useState(false);

  const nodeMap = useMemo(
    () => new Map(method.nodes.map((node) => [node.id, node])),
    [method],
  );

  const edges = useMemo<Edge[]>(
    () =>
      method.edges.map((edge) => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        const isLoopReturn =
          target?.type === "loop" && source?.type !== "start";
        const isBack = edge.kind === "back" || edge.kind === "continue";
        const isFalse = edge.kind === "false";
        const isTrue = edge.kind === "true";

        const stroke = isTrue
          ? "#22c55e"
          : isFalse
            ? "#f59e0b"
            : isBack
              ? "#38bdf8"
              : "#94a3b8";

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label ?? undefined,
          sourceHandle: isFalse ? "false" : "out",
          targetHandle: isLoopReturn ? (isFalse ? "falseBack" : "back") : "in",
          type: "flowEdge",
          zIndex: isLoopReturn && isFalse ? 10 : 0,
          data: { kind: isLoopReturn && isFalse ? "falseBack" : edge.kind },
          pathOptions: {
            borderRadius: 18,
            offset: isLoopReturn ? 55 : 35,
          },
          animated: isBack,
          markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
          style: {
            stroke,
            strokeWidth: isBack ? 2.5 : 2,
            strokeDasharray: isBack ? "7 5" : undefined,
          },
          labelStyle: {
            fill: stroke,
            fontSize: 11,
            fontWeight: 700,
          },
          labelBgStyle: {
            fill: "#0f172a",
            fillOpacity: 0.95,
          },
          labelBgPadding: [7, 5] as [number, number],
          labelBgBorderRadius: 5,
        };
      }),
    [method, nodeMap],
  );

  useEffect(() => {
    let cancelled = false;
    setLayoutReady(false);
    setNodes([]);

    async function calculateLayout() {
      const orderedNodes = [...method.nodes].sort((a, b) => {
        if (a.type === "start") return -1;
        if (b.type === "start") return 1;
        if (a.type === "end") return 1;
        if (b.type === "end") return -1;
        return a.startLine - b.startLine;
      });

      const nodeOrder = new Map(
        orderedNodes.map((node, index) => [node.id, index]),
      );

      const layoutEdges = method.edges.filter((edge) => {
        const sourceIndex = nodeOrder.get(edge.source);
        const targetIndex = nodeOrder.get(edge.target);

        return (
          edge.kind !== "back" &&
          edge.kind !== "continue" &&
          sourceIndex !== undefined &&
          targetIndex !== undefined &&
          sourceIndex < targetIndex
        );
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
          "elk.spacing.nodeNode": "120",
          "elk.layered.spacing.nodeNodeBetweenLayers": "140",
          "elk.spacing.edgeNode": "55",
          "elk.spacing.edgeEdge": "35",
        },
        children: orderedNodes.map((node) => ({
          id: node.id,
          width: NODE_WIDTH,
          height: getNodeHeight(node.type),
        })),
        edges: layoutEdges.map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      };

      try {
        const layout = await elk.layout(graph);
        if (cancelled) return;

        const savedPositions = savedNodePositions.get(diagramKey);

        const positionedNodes: Node[] = method.nodes.map((node) => {
          const position = layout.children?.find((item) => item.id === node.id);
          const defaultPosition = { x: position?.x ?? 0, y: position?.y ?? 0 };

          return {
            id: node.id,
            type: "flowNode",
            position: savedPositions?.[node.id] ?? defaultPosition,
            data: { label: node.label, kind: node.type },
            draggable: true,
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
    return () => {
      cancelled = true;
    };
  }, [method, diagramKey, setNodes]);

  function handleNodeDragStop() {
    setNodes((currentNodes) => {
      const positions: Record<string, XYPosition> = {};

      for (const node of currentNodes) {
        positions[node.id] = { ...node.position };
      }

      savedNodePositions.set(diagramKey, positions);
      return currentNodes;
    });
  }

  return (
    <div style={{ height: 700, width: "100%", position: "relative" }}>
      {!layoutReady && <p style={{ padding: 16 }}>Diyagram hazırlanıyor...</p>}

      <ReactFlow
        key={`${method.name}-${method.startLine}`}
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        nodesDraggable={true}
        onNodeDragStop={handleNodeDragStop}
        edges={edges}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        colorMode="dark"
        minZoom={0.1}
        maxZoom={2}
        onNodeClick={(_, node) => {
          const selected = method.nodes.find((item) => item.id === node.id);
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
