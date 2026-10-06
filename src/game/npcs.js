// The townsfolk: twenty-odd people, a dog and a cat, placed by district. Each is a
// puppet with a name, a look, something to say, and a way of standing — idle, walking a
// little loop, sitting on a step, working with the hands. Within a few steps they turn
// to face the courier and a tag floats up over their head; a click, E or Space starts
// the conversation. The ones with a delivery to give or receive wear the delivery's
// colour on their tag until their part is done.

import * as THREE from 'three';
import { Puppet } from './rig.js';
import { Builder, ELEM, standOn } from '../intro/geo.js';
import { toonMaterial } from '../render/materials.js';
import { glyphGeometry } from '../intro/text.js';
import { offset, riverWidth, HILLS, LAKE, RW } from '../intro/planet.js';
import { events } from '../core/events.js';
import { touches } from '../core/touches.js';
import { math } from '../core/math.js';
import { renderInfo } from '../core/ticker.js';
import { createTween } from '../core/tween.js';

const _v0 = new THREE.Vector3(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
const TALK_DISTANCE = 2.6;

// positions are (river parameter, bank, angle from the river) — the planet's own coordinates
export const ROSTER = [
  { id: 'office-worker', name: 'მოსიარულე კაცი', at: [0.17, -1, 0.09], look: { hair: 0, top: 4, bottom: 2, shoes: 3, skin: 1 }, behaviour: 'walk', lines: ['ბოდიში, ლანჩზე ვარ.'], voice: 'male2', color: '#66BDE6' },
  { id: 'office-worker-2', name: 'ბანკის თანამშრომელი', at: [0.13, -1, 0.07], look: { hair: 0, top: 4, bottom: 2, shoes: 3, skin: 0, glasses: true }, lines: ['უფროსი ასოცირებული აღმასრულებელი ვიცე-დირექტორი...', 'კარგად ჟღერს, არა?'], voice: 'male3', color: '#c25959', icon: true },
  { id: 'chef', name: 'დუქნის მეპატრონე', at: [0.075, -1, 0.045], look: { hair: 8, top: 10, bottom: 2, shoes: 1, skin: 2, beard: true }, behaviour: 'work', lines: ['ჩემი გოგო არ გინახავს? სახლში უნდა ყოფილიყო უკვე...'], voice: 'male2', color: '#66BDE6' },
  { id: 'caveman', name: 'აბანოში დამალული კაცი', at: [0.022, -1, 0.062], look: { hair: 2, top: 3, bottom: 3, shoes: 2, skin: 1, beard: true }, behaviour: 'sit', lines: ['ალბათ ავადმყოფობის ფურცელი ავიღო...'], voice: 'male3', color: '#f3c258', icon: true },
  { id: 'boss', name: 'დირექტორი', at: [0.1, -1, 0.125], look: { hair: 7, top: 5, bottom: 2, shoes: 3, skin: 3 }, lines: ['ოჰ...'], voice: 'male1', color: '#c25959', icon: true, talkDistance: 2.2 },
  { id: 'flower-lady', name: 'ყვავილების გამყიდველი', at: [0.135, -1, 0.055], look: { hair: 9, top: 9, bottom: 4, shoes: 2, skin: 0 }, lines: ['ტიტებს ყვავილობა დრო სჭირდება.'], voice: 'female2', color: '#f3c258', icon: true },
  { id: 'scout', name: 'ბიჭი', at: [0.21, -1, 0.19], look: { hair: 1, top: 0, bottom: 3, shoes: 0, skin: 1 }, height: 0.72, lines: ['მგონი მამაჩემი მეძახის...'], voice: 'female3', color: '#66BDE6' },
  { id: 'threekid', name: 'კომპიუტერის გოგო', at: [0.15, -1, 0.1], look: { hair: 3, top: 8, bottom: 0, shoes: 0, skin: 0, glasses: true }, height: 0.8, lines: ['გამარჯობა.', 'გსმენია რაღაცის შესახებ, რასაც ინტერნეტი ჰქვია?', 'ალბათ ხალხმა ჯერ არ იცის...', 'ამბობენ, კომპიუტერით წერილის გაგზავნა შეიძლება.', 'შიკრიკი აღარ დაგჭირდება!'], voice: 'female3', color: '#66BDE6' },
  { id: 'factory-worker-a', name: 'ქარხნის მუშა', at: [0.47, -1, 0.17], look: { hair: 4, top: 11, bottom: 2, shoes: 1, skin: 2 }, lines: ['ტვირთი შემოდის... ტვირთი გადის...'], voice: 'male1', color: '#66BDE6', icon: true },
  { id: 'factory-worker-b', name: 'ტენგო', at: [0.5, -1, 0.22], look: { hair: 6, top: 0, bottom: 1, shoes: 0, skin: 1 }, behaviour: 'walk', lines: ['ახალი ბიჭი ისევ აგვიანებს.'], voice: 'male1', color: '#66BDE6' },
  { id: 'female-scientist', name: 'დოქტორი ნინო', at: [0.45, 1, 0.17], look: { hair: 3, top: 10, bottom: 2, shoes: 3, skin: 0, glasses: true }, lines: ['აქ ავაშენებთ... აქაც... და აქაც...'], voice: 'female1', color: '#66BDE6', icon: true },
  { id: 'factory-worker-c', name: 'გეთავე', at: [0.455, 1, 0.19], look: { hair: 5, top: 11, bottom: 7, shoes: 1, skin: 3 }, behaviour: 'work', talkEnabled: false, lines: [''], voice: 'male1', color: '#66BDE6' },
  { id: 'alien', name: 'ფერმკრთალი კაცი', at: [0.23, -1, 0.33], look: { hair: 8, top: 1, bottom: 7, shoes: 3, skin: 4 }, lines: ['მგონი სადღაც მინახიხარ...'], voice: 'wtf', color: '#66BDE6' },
  { id: 'male-scientist', name: 'დოქტორი გია', at: [0.2, -1, 0.17], look: { hair: 7, top: 6, bottom: 5, shoes: 3, skin: 1, glasses: true, beard: true }, lines: ['ჯერ ველოსიპედის ბორბლის რადიუსი უნდა გამოვთვალო...'], voice: 'male3', color: '#66BDE6', icon: true },
  { id: 'diver', name: 'მეთევზე ვანო', at: LAKE, look: { hair: 4, top: 2, bottom: 5, shoes: 5, skin: 2, beard: true }, behaviour: 'sit', lines: ['აბა, გაიღე...'], voice: 'male3', color: '#de794e', icon: true, talkDistance: 2.2 },
  { id: 'mountainman', name: 'ბერი', at: 'peak', look: { hair: 8, top: 5, bottom: 7, shoes: 1, skin: 1, beard: true }, lines: ['გესმის ეს ხმა? სიჩუმე...', 'ზარებიც არის, მაგრამ ძირითადად სიჩუმე...'], voice: 'male3', color: '#8cc48c', icon: true },
  { id: 'oldwoman', name: 'ბებო', at: [0.06, 1, 0.09], look: { hair: 9, top: 2, bottom: 4, shoes: 6, skin: 0 }, height: 0.86, lines: ['ფეხები აღარ მემორჩილება.'], voice: 'female1', color: '#8cc48c', icon: true },
  { id: 'musician', name: 'დათო მუსიკოსი', at: [0.03, -1, 0.1], look: { hair: 2, top: 1, bottom: 0, shoes: 0, skin: 1 }, behaviour: 'work', lines: ['ეს სიმღერა გსმენია?'], voice: 'male2', color: '#de794e', icon: true },
  { id: 'seeds', name: 'მზესუმზირის ბებო', at: [0.16, -1, 0.07], look: { hair: 9, top: 6, bottom: 4, shoes: 6, skin: 2 }, height: 0.84, behaviour: 'sit', lines: ['მზესუმზირა! ერთი ჭიქა — ერთი კუპონი.'], voice: 'female1', color: '#66BDE6' },
  { id: 'gasman', name: 'ბალონების კაცი', at: [0.11, 1, 0.08], look: { hair: 4, top: 2, bottom: 2, shoes: 1, skin: 3, beard: true }, behaviour: 'walk', lines: ['გაზი! ბალონები! ვინ იცვლის?'], voice: 'male1', color: '#66BDE6' },
  { id: 'ballkid', name: 'ბურთიანი ბიჭი', at: [0.47, -1, 0.24], look: { hair: 1, top: 0, bottom: 3, shoes: 0, skin: 2 }, height: 0.7, lines: ['თამაშობ? ჩვენ ერთი გვაკლია!'], voice: 'female3', color: '#66BDE6' },
  { id: 'dog', name: 'ძაღლი', at: [0.085, -1, 0.06], kind: 'dog', talkEnabled: false, lines: [''], voice: 'male1', color: '#66BDE6' },
  { id: 'cat', name: 'კატა', at: [0.05, -1, 0.065], kind: 'cat', talkEnabled: false, lines: [''], voice: 'male1', color: '#66BDE6' },
];

const animalMat = () => toonMaterial({ normals: true, noiseScale: 2.0, breakAt: 0.08, shadeV: 0.62 });
function animal(kind, rnd) {
  const g = new THREE.Group();
  const b = new Builder();
  const a = (id) => Builder.aux(0, rnd(), 0, id);
  const c = kind === 'dog' ? '#c9a06a' : '#5a5a58';
  if (kind === 'dog') {
    b.box(0.42, 0.2, 0.18, c, a(0.3), { y: 0.22 });
    b.box(0.18, 0.16, 0.16, c, a(0.3), { x: 0.26, y: 0.3 });
    b.box(0.06, 0.1, 0.03, c, a(0.3), { x: 0.3, y: 0.42, z: 0.06 }); b.box(0.06, 0.1, 0.03, c, a(0.3), { x: 0.3, y: 0.42, z: -0.06 });
    b.box(0.03, 0.03, 0.03, '#1b1b1b', a(0.5), { x: 0.36, y: 0.34, z: 0 });
    for (const [x, z] of [[0.15, 0.06], [0.15, -0.06], [-0.15, 0.06], [-0.15, -0.06]]) b.box(0.06, 0.22, 0.06, c, a(0.3), { x, y: 0, z });
    b.box(0.04, 0.04, 0.2, c, a(0.3), { x: -0.24, y: 0.3, z: 0 });
  } else {
    b.box(0.3, 0.16, 0.14, c, a(0.3), { y: 0.16 });
    b.box(0.14, 0.13, 0.13, c, a(0.3), { x: 0.2, y: 0.22 });
    b.cone(0.03, 0.06, 4, c, a(0.3), { x: 0.24, y: 0.33, z: 0.04 }); b.cone(0.03, 0.06, 4, c, a(0.3), { x: 0.24, y: 0.33, z: -0.04 });
    b.box(0.025, 0.02, 0.02, '#9ad26b', a(0.5), { x: 0.27, y: 0.26, z: 0.03 }); b.box(0.025, 0.02, 0.02, '#9ad26b', a(0.5), { x: 0.27, y: 0.26, z: -0.03 });
    for (const [x, z] of [[0.1, 0.05], [0.1, -0.05], [-0.1, 0.05], [-0.1, -0.05]]) b.box(0.05, 0.16, 0.05, c, a(0.3), { x, y: 0, z });
    b.box(0.03, 0.03, 0.22, c, a(0.3), { x: -0.2, y: 0.22, z: 0.0 });
  }
  const m = new THREE.Mesh(b.build(), animalMat());
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  g.rotation.y = Math.PI / 2;   // built facing +x, turned to face +z like the puppets
  return g;
}

export class Townsperson {
  constructor(scene, data, index) {
    this.scene = scene;
    this.id = data.id;
    this.data = data;
    this.name = data.name;
    this.color = data.color;
    this.voice = data.voice;
    this.lines = data.lines;
    this.talkEnabled = data.talkEnabled !== false;
    this.talkDistance = data.talkDistance || TALK_DISTANCE;
    this.behaviour = data.behaviour || 'idle';
    this.questTexts = null; this.questExtra = null; this.questRef = null;
    this.questEnabled = false;
    this.talking = false;
    this.near = false;
    this.rnd = math.seeded(100 + index * 7);
    const T = scene.planet.terrain;
    // where they stand
    let dir;
    if (data.at === 'peak') dir = HILLS[0].dir.clone();
    else if (data.at === LAKE) dir = LAKE.dir.clone();
    else dir = offset(data.at[0], data.at[1], riverWidth(data.at[0]) + data.at[2]);
    // nudge out of buildings
    dir = this._findFreeSpot(dir);
    this.home = T.surface(dir, new THREE.Vector3());
    if (data.at === LAKE) { this.home.copy(dir).multiplyScalar(Math.max(T.height(dir), RW + 0.02)); }
    this.position = this.home.clone();
    this.heading = new THREE.Vector3();
    const up = _v0.copy(dir);
    this.heading.set(up.y, -up.x, 0); if (this.heading.lengthSq() < 1e-6) this.heading.set(0, up.z, -up.y); this.heading.normalize();
    this.restHeading = this.heading.clone();
    // the body
    this.object = new THREE.Group();
    this.object.name = `NPC ${data.id}`;
    if (data.kind) { this.puppet = null; this.body = animal(data.kind, this.rnd); this.object.add(this.body); }
    else {
      this.puppet = new Puppet(data.look, { seed: 50 + index, height: data.height || (0.92 + this.rnd() * 0.12) });
      this.object.add(this.puppet);
      this.puppet.play(this.behaviour === 'sit' ? 'sit' : this.behaviour === 'work' ? 'work' : this.behaviour === 'walk' ? 'walk' : 'idle', { fade: 0, offset: this.rnd() * 2 });
    }
    scene.add(this.object);
    // the hit box for clicks
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.position.y = 0.55;
    this.hit.userData.npc = this;
    this.object.add(this.hit);
    // the tag over the head
    this._makeIcon();
    // a loop to walk
    if (this.behaviour === 'walk') {
      this.path = [];
      const n = 8, r = 2.2 + this.rnd() * 1.2;
      const e1 = new THREE.Vector3().copy(this.heading), e2 = new THREE.Vector3().crossVectors(dir, e1).normalize();
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        const d = dir.clone().addScaledVector(e1, Math.cos(a) * r / 30).addScaledVector(e2, Math.sin(a) * r / 30).normalize();
        this.path.push(T.surface(this._findFreeSpot(d), new THREE.Vector3()));
      }
      this.pathT = this.rnd() * n;
    }
    this.updateTransform();
  }
  _findFreeSpot(dir) {
    const T = this.scene.planet.terrain;
    const all = [...this.scene.planet.accepted.map((a) => ({ pos: a.pos, r: a.r * 0.8 + 0.5 })), ...this.scene.planet.landmarks.map((l) => ({ pos: l.pos, r: l.r + 0.5 }))];
    let d = dir.clone();
    for (let k = 0; k < 12; k++) {
      const p = T.surface(d, new THREE.Vector3());
      let pushed = false;
      for (const o of all) {
        _v1.subVectors(p, o.pos);
        if (_v1.lengthSq() > (o.r + 2) * (o.r + 2)) continue;
        _v1.addScaledVector(d, -_v1.dot(d));
        const dist = _v1.length();
        if (dist < o.r) { d.addScaledVector(_v1.normalize(), (o.r - dist + 0.1) / 30).normalize(); pushed = true; }
      }
      if (!pushed) break;
    }
    return d;
  }
  _makeIcon() {
    const g = glyphGeometry('!', { depth: 200, bevel: 20, curveSegments: 5, id: 0.6 });
    if (!g) return;
    const geo = g.clone(); geo.scale(0.0006, 0.0006, 0.0006);
    this.iconMat = toonMaterial({ color: this.color, normals: true, shadows: false, breakAt: 0, noiseScale: 1, shadeV: 0.7, uniforms: { uSideColor: { value: new THREE.Color('#3a2723') } }, declarations: 'uniform vec3 uSideColor;', fragmentBody: 'if (elem > 0.5) color = uSideColor; else color = uColor;' });
    this.icon = new THREE.Mesh(geo, this.iconMat);
    this.icon.frustumCulled = false;
    this.icon.position.y = 1.45;
    this.icon.scale.setScalar(0.001);
    this.iconScale = { value: 0 };
    this.icon.visible = false;
    this.object.add(this.icon);
  }
  /** Quest engine hooks. */
  setQuestTexts(texts, extra, quest) { this.questTexts = texts; this.questExtra = extra; this.questRef = quest; }
  enableQuest() { this.questEnabled = true; }
  disableQuest() { this.questEnabled = false; this.questTexts = null; }
  get currentTexts() { return this.questEnabled && this.questTexts ? this.questTexts : this.lines; }

  updateTransform() {
    const up = _v0.copy(this.position).normalize();
    this.object.position.copy(this.position);
    _v1.crossVectors(up, this.heading).normalize();
    _m.makeBasis(_v1, up, this.heading);
    this.object.quaternion.setFromRotationMatrix(_m);
  }
  update(dt, player) {
    const up = _v0.copy(this.position).normalize();
    const toPlayer = _v1.subVectors(player.position, this.position);
    const dist = toPlayer.length();
    toPlayer.addScaledVector(up, -toPlayer.dot(up));
    const wasNear = this.near;
    this.near = this.talkEnabled && dist < this.talkDistance;
    if (this.near !== wasNear) events.emit('npc_near', this, this.near);
    // face the courier when close, otherwise where they were
    const faceTarget = (this.near || this.talking) && toPlayer.lengthSq() > 1e-4 ? toPlayer.clone().normalize() : (this.behaviour === 'walk' ? this.heading : this.restHeading);
    if (this.behaviour !== 'walk' || this.near || this.talking) {
      this.heading.lerp(faceTarget, 1 - Math.exp(-dt * 6));
      this.heading.addScaledVector(up, -this.heading.dot(up)).normalize();
    }
    if (this.puppet) {
      if (this.talking) this.puppet.play(this.talkPhase === 'talk' ? 'talk' : 'idleTalk', { fade: 0.3 });
      else if (this.behaviour === 'walk' && !this.near) this.puppet.play('walk', { fade: 0.3, rate: 0.9 });
      else if (this.behaviour === 'sit') this.puppet.play('sit', { fade: 0.3 });
      else if (this.behaviour === 'work' && !this.near) this.puppet.play('work', { fade: 0.3 });
      else if (this.behaviour === 'walk' && this.near) this.puppet.play('idle', { fade: 0.3 });
      else if (this.behaviour === 'idle' && this.id === 'threekid' && this.near) this.puppet.play('wave', { fade: 0.3 });
      else if (!this.near) this.puppet.play('idle', { fade: 0.3 });
      else this.puppet.play('idle', { fade: 0.3 });
      this.puppet.headTarget = (this.near || this.talking) ? player.position.clone().addScaledVector(_v2.copy(player.position).normalize(), 0.95) : null;
      this.puppet.update(dt);
    }
    // the walkers
    if (this.behaviour === 'walk' && !this.near && !this.talking) {
      const n = this.path.length;
      this.pathT = (this.pathT + dt * 0.45) % n;
      const i = Math.floor(this.pathT), f = this.pathT - i;
      const a = this.path[i], b = this.path[(i + 1) % n];
      _v2.lerpVectors(a, b, f);
      const dirMove = _v2.clone().sub(this.position);
      this.position.copy(_v2);
      dirMove.addScaledVector(up, -dirMove.dot(up));
      if (dirMove.lengthSq() > 1e-8) this.heading.lerp(dirMove.normalize(), 0.3).normalize();
    }
    // the tag
    if (this.icon) {
      const show = this.questEnabled && !this.talking && dist < 20;
      const target = show ? (this.near ? 1.0 : 0.55) : 0;
      this.iconScale.value = math.lerp(this.iconScale.value, target, 1 - Math.exp(-dt * 6));
      this.icon.visible = this.iconScale.value > 0.02;
      const s = this.iconScale.value * (1 + 0.08 * Math.sin(renderInfo.time * 4));
      this.icon.scale.setScalar(Math.max(0.001, s));
      this.icon.position.y = (this.puppet ? this.puppet.heightScale * 1.25 : 0.6) + 0.2 + 0.05 * Math.sin(renderInfo.time * 3 + this.rnd() * 0);
      this.icon.rotation.y = Math.sin(renderInfo.time * 1.5) * 0.4;
      this.icon.lookAt(player.position);
      this.icon.rotateY(Math.PI);
    }
    this.updateTransform();
  }
  dispose() { this.scene.remove(this.object); }
}

export class Townsfolk {
  constructor(scene) {
    this.scene = scene;
    this.list = ROSTER.map((d, i) => new Townsperson(scene, d, i));
    this.byId = Object.fromEntries(this.list.map((n) => [n.id, n]));
    this.raycaster = new THREE.Raycaster();
    this.hits = this.list.filter((n) => n.talkEnabled).map((n) => n.hit);
    this.ready = Promise.resolve();
    this.nearest = null;
    events.on('quest_enable_id', this.onEnable, this);
    events.on('quest_disable_id', this.onDisable, this);
    events.on('touch_click', this.onClick, this);
    events.on('keydown', this.onKey, this);
    // the engine hands out the quest lines
    for (const n of this.list) events.emit('quest_step_texts_check', n);
  }
  onEnable(id) { const n = this.byId[id]; if (n) { n.enableQuest(); events.emit('quest_step_texts_check', n); } }
  onDisable(id) { const n = this.byId[id]; if (n) n.disableQuest(); }
  onClick(t) {
    if (!this.scene.entered || this.scene.ui.busy) return;
    this.raycaster.setFromCamera(t.position11, this.scene.camera);
    const hit = this.raycaster.intersectObjects(this.hits, false)[0];
    if (hit) { const n = hit.object.userData.npc; if (n.near) this.talkTo(n); }
  }
  onKey(e) {
    if (!this.scene.entered || this.scene.ui.busy) return;
    if ((e.code === 'KeyE' || e.code === 'Space') && this.nearest) { this.scene.player.controls.jumpRequested = false; this.talkTo(this.nearest); }
  }
  async talkTo(n) {
    if (n.talking || this.scene.ui.busy) return;
    const texts = n.currentTexts;
    if (!texts || !texts.length || !texts[0]) return;
    const wasQuest = n.questEnabled && !!n.questTexts;
    n.talking = true;
    this.scene.player.controls.jumpRequested = false;
    this.scene.player.freeze(true, 'idleTalk');
    this.scene.followCamera.locked = n.position.clone().addScaledVector(_v0.copy(n.position).normalize(), 0.9);
    await this.scene.ui.conversation(n, texts);
    n.talking = false;
    this.scene.followCamera.locked = null;
    this.scene.player.freeze(false);
    if (wasQuest) {
      events.emit('quest_step_check', n.id);
      // re-ask so the next line set is ready, if any
      events.emit('quest_step_texts_check', n);
    }
  }
  update(dt) {
    const p = this.scene.player;
    let nearest = null, best = 1e9;
    for (const n of this.list) {
      n.update(dt, p);
      if (n.near) { const d = n.position.distanceTo(p.position); if (d < best) { best = d; nearest = n; } }
    }
    if (nearest !== this.nearest) { this.nearest = nearest; events.emit('npc_nearest', nearest); }
    // the musician's tune carries a few streets
    const m = this.byId.musician;
    if (m) { const d = m.position.distanceTo(p.position); events.emit('set_audio_volume', 'musician', m.talking ? 0 : math.clamp(1 - d / 14, 0, 1) * 0.28); }
  }
  dispose() {
    events.off('quest_enable_id', this.onEnable, this); events.off('quest_disable_id', this.onDisable, this);
    events.off('touch_click', this.onClick, this); events.off('keydown', this.onKey, this);
    for (const n of this.list) n.dispose();
  }
}
