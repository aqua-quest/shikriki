// ᲨᲘᲙᲠᲘᲙᲘ — boot.
//
// Check for WebGL 2, show the loader, bring up the renderer, build the menu (the planet
// is generated and every sound is synthesised while the bread steams), then lift the
// wipe and let the city arrive.

import { client } from './src/core/client.js';
import { global } from './src/core/global.js';
import { events } from './src/core/events.js';
import { Loader } from './src/ui/loader.js';
import { MainController } from './src/mainController.js';

const app = document.getElementById('app');
const webgl = document.getElementById('webgl');
const loader = new Loader(document.getElementById('loader'));

async function boot() {
  const t0 = performance.now();
  if (!client.capabilities.webgl2) {
    const d = document.createElement('div');
    d.className = 'unsupported';
    d.innerHTML = 'ამ ბრაუზერს WebGL 2 არ აქვს 😰 განაახლე და დაბრუნდი.<br><small>Seems like WebGL 2 is not supported by your browser. Please update it to access the experience.</small>';
    app.appendChild(d);
    return;
  }
  loader.show();
  events.on('toggle_loader', (on) => { if (on) loader.show(); else loader.hide(); });
  const dpr = window.devicePixelRatio || 1;
  const DPR = client.lowMemoryDevice ? Math.min(dpr, 1.25) : Math.min(dpr, 1.5);
  await global.init({ container: webgl, DPR, shadowMap: true, adaptiveDPR: true });
  const controller = new MainController();
  window.__shikriki = { controller, global, client };
  await controller.ready;
  window.__shikriki.bootMs = Math.round(performance.now() - t0);
  loader.hide();
  controller.start();
}

boot();
