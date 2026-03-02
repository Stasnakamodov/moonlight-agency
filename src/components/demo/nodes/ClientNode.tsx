import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Monitor } from "lucide-react";

export function ClientNode({ data }: NodeProps) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm px-4 py-3 min-w-[160px]">
      <div className="flex items-center gap-2">
        <Monitor size={14} className="text-amber-400" />
        <div>
          <p className="text-sm font-medium text-white">{String(data.label)}</p>
          <p className="text-xs text-slate-400">{String(data.description)}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-amber-400 !border-amber-300 !w-2 !h-2" />
    </div>
  );
}
