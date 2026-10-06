// The sky: one sphere, inside out, a gradient from apricot at the horizon to a dusty
// teal overhead, brushed warm where the sun sits. It is also the far wall of the
// outline pass — anything against it gets a silhouette line.

import * as THREE from 'three';
import { skyMaterial } from '../render/materials.js';

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), skyMaterial());
    this.mesh.name = 'Sky';
    this.mesh.scale.setScalar(4);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
    scene.add(this.mesh);
    this.ready = Promise.resolve();
  }
}
