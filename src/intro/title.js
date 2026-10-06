// The title: ᲨᲘᲙᲠᲘᲙᲘ, seven slab letters in three rows, two–three–two, hanging in the
// air in front of the planet. Each letter is its own object with a resting pose it
// springs back to. Hovering one makes it swell and settle; sweeping the pointer across
// one flips it a half turn on the axis you crossed it on, with an elastic settle and a
// little chime. They pop in from the centre one after another, spinning, when the menu
// arrives. A random stepped rotation every third of a second keeps them boiling like
// a hand-drawn title card.

import * as THREE from 'three';
import { toonMaterial } from '../render/materials.js';
import { glyphGeometry, layout } from './text.js';
import { MeshInteraction } from '../core/interaction.js';
import { createTween } from '../core/tween.js';
import { events } from '../core/events.js';
import { touches } from '../core/touches.js';
import { math } from '../core/math.js';
import { client } from '../core/client.js';

const SCALE = 0.0069;                 // font units → world
const CELL_W = 5.35, CELL_H = 6.9;
const ENAMEL = ['#3f7f8f', '#c25a3a', '#d9a441', '#6f8f5a', '#b56576', '#4a6fa5', '#8c6b4f'];

const _v0 = new THREE.Vector3(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m0 = new THREE.Matrix4();

export class Title {
  constructor(scene, { text = 'ᲨᲘᲙᲠᲘᲙᲘ', rows = [2, 3, 2], subtitle = 'ᲗᲑᲘᲚᲘᲡᲘ · 1995' } = {}) {
    this.scene = scene;
    this.text = text;
    this.rows = rows;
    this.subtitle = subtitle;
    this.baseOffset = 2;
    this.objs = [];
    this.hovering = false;
    this.hoveredObj = null;
    this.lastPosition = { x: 0, y: 0 };
    this.deltaAccum = { x: 0, y: 0 };
    this.updateCamPosition = true;
    this.camPosition = new THREE.Vector3();
    this.ready = new Promise((r) => { this.isReady = r; });
    this.init();
  }
  init() {
    this.group = new THREE.Group(); this.group.name = 'Title Group';
    this.groupHit = new THREE.Group(); this.groupHit.name = 'Title Hit Group';
    this.letters = [];
    this.hits = [];
    const chars = [...this.text];
    let idx = 0;
    const nRows = this.rows.length;
    this.rows.forEach((n, r) => {
      for (let i = 0; i < n; i++) {
        const ch = chars[idx];
        const geometry = glyphGeometry(ch, { depth: 320, bevel: 26, curveSegments: 7, id: 0.1 + idx * 0.02 }).clone().scale(SCALE, SCALE, SCALE);
        geometry.computeBoundingBox();
        const material = toonMaterial({
          color: '#f6ecd6', normals: true, boil: 0.03, boilRate: 3, shadows: false, breakAt: 0.1, noiseScale: 0.6,
          shadeV: 0.7, shadeHue: -0.03,
          uniforms: { uSideColor: { value: new THREE.Color(ENAMEL[idx % ENAMEL.length]) } },
          declarations: 'uniform vec3 uSideColor;',
          fragmentBody: 'if (elem > 0.5) color = uSideColor; else color = uColor;',
        });
        material.uniforms.uSeed.value = idx * 3.7 + 0.5;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `Letter ${ch}`;
        mesh.frustumCulled = false;
        mesh.userData.index = idx;
        this.group.add(mesh);
        this.letters.push(mesh);
        // the invisible box the pointer actually hits
        const bb = geometry.boundingBox;
        const size = new THREE.Vector3().subVectors(bb.max, bb.min);
        const hit = new THREE.Mesh(new THREE.BoxGeometry(size.x + 0.5, size.y + 0.7, size.z + 0.6), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.copy(bb.min).add(bb.max).multiplyScalar(0.5);
        hit.userData.index = idx;
        const holder = new THREE.Group();
        holder.add(hit);
        this.groupHit.add(holder);
        this.hits.push(hit);
        const h = {
          holder, mesh,
          __finalPosition: { x: 0, y: 0, z: 0 }, __position: { x: 0, y: 0, z: 0 },
          __finalRotation: { x: 0, y: 0 }, __rotation: { x: 0, y: 0 },
          __scale: { value: 1 }, __animRotation: { x: 0, y: 0 }, __animScale: { value: 1 },
        };
        h.__position.x = (i - (n - 1) / 2) * CELL_W;
        h.__position.y = (r - (nRows - 1) / 2) * -CELL_H;
        h.__finalPosition.x = h.__position.x; h.__finalPosition.y = h.__position.y;
        this.objs.push(h);
        idx++;
      }
    });
    // the line under it
    if (this.subtitle) {
      const l = layout(this.subtitle, { depth: 140, bevel: 12, curveSegments: 5, id: 0.3, letterSpacing: 40 });
      const subMat = toonMaterial({
        color: '#f6ecd6', normals: true, boil: 0.02, boilRate: 3, shadows: false, breakAt: 0.0, noiseScale: 0.6, shadeV: 0.7,
        uniforms: { uSideColor: { value: new THREE.Color('#6b4a3a') } },
        declarations: 'uniform vec3 uSideColor;',
        fragmentBody: 'if (elem > 0.5) color = uSideColor; else color = uColor;',
      });
      this.subGroup = new THREE.Group();
      const s = SCALE * 0.28;
      for (const letter of l.letters) {
        if (!letter.geometry) continue;
        const m = new THREE.Mesh(letter.geometry, subMat);
        m.position.x = letter.x * s;
        m.scale.setScalar(s);
        m.frustumCulled = false;
        this.subGroup.add(m);
      }
      this.subGroup.position.y = -(nRows - 1) / 2 * CELL_H - 4.6;
      this.subGroup.scale.setScalar(0);
      this.group.add(this.subGroup);
    }
    this.scene.add(this.group);
    this.scene.add(this.groupHit);
    this.scene.beforeRenderCbs.push(this.update.bind(this));
    this.interaction = new MeshInteraction({ meshes: this.hits, camera: this.scene.camera, interactWhileTouching: true, onMove: this.move, onHover: this.hover, onTouch: this.touch, ctx: this });
    this.isReady();
  }
  /** Sit 45 units in front of the camera, a little above its aim, facing it. */
  _follow(group, offset) {
    const cam = this.scene.camera;
    if (this.updateCamPosition) this.camPosition.copy(cam.position);
    _v0.copy(cam.target).sub(this.camPosition).normalize();
    _v1.copy(this.camPosition).addScaledVector(_v0, 45);
    group.position.copy(_v1);
    _v0.subVectors(this.camPosition, cam.target);
    if (_v0.lengthSq() === 0) _v0.z = 1;
    _v0.normalize();
    _v1.crossVectors(cam.up, _v0);
    if (_v1.lengthSq() === 0) { if (Math.abs(cam.up.z) === 1) _v0.x += 1e-4; else _v0.z += 1e-4; _v0.normalize(); _v1.crossVectors(cam.up, _v0); }
    _v1.normalize();
    _v2.crossVectors(_v0, _v1);
    group.position.addScaledVector(_v2, offset);
    group.quaternion.setFromRotationMatrix(_m0.lookAt(this.camPosition, cam.target, _v0.set(0, 1, 0)));
    group.updateMatrixWorld();
  }
  update() {
    if (this.scene.___disposed) return;
    this._follow(this.group, this.baseOffset);
    this.groupHit.position.copy(this.group.position);
    this.groupHit.quaternion.copy(this.group.quaternion);
    this.groupHit.scale.copy(this.group.scale);
    this.groupHit.updateMatrixWorld();
    for (const o of this.objs) {
      const m = o.mesh;
      m.position.set(o.__finalPosition.x, o.__finalPosition.y, o.__finalPosition.z);
      m.rotation.set(o.__finalRotation.x + o.__animRotation.x, o.__finalRotation.y + o.__animRotation.y, 0);
      m.scale.setScalar(o.__scale.value * o.__animScale.value);
      o.holder.position.copy(m.position); o.holder.rotation.copy(m.rotation); o.holder.scale.copy(m.scale);
    }
    this.group.updateMatrixWorld(true);
    this.groupHit.updateMatrixWorld(true);
    this.updateDelta();
  }
  updateDelta() {
    const t = touches.get(0);
    const dx = t.position.x - this.lastPosition.x, dy = -(t.position.y - this.lastPosition.y);
    this.deltaAccum.x += dx; this.deltaAccum.y += dy;
    this.lastPosition.x = t.position.x; this.lastPosition.y = t.position.y;
    const f = math.frictionFPS(0.4);
    this.deltaAccum.x *= f; this.deltaAccum.y *= f;
  }
  touch(e) {
    if (e.action === 'touch_start') {
      this.lastPosition.x = e.event.position.x; this.lastPosition.y = e.event.position.y;
      this.deltaAccum.x = 0; this.deltaAccum.y = 0;
      this.move(e);
    } else {
      this.updateDelta();
      if (this.hovering) this.hover({ action: 'hover_out' });
    }
  }
  move(e) { this.hovering = true; this.hoveredObj = e.interactions[0].index; }
  hover(e) {
    if (e.action === 'hover_in') {
      this.hovering = true;
      this.hoveredObj = e.interactions[0].index;
      const o = this.objs[this.hoveredObj];
      createTween(o.__scale, { to: { value: 1.05 }, duration: 0.2, ease: 'power2.out', onComplete: () => {
        createTween(o.__scale, { to: { value: 1 }, duration: 0.75, ease: 'elastic.out(1, 0.6)' });
      } });
      return;
    }
    this.hovering = false;
    // which way did the pointer cross it? that is the axis it flips on
    const axis = Math.abs(this.deltaAccum.x) > Math.abs(this.deltaAccum.y) ? 'x' : 'y';
    const s = Math.sign(this.deltaAccum[axis] * (axis === 'y' ? -1 : 1));
    if (s === 0 || this.hoveredObj === null) return;
    const o = this.objs[this.hoveredObj];
    let dirMul = 1;
    if (axis === 'x') dirMul = math.makeAnglePositive(o.__rotation.x) > 0.1 ? -1 : 1;
    const rot = axis === 'x' ? 'y' : 'x';
    o.__rotation[rot] += Math.PI * s * dirMul;
    const diff = o.__rotation[rot] - o.mesh.rotation[rot];
    o.__finalRotation[rot] = math.makeAnglePositive(o.mesh.rotation[rot]);
    o.__rotation[rot] = o.__finalRotation[rot] + diff;
    o.__rotation[rot] = Math.round(o.__rotation[rot] / Math.PI) * Math.PI;
    createTween(o.__finalRotation, { to: rot === 'x' ? { x: o.__rotation[rot] } : { y: o.__rotation[rot] }, duration: 2.5, ease: `elastic.out(1,${(0.5 + Math.random() * 0.3).toFixed(2)})` });
    createTween(o.__scale, { to: { value: 0.9 }, duration: 0.4, ease: 'power2.out', onComplete: () => {
      createTween(o.__scale, { to: { value: 1 }, duration: 1, ease: 'elastic.out(1, 0.6)' });
    } });
    events.emit('play_audio', `rune${Math.floor(Math.random() * 3 + 1)}`);
  }
  playInAnimation(delay = 0) {
    this.objs.forEach((o, i) => {
      o.__animScale.value = 0;
      const d = delay + 0.075 * i;
      createTween(o.__animScale, { from: { value: 0 }, to: { value: 1 }, duration: 3, delay: d, ease: 'elastic.out(1, 0.75)' });
      createTween(o.__animRotation, { from: { x: (Math.random() - 0.5) * Math.PI * 2, y: (Math.random() - 0.5) * Math.PI * 2 }, to: { x: 0, y: 0 }, duration: 3, delay: d, ease: 'elastic.out(1, 0.75)' });
      createTween(o.__finalPosition, { from: { x: 0, y: 0, z: 0 }, to: { x: o.__position.x, y: o.__position.y, z: o.__position.z }, duration: 3, delay: d, ease: 'elastic.out(1, 0.75)' });
    });
    if (this.subGroup) {
      createTween(this.subGroup.scale, { from: { x: 0, y: 0, z: 0 }, to: { x: 1, y: 1, z: 1 }, duration: 2.5, delay: delay + 0.075 * this.objs.length + 0.2, ease: 'elastic.out(1, 0.7)' });
    }
  }
  playOutAnimation() { this.updateCamPosition = false; }
  resize() {
    // the widest row must fit the screen: Georgian letters are wide, and a phone is narrow
    const cam = this.scene.camera;
    const vh = 2 * 45 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) / cam.zoom;
    const vw = vh * (client.screen.w / client.screen.h);
    const rowWidth = 3 * CELL_W + 1.6;
    const fit = vw * 0.9 / rowWidth;
    const s = Math.min(this.scene.mobileLayout ? 1.2 : 1, fit);
    this.group.scale.setScalar(s);
  }
}
