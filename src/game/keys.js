// Keyboard state, read each frame by the controls, plus keydown/keyup on the bus for
// the dialog box and the menus.

import { events } from '../core/events.js';

const down = new Set();

export const keys = {
  isDown(code) { return down.has(code); },
  any(...codes) { return codes.some((c) => down.has(c)); },
  clear() { down.clear(); },
};

window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (!down.has(e.code)) events.emit('keydown', e);
  down.add(e.code);
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') e.preventDefault();
});
window.addEventListener('keyup', (e) => { down.delete(e.code); events.emit('keyup', e); });
window.addEventListener('blur', () => down.clear());
