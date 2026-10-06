// The interface over the city, in the page rather than in the scene: paper cards with
// an ink border that boils, Georgian type, every piece of the original's — the four
// side buttons, the district titles, the dialog box with its typewriter and voice
// blips, the quest card after a step, the checklist, the emoji wheel, the wardrobe,
// the ending. Each shows and hides the way the original's does: in steps, with the
// paper sound, staggered.

import { events } from '../core/events.js';
import { createTween, createDelayedCall, wait } from '../core/tween.js';
import { client } from '../core/client.js';
import { QUEST_DATA, INTRO, questProgress, allDone } from '../game/quests.js';
import { EMOJIS, EMOJI_LABELS } from '../game/items.js';
import { HAIR, TOPS, BOTTOMS, SHOES } from '../game/rig.js';
import { renderInfo } from '../core/ticker.js';

const ICONS = {
  list: '<svg viewBox="0 0 40 40"><path d="M9 8h22v26H9z"/><path d="M14 15h12M14 21h12M14 27h8"/></svg>',
  sound: '<svg viewBox="0 0 40 40"><path d="M8 16h7l8-7v22l-8-7H8z"/><path d="M27 14c3 3 3 9 0 12M31 10c5 5 5 15 0 20"/></svg>',
  'sound-muted': '<svg viewBox="0 0 40 40"><path d="M8 16h7l8-7v22l-8-7H8z"/><path d="M27 14l8 12M35 14l-8 12"/></svg>',
  shirt: '<svg viewBox="0 0 40 40"><path d="M14 7l6 3 6-3 8 6-4 6-3-2v16H13V17l-3 2-4-6z"/></svg>',
  emoji: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="13"/><path d="M14 17h.1M26 17h.1M13 23c3 5 11 5 14 0"/></svg>',
  house: '<svg viewBox="0 0 40 40"><path d="M7 20L20 8l13 12v13H7z"/><path d="M17 33V23h6v10"/></svg>',
  officeworker: '<svg viewBox="0 0 40 40"><circle cx="20" cy="13" r="6"/><path d="M9 34c0-8 5-11 11-11s11 3 11 11z"/><path d="M20 23l-3 6h6z"/></svg>',
  flowerlady: '<svg viewBox="0 0 40 40"><circle cx="20" cy="15" r="5"/><circle cx="12" cy="15" r="4"/><circle cx="28" cy="15" r="4"/><circle cx="20" cy="8" r="4"/><circle cx="20" cy="22" r="4"/><path d="M20 26v9M14 35h12"/></svg>',
  cave: '<svg viewBox="0 0 40 40"><path d="M6 33c0-14 6-22 14-22s14 8 14 22z"/><path d="M15 33c0-7 2-11 5-11s5 4 5 11"/></svg>',
  frieb: '<svg viewBox="0 0 40 40"><circle cx="20" cy="12" r="6"/><path d="M9 34c0-8 5-11 11-11s11 3 11 11z"/><path d="M14 12h12"/></svg>',
  frebi: '<svg viewBox="0 0 40 40"><circle cx="20" cy="12" r="6"/><path d="M9 34c0-8 5-11 11-11s11 3 11 11z"/><path d="M13 10h4M23 10h4"/></svg>',
  temple: '<svg viewBox="0 0 40 40"><path d="M9 34V20l11-12 11 12v14z"/><path d="M20 8V4M17 6h6"/><circle cx="20" cy="24" r="3"/></svg>',
  musician: '<svg viewBox="0 0 40 40"><path d="M16 8l16-4v20"/><circle cx="12" cy="26" r="5"/><circle cx="28" cy="24" r="5"/></svg>',
  complete: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="13"/><path d="M12 20l6 6 11-12"/></svg>',
  arrow: '<svg viewBox="0 0 40 40"><path d="M8 20h22M22 10l10 10-10 10"/></svg>',
  cross: '<svg viewBox="0 0 40 40"><path d="M10 10l20 20M30 10L10 30"/></svg>',
  heart: '<svg viewBox="0 0 40 40"><path d="M20 33L8 21c-4-4-2-11 4-11 3 0 6 2 8 5 2-3 5-5 8-5 6 0 8 7 4 11z"/></svg>',
  laugh: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="13"/><path d="M13 16h4M23 16h4M12 22c2 6 14 6 16 0z"/></svg>',
  sad: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="13"/><path d="M14 16h.1M26 16h.1M13 27c3-4 11-4 14 0"/><path d="M27 20v4"/></svg>',
  question: '<svg viewBox="0 0 40 40"><path d="M13 14c0-5 14-6 14 0 0 4-7 4-7 9"/><path d="M20 29h.1"/></svg>',
  bang: '<svg viewBox="0 0 40 40"><path d="M20 8v15"/><path d="M20 30h.1"/></svg>',
  khinkali: '<svg viewBox="0 0 40 40"><path d="M9 28c0-9 5-15 11-15s11 6 11 15z"/><path d="M20 13v-6M17 8l3-2 3 2"/><path d="M12 22c3 0 4-2 8-2s5 2 8 2"/></svg>',
  shoti: '<svg viewBox="0 0 40 40"><path d="M6 20c6-8 22-8 28 0-6 8-22 8-28 0z"/><path d="M12 20h16"/></svg>',
  candle: '<svg viewBox="0 0 40 40"><path d="M16 16h8v18h-8z"/><path d="M20 14c-3-3-2-6 0-8 2 2 3 5 0 8z"/></svg>',
  note: '<svg viewBox="0 0 40 40"><path d="M16 29V9l14-3v20"/><circle cx="12" cy="29" r="4"/><circle cx="26" cy="26" r="4"/></svg>',
  star: '<svg viewBox="0 0 40 40"><path d="M20 6l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z"/></svg>',
  arrowL: '<svg viewBox="0 0 40 40"><path d="M28 8L14 20l14 12"/></svg>',
  arrowR: '<svg viewBox="0 0 40 40"><path d="M12 8l14 12-14 12"/></svg>',
};
const icon = (name) => `<span class="ico">${ICONS[name] || ICONS.question}</span>`;

const VOICE_RATE = { male1: 1.0, male2: 1.0, male3: 1.0, female1: 1.0, female2: 1.0, female3: 1.0, wtf: 0.8, quest: 1.0 };

function el(tag, cls, html = '') { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; }

export class Interface {
  constructor(scene) {
    this.scene = scene;
    this.root = el('div', 'ui');
    document.getElementById('app').appendChild(this.root);
    this.busy = false;
    this.muted = false;
    this.panels = { checklist: false, emojis: false, wardrobe: false };
    this.ready = Promise.resolve();
    this._build();
    this._bind();
  }
  _build() {
    // side buttons
    this.side = el('div', 'side');
    this.sideButtons = [];
    const defs = [['list', 'სია'], ['sound', 'ხმა'], ['shirt', 'ტანსაცმელი'], ['emoji', 'ემოჯი']];
    defs.forEach(([k, title], i) => {
      const b = el('button', 'paper sq side-btn', icon(k));
      b.title = title; b.dataset.kind = k; b.style.setProperty('--i', i);
      this.side.appendChild(b); this.sideButtons.push(b);
      this._paperButton(b, () => this._sideClick(k));
    });
    this.dot = el('span', 'dot'); this.sideButtons[0].appendChild(this.dot);
    this.root.appendChild(this.side);
    this.side.hidden = true;
    // district title
    this.zone = el('div', 'zone'); this.root.appendChild(this.zone);
    // dialog
    this.dialog = el('div', 'dialog');
    this.dialog.innerHTML = `<div class="tag paper"></div><div class="box paper"><div class="text"></div><button class="paper sq arrow">${icon('arrow')}</button></div>`;
    this.dialogTag = this.dialog.querySelector('.tag'); this.dialogBox = this.dialog.querySelector('.box'); this.dialogText = this.dialog.querySelector('.text'); this.dialogArrow = this.dialog.querySelector('.arrow');
    this._paperButton(this.dialogArrow, () => this._dialogAdvance());
    this.dialog.hidden = true;
    this.root.appendChild(this.dialog);
    // quest card
    this.quest = el('div', 'quest');
    this.quest.innerHTML = `<div class="tag paper"></div><div class="box paper"><span class="qicon"></span><div class="text"></div></div>`;
    this.quest.hidden = true;
    this.root.appendChild(this.quest);
    // checklist
    this.checklist = el('div', 'panel checklist paper');
    this.checklist.hidden = true; this.root.appendChild(this.checklist);
    // emoji wheel
    this.emojiPanel = el('div', 'panel emojis paper');
    this.emojiPanel.innerHTML = `<div class="ptitle">ემოჯი</div><div class="grid">${EMOJIS.map((e) => `<button class="paper sq em" data-emoji="${e}" title="${EMOJI_LABELS[e]}">${icon(e)}</button>`).join('')}</div>`;
    this.emojiPanel.querySelectorAll('.em').forEach((b) => this._paperButton(b, () => events.emit('emoji_pop', b.dataset.emoji)));
    this.emojiPanel.hidden = true; this.root.appendChild(this.emojiPanel);
    // wardrobe
    this.wardrobe = el('div', 'panel wardrobe paper');
    const rows = [['hair', 'თმა', HAIR], ['top', 'ზედა', TOPS], ['bottom', 'ქვედა', BOTTOMS], ['shoes', 'ფეხსაცმელი', SHOES]];
    this.wardrobe.innerHTML = `<div class="ptitle">ტანსაცმელი</div>` + rows.map(([k, label]) => `<div class="wrow" data-slot="${k}"><button class="paper sq prev">${icon('arrowL')}</button><div class="wlabel"><small>${label}</small><b class="wname"></b></div><button class="paper sq next">${icon('arrowR')}</button></div>`).join('') + `<button class="paper close">დახურვა</button>`;
    this.wardrobe.querySelectorAll('.wrow').forEach((row) => {
      const slot = row.dataset.slot;
      this._paperButton(row.querySelector('.prev'), () => this._cycle(slot, -1));
      this._paperButton(row.querySelector('.next'), () => this._cycle(slot, 1));
    });
    this._paperButton(this.wardrobe.querySelector('.close'), () => this.togglePanel('wardrobe', false));
    this.wardrobe.hidden = true; this.root.appendChild(this.wardrobe);
    // the prompt near someone
    this.prompt = el('div', 'prompt paper', 'E · ლაპარაკი'); this.prompt.hidden = true; this.root.appendChild(this.prompt);
    // the ending
    this.end = el('div', 'end');
    this.end.innerHTML = `<div class="endtext"><h1>შენ შეძელი!</h1><p>ყველა ამანათი მიიტანე!</p><p>დარჩი და ქალაქი დაათვალიერე, ან ბრაუზერი განაახლე თავიდან დასაწყებად.</p><p class="small">ᲨᲘᲙᲠᲘᲙᲘ · თბილისი, 1995. ორიგინალი თამაში — Messenger, abeto.co, 2025. ეს ვერსია ხელით არის ნახატი, ყველა ხმა არითმეტიკაა.</p><button class="paper cont">› გაგრძელება</button></div>`;
    this._paperButton(this.end.querySelector('.cont'), () => events.emit('end_screen_hide'));
    this.end.hidden = true; this.root.appendChild(this.end);
    this.renderChecklist();
  }
  _paperButton(b, onClick) {
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { b.classList.remove('jolt'); void b.offsetWidth; b.classList.add('jolt'); events.emit('play_audio', 'hover2'); } });
    b.addEventListener('pointerdown', () => { b.classList.add('press'); events.emit('play_audio', 'click2'); });
    b.addEventListener('pointerup', () => { b.classList.remove('press'); events.emit('play_audio', 'click3'); });
    b.addEventListener('pointerleave', () => b.classList.remove('press'));
    b.addEventListener('click', (e) => { e.stopPropagation(); onClick(e); });
  }
  _bind() {
    events.on('zone_enter', this.showZone, this);
    events.on('quest_box_display_after_step', this.showQuest, this);
    events.on('quest_info_checklist_update', this.onChecklistUpdate, this);
    events.on('end_screen_show', this.showEnd, this);
    events.on('end_screen_hide', this.hideEnd, this);
    events.on('npc_nearest', this.onNearest, this);
    events.on('audio_muted', (m) => { this.muted = m; this.sideButtons[1].innerHTML = icon(m ? 'sound-muted' : 'sound'); });
    this._onKey = (e) => {
      if (this.dialogOpen) {
        if (e.code === 'Escape') this._dialogClose(true);
        else if (e.code === 'Space' || e.code === 'KeyE') { this._dialogAdvance(); e.preventDefault(); }
      } else if (e.code === 'Escape' && (this.panels.checklist || this.panels.emojis || this.panels.wardrobe)) this.closePanels();
    };
    window.addEventListener('keydown', this._onKey);
  }
  // ---------------------------------------------------------------- side buttons
  showSideButtons(delay = 0) {
    this.side.hidden = false;
    this.sideButtons.forEach((b, i) => { b.classList.remove('in'); void b.offsetWidth; b.style.animationDelay = `${delay + i * 0.08}s`; b.classList.add('in'); });
    createDelayedCall(delay + 0.15, () => events.emit('play_audio', 'buttons'));
  }
  hideSideButtons() { this.side.hidden = true; }
  _sideClick(k) {
    if (k === 'list') { this.togglePanel('checklist'); this.dot.classList.remove('on'); }
    else if (k === 'sound') { this.scene.mainController.audio.toggleMute(); }
    else if (k === 'shirt') { this.togglePanel('wardrobe'); if (this.panels.wardrobe) events.emit('play_audio', 'customize'); }
    else if (k === 'emoji') { this.togglePanel('emojis'); }
  }
  togglePanel(name, force) {
    const on = force !== undefined ? force : !this.panels[name];
    for (const k of Object.keys(this.panels)) {
      const want = k === name ? on : false;
      if (this.panels[k] === want) continue;
      this.panels[k] = want;
      const node = k === 'checklist' ? this.checklist : k === 'emojis' ? this.emojiPanel : this.wardrobe;
      if (want) { node.hidden = false; node.classList.remove('out'); node.classList.add('in'); events.emit('play_audio', k === 'checklist' ? 'open-box-checklist' : 'open-box1'); if (k === 'checklist') this.renderChecklist(); if (k === 'wardrobe') this.renderWardrobe(); }
      else { node.classList.remove('in'); node.classList.add('out'); setTimeout(() => { if (!this.panels[k]) node.hidden = true; }, 220); events.emit('play_audio', 'open-box2'); }
    }
    this.busy = this.dialogOpen || this.panels.wardrobe || this.endOpen;
    if (this.panels.wardrobe) this.scene.player.freeze(true, 'idle'); else if (!this.dialogOpen && !this.endOpen) this.scene.player.freeze(false);
  }
  closePanels() { for (const k of Object.keys(this.panels)) if (this.panels[k]) this.togglePanel(k, false); }
  // ---------------------------------------------------------------- district titles
  showZone(z) {
    const node = this.zone;
    node.innerHTML = [...z.text].map((ch, i) => `<span style="animation-delay:${0.05 * i}s">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
    node.classList.remove('in', 'out'); void node.offsetWidth; node.classList.add('in');
    events.emit('play_audio', 'title');
    clearTimeout(this._zoneT);
    this._zoneT = setTimeout(() => { node.classList.remove('in'); node.classList.add('out'); }, 4500);
  }
  // ---------------------------------------------------------------- dialog
  /** Run a conversation: each line typed out with voice blips; resolves when the last line is dismissed. */
  conversation(npc, texts) {
    return new Promise(async (resolve) => {
      this.busy = true;
      this.closePanels();
      this.hideSideButtons();
      this.dialogOpen = true;
      this._dialogNpc = npc;
      this.dialogTag.textContent = npc.name;
      this.dialogTag.style.setProperty('--c', npc.color);
      this.dialogBox.style.setProperty('--c', npc.color);
      this.dialog.hidden = false;
      this.dialog.classList.remove('out'); this.dialog.classList.add('in');
      this._paperLoop(true);
      for (let i = 0; i < texts.length; i++) {
        if (npc.puppet) npc.talkPhase = 'talk';
        const done = await this._typeLine(texts[i], npc.voice);
        if (npc.puppet) npc.talkPhase = 'idle';
        if (done === 'closed') break;
        await new Promise((r) => { this._advance = r; });
        if (this._closedEarly) break;
      }
      this._closedEarly = false;
      this.dialog.classList.remove('in'); this.dialog.classList.add('out');
      this._paperLoop(false);
      setTimeout(() => { this.dialog.hidden = true; }, 200);
      this.dialogOpen = false;
      this._dialogNpc = null;
      this.busy = this.panels.wardrobe || this.endOpen;
      if (this.scene.entered) this.showSideButtons(0.2);
      resolve();
    });
  }
  _typeLine(text, voice) {
    return new Promise((resolve) => {
      const node = this.dialogText;
      node.innerHTML = '';
      this._typing = true; this._typeDone = resolve; this._fullText = text;
      // words are laid out first so lines break between them, then filled letter by letter
      const words = text.split(' ');
      const slots = [];
      words.forEach((w, wi) => {
        const ws = document.createElement('span'); ws.className = 'w'; node.appendChild(ws);
        for (const ch of [...w]) slots.push({ parent: ws, ch });
        if (wi < words.length - 1) node.appendChild(document.createTextNode(' '));
      });
      let i = 0;
      const step = () => {
        if (!this._typing) return;
        if (i >= slots.length) { this._typing = false; this.dialogArrow.classList.add('ready'); resolve('typed'); return; }
        const { parent, ch } = slots[i++];
        const span = document.createElement('span'); span.textContent = ch; parent.appendChild(span);
        if (i % 2 === 0) events.emit('play_audio', `voice-${voice || 'male1'}`);
        this._typeTimer = setTimeout(step, ch === '.' || ch === '!' || ch === '?' ? 160 : ch === ',' ? 90 : 1000 / 35);
      };
      this.dialogArrow.classList.remove('ready');
      step();
    });
  }
  _dialogAdvance() {
    if (!this.dialogOpen) return;
    if (this._typing) { clearTimeout(this._typeTimer); this._typing = false; this.dialogText.textContent = this._fullText; this.dialogArrow.classList.add('ready'); if (this._typeDone) this._typeDone('typed'); return; }
    if (this._advance) { const a = this._advance; this._advance = null; a(); }
  }
  _dialogClose() {
    if (!this.dialogOpen) return;
    clearTimeout(this._typeTimer);
    this._closedEarly = true;
    if (this._typing) { this._typing = false; if (this._typeDone) this._typeDone('closed'); }
    else if (this._advance) { const a = this._advance; this._advance = null; a(); }
  }
  _paperLoop(on) { events.emit('set_audio_volume', 'paper', on ? 0.25 : 0); }
  async introDialogue() {
    const fake = { name: INTRO.data.name, color: INTRO.data.color, voice: INTRO.data.voice, puppet: null };
    await this.conversation(fake, INTRO.texts);
  }
  onNearest(n) {
    this.prompt.hidden = !n || this.dialogOpen;
    if (n) this.prompt.textContent = `E · ${n.name}`;
  }
  // ---------------------------------------------------------------- quest card
  showQuest(title, ico, text, color, last) {
    clearTimeout(this._questT);
    this.quest.querySelector('.tag').textContent = title;
    this.quest.querySelector('.qicon').innerHTML = icon(ico);
    this.quest.querySelector('.text').textContent = text;
    this.quest.style.setProperty('--c', color);
    this.quest.classList.toggle('done', !!last);
    this.quest.hidden = false;
    this.quest.classList.remove('in', 'out'); void this.quest.offsetWidth; this.quest.classList.add('in');
    events.emit('play_audio', 'open-box1');
    this._questT = setTimeout(() => { this.quest.classList.remove('in'); this.quest.classList.add('out'); setTimeout(() => { this.quest.hidden = true; }, 250); events.emit('play_audio', 'open-box2'); }, 6000);
  }
  onChecklistUpdate(notable) { this.renderChecklist(); if (notable) this.dot.classList.add('on'); }
  renderChecklist() {
    const p = questProgress();
    this.checklist.innerHTML = `<div class="ptitle">მიტანები</div>` + QUEST_DATA.map((q) => {
      const steps = p[q.id] || [];
      const done = steps.every((s) => s), started = steps.some((s) => s);
      return `<div class="qrow ${done ? 'done' : started ? 'started' : ''}" style="--c:${q.color}"><span class="chk">${done ? ICONS.complete : ''}</span><span>${q.description}</span></div>`;
    }).join('') + `<div class="pfoot">${allDone() ? 'ყველა მიტანა დასრულებულია' : 'ესაუბრე ხალხს, ვისაც ნიშანი აქვს თავზე'}</div>`;
  }
  // ---------------------------------------------------------------- wardrobe
  renderWardrobe() {
    const look = this.scene.player.look;
    const lists = { hair: HAIR, top: TOPS, bottom: BOTTOMS, shoes: SHOES };
    this.wardrobe.querySelectorAll('.wrow').forEach((row) => {
      const slot = row.dataset.slot, list = lists[slot];
      const idx = typeof look[slot] === 'number' ? ((look[slot] % list.length) + list.length) % list.length : 0;
      row.querySelector('.wname').textContent = list[idx].label || list[idx].name;
    });
  }
  _cycle(slot, dir) {
    const lists = { hair: HAIR, top: TOPS, bottom: BOTTOMS, shoes: SHOES };
    const look = this.scene.player.look;
    const cur = typeof look[slot] === 'number' ? look[slot] : 0;
    const next = ((cur + dir) % lists[slot].length + lists[slot].length) % lists[slot].length;
    this.scene.player.setLook({ [slot]: next });
    events.emit('play_audio', 'clothes');
    this.scene.player.puppet.squash = 0.6;
    this.renderWardrobe();
  }
  // ---------------------------------------------------------------- ending
  showEnd() {
    if (this.endOpen) return;
    this.endOpen = true; this.busy = true;
    this.closePanels(); this.hideSideButtons();
    this.scene.player.freeze(true, 'idle');
    this.end.hidden = false; this.end.classList.remove('out'); this.end.classList.add('in');
    events.emit('overlay', true);
    events.emit('play_audio', 'quest-complete');
    events.emit('set_audio_volume', 'dialogue-quest', 0.12);
  }
  hideEnd() {
    if (!this.endOpen) return;
    this.endOpen = false; this.busy = false;
    this.end.classList.remove('in'); this.end.classList.add('out');
    setTimeout(() => { this.end.hidden = true; }, 250);
    events.emit('overlay', false);
    events.emit('play_audio', 'zoom-off');
    events.emit('set_audio_volume', 'dialogue-quest', 0);
    this.scene.player.freeze(false);
    this.showSideButtons(0.2);
  }
  hideAll() { this.closePanels(); this.hideSideButtons(); this.prompt.hidden = true; this.zone.classList.remove('in'); }
  update(dt) {
    // the prompt floats over the nearest townsperson
    const n = this.scene.townsfolk && this.scene.townsfolk.nearest;
    if (n && !this.prompt.hidden) {
      const p = n.position.clone().addScaledVector(n.position.clone().normalize(), (n.puppet ? n.puppet.heightScale * 1.1 : 0.8) + 0.7);
      p.project(this.scene.camera);
      this.prompt.style.left = `${(p.x + 1) / 2 * client.screen.w}px`;
      this.prompt.style.top = `${(1 - p.y) / 2 * client.screen.h}px`;
      this.prompt.style.opacity = p.z < 1 ? 1 : 0;
    }
  }
  dispose() {
    window.removeEventListener('keydown', this._onKey);
    events.off('zone_enter', this.showZone, this); events.off('quest_box_display_after_step', this.showQuest, this);
    events.off('quest_info_checklist_update', this.onChecklistUpdate, this); events.off('end_screen_show', this.showEnd, this); events.off('end_screen_hide', this.hideEnd, this);
    events.off('npc_nearest', this.onNearest, this);
    this.root.remove();
  }
}
