// The courier. Movement on the planet: the position is a point in the planet's space,
// "up" is away from the centre, the ground is the terrain's height field in that
// direction. Keys or a dragged pointer push along the ground in the camera's frame,
// velocity damps, gravity pulls along -up when airborne, Space jumps, Shift sprints.
// Buildings are round obstacles that push the courier out. After half a minute without
// input the courier fidgets, three different ways.

import * as THREE from 'three';
import { Puppet } from './rig.js';
import { keys } from './keys.js';
import { events } from '../core/events.js';
import { touches } from '../core/touches.js';
import { math } from '../core/math.js';
import { renderInfo } from '../core/ticker.js';
import { client } from '../core/client.js';
import { storage } from '../core/storage.js';
import { RW } from '../intro/planet.js';

const _up = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3(), _in = new THREE.Vector3(), _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _t = new THREE.Vector3();
const WALK = 1.5, RUN = 3.0, SPRINT = 4.1;

class Controls {
  constructor(player) {
    this.player = player;
    this.move = new THREE.Vector2();      // -1..1 in screen terms: x right, y forward
    this.mouseDown = false;
    this.moveFinger = -1; this.cameraFinger = -1;
    this.touchStart = new THREE.Vector2();
    this.touchDelta = new THREE.Vector2();
    this.enabled = false;
    this.jumpRequested = false;
    this._onStart = (t) => {
      if (!this.enabled) return;
      if (t.input === 'mouse') { if (t.button === 0) this.mouseDown = true; return; }
      // first finger steers, a second one turns the camera
      if (this.moveFinger === -1) { this.moveFinger = t.finger; this.touchStart.copy(t.position); this.touchDelta.set(0, 0); }
      else if (this.cameraFinger === -1) this.cameraFinger = t.finger;
    };
    this._onDrag = (t) => {
      if (!this.enabled) return;
      if (t.input === 'mouse') return;
      if (t.finger === this.moveFinger) this.touchDelta.copy(t.position).sub(this.touchStart).divideScalar(70).clampLength(0, 1);
    };
    this._onEnd = (t) => {
      if (t.input === 'mouse') { this.mouseDown = false; return; }
      if (t.finger === this.moveFinger) { this.moveFinger = -1; this.touchDelta.set(0, 0); }
      else if (t.finger === this.cameraFinger) this.cameraFinger = -1;
    };
    this._onClick = (t) => { if (this.enabled && t.input !== 'mouse') this.jumpRequested = true; };
    this._onKey = (e) => { if (this.enabled && e.code === 'Space') this.jumpRequested = true; };
    this._onMouseUp = (e) => { if (this.enabled && e.button === 2 && renderInfo.time - this._rightDownAt < 0.3) this.jumpRequested = true; };
    this._onMouseDown = (e) => { if (e.button === 2) this._rightDownAt = renderInfo.time; };
    this._rightDownAt = -1;
  }
  enable() {
    if (this.enabled) return;
    this.enabled = true;
    events.on('touch_start', this._onStart); events.on('touch_drag', this._onDrag); events.on('touch_end', this._onEnd); events.on('touch_click', this._onClick);
    events.on('keydown', this._onKey);
    window.addEventListener('mousedown', this._onMouseDown); window.addEventListener('mouseup', this._onMouseUp);
  }
  disable() {
    if (!this.enabled) return;
    this.enabled = false;
    this.mouseDown = false; this.moveFinger = -1; this.cameraFinger = -1; this.touchDelta.set(0, 0); this.jumpRequested = false;
    events.off('touch_start', this._onStart); events.off('touch_drag', this._onDrag); events.off('touch_end', this._onEnd); events.off('touch_click', this._onClick);
    events.off('keydown', this._onKey);
    window.removeEventListener('mousedown', this._onMouseDown); window.removeEventListener('mouseup', this._onMouseUp);
  }
  /** Read the input into `move`. Mouse-drag steers toward the pointer, relative to the courier on screen. */
  read(camera, playerScreen) {
    this.move.set(0, 0);
    if (!this.enabled) return this.move;
    if (keys.any('KeyW', 'ArrowUp')) this.move.y += 1;
    if (keys.any('KeyS', 'ArrowDown')) this.move.y -= 1;
    if (keys.any('KeyA', 'ArrowLeft')) this.move.x -= 1;
    if (keys.any('KeyD', 'ArrowRight')) this.move.x += 1;
    if (this.move.lengthSq() > 0) this.move.normalize();
    if (this.mouseDown) {
      const t = touches.get(0);
      const dx = (t.position.x - playerScreen.x) / 200, dy = -(t.position.y - playerScreen.y) / 200;
      _in.set(dx, dy, 0);
      if (_in.length() > 1) _in.normalize();
      this.move.x += _in.x; this.move.y += _in.y;
    }
    if (this.moveFinger !== -1) { this.move.x += this.touchDelta.x; this.move.y -= this.touchDelta.y; }
    if (this.move.lengthSq() > 1) this.move.normalize();
    return this.move;
  }
  get sprint() { return keys.any('ShiftLeft', 'ShiftRight') || this.player.touchSprint; }
}

export class Player {
  constructor(scene, terrain, { position, heading = null, look = null } = {}) {
    this.scene = scene;
    this.terrain = terrain;
    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.heading = new THREE.Vector3();
    this.speed = 0;
    this.grounded = true;
    this.airTime = 0;
    this.idleSince = 0;
    this.afk = false;
    this.touchSprint = false;
    this.obstacles = [];
    this.frozen = false;
    this.medium = 'ground';
    const saved = storage.get('look');
    this.look = look || saved || { hair: 0, top: 0, bottom: 0, shoes: 0, skin: 0, bag: true };
    this.puppet = new Puppet(this.look, { seed: 11, height: 1.0 });
    this.puppet.name = 'Courier';
    this.controls = new Controls(this);
    this.object = new THREE.Group();
    this.object.name = 'Player';
    this.object.add(this.puppet);
    scene.add(this.object);
    this.camera = null;
    this.screen = new THREE.Vector2();
    _up.copy(this.position).normalize();
    // a heading along the ground to start with
    if (heading) this.heading.copy(heading).addScaledVector(_up, -heading.dot(_up)).normalize();
    else { this.heading.set(_up.y, -_up.x, 0); if (this.heading.lengthSq() < 1e-6) this.heading.set(0, _up.z, -_up.y); this.heading.normalize(); }
    this.snapToGround();
    this.updateTransform();
  }
  get up() { return _up.copy(this.position).normalize(); }
  groundRadius(dir) { return Math.max(this.terrain.height(dir), RW - 0.28); }
  snapToGround() { const d = this.position.clone().normalize(); this.position.copy(d).multiplyScalar(this.groundRadius(d)); }
  setLook(patch) { this.look = { ...this.look, ...patch }; this.puppet.setLook(patch); storage.set('look', this.look); }

  /** Called once per frame before rendering. */
  update(dt) {
    const up = _up.copy(this.position).normalize();
    // input in the camera's ground frame
    const cam = this.scene.followCamera;
    cam.forward(_f); cam.right(_r);
    this.projectToScreen();
    const move = this.controls.read(cam.camera, this.screen);
    const sprinting = this.controls.sprint && move.lengthSq() > 0.2;
    _in.copy(_f).multiplyScalar(move.y).addScaledVector(_r, move.x);
    if (_in.lengthSq() > 1) _in.normalize();
    const active = !this.frozen && _in.lengthSq() > 1e-4;
    if (active || this.controls.jumpRequested) { this.idleSince = 0; if (this.afk) this._endAfk(); }
    else this.idleSince += dt;
    // acceleration along the ground, damping, gravity
    const maxSpeed = sprinting ? SPRINT : RUN;
    if (active) this.velocity.addScaledVector(_in, maxSpeed * dt * 7);
    const vUp = this.velocity.dot(up);
    _v.copy(this.velocity).addScaledVector(up, -vUp);              // the ground part
    const damp = Math.exp(-dt * (active ? 7 : 11));
    _v.multiplyScalar(damp);
    const sp = _v.length();
    if (sp > maxSpeed) _v.multiplyScalar(maxSpeed / sp);
    let vy = vUp;
    if (!this.grounded) vy -= 12.0 * dt;
    if (this.grounded && this.controls.jumpRequested && !this.frozen) {
      vy = 5.6; this.grounded = false; this.airTime = 0;
      events.emit('character_jump');
    }
    this.controls.jumpRequested = false;
    this.velocity.copy(_v).addScaledVector(up, vy);
    // obstacles: round things you cannot walk through
    this.position.addScaledVector(this.velocity, dt);
    for (const o of this.obstacles) {
      _t.subVectors(this.position, o.pos);
      const r = o.r + 0.28;
      if (_t.lengthSq() > (r + 2) * (r + 2)) continue;         // only things actually nearby, never the far side of the planet
      _t.addScaledVector(up, -_t.dot(up));
      const d = _t.length();
      if (d < r && d > 1e-4) { this.position.addScaledVector(_t.normalize(), r - d); }
    }
    // the ground: land when it is reached going down; stay on it over steps and down
    // slopes, so walking downhill never turns into a fall
    const dir = _t.copy(this.position).normalize();
    const ground = this.groundRadius(dir);
    const h = this.position.length();
    const jumped = vy > 0.5;
    if (h <= ground + 0.001 && this.velocity.dot(dir) <= 0.01) {
      if (!this.grounded) { this.puppet.squash = 1; events.emit('character_land', this.airTime); }
      this.grounded = true;
      this.position.setLength(ground);
      this.velocity.addScaledVector(dir, -this.velocity.dot(dir));
    } else if (this.grounded && !jumped && h < ground + 0.45) {
      this.position.setLength(ground);
      this.velocity.addScaledVector(dir, -this.velocity.dot(dir));
    } else if (h > ground + 0.05) { this.grounded = false; this.airTime += dt; }
    this.medium = this.terrain.height(dir) < RW - 0.1 ? 'water' : 'ground';
    // the heading: where the body points
    const upNow = _up.copy(this.position).normalize();
    _v.copy(this.velocity).addScaledVector(upNow, -this.velocity.dot(upNow));
    this.speed = _v.length();
    if (this.speed > 0.25) {
      _v.normalize();
      const k = 1 - Math.exp(-dt * 12);
      this.heading.lerp(_v, k);
    }
    this.heading.addScaledVector(upNow, -this.heading.dot(upNow));
    if (this.heading.lengthSq() < 1e-6) this.heading.copy(_f);
    this.heading.normalize();
    this._animate(dt, sprinting);
    this.updateTransform();
  }
  _animate(dt, sprinting) {
    const p = this.puppet;
    const sp = this.speed;
    if (!this.grounded && this.airTime > 0.08) { p.play('air', { fade: 0.12 }); }
    else if (this.frozen) { p.play(this.frozenClip || 'idle', { fade: 0.3 }); }
    else if (sp > 2.6 && sprinting) p.play('sprint', { fade: 0.2, rate: math.clamp(sp / SPRINT, 0.8, 1.3) });
    else if (sp > 1.9) p.play('run', { fade: 0.2, rate: math.clamp(sp / RUN, 0.7, 1.4) });
    else if (sp > 0.35) p.play('walk', { fade: 0.2, rate: math.clamp(sp / WALK, 0.6, 1.5) });
    else if (!this.afk) {
      if (this.idleSince > 30 && this.grounded) this._startAfk();
      else p.play('idle', { fade: 0.35 });
    }
    // lean into speed
    p.lean = math.lerp(p.lean, this.grounded ? sp * 0.045 : -0.1, 1 - Math.exp(-dt * 6));
  }
  _startAfk() {
    this.afk = true;
    const clip = ['afk1', 'afk2', 'afk3'][Math.floor(Math.random() * 3)];
    this.puppet.play(clip, { fade: 0.4, force: true });
    this.puppet.onFinished = () => { this.afk = false; this.idleSince = 22; };
  }
  _endAfk() { this.afk = false; this.puppet.onFinished = null; this.puppet.play('idle', { fade: 0.3 }); }
  updateTransform() {
    const up = _up.copy(this.position).normalize();
    this.object.position.copy(this.position);
    // stand up along `up`, face along `heading` (the puppet is built facing +z)
    _r.crossVectors(up, this.heading).normalize();
    _m.makeBasis(_r, up, this.heading);
    this.object.quaternion.setFromRotationMatrix(_m);
    this.object.updateMatrixWorld();
  }
  projectToScreen() {
    const cam = this.scene.followCamera && this.scene.followCamera.camera;
    if (!cam) return;
    _t.copy(this.position).addScaledVector(_up.copy(this.position).normalize(), 0.5).project(cam);
    this.screen.set((_t.x + 1) / 2 * client.screen.w, (1 - _t.y) / 2 * client.screen.h);
  }
  /** Stop the courier where they are (conversations, menus). */
  freeze(on, clip = 'idle') { this.frozen = on; this.frozenClip = clip; if (on) { this.velocity.addScaledVector(_up.copy(this.position).normalize(), 0).multiplyScalar(0.2); } }
  dispose() { this.controls.disable(); }
}
