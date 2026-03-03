# Task: Redesign Zone Nebula Visuals — Each Zone Must Have a Unique Visual Identity

## Problem
`src/components/effects/StarField.tsx` has 5 universe zones that transition as the user scrolls. Each zone has a pre-rendered nebula texture drawn as a full-screen overlay. **The problem: ALL zones look like the same generic fog/haze, just tinted different colors.** Despite having different noise parameters (scale, warp, octaves, lacunarity, rotation, aspect) and even different noise algorithms (standard, ridged, turbulent, cellular, marble), the end result on screen is visually identical — amorphous colored mist.

This is because the generation loop is the same for all zones: sample noise → apply density threshold → mix two colors → write pixel. No matter what noise variant you use, the output is always a soft amorphous cloud. The **structure** and **geometry** of each zone needs to be fundamentally different.

## What I Want
Each zone should have a **dramatically different visual pattern** — not fog, but recognizable geometric/organic structures. When a user scrolls from one zone to the next, they should immediately feel the visual shift. Think of it like different biomes in space.

## Current Zone Definitions

```typescript
// Zone 0 — "Golden Veil" (Hero): scrollStart 0 → 0.32, colors: warm orange/red
// Zone 1 — "Emerald Reef" (Services): scrollStart 0.08 → 0.48, colors: teal/cyan
// Zone 2 — "Ice Abyss" (Cases): scrollStart 0.25 → 0.65, colors: deep blue
// Zone 3 — "Purple Rift" (About): scrollStart 0.42 → 0.85, colors: purple/magenta
// Zone 4 — "Edge of Universe" (Footer): scrollStart 0.60 → 1.0, colors: near-black/void
```

Zones overlap in scroll ranges — they crossfade via weight functions. Each zone's nebula is a pre-rendered offscreen canvas (generated at init, ~1/5 viewport resolution, drawn with additive `lighter` compositing at low opacity).

## Current Architecture

```typescript
interface ZoneNebConf {
  noiseOff: number; scale: number; warpK: number;
  density: number; falloff: number;
  c1: [number, number, number]; c2: [number, number, number];
  peak: number;
  rot?: number; aspect?: number;
  octaves?: number; lacunarity?: number;
  warpStyle?: 'standard' | 'ridged' | 'turbulent' | 'cellular' | 'marble';
}
```

Generation is pixel-by-pixel in a double for-loop:
```typescript
for (py = 0..nh) for (px = 0..nw) {
  // rotate + stretch coords
  // sample warpedNoiseZone(rpx, rpy, nb) → { val, q1, q2 }
  // density = pow(max(0, val*0.5+0.5+nb.density), nb.falloff)
  // colorMix from q1, secondary variation from q2
  // write RGBA pixel
}
```

Available noise primitives: `noise2d(x,y)` (Perlin), `fbm(x,y,oct,lac,gain)`, `warpedNoise(x,y,scale,warpK,off)`.

The texture is drawn in the main render loop with `globalCompositeOperation = 'lighter'` and a scroll-based weight (0→1→0 as zone enters/exits).

## Constraints
- Must be **pre-rendered at init** (offscreen canvas, ~1/5 viewport resolution) — no per-frame computation for nebula structure
- Canvas 2D only (no WebGL/shaders)
- Pixel-by-pixel ImageData writing (Uint32Array) — this is fast enough
- Must tile/scroll seamlessly (textures are drawn with camera offset)
- Should remain subtle (drawn with `lighter` at ~0.3-0.5 opacity) — these are background atmosphere, not foreground elements
- Each texture is generated once, never updated
- Available: full Perlin noise toolkit (noise2d, fbm, domain warping)
- Canvas 2D post-processing is allowed (blur, composite operations on the generated texture)

## Your Task

Design **5 visually distinct nebula concepts** — one per zone. For each zone, describe:

1. **Visual concept** (2-3 sentences) — what does it look like? What real astronomical or artistic reference?
2. **Pattern structure** — what geometric/organic shapes dominate? (NOT "soft clouds" — think: diagonal streaks, concentric shells, branching filaments, layered curtains, crystalline fractals, aurora bands, shock fronts, spiral density waves, etc.)
3. **Generation algorithm** — pseudocode for the pixel loop. How do you combine noise primitives to achieve this specific look? Be specific about the math.
4. **Color strategy** — how are multiple colors distributed spatially? (not just "mix c1 and c2")
5. **Post-processing** — any canvas 2D operations after pixel generation (directional blur, composite layers, etc.)

## Quality Bar
- Each zone must be **instantly recognizable** as different from the others even at a glance
- Patterns should have **directionality and structure**, not isotropic fog
- Should look **astronomical** (inspired by real nebula types, not abstract art)
- Must be **subtle enough** to work as a scrolling background behind white text and UI cards

## Ideas to Consider (starting points, not prescriptions)
- **Diagonal/swept structures**: anisotropic noise stretched along a specific angle (like stellar wind or shock fronts)
- **Concentric arcs/shells**: supernova remnant rings, planetary nebula shells
- **Branching filaments**: like Veil Nebula — thin bright threads against dark background
- **Layered curtains**: like aurora — parallel undulating bands with varying brightness
- **Pillar/column structures**: like Eagle Nebula — dark vertical absorption features against bright emission
- **Density wave ripples**: like spiral galaxy arms — logarithmic spiral brightness modulation
- **Bubble/cavity structures**: like N44 superbubble — dark voids surrounded by bright rims

## Deliverable
For each of the 5 zones, provide the complete generation function (TypeScript, pixel-by-pixel ImageData loop) that replaces the current uniform `generateZoneNebulae` logic. The function should take `(nw, nh, nb: ZoneNebConf)` and return an `HTMLCanvasElement`.

Also specify any changes needed to `ZoneNebConf` interface (new fields) and the zone parameter values.

Make sure adjacent zones (which overlap in scroll range and crossfade) look good when blended together.
