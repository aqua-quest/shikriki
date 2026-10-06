// The districts. Each is a sphere on the planet; walking into one shows its name, and
// the ambience under the music changes with it: traffic and crows in the city, water
// at the baths and the falls, wind in the pines on Mtatsminda, waves and gulls at the
// reservoir.

import * as THREE from 'three';
import { events } from '../core/events.js';
import { offset, riverWidth, HILLS, LAKE, R } from '../intro/planet.js';
import { math } from '../core/math.js';

export const ZONES = [
  { id: 'vera', text: 'ვერა', dir: offset(0.2, -1, riverWidth(0.2) + 0.09), r: 3.4, ambience: 'city' },
  { id: 'sololaki', text: 'სოლოლაკი', dir: offset(0.1, -1, 0.11), r: 2.6, ambience: 'city' },
  { id: 'oldtown', text: 'ძველი თბილისი', dir: offset(0.06, -1, riverWidth(0.06) + 0.05), r: 2.4, ambience: 'city' },
  { id: 'square', text: 'თავისუფლების მოედანი', dir: offset(0.13, -1, riverWidth(0.13) + 0.06), r: 2.2, ambience: 'city' },
  { id: 'baths', text: 'აბანოთუბანი', dir: offset(0.018, -1, riverWidth(0.018) + 0.045), r: 2.6, ambience: 'water' },
  { id: 'narikala', text: 'ნარიყალა', dir: offset(0.05, -1, 0.11), r: 2.2, ambience: 'wind' },
  { id: 'mtatsminda', text: 'მთაწმინდა', dir: HILLS[0].dir.clone(), r: 5.5, ambience: 'forest' },
  { id: 'avlabari', text: 'ავლაბარი', dir: offset(0.05, 1, 0.1), r: 2.8, ambience: 'city' },
  { id: 'metekhi', text: 'მეტეხი', dir: offset(0.035, 1, riverWidth(0.035) + 0.03), r: 1.6, ambience: 'water' },
  { id: 'drybridge', text: 'მშრალი ხიდი', dir: offset(0.1, 1, riverWidth(0.1) + 0.035), r: 1.8, ambience: 'city' },
  { id: 'saburtalo', text: 'საბურთალო', dir: offset(0.48, -1, 0.2), r: 5.0, ambience: 'city' },
  { id: 'institute', text: 'ინსტიტუტი', dir: offset(0.45, 1, 0.18), r: 3.0, ambience: 'city' },
  { id: 'sea', text: 'თბილისის ზღვა', dir: LAKE.dir.clone(), r: 5.0, ambience: 'sea' },
  { id: 'village', text: 'სოფელი', dir: offset(0.8, -1, 0.2), r: 5.5, ambience: 'forest' },
];

const AMBIENCES = ['city', 'water', 'forest', 'sea', 'wind'];

export class Zones {
  constructor(scene) {
    this.scene = scene;
    this.zones = ZONES.map((z) => ({ ...z, center: scene.planet.terrain.surface(z.dir, new THREE.Vector3()) }));
    this.current = null;
    this.volumes = {};
    for (const a of AMBIENCES) this.volumes[a] = 0;
    this.enabled = true;
  }
  zoneAt(p) {
    let best = null, bestD = 1e9;
    for (const z of this.zones) {
      const d = p.distanceTo(z.center) - z.r;
      if (d < 0 && d < bestD) { bestD = d; best = z; }
    }
    return best;
  }
  update(dt) {
    const p = this.scene.player.position;
    const z = this.zoneAt(p);
    if (z !== this.current) {
      this.current = z;
      if (z && this.enabled) events.emit('zone_enter', z);
    }
    // ambience: the current zone's, faded over a second
    const want = z ? z.ambience : null;
    for (const a of AMBIENCES) {
      const target = want === a ? 1 : 0;
      this.volumes[a] = math.lerp(this.volumes[a], target, 1 - Math.exp(-dt * 1.5));
      events.emit('set_audio_volume', `ambiance-${a}`, this.volumes[a] * 0.4);
    }
  }
  dispose() { for (const a of AMBIENCES) events.emit('set_audio_volume', `ambiance-${a}`, 0); }
}
