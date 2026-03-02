export interface TechItem {
  name: string;
  category: string;
}

export const techStack: TechItem[] = [
  { name: "Next.js", category: "frontend" },
  { name: "React", category: "frontend" },
  { name: "TypeScript", category: "frontend" },
  { name: "Tailwind CSS", category: "frontend" },
  { name: "React Flow", category: "frontend" },
  { name: "Node.js", category: "backend" },
  { name: "Python", category: "backend" },
  { name: "PostgreSQL", category: "backend" },
  { name: "Supabase", category: "backend" },
  { name: "Redis", category: "backend" },
  { name: "Telegram Bot API", category: "integrations" },
  { name: "OpenAI API", category: "integrations" },
  { name: "Stripe", category: "integrations" },
  { name: "Vercel", category: "devops" },
  { name: "Docker", category: "devops" },
  { name: "GitHub Actions", category: "devops" },
];
