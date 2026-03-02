import { setRequestLocale } from "next-intl/server";
import { HeroSection } from "@/components/sections/HeroSection";
import { ServicesSection } from "@/components/sections/ServicesSection";
import { CasesSection } from "@/components/sections/CasesSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { DemoSection } from "@/components/sections/DemoSection";
import { BlogSection } from "@/components/sections/BlogSection";
import { CalculatorCTA } from "@/components/sections/CalculatorCTA";
import { TelegramSection } from "@/components/sections/TelegramSection";
import { ContactSection } from "@/components/sections/ContactSection";
import { getFeaturedCases } from "@/lib/content";
import { getLatestPosts } from "@/lib/content";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cases = getFeaturedCases(locale);
  const posts = getLatestPosts(locale);

  return (
    <>
      <HeroSection />
      <ServicesSection />
      <CasesSection cases={cases} />
      <AboutSection />
      <DemoSection />
      <BlogSection posts={posts} />
      <CalculatorCTA />
      <TelegramSection />
      <ContactSection />
    </>
  );
}
