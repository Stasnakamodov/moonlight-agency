"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { glowButtonClass } from "@/components/ui/GlowButton";
import { AnimatedReveal } from "@/components/ui/AnimatedReveal";
import type { CaseFrontmatter } from "@/types/content";

interface CasesSectionProps {
  cases: { slug: string; frontmatter: CaseFrontmatter }[];
}

export function CasesSection({ cases }: CasesSectionProps) {
  const t = useTranslations("cases");

  return (
    <section id="cases" className="py-12 md:py-20 section-separator">
      <Container>
        <AnimatedReveal>
          <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        </AnimatedReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {cases.map((item, index) => (
            <AnimatedReveal key={item.slug} delay={index * 0.1}>
              <Link href={`/cases/${item.slug}`}>
                <GlassCard className="h-full group cursor-pointer">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white group-hover:text-sky-300 transition-colors mb-2">
                      {item.frontmatter.title}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-2">
                      {item.frontmatter.description}
                    </p>
                  </div>

                  {item.frontmatter.metrics && (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {item.frontmatter.metrics.slice(0, 2).map((metric) => (
                        <div key={metric.label} className="rounded-lg bg-white/5 p-2 text-center">
                          <p className="text-lg font-bold text-sky-300">{metric.value}</p>
                          <p className="text-xs text-slate-400">{metric.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {item.frontmatter.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-1 text-sm text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {t("view_case")} <ArrowRight size={14} />
                  </div>
                </GlassCard>
              </Link>
            </AnimatedReveal>
          ))}
        </div>

        <div className="text-center">
          <Link href="/cases" className={glowButtonClass({ variant: "secondary" })}>
            {t("view_all")} <ArrowRight size={16} />
          </Link>
        </div>
      </Container>
    </section>
  );
}
