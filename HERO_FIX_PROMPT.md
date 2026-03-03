# Hero Section — Починить и довести до Awwwards уровня

## Проблема
Текущий hero section выглядит скучно, статично, не впечатляет. Предыдущая попытка внедрить GSAP-анимации привела к багам:
1. **Shimmer overlay создавал белый прямоугольник** поверх текста — `mix-blend-mode: screen` на div поверх canvas StarField даёт артефакты. Было исправлено переносом shimmer на `background-clip: text`, но визуально всё равно скучно.
2. **Cursor glow (квадрат света)** — div с radial-gradient двигался за курсором, но создавал видимый прямоугольный артефакт. `mix-blend-mode: screen` убрали, но эффект еле заметен.
3. **В целом** — анимации технически работают (SplitText reveal, breathing glow), но визуально нет WOW-фактора. Нет динамики, нет ощущения premium, нет "это Awwwards-сайт".

## Что нужно сделать
Полностью переработать визуальные эффекты hero section. Цель — при заходе на сайт человек говорит "wow". Уровень Red Collar / Cuberto / Igloo Inc.

## Контекст проекта

### Stack
- Next.js 15 (Turbopack), React 19, TypeScript
- Tailwind CSS v4 (через `@import "tailwindcss"` и `@theme`)
- Framer Motion (уже установлен)
- **GSAP + @gsap/react** уже установлены, SplitText доступен
- GSAP registry: `src/lib/gsap.ts` (экспортирует `gsap`, `useGSAP`, `SplitText`, `ScrollTrigger`)

### Ключевые файлы
- **Hero**: `src/components/sections/HeroSection.tsx` — ПЕРЕПИСАТЬ
- **CSS**: `src/app/globals.css` — обновить hero-стили
- **Layout**: `src/app/[locale]/layout.tsx` — шрифты Inter + JetBrains Mono + Cormorant Garamond
- **i18n**: `messages/ru.json` и `messages/en.json`
- **GSAP**: `src/lib/gsap.ts`

### Тексты
- Заголовок: "ЛУННЫЙ" / "СВЕТ" (ru), "MOON" / "LIGHT" (en) — два слова на двух строках
- Подзаголовок: "IT-агентство нового поколения" / "Next-Gen IT Agency"
- i18n ключи: `hero.title_line1`, `hero.title_line2`, `hero.subtitle`, `hero.description`, `hero.cta_primary`, `hero.cta_secondary`

### Что НЕ ТРОГАТЬ
- `StarField.tsx` — Canvas 2D starfield фон, работает отлично
- `DecorativeMoon` внутри HeroSection — CSS луна справа, оставить как есть
- CTA кнопки (`glowButtonClass`) — стиль не менять
- Background orbs — оставить
- Scroll chevron — оставить

### Шрифт заголовка
Cormorant Garamond 300 (font-display font-light), подключен с cyrillic subset.

## Конкретные требования

### 1. SplitText character reveal — РАБОТАЕТ, но нужно УСИЛИТЬ
Текущий reveal: `opacity 0→1, y 80→0, rotateX -90→0, blur 8px→0, stagger 0.04s`.
**Добавить:**
- Каждый символ при появлении должен давать кратковременную вспышку свечения (text-shadow flash на 0.3s)
- Не просто opacity — добавить scale: 0.7→1 для ощущения "материализации"
- After-settle: не просто bounce y -3→0, а лёгкое scale 1.02→1 с elastic

### 2. Живое свечение — ПЕРЕДЕЛАТЬ
Текущее breathing glow через CSS `text-shadow` animation слишком слабое и незаметное.
**Нужно:**
- Более агрессивное свечение: text-shadow с бОльшими значениями blur
- Glow должен быть ВИДИМЫМ — не 0.1 opacity, а 0.3-0.4
- Пульсация должна быть заметна невооружённым глазом
- Цвет: лунный холодный (#7dd3fc sky + лёгкий #c4b5fd violet)

### 3. Shimmer (луч света по тексту) — ПЕРЕДЕЛАТЬ ПОЛНОСТЬЮ
Overlay div НЕ работает поверх canvas. `background-clip: text` работает, но конфликтует с color/text-shadow.
**Варианты решения:**
- a) Shimmer через `background-clip: text` — но тогда `text-shadow` не работает одновременно (text-fill-color: transparent убирает тень). Нужно разделить: один слой для text-shadow, другой (дубликат текста, position: absolute) для shimmer.
- b) CSS `mask-image` на псевдоэлементе поверх текста
- c) SVG filter с feFlood + feComposite
- d) Отказаться от shimmer вообще и вместо этого сделать другой крутой эффект

### 4. Cursor glow — ПЕРЕДЕЛАТЬ
`mix-blend-mode: screen` на div поверх canvas = артефакты. Нужен другой подход:
- **Вариант A**: Вместо div — CSS custom property `--mx` / `--my` на контейнере, и radial-gradient в text-shadow или фильтре, привязанный к этим переменным
- **Вариант B**: Дублировать текст абсолютно поверх, clip его radial mask по позиции курсора, показывать более яркую версию
- **Вариант C**: Просто усилить text-shadow/brightness на ближайших к курсору символах через GSAP (без overlay div)
- Магнитный pull букв к курсору (1-2px) уже реализован и работает — оставить

### 5. Общая атмосфера
- Текст должен выглядеть как светящийся лунным светом — не просто белые буквы
- Нужна ГЛУБИНА — слои свечения, разные радиусы blur
- Нужна ЖИЗНЬ — постоянное мягкое движение, пульсация
- Нужна РЕАКЦИЯ — на курсор, на скролл

## Текущий код

### src/lib/gsap.ts
```ts
"use client";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);
export { gsap, useGSAP, SplitText, ScrollTrigger };
```

### Размер заголовка (финальный)
```css
font-size: clamp(3rem, 9vw, 13rem);
line-height: 0.9;
letter-spacing: 0.06em;
white-space: nowrap;
```
Эти значения подобраны — "ЛУННЫЙ" помещается на одну строку. НЕ МЕНЯТЬ размер.

## Критически важные ограничения

1. **НЕ использовать `mix-blend-mode: screen` на div-ах поверх canvas** — это даёт видимый прямоугольник
2. **НЕ использовать overlay div для shimmer** — та же проблема
3. **`background-clip: text` + `text-fill-color: transparent`** конфликтует с `text-shadow` — если нужны оба, делать два слоя текста
4. **Все GSAP анимации** через `useGSAP()` хук с `scope` для cleanup
5. **SSR-safe**: `"use client"`, без window/document в module scope
6. **Touch devices**: отключить cursor-related эффекты
7. **60fps обязательно** — любой jank недопустим
8. **Кириллица обязательна** — SplitText поддерживает

## Ожидаемый результат
Человек заходит → звёздное небо → буквы "ЛУННЫЙ" МАТЕРИАЛИЗУЮТСЯ с мощным свечением (каждая буква вспыхивает при появлении) → затем "СВЕТ" → заголовок начинает ЖИТЬ (пульсирует видимым лунным свечением, периодический луч света) → при движении мыши буквы подсвечиваются и чуть тянутся → внизу описание + кнопки → ощущение: "это космос, это уровень".

## Проверка
После реализации запустить:
```bash
npx tsc --noEmit
npm run build
```
Оба должны пройти без ошибок.
