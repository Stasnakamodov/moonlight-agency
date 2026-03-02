import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Cog } from "lucide-react";

export function ServiceNode({ data }: NodeProps) {
  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 backdrop-blur-sm px-4 py-3 min-w-[160px]">
      <Handle type="target" position={Position.Left} className="!bg-sky-400 !border-sky-300 !w-2 !h-2" />
      <div className="flex items-center gap-2">
        <Cog size={14} className="text-sky-400" />
        <div>
          <p className="text-sm font-medium text-white">{String(data.label)}</p>
          <p className="text-xs text-slate-400">{String(data.description)}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-sky-400 !border-sky-300 !w-2 !h-2" />
    </div>
  );
}
