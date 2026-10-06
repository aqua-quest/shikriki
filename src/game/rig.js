// The puppet. Every person in the city — the courier and the townsfolk — is this: a
// seventeen-bone humanoid with flat-coloured rigid parts hung on the bones, like a
// papercut marionette, animated by the keyed clips in clips.js with cross-fades between
// them. Clothes are the four slots the original has — hair, top, bottom, shoes — each a
// list of shapes and colours, so a townsperson and a customised courier are built the
// same way.

import * as THREE from 'three';
import { Builder, ELEM } from '../intro/geo.js';
import { toonMaterial } from '../render/materials.js';
import { CLIPS } from './clips.js';
import { math } from '../core/math.js';

export const BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'armL', 'forearmL', 'handL', 'armR', 'forearmR', 'handR', 'legL', 'shinL', 'footL', 'legR', 'shinR', 'footR'];
const PARENT = { hips: null, spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', armL: 'chest', forearmL: 'armL', handL: 'forearmL', armR: 'chest', forearmR: 'armR', handR: 'forearmR', legL: 'hips', shinL: 'legL', footL: 'shinL', legR: 'hips', shinR: 'legR', footR: 'shinR' };
// rest offsets from the parent joint, for a figure one unit tall
const OFFSET = {
  hips: [0, 0.5, 0], spine: [0, 0.1, 0], chest: [0, 0.13, 0], neck: [0, 0.15, 0], head: [0, 0.05, 0],
  armL: [0.125, 0.12, 0], forearmL: [0, -0.16, 0], handL: [0, -0.15, 0],
  armR: [-0.125, 0.12, 0], forearmR: [0, -0.16, 0], handR: [0, -0.15, 0],
  legL: [0.07, -0.02, 0], shinL: [0, -0.24, 0], footL: [0, -0.23, 0],
  legR: [-0.07, -0.02, 0], shinR: [0, -0.24, 0], footR: [0, -0.23, 0],
};

export const HAIR = [
  { name: 'short', label: 'მოკლე', shape: 'cap', color: '#2b1d14' }, { name: 'bowl', label: 'ქოთანი', shape: 'bowl', color: '#3a2a1c' }, { name: 'curly', label: 'ხუჭუჭა', shape: 'blob', color: '#1d1511' },
  { name: 'ponytail', label: 'კუდი', shape: 'tail', color: '#5a3a22' }, { name: 'kepka', label: 'კეპკა', shape: 'flatcap', color: '#4a4a46' }, { name: 'beanie', label: 'ქუდი', shape: 'beanie', color: '#7a2b2b' },
  { name: 'mullet', label: 'მულეტი', shape: 'mullet', color: '#2b1d14' }, { name: 'grey', label: 'ჭაღარა', shape: 'cap', color: '#b8b2a6' }, { name: 'bald', label: 'მელოტი', shape: 'none', color: '#000000' },
  { name: 'headscarf', label: 'თავსაფარი', shape: 'scarf', color: '#d9d2c4' }, { name: 'fur', label: 'ბეწვის ქუდი', shape: 'blob', color: '#3b3b3b' },
];
export const TOPS = [
  { name: 'tracksuit', label: 'სპორტული', color: '#1f3a8f', stripes: '#f2f2f2' }, { name: 'leather', label: 'ტყავის ქურთუკი', color: '#2b2320' }, { name: 'sweater', label: 'სვიტერი', color: '#b45a3c' },
  { name: 'tshirt', label: 'მაისური', color: '#f1e9d6' }, { name: 'shirt', label: 'პერანგი', color: '#8fb4c9' }, { name: 'coat', label: 'პალტო', color: '#5b5f55', long: true },
  { name: 'cardigan', label: 'კარდიგანი', color: '#7a6a3a' }, { name: 'vest', label: 'ჟილეტი', color: '#c9c3b5' }, { name: 'adidas', label: 'სამზოლიანი', color: '#111111', stripes: '#ffffff' },
  { name: 'dress', label: 'კაბა', color: '#c25a6a', long: true }, { name: 'apron', label: 'წინსაფარი', color: '#e8e2d2' }, { name: 'uniform', label: 'ფორმა', color: '#3f4f3a' },
];
export const BOTTOMS = [
  { name: 'jeans', label: 'ჯინსი', color: '#3b5a8a' }, { name: 'trackpants', label: 'სპორტული შარვალი', color: '#1f3a8f', stripes: '#f2f2f2' }, { name: 'trousers', label: 'შარვალი', color: '#3a3a3a' },
  { name: 'shorts', label: 'შორტი', color: '#8a7a5a', short: true }, { name: 'skirt', label: 'ქვედაბოლო', color: '#5a3a5a' }, { name: 'cords', label: 'ველვეტი', color: '#8a5a3a' },
  { name: 'grey', label: 'ნაცრისფერი', color: '#8a8a86' }, { name: 'black', label: 'შავი', color: '#1b1b1b' },
];
export const SHOES = [
  { name: 'sneakers', label: 'კედები', color: '#f2f2f2' }, { name: 'boots', label: 'ჩექმები', color: '#3a2a1c' }, { name: 'sandals', label: 'სანდლები', color: '#9a7a5a' },
  { name: 'loafers', label: 'ფეხსაცმელი', color: '#1b1b1b' }, { name: 'red', label: 'წითელი', color: '#b23a2a' }, { name: 'rubber', label: 'რეზინის ჩექმები', color: '#2a4a2a' }, { name: 'slippers', label: 'ჩუსტები', color: '#6a5a8a' },
];
export const SKINS = ['#f1cfa6', '#e8bd92', '#d9a978', '#c8946a', '#f5d9b8'];

const matCache = new Map();
function puppetMaterial(key, opts) {
  if (!matCache.has(key)) matCache.set(key, toonMaterial({ normals: true, noiseScale: 2.0, breakAt: 0.08, shadeV: 0.62, shadeHue: -0.03, ...opts }));
  return matCache.get(key);
}

/** Build the rigid part for one bone and its clothes. Returns a Mesh or null. */
function partGeometry(bone, look, rnd) {
  const b = new Builder();
  const skin = look.skin, top = look.top, bottom = look.bottom, shoes = look.shoes, hair = look.hair;
  const aux = (id) => Builder.aux(0, rnd(), 0, id);
  switch (bone) {
    case 'hips':
      b.box(0.24, 0.12, 0.15, bottom.color, aux(0.3), { y: -0.06 });
      if (bottom.name === 'skirt') b.cone(0.17, 0.2, 8, bottom.color, aux(0.3), { y: -0.26, rTop: 0.13 });
      break;
    case 'spine':
      b.box(0.26, 0.14, 0.16, top.color, aux(0.3), { y: -0.01 });
      if (top.name === 'apron') b.box(0.16, 0.14, 0.03, '#f6f1e6', aux(0.31), { y: -0.01, z: 0.085 });
      break;
    case 'chest':
      b.box(0.3, 0.17, 0.17, top.color, aux(0.3), { y: 0 });
      if (top.stripes) { b.box(0.012, 0.17, 0.175, top.stripes, aux(0.32), { x: 0.06 }); b.box(0.012, 0.17, 0.175, top.stripes, aux(0.32), { x: -0.06 }); }
      if (top.name === 'shirt' || top.name === 'coat' || top.name === 'uniform') b.box(0.08, 0.06, 0.03, '#f6f1e6', aux(0.31), { y: 0.13, z: 0.08 });
      if (top.name === 'apron') b.box(0.16, 0.17, 0.03, '#f6f1e6', aux(0.31), { y: 0, z: 0.09 });
      if (top.long) b.box(0.27, 0.1, 0.17, top.color, aux(0.3), { y: -0.26 });
      if (look.bag) { b.box(0.14, 0.12, 0.06, '#7a5a3a', aux(0.33), { x: -0.17, y: -0.2, z: 0.0 }); b.box(0.02, 0.3, 0.02, '#5a3a22', aux(0.33), { x: 0.05, y: -0.0, z: 0.09 }); }
      break;
    case 'neck':
      b.box(0.07, 0.06, 0.07, skin, aux(0.2), { y: -0.01 });
      break;
    case 'head': {
      b.box(0.2, 0.22, 0.2, skin, aux(0.2), { y: 0 });
      // eyes and a mouth, drawn as tiny dark slabs
      b.box(0.03, 0.035, 0.012, '#1b1b1b', aux(0.5), { x: 0.05, y: 0.11, z: 0.1 });
      b.box(0.03, 0.035, 0.012, '#1b1b1b', aux(0.5), { x: -0.05, y: 0.11, z: 0.1 });
      b.box(0.05, 0.012, 0.012, '#8a4a3a', aux(0.5), { x: 0, y: 0.05, z: 0.1 });
      if (look.beard) b.box(0.16, 0.07, 0.05, hair.color === '#000000' ? '#3a2a1c' : hair.color, aux(0.25), { y: 0.0, z: 0.085 });
      if (look.glasses) { b.box(0.07, 0.05, 0.01, '#1b1b1b', aux(0.5), { x: 0.05, y: 0.11, z: 0.108 }); b.box(0.07, 0.05, 0.01, '#1b1b1b', aux(0.5), { x: -0.05, y: 0.11, z: 0.108 }); }
      const hc = hair.color;
      switch (hair.shape) {
        case 'cap': b.box(0.21, 0.08, 0.21, hc, aux(0.25), { y: 0.18 }); b.box(0.21, 0.1, 0.06, hc, aux(0.25), { y: 0.1, z: -0.08 }); break;
        case 'bowl': b.box(0.22, 0.1, 0.22, hc, aux(0.25), { y: 0.17 }); b.box(0.22, 0.08, 0.05, hc, aux(0.25), { y: 0.1, z: -0.09 }); b.box(0.22, 0.03, 0.03, hc, aux(0.25), { y: 0.16, z: 0.1 }); break;
        case 'blob': b.blob(0.14, 1, hc, aux(0.25), { y: 0.2, jitter: 0.25, sy: 0.75, rnd }); break;
        case 'tail': b.box(0.21, 0.08, 0.21, hc, aux(0.25), { y: 0.18 }); b.box(0.06, 0.2, 0.06, hc, aux(0.25), { y: -0.04, z: -0.12 }); break;
        case 'flatcap': b.box(0.23, 0.06, 0.23, hc, aux(0.25), { y: 0.21 }); b.box(0.2, 0.02, 0.1, hc, aux(0.25), { y: 0.21, z: 0.15 }); break;
        case 'beanie': b.box(0.22, 0.12, 0.22, hc, aux(0.25), { y: 0.17 }); b.box(0.23, 0.04, 0.23, hc, aux(0.25), { y: 0.15 }); break;
        case 'mullet': b.box(0.21, 0.07, 0.21, hc, aux(0.25), { y: 0.19 }); b.box(0.2, 0.18, 0.06, hc, aux(0.25), { y: 0.0, z: -0.11 }); break;
        case 'scarf': b.box(0.23, 0.12, 0.23, hc, aux(0.25), { y: 0.16 }); b.box(0.24, 0.22, 0.06, hc, aux(0.25), { y: 0.0, z: -0.11 }); break;
        default: break;
      }
      break;
    }
    case 'armL': case 'armR': {
      const sleeve = top.name === 'tshirt' || top.name === 'vest' || top.name === 'dress';
      b.box(0.085, 0.17, 0.085, sleeve ? top.color : top.color, aux(0.3), { y: -0.17 });
      if (top.stripes) b.box(0.012, 0.17, 0.09, top.stripes, aux(0.32), { x: bone === 'armL' ? 0.045 : -0.045, y: -0.17 });
      break;
    }
    case 'forearmL': case 'forearmR': {
      const sleeve = !(top.name === 'tshirt' || top.name === 'vest' || top.name === 'dress' || top.name === 'apron');
      b.box(0.075, 0.16, 0.075, sleeve ? top.color : skin, aux(sleeve ? 0.3 : 0.2), { y: -0.16 });
      break;
    }
    case 'handL': case 'handR':
      b.box(0.07, 0.08, 0.05, skin, aux(0.2), { y: -0.07 });
      break;
    case 'legL': case 'legR': {
      const c = bottom.name === 'skirt' ? skin : bottom.color;
      b.box(0.1, 0.24, 0.1, c, aux(bottom.name === 'skirt' ? 0.2 : 0.3), { y: -0.24 });
      if (bottom.stripes) b.box(0.012, 0.24, 0.105, bottom.stripes, aux(0.32), { x: bone === 'legL' ? 0.052 : -0.052, y: -0.24 });
      break;
    }
    case 'shinL': case 'shinR': {
      const bare = bottom.short || bottom.name === 'skirt';
      b.box(0.09, 0.22, 0.09, bare ? skin : bottom.color, aux(bare ? 0.2 : 0.3), { y: -0.22 });
      if (bottom.stripes && !bare) b.box(0.012, 0.22, 0.095, bottom.stripes, aux(0.32), { x: bone === 'shinL' ? 0.047 : -0.047, y: -0.22 });
      break;
    }
    case 'footL': case 'footR':
      b.box(0.1, 0.07, 0.17, shoes.color, aux(0.35), { y: -0.07, z: 0.03 });
      if (shoes.name === 'boots') b.box(0.1, 0.08, 0.1, shoes.color, aux(0.35), { y: 0, z: -0.0 });
      break;
    default: break;
  }
  return b.pos.length ? b.build() : null;
}

const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function keyQuats(clip) {
  // every key, every bone it names, as a quaternion; also the hips bob
  return clip.keys.map((k) => {
    const q = {};
    for (const bone of BONES) {
      if (k[bone]) { _e.set(THREE.MathUtils.degToRad(k[bone][0]), THREE.MathUtils.degToRad(k[bone][1]), THREE.MathUtils.degToRad(k[bone][2]), 'XYZ'); q[bone] = new THREE.Quaternion().setFromEuler(_e); }
    }
    return { t: k.t, q, root: k.root || 0 };
  });
}
const clipCache = new Map();
function compiled(name) {
  if (!clipCache.has(name)) { const c = CLIPS[name]; clipCache.set(name, { ...c, keys: keyQuats(c) }); }
  return clipCache.get(name);
}

/** Sample a clip at time `t` into `out` (bone -> quaternion) and return the root bob. */
function samplePose(clip, t, out) {
  const keys = clip.keys;
  let time = clip.loop ? ((t % clip.duration) + clip.duration) % clip.duration : Math.min(t, clip.duration);
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1].t <= time) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
  const span = Math.max(1e-5, b.t - a.t);
  let f = math.clamp((time - a.t) / span, 0, 1);
  f = f * f * (3 - 2 * f);
  for (const bone of BONES) {
    const qa = a.q[bone], qb = b.q[bone];
    const o = out[bone];
    if (qa && qb) o.slerpQuaternions(qa, qb, f);
    else if (qa) o.copy(qa).slerp(IDENT, f);
    else if (qb) o.copy(IDENT).slerp(qb, f);
    else o.identity();
  }
  return a.root + (b.root - a.root) * f;
}
const IDENT = new THREE.Quaternion();

export class Puppet extends THREE.Group {
  /**
   * `look`: { skin, hair, top, bottom, shoes, bag, beard, glasses, height } — indices or
   * objects for the slots. `seed` keeps the surface noise deterministic.
   */
  constructor(look = {}, { seed = 1, height = 1.0, material = null } = {}) {
    super();
    this.name = 'Puppet';
    this.rnd = math.seeded(seed);
    this.look = Puppet.resolveLook(look);
    this.heightScale = height;
    this.bones = {};
    this.parts = {};
    this.material = material || puppetMaterial('puppet', {});
    this._pose = {}; this._poseB = {};
    for (const b of BONES) { this._pose[b] = new THREE.Quaternion(); this._poseB[b] = new THREE.Quaternion(); }
    this._build();
    // animation state
    this.clip = compiled('idle'); this.time = 0; this.rate = 1;
    this.prevClip = null; this.prevTime = 0; this.prevRate = 1; this.fade = 1; this.fadeDur = 0.25;
    this.lean = 0; this.bank = 0; this.squash = 0;
    this.headTarget = null; this._headQ = new THREE.Quaternion(); this._headWeight = 0;
    this.onFinished = null;
  }
  static resolveLook(l) {
    const pick = (list, v, rnd) => (typeof v === 'number' ? list[((v % list.length) + list.length) % list.length] : v && typeof v === 'object' ? v : list[Math.floor(rnd() * list.length)]);
    const rnd = math.seeded((l.seed || 7) * 13 + 1);
    return {
      skin: typeof l.skin === 'number' ? SKINS[l.skin % SKINS.length] : l.skin || SKINS[Math.floor(rnd() * SKINS.length)],
      hair: pick(HAIR, l.hair, rnd), top: pick(TOPS, l.top, rnd), bottom: pick(BOTTOMS, l.bottom, rnd), shoes: pick(SHOES, l.shoes, rnd),
      bag: !!l.bag, beard: !!l.beard, glasses: !!l.glasses,
    };
  }
  _build() {
    for (const bone of BONES) {
      const o = new THREE.Group();
      o.name = bone;
      o.position.fromArray(OFFSET[bone]);
      this.bones[bone] = o;
      (PARENT[bone] ? this.bones[PARENT[bone]] : this).add(o);
    }
    this.scale.setScalar(this.heightScale);
    this.rebuildParts();
  }
  /** Rebuild the parts for the current look (after a change of clothes). */
  rebuildParts() {
    for (const bone of BONES) {
      const old = this.parts[bone];
      if (old) { this.bones[bone].remove(old); old.geometry.dispose(); }
      const g = partGeometry(bone, this.look, this.rnd);
      if (!g) { this.parts[bone] = null; continue; }
      const m = new THREE.Mesh(g, this.material);
      m.castShadow = true; m.receiveShadow = true;
      m.frustumCulled = false;
      this.bones[bone].add(m);
      this.parts[bone] = m;
    }
  }
  setLook(patch) { this.look = { ...this.look, ...Puppet.resolveLook({ ...this.look, ...patch }) }; this.rebuildParts(); }

  /** Cross-fade to a clip. `rate` is the playback speed; `force` restarts the same clip. */
  play(name, { fade = 0.25, rate = 1, force = false, offset = 0 } = {}) {
    if (!force && this.clip && this.clip.name === name) { this.rate = rate; return; }
    const next = compiled(name);
    if (!next) return;
    this.prevClip = this.clip; this.prevTime = this.time; this.prevRate = this.rate;
    this.clip = next; this.time = offset; this.rate = rate;
    this.fade = fade > 0 ? 0 : 1; this.fadeDur = Math.max(1e-3, fade);
  }
  get finished() { return this.clip && !this.clip.loop && this.time >= this.clip.duration; }

  update(dt) {
    this.time += dt * this.rate;
    if (this.prevClip) this.prevTime += dt * this.prevRate;
    if (this.fade < 1) { this.fade = Math.min(1, this.fade + dt / this.fadeDur); if (this.fade >= 1) this.prevClip = null; }
    let root = samplePose(this.clip, this.time, this._pose);
    if (this.prevClip) {
      const rootB = samplePose(this.prevClip, this.prevTime, this._poseB);
      const f = this.fade * this.fade * (3 - 2 * this.fade);
      for (const b of BONES) this._pose[b].slerpQuaternions(this._poseB[b], this._pose[b], f);
      root = rootB + (root - rootB) * f;
    }
    for (const b of BONES) this.bones[b].quaternion.copy(this._pose[b]);
    // the whole body leans into its speed and banks into its turns
    _e.set(this.lean, 0, this.bank, 'XYZ');
    _q.setFromEuler(_e);
    this.bones.hips.quaternion.premultiply(_q);
    this.bones.hips.position.set(OFFSET.hips[0], OFFSET.hips[1] + root, OFFSET.hips[2]);
    // the landing squash
    if (this.squash > 0) { this.squash = Math.max(0, this.squash - dt * 4); }
    const s = 1 - 0.18 * Math.sin(Math.min(1, this.squash) * Math.PI);
    this.scale.set(this.heightScale * (2 - s), this.heightScale * s, this.heightScale * (2 - s));
    // the head follows a point of interest, if there is one
    if (this.headTarget) {
      this._headWeight = Math.min(1, this._headWeight + dt * 3);
      this.bones.head.updateWorldMatrix(true, false);
      const headPos = new THREE.Vector3().setFromMatrixPosition(this.bones.head.matrixWorld);
      const dir = new THREE.Vector3().subVectors(this.headTarget, headPos);
      const parentQ = new THREE.Quaternion(); this.bones.neck.getWorldQuaternion(parentQ);
      const local = dir.applyQuaternion(parentQ.clone().invert()).normalize();
      const yaw = math.clamp(Math.atan2(local.x, local.z), -1.1, 1.1);
      const pitch = math.clamp(-Math.asin(math.clamp(local.y, -1, 1)), -0.5, 0.5);
      _e.set(pitch, yaw, 0, 'YXZ');
      this._headQ.setFromEuler(_e);
      this.bones.head.quaternion.slerp(this._headQ, this._headWeight * 0.8);
    } else this._headWeight = Math.max(0, this._headWeight - dt * 3);
    if (this.finished && this.onFinished) { const f = this.onFinished; this.onFinished = null; f(); }
  }
}
