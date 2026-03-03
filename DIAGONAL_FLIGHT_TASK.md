# Task: Diagonal Galaxy Flight — Camera System for StarField.tsx

## Context

Next.js 15 site (`moonlight-agency`) with a full-screen Canvas 2D starfield background at `src/components/effects/StarField.tsx` (~1400 lines). The starfield is highly optimized and runs within an ~8ms/frame budget.

### Current architecture of StarField.tsx

**7 Parallax Layers:**
```
Layer 0: Dust       - parallax: 0      (static)
Layer 1: Distant    - parallax: 0.005
Layer 2: Medium     - parallax: 0.025
Layer 3: Close      - parallax: 0.065
Layer 4: Feature    - parallax: 0.14   (brightest, most prominent)
Layer 5: Double     - parallax: 0.065  (companion binary stars)
Layer 6: Galaxy     - parallax: 0.008
```

**5 Named Zones** with overlapping scroll ranges:
```
Zone 0: "Golden Veil" (Hero)          - scrollStart: 0,    scrollEnd: 0.32
Zone 1: "Emerald Reef" (Services)     - scrollStart: 0.08, scrollEnd: 0.48
Zone 2: "Ice Abyss" (Cases)           - scrollStart: 0.25, scrollEnd: 0.65
Zone 3: "Purple Rift" (About + Demo)  - scrollStart: 0.42, scrollEnd: 0.85
Zone 4: "Edge of Universe" (Footer)   - scrollStart: 0.60, scrollEnd: 1.0
```

Each zone has: colorWash, washOp, starBrightMod, and a ZoneNebConf (domain-warped Perlin noise nebula).

**Current scroll model (VERTICAL ONLY):**
```typescript
const parallax = LAYER_PARALLAX[layer] * star.parallaxMod;
const mousePx = MOUSE_PARALLAX[layer] * star.parallaxMod;
const driftPx = DRIFT_SPEED[layer] * driftTime;

const rawY = star.y - smoothScroll * parallax + smoothMouseY * mousePx + driftPx * DRIFT_DIR_Y;
const rawX = star.x + smoothMouseX * mousePx + driftPx * DRIFT_DIR_X;

const drawY = ((rawY % lh) + lh) % lh;  // Y wrapping
const drawX = ((rawX % lw) + lw) % lw;  // X wrapping
```

**Key optimizations already in place (DO NOT break these):**
1. `alpha: false` on main canvas context
2. `willReadFrequently: true` on offscreen MW/nebula canvases
3. Sin/cos scintillation instead of Perlin noise (~100x cheaper)
4. Pre-rendered star sprites at init for layers 2-5 (eliminates ~150 gradient creates/frame)
5. Spatial culling before drawing (skip off-screen stars)
6. Integer pixel positions (`x | 0`) to avoid sub-pixel AA
7. Pre-computed tinted fill strings for layers 0-1
8. Adaptive quality: monitors FPS, reduces effects when <45fps

**Milky Way band** — diagonal stripe: `-0.65*nx - ny + 0.82 = 0`, width ±0.22, quadratic falloff. Two pre-computed low-res canvases (1/3 resolution) with domain-warped Perlin noise, crossfaded 0.3–0.7 over ~25s period.

**MW Wisps** — 7-12 luminous blobs along the band with Lissajous drift.

**Smoothing:** scroll lerp factor = `1 - exp(-5 * dt)`, mouse lerp = `1 - exp(-4 * dt)`. Large jumps (>1.5vh) snap immediately.

**Zone weight calculation:** `zWeight()` uses `smoothstep()` with 18% margin at boundaries. `getWeights()` converts `smoothScroll / maxScroll` (0..1) into per-zone weights.

---

## Goal

**Currently**: scrolling down = flat vertical shift. The starfield just slides up like a wallpaper.

**Target**: scrolling down = camera **flies diagonally through a galaxy** (down-right). Each page section corresponds to a **unique region in a large 2D world space**, not just a color-tinted overlay of the same sky.

---

## Chosen Approach: World-Space Camera with Catmull-Rom Path

This approach was selected after comparing 4 options (world-space camera, layered textures, procedural chunks, hybrid). It won because:
- Direct mapping to existing zone system
- Preserves sprite cache (the biggest perf optimization)
- Viewport culling improves performance by 20-40%
- Surgical migration, no structural rewrite

### Implementation Plan

#### 1. New Constants & Data Structures

```typescript
// World size
const WORLD_W = 10000;
const WORLD_H = 8000;

// Camera path: 5 Catmull-Rom control points (one per zone centroid)
// Path goes diagonally down-right through the world
const CAMERA_PATH: [number, number][] = [
  [1000, 1000],   // Zone 0 "Golden Veil"
  [3000, 2500],   // Zone 1 "Emerald Reef"
  [5500, 4000],   // Zone 2 "Ice Abyss"
  [7500, 5500],   // Zone 3 "Purple Rift"
  [9500, 7500],   // Zone 4 "Edge of Universe"
];

// Arc-length LUT for uniform speed along curved path
interface PathLUT { t: number; x: number; y: number; arcLen: number }

// Spatial grid for viewport culling
const GRID_CELL = 200; // world units per cell
type SpatialGrid = Map<string, Star[]>;
```

#### 2. New Functions (~80 LOC)

```typescript
// Catmull-Rom spline evaluation (passes through all control points)
function catmullRom(P0: number, P1: number, P2: number, P3: number, t: number): number {
  return 0.5 * (
    (2 * P1) +
    (-P0 + P2) * t +
    (2 * P0 - 5 * P1 + 4 * P2 - P3) * t * t +
    (-P0 + 3 * P1 - 3 * P2 + P3) * t * t * t
  );
}

// Evaluate full spline at parameter t (0..1) across all segments
function evaluateSpline(points: [number, number][], t: number): [number, number]

// Build arc-length parameterization LUT at init (~200 entries, 0.5ms)
function buildPathLUT(points: [number, number][], steps?: number): PathLUT[]

// Runtime: scrollProgress (0..1) → world position via LUT binary search
function lookupPathPosition(lut: PathLUT[], scrollProgress: number): [number, number]

// Build spatial grid per layer at init
function buildSpatialGrid(stars: Star[], cellSize: number): SpatialGrid

// Query grid for stars in viewport AABB
function queryGrid(grid: SpatialGrid, x0: number, y0: number, x1: number, y1: number): Star[]
```

#### 3. Star Initialization Changes

Stars currently get `x` in `[0..lw]` and `y` in `[0..lh]` (screen-space). Change to world-space:

- Each zone's stars should be placed within that zone's AABB in world space
- Zone AABB derived from the camera path waypoints (e.g., Zone 0 stars placed within ±800 units of point [1000, 1000])
- Some stars scattered uniformly across the full world for continuity between zones
- Layer 0 (dust) and deep field spread across the full world

#### 4. Per-Frame Camera Update

Replace the current `smoothScroll` system:

```typescript
// In the animation loop:
const scrollProgress = smoothScroll / maxScroll; // 0..1, already exists
const [targetCamX, targetCamY] = lookupPathPosition(pathLUT, scrollProgress);

// Frame-rate-independent lerp (damping 0.07 = "floaty zero-gravity")
const factor = 1 - Math.pow(1 - 0.07, dt / 16.67);
smoothCameraX = lerp(smoothCameraX, targetCamX, factor);
smoothCameraY = lerp(smoothCameraY, targetCamY, factor);

// Large jumps (anchor links): snap immediately
if (Math.hypot(targetCamX - smoothCameraX, targetCamY - smoothCameraY) > viewportDiag * 1.5) {
  smoothCameraX = targetCamX;
  smoothCameraY = targetCamY;
}
```

#### 5. Parallax Math Change

Current: `rawY = star.y - smoothScroll * parallax`
New: both axes get camera offset

```typescript
const parallax = LAYER_PARALLAX[layer] * star.parallaxMod;
const rawX = star.x - smoothCameraX * parallax + smoothMouseX * mousePx + driftPx * DRIFT_DIR_X;
const rawY = star.y - smoothCameraY * parallax + smoothMouseY * mousePx + driftPx * DRIFT_DIR_Y;
```

**Remove or adjust wrapping** — in a finite world with culling, wrapping may cause stars to teleport. Instead, simply skip stars outside the viewport AABB (culling handles this).

#### 6. Zone Weight Calculation

The existing `zWeight()` uses `sn = smoothScroll / maxScroll`. This stays the same — `sn` is still 0..1 scroll progress. The zone system is independent of camera position; it's driven by scroll progress along the path.

#### 7. Milky Way Band

Apply low parallax offset to MW band rendering:
```typescript
const mwOffX = smoothCameraX * 0.08;
const mwOffY = smoothCameraY * 0.08;
// In the drawImage calls for MW layers:
ctx.drawImage(mwCanvas, -mwOffX | 0, -mwOffY | 0);
```

The band drifts slowly — at 8% of camera speed it appears nearly stationary vs foreground stars. Design the camera path so it passes through the MW band's brightest region around scroll 0.4-0.6.

#### 8. Zone Nebulae

Same pattern — apply camera offset at `NEBULA_PARALLAX` (0.003):
```typescript
const nebOffX = smoothCameraX * NEBULA_PARALLAX;
const nebOffY = smoothCameraY * NEBULA_PARALLAX;
```

#### 9. Deep Field, Dust Particles, Shooting Stars

- Deep field: very low parallax (~0.002), apply camera offset
- Dust particles: apply camera offset at their parallax rate
- Shooting stars: spawn relative to current viewport (camera position + random offset)

#### 10. Accessibility

```typescript
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// If true: camera stays fixed at Zone 0 position, all diagonal translation disabled
// Stars still twinkle (low amplitude), content scrolls normally in DOM
```

---

## Critical Constraints

1. **DO NOT break the sprite cache system.** Stars must keep their `sprite: HTMLCanvasElement`. This is the #1 performance optimization.
2. **Stay within ~8ms/frame budget.** Viewport culling should help, not hurt.
3. **DO NOT add external libraries.** No GSAP, no Lenis, no Three.js. This is pure Canvas 2D.
4. **DO NOT restructure the rendering pipeline.** The draw order (clear → MW → wisps → deep field → zone nebulae → special objects → galaxies → per-layer stars → fog → color wash → dust → shooting stars) stays the same.
5. **Preserve the adaptive quality system.** It should continue to work with the new camera system.
6. **The zone system stays 1D (scroll-progress based).** Don't convert zones to 2D world-space regions — they're driven by scroll progress which maps to path position.

## Expected Result

- Scrolling down: camera flies diagonally down-right through a 10000×8000 world
- Each section shows a distinct galactic region (different star density, nebula, color)
- 7-layer parallax amplifies diagonal movement (foreground stars move more than background)
- MW band drifts slowly at deep parallax
- Smooth transitions between zones (existing blend system)
- `prefers-reduced-motion`: static fallback
- Performance: equal or better than current (culling compensates for path evaluation)

## Estimated scope

+120 new lines, ~80 modified, ~20 removed = net +100 lines (total ~1500).
6 new functions. No new files. No new dependencies.
