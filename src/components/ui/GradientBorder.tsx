import { cn } from "@/lib/utils";

interface GradientBorderProps {
  children: React.ReactNode;
  className?: string;
}

export function GradientBorder({ children, className }: GradientBorderProps) {
  return (
    <div className={cn("relative rounded-2xl p-[1px]", className)}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-sky-500/50 to-violet-500/50" />
      <div className="relative rounded-2xl bg-[#0a0e1a]">{children}</div>
    </div>
  );
}
