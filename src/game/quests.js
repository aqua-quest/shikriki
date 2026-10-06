// The five deliveries, and the engine that runs them.
//
// A quest is an ordered list of steps; each step names the townsperson whose
// conversation completes it, the lines they say when you reach them, and what to show
// afterwards: a card ("next up", "package received", "completed"), and the thing that
// flies into the courier's bag. Progress is saved; when all five are done the ending
// shows, and the next visit starts over. The logic is the original's, step for step;
// the city, the people and every word are Tbilisi in 1995.

import { events } from '../core/events.js';
import { storage } from '../core/storage.js';
import { renderInfo } from '../core/ticker.js';
import { wait } from '../core/tween.js';

const DONE = { uiTitle: 'შესრულებულია', uiIcon: 'complete', uiText: 'გილოცავ! კიდევ ერთი მიტანა წარმატებით დასრულდა' };

export const QUEST_DATA = [
  {
    id: 'quest-employee', description: 'კარიერული კიბიდან ჩამოვარდნა', color: '#c25959',
    steps: [
      { id: 'office-worker-2', texts: ['ღმერთო, რა კარგია, რომ მოხვედი! დილით უფროსს წერილი გავუგზავნე, მაგრამ სანამ წაიკითხავს, უკან უნდა დავიბრუნო...', 'სოლოლაკში ცხოვრობს, წითელ სახლში კლდის თავზე. ნეტავ ჯერ არ წაუკითხავს?'],
        extraData: { uiTitle: 'შემდეგი', uiIcon: 'house', uiText: 'იპოვე წითელი სახლი სოლოლაკში და წერილი დაიბრუნე' } },
      { id: 'boss', texts: ['ჩემმა თანამშრომელმა დაწერა ეს? ვერ ვიჯერებ... ეს... ეს...', '...სასაცილოა! ვაა, როგორ მამასხარავებს. იქნებ მართლა მენეჯერობა უხდება...', 'ამ ბარათს დაუბრუნებ? თავისუფლების მოედანზე მუშაობს.'],
        extraData: { uiTitle: 'ამანათი მიღებულია', uiIcon: 'officeworker', uiText: 'წაუღე დირექტორის ბარათი ბანკის თანამშრომელს თავისუფლების მოედანზე', receiveModel: 'note' } },
      { id: 'office-worker-2', texts: ['დაწინაურება... მე?', 'ვაა, ვინ იფიქრებდა, რომ ყველაზე დაბალი ინსტინქტებით მოქმედება კარიერაში დამეხმარებოდა.'], extraData: { ...DONE } },
    ],
  },
  {
    id: 'quest-caveman', description: 'კაცი, რომელიც რაღაცას ემალება', color: '#f3c258',
    steps: [
      { id: 'caveman', texts: ['ჰეი! ამ ღია ბარათს ჩემს ცოლს მიუტან? ყვავილებს ყიდის თავისუფლების მოედანზე.', 'მე თვითონ მივუტანდი, მაგრამ... ეე... მუხლი მტკივა ამჟამად...'],
        extraData: { uiTitle: 'ამანათი მიღებულია', uiIcon: 'flowerlady', uiText: 'წაუღე აბანოში დამალული კაცის ღია ბარათი ყვავილების გამყიდველ ქალს', receiveModel: 'postcard' } },
      { id: 'flower-lady', texts: ['ოჰ, ღია ბარათი ჩემი ქმრისგან!', 'ახლა საზღვარგარეთ არის მივლინებით, ყველანაირ ეგზოტიკურ ადგილას დადის!', 'შენ და მე რომ ვიცით, ვიცი, რომ გოგირდის აბანოში ზის... იმედია, ეს შუახნის კრიზისი მალე გაუვლის...', 'ამ სუფთა ტანსაცმელს მიუტან? არ უთხრა, რომ ჩემგანაა. უთხარი, რომ პრიზი მოიგო.'],
        extraData: { uiTitle: 'ამანათი მიღებულია', uiIcon: 'cave', uiText: 'წაუღე სუფთა ტანსაცმელი აბანოში დამალულ კაცს', receiveModel: 'clothes' } },
      { id: 'caveman', texts: ['ვაა, კიდევ პრიზი?', 'დროზეა. ბოლო საცვალი დამრჩა.'], extraData: { ...DONE } },
    ],
  },
  {
    id: 'quest-scientists', description: 'მეცნიერები და არეული ამანათები', color: '#66BDE6',
    steps: [
      { id: 'factory-worker-a', texts: ['ჰეი, დამეხმარები? ხალხი გვაკლია და, ჰოდა... ზოგი ფოსტა შეცდომით სხვა მისამართზე წავიდა...', 'იპოვე დოქტორი გია და ჰკითხე, მიიღო თუ არა ბოლო დროს რამე ამანათი. მთაწმინდის ძირში ცხოვრობს.'],
        extraData: { uiTitle: 'შემდეგი', uiIcon: 'frieb', uiText: 'იპოვე დოქტორი გია მთაწმინდის ძირში' } },
      { id: 'male-scientist', texts: ['გამარჯობა! კი, შეცდომით გავხსენი ერთი ფოსტა. რაღაც "სეისმური მონაცემების ანალიზი" თუ რაღაც...', 'ალბათ დოქტორ ნინოში ამერიეს, ინსტიტუტიდან...', '...მოიცა, ესე იგი ჩემი შეკვეთა დოქტორ ნინოსთან წავიდა? ოჰ არა!!!', 'მე... ეე... ისედაც არასწორი რამ შევუკვეთე... უთხარი, რომ აღარ მჭირდება...'],
        extraData: { uiTitle: 'ამანათი მიღებულია', uiIcon: 'frebi', uiText: 'წაუღე სეისმური ანალიზი დოქტორ ნინოს, ინსტიტუტში', receiveModel: 'samplebox' } },
      { id: 'female-scientist', texts: ['ოჰ, შენ მიტანის სამსახურში მუშაობ? დიდი ხანია თქვენთან ლაპარაკი მინდოდა...', 'იცი, რატომ მივიღე 63 კოლოფი ჰუმანიტარული მაკარონი? ეს სასურსათო მაღაზიისთვის იყო თუ რა?', 'არაფერი იცი ამაზე? კარგი. ამანათისთვის გმადლობ.'], extraData: { ...DONE } },
    ],
  },
  {
    id: 'quest-temple', description: 'შესაწირი მთაწმინდაზე', color: '#8cc48c',
    steps: [
      { id: 'oldwoman', texts: ['უკაცრავად, ამ შესაწირს მთაწმინდაზე, მამა დავითის ეკლესიაში აიტან?', 'ამ ასაკში აღმართი აღარ მემორჩილება.'],
        extraData: { uiTitle: 'ამანათი მიღებულია', uiIcon: 'temple', uiText: 'აიტანე ბებოს შესაწირი მამა დავითის ეკლესიაში მთაწმინდაზე', receiveModel: 'offering' } },
      { id: 'mountainman', texts: ['ოჰ, ნაზუქი და ჭაჭა?', 'ჩემი საყვარელი.'], extraData: { ...DONE } },
    ],
  },
  {
    id: 'quest-musician', description: 'წერილი, რომელიც ზღვამ დაკარგა', color: '#de794e',
    steps: [
      { id: 'diver', texts: ['ნახე ეს! დილით თევზაობისას ეს ძველი ყუთი ამოვიღე ლამიდან.', 'შიგნით წერილი იდო. ცოტა სველია, მაგრამ თავზე სახელი იკითხება: დათო.', 'საოცარია, არა? ერთ დათოს ვიცნობ. იქნებ იგივეა?', 'ალბათ ყარს ჩანჩქერთან იქნება, აბანოების უკან, თუ წაუღებ.'],
        extraData: { uiTitle: 'ამანათი მიღებულია', uiIcon: 'musician', uiText: 'წაუღე საიდუმლო წერილი დათოს ყარს ჩანჩქერთან', receiveModel: 'letterwet' } },
      { id: 'musician', texts: ['წერილი ჩემთვის? ზღვის ფსკერიდან? ვინც დაწერა... მე ვარ!', 'ვნახოთ, რა მივწერე საკუთარ თავს ამდენი წლის წინ...', '"ძვირფასო მომავლის დათო..."', '"ყოველდღე ივარჯიშე..."', '"ბევრ მზეზე იყავი..."', '"თმას გაუფრთხილდი. გაზარდე ველურად და თავისუფლად. თმა შენი სულია და შენი პიროვნების მთავარი ნიშანი."', 'ჰმ...', '...სამიდან ორი არც ისე ცუდია.'], extraData: { ...DONE } },
    ],
  },
];

export const INTRO = {
  data: { name: 'ᲨᲘᲙᲠᲘᲙᲘ', color: '#66BDE6', voice: 'quest' },
  texts: ['როგორც ჩანს, ზედმეტი მეძინა... დღევანდელი მიტანები უნდა დავიწყო.', 'ხუთი მაქვს სიაში. იმედია, ადვილად ვიპოვი.', 'კარგი, წავედი.'],
};

// ---------------------------------------------------------------- progress

let progress = storage.get('questProgress') || {};
function reset() { progress = {}; for (const q of QUEST_DATA) progress[q.id] = q.steps.map(() => false); }
function save() { storage.set('questProgress', progress); }
function valid() { return QUEST_DATA.every((q) => Array.isArray(progress[q.id]) && progress[q.id].length === q.steps.length); }
export function allDone() { return QUEST_DATA.every((q) => progress[q.id].every((s) => s)); }
if (!valid()) reset();
if (allDone()) reset();
save();
export const anyStepInitiated = QUEST_DATA.some((q) => progress[q.id].some((s) => s));
export function questProgress() { return progress; }

class Quest {
  constructor(data) {
    this.id = data.id;
    this.data = data;
    this.steps = data.steps.map((s, i) => ({ ...s, index: i, completed: !!progress[data.id][i], enabled: false }));
    this.lastStepTime = -1e9;
    // listen before enabling anything: a townsperson asks for their lines the moment their step turns on
    events.on('quest_step_texts_check', this.onTexts, this);
    events.on('quest_step_check', this.onStep, this);
    if (this.isCompleted()) this.finish(false);
    else this.ensureEnabled();
  }
  isCompleted(upTo = this.steps.length) { for (let i = 0; i < upTo; i++) if (!this.steps[i].completed) return false; return true; }
  enableStep(s) { if (!s.enabled) { s.enabled = true; events.emit('quest_enable_id', s.id, s.extraData); } }
  ensureEnabled() {
    for (const s of this.steps) { if (s.completed) { this.enableStep(s); continue; } this.enableStep(s); break; }
  }
  /** A townsperson asks: is one of your steps mine and current? Hand them the lines. */
  onTexts(npc) {
    for (let i = 0; i < this.steps.length; i++) {
      const s = this.steps[i];
      if (npc.id === s.id && !s.completed) {
        if (this.isCompleted(i)) { npc.setQuestTexts(s.texts, s.extraData, this); }
        break;
      }
    }
  }
  /** A conversation ended: if it was with the current step's person, the step is done. */
  onStep(npcId) {
    for (let i = 0; i < this.steps.length; i++) {
      const s = this.steps[i];
      if (npcId === s.id && !s.completed) {
        if (this.isCompleted(i) && renderInfo.time - this.lastStepTime > 0.5) {
          this.lastStepTime = renderInfo.time;
          s.completed = true;
          events.emit('quest_step_completed', this.id, s.id, i, s.extraData);
        }
        break;
      }
    }
    if (this.isCompleted()) this.finish(); else this.ensureEnabled();
  }
  finish(emit = true) {
    for (const s of this.steps) events.emit('quest_disable_id', s.id, s.extraData);
    this.dispose();
    if (emit) events.emit('quest_completed', this.id);
  }
  dispose() { events.off('quest_step_texts_check', this.onTexts, this); events.off('quest_step_check', this.onStep, this); }
}

export class Quests {
  constructor(scene) {
    this.scene = scene;
    this.quests = QUEST_DATA.map((d) => new Quest(d));
    events.on('quest_step_completed', this.onStepCompleted, this);
    // everyone asks once more now that every quest is listening
    if (scene.townsfolk) for (const n of scene.townsfolk.list) events.emit('quest_step_texts_check', n);
  }
  onStepCompleted(questId, stepId, index, extra) {
    progress[questId][index] = true;
    save();
    const quest = QUEST_DATA.find((q) => q.id === questId);
    const last = index === quest.steps.length - 1;
    const notable = index === 0 || last;
    const done = allDone();
    events.emit('quest_info_checklist_update', notable, done);
    if (done) wait(1).then(() => events.emit('end_screen_show'));
    else if (extra && extra.uiTitle) events.emit('quest_box_display_after_step', extra.uiTitle, extra.uiIcon, extra.uiText, quest.color, last);
    if (extra && extra.receiveModel) events.emit('quest_receive_model', extra.receiveModel);
    if (last) wait(0.9).then(() => events.emit('play_audio', 'quest-complete'));
  }
  dispose() { for (const q of this.quests) q.dispose(); events.off('quest_step_completed', this.onStepCompleted, this); }
}
