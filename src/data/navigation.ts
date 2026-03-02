export interface NavItem {
  translationKey: string;
  href: string;
}

export const navigation: NavItem[] = [
  { translationKey: "services", href: "#services" },
  { translationKey: "cases", href: "#cases" },
  { translationKey: "about", href: "#about" },
  { translationKey: "blog", href: "#blog" },
  { translationKey: "calculator", href: "/calculator" },
  { translationKey: "contact", href: "#contact" },
];
