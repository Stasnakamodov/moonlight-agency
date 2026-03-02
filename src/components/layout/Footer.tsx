"use client";

import { useTranslations } from "next-intl";
import { Moon, Github, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { navigation } from "@/data/navigation";

export function Footer() {
  const t = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/5 bg-[#0a0e1a]">
      <Container className="py-10 md:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Moon className="h-5 w-5 text-sky-400" />
              <span className="text-lg font-bold gradient-text">{t("footer.brand")}</span>
            </div>
            <p className="text-sm text-slate-400 max-w-xs">
              {t("footer.description")}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">
              {t("footer.navigation")}
            </h3>
            <nav className="flex flex-col gap-2">
              {navigation.slice(0, 5).map((item) => (
                <Link
                  key={item.translationKey}
                  href={item.href}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {t(`nav.${item.translationKey}`)}
                </Link>
              ))}
            </nav>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">
              {t("footer.social")}
            </h3>
            <div className="flex gap-3">
              <a
                href="https://t.me/moonlight_agency"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-sky-400 hover:border-sky-400/30 transition-all"
              >
                <Send size={18} />
              </a>
              <a
                href="https://github.com/moonlight-agency"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/30 transition-all"
              >
                <Github size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 text-center text-sm text-slate-500" suppressHydrationWarning>
          © {year} {t("footer.brand")}. {t("footer.rights")}.
        </div>
      </Container>
    </footer>
  );
}
