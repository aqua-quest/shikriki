// The planet: Tbilisi folded into a ball.
//
// The Mtkvari winds round it in a gorge. On its right bank the old town climbs from the
// sulfur-bath domes at Abanotubani up to the walls of Narikala; Sololaki and Vera lean
// against the Mtatsminda slope, where the funicular climbs to the television tower;
// across the water Metekhi church stands on its cliff above Avlabari. Further round,
// the five-storey blocks of Saburtalo, then orchards and a village, then the reservoir
// everyone calls the Tbilisi Sea. Everything here is generated: the terrain is a
// height field over a sphere, and every house, dome, tree and clothes-line is placed
// by district, seeded, so it is the same city every time.

import * as THREE from 'three';
import { Builder, ELEM, withAux, standOn } from './geo.js';
import { toonMaterial, waterMaterial, cloudMaterial } from '../render/materials.js';
import { math, fbm3, noise3 } from '../core/math.js';
import { Lines, catenary } from './lines.js';
import { Waterfall } from './waterfall.js';
import { renderInfo } from '../core/ticker.js';
import { client } from '../core/client.js';

export const R = 30;
export const RW = R - 0.85;       // water level
const TWO_PI = Math.PI * 2;

// ---------------------------------------------------------------- the river and the hills

const A = new THREE.Vector3(0.35, 1, 0.15).normalize();            // the river's axis
const B = new THREE.Vector3(0, 0, 1).cross(A).normalize();
const S = new THREE.Vector3().crossVectors(A, B).normalize();
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _n = new THREE.Vector3();

function riverPoint(t, out = new THREE.Vector3()) {
  const a = t * TWO_PI;
  out.copy(B).multiplyScalar(Math.cos(a)).addScaledVector(S, Math.sin(a));
  out.addScaledVector(A, 0.22 * Math.sin(3 * a + 1.3) + 0.14 * Math.sin(5 * a + 0.4) + 0.08 * Math.sin(8 * a));
  return out.normalize();
}
const RIVER_N = 256;
export const RIVER = Array.from({ length: RIVER_N }, (_, i) => riverPoint(i / RIVER_N));
export function riverWidth(t) { const a = t * TWO_PI; return 0.058 + 0.02 * Math.sin(7 * a + 1) + 0.01 * Math.sin(11 * a); }

/** Nearest point of the river to direction `p`: angular distance, parameter, and which bank. */
function nearestRiver(p) {
  let best = -2, bi = 0;
  for (let i = 0; i < RIVER_N; i += 8) { const d = RIVER[i].dot(p); if (d > best) { best = d; bi = i; } }
  for (let k = -8; k <= 8; k++) { const i = (bi + k + RIVER_N) % RIVER_N; const d = RIVER[i].dot(p); if (d > best) { best = d; bi = i; } }
  const rp = RIVER[bi];
  const side = Math.sign(p.dot(A) - rp.dot(A)) || 1;
  return { d: Math.acos(math.clamp(best, -1, 1)), t: bi / RIVER_N, side };
}

/** A direction `ang` radians away from the river at parameter `t`, on bank `side`. */
export function offset(t, side, ang, out = new THREE.Vector3()) {
  const rp = riverPoint(t, _v);
  _n.copy(A).addScaledVector(rp, -A.dot(rp)).normalize().multiplyScalar(side);
  return out.copy(rp).multiplyScalar(Math.cos(ang)).addScaledVector(_n, Math.sin(ang)).normalize();
}
const angle = (a, b) => Math.acos(math.clamp(a.dot(b), -1, 1));

export const HILLS = [
  { name: 'mtatsminda', dir: offset(0.22, -1, 0.30), h: 6.2, sigma: 0.25 },
  { name: 'sololaki', dir: offset(0.10, -1, 0.17), h: 3.0, sigma: 0.11 },
  { name: 'narikala', dir: offset(0.05, -1, 0.11), h: 2.6, sigma: 0.07 },
  { name: 'metekhi', dir: offset(0.035, 1, 0.075), h: 2.0, sigma: 0.05 },
  { name: 'makhata', dir: offset(0.18, 1, 0.32), h: 3.4, sigma: 0.2 },
  { name: 'far1', dir: offset(0.55, -1, 0.45), h: 4.0, sigma: 0.3 },
  { name: 'far2', dir: offset(0.72, 1, 0.4), h: 3.5, sigma: 0.28 },
  { name: 'far3', dir: offset(0.9, 1, 0.3), h: 2.5, sigma: 0.2 },
  { name: 'lisi', dir: offset(0.42, -1, 0.5), h: 2.8, sigma: 0.22 },
];
export const LAKE = { dir: offset(0.86, 1, 0.14), r: 0.11 };

export class Terrain {
  constructor() { this.cache = new Map(); }
  hills(p) { let s = 0; for (const h of HILLS) { const a = angle(p, h.dir); s += h.h * Math.exp(-((a / h.sigma) ** 2)); } return s; }
  /** Radius of the ground in direction `p` (unit). */
  height(p) {
    const key = `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`;
    const c = this.cache.get(key);
    if (c !== undefined) return c;
    let h = R + 0.45 * fbm3(p.x * 2.2 + 3.1, p.y * 2.2, p.z * 2.2, 4, 2.1, 0.5);
    const hills = this.hills(p);
    h += hills;
    h += 0.35 * Math.abs(noise3(p.x * 5 + 1, p.y * 5, p.z * 5)) * math.clamp(hills / 2.5, 0, 1);
    const { d, t } = nearestRiver(p);
    const hw = riverWidth(t);
    h -= 1.75 * math.smoothstep(hw + 0.09, hw - 0.01, d);
    h -= 1.75 * math.smoothstep(LAKE.r + 0.075, LAKE.r - 0.012, angle(p, LAKE.dir));
    this.cache.set(key, h);
    return h;
  }
  info(p) {
    const r = nearestRiver(p);
    return { ...r, hw: riverWidth(r.t), lake: angle(p, LAKE.dir), hills: this.hills(p), height: this.height(p) };
  }
  /** World point on the ground in direction `dir`. */
  surface(dir, out = new THREE.Vector3()) { return out.copy(dir).multiplyScalar(this.height(dir)); }
  /** Slope at `dir` in radians, from finite differences. */
  slope(dir) {
    const e = 0.004;
    const h0 = this.height(dir);
    const tx = _w.set(dir.y, -dir.x, 0).normalize(); if (tx.lengthSq() < 0.5) tx.set(0, dir.z, -dir.y).normalize();
    const ty = _n.crossVectors(dir, tx).normalize();
    const hx = this.height(_v.copy(dir).addScaledVector(tx, e).normalize());
    const hy = this.height(_v.copy(dir).addScaledVector(ty, e).normalize());
    const g = Math.hypot(hx - h0, hy - h0) / (e * h0);
    return Math.atan(g);
  }
}

// ---------------------------------------------------------------- palettes

const WALLS = ['#ead6aa', '#f2e4c6', '#dbb17c', '#e7bba5', '#d2dbc8', '#f5ecd9', '#cf946f', '#e3caa2', '#c7b8c9', '#efd7b8'];
const BLOCKS = ['#cfc8ba', '#c4bcae', '#d8d0c2', '#b9b3a9'];
const VILLAGE = ['#e8dcc0', '#dccfb0', '#f0e6cf'];
const CYPRESS = ['#2f5a3a', '#3a6b45', '#2a4f36'];
const PLANE = ['#6d9a4f', '#86a85a', '#a7b45c', '#c9a94f', '#7fa350'];
const POPLAR = ['#8fae55', '#a2b85f', '#b8b35a'];
const CLOTH = ['#f6f1e6', '#9fc4d6', '#d98b7a', '#efd5a2', '#b7d3b0', '#f2f2f2'];

// ---------------------------------------------------------------- prefab geometry

function houseGeometry(rnd, { floors = 2, w = 2, d = 1.6, balconies = [1] } = {}) {
  const b = new Builder();
  const fh = 0.78, h = floors * fh;
  const wall = Builder.aux(ELEM.WALL, rnd(), 0, 0.1);
  b.box(w, h, d, '#ffffff', wall);
  // windows, per floor, on the front and the back, and one on each side
  const cols = Math.max(2, Math.floor(w / 0.62));
  for (let f = 0; f < floors; f++) {
    const y = f * fh + 0.22;
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * (w / cols);
      const wa = Builder.aux(ELEM.WINDOW, (f * 7 + c) / 40 + rnd() * 0.02, 0, 0.6);
      if (!(f === 0 && c === Math.floor(cols / 2))) b.box(0.26, 0.38, 0.05, '#ffffff', wa, { x, y, z: d / 2 });
      b.box(0.26, 0.38, 0.05, '#ffffff', wa, { x, y, z: -d / 2 });
    }
    const sa = Builder.aux(ELEM.WINDOW, f / 9 + 0.5, 0, 0.6);
    b.box(0.05, 0.38, 0.26, '#ffffff', sa, { x: w / 2, y, z: 0 });
    b.box(0.05, 0.38, 0.26, '#ffffff', sa, { x: -w / 2, y, z: 0 });
  }
  // the door
  b.box(0.34, 0.62, 0.05, '#ffffff', Builder.aux(ELEM.DOOR, rnd(), 0, 0.3), { x: 0, y: 0, z: d / 2 });
  // wooden galleries: a slab, posts, a rail and slats, and a little awning over each
  for (const f of balconies) {
    if (f >= floors) continue;
    const y = f * fh;
    const bw = w + 0.3, bd = 0.46;
    const ba = Builder.aux(ELEM.BALCONY, rnd(), 0, 0.2);
    b.box(bw, 0.07, bd, '#ffffff', ba, { x: 0, y, z: d / 2 + bd / 2 - 0.02 });
    const posts = Math.max(3, Math.round(bw / 0.7));
    for (let i = 0; i < posts; i++) {
      const x = -bw / 2 + 0.04 + i * ((bw - 0.08) / (posts - 1));
      b.box(0.06, fh - 0.08, 0.06, '#ffffff', ba, { x, y: y + 0.07, z: d / 2 + bd - 0.05 });
    }
    b.box(bw, 0.05, 0.06, '#ffffff', ba, { x: 0, y: y + 0.72, z: d / 2 + bd - 0.05 });
    const slats = Math.floor(bw / 0.16);
    for (let i = 1; i < slats; i++) {
      const x = -bw / 2 + i * (bw / slats);
      b.box(0.03, 0.62, 0.03, '#ffffff', ba, { x, y: y + 0.08, z: d / 2 + bd - 0.05 });
    }
    // awning
    b.box(bw + 0.1, 0.05, bd + 0.1, '#ffffff', Builder.aux(ELEM.ROOF, rnd(), 0, 0.15), { x: 0, y: y + fh - 0.05, z: d / 2 + bd / 2 });
  }
  b.roof(w, d, 0.45 + rnd() * 0.2, '#ffffff', Builder.aux(ELEM.ROOF, rnd(), 0, 0.15), { y: h, overhang: 0.14 });
  if (rnd() < 0.7) b.box(0.18, 0.42, 0.18, '#ffffff', Builder.aux(ELEM.BRICK, rnd(), 0, 0.25), { x: w * 0.3, y: h + 0.1, z: -d * 0.2 });
  return b.build();
}

function blockGeometry(rnd) {
  const b = new Builder();
  const w = 5.6, d = 1.7, floors = 5, fh = 0.6, h = floors * fh;
  b.box(w, h, d, '#ffffff', Builder.aux(ELEM.WALL, rnd(), 0, 0.1));
  for (let f = 0; f < floors; f++) {
    const y = f * fh + 0.15;
    for (let c = 0; c < 8; c++) {
      const x = (c - 3.5) * 0.66;
      const wa = Builder.aux(ELEM.WINDOW, (f * 11 + c) / 60 + rnd() * 0.01, 0, 0.6);
      b.box(0.34, 0.3, 0.05, '#ffffff', wa, { x, y, z: d / 2 });
      b.box(0.34, 0.3, 0.05, '#ffffff', wa, { x, y, z: -d / 2 });
      // every other window on the front has a concrete loggia
      if (f > 0 && c % 3 === 1) b.box(0.62, 0.05, 0.42, '#ffffff', Builder.aux(ELEM.TRIM, rnd(), 0, 0.2), { x, y: y - 0.15, z: d / 2 + 0.18 });
    }
  }
  b.box(0.5, 0.7, 0.05, '#ffffff', Builder.aux(ELEM.DOOR, rnd(), 0, 0.3), { x: -1.65, y: 0, z: d / 2 });
  b.box(0.5, 0.7, 0.05, '#ffffff', Builder.aux(ELEM.DOOR, rnd(), 0, 0.3), { x: 1.65, y: 0, z: d / 2 });
  b.box(w + 0.1, 0.1, d + 0.1, '#ffffff', Builder.aux(ELEM.ROOF, rnd(), 0, 0.15), { y: h });
  b.box(0.5, 0.5, 0.5, '#ffffff', Builder.aux(ELEM.TRIM, rnd(), 0, 0.2), { x: 2.2, y: h + 0.1, z: 0 });
  return b.build();
}

function villageHouseGeometry(rnd) {
  const b = new Builder();
  const w = 1.5, d = 1.2, h = 0.9;
  b.box(w, h, d, '#ffffff', Builder.aux(ELEM.WALL, rnd(), 0, 0.1));
  b.box(0.24, 0.3, 0.05, '#ffffff', Builder.aux(ELEM.WINDOW, rnd() * 0.3, 0, 0.6), { x: 0.4, y: 0.35, z: d / 2 });
  b.box(0.3, 0.55, 0.05, '#ffffff', Builder.aux(ELEM.DOOR, rnd(), 0, 0.3), { x: -0.35, y: 0, z: d / 2 });
  b.roof(w, d, 0.5, '#ffffff', Builder.aux(ELEM.ROOF, rnd(), 0, 0.15), { y: h, overhang: 0.18 });
  // a porch post and a vine trellis
  b.box(0.06, h, 0.06, '#ffffff', Builder.aux(ELEM.BALCONY, rnd(), 0, 0.2), { x: w / 2 - 0.1, y: 0, z: d / 2 + 0.5 });
  b.box(w * 0.7, 0.05, 0.6, '#ffffff', Builder.aux(ELEM.LEAF, rnd(), 0, 0.2), { x: 0.2, y: h - 0.05, z: d / 2 + 0.3 });
  return b.build();
}

function cypressGeometry(rnd) {
  const b = new Builder();
  b.cylinder(0.05, 0.35, 5, '#ffffff', Builder.aux(ELEM.TRUNK, rnd(), 0, 0.3));
  b.cone(0.3, 2.1 + rnd() * 0.5, 7, '#ffffff', Builder.aux(ELEM.LEAF, rnd(), 0, 0.4), { y: 0.25, rTop: 0.04 });
  return b.build();
}
function planeTreeGeometry(rnd) {
  const b = new Builder();
  b.cylinder(0.09, 0.9, 5, '#ffffff', Builder.aux(ELEM.TRUNK, rnd(), 0, 0.3));
  b.blob(0.8, 1, '#ffffff', Builder.aux(ELEM.LEAF, rnd(), 0, 0.4), { y: 1.35, jitter: 0.28, sy: 0.8, rnd });
  b.blob(0.5, 1, '#ffffff', Builder.aux(ELEM.LEAF, rnd(), 0, 0.4), { x: 0.45, y: 1.6, z: 0.2, jitter: 0.3, sy: 0.8, rnd });
  return b.build();
}
function poplarGeometry(rnd) {
  const b = new Builder();
  b.cylinder(0.06, 0.5, 5, '#ffffff', Builder.aux(ELEM.TRUNK, rnd(), 0, 0.3));
  b.blob(0.42, 1, '#ffffff', Builder.aux(ELEM.LEAF, rnd(), 0, 0.4), { y: 1.4, jitter: 0.2, sy: 2.3, rnd });
  return b.build();
}

function church(b, rnd, { w = 1.5, d = 1.1, h = 1.7, drum = 0.42, cone = 1.0 } = {}) {
  const stone = Builder.aux(ELEM.STONE, rnd(), 0, 0.1);
  b.box(w, h, d, '#dcd0b2', stone);
  b.box(w * 0.5, h * 0.55, d * 0.5, '#dcd0b2', stone, { x: 0, y: h, z: 0 });
  b.cylinder(drum, 0.75, 8, '#d5c8aa', stone, { y: h + h * 0.55 });
  b.cone(drum + 0.12, cone, 8, '#7a8385', Builder.aux(ELEM.ROOF, rnd(), 0, 0.15), { y: h + h * 0.55 + 0.75 });
  b.roof(w, d, 0.4, '#8a9194', Builder.aux(ELEM.ROOF, rnd(), 0, 0.15), { y: h, overhang: 0.1 });
  const trim = Builder.aux(ELEM.TRIM, rnd(), 0, 0.2);
  b.box(0.05, 0.4, 0.05, '#f0e9d8', trim, { y: h + h * 0.55 + 0.75 + cone });
  b.box(0.22, 0.05, 0.05, '#f0e9d8', trim, { y: h + h * 0.55 + 0.75 + cone + 0.25 });
  for (let i = 0; i < 3; i++) b.box(0.16, 0.5, 0.05, '#ffffff', Builder.aux(ELEM.WINDOW, 0.9, 0, 0.6), { x: (i - 1) * 0.42, y: 0.6, z: d / 2 });
}

// ---------------------------------------------------------------- the planet

export class Planet {
  constructor(parent, { seed = 1995, low = client.lowMemoryDevice } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'Planet';
    parent.add(this.group);
    this.terrain = new Terrain();
    this.rnd = math.seeded(seed);
    this.low = low;
    this.houses = [];          // { pos: Vector3 (local), dir, yaw, top: Vector3, district }
    this.materials = {};
    this.updaters = [];
    this._buildMaterials();
    this._buildTerrain();
    this._buildWater();
    this._placeBuildings();
    this._placeTrees();
    this._buildLandmarks();
    this._buildLaundry();
    this._buildClouds();
    this.ready = Promise.resolve();
  }

  _buildMaterials() {
    // ground: vertex colour, with rock striations on element 1 and a dry-grass speckle
    this.materials.terrain = toonMaterial({
      noiseScale: 0.07, breakAt: 0.17, shadeV: 0.62, shadeHue: -0.03,
      fragmentBody: /* glsl */`
        if (elem > 0.5 && elem < 1.5) {
            float n1 = sin(length(vPosL) * 0.9 + (nW.x + nW.y + nW.z) * 0.05 + (vPosL.x + vPosL.y + vPosL.z) * 1.5);
            float stri = texture(tNoise, vec2(n1 * 0.01, length(vPosL) * 0.07 - n1 * 0.02)).g;
            stri = step(0.47, stri + tn.r * 0.2 + tn.g * 0.05);
            color = mix(color, color * 0.86, stri);
            surfaceId += stri * 0.1;
        } else if (elem < 0.5) {
            // a speckle of paler grass, stepped
            float sp = step(0.62, tn.r) * step(0.4, tn.g);
            color = mix(color, color * 1.08, sp);
        }
      `,
    });
    this.materials.water = waterMaterial();
    // buildings: element types paint roofs, galleries, windows, brick, tin, stone
    this.materials.building = toonMaterial({
      noiseScale: 0.9, breakAt: 0.12, shadeV: 0.62, shadeHue: -0.03,
      fragmentBody: /* glsl */`
        float ih = hash11(vInst * 0.731 + uSeed * 3.0);
        if (elem > 0.5 && elem < 1.5) {
            vec3 roofs[4] = vec3[4](vec3(0.49, 0.55, 0.56), vec3(0.64, 0.35, 0.27), vec3(0.42, 0.48, 0.37), vec3(0.62, 0.64, 0.62));
            color = roofs[int(floor(fract(ih * 3.1) * 4.0))];
        } else if (elem > 1.5 && elem < 2.5) {
            vec3 balc[4] = vec3[4](vec3(0.31, 0.64, 0.63), vec3(0.96, 0.94, 0.9), vec3(0.48, 0.35, 0.24), vec3(0.85, 0.55, 0.37));
            color = balc[int(floor(fract(ih * 7.7) * 4.0))];
        } else if (elem > 2.5 && elem < 3.5) {
            // windows. half the city is dark tonight; the rest burn candles and generators
            float on = step(0.76, hash11(vInst * 3.3 + seed * 17.0 + uSeed));
            float flick = 0.86 + 0.14 * step(0.5, hash11(floor(time * 6.0) + vInst + seed * 9.0));
            color = vec3(0.17, 0.16, 0.18);
            emissive = vec3(1.0, 0.78, 0.42) * flick;
            emissiveAmt = on;
            surfaceId = 0.7 + on * 0.15;
        } else if (elem > 3.5 && elem < 4.5) {
            color = vec3(0.82, 0.8, 0.74);
        } else if (elem > 4.5 && elem < 5.5) {
            color = mix(vec3(0.63, 0.37, 0.29), vec3(0.55, 0.32, 0.26), step(0.5, tn.r));
        } else if (elem > 5.5 && elem < 6.5) {
            color = mix(vec3(0.9, 0.88, 0.85), vec3(0.8, 0.24, 0.19), step(0.5, fract(vPosL.y * 0.55)));
        } else if (elem > 7.5 && elem < 8.5) {
            color = mix(color, color * 0.9, step(0.55, tn.r));
        } else if (elem > 8.5 && elem < 9.5) {
            color = vec3(0.45, 0.6, 0.32);
        } else if (elem > 10.5 && elem < 11.5) {
            color = vec3(0.36, 0.25, 0.18);
        }
      `,
    });
    this.materials.tree = toonMaterial({
      noiseScale: 1.2, breakAt: 0.2, shadeV: 0.58, shadeHue: -0.04,
      vertexBody: /* glsl */`
        // a breath of wind through the canopy
        float sway = sin(time * 1.1 + float(gl_InstanceID) * 1.7) * 0.03 * pos.y;
        pos.x += sway; pos.z += sway * 0.6;
      `,
      fragmentBody: /* glsl */`
        if (elem > 9.5) color = vec3(0.42, 0.32, 0.24);
        else color = mix(color, color * 0.88, step(0.6, tn.r));
      `,
    });
    this.materials.cloud = cloudMaterial();
  }

  _buildTerrain() {
    const detail = this.low ? 36 : 52;
    const g = new THREE.IcosahedronGeometry(1, detail);
    const pos = g.attributes.position;
    const count = pos.count;
    const colors = new Float32Array(count * 3), aux = new Float32Array(count * 4);
    const T = this.terrain;
    const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3();
    const col = new THREE.Color();
    const dirs = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p0.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      dirs[i * 3] = p0.x; dirs[i * 3 + 1] = p0.y; dirs[i * 3 + 2] = p0.z;
      const h = T.height(p0);
      pos.setXYZ(i, p0.x * h, p0.y * h, p0.z * h);
    }
    for (let i = 0; i < count; i += 3) {
      p0.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      p1.set(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
      p2.set(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
      c.copy(p0).add(p1).add(p2).divideScalar(3);
      fn.subVectors(p1, p0).cross(_v.subVectors(p2, p0)).normalize();
      const dir = _w.copy(c).normalize();
      const slope = Math.acos(math.clamp(fn.dot(dir), -1, 1));
      const h = c.length();
      const info = T.info(dir);
      const n = noise3(dir.x * 5.1 + 2, dir.y * 5.1, dir.z * 5.1);
      let elem = 0, id = 0.1;
      if (h < RW - 0.03) col.set('#4a6463');                                    // river bed
      else if (info.d < info.hw + 0.05 || info.lake < LAKE.r + 0.04) col.set(n > 0 ? '#d9c69c' : '#cdb98e');   // sand banks
      else if (slope > 0.62 || (info.hills > 1.6 && slope > 0.48)) { col.set(n > 0 ? '#b8a38a' : '#a8937a'); elem = 1; id = 0.2; }   // rock
      else if (info.d > info.hw + 0.02 && info.d < info.hw + 0.05 && this._isTown(info)) { col.set('#8d8a85'); elem = 2; id = 0.3; }  // embankment road
      else if (info.hills > 2.2 && (this._near(dir, HILLS[0], 1.4) || this._near(dir, HILLS[1], 1.3))) col.set(n > 0.05 ? '#5f7f45' : '#6e8d4c');  // forest
      else if (this._isTown(info)) col.set(n > 0 ? '#d8bd8f' : '#cfb384');       // old streets
      else if (info.hills > 0.8) col.set(n > 0.1 ? '#c4b46c' : '#b3a862');        // dry hills
      else col.set(n > 0 ? '#cdb98a' : '#c2ae7f');                                // the valley floor
      for (let k = 0; k < 3; k++) {
        colors[(i + k) * 3] = col.r; colors[(i + k) * 3 + 1] = col.g; colors[(i + k) * 3 + 2] = col.b;
        aux[(i + k) * 4] = elem; aux[(i + k) * 4 + 1] = n; aux[(i + k) * 4 + 2] = 0; aux[(i + k) * 4 + 3] = id;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('aux', new THREE.BufferAttribute(aux, 4));
    // colours stay flat per face, but the lighting normal is smoothed across shared
    // vertices, so the terminator and the cast shadows do not step from facet to facet
    g.computeVertexNormals();
    {
      const nrm = g.attributes.normal;
      const acc = new Map();
      const keyOf = (i) => `${dirs[i * 3].toFixed(3)},${dirs[i * 3 + 1].toFixed(3)},${dirs[i * 3 + 2].toFixed(3)}`;
      for (let i = 0; i < count; i++) {
        const k = keyOf(i);
        let a = acc.get(k);
        if (!a) { a = [0, 0, 0]; acc.set(k, a); }
        a[0] += nrm.getX(i); a[1] += nrm.getY(i); a[2] += nrm.getZ(i);
      }
      for (let i = 0; i < count; i++) {
        const a = acc.get(keyOf(i));
        const l = Math.hypot(a[0], a[1], a[2]) || 1;
        nrm.setXYZ(i, a[0] / l, a[1] / l, a[2] / l);
      }
    }
    g.computeBoundingSphere();
    this.terrainMesh = new THREE.Mesh(g, this.materials.terrain);
    this.terrainMesh.name = 'Ground';
    this.terrainMesh.castShadow = true;
    this.terrainMesh.receiveShadow = true;
    this.group.add(this.terrainMesh);
  }
  _near(dir, hill, k) { return angle(dir, hill.dir) < hill.sigma * k; }
  _isTown(info) {
    const t = info.t;
    const inOld = (t < 0.15 || t > 0.95) && info.side < 0 && info.d < 0.2;
    const inAvlabari = (t < 0.13 || t > 0.97) && info.side > 0 && info.d < 0.17;
    const inVera = t >= 0.14 && t < 0.32 && info.side < 0 && info.d < 0.28;
    return inOld || inAvlabari || inVera;
  }

  _buildWater() {
    const g = new THREE.IcosahedronGeometry(RW, this.low ? 28 : 38);
    const pos = g.attributes.position;
    const dist = new Float32Array(pos.count);
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      p.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      const r = nearestRiver(p);
      const dr = r.d / riverWidth(r.t);
      const dl = angle(p, LAKE.dir) / LAKE.r;
      dist[i] = Math.min(dr, dl);
    }
    g.setAttribute('dist', new THREE.BufferAttribute(dist, 1));
    withAux(g, 0, 0, 0, 0.5);
    this.waterMesh = new THREE.Mesh(g, this.materials.water);
    this.waterMesh.name = 'Water';
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);
  }

  /** Sample the sphere, sort candidates into districts, and stand the prefabs on the ground. */
  _placeBuildings() {
    const rnd = this.rnd, T = this.terrain;
    const N = this.low ? 3200 : 6000;
    const accepted = [];
    const tooClose = (dir, minDist) => {
      const p = T.surface(dir, new THREE.Vector3());
      for (const a of accepted) if (a.pos.distanceTo(p) < Math.max(minDist, a.r)) return true;
      return false;
    };
    const lists = { houseA: [], houseB: [], village: [], block: [] };
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = golden * i;
      const dir = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr);
      dir.x += (rnd() - 0.5) * 0.02; dir.y += (rnd() - 0.5) * 0.02; dir.z += (rnd() - 0.5) * 0.02; dir.normalize();
      const info = T.info(dir);
      if (info.d < info.hw + 0.028 || info.lake < LAKE.r + 0.03) continue;
      const t = info.t, side = info.side, d = info.d;
      let kind = null, prob = 0, minDist = 1.5;
      if ((t < 0.15 || t > 0.95) && side < 0 && d < 0.2) { kind = rnd() < 0.3 ? 'houseB' : 'houseA'; prob = 0.85; minDist = 1.35; }
      else if ((t < 0.12 || t > 0.97) && side > 0 && d < 0.17) { kind = rnd() < 0.2 ? 'houseB' : 'houseA'; prob = 0.6; minDist = 1.5; }
      else if (t >= 0.14 && t < 0.32 && side < 0 && d < 0.3) { kind = rnd() < 0.45 ? 'houseB' : 'houseA'; prob = 0.7; minDist = 1.6; }
      else if (t >= 0.34 && t < 0.62 && d > 0.07 && d < 0.4) { kind = rnd() < 0.55 ? 'block' : 'houseA'; prob = 0.3; minDist = kind === 'block' ? 4.2 : 1.8; }
      else if (t >= 0.62 && t < 0.95 && d > 0.05 && d < 0.35) { kind = 'village'; prob = 0.14; minDist = 2.2; }
      if (!kind || rnd() > prob) continue;
      if (T.slope(dir) > (kind === 'block' ? 0.28 : 0.42)) continue;
      if (info.hills > 4.2) continue;
      if (tooClose(dir, minDist)) continue;
      const pos = T.surface(dir, new THREE.Vector3());
      // face the river, more or less
      const rp = RIVER[Math.round(t * RIVER_N) % RIVER_N];
      const toRiver = _v.copy(rp).sub(dir).projectOnPlane(dir).normalize();
      const q = standOn(dir, 0);
      const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
      let yaw = Math.atan2(toRiver.dot(localX), toRiver.dot(localZ)) + (rnd() - 0.5) * 0.7;
      if (kind === 'block') yaw += rnd() < 0.5 ? Math.PI / 2 : 0;
      const scale = kind === 'block' ? 0.95 + rnd() * 0.1 : 0.85 + rnd() * 0.3;
      const entry = { dir, pos, yaw, scale, kind, r: (kind === 'block' ? 3.5 : 1.3) * scale, t, side, d };
      accepted.push(entry);
      lists[kind].push(entry);
    }
    // sink them a little so the ground never shows under a corner
    const make = (kind, geometry, palette, fixedYawScale = 1) => {
      const list = lists[kind];
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geometry, this.materials.building, list.length);
      mesh.name = kind;
      mesh.castShadow = true; mesh.receiveShadow = true;
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color();
      list.forEach((e, i) => {
        standOn(e.dir, e.yaw, q);
        s.setScalar(e.scale * fixedYawScale);
        m.compose(_v.copy(e.pos).addScaledVector(e.dir, -0.14), q, s);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, c.set(rnd.pick(palette)));
        const top = e.pos.clone().addScaledVector(e.dir, (kind === 'houseB' ? 1.6 : kind === 'block' ? 3.0 : kind === 'village' ? 0.9 : 0.85) * e.scale);
        this.houses.push({ ...e, top });
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      this.group.add(mesh);
    };
    make('houseA', houseGeometry(rnd, { floors: 2, w: 2.0, d: 1.55, balconies: [1] }), WALLS);
    make('houseB', houseGeometry(rnd, { floors: 3, w: 2.5, d: 1.8, balconies: [1, 2] }), WALLS);
    make('village', villageHouseGeometry(rnd), VILLAGE);
    make('block', blockGeometry(rnd), BLOCKS);
    this.accepted = accepted;
  }

  _placeTrees() {
    const rnd = this.rnd, T = this.terrain;
    const N = this.low ? 4000 : 8000;
    const lists = { cypress: [], plane: [], poplar: [] };
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = golden * i + 1.7;
      const dir = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr);
      dir.x += (rnd() - 0.5) * 0.03; dir.y += (rnd() - 0.5) * 0.03; dir.z += (rnd() - 0.5) * 0.03; dir.normalize();
      const info = T.info(dir);
      if (info.d < info.hw + 0.02 || info.lake < LAKE.r + 0.02) continue;
      const slope = T.slope(dir);
      if (slope > 0.75) continue;
      let kind = null, prob = 0;
      const onMtatsminda = this._near(dir, HILLS[0], 1.5) || this._near(dir, HILLS[1], 1.4);
      const embankment = info.d > info.hw + 0.05 && info.d < info.hw + 0.075 && this._isTown(info);
      const orchard = info.t > 0.62 && info.t < 0.95 && info.d > 0.05 && info.hills < 1.5;
      if (onMtatsminda && info.hills > 1.2) { kind = rnd() < 0.7 ? 'cypress' : 'plane'; prob = 0.55; }
      else if (embankment) { kind = 'plane'; prob = 0.8; }
      else if (orchard) { kind = rnd() < 0.5 ? 'plane' : 'poplar'; prob = 0.3; }
      else if (this._isTown(info)) { kind = rnd() < 0.5 ? 'cypress' : 'plane'; prob = 0.12; }
      else { kind = rnd() < 0.4 ? 'poplar' : 'plane'; prob = 0.05; }
      if (!kind || rnd() > prob) continue;
      // not inside a building
      const pos = T.surface(dir, new THREE.Vector3());
      let blocked = false;
      for (const a of this.accepted) if (a.pos.distanceTo(pos) < a.r + 0.4) { blocked = true; break; }
      if (blocked) continue;
      lists[kind].push({ dir, pos, yaw: rnd() * TWO_PI, scale: 0.75 + rnd() * 0.5 });
    }
    const make = (kind, geometry, palette) => {
      const list = lists[kind];
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geometry, this.materials.tree, list.length);
      mesh.name = kind;
      mesh.castShadow = true; mesh.receiveShadow = true;
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), c = new THREE.Color();
      list.forEach((e, i) => {
        standOn(e.dir, e.yaw, q);
        s.setScalar(e.scale);
        m.compose(_v.copy(e.pos).addScaledVector(e.dir, -0.08), q, s);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, c.set(rnd.pick(palette)));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
      this.group.add(mesh);
    };
    make('cypress', cypressGeometry(rnd), CYPRESS);
    make('plane', planeTreeGeometry(rnd), PLANE);
    make('poplar', poplarGeometry(rnd), POPLAR);
  }

  /** The things that are only in Tbilisi. */
  _buildLandmarks() {
    const rnd = this.rnd, T = this.terrain;
    const b = new Builder();
    this.landmarks = [];
    const put = (dir, yaw, fn, sink = 0.12, radius = 0) => {
      const p = T.surface(dir, new THREE.Vector3()).addScaledVector(dir, -sink);
      const q = standOn(dir, yaw);
      b.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)));
      fn();
      b.pop();
      if (radius > 0) this.landmarks.push({ pos: p.clone(), dir: dir.clone(), r: radius });
      return p;
    };
    const brick = () => Builder.aux(ELEM.BRICK, rnd(), 0, 0.25);
    const stone = () => Builder.aux(ELEM.STONE, rnd(), 0, 0.1);
    const trim = () => Builder.aux(ELEM.TRIM, rnd(), 0, 0.2);
    const metal = () => Builder.aux(ELEM.METAL, rnd(), 0, 0.2);

    // Abanotubani: the sulfur baths, brick domes half sunk in the ground by the river
    const bathsDir = offset(0.018, -1, riverWidth(0.018) + 0.045);
    const bathsPos = put(bathsDir, 0.4, () => {
      const domes = [[0, 0, 0.9], [1.3, 0.2, 0.7], [-1.2, 0.3, 0.75], [0.5, -1.2, 0.6], [-0.6, -1.3, 0.55], [1.6, -1.1, 0.5]];
      for (const [x, z, r] of domes) {
        b.box(r * 2.2, 0.35, r * 2.2, '#c9b79a', stone(), { x, z });
        b.dome(r, 10, 4, '#a35a45', brick(), { x, y: 0.35, z, squash: 0.7 });
        b.cylinder(0.12, 0.25, 6, '#f0e9d8', trim(), { x, y: 0.35 + r * 0.7 - 0.02, z });
      }
    }, 0.12, 2.6);
    this.bathsPos = bathsPos;

    // the waterfall in the gorge behind them
    {
      const topDir = offset(0.028, -1, riverWidth(0.028) + 0.1);
      const bottomDir = offset(0.028, -1, riverWidth(0.028) + 0.02);
      const top = T.surface(topDir, new THREE.Vector3()).addScaledVector(topDir, 0.4);
      const bottom = bottomDir.clone().multiplyScalar(RW + 0.02);
      this.waterfall = new Waterfall(this.group, top, bottom, bottomDir.clone());
    }

    // Metekhi, on its cliff over the water, and Sioni down in the old town
    put(offset(0.035, 1, riverWidth(0.035) + 0.03), 0.2, () => church(b, rnd, { w: 1.6, d: 1.2, h: 1.8 }), 0.12, 1.1);
    put(offset(0.07, -1, riverWidth(0.07) + 0.06), -0.3, () => church(b, rnd, { w: 1.4, d: 1.0, h: 1.5, drum: 0.36, cone: 0.85 }), 0.12, 1.0);
    // Kashveti, on Rustaveli in Vera
    put(offset(0.2, -1, riverWidth(0.2) + 0.09), 0.9, () => church(b, rnd, { w: 1.3, d: 1.0, h: 1.4, drum: 0.34, cone: 0.9 }), 0.12, 0.95);

    // Narikala: a wall along the ridge, with towers at the ends
    {
      const p1 = offset(0.028, -1, 0.10), p2 = offset(0.085, -1, 0.125);
      const q1 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1), q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2);
      const segs = 12;
      const prev = new THREE.Vector3();
      for (let i = 0; i <= segs; i++) {
        const q = q1.clone().slerp(q2, i / segs);
        const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
        const next = new THREE.Vector3(0, 1, 0).applyQuaternion(q1.clone().slerp(q2, (i + 0.5) / segs));
        const along = next.clone().sub(dir).projectOnPlane(dir).normalize();
        const qs = standOn(dir, 0);
        const lx = new THREE.Vector3(1, 0, 0).applyQuaternion(qs), lz = new THREE.Vector3(0, 0, 1).applyQuaternion(qs);
        const yaw = Math.atan2(along.dot(lz), along.dot(lx));
        put(dir, -yaw, () => {
          if (i === 0 || i === segs) {
            b.cylinder(0.55, 1.6, 8, '#b9a98a', stone());
            for (let k = 0; k < 8; k++) b.box(0.22, 0.25, 0.22, '#b9a98a', stone(), { x: Math.cos(k / 8 * TWO_PI) * 0.5, y: 1.6, z: Math.sin(k / 8 * TWO_PI) * 0.5 });
          } else {
            b.box(1.7, 0.95, 0.38, '#b9a98a', stone(), { x: 0, z: 0 });
            for (let k = -2; k <= 2; k++) b.box(0.22, 0.22, 0.38, '#b9a98a', stone(), { x: k * 0.36, y: 0.95, z: 0 });
          }
        }, 0.25);
        prev.copy(dir);
      }
    }

    // Kartlis Deda on the Sololaki ridge: a tall figure in aluminium, sword and bowl
    put(offset(0.115, -1, 0.16), 0.5, () => {
      b.box(1.0, 0.5, 1.0, '#b9a98a', stone());
      b.cone(0.28, 2.0, 7, '#cfd3d6', metal(), { y: 0.5, rTop: 0.2 });
      b.blob(0.2, 0, '#cfd3d6', metal(), { y: 2.65, jitter: 0.05, rnd });
      b.box(0.06, 0.9, 0.06, '#cfd3d6', metal(), { x: 0.34, y: 1.6, z: 0 });
      b.box(0.5, 0.06, 0.06, '#cfd3d6', metal(), { x: -0.4, y: 1.9, z: 0 });
    }, 0.12, 0.8);

    // Mtatsminda: the television tower on the peak, the pantheon church below it
    const peak = HILLS[0].dir.clone();
    this.peakPos = put(peak, 0, () => {
      const legs = 3;
      for (let k = 0; k < legs; k++) {
        const a = k / legs * TWO_PI;
        b.push(new THREE.Matrix4().makeRotationY(-a));
        b.push(new THREE.Matrix4().makeTranslation(1.1, 0, 0));
        b.push(new THREE.Matrix4().makeRotationZ(0.2));
        b.cylinder(0.09, 5.4, 5, '#d8d4cf', metal());
        b.pop(); b.pop(); b.pop();
      }
      b.cylinder(0.75, 0.3, 8, '#f0e9d8', trim(), { y: 5.2 });
      b.cylinder(0.16, 9.5, 6, '#d8d4cf', metal(), { y: 0 });
      b.cylinder(0.5, 0.25, 8, '#f0e9d8', trim(), { y: 7.4 });
      b.cylinder(0.05, 1.8, 4, '#d8d4cf', metal(), { y: 9.5 });
      b.blob(0.14, 0, '#c93a2e', brick(), { y: 11.3, jitter: 0.05, rnd });
    }, 0.3, 1.3);
    put(offset(0.2, -1, 0.245), 0.3, () => church(b, rnd, { w: 1.1, d: 0.9, h: 1.2, drum: 0.3, cone: 0.8 }), 0.12, 0.85);

    // the two old bridges over the Mtkvari
    for (const t of [0.045, 0.095, 0.2]) {
      const rp = riverPoint(t);
      const hw = riverWidth(t);
      const across = A.clone().addScaledVector(rp, -A.dot(rp)).normalize();
      const qs = standOn(rp, 0);
      const lx = new THREE.Vector3(1, 0, 0).applyQuaternion(qs), lz = new THREE.Vector3(0, 0, 1).applyQuaternion(qs);
      const yaw = Math.atan2(across.dot(lz), across.dot(lx));
      const p = rp.clone().multiplyScalar(RW + 0.45);
      b.push(new THREE.Matrix4().compose(p, standOn(rp, -yaw), new THREE.Vector3(1, 1, 1)));
      const len = 2 * hw * R + 1.4;
      b.box(len, 0.22, 0.8, '#c9bda3', stone(), { y: 0 });
      b.box(len, 0.08, 0.06, '#8a8f92', metal(), { y: 0.22, z: 0.37 });
      b.box(len, 0.08, 0.06, '#8a8f92', metal(), { y: 0.22, z: -0.37 });
      b.pop();
    }

    // the funicular: lower station in Vera, upper station at the peak, the cable between
    {
      const lower = offset(0.2, -1, riverWidth(0.2) + 0.11);
      const upper = peak.clone();
      put(lower, 0, () => { b.box(1.2, 0.8, 1.0, '#e0cfae', stone()); b.roof(1.2, 1.0, 0.35, '#7a8385', Builder.aux(ELEM.ROOF, rnd(), 0, 0.15), { y: 0.8 }); }, 0.12, 0.9);
      const pts = [];
      const q1 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), lower), q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), upper);
      const n = 26;
      for (let i = 0; i <= n; i++) {
        const dir = new THREE.Vector3(0, 1, 0).applyQuaternion(q1.clone().slerp(q2, i / n));
        pts.push(T.surface(dir, new THREE.Vector3()).addScaledVector(dir, 0.22));
      }
      this.funicular = pts;
      this.funicularLine = new Lines(this.group, [pts.map((p) => [p.x, p.y, p.z])], { color: '#4a4340', width: 0.9, rnd });
      // the car
      const cb = new Builder();
      cb.box(0.5, 0.42, 0.34, '#c93a2e', Builder.aux(ELEM.BRICK, 0.5, 0, 0.25));
      cb.box(0.44, 0.16, 0.36, '#ffffff', Builder.aux(ELEM.WINDOW, 0.95, 0, 0.6), { y: 0.2 });
      this.car = new THREE.Mesh(cb.build(), this.materials.building);
      this.car.castShadow = true;
      this.group.add(this.car);
      this.updaters.push(() => {
        const s = 0.5 + 0.5 * Math.sin(renderInfo.time * TWO_PI / 46);
        const f = s * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), k = f - i;
        this.car.position.lerpVectors(pts[i], pts[i + 1], k);
        const dir = this.car.position.clone().normalize();
        const along = pts[i + 1].clone().sub(pts[i]).projectOnPlane(dir).normalize();
        const qs = standOn(dir, 0);
        const lx = new THREE.Vector3(1, 0, 0).applyQuaternion(qs), lz = new THREE.Vector3(0, 0, 1).applyQuaternion(qs);
        this.car.quaternion.copy(standOn(dir, -Math.atan2(along.dot(lz), along.dot(lx))));
      });
    }

    // the tower's guy wires
    {
      const top = this.peakPos.clone().addScaledVector(peak, 7.4);
      const wires = [];
      for (let k = 0; k < 3; k++) {
        const a = k / 3 * TWO_PI + 0.5;
        const qs = standOn(peak, a);
        const out = new THREE.Vector3(1, 0, 0).applyQuaternion(qs);
        const anchorDir = peak.clone().addScaledVector(out, 0.09).normalize();
        const anchor = T.surface(anchorDir, new THREE.Vector3());
        wires.push(catenary([top.x, top.y, top.z], [anchor.x, anchor.y, anchor.z], 0.12, 6, [peak.x, peak.y, peak.z]));
      }
      new Lines(this.group, wires, { color: '#3f3a37', width: 0.7, rnd });
    }

    const mesh = new THREE.Mesh(b.build(), this.materials.building);
    mesh.name = 'Landmarks';
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  /** Washing lines between the old-town galleries, with the washing on them. */
  _buildLaundry() {
    const rnd = this.rnd;
    const candidates = this.houses.filter((h) => h.kind === 'houseA' || h.kind === 'houseB');
    const lines = [], cloth = [];
    const used = new Set();
    for (const h of candidates) {
      if (lines.length >= 22) break;
      if (used.has(h)) continue;
      let best = null, bd = 1e9;
      for (const o of candidates) {
        if (o === h || used.has(o)) continue;
        const dist = h.top.distanceTo(o.top);
        if (dist < 2.4 || dist > 5.6) continue;
        if (Math.abs(h.top.length() - o.top.length()) > 1.0) continue;
        if (dist < bd) { bd = dist; best = o; }
      }
      if (!best || rnd() < 0.35) continue;
      used.add(h); used.add(best);
      const up = h.dir.clone().add(best.dir).normalize();
      const a = h.top.clone().addScaledVector(h.dir, -0.15), c = best.top.clone().addScaledVector(best.dir, -0.15);
      const pts = catenary([a.x, a.y, a.z], [c.x, c.y, c.z], 0.32, 12, [up.x, up.y, up.z]);
      lines.push(pts);
      const n = Math.floor(bd / 0.55);
      for (let i = 1; i < n; i++) {
        const f = i / n * (pts.length - 1), k = Math.floor(f), t = f - k;
        const p = new THREE.Vector3().lerpVectors(new THREE.Vector3(...pts[k]), new THREE.Vector3(...pts[Math.min(pts.length - 1, k + 1)]), t);
        const along = new THREE.Vector3().subVectors(c, a).projectOnPlane(up).normalize();
        const qs = standOn(up, 0);
        const lx = new THREE.Vector3(1, 0, 0).applyQuaternion(qs), lz = new THREE.Vector3(0, 0, 1).applyQuaternion(qs);
        const yaw = -Math.atan2(along.dot(lz), along.dot(lx));
        cloth.push({ p: p.addScaledVector(up, -0.42), up, yaw, w: 0.22 + rnd() * 0.16, h: 0.3 + rnd() * 0.2 });
      }
    }
    if (!lines.length) return;
    new Lines(this.group, lines, { color: '#4a4340', width: 0.8, rnd });
    const cg = new Builder();
    cg.box(1, 1, 0.05, '#ffffff', Builder.aux(ELEM.CLOTH, 0.3, 0, 0.35), { y: 0 });
    const mesh = new THREE.InstancedMesh(cg.build(), this.materials.building, cloth.length);
    mesh.name = 'Laundry';
    mesh.castShadow = true;
    const m = new THREE.Matrix4(), c = new THREE.Color();
    cloth.forEach((e, i) => {
      m.compose(e.p, standOn(e.up, e.yaw), new THREE.Vector3(e.w, e.h, 1));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set(rnd.pick(CLOTH)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    this.group.add(mesh);
  }

  _buildClouds() {
    const rnd = this.rnd;
    this.cloudGroup = new THREE.Group();
    this.cloudGroup.name = 'Clouds';
    const n = this.low ? 6 : 10;
    for (let i = 0; i < n; i++) {
      const b = new Builder();
      const parts = 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < parts; k++) b.blob(1.0 + rnd() * 1.1, 3, '#ffffff', Builder.aux(0, rnd(), 0, 0.4), { x: (k - (parts - 1) / 2) * 1.4, y: rnd() * 0.3, z: (rnd() - 0.5) * 0.8, jitter: 0.06, sy: 0.55, rnd });
      const mat = this.materials.cloud.clone();
      mat.uniforms.uSeed.value = rnd() * 10;
      const mesh = new THREE.Mesh(b.build(), mat);
      const u = rnd() * 2 - 1, th = rnd() * TWO_PI, s = Math.sqrt(1 - u * u);
      const dir = new THREE.Vector3(Math.cos(th) * s, u, Math.sin(th) * s);
      mesh.position.copy(dir).multiplyScalar(R + 8.5 + rnd() * 3);
      mesh.quaternion.copy(standOn(dir, rnd() * TWO_PI));
      mesh.castShadow = false; mesh.receiveShadow = false;
      this.cloudGroup.add(mesh);
    }
    this.cloudAxis = new THREE.Vector3(0.2, 1, 0.1).normalize();
    this.group.add(this.cloudGroup);
    this.updaters.push(() => { this.cloudGroup.rotateOnAxis(this.cloudAxis, 0.0035 * renderInfo.ratio / 60); });
  }

  update() { for (const u of this.updaters) u(); }
}
