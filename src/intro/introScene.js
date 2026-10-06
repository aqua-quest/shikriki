// The menu scene and its timeline.
//
// Arrival: the planet rises from below, a third its size, rolling over once as it
// grows, over about six seconds; the haze breathes in at 1.45 s, the specks at 0.5,
// the far ridges at 2.2, the letters from 2.35, the birds at 2.7, the button at 3.3.
// A whoosh at the start and another at 1.8 s, the letter chime at 2.5, the button's
// clunk at 3.45. Interaction unlocks at three seconds.
//
// Departure, on the button: the button spins away, the orbit stops, the camera swings
// a quarter turn round and down and dives from 120 units out to 40, rolling as it goes,
// and the wipe takes over.

import * as THREE from 'three';
import { BaseScene } from '../core/scene.js';
import { global } from '../core/global.js';
import { events } from '../core/events.js';
import { client } from '../core/client.js';
import { createTween, createDelayedCall, wait } from '../core/tween.js';
import { Planet } from './planet.js';
import { Sky } from './sky.js';
import { Birds } from './birds.js';
import { Atmosphere } from './atmosphere.js';
import { Title } from './title.js';
import { Specks } from './specks.js';
import { Backdrop } from './backdrop.js';
import { Button } from './button.js';
import { loadFont } from './text.js';

const _v0 = new THREE.Vector3(), _m0 = new THREE.Matrix4(), _q0 = new THREE.Quaternion();

export class IntroScene extends BaseScene {
  constructor(mainController) {
    super({ orbit: true, fov: 42 });
    this.name = 'intro';
    this.mainController = mainController;
    this.mobileLayout = false;
    this._outRotation = { value: 0 };
    this._init();
  }
  async _init() {
    await loadFont();
    this.setupCamera();
    this.planetGroup = new THREE.Group();
    this.planetGroup.name = 'Planet Group';
    this.add(this.planetGroup);
    this.planet = new Planet(this.planetGroup);
    this.sky = new Sky(this);
    this.birds = new Birds(this, { count: 15, groups: 5 });
    this.atmosphere = new Atmosphere(this);
    this.title = new Title(this);
    this.specks = new Specks(this, { count: 380 });
    this.backdrop = new Backdrop(this);
    this.button = new Button(this);
    await Promise.all([this.planet.ready, this.title.ready, this.button.ready]);
    this.setupLights();
    this._resize();
    events.on('resize', this._resize, this);
    this.beforeRenderCbs.push(this.update.bind(this));
    if (client.devScene) { window._scene = this; window._camera = this.camera; }
    this.isReady();
  }
  setupCamera() {
    const c = this.camera;
    c.basePosition.set(0, 0, -120);
    c.baseTarget.set(0, -2.5, 0);
    c.lerpRotate = 1; c.lerpZoom = 1; c.lerpPan = 1;
    c.displacement.position.set(0, 0);
    c.displacement.target.set(-0.01, -0.0075);
    c.displacement.rotation = 0.01;
    c.lerpPosition = 1; c.lerpTarget = 0.02; c.lerpRotation = 0.05;
    c.autoRotate = true;
    c.autoRotateSpeed = 1;
    c.near = 2; c.far = 1000;
    c.updateProjectionMatrix();
  }
  setupLights() {
    this.light = new THREE.DirectionalLight(0xffffff, 1);
    this.light.position.set(100, 100, 0);
    this.light._originalPosition = this.light.position.clone();
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(client.lowMemoryDevice ? 1024 : 2048, client.lowMemoryDevice ? 1024 : 2048);
    this.light.shadow.camera.near = 50;
    this.light.shadow.camera.far = 200;
    this.light.shadow.bias = 0.002;
    this.light.shadow.normalBias = 0.3;
    const e = 100 / 3.25;
    this.light.shadow.camera.left = -e; this.light.shadow.camera.right = e; this.light.shadow.camera.top = e; this.light.shadow.camera.bottom = -e;
    this.light.shadow.camera.updateProjectionMatrix();
    this.add(this.light);
    this.add(this.light.target);
    global.uniforms.lightDir.value.copy(this.light.position).normalize();
    this.directionalLight = this.light;
  }
  _resize() {
    if (this.___disposed) return;
    this.mobileLayout = client.screen.w < client.screen.h && client.screen.w < 700;
    this.camera.zoom = this.mobileLayout ? 0.8 : 1;
    this.camera.updateProjectionMatrix();
    this.button.resize();
    this.title.resize();
  }
  /** The sun stays over the camera's right shoulder, so the city is always lit from the upper right on screen. */
  updateLight() {
    const cam = this.camera;
    _v0.copy(cam.position).sub(cam.target); _v0.y = 0; _v0.normalize();
    _v0.applyAxisAngle(cam.up.y >= 0 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, -1, 0), -0.95);
    _v0.y = 0.9; _v0.normalize().multiplyScalar(141);
    this.light.position.copy(_v0);
    this.light._originalPosition.copy(_v0);
    this.light.position.y += this.planetGroup.position.y;
    global.uniforms.lightDir.value.copy(_v0).normalize();
  }
  update() {
    if (this.___disposed) return;
    this.planet.update();
    this.updateLight();
    // the camera rolls about its own view axis on the way out
    this.camera.quaternion.setFromRotationMatrix(_m0.lookAt(this.camera.position, this.camera.target, this.camera.up));
    _q0.setFromAxisAngle(_v0.subVectors(this.camera.position, this.camera.target).normalize(), this._outRotation.value);
    this.camera.quaternion.premultiply(_q0);
    this.camera.updateMatrixWorld();
  }
  async playInAnimation() {
    const pg = this.planetGroup;
    pg.position.y = -80;
    createTween(pg.position, { to: { x: 0, y: 0, z: 0 }, duration: 2.25, delay: 0.2, ease: 'inOut1', onUpdate: () => {
      this.light.target.position.y = pg.position.y;
      this.light.target.updateMatrixWorld();
    } });
    pg.scale.setScalar(0.3);
    createTween(pg.scale, { to: { x: 1, y: 1, z: 1 }, duration: 6.3, delay: 0.2, ease: 'inOut3' });
    const restY = Math.PI * 0.35;
    pg.rotation.y = restY - Math.PI * 1.5;
    createTween(pg.rotation, { to: { y: restY }, delay: 0.35, duration: 5.65, ease: 'inOut3' });
    createTween(pg.rotation, { from: { x: -Math.PI }, to: { x: 0 }, delay: 0.2, duration: 2, ease: 'inOut1' });
    this.atmosphere.playInAnimation(0.2 + 1.25);
    this.birds.playInAnimation(0.2 + 2.5);
    this.title.playInAnimation(0.2 + 2.15);
    this.specks.playInAnimation(0.2 + 0.3);
    this.backdrop.playInAnimation(0.2 + 2);
    this.button.playInAnimation(0.2 + 3.1);
    createDelayedCall(0.16, () => events.emit('play_audio', 'whoosh'));
    createDelayedCall(1.8, () => events.emit('play_audio', 'whoosh'));
    createDelayedCall(2.5, () => events.emit('play_audio', 'intro-letters'));
    createDelayedCall(3.45, () => events.emit('play_audio', 'button-turn'));
    await wait(3);
    if (this.___disposed) return;
    this.title.interaction.enable();
    this.title.hoveredObj = null;
    this.button.interaction.enable();
  }
  async playOutAnimation() {
    this.button.interaction.disable();
    this.title.interaction.disable();
    this.button.spinOut();
    await wait(0.2);
    const cam = this.camera;
    createTween(cam, { to: { autoRotateSpeed: 0 }, duration: 1, ease: 'power2.inOut', onUpdate: () => { if (!this.___disposed) cam.touchAmount = cam.autoRotateSpeed; } });
    createTween(cam._sphericalTarget, { to: { theta: cam._sphericalTarget.theta - Math.PI * 0.25, phi: 1.7 }, duration: 2.5, ease: 'tweaked' });
    createTween(cam._sphericalTarget, { to: { radius: 40 }, duration: 2.75, delay: 0.4, ease: 'inOut1' });
    const roll = createTween(this._outRotation, { to: { value: -Math.PI * 0.25 }, duration: 3.35, delay: 0.2, ease: 'inOut1' });
    this.button.playOutAnimation();
    this.title.playOutAnimation();
    createDelayedCall(1, () => events.emit('play_audio', 'whoosh'));
    await roll;
  }
  dispose() {
    this.___disposed = true;
    events.off('resize', this._resize, this);
    this.title.interaction.dispose();
    this.button.interaction.dispose();
    super.dispose();
  }
}
