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

/** Zone-specific warped noise — each warpStyle produces fundamentally different structure */
function warpedNoiseZone(
  x: number, y: number,
  nb: ZoneNebConf
): { val: number; q1: number; q2: number } {
  const sx = x * nb.scale, sy = y * nb.scale;
  const off = nb.noiseOff;
  const oct = nb.octaves ?? 4;
  const lac = nb.lacunarity ?? 2.0;
  const style = nb.warpStyle ?? 'standard';
  const wK = nb.warpK;

  let val: number, q1: number, q2: number;

  switch (style) {
    case 'ridged': {
      // Ridged multi-fractal — sharp creases and filaments
      q1 = fbm(sx + off, sy + off, oct, lac);
      q2 = fbm(sx + off + 73.1, sy + off - 47.6, oct, lac);
      // Ridge: abs(noise) inverted → sharp valleys become sharp peaks
      const r1 = 1 - Math.abs(fbm(sx + wK * q1, sy + wK * q2, oct + 1, lac));
      const r2 = 1 - Math.abs(fbm(sx + wK * q2 + 19.4, sy + wK * q1 - 23.8, oct, lac));
      val = r1 * r2; // multiply two ridge fields → creates intricate filamentary networks
      break;
    }
    case 'turbulent': {
      // Turbulence — absolute value fbm → cloud-like billows with sharp folds
      q1 = fbm(sx + off + 111.7, sy + off - 88.3, oct, lac);
      q2 = fbm(sx + off - 65.2, sy + off + 142.9, oct, lac);
      let turb = 0, amp = 1, freq = 1, maxA = 0;
      for (let i = 0; i < oct + 2; i++) {
        turb += Math.abs(noise2d((sx + wK * q1) * freq, (sy + wK * q2) * freq)) * amp;
        maxA += amp; amp *= 0.45; freq *= lac;
      }
      val = turb / maxA;
      break;
    }
    case 'cellular': {
      // Pseudo-Voronoi — creates bubble/cell-like structures
      q1 = fbm(sx + off + 200.3, sy + off + 155.7, oct, lac);
      q2 = fbm(sx + off - 178.4, sy + off + 210.1, oct, lac);
      const wx = sx + wK * q1, wy = sy + wK * q2;
      // Approximate Voronoi via min-distance to grid-jittered points
      const gx = Math.floor(wx), gy = Math.floor(wy);
      let minD = 8;
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const cx = gx + di + (noise2d((gx + di) * 13.7 + off, (gy + dj) * 17.3 + off) * 0.5 + 0.5);
          const cy = gy + dj + (noise2d((gx + di) * 23.1 + off, (gy + dj) * 11.9 + off) * 0.5 + 0.5);
          const dd = (wx - cx) * (wx - cx) + (wy - cy) * (wy - cy);
          if (dd < minD) minD = dd;
        }
      }
      val = 1 - Math.sqrt(minD);
      break;
    }
    case 'marble': {
      // Marble/veins — sinusoidal distortion of coordinates → banded organic veins
      q1 = fbm(sx + off - 300.5, sy + off + 275.2, oct, lac);
      q2 = fbm(sx + off + 320.8, sy + off - 290.4, oct, lac);
      const phase = sx * 2.5 + sy * 1.8 + wK * (q1 + q2);
      val = Math.sin(phase) * 0.5 + 0.5;
      // Add secondary detail
      val = val * 0.7 + fbm(sx + wK * q1 * 0.5, sy + wK * q2 * 0.5, oct, lac) * 0.3;
      break;
    }
    default: {
      // Standard domain warp (original algorithm, but using per-zone octaves/lacunarity)
      q1 = fbm(sx + off, sy + off, oct, lac);
      q2 = fbm(sx + off + 52.3, sy + off + 31.7, oct, lac);
      val = fbm(sx + wK * q1, sy + wK * q2, oct + 1, lac);
      break;
    }
  }

  return { val, q1: q1!, q2: q2! };
}

/* ================================================================
   ZONE-SPECIFIC NEBULA GENERATORS
   Each zone has a fundamentally different geometric structure
   so they are instantly distinguishable at a glance.
   ================================================================ */

/** Zone 0 — "Golden Veil": Diagonal swept filaments (Carina-like stellar wind).
 *  Anisotropic noise stretched 4:1 along ~25° diagonal creates long fiber structures. */
function genNebZone0(u32: Uint32Array, nw: number, nh: number, nb: ZoneNebConf) {
  const off = nb.noiseOff;
  const ang = 0.44; // ~25° sweep
  const cosA = Math.cos(ang), sinA = Math.sin(ang);
  const ang2 = 0.62; // secondary layer
  const cosB = Math.cos(ang2), sinB = Math.sin(ang2);
  for (let py = 0; py < nh; py++) {
    for (let px = 0; px < nw; px++) {
      const cx = (px - nw * 0.5) / nh, cy = (py - nh * 0.5) / nh;
      // Rotate into sweep coordinate system
      const rx = cx * cosA + cy * sinA;
      const ry = -cx * sinA + cy * cosA;
      // Anisotropic: thin perpendicular, long along sweep
      const sx = rx * 22, sy = ry * 5.5;
      // Domain warp
      const w1 = fbm(sx + off, sy + off, 4, 2.1);
      const w2 = fbm(sx + off + 47.3, sy + off + 29.1, 4, 2.1);
      const v1 = fbm(sx + w1 * 2.8, sy + w2 * 1.0, 5, 2.0);
      // Secondary layer at different angle
      const rx2 = cx * cosB + cy * sinB, ry2 = -cx * sinB + cy * cosB;
      const v2 = fbm(rx2 * 16 + off + 100, ry2 * 4.5 + off + 100, 4, 2.2);
      const combined = v1 * 0.65 + v2 * 0.35;
      const density = Math.pow(Math.max(0, combined * 0.5 + 0.5 + nb.density), nb.falloff);
      const colorMix = clamp((w1 + 1) * 0.5, 0, 1);
      const int = density * nb.peak;
      const r = lerp(nb.c1[0], nb.c2[0], colorMix) * int / 255 + w2 * int * 0.08;
      const g = lerp(nb.c1[1], nb.c2[1], colorMix) * int / 255 + w2 * int * 0.04;
      const b = lerp(nb.c1[2], nb.c2[2], colorMix) * int / 255 - w2 * int * 0.03;
      u32[py * nw + px] = (255 << 24) | (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) | clamp(r, 0, 255);
    }
  }
}

/** Zone 1 — "Emerald Reef": Aurora curtain bands (aurora borealis / Veil Nebula drapes).
 *  sin(x * freq + noise_warp) creates vertical undulating bands at multiple frequencies. */
function genNebZone1(u32: Uint32Array, nw: number, nh: number, nb: ZoneNebConf) {
  const off = nb.noiseOff;
  for (let py = 0; py < nh; py++) {
    for (let px = 0; px < nw; px++) {
      const nx = px / nw, ny = py / nh;
      // Warp fields for curtain deformation
      const warpX = fbm(nx * 3.5 + off, ny * 7 + off, 5, 2.2);
      const warpY = fbm(nx * 5 + off + 77, ny * 1.5 + off + 33, 4, 2.0);
      // Three curtain layers at different spacings
      const p1 = (nx * 13 + warpX * 1.6 + warpY * 0.3) * Math.PI;
      const p2 = (nx * 7.5 + warpX * 1.1 + 2.1) * Math.PI;
      const p3 = (nx * 21 + warpX * 2.0 - 1.3) * Math.PI;
      // Sharp peaks via high power of abs(sin)
      const c1v = Math.pow(Math.abs(Math.sin(p1)), 4);
      const c2v = Math.pow(Math.abs(Math.sin(p2)), 5) * 0.5;
      const c3v = Math.pow(Math.abs(Math.sin(p3)), 6) * 0.2;
      let val = c1v + c2v + c3v;
      // Brightness variation along y
      const yMod = fbm(nx * 0.8 + off + 200, ny * 6 + off + 200, 3, 2.0);
      val *= clamp(yMod * 0.45 + 0.55, 0.2, 1.0);
      // Subtle vertical fade (brighter near center)
      val *= 1 - Math.pow(Math.abs(ny - 0.5) * 2, 3) * 0.3;
      const density = Math.pow(clamp(val * 0.6, 0, 1), 1.8);
      // Color: different curtain layers → different tints
      const colorMix = clamp(c2v / (c1v + 0.05), 0, 1);
      const int = density * nb.peak;
      const accent = c3v * int * 0.15;
      const r = lerp(nb.c1[0], nb.c2[0], colorMix) * int / 255 + accent * 0.2;
      const g = lerp(nb.c1[1], nb.c2[1], colorMix) * int / 255 + accent * 0.6;
      const b = lerp(nb.c1[2], nb.c2[2], colorMix) * int / 255 + accent * 0.9;
      u32[py * nw + px] = (255 << 24) | (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) | clamp(r, 0, 255);
    }
  }
}

/** Zone 2 — "Ice Abyss": Broken concentric shell arcs (Vela SNR / planetary nebula).
 *  sin(r * freq + angular_noise) creates rings, noise mask breaks them into arcs. */
function genNebZone2(u32: Uint32Array, nw: number, nh: number, nb: ZoneNebConf) {
  const off = nb.noiseOff;
  // Off-center origin avoids bullseye look
  const cx0 = 0.35, cy0 = 0.4;
  for (let py = 0; py < nh; py++) {
    for (let px = 0; px < nw; px++) {
      const nx = px / nw - cx0, ny = py / nh - cy0;
      const r = Math.sqrt(nx * nx + ny * ny);
      const theta = Math.atan2(ny, nx);
      // Angular noise breaks rings into arcs
      const angN1 = fbm(theta * 2 + off, r * 10 + off, 5, 2.1);
      const angN2 = fbm(theta * 3.5 + off + 100, r * 6 + off + 100, 4, 2.0);
      // Perturbed radius for rings
      const pertR = r * 14 + angN1 * 2.8 + angN2 * 1.5;
      // Sharp rings via high-power abs(sin)
      const ring1 = Math.pow(Math.abs(Math.sin(pertR * Math.PI)), 8);
      const ring2 = Math.pow(Math.abs(Math.sin((pertR * 0.55 + 0.3) * Math.PI)), 6) * 0.45;
      const ring3 = Math.pow(Math.abs(Math.sin((pertR * 1.7 + 0.7) * Math.PI)), 10) * 0.25;
      // Arc masking — noise selectively dims ring portions
      const arcMask = clamp(fbm(nx * 8 + off + 200, ny * 8 + off + 200, 4, 2.0) + 0.3, 0, 1);
      let val = (ring1 + ring2 + ring3) * arcMask;
      // Faint inter-ring emission glow
      val += Math.exp(-r * r * 8) * 0.12;
      // Radial falloff
      val *= Math.exp(-r * r * 4);
      const density = Math.pow(Math.max(0, val), nb.falloff * 0.5);
      // Color: inner brighter, outer deeper
      const colorMix = clamp(r * 2.5, 0, 1);
      const int = density * nb.peak;
      const highlight = ring1 * arcMask * Math.exp(-r * 3) * int * 0.1;
      const rv = lerp(nb.c1[0], nb.c2[0], colorMix) * int / 255 + highlight * 0.3;
      const gv = lerp(nb.c1[1], nb.c2[1], colorMix) * int / 255 + highlight * 0.6;
      const bv = lerp(nb.c1[2], nb.c2[2], colorMix) * int / 255 + highlight;
      u32[py * nw + px] = (255 << 24) | (clamp(bv, 0, 255) << 16) |
        (clamp(gv, 0, 255) << 8) | clamp(rv, 0, 255);
    }
  }
}

/** Zone 3 — "Purple Rift": Veil Nebula branching filaments with pillar structures.
 *  Three filament axes at crossing angles + dark absorption pillars create a rich
 *  lacework of bright shock-front threads with visible directionality and depth.
 *  Warm magenta/pink highlights on bright edges, deep violet in shadows. */
function genNebZone3(u32: Uint32Array, nw: number, nh: number, nb: ZoneNebConf) {
  const off = nb.noiseOff;
  const nebRot = nb.rot ?? 0, nebAsp = nb.aspect ?? 1;
  const cosR = Math.cos(nebRot), sinR = Math.sin(nebRot);
  // Three filament directions for branching network
  const ang2 = nebRot + 0.55;
  const cos2 = Math.cos(ang2), sin2 = Math.sin(ang2);
  const ang3 = nebRot - 0.4;
  const cos3 = Math.cos(ang3), sin3 = Math.sin(ang3);

  for (let py = 0; py < nh; py++) {
    for (let px = 0; px < nw; px++) {
      const cx = (px - nw * 0.5) / nh;
      const cy = (py - nh * 0.5) / nh;

      // Three rotated axes
      const rx1 = cx * cosR + cy * sinR;
      const ry1 = (-cx * sinR + cy * cosR) * nebAsp;
      const rx2 = cx * cos2 + cy * sin2;
      const ry2 = (-cx * sin2 + cy * cos2) * 1.3;
      const rx3 = cx * cos3 + cy * sin3;
      const ry3 = (-cx * sin3 + cy * cos3) * 1.1;

      // Strong domain warp for dramatic curvature
      const w1 = fbm(rx1 * 6 + off, ry1 * 6 + off, 5, 2.2);
      const w2 = fbm(rx1 * 4.5 + off + 91.3, ry1 * 8 + off - 63.7, 4, 2.1);
      const w3 = fbm(rx2 * 7 + off + 200, ry2 * 5 + off + 150, 4, 2.3);
      const w4 = fbm(rx3 * 5 + off + 400, ry3 * 7 + off + 350, 4, 2.0);

      // Warped perpendicular coords — strong warp = dramatic bends
      const wy1 = ry1 + w1 * 0.18 + w2 * 0.09;
      const wy2 = ry2 + w3 * 0.15 + w1 * 0.06;
      const wy3 = ry3 + w4 * 0.13 + w2 * 0.05;

      // --- Primary filaments: bold shock-front threads ---
      const p1 = (wy1 * 7 + w1 * 2.2) * Math.PI;
      const fil1 = Math.pow(1 - Math.abs(Math.sin(p1)), 4);
      // Paired companion thread (double-strand structure)
      const p1b = (wy1 * 7 + w1 * 2.2 + 0.06) * Math.PI;
      const fil1b = Math.pow(1 - Math.abs(Math.sin(p1b)), 5) * 0.45;

      // --- Secondary filaments: crossing branches ---
      const p2 = (wy2 * 5.5 + w3 * 1.8) * Math.PI;
      const fil2 = Math.pow(1 - Math.abs(Math.sin(p2)), 3) * 0.4;

      // --- Tertiary filaments: fine crossing wisps ---
      const p3 = (wy3 * 6.5 + w4 * 1.5) * Math.PI;
      const fil3 = Math.pow(1 - Math.abs(Math.sin(p3)), 5) * 0.25;

      // --- Ridged sub-structure within primary filaments ---
      // High-freq ridge overlaid on primary for internal texture
      const ridge = (1 - Math.abs(fbm(rx1 * 14 + w1 * 3 + off, ry1 * 14 + w2 * 2 + off, 3, 2.5)));
      const ridgeMod = ridge * ridge * 0.3;

      // Combine: filaments + knots at intersections + ridge detail
      let val = fil1 * (1 + ridgeMod) + fil1b + fil2 + fil3
        + fil1 * fil2 * 5 + fil1 * fil3 * 3;

      // --- Dark absorption pillars: elongated dark columns ---
      const pillarN = fbm(cx * 3 + off + 300, cy * 6 + off + 300, 5, 2.0);
      const pillar = clamp(pillarN * 1.1 + 0.3, 0.03, 1.0);
      val *= pillar;

      // --- Soft central emission glow ---
      const gcx = cx + 0.05, gcy = cy - 0.03;
      val += Math.exp(-(gcx * gcx + gcy * gcy) * 6) * 0.12;

      // --- Wide asymmetric radial envelope ---
      const fd = Math.sqrt((cx + 0.08) * (cx + 0.08) + (cy - 0.04) * (cy - 0.04));
      val *= clamp(1.5 - fd * 1.4, 0, 1);

      const density = Math.pow(clamp(val, 0, 1), 1.1);

      // --- Color: deep violet → hot magenta, warm pink highlights ---
      const colorMix = clamp((fil2 + fil3) / (fil1 + 0.12) + w2 * 0.15, 0, 1);
      const int = density * nb.peak;
      // Warm magenta/pink highlight on brightest filament peaks
      const hotSpot = clamp(fil1 * pillar, 0, 1) * int * 0.1;

      const r = lerp(nb.c1[0], nb.c2[0], colorMix) * int / 255 + hotSpot * 1.2;
      const g = lerp(nb.c1[1], nb.c2[1], colorMix) * int / 255 + hotSpot * 0.15;
      const b = lerp(nb.c1[2], nb.c2[2], colorMix) * int / 255 + hotSpot * 0.4;

      u32[py * nw + px] = (255 << 24) | (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) | clamp(r, 0, 255);
    }
  }
}

/** Zone 4 — "Edge of Universe": Voronoi void cells (N44 superbubble / cosmic voids).
 *  F2-F1 Voronoi → bright cell boundaries, dark interiors. Sparse and desolate. */
function genNebZone4(u32: Uint32Array, nw: number, nh: number, nb: ZoneNebConf) {
  const off = nb.noiseOff;
  for (let py = 0; py < nh; py++) {
    for (let px = 0; px < nw; px++) {
      const sx = px * 0.009, sy = py * 0.009;
      // Domain warp for organic cell shapes
      const w1 = fbm(sx + off + 200, sy + off + 155, 4, 2.0);
      const w2 = fbm(sx + off - 178, sy + off + 210, 4, 2.0);
      const wx = sx + w1 * 1.8, wy = sy + w2 * 1.8;
      // Voronoi: find F1 (nearest) and F2 (second nearest)
      const gx = Math.floor(wx), gy = Math.floor(wy);
      let f1 = 99, f2 = 99;
      for (let di = -2; di <= 2; di++) {
        for (let dj = -2; dj <= 2; dj++) {
          const ci = gx + di, cj = gy + dj;
          const ccx = ci + (noise2d(ci * 13.7 + off, cj * 17.3 + off) * 0.5 + 0.5);
          const ccy = cj + (noise2d(ci * 23.1 + off, cj * 11.9 + off) * 0.5 + 0.5);
          const dd = Math.sqrt((wx - ccx) ** 2 + (wy - ccy) ** 2);
          if (dd < f1) { f2 = f1; f1 = dd; }
          else if (dd < f2) { f2 = dd; }
        }
      }
      // F2-F1: 0 at cell boundaries → bright rims via Gaussian peak
      const edge = f2 - f1;
      const rim = Math.exp(-edge * edge * 35) * 0.9;
      const inner = Math.pow(Math.max(0, 1 - f1 * 1.5), 3) * 0.06;
      const fineDetail = Math.max(0, fbm(wx * 3 + off + 500, wy * 3 + off + 500, 3, 2.0)) * 0.04;
      const val = rim + inner + fineDetail;
      const density = Math.pow(Math.max(0, val), nb.falloff * 0.4);
      const colorMix = clamp(edge * 3, 0, 1);
      const int = density * nb.peak;
      const rv = lerp(nb.c1[0], nb.c2[0], colorMix) * int / 255;
      const gv = lerp(nb.c1[1], nb.c2[1], colorMix) * int / 255;
      const bv = lerp(nb.c1[2], nb.c2[2], colorMix) * int / 255;
      u32[py * nw + px] = (255 << 24) | (clamp(bv, 0, 255) << 16) |
        (clamp(gv, 0, 255) << 8) | clamp(rv, 0, 255);
    }
  }
}

/* ================================================================
   DSO POST-PROCESSING — glow/bloom and tone mapping
   Applied to each DSO texture after pixel generation for photographic look
   ================================================================ */

/** Filmic tone mapping (Uncharted 2) — prevents flat washed-out colors */
function filmicTonemap(x: number): number {
  const A = 0.15, B = 0.50, C = 0.10, D = 0.20, E = 0.02, F = 0.30;
  return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
}
function tonemap(v: number): number {
  const W = 2.5; // white point
  return filmicTonemap(v) / filmicTonemap(W);
}

/** Box blur helper — 3-pass separable (H+V) ≈ gaussian.
 *  Operates in-place on the provided canvas context. */
function boxBlur3Pass(bCtx: CanvasRenderingContext2D, sw: number, sh: number, blurRadius: number) {
  for (let pass = 0; pass < 3; pass++) {
    const imgD = bCtx.getImageData(0, 0, sw, sh);
    const src = new Uint8ClampedArray(imgD.data);
    const dst = imgD.data;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        let rS = 0, gS = 0, bS = 0, aS = 0, cnt = 0;
        for (let kx = -blurRadius; kx <= blurRadius; kx++) {
          const sx2 = Math.min(sw - 1, Math.max(0, x + kx));
          const i = (y * sw + sx2) * 4;
          rS += src[i]; gS += src[i + 1]; bS += src[i + 2]; aS += src[i + 3]; cnt++;
        }
        const oi = (y * sw + x) * 4;
        dst[oi] = (rS / cnt) | 0; dst[oi + 1] = (gS / cnt) | 0;
        dst[oi + 2] = (bS / cnt) | 0; dst[oi + 3] = (aS / cnt) | 0;
      }
    }
    bCtx.putImageData(imgD, 0, 0);
    const imgD2 = bCtx.getImageData(0, 0, sw, sh);
    const src2 = new Uint8ClampedArray(imgD2.data);
    const dst2 = imgD2.data;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        let rS = 0, gS = 0, bS = 0, aS = 0, cnt = 0;
        for (let ky = -blurRadius; ky <= blurRadius; ky++) {
          const sy2 = Math.min(sh - 1, Math.max(0, y + ky));
          const i = (sy2 * sw + x) * 4;
          rS += src2[i]; gS += src2[i + 1]; bS += src2[i + 2]; aS += src2[i + 3]; cnt++;
        }
        const oi = (y * sw + x) * 4;
        dst2[oi] = (rS / cnt) | 0; dst2[oi + 1] = (gS / cnt) | 0;
        dst2[oi + 2] = (bS / cnt) | 0; dst2[oi + 3] = (aS / cnt) | 0;
      }
    }
    bCtx.putImageData(imgD2, 0, 0);
  }
}

/** Dual-radius chromatic bloom for photographic DSO quality.
 *  Pass 1: sharp inner glow (small radius) — retains detail.
 *  Pass 2: soft outer halo (large radius) — ethereal atmosphere.
 *  Blue channel blooms slightly wider for subtle chromatic fringing. */
function applyDSOGlow(canvas: HTMLCanvasElement, radius: number = 8, strength: number = 0.35): HTMLCanvasElement {
  const w = canvas.width, h = canvas.height;
  if (w < 4 || h < 4) return canvas;

  // Downscale 4x for sharp bloom, 8x for soft halo
  const ds1 = 4, ds2 = 8;
  const sw1 = Math.max(2, (w / ds1) | 0), sh1 = Math.max(2, (h / ds1) | 0);
  const sw2 = Math.max(2, (w / ds2) | 0), sh2 = Math.max(2, (h / ds2) | 0);

  // Sharp inner bloom
  const blurC1 = document.createElement("canvas");
  blurC1.width = sw1; blurC1.height = sh1;
  const bCtx1 = blurC1.getContext("2d")!;
  bCtx1.drawImage(canvas, 0, 0, sw1, sh1);
  boxBlur3Pass(bCtx1, sw1, sh1, Math.max(1, (radius / ds1) | 0));

  // Soft outer halo (larger downscale = wider effective blur)
  const blurC2 = document.createElement("canvas");
  blurC2.width = sw2; blurC2.height = sh2;
  const bCtx2 = blurC2.getContext("2d")!;
  bCtx2.drawImage(canvas, 0, 0, sw2, sh2);
  boxBlur3Pass(bCtx2, sw2, sh2, Math.max(1, ((radius * 1.5) / ds2) | 0));

  // Composite: original + inner bloom + outer halo
  const outC = document.createElement("canvas");
  outC.width = w; outC.height = h;
  const oCtx = outC.getContext("2d")!;
  oCtx.drawImage(canvas, 0, 0);
  oCtx.globalCompositeOperation = "lighter";
  // Sharp inner bloom layer
  oCtx.globalAlpha = strength;
  oCtx.drawImage(blurC1, 0, 0, w, h);
  // Soft outer halo — very restrained to avoid foggy band
  oCtx.globalAlpha = strength * 0.3;
  oCtx.drawImage(blurC2, 0, 0, w, h);
  // Chromatic fringe: subtle blue channel expansion (very restrained)
  oCtx.globalAlpha = strength * 0.08;
  oCtx.drawImage(blurC2, -w * 0.008, -h * 0.008, w * 1.016, h * 1.016);
  oCtx.globalAlpha = 1;
  oCtx.globalCompositeOperation = "source-over";
  return outC;
}

/** Scatter resolved field stars into a DSO texture (2nd pass).
 *  Mimics the field stars visible through/around nebulae in real astrophotography. */
function addEmbeddedStars(canvas: HTMLCanvasElement, count: number, brightness: number): void {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  const maxR = Math.min(w, h) * 0.45;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rad = Math.pow(Math.random(), 0.7) * maxR; // slight center bias
    const x = cx + Math.cos(angle) * rad;
    const y = cy + Math.sin(angle) * rad;
    const sz = 0.3 + Math.random() * 0.7;
    const br = brightness * (0.3 + Math.random() * 0.7);
    // Spectral variation: warm to cool
    const temp = Math.random();
    const sr = 200 + temp * 55, sg = 210 + temp * 40, sb = 220 + (1 - temp) * 35;
    // Soft glow halo
    const grad = ctx.createRadialGradient(x, y, 0, x, y, sz * 3.5);
    grad.addColorStop(0, `rgba(${sr | 0},${sg | 0},${sb | 0},${br * 0.35})`);
    grad.addColorStop(0.4, `rgba(${sr | 0},${sg | 0},${sb | 0},${br * 0.08})`);
    grad.addColorStop(1, `rgba(${sr | 0},${sg | 0},${sb | 0},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, sz * 3.5, 0, Math.PI * 2); ctx.fill();
    // Bright core
    ctx.fillStyle = `rgba(255,255,255,${br * 0.6})`;
    ctx.beginPath(); ctx.arc(x, y, sz * 0.4, 0, Math.PI * 2); ctx.fill();
  }
}

/** Add subtle astrophoto grain/noise texture to a DSO canvas.
 *  Simulates CCD sensor noise at very low opacity for photographic feel. */
function addAstroGrain(canvas: HTMLCanvasElement, intensity: number = 0.04): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const w = canvas.width, h = canvas.height;
  const imgD = ctx.getImageData(0, 0, w, h);
  const d = imgD.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 5) continue; // skip transparent pixels
    const grain = (Math.random() - 0.5) * 255 * intensity;
    d[i] = clamp(d[i] + grain, 0, 255);
    d[i + 1] = clamp(d[i + 1] + grain * 0.9, 0, 255);
    d[i + 2] = clamp(d[i + 2] + grain * 1.1, 0, 255); // blue channel slightly noisier
  }
  ctx.putImageData(imgD, 0, 0);
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
  cepheidPeriod?: number; // pulsation period in seconds (Cepheid variable)
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

interface Satellite {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  brightness: number;
  flareTime: number; // fraction of life when Iridium flare occurs
}

interface Comet {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  dustAngle: number;  // curved dust tail offset angle
  tailLen: number;    // ion tail length
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
type WarpStyle = 'standard' | 'ridged' | 'turbulent' | 'cellular' | 'marble';
interface ZoneNebConf {
  noiseOff: number; scale: number; warpK: number;
  density: number; falloff: number;
  c1: [number, number, number]; c2: [number, number, number];
  peak: number; // max RGB output
  rot?: number;  // noise-space rotation (radians) for structural uniqueness
  aspect?: number; // noise-space stretch (1 = isotropic)
  octaves?: number;    // fbm octaves (default 4)
  lacunarity?: number; // frequency multiplier per octave (default 2.0)
  warpStyle?: WarpStyle; // noise algorithm variant
}

interface UniverseZone {
  scrollStart: number; scrollEnd: number;
  colorWash: [number, number, number]; washOp: number;
  starBrightMod: number;
  neb: ZoneNebConf;
}

const ZONES: UniverseZone[] = [
  // Zone 0 — "Golden Veil" (Hero): warm H-alpha emission — standard warp, smooth billows
  {
    scrollStart: 0, scrollEnd: 0.32,
    colorWash: [255, 180, 80], washOp: 0.03,
    starBrightMod: 1.0,
    neb: {
      noiseOff: 0, scale: 0.008, warpK: 3.5,
      density: 0.15, falloff: 2.8,
      c1: [255, 130, 60], c2: [200, 80, 45],
      peak: 140, rot: 0, aspect: 1.0,
      warpStyle: 'standard', octaves: 5, lacunarity: 2.0,
    },
  },
  // Zone 1 — "Emerald Reef" (Services): OIII — turbulent cloud billows (abs-value folded noise)
  {
    scrollStart: 0.08, scrollEnd: 0.48,
    colorWash: [40, 190, 130], washOp: 0.025,
    starBrightMod: 1.0,
    neb: {
      noiseOff: 1337, scale: 0.012, warpK: 3.0,
      density: 0.12, falloff: 2.6,
      c1: [45, 210, 140], c2: [70, 175, 200],
      peak: 125, rot: 0.65, aspect: 1.3,
      warpStyle: 'turbulent', octaves: 6, lacunarity: 2.2,
    },
  },
  // Zone 2 — "Ice Abyss" (Cases): blue — marble veins (sinusoidal banded structure)
  {
    scrollStart: 0.25, scrollEnd: 0.65,
    colorWash: [50, 85, 200], washOp: 0.035,
    starBrightMod: 0.82,
    neb: {
      noiseOff: 4219, scale: 0.005, warpK: 1.8,
      density: 0.10, falloff: 3.2,
      c1: [40, 80, 210], c2: [25, 45, 155],
      peak: 115, rot: -0.4, aspect: 0.8,
      warpStyle: 'marble', octaves: 5, lacunarity: 1.9,
    },
  },
  // Zone 3 — "Purple Rift" (About + Demo): Veil Nebula branching filaments (shock-front threads)
  {
    scrollStart: 0.42, scrollEnd: 0.85,
    colorWash: [140, 50, 180], washOp: 0.03,
    starBrightMod: 0.88,
    neb: {
      noiseOff: 7891, scale: 0.007, warpK: 4.5,
      density: 0.10, falloff: 2.8,
      c1: [140, 25, 225], c2: [235, 50, 155],
      peak: 105, rot: 1.2, aspect: 1.5,
      warpStyle: 'ridged', octaves: 5, lacunarity: 2.3,
    },
  },
  // Zone 4 — "Edge of Universe" (Blog + Footer): cellular void bubbles
  {
    scrollStart: 0.60, scrollEnd: 1.0,
    colorWash: [12, 12, 35], washOp: 0.05,
    starBrightMod: 0.3,
    neb: {
      noiseOff: 12345, scale: 0.004, warpK: 1.5,
      density: 0.04, falloff: 4.0,
      c1: [22, 28, 65], c2: [12, 18, 45],
      peak: 35, rot: -0.8, aspect: 1.1,
      warpStyle: 'cellular', octaves: 4, lacunarity: 2.0,
    },
  },
];

/* ================================================================
   CONSTELLATIONS — recognizable star patterns tied to scroll zones
   Positions: fractional viewport offsets from constellation center
   ================================================================ */
interface ConstellationDef {
  vpX: number; vpY: number;    // center in viewport (0-1)
  zoneWeights: number[];       // which zones show this (index → blend factor)
  stars: { dx: number; dy: number; mag: number; color?: [number, number, number] }[];
  edges: [number, number][];   // index pairs for connecting lines
}
interface ConstLineSprite { canvas: HTMLCanvasElement; ox: number; oy: number }

const CONSTELLATIONS: ConstellationDef[] = [
  // Cassiopeia — W shape, upper right, Zone 0-1
  {
    vpX: 0.78, vpY: 0.18,
    zoneWeights: [1, 0.5, 0, 0, 0],
    stars: [
      { dx: -0.065, dy: -0.025, mag: 2.28 },  // β Caph
      { dx: -0.025, dy: 0.030, mag: 2.24 },   // α Schedar
      { dx: 0.005, dy: -0.020, mag: 2.47 },   // γ
      { dx: 0.035, dy: 0.028, mag: 2.68 },    // δ Ruchbah
      { dx: 0.065, dy: -0.015, mag: 3.37 },   // ε Segin
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  // Orion — hunter with belt, center-left, Zone 1-2
  {
    vpX: 0.28, vpY: 0.45,
    zoneWeights: [0, 0.6, 1, 0.3, 0],
    stars: [
      { dx: -0.050, dy: -0.075, mag: 0.5, color: [255, 180, 120] },  // Betelgeuse (red)
      { dx: 0.045, dy: 0.070, mag: 0.13, color: [170, 200, 255] },  // Rigel (blue)
      { dx: 0.040, dy: -0.065, mag: 1.64 },   // Bellatrix
      { dx: -0.040, dy: 0.065, mag: 2.09 },   // Saiph
      { dx: -0.012, dy: 0.000, mag: 1.77 },   // Alnitak (belt)
      { dx: 0.000, dy: 0.000, mag: 1.69 },    // Alnilam (belt)
      { dx: 0.012, dy: -0.002, mag: 2.23 },   // Mintaka (belt)
      { dx: 0.002, dy: 0.030, mag: 3.5 },     // Sword (M42 location)
    ],
    edges: [[0, 2], [0, 4], [2, 6], [4, 5], [5, 6], [3, 4], [1, 6], [5, 7]],
  },
  // Big Dipper (Ursa Major) — Zone 2-3, right side
  {
    vpX: 0.72, vpY: 0.32,
    zoneWeights: [0, 0, 0.5, 1, 0.3],
    stars: [
      { dx: 0.070, dy: 0.010, mag: 1.79 },    // α Dubhe
      { dx: 0.055, dy: 0.035, mag: 2.37 },    // β Merak
      { dx: 0.025, dy: 0.030, mag: 2.44 },    // γ Phecda
      { dx: 0.015, dy: 0.005, mag: 3.31 },    // δ Megrez
      { dx: -0.015, dy: -0.005, mag: 1.77 },  // ε Alioth
      { dx: -0.042, dy: -0.020, mag: 2.27 },  // ζ Mizar
      { dx: -0.070, dy: -0.008, mag: 1.86 },  // η Alkaid
    ],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
  },
];

/* ================================================================
   DEEP SKY OBJECTS — galaxies, nebulae, clusters tied to zones
   ================================================================ */
type DsoType =
  | 'andromeda' | 'pleiades' | 'orion_nebula'
  | 'crab_nebula' | 'eagle_nebula' | 'ring_nebula' | 'lagoon_nebula'
  | 'whirlpool' | 'horsehead' | 'omega_nebula' | 'triangulum'
  | 'helix_nebula' | 'sombrero' | 'butterfly_nebula' | 'rosette_nebula';

interface DeepSkyDef {
  vpX: number; vpY: number;   // position on the MW layer (0-1 viewport fractions)
  type: DsoType;
  size: number;   // fraction of min(lw,lh)
  angle: number;  // rotation
  depth: 0 | 1 | 2; // 0=deepest (galaxies), 1=mid (large nebulae), 2=nearest (compact)
}

const DEEP_SKY: DeepSkyDef[] = [
  // depth 2 — nearest (compact objects): faster drift, drawn after zone nebulae
  { vpX: 0.08, vpY: 0.12, type: 'crab_nebula', size: 0.06, angle: 0.3, depth: 2 },
  { vpX: 0.82, vpY: 0.08, type: 'pleiades', size: 0.10, angle: 0, depth: 2 },
  { vpX: 0.35, vpY: 0.78, type: 'ring_nebula', size: 0.045, angle: 0.4, depth: 2 },
  { vpX: 0.65, vpY: 0.72, type: 'butterfly_nebula', size: 0.06, angle: 0.6, depth: 2 },
  { vpX: 0.18, vpY: 0.88, type: 'helix_nebula', size: 0.08, angle: 0.15, depth: 2 },
  // depth 1 — mid (large nebulae): moderate drift, drawn after deep field
  { vpX: 0.45, vpY: 0.05, type: 'lagoon_nebula', size: 0.08, angle: -0.1, depth: 1 },
  { vpX: 0.25, vpY: 0.38, type: 'orion_nebula', size: 0.10, angle: 0.2, depth: 1 },
  { vpX: 0.70, vpY: 0.32, type: 'horsehead', size: 0.07, angle: 0, depth: 1 },
  { vpX: 0.50, vpY: 0.55, type: 'eagle_nebula', size: 0.09, angle: -0.15, depth: 1 },
  { vpX: 0.10, vpY: 0.62, type: 'omega_nebula', size: 0.07, angle: 0.5, depth: 1 },
  { vpX: 0.05, vpY: 0.42, type: 'rosette_nebula', size: 0.09, angle: 0, depth: 1 },
  // depth 0 — deepest (galaxies): slowest drift, drawn right after MW
  { vpX: 0.88, vpY: 0.82, type: 'andromeda', size: 0.18, angle: -0.65, depth: 0 },
  { vpX: 0.88, vpY: 0.48, type: 'whirlpool', size: 0.09, angle: 0.7, depth: 0 },
  { vpX: 0.55, vpY: 0.92, type: 'sombrero', size: 0.08, angle: -0.12, depth: 0 },
  { vpX: 0.78, vpY: 0.18, type: 'triangulum', size: 0.09, angle: -0.4, depth: 0 },
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
   CONSTELLATION RENDERER — cinematic long-exposure style
   Lines: pre-rendered sprites (with full shadowBlur, generated once at init).
   Stars: drawn live for scintillation/pulsation (2 radial gradients each).
   Cost per frame: 1 drawImage + ~40 gradient fills for 3 constellations.
   ================================================================ */
function drawConstellation(
  ctx: CanvasRenderingContext2D,
  c: ConstellationDef,
  opacity: number,
  lw: number, lh: number,
  time: number,
  camOx: number, camOy: number,
  lineSprite?: ConstLineSprite,
) {
  if (opacity < 0.01) return;
  const cx = c.vpX * lw + camOx * -0.03;
  const cy = c.vpY * lh + camOy * -0.03;
  const md = Math.min(lw, lh);
  const ts = time * 0.001;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  /* ---- LINES from pre-rendered sprite (shadowBlur baked in at init) ---- */
  if (lineSprite) {
    const breathe = 1 + 0.12 * Math.sin(ts * 0.785 + c.vpX * 100 + c.vpY * 200);
    ctx.globalAlpha = clamp(opacity * breathe, 0, 1);
    ctx.drawImage(lineSprite.canvas, cx - lineSprite.ox, cy - lineSprite.oy);
    ctx.globalAlpha = 1;
  }

  /* ---- STARS — 3-layer glow + spikes (live for animation) ---- */
  for (let i = 0; i < c.stars.length; i++) {
    const s = c.stars[i];
    const x = cx + s.dx * md;
    const y = cy + s.dy * md;
    const col = s.color || [200, 210, 240];
    const br = magToBrightness(s.mag);
    const sz = magToSize(s.mag) * 1.2;
    const phase = s.dx * 137.5 + s.dy * 251.3 + i * 0.73;
    const sa = clamp(opacity * br * 2.2, 0, 1);

    // Scintillation + subtle size pulsation
    const scint = 1 + 0.12 * Math.sin(ts * 2.0 + phase * 3.1);
    const sizePulse = 1 + 0.05 * Math.sin(ts * 1.047 + phase * 1.7);
    const curSz = sz * scint * sizePulse;

    // Layer 1: Outer halo (sz*7) — smooth atmospheric falloff
    const outerR = curSz * 7;
    const gO = ctx.createRadialGradient(x, y, 0, x, y, outerR);
    gO.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${sa * 0.14})`);
    gO.addColorStop(0.2, `rgba(${col[0]},${col[1]},${col[2]},${sa * 0.06})`);
    gO.addColorStop(0.5, `rgba(${col[0]},${col[1]},${col[2]},${sa * 0.015})`);
    gO.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    ctx.fillStyle = gO;
    ctx.beginPath(); ctx.arc(x, y, outerR, 0, Math.PI * 2); ctx.fill();

    // Layer 2: Core + inner glow (sz*3) — white-hot center → spectral color
    const coreR = curSz * 3;
    const bR = Math.min(255, col[0] + 40);
    const bG = Math.min(255, col[1] + 40);
    const bB = Math.min(255, col[2] + 40);
    const gC = ctx.createRadialGradient(x, y, 0, x, y, coreR);
    gC.addColorStop(0, `rgba(255,255,255,${sa * 0.95})`);
    gC.addColorStop(0.12, `rgba(${bR},${bG},${bB},${sa * 0.7})`);
    gC.addColorStop(0.35, `rgba(${col[0]},${col[1]},${col[2]},${sa * 0.2})`);
    gC.addColorStop(0.7, `rgba(${col[0]},${col[1]},${col[2]},${sa * 0.04})`);
    gC.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
    ctx.fillStyle = gC;
    ctx.beginPath(); ctx.arc(x, y, coreR, 0, Math.PI * 2); ctx.fill();

    // Diffraction spikes on bright stars (mag < 2.5)
    if (s.mag < 2.5) {
      const spikeLen = curSz * (s.mag < 1.5 ? 5.0 : 3.0);
      const spikeOp = sa * (s.mag < 1.5 ? 0.22 : 0.13);
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${spikeOp})`;
      ctx.lineWidth = 0.6;
      for (let sp = 0; sp < 4; sp++) {
        const ang = sp * Math.PI * 0.5 + Math.PI * 0.25;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ang) * spikeLen, y + Math.sin(ang) * spikeLen);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

/* ================================================================
   DSO NOISE-TEXTURE GENERATORS — pre-rendered at init like MW layers
   ================================================================ */
function generateAndromedaTex(baseSz: number, angle: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 8);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const cosA = Math.cos(-angle), sinA = Math.sin(-angle);
  const aspect = 0.28;
  const rMax = baseSz * 1.05; // tighter cutoff — less bloom fodder

  // Pre-generate OB associations along arms (blue star clusters)
  const obAssocs: { nx: number; ny: number; sz: number; bright: number }[] = [];
  for (let i = 0; i < 35; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 0.15 + Math.random() * 0.65;
    obAssocs.push({
      nx: Math.cos(ang) * rad, ny: Math.sin(ang) * rad * aspect,
      sz: 0.008 + Math.random() * 0.015, bright: 0.1 + Math.random() * 0.2,
    });
  }
  // Globular cluster positions in halo (yellowish dots)
  const gcs: { nx: number; ny: number; sz: number }[] = [];
  for (let i = 0; i < 15; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 0.3 + Math.random() * 0.6;
    // Spheroidal distribution — less flattened than disk
    gcs.push({ nx: Math.cos(ang) * rad, ny: Math.sin(ang) * rad * 0.6, sz: 0.006 + Math.random() * 0.004 });
  }

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const gx = dx * cosA - dy * sinA;
      const rawGy = dx * sinA + dy * cosA;
      const gy = rawGy / aspect;
      const dist = Math.sqrt(gx * gx + gy * gy);
      if (dist > rMax) continue;
      const nd = dist / rMax;
      // Aggressive elliptical taper — kills dim outer fringe that blooms into haze
      const edgeTaper = nd > 0.5 ? 0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, (nd - 0.5) / 0.5)) : 1;

      // S-warp (Andromeda's warped disk)
      const warpAmp = 0.05 * Math.sin(nd * Math.PI * 3);
      const gyW = gy + warpAmp * rMax * Math.sign(gx);
      const theta = Math.atan2(gyW, gx);

      // Exponential disk (steeper falloff)
      const diskProfile = Math.exp(-nd * 4.0);

      // 2 primary arms + 2 inter-arm spurs + faint 3rd arm
      let armVal = 0;
      let armId = 0; // which arm (for color variation)
      for (let arm = 0; arm < 2; arm++) {
        const armOff = arm * Math.PI;
        const spiralAngle = theta - armOff - Math.log(nd + 0.03) * 2.8;
        // Fine fbm warp on arm centerline
        const armWarp = fbm(nd * 5 + 1000 + arm * 80, theta * 3 + 1000 + arm * 40, 4) * 0.35;
        const armPhase = Math.sin((spiralAngle + armWarp) * 0.5);
        const armDist = Math.abs(armPhase);
        // Narrower arms for more contrast
        const armStr = Math.exp(-armDist * armDist * 20) * (1 - nd * 0.4);
        if (armStr > armVal) { armVal = armStr; armId = arm; }
        // Inter-arm spur (branch off each arm)
        const spurAngle = spiralAngle + 0.7 + fbm(nd * 3 + 1300 + arm * 60, theta + 1300, 3) * 0.4;
        const spurDist = Math.abs(Math.sin(spurAngle * 0.5));
        const spurStr = Math.exp(-spurDist * spurDist * 25) * armStr * 0.35;
        armVal = Math.max(armVal, spurStr);
      }
      // Faint 3rd arm
      {
        const sa = theta - 2.1 - Math.log(nd + 0.06) * 2.3;
        const ad = Math.abs(Math.sin(sa * 0.5));
        armVal = Math.max(armVal, Math.exp(-ad * ad * 12) * 0.25 * (1 - nd * 0.6));
      }

      // 2-level domain warping (7 octaves for maximum detail)
      const nsx = gx / rMax * 6, nsy = gy / rMax * 6;
      const wq1 = fbm(nsx + 1000, nsy + 1000, 4);
      const wq2 = fbm(nsx + 1052, nsy + 1031, 4);
      const warpN1 = fbm(nsx + wq1 * 2.0, nsy + wq2 * 2.0, 5);
      const wq3 = fbm(nsx + warpN1 * 1.0 + 1200, nsy + warpN1 * 1.0 + 1200, 4);
      const warpN = fbm(nsx + wq3 * 0.6 + wq1 * 1.2, nsy + wq3 * 0.6 + wq2 * 1.2, 7);
      const organicMod = 0.6 + (warpN + 1) * 0.4;

      // Micro-texture: very fine noise for granular stellar population look
      const microN = fbm(nsx * 4 + 1400, nsy * 4 + 1400, 3, 2.5, 0.45);
      const microTex = 0.88 + microN * 0.12;

      // de Vaucouleurs bulge (r^1/4 law), slightly elliptical
      const bulgeDist = Math.sqrt(gx * gx + rawGy * rawGy * 2.5) / rMax;
      const bulge = Math.exp(-Math.pow(bulgeDist + 0.001, 0.25) * 7) * 1.4;

      // OB associations (blue star-forming clusters in arms)
      let obGlow = 0;
      const pnx = gx / rMax, pny = rawGy / rMax;
      for (const k of obAssocs) {
        const kd = Math.sqrt((pnx - k.nx) * (pnx - k.nx) + (pny - k.ny) * (pny - k.ny));
        if (kd < k.sz * 3) obGlow += k.bright * Math.exp(-kd * kd / (k.sz * k.sz));
      }
      obGlow = Math.min(obGlow, 0.35);

      // Globular cluster glow (golden dots in halo)
      let gcGlow = 0;
      for (const g of gcs) {
        const gd = Math.sqrt((pnx - g.nx) * (pnx - g.nx) + (pny - g.ny) * (pny - g.ny));
        if (gd < g.sz * 2.5) gcGlow += 0.2 * Math.exp(-gd * gd / (g.sz * g.sz));
      }
      gcGlow = Math.min(gcGlow, 0.25);

      // Denser disk — brighter so bloom isn't needed for visibility
      const rawI = (diskProfile * 0.5 + armVal * 0.6 + bulge + obGlow * armVal * 0.35 + gcGlow * 0.12) * organicMod * microTex;

      // Concentric dust rings — subtle, fbm-modulated (not geometric bands)
      const absGy = Math.abs(gyW / rMax);
      const dustWarp = fbm(nsx * 3 + 1100, nsy * 0.5 + 1100, 5);
      const dustWarp2 = fbm(nsx * 2 + 1160, nsy * 0.8 + 1160, 4);
      let dustLane = 0;
      // Smooth dust contribution — gaussian profile centered on major axis
      // Outer dust (modulated by noise for clumpy/patchy appearance)
      if (nd > 0.3 && nd < 0.85) {
        const dustEnv = Math.exp(-absGy * absGy / (0.003 + dustWarp * 0.001));
        dustLane += dustEnv * 0.35 * clamp((dustWarp + 0.2) * 0.8, 0, 1);
      }
      // Inner thin dust ring
      if (nd > 0.06 && nd < 0.35) {
        const dustEnv2 = Math.exp(-absGy * absGy / (0.001 + dustWarp2 * 0.0005));
        dustLane += dustEnv2 * 0.3 * clamp((dustWarp2 + 0.3) * 0.7, 0, 1);
      }
      dustLane = Math.min(dustLane, 0.7);

      const rawInt = Math.max(0, rawI * (1 - dustLane * 0.7)) * edgeTaper;
      const finalInt = tonemap(rawInt * 2.5);

      // Rich color model: golden bulge → blue arms → brownish inter-arm → pink OB associations
      const warmth = Math.exp(-nd * 3.0);
      const armMix = clamp(armVal * 2, 0, 1);
      // Bulge: rich gold
      const bR = 255, bG = 225, bB = 150;
      // Arm: blue-white (star-forming)
      const aR = 130, aG = 165, aB = 235;
      // Inter-arm: muted brown
      const iR = 175, iG = 150, iB = 105;
      // Blend: bulge (center) → arm/inter-arm (disk)
      const diskR = lerp(iR, aR, armMix);
      const diskG = lerp(iG, aG, armMix);
      const diskB = lerp(iB, aB, armMix);
      let r = lerp(diskR, bR, warmth) * finalInt + obGlow * 90 * finalInt;
      let g = lerp(diskG, bG, warmth) * finalInt + obGlow * 25 * finalInt;
      let b = lerp(diskB, bB, warmth) * finalInt + obGlow * 50 * finalInt;
      // Globular clusters add golden tint
      r += gcGlow * 200 * finalInt;
      g += gcGlow * 180 * finalInt;
      b += gcGlow * 100 * finalInt;

      if (r < 1 && g < 1 && b < 1) continue;
      // Very aggressive alpha — only bright pixels survive, no dim haze
      const pixAlpha = clamp(Math.pow(finalInt, 0.7) * 1.8, 0, 1) * edgeTaper * edgeTaper;
      u32[py * dim + px] =
        (clamp(pixAlpha * 255, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
}

function generatePleiadesNebTex(baseSz: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 5);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const rMax = baseSz * 2.2;
  // Star positions for brightness lobes (normalized -1..1)
  const lobes = [
    { nx: 0, ny: 0, w: 1.0 },          // Alcyone
    { nx: 0.28, ny: -0.18, w: 0.7 },    // Atlas
    { nx: -0.32, ny: -0.10, w: 0.7 },   // Electra
    { nx: -0.15, ny: 0.30, w: 0.65 },   // Maia
    { nx: 0.22, ny: 0.25, w: 0.6 },     // Merope
    { nx: -0.28, ny: 0.22, w: 0.5 },    // Taygeta
    { nx: 0.35, ny: 0.05, w: 0.4 },     // Pleione
  ];

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > rMax) continue;
      // Multi-lobe brightness from star positions
      let lobeBright = 0;
      for (const l of lobes) {
        const lx = l.nx * baseSz, ly = l.ny * baseSz;
        const ldist = Math.sqrt((dx - lx) * (dx - lx) + (dy - ly) * (dy - ly));
        const lrad = baseSz * (0.6 + l.w * 0.5);
        lobeBright += l.w * Math.exp(-ldist * ldist / (lrad * lrad * 0.5));
      }
      // 2-level striated reflection filaments (Pleiades dust is streaky/fibrous)
      const nsx = dx / rMax * 5, nsy = dy / rMax * 5;
      const wq1 = fbm(nsx + 2000, nsy + 2000, 4);
      const wq2 = fbm(nsx + 2052, nsy + 2031, 4);
      const warpN1 = fbm(nsx + wq1 * 2.5, nsy + wq2 * 2.5, 5);
      const wq3 = fbm(nsx + warpN1 * 1.0 + 2200, nsy + warpN1 * 1.0 + 2200, 4);
      const warpN = fbm(nsx + wq3 * 0.7 + wq1 * 1.8, nsy + wq3 * 0.7 + wq2 * 1.8, 6);
      const wispy = clamp((warpN + 0.8) * 0.55, 0, 1);
      // Striation effect — elongated fibrous structures
      const striatAngle = 0.4; // ~23° — roughly aligns with Merope IC 349 direction
      const striatX = nsx * Math.cos(striatAngle) + nsy * Math.sin(striatAngle);
      const striatN = fbm(striatX * 6 + 2100, nsy * 0.8 + 2100, 4, 2.5, 0.55);
      const striation = 0.7 + Math.abs(striatN) * 0.6;
      // Overall falloff
      const nd = dist / rMax;
      const edgeTaper = nd > 0.7 ? 0.5 + 0.5 * Math.cos(Math.PI * (nd - 0.7) / 0.3) : 1;
      const falloff = Math.exp(-nd * nd * 2.5);
      const rawInt = lobeBright * wispy * striation * falloff * 0.5 * edgeTaper;
      const intensity = tonemap(rawInt * 2.5);
      // Blue-white reflection color with warm center near Merope
      const centerWarm = lobeBright > 0.5 ? (lobeBright - 0.5) * 0.3 : 0;
      const r = (85 + centerWarm * 60) * intensity;
      const g = (130 + centerWarm * 30) * intensity;
      const b = 245 * intensity;

      if (r < 1 && g < 1 && b < 1) continue;
      u32[py * dim + px] =
        (clamp(intensity * 255, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
}

function generateOrionNebTex(baseSz: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 7);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const rMax = baseSz * 1.8;

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > rMax) continue;
      const nd = dist / rMax;
      const edgeTaper = nd > 0.7 ? 0.5 + 0.5 * Math.cos(Math.PI * (nd - 0.7) / 0.3) : 1;
      const nxf = dx / rMax, nyf = dy / rMax;

      // Wing-shaped asymmetric falloff (M42 extends more to upper-left)
      const wingAngle = Math.atan2(dy, dx);
      const wingBias = 1 + 0.3 * Math.cos(wingAngle + 0.8); // stretch upper-left
      const wingDist = nd * (1 / wingBias);

      // 2-level domain-warped noise (6 octaves for rich billowing)
      const nsx = dx / rMax * 2.2, nsy = dy / rMax * 2.2;
      const wq1 = fbm(nsx + 3000, nsy + 3000, 4);
      const wq2 = fbm(nsx + 3052, nsy + 3031, 4);
      const cloudN1 = fbm(nsx + wq1 * 3.2, nsy + wq2 * 3.2, 5);
      // 2nd level domain warp for complex billowing
      const wq3 = fbm(nsx + cloudN1 * 1.5 + 3300, nsy + cloudN1 * 1.5 + 3300, 4);
      const cloudN = fbm(nsx + wq3 * 1.2 + wq1 * 2.0, nsy + wq3 * 1.2 + wq2 * 2.0, 6);
      const cloud = clamp((cloudN + 0.7) * 0.65, 0, 1);

      // Fine-scale filamentary detail (higher freq layer)
      const fineN = fbm(nsx * 3 + 3080, nsy * 3 + 3080, 4, 2.3, 0.5);
      // Molecular cloud finger-like protrusions extending from main body
      const fingerN = fbm(nsx * 1.8 + 3350, nsy * 4 + 3350, 5, 2.2, 0.45);
      const fingers = clamp(fingerN - 0.1, 0, 0.5) * clamp(wingDist - 0.3, 0, 0.5) * 2;
      const fineDetail = 0.85 + fineN * 0.15 + fingers * 0.12;

      // Huygens bright region (central cavity, Trapezium)
      const cavDx = dx - baseSz * 0.01, cavDy = dy + baseSz * 0.03;
      const cavDist = Math.sqrt(cavDx * cavDx + cavDy * cavDy * 1.8);
      const huygens = Math.exp(-cavDist * cavDist / (baseSz * baseSz * 0.05)) * 1.3;

      // "Fish's Mouth" — dark bay with fbm-warped boundary
      const fmWarp = fbm(nsx * 1.5 + 3150, nsy * 1.0 + 3150, 4) * 0.05;
      const fmCx = 0.06 + fmWarp, fmCy = -0.02;
      const fmShape = Math.abs(nyf - fmCy + fmWarp * 0.5) * 1.5 + Math.abs(nxf - fmCx) * 0.7;
      const fishMouth = (nxf > -0.12 && nxf < 0.28 && nyf > -0.15 && nyf < 0.10)
        ? clamp(1 - fmShape * 6, 0, 0.7) : 0;

      // Multiple dark absorption bays (domain-warped)
      const darkN1 = fbm(nsx * 1.2 + 3200, nsy * 1.2 + 3200, 5);
      const darkBay1 = darkN1 > 0.18 ? clamp((darkN1 - 0.18) * 2.2, 0, 0.75) : 0;
      // Second dark bay system at different scale
      const darkN2 = fbm(nsx * 0.7 + 3280, nsy * 0.7 + 3280, 4);
      const darkBay2 = darkN2 > 0.3 ? clamp((darkN2 - 0.3) * 2, 0, 0.4) : 0;
      const totalDark = Math.min(Math.max(darkBay1, darkBay2, fishMouth), 0.85);

      // Wing-shaped falloff
      const falloff = Math.exp(-wingDist * wingDist * 1.6);

      const rawInt = (cloud * fineDetail * 0.5 + huygens * 0.95) * falloff * (1 - totalDark) * edgeTaper;
      const intensity = tonemap(rawInt * 2.5);

      // 4-zone narrowband color: OIII teal (inner) → H-beta blue (inner-mid) → H-alpha pink (mid) → SII deep red (outer)
      const cavNd = cavDist / (baseSz * 0.7);
      const zone1 = clamp(1 - cavNd * 2.5, 0, 1); // inner OIII
      const zone2 = clamp(1 - Math.abs(cavNd - 0.35) * 4, 0, 1); // H-beta transition
      const zone3 = clamp(1 - Math.abs(cavNd - 0.6) * 3, 0, 1); // mid H-alpha
      const zone4 = clamp(cavNd - 0.75, 0, 1); // outer SII
      // OIII: cyan-teal
      const oR = 40, oG = 210, oB = 160;
      // H-beta: blue-green
      const hbR = 55, hbG = 155, hbB = 210;
      // H-alpha: rose-pink
      const hR = 250, hG = 120, hB = 145;
      // SII: deep red-brown (sulfur)
      const sR = 200, sG = 50, sB = 40;
      const zTot = zone1 + zone2 + zone3 + zone4 + 0.001;
      const r = (oR * zone1 + hbR * zone2 + hR * zone3 + sR * zone4) / zTot * (zone1 + zone2 + zone3 + zone4) * intensity;
      const g = (oG * zone1 + hbG * zone2 + hG * zone3 + sG * zone4) / zTot * (zone1 + zone2 + zone3 + zone4) * intensity;
      const b = (oB * zone1 + hbB * zone2 + hB * zone3 + sB * zone4) / zTot * (zone1 + zone2 + zone3 + zone4) * intensity;

      if (r < 1 && g < 1 && b < 1) continue;
      u32[py * dim + px] =
        (clamp(intensity * 255, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
}

/* ================================================================
   DSO REAL-TIME STAR HELPERS — drawn on top of textures
   ================================================================ */
function drawPleiadesStars(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  opacity: number, time: number
) {
  const sisters = [
    { dx: 0, dy: 0, mag: 2.87 },
    { dx: 0.28, dy: -0.18, mag: 3.63 },
    { dx: -0.32, dy: -0.10, mag: 3.70 },
    { dx: -0.15, dy: 0.30, mag: 3.87 },
    { dx: 0.22, dy: 0.25, mag: 4.18 },
    { dx: -0.28, dy: 0.22, mag: 4.30 },
    { dx: 0.35, dy: 0.05, mag: 5.09 },
  ];
  for (const s of sisters) {
    const sx = cx + s.dx * size;
    const sy = cy + s.dy * size;
    const sz = magToSize(s.mag) * 0.7;
    const br = Math.min(1, magToBrightness(s.mag) * opacity * 1.5);
    const sc = 1 + 0.1 * Math.sin(time * 0.003 + s.dx * 50);
    // Soft glow
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sz * 5);
    g.addColorStop(0, `rgba(170,200,255,${br * 0.3})`);
    g.addColorStop(0.3, `rgba(140,175,255,${br * 0.08})`);
    g.addColorStop(1, `rgba(80,120,230,0)`);
    ctx.beginPath(); ctx.arc(sx, sy, sz * 5, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    // Core
    ctx.beginPath(); ctx.arc(sx, sy, sz * sc, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,220,255,${br})`;
    ctx.fill();
  }
}

function drawTrapeziumStars(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  opacity: number
) {
  const trap = [
    { dx: -0.03, dy: -0.02 }, { dx: 0.03, dy: -0.01 },
    { dx: 0.01, dy: 0.03 }, { dx: -0.02, dy: 0.02 },
  ];
  for (const t of trap) {
    const tx = cx + t.dx * size, ty = cy + t.dy * size;
    const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 3.5);
    tg.addColorStop(0, `rgba(255,255,255,${opacity * 0.7})`);
    tg.addColorStop(0.4, `rgba(200,220,255,${opacity * 0.2})`);
    tg.addColorStop(1, `rgba(150,180,255,0)`);
    ctx.beginPath(); ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = tg; ctx.fill();
  }
}

/* ================================================================
   ADDITIONAL DSO NOISE-TEXTURE GENERATORS
   ================================================================ */

/** Crab Nebula (M1) — supernova remnant: tangled filaments, blue synchrotron + red filaments */
function generateCrabNebTex(baseSz: number, angle: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 5);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const rMax = baseSz * 1.6;
  const cosA = Math.cos(-angle), sinA = Math.sin(-angle);

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const rx = dx * cosA - dy * sinA;
      const ry = dx * sinA + dy * cosA;
      const dist = Math.sqrt(rx * rx + ry * ry * 1.3);
      if (dist > rMax) continue;
      const nd = dist / rMax;
      const edgeTaper = nd > 0.65 ? 0.5 + 0.5 * Math.cos(Math.PI * (nd - 0.65) / 0.35) : 1;
      const theta = Math.atan2(ry, rx);
      const nsx = rx / rMax * 6, nsy = ry / rMax * 6;

      // Tangled filaments — domain-warped to avoid pure radial pattern
      const filWarp1 = fbm(nsx * 1.5 + 4000, nsy * 1.5 + 4000, 4, 2.0, 0.5);
      const filWarp2 = fbm(nsx * 1.5 + 4050, nsy * 1.5 + 4050, 4, 2.0, 0.5);
      const warpedTheta = theta + filWarp1 * 1.2;
      const warpedNd = nd + filWarp2 * 0.08;
      // Multiple tangled filament layers at different angular frequencies
      const fil1 = Math.abs(Math.sin(warpedTheta * 6 + warpedNd * 8));
      const fil2 = Math.abs(Math.sin(warpedTheta * 10 + filWarp1 * 5 + 1.5));
      const fil3 = Math.abs(Math.sin(warpedTheta * 3.7 + filWarp2 * 6 + 3.2));
      const filament = Math.max(fil1, fil2 * 0.7, fil3 * 0.5);
      // Brightness variation along filaments
      const filBrightVar = 0.5 + fbm(nsx * 3 + 4080, nsy * 3 + 4080, 3) * 0.5;
      const filStr = filament * filBrightVar * Math.exp(-nd * 2.2);

      // Synchrotron glow — non-uniform blue-white core with jet axis
      const synchN = fbm(nsx * 0.8 + 4120, nsy * 0.8 + 4120, 3);
      // Pulsar wind jet axis (elongated along ~150° PA)
      const jetAngle = 2.6; // ~150° in radians
      const jetDist = Math.abs(Math.sin(theta - jetAngle)) * nd;
      const jet = Math.exp(-jetDist * jetDist * 40) * Math.exp(-nd * nd * 4) * 0.4;
      const synchrotron = Math.exp(-nd * nd * 7) * (0.65 + synchN * 0.2) + jet;

      // Irregular outer boundary — not a smooth ellipse
      const boundaryN = fbm(theta * 1.5 + 4200, nd * 3 + 4200, 4, 2.0, 0.5);
      const irregBound = nd > (0.75 + boundaryN * 0.15) ? 0 : 1;

      const rawCrab = (filStr * 0.55 + synchrotron + fbm(nsx + 4100, nsy + 4100, 3) * 0.1 * Math.exp(-nd * 1.5))
                        * edgeTaper * irregBound;
      const intensity = tonemap(rawCrab * 2.2);

      // Color: blue synchrotron core → red filaments at edges
      const blueMix = Math.exp(-nd * 3);
      const r = lerp(255, 140, blueMix) * intensity;
      const g = lerp(100, 160, blueMix) * intensity;
      const b = lerp(90, 255, blueMix) * intensity;

      if (r < 1 && g < 1 && b < 1) continue;
      u32[py * dim + px] =
        (clamp(intensity * 255, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
}

/** Eagle Nebula (M16) — "Pillars of Creation": tapered columns against bright emission */
function generateEagleNebTex(baseSz: number, angle: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 7);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const rMax = baseSz * 1.7;
  const cosA = Math.cos(-angle), sinA = Math.sin(-angle);

  // 3 distinct pillar definitions: centerX, baseY, tipY, baseWidth, tipWidth, lean
  const pillars = [
    { cx: -0.13, baseY: 0.45, tipY: -0.28, baseW: 0.09, tipW: 0.025, lean: 0.03 },
    { cx:  0.04, baseY: 0.45, tipY: -0.18, baseW: 0.07, tipW: 0.02,  lean: -0.02 },
    { cx:  0.18, baseY: 0.45, tipY: -0.05, baseW: 0.055, tipW: 0.018, lean: 0.01 },
  ];

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const rx = dx * cosA - dy * sinA;
      const ry = dx * sinA + dy * cosA;
      const dist = Math.sqrt(rx * rx + ry * ry);
      if (dist > rMax) continue;
      const nd = dist / rMax;
      const edgeTaper = nd > 0.7 ? 0.5 + 0.5 * Math.cos(Math.PI * (nd - 0.7) / 0.3) : 1;
      const nsx = rx / rMax * 4, nsy = ry / rMax * 4;
      const nx2 = rx / rMax, ny2 = ry / rMax;

      // Bright emission backdrop — 2-level domain-warped H-alpha cloud
      const wq1 = fbm(nsx + 4500, nsy + 4500, 4);
      const wq2 = fbm(nsx + 4552, nsy + 4531, 4);
      const emN1 = fbm(nsx + wq1 * 2.2, nsy + wq2 * 2.2, 5);
      const wq3 = fbm(nsx + emN1 * 1.0 + 4600, nsy + emN1 * 1.0 + 4600, 3);
      const emN = fbm(nsx + wq3 * 0.8 + wq1 * 1.5, nsy + wq3 * 0.8 + wq2 * 1.5, 6);
      const emission = clamp((emN + 0.9) * 0.55, 0, 1) * Math.exp(-nd * nd * 1.6);

      // Compute pillar darkness — each pillar is tapered (wide base → narrow tip)
      let pillarDark = 0;
      for (const p of pillars) {
        // Check vertical range
        if (ny2 < p.tipY - 0.05 || ny2 > p.baseY + 0.02) continue;
        // Interpolate width from base to tip
        const t = clamp((ny2 - p.tipY) / (p.baseY - p.tipY), 0, 1); // 0=tip, 1=base
        const halfW = lerp(p.tipW, p.baseW, t);
        // Center with lean
        const center = p.cx + p.lean * (1 - t);
        // Fbm warp on edges for organic erosion
        const edgeWarp = fbm(nsx * 3 + 4700 + p.cx * 100, nsy * 2 + 4700, 4, 2.2, 0.55) * 0.035;
        const warpedHalfW = halfW + edgeWarp;
        // Wispy protrusions along edges
        const whisp = fbm(nsx * 5 + 4750 + p.cx * 200, nsy * 4 + 4750, 3, 2.5, 0.5) * 0.02;
        const effW = warpedHalfW + whisp;
        const pdist = Math.abs(nx2 - center);
        if (pdist >= effW) continue;

        // Soft feathered edges
        const edgeFrac = pdist / effW;
        let pStr = 1 - edgeFrac * edgeFrac;
        // Tip taper (fade at very top)
        const tipFade = clamp((ny2 - p.tipY) / 0.06, 0, 1);
        pStr *= tipFade;
        // Internal luminosity: semi-transparent with subtle structure
        const internalN = fbm(nsx * 2 + 4800 + p.cx * 300, nsy * 2 + 4800, 3);
        const internalLum = 0.08 + internalN * 0.06;
        // Final darkness: not pure black, has internal glow
        pillarDark = Math.max(pillarDark, pStr * (0.82 - internalLum));
      }

      // Bright rim on pillar edges (photo-evaporation by UV from nearby O stars)
      let rimGlow = 0;
      if (pillarDark > 0.1 && pillarDark < 0.7) {
        const rimStr = Math.sin(pillarDark / 0.7 * Math.PI);
        rimGlow = rimStr * 0.4 * emission;
      }
      // EGG bright tips — bright photoevaporating knots at pillar tips
      for (const p of pillars) {
        const eggDx = nx2 - (p.cx + p.lean), eggDy = ny2 - p.tipY;
        const eggDist = Math.sqrt(eggDx * eggDx + eggDy * eggDy);
        if (eggDist < 0.04) {
          rimGlow += (1 - eggDist / 0.04) * 0.5;
        }
      }

      // Fine filamentary detail in emission background
      const fineEm = fbm(nsx * 4 + 4850, nsy * 4 + 4850, 4, 2.3, 0.5);
      const fineDetail = 0.85 + fineEm * 0.15;

      const rawInt = emission * (1 - pillarDark) * fineDetail * edgeTaper;
      const finalInt = tonemap(rawInt * 2.5);

      // H-alpha orange-pink emission; bright white-blue rim on pillar edges
      const pillarTint = pillarDark * 0.12;
      const r = (235 * finalInt + 55 * pillarTint + 180 * rimGlow);
      const g = (135 * finalInt + 22 * pillarTint + 200 * rimGlow);
      const b = (95 * finalInt + 12 * pillarTint + 255 * rimGlow);

      if (r < 1 && g < 1 && b < 1) continue;
      const alpha = clamp(finalInt * 255 + pillarTint * 60 + rimGlow * 200, 0, 255);
      u32[py * dim + px] =
        (clamp(alpha, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
}

/** Ring Nebula (M57) — planetary nebula: torus shape with scattered cometary knots */
function generateRingNebTex(baseSz: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 5);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const rMax = baseSz * 1.5;

  // Pre-generate scattered cometary knots — random positions along/near the ring
  const knotCount = 18 + (Math.random() * 8) | 0;
  const knots: { nx: number; ny: number; sz: number; bright: number }[] = [];
  for (let i = 0; i < knotCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 0.48 + (Math.random() - 0.5) * 0.22; // scattered around ring radius
    knots.push({
      nx: Math.cos(ang) * rad,
      ny: Math.sin(ang) * rad / 1.25, // account for ellipticity
      sz: 0.02 + Math.random() * 0.025,
      bright: 0.2 + Math.random() * 0.35,
    });
  }

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const ex = dx, ey = dy * 1.25;
      const dist = Math.sqrt(ex * ex + ey * ey);
      if (dist > rMax) continue;
      const nd = dist / rMax;
      const edgeTaper = nd > 0.7 ? 0.5 + 0.5 * Math.cos(Math.PI * (nd - 0.7) / 0.3) : 1;

      // Ring profile — dominant feature with sharper inner edge
      const ringR = 0.55, ringWin = 0.12, ringWout = 0.22;
      const ringDelta = nd - ringR;
      const ringW = ringDelta < 0 ? ringWin : ringWout;
      const ringProfile = Math.exp(-ringDelta * ringDelta / (ringW * ringW));

      // 2-level domain-warped texture for ring surface detail
      const nsx = dx / rMax * 5, nsy = dy / rMax * 5;
      const wq1 = fbm(nsx + 5000, nsy + 5000, 4);
      const wq2 = fbm(nsx + 5052, nsy + 5031, 4);
      const texN1 = fbm(nsx + wq1 * 1.5, nsy + wq2 * 1.5, 4);
      const wq3 = fbm(nsx + texN1 * 0.8 + 5100, nsy + texN1 * 0.8 + 5100, 3);
      const texN = fbm(nsx + wq3 * 0.5 + wq1 * 1.0, nsy + wq3 * 0.5 + wq2 * 1.0, 5);
      const texVar = 0.65 + (texN + 1) * 0.35;

      // Scattered cometary knots — small irregular bright spots
      let knotGlow = 0;
      const pnx = dx / rMax, pny = dy / rMax;
      for (const k of knots) {
        const kdx = pnx - k.nx, kdy = pny - k.ny;
        const kd = Math.sqrt(kdx * kdx + kdy * kdy);
        if (kd < k.sz * 3) {
          knotGlow += k.bright * Math.exp(-kd * kd / (k.sz * k.sz));
        }
      }
      knotGlow = Math.min(knotGlow, 0.5);

      // Central star glow
      const centralGlow = Math.exp(-nd * nd * 30) * 0.35;
      // Inner cavity (faint blue-green fill)
      const cavityGlow = nd < ringR ? Math.exp(-nd * 5) * 0.18 : 0;

      const rawRing = (ringProfile * texVar + knotGlow * ringProfile + centralGlow + cavityGlow) * edgeTaper;
      const intensity = tonemap(rawRing * 2.2);

      // Color: inner green/blue → outer red/pink
      const colorT = clamp((nd - 0.3) / 0.5, 0, 1);
      const r = lerp(60, 200, colorT) * intensity;
      const g = lerp(190, 105, colorT) * intensity;
      const b = lerp(175, 130, colorT) * intensity;

      if (r < 1 && g < 1 && b < 1) continue;
      u32[py * dim + px] =
        (clamp(intensity * 255, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
}

/** Lagoon Nebula (M8) — large emission nebula with dark lanes and hourglass */
function generateLagoonNebTex(baseSz: number, angle: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 5);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const rMax = baseSz * 1.8;
  const cosA = Math.cos(-angle), sinA = Math.sin(-angle);

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const rx = dx * cosA - dy * sinA;
      const ry = dx * sinA + dy * cosA;
      const dist = Math.sqrt(rx * rx + ry * ry);
      if (dist > rMax) continue;
      const nd = dist / rMax;
      const edgeTaper = nd > 0.7 ? 0.5 + 0.5 * Math.cos(Math.PI * (nd - 0.7) / 0.3) : 1;
      const nsx = rx / rMax * 4, nsy = ry / rMax * 4;
      // Main emission cloud — 2-level domain warp
      const wq1 = fbm(nsx + 5500, nsy + 5500, 4);
      const wq2 = fbm(nsx + 5552, nsy + 5531, 4);
      const cloudN1 = fbm(nsx + wq1 * 2.5, nsy + wq2 * 2.5, 5);
      const wq3 = fbm(nsx + cloudN1 * 1.0 + 5600, nsy + cloudN1 * 1.0 + 5600, 3);
      const cloudN = fbm(nsx + wq3 * 0.6 + wq1 * 1.8, nsy + wq3 * 0.6 + wq2 * 1.8, 6);
      const cloud = clamp((cloudN + 0.8) * 0.6, 0, 1);
      // "Lagoon" — dark lane bisecting the nebula
      const laneN = fbm(nsx * 0.8 + 5700, nsy * 2 + 5700, 3);
      const laneY = ry / rMax;
      const lane = (Math.abs(laneY - laneN * 0.15) < 0.06) ? 0.8 : 0;
      // Hourglass bright center
      const hourglassDist = Math.sqrt(rx * rx * 4 + ry * ry);
      const hourglass = Math.exp(-hourglassDist * hourglassDist / (baseSz * baseSz * 0.15)) * 0.6;
      const falloff = Math.exp(-nd * nd * 1.5);
      // Fine-scale filamentary detail
      const fineN = fbm(nsx * 3 + 5750, nsy * 3 + 5750, 4, 2.3, 0.5);
      const fineDetail = 0.85 + fineN * 0.15;
      const rawInt = (cloud * 0.6 + hourglass) * falloff * (1 - lane) * fineDetail * edgeTaper;
      const intensity = tonemap(rawInt * 2.5);
      // Pink-red emission with warm core
      const warmth = Math.exp(-nd * 2);
      const r = lerp(200, 255, warmth) * intensity;
      const g = lerp(100, 170, warmth) * intensity;
      const b = lerp(110, 140, warmth) * intensity;

      if (r < 1 && g < 1 && b < 1) continue;
      u32[py * dim + px] =
        (clamp(intensity * 255, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
}

/** Whirlpool Galaxy (M51) — face-on grand-design spiral with companion NGC 5195 */
function generateWhirlpoolTex(baseSz: number, angle: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 6);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const rMax = baseSz * 1.4;
  const cosA = Math.cos(-angle), sinA = Math.sin(-angle);
  const compX = baseSz * 0.85, compY = -baseSz * 0.35;

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const rx = dx * cosA - dy * sinA;
      const ry = dx * sinA + dy * cosA;

      let r = 0, g = 0, b = 0;

      // Main galaxy
      const dist = Math.sqrt(rx * rx + ry * ry);
      if (dist < rMax) {
        const nd = dist / rMax;
        const edgeTaper = nd > 0.7 ? 0.5 + 0.5 * Math.cos(Math.PI * (nd - 0.7) / 0.3) : 1;
        const theta = Math.atan2(ry, rx);
        // Tight 2-arm grand-design spiral with dust lane on inner edge
        let armVal = 0;
        let dustVal = 0;
        for (let arm = 0; arm < 2; arm++) {
          const armOff = arm * Math.PI;
          const spiralAngle = theta - armOff - Math.log(nd + 0.03) * 3.2;
          const armPhase = Math.sin(spiralAngle * 0.5);
          const armDist = Math.abs(armPhase);
          const armStr = Math.exp(-armDist * armDist * 14) * (1 - nd * 0.35);
          armVal = Math.max(armVal, armStr);
          // Dust lane on inner (leading) edge of arm — stronger contrast
          if (armPhase > 0 && armPhase < 0.35 && nd > 0.06) {
            dustVal = Math.max(dustVal, (1 - armPhase / 0.35) * 0.55 * armStr);
          }
        }
        // 2-level domain warp for organic shape
        const nsx = rx / rMax * 5, nsy = ry / rMax * 5;
        const warpQ1 = fbm(nsx + 6000, nsy + 6000, 4);
        const warpQ2 = fbm(nsx + 6052, nsy + 6031, 4);
        const warpN1 = fbm(nsx + warpQ1 * 1.5, nsy + warpQ2 * 1.5, 5);
        const warpN = fbm(nsx + warpN1 * 0.8 + 6100, nsy + warpN1 * 0.8 + 6100, 5);
        const organicMod = 0.7 + (warpN + 1) * 0.3;
        // Core bulge — CLAMPED to prevent blow-out
        const bulge = Math.min(Math.exp(-nd * nd * 35) * 0.7, 0.7);
        // Disk profile
        const diskProfile = Math.exp(-nd * 3.2);
        // HII regions along arms (pink emission clumps)
        const hiiN = fbm(nsx * 4 + 6050, nsy * 4 + 6050, 3);
        const hiiClump = (hiiN > 0.3 && armVal > 0.3) ? clamp((hiiN - 0.3) * 3, 0, 0.5) * armVal : 0;
        // Fine-scale detail
        const fineN = fbm(nsx * 3 + 6080, nsy * 3 + 6080, 4, 2.3, 0.5);
        const fineDetail = 0.85 + fineN * 0.15;
        // Boost arm contrast relative to disk
        const rawInt = (diskProfile * 0.22 + armVal * 0.7 + bulge + hiiClump * 0.3) * organicMod * fineDetail * (1 - dustVal) * edgeTaper;
        const intensity = tonemap(rawInt * 2.5);
        // Blue arms, warm yellow core, pink HII
        const warmth = Math.exp(-nd * 3.5);
        r += lerp(110, 235, warmth) * intensity + hiiClump * 120 * intensity;
        g += lerp(130, 220, warmth) * intensity + hiiClump * 35 * intensity;
        b += lerp(210, 165, warmth) * intensity + hiiClump * 55 * intensity;
      }

      // Companion galaxy NGC 5195 (brighter, with structure)
      const cdx = rx - compX, cdy = ry - compY;
      const cDist = Math.sqrt(cdx * cdx + cdy * cdy * 1.6);
      const cRad = baseSz * 0.25;
      if (cDist < cRad) {
        const cnd = cDist / cRad;
        const compN = fbm(cdx / cRad * 3 + 6200, cdy / cRad * 3 + 6200, 3);
        const cInt = Math.exp(-cnd * cnd * 3.5) * 0.75 * (0.8 + compN * 0.2);
        r += 225 * cInt;
        g += 205 * cInt;
        b += 165 * cInt;
      }

      // Tidal bridge — wider and brighter
      const bLen = Math.sqrt(compX * compX + compY * compY);
      const bDist = Math.abs((ry - compY * 0.5) * compX - (rx - compX * 0.5) * compY) / bLen;
      const bAlong = (rx * compX + ry * compY) / (bLen * bLen);
      if (bDist < baseSz * 0.12 && bAlong > 0.2 && bAlong < 1.15) {
        const bridgeN = fbm(rx / baseSz * 4 + 6150, ry / baseSz * 4 + 6150, 3);
        const bFade = (1 - bDist / (baseSz * 0.12));
        const bInt = bFade * 0.22 * (0.7 + bridgeN * 0.3);
        r += 150 * bInt; g += 145 * bInt; b += 190 * bInt;
      }

      const totalInt = Math.sqrt(r * r + g * g + b * b) / 255;
      if (totalInt < 0.01) continue;
      u32[py * dim + px] =
        (clamp(totalInt * 255, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
}

/** Horsehead Nebula (B33) — dark silhouette against red emission background */
function generateHorseheadTex(baseSz: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 7);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const rMax = baseSz * 1.7;

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > rMax) continue;
      const nd = dist / rMax;
      // Soft radial taper in outer 30%
      const edgeTaper = nd > 0.7 ? 0.5 + 0.5 * Math.cos(Math.PI * (nd - 0.7) / 0.3) : 1;
      const nsx = dx / rMax * 4, nsy = dy / rMax * 4;
      const nx2 = dx / rMax, ny2 = dy / rMax;

      // Bright red emission background (IC 434) — 2-level domain-warped cloud
      const wq1 = fbm(nsx + 6500, nsy + 6500, 4);
      const wq2 = fbm(nsx + 6552, nsy + 6531, 4);
      const emN1 = fbm(nsx + wq1 * 2.0, nsy + wq2 * 2.0, 5);
      const wq3 = fbm(nsx + emN1 * 1.0 + 6600, nsy + emN1 * 1.0 + 6600, 3);
      const emN = fbm(nsx + wq3 * 0.6 + wq1 * 1.5, nsy + wq3 * 0.6 + wq2 * 1.5, 6);
      // Directional illumination from sigma Orionis (upper-left)
      const illumDir = clamp(0.7 - nx2 * 0.4 - ny2 * 0.5, 0.3, 1.2);
      const emission = clamp((emN + 0.7) * 0.65, 0, 1) * Math.exp(-nd * nd * 1.5) * illumDir;

      // Sculpted horse-head profile using signed distance field
      // Neck: narrow column rising from bottom, slightly curved
      const neckWarp = fbm(nsx * 1.5 + 6700, nsy * 0.8 + 6700, 4, 2.0, 0.5) * 0.06;
      const neckCenterX = 0.02 + neckWarp + ny2 * 0.04; // slight leftward lean
      const neckHalfW = 0.06 + clamp(ny2 + 0.1, 0, 0.4) * 0.04; // widens toward base
      const neckDistX = Math.abs(nx2 - neckCenterX) / neckHalfW;
      const inNeckY = ny2 > -0.18 && ny2 < 0.55;
      const neckSDF = inNeckY ? neckDistX : 99;

      // Head: wider organic blob at top of neck
      const headWarp = fbm(nsx * 2 + 6750, nsy * 2 + 6750, 4, 2.0, 0.55) * 0.05;
      const headCx = 0.06 + headWarp;
      const headCy = -0.22;
      const headRx = 0.14 + fbm(nsx * 1.2 + 6780, nsy * 1.2 + 6780, 3) * 0.03;
      const headRy = 0.11 + headWarp * 0.5;
      const hdx = (nx2 - headCx) / headRx, hdy = (ny2 - headCy) / headRy;
      const headSDF = Math.sqrt(hdx * hdx + hdy * hdy);

      // "Snout" protrusion (rightward bump on the head)
      const snoutCx = 0.14 + headWarp;
      const snoutCy = -0.20;
      const snoutR = 0.07;
      const snoutDist = Math.sqrt((nx2 - snoutCx) * (nx2 - snoutCx) + (ny2 - snoutCy) * (ny2 - snoutCy)) / snoutR;

      // "Ear" bump at top
      const earCx = 0.04 + headWarp * 0.5;
      const earCy = -0.32;
      const earR = 0.05;
      const earDist = Math.sqrt((nx2 - earCx) * (nx2 - earCx) + (ny2 - earCy) * (ny2 - earCy)) / earR;

      // Combine as smooth union of shapes
      const shapeSDF = Math.min(neckSDF, headSDF, snoutDist, earDist);

      // Dark base cloud (broad dark region at bottom)
      const baseFbm = fbm(nsx * 0.8 + 6800, nsy * 0.5 + 6800, 3) * 0.08;
      const baseY = ny2 - 0.20 - baseFbm;
      const baseMask = baseY > 0 ? clamp(baseY * 4, 0, 0.75) : 0;

      // Soft feathered edge: fbm-warped boundary with gradual alpha transition
      const edgeWarp = fbm(nsx * 3 + 6850, nsy * 3 + 6850, 4, 2.2, 0.5) * 0.15;
      const threshold = 1.0 + edgeWarp;
      const featherWidth = 0.35;
      let darkAlpha: number;
      if (shapeSDF < threshold) {
        darkAlpha = 0.88 - fbm(nsx * 2 + 6900, nsy * 2 + 6900, 3) * 0.12; // internal luminosity variation
      } else if (shapeSDF < threshold + featherWidth) {
        const t = (shapeSDF - threshold) / featherWidth;
        darkAlpha = (0.88 - fbm(nsx * 2 + 6900, nsy * 2 + 6900, 3) * 0.12) * (1 - t * t);
      } else {
        darkAlpha = 0;
      }
      const totalDark = Math.max(darkAlpha, baseMask);

      // Bright UV-illuminated rim on top/left edge of dark nebula (sigma Orionis illumination)
      let rimGlow = 0;
      if (totalDark > 0.15 && totalDark < 0.65) {
        // Rim is brighter on top edge (ny2 < 0 = toward illuminating star)
        const rimBias = clamp(0.3 - ny2, 0, 1);
        rimGlow = Math.sin(totalDark / 0.65 * Math.PI) * 0.3 * rimBias * emission;
      }

      // Fine emission texture
      const fineEm = fbm(nsx * 3 + 6920, nsy * 3 + 6920, 4, 2.3, 0.5);
      const fineDetail = 0.85 + fineEm * 0.15;

      const rawInt = emission * (1 - totalDark * 0.92) * fineDetail * edgeTaper;
      const intensity = tonemap(rawInt * 2.5);

      // Red emission + bright blue-white rim
      const warmVar = 0.9 + fbm(nsx * 0.5 + 6950, nsy * 0.5 + 6950, 2) * 0.2;
      const r = 220 * intensity * warmVar + 160 * rimGlow;
      const g = 75 * intensity + 180 * rimGlow;
      const b = 65 * intensity + 240 * rimGlow;

      if (r < 1 && g < 1 && b < 1) continue;
      const hhAlpha = clamp((intensity + rimGlow) * 255, 0, 255);
      u32[py * dim + px] =
        (clamp(hhAlpha, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
}

/** Omega/Swan Nebula (M17) — bright emission with distinctive bar + swept wing */
function generateOmegaNebTex(baseSz: number, angle: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 5);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const rMax = baseSz * 1.7;
  const cosA = Math.cos(-angle), sinA = Math.sin(-angle);

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const rx = dx * cosA - dy * sinA;
      const ry = dx * sinA + dy * cosA;
      const dist = Math.sqrt(rx * rx + ry * ry);
      if (dist > rMax) continue;
      const nd = dist / rMax;
      const edgeTaper = nd > 0.7 ? 0.5 + 0.5 * Math.cos(Math.PI * (nd - 0.7) / 0.3) : 1;
      const nsx = rx / rMax * 4, nsy = ry / rMax * 4;
      // Bright central bar (horizontal-ish bright stripe)
      const barY = ry / rMax;
      const barX = rx / rMax;
      const barN = fbm(nsx * 1.5 + 7000, nsy * 0.5 + 7000, 3);
      const barDist = Math.abs(barY + barN * 0.08);
      const bar = Math.exp(-barDist * barDist * 80) * clamp(1 - Math.abs(barX) * 1.5, 0, 1);
      // Swept wing — 2-level domain-warped emission cloud
      const wq1 = fbm(nsx + 7100, nsy + 7100, 4);
      const wq2 = fbm(nsx + 7152, nsy + 7131, 4);
      const wingN1 = fbm(nsx + wq1 * 2.2, nsy + wq2 * 2.2, 5);
      const wq3 = fbm(nsx + wingN1 * 0.8 + 7200, nsy + wingN1 * 0.8 + 7200, 3);
      const wingN = fbm(nsx + wq3 * 0.5 + wq1 * 1.5, nsy + wq3 * 0.5 + wq2 * 1.5, 6);
      const wing = clamp((wingN + 0.6) * 0.5, 0, 1) * Math.exp(-nd * nd * 2);
      // Dark absorption on one side
      const darkN = fbm(nsx * 1.2 + 7300, nsy * 1.2 + 7300, 3);
      const darkSide = (barY > 0.05 + darkN * 0.05) ? clamp((barY - 0.05) * 4, 0, 0.7) : 0;
      const rawOm = (bar * 0.8 + wing * 0.4) * (1 - darkSide) * edgeTaper;
      const intensity = tonemap(rawOm * 2.5);
      // Pink-red emission with brighter core
      const coreWarm = Math.exp(-nd * 3);
      const r = lerp(200, 255, coreWarm) * intensity;
      const g = lerp(110, 180, coreWarm) * intensity;
      const b = lerp(100, 130, coreWarm) * intensity;

      if (r < 1 && g < 1 && b < 1) continue;
      u32[py * dim + px] =
        (clamp(intensity * 255, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
}

/** Triangulum Galaxy (M33) — face-on flocculent spiral, blue arms, HII knots (NGC 604) */
function generateTriangulumTex(baseSz: number, angle: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 5);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const rMax = baseSz * 1.3;
  const cosA = Math.cos(-angle), sinA = Math.sin(-angle);

  // Pre-generate HII region clumps along spiral arms (scattered pink knots)
  const hiiKnots: { nx: number; ny: number; sz: number; bright: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 0.25 + Math.random() * 0.5;
    hiiKnots.push({
      nx: Math.cos(ang) * rad,
      ny: Math.sin(ang) * rad * 0.77, // inclination
      sz: 0.02 + Math.random() * 0.025,
      bright: 0.25 + Math.random() * 0.35,
    });
  }

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const rx = dx * cosA - dy * sinA;
      const ry = (dx * sinA + dy * cosA) * 1.3;
      const dist = Math.sqrt(rx * rx + ry * ry);
      if (dist > rMax) continue;
      const nd = dist / rMax;
      const edgeTaper = nd > 0.7 ? 0.5 + 0.5 * Math.cos(Math.PI * (nd - 0.7) / 0.3) : 1;
      const theta = Math.atan2(ry, rx);
      const nsx = rx / rMax * 5, nsy = ry / rMax * 5;

      // Flocculent spiral arms (2 loose arms with higher fbm amplitude for visibility)
      let armVal = 0;
      for (let arm = 0; arm < 2; arm++) {
        const armOff = arm * Math.PI;
        const spiralAngle = theta - armOff - Math.log(nd + 0.06) * 2.0;
        // Fbm warp on arm centerline for flocculent irregularity
        const armWarp = fbm(nsx * 1.5 + 7500 + arm * 100, nsy * 1.5 + 7500, 3) * 0.8;
        const armDist = Math.abs(Math.sin((spiralAngle + armWarp) * 0.5));
        const armStr = Math.exp(-armDist * armDist * 10) * (1 - nd * 0.5);
        armVal = Math.max(armVal, armStr);
      }

      // 2-level domain-warped noise for clumpy star-forming texture
      const wq1 = fbm(nsx + 7550, nsy + 7550, 4);
      const wq2 = fbm(nsx + 7602, nsy + 7581, 4);
      const clumps1 = fbm(nsx + wq1 * 2.0, nsy + wq2 * 2.0, 5);
      const wq3 = fbm(nsx + clumps1 * 0.8 + 7650, nsy + clumps1 * 0.8 + 7650, 3);
      const clumps = fbm(nsx + wq3 * 0.5 + wq1 * 1.5, nsy + wq3 * 0.5 + wq2 * 1.5, 6);
      const clumpBright = clamp((clumps + 0.4) * 0.7, 0, 1);

      // Small weak bulge (M33 characteristic)
      const bulge = Math.exp(-nd * nd * 25) * 0.5;
      // Exponential disk — dimmer inter-arm
      const disk = Math.exp(-nd * 2.8) * 0.2;

      // HII region knots (pink emission clumps along arms)
      let hiiGlow = 0;
      const pnx = rx / rMax, pny = ry / rMax;
      for (const k of hiiKnots) {
        const kdx = pnx - k.nx, kdy = pny - k.ny;
        const kd = Math.sqrt(kdx * kdx + kdy * kdy);
        if (kd < k.sz * 4) {
          hiiGlow += k.bright * Math.exp(-kd * kd / (k.sz * k.sz));
        }
      }
      hiiGlow = Math.min(hiiGlow, 0.6);

      // Arm + inter-arm contrast: arms bright, inter-arm dim
      const armContrib = armVal * clumpBright * 0.65;
      const rawTri = (disk + armContrib + bulge + hiiGlow * armVal * 0.4) * edgeTaper;
      const intensity = tonemap(rawTri * 2.5);

      // Color: blue arms (star-forming) vs yellow/brown inter-arm disk
      const armMix = clamp(armVal * 1.5, 0, 1);
      const warmth = Math.exp(-nd * 2.5);
      // Inter-arm: warm brownish. Arms: blue-white
      const baseR = lerp(lerp(140, 220, warmth), lerp(100, 180, warmth), armMix);
      const baseG = lerp(lerp(120, 200, warmth), lerp(140, 210, warmth), armMix);
      const baseB = lerp(lerp(80, 170, warmth), lerp(200, 240, warmth), armMix);
      // HII pink tint
      const r = (baseR + hiiGlow * 100) * intensity;
      const g = (baseG + hiiGlow * 30) * intensity;
      const b = (baseB + hiiGlow * 50) * intensity;

      if (r < 1 && g < 1 && b < 1) continue;
      u32[py * dim + px] =
        (clamp(intensity * 255, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
}

/** Helix Nebula (NGC 7293) — "Eye of God": large face-on planetary, double-ring perspective, scattered knots */
function generateHelixNebTex(baseSz: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 5);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const rMax = baseSz * 1.7;

  // Pre-generate scattered cometary knots — radially oriented, irregularly spaced
  const knotCount = 30 + (Math.random() * 15) | 0;
  const hKnots: { nx: number; ny: number; sz: number; bright: number; tailAngle: number }[] = [];
  for (let i = 0; i < knotCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 0.35 + (Math.random() - 0.3) * 0.35;
    hKnots.push({
      nx: Math.cos(ang) * rad,
      ny: Math.sin(ang) * rad / 1.15,
      sz: 0.015 + Math.random() * 0.02,
      bright: 0.15 + Math.random() * 0.25,
      tailAngle: ang, // radially outward
    });
  }

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const ex = dx, ey = dy * 1.15;
      const dist = Math.sqrt(ex * ex + ey * ey);
      if (dist > rMax) continue;
      const nd = dist / rMax;
      const edgeTaper = nd > 0.7 ? 0.5 + 0.5 * Math.cos(Math.PI * (nd - 0.7) / 0.3) : 1;

      // Double-ring perspective: outer ring with sharper inner boundary
      const outerR = 0.55, outerWin = 0.10, outerWout = 0.19;
      const outerDelta = nd - outerR;
      const outerW = outerDelta < 0 ? outerWin : outerWout;
      const outerRing = Math.exp(-outerDelta * outerDelta / (outerW * outerW));
      // Inner ring (tilted = offset center for perspective)
      const innerDx = dx + baseSz * 0.035, innerDy = dy * 1.2 - baseSz * 0.025;
      const innerDist = Math.sqrt(innerDx * innerDx + innerDy * innerDy) / rMax;
      const innerR = 0.28, innerW = 0.08;
      const innerRing = Math.exp(-(innerDist - innerR) * (innerDist - innerR) / (innerW * innerW)) * 0.6;

      // Scattered cometary knots with radial tails
      let knotGlow = 0;
      const pnx = dx / rMax, pny = dy / rMax;
      for (const k of hKnots) {
        const kdx = pnx - k.nx, kdy = pny - k.ny;
        const kd = Math.sqrt(kdx * kdx + kdy * kdy);
        if (kd < k.sz * 4) {
          // Head glow
          knotGlow += k.bright * Math.exp(-kd * kd / (k.sz * k.sz)) * 0.7;
          // Faint radial tail
          const toDist = kdx * Math.cos(k.tailAngle) + kdy * Math.sin(k.tailAngle);
          if (toDist > 0 && toDist < k.sz * 3) {
            const perpDist = Math.abs(-kdx * Math.sin(k.tailAngle) + kdy * Math.cos(k.tailAngle));
            if (perpDist < k.sz * 0.5) {
              knotGlow += k.bright * 0.3 * Math.exp(-toDist / (k.sz * 2));
            }
          }
        }
      }
      knotGlow = Math.min(knotGlow, 0.45);

      // Domain-warped ring texture
      const nsx = dx / rMax * 6, nsy = dy / rMax * 6;
      const wq1 = fbm(nsx + 8100, nsy + 8100, 3);
      const wq2 = fbm(nsx + 8152, nsy + 8131, 3);
      const texN = fbm(nsx + wq1 * 1.5, nsy + wq2 * 1.5, 4);
      const texVar = 0.65 + (texN + 1) * 0.35;

      // Central star + hot inner cavity
      const centralGlow = Math.exp(-nd * nd * 35) * 0.45;
      const cavity = nd < 0.18 ? (1 - nd / 0.18) * 0.15 : 0;

      const rawIntH = ((outerRing + innerRing) * texVar + knotGlow + centralGlow + cavity) * edgeTaper;
      const intensity = tonemap(rawIntH * 2.2);

      // Color: outer red/orange → inner cyan/blue → white center
      const colorT = clamp(nd / 0.6, 0, 1);
      const r = lerp(75, 230, colorT) * intensity;
      const g = lerp(200, 130, colorT) * intensity;
      const b = lerp(195, 75, colorT) * intensity;

      if (r < 1 && g < 1 && b < 1) continue;
      u32[py * dim + px] =
        (clamp(intensity * 255, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
}

/** Sombrero Galaxy (M104) — edge-on with prominent dust lane, bright bulge */
function generateSombreroTex(baseSz: number, angle: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 5);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const rMax = baseSz * 1.3;
  const cosA = Math.cos(-angle), sinA = Math.sin(-angle);
  const aspect = 0.22; // very edge-on

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const gx = dx * cosA - dy * sinA;
      const gy = (dx * sinA + dy * cosA) / aspect;
      const dist = Math.sqrt(gx * gx + gy * gy);
      if (dist > rMax) continue;
      const nd = dist / rMax;
      const edgeTaper = nd > 0.7 ? 0.5 + 0.5 * Math.cos(Math.PI * (nd - 0.7) / 0.3) : 1;
      // Disk profile
      const disk = Math.exp(-nd * 3);
      // Large bright spherical bulge (Sombrero's hallmark)
      const bulgeY = (dx * sinA + dy * cosA); // un-squeezed y
      const bulgeDist = Math.sqrt(gx * gx * 0.6 + bulgeY * bulgeY * 4);
      const bulge = Math.exp(-bulgeDist * bulgeDist / (baseSz * baseSz * 0.04)) * 1.5;
      // Noise texture
      const nsx = gx / rMax * 5, nsy = gy / rMax * 5;
      const texN = fbm(nsx + 8500, nsy + 8500, 3);
      const texVar = 0.7 + (texN + 1) * 0.3;
      // Prominent dust lane — dark band across equator
      const laneY = Math.abs(dx * sinA + dy * cosA);
      const laneN = fbm(gx / rMax * 8 + 8600, 0, 3);
      const laneWidth = baseSz * (0.012 + Math.abs(laneN) * 0.008);
      const inDisk = nd < 0.85;
      const dustLane = (laneY < laneWidth && inDisk) ?
        (1 - laneY / laneWidth) * 0.85 : 0;
      // Extended globular cluster halo (Sombrero has >2000 GCs)
      const haloY = (dx * sinA + dy * cosA);
      const haloDist = Math.sqrt(gx * gx * 0.7 + haloY * haloY) / rMax;
      const gcHalo = Math.exp(-haloDist * haloDist * 1.8) * 0.1;
      const rawSomb = (disk * 0.5 + bulge + gcHalo) * texVar * (1 - dustLane) * edgeTaper;
      const intensity = tonemap(rawSomb * 2.2);
      // Warm yellow-white with subtle color gradient
      const warmth = clamp(bulge / 1.5, 0, 1);
      const r = lerp(185, 255, warmth) * intensity;
      const g = lerp(170, 245, warmth) * intensity;
      const b = lerp(145, 210, warmth) * intensity;

      if (r < 1 && g < 1 && b < 1) continue;
      u32[py * dim + px] =
        (clamp(intensity * 255, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
}

/** Butterfly/Bug Nebula (NGC 6302) — bipolar lobes with narrow waist, asymmetric */
function generateButterflyNebTex(baseSz: number, angle: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 5);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const rMax = baseSz * 1.7;
  const cosA = Math.cos(-angle), sinA = Math.sin(-angle);

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const rx = dx * cosA - dy * sinA;
      const ry = dx * sinA + dy * cosA;
      const dist = Math.sqrt(rx * rx + ry * ry);
      if (dist > rMax) continue;
      const nd = dist / rMax;
      const edgeTaper = nd > 0.7 ? 0.5 + 0.5 * Math.cos(Math.PI * (nd - 0.7) / 0.3) : 1;
      const nsx = rx / rMax * 5, nsy = ry / rMax * 5;

      // Asymmetric bipolar lobes: lobe A (right) bigger, lobe B (left) more compact
      const lobeBoundA = fbm(nsx * 2 + 9000, nsy * 2 + 9000, 4, 2.2, 0.5) * 0.04;
      const lobeBoundB = fbm(nsx * 2 + 9050, nsy * 2 + 9050, 4, 2.2, 0.5) * 0.04;
      const lobeA = Math.exp(-(
        (rx / rMax - 0.32) * (rx / rMax - 0.32) * 10 +
        ry * ry / (rMax * rMax) * (5 + lobeBoundA * 20)
      ));
      const lobeB = Math.exp(-(
        (rx / rMax + 0.28) * (rx / rMax + 0.28) * 14 +
        ry * ry / (rMax * rMax) * (7 + lobeBoundB * 20)
      )) * 0.85;

      // Sharper equatorial dust torus
      const waistNorm = Math.abs(rx / rMax);
      const waistWarp = fbm(nsy * 3 + 9100, 0, 3) * 0.015;
      const waistWidth = 0.06 + waistWarp;
      const waist = waistNorm < waistWidth
        ? (1 - waistNorm / waistWidth) * (1 - waistNorm / waistWidth) * 0.9
        : 0;

      // 2-level domain-warped filamentary lobe boundaries
      const wq1 = fbm(nsx + 9150, nsy + 9150, 4);
      const wq2 = fbm(nsx + 9202, nsy + 9181, 4);
      const filN1 = fbm(nsx + wq1 * 2.2, nsy + wq2 * 2.2, 5);
      const wq3 = fbm(nsx + filN1 * 0.8 + 9250, nsy + filN1 * 0.8 + 9250, 3);
      const filN = fbm(nsx + wq3 * 0.6 + wq1 * 1.5, nsy + wq3 * 0.6 + wq2 * 1.5, 6);
      const filament = clamp((filN + 0.4) * 0.75, 0, 1);

      // Central star
      const central = Math.exp(-nd * nd * 50) * 0.35;
      const rawBut = ((lobeA + lobeB) * filament * 0.7 + central) * (1 - waist) * edgeTaper;
      const intensity = tonemap(rawBut * 2.2);

      // Purple-magenta lobes with teal at edges
      const edgeFrac = nd;
      const r = lerp(210, 115, edgeFrac) * intensity;
      const g = lerp(75, 175, edgeFrac) * intensity;
      const b = lerp(225, 200, edgeFrac) * intensity;

      if (r < 1 && g < 1 && b < 1) continue;
      u32[py * dim + px] =
        (clamp(intensity * 255, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
}

/** Rosette Nebula (NGC 2237) — circular emission shell, irregular petals, Bok globules */
function generateRosetteNebTex(baseSz: number): HTMLCanvasElement {
  const dim = Math.ceil(baseSz * 5);
  const nc = document.createElement("canvas");
  nc.width = dim; nc.height = dim;
  const nctx = nc.getContext("2d", { willReadFrequently: true })!;
  const imgData = nctx.createImageData(dim, dim);
  const buf = new ArrayBuffer(imgData.data.length);
  const u8 = new Uint8ClampedArray(buf);
  const u32 = new Uint32Array(buf);
  const hd = dim / 2;
  const rMax = baseSz * 1.8;

  // Pre-generate Bok globules — small dark blobs scattered in the shell
  const bokGlobules: { nx: number; ny: number; sz: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 0.2 + Math.random() * 0.35;
    bokGlobules.push({
      nx: Math.cos(ang) * rad,
      ny: Math.sin(ang) * rad,
      sz: 0.025 + Math.random() * 0.02,
    });
  }

  for (let py = 0; py < dim; py++) {
    for (let px = 0; px < dim; px++) {
      const dx = px - hd, dy = py - hd;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > rMax) continue;
      const nd = dist / rMax;
      const edgeTaper = nd > 0.7 ? 0.5 + 0.5 * Math.cos(Math.PI * (nd - 0.7) / 0.3) : 1;
      const theta = Math.atan2(dy, dx);
      const nsx = dx / rMax * 4, nsy = dy / rMax * 4;

      // Shell profile with sharper inner edge (cleared cavity)
      const shellR = 0.48, shellW = 0.25;
      const shellDist = nd - shellR;
      // Asymmetric: sharp inner edge, gradual outer falloff
      const shell = shellDist < 0
        ? Math.exp(-shellDist * shellDist / (0.08 * 0.08)) // sharp inner
        : Math.exp(-shellDist * shellDist / (shellW * shellW));

      // Irregular petals — domain-warped angular modulation (not regular sin)
      const petalWarp = fbm(theta * 2 + 9500, nd * 3 + 9500, 4, 2.0, 0.5) * 1.5;
      const petals = 0.45 + 0.55 * clamp(Math.sin(theta * 4.3 + petalWarp) * 0.5 + 0.5, 0, 1);

      // 2-level domain-warped filamentary cloud detail
      const wq1 = fbm(nsx + 9600, nsy + 9600, 4);
      const wq2 = fbm(nsx + 9652, nsy + 9631, 4);
      const cloudN1 = fbm(nsx + wq1 * 2.5, nsy + wq2 * 2.5, 5);
      const wq3 = fbm(nsx + cloudN1 * 1.0 + 9700, nsy + cloudN1 * 1.0 + 9700, 3);
      const cloudN = fbm(nsx + wq3 * 0.6 + wq1 * 1.8, nsy + wq3 * 0.6 + wq2 * 1.8, 6);
      const cloud = clamp((cloudN + 0.5) * 0.65, 0, 1);

      // Bok globules — explicit dark blobs
      let bokDark = 0;
      const pnx = dx / rMax, pny = dy / rMax;
      for (const bg of bokGlobules) {
        const bd = Math.sqrt((pnx - bg.nx) * (pnx - bg.nx) + (pny - bg.ny) * (pny - bg.ny));
        if (bd < bg.sz * 2.5) {
          bokDark = Math.max(bokDark, Math.exp(-bd * bd / (bg.sz * bg.sz)) * 0.7);
        }
      }
      // Additional noise-based dark patches
      const bokN = fbm(nsx * 3 + 9800, nsy * 3 + 9800, 3);
      if (bokN > 0.4) bokDark = Math.max(bokDark, clamp((bokN - 0.4) * 3, 0, 0.6));

      // Central cavity glow (faint scattered light)
      const cavityGlow = nd < 0.22 ? Math.exp(-nd * 10) * 0.12 : 0;

      const rawRos = (shell * petals * cloud * 0.7 + cavityGlow) * (1 - bokDark) * edgeTaper;
      const intensity = tonemap(rawRos * 2.5);

      // Pink-red H-alpha emission, bluer at edges
      const edgeMix = clamp((nd - 0.3) / 0.4, 0, 1);
      const r = lerp(250, 155, edgeMix) * intensity;
      const g = lerp(115, 95, edgeMix) * intensity;
      const b = lerp(125, 175, edgeMix) * intensity;

      if (r < 1 && g < 1 && b < 1) continue;
      u32[py * dim + px] =
        (clamp(intensity * 255, 0, 255) << 24) |
        (clamp(b, 0, 255) << 16) |
        (clamp(g, 0, 255) << 8) |
        clamp(r, 0, 255);
    }
  }
  imgData.data.set(u8);
  nctx.putImageData(imgData, 0, 0);
  return nc;
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
    let dsoTextures: HTMLCanvasElement[] = [];
    let constSprites: ConstLineSprite[] = [];
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
    let scrollVelMag = 0; // camera velocity magnitude for scroll-gate
    let nextShootTime = 0;
    let satellites: Satellite[] = [];
    let nextSatTime = 0;
    let comets: Comet[] = [];
    let nextCometTime = 0;
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
              // Multi-color MW: warm center → reddish-brown dust → cool blue edges
              // mw is 0-1 where 1 = band center, use it as warmth factor
              const warmth = mw * mw; // quadratic: concentrated warmth at center
              const colorVar = (fbm(sx * 0.3 + 150, sy * 0.3 + 150, 3) + 1) * 0.5;
              const coreR = cfg.mwR + 40 * warmth + 25 * colorVar;   // yellower core
              const coreG = cfg.mwG - 20 * warmth + 15 * colorVar;   // less green at center
              const coreB = cfg.mwB - 30 * warmth + 50 * (1 - warmth); // bluer at edges
              // Reddish-brown dust tint in mid-band
              const dustTint = colorVar > 0.6 ? (colorVar - 0.6) * 2.5 : 0;
              r += (coreR + dustTint * 35) * int;
              g += (coreG - dustTint * 15) * int;
              b += (coreB - dustTint * 25) * int;
            }

            // Dark nebulae
            const dn = fbm(sx * 0.6 + 400, sy * 0.6 + 400, 5);
            if (dn < -0.08) {
              const dk = Math.min(1, (-dn - 0.08) * 2.8);
              r *= 1 - dk * 0.78; g *= 1 - dk * 0.78; b *= 1 - dk * 0.78;
            }

            // Great Rift — prominent dark lane along MW center
            const darkN = fbm(sx * 0.4 + 600, sy * 0.4 + 600, 4);
            if (darkN > 0.25) {  // lowered threshold from 0.35 → wider rift
              const dk = Math.min(1, (darkN - 0.25) * 4);
              const riftStr = mw > 0.1 ? dk * 0.92 : dk * 0.5; // stronger in MW band
              r *= 1 - riftStr; g *= 1 - riftStr; b *= 1 - riftStr;
            }
            // Filamentary dark lanes (finer detail perpendicular to MW)
            const filN = fbm(sx * 1.2 + 800, sy * 1.2 + 800, 3);
            if (filN > 0.4 && mw > 0.05) {
              const fil = Math.min(1, (filN - 0.4) * 3) * mw * 0.4;
              r *= 1 - fil; g *= 1 - fil; b *= 1 - fil;
            }

            const bgn = (fbm(sx * 0.25 + 700, sy * 0.25 + 700, 3) + 1) * 0.5;
            r += bgn * 5; g += bgn * 3; b += bgn * 8;
            // Star cloud brightness patches (dense luminous regions)
            if (mw > 0.1) {
              const scN = (fbm(sx * 0.5 + 900, sy * 0.5 + 900, 4) + 1) * 0.5;
              if (scN > 0.65) {
                const scInt = (scN - 0.65) * 2.86 * mw * 0.35;
                r += 180 * scInt; g += 160 * scInt; b += 120 * scInt;
              }
            }

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

    /* ---- Zone nebulae: each zone has unique visual structure (pre-computed) ---- */
    const generateZoneNebulae = () => {
      const nebDiv = 3; // resolution divisor (lower = sharper textures, higher init cost)
      const nebPadW = Math.ceil(NEB_PAD / nebDiv), nebPadH = Math.ceil(NEB_PAD / nebDiv);
      const nw = Math.ceil(lw / nebDiv) + nebPadW * 2, nh = Math.ceil(lh / nebDiv) + nebPadH * 2;
      const generators = [genNebZone0, genNebZone1, genNebZone2, genNebZone3, genNebZone4];
      zoneNebulae = ZONES.map((zone, idx) => {
        const nc = document.createElement("canvas");
        nc.width = nw; nc.height = nh;
        const nctx = nc.getContext("2d", { willReadFrequently: true })!;
        const imgData = nctx.createImageData(nw, nh);
        const buf = new ArrayBuffer(imgData.data.length);
        const u8 = new Uint8ClampedArray(buf);
        const u32 = new Uint32Array(buf);

        // Dispatch to zone-specific generator
        generators[idx](u32, nw, nh, zone.neb);

        imgData.data.set(u8);
        nctx.putImageData(imgData, 0, 0);

        // Per-zone post-processing (directional / radial blur, init-time only)
        {
          const tmp0 = document.createElement("canvas");
          tmp0.width = nw; tmp0.height = nh;
          tmp0.getContext("2d")!.drawImage(nc, 0, 0);
          if (idx === 0) {
            // Zone 0: directional smear along sweep angle → elongated fibers
            const smAng = 0.44;
            const sdx = Math.cos(smAng) * 2, sdy = Math.sin(smAng) * 2;
            for (let i = 1; i <= 4; i++) {
              nctx.globalAlpha = 0.12 / Math.sqrt(i);
              nctx.drawImage(tmp0, sdx * i, sdy * i);
              nctx.drawImage(tmp0, -sdx * i, -sdy * i);
            }
          } else if (idx === 1) {
            // Zone 1: vertical smear (angle ~1.5 rad) — aurora curtain drape
            const smAng1 = 1.5;
            const s1dx = Math.cos(smAng1) * 2.5, s1dy = Math.sin(smAng1) * 2.5;
            for (let i = 1; i <= 3; i++) {
              nctx.globalAlpha = 0.10 / Math.sqrt(i);
              nctx.drawImage(tmp0, s1dx * i, s1dy * i);
              nctx.drawImage(tmp0, -s1dx * i, -s1dy * i);
            }
          } else if (idx === 2) {
            // Zone 2: radial blur from off-center point via scale transform
            const rcx = nw * 0.35, rcy = nh * 0.4;
            for (let i = 1; i <= 4; i++) {
              const sc = 1 + i * 0.008;
              nctx.save();
              nctx.globalAlpha = 0.08 / Math.sqrt(i);
              nctx.translate(rcx, rcy);
              nctx.scale(sc, sc);
              nctx.translate(-rcx, -rcy);
              nctx.drawImage(tmp0, 0, 0);
              nctx.restore();
            }
          } else if (idx === 3) {
            // Zone 3: diagonal smear along rot=1.2 rad — filament flow
            const smAng3 = 1.2;
            const s3dx = Math.cos(smAng3) * 2, s3dy = Math.sin(smAng3) * 2;
            for (let i = 1; i <= 4; i++) {
              nctx.globalAlpha = 0.10 / Math.sqrt(i);
              nctx.drawImage(tmp0, s3dx * i, s3dy * i);
              nctx.drawImage(tmp0, -s3dx * i, -s3dy * i);
            }
          } else if (idx === 4) {
            // Zone 4: isotropic 8-direction soft blur — ethereal void cells
            const dirs4 = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4];
            for (let pass = 0; pass < 2; pass++) {
              for (const ang of dirs4) {
                const d4x = Math.cos(ang) * 1.5, d4y = Math.sin(ang) * 1.5;
                nctx.globalAlpha = 0.06;
                nctx.drawImage(tmp0, d4x, d4y);
                nctx.drawImage(tmp0, -d4x, -d4y);
              }
            }
          }
          nctx.globalAlpha = 1;
        }

        return nc;
      });
    };

    /* ---- DSO textures (noise-based, pre-rendered at init) ---- */
    const generateDSOTextures = () => {
      const md = Math.min(lw, lh);
      // Per-type settings: [blur radius, bloom strength, embedded star count, star brightness, grain intensity]
      const dsoPostSettings: Record<DsoType, [number, number, number, number, number]> = {
        andromeda:       [3, 0.06, 10, 0.06, 0.02],
        pleiades:        [16, 0.48, 20, 0.35, 0.03],
        orion_nebula:    [14, 0.42, 35, 0.20, 0.04],
        crab_nebula:     [10, 0.32, 15, 0.18, 0.04],
        eagle_nebula:    [12, 0.38, 30, 0.20, 0.04],
        ring_nebula:     [10, 0.38, 10, 0.15, 0.035],
        lagoon_nebula:   [12, 0.38, 25, 0.20, 0.04],
        whirlpool:       [12, 0.30, 40, 0.22, 0.035],
        horsehead:       [12, 0.32, 20, 0.18, 0.04],
        omega_nebula:    [12, 0.38, 20, 0.18, 0.04],
        triangulum:      [10, 0.28, 35, 0.22, 0.035],
        helix_nebula:    [12, 0.40, 18, 0.18, 0.04],
        sombrero:        [10, 0.28, 30, 0.20, 0.035],
        butterfly_nebula:[12, 0.38, 12, 0.15, 0.04],
        rosette_nebula:  [14, 0.40, 25, 0.18, 0.04],
      };
      dsoTextures = DEEP_SKY.map((d) => {
        const sz = d.size * md;
        let raw: HTMLCanvasElement;
        switch (d.type) {
          case 'andromeda': raw = generateAndromedaTex(sz, d.angle); break;
          case 'pleiades': raw = generatePleiadesNebTex(sz); break;
          case 'orion_nebula': raw = generateOrionNebTex(sz); break;
          case 'crab_nebula': raw = generateCrabNebTex(sz, d.angle); break;
          case 'eagle_nebula': raw = generateEagleNebTex(sz, d.angle); break;
          case 'ring_nebula': raw = generateRingNebTex(sz); break;
          case 'lagoon_nebula': raw = generateLagoonNebTex(sz, d.angle); break;
          case 'whirlpool': raw = generateWhirlpoolTex(sz, d.angle); break;
          case 'horsehead': raw = generateHorseheadTex(sz); break;
          case 'omega_nebula': raw = generateOmegaNebTex(sz, d.angle); break;
          case 'triangulum': raw = generateTriangulumTex(sz, d.angle); break;
          case 'helix_nebula': raw = generateHelixNebTex(sz); break;
          case 'sombrero': raw = generateSombreroTex(sz, d.angle); break;
          case 'butterfly_nebula': raw = generateButterflyNebTex(sz, d.angle); break;
          case 'rosette_nebula': raw = generateRosetteNebTex(sz); break;
        }
        const [glowR, glowS, starCount, starBr, grainInt] = dsoPostSettings[d.type];
        // Add embedded field stars before bloom (so they also get bloomed)
        addEmbeddedStars(raw, starCount, starBr);
        // Dual-radius chromatic bloom
        const bloomed = applyDSOGlow(raw, glowR, glowS);
        // Astrophoto grain (after bloom, on final)
        addAstroGrain(bloomed, grainInt);
        return bloomed;
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
        // Dense star patches visible during zone 3-4 scrolling
        { x: w * 0.85, y: h * 0.35, r: Math.min(w, h) * 0.10 },
        { x: w * 0.15, y: h * 0.70, r: Math.min(w, h) * 0.11 },
        { x: w * 0.60, y: h * 0.80, r: Math.min(w, h) * 0.09 },
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
      // Layer 4: Feature (some are Cepheid variables)
      for (let i = 0; i < c.feat; i++) {
        const fs = make(
          Math.random() * w * 0.8 + w * 0.1,
          Math.random() * h * 0.6 + h * 0.08,
          Math.random() * 1.5, 4);
        if (i < 3) fs.cepheidPeriod = 8 + Math.random() * 12; // 8-20s period
        starsByLayer[4].push(fs);
      }
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

            // --- Chromatic aberration halo (star-color-aware R/B channel offset) ---
            const caOff = Math.max(1.2, sz * 0.15); // offset px
            const caRad = sz * 3;
            // Red halo shifted right (tinted by star color)
            const caRr = Math.min(255, ri * 1.6) | 0, caRg = (gi * 0.3) | 0, caRb = (bi * 0.15) | 0;
            const rGrd = sctx.createRadialGradient(cx + caOff, cy, 0, cx + caOff, cy, caRad);
            rGrd.addColorStop(0, `rgba(${caRr},${caRg},${caRb},0.04)`);
            rGrd.addColorStop(0.4, `rgba(${caRr},${caRg},${caRb},0.01)`);
            rGrd.addColorStop(1, `rgba(${caRr},0,0,0)`);
            sctx.beginPath(); sctx.arc(cx + caOff, cy, caRad, 0, Math.PI * 2);
            sctx.fillStyle = rGrd; sctx.fill();
            // Blue halo shifted left (tinted by star color)
            const caBr = (ri * 0.15) | 0, caBg = (gi * 0.3) | 0, caBb = Math.min(255, bi * 1.6) | 0;
            const bGrd = sctx.createRadialGradient(cx - caOff, cy, 0, cx - caOff, cy, caRad);
            bGrd.addColorStop(0, `rgba(${caBr},${caBg},${caBb},0.04)`);
            bGrd.addColorStop(0.4, `rgba(${caBr},${caBg},${caBb},0.01)`);
            bGrd.addColorStop(1, `rgba(0,0,${caBb},0)`);
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

            // Lens flare: horizontal streak + ghost circles
            const flareLen = sz * 16;
            const flareH = Math.max(0.8, sz * 0.12);
            const flareA = 0.06;
            // Horizontal streak
            const hf = sctx.createLinearGradient(cx - flareLen, cy, cx + flareLen, cy);
            hf.addColorStop(0, `rgba(${ri},${gi},${bi},0)`);
            hf.addColorStop(0.3, `rgba(${ri},${gi},${bi},${flareA * 0.3})`);
            hf.addColorStop(0.45, `rgba(255,255,255,${flareA})`);
            hf.addColorStop(0.55, `rgba(255,255,255,${flareA})`);
            hf.addColorStop(0.7, `rgba(${ri},${gi},${bi},${flareA * 0.3})`);
            hf.addColorStop(1, `rgba(${ri},${gi},${bi},0)`);
            sctx.fillStyle = hf;
            sctx.fillRect(cx - flareLen, cy - flareH, flareLen * 2, flareH * 2);
            // Ghost circles (lens artifacts)
            const ghosts = [
              { dx: sz * 5, r: sz * 1.2, a: 0.015 },
              { dx: -sz * 7, r: sz * 0.8, a: 0.01 },
              { dx: sz * 10, r: sz * 1.5, a: 0.008 },
            ];
            for (const gh of ghosts) {
              const gg = sctx.createRadialGradient(cx + gh.dx, cy, 0, cx + gh.dx, cy, gh.r);
              gg.addColorStop(0, `rgba(${ri},${gi},${bi},0)`);
              gg.addColorStop(0.6, `rgba(${ri},${gi},${bi},${gh.a})`);
              gg.addColorStop(0.8, `rgba(${ri},${gi},${bi},${gh.a * 0.5})`);
              gg.addColorStop(1, `rgba(${ri},${gi},${bi},0)`);
              sctx.beginPath(); sctx.arc(cx + gh.dx, cy, gh.r, 0, Math.PI * 2);
              sctx.fillStyle = gg; sctx.fill();
            }
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

    /* ---- Pre-render constellation line sprites (shadowBlur only at init, free at runtime) ---- */
    const generateConstellationSprites = () => {
      const md = Math.min(lw, lh);
      constSprites = CONSTELLATIONS.map(c => {
        // Bounding box of star positions in pixels
        let minPx = Infinity, maxPx = -Infinity;
        let minPy = Infinity, maxPy = -Infinity;
        for (const s of c.stars) {
          const px = s.dx * md, py = s.dy * md;
          if (px < minPx) minPx = px;
          if (px > maxPx) maxPx = px;
          if (py < minPy) minPy = py;
          if (py > maxPy) maxPy = py;
        }
        // Padding: half max lineWidth(5) + shadowBlur(14) + overshoot(2.5) ≈ 22 → 25
        const pad = 25;
        const w = Math.ceil(maxPx - minPx) + pad * 2;
        const h = Math.ceil(maxPy - minPy) + pad * 2;
        const ox = -minPx + pad; // local origin offset
        const oy = -minPy + pad;

        const sc = document.createElement("canvas");
        sc.width = w; sc.height = h;
        const sctx = sc.getContext("2d")!;
        sctx.globalCompositeOperation = "lighter";
        sctx.lineCap = "round";

        for (const [a, b] of c.edges) {
          const sa = c.stars[a], sb = c.stars[b];
          const pax = sa.dx * md + ox, pay = sa.dy * md + oy;
          const pbx = sb.dx * md + ox, pby = sb.dy * md + oy;
          const cA = sa.color || [200, 210, 240];
          const cB = sb.color || [200, 210, 240];
          const mR = (cA[0] + cB[0]) >> 1, mG = (cA[1] + cB[1]) >> 1, mB = (cA[2] + cB[2]) >> 1;

          // Overshoot 2.5px past each star
          const ddx = pbx - pax, ddy = pby - pay;
          const len = Math.sqrt(ddx * ddx + ddy * ddy);
          if (len < 1) continue;
          const inv = 1 / len;
          const x0 = pax - ddx * inv * 2.5, y0 = pay - ddy * inv * 2.5;
          const x1 = pbx + ddx * inv * 2.5, y1 = pby + ddy * inv * 2.5;

          // Pass 1-2: wide glow WITH shadowBlur (expensive, but only at init)
          sctx.shadowColor = `rgba(${mR},${mG},${mB},0.5)`;
          sctx.shadowBlur = 14;
          sctx.strokeStyle = `rgba(${mR},${mG},${mB},0.008)`;
          sctx.lineWidth = 10;
          sctx.beginPath(); sctx.moveTo(x0, y0); sctx.lineTo(x1, y1); sctx.stroke();
          sctx.strokeStyle = `rgba(${mR},${mG},${mB},0.015)`;
          sctx.lineWidth = 7;
          sctx.beginPath(); sctx.moveTo(x0, y0); sctx.lineTo(x1, y1); sctx.stroke();

          // Pass 3: medium glow with reduced shadow
          sctx.shadowBlur = 8;
          sctx.strokeStyle = `rgba(${mR},${mG},${mB},0.03)`;
          sctx.lineWidth = 4.5;
          sctx.beginPath(); sctx.moveTo(x0, y0); sctx.lineTo(x1, y1); sctx.stroke();

          // Pass 4: spectral gradient with subtle shadow
          sctx.shadowBlur = 4;
          const g1 = sctx.createLinearGradient(x0, y0, x1, y1);
          g1.addColorStop(0, `rgba(${cA[0]},${cA[1]},${cA[2]},0.08)`);
          g1.addColorStop(0.5, `rgba(${mR},${mG},${mB},0.065)`);
          g1.addColorStop(1, `rgba(${cB[0]},${cB[1]},${cB[2]},0.08)`);
          sctx.strokeStyle = g1;
          sctx.lineWidth = 2.5;
          sctx.beginPath(); sctx.moveTo(x0, y0); sctx.lineTo(x1, y1); sctx.stroke();

          // Pass 5-6: core spectral lines (no shadow needed)
          sctx.shadowBlur = 0;
          const g2 = sctx.createLinearGradient(x0, y0, x1, y1);
          g2.addColorStop(0, `rgba(${cA[0]},${cA[1]},${cA[2]},0.18)`);
          g2.addColorStop(0.5, `rgba(${mR},${mG},${mB},0.15)`);
          g2.addColorStop(1, `rgba(${cB[0]},${cB[1]},${cB[2]},0.18)`);
          sctx.strokeStyle = g2;
          sctx.lineWidth = 1.0;
          sctx.beginPath(); sctx.moveTo(x0, y0); sctx.lineTo(x1, y1); sctx.stroke();

          sctx.strokeStyle = `rgba(${mR},${mG},${mB},0.30)`;
          sctx.lineWidth = 0.5;
          sctx.beginPath(); sctx.moveTo(x0, y0); sctx.lineTo(x1, y1); sctx.stroke();
        }
        return { canvas: sc, ox, oy };
      });
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

      // Cepheid pulsation: slow periodic brightness + size variation
      if (s.cepheidPeriod) {
        const cephPhase = (t / s.cepheidPeriod) * Math.PI * 2;
        // Asymmetric light curve: fast rise, slow decline (real Cepheids)
        const cephWave = 0.5 + 0.3 * Math.sin(cephPhase) + 0.2 * Math.sin(cephPhase * 2 + 0.5);
        alpha = clamp(alpha * (0.5 + cephWave * 0.8), 0, 1);
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

    /* ---- Satellite / ISS streak ---- */
    const maybeSpawnSatellite = (time: number) => {
      if (time < nextSatTime || satellites.length >= 1) return;
      nextSatTime = time + 30000 + Math.random() * 30000;
      const fromLeft = Math.random() > 0.5;
      const speed = 1.2 + Math.random() * 0.8; // px/frame
      const yStart = Math.random() * lh * 0.6;
      const angle = (fromLeft ? 0.05 : Math.PI - 0.05) + (Math.random() - 0.5) * 0.3;
      satellites.push({
        x: fromLeft ? -20 : lw + 20,
        y: yStart,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.3,
        life: 1,
        maxLife: (lw / speed) * 1.2, // enough frames to cross screen
        brightness: 0.4 + Math.random() * 0.3,
        flareTime: 0.3 + Math.random() * 0.4, // flare at 30-70% of travel
      });
    };

    const updateAndDrawSatellites = () => {
      for (let i = satellites.length - 1; i >= 0; i--) {
        const s = satellites[i];
        s.x += s.vx; s.y += s.vy;
        s.life -= 1 / s.maxLife;
        if (s.life <= 0 || s.x < -50 || s.x > lw + 50 || s.y < -50 || s.y > lh + 50) {
          satellites.splice(i, 1); continue;
        }
        const lifeFrac = 1 - s.life;
        // Iridium-style flare: 3x brightness burst over ~5% of travel
        const flareDist = Math.abs(lifeFrac - s.flareTime);
        const flareBoost = flareDist < 0.025 ? 1 + 2 * (1 - flareDist / 0.025) : 1;
        const br = s.brightness * flareBoost;
        // Fade in/out at edges
        const edgeFade = Math.min(lifeFrac * 10, (1 - lifeFrac) * 10, 1);
        const alpha = br * edgeFade;
        // Draw dot
        ctx.beginPath(); ctx.arc(s.x, s.y, flareBoost > 1.5 ? 2.0 : 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,240,${clamp(alpha, 0, 1)})`;
        ctx.fill();
        // Short trail
        const trailLen = 8;
        const vMag = Math.hypot(s.vx, s.vy) || 1;
        const tx = s.x - (s.vx / vMag) * trailLen;
        const ty = s.y - (s.vy / vMag) * trailLen;
        ctx.save();
        ctx.strokeStyle = `rgba(255,255,240,${clamp(alpha * 0.3, 0, 1)})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.restore();
      }
    };

    /* ---- Comet ---- */
    const maybeSpawnComet = (time: number) => {
      if (time < nextCometTime || comets.length >= 1) return;
      nextCometTime = time + 45000 + Math.random() * 45000;
      const angle = Math.PI * 0.6 + Math.random() * 0.5; // mostly downward-right
      const speed = 0.3 + Math.random() * 0.5;
      comets.push({
        x: Math.random() * lw * 0.3,
        y: -30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 600 + Math.random() * 600, // 30-60s at 30fps
        dustAngle: 0.35 + Math.random() * 0.3, // curve offset for dust tail
        tailLen: 200 + Math.random() * 200,
      });
    };

    const updateAndDrawComets = () => {
      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.x += c.vx; c.y += c.vy;
        c.life -= 1 / c.maxLife;
        if (c.life <= 0 || c.x > lw + 100 || c.y > lh + 100 || c.x < -200 || c.y < -200) {
          comets.splice(i, 1); continue;
        }
        const lifeCurve = Math.sin(c.life * Math.PI); // fade in/out
        const vMag = Math.hypot(c.vx, c.vy) || 1;
        const ndx = -c.vx / vMag, ndy = -c.vy / vMag; // tail direction (opposite velocity)

        // Ion tail — straight blue-white gradient
        const ionLen = c.tailLen * lifeCurve;
        const ionEndX = c.x + ndx * ionLen;
        const ionEndY = c.y + ndy * ionLen;
        const ionGrad = ctx.createLinearGradient(c.x, c.y, ionEndX, ionEndY);
        ionGrad.addColorStop(0, `rgba(180,210,255,${lifeCurve * 0.25})`);
        ionGrad.addColorStop(0.1, `rgba(140,180,255,${lifeCurve * 0.15})`);
        ionGrad.addColorStop(0.4, `rgba(100,140,230,${lifeCurve * 0.06})`);
        ionGrad.addColorStop(1, `rgba(80,100,200,0)`);
        ctx.save();
        ctx.strokeStyle = ionGrad;
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(ionEndX, ionEndY); ctx.stroke();
        ctx.restore();

        // Dust tail — curved warm gradient via quadraticCurveTo
        const dustLen = ionLen * 0.5;
        const dustEndX = c.x + ndx * dustLen;
        const dustEndY = c.y + ndy * dustLen;
        // Control point offset perpendicular to tail direction
        const perpX = -ndy, perpY = ndx;
        const cpx = c.x + ndx * dustLen * 0.5 + perpX * dustLen * Math.sin(c.dustAngle);
        const cpy = c.y + ndy * dustLen * 0.5 + perpY * dustLen * Math.sin(c.dustAngle);
        ctx.save();
        ctx.strokeStyle = `rgba(255,220,150,${lifeCurve * 0.12})`;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.quadraticCurveTo(cpx, cpy, dustEndX, dustEndY); ctx.stroke();
        ctx.restore();

        // Coma head — green-white radial gradient
        const comaR = 6;
        const comaGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, comaR);
        comaGrad.addColorStop(0, `rgba(220,255,220,${lifeCurve * 0.7})`);
        comaGrad.addColorStop(0.3, `rgba(150,230,150,${lifeCurve * 0.3})`);
        comaGrad.addColorStop(0.7, `rgba(100,200,120,${lifeCurve * 0.08})`);
        comaGrad.addColorStop(1, `rgba(80,160,100,0)`);
        ctx.beginPath(); ctx.arc(c.x, c.y, comaR, 0, Math.PI * 2);
        ctx.fillStyle = comaGrad; ctx.fill();
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

    /* ---- Constellations ---- */
    const drawConstellations = (wts: number[], time: number) => {
      for (let ci = 0; ci < CONSTELLATIONS.length; ci++) {
        const c = CONSTELLATIONS[ci];
        let op = 0;
        for (let i = 0; i < wts.length && i < c.zoneWeights.length; i++)
          op = Math.max(op, wts[i] * c.zoneWeights[i]);
        if (op > 0.01) drawConstellation(ctx, c, op * 1.0, lw, lh, time, smoothCameraX, smoothCameraY, constSprites[ci]);
      }
    };

    /* ---- Zodiacal Light + Airglow ---- */
    const drawAtmospheric = (wts: number[]) => {
      // Zodiacal light — faint triangular glow from bottom center
      // Strongest in Zone 0-1 (near "horizon")
      const zodOp = Math.max(wts[0] * 0.8, wts[1] * 0.5, wts[4] * 0.6);
      if (zodOp > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const zh = lh * 0.55;
        const zg = ctx.createLinearGradient(lw * 0.5, lh, lw * 0.5, lh - zh);
        zg.addColorStop(0, `rgba(255,230,180,${zodOp * 0.088})`);
        zg.addColorStop(0.15, `rgba(240,210,150,${zodOp * 0.05})`);
        zg.addColorStop(0.4, `rgba(200,180,130,${zodOp * 0.02})`);
        zg.addColorStop(1, `rgba(160,140,100,0)`);
        ctx.beginPath();
        ctx.moveTo(lw * 0.2, lh);
        ctx.lineTo(lw * 0.5, lh - zh);
        ctx.lineTo(lw * 0.8, lh);
        ctx.closePath();
        ctx.fillStyle = zg; ctx.fill();
        ctx.restore();
      }
      // Airglow — thin green-blue band at bottom edge
      const agOp = Math.max(wts[1] * 0.6, wts[2] * 0.8, wts[3] * 0.5);
      if (agOp > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const agH = lh * 0.12;
        const ag = ctx.createLinearGradient(0, lh, 0, lh - agH);
        ag.addColorStop(0, `rgba(80,180,120,${agOp * 0.06})`);
        ag.addColorStop(0.3, `rgba(60,150,100,${agOp * 0.04})`);
        ag.addColorStop(0.7, `rgba(40,120,80,${agOp * 0.016})`);
        ag.addColorStop(1, `rgba(20,80,60,0)`);
        ctx.fillStyle = ag;
        ctx.fillRect(0, lh - agH, lw, agH);
        ctx.restore();
      }
      // Horizon glow — warm purple-orange band at bottom 25%
      const hzOp = Math.max(wts[0] * 0.9, wts[1] * 0.7, wts[2] * 0.3, wts[3] * 0.15, wts[4] * 0.05);
      if (hzOp > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const hzH = lh * 0.25;
        const hg = ctx.createLinearGradient(0, lh, 0, lh - hzH);
        hg.addColorStop(0, `rgba(180,100,60,${hzOp * 0.04})`);
        hg.addColorStop(0.3, `rgba(140,70,120,${hzOp * 0.025})`);
        hg.addColorStop(0.65, `rgba(80,40,100,${hzOp * 0.012})`);
        hg.addColorStop(1, `rgba(40,20,60,0)`);
        ctx.fillStyle = hg;
        ctx.fillRect(0, lh - hzH, lw, hzH);
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
            // Animated lens flare: oscillating horizontal streak + ghost circles
            if (time !== undefined && modA > 0.05) {
              const flareOsc = 0.5 + 0.5 * Math.sin(time * 0.0005 + s.nSeed * 7);
              const flareA = modA * 0.03 * flareOsc;
              if (flareA > 0.002) {
                const fLen = s.size * 14;
                ctx.save();
                ctx.globalCompositeOperation = "lighter";
                ctx.globalAlpha = flareA;
                ctx.strokeStyle = `rgba(${(s.baseColor[0] * 0.8 + 50) | 0},${(s.baseColor[1] * 0.8 + 50) | 0},${(s.baseColor[2] * 0.8 + 50) | 0},1)`;
                ctx.lineWidth = Math.max(0.5, s.size * 0.1);
                ctx.beginPath(); ctx.moveTo(ix - fLen, iy); ctx.lineTo(ix + fLen, iy); ctx.stroke();
                // Ghost circles at time-varying offsets
                const ghostOsc = Math.sin(time * 0.0003 + s.nSeed * 3.1);
                const ghostDx = s.size * (4 + ghostOsc * 2);
                ctx.globalAlpha = flareA * 0.5;
                ctx.beginPath(); ctx.arc(ix + ghostDx, iy, s.size * 1.0, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(${s.baseColor[0]},${s.baseColor[1]},${s.baseColor[2]},0.5)`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
                ctx.beginPath(); ctx.arc(ix - ghostDx * 1.4, iy, s.size * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
              }
            }
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

      // --- DSO depth-layer drawing helper ---
      // 3 layers with distinct drift speed / parallax for depth separation
      // depth 0 (galaxies): slowest, drawn here after MW
      // depth 1 (large nebulae): moderate, drawn after deep field
      // depth 2 (compact objects): fastest, drawn after zone nebulae
      const DSO_DEPTH_PARAMS: Array<{
        driftF: [number, number, number, number];
        driftA: [number, number, number, number];
        mousePx: number; camPx: number;
      }> = [
        { driftF: [0.012, 0.008, 0.010, 0.006], driftA: [18, 10, 14, 8], mousePx: 3.0, camPx: 0.04 },
        { driftF: [0.022, 0.014, 0.018, 0.011], driftA: [32, 18, 24, 14], mousePx: 5.0, camPx: 0.05 },
        { driftF: [0.035, 0.022, 0.028, 0.017], driftA: [50, 28, 38, 22], mousePx: 8.0, camPx: 0.065 },
      ];
      const drawDSOLayer = (depthLevel: 0 | 1 | 2) => {
        if (dsoTextures.length === 0) return;
        const p = DSO_DEPTH_PARAMS[depthLevel];
        const md = Math.min(lw, lh);
        const layerDx = !reduced && time !== undefined
          ? Math.sin(driftTime * p.driftF[0]) * p.driftA[0] + Math.sin(driftTime * p.driftF[1]) * p.driftA[1] : 0;
        const layerDy = !reduced && time !== undefined
          ? Math.cos(driftTime * p.driftF[2]) * p.driftA[2] + Math.cos(driftTime * p.driftF[3]) * p.driftA[3] : 0;
        const mOff = p.mousePx;
        const cOff = p.camPx;
        const baseOffX = smoothMouseX * mOff - smoothCameraX * cOff;
        const baseOffY = smoothMouseY * mOff - smoothCameraY * cOff;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let di = 0; di < DEEP_SKY.length; di++) {
          const d = DEEP_SKY[di];
          if (d.depth !== depthLevel) continue;
          const tex = dsoTextures[di];
          if (!tex) continue;
          const px = d.vpX * lw - baseOffX - layerDx;
          const py = d.vpY * lh - baseOffY - layerDy;
          const sz = d.size * md;
          const baseAlpha = d.type === 'andromeda' || d.type === 'orion_nebula' ? 0.65
            : d.type === 'pleiades' ? 0.55
            : d.type === 'whirlpool' || d.type === 'triangulum' || d.type === 'sombrero' ? 0.5
            : 0.6;
          // Real-time shimmer: multi-frequency sin() per-DSO for subtle breathing
          const t = time ?? 0;
          const shimmerPhase = d.vpX * 17.3 + d.vpY * 31.7; // unique per object
          const shimmer = 1
            + 0.04 * Math.sin(t * 0.0008 + shimmerPhase)
            + 0.025 * Math.sin(t * 0.0013 + shimmerPhase * 2.3)
            + 0.015 * Math.sin(t * 0.0021 + shimmerPhase * 0.7);
          // Light echo pulse: 45s cycle per DSO, 1.5s bright window
          const pulsePhase = (t * 0.001 + shimmerPhase * 50) % 45;
          const pulseBoost = pulsePhase < 1.5 ? Math.pow(Math.sin(pulsePhase / 1.5 * Math.PI), 2) * 0.25 : 0;
          const dsoAlpha = clamp(baseAlpha * shimmer + pulseBoost, 0, 1);
          ctx.globalAlpha = dsoAlpha;
          // Galaxy rotation for spiral types
          const isRotatable = d.type === 'whirlpool' || d.type === 'triangulum';
          if (isRotatable) {
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(driftTime * 0.00015);
            ctx.drawImage(tex, -tex.width / 2, -tex.height / 2);
            ctx.restore();
          } else {
            ctx.drawImage(tex, px - tex.width / 2, py - tex.height / 2);
          }
          ctx.globalAlpha = 1;
          // Overlay stars create per-frame gradients — skip during fast scroll
          if (scrollVelMag < 300) {
            if (d.type === 'pleiades') drawPleiadesStars(ctx, px, py, sz, dsoAlpha, t);
            else if (d.type === 'orion_nebula') drawTrapeziumStars(ctx, px, py, sz, dsoAlpha);
          }
        }
        ctx.restore();
      };

      // DSO Layer 0: galaxies (deepest — almost locked to MW)
      drawDSOLayer(0);

      // Bright wisps along MW band (Lissajous drift, organic alpha pulsation)
      // Skip during fast scroll — per-frame radialGradient creation is expensive
      if (!reduced && time !== undefined && mwWisps.length > 0 && scrollVelMag < 300) {
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
        const dfOffX = (smoothCameraX * 0.06 + Math.sin(driftTime * 0.01) * 8) | 0;
        const dfOffY = (smoothCameraY * 0.06 + Math.cos(driftTime * 0.01 + 1.3) * 6) | 0;
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.imageSmoothingEnabled = true;
        drawWrapped(ctx, deepFieldCanvas, dfOffX, dfOffY, lw, lh);
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // DSO Layer 1: large nebulae (mid-depth)
      drawDSOLayer(1);

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
        // Per-zone Lissajous gas drift (max ~18px, within NEB_PAD budget)
        const nebDriftX = Math.sin(driftTime * 0.015 + i * 2.1) * 12 + Math.sin(driftTime * 0.009 + i * 4.7) * 6;
        const nebDriftY = Math.cos(driftTime * 0.012 + i * 3.3) * 10 + Math.cos(driftTime * 0.007 + i * 5.9) * 5;
        ctx.drawImage(zoneNebulae[i], nebCamX - NEB_PAD + nebDriftX, nebCamY - NEB_PAD + nebDriftY, nebDW, nebDH);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // DSO Layer 2: compact objects (nearest — most parallax)
      drawDSOLayer(2);

      // Skip expensive objects during fast scroll (per-frame gradient creation)
      const fastScroll = scrollVelMag > 300;

      // Special objects (skip when quality is very low or fast scroll)
      if (time !== undefined && qualityLevel > 0.3 && !fastScroll) drawSpecials(wts, time);

      // Constellations (behind star layers)
      if (time !== undefined && qualityLevel > 0.1 && !fastScroll) drawConstellations(wts, time);

      // Galaxies (skip during fast scroll — each creates radialGradients)
      if (!fastScroll) {
        for (const g of galaxies) drawGalObj(g, time ?? 0);
      }

      // Per-layer star rendering with inter-layer fog
      for (let layerIdx = 0; layerIdx < 6; layerIdx++) {
        // Skip dust layer (2400 dim stars) during fast scroll or low quality
        if (layerIdx === 0 && (qualityLevel < 0.5 || fastScroll)) {
          drawFog(layerIdx);
          continue;
        }
        // Skip distant layer during fast scroll (550 stars)
        if (layerIdx === 1 && fastScroll && scrollVelMag > 600) {
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

      // Atmospheric effects (zodiacal light, airglow) — skip during fast scroll
      if (!reduced && !fastScroll) drawAtmospheric(wts);

      // Foreground dust particles (skip when quality low or fast scroll)
      if (!reduced && qualityLevel > 0.4 && !fastScroll) {
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

      // Shooting stars (skip spawning during fast scroll, always update existing)
      if (time !== undefined && !reduced) {
        if (!fastScroll) {
          maybeSpawnShootingStar(time);
          maybeSpawnSatellite(time);
          maybeSpawnComet(time);
        }
        updateAndDrawShootingStars();
        updateAndDrawSatellites();
        updateAndDrawComets();
      }
    };

    const loop = (t: number) => {
      // Frame-rate-independent smooth scroll interpolation
      const dt = prevTime ? (t - prevTime) / 1000 : 0.016;
      prevTime = t;

      // Adaptive quality: monitor FPS every 20 frames (faster response)
      fpsAccum += dt;
      fpsFrames++;
      if (fpsFrames >= 20) {
        const avgFps = fpsFrames / fpsAccum;
        if (avgFps < 25) qualityLevel = Math.max(0.25, qualityLevel - 0.15);
        else if (avgFps < 35) qualityLevel = Math.max(0.4, qualityLevel - 0.08);
        else if (avgFps < 45) qualityLevel = Math.max(0.5, qualityLevel - 0.04);
        else if (avgFps > 55) qualityLevel = Math.min(1.0, qualityLevel + 0.03);
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
      // Camera velocity for motion blur + scroll-velocity gate
      camVelX = dt > 0 ? (smoothCameraX - prevCamX) / dt : 0;
      camVelY = dt > 0 ? (smoothCameraY - prevCamY) / dt : 0;
      scrollVelMag = Math.hypot(camVelX, camVelY);
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
      generateMWLayers(); generateZoneNebulae(); generateDSOTextures(); generateDeepField();
      // Only regenerate stars if dimensions changed significantly (>5%)
      // Prevents mobile URL bar show/hide from causing full star flash
      const wRatio = starsLw ? Math.abs(lw - starsLw) / starsLw : 1;
      const hRatio = starsLh ? Math.abs(lh - starsLh) / starsLh : 1;
      if (wRatio > 0.05 || hRatio > 0.05) {
        generateDustGrid(); initStars(); computeStarDustDim(); generateStarSprites(); generateConstellationSprites(); initDustParticles(); initMWWisps();
        starsLw = lw; starsLh = lh;
      }
      if (reduced) drawFrame();
    };

    resize(); generateMWLayers(); generateZoneNebulae(); generateDSOTextures(); generateDustGrid(); initStars(); computeStarDustDim(); generateStarSprites(); generateConstellationSprites(); generateDeepField(); initDustParticles(); initMWWisps();
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
