import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Database } from "lucide-react";

export function DatabaseNode({ data }: NodeProps) {
  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 backdrop-blur-sm px-4 py-3 min-w-[160px]">
      <Handle type="target" position={Position.Left} className="!bg-violet-400 !border-violet-300 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <Database size={14} className="text-violet-400" />
        <div>
          <p className="text-sm font-medium text-white">{String(data.label)}</p>
          <p className="text-xs text-slate-400">{String(data.description)}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-violet-400 !border-violet-300 !w-2 !h-2" />
    </div>
  );
}
