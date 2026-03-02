import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { ContentItem, CaseFrontmatter, BlogFrontmatter } from "@/types/content";

const contentDir = path.join(process.cwd(), "content");

function getContentItems<T>(type: "blog" | "cases", locale: string): ContentItem<T>[] {
  const dir = path.join(contentDir, type, locale);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));

  return files
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data, content } = matter(raw);
      return { slug, frontmatter: data as T, content };
    })
    .sort((a, b) => {
      const dateA = (a.frontmatter as Record<string, string>).date || "";
      const dateB = (b.frontmatter as Record<string, string>).date || "";
      return dateB.localeCompare(dateA);
    });
}

export function getCases(locale: string) {
  return getContentItems<CaseFrontmatter>("cases", locale);
}

export function getCaseBySlug(locale: string, slug: string) {
  const cases = getCases(locale);
  return cases.find((c) => c.slug === slug) || null;
}

export function getBlogPosts(locale: string) {
  return getContentItems<BlogFrontmatter>("blog", locale);
}

export function getBlogPostBySlug(locale: string, slug: string) {
  const posts = getBlogPosts(locale);
  return posts.find((p) => p.slug === slug) || null;
}

export function getFeaturedCases(locale: string, limit = 3) {
  const cases = getCases(locale);
  const featured = cases.filter((c) => c.frontmatter.featured);
  return featured.length > 0 ? featured.slice(0, limit) : cases.slice(0, limit);
}

export function getLatestPosts(locale: string, limit = 3) {
  return getBlogPosts(locale).slice(0, limit);
}
