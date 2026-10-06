// Export glyph outlines from a TTF into a small JSON the game extrudes at runtime.
//
//   node tools/font2glyphs.mjs fonts/NotoSansGeorgian-Black.ttf fonts/mtavruli.json "ᲨᲘᲙᲠᲘᲙᲘ..."
//
// Every 3D letter in the menu — the title blocks, the button text, the subtitle — is
// built from these outlines with THREE.ShapePath + ExtrudeGeometry. Coordinates are in
// font units (1000 per em), y up, with each glyph's advance width. Curves are kept as
// quadratic (Q) or cubic (C) commands, so the extrusion decides its own smoothness.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const opentype = require(process.env.OPENTYPE || '/private/tmp/claude-501/-Users-luka-Desktop-Claude-Projects-Shooter-Game/4f4c97ef-7e0f-46e7-9ce0-827c545cbd98/scratchpad/fontwork/node_modules/opentype.js');

const [,, ttf, out, chars] = process.argv;
const font = opentype.loadSync(ttf);
const wanted = new Set([...(chars || '')]);
// Mtavruli capitals, Mkhedruli, digits and a little punctuation, whatever the caller asked for
for (let c = 0x1c90; c <= 0x1cbf; c++) wanted.add(String.fromCodePoint(c));
for (let c = 0x10d0; c <= 0x10ff; c++) wanted.add(String.fromCodePoint(c));
for (const c of '0123456789.,:;!?-–—·\'"()ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ') wanted.add(c);

const glyphs = {};
let count = 0;
for (const ch of wanted) {
  const g = font.charToGlyph(ch);
  if (!g || (g.index === 0 && ch !== ' ')) continue;
  const cmds = g.path.commands.map((c) => {
    const r = (v) => Math.round(v);
    switch (c.type) {
      case 'M': return ['M', r(c.x), r(c.y)];
      case 'L': return ['L', r(c.x), r(c.y)];
      case 'Q': return ['Q', r(c.x1), r(c.y1), r(c.x), r(c.y)];
      case 'C': return ['C', r(c.x1), r(c.y1), r(c.x2), r(c.y2), r(c.x), r(c.y)];
      case 'Z': return ['Z'];
    }
  });
  const bb = g.getBoundingBox();
  glyphs[ch] = { adv: g.advanceWidth, bb: [bb.x1, bb.y1, bb.x2, bb.y2].map(Math.round), cmds };
  count++;
}
const json = { family: font.names.fontFamily?.en || 'font', upem: font.unitsPerEm, ascender: font.ascender, descender: font.descender, glyphs };
fs.writeFileSync(out, JSON.stringify(json));
console.log(`${count} glyphs → ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
