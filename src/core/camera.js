// The camera. A base position and target with a pointer-driven displacement layered on
// top — moving the mouse nudges where the camera looks and rolls it a fraction, which
// is what makes a still menu feel alive — and an orbit mode that keeps the position on
// a sphere around the target so it can auto-rotate and be tweened in spherical terms.

import * as THREE from 'three';
import { math } from './math.js';
import { touches } from './touches.js';
import { client } from './client.js';

const HALF_PI = Math.PI / 2;
const ZERO2 = new THREE.Vector2();
const _forward = new THREE.Vector3(), _right = new THREE.Vector3(), _up = new THREE.Vector3(), _v = new THREE.Vector3(), _m = new THREE.Matrix4();

export class BaseCamera extends THREE.PerspectiveCamera {
  constructor(fov = 45) {
    super(fov, 1, 0.1, 1000);
    this.isBaseCamera = true;
    this.target = new THREE.Vector3();
    this.basePosition = new THREE.Vector3(0, 0, 10);
    this.baseTarget = new THREE.Vector3();
    this.baseUp = new THREE.Vector3(0, 1, 0);
    this.displacement = { position: new THREE.Vector2(), target: new THREE.Vector2(), rotation: 0 };
    this.lerpPosition = 0.05; this.lerpTarget = 0.05; this.lerpRotation = 0.05;
    this.touchAmount = 1;
    this.resetOnTouch = true;
    this._touchPosition = new THREE.Vector2();
    this._touchVelocity = new THREE.Vector2();
    this._addSphPos = new THREE.Spherical(1, 0, 0);
    this._addSphTarget = new THREE.Spherical(1, 0, 0);
    this._addRotUp = 0;
    this._prevPosition = new THREE.Vector3(); this._prevTarget = new THREE.Vector3(); this._prevUp = new THREE.Vector3();
    this._prevSize = new THREE.Vector2();
  }
  _resize() {
    if (this._prevSize.x === client.screen.w && this._prevSize.y === client.screen.h) return;
    this._prevSize.set(client.screen.w, client.screen.h);
    this.aspect = client.screen.w / client.screen.h;
    this.updateProjectionMatrix();
  }
  _update(force = false) {
    const t = touches.get(0);
    const resetting = this.resetOnTouch && t.input === 'touch' && t.touchID === false;
    const l = resetting ? 0.5 : 1;
    const px = resetting ? 0 : math.fit(t.position11.x, -1, 1, -HALF_PI, HALF_PI);
    const py = resetting ? 0 : math.fit(t.position11.y, 1, -1, -HALF_PI, HALF_PI);
    const ox = this._touchPosition.x, oy = this._touchPosition.y;
    const f = force ? 1 : math.lerpCoefFPS(0.1);
    this._touchPosition.x = math.lerp(ox, px, f);
    this._touchPosition.y = math.lerp(oy, py, f);
    this._touchVelocity.x += this._touchPosition.x - ox;
    this._touchVelocity.y += this._touchPosition.y - oy;
    this._touchVelocity.multiplyScalar(math.frictionFPS(0.95));
    if (this._touchVelocity.lengthSq() < 1e-4 || force) this._touchVelocity.set(0, 0);
    const ax = this._touchPosition.x * this.touchAmount, ay = this._touchPosition.y * this.touchAmount, vx = this._touchVelocity.x * this.touchAmount;

    _forward.subVectors(this.basePosition, this.baseTarget);
    if (_forward.lengthSq() === 0) _forward.z = 1;
    _forward.normalize();
    _right.crossVectors(this.baseUp, _forward);
    if (_right.lengthSq() === 0) { if (Math.abs(this.baseUp.z) === 1) _forward.x += 1e-4; else _forward.z += 1e-4; _forward.normalize(); _right.crossVectors(this.baseUp, _forward); }
    _right.normalize();
    _up.crossVectors(_forward, _right);

    if (this.displacement.position.equals(ZERO2)) { this.position.copy(this.basePosition); this._addSphPos.set(1, 0, 0); }
    else {
      const c = force ? 1 : math.lerpCoefFPS(this.lerpPosition * l);
      this._addSphPos.theta = math.lerp(this._addSphPos.theta, ax * this.displacement.position.x, c);
      this._addSphPos.phi = math.lerp(this._addSphPos.phi, ay * this.displacement.position.y, c);
      _v.subVectors(this.basePosition, this.baseTarget).applyAxisAngle(_right, this._addSphPos.phi).applyAxisAngle(_up, this._addSphPos.theta);
      this.position.copy(this.baseTarget).add(_v);
    }
    if (this.displacement.target.equals(ZERO2)) { this.target.copy(this.baseTarget); this._addSphTarget.set(1, 0, 0); }
    else {
      const c = force ? 1 : math.lerpCoefFPS(this.lerpTarget * l);
      this._addSphTarget.theta = math.lerp(this._addSphTarget.theta, ax * this.displacement.target.x, c);
      this._addSphTarget.phi = math.lerp(this._addSphTarget.phi, ay * this.displacement.target.y, c);
      _v.subVectors(this.baseTarget, this.basePosition).applyAxisAngle(_right, this._addSphTarget.phi).applyAxisAngle(_up, this._addSphTarget.theta);
      this.target.copy(this.basePosition).add(_v);
    }
    if (this.displacement.rotation === 0) { this.up.copy(this.baseUp); this._addRotUp = 0; }
    else {
      const c = force ? 1 : math.lerpCoefFPS(this.lerpRotation * l);
      this._addRotUp = math.lerp(this._addRotUp, vx * this.displacement.rotation * this.touchAmount, c);
      _v.subVectors(this.position, this.target).normalize();
      this.up.copy(this.baseUp).applyAxisAngle(_v, this._addRotUp);
    }
    if (!this.position.equals(this._prevPosition) || !this.target.equals(this._prevTarget) || !this.up.equals(this._prevUp)) {
      this._prevPosition.copy(this.position); this._prevTarget.copy(this.target); this._prevUp.copy(this.up);
      this.quaternion.setFromRotationMatrix(_m.lookAt(this.position, this.target, this.up));
    }
  }
}

const EPS = 1e-6;
export class OrbitCamera extends BaseCamera {
  constructor(fov = 45) {
    super(fov);
    this.isOrbitCamera = true;
    this.lerpPosition = 1; this.lerpTarget = 1; this.lerpRotation = 1;
    this.lerpRotate = 0.075; this.lerpZoom = 0.1; this.lerpPan = 0.1;
    this.autoRotate = false;
    this.autoRotateSpeed = 1;
    this.minDistance = 0; this.maxDistance = Infinity;
    this.minPolarAngle = 0; this.maxPolarAngle = Math.PI;
    this._spherical = new THREE.Spherical();
    this._sphericalDelta = new THREE.Spherical(1, 0, 0);
    this._sphericalTarget = new THREE.Spherical();
    this._panTarget = new THREE.Vector3();
    this._first = true;
  }
  _fromPositionTarget() { this._sphericalTarget.setFromVector3(_v.copy(this.basePosition).sub(this.baseTarget)); }
  _update(force = false) {
    if (this._first) this._fromPositionTarget();
    if (force || this._first) {
      this._spherical.copy(this._sphericalTarget);
      this._sphericalDelta.set(1, 0, 0);
      this._panTarget.copy(this.baseTarget);
    }
    if (this.autoRotate) this._sphericalDelta.theta -= 2 * Math.PI / 60 / 60 * this.autoRotateSpeed * math.deltaRatio();
    this._sphericalTarget.theta += this._sphericalDelta.theta;
    this._sphericalTarget.phi += this._sphericalDelta.phi;
    this._sphericalTarget.radius *= this._sphericalDelta.radius;
    this._sphericalDelta.set(1, 0, 0);
    this._sphericalTarget.phi = math.clamp(this._sphericalTarget.phi, Math.max(EPS, this.minPolarAngle), Math.min(Math.PI - EPS, this.maxPolarAngle));
    this._sphericalTarget.radius = math.clamp(this._sphericalTarget.radius, this.minDistance, this.maxDistance);
    const cr = math.lerpCoefFPS(this.lerpRotate), cz = math.lerpCoefFPS(this.lerpZoom), cp = math.lerpCoefFPS(this.lerpPan);
    this._spherical.theta = math.lerp(this._spherical.theta, this._sphericalTarget.theta, cr);
    this._spherical.phi = math.lerp(this._spherical.phi, this._sphericalTarget.phi, cr);
    this._spherical.radius = math.lerp(this._spherical.radius, this._sphericalTarget.radius, cz);
    this.baseTarget.lerp(this._panTarget, cp);
    _v.setFromSpherical(this._spherical);
    this.basePosition.copy(this.baseTarget).add(_v);
    this._first = false;
    super._update(force);
  }
}
