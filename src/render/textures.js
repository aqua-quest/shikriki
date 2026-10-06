// Every texture the menu uses is drawn here at start-up: three layered noises for the
// materials, a soft cloud noise for the haze and the backdrops, and a sprite sheet of
// sixteen tiny hand-scribbled shapes for the drifting specks. Nothing is loaded.

import * as THREE from 'three';
import { noise3, fbm3, math } from '../core/math.js';

const cache = new Map();

function dataTexture(data, w, h, { filter = THREE.LinearFilter, wrap = THREE.RepeatWrapping } = {}) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.magFilter = filter; t.minFilter = filter;
  t.wrapS = wrap; t.wrapT = wrap;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  t.userData.shared = true;
  return t;
}

/**
 * r: pixellated layered noise (what breaks the outlines and speckles the shading),
 * g: soft cloud noise, b: fine grain, a: 1.
 * Tileable, because it is sampled triplanar in repeat mode.
 */
export function noiseTexture(size = 256) {
  const key = `noise${size}`;
  if (cache.has(key)) return cache.get(key);
  const d = new Uint8Array(size * size * 4);
  const TAU = Math.PI * 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // sample on a torus so the texture tiles
      const u = x / size * TAU, v = y / size * TAU;
      const px = Math.cos(u) * 1.6, py = Math.sin(u) * 1.6, pz = Math.cos(v) * 1.6, pw = Math.sin(v) * 1.6;
      const r = fbm3(px + pz * 0.7, py + pw * 0.7, pz - py * 0.3, 4, 2.1, 0.55) * 0.5 + 0.5;
      const g = fbm3(pz * 0.6 + 7.1, pw * 0.6 + 3.2, px * 0.6, 3, 2, 0.5) * 0.5 + 0.5;
      const b = noise3(px * 3.1, py * 3.1, pz * 3.1 + pw) * 0.5 + 0.5;
      const i = (y * size + x) * 4;
      // the red channel is quantised, which is the pixellated look the lines break with
      d[i] = Math.round(math.clamp(r, 0, 1) * 6) / 6 * 255;
      d[i + 1] = math.clamp(g, 0, 1) * 255;
      d[i + 2] = math.clamp(b, 0, 1) * 255;
      d[i + 3] = 255;
    }
  }
  const t = dataTexture(d, size, size);
  cache.set(key, t);
  return t;
}

/** Big soft blobs, for haze, clouds in the backdrop and the water's wave bands. */
export function cloudTexture(size = 64) {
  const key = `cloud${size}`;
  if (cache.has(key)) return cache.get(key);
  const d = new Uint8Array(size * size * 4);
  const TAU = Math.PI * 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size * TAU, v = y / size * TAU;
    const px = Math.cos(u), py = Math.sin(u), pz = Math.cos(v), pw = Math.sin(v);
    const n = fbm3(px * 1.3 + pz, py * 1.3 + pw, pz * 0.8 - px, 4, 2, 0.5) * 0.5 + 0.5;
    const n2 = fbm3(pz * 2.0 + 5.0, pw * 2.0, px * 2.0 + py, 3, 2, 0.5) * 0.5 + 0.5;
    const i = (y * size + x) * 4;
    d[i] = math.clamp(n, 0, 1) * 255; d[i + 1] = math.clamp(n2, 0, 1) * 255; d[i + 2] = math.clamp((n + n2) * 0.5, 0, 1) * 255; d[i + 3] = 255;
  }
  const t = dataTexture(d, size, size);
  cache.set(key, t);
  return t;
}

/** Sixteen 32×32 scribbles in a row: dots, rings, dashes, commas, tiny crosses, a seed, a leaf. */
export function spriteSheet() {
  if (cache.has('sprites')) return cache.get('sprites');
  const cell = 32, n = 16;
  const c = document.createElement('canvas');
  c.width = cell * n; c.height = cell;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  const rnd = math.seeded(7);
  const jit = (a) => a + (rnd() - 0.5) * 1.6;
  for (let i = 0; i < n; i++) {
    g.save();
    g.translate(i * cell + cell / 2, cell / 2);
    g.lineWidth = 3 + rnd() * 2;
    switch (i % 8) {
      case 0: g.beginPath(); g.arc(jit(0), jit(0), 4 + rnd() * 3, 0, 6.3); g.fill(); break;                       // dot
      case 1: g.beginPath(); g.arc(jit(0), jit(0), 7 + rnd() * 3, 0.2, 6.0); g.stroke(); break;                   // ring, open
      case 2: g.beginPath(); g.moveTo(jit(-8), jit(-2)); g.lineTo(jit(8), jit(2)); g.stroke(); break;             // dash
      case 3: g.beginPath(); g.moveTo(jit(-6), jit(-6)); g.lineTo(jit(6), jit(6)); g.moveTo(jit(6), jit(-6)); g.lineTo(jit(-6), jit(6)); g.stroke(); break; // cross
      case 4: g.beginPath(); g.moveTo(jit(0), jit(-8)); g.quadraticCurveTo(jit(7), jit(0), jit(0), jit(8)); g.quadraticCurveTo(jit(-7), jit(0), jit(0), jit(-8)); g.fill(); break; // seed / leaf
      case 5: g.beginPath(); g.arc(jit(0), jit(-2), 5, 0, 6.3); g.fill(); g.beginPath(); g.moveTo(jit(0), jit(3)); g.lineTo(jit(-3), jit(9)); g.stroke(); break; // comma
      case 6: g.beginPath(); g.moveTo(jit(-7), jit(0)); g.lineTo(jit(7), jit(0)); g.moveTo(jit(0), jit(-7)); g.lineTo(jit(0), jit(7)); g.stroke(); break; // plus / spark
      case 7: g.beginPath(); g.moveTo(jit(-6), jit(4)); g.lineTo(jit(0), jit(-6)); g.lineTo(jit(6), jit(4)); g.closePath(); g.fill(); break; // triangle
    }
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = false;
  t.userData.shared = true;
  cache.set('sprites', t);
  return t;
}
