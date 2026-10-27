import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

type FlowNodeData = { label: string; kind: string };
type CustomFlowNode = Node<FlowNodeData, "flowNode">;

const colors: Record<string, { background: string; border: string }> = {
  start: { background: "#14532d", border: "#4ade80" },
  end: { background: "#7f1d1d", border: "#f87171" },
  condition: { background: "#312e81", border: "#a78bfa" },
  loop: { background: "#164e63", border: "#22d3ee" },
  process: { background: "#1e293b", border: "#64748b" },
};

export default function FlowNode({
  data,
  selected,
}: NodeProps<CustomFlowNode>) {
  const kind = data.kind;
  const isBranch = kind === "condition" || kind === "loop";
  const color = colors[kind] ?? colors.process;
  const borderColor = selected ? "#38bdf8" : color.border;

  const width = 240;
  const height = kind === "condition" ? 130 : kind === "loop" ? 90 : 70;

  function getShape() {
    if (kind === "condition") {
      return (
        <polygon
          points="120,2 238,65 120,128 2,65"
          fill={color.background}
          stroke={borderColor}
          strokeWidth={selected ? 3 : 2}
        />
      );
    }

    if (kind === "loop") {
      return (
        <polygon
          points="30,2 210,2 238,45 210,88 30,88 2,45"
          fill={color.background}
          stroke={borderColor}
          strokeWidth={selected ? 3 : 2}
        />
      );
    }

    return (
      <rect
        x="2"
        y="2"
        width="236"
        height={height - 4}
        rx={kind === "start" || kind === "end" ? 34 : 8}
        fill={color.background}
        stroke={borderColor}
        strokeWidth={selected ? 3 : 2}
      />
    );
  }

  return (
    <div style={{ width, height, position: "relative" }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0, overflow: "visible" }}
      >
        {getShape()}
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding:
            kind === "condition"
              ? "18px 52px"
              : kind === "loop"
                ? "12px 38px"
                : "12px 18px",
          color: "#e2e8f0",
          textAlign: "center",
          fontSize: 12,
          fontWeight: kind === "start" || kind === "end" ? 700 : 500,
          overflowWrap: "anywhere",
          pointerEvents: "none",
        }}
      >
        {data.label}
      </div>

      {kind !== "start" && (
        <Handle
          type="target"
          id="in"
          position={Position.Top}
          style={{ top: 2 }}
        />
      )}

      {kind !== "end" && (
        <Handle
          type="source"
          id="out"
          position={Position.Bottom}
          style={{ left: isBranch ? "35%" : "50%", bottom: 2 }}
        />
      )}

      {isBranch && (
        <Handle
          type="source"
          id="false"
          position={Position.Right}
          style={{ top: "50%", right: 2 }}
        />
      )}

      {kind === "loop" && (
        <>
          <Handle
            type="target"
            id="back"
            position={Position.Left}
            style={{ top: "35%", left: 20 }}
          />
          <Handle
            type="target"
            id="falseBack"
            position={Position.Left}
            style={{ top: "70%", left: 20 }}
          />
        </>
      )}
    </div>
  );
}
