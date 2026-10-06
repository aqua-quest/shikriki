// Ray-cast interaction for a set of meshes: hover in/out, touch start/end, move, drag
// and click, each delivered with the intersections and the pointer state that caused it.
// A hovered instance or letter is identified by `instanceId` or by the mesh's own
// `userData.index`, so a title made of separate letter meshes behaves like one batch.

import * as THREE from 'three';
import { events } from './events.js';
import { touches } from './touches.js';

const TOUCH_START = 1, TOUCH_MOVE = 2, TOUCH_END = 3, CLICK = 4;

export class MeshInteraction {
  constructor({ meshes = [], camera = null, onHover = null, onTouch = null, onMove = null, onDrag = null, onClick = null, ctx = null, finger = 0, interactWhileTouching = false, hoverCursor = false, cursorNode = document.body } = {}) {
    if (!camera) throw new Error('mesh interaction needs a camera');
    this.meshes = Array.isArray(meshes) ? meshes : [meshes];
    this.camera = camera;
    this._onHover = onHover; this._onTouch = onTouch; this._onMove = onMove; this._onDrag = onDrag; this._onClick = onClick;
    this._ctx = ctx;
    this._finger = finger;
    this._eventsID = finger === 0 ? 'touch' : `touch${finger + 1}`;
    this._interactWhileTouching = interactWhileTouching;
    this._touchPressed = false;
    this._hoverCursor = hoverCursor;
    this._cursorNode = cursorNode;
    this._raycaster = new THREE.Raycaster();
    this._enabled = false;
    this.hovering = false; this.hoveringElement = -1; this.hoveringSubelement = -1;
    this.touching = false; this.touchingElement = -1; this.touchingSubelement = -1;
    this.dragging = false;
  }
  _castRay(touch, type) {
    this._raycaster.setFromCamera(touch.position11, this.camera);
    const hits = this._raycaster.intersectObjects(this.meshes, false);
    this._check(type, hits);
  }
  _performHover(hits = [], action = 'hover_out', el = -1, sub = -1) {
    this.hovering = action === 'hover_in';
    this.hoveringElement = el; this.hoveringSubelement = sub;
    this._callback(this._onHover, action, hits);
    if (this._hoverCursor) this._cursorNode.style.cursor = this.hovering ? 'pointer' : '';
  }
  _performTouch(hits = [], action = 'touch_end', el = -1, sub = -1) {
    this.touching = action === 'touch_start';
    this.touchingElement = el; this.touchingSubelement = sub;
    this._callback(this._onTouch, action, hits);
  }
  _check(type, hits) {
    if (hits.length > 0) {
      if (type === TOUCH_START || type === TOUCH_MOVE) {
        const el = this.meshes.indexOf(hits[0].object);
        let sub = -1;
        if (typeof hits[0].instanceId === 'number') sub = hits[0].instanceId;
        else if (typeof hits[0].batchId === 'number') sub = hits[0].batchId;
        else if (typeof hits[0].object.userData.index === 'number') sub = hits[0].object.userData.index;
        hits[0].index = sub;
        if (this.hovering && (this.hoveringElement !== el || this.hoveringSubelement !== sub)) this._performHover();
        if (!this.hovering && (this._interactWhileTouching || !this._touchPressed)) this._performHover(hits, 'hover_in', el, sub);
        if (type === TOUCH_START) {
          if (this.touching && (this.touchingElement !== el || this.touchingSubelement !== sub)) this._performTouch();
          if (!this.touching && (this._interactWhileTouching || !this._touchPressed)) { this._performTouch(hits, 'touch_start', el, sub); this.dragging = true; }
        } else this._callback(this._onMove, 'move', hits);
      } else if (type === CLICK) this._callback(this._onClick, 'click', hits);
    } else if (this.hovering) this._performHover();
    if (type === TOUCH_END) {
      if (this.hovering && touches.get(this._finger).input === 'touch') this._performHover();
      if (this.touching) this._performTouch();
      this.dragging = false;
    }
    if (type === TOUCH_MOVE && this.dragging) this._callback(this._onDrag, 'drag', hits);
  }
  _callback(fn, action, hits) {
    if (fn) fn.call(this._ctx, { action, finger: this._finger, interactions: hits, event: touches.get(this._finger) });
  }
  _onTouchStart(t) { this._castRay(t, TOUCH_START); this._touchPressed = true; }
  _onTouchMove(t) { this._castRay(t, TOUCH_MOVE); }
  _onTouchEnd(t) { this._touchPressed = false; this._castRay(t, TOUCH_END); }
  _onTouchClick(t) { this._castRay(t, CLICK); }
  enable() {
    if (this._enabled) return;
    this._enabled = true;
    const id = this._eventsID;
    if (this._onTouch || this._onHover || this._onDrag) events.on(`${id}_start`, this._onTouchStart, this);
    if (this._onHover || this._onMove || this._onDrag) events.on(`${id}_move`, this._onTouchMove, this);
    if (this._onTouch || this._onHover || this._onDrag) events.on(`${id}_end`, this._onTouchEnd, this);
    if (this._onClick) events.on(`${id}_click`, this._onTouchClick, this);
    this._onTouchMove(touches.get(this._finger));
  }
  disable() {
    if (!this._enabled) return;
    this._enabled = false;
    this._touchPressed = false;
    const id = this._eventsID;
    events.off(`${id}_start`, this._onTouchStart, this);
    events.off(`${id}_move`, this._onTouchMove, this);
    events.off(`${id}_end`, this._onTouchEnd, this);
    events.off(`${id}_click`, this._onTouchClick, this);
    this._check(TOUCH_END, []);
  }
  dispose() { this.disable(); }
}
