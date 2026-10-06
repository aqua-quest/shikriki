// The controller: which scene is showing, the layer that composes it to the screen with
// the wipes, and the two transitions. Arrival lifts the paper wipe off the menu over two
// seconds. Leaving, on the button: after a beat the picture flashes to white, the second
// wipe sweeps in behind the diving camera, the menu is thrown away, the next scene is
// built under the loader, and the first wipe lifts again.

import { events } from './core/events.js';
import { global } from './core/global.js';
import { client } from './core/client.js';
import { createTween, createDelayedCall, wait } from './core/tween.js';
import { FullscreenPass, WipeMaterial, SceneComposer } from './render/passes.js';
import { AudioController } from './audio/audio.js';
import { IntroScene } from './intro/introScene.js';
import { PresentScene } from './present/presentScene.js';
import { storage } from './core/storage.js';

const OUTLINE = { intro: { color: '#3a2723', thickness: 1.4, fadeStart: 260, fadeEnd: 600 }, present: { color: '#3a2723', thickness: 1.4, fadeStart: 60, fadeEnd: 160 } };

export class MainController {
  constructor() {
    this.state = null;
    this.composers = {};
    this.currentScene = null;
    this.ready = new Promise((r) => { this._ready = r; });
    this.init();
  }
  async init() {
    this.wipe = new WipeMaterial();
    this.wipePass = new FullscreenPass(this.wipe);
    this.audio = new AudioController();
    const ta = performance.now();
    await Promise.all([this.audio.init().then(() => { this.audioMs = Math.round(performance.now() - ta); }), this.initIntro()]);
    events.once('switch_to_present_scene', this.switchToPresent, this);
    events.on('render', this.render, this);
    events.on('overlay', this.overlayAnimation, this);
    this.composers[this.state].render();
    this._ready();
  }
  async initIntro() {
    const t0 = performance.now();
    const scene = new IntroScene(this);
    await scene.ready;
    const t1 = performance.now();
    await scene.upload();
    const t2 = performance.now();
    this.timings = { buildMs: Math.round(t1 - t0), uploadMs: Math.round(t2 - t1) };
    this.composers.intro = new SceneComposer(scene, OUTLINE.intro);
    this.currentScene = scene;
    this.state = 'intro';
  }
  async initPresent() {
    const scene = new PresentScene(this);
    await scene.ready;
    await scene.upload();
    this.composers.present = new SceneComposer(scene, OUTLINE.present);
    this.currentScene = scene;
    this.state = 'present';
    events.once('switch_to_intro_scene', this.switchToIntro, this);
  }
  async switchToPresent() {
    if (!this.composers.intro) return;
    storage.set('started', true);
    createDelayedCall(1.5, () => events.emit('toggle_loader', true));
    createTween(this.wipe.uniforms.uFlash, { to: { value: 1 }, duration: 1, delay: 1, ease: 'power2.inOut' });
    await Promise.all([this.currentScene.playOutAnimation(), createTween(this.wipe.uniforms.uWipe2, { to: { value: 1 }, duration: 1.15, delay: 0.85, ease: 'power2.inOut' })]);
    this.composers.intro.dispose();
    delete this.composers.intro;
    this.state = null;
    if (client.lowMemoryDevice) await wait(0.35);
    this.wipe.uniforms.uWipe1.value = 1;
    this.wipe.uniforms.uWipe2.value = 0;
    if (global.adaptiveDPR) global.adaptiveDPR.stop();
    await this.initPresent();
    if (global.adaptiveDPR) global.adaptiveDPR.start();
    createTween(this.wipe.uniforms.uFlash, { to: { value: 0 }, duration: 1, ease: 'power2.inOut' });
    events.emit('toggle_loader', false);
    await Promise.all([this.currentScene.playInAnimation(), createTween(this.wipe.uniforms.uWipe1, { to: { value: 0 }, duration: 2, ease: 'inOut1' })]);
  }
  /** Back to the menu, the same way in reverse. */
  async switchToIntro() {
    if (!this.composers.present) return;
    createDelayedCall(1.0, () => events.emit('toggle_loader', true));
    await Promise.all([this.currentScene.playOutAnimation(), createTween(this.wipe.uniforms.uWipe2, { to: { value: 1 }, duration: 1.15, delay: 0.3, ease: 'power2.inOut' })]);
    this.composers.present.dispose();
    delete this.composers.present;
    this.state = null;
    this.wipe.uniforms.uWipe1.value = 1;
    this.wipe.uniforms.uWipe2.value = 0;
    await this.initIntro();
    events.once('switch_to_present_scene', this.switchToPresent, this);
    events.emit('toggle_loader', false);
    this.start();
  }
  render() {
    const c = this.state && this.composers[this.state];
    if (!c) return;
    c.render();
    this.wipe.uniforms.tScene.value = c.texture;
    this.wipePass.render(null);
  }
  overlayAnimation(on = false) {
    createTween(this.wipe.uniforms.uOverlay, { to: { value: on ? 1 : 0 }, duration: on ? 0.6 : 0.3, delay: on ? 0 : 0.2 });
  }
  start() {
    if (global.adaptiveDPR) global.adaptiveDPR.start();
    createTween(this.wipe.uniforms.uWipe1, { to: { value: 0 }, delay: 0, duration: 2, ease: 'inOut1' });
    this.currentScene.playInAnimation();
  }
}
