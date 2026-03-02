import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getBlogPosts, getBlogPostBySlug } from "@/lib/content";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { mdxComponents } from "@/components/blog/MdxComponents";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { routing } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    const posts = getBlogPosts(locale);
    for (const post of posts) {
      params.push({ locale, slug: post.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const post = getBlogPostBySlug(locale, slug);
  if (!post) return {};
  return {
    title: post.frontmatter.title,
    description: post.frontmatter.description,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "blog" });
  const post = getBlogPostBySlug(locale, slug);

  if (!post) notFound();

  return (
    <section className="py-20 md:py-32">
      <Container className="max-w-3xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          {t("back")}
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
            <span>{post.frontmatter.date}</span>
            {post.frontmatter.readTime && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {post.frontmatter.readTime} {t("min_read")}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {post.frontmatter.tags.map((tag) => (
              <Badge key={tag} variant="violet">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <article className="prose prose-invert max-w-none">
          <MDXRemote
            source={post.content}
            components={mdxComponents}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
          />
        </article>
      </Container>
    </section>
  );
}
