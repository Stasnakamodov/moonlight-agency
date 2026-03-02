import type { MetadataRoute } from "next";
import { getCases } from "@/lib/content";
import { getBlogPosts } from "@/lib/content";

const BASE_URL = "https://moonlight.agency";

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ["ru", "en"];
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    entries.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    });

    entries.push({
      url: `${BASE_URL}/${locale}/cases`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });

    entries.push({
      url: `${BASE_URL}/${locale}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });

    entries.push({
      url: `${BASE_URL}/${locale}/calculator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    });

    const cases = getCases(locale);
    for (const c of cases) {
      entries.push({
        url: `${BASE_URL}/${locale}/cases/${c.slug}`,
        lastModified: new Date(c.frontmatter.date),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    const posts = getBlogPosts(locale);
    for (const post of posts) {
      entries.push({
        url: `${BASE_URL}/${locale}/blog/${post.slug}`,
        lastModified: new Date(post.frontmatter.date),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
