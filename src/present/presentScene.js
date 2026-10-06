// The city, at street level. The same planet the menu showed, with the courier standing
// in Vera, a follow camera, the townsfolk, the deliveries, and the interface laid over
// it. The menu's intro scene is thrown away when this is built; Escape in a quiet moment
// goes back to it through the same wipes.

import * as THREE from 'three';
import { BaseScene } from '../core/scene.js';
import { global } from '../core/global.js';
import { events } from '../core/events.js';
import { client } from '../core/client.js';
import { createTween, wait } from '../core/tween.js';
import { renderInfo } from '../core/ticker.js';
import { Planet, offset, riverWidth, HILLS, LAKE } from '../intro/planet.js';
import { Sky } from '../intro/sky.js';
import { Birds } from '../intro/birds.js';
import { Atmosphere } from '../intro/atmosphere.js';
import { Specks } from '../intro/specks.js';
import { Backdrop } from '../intro/backdrop.js';
import { loadFont } from '../intro/text.js';
import { Player } from '../game/player.js';
import { FollowCamera } from '../game/followCamera.js';
import { Townsfolk } from '../game/npcs.js';
import { Quests } from '../game/quests.js';
import { Zones } from '../game/zones.js';
import { Items } from '../game/items.js';
import { Interface } from '../ui/interface.js';
import { math } from '../core/math.js';

const _v0 = new THREE.Vector3();

export class PresentScene extends BaseScene {
  constructor(mainController) {
    super({ orbit: false, fov: 46 });
    this.name = 'present';
    this.mainController = mainController;
    this.entered = false;
    this._init();
  }
  async _init() {
    await loadFont();
    const c = this.camera;
    c.near = 0.3; c.far = 1400;
    c.updateProjectionMatrix();
    this.planetGroup = new THREE.Group();
    this.add(this.planetGroup);
    this.planet = new Planet(this.planetGroup);
    this.sky = new Sky(this);
    this.birds = new Birds(this, { count: 12, groups: 4, radius: 44, tilt: 0.9 });
    this.atmosphere = new Atmosphere(this);
    this.specks = new Specks(this, { count: 220 });
    this.backdrop = new Backdrop(this);
    this.setupLights();

    // the courier starts in Vera, by the lower funicular station, facing the river
    const spawnDir = offset(0.205, -1, riverWidth(0.205) + 0.085);
    const spawn = this.planet.terrain.surface(spawnDir, new THREE.Vector3());
    const toward = offset(0.205, -1, riverWidth(0.205) + 0.02).sub(spawnDir);
    this.player = new Player(this, this.planet.terrain, { position: spawn, heading: toward });
    this.player.obstacles = [
      ...this.planet.accepted.map((a) => ({ pos: a.pos, r: a.r * 0.78 })),
      ...this.planet.landmarks.map((l) => ({ pos: l.pos, r: l.r })),
    ];
    this.followCamera = new FollowCamera(this.camera, this.player, this.planet.terrain);
    this.followCamera.alignBehind();
    this.followCamera.snap();

    this.items = new Items(this);
    this.townsfolk = new Townsfolk(this);
    this.quests = new Quests(this);
    this.zones = new Zones(this);
    this.ui = new Interface(this);
    await Promise.all([this.townsfolk.ready, this.ui.ready]);

    this.beforeRenderCbs.push(this.update.bind(this));
    this._onKey = (ev) => {
      if (ev.code === 'Escape' && !this.___disposed && this.entered && !this.ui.busy) events.emit('switch_to_intro_scene');
    };
    window.addEventListener('keydown', this._onKey);
    if (client.devScene) { window._scene = this; }
    this.isReady();
  }
  setupLights() {
    this.light = new THREE.DirectionalLight(0xffffff, 1);
    this.light.position.set(100, 100, 0);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(2048, 2048);
    this.light.shadow.camera.near = 20; this.light.shadow.camera.far = 120;
    this.light.shadow.bias = 0.0015; this.light.shadow.normalBias = 0.12;
    const e = 16;
    this.light.shadow.camera.left = -e; this.light.shadow.camera.right = e; this.light.shadow.camera.top = e; this.light.shadow.camera.bottom = -e;
    this.light.shadow.camera.updateProjectionMatrix();
    this.add(this.light); this.add(this.light.target);
    this.directionalLight = this.light;
  }
  /** The light rides along with the courier so the shadow map stays sharp around them. */
  updateLight() {
    const p = this.player.position;
    const up = _v0.copy(p).normalize();
    const camDir = this.camera.position.clone().sub(p); camDir.addScaledVector(up, -camDir.dot(up)).normalize();
    const side = new THREE.Vector3().crossVectors(up, camDir).normalize();
    const dir = up.clone().multiplyScalar(0.9).addScaledVector(side, -0.55).addScaledVector(camDir, 0.35).normalize();
    this.light.target.position.copy(p);
    this.light.target.updateMatrixWorld();
    this.light.position.copy(p).addScaledVector(dir, 60);
    global.uniforms.lightDir.value.copy(dir);
  }
  /** The base scene would run the orbit camera; here the follow camera owns it. */
  updateMatrixWorld(force) {
    if (this.__frame !== renderInfo.frame) {
      this.__frame = renderInfo.frame;
      this.camera._resize();
      for (const cb of this.beforeRenderCbs) cb();
    }
    THREE.Scene.prototype.updateMatrixWorld.call(this, force);
  }
  update() {
    if (this.___disposed) return;
    const dt = Math.min(0.05, renderInfo.delta / 1000);
    this.planet.update();
    this.player.update(dt);
    this.player.puppet.update(dt);
    this.townsfolk.update(dt);
    this.items.update(dt);
    this.followCamera.update(dt);
    this.zones.update(dt);
    this.updateLight();
    this.ui.update(dt);
  }
  async playInAnimation() {
    this.atmosphere.playInAnimation(0.2);
    this.specks.playInAnimation(0.2);
    this.backdrop.playInAnimation(0.2);
    this.birds.playInAnimation(0.5);
    events.emit('set_audio_volume', 'ambiance-base', 0.3);
    await wait(1.2);
    if (this.___disposed) return;
    await this.ui.introDialogue();
    if (this.___disposed) return;
    this.entered = true;
    this.player.controls.enable();
    this.ui.showSideButtons();
  }
  async playOutAnimation() {
    this.entered = false;
    this.player.controls.disable();
    this.ui.hideAll();
    events.emit('set_audio_volume', 'ambiance-base', 0);
    createTween(this.followCamera, { to: { radiusTarget: 40 }, duration: 1.6, ease: 'inOut1' });
    await wait(1.5);
  }
  dispose() {
    window.removeEventListener('keydown', this._onKey);
    this.player.dispose();
    this.followCamera.dispose();
    this.townsfolk.dispose();
    this.quests.dispose();
    this.zones.dispose();
    this.items.dispose();
    this.ui.dispose();
    super.dispose();
  }
}
