// Lines strung through the air: laundry between balconies, the funicular's cable up
// Mtatsminda, the guy wires of the television tower. A polyline is extruded to a
// constant screen width in the vertex shader and broken up by noise so it reads as a
// pen stroke rather than a ribbon.

import * as THREE from 'three';
import { lineMaterial } from '../render/materials.js';

/** Build the extruded-line geometry for several polylines at once. */
export function linesGeometry(polylines, rnd = Math.random) {
  const curve = [], prev = [], next = [], uv = [], rand = [], index = [];
  let base = 0;
  for (const pts of polylines) {
    if (pts.length < 2) continue;
    const r = rnd();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], pp = pts[Math.max(0, i - 1)], pn = pts[Math.min(pts.length - 1, i + 1)];
      // at the ends, mirror the neighbour so the tangent is well defined
      const pPrev = i === 0 ? [2 * p[0] - pn[0], 2 * p[1] - pn[1], 2 * p[2] - pn[2]] : pp;
      const pNext = i === pts.length - 1 ? [2 * p[0] - pp[0], 2 * p[1] - pp[1], 2 * p[2] - pp[2]] : pn;
      for (let s = 0; s < 2; s++) {
        curve.push(p[0], p[1], p[2]);
        prev.push(pPrev[0], pPrev[1], pPrev[2]);
        next.push(pNext[0], pNext[1], pNext[2]);
        uv.push(s, i / (pts.length - 1));
        rand.push(r);
      }
      if (i > 0) {
        const a = base + (i - 1) * 2, b = a + 1, c = a + 2, d = a + 3;
        index.push(a, b, c, b, d, c);
      }
    }
    base += pts.length * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(curve, 3));
  g.setAttribute('curvepos', new THREE.Float32BufferAttribute(curve, 3));
  g.setAttribute('prevpos', new THREE.Float32BufferAttribute(prev, 3));
  g.setAttribute('nextpos', new THREE.Float32BufferAttribute(next, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('randomm', new THREE.Float32BufferAttribute(rand, 1));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

/** A sagging line between two points, `segments` long, `sag` deep at the middle, in world units. */
export function catenary(a, b, sag = 0.3, segments = 10, up = null) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const s = -sag * 4 * t * (1 - t);
    if (up) { p[0] += up[0] * s; p[1] += up[1] * s; p[2] += up[2] * s; } else p[1] += s;
    pts.push(p);
  }
  return pts;
}

export class Lines {
  constructor(parent, polylines, { color = '#4a4340', width = 1, rnd = Math.random } = {}) {
    this.mesh = new THREE.Mesh(linesGeometry(polylines, rnd), lineMaterial({ color, width }));
    this.mesh.name = 'Lines';
    this.mesh.frustumCulled = false;
    parent.add(this.mesh);
  }
}
