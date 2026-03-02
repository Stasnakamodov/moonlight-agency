import { Bot, Building2, Eye, Sparkles } from "lucide-react";
import type { Service } from "@/types/services";

export const services: Service[] = [
  {
    id: "telegram",
    icon: Bot,
    translationKey: "telegram",
  },
  {
    id: "b2b",
    icon: Building2,
    translationKey: "b2b",
  },
  {
    id: "visual",
    icon: Eye,
    translationKey: "visual",
  },
  {
    id: "ai",
    icon: Sparkles,
    translationKey: "ai",
  },
];
