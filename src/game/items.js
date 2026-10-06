// Things that change hands, and things that float over heads.
//
// The deliveries are small procedural objects — a letter, a note, a postcard, a bundle
// of clothes, a box, a basket with bread and a bottle, a wet letter in a jar — that fly
// into the courier's bag in a little arc when a townsperson hands them over. The emojis
// are ten small signs that pop up over the courier's head, spin, and fade, on a
// throttle, with a sound at each end — the original's emoji wheel, with Tbilisi's
// vocabulary: a khinkali, a loaf of shoti, a candle for the power cuts.

import * as THREE from 'three';
import { Builder, ELEM } from '../intro/geo.js';
import { toonMaterial } from '../render/materials.js';
import { createTween } from '../core/tween.js';
import { events } from '../core/events.js';
import { math } from '../core/math.js';
import { renderInfo } from '../core/ticker.js';

const _v0 = new THREE.Vector3(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();

function itemGeometry(kind, rnd) {
  const b = new Builder();
  const a = (id) => Builder.aux(0, rnd(), 0, id);
  switch (kind) {
    case 'note': b.box(0.24, 0.3, 0.02, '#f6efdc', a(0.4)); b.box(0.16, 0.02, 0.022, '#3a2723', a(0.5), { y: 0.2 }); b.box(0.14, 0.02, 0.022, '#3a2723', a(0.5), { y: 0.14 }); b.box(0.1, 0.02, 0.022, '#3a2723', a(0.5), { y: 0.08 }); break;
    case 'letter': b.box(0.3, 0.2, 0.03, '#f3e7cf', a(0.4)); b.tri([-0.15, 0.2, 0.016], [0.15, 0.2, 0.016], [0, 0.09, 0.016], Builder.color('#e3d2ad'), a(0.42)); b.box(0.06, 0.06, 0.034, '#c25a3a', a(0.45), { y: 0.07 }); break;
    case 'postcard': b.box(0.3, 0.2, 0.02, '#f6efdc', a(0.4)); b.box(0.26, 0.12, 0.022, '#6f9fb0', a(0.46), { y: 0.06 }); b.box(0.26, 0.05, 0.023, '#c9a94f', a(0.47), { y: 0.025 }); b.box(0.1, 0.06, 0.023, '#f6efdc', a(0.4), { x: 0.06, y: 0.12 }); break;
    case 'clothes': b.box(0.32, 0.1, 0.24, '#8fb4c9', a(0.4)); b.box(0.3, 0.09, 0.22, '#f1e9d6', a(0.41), { y: 0.1 }); b.box(0.28, 0.08, 0.2, '#b45a3c', a(0.42), { y: 0.19 }); b.box(0.02, 0.3, 0.26, '#5a3a22', a(0.5)); b.box(0.34, 0.02, 0.02, '#5a3a22', a(0.5), { y: 0.27 }); break;
    case 'samplebox': b.box(0.34, 0.26, 0.26, '#c9a06a', a(0.4)); b.box(0.06, 0.27, 0.27, '#e8d9b8', a(0.43)); b.box(0.35, 0.05, 0.27, '#e8d9b8', a(0.43), { y: 0.21 }); b.box(0.16, 0.08, 0.004, '#f6efdc', a(0.44), { y: 0.1, z: 0.132 }); break;
    case 'offering': b.box(0.36, 0.16, 0.24, '#b48a5a', a(0.4)); b.box(0.38, 0.03, 0.26, '#8a6a3a', a(0.41), { y: 0.15 }); b.box(0.2, 0.08, 0.12, '#d9b57a', a(0.46), { x: -0.06, y: 0.16, z: 0.02 }); b.cylinder(0.035, 0.18, 6, '#f6efdc', a(0.47), { x: 0.1, y: 0.16, z: -0.04 }); b.blob(0.02, 0, '#ffb347', a(0.48), { x: 0.1, y: 0.36, z: -0.04, jitter: 0, rnd }); b.cylinder(0.045, 0.16, 6, '#3f7f8f', a(0.49), { x: 0.12, y: 0.16, z: 0.06 }); break;
    case 'letterwet': b.cylinder(0.08, 0.26, 8, '#8fc4c6', a(0.4)); b.cylinder(0.05, 0.05, 8, '#5a3a22', a(0.41), { y: 0.26 }); b.box(0.09, 0.16, 0.01, '#e8dcc0', a(0.44), { y: 0.05 }); break;
    default: b.box(0.2, 0.2, 0.2, '#ffffff', a(0.4));
  }
  return b.build();
}

export const EMOJIS = ['heart', 'laugh', 'sad', 'question', 'bang', 'khinkali', 'shoti', 'candle', 'note', 'star'];
export const EMOJI_LABELS = { heart: 'გული', laugh: 'სიცილი', sad: 'სევდა', question: 'კითხვა', bang: 'ვაი!', khinkali: 'ხინკალი', shoti: 'შოთი', candle: 'სანთელი', note: 'სიმღერა', star: 'ვარსკვლავი' };

function emojiGeometry(kind, rnd) {
  const b = new Builder();
  const a = (id) => Builder.aux(0, rnd(), 0, id);
  const face = (color) => { b.cylinder(0.17, 0.05, 14, color, a(0.4), { y: -0.025 }); b.box(0.03, 0.05, 0.06, '#1b1b1b', a(0.5), { x: 0.06, y: 0.02, z: 0.02 }); b.box(0.03, 0.05, 0.06, '#1b1b1b', a(0.5), { x: -0.06, y: 0.02, z: 0.02 }); };
  switch (kind) {
    case 'heart': b.blob(0.1, 1, '#c93a4a', a(0.4), { x: 0.07, y: 0.08, jitter: 0.05, rnd }); b.blob(0.1, 1, '#c93a4a', a(0.4), { x: -0.07, y: 0.08, jitter: 0.05, rnd }); b.cone(0.17, 0.2, 4, '#c93a4a', a(0.4), { y: -0.14 }); b.push(new THREE.Matrix4().makeRotationX(Math.PI)); b.pop(); break;
    case 'laugh': face('#f3c258'); b.box(0.14, 0.03, 0.06, '#1b1b1b', a(0.5), { y: 0.02, z: -0.07 }); b.box(0.1, 0.05, 0.06, '#c25a3a', a(0.5), { y: 0.02, z: -0.1 }); break;
    case 'sad': face('#8fb4c9'); b.box(0.12, 0.025, 0.06, '#1b1b1b', a(0.5), { y: 0.02, z: -0.08 }); b.box(0.03, 0.06, 0.03, '#5f8fa3', a(0.5), { x: 0.06, y: 0.02, z: -0.03 }); break;
    case 'question': b.box(0.07, 0.07, 0.07, '#f6efdc', a(0.4), { y: -0.17 }); b.box(0.07, 0.14, 0.07, '#f6efdc', a(0.4), { y: -0.07 }); b.box(0.18, 0.07, 0.07, '#f6efdc', a(0.4), { y: 0.07, x: -0.05 }); b.box(0.07, 0.14, 0.07, '#f6efdc', a(0.4), { x: -0.11, y: 0.0 }); b.box(0.07, 0.07, 0.07, '#f6efdc', a(0.4), { y: -0.3 }); break;
    case 'bang': b.box(0.08, 0.28, 0.08, '#c25a3a', a(0.4), { y: -0.1 }); b.box(0.08, 0.08, 0.08, '#c25a3a', a(0.4), { y: -0.24 }); break;
    case 'khinkali': b.blob(0.14, 1, '#f1e4c8', a(0.4), { y: 0, jitter: 0.12, sy: 0.8, rnd }); b.cone(0.07, 0.12, 6, '#e8d9b8', a(0.41), { y: 0.1, rTop: 0.04 }); break;
    case 'shoti': b.blob(0.16, 1, '#d9a85a', a(0.4), { jitter: 0.1, sy: 0.4, rnd }); b.box(0.24, 0.02, 0.02, '#8a5a2a', a(0.5), { y: 0.06 }); break;
    case 'candle': b.cylinder(0.05, 0.26, 7, '#f6efdc', a(0.4), { y: -0.2 }); b.blob(0.035, 0, '#ffb347', a(0.48), { y: 0.1, jitter: 0, rnd }); b.cylinder(0.08, 0.03, 8, '#8a6a3a', a(0.41), { y: -0.21 }); break;
    case 'note': b.box(0.04, 0.26, 0.04, '#1b1b1b', a(0.4), { x: 0.06, y: -0.1 }); b.cylinder(0.07, 0.05, 8, '#1b1b1b', a(0.4), { x: 0.0, y: -0.14 }); b.box(0.14, 0.04, 0.04, '#1b1b1b', a(0.4), { x: 0.13, y: 0.14 }); break;
    case 'star': for (let i = 0; i < 5; i++) { b.push(new THREE.Matrix4().makeRotationZ(i / 5 * Math.PI * 2)); b.cone(0.07, 0.2, 4, '#f3c258', a(0.4), { y: 0 }); b.pop(); } b.cylinder(0.07, 0.04, 8, '#f3c258', a(0.4), { y: -0.02 }); break;
    default: b.box(0.2, 0.2, 0.2, '#ffffff', a(0.4));
  }
  return b.build();
}

export class Items {
  constructor(scene) {
    this.scene = scene;
    this.rnd = math.seeded(404);
    this.material = toonMaterial({ normals: true, noiseScale: 2.0, breakAt: 0.05, shadeV: 0.62 });
    this.geos = {};
    this.emojiGeos = {};
    // the thing being handed over
    this.give = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), this.material);
    this.give.visible = false; this.give.castShadow = true; this.give.frustumCulled = false;
    this.give.name = 'Delivery';
    scene.add(this.give);
    this.anim = { value: 0 };
    // emojis over the head
    this.emojiMeshes = [];
    this.lastEmoji = -1e9;
    events.on('quest_receive_model', this.receive, this);
    events.on('quest_give_model', this.giveAway, this);
    events.on('emoji_pop', this.pop, this);
  }
  geometry(kind) { if (!this.geos[kind]) this.geos[kind] = itemGeometry(kind, this.rnd); return this.geos[kind]; }
  receive(kind) { this.show(kind, 'receive'); }
  giveAway(kind) { this.show(kind, 'give'); }
  /** The arc: from a point in front of the courier to their chest (receive), or the reverse. */
  show(kind, mode = 'receive') {
    this.give.geometry = this.geometry(kind);
    const p = this.scene.player;
    const up = _v0.copy(p.position).normalize();
    const from = p.position.clone().addScaledVector(up, 1.0).addScaledVector(p.heading, 0.9).addScaledVector(_v1.crossVectors(up, p.heading), -0.1);
    createTween(this.anim, {
      from: { value: 0 }, to: { value: 1 }, duration: mode === 'give' ? 0.5 : 1.15, ease: 'sine.inOut',
      onStart: () => { this.give.visible = true; },
      onUpdate: () => {
        const up2 = _v0.copy(p.position).normalize();
        const to = _v2.copy(p.position).addScaledVector(up2, 0.8).addScaledVector(p.heading, 0.1);
        const t = this.anim.value;
        if (mode === 'receive') this.give.position.lerpVectors(from, to, t); else this.give.position.lerpVectors(to, from, t);
        this.give.position.addScaledVector(up2, Math.pow(4 * t * (1 - t), 1) * 0.15);
        const s = math.fit(t, 0, 0.1, 0, 1) * math.fit(t, 0.9, 1, 1, 0);
        this.give.scale.setScalar(s);
        this.give.quaternion.copy(p.object.quaternion).premultiply(_q.setFromAxisAngle(up2, renderInfo.time * 3));
      },
      onComplete: () => { this.give.visible = false; },
    });
  }
  pop(kind) {
    if (!EMOJIS.includes(kind)) return;
    if (renderInfo.time - this.lastEmoji < 0.35) return;
    this.lastEmoji = renderInfo.time;
    if (!this.emojiGeos[kind]) this.emojiGeos[kind] = emojiGeometry(kind, this.rnd);
    const m = new THREE.Mesh(this.emojiGeos[kind], this.material);
    m.frustumCulled = false; m.castShadow = false;
    m.userData.life = 0; m.userData.seed = Math.random();
    this.scene.add(m);
    this.emojiMeshes.push(m);
    events.emit('play_audio', `emoji-starts${1 + Math.floor(Math.random() * 3)}`);
    // the courier reacts a little
    this.scene.player.puppet.squash = 0.5;
  }
  update(dt) {
    const p = this.scene.player;
    const up = _v0.copy(p.position).normalize();
    for (let i = this.emojiMeshes.length - 1; i >= 0; i--) {
      const m = this.emojiMeshes[i];
      m.userData.life += dt / 2.6;
      const life = m.userData.life;
      if (life >= 1) { this.scene.remove(m); this.emojiMeshes.splice(i, 1); events.emit('play_audio', `emoji-ends${1 + Math.floor(Math.random() * 3)}`); continue; }
      const s = math.smoothstep(0, 0.15, life) * math.smoothstep(1, 0.7, life) * 1.6;
      m.scale.setScalar(s);
      m.position.copy(p.position).addScaledVector(up, 1.45 + life * 0.5 + Math.sin(life * 9 + m.userData.seed * 6) * 0.03);
      m.quaternion.copy(p.object.quaternion).premultiply(_q.setFromAxisAngle(up, renderInfo.time * 1.5 + m.userData.seed * 32));
    }
  }
  dispose() { events.off('quest_receive_model', this.receive, this); events.off('quest_give_model', this.giveAway, this); events.off('emoji_pop', this.pop, this); }
}
