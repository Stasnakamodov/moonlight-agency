import { setRequestLocale, getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CalculatorForm } from "@/components/calculator/CalculatorForm";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "calculator" });
  return { title: t("title") };
}

export default async function CalculatorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "calculator" });

  return (
    <section className="py-20 md:py-32">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <CalculatorForm />
      </Container>
    </section>
  );
}
