import { cn } from "@/lib/utils";

export function glowButtonClass(options?: {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { variant = "primary", size = "md", className } = options ?? {};
  return cn(
    "relative inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-300 cursor-pointer",
    variant === "primary" &&
      "bg-gradient-to-r from-sky-500 to-violet-500 text-white hover:from-sky-400 hover:to-violet-400 shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/40",
    variant === "secondary" &&
      "border border-white/20 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10 hover:border-white/30",
    size === "sm" && "px-4 py-2 text-sm",
    size === "md" && "px-6 py-3 text-base",
    size === "lg" && "px-8 py-4 text-lg",
    className
  );
}

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
}

export function GlowButton({
  variant = "primary",
  size = "md",
  children,
  className,
  ...props
}: GlowButtonProps) {
  return (
    <button
      className={glowButtonClass({ variant, size, className })}
      {...props}
    >
      {children}
    </button>
  );
}
