// Násobilka – co už umím: diagnostic practice of the 1–10 multiplication table.
// Every answer is stored with its time; the map colours each fact by recent accuracy and speed,
// and each new session leans towards the facts that are not automatic yet.

(() => {
'use strict';
const M = Matika;
const t = M.t;

const APP = 'nasobilka';
const N = 10;
const WINDOW = 3;          // last "cold" attempts used to judge a fact (re-asks after a mistake don't count)
const TIME_CAP = 30000;    // an answer slower than 30 s counts as 30 s
const RETRIES = 2;         // a missed fact comes back at most twice in the same session
const RETRY_GAP = 3;       // ...after this many other problems
const KNOWN_SHARE = 0.3;   // share of already-automatic facts mixed in, so every session has easy wins
const HISTORY_MAX = 30;    // sessions shown in the progress chart
const DAY = 864e5;
const DEFAULTS = { fastSec: 3, slowSec: 6, sessionLen: 20, tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };
const STATUSES = ['good', 'warn', 'bad', 'none'];

M.addStrings({
  cs: {
    title: 'Násobilka',
    back: '← Všechny aplikace',
    'tab.practice': 'Trénink', 'tab.map': 'Mapa', 'tab.settings': 'Nastavení',
    op: '·',
    'start.hello': 'Ahoj, {name}!',
    'start.lead': 'Počítej v klidu. Hodiny neuvidíš – aplikace si jen potichu pamatuje, které příklady už jdou samy a které si zaslouží trénink.',
    'start.progress': 'Jde samo: {g} ze 100',
    'start.count': 'Kolik příkladů?',
    'start.tables': 'Které násobilky?',
    'start.all': 'Všechny',
    'start.go': 'Začít',
    'practice.quit': 'Ukončit',
    'practice.copy': 'Správně je <strong>{q} = {c}</strong><br>Napiš {c} a jedeme dál.',
    'summary.title': 'Hotovo!',
    'summary.score': '{ok} z {n} napoprvé správně',
    'summary.cheer3': 'Skvělá práce!',
    'summary.cheer2': 'Dobrá práce!',
    'summary.cheer1': 'Díky! Každý příklad ukázal, co trénovat dál – přesně k tomu to je.',
    'summary.newGood': 'Nově jde samo',
    'summary.work': 'Na tyhle se ještě podíváme',
    'summary.workNote': 'Přijdou znovu v dalších kolech, dokud nepůjdou samy.',
    'summary.again': 'Ještě jedno kolo',
    'summary.map': 'Ukázat mapu',
    'st.good': 'Jde samo', 'st.warn': 'Skoro', 'st.bad': 'Trénovat', 'st.none': 'Nevyzkoušeno',
    'st.prov': 'zatím jen 1 pokus',
    'map.title': 'Mapa násobilky',
    'map.axes': 'Řádek = první číslo, sloupec = druhé. Číslo v políčku = typický čas správné odpovědi v sekundách. Klepni na políčko pro detail.',
    'map.pick': 'Klepni na políčko v mapě a uvidíš jednotlivé pokusy.',
    'map.history': 'Vývoj po kolech',
    'map.historyNote': 'Každý sloupec = stav celé tabulky (100 příkladů) na konci jednoho kola.',
    'map.historyEmpty': 'Graf se objeví po prvním odehraném kole.',
    'map.round': 'Kolo {i}',
    'map.rules': 'Jak se barvy počítají',
    'map.rule1': 'U každého příkladu se berou poslední {w} pokusy. Opakování hned po chybě (ve stejném kole) se nepočítá – to je trénink, ne zkouška.',
    'map.rule2': 'Zelená – bez chyby a typický čas nejvýš {f} s.',
    'map.rule3': 'Žlutá – jedna chyba, nebo čas mezi {f} a {s} s.',
    'map.rule4': 'Červená – dvě a více chyb, nebo typický čas nad {s} s.',
    'map.rule5': 'Šrafované – zatím jen jeden pokus, barva je předběžná.',
    'map.tips': 'Tipy pro rodiče',
    'map.tip1': 'Krátce a často: 5–10 minut denně funguje lépe než hodina jednou za týden.',
    'map.tip2': 'U červených příkladů nejdřív strategie, pak rychlost: 9 · 7 = 10 · 7 − 7, 6 · 8 = 5 · 8 + 8, 4 · 7 = dvakrát 2 · 7.',
    'map.tip3': 'Chválit posun (nové zelené), ne rychlost. Čas je tu jen pro mapu, dítě ho nevidí.',
    'd.never': 'Tenhle příklad ještě nepřišel na řadu.',
    'd.median': 'Typický čas',
    'd.errors': 'Chyby v posledních {w} pokusech',
    'd.total': 'Celkem {n} pokusů, napoprvé správně {p} %',
    'd.wrong': 'Chybné odpovědi',
    'd.mirror': 'Opačné pořadí',
    'd.recent': 'Poslední pokusy',
    'd.date': 'Den', 'd.ans': 'Odpověď', 'd.time': 'Čas',
    'd.retry': 'opakování',
    'd.noTime': '–',
    'set.title': 'Nastavení',
    'set.fast': 'Zelená, když typický čas je nejvýš (s)',
    'set.slow': 'Červená, když typický čas je víc než (s)',
    'set.note': 'Čas se měří od zobrazení příkladu po stisk OK, včetně psaní. Výchozí 3 s a 6 s. Na tabletu trvá napsat dvouciferné číslo déle – klidně prahy zvyš. Změna přebarví i starší výsledky.',
    'set.invalid': 'Druhý práh musí být větší než první.',
    'set.saved': 'Uloženo.',
    'set.lang': 'Jazyk',
    'set.langBtn': 'English',
    'set.data': 'Data',
    'set.dataNote': 'Zálohu všech dat (všech dětí) stáhneš na hlavní stránce.',
    'set.reset': 'Smazat výsledky násobilky pro {name}',
    'set.resetConfirm': 'Opravdu smazat všechny výsledky násobilky pro {name}? Nejde to vrátit.',
    'set.stats': 'Uloženo {a} odpovědí z {s} kol.',
  },
  en: {
    title: 'Times tables',
    back: '← All apps',
    'tab.practice': 'Practice', 'tab.map': 'Map', 'tab.settings': 'Settings',
    op: '×',
    'start.hello': 'Hi, {name}!',
    'start.lead': "Take your time. You won't see a clock – the app just quietly remembers which facts are already automatic and which ones deserve practice.",
    'start.progress': 'Automatic: {g} of 100',
    'start.count': 'How many problems?',
    'start.tables': 'Which tables?',
    'start.all': 'All',
    'start.go': 'Start',
    'practice.quit': 'Stop',
    'practice.copy': 'The answer is <strong>{q} = {c}</strong><br>Type {c} and we go on.',
    'summary.title': 'Done!',
    'summary.score': '{ok} of {n} right first time',
    'summary.cheer3': 'Great work!',
    'summary.cheer2': 'Good work!',
    'summary.cheer1': 'Thanks! Every problem showed what to practise next – that is exactly what this is for.',
    'summary.newGood': 'Now automatic',
    'summary.work': "We'll come back to these",
    'summary.workNote': 'They will return in later rounds until they come easily.',
    'summary.again': 'Another round',
    'summary.map': 'Show map',
    'st.good': 'Automatic', 'st.warn': 'Almost', 'st.bad': 'Practise', 'st.none': 'Not tried',
    'st.prov': 'only 1 attempt so far',
    'map.title': 'Times-table map',
    'map.axes': 'Row = first number, column = second. The number in a cell is the typical time of a correct answer in seconds. Tap a cell for details.',
    'map.pick': 'Tap a cell in the map to see the individual attempts.',
    'map.history': 'Progress by round',
    'map.historyNote': 'Each column = state of the whole table (100 facts) at the end of one round.',
    'map.historyEmpty': 'The chart appears after the first round.',
    'map.round': 'Round {i}',
    'map.rules': 'How the colours work',
    'map.rule1': 'Each fact is judged on its last {w} attempts. Re-asks right after a mistake (in the same round) do not count – that is practice, not a test.',
    'map.rule2': 'Green – no mistake and typical time at most {f} s.',
    'map.rule3': 'Yellow – one mistake, or time between {f} and {s} s.',
    'map.rule4': 'Red – two or more mistakes, or typical time over {s} s.',
    'map.rule5': 'Hatched – only one attempt so far, the colour is provisional.',
    'map.tips': 'Tips for parents',
    'map.tip1': 'Short and often: 5–10 minutes a day works better than an hour once a week.',
    'map.tip2': 'For red facts, strategy first, speed later: 9 × 7 = 10 × 7 − 7, 6 × 8 = 5 × 8 + 8, 4 × 7 = double 2 × 7.',
    'map.tip3': 'Praise progress (new greens), not speed. Time is only used for the map; the child never sees it.',
    'd.never': 'This fact has not come up yet.',
    'd.median': 'Typical time',
    'd.errors': 'Mistakes in the last {w} attempts',
    'd.total': '{n} attempts in total, {p} % right first time',
    'd.wrong': 'Wrong answers',
    'd.mirror': 'Reversed order',
    'd.recent': 'Recent attempts',
    'd.date': 'Day', 'd.ans': 'Answer', 'd.time': 'Time',
    'd.retry': 're-ask',
    'd.noTime': '–',
    'set.title': 'Settings',
    'set.fast': 'Green when typical time is at most (s)',
    'set.slow': 'Red when typical time is more than (s)',
    'set.note': 'Time runs from showing the problem to pressing OK, typing included. Defaults 3 s and 6 s. Typing a two-digit number on a tablet takes longer – raise the thresholds if needed. Changes recolour older results too.',
    'set.invalid': 'The second threshold must be larger than the first.',
    'set.saved': 'Saved.',
    'set.lang': 'Language',
    'set.langBtn': 'Čeština',
    'set.data': 'Data',
    'set.dataNote': 'A backup of all data (all children) can be downloaded on the main page.',
    'set.reset': 'Delete times-table results for {name}',
    'set.resetConfirm': 'Really delete all times-table results for {name}? This cannot be undone.',
    'set.stats': '{a} answers from {s} rounds stored.',
  },
});

const profile = M.requireProfile('../index.html');
if (!profile) return;

const $ = id => document.getElementById(id);
const key = (a, b) => `${a}x${b}`;
const q = (a, b) => `${a} ${t('op')} ${b}`;
const secs = ms => `${M.fmt(ms / 1000)} s`;
const median = xs => { const s = [...xs].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const shuffle = xs => { for (let i = xs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [xs[i], xs[j]] = [xs[j], xs[i]]; } return xs; };

// ---------------------------------------------------------------- data

let data = loadData();

function loadData() {
  const d = M.load(APP, null) || {};
  const out = { ...d, attempts: d.attempts || [], sessions: d.sessions || [], settings: { ...DEFAULTS, ...d.settings } };
  out.attempts.sort((x, y) => x.t - y.t);
  return out;
}
const persist = () => M.save(APP, data);

// Judge every fact from its last WINDOW cold attempts (optionally only those made before `until`).
function factStats(until = Infinity) {
  const groups = {};
  for (const at of data.attempts) {
    if (at.t > until) break;
    if (!at.retry) (groups[key(at.a, at.b)] ||= []).push(at);
  }
  const out = {};
  for (let a = 1; a <= N; a++) for (let b = 1; b <= N; b++) out[key(a, b)] = judge(groups[key(a, b)] || []);
  return out;
}

function judge(list) {
  const win = list.slice(-WINDOW);
  if (!win.length) return { status: 'none', n: 0 };
  const errors = win.filter(x => !x.ok).length;
  const times = win.filter(x => x.ok && x.ms != null).map(x => Math.min(x.ms, TIME_CAP));
  const med = times.length ? median(times) : null;
  const { fastSec, slowSec } = data.settings;
  let status = 'warn';
  if (errors >= 2 || errors === win.length || med > slowSec * 1000) status = 'bad';
  else if (errors === 0 && med != null && med <= fastSec * 1000) status = 'good';
  return { status, n: win.length, errors, med, provisional: win.length < 2 };
}

function countStatuses(stats) {
  const c = { good: 0, warn: 0, bad: 0, none: 0 };
  Object.values(stats).forEach(s => c[s.status]++);
  return c;
}

// ---------------------------------------------------------------- choosing problems

// Weighted sampling without replacement (Efraimidis–Spirakis).
const weightedSample = (items, n, weight) => items
  .map(it => ({ it, r: Math.random() ** (1 / weight(it)) }))
  .sort((x, y) => y.r - x.r).slice(0, n).map(x => x.it);

function buildQueue() {
  const { sessionLen, tables } = data.settings;
  const stats = factStats();
  const lastSeen = {};
  data.attempts.forEach(at => { lastSeen[key(at.a, at.b)] = at.t; });

  const cells = [];
  for (let a = 1; a <= N; a++) for (let b = 1; b <= N; b++) {
    if (tables.includes(a) || tables.includes(b)) cells.push({ a, b, st: stats[key(a, b)] });
  }
  const known = cells.filter(c => c.st.status === 'good' && !c.st.provisional);
  const open = cells.filter(c => !known.includes(c));

  const len = Math.min(sessionLen, cells.length);
  let nKnown = Math.min(known.length, Math.round(len * KNOWN_SHARE));
  const nOpen = Math.min(open.length, len - nKnown);
  nKnown = Math.min(known.length, len - nOpen);

  const W = { none: 6, bad: 5, warn: 3, good: 2 };
  const now = Date.now();
  const picked = [
    ...weightedSample(open, nOpen, c => W[c.st.status]),
    ...weightedSample(known, nKnown, c => 1 + (now - lastSeen[key(c.a, c.b)]) / DAY), // longest unseen first
  ];
  return spread(shuffle(picked)).map(({ a, b }) => ({ a, b }));
}

// Avoid the same fact or its mirror (3·6 then 6·3) back to back.
function spread(queue) {
  const clash = (x, y) => x && y && ((x.a === y.a && x.b === y.b) || (x.a === y.b && x.b === y.a));
  for (let i = 1; i < queue.length; i++) {
    if (!clash(queue[i - 1], queue[i])) continue;
    const j = queue.findIndex((c, k) => k > i && !clash(queue[i - 1], c) && !clash(c, queue[i + 1]));
    if (j > 0) [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

// ---------------------------------------------------------------- practice

let S = null; // the running session

function startSession() {
  const queue = buildQueue();
  if (!queue.length) return;
  S = { id: 's' + Date.now().toString(36), start: Date.now(), queue, idx: 0, retries: {}, before: factStats() };
  show('practice');
  nextProblem();
}

function nextProblem() {
  if (S.idx >= S.queue.length) return finishSession();
  const { a, b } = S.queue[S.idx];
  Object.assign(S, { input: '', mode: 'answer', busy: false, firstKey: null, away: document.hidden });
  $('qa').textContent = a;
  $('qb').textContent = b;
  $('hint').innerHTML = '';
  $('answer').className = 'answer';
  renderAnswer();
  $('pfill').style.width = `${100 * S.idx / S.queue.length}%`;
  $('pcount').textContent = `${S.idx + 1} / ${S.queue.length}`;
  S.t0 = performance.now();
}

const renderAnswer = () => { $('answer').textContent = S.input; };

function press(k) {
  if (!S || S.busy) return;
  if (k === 'ok') return submit();
  if (k === 'del') S.input = S.input.slice(0, -1);
  else if (S.input.length < 3) {
    if (S.firstKey == null) S.firstKey = performance.now() - S.t0;
    S.input += k;
  }
  renderAnswer();
}

function submit() {
  if (!S.input) return;
  const item = S.queue[S.idx];
  const { a, b } = item;
  const c = a * b;
  const val = Number(S.input);

  // after a mistake the child copies the right answer once before moving on
  if (S.mode === 'copy') {
    if (val === c) { S.idx++; nextProblem(); return; }
    S.input = '';
    renderAnswer();
    const box = $('answer');
    box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    return;
  }

  const ok = val === c;
  const timed = !S.away;
  data.attempts.push({
    a, b, ans: val, ok,
    ms: timed ? Math.round(performance.now() - S.t0) : null,
    first: timed && S.firstKey != null ? Math.round(S.firstKey) : null,
    t: Date.now(), sid: S.id, ...(item.retry && { retry: true }),
  });
  persist();

  S.busy = true;
  $('answer').classList.add(ok ? 'ok' : 'wrong');
  if (ok) { setTimeout(() => { S.idx++; nextProblem(); }, 450); return; }

  const k = key(a, b);
  if ((S.retries[k] || 0) < RETRIES) {
    S.retries[k] = (S.retries[k] || 0) + 1;
    S.queue.splice(Math.min(S.idx + 1 + RETRY_GAP, S.queue.length), 0, { a, b, retry: true });
    $('pcount').textContent = `${S.idx + 1} / ${S.queue.length}`;
  }
  setTimeout(() => {
    Object.assign(S, { busy: false, mode: 'copy', input: '' });
    $('answer').className = 'answer copy';
    $('hint').innerHTML = t('practice.copy', { q: q(a, b), c });
    renderAnswer();
  }, 700);
}

function saveSessionRecord() {
  const mine = data.attempts.filter(x => x.sid === S.id && !x.retry);
  if (!mine.length || data.sessions.some(s => s.id === S.id)) return mine;
  data.sessions.push({ id: S.id, start: S.start, end: Date.now(), n: mine.length, ok: mine.filter(x => x.ok).length });
  persist();
  return mine;
}

function finishSession() {
  const mine = saveSessionRecord();
  const before = S.before;
  S = null;
  if (!mine.length) return show('start');
  renderSummary(before, factStats(), mine);
  show('summary');
  syncNow();
}

// Send results and pick up anything from other devices; outside a round, reload what sync merged in.
async function syncNow() {
  const r = await M.sync();
  if (!r.ok || S) return;
  data = loadData();
  if (view === 'map' || view === 'start') VIEWS[view]();
}

// ---------------------------------------------------------------- views

const VIEWS = { start: renderStart, map: renderMap, settings: renderSettings };
let view = 'start';

function show(v) {
  view = v;
  document.querySelectorAll('.view').forEach(el => { el.hidden = el.id !== 'view-' + v; });
  document.querySelectorAll('.tabs [data-view]').forEach(b => b.setAttribute('aria-selected', b.dataset.view === v || (v === 'summary' && b.dataset.view === 'start')));
  $('topbar').hidden = v === 'practice';
  $('tip').hidden = true;
  VIEWS[v]?.();
  window.scrollTo(0, 0);
}

function renderChrome() {
  M.applyI18n();
  $('who').textContent = profile.name;
  $('op').textContent = t('op');
  document.title = t('title');
}

// ---- start

function renderStart() {
  const c = countStatuses(factStats());
  const s = data.settings;
  const allOn = s.tables.length === N;
  const pct = n => `${n}%`; // 100 facts, so a count is also a percentage
  $('view-start').innerHTML = `
    <h1>${t('start.hello', { name: M.esc(profile.name) })}</h1>
    <p class="lead">${t('start.lead')}</p>
    <div class="block card">
      <h3>${t('start.progress', { g: c.good })}</h3>
      <div class="meter" role="img" aria-label="${STATUSES.map(k => `${t('st.' + k)} ${c[k]}`).join(', ')}">
        ${['good', 'warn', 'bad'].filter(k => c[k]).map(k => `<span class="${k}" style="width:${pct(c[k])}"></span>`).join('')}
      </div>
      <div class="meter-legend">
        ${STATUSES.map(k => `<span><span class="sw ${k}"></span> ${t('st.' + k)} ${c[k]}</span>`).join('')}
      </div>
    </div>
    <div class="block">
      <h3>${t('start.count')}</h3>
      <div class="chips" id="lenChips">
        ${[10, 20, 30].map(n => `<button class="chip" data-len="${n}" aria-pressed="${s.sessionLen === n}">${n}</button>`).join('')}
      </div>
    </div>
    <div class="block">
      <h3>${t('start.tables')}</h3>
      <div class="chips" id="tabChips">
        <button class="chip" data-tab="all" aria-pressed="${allOn}">${t('start.all')}</button>
        ${Array.from({ length: N }, (_, i) => i + 1).map(n =>
          `<button class="chip" data-tab="${n}" aria-pressed="${!allOn && s.tables.includes(n)}">${n}</button>`).join('')}
      </div>
    </div>
    <div class="go"><button class="btn primary big" id="go">${t('start.go')}</button></div>`;

  $('lenChips').onclick = e => {
    const b = e.target.closest('[data-len]');
    if (b) { s.sessionLen = Number(b.dataset.len); persist(); renderStart(); }
  };
  $('tabChips').onclick = e => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    const all = DEFAULTS.tables;
    if (b.dataset.tab === 'all') s.tables = [...all];
    else {
      const n = Number(b.dataset.tab);
      if (s.tables.length === N) s.tables = [n];                 // from "all", pick just this one
      else s.tables = s.tables.includes(n) ? s.tables.filter(x => x !== n) : [...s.tables, n].sort((x, y) => x - y);
      if (!s.tables.length) s.tables = [...all];
    }
    persist();
    renderStart();
  };
  $('go').onclick = startSession;
}

// ---- summary

function renderSummary(before, after, mine) {
  const ok = mine.filter(x => x.ok).length;
  const ratio = ok / mine.length;
  const seen = [...new Set(mine.map(x => key(x.a, x.b)))];
  const newGood = seen.filter(k => after[k].status === 'good' && before[k].status !== 'good');
  const work = seen.filter(k => after[k].status === 'bad');
  const chips = (keys, cls) => keys.map(k => { const [a, b] = k.split('x'); return `<span class="fact ${cls}">${q(a, b)}</span>`; }).join('');

  $('view-summary').innerHTML = `
    <div class="card">
      <h1>${t('summary.title')} ${t(ratio >= 0.9 ? 'summary.cheer3' : ratio >= 0.7 ? 'summary.cheer2' : 'summary.cheer1')}</h1>
      <p class="score">${t('summary.score', { ok, n: mine.length })}</p>
      ${newGood.length ? `<h3>${t('summary.newGood')}</h3><div class="fact-chips">${chips(newGood, 'good')}</div>` : ''}
      ${work.length ? `<h3>${t('summary.work')}</h3><div class="fact-chips">${chips(work, 'bad')}</div><p class="muted">${t('summary.workNote')}</p>` : ''}
      <div class="chips" style="margin-top:20px">
        <button class="btn primary big" id="again">${t('summary.again')}</button>
        <button class="btn big" id="toMap">${t('summary.map')}</button>
      </div>
    </div>`;
  $('again').onclick = startSession;
  $('toMap').onclick = () => show('map');
}

// ---- map

let selected = null;

function renderMap() {
  const stats = factStats();
  const c = countStatuses(stats);
  const s = data.settings;

  let grid = `<div class="h corner" aria-hidden="true">${t('op')}</div>`;
  for (let b = 1; b <= N; b++) grid += `<div class="h">${b}</div>`;
  for (let a = 1; a <= N; a++) {
    grid += `<div class="h">${a}</div>`;
    for (let b = 1; b <= N; b++) {
      const k = key(a, b), st = stats[k];
      const label = st.status === 'none' ? '' : st.med != null ? M.fmt(st.med / 1000) : '✗';
      grid += `<button class="cell ${st.status}${st.provisional ? ' prov' : ''}${k === selected ? ' sel' : ''}" data-k="${k}"
        aria-label="${q(a, b)}: ${t('st.' + st.status)}">${label}</button>`;
    }
  }

  $('view-map').innerHTML = `
    <h1>${t('map.title')}</h1>
    <div class="tiles">
      ${STATUSES.map(k => `<div class="card tile"><div class="v">${c[k]}</div><div class="l"><span class="sw ${k}"></span>${t('st.' + k)}</div></div>`).join('')}
    </div>
    <div class="map-grid">
      <div class="card">
        <div class="hm" id="hm">${grid}</div>
        <div class="legend">
          ${STATUSES.map(k => `<span><span class="sw ${k}"></span> ${t('st.' + k)}</span>`).join('')}
          <span><span class="sw prov"></span> ${t('st.prov')}</span>
        </div>
        <p class="axis-note">${t('map.axes')}</p>
      </div>
      <div class="card detail" id="detail">${selected ? detailHtml(selected, stats) : `<p class="muted">${t('map.pick')}</p>`}</div>
    </div>
    <div class="card history">
      <h2>${t('map.history')}</h2>
      <p class="muted small">${t('map.historyNote')}</p>
      ${historySvg()}
    </div>
    <div class="card rules">
      <h2>${t('map.rules')}</h2>
      <ul>${[1, 2, 3, 4, 5].map(i => `<li>${t('map.rule' + i, { w: WINDOW, f: M.fmt(s.fastSec, 0), s: M.fmt(s.slowSec, 0) })}</li>`).join('')}</ul>
      <h2 style="margin-top:16px">${t('map.tips')}</h2>
      <ul>${[1, 2, 3].map(i => `<li>${t('map.tip' + i)}</li>`).join('')}</ul>
    </div>`;

  const hm = $('hm');
  hm.onclick = e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    selected = cell.dataset.k;
    hm.querySelectorAll('.cell.sel').forEach(x => x.classList.remove('sel'));
    cell.classList.add('sel');
    $('detail').innerHTML = detailHtml(selected, stats);
    if (matchMedia('(max-width: 760px)').matches) $('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  hm.onpointermove = e => {
    const cell = e.target.closest('.cell');
    if (!cell || e.pointerType !== 'mouse') return hideTip();
    const [a, b] = cell.dataset.k.split('x').map(Number);
    const st = stats[cell.dataset.k];
    showTip(e, `<b>${q(a, b)} = ${a * b}</b><br>${t('st.' + st.status)}${st.provisional ? ` (${t('st.prov')})` : ''}${st.med != null ? `<br>${t('d.median')}: ${secs(st.med)}` : ''}`);
  };
  hm.onpointerleave = hideTip;
  bindHistoryTips();
}

function detailHtml(k, stats) {
  const [a, b] = k.split('x').map(Number);
  const st = stats[k];
  const head = `<h3>${q(a, b)} = ${a * b}</h3>
    <div class="badge"><span class="sw ${st.status}"></span>${t('st.' + st.status)}${st.provisional ? ` · ${t('st.prov')}` : ''}</div>`;
  const all = data.attempts.filter(x => x.a === a && x.b === b);
  if (!all.length) return head + `<p class="muted" style="margin-top:10px">${t('d.never')}</p>`;

  const cold = all.filter(x => !x.retry);
  const pct = Math.round(100 * cold.filter(x => x.ok).length / cold.length);
  const wrong = {};
  all.filter(x => !x.ok).forEach(x => { wrong[x.ans] = (wrong[x.ans] || 0) + 1; });
  const wrongList = Object.entries(wrong).sort((x, y) => y[1] - x[1]).map(([v, n]) => n > 1 ? `${v} (${n}×)` : v).join(', ');
  const mirror = a !== b ? stats[key(b, a)] : null;

  const rows = all.slice(-8).reverse().map(x => `
    <tr><td>${M.fmtDate(x.t)}</td>
      <td class="${x.ok ? 'ok' : 'no'}">${x.ok ? '✓' : '✗'} ${x.ans}</td>
      <td>${x.ms != null ? secs(x.ms) : t('d.noTime')}${x.retry ? ` <span class="muted small">(${t('d.retry')})</span>` : ''}</td></tr>`).join('');

  return head + `
    <div style="margin-top:12px">
      ${st.med != null ? `<p class="kv">${t('d.median')}: <b>${secs(st.med)}</b></p>` : ''}
      <p class="kv">${t('d.errors', { w: WINDOW })}: <b>${st.errors}</b></p>
      <p class="kv">${t('d.total', { n: cold.length, p: pct })}</p>
      ${wrongList ? `<p class="kv">${t('d.wrong')}: <b>${wrongList}</b></p>` : ''}
      ${mirror ? `<p class="kv">${t('d.mirror')} ${q(b, a)}: <span class="sw ${mirror.status}"></span> <b>${t('st.' + mirror.status)}</b></p>` : ''}
    </div>
    <h3 style="font-size:1rem;margin-top:14px">${t('d.recent')}</h3>
    <table><thead><tr><th>${t('d.date')}</th><th>${t('d.ans')}</th><th>${t('d.time')}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// Stacked columns: state of all 100 facts after each round (bottom to top: green, yellow, red, not tried).
let historyData = [];

function historySvg() {
  const offset = Math.max(0, data.sessions.length - HISTORY_MAX);
  const sessions = data.sessions.slice(offset);
  historyData = sessions.map((s, i) => ({ round: offset + i + 1, end: s.end, c: countStatuses(factStats(s.end)) }));
  if (!sessions.length) return `<p class="muted">${t('map.historyEmpty')}</p>`;

  // drawn at the card's real pixel width so axis text stays readable on phones
  const W = Math.max(280, Math.min(1000, $('view-map').clientWidth - 42)), H = 190, L = 30, R = 6, T = 8, B = 24, GAP = 2, RAD = 4;
  const pw = W - L - R, ph = H - T - B;
  const band = pw / Math.max(sessions.length, 12);   // few rounds → narrow columns, not giant blocks
  const bw = Math.min(26, band * 0.72);
  const y = v => T + ph - (v / (N * N)) * ph;

  let svg = '';
  for (const v of [0, 25, 50, 75, 100]) {
    svg += `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`;
    svg += `<text class="axis-t" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  }
  const every = Math.ceil(sessions.length / 8);
  historyData.forEach((h, i) => {
    const x = L + i * band + (band - bw) / 2;
    const segs = STATUSES.filter(k => h.c[k] > 0);
    let acc = 0;
    segs.forEach((k, j) => {
      const isTop = j === segs.length - 1, isBottom = j === 0;
      const top = y(acc + h.c[k]) + (isTop ? 0 : GAP / 2);
      const bottom = y(acc) - (isBottom ? 0 : GAP / 2);
      acc += h.c[k];
      const hgt = bottom - top;
      if (hgt <= 0.5) return;
      if (isTop) {
        const r = Math.min(RAD, hgt, bw / 2);
        svg += `<path class="seg-${k}" d="M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${bottom} Z"/>`;
      } else {
        svg += `<rect class="seg-${k}" x="${x}" y="${top}" width="${bw}" height="${hgt}"/>`;
      }
    });
    if (i % every === 0 || i === historyData.length - 1) {
      svg += `<text class="axis-t" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${h.round}</text>`;
    }
    svg += `<rect class="hit" data-i="${i}" x="${L + i * band}" y="${T}" width="${band}" height="${ph}"/>`;
  });
  return `<div class="legend" style="margin:0 0 10px">${STATUSES.map(k => `<span><span class="sw ${k}"></span> ${t('st.' + k)}</span>`).join('')}</div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('map.history')}">${svg}</svg>`;
}

function bindHistoryTips() {
  const svg = document.querySelector('.history svg');
  if (!svg) return;
  const tipFor = e => {
    const hit = e.target.closest('.hit');
    if (!hit) return hideTip();
    const h = historyData[Number(hit.dataset.i)];
    showTip(e, `<b>${t('map.round', { i: h.round })}</b> · ${M.fmtDate(h.end)}<br>` +
      STATUSES.map(k => `<span class="sw ${k}"></span> ${t('st.' + k)}: ${h.c[k]}`).join('<br>'));
  };
  svg.onpointermove = tipFor;
  svg.onpointerdown = tipFor;   // touch: tap a column
  svg.onpointerleave = hideTip;
}

function showTip(e, html) {
  const tip = $('tip');
  tip.innerHTML = html;
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let x = e.clientX + 14, yy = e.clientY + 14;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
  if (yy + r.height > innerHeight - 8) yy = e.clientY - r.height - 14;
  tip.style.left = `${Math.max(8, x)}px`;
  tip.style.top = `${Math.max(8, yy)}px`;
}
const hideTip = () => { $('tip').hidden = true; };

// ---- settings

function renderSettings() {
  const s = data.settings;
  $('view-settings').innerHTML = `
    <h1>${t('set.title')}</h1>
    <div class="card">
      <div class="field"><label for="fast">${t('set.fast')}</label>
        <input type="number" id="fast" min="1" max="20" step="0.5" value="${s.fastSec}"></div>
      <div class="field"><label for="slow">${t('set.slow')}</label>
        <input type="number" id="slow" min="1" max="30" step="0.5" value="${s.slowSec}"></div>
      <p class="muted small">${t('set.note')}</p>
      <p class="small" id="setMsg" aria-live="polite"></p>
    </div>
    <div class="card">
      <h2>${t('set.lang')}</h2>
      <button class="btn" id="langBtn">${t('set.langBtn')}</button>
    </div>
    <div class="card">
      <h2>${t('set.data')}</h2>
      <p class="muted">${t('set.stats', { a: data.attempts.length, s: data.sessions.length })} ${t('set.dataNote')}</p>
      <button class="btn danger" id="reset">${t('set.reset', { name: M.esc(profile.name) })}</button>
    </div>`;

  const onThreshold = () => {
    const f = Number($('fast').value), sl = Number($('slow').value);
    if (!(f > 0 && sl > f)) { $('setMsg').textContent = t('set.invalid'); return; }
    s.fastSec = f;
    s.slowSec = sl;
    persist();
    $('setMsg').textContent = t('set.saved');
  };
  $('fast').onchange = onThreshold;
  $('slow').onchange = onThreshold;
  $('langBtn').onclick = () => { M.setLang(M.lang() === 'cs' ? 'en' : 'cs'); renderChrome(); renderSettings(); };
  $('reset').onclick = () => {
    if (!confirm(t('set.resetConfirm', { name: profile.name }))) return;
    // keep a reset marker instead of deleting, so syncing doesn't bring the old results back
    data = { settings: data.settings, attempts: [], sessions: [], resetAt: Date.now() };
    persist();
    selected = null;
    renderSettings();
  };
}

// ---------------------------------------------------------------- wiring

document.querySelector('.tabs').onclick = e => {
  const b = e.target.closest('[data-view]');
  if (b) show(b.dataset.view);
};

$('keypad').onclick = e => {
  const b = e.target.closest('[data-k]');
  if (b) press(b.dataset.k);
};
$('quit').onclick = () => { if (S) finishSession(); };

document.addEventListener('keydown', e => {
  if (view !== 'practice' || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^[0-9]$/.test(e.key)) press(e.key);
  else if (e.key === 'Backspace') press('del');
  else if (e.key === 'Enter') press('ok');
  else return;
  e.preventDefault();
});

// A problem answered while the page was hidden (another app, locked screen) keeps its answer but loses its time.
document.addEventListener('visibilitychange', () => { if (S && document.hidden) S.away = true; });
// Leaving mid-session: attempts are already saved; also keep the round for the progress chart.
addEventListener('pagehide', () => { if (S) saveSessionRecord(); });

let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (view === 'map') renderMap(); }, 200);
});

renderChrome();
show('start');
syncNow();
})();
