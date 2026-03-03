# Задача: Каскадный порядок рендеринга — сначала титул, потом фон, потом контент

## Проект

Next.js 15 (App Router), React 19, Tailwind v4, GSAP 3.14 (SplitText, ScrollTrigger), Framer Motion.
Сайт-агентство с космической темой, i18n (ru/en), fullscreen Canvas 2D starfield.

## Структура файлов

Layout (`src/app/[locale]/layout.tsx`):
```
<body>
  <StarField />       <- Canvas 2D starfield (z-index 0)
  <DustLanes />       <- Dark dust overlays
  <MoonGlow />        <- Fixed glow top-right
  <GradientOrb />     <- Floating animated orbs
  <Vignette />        <- Dark edges
  <Header />          <- Fixed nav
  <main>{children}</main>
  <Footer />
</body>
```

Home page (`src/app/[locale]/page.tsx`):
```
<HeroSection />       <- GSAP timeline: Big Bang flash -> beam sweep -> char ignition
<ServicesSection />    <- AnimatedReveal (framer-motion)
<CasesSection />      <- AnimatedReveal cards
<AboutSection />      <- scroll reveals
<DemoSection />       <- xyflow architecture diagram
<BlogSection />       <- AnimatedReveal cards
<CalculatorCTA />
<TelegramSection />
<ContactSection />
```

Ключевые файлы:
- `src/components/sections/HeroSection.tsx` — hero с Big Bang flash + beam sweep + SplitText char ignition
- `src/components/effects/StarField.tsx` — Canvas 2D starfield (тяжёлый, оптимизированный)
- `src/components/effects/DustLanes.tsx`, `MoonGlow.tsx`, `GradientOrb.tsx`, `Vignette.tsx`
- `src/components/ui/AnimatedReveal.tsx` — framer-motion scroll reveal (useInView)
- `src/app/[locale]/layout.tsx` — главный layout
- `src/app/globals.css` — все стили
- `src/lib/gsap.ts` — GSAP регистрация (gsap, useGSAP, SplitText, ScrollTrigger)

## Текущее поведение (проблема)

Всё рендерится одновременно. StarField, фоновые эффекты, HeroSection, контент-секции — всё появляется сразу. Нет каскадной последовательности. Зрителю не ясно на что смотреть.

## Требуемый каскад рендеринга

### Этап 1 — Титул (0-2.5с):
- Экран полностью тёмный (bg-deep: #0a0e1a)
- Фоновые эффекты (StarField, DustLanes, MoonGlow, GradientOrb, Vignette) СКРЫТЫ (opacity: 0)
- Header СКРЫТ
- Играет ТОЛЬКО анимация заголовка HeroSection:
  - Subtitle line + text (0-0.4с)
  - Big Bang flash (0.25с)
  - Beam sweep + char ignition (0.5-2.0с)
  - Text-shadow fade-in (1.0-3.0с)

### Этап 2 — Фон и декор (2.0-4.0с, overlap с концом Этапа 1):
- StarField canvas плавно проявляется (opacity 0->1, ~1.5с)
- DustLanes, MoonGlow, GradientOrb, Vignette проявляются (stagger 0.2с каждый)
- DecorativeMoon в HeroSection проявляется
- Header проявляется (fade-in сверху)
- Background orbs в HeroSection проявляются
- Breathing loop и shimmer loop начинают работать

### Этап 3 — Контент ниже hero (4.0с+):
- Accent line, description, CTA кнопки в HeroSection (уже анимируются в timeline, ~2.3-3.2с)
- Chevron scroll indicator появляется
- Секции ниже hero (ServicesSection, CasesSection, AboutSection и т.д.) остаются под управлением своих AnimatedReveal (useInView) — они появляются при скролле, не при загрузке

## Техническая реализация (предложение)

### Вариант A — Глобальный GSAP-оркестратор:
- Создать `src/hooks/useRevealSequence.ts` или `src/components/effects/RevealOrchestrator.tsx`
- Компонент-обёртка в layout, который управляет CSS-переменной или классом на body/container
- Этап 1: `.reveal-stage-1` — фон скрыт, только hero title видим
- Этап 2: `.reveal-stage-2` — фон проявляется
- Этап 3: `.reveal-stage-3` — контент доступен
- HeroSection отправляет событие "title-done" по завершении beam sweep -> оркестратор запускает этап 2

### Вариант B — Через props/callback:
- Layout передаёт callback `onTitleComplete` в HeroSection
- HeroSection вызывает его из `tl.call()` после beam sweep
- Layout управляет state `stage` (1->2->3) и через него opacity фоновых компонентов

### Вариант C — Custom Event:
- HeroSection диспатчит `window.dispatchEvent(new CustomEvent("hero-title-done"))` из GSAP timeline
- Каждый фоновый компонент слушает это событие и начинает свою fade-in анимацию
- Самый decoupled вариант, не требует props drilling через layout

Выбери лучший подход или предложи свой.

## Что НЕ делать

- Не ломать существующую анимацию HeroSection (Big Bang flash -> beam sweep -> char ignition -> breathing -> shimmer -> cursor interaction)
- Не использовать Suspense/loading.tsx для этого (это visual sequencing, не data loading)
- Не блокировать scroll во время анимации — юзер может скроллить когда захочет
- Не создавать задержку если юзер пришёл по якорю (#contact и т.п.) — каскад только для initial page load
- Не ухудшать performance StarField — он уже оптимизирован, не добавлять лишних ререндеров
- AnimatedReveal секции (Services, Cases, About и т.д.) должны остаться scroll-triggered, НЕ привязывать их к таймеру загрузки
- Не использовать isolation: isolate (артефакты), не использовать mask на SplitText chars

## Текущие таймлайны HeroSection (для справки)

```
0.0с  — subtitle line scaleX
0.2с  — subtitle text fade
0.25с — Big Bang flash burst (scale 0.15->1.6)
0.4с  — cursor blink appear
0.5с  — beam sweep starts (1.5с duration)
0.5с  — chars1 ignite by X-position (--glow: 4->0, scale: 1.15->1)
0.8с  — chars2 ignite (0.3с offset)
1.0с  — h1 text-shadow fade in (2с duration)
2.0с  — beam sweep ends
2.3с  — accent line
2.5с  — description
2.8с  — CTA buttons
3.2с  — chevron
3.5с  — cache char rects + quickTo
4.5с  — breathing loop starts
5.0с  — shimmer loop starts
```

Прочитай все упомянутые файлы перед любыми изменениями. Сохрани весь существующий функционал.
