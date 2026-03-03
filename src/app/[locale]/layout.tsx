import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Inter, JetBrains_Mono, Cormorant_Garamond } from "next/font/google";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StarField } from "@/components/effects/StarField";
import { MoonGlow } from "@/components/effects/MoonGlow";
import { GradientOrb } from "@/components/effects/GradientOrb";
import { DustLanes } from "@/components/effects/DustLanes";
import { Vignette } from "@/components/effects/Vignette";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["300"],
  variable: "--font-cormorant",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${jetbrainsMono.variable} ${cormorantGaramond.variable}`}>
      <body className="min-h-screen bg-bg-deep text-text-primary font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <div className="relative w-full">
            <StarField />
            <DustLanes />
            <MoonGlow />
            <GradientOrb />
            <Vignette />
            <Header />
            <main className="relative z-10 pt-16">{children}</main>
            <Footer />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
