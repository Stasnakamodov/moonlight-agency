"use client";

import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { glowButtonClass } from "@/components/ui/GlowButton";
import { AnimatedReveal } from "@/components/ui/AnimatedReveal";

export function TelegramSection() {
  const t = useTranslations("telegram");

  return (
    <section className="py-12 md:py-20">
      <Container>
        <AnimatedReveal>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/10 via-transparent to-violet-500/10 p-8 md:p-12 text-center">
            <div className="relative z-10">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/20 border border-sky-500/30">
                <Send className="h-8 w-8 text-sky-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">{t("title")}</h2>
              <p className="text-slate-400 max-w-lg mx-auto mb-8">{t("description")}</p>
              <a href="https://t.me/moonlight_agency" target="_blank" rel="noopener noreferrer" className={glowButtonClass({ size: "lg" })}>
                <Send size={18} />
                {t("cta_button")}
              </a>
            </div>
          </div>
        </AnimatedReveal>
      </Container>
    </section>
  );
}
