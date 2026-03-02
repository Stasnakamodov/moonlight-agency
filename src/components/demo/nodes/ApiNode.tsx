import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Globe } from "lucide-react";

export function ApiNode({ data }: NodeProps) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm px-4 py-3 min-w-[160px]">
      <Handle type="target" position={Position.Left} className="!bg-emerald-400 !border-emerald-300 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <Globe size={14} className="text-emerald-400" />
        <div>
          <p className="text-sm font-medium text-white">{String(data.label)}</p>
          <p className="text-xs text-slate-400">{String(data.description)}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-emerald-400 !border-emerald-300 !w-2 !h-2" />
    </div>
  );
}
