# Hero Section Redesign — Full Research + Implementation

## Задача
Полностью переделать hero section в Moonlight Agency сайте. Результат должен быть на уровне Awwwards SOTD — впечатлять как русскую/СНГ аудиторию, так и международную. Профессионализм, динамика, IT-дух, лунный свет.

## Контекст проекта
- **Stack**: Next.js 15, Tailwind CSS v4, TypeScript
- **Текущий фон**: Canvas 2D starfield (`src/components/effects/StarField.tsx`) — не трогать
- **i18n**: next-intl, тексты в `messages/ru.json` и `messages/en.json`
- **Заголовок**: два слова — "ЛУННЫЙ" / "СВЕТ" (ru) и "MOON" / "LIGHT" (en), кириллица обязательна
- **Layout**: `src/app/[locale]/layout.tsx` — уже есть Inter + JetBrains Mono + Cormorant Garamond (--font-display)
- **Hero file**: `src/components/sections/HeroSection.tsx`
- **CSS**: `src/app/globals.css`
- **CTA кнопки** (`glowButtonClass`) — не менять их стиль

## Что сейчас (и почему это не работает)
Текущий hero — просто белый текст Cormorant Garamond с еле заметным свечением и clip-mask reveal. Выглядит стерильно, безжизненно, как белые полоски на чёрном. Нет динамики, нет IT-духа, нет WOW-фактора. Нет ощущения, что это сайт технологической компании.

## Research-based подход

### Что побеждает на Awwwards 2024-2026
На основе анализа SOTD/SOTY победителей:
1. **GSAP SplitText + ScrollTrigger** — доминирует на 80% award-winning сайтов. Кинематографичный per-character reveal, stagger 0.03-0.05s, custom easing `power4.out`
2. **Cursor-reactive effects** — подпись русских agency (Cuberto, Red Collar). Каждый элемент реагирует на курсор
3. **WebGL shader text distortion** — максимальный визуальный импакт
4. **Particle text** — текст собирается из частиц
5. **Magnetic buttons** — IT/tech ощущение

### Что впечатляет русскую/СНГ аудиторию (Red Collar, Cuberto, Nimax стиль)
1. **Extreme polish на cursor interactions** — курсор = элемент дизайна, magnetic buttons, morphing cursors
2. **Кинетическая типографика** — большие, двигающиеся, живые буквы
3. **Dark theme + glassmorphism** — предпочтительная эстетика
4. **Physics-based interactions** — элементы ощущаются физически
5. **60fps обязательно** — любой jank = дилетантство

## Рекомендуемый стек для hero

### GSAP (теперь полностью бесплатен, включая SplitText)
```bash
npm install gsap @gsap/react
```
- `useGSAP()` хук для React — авто-cleanup при unmount
- `SplitText` с `autoSplit` — разбивает текст на chars/words/lines, пересобирает при resize
- `ScrollTrigger` — scroll-driven анимации
- Регистрировать плагины один раз: `gsap.registerPlugin(SplitText, ScrollTrigger)`
- Custom easing: `power4.out` или `expo.out` для premium feel

### Lenis (smooth scroll)
```bash
npm install lenis
```
Интеграция с GSAP:
```js
lenis.on('scroll', ScrollTrigger.update)
gsap.ticker.add((time) => lenis.raf(time * 1000))
gsap.ticker.lagSmoothing(0)
```

## Что нужно реализовать (5 уровней WOW)

### 1. Кинематографичный text reveal (GSAP SplitText) — ОБЯЗАТЕЛЬНО
Каждый символ "ЛУННЫЙ" / "СВЕТ" появляется с:
- `opacity: 0 → 1`
- `y: 80px → 0`
- `filter: blur(8px) → blur(0)`
- `rotateX: -90deg → 0` (лёгкий 3D flip)
- Stagger: 0.04s per char, `from: "random"` или `from: "start"`
- Easing: `power4.out` или custom bezier
- Line 2 начинается через 0.15s после line 1
- Total duration reveal: ~1.5s
- **После reveal**: буквы должны мягко "осесть" (tiny bounce с `elastic.out`)

### 2. Живое лунное свечение на тексте — ОБЯЗАТЕЛЬНО
После reveal текст не статичен:
- **Breathing glow**: `text-shadow` пульсирует (60px → 100px → 60px) каждые 4-5s
- **Shimmer sweep**: диагональный луч света проходит по тексту каждые 6-8s (CSS gradient animation или Canvas overlay)
- **Subtle color shift**: текст чуть переливается белый → ice-blue (#7dd3fc) → белый, очень медленно

### 3. Cursor-reactive text glow — ОБЯЗАТЕЛЬНО
Когда курсор движется над/около заголовка:
- Локальная подсветка: radial gradient (250-300px) следует за курсором, `mix-blend-mode: screen`
- Ближайшие к курсору буквы чуть ярче (+20% brightness)
- Subtle magnetic pull: буквы слегка (1-2px) смещаются к курсору при близости < 200px

### 4. Subtitle с IT-акцентом
- Font: monospace (`font-mono`), мелкий (11-12px), tracking 0.25em
- Перед текстом: тонкая горизонтальная линия (animate scaleX in)
- Текст "IT-агентство нового поколения" появляется после заголовка
- Мерцающий cursor-bar `|` в конце (как в терминале), исчезает через 3s

### 5. Glowing accent line + атмосфера
- Тонкая линия под заголовком: gradient от cyan к прозрачному, `box-shadow` glow
- Background orbs: очень приглушённые (opacity 0.05-0.08), не конкурируют со starfield
- Hover на CTA кнопках: magnetic pull (2-3px смещение к курсору)

## Конкретный порядок действий

### Шаг 1: Установить GSAP
```bash
npm install gsap @gsap/react
```

### Шаг 2: Создать GSAP registry
Файл `src/lib/gsap.ts`:
```ts
"use client";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(SplitText, ScrollTrigger);
export { gsap, SplitText, ScrollTrigger };
```

### Шаг 3: Переписать HeroSection.tsx
- Удалить весь текущий код анимации (RevealLine, charVariants, etc.)
- Использовать `useGSAP()` хук
- SplitText для разбиения заголовка
- GSAP timeline для orchestrated reveal:
  1. `0s` — subtitle line animates in (scaleX)
  2. `0.2s` — subtitle text fades in
  3. `0.4s` — line 1 chars reveal (stagger 0.04s)
  4. `0.7s` — line 2 chars reveal
  5. `1.3s` — accent line scales in
  6. `1.5s` — description fades up
  7. `1.8s` — CTA buttons fade up
  8. `2.5s` — breathing glow loop starts
  9. `3.0s` — shimmer sweep loop starts

### Шаг 4: Добавить cursor-reactive effects
- `onMouseMove` на title wrapper
- GSAP-smoothed radial glow (не setState, а прямой DOM update для 60fps)
- Optional: magnetic pull на буквы через GSAP `quickTo`

### Шаг 5: CSS effects в globals.css
- `.hero-title` — breathing glow keyframes
- `.hero-shimmer` — shimmer sweep keyframes
- `.hero-line-glow` — accent line glow

### Шаг 6: Проверить
- `npx tsc --noEmit` — без ошибок
- Мобильная адаптивность (clamp для размеров)
- Performance: 60fps на десктопе, graceful degradation на мобиле

## Типографика (финальная)
- **Font**: Cormorant Garamond 300 (`font-display font-light`) — уже подключен
- **Size**: `clamp(4rem, 13vw, 18rem)` — МОНУМЕНТАЛЬНО
- **Letter-spacing**: `0.08em` — дышит, но не разваливается
- **Line-height**: `0.88`
- **Color**: `#E1EFF3` (cool white) с переливом в `#7dd3fc` (ice blue)
- **Transform**: uppercase

## Важные ограничения
- НЕ трогать `StarField.tsx`, `DecorativeMoon`, CTA кнопки
- Кириллица обязательна (SplitText поддерживает)
- SSR-safe: все GSAP/Canvas код только в `"use client"` компонентах
- Mobile: disable magnetic pull и cursor glow на touch devices
- Bundle: GSAP core ~23KB gzip — приемлемо

## Референсы для вдохновения
- [Red Collar](https://redcollar.co) — русский agency, Awwwards SOTD
- [Cuberto](https://cuberto.com) — cursor interactions, magnetic effects
- [Igloo Inc](https://igloo.inc) — SOTY 2025, WebGL text
- [Jeff Koons Moon Phases](https://jeffkoonsmoonphases.com) — editorial premium feel
- [Codrops SplitText demos](https://tympanus.net/codrops/2025/05/14/from-splittext-to-morphsvg-5-creative-demos-using-free-gsap-plugins/)
- [GSAP + React setup](https://gsap.com/resources/React/)

## Ожидаемый результат
Человек заходит на сайт и видит:
1. Звёздное небо (уже есть)
2. Луна справа (уже есть)
3. Буквы "ЛУННЫЙ" материализуются одна за другой с blur + 3D flip + glow flash
4. Затем "СВЕТ" — та же магия
5. Заголовок начинает жить: пульсирует лунным светом, по нему проходит световой луч
6. При движении мыши — локальная подсветка на буквах, они чуть тянутся к курсору
7. Снизу появляется описание, CTA
8. Ощущение: "это не обычный сайт, это уровень Awwwards"
