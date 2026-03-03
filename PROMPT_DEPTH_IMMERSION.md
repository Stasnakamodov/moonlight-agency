# Задача: Добавить глубину и объём звёздному полю — ощущение "окна в космос"

## Контекст
Next.js 15 сайт IT-агентства. Есть canvas-based StarField компонент (`src/components/effects/StarField.tsx`, ~1060 строк) — рисует глубокий космический фон с 5 "вселенными" (зонами туманностей), сменяющимися при скролле. Компонент работает: туманности, спектральные цвета звёзд, параллакс, мерцание, мягкий bloom. Но звёзды ощущаются как "плоская наклейка" — нет чувства глубины и объёма космоса.

## Файл для изменения
**Единственный файл:** `src/components/effects/StarField.tsx`

## Что сейчас плохо

### 1. Все звёзды одного слоя двигаются одинаково
Звёзды в одном слое имеют одинаковый коэффициент параллакса. При скролле они сдвигаются как плоский лист, не как индивидуальные объекты в пространстве.

### 2. Параллакс слишком слабый
Текущие значения `LAYER_PARALLAX = [0, 0.015, 0.04, 0.07, 0.10, 0.07, 0.012]`. Разница между самым далёким и самым близким слоем — всего 10%. Глаз не читает это как глубину.

### 3. Нет реакции на курсор мыши
Самый мощный инструмент для ощущения 3D глубины — mouse parallax — отсутствует. Когда пользователь двигает курсор, звёзды должны чуть-чуть сдвигаться в зависимости от слоя. Мозг мгновенно понимает: "это объёмное пространство".

### 4. Звёзды статичны без скролла
Космос не стоит на месте. Между скроллами звёзды не двигаются вообще — мёртвый фон. Нужен медленный автономный drift ("мы летим через космос").

### 5. Wrapping создаёт "поп-ин"
Формула `((s.y - smoothScroll * parallax) % lh + lh) % lh` телепортирует звёзды с одного края экрана на другой. Это заметно для ярких звёзд (layer 3, 4, 5).

## Что нужно реализовать

### A. Mouse Parallax (самый импактный эффект)
- Слушать `mousemove`, хранить `smoothMouseX`, `smoothMouseY` (с lerp, как smoothScroll)
- Координаты мыши нормализовать от центра экрана: `-0.5...+0.5`
- Каждый слой смещается при отрисовке на `mouseOffset * layerDepth`:
  - layer 0 (dust): 0px сдвига (бесконечно далеко)
  - layer 1 (distant): ±2px
  - layer 2 (medium): ±5px
  - layer 3 (close): ±10px
  - layer 4 (feature): ±18px
  - layer 5 (double): ±10px
  - Туманности (nebula): ±3px
- Mouse lerp factor: ~`1 - Math.exp(-4 * dt)` (мягче чем scroll, ощущение инерции)
- На мобильных (touch) — можно использовать `deviceorientation` ИЛИ просто отключить
- Формула для drawX: `s.x + smoothMouseX * MOUSE_PARALLAX[s.layer]`
- Формула для drawY: `drawY + smoothMouseY * MOUSE_PARALLAX[s.layer]`

### B. Усилить разделение параллакса по слоям
Текущие значения → Новые значения:
```
LAYER_PARALLAX = [0, 0.015, 0.04, 0.07, 0.10, 0.07, 0.012]
                  ↓
LAYER_PARALLAX = [0, 0.005, 0.025, 0.065, 0.14, 0.065, 0.008]
```
Ключевое: dust/distant почти не двигаются, feature двигаются ЗАМЕТНО. Ratio между крайними слоями: 28x вместо 6.7x.

Также `NEBULA_PARALLAX`: `0.008` → `0.003` (туманности ещё дальше).

### C. Per-star micro-parallax variation
- В интерфейс `Star` добавить поле `parallaxMod: number` (значение ~0.85...1.15)
- При создании звезды: `parallaxMod: 0.85 + Math.random() * 0.3`
- При отрисовке: `const parallax = LAYER_PARALLAX[s.layer] * s.parallaxMod`
- То же для mouse parallax: `MOUSE_PARALLAX[s.layer] * s.parallaxMod`
- Это разрушает "плоскую наклейку" — звёзды одного слоя плывут чуть по-разному

### D. Медленный автономный drift
- Переменная `driftTime` увеличивается каждый кадр (на dt)
- Каждый слой имеет drift-вектор:
  - Dust: не двигается (слишком далеко)
  - Distant: ~0.03 px/sec вправо-вверх
  - Medium: ~0.08 px/sec
  - Close: ~0.15 px/sec
  - Feature: ~0.25 px/sec
- Направление: единое для всех слоёв (например, слегка вправо и вверх — "мы летим влево-вниз")
- К позиции звезды добавляется: `driftTime * DRIFT_SPEED[layer]`
- Это создаёт ощущение "мы в движении" даже без скролла
- Drift должен быть ОЧЕНЬ медленным — 1px за 4-10 секунд

### E. Мягкий fade вместо wrapping
- Вместо жёсткого `% lh` — добавить fade зону:
  - Верхние 80px экрана: alpha умножается на `clamp(drawY / 80, 0, 1)`
  - Нижние 80px: alpha умножается на `clamp((lh - drawY) / 80, 0, 1)`
- Модуль `%` оставить для позиционирования, но alpha fade скрывает "поп-ин"
- Для feature stars (layer 4) — fade зона шире (150px), т.к. они крупнее

## Чего НЕ менять
- Noise/domain warping система — работает хорошо
- Спектральные цвета звёзд — оставить
- Scintillation engine — оставить
- Shooting stars — оставить
- Генерация туманностей (generateBaseNebula, generateZoneNebulae) — оставить
- Zone system (зоны, weights, smoothWeights, smooth scroll) — оставить
- drawStarAt рендеринг (bloom, core) — оставить, только менять позиционирование
- Special objects (drawSpiralGalaxy, drawPlanetaryNebula, drawGlobularCluster, drawStarFormingKnots) — оставить

## Технические детали текущей реализации

### Текущие переменные состояния (внутри useEffect):
```typescript
let scrollY = 0;
let maxScroll = 1;
let smoothScroll = 0;       // lerp к scrollY
let prevTime = 0;
let currentStarMod = 1;     // lerp яркости
let smoothWeights = [...]   // lerp весов зон
```
Нужно добавить:
```typescript
let mouseX = 0, mouseY = 0;           // raw mouse position (normalized -0.5..+0.5)
let smoothMouseX = 0, smoothMouseY = 0; // lerped mouse
let driftTime = 0;                      // accumulated time for drift
```

### Текущий loop:
```typescript
const loop = (t: number) => {
  const dt = prevTime ? (t - prevTime) / 1000 : 0.016;
  prevTime = t;
  // Smooth scroll
  const scrollLerpFactor = 1 - Math.exp(-5 * dt);
  smoothScroll += (scrollY - smoothScroll) * scrollLerpFactor;
  // ... drawFrame(t)
};
```
Нужно добавить в loop:
```typescript
// Mouse parallax lerp
const mouseLerp = 1 - Math.exp(-4 * dt);
smoothMouseX += (mouseX - smoothMouseX) * mouseLerp;
smoothMouseY += (mouseY - smoothMouseY) * mouseLerp;
// Drift
driftTime += dt;
```

### Текущая отрисовка звёзд (в drawFrame):
```typescript
for (const s of stars) {
  const parallax = LAYER_PARALLAX[s.layer] ?? 0;
  const drawY = ((s.y - smoothScroll * parallax) % lh + lh) % lh;
  // ...
  drawStarAt(s.x, drawY, s.layer, modA, r, g, b2, s.size);
}
```
Нужно изменить на:
```typescript
for (const s of stars) {
  const pMod = s.parallaxMod ?? 1;
  const parallax = (LAYER_PARALLAX[s.layer] ?? 0) * pMod;
  const mousePx = (MOUSE_PARALLAX[s.layer] ?? 0) * pMod;
  const driftPx = (DRIFT_SPEED[s.layer] ?? 0) * driftTime;

  const rawY = s.y - smoothScroll * parallax + smoothMouseY * mousePx + driftPx * DRIFT_DIR_Y;
  const rawX = s.x + smoothMouseX * mousePx + driftPx * DRIFT_DIR_X;
  const drawY = ((rawY % lh) + lh) % lh;
  const drawX = ((rawX % lw) + lw) % lw;

  // Edge fade (вместо поп-ин)
  const fadeZone = s.layer === 4 ? 150 : 80;
  let edgeFade = 1;
  if (drawY < fadeZone) edgeFade = Math.min(edgeFade, drawY / fadeZone);
  if (drawY > lh - fadeZone) edgeFade = Math.min(edgeFade, (lh - drawY) / fadeZone);

  const modA = (s.layer === 0 ? alpha : alpha * starMod) * edgeFade;
  drawStarAt(drawX, drawY, s.layer, modA, r, g, b2, s.size);
}
```

### Интерфейс Star — нужно добавить:
```typescript
interface Star {
  // ...existing fields...
  parallaxMod: number; // ← ADD THIS (0.85..1.15)
}
```

### Новые константы:
```typescript
const MOUSE_PARALLAX = [0, 2, 5, 10, 18, 10, 1.5];
const DRIFT_SPEED = [0, 0.03, 0.08, 0.15, 0.25, 0.15, 0.02]; // px/sec
const DRIFT_DIR_X = 0.7, DRIFT_DIR_Y = -0.3; // normalized direction
```

### Не забыть:
- Добавить `mousemove` event listener (с `{ passive: true }`)
- Cleanup в return — removeEventListener для mousemove
- Для туманности (nebulaBase) и zone nebulae — тоже применить mouse parallax (маленький, ~3px)
- Для galaxy objects — тоже mouse parallax и drift
- Инициализация: `smoothMouseX = 0; smoothMouseY = 0;` (центр экрана = нет сдвига)

## Критерии успеха
1. Двигая мышь по экрану — звёзды мягко "плывут" в разных слоях с разной скоростью. Ощущение "иллюминатора в космос".
2. Без скролла и без движения мыши — звёзды медленно дрифтят. Космос живой.
3. При скролле — близкие звёзды уходят ЗАМЕТНО быстрее далёких. Чёткое ощущение глубины.
4. Звёзды одного слоя двигаются чуть-чуть по-разному (micro-parallax). Нет "наклейки".
5. Яркие звёзды плавно появляются/исчезают у краёв, не телепортируются.
6. Все движения плавные — никаких дёрганий, рывков, резких переходов.
7. Перформанс: 60fps стабильно.

## Инструкция
Войди в режим планирования. Изучи ПОЛНОСТЬЮ текущий код StarField.tsx. Составь детальный план реализации всех 5 пунктов (A-E). Определи точные места изменений с номерами строк. Продумай edge cases (мобильные без мыши, reduced motion, resize). Представь план на утверждение.
