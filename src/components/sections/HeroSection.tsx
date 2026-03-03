"use client";

import { useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { glowButtonClass } from "@/components/ui/GlowButton";
import { gsap, useGSAP, SplitText, ScrollTrigger } from "@/lib/gsap";

/* ═══════════════════════════════════════════════════════════
   Shared constants
   ═══════════════════════════════════════════════════════════ */

const TITLE_STYLE: React.CSSProperties = {
  fontSize: "clamp(3rem, 9vw, 13rem)",
  lineHeight: 0.9,
  letterSpacing: "0.06em",
  whiteSpace: "nowrap",
};

/* Text-shadow values: base → bright breathing range */
const SHADOW_BASE =
  "0 0 6px rgba(255,255,255,0.5), 0 0 15px rgba(125,211,252,0.45), 0 0 35px rgba(125,211,252,0.25), 0 0 60px rgba(125,211,252,0.1)";
const SHADOW_BRIGHT =
  "0 0 10px rgba(255,255,255,0.8), 0 0 28px rgba(125,211,252,0.7), 0 0 60px rgba(125,211,252,0.4), 0 0 100px rgba(125,211,252,0.2), 0 0 140px rgba(196,181,253,0.08)";

/* ═══════════════════════════════════════════════════════════
   Decorative moon — plain div + GSAP (no framer-motion)
   ═══════════════════════════════════════════════════════════ */

function DecorativeMoon() {
  const moonRef = useRef<HTMLDivElement>(null);
  const bobRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Entrance
    gsap.fromTo(
      moonRef.current,
      { opacity: 0, scale: 0.85 },
      { opacity: 1, scale: 1, duration: 2, delay: 0.8, ease: "power4.out" }
    );
    // Gentle bob — infinite, compositor-only (y + rotate)
    gsap.to(bobRef.current, {
      y: -6,
      rotate: 0.3,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  });

  return (
    <div
      ref={moonRef}
      className="absolute z-[5] pointer-events-none right-[6%] top-1/2 -translate-y-[55%] w-[320px] h-[320px] lg:w-[380px] lg:h-[380px] max-md:w-[180px] max-md:h-[180px] max-md:right-[-40px] max-md:top-[8%] max-md:translate-y-0"
      style={{ opacity: 0 }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-[-60%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(125,211,252,0.22) 0%, rgba(196,181,253,0.12) 30%, rgba(125,211,252,0.04) 50%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute inset-[-30%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 58% 45%, rgba(125,211,252,0.16) 0%, rgba(196,181,253,0.08) 40%, transparent 70%)",
          filter: "blur(35px)",
        }}
      />
      <div
        className="absolute inset-[-8%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 60% 45%, rgba(200,195,185,0.12) 0%, rgba(125,211,252,0.06) 50%, transparent 75%)",
          filter: "blur(12px)",
        }}
      />
      <div
        ref={bobRef}
        className="relative w-full h-full rounded-full overflow-hidden"
        style={{
          background: `radial-gradient(circle at 68% 42%,
            #d8d4cc 0%, #c4c0b6 12%, #aba79f 28%,
            #8a8680 45%, #585450 62%, #343230 78%, #1a1918 100%)`,
          boxShadow: `
            inset -6px -3px 16px rgba(125,211,252,0.25),
            inset 15px 10px 40px rgba(0,0,0,0.75),
            inset 4px 2px 8px rgba(0,0,0,0.3),
            0 0 40px 12px rgba(125,211,252,0.08),
            0 0 80px 30px rgba(196,181,253,0.04)`,
        }}
      >
        {/* Moon maria (dark regions) */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(ellipse 50% 40% at 32% 32%, rgba(40,38,35,0.5) 0%, rgba(40,38,35,0.15) 60%, transparent 100%),
              radial-gradient(ellipse 35% 28% at 55% 58%, rgba(40,38,35,0.45) 0%, rgba(40,38,35,0.1) 60%, transparent 100%),
              radial-gradient(ellipse 22% 35% at 20% 62%, rgba(40,38,35,0.4) 0%, rgba(40,38,35,0.08) 60%, transparent 100%),
              radial-gradient(ellipse 28% 22% at 62% 22%, rgba(40,38,35,0.35) 0%, rgba(40,38,35,0.06) 60%, transparent 100%),
              radial-gradient(ellipse 18% 22% at 44% 44%, rgba(40,38,35,0.3) 0%, transparent 100%),
              radial-gradient(ellipse 25% 15% at 38% 75%, rgba(40,38,35,0.25) 0%, transparent 100%)`,
          }}
        />
        {/* Moon craters */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(circle at 36% 36%, rgba(30,28,25,0.5) 0%, rgba(30,28,25,0.2) 3.5%, rgba(180,175,165,0.15) 4.5%, transparent 7%),
              radial-gradient(circle at 56% 56%, rgba(30,28,25,0.4) 0%, rgba(30,28,25,0.15) 3%, rgba(180,175,165,0.12) 4%, transparent 6.5%),
              radial-gradient(circle at 24% 60%, rgba(30,28,25,0.35) 0%, rgba(30,28,25,0.1) 2.5%, rgba(180,175,165,0.1) 3.5%, transparent 5%),
              radial-gradient(circle at 68% 28%, rgba(30,28,25,0.35) 0%, rgba(30,28,25,0.1) 2.5%, rgba(180,175,165,0.1) 3.5%, transparent 5.5%),
              radial-gradient(circle at 48% 48%, rgba(30,28,25,0.3) 0%, rgba(30,28,25,0.08) 2%, rgba(180,175,165,0.08) 3%, transparent 4%),
              radial-gradient(circle at 60% 40%, rgba(30,28,25,0.25) 0%, rgba(180,175,165,0.06) 2%, transparent 3.5%),
              radial-gradient(circle at 30% 48%, rgba(30,28,25,0.2) 0%, rgba(180,175,165,0.05) 1.5%, transparent 2.5%),
              radial-gradient(circle at 52% 25%, rgba(30,28,25,0.2) 0%, rgba(180,175,165,0.05) 1.5%, transparent 2.5%),
              radial-gradient(circle at 40% 70%, rgba(30,28,25,0.2) 0%, rgba(180,175,165,0.06) 2%, transparent 3%),
              radial-gradient(circle at 72% 52%, rgba(30,28,25,0.15) 0%, rgba(180,175,165,0.04) 1%, transparent 2%),
              radial-gradient(circle at 18% 40%, rgba(30,28,25,0.12) 0%, transparent 1.5%),
              radial-gradient(circle at 65% 68%, rgba(30,28,25,0.12) 0%, transparent 1.5%)`,
          }}
        />
        {/* Terminator shadow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(105deg, rgba(8,6,4,0.7) 0%, rgba(8,6,4,0.4) 15%, rgba(8,6,4,0.12) 30%, transparent 50%)",
          }}
        />
        {/* Mineral tints */}
        <div
          className="absolute inset-0 rounded-full opacity-25"
          style={{
            background: `
              radial-gradient(ellipse 40% 30% at 55% 35%, rgba(180,160,130,0.3) 0%, transparent 100%),
              radial-gradient(ellipse 30% 25% at 35% 55%, rgba(130,140,160,0.2) 0%, transparent 100%),
              radial-gradient(ellipse 25% 20% at 65% 60%, rgba(160,150,135,0.15) 0%, transparent 100%)`,
          }}
        />
        {/* Limb brightening */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(115deg, transparent 45%, rgba(125,211,252,0.06) 60%, rgba(125,211,252,0.12) 72%, rgba(200,220,240,0.2) 84%, rgba(255,255,255,0.3) 94%, rgba(255,255,255,0.4) 100%)",
          }}
        />
        {/* Specular highlights */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              radial-gradient(circle at 58% 28%, rgba(255,255,255,0.1) 0%, transparent 5%),
              radial-gradient(circle at 70% 45%, rgba(255,255,255,0.08) 0%, transparent 4%),
              radial-gradient(circle at 52% 18%, rgba(255,255,255,0.06) 0%, transparent 6%),
              radial-gradient(circle at 74% 34%, rgba(255,255,255,0.07) 0%, transparent 3.5%),
              radial-gradient(circle at 62% 55%, rgba(255,255,255,0.05) 0%, transparent 3%)`,
          }}
        />
        {/* Earthshine */}
        <div
          className="absolute inset-0 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(ellipse 50% 40% at 62% 38%, rgba(255,255,255,0.15) 0%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */

export function HeroSection() {
  const t = useTranslations("hero");
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleWrapRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  // Main visible title lines
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);

  // Other elements
  const subtitleLineRef = useRef<HTMLDivElement>(null);
  const subtitleTextRef = useRef<HTMLSpanElement>(null);
  const cursorSpanRef = useRef<HTMLSpanElement>(null);
  const accentLineRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLDivElement>(null);

  // Touch detection
  const isTouchRef = useRef(false);
  useEffect(() => {
    isTouchRef.current =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  // Cursor interaction state — zero-allocation architecture
  const charRectsRef = useRef<Float32Array>(new Float32Array(0));
  const quickTosRef = useRef<
    { x: (v: number) => void; y: (v: number) => void; scale: (v: number) => void }[]
  >([]);
  const glowSettersRef = useRef<((v: number) => void)[]>([]);
  const splitCharsRef = useRef<HTMLElement[]>([]);

  /** Cache char positions — called on mount & resize, never in mousemove */
  const cacheCharRects = useCallback(() => {
    const chars = splitCharsRef.current;
    if (!chars.length || !titleWrapRef.current) return;
    const wrapRect = titleWrapRef.current.getBoundingClientRect();
    const rects = new Float32Array(chars.length * 2);
    for (let i = 0; i < chars.length; i++) {
      const cr = chars[i].getBoundingClientRect();
      rects[i * 2] = cr.left + cr.width / 2 - wrapRect.left;
      rects[i * 2 + 1] = cr.top + cr.height / 2 - wrapRect.top;
    }
    charRectsRef.current = rects;
  }, []);

  /** Create quickTo tweens per char — called once after split */
  const createQuickTos = useCallback(() => {
    const chars = splitCharsRef.current;
    quickTosRef.current = chars.map((ch) => ({
      x: gsap.quickTo(ch, "x", { duration: 0.4, ease: "power3" }),
      y: gsap.quickTo(ch, "y", { duration: 0.4, ease: "power3" }),
      scale: gsap.quickTo(ch, "scale", { duration: 0.4, ease: "power3" }),
    }));
    glowSettersRef.current = chars.map(
      (ch) => gsap.quickSetter(ch, "--glow") as (v: number) => void
    );
  }, []);

  /* ── GSAP Main Timeline ── */
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      /* — Subtitle line — */
      tl.fromTo(
        subtitleLineRef.current,
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 0.8, ease: "power3.out" },
        0
      );

      /* — Subtitle text — */
      tl.fromTo(
        subtitleTextRef.current,
        { opacity: 0, x: -15 },
        { opacity: 1, x: 0, duration: 0.6 },
        0.2
      );

      /* — Cursor blink appear — */
      tl.fromTo(
        cursorSpanRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 },
        0.4
      );

      /* — SplitText (no mask — avoids overflow:hidden clipping) — */
      const allChars: HTMLElement[] = [];

      const split1 = SplitText.create(line1Ref.current!, {
        type: "chars",
        autoSplit: true,
        onSplit(self) {
          const newChars = [...(self.chars as HTMLElement[])];
          newChars.forEach((ch) => ch.setAttribute("data-char", ""));
          if (splitCharsRef.current.length > 0) {
            splitCharsRef.current = [
              ...newChars,
              ...(split2 ? (split2.chars as HTMLElement[]) : []),
            ];
            cacheCharRects();
            createQuickTos();
          }
        },
      });
      const chars1 = split1.chars as HTMLElement[];
      chars1.forEach((ch) => ch.setAttribute("data-char", ""));

      const split2 = SplitText.create(line2Ref.current!, {
        type: "chars",
        autoSplit: true,
        onSplit(self) {
          const newChars = [...(self.chars as HTMLElement[])];
          newChars.forEach((ch) => ch.setAttribute("data-char", ""));
          if (splitCharsRef.current.length > 0) {
            splitCharsRef.current = [
              ...(split1.chars as HTMLElement[]),
              ...newChars,
            ];
            cacheCharRects();
            createQuickTos();
          }
        },
      });
      const chars2 = split2.chars as HTMLElement[];
      chars2.forEach((ch) => ch.setAttribute("data-char", ""));

      allChars.push(...chars1, ...chars2);
      splitCharsRef.current = allChars;

      /* — Light beam sweep: visible beam crosses title, igniting chars
         by their X-position. No masks, no overflow:hidden. — */

      // Read char positions BEFORE applying initial transforms
      const titleEl = titleWrapRef.current!;
      const wrapRect = titleEl.getBoundingClientRect();
      const titleW = titleEl.offsetWidth;

      const char1Xs = chars1.map((ch) => {
        const cr = ch.getBoundingClientRect();
        return cr.left + cr.width / 2 - wrapRect.left;
      });
      const char2Xs = chars2.map((ch) => {
        const cr = ch.getBoundingClientRect();
        return cr.left + cr.width / 2 - wrapRect.left;
      });

      // Set initial invisible state
      gsap.set(allChars, { opacity: 0, y: 12 });

      // ── Big Bang flash: bright burst at beam origin ──
      const flashStart = 0.25;
      tl.fromTo(
        flashRef.current,
        { opacity: 0, scale: 0.15 },
        { opacity: 1, scale: 1.6, duration: 0.3, ease: "power2.out" },
        flashStart
      );
      // Flash lingers then fades as beam takes over
      tl.to(
        flashRef.current,
        { opacity: 0, scale: 0.4, duration: 0.9, ease: "power3.in" },
        flashStart + 0.3
      );

      // ── Beam sweep ──
      const sweepStart = 0.5;
      const sweepDur = 1.5;

      // Beam position
      tl.fromTo(
        beamRef.current,
        { x: -180 },
        { x: titleW + 180, duration: sweepDur, ease: "power1.inOut" },
        sweepStart
      );
      // Beam opacity: quick fade in
      tl.fromTo(
        beamRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.12, ease: "power2.in" },
        sweepStart
      );
      // Beam opacity: fade out at end
      tl.to(
        beamRef.current,
        { opacity: 0, duration: 0.35, ease: "power2.out" },
        sweepStart + sweepDur - 0.35
      );

      // ── Ignite each char as beam passes its X-position ──
      const igniteChar = (ch: HTMLElement, cx: number, lineOff: number) => {
        const progress = Math.max(0, Math.min(1, cx / titleW));
        const delay = sweepStart + lineOff + progress * sweepDur * 0.85;

        // Quick appear + rise
        tl.to(ch, {
          opacity: 1, y: 0, duration: 0.2, ease: "power2.out",
        }, delay);

        // Intense glow flash → decay
        tl.fromTo(ch,
          { "--glow": 4 },
          { "--glow": 0, duration: 1.0, ease: "power2.out" },
          delay,
        );

        // Scale pop → elastic settle
        tl.fromTo(ch,
          { scale: 1.15 },
          { scale: 1, duration: 0.6, ease: "elastic.out(1.2, 0.5)" },
          delay,
        );
      };

      chars1.forEach((ch, i) => igniteChar(ch, char1Xs[i], 0));
      chars2.forEach((ch, i) => igniteChar(ch, char2Xs[i], 0.3));

      /* — Accent line — */
      tl.fromTo(
        accentLineRef.current,
        { scaleX: 0, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 1.2, ease: "power3.out" },
        2.3
      );

      /* — Description — */
      tl.fromTo(
        descRef.current,
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.8 },
        2.5
      );

      /* — CTA buttons — */
      tl.fromTo(
        ctaRef.current,
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.8 },
        2.8
      );

      /* — Chevron — */
      tl.fromTo(
        chevronRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.6 },
        3.2
      );

      /* — H1-level text-shadow fades in as chars materialize — */
      tl.fromTo(
        titleRef.current,
        { textShadow: "0 0 0px transparent" },
        { textShadow: SHADOW_BASE, duration: 2, ease: "power2.out" },
        1.0
      );

      /* — Text-shadow breathing — GSAP yoyo loop — */
      gsap.fromTo(
        titleRef.current,
        { textShadow: SHADOW_BASE },
        {
          textShadow: SHADOW_BRIGHT,
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 4.5,
        }
      );

      /* — Cursor blink loop then fade — */
      const cursorBlink = gsap.timeline({ repeat: -1, yoyo: true, delay: 2.5 });
      cursorBlink.to(cursorSpanRef.current, {
        opacity: 0,
        duration: 0.4,
        ease: "power2.in",
      });
      gsap.delayedCall(3.5, () => {
        cursorBlink.kill();
        gsap.to(cursorSpanRef.current, { opacity: 0, duration: 0.5 });
      });

      /* — Shimmer: per-char glow wave sweeping left→right — */
      const shimSweepDur = 1.2;
      const charStagger = shimSweepDur / (allChars.length + 3);

      const shimTl = gsap.timeline({ repeat: -1, repeatDelay: 5, delay: 5.0 });

      shimTl.to(allChars, {
        "--glow": 0.9,
        duration: 0.15,
        stagger: { each: charStagger, from: "start" },
        ease: "power2.in",
      }, 0);
      shimTl.to(allChars, {
        "--glow": 0,
        duration: 0.4,
        stagger: { each: charStagger, from: "start" },
        ease: "power2.out",
      }, 0.08);

      /* — Cache char positions after reveal settles — */
      tl.call(() => {
        cacheCharRects();
        createQuickTos();
      }, [], 3.5);

      /* — ResizeObserver to re-cache — */
      const ro = new ResizeObserver(() => {
        cacheCharRects();
      });
      if (titleWrapRef.current) ro.observe(titleWrapRef.current);

      /* — Chevron fade on scroll via ScrollTrigger — */
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "300px top",
        onUpdate(self) {
          if (chevronRef.current) {
            chevronRef.current.style.opacity = String(1 - self.progress);
          }
        },
      });

      return () => {
        ro.disconnect();
      };
    },
    { scope: containerRef }
  );

  /* ── Cursor interaction — zero getBoundingClientRect in mousemove ── */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouchRef.current) return;
      const rects = charRectsRef.current;
      const qts = quickTosRef.current;
      const glows = glowSettersRef.current;
      if (!rects.length || !qts.length) return;

      // Use offsetX/Y — no getBoundingClientRect call
      const mx = e.nativeEvent.offsetX;
      const my = e.nativeEvent.offsetY;

      // Update cursor light position
      const wrap = titleWrapRef.current;
      if (wrap) {
        wrap.style.setProperty("--cursor-x", mx + "px");
        wrap.style.setProperty("--cursor-y", my + "px");
        if (!wrap.classList.contains("cursor-active")) {
          wrap.classList.add("cursor-active");
        }
      }

      const count = rects.length / 2;
      for (let i = 0; i < count; i++) {
        const cx = rects[i * 2];
        const cy = rects[i * 2 + 1];
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 250) {
          // Gaussian falloff
          const t = Math.exp(-(dist * dist) / (2 * 140 * 140));
          const pull = t * t;

          // Max ~7px displacement, scale up to 1.15
          qts[i].x(dx * pull * 0.03);
          qts[i].y(dy * pull * 0.02);
          qts[i].scale(1 + t * 0.15);

          // Per-char glow via CSS variable
          glows[i](t);
        } else {
          qts[i].x(0);
          qts[i].y(0);
          qts[i].scale(1);
          glows[i](0);
        }
      }
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    const qts = quickTosRef.current;
    const glows = glowSettersRef.current;
    for (let i = 0; i < qts.length; i++) {
      qts[i].x(0);
      qts[i].y(0);
      qts[i].scale(1);
      glows[i](0);
    }
    titleWrapRef.current?.classList.remove("cursor-active");
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden"
    >
      {/* Background orbs */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(500px,80vw)] h-[min(700px,80vh)] rounded-full bg-[radial-gradient(ellipse,rgba(125,211,252,0.07),rgba(196,181,253,0.04),transparent)] blur-[80px]"
          style={{ animation: "hero-orb-drift 20s ease-in-out infinite" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(300px,60vw)] h-[min(400px,60vh)] rounded-full bg-[radial-gradient(ellipse,rgba(196,181,253,0.05),rgba(240,171,252,0.025),transparent)] blur-[60px]"
          style={{
            animation: "hero-orb-drift 20s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Decorative moon */}
      <DecorativeMoon />

      {/* Content */}
      <Container className="relative z-10">
        <div ref={containerRef}>
          {/* Subtitle */}
          <div className="flex items-center gap-3 mb-10 md:mb-14">
            <div
              ref={subtitleLineRef}
              className="w-8 h-px origin-left"
              style={{
                background:
                  "linear-gradient(90deg, rgba(125,211,252,0.5), rgba(125,211,252,0.15))",
                opacity: 0,
              }}
            />
            <span
              ref={subtitleTextRef}
              className="font-mono text-[11px] tracking-[0.25em] uppercase text-slate-400"
              style={{ opacity: 0 }}
            >
              {t("subtitle")}
              <span ref={cursorSpanRef} className="inline-block ml-1 text-accent-sky/60" style={{ opacity: 0 }}>
                |
              </span>
            </span>
          </div>

          {/* Title — single h1, text-shadow glow, per-char shimmer wave */}
          <div
            ref={titleWrapRef}
            className="hero-title-wrap relative mb-10 md:mb-14"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Main text — SplitText target, text-shadow provides ALL glow */}
            <h1
              ref={titleRef}
              className="font-display font-light uppercase hero-title"
              style={TITLE_STYLE}
            >
              <span ref={line1Ref} className="block">
                {t("title_line1")}
              </span>
              <span ref={line2Ref} className="block">
                {t("title_line2")}
              </span>
            </h1>

            {/* Big Bang flash — burst at beam origin */}
            <div
              ref={flashRef}
              className="hero-flash"
              aria-hidden="true"
            />
            {/* Light beam — sweeps left→right to ignite characters */}
            <div
              ref={beamRef}
              className="hero-beam"
              aria-hidden="true"
            />
          </div>

          {/* Accent line */}
          <div
            ref={accentLineRef}
            className="w-[40%] max-w-[320px] h-px mb-10 md:mb-14 origin-left hero-line-glow"
            style={{ opacity: 0 }}
          />

          {/* Description */}
          <p
            ref={descRef}
            className="text-base sm:text-lg text-slate-500 max-w-lg mb-10"
            style={{ opacity: 0 }}
          >
            {t("description")}
          </p>

          {/* CTA buttons */}
          <div
            ref={ctaRef}
            className="flex flex-col sm:flex-row gap-4"
            style={{ opacity: 0 }}
          >
            <Link href="#contact" className={glowButtonClass({ size: "lg" })}>
              {t("cta_primary")}
              <ArrowRight size={18} />
            </Link>
            <Link
              href="#cases"
              className={glowButtonClass({ variant: "secondary", size: "lg" })}
            >
              {t("cta_secondary")}
            </Link>
          </div>
        </div>
      </Container>

      {/* Scroll chevron — GSAP entrance + ScrollTrigger fade */}
      <div
        ref={chevronRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500"
        style={{ opacity: 0 }}
      >
        <ChevronDown
          size={28}
          style={{ animation: "chevron-bounce 2s ease-in-out infinite" }}
        />
      </div>
    </section>
  );
}
