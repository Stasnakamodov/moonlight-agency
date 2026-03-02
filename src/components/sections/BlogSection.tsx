"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { glowButtonClass } from "@/components/ui/GlowButton";
import { AnimatedReveal } from "@/components/ui/AnimatedReveal";
import type { BlogFrontmatter } from "@/types/content";

interface BlogSectionProps {
  posts: { slug: string; frontmatter: BlogFrontmatter }[];
}

export function BlogSection({ posts }: BlogSectionProps) {
  const t = useTranslations("blog");

  return (
    <section id="blog" className="py-12 md:py-20 section-separator">
      <Container>
        <AnimatedReveal>
          <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        </AnimatedReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {posts.map((post, index) => (
            <AnimatedReveal key={post.slug} delay={index * 0.1}>
              <Link href={`/blog/${post.slug}`}>
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
                      <Badge key={tag} variant="violet">{tag}</Badge>
                    ))}
                  </div>
                </GlassCard>
              </Link>
            </AnimatedReveal>
          ))}
        </div>

        <div className="text-center">
          <Link href="/blog" className={glowButtonClass({ variant: "secondary" })}>
            {t("view_all")} <ArrowRight size={16} />
          </Link>
        </div>
      </Container>
    </section>
  );
}
