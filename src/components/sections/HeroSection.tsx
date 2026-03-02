"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { glowButtonClass } from "@/components/ui/GlowButton";

/* ---- Digital decode text effect ---- */

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&<>{}[]";

function useScrambleText(text: string, startDelay = 600) {
  const [displayed, setDisplayed] = useState(text);

  useEffect(() => {
    const letters = text.split("");
    let revealedCount = 0;
    let scrambleId: ReturnType<typeof setInterval>;
    let revealId: ReturnType<typeof setInterval>;

    setDisplayed(
      letters
        .map((c) =>
          c === " "
            ? " "
            : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
        )
        .join("")
    );

    const timer = setTimeout(() => {
      scrambleId = setInterval(() => {
        setDisplayed(
          letters
            .map((c, i) => {
              if (c === " ") return " ";
              if (i < revealedCount) return c;
              return SCRAMBLE_CHARS[
                Math.floor(Math.random() * SCRAMBLE_CHARS.length)
              ];
            })
            .join("")
        );
      }, 35);

      revealId = setInterval(() => {
        revealedCount++;
        if (revealedCount >= letters.length) {
          clearInterval(scrambleId);
          clearInterval(revealId);
          setDisplayed(text);
        }
      }, 70);
    }, startDelay);

    return () => {
      clearTimeout(timer);
      clearInterval(scrambleId);
      clearInterval(revealId);
    };
  }, [text, startDelay]);

  return displayed;
}

/* ---- Decorative moon (CSS-only, positioned inside Hero) ---- */

function DecorativeMoon() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 2, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="absolute z-[5] pointer-events-none right-[6%] top-1/2 -translate-y-[55%] w-[320px] h-[320px] lg:w-[380px] lg:h-[380px] max-md:w-[180px] max-md:h-[180px] max-md:right-[-40px] max-md:top-[8%] max-md:translate-y-0"
      aria-hidden="true"
    >
      {/* Outer glow — large diffuse halo */}
      <div
        className="absolute inset-[-60%] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(125,211,252,0.22) 0%, rgba(196,181,253,0.12) 30%, rgba(125,211,252,0.04) 50%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      {/* Mid glow — tighter, brighter */}
      <div
        className="absolute inset-[-30%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 58% 45%, rgba(125,211,252,0.16) 0%, rgba(196,181,253,0.08) 40%, transparent 70%)",
          filter: "blur(35px)",
        }}
      />
      {/* Inner glow — warm corona hugging the sphere */}
      <div
        className="absolute inset-[-8%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 60% 45%, rgba(200,195,185,0.12) 0%, rgba(125,211,252,0.06) 50%, transparent 75%)",
          filter: "blur(12px)",
        }}
      />

      {/* Moon body — slow vertical float */}
      <motion.div
        animate={{ y: [0, -6, 0], rotate: [0, 0.3, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
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
        {/* Maria — dark lunar seas (larger, more contrast) */}
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

        {/* Craters — dark center + bright ejecta rim */}
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

        {/* Terminator gradient — deep shadow on the left edge */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "linear-gradient(105deg, rgba(8,6,4,0.7) 0%, rgba(8,6,4,0.4) 15%, rgba(8,6,4,0.12) 30%, transparent 50%)",
          }}
        />

        {/* Warm/cool surface zones — color variation */}
        <div
          className="absolute inset-0 rounded-full opacity-25"
          style={{
            background: `
              radial-gradient(ellipse 40% 30% at 55% 35%, rgba(180,160,130,0.3) 0%, transparent 100%),
              radial-gradient(ellipse 30% 25% at 35% 55%, rgba(130,140,160,0.2) 0%, transparent 100%),
              radial-gradient(ellipse 25% 20% at 65% 60%, rgba(160,150,135,0.15) 0%, transparent 100%)`,
          }}
        />

        {/* Rim light — bright right/bottom edge */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              linear-gradient(115deg, transparent 45%, rgba(125,211,252,0.06) 60%, rgba(125,211,252,0.12) 72%, rgba(200,220,240,0.2) 84%, rgba(255,255,255,0.3) 94%, rgba(255,255,255,0.4) 100%)`,
          }}
        />

        {/* Highland highlights — bright spots in illuminated area */}
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

        {/* Top specular — subtle bright haze on illuminated half */}
        <div
          className="absolute inset-0 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(ellipse 50% 40% at 62% 38%, rgba(255,255,255,0.15) 0%, transparent 100%)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

/* ---- Component ---- */

export function HeroSection() {
  const t = useTranslations("hero");
  const scrambledLine1 = useScrambleText(t("title_line1"), 500);
  const scrambledLine2 = useScrambleText(t("title_line2"), 900);

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const chevronOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative py-16 md:py-24 overflow-hidden"
    >
      {/* Background orbs */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(500px,80vw)] h-[min(700px,80vh)] rounded-full bg-[radial-gradient(ellipse,rgba(125,211,252,0.15),rgba(196,181,253,0.08),transparent)] blur-[80px]"
          style={{ animation: "hero-orb-drift 20s ease-in-out infinite" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(300px,60vw)] h-[min(400px,60vh)] rounded-full bg-[radial-gradient(ellipse,rgba(196,181,253,0.12),rgba(240,171,252,0.06),transparent)] blur-[60px]"
          style={{ animation: "hero-orb-drift 20s ease-in-out infinite reverse" }}
        />
      </div>

      {/* Decorative moon */}
      <DecorativeMoon />

      {/* Content */}
      <Container className="relative z-10">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 backdrop-blur-sm mb-8"
        >
          ✦ {t("subtitle")}
        </motion.div>

        {/* Giant title */}
        <div className="mb-8">
          <h1
            className="font-sans font-extralight uppercase"
            style={{
              fontSize: "clamp(3rem, 10vw, 12rem)",
              lineHeight: 0.9,
              letterSpacing: "-0.02em",
            }}
          >
            <span className="gradient-text block">{scrambledLine1}</span>
            <span className="gradient-text block">{scrambledLine2}</span>
          </h1>
          <span className="sr-only">{t("title")}</span>
        </div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-lg sm:text-xl text-slate-400 max-w-lg mb-8"
        >
          {t("description")}
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link href="#contact" className={glowButtonClass({ size: "lg" })}>
            {t("cta_primary")}
            <ArrowRight size={18} />
          </Link>
          <Link href="#cases" className={glowButtonClass({ variant: "secondary", size: "lg" })}>
            {t("cta_secondary")}
          </Link>
        </motion.div>
      </Container>

      {/* Scroll chevron */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.5 }}
        style={{ opacity: chevronOpacity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500"
      >
        <ChevronDown
          size={28}
          style={{ animation: "chevron-bounce 2s ease-in-out infinite" }}
        />
      </motion.div>
    </section>
  );
}
