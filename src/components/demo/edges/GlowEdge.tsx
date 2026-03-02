import { BaseEdge, getStraightPath, type EdgeProps } from "@xyflow/react";

export function GlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerStart,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={{
          stroke: "rgba(125, 211, 252, 0.3)",
          strokeWidth: 2,
        }}
      />
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: "rgba(125, 211, 252, 0.1)",
          strokeWidth: 6,
          filter: "blur(4px)",
        }}
      />
    </>
  );
}
