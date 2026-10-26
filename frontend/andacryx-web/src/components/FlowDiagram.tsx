
import { useMemo } from "react";
import { ReactFlow, Background, Controls, MarkerType, Position, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

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

export default function FlowDiagram({ method, onNodeSelect }: Props) {
  const nodes = useMemo<Node[]>(() => method.nodes.map((node, index) => ({
    id: node.id,
    position: { x: 200, y: index * 130 },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    data: { label: node.label },
    style: {
      width: 260,
      padding: 12,
      borderRadius: 10,
      border: "1px solid #475569",
      background: node.type === "condition" ? "#312e81" : node.type === "loop" ? "#164e63" : "#1e293b",
      color: "#e2e8f0",
      fontSize: 12,
      whiteSpace: "pre-wrap"
    }
  })), [method]);

  const edges = useMemo<Edge[]>(() => method.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label ?? undefined,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "#94a3b8", strokeWidth: 1.5 },
    labelStyle: { fill: "#e2e8f0" }
  })), [method]);

  return (
    <div style={{ height: 650, width: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        colorMode="dark"
        onNodeClick={(_, node) => {
          const selected = method.nodes.find(item => item.id === node.id);
          if (selected) onNodeSelect(selected);
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
