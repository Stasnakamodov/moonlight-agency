import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.07] backdrop-blur-xl p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        hover && "transition-all duration-300 hover:bg-white/[0.10] hover:border-white/20 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_8px_32px_-8px_rgba(125,211,252,0.08)]",
        className
      )}
    >
      {children}
    </div>
  );
}
