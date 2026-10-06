// What drifts in the air over the city at the end of a September day: poplar fluff,
// a little ash from the bakeries, dust caught in the low sun. Points with a sprite
// sheet of scribbles, turning in stepped time, fading in with the intro and slowly
// wheeling round as the planet arrives.

import * as THREE from 'three';
import { speckMaterial } from '../render/materials.js';
import { spriteSheet } from '../render/textures.js';
import { createTween } from '../core/tween.js';
import { math } from '../core/math.js';

export class Specks {
  constructor(scene, { count = 520 } = {}) {
    this.scene = scene;
    const rnd = math.seeded(31);
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // a shell around the planet, thicker where it will be seen against the sky
      const r = 52 + rnd() * 48;
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(th) * s * r; pos[i * 3 + 1] = u * r * 0.9; pos[i * 3 + 2] = Math.sin(th) * s * r;
      col[i * 3] = rnd(); col[i * 3 + 1] = rnd(); col[i * 3 + 2] = rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.mesh = new THREE.Points(g, speckMaterial(spriteSheet()));
    this.mesh.name = 'Specks';
    this.mesh.renderOrder = 1;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.ready = Promise.resolve();
  }
  playInAnimation(delay = 0) {
    createTween(this.mesh.material.uniforms.uShow, { from: { value: 0 }, to: { value: 1 }, duration: 2, delay, ease: 'sine.inOut' });
    this.mesh.rotation.y = -Math.PI * 0.75;
    createTween(this.mesh.rotation, { to: { y: 0 }, duration: 4, delay: delay + 0.5, ease: 'inOut3' });
  }
}
