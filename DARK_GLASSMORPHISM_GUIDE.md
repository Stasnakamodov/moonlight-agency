# Dark Glassmorphism — Design System Guide for "Лунный Свет"

> Практическое руководство по применению dark glassmorphism эстетики.
> Адаптировано под стек проекта: Next.js 16, React 19, Tailwind CSS v4, Framer Motion 12.

---

## 1. Философия дизайна

Dark Glassmorphism — имитация матового стекла поверх тёмных фонов с ambient-градиентами. Суть: полупрозрачные панели размывают то, что за ними, создавая ощущение глубины и премиальности.

### Три слоя визуальной глубины

```
┌─────────────────────────────────────────┐
│  Слой 3: Контент (текст, иконки)       │  z-20  opacity: 1
│  ─────────────────────────────────────  │
│  Слой 2: Стекло (glass-панели)         │  z-10  backdrop-blur + rgba bg
│  ─────────────────────────────────────  │
│  Слой 1: Фон (орбы, звёзды, glow)     │  z-0   анимированные градиенты
└─────────────────────────────────────────┘
```

Пользователь интуитивно понимает: чем ближе элемент — тем он "стекляннее" и ярче. Модалки, карточки — ближе. Фон — дальше.

---

## 2. Палитра проекта

### Основные цвета (уже в `globals.css`)

| Токен | Значение | Роль |
|-------|----------|------|
| `--color-bg-deep` | `#0a0e1a` | Глубокий фон страницы |
| `--color-bg-card` | `rgba(255, 255, 255, 0.07)` | Фон стеклянных карточек |
| `--color-border-glass` | `rgba(255, 255, 255, 0.1)` | Базовый бордер стекла |
| `--color-accent-sky` | `#7dd3fc` | Основной акцент (sky) |
| `--color-accent-violet` | `#c4b5fd` | Вторичный акцент (violet) |
| `--color-accent-sky-dim` | `rgba(125, 211, 252, 0.3)` | Приглушённый sky |
| `--color-accent-violet-dim` | `rgba(196, 181, 253, 0.3)` | Приглушённый violet |

### Расширенная палитра для glassmorphism

| Элемент | Значение | Когда использовать |
|---------|----------|--------------------|
| Glass BG (стандарт) | `rgba(255, 255, 255, 0.07)` | Карточки, панели |
| Glass BG (hover) | `rgba(255, 255, 255, 0.10)` | Ховер-состояние |
| Glass BG (активный) | `rgba(255, 255, 255, 0.12)` | Активная вкладка, фокус |
| Glass BG (модалка) | `rgba(255, 255, 255, 0.08)` | Модальные окна |
| Бордер (default) | `rgba(255, 255, 255, 0.10)` | Стандартное состояние |
| Бордер (hover) | `rgba(255, 255, 255, 0.20)` | При наведении |
| Бордер (focus) | `rgba(125, 211, 252, 0.40)` | Фокус инпута / кнопки |
| Highlight (top) | `rgba(255, 255, 255, 0.05)` | Inset shadow сверху |
| Shadow (glow) | `rgba(125, 211, 252, 0.08)` | Подсветка sky при ховере |
| Pink endpoint | `#f0abfc` | Конец градиента |

### Ambient-градиенты (орбы позади стекла)

Именно они "подсвечивают" стекло изнутри:

| Орб | Цвет | Opacity | Blur | Размер |
|-----|-------|---------|------|--------|
| Sky | `rgba(125, 211, 252, 0.15)` | 0.4 | 80px | 400px |
| Violet | `rgba(196, 181, 253, 0.10)` | 0.4 | 80px | 400px |
| Pink | `rgba(244, 114, 182, 0.08)` | 0.4 | 80px | 400px |
| Moon (главный) | sky→violet radial | 0.7–1.0 | 60px | 600px |

---

## 3. CSS-рецепты

### 3.1 Базовая стеклянная карточка

Уже реализовано в `GlassCard.tsx`:

```css
/* В проекте используются Tailwind-классы: */
/* rounded-2xl border border-white/10 bg-white/[0.07] backdrop-blur-xl p-6 */
/* shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] */

/* Эквивалент в чистом CSS: */
.glass-card {
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.10);
  border-color: rgba(255, 255, 255, 0.20);
  box-shadow:
    inset 0 1px 0 0 rgba(255, 255, 255, 0.05),
    0 8px 32px -8px rgba(125, 211, 252, 0.08);
}
```

### 3.2 Продвинутое стекло с alpha-градиентом

Секрет "премиального" ощущения — фон карточки не однородный, а с градиентом, имитирующим свет сверху-слева:

```css
.glass-card-premium {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.10) 0%,
    rgba(255, 255, 255, 0.05) 100%
  );
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1rem;
  box-shadow:
    inset 0 1px 0 0 rgba(255, 255, 255, 0.08),
    0 4px 24px -4px rgba(0, 0, 0, 0.3);
}
```

**Tailwind-эквивалент:**

```tsx
className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl
  backdrop-saturate-150 border border-white/12 rounded-2xl
  shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_4px_24px_-4px_rgba(0,0,0,0.3)]"
```

### 3.3 Стекло для навигации / хедера

Уже реализовано в `Header.tsx`:

```css
.glass-nav {
  background: rgba(10, 14, 26, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
```

Blur для навигации меньше (4–8px) — не перегружает GPU при скролле.

### 3.4 Стекло для модальных окон

```css
.glass-modal {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(24px) saturate(120%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 1.5rem;
  box-shadow:
    inset 0 1px 0 0 rgba(255, 255, 255, 0.06),
    0 24px 80px -12px rgba(0, 0, 0, 0.5);
}
```

### 3.5 Стеклянные инпуты (формы)

```css
.glass-input {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 0.75rem;
  color: #f1f5f9;
  transition: all 0.3s ease;
}

.glass-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(125, 211, 252, 0.40);
  box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.10);
  outline: none;
}

.glass-input::placeholder {
  color: #64748b;
}
```

---

## 4. Таблица blur по контексту

| Элемент | Blur | Причина |
|---------|------|---------|
| Навигация / хедер | `blur(4–8px)` | Лёгкий, не нагружает при скролле |
| Карточки / панели | `blur(12–16px)` | Основной эффект стекла |
| Модальные окна | `blur(20–24px)` | Максимальная изоляция от фона |
| Фоновые орбы | `filter: blur(60–80px)` | Размытые ambient-пятна |
| Moon glow | `filter: blur(40–60px)` | Мягкое лунное свечение |

---

## 5. Tailwind CSS v4 утилиты для проекта

### Готовые классы, которые уже работают

```
bg-white/[0.07]     → фон стекла
backdrop-blur-xl    → blur(24px) — основной
backdrop-blur-lg    → blur(16px) — карточки
backdrop-blur-md    → blur(12px) — навигация
backdrop-blur-sm    → blur(8px)  — лёгкое стекло
border-white/10     → бордер стекла
border-white/20     → бордер при ховере
shadow-sky-500/25   → glow-тень кнопок
```

### Рекомендуемые комбинации

**Карточка:**
```
bg-white/[0.07] backdrop-blur-lg border border-white/10 rounded-2xl
shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]
```

**Кнопка (primary):**
```
bg-gradient-to-r from-sky-500 to-violet-500
shadow-lg shadow-sky-500/25
hover:shadow-xl hover:shadow-sky-500/40
```

**Кнопка (secondary / ghost):**
```
border border-white/20 bg-white/5 backdrop-blur-sm
hover:bg-white/10 hover:border-white/30
```

**Бейдж:**
```
border border-white/10 bg-white/5 backdrop-blur-sm
rounded-full px-3 py-1 text-sm text-slate-300
```

**Tooltip / Dropdown:**
```
bg-white/10 backdrop-blur-xl border border-white/15
rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]
```

---

## 6. Анимации — Framer Motion рецепты

### 6.1 Появление секции (уже в AnimatedReveal)

```tsx
// Использование:
<AnimatedReveal delay={0.1} direction="up">
  <GlassCard>...</GlassCard>
</AnimatedReveal>
```

### 6.2 Каскадное появление карточек

```tsx
const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,  // 100ms между карточками
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

<motion.div variants={container} initial="hidden" whileInView="show">
  {cards.map((card) => (
    <motion.div key={card.id} variants={item}>
      <GlassCard>{card.content}</GlassCard>
    </motion.div>
  ))}
</motion.div>
```

### 6.3 Glow-пульсация на ховере

```tsx
<motion.div
  whileHover={{
    boxShadow: "0 0 40px rgba(125, 211, 252, 0.15)",
    borderColor: "rgba(255, 255, 255, 0.25)",
  }}
  transition={{ duration: 0.3 }}
  className="glass-card p-6"
>
  {children}
</motion.div>
```

### 6.4 Parallax фоновых орбов на скролле

```tsx
import { useScroll, useTransform, motion } from "framer-motion";

function ParallaxOrb({ speed = 0.3, color, position }) {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -200 * speed]);

  return (
    <motion.div
      style={{ y, ...position }}
      className="fixed w-[400px] h-[400px] rounded-full pointer-events-none z-0"
      aria-hidden="true"
    >
      <div
        className="w-full h-full rounded-full opacity-40"
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          filter: "blur(80px)",
        }}
      />
    </motion.div>
  );
}
```

### 6.5 Gradient text с анимацией

```tsx
<motion.h2
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, ease: "easeOut" }}
  className="text-5xl font-bold gradient-text"
>
  Наши услуги
</motion.h2>
```

### 6.6 Стеклянная кнопка с ripple-glow

```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className={glowButtonClass({ variant: "primary", size: "lg" })}
>
  Обсудить проект
  <ArrowRight size={18} />
</motion.button>
```

---

## 7. Фоновые эффекты — как создать "живой" фон

### 7.1 Архитектура фона проекта

```
<body>
  <StarField />         ← Canvas звёзды (z-0, fixed)
  <MoonGlow />          ← Лунное свечение (z-0, fixed)
  <GradientOrb />       ← 3 плавающих орба (z-0, fixed)
  <main className="relative z-10">
    ...секции...        ← Контент поверх (z-10+)
  </main>
</body>
```

### 7.2 Звёздное поле (StarField)

Уже реализовано. 4 слоя глубины:
- **Далёкие** (100 шт): size 0.3–1.1px, opacity 0.1–0.4
- **Средние** (70 шт): size 0.6–1.8px, opacity 0.2–0.6
- **Близкие** (30 шт): size 1.0–2.8px, opacity 0.3–0.8
- **Акцентные** (3 шт): size 2.0–4.0px, glow halo ×4

Мерцание: `sin(time * twinkleSpeed + offset) * 0.3 + 0.7`

### 7.3 Moon Glow

Два фиксированных круга с radial-gradient:
- Внешний: 600×600px, blur(60px), пульсация 8s
- Внутренний: 350×350px, blur(40px), обратная пульсация

### 7.4 Gradient Orbs

3 плавающих орба с `filter: blur(80px)` и анимацией `float` (15–25s).

---

## 8. Типографика

### Шрифты проекта

| Шрифт | Роль | Подмножества |
|-------|------|--------------|
| **Inter** | Основной (sans) | Latin + Cyrillic |
| **JetBrains Mono** | Моно (код, метрики) | Latin |

### Правила для dark glassmorphism

| Параметр | Значение | Причина |
|----------|----------|---------|
| Цвет основного текста | `#f1f5f9` (slate-100) | Не чисто белый — меньше strain |
| Цвет вторичного | `#94a3b8` (slate-400) | Мягкий контраст |
| Минимальный font-weight | 400 (regular) | Тонкие шрифты "исчезают" на тёмном |
| Для важного текста | 600–700 (semibold/bold) | Читаемость на стекле |
| Минимальный размер body | 16px (text-base) | WCAG рекомендация |
| Line-height | 1.6–1.75 | Увеличенный для тёмного фона |
| Gradient text | 135° white→sky→violet→pink | Только заголовки, не body |

### Контрастность (WCAG 2.1 AA)

- `#f1f5f9` на `#0a0e1a` → **16.5:1** (отлично)
- `#94a3b8` на `#0a0e1a` → **6.8:1** (хорошо)
- `#64748b` на `#0a0e1a` → **4.1:1** (минимум, только для подписей)

---

## 9. Компонентная архитектура

### Готовые компоненты проекта

| Компонент | Файл | Описание |
|-----------|------|----------|
| `GlassCard` | `ui/GlassCard.tsx` | Стеклянная карточка с hover |
| `GlowButton` | `ui/GlowButton.tsx` | Кнопка с gradient / ghost |
| `AnimatedReveal` | `ui/AnimatedReveal.tsx` | Scroll-анимация появления |
| `SectionHeading` | `ui/SectionHeading.tsx` | Заголовок с gradient-text |
| `Badge` | `ui/Badge.tsx` | Тег с вариантами sky/violet |
| `GradientBorder` | `ui/GradientBorder.tsx` | Градиентная рамка |
| `Container` | `ui/Container.tsx` | Max-width обёртка |
| `StarField` | `effects/StarField.tsx` | Canvas-звёзды |
| `MoonGlow` | `effects/MoonGlow.tsx` | Лунное свечение |
| `GradientOrb` | `effects/GradientOrb.tsx` | Плавающие орбы |

### Рекомендуемые новые компоненты

| Компонент | Описание | Приоритет |
|-----------|----------|-----------|
| `GlassModal` | Модалка с blur(24px) + overlay | Высокий |
| `GlassInput` | Инпут со sky-фокусом | Средний |
| `GlassTooltip` | Тултип с backdrop-blur | Средний |
| `GlassDropdown` | Дропдаун с blur и glow-бордером | Низкий |
| `GlassTabs` | Табы со стеклянным активным | Средний |
| `ParallaxOrb` | Орб с parallax на скролле | Низкий |
| `ShootingStar` | Анимация "падающей звезды" | Низкий |

---

## 10. Performance-правила

### Количество glass-элементов

| На экране одновременно | Рекомендация |
|------------------------|--------------|
| 1–5 | Без проблем |
| 5–10 | Следить за FPS на мобильных |
| 10+ | Рефакторить — убрать blur у невидимых |

### GPU-оптимизация

```css
/* На анимированных фоновых элементах: */
.gradient-orb {
  will-change: transform;
  /* или */
  transform: translateZ(0);
}
```

### Что НЕ анимировать

- `backdrop-filter: blur(Xpx)` — НЕ менять значение blur динамически
- `filter: blur()` — можно менять, но затратно
- Вместо этого анимировать `opacity`, `transform`, `box-shadow`

### `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  .gradient-orb,
  .moon-glow,
  .moon-glow-inner {
    animation: none !important;
  }
}
```

```tsx
// В Framer Motion:
<motion.div
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
  // Framer Motion автоматически учитывает prefers-reduced-motion
>
```

### Fallback для старых браузеров

```css
@supports not (backdrop-filter: blur(16px)) {
  .glass-card {
    background: rgba(10, 14, 26, 0.92); /* Непрозрачный fallback */
  }
}
```

---

## 11. Чеклист для новых секций / страниц

При создании любой новой секции "Лунного Света":

- [ ] Фон — используется `bg-deep` (#0a0e1a), не чисто чёрный
- [ ] Карточки — `GlassCard` с `backdrop-blur-lg` или `backdrop-blur-xl`
- [ ] Бордеры — `border-white/10`, hover → `border-white/20`
- [ ] Текст — `text-primary` (#f1f5f9) основной, `text-secondary` (#94a3b8) побочный
- [ ] Заголовки — `gradient-text` для главных, white для подзаголовков
- [ ] Акценты — sky-400/500 (#7dd3fc) primary, violet-400 (#c4b5fd) secondary
- [ ] Анимация появления — `AnimatedReveal` с stagger по карточкам
- [ ] Кнопки — `GlowButton` primary (gradient) или secondary (ghost)
- [ ] Разделитель — `section-separator` класс на обёртке секции
- [ ] Контраст — текст на стекле читаем (4.5:1 минимум для WCAG AA)
- [ ] Ховеры — плавный transition 300ms, glow-тень при наведении
- [ ] Мобильная версия — проверить blur-performance на iOS Safari

---

## 12. Антипаттерны — чего избегать

| Нельзя | Почему | Правильно |
|--------|--------|-----------|
| `background: rgba(255,255,255,0.5)` | Слишком непрозрачно, теряется glass-эффект | `0.07–0.12` для тёмного |
| Чисто белый текст `#ffffff` | Strain на тёмном фоне | `#f1f5f9` (slate-100) |
| Blur > 24px на карточках | GPU load, особенно мобильные | `12–16px` для карточек |
| Gradient-text на body | Нечитаемо, размывается | Только заголовки h1–h3 |
| Анимация blur-значения | Тормозит рендер | Анимировать opacity вместо |
| Больше 3 орбов на экран | Визуальный шум | 2–3 фоновых, разнесённых |
| Glass на glass (вложенность) | Двойной blur = мутное пятно | Один уровень стекла |
| Тонкий шрифт (weight 300) | Исчезает на тёмном фоне | Минимум 400, лучше 500+ |

---

## 13. Быстрый старт — шаблон новой секции

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedReveal } from "@/components/ui/AnimatedReveal";

export function NewSection() {
  const t = useTranslations("newSection");

  return (
    <section id="new-section" className="py-20 md:py-32 section-separator">
      <Container>
        <AnimatedReveal>
          <SectionHeading
            title={t("title")}
            subtitle={t("subtitle")}
          />
        </AnimatedReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {items.map((item, i) => (
            <AnimatedReveal key={item.id} delay={i * 0.1}>
              <GlassCard>
                <div className="text-sky-400 mb-4">
                  <item.icon size={24} />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {item.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {item.description}
                </p>
              </GlassCard>
            </AnimatedReveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

---

## Источники

- [Dark Glassmorphism: The Aesthetic That Will Define UI in 2026](https://medium.com/@developer_89726/dark-glassmorphism-the-aesthetic-that-will-define-ui-in-2026-93aa4153088f)
- [Glassmorphism: What It Is and How to Use It in 2026](https://invernessdesignstudio.com/glassmorphism-what-it-is-and-how-to-use-it-in-2026)
- [Dark Mode Glassmorphism Tips](https://alphaefficiency.com/dark-mode-glassmorphism)
- [Glass UI CSS Generator](https://ui.glass/generator/)
- [Glassmorphism CSS Generator: Complete Design Guide](https://www.codeformatter.in/blog-glassmorphism-generator.html)
- [Motion.dev — React Parallax Tutorial](https://motion.dev/tutorials/react-parallax)
- [Framer Motion — Scroll Animations](https://www.framer.com/motion/scroll-animations/)
