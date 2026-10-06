// The loading mark: a shoti — the canoe-shaped bread out of every tone oven in the
// city — steaming, drawn in eight jittered frames that flip at eight a second, the
// way the original's envelope boils. Shown and hidden with a half-second fade.

import { createTween } from '../core/tween.js';
import { math } from '../core/math.js';

function frame(rnd, i) {
  const j = (v, a = 1.4) => (v + (rnd() - 0.5) * a).toFixed(1);
  const paths = [];
  // the loaf: a pointed oval, drawn as two arcs that don't quite meet
  const loaf = [[14, 48], [22, 38], [40, 33], [58, 35], [72, 43], [78, 50], [70, 58], [52, 63], [32, 62], [18, 56], [14, 48]];
  let d = `M ${j(loaf[0][0])},${j(loaf[0][1])}`;
  for (let k = 1; k < loaf.length; k++) d += ` L ${j(loaf[k][0])},${j(loaf[k][1])}`;
  paths.push(d);
  // the split down the crust
  paths.push(`M ${j(24)},${j(46)} L ${j(38)},${j(44)} L ${j(52)},${j(46)} L ${j(66)},${j(48)}`);
  // pocks
  for (const [x, y] of [[30, 52], [44, 55], [58, 54]]) paths.push(`M ${j(x)},${j(y)} L ${j(x + 2)},${j(y + 1)}`);
  // steam, two wisps that wander
  const ph = i / 8 * Math.PI * 2;
  for (const [x0, a] of [[36, 0], [54, 2.1]]) {
    let s = `M ${j(x0)},${j(28)}`;
    for (let k = 1; k <= 4; k++) {
      const y = 28 - k * 5.5;
      const x = x0 + Math.sin(ph + a + k * 1.1) * 3.5;
      s += ` L ${j(x)},${j(y)}`;
    }
    paths.push(s);
  }
  return `<g id="frame${i}">${paths.map((p) => `<path d="${p}"/>`).join('')}</g>`;
}

export class Loader {
  constructor(el) {
    this.el = el;
    this.spinner = el.querySelector('.spinner');
    const rnd = math.seeded(7);
    let frames = '';
    for (let i = 0; i < 8; i++) frames += frame(rnd, i);
    this.spinner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 90 90">${frames}</svg>`;
    this.state = { opacity: 0 };
    this.shown = false;
    this.spinner.style.opacity = '0';
    this.el.hidden = true;
  }
  show() {
    this.shown = true;
    this.el.hidden = false;
    createTween(this.state, { to: { opacity: 1 }, ease: 'power2.inOut', duration: 0.5, onUpdate: () => { this.spinner.style.opacity = this.state.opacity; } });
  }
  hide() {
    if (!this.shown) return;
    this.shown = false;
    createTween(this.state, { to: { opacity: 0 }, ease: 'power2.inOut', duration: 0.5, onUpdate: () => { this.spinner.style.opacity = this.state.opacity; }, onComplete: () => { if (!this.shown) this.el.hidden = true; } });
  }
}
