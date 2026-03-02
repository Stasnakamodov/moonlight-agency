"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
}

const directionMap = {
  up: { y: 30, x: 0 },
  down: { y: -30, x: 0 },
  left: { y: 0, x: 30 },
  right: { y: 0, x: -30 },
};

export function AnimatedReveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: AnimatedRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const { x, y } = directionMap[direction];

  // SSR & before hydration: content visible (initial={false} prevents inline opacity:0)
  // After mount, not in view: instantly hide (duration: 0)
  // Scrolled into view: animate reveal (duration: 0.5)
  const isVisible = !hasMounted || isInView;

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={
        isVisible
          ? { opacity: 1, x: 0, y: 0 }
          : { opacity: 0, x, y }
      }
      transition={
        isInView && hasMounted
          ? { duration: 0.5, delay, ease: "easeOut" }
          : { duration: 0 }
      }
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
