// The tween engine. Every motion in the menu that is not a physics loop is one of these:
// a target object, `to` values, a duration, a delay and an ease.
//
// The eases are the ones the animation was designed with. `elastic.out(1, 0.9)` is the
// spring every letter and the button settle with; `inOut1` and `inOut3` are hand-drawn
// cubic curves that start slow and overshoot nothing; `tweaked` is the camera's own
// out-curve. Tweens are thenables, so a timeline can `await` them.

import { renderInfo, addToTicker } from './ticker.js';
import { math } from './math.js';

const TWO_PI = Math.PI * 2;
const customEases = new Map();

/** Register an ease from an SVG-style cubic path, "M0,0 C0.5,0 0.1,1 1,1". */
export function customEase(name, svgPath) {
  const nums = svgPath.replace(/[MC]/g, ' ').trim().split(/[\s,]+/).map(Number);
  let x0 = nums[0], y0 = nums[1];
  const segs = [];
  for (let i = 2; i + 5 < nums.length; i += 6) {
    segs.push([x0, y0, nums[i], nums[i + 1], nums[i + 2], nums[i + 3], nums[i + 4], nums[i + 5]]);
    x0 = nums[i + 4]; y0 = nums[i + 5];
  }
  const xs = [], ys = [], N = 400;
  for (const [ax, ay, bx, by, cx, cy, dx, dy] of segs) {
    for (let k = 0; k <= N; k++) {
      const t = k / N, u = 1 - t;
      xs.push(u * u * u * ax + 3 * u * u * t * bx + 3 * u * t * t * cx + t * t * t * dx);
      ys.push(u * u * u * ay + 3 * u * u * t * by + 3 * u * t * t * cy + t * t * t * dy);
    }
  }
  const M = 256, table = new Float32Array(M + 1);
  let j = 0;
  for (let i = 0; i <= M; i++) {
    const x = i / M;
    while (j < xs.length - 2 && xs[j + 1] < x) j++;
    const x1 = xs[j], x2 = xs[j + 1], f = x2 > x1 ? math.clamp((x - x1) / (x2 - x1), 0, 1) : 0;
    table[i] = ys[j] + (ys[j + 1] - ys[j]) * f;
  }
  const fn = (p) => {
    const x = math.clamp(p, 0, 1) * M, b = Math.ceil(x), a = Math.max(0, b - 1);
    return math.lerp(table[a], table[b], x - a);
  };
  customEases.set(name, fn);
  return fn;
}

customEase('inOut1', 'M0,0 C0.5,0 0.1,1 1,1');
customEase('inOut2', 'M0,0 C0.56,0 0,1 1,1');
customEase('inOut3', 'M0,0 C0.6,0 0,1 1,1');
customEase('tweaked', 'M0,0 C0.388,0 0.441,0.356 0.496,0.496 0.553,0.641 0.647,1 1,1');

const easeIns = {
  power1: (t) => t * t,
  power2: (t) => t * t * t,
  power3: (t) => t * t * t * t,
  power4: (t) => t * t * t * t * t,
  sine: (t) => 1 - Math.cos(t * Math.PI / 2),
  circ: (t) => 1 - Math.sqrt(1 - t * t),
  expo: (t) => (t ? Math.pow(2, 10 * t - 10) : 0),
  back: (t) => t * t * (2.70158 * t - 1.70158),
};

function elastic(type, amplitude = 1, period = 0.3) {
  const p1 = Math.max(1, amplitude);
  const p2 = period / (amplitude < 1 ? amplitude : 1);
  const p3 = p2 / TWO_PI * (Math.asin(1 / p1) || 0);
  const out = (p) => (p >= 1 ? 1 : p1 * Math.pow(2, -10 * p) * Math.sin((p - p3) * (TWO_PI / p2)) + 1);
  const inn = (p) => 1 - out(1 - p);
  const inOut = (p) => (p < 0.5 ? inn(p * 2) / 2 : out(p * 2 - 1) / 2 + 0.5);
  return type === 'in' ? inn : type === 'inOut' ? inOut : out;
}

const easeCache = new Map();
export function getEase(name) {
  if (typeof name === 'function') return name;
  if (!name || name === 'none' || name === 'linear') return (t) => t;
  if (customEases.has(name)) return customEases.get(name);
  if (easeCache.has(name)) return easeCache.get(name);
  const m = name.match(/^([a-zA-Z0-9]+)(?:\.(in|out|inOut))?(?:\(([^)]*)\))?$/);
  let fn = (t) => t;
  if (m) {
    const base = m[1], type = m[2] || 'out', args = m[3] ? m[3].split(',').map(Number) : [];
    if (base === 'elastic') fn = elastic(type, args[0], args[1]);
    else if (easeIns[base]) {
      const inn = easeIns[base];
      const out = (t) => 1 - inn(1 - t);
      fn = type === 'in' ? inn : type === 'out' ? out : (t) => (t < 0.5 ? inn(t * 2) / 2 : 1 - inn(2 - t * 2) / 2);
    }
  }
  easeCache.set(name, fn);
  return fn;
}

let tweens = [];

class Tween {
  constructor(target, opts = {}) {
    const { from, to, duration = 1, delay = 0, ease = 'power2.out', onUpdate = null, onComplete = null, onStart = null, overwrite = true } = opts;
    this.target = target;
    this.toGiven = to;
    this.fromGiven = from;
    this.keys = Object.keys(to || from || {});
    this.duration = duration;
    this.delay = delay;
    this.ease = getEase(ease);
    this.onUpdate = onUpdate; this.onComplete = onComplete; this.onStart = onStart;
    this.overwrite = overwrite;
    this.elapsed = -delay;
    this.started = false;
    this.done = false;
    this.from = {}; this.to = {};
    this.promise = new Promise((r) => { this._resolve = r; });
    // a from-only tween returns to where the values are now
    if (from && !to) { this.toGiven = {}; for (const k of this.keys) this.toGiven[k] = target[k]; }
    if (from) for (const k of this.keys) if (k in from) target[k] = from[k];
    tweens.push(this);
    if (delay <= 0) this.update(0);
  }
  _start() {
    this.started = true;
    if (this.overwrite) {
      for (const t of tweens) {
        if (t === this || t.done || t.target !== this.target) continue;
        if (t.keys.some((k) => this.keys.includes(k))) t.done = true;
      }
    }
    for (const k of this.keys) {
      this.from[k] = this.fromGiven && k in this.fromGiven ? this.fromGiven[k] : this.target[k];
      this.to[k] = k in this.toGiven ? this.toGiven[k] : this.from[k];
    }
    if (this.onStart) this.onStart();
  }
  update(dt) {
    if (this.done) return;
    this.elapsed += dt;
    if (this.elapsed < 0) return;
    if (!this.started) this._start();
    const p = this.duration > 0 ? Math.min(1, this.elapsed / this.duration) : 1;
    const e = this.ease(p);
    for (const k of this.keys) this.target[k] = this.from[k] + (this.to[k] - this.from[k]) * e;
    if (this.onUpdate) this.onUpdate(p);
    if (p >= 1) {
      this.done = true;
      if (this.onComplete) this.onComplete();
      // never resolve with the tween itself: a thenable that resolves to a thenable never settles
      this._resolve(true);
    }
  }
  kill() { this.done = true; }
  then(f, r) { return this.promise.then(f, r); }
}

export function createTween(target, opts) { return new Tween(target, opts); }
export function createDelayedCall(delay = 0, fn) { return new Tween({}, { delay, duration: 0, to: {}, onComplete: fn }); }
export function killTweensOf(target) { for (const t of tweens) if (t.target === target) t.done = true; }

addToTicker(() => {
  const dt = renderInfo.delta / 1000;
  const list = tweens;
  for (let i = 0; i < list.length; i++) list[i].update(dt);
  tweens = tweens.filter((t) => !t.done);
}, -100);

export const wait = (s) => new Promise((r) => createDelayedCall(s, r));
