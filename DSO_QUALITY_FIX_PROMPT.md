# Task: Fix DSO (Deep Sky Object) Rendering Quality in StarField.tsx

## Context
`src/components/effects/StarField.tsx` contains a full-screen Canvas 2D starfield with 15 pre-rendered deep sky objects (galaxies, nebulae). Each DSO is generated at init as an offscreen canvas using noise-based pixel-by-pixel rendering (ImageData + Uint32Array + Perlin noise/fbm/domain-warping). They are drawn on the Milky Way layer with `lighter` (additive) compositing.

The DSOs currently look **low quality and artificial**. Below is a per-object defect list based on screenshot analysis.

---

## Defect List by Object

### 1. Horsehead Nebula (`generateHorseheadTex`, line ~1242)
**Severity: Critical**
- The dark silhouette is a **rectangular/blocky shape** — looks like a solid geometric block, not an organic horse-head form
- Hard edges on the dark region — no soft feathering or organic boundary irregularity
- The dark region is too opaque/solid — real dark nebulae have translucent edges and internal structure variation
- Too large relative to the emission background behind it
- **Fix direction**: The dark shape needs a sculpted profile (narrower neck, wider "head" top), fbm-warped boundary, soft alpha feathering at edges, and internal luminosity variation

### 2. Eagle Nebula (`generateEagleNebTex`, line ~983)
**Severity: Critical**
- The "Pillars of Creation" look like **solid black rectangular blocks** — not tapered columnar shapes
- Extremely geometric and sharp-edged, nothing like the real wispy/eroded pillars
- Dark regions are pure black with zero internal detail
- The emission backdrop behind the pillars is okay but the pillars themselves ruin it
- **Fix direction**: Pillars should be tapered (wide base, narrow tips), fbm-warped edges with whispy protrusions, semi-transparent with subtle internal luminosity, separated into 3 distinct columns

### 3. Triangulum Galaxy (`generateTriangulumTex`, line ~1358)
**Severity: Critical**
- Appears as an **enormous featureless gray/brown disc** — like a plain circle
- Zero visible spiral structure — should be a face-on loose spiral galaxy
- No contrast between arms and inter-arm regions
- No HII region clumps along arms (Triangulum is famous for NGC 604)
- Way too large for what it represents
- **Fix direction**: Need clearly visible (but loose/flocculent) spiral arms with higher fbm amplitude, blue arm color vs yellow/brown inter-arm, scattered bright HII knots along arms, reduce overall size

### 4. Ring Nebula / Helix Nebula (`generateRingNebTex` line ~1042, `generateHelixNebTex` line ~1420)
**Severity: Critical**
- The "radial cometary knots" create an **artificial starburst/sea-urchin pattern**
- Looks extremely geometric and algorithmic — regular spiky radial pattern
- Pink-purple color is somewhat unnatural
- The knot implementation clearly uses a naive angular repetition that produces a mechanical sunburst
- **Fix direction**: Cometary knots should be small, randomly scattered, irregularly spaced — NOT a regular radial pattern. The ring itself should be the dominant feature. Use randomized knot positions with varying sizes, not uniform angular distribution. Helix should show double-ring perspective effect.

### 5. Whirlpool Galaxy (`generateWhirlpoolTex`, line ~1154)
**Severity: High**
- Core is **extremely bright/blown-out white** — massively overexposed central region
- Spiral arms are visible but too faint relative to the overexposed core
- Companion galaxy (NGC 5195) barely visible
- Tidal bridge between main and companion too faint
- **Fix direction**: Dramatically reduce core brightness (clamp peak), boost arm contrast, make the 2 arms more distinct with dust lanes on inner edges, brighten companion galaxy and tidal bridge

### 6. Orion Nebula (`generateOrionNebTex`, line ~808)
**Severity: Medium**
- Texture looks **grainy/noisy** — insufficient smoothing or too high noise frequency
- Pink/green emission colors are present but not well separated spatially (real M42 has distinct H-alpha and OIII zones)
- Trapezium stars render as a single bright white dot (this is the real-time `drawTrapeziumStars` function, not the texture)
- The bright central cavity (Trapezium region) is not prominent enough
- Overall appears small relative to zone background
- **Fix direction**: Lower noise frequency for smoother large-scale structure, sharpen the spatial separation of pink (outer) and green/teal (inner cavity) zones, make the central cavity brighter and more defined, add dark absorption bays (like the "Fish's Mouth")

### 7. Crab Nebula (`generateCrabNebTex`, line ~928)
**Severity: Medium**
- Filamentary tendrils are present but look like uniform radial lines rather than tangled filaments
- Synchrotron blue core is too uniform
- Overall blob-like rather than showing the distinctive "crab" shape with irregular boundary
- **Fix direction**: Tendrils should be more tangled/intertwined (not purely radial), add more brightness variation along filaments, make the outer boundary more irregular

### 8. Butterfly Nebula (`generateButterflyNebTex`, line ~1539)
**Severity: Medium**
- Bipolar lobes are too symmetric and smooth
- The narrow waist/equatorial band is not defined enough
- **Fix direction**: Add asymmetry between lobes, more fbm-warped lobe boundaries, sharpen the equatorial dust torus

### 9. Rosette Nebula (`generateRosetteNebTex`, line ~1595)
**Severity: Low-Medium**
- The "petal structures" look like regular geometric arcs
- Central cavity is there but transition to shell is too smooth
- **Fix direction**: Make petals irregular, add dark globules inside the cavity, more filamentary detail in the shell

---

## Global Issues (All DSOs)

### A. Sizes too large
Several DSOs (Triangulum 0.14, Rosette 0.15, Lagoon 0.13, Sombrero 0.13) are enormous on screen. They dominate the scene and look unrealistic at that angular size.
- **Fix**: Cap most DSOs at 0.08-0.10 size. Galaxies (Andromeda, Whirlpool, Triangulum) can be 0.10-0.15 but need better detail to justify the size.

### B. Overall opacity/brightness
Some DSOs are too bright/opaque against the dark sky background when drawn with `lighter` compositing. They should be subtle glowing presences, not dominant blobs.
- **Fix**: Apply `globalAlpha` (0.4-0.7 range) when drawing textures. The current code draws them at full alpha.

### C. Texture resolution vs canvas size
The texture canvases use multipliers like `baseSz * 3` or `baseSz * 4` but some objects (especially large ones) may be getting upscaled and looking pixelated.
- **Fix**: Ensure pixel density is sufficient — minimum 1px per visual pixel. Consider generating at 2x for large objects.

### D. Noise correlation
All textures likely use similar noise offsets, which may cause pattern repetition/correlation between different DSOs.
- **Fix**: Ensure each generator uses unique noise seed offsets (spread across 1000+ range).

### E. Hard circular boundaries
Many DSOs have a visible hard circular cutoff where alpha drops to 0. This makes them look like they were stamped onto the canvas.
- **Fix**: Use softer radial falloff — cosine or gaussian taper in the outer 30% of radius.

---

## Architecture Notes

- All generator functions are standalone (outside the React component), at lines 676-1650
- Each follows the pattern: create offscreen canvas → get ImageData → write pixels via Uint32Array → putImageData → return canvas
- Noise functions available: `noise2d(x,y)` (Perlin), `fbm(x,y,octaves)` (fractal Brownian motion), `warpedNoise(x,y,scale,warp)` (domain-warped)
- DSO textures are stored in `dsoTextures: HTMLCanvasElement[]` inside the useEffect
- Generated by `generateDSOTextures()` which maps each DEEP_SKY entry to its generator function via switch
- Drawn in `drawFrame` inside the MW block with `lighter` compositing
- The `DEEP_SKY` array (line 385) holds positions, sizes, angles

## Priority Order
1. Horsehead (blocky silhouette) — most visually broken
2. Eagle (rectangular pillars) — equally broken
3. Ring/Helix (starburst knots) — very artificial
4. Triangulum (featureless disc) — no spiral visible
5. Whirlpool (blown-out core) — brightness balance
6. Global opacity/size fixes — affects all objects
7. Orion, Crab, Butterfly, Rosette — medium refinements
