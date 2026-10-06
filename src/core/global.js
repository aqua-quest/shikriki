// The renderer, the canvas, and the uniforms every material shares: time, the frame
// ratio and the resolution. Also the adaptive pixel ratio, which lowers the render
// resolution when the frame rate sags and raises it back when it recovers.

import * as THREE from 'three';
import { events } from './events.js';
import { client } from './client.js';
import { touches } from './touches.js';
import { renderInfo, addToTicker, startTicker, onAverageFPS } from './ticker.js';

export const global = {
  renderer: null,
  canvas: null,
  container: null,
  maxDPR: 1,
  dpr: 1,
  uniforms: {
    time: { value: 0 },
    dtRatio: { value: 1 },
    resolution: { value: new THREE.Vector2(1, 1) },
    lightDir: { value: new THREE.Vector3(0.7, 0.7, 0).normalize() },
  },
  uploadRT: null,
  adaptiveDPR: null,

  async init({ container, DPR = 1, shadowMap = true, adaptiveDPR = true } = {}) {
    THREE.ColorManagement.enabled = false;
    this.container = container;
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, stencil: false, depth: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = shadowMap;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 1);
    this.renderer = renderer;
    this.canvas = renderer.domElement;
    this.canvas.id = 'c';
    container.appendChild(this.canvas);
    this.maxDPR = DPR;
    this.dpr = DPR;
    this.uploadRT = new THREE.WebGLRenderTarget(4, 4, { count: 2, type: THREE.HalfFloatType, depthBuffer: true });
    this._resize();
    events.on('resize', this._resize, this);
    touches.init(container);

    addToTicker(() => {
      this.uniforms.time.value = renderInfo.time;
      this.uniforms.dtRatio.value = renderInfo.ratio;
      events.emit('prerender', renderInfo);
      events.emit('render', renderInfo);
      events.emit('postrender', renderInfo);
    }, 0);

    if (adaptiveDPR) this.adaptiveDPR = makeAdaptiveDPR(this);
    startTicker({ timer: client.timerLoop });
  },

  _resize() {
    const w = client.screen.w, h = client.screen.h;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, true);
    this.uniforms.resolution.value.set(Math.round(w * this.dpr), Math.round(h * this.dpr));
    events.emit('resize_renderer', this.uniforms.resolution.value);
  },
  setDPR(d) {
    if (Math.abs(d - this.dpr) < 0.01) return;
    this.dpr = d;
    this._resize();
  },
};

function makeAdaptiveDPR(g) {
  let active = false, low = 0, high = 0;
  onAverageFPS((fps) => {
    if (!active) return;
    if (fps < 42) { low++; high = 0; if (low >= 2) { g.setDPR(Math.max(0.6, g.dpr * 0.85)); low = 0; } }
    else if (fps > 57) { high++; low = 0; if (high >= 5 && g.dpr < g.maxDPR) { g.setDPR(Math.min(g.maxDPR, g.dpr * 1.1)); high = 0; } }
    else { low = 0; high = 0; }
  });
  return { start() { active = true; low = 0; high = 0; }, stop() { active = false; } };
}
