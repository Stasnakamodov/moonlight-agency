"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Moon } from "lucide-react";
import { navigation } from "@/data/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { cn } from "@/lib/utils";

export function Header() {
  const t = useTranslations("nav");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0e1a]/80 backdrop-blur-lg">
      <div className="mx-auto max-w-[1440px] px-6 sm:px-8 lg:px-12">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Moon className="h-6 w-6 text-sky-400 transition-transform group-hover:rotate-12" />
            <span className="text-lg font-bold gradient-text">{t("brand")}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => (
              <Link
                key={item.translationKey}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                {t(item.translationKey)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <LanguageSwitcher />
            </div>
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
