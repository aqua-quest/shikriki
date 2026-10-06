// What the page knows about the device it runs on.

import { events } from './events.js';

const params = new URLSearchParams(location.search);

function webgl2Available() {
  try { const c = document.createElement('canvas'); return !!(window.WebGL2RenderingContext && c.getContext('webgl2')); } catch { return false; }
}

const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const cores = navigator.hardwareConcurrency || 4;
const memory = navigator.deviceMemory || 8;

export const client = {
  params,
  screen: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 },
  capabilities: { webgl2: webgl2Available(), touch },
  // phones and small tablets get the lighter planet and no side effects they cannot afford
  lowMemoryDevice: params.has('low') || (touch && (cores <= 4 || memory <= 4)),
  devScene: params.has('dev'),
  timerLoop: params.has('timer'),
  get portrait() { return this.screen.w < this.screen.h; },
};

function onResize() {
  // a viewport mid-change can report zero for a frame; a zero-sized canvas never comes back
  if (!window.innerWidth || !window.innerHeight) return;
  client.screen.w = window.innerWidth;
  client.screen.h = window.innerHeight;
  client.screen.dpr = window.devicePixelRatio || 1;
  events.emit('resize', client.screen);
}
window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', () => setTimeout(onResize, 60));
