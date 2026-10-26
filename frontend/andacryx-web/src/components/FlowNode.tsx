
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

type FlowNodeData = { label: string; kind: string };
type CustomFlowNode = Node<FlowNodeData, "flowNode">;

const colors: Record<string, string> = {
  start: "#14532d",
  end: "#7f1d1d",
  condition: "#312e81",
  loop: "#164e63",
  process: "#1e293b"
};

export default function FlowNode({ data, selected }: NodeProps<CustomFlowNode>) {
  const isBranch = data.kind === "condition" || data.kind === "loop";

  return (
    <div style={{
      width: 240,
      minHeight: 65,
      padding: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      background: colors[data.kind] ?? colors.process,
      border: selected ? "2px solid #38bdf8" : "1px solid #475569",
      color: "#e2e8f0",
      textAlign: "center",
      fontSize: 12,
      overflowWrap: "anywhere",
      position: "relative"
    }}>
      {data.label}

      {data.kind !== "start" && <Handle type="target" id="in" position={Position.Top} />}

      {data.kind !== "end" && (
        <Handle type="source" id="out" position={Position.Bottom}
          style={isBranch ? { left: "35%" } : undefined} />
      )}

      {isBranch && (
        <Handle type="source" id="false" position={Position.Right} style={{ top: "70%" }} />
      )}

      {data.kind === "loop" && (
        <Handle type="target" id="back" position={Position.Left}
          style={{ top: "50%" }} />
      )}
    </div>
  );
}
