# Hero Section — Debug & Fix Layered Text

## Problem
The hero title "ЛУННЫЙ СВЕТ" renders with **visible duplicate text layers** instead of a clean single title with glow behind it. Three `<h1>` elements are stacked:
1. **Main text** (`.hero-title`) — white glowing text, SplitText target
2. **Glow layer** (`.hero-glow-layer`) — supposed to be an invisible blurred glow behind main text, but renders as a visible blurry duplicate
3. **Shimmer layer** (`.hero-shimmer-text`) — supposed to be invisible except during gradient sweep, but shows as a blue-tinted visible duplicate

The result is a messy layered look with 2-3 copies of the text visible simultaneously.

## Root Causes to Investigate

### 1. Shimmer layer is NOT invisible between sweeps
The shimmer `<h1>` uses `background-clip: text` + `-webkit-text-fill-color: transparent`. The GSAP animation does `fromTo({ backgroundPosition: "200% center" }, { backgroundPosition: "-100% center" })` with `repeat: -1, repeatDelay: 6`. **After the first sweep completes**, the element sits at `backgroundPosition: "-100% center"` (the TO value). With `background-size: 300% 100%`, parts of the gradient may still be inside the visible area at that position, causing the shimmer text to be partially visible between sweeps.

**Fix idea**: Either set `onRepeat` callback to snap back to "200% center", or use `yoyo: false` + manually reset position, or just set the shimmer `opacity: 0` between sweeps via GSAP callbacks.

### 2. Glow layer is too visible even with blur(30px)
At `opacity: 0.35–0.7` (CSS breathing animation), `filter: blur(30px)` with `color: rgba(125,211,252,0.7)` and large text-shadow values, the glow duplicate is way too prominent. The large font size (clamp 3rem-13rem) means 30px blur is proportionally small — the glow text is still recognizable as text rather than a soft ambient light.

**Fix ideas**:
- Increase blur to 50-60px
- Reduce max opacity to 0.2-0.3
- OR: eliminate the glow `<h1>` entirely and just use `text-shadow` on the main `<h1>` for the breathing effect (simpler, fewer layers)

### 3. CSS specificity wars with Tailwind v4
The project uses Tailwind v4 (`@import "tailwindcss"` which creates CSS `@layer` cascades). Custom CSS in globals.css is unlayered (higher specificity than Tailwind layers), BUT some properties may still conflict. Previous attempts to fix via CSS classes failed — inline styles were needed.

## Files

- `src/components/sections/HeroSection.tsx` — the component with 3 stacked h1 elements
- `src/app/globals.css` — CSS classes for hero-title, hero-glow-layer, hero-shimmer-text, hero-title-wrap
- `src/lib/gsap.ts` — GSAP + SplitText + ScrollTrigger registration

## Tech Stack
- Next.js 15 (app router), React 19, Tailwind v4, GSAP 3.14 with SplitText plugin
- Russian text: "ЛУННЫЙ" (line 1) + "СВЕТ" (line 2) — Cyrillic
- Font: Cormorant Garamond (display serif)

## What Needs to Happen
1. **Read the current code** in HeroSection.tsx and globals.css
2. **Identify all visible duplicate layers** — figure out exactly which elements are visible and why
3. **Fix so that only ONE copy of the text is visible** — the main h1 with its text-shadow glow
4. The glow effect (breathing pulsation) should be a **soft ambient light behind the text**, not a readable second copy
5. The shimmer should be **completely invisible** except during the ~1.8s sweep every 8 seconds
6. Consider simplifying: if the glow `<h1>` approach keeps breaking, just use `text-shadow` animation on the main `<h1>` directly — it's a repaint during breathing but far better than a broken multi-layer mess
7. **Test visually** after changes — run `npm run dev` and verify in browser

## Key Constraint
The SplitText mask reveal animation on the main `<h1>` must continue to work. The glow/shimmer layers must not interfere with SplitText chars.
