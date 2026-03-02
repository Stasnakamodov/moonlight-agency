import { setRequestLocale, getTranslations } from "next-intl/server";
import { getCases } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cases" });
  return { title: t("title") };
}

export default async function CasesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "cases" });
  const cases = getCases(locale);

  return (
    <section className="py-20 md:py-32">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((item) => (
            <Link key={item.slug} href={`/cases/${item.slug}`}>
              <GlassCard className="h-full group cursor-pointer">
                <h3 className="text-lg font-semibold text-white group-hover:text-sky-300 transition-colors mb-2">
                  {item.frontmatter.title}
                </h3>
                <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                  {item.frontmatter.description}
                </p>

                {item.frontmatter.metrics && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {item.frontmatter.metrics.slice(0, 2).map((metric) => (
                      <div key={metric.label} className="rounded-lg bg-white/5 p-2 text-center">
                        <p className="text-lg font-bold text-sky-300">{metric.value}</p>
                        <p className="text-xs text-slate-400">{metric.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {item.frontmatter.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-sm text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {t("view_case")} <ArrowRight size={14} />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
