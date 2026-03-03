# Task: Spiral Descent Camera — StarField.tsx

## READ FIRST — What "spiral" means here

Imagine a spiral/helical elevator shaft. You stand inside and look straight ahead (first person). The elevator descends by rotating.

**What you see from first person (NOT from above):**

When scrolling DOWN the page, the starfield moves in a **diagonal spiral descent**:
- LEFT = DOWN (descending direction)
- RIGHT = UP (ascending direction)
- The perpendicular axis (roughly up-down on screen) **oscillates sinusoidally** — this is the helix rotation

**This is NOT:**
- ❌ Rotating the canvas/image
- ❌ Moving the camera in a flat circle on screen
- ❌ A radial zoom (stars flying from center outward)
- ❌ Just a diagonal linear shift

**This IS:**
- ✅ Primary motion: diagonal down-left on scroll-down (the "descent")
- ✅ Secondary motion: sinusoidal oscillation perpendicular to that diagonal (the "spiral rotation")
- ✅ 7 parallax layers each react differently — foreground oscillates more, background barely moves → creates depth illusion of being inside a rotating helix
- ✅ From above it would look like a circle. From first person (our camera) it looks like: the world sways left, then down, then right, then up — while constantly descending to the left

## Visual description of one scroll cycle

Imagine scrolling through 1/2.5 of the page (one full spiral turn):

```
Phase 1: Stars drift UP-RIGHT    (you're turning into the spiral)
Phase 2: Stars drift DOWN-RIGHT   (you're at the outer curve)
Phase 3: Stars drift DOWN-LEFT     (you're turning back)
Phase 4: Stars drift UP-LEFT       (completing the rotation)
```

...all while the AVERAGE position steadily moves UP-RIGHT (because camera descends down-left). The phases create the corkscrew feeling.

## Technical implementation

### The math (2D projection of a helix)

The camera follows a helical path projected onto 2D. The helix has:
- **Main axis**: diagonal vector roughly `(-0.7, -0.7)` normalized (down-left)
- **Perpendicular axis**: `(-0.7, 0.7)` normalized (the rotation plane)
- **scrollProgress** (0..1): how far along the helix

```typescript
// Main descent along diagonal
const mainT = scrollProgress;  // 0..1
const mainX = mainT * DESCENT_RANGE_X;  // total X displacement (negative = left)
const mainY = mainT * DESCENT_RANGE_Y;  // total Y displacement (negative = down... but left=down per user)

// Helix rotation (perpendicular oscillation)
const helixAngle = scrollProgress * Math.PI * 2 * HELIX_TURNS; // e.g. 2.5 turns
const helixX = Math.cos(helixAngle) * HELIX_RADIUS;
const helixY = Math.sin(helixAngle) * HELIX_RADIUS;

// Project helix onto the perpendicular axis of the main diagonal
// Main direction: (-0.707, -0.707)
// Perp direction: (-0.707, +0.707)
const perpX = -0.707;
const perpY =  0.707;

const targetCamX = mainX + helixX * perpX;
const targetCamY = mainY + helixY * perpY;
```

Each parallax layer multiplies the camera position by its own factor:
- Layer 4 (feature, ~0.7): strong spiral visible
- Layer 0 (dust, ~0.01): nearly static
- The DIFFERENCE between layers = perceived depth of the spiral

### Key parameters to tune
- `HELIX_TURNS`: 2–3 full rotations over entire scroll (more = tighter spiral)
- `HELIX_RADIUS`: world units for the oscillation amplitude. Must be large enough that `radius * max_parallax` = visible pixel shift (500–1500px for foreground)
- `DESCENT_RANGE_X/Y`: total camera travel along the main diagonal

### What already exists in StarField.tsx
- 7 parallax layers with pre-rendered star sprites (DO NOT break sprite cache)
- `CAM_PARALLAX[]` array — separate camera parallax factors per layer
- `smoothCameraX`, `smoothCameraY` — lerped camera position used in draw loop
- `lookupPathPosition()` — Catmull-Rom path lookup (can be simplified/replaced)
- `PATH_LUT` — pre-computed arc-length LUT
- Star wrapping: `((rawX % lw) + lw) % lw` — keeps stars on screen
- Adaptive quality system, zone weights, MW band, nebulae — all take camera offset

### Constraints
1. Pure Canvas 2D — no Three.js, no WebGL, no external libs
2. Stay within ~8ms/frame budget
3. Do not break sprite cache (pre-rendered star gradients)
4. Do not restructure render pipeline draw order
5. Zone system stays 1D (scroll-progress based)
6. `prefers-reduced-motion`: disable spiral, camera stays fixed

### File
`src/components/effects/StarField.tsx` (~1680 lines)

### Current camera code location
In the `loop()` function, look for the comment "Camera: scroll progress → spiral world position". That's where `targetCamX`/`targetCamY` are computed. Replace the logic there.
