"use client";

import { useRef, Children, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface ScrollCardsProps {
  children: React.ReactNode;
  heading?: React.ReactNode;
  className?: string;
}

export function ScrollCards({ children, heading, className }: ScrollCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const childArray = Children.toArray(children);
  const total = childArray.length;
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setActiveIndex(Math.round(latest * (total - 1)));
  });

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ height: `${total * 100}vh` }}
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Heading inside sticky — always visible while scrolling */}
        {heading && <div className="mb-10 w-full max-w-4xl px-6 lg:px-8">{heading}</div>}

        {/* Stacked cards — grid stacking */}
        <div className="w-full max-w-4xl mx-auto px-6 lg:px-8 grid">
          {childArray.map((child, i) => (
            <ScrollCardItem
              key={i}
              index={i}
              total={total}
              progress={scrollYProgress}
              isActive={i === activeIndex}
            >
              {child}
            </ScrollCardItem>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="absolute right-6 xl:right-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-10">
          {childArray.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                i === activeIndex
                  ? "bg-sky-400 scale-150 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                  : "bg-white/20"
              )}
            />
          ))}
          <span className="mt-2 text-[11px] font-mono tabular-nums text-white/40">
            {String(activeIndex + 1).padStart(2, "0")}/
            {String(total).padStart(2, "0")}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface ScrollCardItemProps {
  children: React.ReactNode;
  index: number;
  total: number;
  progress: MotionValue<number>;
  isActive: boolean;
}

function ScrollCardItem({
  children,
  index,
  total,
  progress,
  isActive,
}: ScrollCardItemProps) {
  const last = total - 1;

  const opacity = useTransform(progress, (v) => {
    const active = v * last;
    return Math.max(0, 1 - Math.abs(index - active));
  });

  const y = useTransform(progress, (v) => {
    const d = index - v * last;
    if (d >= 1) return 60;
    if (d <= -1) return -40;
    return d > 0 ? d * 60 : d * 40;
  });

  const scale = useTransform(progress, (v) => {
    const d = index - v * last;
    if (d >= 1) return 0.95;
    if (d <= -1) return 0.98;
    return d > 0 ? 1 - d * 0.05 : 1 + d * 0.02;
  });

  const filter = useTransform(progress, (v) => {
    const d = index - v * last;
    const absD = Math.abs(d);
    if (absD < 0.01) return "blur(0px)";
    if (d >= 1) return "blur(4px)";
    if (d <= -1) return "blur(2px)";
    return `blur(${(absD * 4).toFixed(1)}px)`;
  });

  return (
    <motion.div
      style={{
        gridArea: "1 / 1",
        opacity,
        y,
        scale,
        filter,
        willChange: "transform, opacity, filter",
      }}
      className={cn(!isActive && "pointer-events-none")}
    >
      {children}
    </motion.div>
  );
}
