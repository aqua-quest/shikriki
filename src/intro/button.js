// The button: a blue enamel street plate, the kind screwed beside every doorway in
// Tbilisi, with ᲓᲐᲬᲧᲔᲑᲐ ("begin") on it in white — or ᲨᲔᲡᲕᲚᲐ ("enter") once a game has
// been started. It floats below the title. Hovering it with a mouse gives it a tiny
// jolt and a tick; sweeping across it turns it a quarter turn on its long axis, with an
// elastic settle and a mechanical clunk, while the letters wipe out and back in, in
// steps. Pressing it squashes it. Clicking it starts the game: it spins away and the
// camera dives toward the city.

import * as THREE from 'three';
import { toonMaterial } from '../render/materials.js';
import { layout } from './text.js';
import { MeshInteraction } from '../core/interaction.js';
import { createTween, createDelayedCall } from '../core/tween.js';
import { events } from '../core/events.js';
import { storage } from '../core/storage.js';
import { client } from '../core/client.js';

const _v0 = new THREE.Vector3(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m0 = new THREE.Matrix4();
const PLATE_W = 10.4, PLATE_H = 3.0, PLATE_R = 0.7;

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export class Button {
  constructor(scene) {
    this.scene = scene;
    this.baseOffset = 0;
    this.hoverRotation = 0;
    this.rotation = { value: 0 };
    this.animRotation = { value: 0 };
    this.finalRotation = { value: 0 };
    this.baseScale = 1;
    this.scaleMultiplier = { value: 1 };
    this.updateCamPosition = true;
    this.camPosition = new THREE.Vector3();
    this.ready = new Promise((r) => { this.isReady = r; });
    this.init();
  }
  init() {
    // the plate: a rounded slab as deep as it is tall, so a quarter turn shows an identical face
    const geo = new THREE.ExtrudeGeometry(roundedRect(PLATE_W, PLATE_H, PLATE_R), { depth: PLATE_H, bevelEnabled: true, bevelThickness: 0.28, bevelSize: 0.26, bevelSegments: 3, curveSegments: 8 });
    geo.translate(0, 0, -PLATE_H / 2);
    geo.computeVertexNormals();
    const n = geo.attributes.position.count, aux = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { aux[i * 4] = 0; aux[i * 4 + 1] = 0; aux[i * 4 + 2] = 0; aux[i * 4 + 3] = 0.45; }
    geo.setAttribute('aux', new THREE.BufferAttribute(aux, 4));
    this.material = toonMaterial({
      color: '#1f4f8f', normals: true, boil: 0.02, boilRate: 3, shadows: false, breakAt: 0.0, noiseScale: 0.5, shadeV: 0.68, shadeHue: 0.02,
      uniforms: { uHover: { value: 0 } },
      declarations: 'uniform float uHover;',
      vertexBody: /* glsl */`
        pos *= 1.0 - 0.05 * uHover;
        pos += (hash31(uSeed * 5.0 + 1.0) - 0.5) * 0.25 * uHover;
      `,
      fragmentBody: /* glsl */`
        // a white enamel border inset from every face's edge, in that face's own frame
        vec3 an = abs(normalize(vNormalW));
        vec3 lp = vPosL;
        float bw = ${(PLATE_W / 2 - 0.5).toFixed(2)};
        float bh = ${(PLATE_H / 2 - 0.42).toFixed(2)};
        float u = abs(lp.x) / bw;
        float v = (an.z > an.y ? abs(lp.y) : abs(lp.z)) / bh;
        float edge = max(u, v);
        float border = step(0.88, edge) * step(edge, 1.0);
        // chips in the enamel, where the paint has gone
        float chip = step(0.86, tn.r) * step(0.5, tn.b);
        color = mix(color, vec3(0.93, 0.92, 0.88), border);
        color = mix(color, vec3(0.62, 0.6, 0.58), chip * step(1.0, edge + 0.3) * 0.9);
        surfaceId += border * 0.2;
      `,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = 'Button';
    this.mesh.frustumCulled = false;

    // the text, one mesh per letter so each wipes on its own count
    const text = storage.get('started') ? 'ᲨᲔᲡᲕᲚᲐ' : 'ᲓᲐᲬᲧᲔᲑᲐ';
    const S = 0.0019;
    const l = layout(text, { depth: 120, bevel: 10, curveSegments: 5, id: 0.6, letterSpacing: 36 });
    const shared = { uShow: { value: 1 }, uHide: { value: 0 }, uHover: { value: 0 }, uLetterH: { value: 900 }, uClip: { value: 470 } };
    const textMat = (color, side) => toonMaterial({
      color, normals: true, boil: 0.02, boilRate: 3, shadows: false, breakAt: 0.0, noiseScale: 0.5, shadeV: 0.75,
      uniforms: { ...shared, uSideColor: { value: new THREE.Color(side) } },
      declarations: 'uniform float uHide, uHover, uLetterH, uClip; uniform vec3 uSideColor; varying float vSlide;',
      vertexBody: /* glsl */`
        float lseed = aux.y;
        float stepsShow = floor(3.0 + hash11(lseed * 3.1 + 0.2) * 2.0);
        float trShow = floor(falloff(lseed, 0.0, 1.0, 1.5, uShow) * stepsShow) / stepsShow;
        float trHide = floor(falloff(lseed, 0.0, 1.0, 1.5, uHide) * stepsShow) / stepsShow;
        vSlide = (1.0 - trShow) + trHide;
        pos.y += uLetterH * vSlide;
        pos *= 1.0 - 0.05 * uHover;
      `,
      fragmentBody: /* glsl */`
        if (vPosL.y > uClip || vPosL.y < -uClip) discard;
        if (elem > 0.5) color = uSideColor; else color = uColor;
      `,
    });
    this.textMaterial = textMat('#f7f1e4', '#b9b3a6');
    this.shadowMaterial = textMat('#12305c', '#12305c');
    this.text = new THREE.Group();
    this.text.name = 'Button text';
    const count = l.letters.length;
    l.letters.forEach((letter, i) => {
      if (!letter.geometry) return;
      const g = letter.geometry.clone();
      // aux.y carries the letter's place in the word, which staggers the wipe
      const a = g.attributes.aux;
      for (let k = 0; k < a.count; k++) a.setY(k, count > 1 ? i / (count - 1) : 0);
      const m = new THREE.Mesh(g, this.textMaterial);
      m.position.set(letter.x * S, 0, 0);
      m.scale.setScalar(S);
      m.frustumCulled = false;
      this.text.add(m);
      const sh = new THREE.Mesh(g, this.shadowMaterial);
      sh.position.set(letter.x * S + 0.06, -0.06, -0.12);
      sh.scale.setScalar(S);
      sh.frustumCulled = false;
      this.text.add(sh);
    });

    this.groupAnim = new THREE.Group(); this.groupAnim.name = 'Button Animation Group';
    this.groupAnim.add(this.mesh); this.groupAnim.add(this.text);
    this.group = new THREE.Group(); this.group.name = 'Button Group';
    this.group.add(this.groupAnim);
    this.scene.add(this.group);
    this.scene.beforeRenderCbs.push(this.update.bind(this));
    this.interaction = new MeshInteraction({ meshes: [this.mesh], camera: this.scene.camera, onHover: this.hover, onTouch: this.touch, onClick: this.click, hoverCursor: true, ctx: this });
    this.isReady();
  }
  hover(e) {
    const mu = this.material.uniforms, tu = this.textMaterial.uniforms;
    if (e.action === 'hover_in') {
      mu.uSeed.value = Math.random();
      if (e.event.input !== 'mouse') return;
      createTween(mu.uHover, { to: { value: 1 }, duration: 0.07, ease: 'none', onComplete: () => { mu.uSeed.value = Math.random(); createTween(mu.uHover, { to: { value: 0 } }); } });
      createTween(tu.uHover, { to: { value: 1 }, duration: 0.07, ease: 'none', onComplete: () => { createTween(tu.uHover, { to: { value: 0 } }); } });
      events.emit('play_audio', 'hover2');
      return;
    }
    const s = Math.sign(e.event.delta11.y);
    if (s === 0) return;
    this.hoverRotation -= Math.PI * 0.5 * s;
    createTween(this.rotation, { to: { value: this.hoverRotation }, duration: 1.5, ease: 'elastic.out(1, 0.9)' });
    createTween(tu.uShow, { to: { value: 1 } });
    createTween(tu.uHide, { to: { value: 1 }, duration: 0.05, ease: 'none', onComplete: () => {
      createTween(tu.uHide, { to: { value: 0 }, delay: 0.14 });
      createTween(tu.uShow, { from: { value: 0 }, to: { value: 1 }, delay: 0.14, duration: 0.2, ease: 'none' });
    } });
    events.emit('play_audio', 'button-turn');
  }
  touch(e) {
    const down = e.action === 'touch_start';
    createTween(this.scaleMultiplier, { to: { value: down ? 0.95 : 1 }, duration: 0.02, ease: 'none' });
    events.emit('play_audio', `click${down ? 2 : 3}`);
  }
  click() { events.emit('switch_to_present_scene'); }
  update() {
    if (this.scene.___disposed) return;
    const cam = this.scene.camera;
    if (this.updateCamPosition) this.camPosition.copy(cam.position);
    _v0.copy(cam.target).sub(this.camPosition).normalize();
    _v1.copy(this.camPosition).addScaledVector(_v0, 45);
    this.group.position.copy(_v1);
    _v0.subVectors(this.camPosition, cam.target);
    if (_v0.lengthSq() === 0) _v0.z = 1;
    _v0.normalize();
    _v1.crossVectors(cam.up, _v0);
    if (_v1.lengthSq() === 0) { if (Math.abs(cam.up.z) === 1) _v0.x += 1e-4; else _v0.z += 1e-4; _v0.normalize(); _v1.crossVectors(cam.up, _v0); }
    _v1.normalize();
    _v2.crossVectors(_v0, _v1);
    this.finalRotation.value = this.rotation.value + this.animRotation.value;
    this.mesh.rotation.set(this.finalRotation.value, 0, 0);
    const s = this.baseScale * this.scaleMultiplier.value;
    this.group.scale.setScalar(s);
    this.group.position.addScaledVector(_v2, this.baseOffset);
    this.group.quaternion.setFromRotationMatrix(_m0.lookAt(this.camPosition, cam.target, _v0.set(0, 1, 0)));
    this.group.updateMatrixWorld(true);
  }
  playInAnimation(delay = 0) {
    this.groupAnim.scale.setScalar(0);
    createTween(this.groupAnim.scale, { to: { x: 1, y: 1, z: 1 }, duration: 3.25, delay, ease: 'elastic.out(1, 0.9)' });
    this.groupAnim.rotation.x = -Math.PI;
    createTween(this.groupAnim.rotation, { to: { x: 0 }, duration: 3.25, delay, ease: 'elastic.out(1, 0.5)' });
  }
  spinOut() {
    createTween(this.groupAnim.rotation, { to: { x: this.groupAnim.rotation.x - Math.PI * 2 }, duration: 1.5, ease: 'inOut1' });
    createDelayedCall(0.3, () => events.emit('play_audio', 'button-out'));
  }
  playOutAnimation() { this.updateCamPosition = false; }
  resize() {
    this.text.scale.setScalar(1.3);
    this.text.position.set(0, -0.25 * 1.3, PLATE_H / 2 + 0.2);
    // a phone gets a bigger plate, but never wider than the screen
    const cam = this.scene.camera;
    const vh = 2 * 45 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) / cam.zoom;
    const vw = vh * (client.screen.w / client.screen.h);
    const fit = vw * 0.88 / (PLATE_W + 1);
    this.baseScale = Math.min(this.scene.mobileLayout ? 1.5 : 1, fit);
    this.baseOffset = this.scene.mobileLayout ? -16 : -13.5;
  }
}
