export interface TeamMember {
  id: string;
  name: { ru: string; en: string };
  role: { ru: string; en: string };
  image?: string;
}

export const team: TeamMember[] = [
  {
    id: "stas",
    name: { ru: "Стас Накамодов", en: "Stas Nakamotov" },
    role: { ru: "Основатель & Lead Developer", en: "Founder & Lead Developer" },
  },
  {
    id: "dev1",
    name: { ru: "Алексей Волков", en: "Alexey Volkov" },
    role: { ru: "Full-Stack разработчик", en: "Full-Stack Developer" },
  },
  {
    id: "dev2",
    name: { ru: "Мария Светлова", en: "Maria Svetlova" },
    role: { ru: "UI/UX дизайнер", en: "UI/UX Designer" },
  },
  {
    id: "dev3",
    name: { ru: "Дмитрий Лунин", en: "Dmitry Lunin" },
    role: { ru: "AI/ML инженер", en: "AI/ML Engineer" },
  },
];
