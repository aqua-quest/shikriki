// The warm haze that sits over Tbilisi on a still evening — dust, sulfur from the
// baths, wood smoke — as a shell around the planet that only shows at the rim.

import * as THREE from 'three';
import { atmosphereMaterial } from '../render/materials.js';
import { createTween } from '../core/tween.js';

export class Atmosphere {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(38, 32, 32), atmosphereMaterial());
    this.mesh.name = 'Haze';
    this.mesh.renderOrder = 5;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.ready = Promise.resolve();
  }
  playInAnimation(delay = 0) {
    createTween(this.mesh.material.uniforms.uShow, { from: { value: 0 }, to: { value: 1 }, duration: 2.5, delay, ease: 'sine.out' });
  }
}
