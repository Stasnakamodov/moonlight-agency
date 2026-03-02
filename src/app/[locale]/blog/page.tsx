import { setRequestLocale, getTranslations } from "next-intl/server";
import { getBlogPosts } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import { Clock } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  return { title: t("title") };
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "blog" });
  const posts = getBlogPosts(locale);

  return (
    <section className="py-20 md:py-32">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <GlassCard className="h-full group cursor-pointer">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <span>{post.frontmatter.date}</span>
                  {post.frontmatter.readTime && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {post.frontmatter.readTime} {t("min_read")}
                      </span>
                    </>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white group-hover:text-sky-300 transition-colors mb-2">
                  {post.frontmatter.title}
                </h3>
                <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                  {post.frontmatter.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {post.frontmatter.tags.map((tag) => (
                    <Badge key={tag} variant="violet">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
