"use client";

import { ReactFlow, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { demoNodes, demoEdges } from "./demoData";
import { ServiceNode } from "./nodes/ServiceNode";
import { DatabaseNode } from "./nodes/DatabaseNode";
import { ApiNode } from "./nodes/ApiNode";
import { ClientNode } from "./nodes/ClientNode";
import { GlowEdge } from "./edges/GlowEdge";

const nodeTypes = {
  serviceNode: ServiceNode,
  databaseNode: DatabaseNode,
  apiNode: ApiNode,
  clientNode: ClientNode,
};

const edgeTypes = {
  glowEdge: GlowEdge,
};

export function ArchitectureDemo() {
  return (
    <div className="h-[500px] w-full bg-gradient-to-br from-[#0a0e1a] via-[#0d1221] to-[#0a0e1a]">
      <ReactFlow
        nodes={demoNodes}
        edges={demoEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      >
        <Background color="rgba(255,255,255,0.03)" gap={20} />
        <Controls
          showInteractive={false}
          className="!bg-white/5 !border-white/10 !rounded-lg [&>button]:!bg-white/5 [&>button]:!border-white/10 [&>button]:!text-slate-400 [&>button:hover]:!bg-white/10"
        />
      </ReactFlow>
    </div>
  );
}
