// Behind the planet: the ridges of the Trialeti range and the Saguramo hills that close
// Tbilisi in on every side, a bank of low cloud, and the sun going down over the
// western ridge. Flat cards, eaten into silhouettes by noise, always turned to face
// the camera so the orbit never sees them edge-on.

import * as THREE from 'three';
import { backdropMaterial } from '../render/materials.js';
import { createTween } from '../core/tween.js';
import { math } from '../core/math.js';

export class Backdrop {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Backdrop';
    this.cards = [];
    this.material = backdropMaterial();
    const rnd = math.seeded(1201);
    const add = (kind, w, h, r, angle, y, seed) => {
      const g = new THREE.PlaneGeometry(w, h, 1, 1);
      const k = new Float32Array(g.attributes.position.count).fill(kind + seed * 0.001);
      g.setAttribute('kind', new THREE.BufferAttribute(k, 1));
      const m = new THREE.Mesh(g, this.material);
      m.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      m.frustumCulled = false;
      m.renderOrder = 4;
      this.group.add(m);
      this.cards.push(m);
      return m;
    };
    // ridges all round, their crests just under the planet's horizon, their feet lost in haze
    for (let i = 0; i < 8; i++) add(0, 120 + rnd() * 40, 70, 150 + rnd() * 30, i / 8 * Math.PI * 2 + rnd() * 0.3, -58 + rnd() * 8, i);
    // a few wisps of low cloud
    for (let i = 0; i < 4; i++) add(2, 60 + rnd() * 30, 12, 175 + rnd() * 20, i / 4 * Math.PI * 2 + 0.6 + rnd() * 0.4, -8 + rnd() * 18, i + 20);
    // the sun, where the light comes from
    this.sun = add(1, 44, 44, 330, Math.atan2(0, 1), 150, 40);
    this.sun.position.set(300, 170, 0);
    scene.add(this.group);
    scene.beforeRenderCbs.push(this.update.bind(this));
    this.ready = Promise.resolve();
  }
  update() {
    const cam = this.scene.camera;
    for (const c of this.cards) {
      c.lookAt(cam.position.x, c.position.y, cam.position.z);
    }
    this.sun.lookAt(cam.position);
  }
  playInAnimation(delay = 0) {
    createTween(this.material.uniforms.uShow, { from: { value: 0 }, to: { value: 1 }, duration: 3, delay, ease: 'sine.out' });
  }
}
