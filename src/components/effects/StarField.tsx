"use client";

import { useEffect, useRef } from "react";

/* ================================================================
   PERLIN NOISE
   ================================================================ */
const PERM = new Uint8Array(512);
(() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function lerp(a: number, b: number, t: number) {
  return a + t * (b - a);
}
function grad2(hash: number, x: number, y: number) {
  const h = hash & 3;
  return (h & 1 ? -x : x) + (h & 2 ? -y : y);
}
function noise2d(x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);
  const aa = PERM[PERM[xi] + yi];
  const ab = PERM[PERM[xi] + yi + 1];
  const ba = PERM[PERM[xi + 1] + yi];
  const bb = PERM[PERM[xi + 1] + yi + 1];
  return lerp(
    lerp(grad2(aa, xf, yf), grad2(ba, xf - 1, yf), u),
    lerp(grad2(ab, xf, yf - 1), grad2(bb, xf - 1, yf - 1), u),
    v
  );
}
function fbm(x: number, y: number, oct: number, lac = 2.0, gain = 0.5): number {
  let val = 0,
    amp = 1,
    freq = 1,
    max = 0;
  for (let i = 0; i < oct; i++) {
    val += noise2d(x * freq, y * freq) * amp;
    max += amp;
    amp *= gain;
    freq *= lac;
  }
  return val / max;
}

/* ================================================================
   DOMAIN WARPING — organic nebula structures
   fbm(p + k * vec2(fbm(p+off1), fbm(p+off2)))
   ================================================================ */
function warpedNoise(
  x: number, y: number,
  scale: number, warpK: number, off: number
): { val: number; q1: number; q2: number } {
  const sx = x * scale, sy = y * scale;
  const q1 = fbm(sx + off, sy + off, 4);
  const q2 = fbm(sx + off + 52.3, sy + off + 31.7, 4);
  const val = fbm(sx + warpK * q1, sy + warpK * q2, 5);
  return { val, q1, q2 };
}

/* ================================================================
   SPECTRAL STAR COLORS (Morgan-Keenan classification)
   Real RGB values from blackbody radiation / CIE color matching
   ================================================================ */
const SPECTRAL: [number, number, number][] = [
  [155, 176, 255], // O — pale blue (>30,000K)
  [170, 191, 255], // B — light blue (10-30k K)
  [202, 215, 255], // A — blue-white (7.5-10k K)
  [248, 247, 255], // F — white (6-7.5k K)
  [255, 244, 234], // G — yellowish white (5.2-6k K, Sun)
  [255, 210, 161], // K — pale orange (3.7-5.2k K)
  [255, 204, 111], // M — orange (2.4-3.7k K)
];

/** Pick star color weighted by magnitude (brighter → hotter bias) */
function pickStarColor(mag: number): [number, number, number] {
  const r = Math.random();
  if (mag < 2) {
    // Bright: A-G dominant
    if (r < 0.05) return SPECTRAL[1];
    if (r < 0.18) return SPECTRAL[2];
    if (r < 0.38) return SPECTRAL[3];
    if (r < 0.62) return SPECTRAL[4];
    if (r < 0.85) return SPECTRAL[5];
    return SPECTRAL[6];
  }
  if (mag < 4) {
    // Medium: K/M dominant
    if (r < 0.03) return SPECTRAL[2];
    if (r < 0.12) return SPECTRAL[3];
    if (r < 0.28) return SPECTRAL[4];
    if (r < 0.58) return SPECTRAL[5];
    return SPECTRAL[6];
  }
  // Dim/dust: overwhelmingly K/M, heavily desaturated
  if (r < 0.05) return SPECTRAL[4];
  if (r < 0.22) return SPECTRAL[5];
  return SPECTRAL[6];
}

/** Desaturate toward white (dimmer stars look more neutral) */
function desat(c: [number, number, number], mag: number): [number, number, number] {
  const d = mag > 5 ? 0.72 : mag > 3 ? 0.42 : 0.15;
  return [c[0] + (255 - c[0]) * d, c[1] + (255 - c[1]) * d, c[2] + (255 - c[2]) * d];
}

/* ================================================================
   TYPES
   ================================================================ */
// 0=dust 1=distant 2=medium 3=close 4=feature 5=double 6=galaxy
const LAYER_PARALLAX = [0, 0.005, 0.025, 0.065, 0.14, 0.065, 0.008];
const NEBULA_PARALLAX = 0.003;
const MOUSE_PARALLAX = [0, 2, 5, 10, 18, 10, 1.5];     // px shift per layer
const DRIFT_SPEED    = [0, 0.03, 0.08, 0.15, 0.25, 0.15, 0.02]; // px/sec
const DRIFT_DIR_X = 0.7, DRIFT_DIR_Y = -0.3;            // direction vector

// Spiral descent camera — helix projected onto 2D
// Main axis: diagonal down-left (-0.707, +0.707) — the "descent" (canvas Y+ = down)
// Perpendicular axis: (+0.707, +0.707) — 90° CW from descent direction
const DESCENT_RANGE   = 8500;  // total world-unit travel along diagonal
const HELIX_TURNS     = 4;     // full rotations over entire scroll (felt across all 5 zones)
const HELIX_RADIUS    = 250;   // world units — constrained so dY/dt > 0 always
// Diagonal direction (normalized) — down-left in canvas coords
const DIAG_X = -0.707;
const DIAG_Y =  0.707;
// Perpendicular direction (normalized, 90° CW from diagonal)
const PERP_X =  0.707;
const PERP_Y =  0.707;
// Camera parallax per layer — much larger than LAYER_PARALLAX (mouse/drift)
// so the diagonal flight covers multiple screen widths for foreground layers
//   dust  dist   med   close  feat   dbl    gal
const CAM_PARALLAX = [0.01, 0.05, 0.16, 0.38, 0.70, 0.38, 0.03];
// Oversized texture padding (screen px) — extra margin so textures never need to tile/wrap
// Values exceed max camera + drift + mouse offsets for each texture type
const MW_PAD = 400;   // MW layers: max offset ~313px
const NEB_PAD = 160;  // zone nebulae: max offset ~124px

const FOG_LAYERS: { afterLayer: number; color: [number, number, number]; alpha: number }[] = [
  { afterLayer: 0, color: [8, 12, 28],  alpha: 0.12 },   // heavy haze over dust
  { afterLayer: 1, color: [10, 14, 32], alpha: 0.06 },   // medium over distant
  { afterLayer: 2, color: [12, 16, 30], alpha: 0.025 },  // light over medium
];

const DEPTH_TINT: [number, number, number][] = [
  [0.82, 0.86, 1.18],  // 0 dust: strong cool blue
  [0.88, 0.90, 1.12],  // 1 distant: moderate cool
  [0.96, 0.96, 1.04],  // 2 medium: near neutral
  [1.00, 1.00, 1.00],  // 3 close: neutral
  [1.04, 0.98, 0.94],  // 4 feature: slight warm
  [1.02, 0.99, 0.96],  // 5 double: slight warm
  [0.90, 0.92, 1.10],  // 6 galaxy: cool
];

const DUST_PARTICLE_COUNT = 15;
const DUST_MOUSE_PARALLAX = 36;
const DEEP_FIELD_COUNT_DESKTOP = 4000;
const DEEP_FIELD_COUNT_MOBILE = 1000;
const DEEP_FIELD_SCALE = 0.5;

interface Star {
  x: number; y: number; mag: number;
  baseColor: [number, number, number];
  nSeed: number; size: number; brightness: number; layer: number;
  parallaxMod: number;  // 0.85..1.15 per-star variation
  cx?: number; cy?: number; // double-star companion
  cMag?: number; cColor?: [number, number, number];
  cSize?: number; cBright?: number;
  orbPeriod?: number; orbPhase?: number; orbSep?: number;
  dustDim?: number;
  // Pre-rendered sprite (layers 2-5)
  sprite?: HTMLCanvasElement;
  spriteHalf?: number;
  // Pre-computed tinted fill for fast drawing (layers 0-1)
  tintedFill?: string;
  // Companion sprite (layer 5)
  compSprite?: HTMLCanvasElement;
  compSpriteHalf?: number;
}

interface GalaxyObj {
  x: number; y: number;
  rx: number; ry: number; angle: number;
  color: [number, number, number];
  brightness: number; nSeed: number;
  parallaxMod: number;  // 0.85..1.15 per-galaxy variation
}

interface ShootingStar {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  len: number;
  width: number;
  color: [number, number, number];
}

interface DustParticle {
  x: number; y: number;
  size: number;
  alpha: number;
  driftPhase: number;
}

interface MWWisp {
  cx: number;       // normalized x along MW band (0..1)
  cy: number;       // derived y from MW center line
  radius: number;   // gradient radius px
  baseAlpha: number; // 0.15-0.30 (bright!)
  phaseA: number;   // alpha oscillation phase
  phaseD: number;   // drift phase
  speedA: number;   // alpha speed (rad/sec)
  speedD: number;   // drift speed
  color: [number, number, number];
}

/* ================================================================
   ZONE DEFINITIONS — each zone = a unique region of space
   ================================================================ */
interface ZoneNebConf {
  noiseOff: number; scale: number; warpK: number;
  density: number; falloff: number;
  c1: [number, number, number]; c2: [number, number, number];
  peak: number; // max RGB output
}

interface UniverseZone {
  scrollStart: number; scrollEnd: number;
  colorWash: [number, number, number]; washOp: number;
  starBrightMod: number;
  neb: ZoneNebConf;
}

const ZONES: UniverseZone[] = [
  // Zone 0 — "Golden Veil" (Hero): warm H-alpha emission
  {
    scrollStart: 0, scrollEnd: 0.32,
    colorWash: [255, 180, 80], washOp: 0.03,
    starBrightMod: 1.0,
    neb: {
      noiseOff: 0, scale: 0.008, warpK: 3.5,
      density: 0.15, falloff: 2.8,
      c1: [255, 130, 60], c2: [200, 80, 45],
      peak: 140,
    },
  },
  // Zone 1 — "Emerald Reef" (Services): OIII star-forming region
  {
    scrollStart: 0.08, scrollEnd: 0.48,
    colorWash: [40, 190, 130], washOp: 0.025,
    starBrightMod: 1.0,
    neb: {
      noiseOff: 100, scale: 0.01, warpK: 4.0,
      density: 0.12, falloff: 2.6,
      c1: [45, 210, 140], c2: [70, 175, 200],
      peak: 125,
    },
  },
  // Zone 2 — "Ice Abyss" (Cases): blue reflection nebula
  {
    scrollStart: 0.25, scrollEnd: 0.65,
    colorWash: [50, 85, 200], washOp: 0.035,
    starBrightMod: 0.82,
    neb: {
      noiseOff: 200, scale: 0.007, warpK: 2.8,
      density: 0.10, falloff: 3.2,
      c1: [40, 80, 210], c2: [25, 45, 155],
      peak: 115,
    },
  },
  // Zone 3 — "Purple Rift" (About + Demo): dramatic nebula
  {
    scrollStart: 0.42, scrollEnd: 0.85,
    colorWash: [140, 50, 180], washOp: 0.03,
    starBrightMod: 0.88,
    neb: {
      noiseOff: 300, scale: 0.009, warpK: 4.2,
      density: 0.18, falloff: 2.4,
      c1: [165, 55, 190], c2: [200, 80, 140],
      peak: 145,
    },
  },
  // Zone 4 — "Edge of Universe" (Blog + Footer): near void
  {
    scrollStart: 0.60, scrollEnd: 1.0,
    colorWash: [12, 12, 35], washOp: 0.05,
    starBrightMod: 0.3,
    neb: {
      noiseOff: 400, scale: 0.005, warpK: 1.5,
      density: 0.04, falloff: 4.0,
      c1: [22, 28, 65], c2: [12, 18, 45],
      peak: 35,
    },
  },
];

/* ================================================================
   UTILITIES
   ================================================================ */
function pick<T>(a: T[]): T { return a[(Math.random() * a.length) | 0]; }
function clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v; }
function gaussR(c: number, s: number) {
  return c + Math.sqrt(-2 * Math.log(Math.random() || 1e-4)) * Math.cos(2 * Math.PI * Math.random()) * s;
}
function smoothstep(t: number): number { return t * t * (3 - 2 * t); }
function magToSize(mag: number): number { return 0.25 * Math.pow(1.7, 7 - mag); }
function magToBrightness(mag: number): number {
  return clamp(Math.pow(2.512, (6 - mag) / 3) * 0.15, 0.06, 1.0);
}
function posScint(ny: number): number {
  const z = clamp((ny - 0.15) / 0.85, 0, 1);
  return 0.3 + z * z * 2.5;
}
function mwBand(nx: number, ny: number): number {
  const d = Math.abs(-0.65 * nx - ny + 0.82) / 1.192;
  if (d > 0.22) return 0;
  const t = 1 - d / 0.22;
  return t * t;
}
function zWeight(sn: number, s: number, e: number): number {
  const m = 0.18;
  if (sn < s || sn > e) return 0;
  let w = 1;
  if (sn < s + m) w = (sn - s) / m;
  if (sn > e - m) w = Math.min(w, (e - sn) / m);
  return smoothstep(clamp(w, 0, 1));
}
function getCounts(w: number) {
  return w < 768
    ? { dust: 600, dist: 150, med: 60, close: 28, feat: 5, dbl: 2, gal: 2 }
    : { dust: 2400, dist: 550, med: 200, close: 70, feat: 8, dbl: 3, gal: 3 };
}

/* ================================================================
   SPIRAL CAMERA — compute helix position from scroll progress
   Linear descent along diagonal + sinusoidal perpendicular oscillation
   ================================================================ */
function helixPosition(progress: number): [number, number] {
  const t = clamp(progress, 0, 1);
  // Linear descent along the diagonal
  const mainX = t * DESCENT_RANGE * DIAG_X;
  const mainY = t * DESCENT_RANGE * DIAG_Y;
  // Helix rotation — oscillation perpendicular to descent
  const angle = t * Math.PI * 2 * HELIX_TURNS;
  const perpOsc = Math.cos(angle) * HELIX_RADIUS;
  const diagOsc = Math.sin(angle) * HELIX_RADIUS * 0.3; // subtle depth variation along descent axis
  return [
    mainX + perpOsc * PERP_X + diagOsc * DIAG_X,
    mainY + perpOsc * PERP_Y + diagOsc * DIAG_Y,
  ];
}

/** Draw an image with seamless tiling (360° wrap on both axes) */
function drawWrapped(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  ox: number, oy: number,
  w: number, h: number
) {
  // Normalize offset into [0, w) / [0, h)
  const nx = ((ox % w) + w) % w;
  const ny = ((oy % h) + h) % h;
  // Primary tile
  ctx.drawImage(img, -nx, -ny, w, h);
  // Right seam
  if (nx > 0) ctx.drawImage(img, w - nx, -ny, w, h);
  // Bottom seam
  if (ny > 0) ctx.drawImage(img, -nx, h - ny, w, h);
  // Corner seam
  if (nx > 0 && ny > 0) ctx.drawImage(img, w - nx, h - ny, w, h);
}

/* ================================================================
   SPECIAL OBJECT RENDERERS
   ================================================================ */
function drawSpiralGalaxy(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  tilt: number, rot: number, opacity: number, time: number
) {
  if (opacity < 0.01) return;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(1, tilt);
  // Core glow
  let grd = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.18);
  grd.addColorStop(0, `rgba(255,245,220,${opacity * 0.7})`);
  grd.addColorStop(0.5, `rgba(255,220,160,${opacity * 0.3})`);
  grd.addColorStop(1, `rgba(200,180,140,0)`);
  ctx.beginPath(); ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = grd; ctx.fill();
  // Disk
  grd = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.55);
  grd.addColorStop(0, `rgba(160,160,200,${opacity * 0.12})`);
  grd.addColorStop(0.6, `rgba(140,150,190,${opacity * 0.04})`);
  grd.addColorStop(1, `rgba(130,140,170,0)`);
  ctx.beginPath(); ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = grd; ctx.fill();
  // Spiral arms
  const t0 = time * 0.00002;
  for (let arm = 0; arm < 2; arm++) {
    const ao = arm * Math.PI;
    for (let i = 0; i < 65; i++) {
      const t = i / 65;
      const r = size * 0.06 + size * 0.8 * t;
      const th = ao + t * 2.8 * Math.PI;
      const jx = noise2d(arm * 50 + i * 0.3, t0) * size * 0.025;
      const jy = noise2d(arm * 50 + i * 0.3 + 100, t0) * size * 0.025;
      const ds = (1 - t * 0.6) * 1.2 + 0.3;
      const da = opacity * (1 - t * 0.5) * 0.4;
      if (da < 0.008) continue;
      const w = (noise2d(arm * 30 + i * 0.5, 0) + 1) * 0.5;
      ctx.beginPath();
      ctx.arc(Math.cos(th) * r + jx, Math.sin(th) * r + jy, ds, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${(160 + w * 80) | 0},${(170 + w * 50) | 0},${(220 - w * 30) | 0},${da})`;
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawPlanetaryNebula(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  opacity: number, _time: number
) {
  if (opacity < 0.01) return;
  ctx.save(); ctx.translate(cx, cy);
  // Soft outer shell — elliptical, no hard edges
  ctx.save(); ctx.scale(1, 0.7);
  const outer = ctx.createRadialGradient(0, 0, size * 0.15, 0, 0, size * 0.85);
  outer.addColorStop(0, `rgba(80,200,180,0)`);
  outer.addColorStop(0.3, `rgba(70,190,170,${opacity * 0.08})`);
  outer.addColorStop(0.55, `rgba(100,140,190,${opacity * 0.12})`);
  outer.addColorStop(0.75, `rgba(120,80,170,${opacity * 0.06})`);
  outer.addColorStop(1, `rgba(60,40,120,0)`);
  ctx.beginPath(); ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
  ctx.fillStyle = outer; ctx.fill();
  ctx.restore();
  // Inner glow
  const ig = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.3);
  ig.addColorStop(0, `rgba(180,230,245,${opacity * 0.12})`);
  ig.addColorStop(0.5, `rgba(100,170,200,${opacity * 0.04})`);
  ig.addColorStop(1, `rgba(80,100,180,0)`);
  ctx.beginPath(); ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = ig; ctx.fill();
  // Central star — tiny soft dot
  const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.04);
  sg.addColorStop(0, `rgba(220,240,255,${opacity * 0.4})`);
  sg.addColorStop(1, `rgba(200,220,255,0)`);
  ctx.beginPath(); ctx.arc(0, 0, size * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = sg; ctx.fill();
  ctx.restore();
}

function drawGlobularCluster(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number, opacity: number
) {
  if (opacity < 0.01) return;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.35);
  g.addColorStop(0, `rgba(255,235,185,${opacity * 0.35})`);
  g.addColorStop(0.4, `rgba(255,215,155,${opacity * 0.12})`);
  g.addColorStop(1, `rgba(200,180,140,0)`);
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  for (let i = 0; i < 100; i++) {
    const nr = (noise2d(i * 0.37, 0.5) + 1) * 0.5;
    const dist = nr * nr * size * 0.95;
    const ang = (noise2d(i * 0.41, 1.5) + 1) * Math.PI * 2;
    const sx = cx + Math.cos(ang) * dist;
    const sy = cy + Math.sin(ang) * dist;
    const frac = dist / size;
    const so = opacity * clamp(1 - frac, 0.05, 1) * 0.4;
    const ss = 0.3 + (1 - frac) * 0.8;
    const w = (noise2d(i * 0.6, 3) + 1) * 0.5;
    ctx.beginPath(); ctx.arc(sx, sy, ss, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${(230 + w * 25) | 0},${(195 + w * 40) | 0},${(125 + w * 55) | 0},${so})`;
    ctx.fill();
  }
}

function drawStarFormingKnots(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  opacity: number, time: number
) {
  if (opacity < 0.01) return;
  const t = time * 0.00008;
  const knots = [
    { dx: -0.3, dy: -0.15, r: 0.22 },
    { dx: 0.2, dy: -0.25, r: 0.18 },
    { dx: 0.1, dy: 0.2, r: 0.24 },
    { dx: -0.18, dy: 0.18, r: 0.16 },
    { dx: 0.0, dy: -0.05, r: 0.20 },
  ];
  for (const k of knots) {
    const kx = cx + k.dx * size;
    const ky = cy + k.dy * size;
    const kr = k.r * size;
    // Gentle drift instead of jitter
    const dx = noise2d(t + k.dx * 10, t * 0.5 + k.dy * 10) * 3;
    const dy = noise2d(t + k.dx * 10 + 50, t * 0.5 + k.dy * 10 + 50) * 3;
    const g = ctx.createRadialGradient(kx + dx, ky + dy, 0, kx + dx, ky + dy, kr);
    g.addColorStop(0, `rgba(80,220,160,${opacity * 0.18})`);
    g.addColorStop(0.3, `rgba(55,180,140,${opacity * 0.08})`);
    g.addColorStop(0.6, `rgba(40,140,120,${opacity * 0.025})`);
    g.addColorStop(1, `rgba(30,100,100,0)`);
    ctx.beginPath(); ctx.arc(kx + dx, ky + dy, kr, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
  }
}

/* ================================================================
   COMPONENT
   ================================================================ */
export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // OPT: alpha:false skips compositing with page background (opaque starfield)
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animId: number;
    let lw = 0, lh = 0;
    let starsByLayer: Star[][] = [];
    let galaxies: GalaxyObj[] = [];
    let deepFieldCanvas: HTMLCanvasElement | null = null;
    let dustParticles: DustParticle[] = [];
    let shootingStars: ShootingStar[] = [];
    let mwLayers: HTMLCanvasElement[] = [];
    let mwWisps: MWWisp[] = [];
    let zoneNebulae: HTMLCanvasElement[] = [];
    let scrollY = 0;
    let maxScroll = 1;
    let smoothScroll = 0;
    let prevTime = 0;
    let currentStarMod = 1;
    let smoothWeights = ZONES.map(() => 0);
    let mouseX = 0, mouseY = 0;              // normalized -0.5..+0.5
    let smoothMouseX = 0, smoothMouseY = 0;   // lerped
    let driftTime = 0;                        // accumulated seconds
    // Diagonal camera position (world-space, lerped toward helix target)
    let smoothCameraX = 0;
    let smoothCameraY = 0;
    // Adaptive quality: 1.0 = full, reduced when FPS drops
    let qualityLevel = 1.0;
    let fpsAccum = 0;
    let fpsFrames = 0;
    let prevCamX = 0, prevCamY = 0;
    let camVelX = 0, camVelY = 0;
    let nextShootTime = 0;
    let dustGrid: Float32Array | null = null;
    const DUST_GRID_SIZE = 64;

    const onScroll = () => {
      scrollY = window.scrollY;
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      lw = window.innerWidth; lh = window.innerHeight;
      canvas.width = lw * dpr; canvas.height = lh * dpr;
      canvas.style.width = lw + "px"; canvas.style.height = lh + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      onScroll();
    };

    /* ---- MW layers: 2 full-scene textures with different noise seeds ---- */
    /* Crossfaded + drifted against each other → shape morphs over time    */
    const generateMWLayers = () => {
      // Oversized: padding avoids tiling seams (texture never wraps)
      const mwPadW = Math.ceil(MW_PAD / 3), mwPadH = Math.ceil(MW_PAD / 3);
      const vpW = Math.ceil(lw / 3), vpH = Math.ceil(lh / 3);
      const nw = vpW + mwPadW * 2, nh = vpH + mwPadH * 2;
      mwLayers = [];

      // Two full MW textures with different domain-warp noise
      const layerConfigs = [
        { noiseOff: 300, warpK: 2.5, mwR: 220, mwG: 180, mwB: 100 },  // original warm
        { noiseOff: 517, warpK: 3.3, mwR: 200, mwG: 190, mwB: 115 },  // shifted, slightly cooler
      ];

      for (const cfg of layerConfigs) {
        const nc = document.createElement("canvas");
        nc.width = nw; nc.height = nh;
        const nctx = nc.getContext("2d", { willReadFrequently: true })!;
        const imgData = nctx.createImageData(nw, nh);
        const buf = new ArrayBuffer(imgData.data.length);
        const u8 = new Uint8ClampedArray(buf);
        const u32 = new Uint32Array(buf);

        for (let py = 0; py < nh; py++) {
          for (let px = 0; px < nw; px++) {
            // Viewport-relative coords: 0..1 maps to viewport, <0 and >1 in padding
            const nx = (px - mwPadW) / vpW, ny = (py - mwPadH) / vpH;
            const sx = px / 90, sy = py / 90;
            let r = 10, g = 14, b = 26;

            const mw = mwBand(nx, ny);
            if (mw > 0) {
              const { val: n4, q1 } = warpedNoise(sx, sy, 0.8, cfg.warpK, cfg.noiseOff);
              const n4n = (n4 + 1) * 0.5;
              const riftDk = q1 < -0.15 ? Math.min(1, (-q1 - 0.15) * 4) : 0;
              const int = mw * n4n * 0.8 * (1 - riftDk * 0.85);
              r += cfg.mwR * int; g += cfg.mwG * int; b += cfg.mwB * int;
            }

            const dn = fbm(sx * 0.6 + 400, sy * 0.6 + 400, 5);
            if (dn < -0.08) {
              const dk = Math.min(1, (-dn - 0.08) * 2.8);
              r *= 1 - dk * 0.78; g *= 1 - dk * 0.78; b *= 1 - dk * 0.78;
            }

            const darkN = fbm(sx * 0.4 + 600, sy * 0.4 + 600, 4);
            if (darkN > 0.35) {
              const dk = Math.min(1, (darkN - 0.35) * 5);
              r *= 1 - dk * 0.9; g *= 1 - dk * 0.9; b *= 1 - dk * 0.9;
            }

            const bgn = (fbm(sx * 0.25 + 700, sy * 0.25 + 700, 3) + 1) * 0.5;
            r += bgn * 5; g += bgn * 3; b += bgn * 8;

            // Vignette removed — texture tiles via drawWrapped, vignette created visible seams

            u32[py * nw + px] =
              (255 << 24) |
              (clamp(b, 0, 255) << 16) |
              (clamp(g, 0, 255) << 8) |
              clamp(r, 0, 255);
          }
        }
        imgData.data.set(u8);
        nctx.putImageData(imgData, 0, 0);
        mwLayers.push(nc);
      }
    };

    /* ---- Domain-warped zone nebulae (pre-computed per zone) ---- */
    const generateZoneNebulae = () => {
      // Oversized: padding avoids tiling seams
      const nebPadW = Math.ceil(NEB_PAD / 5), nebPadH = Math.ceil(NEB_PAD / 5);
      const nw = Math.ceil(lw / 5) + nebPadW * 2, nh = Math.ceil(lh / 5) + nebPadH * 2;
      zoneNebulae = ZONES.map((zone) => {
        const nc = document.createElement("canvas");
        nc.width = nw; nc.height = nh;
        const nctx = nc.getContext("2d", { willReadFrequently: true })!;
        const imgData = nctx.createImageData(nw, nh);
        const buf = new ArrayBuffer(imgData.data.length);
        const u8 = new Uint8ClampedArray(buf);
        const u32 = new Uint32Array(buf);
        const nb = zone.neb;

        for (let py = 0; py < nh; py++) {
          for (let px = 0; px < nw; px++) {
            const nx = px / nw, ny = py / nh;

            // Domain-warped noise
            const { val, q1, q2 } = warpedNoise(
              px, py, nb.scale, nb.warpK, nb.noiseOff
            );

            // Density with threshold and falloff
            const density = Math.pow(
              Math.max(0, val * 0.5 + 0.5 + nb.density),
              nb.falloff
            );

            // Vignette removed — texture tiles via drawWrapped, vignette created visible seams

            // Color mixing using warp vectors
            const colorMix = clamp((q1 + 1) * 0.5, 0, 1);
            const int = density * nb.peak;
            const r = lerp(nb.c1[0], nb.c2[0], colorMix) * int / 255;
            const g = lerp(nb.c1[1], nb.c2[1], colorMix) * int / 255;
            const b = lerp(nb.c1[2], nb.c2[2], colorMix) * int / 255;

            // Secondary color variation from q2 (adds richness)
            const r2 = r + q2 * int * 0.08;
            const g2 = g + q2 * int * 0.05;
            const b2 = b - q2 * int * 0.03;

            u32[py * nw + px] =
              (255 << 24) |
              (clamp(b2, 0, 255) << 16) |
              (clamp(g2, 0, 255) << 8) |
              clamp(r2, 0, 255);
          }
        }
        imgData.data.set(u8);
        nctx.putImageData(imgData, 0, 0);
        return nc;
      });
    };

    /* ---- Deep field background (sub-pixel static dots behind everything) ---- */
    const generateDeepField = () => {
      const scale = DEEP_FIELD_SCALE;
      const dw = Math.ceil(lw * scale);
      const dh = Math.ceil(lh * scale);
      const dc = document.createElement("canvas");
      dc.width = dw; dc.height = dh;
      const dctx = dc.getContext("2d")!;
      const count = lw < 768 ? DEEP_FIELD_COUNT_MOBILE : DEEP_FIELD_COUNT_DESKTOP;
      const dfm = 50; // edge margin in texture px — dots near edges duplicated to opposite side
      for (let i = 0; i < count; i++) {
        const x = Math.random() * dw;
        const y = Math.random() * dh;
        const sz = 0.2 + Math.random() * 0.3;
        const a = 0.03 + Math.random() * 0.05;
        const w = Math.random();
        const r = 160 + w * 60;
        const g = 170 + w * 50;
        const b = 200 + w * 55;
        dctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`;
        const dot = (dx: number, dy: number) => { dctx.beginPath(); dctx.arc(dx, dy, sz, 0, Math.PI * 2); dctx.fill(); };
        dot(x, y);
        // Duplicate near edges for seamless wrap in drawWrapped
        if (x < dfm) dot(x + dw, y);
        if (x > dw - dfm) dot(x - dw, y);
        if (y < dfm) dot(x, y + dh);
        if (y > dh - dfm) dot(x, y - dh);
        if (x < dfm && y < dfm) dot(x + dw, y + dh);
        if (x > dw - dfm && y < dfm) dot(x - dw, y + dh);
        if (x < dfm && y > dh - dfm) dot(x + dw, y - dh);
        if (x > dw - dfm && y > dh - dfm) dot(x - dw, y - dh);
      }
      deepFieldCanvas = dc;
    };

    /* ---- Foreground dust particles ---- */
    const initDustParticles = () => {
      dustParticles = [];
      for (let i = 0; i < DUST_PARTICLE_COUNT; i++) {
        dustParticles.push({
          x: Math.random() * lw,
          y: Math.random() * lh,
          size: 2 + Math.random() * 3,
          alpha: 0.02 + Math.random() * 0.04,
          driftPhase: Math.random() * 1000,
        });
      }
    };

    /* ---- MW wisps (bright drifting luminous blobs along Milky Way) ---- */
    const initMWWisps = () => {
      mwWisps = [];
      const count = lw < 768 ? 7 : 12;
      const minDim = Math.min(lw, lh);
      const WISP_COLORS: [number, number, number][] = [
        [255, 220, 120],  // bright gold
        [240, 210, 160],  // cream
        [255, 200, 90],   // saturated gold
      ];
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count + (Math.random() - 0.5) * 0.06;
        const cx = clamp(t, 0.02, 0.98);
        // MW center line: ny = 0.82 - 0.65*nx, with perpendicular scatter
        const cy = 0.82 - 0.65 * cx + (Math.random() - 0.5) * 0.10;
        mwWisps.push({
          cx,
          cy,
          radius: minDim * (0.12 + Math.random() * 0.15),
          baseAlpha: 0.15 + Math.random() * 0.15,
          phaseA: Math.random() * Math.PI * 2,
          phaseD: Math.random() * Math.PI * 2,
          speedA: 0.12 + Math.random() * 0.08,
          speedD: 0.05 + Math.random() * 0.04,
          color: WISP_COLORS[(Math.random() * WISP_COLORS.length) | 0],
        });
      }
    };

    /* ---- Dust lane grid (pre-computed, matches MW texture noise) ---- */
    const generateDustGrid = () => {
      const G = DUST_GRID_SIZE;
      dustGrid = new Float32Array(G * G);
      const mwPadW = Math.ceil(MW_PAD / 3);
      const mwPadH = Math.ceil(MW_PAD / 3);
      const vpW = Math.ceil(lw / 3);
      const vpH = Math.ceil(lh / 3);
      for (let gy = 0; gy < G; gy++) {
        for (let gx = 0; gx < G; gx++) {
          const nx = gx / (G - 1), ny = gy / (G - 1);
          const px = nx * vpW + mwPadW, py = ny * vpH + mwPadH;
          const sx = px / 90, sy = py / 90;
          let dim = 0;
          const mw = mwBand(nx, ny);
          if (mw > 0.05) {
            const dn = fbm(sx * 0.6 + 400, sy * 0.6 + 400, 5);
            if (dn < -0.08) dim = Math.max(dim, Math.min(1, (-dn - 0.08) * 2.8) * 0.6 * mw);
            const darkN = fbm(sx * 0.4 + 600, sy * 0.4 + 600, 4);
            if (darkN > 0.35) dim = Math.max(dim, Math.min(1, (darkN - 0.35) * 5) * 0.7 * mw);
          }
          dustGrid[gy * G + gx] = dim;
        }
      }
    };

    const sampleDustGrid = (nx: number, ny: number): number => {
      if (!dustGrid) return 0;
      const G = DUST_GRID_SIZE;
      const gx = clamp(nx * (G - 1), 0, G - 2);
      const gy = clamp(ny * (G - 1), 0, G - 2);
      const ix = gx | 0, iy = gy | 0;
      const fx = gx - ix, fy = gy - iy;
      const ix1 = ix + 1, iy1 = iy + 1;
      return (
        dustGrid[iy * G + ix] * (1 - fx) * (1 - fy) +
        dustGrid[iy * G + ix1] * fx * (1 - fy) +
        dustGrid[iy1 * G + ix] * (1 - fx) * fy +
        dustGrid[iy1 * G + ix1] * fx * fy
      );
    };

    const computeStarDustDim = () => {
      for (const layer of starsByLayer) {
        for (const s of layer) {
          s.dustDim = sampleDustGrid(s.x / lw, s.y / lh);
        }
      }
    };

    /* ---- Star generation ---- */
    const initStars = () => {
      const w = lw, h = lh;
      const c = getCounts(w);
      const cls = [
        { x: w * 0.3, y: h * 0.28, r: Math.min(w, h) * 0.13 },
        { x: w * 0.7, y: h * 0.5, r: Math.min(w, h) * 0.11 },
        { x: w * 0.5, y: h * 0.15, r: Math.min(w, h) * 0.09 },
      ];
      starsByLayer = Array.from({ length: 7 }, () => []); galaxies = []; shootingStars = [];
      let seed = 0;

      const sampleMW = (): [number, number] => {
        let bx = Math.random() * w, by = Math.random() * h, bd = 0;
        for (let j = 0; j < 10; j++) {
          const tx = Math.random() * w, ty = Math.random() * h;
          const d2 = mwBand(tx / w, ty / h);
          if (d2 > bd) { bd = d2; bx = tx; by = ty; }
        }
        return [bx, by];
      };

      const make = (x: number, y: number, mag: number, layer: number): Star => {
        const col = desat(pickStarColor(mag), mag);
        return {
          x, y, mag, baseColor: col as [number, number, number],
          nSeed: seed++, size: magToSize(mag),
          brightness: magToBrightness(mag), layer,
          parallaxMod: 0.85 + Math.random() * 0.3,
        };
      };

      // Layer 0: Dust
      for (let i = 0; i < c.dust; i++) {
        let x: number, y: number;
        const roll = Math.random();
        if (roll < 0.45) { [x, y] = sampleMW(); }
        else if (roll < 0.6) {
          const cl = pick(cls);
          x = clamp(gaussR(cl.x, cl.r * 0.4), 0, w);
          y = clamp(gaussR(cl.y, cl.r * 0.4), 0, h);
        } else { x = Math.random() * w; y = Math.random() * h; }
        const mag = 6.5 + Math.pow(Math.random(), 0.7); // skewed dim
        starsByLayer[0].push(make(x, y, mag - mwBand(x / w, y / h) * 0.5, 0));
      }
      // Layer 1: Distant (MW-biased clustering)
      for (let i = 0; i < c.dist; i++) {
        let x: number, y: number;
        const roll = Math.random();
        if (roll < 0.35) { [x, y] = sampleMW(); }
        else if (roll < 0.50) {
          const cl = pick(cls);
          x = clamp(gaussR(cl.x, cl.r * 0.6), 0, w);
          y = clamp(gaussR(cl.y, cl.r * 0.6), 0, h);
        } else { x = Math.random() * w; y = Math.random() * h; }
        starsByLayer[1].push(make(x, y, Math.random() * 1.5 + 5.0, 1));
      }
      // Layer 2: Medium (MW-biased)
      for (let i = 0; i < c.med; i++) {
        let x: number, y: number;
        if (Math.random() < 0.3) { [x, y] = sampleMW(); }
        else { x = Math.random() * w; y = Math.random() * h; }
        starsByLayer[2].push(make(x, y, Math.random() * 2 + 3, 2));
      }
      // Layer 3: Close (slight MW bias)
      for (let i = 0; i < c.close; i++) {
        let x: number, y: number;
        if (Math.random() < 0.2) { [x, y] = sampleMW(); }
        else { x = Math.random() * w; y = Math.random() * h; }
        starsByLayer[3].push(make(x, y, Math.random() * 1.5 + 1.5, 3));
      }
      // Layer 4: Feature
      for (let i = 0; i < c.feat; i++)
        starsByLayer[4].push(make(
          Math.random() * w * 0.8 + w * 0.1,
          Math.random() * h * 0.6 + h * 0.08,
          Math.random() * 1.5, 4));
      // Layer 5: Double stars
      for (let i = 0; i < c.dbl; i++) {
        const x = Math.random() * w * 0.7 + w * 0.15;
        const y = Math.random() * h * 0.6 + h * 0.1;
        const mag = Math.random() + 1.5;
        const sep = 5 + Math.random() * 10;
        const ang = Math.random() * Math.PI * 2;
        const s = make(x, y, mag, 5);
        s.cx = x + Math.cos(ang) * sep;
        s.cy = y + Math.sin(ang) * sep;
        s.cMag = mag + (Math.random() - 0.3) * 1.5;
        s.cColor = desat(pickStarColor(s.cMag), s.cMag) as [number, number, number];
        s.cSize = magToSize(s.cMag);
        s.cBright = magToBrightness(s.cMag);
        s.orbPeriod = 20 + Math.random() * 40;
        s.orbPhase = Math.random() * Math.PI * 2;
        s.orbSep = sep;
        starsByLayer[5].push(s);
      }
      // Layer 6: Galaxies
      for (let i = 0; i < c.gal; i++) {
        galaxies.push({
          x: Math.random() * w * 0.8 + w * 0.1,
          y: Math.random() * h * 0.7 + h * 0.1,
          rx: 8 + Math.random() * 14, ry: 2.5 + Math.random() * 5,
          angle: Math.random() * Math.PI,
          color: pick([
            [180, 170, 200], [200, 190, 160],
            [160, 180, 210], [190, 170, 150],
          ] as [number, number, number][]),
          brightness: 0.18 + Math.random() * 0.22,
          nSeed: seed++,
          parallaxMod: 0.85 + Math.random() * 0.3,
        });
      }
    };

    /* ---- Pre-render star sprites (eliminates per-frame gradient creation) ---- */
    const generateStarSprites = () => {
      for (let li = 0; li < starsByLayer.length; li++) {
        const tint = DEPTH_TINT[li] || [1, 1, 1];
        for (const s of starsByLayer[li]) {
          // Pre-compute tinted fill for layers 0-1 (no gradients, just flat dots)
          if (s.layer <= 1) {
            const tr = clamp(s.baseColor[0] * tint[0], 0, 255) | 0;
            const tg = clamp(s.baseColor[1] * tint[1], 0, 255) | 0;
            const tb = clamp(s.baseColor[2] * tint[2], 0, 255) | 0;
            s.tintedFill = `rgb(${tr},${tg},${tb})`;
            continue;
          }

          // Layers 2-5: pre-render gradient sprite
          const [br, bg, bb] = s.baseColor;
          const ri = clamp(br * tint[0], 0, 255) | 0;
          const gi = clamp(bg * tint[1], 0, 255) | 0;
          const bi = clamp(bb * tint[2], 0, 255) | 0;
          const sz = s.size;

          let canvasSize: number;
          // Layer 4: spike length up to sz*22, so canvas radius = max(sz*22, sz*18)
          if (s.layer === 4) canvasSize = Math.ceil(sz * 22 * 2) + 4;
          // Layer 3 bright stars get short spikes: sz*10
          else if ((s.layer === 3 || s.layer === 5) && s.mag < 2) canvasSize = Math.ceil(sz * 10 * 2) + 4;
          else if (s.layer === 3 || s.layer === 5) canvasSize = Math.ceil(sz * 6 * 2) + 4;
          else canvasSize = Math.ceil(sz * 2 * 2) + 4;
          canvasSize = Math.max(canvasSize, 6);

          const sc = document.createElement("canvas");
          sc.width = canvasSize; sc.height = canvasSize;
          const sctx = sc.getContext("2d")!;
          const cx = canvasSize / 2, cy = canvasSize / 2;

          if (s.layer === 4) {
            // Feature star: PSF bloom (1/r² falloff) + diffraction spikes + chromatic aberration + Airy rings + core
            sctx.globalCompositeOperation = "lighter";

            // --- 1/r² PSF bloom layers (sharper core, longer faint tail) ---
            const blooms: [number, number][] = [
              [sz * 18, 0.012], [sz * 10, 0.035], [sz * 5, 0.09],
              [sz * 2.5, 0.20], [sz * 1.2, 0.45],
            ];
            for (const [bRad, bo] of blooms) {
              const grd = sctx.createRadialGradient(cx, cy, 0, cx, cy, bRad);
              // 1/r² envelope: bright core, extended dim tail
              grd.addColorStop(0,    `rgba(${ri},${gi},${bi},${bo})`);
              grd.addColorStop(0.04, `rgba(${ri},${gi},${bi},${bo * 0.65})`);
              grd.addColorStop(0.10, `rgba(${ri},${gi},${bi},${bo * 0.35})`);
              grd.addColorStop(0.20, `rgba(${ri},${gi},${bi},${bo * 0.14})`);
              grd.addColorStop(0.35, `rgba(${ri},${gi},${bi},${bo * 0.05})`);
              grd.addColorStop(0.55, `rgba(${ri},${gi},${bi},${bo * 0.015})`);
              grd.addColorStop(0.80, `rgba(${ri},${gi},${bi},${bo * 0.003})`);
              grd.addColorStop(1,    `rgba(${ri},${gi},${bi},0)`);
              sctx.beginPath(); sctx.arc(cx, cy, bRad, 0, Math.PI * 2);
              sctx.fillStyle = grd; sctx.fill();
            }

            // --- 4-point diffraction spikes (primary at 0°/90°/180°/270°) ---
            const spikeLen = sz * 20;
            const spikeW = Math.max(2, sz * 0.3);
            const spikeAlpha = 0.18;
            for (let si = 0; si < 4; si++) {
              const ang = si * Math.PI / 2;
              sctx.save(); sctx.translate(cx, cy); sctx.rotate(ang);
              const sg = sctx.createLinearGradient(0, 0, spikeLen, 0);
              sg.addColorStop(0,    `rgba(${ri},${gi},${bi},${spikeAlpha})`);
              sg.addColorStop(0.02, `rgba(${ri},${gi},${bi},${spikeAlpha * 0.55})`);
              sg.addColorStop(0.07, `rgba(${ri},${gi},${bi},${spikeAlpha * 0.14})`);
              sg.addColorStop(0.20, `rgba(${ri},${gi},${bi},${spikeAlpha * 0.035})`);
              sg.addColorStop(0.50, `rgba(${ri},${gi},${bi},${spikeAlpha * 0.008})`);
              sg.addColorStop(1,    `rgba(${ri},${gi},${bi},0)`);
              sctx.beginPath();
              sctx.moveTo(0, -spikeW / 2);
              sctx.lineTo(spikeLen, 0);
              sctx.lineTo(0, spikeW / 2);
              sctx.closePath();
              sctx.fillStyle = sg; sctx.fill();
              sctx.restore();
            }
            // 4 secondary spikes at 45° (half length, 40% intensity)
            const secLen = sz * 10;
            const secAlpha = spikeAlpha * 0.4;
            for (let si = 0; si < 4; si++) {
              const ang = si * Math.PI / 2 + Math.PI / 4;
              sctx.save(); sctx.translate(cx, cy); sctx.rotate(ang);
              const sg = sctx.createLinearGradient(0, 0, secLen, 0);
              sg.addColorStop(0,    `rgba(${ri},${gi},${bi},${secAlpha})`);
              sg.addColorStop(0.03, `rgba(${ri},${gi},${bi},${secAlpha * 0.5})`);
              sg.addColorStop(0.10, `rgba(${ri},${gi},${bi},${secAlpha * 0.12})`);
              sg.addColorStop(0.30, `rgba(${ri},${gi},${bi},${secAlpha * 0.025})`);
              sg.addColorStop(1,    `rgba(${ri},${gi},${bi},0)`);
              sctx.beginPath();
              sctx.moveTo(0, -spikeW * 0.4);
              sctx.lineTo(secLen, 0);
              sctx.lineTo(0, spikeW * 0.4);
              sctx.closePath();
              sctx.fillStyle = sg; sctx.fill();
              sctx.restore();
            }

            // --- Chromatic aberration halo (R/B channel offset) ---
            const caOff = Math.max(1.2, sz * 0.15); // offset px
            const caRad = sz * 3;
            // Red shifted right
            const rGrd = sctx.createRadialGradient(cx + caOff, cy, 0, cx + caOff, cy, caRad);
            rGrd.addColorStop(0, `rgba(255,${gi * 0.3 | 0},${bi * 0.2 | 0},0.04)`);
            rGrd.addColorStop(0.4, `rgba(255,${gi * 0.3 | 0},${bi * 0.2 | 0},0.01)`);
            rGrd.addColorStop(1, `rgba(255,0,0,0)`);
            sctx.beginPath(); sctx.arc(cx + caOff, cy, caRad, 0, Math.PI * 2);
            sctx.fillStyle = rGrd; sctx.fill();
            // Blue shifted left
            const bGrd = sctx.createRadialGradient(cx - caOff, cy, 0, cx - caOff, cy, caRad);
            bGrd.addColorStop(0, `rgba(${ri * 0.2 | 0},${gi * 0.3 | 0},255,0.04)`);
            bGrd.addColorStop(0.4, `rgba(${ri * 0.2 | 0},${gi * 0.3 | 0},255,0.01)`);
            bGrd.addColorStop(1, `rgba(0,0,255,0)`);
            sctx.beginPath(); sctx.arc(cx - caOff, cy, caRad, 0, Math.PI * 2);
            sctx.fillStyle = bGrd; sctx.fill();

            // --- Airy disk rings (faint concentric diffraction rings) ---
            const airyRings: [number, number, number][] = [ // [radius, width, alpha]
              [sz * 3.5, sz * 0.6, 0.025],
              [sz * 6, sz * 0.5, 0.012],
            ];
            for (const [aR, aW, aA] of airyRings) {
              const ag = sctx.createRadialGradient(cx, cy, Math.max(0, aR - aW), cx, cy, aR + aW);
              ag.addColorStop(0,   `rgba(${ri},${gi},${bi},0)`);
              ag.addColorStop(0.3, `rgba(${ri},${gi},${bi},${aA})`);
              ag.addColorStop(0.5, `rgba(${ri},${gi},${bi},${aA * 0.7})`);
              ag.addColorStop(0.7, `rgba(${ri},${gi},${bi},${aA * 0.3})`);
              ag.addColorStop(1,   `rgba(${ri},${gi},${bi},0)`);
              sctx.beginPath(); sctx.arc(cx, cy, aR + aW, 0, Math.PI * 2);
              sctx.fillStyle = ag; sctx.fill();
            }

            // Spectral color ring
            const colorGrd = sctx.createRadialGradient(cx, cy, sz * 0.4, cx, cy, sz * 1.8);
            colorGrd.addColorStop(0, `rgba(${ri},${gi},${bi},0.25)`);
            colorGrd.addColorStop(0.5, `rgba(${ri},${gi},${bi},0.08)`);
            colorGrd.addColorStop(1, `rgba(${ri},${gi},${bi},0)`);
            sctx.beginPath(); sctx.arc(cx, cy, sz * 1.8, 0, Math.PI * 2);
            sctx.fillStyle = colorGrd; sctx.fill();
            // Overexposed white core
            const coreGrd = sctx.createRadialGradient(cx, cy, 0, cx, cy, sz * 0.5);
            coreGrd.addColorStop(0, "rgba(255,255,255,1)");
            coreGrd.addColorStop(0.5, "rgba(255,255,255,0.7)");
            coreGrd.addColorStop(1, "rgba(255,255,255,0)");
            sctx.beginPath(); sctx.arc(cx, cy, sz * 0.5, 0, Math.PI * 2);
            sctx.fillStyle = coreGrd; sctx.fill();
          } else if (s.layer === 3 || s.layer === 5) {
            // Close/double: haze gradients + short spikes for bright stars
            sctx.globalCompositeOperation = "lighter";
            // Outer soft haze
            const gr2 = sz * 6;
            let grd2 = sctx.createRadialGradient(cx, cy, 0, cx, cy, gr2);
            grd2.addColorStop(0, `rgba(${ri},${gi},${bi},0.06)`);
            grd2.addColorStop(0.3, `rgba(${ri},${gi},${bi},0.015)`);
            grd2.addColorStop(1, `rgba(${ri},${gi},${bi},0)`);
            sctx.beginPath(); sctx.arc(cx, cy, gr2, 0, Math.PI * 2);
            sctx.fillStyle = grd2; sctx.fill();
            // Inner glow
            const gr = sz * 3;
            grd2 = sctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
            grd2.addColorStop(0, `rgba(${ri},${gi},${bi},0.22)`);
            grd2.addColorStop(0.4, `rgba(${ri},${gi},${bi},0.06)`);
            grd2.addColorStop(1, `rgba(${ri},${gi},${bi},0)`);
            sctx.beginPath(); sctx.arc(cx, cy, gr, 0, Math.PI * 2);
            sctx.fillStyle = grd2; sctx.fill();
            // Short diffraction spikes for bright close stars (mag < 2)
            if (s.mag < 2) {
              const csLen = sz * 8;
              const csW = Math.max(1.5, sz * 0.2);
              const csA = 0.10;
              for (let si = 0; si < 4; si++) {
                sctx.save(); sctx.translate(cx, cy); sctx.rotate(si * Math.PI / 2);
                const csg = sctx.createLinearGradient(0, 0, csLen, 0);
                csg.addColorStop(0,    `rgba(${ri},${gi},${bi},${csA})`);
                csg.addColorStop(0.04, `rgba(${ri},${gi},${bi},${csA * 0.45})`);
                csg.addColorStop(0.15, `rgba(${ri},${gi},${bi},${csA * 0.08})`);
                csg.addColorStop(0.40, `rgba(${ri},${gi},${bi},${csA * 0.015})`);
                csg.addColorStop(1,    `rgba(${ri},${gi},${bi},0)`);
                sctx.beginPath();
                sctx.moveTo(0, -csW / 2); sctx.lineTo(csLen, 0); sctx.lineTo(0, csW / 2);
                sctx.closePath(); sctx.fillStyle = csg; sctx.fill();
                sctx.restore();
              }
            }
          } else {
            // Layer 2 (medium): small glow + core dot
            const gr = sz * 2;
            const grd = sctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
            grd.addColorStop(0, `rgba(${ri},${gi},${bi},0.12)`);
            grd.addColorStop(1, `rgba(${ri},${gi},${bi},0)`);
            sctx.beginPath(); sctx.arc(cx, cy, gr, 0, Math.PI * 2);
            sctx.fillStyle = grd; sctx.fill();
            // Core dot baked into sprite
            sctx.globalCompositeOperation = "source-over";
            sctx.beginPath(); sctx.arc(cx, cy, sz, 0, Math.PI * 2);
            sctx.fillStyle = `rgb(${ri},${gi},${bi})`;
            sctx.fill();
          }

          s.sprite = sc;
          s.spriteHalf = canvasSize / 2;

          // Companion sprite for double stars (layer 5)
          if (s.layer === 5 && s.cx !== undefined) {
            const cTint = DEPTH_TINT[5];
            const cri = clamp(s.cColor![0] * cTint[0], 0, 255) | 0;
            const cgi = clamp(s.cColor![1] * cTint[1], 0, 255) | 0;
            const cbi = clamp(s.cColor![2] * cTint[2], 0, 255) | 0;
            const csz = s.cSize!;
            const ccs = Math.max(6, Math.ceil(csz * 6 * 2) + 4);
            const csc = document.createElement("canvas");
            csc.width = ccs; csc.height = ccs;
            const csctx = csc.getContext("2d")!;
            const ccx = ccs / 2, ccy = ccs / 2;
            csctx.globalCompositeOperation = "lighter";
            // Outer haze
            const cgr2 = csz * 6;
            let cgrd = csctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, cgr2);
            cgrd.addColorStop(0, `rgba(${cri},${cgi},${cbi},0.06)`);
            cgrd.addColorStop(0.3, `rgba(${cri},${cgi},${cbi},0.015)`);
            cgrd.addColorStop(1, `rgba(${cri},${cgi},${cbi},0)`);
            csctx.beginPath(); csctx.arc(ccx, ccy, cgr2, 0, Math.PI * 2);
            csctx.fillStyle = cgrd; csctx.fill();
            // Inner glow
            const cgr = csz * 3;
            cgrd = csctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, cgr);
            cgrd.addColorStop(0, `rgba(${cri},${cgi},${cbi},0.22)`);
            cgrd.addColorStop(0.4, `rgba(${cri},${cgi},${cbi},0.06)`);
            cgrd.addColorStop(1, `rgba(${cri},${cgi},${cbi},0)`);
            csctx.beginPath(); csctx.arc(ccx, ccy, cgr, 0, Math.PI * 2);
            csctx.fillStyle = cgrd; csctx.fill();
            s.compSprite = csc;
            s.compSpriteHalf = ccs / 2;
          }
        }
      }
    };

    /* ---- Scintillation (OPT: sin/cos replaces Perlin noise — 100x cheaper) ---- */
    const scintillateAlpha = (s: Star, time: number): number => {
      if (s.layer === 0) return s.brightness;

      const pf = posScint(s.y / lh);
      let ba: number;
      if (s.mag < 1.5) ba = 0.03 + s.mag * 0.035;
      else if (s.mag < 3) ba = 0.08 + (s.mag - 1.5) * 0.07;
      else if (s.mag < 5) ba = 0.15 + (s.mag - 3) * 0.1;
      else ba = 0.05 + (s.mag - 5) * 0.04;
      const amp = ba * pf;

      const t = time * 0.001;
      const seed = s.nSeed;
      // Multi-frequency sin/cos with irrational phase offsets per star
      const p1 = seed * 1.618033;  // golden ratio
      const p2 = seed * 2.718281;  // euler's number
      const p3 = seed * 3.141592;  // pi
      const nv = 0.5  * Math.sin(t * 1.2 + p1)
               + 0.35 * Math.sin(t * 3.5 + p2)
               + 0.15 * Math.cos(t * 8.0 + p3);

      let spike = 0;
      if (s.layer >= 2 && s.layer <= 5) {
        const sn = 0.6  * Math.sin(t * 6.0 + p2 * 1.3)
                 + 0.28 * Math.cos(t * 9.0 + p1 * 0.7)
                 + 0.12 * Math.sin(t * 14.0 + p3 * 1.9);
        if (sn > 0.7) spike = (sn - 0.7) * 3.3;
        else if (sn < -0.7) spike = (sn + 0.7) * 2;
      }

      let alpha = clamp(s.brightness * (1 + nv * amp + spike * amp * 0.6), 0, 1);

      // Rare flash events: deterministic bright bursts (~0.3% duty cycle per star)
      if (s.layer >= 1 && s.layer <= 4) {
        const flashWave = Math.sin(t * 0.5 + seed * 7.77);
        if (flashWave > 0.997) {
          alpha = clamp(alpha + (flashWave - 0.997) / 0.003 * 0.8, 0, 1);
        }
      }

      return alpha;
    };

    /* ---- Chromatic scintillation: per-channel R/G/B multipliers ---- */
    /* Blue channel gets ~75% more variance (shorter λ scatters more) */
    const scintillateChromatic = (
      s: Star, time: number
    ): { alpha: number; rMul: number; gMul: number; bMul: number } => {
      const alpha = scintillateAlpha(s, time);
      if (s.layer === 0) return { alpha, rMul: 1, gMul: 1, bMul: 1 };

      const pf = posScint(s.y / lh);
      const t = time * 0.001;
      const seed = s.nSeed;
      const p4 = seed * 0.577215; // Euler-Mascheroni
      const p5 = seed * 1.414213; // sqrt(2)
      const p6 = seed * 2.236067; // sqrt(5)

      // Per-channel oscillation: different frequencies, blue fastest
      const rOsc = Math.sin(t * 4.7 + p4) * 0.5 + Math.sin(t * 11.3 + p5) * 0.3 + Math.cos(t * 2.1 + p6) * 0.2;
      const gOsc = Math.sin(t * 5.9 + p5) * 0.5 + Math.sin(t * 13.7 + p6) * 0.3 + Math.cos(t * 3.3 + p4) * 0.2;
      const bOsc = Math.sin(t * 8.3 + p6) * 0.5 + Math.sin(t * 19.1 + p4) * 0.3 + Math.cos(t * 5.7 + p5) * 0.2;

      const chromAmp = pf * 0.06; // subtle: ±6% color shift scaled by altitude
      return {
        alpha,
        rMul: 1 + rOsc * chromAmp * 0.7,   // red: least variance
        gMul: 1 + gOsc * chromAmp * 0.85,   // green: moderate
        bMul: 1 + bOsc * chromAmp * 1.2,    // blue: most variance (×1.7 vs red)
      };
    };

    /* ---- Full scintillation with color (for non-sprite stars, layers 0-1) ---- */
    const scintillate = (
      s: Star, time: number
    ): { alpha: number; r: number; g: number; b: number } => {
      const [br, bg, bb] = s.baseColor;
      if (s.layer === 0) return { alpha: s.brightness, r: br, g: bg, b: bb };

      // Chromatic scintillation: modulate R/G/B channels independently
      const { alpha, rMul, gMul, bMul } = scintillateChromatic(s, time);
      return {
        alpha,
        r: clamp(br * rMul, 0, 255),
        g: clamp(bg * gMul, 0, 255),
        b: clamp(bb * bMul, 0, 255),
      };
    };

    /* ---- Star drawing (fallback for non-sprite stars) ---- */
    const drawStarAt = (
      x: number, y: number, layer: number,
      alpha: number, r: number, g: number, b: number, sz: number
    ) => {
      const ri = r | 0, gi = g | 0, bi = b | 0;

      if (layer === 4) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const blooms: [number, number][] = [
          [sz * 18, alpha * 0.012], [sz * 10, alpha * 0.035],
          [sz * 5,  alpha * 0.09], [sz * 2.5, alpha * 0.20],
          [sz * 1.2, alpha * 0.45],
        ];
        for (const [br2, bo] of blooms) {
          const grd = ctx.createRadialGradient(x, y, 0, x, y, br2);
          // 1/r² PSF falloff (matching sprite version)
          grd.addColorStop(0,    `rgba(${ri},${gi},${bi},${bo})`);
          grd.addColorStop(0.04, `rgba(${ri},${gi},${bi},${bo * 0.65})`);
          grd.addColorStop(0.10, `rgba(${ri},${gi},${bi},${bo * 0.35})`);
          grd.addColorStop(0.20, `rgba(${ri},${gi},${bi},${bo * 0.14})`);
          grd.addColorStop(0.35, `rgba(${ri},${gi},${bi},${bo * 0.05})`);
          grd.addColorStop(0.55, `rgba(${ri},${gi},${bi},${bo * 0.015})`);
          grd.addColorStop(0.80, `rgba(${ri},${gi},${bi},${bo * 0.003})`);
          grd.addColorStop(1,    `rgba(${ri},${gi},${bi},0)`);
          ctx.beginPath(); ctx.arc(x, y, br2, 0, Math.PI * 2);
          ctx.fillStyle = grd; ctx.fill();
        }
        const colorGrd = ctx.createRadialGradient(x, y, sz * 0.4, x, y, sz * 1.8);
        colorGrd.addColorStop(0, `rgba(${ri},${gi},${bi},${alpha * 0.25})`);
        colorGrd.addColorStop(0.5, `rgba(${ri},${gi},${bi},${alpha * 0.08})`);
        colorGrd.addColorStop(1, `rgba(${ri},${gi},${bi},0)`);
        ctx.beginPath(); ctx.arc(x, y, sz * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = colorGrd; ctx.fill();
        const coreGrd = ctx.createRadialGradient(x, y, 0, x, y, sz * 0.5);
        coreGrd.addColorStop(0, `rgba(255,255,255,${alpha})`);
        coreGrd.addColorStop(0.5, `rgba(255,255,255,${alpha * 0.7})`);
        coreGrd.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.beginPath(); ctx.arc(x, y, sz * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = coreGrd; ctx.fill();
        ctx.restore();
        return;
      }

      if (layer === 3 || layer === 5) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const gr2 = sz * 6;
        let grd2 = ctx.createRadialGradient(x, y, 0, x, y, gr2);
        grd2.addColorStop(0, `rgba(${ri},${gi},${bi},${alpha * 0.06})`);
        grd2.addColorStop(0.3, `rgba(${ri},${gi},${bi},${alpha * 0.015})`);
        grd2.addColorStop(1, `rgba(${ri},${gi},${bi},0)`);
        ctx.beginPath(); ctx.arc(x, y, gr2, 0, Math.PI * 2);
        ctx.fillStyle = grd2; ctx.fill();
        const gr = sz * 3;
        grd2 = ctx.createRadialGradient(x, y, 0, x, y, gr);
        grd2.addColorStop(0, `rgba(${ri},${gi},${bi},${alpha * 0.22})`);
        grd2.addColorStop(0.4, `rgba(${ri},${gi},${bi},${alpha * 0.06})`);
        grd2.addColorStop(1, `rgba(${ri},${gi},${bi},0)`);
        ctx.beginPath(); ctx.arc(x, y, gr, 0, Math.PI * 2);
        ctx.fillStyle = grd2; ctx.fill();
        ctx.restore();
      }
      if (layer === 2) {
        const gr = sz * 2;
        const grd = ctx.createRadialGradient(x, y, 0, x, y, gr);
        grd.addColorStop(0, `rgba(${ri},${gi},${bi},${alpha * 0.12})`);
        grd.addColorStop(1, `rgba(${ri},${gi},${bi},0)`);
        ctx.beginPath(); ctx.arc(x, y, gr, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${ri},${gi},${bi},${alpha})`; ctx.fill();
    };

    /* ---- Galaxy drawing ---- */
    const drawGalObj = (g: GalaxyObj, time: number) => {
      const pMod = g.parallaxMod;
      const rawX = g.x - smoothCameraX * CAM_PARALLAX[6] * pMod + smoothMouseX * MOUSE_PARALLAX[6] * pMod + driftTime * DRIFT_SPEED[6] * DRIFT_DIR_X;
      const rawY = g.y - smoothCameraY * CAM_PARALLAX[6] * pMod + smoothMouseY * MOUSE_PARALLAX[6] * pMod + driftTime * DRIFT_SPEED[6] * DRIFT_DIR_Y;
      const gx = ((rawX % lw) + lw) % lw;
      const gy = ((rawY % lh) + lh) % lh;
      const t = time * 0.001;
      // Edge fade
      const fadeZone = 80;
      let edgeFade = 1;
      if (gy < fadeZone) edgeFade = Math.min(edgeFade, gy / fadeZone);
      if (gy > lh - fadeZone) edgeFade = Math.min(edgeFade, (lh - gy) / fadeZone);
      const alpha = g.brightness * (1 + noise2d(g.nSeed + t * 0.3, g.nSeed * 0.5 + t * 0.2) * 0.1) * edgeFade;
      const [r, gc2, b] = g.color;
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(g.angle);
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, g.rx);
      grd.addColorStop(0, `rgba(${r},${gc2},${b},${alpha * 0.6})`);
      grd.addColorStop(0.2, `rgba(${r},${gc2},${b},${alpha * 0.35})`);
      grd.addColorStop(0.6, `rgba(${r},${gc2},${b},${alpha * 0.1})`);
      grd.addColorStop(1, `rgba(${r},${gc2},${b},0)`);
      ctx.scale(1, g.ry / g.rx);
      ctx.beginPath(); ctx.arc(0, 0, g.rx, 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, g.rx * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,240,${alpha * 0.5})`; ctx.fill();
      ctx.restore();
    };

    /* ---- Shooting stars ---- */
    const SHOOT_COLORS: [number, number, number][] = [
      [200, 220, 255], [255, 240, 200], [180, 200, 255], [255, 220, 180],
    ];
    const maybeSpawnShootingStar = (time: number) => {
      if (time < nextShootTime || shootingStars.length >= 3) return;
      nextShootTime = time + 5000 + Math.random() * 10000;
      const angle = Math.PI * 0.15 + Math.random() * Math.PI * 0.4;
      const speed = 5 + Math.random() * 6;
      shootingStars.push({
        x: Math.random() * lw * 0.7 + lw * 0.1,
        y: Math.random() * lh * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1, maxLife: 50 + Math.random() * 40,
        len: 60 + Math.random() * 60,
        width: 1.5 + Math.random() * 1.5,
        color: SHOOT_COLORS[(Math.random() * SHOOT_COLORS.length) | 0],
      });
    };

    const updateAndDrawShootingStars = () => {
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.x += s.vx; s.y += s.vy;
        s.life -= 1 / s.maxLife;
        if (s.life <= 0 || s.x > lw + 100 || s.y > lh + 100 || s.x < -100 || s.y < -100) {
          if (s.life <= 0) {
            const fGrd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 15);
            fGrd.addColorStop(0, `rgba(255,255,255,0.6)`);
            fGrd.addColorStop(0.3, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0.25)`);
            fGrd.addColorStop(1, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0)`);
            ctx.beginPath(); ctx.arc(s.x, s.y, 15, 0, Math.PI * 2);
            ctx.fillStyle = fGrd; ctx.fill();
          }
          shootingStars.splice(i, 1); continue;
        }
        const lifeCurve = Math.sin(s.life * Math.PI);
        const headAlpha = lifeCurve * 0.95;
        const trailLen = s.len * (0.5 + lifeCurve * 0.5);
        const vMag = Math.hypot(s.vx, s.vy);
        const tailX = s.x - (s.vx / vMag) * trailLen;
        const tailY = s.y - (s.vy / vMag) * trailLen;
        const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255,255,255,${headAlpha})`);
        grad.addColorStop(0.05, `rgba(255,250,240,${headAlpha * 0.85})`);
        grad.addColorStop(0.15, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${headAlpha * 0.5})`);
        grad.addColorStop(0.4, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${headAlpha * 0.15})`);
        grad.addColorStop(0.7, `rgba(${(s.color[0] * 0.5) | 0},${(s.color[1] * 0.5) | 0},${s.color[2]},${headAlpha * 0.04})`);
        grad.addColorStop(1, `rgba(100,120,180,0)`);
        ctx.save();
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.width * lifeCurve;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tailX, tailY);
        ctx.stroke();
        const headR = 3 + s.width;
        const hg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, headR);
        hg.addColorStop(0, `rgba(255,255,255,${headAlpha * 0.9})`);
        hg.addColorStop(0.3, `rgba(255,250,230,${headAlpha * 0.5})`);
        hg.addColorStop(0.7, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${headAlpha * 0.15})`);
        hg.addColorStop(1, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0)`);
        ctx.beginPath(); ctx.arc(s.x, s.y, headR, 0, Math.PI * 2);
        ctx.fillStyle = hg; ctx.fill();
        ctx.globalCompositeOperation = "lighter";
        const ogR = s.width * 3;
        const og = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, ogR);
        og.addColorStop(0, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${headAlpha * 0.08})`);
        og.addColorStop(1, `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0)`);
        ctx.beginPath(); ctx.arc(s.x, s.y, ogR, 0, Math.PI * 2);
        ctx.fillStyle = og; ctx.fill();
        ctx.restore();
      }
    };

    /* ---- Zone system ---- */
    const getWeights = (): number[] => {
      const sn = maxScroll > 1 ? smoothScroll / maxScroll : 0;
      const wts = ZONES.map(z => zWeight(sn, z.scrollStart, z.scrollEnd));
      // Fallback: guarantee at least one zone is visible
      const sum = wts.reduce((a, b) => a + b, 0);
      if (sum < 0.1) {
        let bestI = 0, bestDist = Infinity;
        for (let i = 0; i < ZONES.length; i++) {
          const mid = (ZONES[i].scrollStart + ZONES[i].scrollEnd) / 2;
          const d = Math.abs(sn - mid);
          if (d < bestDist) { bestDist = d; bestI = i; }
        }
        wts[bestI] = Math.max(wts[bestI], 0.1);
      }
      return wts;
    };

    const getStarMod = (wts: number[]): number => {
      let m = 0, tot = 0;
      for (let i = 0; i < ZONES.length; i++) {
        if (wts[i] > 0) { m += wts[i] * ZONES[i].starBrightMod; tot += wts[i]; }
      }
      return tot > 0 ? m / tot : 1;
    };

    /* ---- Zone special objects ---- */
    const drawSpecials = (wts: number[], time: number) => {
      const md = Math.min(lw, lh);
      if (wts[0] > 0.01) drawGlobularCluster(ctx, lw * 0.22, lh * 0.35, md * 0.1, wts[0] * 0.5);
      if (wts[1] > 0.01) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        drawStarFormingKnots(ctx, lw * 0.65, lh * 0.45, md * 0.22, wts[1] * 0.45, time);
        ctx.restore();
      }
      if (wts[2] > 0.01) drawSpiralGalaxy(ctx, lw * 0.72, lh * 0.38, md * 0.12, 0.55, 0.4, wts[2] * 0.5, time);
      if (wts[3] > 0.01) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        drawPlanetaryNebula(ctx, lw * 0.35, lh * 0.45, md * 0.13, wts[3] * 0.5, time);
        ctx.restore();
      }
    };

    /* ---- Color wash ---- */
    const drawWash = (wts: number[]) => {
      let r = 0, g = 0, b = 0, totalOp = 0;
      for (let i = 0; i < ZONES.length; i++) {
        if (wts[i] < 0.01) continue;
        const wo = wts[i] * ZONES[i].washOp;
        r += ZONES[i].colorWash[0] * wo;
        g += ZONES[i].colorWash[1] * wo;
        b += ZONES[i].colorWash[2] * wo;
        totalOp += wo;
      }
      if (totalOp < 0.002) return;
      r /= totalOp; g /= totalOp; b /= totalOp;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${Math.min(totalOp, 0.06)})`;
      ctx.fillRect(0, 0, lw, lh);
      ctx.restore();
    };

    /* ---- Per-layer star rendering with depth tint + sprites + culling ---- */
    const drawLayerStars = (layerStars: Star[], layerIdx: number, time: number | undefined, starMod: number) => {
      const tint = DEPTH_TINT[layerIdx] || [1, 1, 1];
      // OPT: culling margin — stars beyond this are fully off-screen
      const margin = layerIdx === 4 ? 350 : layerIdx >= 3 ? 80 : 20;
      const curPx = (smoothMouseX + 0.5) * lw;
      const curPy = (smoothMouseY + 0.5) * lh;
      const layerCamPx = CAM_PARALLAX[layerIdx] ?? 0;
      const sVelX = -camVelX * layerCamPx;
      const sVelY = -camVelY * layerCamPx;
      const sVelMag = Math.hypot(sVelX, sVelY);

      for (const s of layerStars) {
        const pMod = s.parallaxMod;
        const camPx = (CAM_PARALLAX[s.layer] ?? 0) * pMod;
        const mousePx = (MOUSE_PARALLAX[s.layer] ?? 0) * pMod;
        const driftPx = (DRIFT_SPEED[s.layer] ?? 0) * driftTime;

        const rawX = s.x - smoothCameraX * camPx + smoothMouseX * mousePx + driftPx * DRIFT_DIR_X;
        const rawY = s.y - smoothCameraY * camPx + smoothMouseY * mousePx + driftPx * DRIFT_DIR_Y;
        const drawX = ((rawX % lw) + lw) % lw;
        const drawY = ((rawY % lh) + lh) % lh;

        // OPT: spatial culling — skip stars fully off-screen
        if (drawX < -margin || drawX > lw + margin || drawY < -margin || drawY > lh + margin) continue;

        // Edge fade (top/bottom of viewport + wrap-around soft transition)
        const fadeZone = s.layer === 4 ? 150 : 80;
        let edgeFade = 1;
        if (drawY < fadeZone) edgeFade = Math.min(edgeFade, drawY / fadeZone);
        if (drawY > lh - fadeZone) edgeFade = Math.min(edgeFade, (lh - drawY) / fadeZone);

        // OPT: integer pixel positions avoid sub-pixel anti-aliasing
        const ix = drawX | 0;
        const iy = drawY | 0;

        // ---- Sprite path (layers 2-5): uses pre-rendered gradients ----
        if (s.sprite) {
          // Chromatic scintillation: get per-channel multipliers + alpha
          const chrom = time !== undefined ? scintillateChromatic(s, time) : null;
          const alpha = chrom ? chrom.alpha : s.brightness;
          let modA = (s.layer === 0 ? alpha : alpha * starMod) * edgeFade;
          if (s.dustDim) modA *= 1 - s.dustDim * 0.7;
          if (s.layer >= 1) {
            const dist = Math.hypot(drawX - curPx, drawY - curPy);
            if (dist < 150) modA = Math.min(1, modA * (1 + (1 - dist / 150) * 0.3));
          }
          if (modA < 0.003) continue;

          if (s.layer === 4) {
            // Feature star: single sprite blit replaces 7 gradient creates
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = modA;
            ctx.drawImage(s.sprite, ix - s.spriteHalf!, iy - s.spriteHalf!);
            ctx.restore();
            // Chromatic scintillation: tinted core overlay
            if (chrom) {
              const cr = clamp(s.baseColor[0] * tint[0] * chrom.rMul, 0, 255) | 0;
              const cg = clamp(s.baseColor[1] * tint[1] * chrom.gMul, 0, 255) | 0;
              const cb = clamp(s.baseColor[2] * tint[2] * chrom.bMul, 0, 255) | 0;
              ctx.beginPath(); ctx.arc(ix, iy, Math.max(1, s.size * 0.6), 0, Math.PI * 2);
              ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
              ctx.globalAlpha = modA * 0.35;
              ctx.fill(); ctx.globalAlpha = 1;
            }
          } else if (s.layer === 3 || s.layer === 5) {
            // Close/double: sprite for haze, separate core dot for source-over fidelity
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = modA;
            ctx.drawImage(s.sprite, ix - s.spriteHalf!, iy - s.spriteHalf!);
            ctx.restore();
            // Core dot with chromatic scintillation
            const cr = chrom ? (clamp(s.baseColor[0] * tint[0] * chrom.rMul, 0, 255) | 0) : ((s.baseColor[0] * tint[0]) | 0);
            const cg = chrom ? (clamp(s.baseColor[1] * tint[1] * chrom.gMul, 0, 255) | 0) : ((s.baseColor[1] * tint[1]) | 0);
            const cb = chrom ? (clamp(s.baseColor[2] * tint[2] * chrom.bMul, 0, 255) | 0) : ((s.baseColor[2] * tint[2]) | 0);
            ctx.beginPath(); ctx.arc(ix, iy, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
            ctx.globalAlpha = modA;
            ctx.fill();
            ctx.globalAlpha = 1;
          } else {
            // Layer 2: sprite has gradient + core, source-over
            ctx.globalAlpha = modA;
            ctx.drawImage(s.sprite, ix - s.spriteHalf!, iy - s.spriteHalf!);
            ctx.globalAlpha = 1;
            // Chromatic core overlay for layer 2
            if (chrom) {
              const cr = clamp(s.baseColor[0] * tint[0] * chrom.rMul, 0, 255) | 0;
              const cg = clamp(s.baseColor[1] * tint[1] * chrom.gMul, 0, 255) | 0;
              const cb = clamp(s.baseColor[2] * tint[2] * chrom.bMul, 0, 255) | 0;
              ctx.beginPath(); ctx.arc(ix, iy, Math.max(0.5, s.size * 0.5), 0, Math.PI * 2);
              ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
              ctx.globalAlpha = modA * 0.2;
              ctx.fill(); ctx.globalAlpha = 1;
            }
          }

          // Motion blur trail (layers 3-4, fast scroll)
          if ((s.layer === 3 || s.layer === 4) && sVelMag > 60 && modA > 0.01) {
            const trailLen = Math.min(20, (sVelMag - 60) * 0.06);
            const tdx = -sVelX / sVelMag * trailLen;
            const tdy = -sVelY / sVelMag * trailLen;
            const tr = clamp(s.baseColor[0] * tint[0], 0, 255) | 0;
            const tg = clamp(s.baseColor[1] * tint[1], 0, 255) | 0;
            const tb = clamp(s.baseColor[2] * tint[2], 0, 255) | 0;
            ctx.save();
            ctx.strokeStyle = `rgba(${tr},${tg},${tb},${modA * 0.25})`;
            ctx.lineWidth = Math.max(1, s.size * 0.8);
            ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix + tdx, iy + tdy);
            ctx.stroke();
            ctx.restore();
          }

          // Double companion (layer 5) with orbital motion
          if (s.layer === 5 && s.cx !== undefined && s.compSprite) {
            let compOffX = s.cx - s.x;
            let compOffY = s.cy! - s.y;
            if (s.orbPeriod && time !== undefined) {
              const orbAngle = (time * 0.001 / s.orbPeriod) * Math.PI * 2 + (s.orbPhase ?? 0);
              const sep = s.orbSep ?? Math.hypot(compOffX, compOffY);
              compOffX = Math.cos(orbAngle) * sep;
              compOffY = Math.sin(orbAngle) * sep;
            }
            const cix = (drawX + compOffX) | 0;
            const ciy = (drawY + compOffY) | 0;
            const cAlpha = time !== undefined
              ? scintillateAlpha({ ...s, nSeed: s.nSeed + 1000, mag: s.cMag!, brightness: s.cBright!, layer: 3 }, time)
              : s.cBright!;
            const cModA = cAlpha * starMod * edgeFade;
            if (cModA >= 0.003) {
              ctx.save();
              ctx.globalCompositeOperation = "lighter";
              ctx.globalAlpha = cModA;
              ctx.drawImage(s.compSprite, cix - s.compSpriteHalf!, ciy - s.compSpriteHalf!);
              ctx.restore();
              // Companion core dot
              ctx.beginPath(); ctx.arc(cix, ciy, s.cSize!, 0, Math.PI * 2);
              const cTint = DEPTH_TINT[5];
              ctx.fillStyle = `rgb(${(s.cColor![0] * cTint[0]) | 0},${(s.cColor![1] * cTint[1]) | 0},${(s.cColor![2] * cTint[2]) | 0})`;
              ctx.globalAlpha = cModA;
              ctx.fill();
              ctx.globalAlpha = 1;
            }
          }
          continue;
        }

        // ---- Non-sprite path (layers 0-1): flat dots with pre-computed tint ----
        let alpha: number;
        if (time !== undefined) {
          alpha = scintillateAlpha(s, time);
        } else {
          alpha = s.brightness;
        }

        let modA = (s.layer === 0 ? alpha : alpha * starMod) * edgeFade;
        if (s.dustDim) modA *= 1 - s.dustDim * 0.7;
        if (s.layer >= 1) {
          const dist = Math.hypot(drawX - curPx, drawY - curPy);
          if (dist < 150) modA = Math.min(1, modA * (1 + (1 - dist / 150) * 0.3));
        }
        if (modA < 0.003) continue;

        if (s.tintedFill) {
          // OPT: pre-computed fill string avoids per-frame template string allocation
          ctx.fillStyle = s.tintedFill;
          ctx.globalAlpha = modA;
          ctx.beginPath(); ctx.arc(ix, iy, s.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          // Fallback
          const r = clamp(s.baseColor[0] * tint[0], 0, 255);
          const g = clamp(s.baseColor[1] * tint[1], 0, 255);
          const b2 = clamp(s.baseColor[2] * tint[2], 0, 255);
          drawStarAt(ix, iy, s.layer, modA, r, g, b2, s.size);
        }
      }
    };

    /* ---- Inter-layer fog ---- */
    const drawFog = (afterLayer: number) => {
      const f = FOG_LAYERS.find(fl => fl.afterLayer === afterLayer);
      if (!f) return;
      ctx.fillStyle = `rgba(${f.color[0]},${f.color[1]},${f.color[2]},${f.alpha})`;
      ctx.fillRect(0, 0, lw, lh);
    };

    /* ---- Main render ---- */
    const drawFrame = (time?: number, dt = 0.016) => {
      ctx.clearRect(0, 0, lw, lh);
      const targetWts = getWeights();
      // Frame-rate-independent zone weight lerp (k=1.5 → ~0.5s to 63%)
      const wLerp = 1 - Math.exp(-1.5 * dt);
      for (let i = 0; i < ZONES.length; i++) {
        smoothWeights[i] += (targetWts[i] - smoothWeights[i]) * wLerp;
        if (smoothWeights[i] < 0.001) smoothWeights[i] = 0;
      }
      const wts = smoothWeights;
      // Frame-rate-independent starMod lerp (k=1.2 → ~0.6s to 63%)
      const starModLerp = 1 - Math.exp(-1.2 * dt);
      const targetStarMod = getStarMod(wts);
      currentStarMod += (targetStarMod - currentStarMod) * starModLerp;
      const starMod = currentStarMod;

      // MW nebula: crossfade between two drifting full-scene textures
      if (mwLayers.length >= 2) {
        ctx.imageSmoothingEnabled = true;
        const mwCamX = smoothCameraX * 0.04;
        const mwCamY = smoothCameraY * 0.04;
        const nebOffX = smoothMouseX * 3 - mwCamX;
        const off = smoothMouseY * 3 - mwCamY;

        // Oversized MW textures: draw at (lw+2*MW_PAD)×(lh+2*MW_PAD), offset by -MW_PAD
        // so the viewport-area of the texture aligns with the screen when offset is 0.
        // No drawWrapped needed — texture is large enough to never clip.
        const mwDW = lw + MW_PAD * 2, mwDH = lh + MW_PAD * 2;

        if (!reduced && time !== undefined) {
          // Crossfade ratio: slowly oscillates 0.3..0.7 (~25s period, never 0/1 to keep both visible)
          const crossfade = 0.5 + 0.2 * Math.sin(driftTime * 0.041)
                          + 0.08 * Math.sin(driftTime * 0.073 + 1.2);
          const alphaA = clamp(1 - crossfade, 0.25, 0.75);
          const alphaB = clamp(crossfade, 0.25, 0.75);

          // Layer A drifts slowly along MW band direction
          const dxA = Math.sin(driftTime * 0.031) * 45 + Math.sin(driftTime * 0.019) * 25;
          const dyA = Math.cos(driftTime * 0.023) * 30 + Math.cos(driftTime * 0.014) * 18;

          // Layer B drifts in opposing direction
          const dxB = Math.sin(driftTime * 0.037 + 2.5) * -50 + Math.sin(driftTime * 0.022 + 1.3) * -28;
          const dyB = Math.cos(driftTime * 0.029 + 1.8) * -35 + Math.cos(driftTime * 0.016 + 0.7) * -20;

          ctx.save();
          ctx.globalAlpha = alphaA;
          ctx.drawImage(mwLayers[0], -(nebOffX + dxA) - MW_PAD, -(off + dyA) - MW_PAD, mwDW, mwDH);

          ctx.globalAlpha = alphaB;
          ctx.drawImage(mwLayers[1], -(nebOffX + dxB) - MW_PAD, -(off + dyB) - MW_PAD, mwDW, mwDH);
          ctx.restore();
        } else {
          // Reduced motion or first frame: just draw layer 0
          ctx.drawImage(mwLayers[0], -nebOffX - MW_PAD, -off - MW_PAD, mwDW, mwDH);
        }
      }

      // Bright wisps along MW band (Lissajous drift, organic alpha pulsation)
      if (!reduced && time !== undefined && mwWisps.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < mwWisps.length; i++) {
          const w = mwWisps[i];
          const dx = Math.sin(driftTime * w.speedD + w.phaseD) * 80
                   + Math.sin(driftTime * w.speedD * 1.73 + w.phaseD + 1.2) * 40;
          const dy = Math.cos(driftTime * w.speedD * 0.81 + w.phaseD + 0.7) * 50
                   + Math.cos(driftTime * w.speedD * 1.37 + w.phaseD + 2.5) * 25;
          const alphaFrac = 0.6 + 0.3 * Math.sin(driftTime * w.speedA + w.phaseA)
                          + 0.1 * Math.sin(driftTime * w.speedA * 2.31 + w.phaseA + 1.0);
          const fa = w.baseAlpha * clamp(alphaFrac, 0.2, 1.0);

          const rawPx = w.cx * lw + dx + smoothMouseX * 8 - smoothCameraX * 0.04;
          const rawPy = w.cy * lh + dy + smoothMouseY * 8 - smoothCameraY * 0.04;
          const px = ((rawPx % lw) + lw) % lw;
          const py = ((rawPy % lh) + lh) % lh;

          const grad = ctx.createRadialGradient(px, py, 0, px, py, w.radius);
          grad.addColorStop(0, `rgba(${w.color[0]},${w.color[1]},${w.color[2]},${fa})`);
          grad.addColorStop(0.25, `rgba(${w.color[0]},${w.color[1]},${w.color[2]},${fa * 0.55})`);
          grad.addColorStop(0.5, `rgba(${w.color[0]},${w.color[1]},${w.color[2]},${fa * 0.2})`);
          grad.addColorStop(1, `rgba(${w.color[0]},${w.color[1]},${w.color[2]},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, w.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Deep field background (sub-pixel dots behind everything, very low parallax)
      if (deepFieldCanvas) {
        const dfOffX = (smoothCameraX * 0.015) | 0;
        const dfOffY = (smoothCameraY * 0.015) | 0;
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.imageSmoothingEnabled = true;
        drawWrapped(ctx, deepFieldCanvas, dfOffX, dfOffY, lw, lh);
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Zone nebulae (additive, pre-computed domain-warped textures)
      // Oversized textures — draw at (lw+2*NEB_PAD)×(lh+2*NEB_PAD), no wrapping needed
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.imageSmoothingEnabled = true;
      const nebCamX = (smoothCameraX * 0.02) | 0;
      const nebCamY = (smoothCameraY * 0.02) | 0;
      const nebDW = lw + NEB_PAD * 2, nebDH = lh + NEB_PAD * 2;
      for (let i = 0; i < ZONES.length; i++) {
        if (wts[i] < 0.01 || !zoneNebulae[i]) continue;
        ctx.globalAlpha = wts[i];
        ctx.drawImage(zoneNebulae[i], nebCamX - NEB_PAD, nebCamY - NEB_PAD, nebDW, nebDH);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // Special objects (skip when quality is very low)
      if (time !== undefined && qualityLevel > 0.3) drawSpecials(wts, time);

      // Galaxies
      for (const g of galaxies) drawGalObj(g, time ?? 0);

      // Per-layer star rendering with inter-layer fog
      for (let layerIdx = 0; layerIdx < 6; layerIdx++) {
        // Adaptive quality: skip dust layer when severely degraded
        if (layerIdx === 0 && qualityLevel < 0.5) {
          drawFog(layerIdx);
          continue;
        }
        if (starsByLayer[layerIdx]) {
          drawLayerStars(starsByLayer[layerIdx], layerIdx, time, starMod);
        }
        drawFog(layerIdx);
      }

      // Color wash
      drawWash(wts);

      // Foreground dust particles (skip when quality low)
      if (!reduced && qualityLevel > 0.4) {
        for (const dp of dustParticles) {
          const dx = dp.x + smoothMouseX * DUST_MOUSE_PARALLAX - smoothCameraX * 0.30;
          const dy = dp.y + smoothMouseY * DUST_MOUSE_PARALLAX * 0.6 - smoothCameraY * 0.30;
          const t = (time ?? 0) * 0.0001;
          const px = ((dx + noise2d(dp.driftPhase, t) * 8) % lw + lw) % lw;
          const py = ((dy + noise2d(dp.driftPhase + 100, t) * 8) % lh + lh) % lh;
          const grd = ctx.createRadialGradient(px, py, 0, px, py, dp.size * 4);
          grd.addColorStop(0, `rgba(180,190,220,${dp.alpha})`);
          grd.addColorStop(0.4, `rgba(160,170,200,${dp.alpha * 0.4})`);
          grd.addColorStop(1, `rgba(140,150,180,0)`);
          ctx.beginPath();
          ctx.arc(px, py, dp.size * 4, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }
      }

      // Shooting stars
      if (time !== undefined && !reduced) {
        maybeSpawnShootingStar(time);
        updateAndDrawShootingStars();
      }
    };

    const loop = (t: number) => {
      // Frame-rate-independent smooth scroll interpolation
      const dt = prevTime ? (t - prevTime) / 1000 : 0.016;
      prevTime = t;

      // Adaptive quality: monitor FPS every 30 frames
      fpsAccum += dt;
      fpsFrames++;
      if (fpsFrames >= 30) {
        const avgFps = fpsFrames / fpsAccum;
        if (avgFps < 30) qualityLevel = Math.max(0.25, qualityLevel - 0.1);
        else if (avgFps < 45) qualityLevel = Math.max(0.5, qualityLevel - 0.05);
        else if (avgFps > 55) qualityLevel = Math.min(1.0, qualityLevel + 0.05);
        fpsAccum = 0;
        fpsFrames = 0;
      }

      const scrollLerpFactor = 1 - Math.exp(-5 * dt);
      // Snap immediately on large jumps (e.g. anchor clicks)
      if (Math.abs(scrollY - smoothScroll) > lh * 1.5) {
        smoothScroll = scrollY;
      } else {
        smoothScroll += (scrollY - smoothScroll) * scrollLerpFactor;
      }
      // Snap when very close to prevent infinite sub-pixel updates
      if (Math.abs(scrollY - smoothScroll) < 0.5) smoothScroll = scrollY;
      // Camera: scroll progress → spiral world position (helix descent)
      const scrollProgress = maxScroll > 1 ? smoothScroll / maxScroll : 0;
      const [targetCamX, targetCamY] = helixPosition(scrollProgress);
      const camDamping = 1 - Math.exp(-6 * dt);
      if (Math.hypot(targetCamX - smoothCameraX, targetCamY - smoothCameraY) > Math.hypot(lw, lh) * 1.5) {
        smoothCameraX = targetCamX;
        smoothCameraY = targetCamY;
      } else {
        smoothCameraX += (targetCamX - smoothCameraX) * camDamping;
        smoothCameraY += (targetCamY - smoothCameraY) * camDamping;
      }
      // Camera velocity for motion blur
      camVelX = dt > 0 ? (smoothCameraX - prevCamX) / dt : 0;
      camVelY = dt > 0 ? (smoothCameraY - prevCamY) / dt : 0;
      prevCamX = smoothCameraX;
      prevCamY = smoothCameraY;
      // Mouse parallax lerp
      const mouseLerp = 1 - Math.exp(-4 * dt);
      smoothMouseX += (mouseX - smoothMouseX) * mouseLerp;
      smoothMouseY += (mouseY - smoothMouseY) * mouseLerp;
      // Drift
      driftTime += dt;
      drawFrame(t, dt);
      animId = requestAnimationFrame(loop);
    };

    let starsLw = 0, starsLh = 0;
    const handleResize = () => {
      // Check if dimensions actually changed BEFORE touching canvas
      // (setting canvas.width clears it, even with the same value — causes flash)
      const newLw = window.innerWidth, newLh = window.innerHeight;
      if (newLw === lw && newLh === lh) return;
      resize();
      generateMWLayers(); generateZoneNebulae(); generateDeepField();
      // Only regenerate stars if dimensions changed significantly (>5%)
      // Prevents mobile URL bar show/hide from causing full star flash
      const wRatio = starsLw ? Math.abs(lw - starsLw) / starsLw : 1;
      const hRatio = starsLh ? Math.abs(lh - starsLh) / starsLh : 1;
      if (wRatio > 0.05 || hRatio > 0.05) {
        generateDustGrid(); initStars(); computeStarDustDim(); generateStarSprites(); initDustParticles(); initMWWisps();
        starsLw = lw; starsLh = lh;
      }
      if (reduced) drawFrame();
    };

    resize(); generateMWLayers(); generateZoneNebulae(); generateDustGrid(); initStars(); computeStarDustDim(); generateStarSprites(); generateDeepField(); initDustParticles(); initMWWisps();
    starsLw = lw; starsLh = lh;
    smoothScroll = scrollY; // Initialize to current position
    // Initialize camera to current scroll position on helix path
    const initProgress = maxScroll > 1 ? scrollY / maxScroll : 0;
    const [initCamX, initCamY] = helixPosition(initProgress);
    smoothCameraX = initCamX;
    smoothCameraY = initCamY;
    prevCamX = initCamX;
    prevCamY = initCamY;
    smoothWeights = getWeights(); // Initialize zone weights
    currentStarMod = getStarMod(smoothWeights);

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / lw) - 0.5;
      mouseY = (e.clientY / lh) - 0.5;
    };

    if (reduced) { drawFrame(); } else { animId = requestAnimationFrame(loop); }

    // For reduced motion: redraw on scroll since there's no animation loop
    const onScrollReduced = () => {
      onScroll();
      smoothScroll = scrollY;
      // Reduced motion: camera stays fixed at origin (no spiral translation)
      smoothCameraX = 0;
      smoothCameraY = 0;
      const wts = getWeights();
      smoothWeights = wts;
      currentStarMod = getStarMod(wts);
      drawFrame();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", reduced ? onScrollReduced : onScroll, { passive: true });
    if (!reduced) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
    }
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", reduced ? onScrollReduced : onScroll);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
