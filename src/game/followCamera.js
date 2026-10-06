// The follow camera: an orbit around the courier in the courier's own frame, where "up"
// is away from the centre of the planet. Right-drag (or a second finger) turns it;
// while the courier runs it eases round to sit behind them. It never goes under the
// ground.

import * as THREE from 'three';
import { math } from '../core/math.js';
import { events } from '../core/events.js';
import { touches } from '../core/touches.js';
import { client } from '../core/client.js';

const _up = new THREE.Vector3(), _e1 = new THREE.Vector3(), _e2 = new THREE.Vector3(), _p = new THREE.Vector3(), _f = new THREE.Vector3(), _m = new THREE.Matrix4();

export class FollowCamera {
  constructor(camera, player, terrain) {
    this.camera = camera;
    this.player = player;
    this.terrain = terrain;
    this.theta = Math.PI;            // yaw around the up axis, 0 = looking along e1
    this.phi = 1.22;                 // polar angle from up: smaller = higher
    this.radius = 6.4;
    this.radiusTarget = 6.4;
    this.minPhi = 0.55; this.maxPhi = 1.52;
    this.frame = new THREE.Vector3(1, 0, 0);      // a tangent vector carried along the surface
    this.focus = new THREE.Vector3();
    this.lookAhead = 0;
    this.dragging = false;
    this.autoFollow = true;
    this.locked = null;                            // an NPC to look at during a conversation
    this.enabled = true;
    this._drag = this._drag.bind(this);
    this._start = this._start.bind(this);
    this._end = this._end.bind(this);
    this._wheel = (e) => { this.radiusTarget = math.clamp(this.radiusTarget + Math.sign(e.deltaY) * 0.6, 3.2, 11); };
    events.on('touch_start', this._start);
    events.on('touch_drag', this._drag);
    events.on('touch_end', this._end);
    window.addEventListener('wheel', this._wheel, { passive: true });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    this.snap();
  }
  _start(t) { if (t.input === 'mouse' && t.button === 2) this.dragging = true; }
  _drag(t) {
    if (!this.enabled) return;
    const rotating = t.input === 'mouse' ? this.dragging : this.player.controls.cameraFinger === t.finger;
    if (!rotating) return;
    this.theta -= t.delta11.x * Math.PI * 1.2;
    this.phi = math.clamp(this.phi - t.delta11.y * 1.6, this.minPhi, this.maxPhi);
    this.player.idleSince = 0;
  }
  _end(t) { if (t.input === 'mouse') this.dragging = false; }

  /** The tangent basis at the player: e1 carried along, e2 = up × e1. */
  basis(up) {
    _e1.copy(this.frame).addScaledVector(up, -this.frame.dot(up));
    if (_e1.lengthSq() < 1e-6) _e1.set(up.y, -up.x, 0);
    _e1.normalize();
    this.frame.copy(_e1);
    _e2.crossVectors(up, _e1).normalize();
  }
  /** World direction the camera looks along the ground, for the controls. */
  forward(out) {
    _up.copy(this.player.position).normalize();
    this.basis(_up);
    // the camera sits at theta; it looks the other way
    return out.copy(_e1).multiplyScalar(-Math.cos(this.theta)).addScaledVector(_e2, -Math.sin(this.theta)).normalize();
  }
  right(out) { _up.copy(this.player.position).normalize(); return out.crossVectors(this.forward(_f), _up).normalize().negate(); }

  /** Put the camera squarely behind the courier, looking the way they look. */
  alignBehind() {
    _up.copy(this.player.position).normalize();
    this.basis(_up);
    this.theta = Math.atan2(-this.player.heading.dot(_e2), -this.player.heading.dot(_e1));
  }
  snap() { this.update(1, true); }

  update(dt, force = false) {
    const p = this.player;
    _up.copy(p.position).normalize();
    this.basis(_up);
    // ease round behind the courier while they run and nobody is turning the camera
    if (this.autoFollow && !this.dragging && p.speed > 0.6 && !this.locked) {
      const behind = Math.atan2(-p.heading.dot(_e2), -p.heading.dot(_e1));
      this.theta = math.lerp(this.theta, this.theta + math.getShortestRotationAngle(this.theta, behind) - this.theta, force ? 1 : math.damp(0.6 * dt, 1));
    }
    this.radius = force ? this.radiusTarget : math.lerp(this.radius, this.radiusTarget, math.damp(0.08, dt * 60));
    // focus: the courier's chest, a little ahead of their motion
    this.lookAhead = math.lerp(this.lookAhead, Math.min(1, p.speed * 0.25), force ? 1 : math.damp(0.05, dt * 60));
    _p.copy(p.position).addScaledVector(_up, 0.95).addScaledVector(p.heading, this.lookAhead);
    if (this.locked) { _p.lerp(this.locked, 0.35); }
    if (force) this.focus.copy(_p); else this.focus.lerp(_p, math.damp(0.12, dt * 60));
    // the orbit
    const sp = Math.sin(this.phi), cp = Math.cos(this.phi);
    _f.copy(_e1).multiplyScalar(Math.cos(this.theta) * sp).addScaledVector(_e2, Math.sin(this.theta) * sp).addScaledVector(_up, cp);
    const pos = this.camera.position;
    const wanted = _f.clone().multiplyScalar(this.radius).add(this.focus);
    // keep it out of the ground
    const dir = wanted.clone().normalize();
    const ground = this.terrain.height(dir) + 0.7;
    if (wanted.length() < ground) {
      const r2 = Math.max(2.0, this.radius - (ground - wanted.length()) * 1.6);
      wanted.copy(_f).multiplyScalar(r2).add(this.focus);
      const d2 = wanted.clone().normalize();
      const g2 = this.terrain.height(d2) + 0.7;
      if (wanted.length() < g2) wanted.setLength(g2);
    }
    // and out of the houses: pull in along the view line until the camera is clear of them
    if (this.player.obstacles) {
      for (let step = 0; step < 5; step++) {
        let inside = false;
        for (const o of this.player.obstacles) {
          _p.subVectors(wanted, o.pos);
          const r = o.r + 0.8;
          if (_p.lengthSq() > (r + 3) * (r + 3)) continue;
          const dirO = o.pos.clone().normalize();
          const above = _p.dot(dirO);
          _p.addScaledVector(dirO, -above);
          if (_p.length() < r && above < 3.2) { inside = true; break; }
        }
        if (!inside) break;
        const len = Math.max(1.6, wanted.distanceTo(this.focus) * 0.75);
        wanted.copy(_f).multiplyScalar(len).add(this.focus);
      }
    }
    if (force) pos.copy(wanted); else pos.lerp(wanted, math.damp(0.2, dt * 60));
    this.camera.up.copy(_up);
    this.camera.target.copy(this.focus);
    this.camera.quaternion.setFromRotationMatrix(_m.lookAt(pos, this.focus, _up));
    this.camera.updateMatrixWorld();
  }
  dispose() {
    events.off('touch_start', this._start); events.off('touch_drag', this._drag); events.off('touch_end', this._end);
    window.removeEventListener('wheel', this._wheel);
  }
}
