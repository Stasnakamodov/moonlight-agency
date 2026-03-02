"use client";

import { useTranslations } from "next-intl";
import { Calculator, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { glowButtonClass } from "@/components/ui/GlowButton";
import { AnimatedReveal } from "@/components/ui/AnimatedReveal";

export function CalculatorCTA() {
  const t = useTranslations("calculator");

  return (
    <section className="py-12 md:py-20">
      <Container>
        <AnimatedReveal>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-violet-500/10 via-transparent to-sky-500/10 p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-500/20 border border-violet-500/30">
                  <Calculator className="h-7 w-7 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{t("cta_title")}</h2>
                  <p className="text-slate-400 mt-1">{t("cta_description")}</p>
                </div>
              </div>
              <Link href="/calculator" className={glowButtonClass({ size: "lg" })}>
                {t("cta_button")}
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </AnimatedReveal>
      </Container>
    </section>
  );
}
