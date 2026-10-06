// A scene that owns its camera and runs a list of callbacks once per frame, right
// before its matrices are computed for rendering. Objects that follow the camera — the
// title, the button — register there, so they read the camera after it has moved and
// before anything is drawn.

import * as THREE from 'three';
import { BaseCamera, OrbitCamera } from './camera.js';
import { renderInfo } from '../core/ticker.js';
import { global } from './global.js';

export class BaseScene extends THREE.Scene {
  constructor({ orbit = false, fov = 45 } = {}) {
    super();
    this.camera = orbit ? new OrbitCamera(fov) : new BaseCamera(fov);
    this.beforeRenderCbs = [];
    this.___disposed = false;
    this.__frame = -1;
    this.ready = new Promise((r) => { this.isReady = r; });
  }
  /** Runs the camera and the per-frame callbacks exactly once per frame. */
  updateMatrixWorld(force) {
    if (this.__frame !== renderInfo.frame) {
      this.__frame = renderInfo.frame;
      this.camera._resize();
      this.camera._update();
      this.camera.updateMatrixWorld();
      for (const cb of this.beforeRenderCbs) cb();
    }
    super.updateMatrixWorld(force);
  }
  /** Compile every shader and draw one frame off-screen, so the first visible frame is not a stall. */
  async upload() {
    const r = global.renderer;
    this.updateMatrixWorld(true);
    r.compile(this, this.camera);
    r.setRenderTarget(global.uploadRT);
    r.render(this, this.camera);
    r.setRenderTarget(null);
  }
  dispose() {
    this.___disposed = true;
    this.beforeRenderCbs = [];
    this.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u.value && u.value.isTexture && !u.value.userData.shared) u.value.dispose();
        m.dispose();
      }
    });
    this.clear();
  }
}
