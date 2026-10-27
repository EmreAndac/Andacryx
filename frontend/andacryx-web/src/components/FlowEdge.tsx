import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

type FlowEdgeData = { kind: string };
type CustomFlowEdge = Edge<FlowEdgeData, "flowEdge">;

export default function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label,
  data,
}: EdgeProps<CustomFlowEdge>) {
  const kind = data?.kind ?? "normal";
  const isFalseBack = kind === "falseBack";

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (isFalseBack) {
    const rightX = sourceX + 65;
    const upperY = targetY + 25;
    const leftX = targetX - 25;

    edgePath = `M ${sourceX} ${sourceY} L ${rightX} ${sourceY} L ${rightX} ${upperY} L ${leftX} ${upperY} L ${leftX} ${targetY} L ${targetX} ${targetY}`;

    labelX = sourceX + 45;
    labelY = sourceY - 15;
  } else {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 18,
      offset: kind === "back" || kind === "continue" ? 70 : 35,
    });
  }

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />

      {label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              padding: "4px 7px",
              borderRadius: 5,
              background: "#0f172a",
              color:
                kind === "true"
                  ? "#22c55e"
                  : kind === "false" || isFalseBack
                    ? "#f59e0b"
                    : "#e2e8f0",
              fontSize: 11,
              fontWeight: 700,
              pointerEvents: "none",
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
