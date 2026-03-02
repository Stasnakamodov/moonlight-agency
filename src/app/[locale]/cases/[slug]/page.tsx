import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getCases, getCaseBySlug } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { mdxComponents } from "@/components/blog/MdxComponents";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    const cases = getCases(locale);
    for (const c of cases) {
      params.push({ locale, slug: c.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const caseItem = getCaseBySlug(locale, slug);
  if (!caseItem) return {};
  return {
    title: caseItem.frontmatter.title,
    description: caseItem.frontmatter.description,
  };
}

export default async function CaseDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "cases" });
  const caseItem = getCaseBySlug(locale, slug);

  if (!caseItem) notFound();

  return (
    <section className="py-20 md:py-32">
      <Container className="max-w-3xl">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          {t("back")}
        </Link>

        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {caseItem.frontmatter.tags.map((tag) => (
              <Badge key={tag} variant="sky">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-slate-500">{caseItem.frontmatter.date}</p>
        </div>

        {caseItem.frontmatter.metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            {caseItem.frontmatter.metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-center"
              >
                <p className="text-2xl font-bold text-sky-300">{metric.value}</p>
                <p className="text-xs text-slate-400 mt-1">{metric.label}</p>
              </div>
            ))}
          </div>
        )}

        <article className="prose prose-invert max-w-none">
          <MDXRemote
            source={caseItem.content}
            components={mdxComponents}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
          />
        </article>
      </Container>
    </section>
  );
}
