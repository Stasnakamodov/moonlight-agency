"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedReveal } from "@/components/ui/AnimatedReveal";

const ArchitectureDemo = dynamic(
  () => import("@/components/demo/ArchitectureDemo").then((mod) => mod.ArchitectureDemo),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] rounded-2xl border border-white/10 bg-white/5 animate-pulse flex items-center justify-center text-slate-500">
        Loading demo...
      </div>
    ),
  }
);

export function DemoSection() {
  const t = useTranslations("demo");

  return (
    <section id="demo" className="py-12 md:py-20 section-separator">
      <Container>
        <AnimatedReveal>
          <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        </AnimatedReveal>

        <AnimatedReveal delay={0.2}>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <ArchitectureDemo />
          </div>
        </AnimatedReveal>
      </Container>
    </section>
  );
}
