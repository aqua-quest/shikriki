// Pigeons over the old town, in loose groups, chasing points along a tilted ring
// around the planet. Each bird is a spring toward its target with noise on the
// velocity and friction, so a group frays and regathers; the wings flap in the shader.

import * as THREE from 'three';
import { birdMaterial } from '../render/materials.js';
import { createTween } from '../core/tween.js';
import { math, noise3 } from '../core/math.js';
import { renderInfo } from '../core/ticker.js';

const _m = new THREE.Matrix4(), _f = new THREE.Vector3(), _u = new THREE.Vector3(), _r = new THREE.Vector3(), _t = new THREE.Vector3(), _p = new THREE.Vector3();

function birdGeometry() {
  const g = new THREE.BufferGeometry();
  // a body diamond and two wings, wing length along z
  const v = [
    // left wing
    0.18, 0, 0, -0.22, 0, 0, 0.02, 0.02, -1.0,
    // right wing
    -0.22, 0, 0, 0.18, 0, 0, 0.02, 0.02, 1.0,
    // body
    0.32, 0, 0, -0.3, 0.02, -0.08, -0.3, 0.02, 0.08,
    0.32, 0, 0, -0.3, -0.02, 0.08, -0.3, -0.02, -0.08,
  ];
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

export class Birds {
  constructor(scene, { count = 15, groups = 5, radius = 35.5, speed = 1.5, noise = 0.4, tilt = 0.55 } = {}) {
    this.scene = scene;
    this.count = count;
    this.speed = speed;
    this.noiseAmt = noise;
    this.radius = radius;
    this.axis = new THREE.Vector3(Math.sin(tilt), Math.cos(tilt), 0.25).normalize();
    this.base = new THREE.Vector3(1, 0, 0).projectOnPlane(this.axis).normalize();
    this.side = new THREE.Vector3().crossVectors(this.axis, this.base).normalize();
    const rnd = math.seeded(77);
    this.birds = [];
    for (let i = 0; i < count; i++) {
      const group = Math.floor(rnd() * groups);
      this.birds.push({
        offset: group / groups * Math.PI * 2 + (rnd() - 0.5) * 0.25,
        speed: speed * (rnd() < 0.3 ? 0.75 : 1),
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), seed: rnd() * 100,
        snapped: false,
      });
    }
    this.mesh = new THREE.InstancedMesh(birdGeometry(), birdMaterial(), count);
    this.mesh.name = 'Birds';
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);
    scene.beforeRenderCbs.push(this.update.bind(this));
    this.ready = Promise.resolve();
  }
  /** A point on the flight ring: a circle around the axis with a slow vertical wobble. */
  curve(t, out) {
    const a = t;
    out.copy(this.base).multiplyScalar(Math.cos(a)).addScaledVector(this.side, Math.sin(a));
    out.addScaledVector(this.axis, Math.sin(a * 3.0 + 0.7) * 0.12 + Math.sin(a * 5.0) * 0.05);
    return out.normalize().multiplyScalar(this.radius * (1 + Math.sin(a * 2.0) * 0.04));
  }
  update() {
    const ratio = renderInfo.ratio, time = renderInfo.time;
    for (let i = 0; i < this.count; i++) {
      const b = this.birds[i];
      const progress = time * b.speed * 0.12 + b.offset;
      this.curve(progress, _t);
      if (!b.snapped) { b.pos.copy(_t); b.vel.set(0, 0, 0); b.snapped = true; }
      const n = 0.005 * this.noiseAmt * ratio * 4;
      b.vel.x += noise3(b.pos.x * 0.1, b.pos.y * 0.1 + b.seed, time * 0.05) * n;
      b.vel.y += noise3(b.pos.y * 0.1 + b.seed * 2, b.pos.z * 0.1, time * 0.1) * n;
      b.vel.z += noise3(b.pos.z * 0.1, b.pos.x * 0.1 + b.seed * 3, time * 0.025) * n;
      _p.subVectors(_t, b.pos).multiplyScalar(0.0012 * 4);
      b.vel.addScaledVector(_p, ratio);
      b.vel.multiplyScalar(math.frictionFPS(0.985));
      b.pos.addScaledVector(b.vel, ratio);
      // orient: forward along velocity, up away from the planet
      _f.copy(b.vel);
      if (_f.lengthSq() < 1e-6) _f.subVectors(_t, b.pos);
      _f.normalize();
      _u.copy(b.pos).normalize();
      _r.crossVectors(_f, _u).normalize();
      _u.crossVectors(_r, _f).normalize();
      _m.makeBasis(_f, _u, _r);
      _m.setPosition(b.pos);
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  playInAnimation(delay = 0) {
    this.mesh.material.uniforms.uShow.value = 0;
    createTween(this.mesh.material.uniforms.uShow, { to: { value: 1 }, delay, duration: 2, ease: 'none' });
  }
}
