"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { navigation } from "@/data/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { cn } from "@/lib/utils";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("nav");

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div
        className={cn(
          "fixed inset-x-0 top-16 z-50 border-b border-white/10 bg-[#0a0e1a]/95 backdrop-blur-lg transition-all duration-300",
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-4">
          {navigation.map((item) => (
            <Link
              key={item.translationKey}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-4 py-3 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              {t(item.translationKey)}
            </Link>
          ))}
          <div className="mt-3 pt-3 border-t border-white/10 flex justify-center">
            <LanguageSwitcher />
          </div>
        </nav>
      </div>
    </div>
  );
}
