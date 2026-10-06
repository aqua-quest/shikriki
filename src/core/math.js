// Frame-rate independent helpers and a seeded random, shared by the camera, the tweens
// and every procedural generator. `lerpCoefFPS(r)` is the coefficient that makes
// `lerp(a, b, coef)` move the same fraction per second no matter the frame rate;
// `frictionFPS(r)` is the equivalent for a velocity that decays by `r` per 60 Hz frame.

import { renderInfo } from './ticker.js';

export const math = {
  PI: Math.PI,
  TWO_PI: Math.PI * 2,
  HALF_PI: Math.PI / 2,

  clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); },
  lerp(a, b, t) { return (1 - t) * a + t * b; },
  mix(a, b, t) { return (1 - t) * a + t * b; },
  damp(r, ratio) { return 1 - Math.exp(Math.log(1 - r) * ratio); },
  friction(r, ratio) { return Math.exp(Math.log(r) * ratio); },
  deltaRatio() { return renderInfo.ratio; },
  lerpCoefFPS(r) { return this.damp(r, renderInfo.ratio); },
  frictionFPS(r) { return this.friction(r, renderInfo.ratio); },
  lerpFPS(a, b, r) { return this.lerp(a, b, this.lerpCoefFPS(r)); },

  efit(v, a, b, c, d) { return c + (v - a) * (d - c) / (b - a); },
  fit(v, a, b, c, d) { return this.efit(this.clamp(v, Math.min(a, b), Math.max(a, b)), a, b, c, d); },
  fit01(v, c, d) { return this.fit(v, 0, 1, c, d); },
  fit11(v, c, d) { return this.fit(v, -1, 1, c, d); },
  step(edge, v) { return v < edge ? 0 : 1; },
  linearstep(a, b, v) { return this.clamp((v - a) / (b - a), 0, 1); },
  smoothstep(a, b, v) { const t = this.linearstep(a, b, v); return t * t * (3 - 2 * t); },
  /** A window that slides from `a` to `b` as `t` goes 0→1, with a soft edge `w` wide. */
  falloff(x, a, b, w, t) {
    const o = w * Math.sign(b - a), l = this.mix(a - o, b, t);
    return this.linearstep(l + o, l, x);
  },
  makeAnglePositive(a) { const e = a % this.TWO_PI; return e < 0 ? this.TWO_PI + e : e; },
  getShortestRotationAngle(from, to) {
    const i = this.makeAnglePositive(from);
    let s = this.makeAnglePositive(to);
    if (Math.abs(s - i) > Math.PI) { if (s > i) s -= this.TWO_PI; else s += this.TWO_PI; }
    return from + s - i;
  },
  radians(d) { return d * Math.PI / 180; },
  degrees(r) { return r * 180 / Math.PI; },

  /** Deterministic random, so the planet is the same planet every visit. */
  seeded(seed = 1) {
    let a = seed >>> 0;
    const rnd = () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    rnd.range = (lo, hi) => lo + (hi - lo) * rnd();
    rnd.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * rnd());
    rnd.pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    rnd.sign = () => (rnd() < 0.5 ? -1 : 1);
    return rnd;
  },
  hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); },
};

/** 3-D value noise with a smooth interpolant, plus a fractal sum. Deterministic. */
const P = new Uint8Array(512);
{
  const r = math.seeded(1995);
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const grad = (h, x, y, z) => {
  const g = h & 15;
  const u = g < 8 ? x : y, v = g < 4 ? y : g === 12 || g === 14 ? x : z;
  return ((g & 1) === 0 ? u : -u) + ((g & 2) === 0 ? v : -v);
};
export function noise3(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  const l = math.lerp;
  return l(
    l(l(grad(P[AA], x, y, z), grad(P[BA], x - 1, y, z), u), l(grad(P[AB], x, y - 1, z), grad(P[BB], x - 1, y - 1, z), u), v),
    l(l(grad(P[AA + 1], x, y, z - 1), grad(P[BA + 1], x - 1, y, z - 1), u), l(grad(P[AB + 1], x, y - 1, z - 1), grad(P[BB + 1], x - 1, y - 1, z - 1), u), v),
    w,
  );
}
export function fbm3(x, y, z, octaves = 4, lacunarity = 2, gain = 0.5) {
  let a = 1, f = 1, s = 0, n = 0;
  for (let i = 0; i < octaves; i++) { s += a * noise3(x * f, y * f, z * f); n += a; a *= gain; f *= lacunarity; }
  return s / n;
}
