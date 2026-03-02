"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { AnimatedReveal } from "@/components/ui/AnimatedReveal";
import { services } from "@/data/services";

export function ServicesSection() {
  const t = useTranslations("services");

  return (
    <section id="services" className="py-12 md:py-20 section-separator">
      <Container>
        <AnimatedReveal>
          <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        </AnimatedReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            const features = t.raw(
              `${service.translationKey}.features`
            ) as string[];

            return (
              <AnimatedReveal key={service.id} delay={index * 0.1}>
                <GlassCard className="p-6 md:p-8 h-full">
                  <div className="flex items-start gap-4 md:gap-6">
                    <div className="flex h-14 w-14 md:h-16 md:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-white/10">
                      <Icon className="h-7 w-7 md:h-8 md:w-8 text-sky-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl md:text-2xl font-semibold text-white mb-2 md:mb-3">
                        {t(`${service.translationKey}.title`)}
                      </h3>
                      <p className="text-slate-400 text-sm md:text-base mb-4 md:mb-5 leading-relaxed">
                        {t(`${service.translationKey}.description`)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {features.map((feature) => (
                          <Badge key={feature} variant="sky">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </AnimatedReveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
