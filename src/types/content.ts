export interface CaseFrontmatter {
  title: string;
  description: string;
  date: string;
  tags: string[];
  image?: string;
  metrics?: {
    label: string;
    value: string;
  }[];
  featured?: boolean;
}

export interface BlogFrontmatter {
  title: string;
  description: string;
  date: string;
  tags: string[];
  image?: string;
  readTime?: number;
}

export interface ContentItem<T> {
  slug: string;
  frontmatter: T;
  content: string;
}
