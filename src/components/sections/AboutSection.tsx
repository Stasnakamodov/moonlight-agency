"use client";

import { useTranslations, useLocale } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedReveal } from "@/components/ui/AnimatedReveal";
import { Badge } from "@/components/ui/Badge";
import { team } from "@/data/team";
import { techStack } from "@/data/techStack";
import { Users, Lightbulb, Code2 } from "lucide-react";

export function AboutSection() {
  const t = useTranslations("about");
  const locale = useLocale() as "ru" | "en";

  return (
    <section id="about" className="py-12 md:py-20 section-separator">
      <Container>
        <AnimatedReveal>
          <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        </AnimatedReveal>

        {/* Approach */}
        <AnimatedReveal delay={0.1}>
          <GlassCard className="mb-12">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-white/10">
                <Lightbulb className="h-6 w-6 text-sky-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">{t("approach_title")}</h3>
                <p className="text-slate-400">{t("approach_description")}</p>
              </div>
            </div>
          </GlassCard>
        </AnimatedReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Team */}
          <AnimatedReveal delay={0.2}>
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Users className="h-5 w-5 text-violet-400" />
                <h3 className="text-lg font-semibold text-white">{t("team_title")}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {team.map((member) => (
                  <GlassCard key={member.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-500/30 to-violet-500/30 flex items-center justify-center text-sm font-bold text-white">
                        {member.name[locale].charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{member.name[locale]}</p>
                        <p className="text-xs text-slate-400">{member.role[locale]}</p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          </AnimatedReveal>

          {/* Tech Stack */}
          <AnimatedReveal delay={0.3}>
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Code2 className="h-5 w-5 text-sky-400" />
                <h3 className="text-lg font-semibold text-white">{t("tech_title")}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {techStack.map((tech) => (
                  <Badge
                    key={tech.name}
                    variant={tech.category === "frontend" ? "sky" : tech.category === "backend" ? "violet" : "default"}
                  >
                    {tech.name}
                  </Badge>
                ))}
              </div>
            </div>
          </AnimatedReveal>
        </div>
      </Container>
    </section>
  );
}
