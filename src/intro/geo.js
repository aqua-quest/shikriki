// A small geometry builder. Everything on the planet — houses, balconies, domes,
// towers, trees — is assembled from these primitives into one flat-shaded buffer with
// a colour and an `aux` tag per vertex: (element type, seed, outline-off, surface id).
// The element type is what lets one instanced material paint walls, roofs, balconies,
// windows and brick differently.

import * as THREE from 'three';

export const ELEM = { WALL: 0, ROOF: 1, BALCONY: 2, WINDOW: 3, TRIM: 4, BRICK: 5, METAL: 6, CLOTH: 7, STONE: 8, LEAF: 9, TRUNK: 10, DOOR: 11 };

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3(), _p = new THREE.Vector3();
const _col = new THREE.Color();

export class Builder {
  constructor() {
    this.pos = []; this.nrm = []; this.col = []; this.aux = []; this.uv = [];
    this.matrix = new THREE.Matrix4();
    this.normalMatrix = new THREE.Matrix3();
    this._stack = [];
  }
  push(m) { this._stack.push(this.matrix.clone()); this.matrix.multiply(m); this.normalMatrix.getNormalMatrix(this.matrix); return this; }
  pop() { this.matrix.copy(this._stack.pop()); this.normalMatrix.getNormalMatrix(this.matrix); return this; }
  /** Position, yaw around y, uniform or per-axis scale. */
  at(x, y, z, yaw = 0, sx = 1, sy = sx, sz = sx) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(sx, sy, sz));
    return this.push(m);
  }
  _vert(p, n, color, aux, u = 0, v = 0) {
    _p.copy(p).applyMatrix4(this.matrix);
    _n.copy(n).applyMatrix3(this.normalMatrix).normalize();
    this.pos.push(_p.x, _p.y, _p.z);
    this.nrm.push(_n.x, _n.y, _n.z);
    this.col.push(color.r, color.g, color.b);
    this.aux.push(aux[0], aux[1], aux[2], aux[3]);
    this.uv.push(u, v);
  }
  /** A triangle with a flat normal; `a, b, c` counter-clockwise seen from outside. */
  tri(a, b, c, color, aux) {
    _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]); _c.set(c[0], c[1], c[2]);
    _n.subVectors(_b, _a).cross(_c.clone().sub(_a)).normalize();
    const n = _n.clone();
    this._vert(_a, n, color, aux, 0, 0); this._vert(_b, n, color, aux, 1, 0); this._vert(_c, n, color, aux, 0, 1);
  }
  quad(a, b, c, d, color, aux) { this.tri(a, b, c, color, aux); this.tri(a, c, d, color, aux); }

  static aux(elem = 0, seed = 0, outlineOff = 0, id = 0.1) { return [elem, seed, outlineOff, id]; }
  static color(c) { return _col.set(c).clone(); }

  /** A box standing on y=0, centred at x,z. */
  box(w, h, d, color, aux, { x = 0, y = 0, z = 0, yaw = 0, top = true, bottom = false } = {}) {
    this.at(x, y, z, yaw);
    const hw = w / 2, hd = d / 2;
    const c = Builder.color(color);
    const p = (X, Y, Z) => [X, Y, Z];
    // sides
    this.quad(p(-hw, 0, hd), p(hw, 0, hd), p(hw, h, hd), p(-hw, h, hd), c, aux);      // front +z
    this.quad(p(hw, 0, -hd), p(-hw, 0, -hd), p(-hw, h, -hd), p(hw, h, -hd), c, aux);  // back -z
    this.quad(p(hw, 0, hd), p(hw, 0, -hd), p(hw, h, -hd), p(hw, h, hd), c, aux);      // right +x
    this.quad(p(-hw, 0, -hd), p(-hw, 0, hd), p(-hw, h, hd), p(-hw, h, -hd), c, aux);  // left -x
    if (top) this.quad(p(-hw, h, hd), p(hw, h, hd), p(hw, h, -hd), p(-hw, h, -hd), c, aux);
    if (bottom) this.quad(p(-hw, 0, -hd), p(hw, 0, -hd), p(hw, 0, hd), p(-hw, 0, hd), c, aux);
    this.pop();
    return this;
  }
  /** A pitched roof with its ridge along x, sitting at y over a w×d footprint, with overhang. */
  roof(w, d, h, color, aux, { x = 0, y = 0, z = 0, yaw = 0, overhang = 0.12, thickness = 0.08 } = {}) {
    this.at(x, y, z, yaw);
    const hw = w / 2 + overhang, hd = d / 2 + overhang;
    const c = Builder.color(color);
    const p = (X, Y, Z) => [X, Y, Z];
    // two slopes, each a thin slab
    this.quad(p(-hw, 0, hd), p(hw, 0, hd), p(hw, h, 0), p(-hw, h, 0), c, aux);
    this.quad(p(hw, 0, -hd), p(-hw, 0, -hd), p(-hw, h, 0), p(hw, h, 0), c, aux);
    // slab undersides at the eaves, so the overhang reads as a plate
    this.quad(p(-hw, -thickness, hd), p(-hw, 0, hd), p(hw, 0, hd), p(hw, -thickness, hd), c, aux);
    this.quad(p(hw, -thickness, -hd), p(hw, 0, -hd), p(-hw, 0, -hd), p(-hw, -thickness, -hd), c, aux);
    // gables
    this.tri(p(hw, 0, hd), p(hw, 0, -hd), p(hw, h, 0), c, aux);
    this.tri(p(-hw, 0, -hd), p(-hw, 0, hd), p(-hw, h, 0), c, aux);
    this.pop();
    return this;
  }
  /** A cone standing on y=0. */
  cone(r, h, segs, color, aux, { x = 0, y = 0, z = 0, rTop = 0, yaw = 0 } = {}) {
    this.at(x, y, z, yaw);
    const c = Builder.color(color);
    for (let i = 0; i < segs; i++) {
      const a0 = i / segs * Math.PI * 2, a1 = (i + 1) / segs * Math.PI * 2;
      const b0 = [Math.cos(a0) * r, 0, Math.sin(a0) * r], b1 = [Math.cos(a1) * r, 0, Math.sin(a1) * r];
      if (rTop > 0) {
        const t0 = [Math.cos(a0) * rTop, h, Math.sin(a0) * rTop], t1 = [Math.cos(a1) * rTop, h, Math.sin(a1) * rTop];
        this.quad(b1, b0, t0, t1, c, aux);
      } else this.tri(b1, b0, [0, h, 0], c, aux);
    }
    this.pop();
    return this;
  }
  cylinder(r, h, segs, color, aux, opts = {}) {
    this.cone(r, h, segs, color, aux, { ...opts, rTop: opts.rTop ?? r });
    if (opts.cap !== false) {
      this.at(opts.x || 0, (opts.y || 0) + h, opts.z || 0);
      const c = Builder.color(color), rt = opts.rTop ?? r;
      for (let i = 0; i < segs; i++) {
        const a0 = i / segs * Math.PI * 2, a1 = (i + 1) / segs * Math.PI * 2;
        this.tri([0, 0, 0], [Math.cos(a1) * rt, 0, Math.sin(a1) * rt], [Math.cos(a0) * rt, 0, Math.sin(a0) * rt], c, aux);
      }
      this.pop();
    }
    return this;
  }
  /** A dome (hemisphere) resting on y=0, optionally squashed. */
  dome(r, segs, rings, color, aux, { x = 0, y = 0, z = 0, squash = 1 } = {}) {
    this.at(x, y, z, 0, 1, squash, 1);
    const c = Builder.color(color);
    const pt = (i, j) => { const th = i / segs * Math.PI * 2, ph = j / rings * Math.PI / 2; return [Math.cos(th) * Math.cos(ph) * r, Math.sin(ph) * r, Math.sin(th) * Math.cos(ph) * r]; };
    for (let j = 0; j < rings; j++) for (let i = 0; i < segs; i++) {
      const a = pt(i, j), b = pt(i + 1, j), cc = pt(i + 1, j + 1), d = pt(i, j + 1);
      if (j === rings - 1) this.tri(b, a, [0, r, 0], c, aux); else this.quad(b, a, d, cc, c, aux);
    }
    this.pop();
    return this;
  }
  /** A lumpy sphere for tree canopies and clouds, flat shaded. */
  blob(r, detail, color, aux, { x = 0, y = 0, z = 0, jitter = 0.18, sy = 1, rnd = Math.random } = {}) {
    this.at(x, y, z, 0, 1, sy, 1);
    const g = new THREE.IcosahedronGeometry(r, detail);
    const pos = g.attributes.position;
    // jitter shared per vertex position so faces stay attached
    const jit = new Map();
    const key = (i) => `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    for (let i = 0; i < pos.count; i++) { const k = key(i); if (!jit.has(k)) jit.set(k, 1 + (rnd() - 0.5) * 2 * jitter); }
    const c = Builder.color(color);
    for (let i = 0; i < pos.count; i += 3) {
      const v = [0, 1, 2].map((k) => { const s = jit.get(key(i + k)); return [pos.getX(i + k) * s, pos.getY(i + k) * s, pos.getZ(i + k) * s]; });
      this.tri(v[0], v[1], v[2], c, aux);
    }
    g.dispose();
    this.pop();
    return this;
  }
  /** Append another geometry (positions/normals/colors/aux/uv arrays) under the current transform. */
  append(geometry, color, aux) {
    const p = geometry.attributes.position, n = geometry.attributes.normal, u = geometry.attributes.uv;
    const c = Builder.color(color);
    const idx = geometry.index;
    const count = idx ? idx.count : p.count;
    for (let k = 0; k < count; k++) {
      const i = idx ? idx.getX(k) : k;
      _a.set(p.getX(i), p.getY(i), p.getZ(i));
      _n.set(n.getX(i), n.getY(i), n.getZ(i));
      this._vert(_a, _n, c, aux, u ? u.getX(i) : 0, u ? u.getY(i) : 0);
    }
    return this;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aux', new THREE.Float32BufferAttribute(this.aux, 4));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeBoundingSphere();
    return g;
  }
}

/** Give any three.js geometry the aux attribute the toon material expects. */
export function withAux(geometry, elem = 0, seed = 0, outlineOff = 0, id = 0.1) {
  const n = geometry.attributes.position.count;
  const a = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { a[i * 4] = elem; a[i * 4 + 1] = seed; a[i * 4 + 2] = outlineOff; a[i * 4 + 3] = id; }
  geometry.setAttribute('aux', new THREE.BufferAttribute(a, 4));
  return geometry;
}

/** A quaternion that stands an object up on a sphere at `normal`, turned by `yaw` about it. */
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _Y = new THREE.Vector3(0, 1, 0);
export function standOn(normal, yaw = 0, out = new THREE.Quaternion()) {
  out.setFromUnitVectors(_Y, normal);
  _q2.setFromAxisAngle(_Y, yaw);
  return out.multiply(_q2);
}
