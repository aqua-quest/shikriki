// 3-D letters. The glyph outlines exported from the font are turned into shapes and
// extruded, one geometry per character, cached. Georgian Mtavruli — the uniform-height
// capital forms painted on every Soviet-era shop sign in Tbilisi — is what the title
// and the button are set in.

import * as THREE from 'three';
import { withAux } from './geo.js';

let FONT = null;
const shapeCache = new Map();
const geoCache = new Map();

export async function loadFont(url = 'fonts/mtavruli.json') {
  if (FONT) return FONT;
  const res = await fetch(url);
  FONT = await res.json();
  return FONT;
}

export function fontInfo() {
  return { upem: FONT.upem, cap: 724, xh: 563, ascender: FONT.ascender, descender: FONT.descender };
}

export function glyphShapes(ch) {
  if (shapeCache.has(ch)) return shapeCache.get(ch);
  const g = FONT.glyphs[ch];
  if (!g) { shapeCache.set(ch, null); return null; }
  const path = new THREE.ShapePath();
  for (const c of g.cmds) {
    switch (c[0]) {
      case 'M': path.moveTo(c[1], c[2]); break;
      case 'L': path.lineTo(c[1], c[2]); break;
      case 'Q': path.quadraticCurveTo(c[1], c[2], c[3], c[4]); break;
      case 'C': path.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]); break;
      default: break;
    }
  }
  const shapes = path.toShapes(false);
  shapeCache.set(ch, shapes);
  return shapes;
}

export function glyphAdvance(ch) { const g = FONT.glyphs[ch]; return g ? g.adv : 300; }
export function glyphBounds(ch) { const g = FONT.glyphs[ch]; return g ? g.bb : [0, 0, 0, 0]; }

/**
 * An extruded glyph in font units (1000 per em), centred on its advance width and on
 * the cap height, front face at +z. `depth`, `bevel` in font units.
 */
export function glyphGeometry(ch, { depth = 300, bevel = 28, curveSegments = 6, elemFace = 0, elemSide = 1, id = 0.1 } = {}) {
  const key = `${ch}|${depth}|${bevel}|${curveSegments}|${elemFace}|${elemSide}|${id}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const shapes = glyphShapes(ch);
  if (!shapes || !shapes.length) return null;
  const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 2, curveSegments, steps: 1 });
  const adv = glyphAdvance(ch);
  geo.translate(-adv / 2, -724 / 2, -depth / 2);
  geo.computeVertexNormals();
  // faces looking straight out are the painted face, everything else is the side of the slab
  const n = geo.attributes.normal, count = geo.attributes.position.count;
  const aux = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const face = Math.abs(n.getZ(i)) > 0.92;
    aux[i * 4] = face ? elemFace : elemSide; aux[i * 4 + 1] = 0; aux[i * 4 + 2] = 0; aux[i * 4 + 3] = id;
  }
  geo.setAttribute('aux', new THREE.BufferAttribute(aux, 4));
  geo.computeBoundingBox();
  geoCache.set(key, geo);
  return geo;
}

/**
 * Lay a string out on one line, in font units. Returns each letter's geometry and x
 * offset; the caller decides whether they become one mesh or one mesh per letter.
 */
export function layout(str, { letterSpacing = 0, ...glyphOpts } = {}) {
  const letters = [];
  let x = 0;
  const chars = [...str];
  for (const ch of chars) {
    if (ch === ' ') { x += 320; continue; }
    const adv = glyphAdvance(ch);
    const geometry = glyphGeometry(ch, glyphOpts);
    letters.push({ ch, geometry, x: x + adv / 2, adv });
    x += adv + letterSpacing;
  }
  const width = x - letterSpacing;
  for (const l of letters) l.x -= width / 2;
  return { letters, width };
}
