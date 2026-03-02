import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "sky" | "violet";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        variant === "default" && "bg-white/10 text-slate-300",
        variant === "sky" && "bg-sky-500/10 text-sky-300 border border-sky-500/20",
        variant === "violet" && "bg-violet-500/10 text-violet-300 border border-violet-500/20",
        className
      )}
    >
      {children}
    </span>
  );
}
