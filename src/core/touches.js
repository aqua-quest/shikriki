// One pointer, tracked continuously: position in pixels, normalised 0..1 and -1..1,
// per-frame delta, drag distance since press, and whether it is a mouse or a finger.
// Emits touch_start / touch_move / touch_drag / touch_end / touch_click on the bus.

import * as THREE from 'three';
import { events } from './events.js';
import { client } from './client.js';
import { renderInfo } from './ticker.js';

const CLICK_MAX_DRAG = 12;     // px
const CLICK_MAX_TIME = 0.6;    // s

class Touch {
  constructor(finger = 0) {
    this.finger = finger;
    this.eventID = finger === 0 ? 'touch' : `touch${finger + 1}`;
    this.input = 'mouse';
    this.button = 0;
    this.touchID = false;      // false while nothing is pressed
    this.position = new THREE.Vector2(client.screen.w * 0.5, client.screen.h * 0.5);
    this.position01 = new THREE.Vector2(0.5, 0.5);
    this.position11 = new THREE.Vector2(0, 0);
    this.delta = new THREE.Vector2();
    this.delta11 = new THREE.Vector2();
    this.dragged = new THREE.Vector2();
    this.dragged11 = new THREE.Vector2();
    this.swipeVelocity = new THREE.Vector2();
    this._prev = this.position.clone();
    this._prev01 = this.position01.clone();
    this._start = this.position.clone();
    this._start01 = this.position01.clone();
    this._startTime = 0;
  }
  _setInput(e) { this.input = e.pointerType === 'mouse' ? 'mouse' : 'touch'; this.button = e.button >= 0 ? e.button : 0; }
  _setPosition(e) {
    const x = e.clientX, y = e.clientY;
    this.position.set(x, y);
    this.position01.set(x / client.screen.w, 1 - y / client.screen.h);
    this.position11.copy(this.position01).multiplyScalar(2).subScalar(1);
  }
  _updateDelta() {
    this.delta.copy(this.position).sub(this._prev);
    this.delta11.copy(this.position01).sub(this._prev01);
    this._prev.copy(this.position); this._prev01.copy(this.position01);
  }
  _updateDragged() {
    this.dragged.copy(this.position).sub(this._start);
    this.dragged11.copy(this.position01).sub(this._start01);
  }
  onDown(e) {
    this._startTime = renderInfo.time;
    this._setInput(e); this._setPosition(e);
    this._prev.copy(this.position); this._prev01.copy(this.position01);
    this._updateDelta();
    this._start.copy(this.position); this._start01.copy(this.position01);
    this.touchID = e.pointerId;
    this._updateDragged();
    events.emit(`${this.eventID}_start`, this);
  }
  onMove(e) {
    if (this.touchID === false) this._setInput(e);
    this._setPosition(e);
    this._updateDelta();
    events.emit(`${this.eventID}_move`, this);
    if (this.touchID !== false) { this._updateDragged(); events.emit(`${this.eventID}_drag`, this); }
  }
  onUp(e) {
    this._setPosition(e);
    this._updateDelta();
    this._updateDragged();
    const dt = Math.max(0.001, renderInfo.time - this._startTime);
    this.swipeVelocity.copy(this.dragged).divideScalar(dt);
    const wasPressed = this.touchID !== false;
    this.touchID = false;
    events.emit(`${this.eventID}_end`, this);
    if (wasPressed && this.dragged.length() < CLICK_MAX_DRAG && dt < CLICK_MAX_TIME && !(this.input === 'mouse' && this.button !== 0) && e.type !== 'pointercancel') {
      events.emit(`${this.eventID}_click`, this);
    }
  }
}

const list = [new Touch(0)];
let node = null;

export const touches = {
  get(i = 0) { return list[i]; },
  init(target) {
    node = target;
    const t = list[0];
    target.addEventListener('pointerdown', (e) => { if (t.touchID !== false && e.pointerId !== t.touchID) return; t.onDown(e); });
    window.addEventListener('pointermove', (e) => { if (t.touchID !== false && e.pointerId !== t.touchID) return; t.onMove(e); });
    const up = (e) => { if (t.touchID === false || e.pointerId === t.touchID) t.onUp(e); };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    target.addEventListener('contextmenu', (e) => e.preventDefault());
    target.style.touchAction = 'none';
  },
};
