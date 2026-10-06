// The Leghvtakhevi waterfall, which really does pour out of a gorge behind the sulfur
// baths in the middle of Old Tbilisi. A ribbon of stepped noise and a splash of rings
// where it meets the water.

import * as THREE from 'three';
import { waterfallMaterial } from '../render/materials.js';

export class Waterfall {
  /** `top` and `bottom` are world points; `normal` is the planet normal at the bottom. */
  constructor(parent, top, bottom, normal, { width = 1.1 } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'Waterfall';
    const mat = waterfallMaterial();
    const dir = new THREE.Vector3().subVectors(bottom, top);
    const len = dir.length();
    const ribbon = new THREE.PlaneGeometry(width, len, 1, 10);
    // bend the ribbon slightly outward so it reads as a curtain, not a wall
    const pos = ribbon.attributes.position;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / len + 0.5; pos.setZ(i, Math.sin(y * Math.PI) * 0.15); }
    ribbon.computeVertexNormals();
    const m = new THREE.Mesh(ribbon, mat);
    // stand it along the fall direction, its face toward the outside of the planet
    const up = dir.clone().normalize().negate();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    m.quaternion.copy(q);
    // then spin it about that axis so its face aligns with the planet normal
    const face = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const target = normal.clone().projectOnPlane(up).normalize();
    const angle = Math.atan2(face.clone().cross(target).dot(up), face.dot(target));
    m.rotateOnAxis(new THREE.Vector3(0, 1, 0), angle);
    m.position.copy(top).add(bottom).multiplyScalar(0.5);
    m.frustumCulled = false;
    this.group.add(m);

    const splash = new THREE.Mesh(new THREE.CircleGeometry(width * 0.9, 18), mat);
    splash.position.copy(bottom).addScaledVector(normal, 0.05);
    splash.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    this.group.add(splash);
    parent.add(this.group);
  }
}
