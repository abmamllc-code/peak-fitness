/* PEAK Fitness — single-file app. Data lives in localStorage on this device. */
(function () {
'use strict';

/* ================= Utilities ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const round1 = n => Math.round(n * 10) / 10;
const fmt = (n, d = 1) => { const r = Math.round(n * Math.pow(10, d)) / Math.pow(10, d); return r.toLocaleString('en-GB', { maximumFractionDigits: d }); };
const fmtInt = n => Math.round(n).toLocaleString('en-GB');
const titleCase = s => s.trim().replace(/\s+/g, ' ').replace(/\b([a-z])/g, m => m.toUpperCase());
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
let CLOCK = 0; // test-only clock offset in ms (window.PEAK.setClock)
const now = () => new Date(Date.now() + CLOCK);
const today = () => iso(now());
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const shortDate = s => { const d = parseISO(s); return d.getDate() + ' ' + MON[d.getMonth()]; };
const dayLabel = s => { const t = today(); if (s === t) return 'Today'; if (s === addDays(t, -1)) return 'Yesterday'; if (s === addDays(t, 1)) return 'Tomorrow'; const d = parseISO(s); return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; };
const longDate = s => { const d = parseISO(s); return DOWL[d.getDay()] + ' ' + d.getDate() + ' ' + MONL[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); };
const signed = (n, d = 1) => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n), d);
const reduceMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

const I = {
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  chevR: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="20"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  trend: '<svg viewBox="0 0 24 24"><path d="M3 17l5-5 4 3 8-8M15 7h5v5"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  scale: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9.5a4 4 0 0 1 6 0l-2 2.5"/></svg>',
};

/* ================= Store ================= */
const KEY = 'peakfit.data.v1';
/* Lean bulk, phase 1: Adnan's daily plan (weights raw / uncooked unless stated) */
const SEED_PLAN = () => [
  { tag: 'm1', name: 'Chicken & rice', cals: 755, p: 50, c: 93, f: 19, items: '200g chicken thighs (skinless), 110g rice (dry weight), 100g broccoli, 10g olive oil to cook' },
  { tag: 'snack', name: 'Snack', cals: 460, p: 25, c: 63, f: 13, items: '250g full-fat Greek yogurt, 100g berries, 150g grapes, 20g honey' },
  { tag: 'pre', name: 'Pre-gym', cals: 410, p: 4, c: 108, f: 1, items: '2 bananas, 3 Medjool dates. 30–60 mins before the gym' },
  { tag: 'post', name: 'Post-gym potatoes', cals: 250, p: 6, c: 55, f: 0, items: '320g potatoes, air-fried (few sprays of oil + seasoning). Straight after the gym' },
  { tag: 'dinner', name: 'Dinner', cals: 1120, p: 53, c: 119, f: 45, items: '150g rice (dry weight), 150g beef mince (10% fat), 2 eggs, 20g olive oil or butter (cook with it / drizzle over rice)' },
].map(m => Object.assign({ id: uid() }, m));
const SEED_TARGETS = () => ({ kcal: 3000, p: 130, c: 440, f: 80 });

/* Gym split: Push, Pull, Legs, Rest, repeat */
const CYCLE = ['push', 'pull', 'legs', 'rest'];
const DAYNAME = { push: 'Push', pull: 'Pull', legs: 'Legs', rest: 'Rest' };
const TX = (name, sets, reps, rest, note) => ({ id: uid(), name, sets, reps, rest, note: note || '' });
const SEED_TEMPLATES = () => ({
  push: [TX('Smith Machine Incline Bench Press', 2, 8, 180), TX('Machine Seated Chest Fly', 2, 8, 180), TX('Dip', 2, 8, 180), TX('Cable Lateral Raise', 3, 8, 180), TX('Machine Preacher Curl', 3, 8, 180)],
  pull: [TX('Wide Grip Lat Pulldown', 2, 8, 180), TX('T-Bar Row', 2, 8, 180), TX('Cable Seated Row', 2, 8, 180), TX('Cable Rope Tricep Extension', 2, 8, 180), TX('Barbell Skullcrusher', 2, 8, 90), TX('Machine Seated Single Arm Reverse Fly', 2, 8, 90, 'Done one arm at a time, facing each side, for more range of motion')],
  legs: [TX('Angled Machine Leg Press', 2, 8, 180), TX('Barbell Straight Leg Deadlift', 2, 8, 180), TX('Machine Seated Leg Extension', 2, 8, 180), TX('Machine Seated Leg Curl', 2, 8, 180), TX('Machine Seated Hip Adduction', 2, 8, 180), TX('Machine Standing Calf Raise', 2, 8, 180)],
});
function blank() {
  return {
    version: 2,
    plan: SEED_PLAN(),                  // repeating daily meal plan
    targets: SEED_TARGETS(),            // daily kcal + macro targets
    gym: { time: '18:00', anchor: { date: today(), idx: 0 }, templates: SEED_TEMPLATES() },
    shop: { month: {}, week: {}, weekOf: '', extras: [] },
    days: {},                           // { 'YYYY-MM-DD': { meals: [ {id,name,cals,items,p,c,f,done} ] } }
    workouts: {},                       // { 'YYYY-MM-DD': { exercises: [ {id,name,sets:[{id,reps,weight}]} ] } }
    bodyweight: [],                     // [ {id,date,value} ] (kg)
    measure: { unit: 'in', types: ['Chest', 'Arms', 'Waist'], entries: [] }, // entries: {id,date,type,value}
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const d = JSON.parse(raw), b = blank(), g = d.gym && typeof d.gym === 'object' ? d.gym : {};
    const out = {
      version: 2,
      plan: Array.isArray(d.plan) ? d.plan : b.plan,
      targets: Object.assign(b.targets, d.targets || {}),
      gym: Object.assign(b.gym, g, { templates: Object.assign(b.gym.templates, g.templates || {}) }),
      shop: Object.assign(b.shop, d.shop || {}),
      days: d.days && typeof d.days === 'object' ? d.days : {},
      workouts: d.workouts && typeof d.workouts === 'object' ? d.workouts : {},
      bodyweight: Array.isArray(d.bodyweight) ? d.bodyweight : [],
      measure: Object.assign(b.measure, d.measure || {}),
    };
    // Seed the lean-bulk plan if the meals are still the untouched empty starters (never overwrite real data)
    const untouched = ms => Array.isArray(ms) && ms.every(m => !num(m.cals) && !String(m.items || '').trim() && !num(m.p) && !num(m.c) && !num(m.f));
    if (untouched(out.plan)) {
      out.plan = b.plan;
      Object.keys(out.days).forEach(k => { const ms = out.days[k] && out.days[k].meals; if (untouched(ms) && !ms.some(m => m.done)) delete out.days[k]; });
    }
    return out;
  } catch (e) { console.warn('PEAK: could not read saved data', e); return blank(); }
}
let S = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Could not save — storage is full or blocked', { err: true }); }
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* UI state (not persisted except tab) */
const U = {
  tab: localStorage.getItem('peakfit.tab') || 'meals',
  mealsDate: today(), gymDate: today(), period: '30',
  open: new Set(), measType: null, lastExercise: null,
  mealsMode: localStorage.getItem('peakfit.mealsMode') === 'shop' ? 'shop' : 'meals', shopFilter: 'all', sumOpen: false, tplEdit: null, hintIdx: 0,
};

/* ================= Meals model ================= */
const clonePlan = () => S.plan.map(m => Object.assign({}, m, { done: false }));
function getMeals(date) { return S.days[date] ? S.days[date].meals : clonePlan(); }
function materialize(date) { if (!S.days[date]) S.days[date] = { meals: clonePlan() }; return S.days[date].meals; }
function findMeal(date, id) { return materialize(date).find(m => m.id === id); }
function matchesPlan(date) {
  const a = getMeals(date), b = S.plan;
  if (a.length !== b.length) return false;
  return a.every((m, i) => m.name === b[i].name && num(m.cals) === num(b[i].cals) && (m.items || '') === (b[i].items || '') && num(m.p) === num(b[i].p) && num(m.c) === num(b[i].c) && num(m.f) === num(b[i].f));
}
function mealTotals(date) {
  const ms = getMeals(date); const t = { planned: 0, eaten: 0, done: 0, n: ms.length, p: 0, c: 0, f: 0 };
  ms.forEach(m => { t.planned += num(m.cals); if (m.done) { t.eaten += num(m.cals); t.done++; t.p += num(m.p); t.c += num(m.c); t.f += num(m.f); } });
  return t;
}

/* ================= Gym model ================= */
const exKey = n => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/s$/, '');
const mod = (a, n) => ((a % n) + n) % n;
const loggedSet = s => !!s.done || num(s.weight) > 0;
const loggedEx = e => e.sets.some(loggedSet);
const loggedWorkout = w => !!w && (w.exercises.some(loggedEx) || !!w.end);
const untouchedWorkout = w => !w || (!w.start && !w.exercises.some(loggedEx));
function cycleDay(date) {
  const w = S.workouts[date]; if (w && w.day) return w.day;
  const a = S.gym.anchor || { date: today(), idx: 0 };
  return CYCLE[mod((a.idx || 0) + daysBetween(a.date, date), CYCLE.length)];
}
const gymMin = () => { const [h, m] = String(S.gym.time || '18:00').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const restLabel = sec => sec >= 60 ? (sec % 60 ? fmt(sec / 60, 1) : sec / 60) + ' min rest' : sec + 's rest';
function tplFor(name) { const k = exKey(name); for (const d of ['push', 'pull', 'legs']) { const t = (S.gym.templates[d] || []).find(x => exKey(x.name) === k); if (t) return t; } return null; }
function fromTemplate(day) {
  return (S.gym.templates[day] || []).map(t => ({ id: uid(), name: t.name, rest: num(t.rest) || 180, note: t.note || '',
    sets: Array.from({ length: Math.max(1, Math.min(10, num(t.sets) || 1)) }, () => ({ id: uid(), reps: num(t.reps) || '', weight: '', done: false })) }));
}
/* Today's workout is preloaded from the cycle's template */
function seedToday() {
  const d = today(), day = cycleDay(d);
  if (day !== 'rest' && !S.workouts[d]) { S.workouts[d] = { day, exercises: fromTemplate(day) }; save(); }
}
function realign(day) {
  const d = today(); S.gym.anchor = { date: d, idx: CYCLE.indexOf(day) };
  const w = S.workouts[d];
  if (untouchedWorkout(w)) { if (day === 'rest') delete S.workouts[d]; else S.workouts[d] = { day, exercises: fromTemplate(day) }; }
  else w.day = day;
}
function getWorkout(date) { return S.workouts[date] || { exercises: [] }; }
function ensureWorkout(date) { if (!S.workouts[date]) S.workouts[date] = { day: cycleDay(date), exercises: [] }; return S.workouts[date]; }
function pruneWorkout(date) { const w = S.workouts[date]; if (w && !w.exercises.length && !w.start) delete S.workouts[date]; }
function allExerciseNames() {
  const map = new Map();
  ['push', 'pull', 'legs'].forEach(d => (S.gym.templates[d] || []).forEach(t => map.set(exKey(t.name), t.name)));
  Object.keys(S.workouts).sort().forEach(d => S.workouts[d].exercises.forEach(e => map.set(exKey(e.name), e.name)));
  return Array.from(map.values());
}
function lastTime(name, beforeDate) {
  const k = exKey(name);
  const dates = Object.keys(S.workouts).filter(d => d < beforeDate).sort().reverse();
  for (const d of dates) { const e = S.workouts[d].exercises.find(x => exKey(x.name) === k && loggedEx(x)); if (e) return { date: d, sets: e.sets.filter(loggedSet) }; }
  return null;
}
const topSet = sets => sets.reduce((best, s) => (!best || num(s.weight) > num(best.weight) || (num(s.weight) === num(best.weight) && num(s.reps) > num(best.reps))) ? s : best, null);
const setsSummary = sets => {
  if (!sets.length) return 'No sets yet';
  const reps = sets.map(s => num(s.reps));
  const same = sets.every(s => num(s.reps) === reps[0] && num(s.weight) === num(sets[0].weight));
  if (same) return sets.length + ' × ' + reps[0] + (num(sets[0].weight) ? ' at ' + fmt(num(sets[0].weight)) + ' kg' : '');
  const t = topSet(sets);
  return sets.length + ' sets, top ' + (num(t.weight) ? fmt(num(t.weight)) + ' kg × ' : '') + num(t.reps);
};
const volume = sets => sets.reduce((a, s) => a + num(s.reps) * num(s.weight), 0);
function liftSeries() {
  const map = new Map();
  Object.keys(S.workouts).sort().forEach(d => S.workouts[d].exercises.forEach(e => {
    if (!loggedEx(e)) return; const t = topSet(e.sets.filter(loggedSet)); const k = exKey(e.name);
    if (!map.has(k)) map.set(k, { name: e.name, points: [] });
    const s = map.get(k); s.name = e.name; s.points.push({ date: d, value: num(t.weight), reps: num(t.reps) });
  }));
  return Array.from(map.values());
}

/* ================= Deltas ================= */
const PERIODS = { last: 'Last', '7': '7 days', '30': '30 days', all: 'All' };
const PERIOD_KEYS = ['last', '7', '30', 'all'];
const periodPhrase = p => ({ last: 'since last time', '7': 'this week', '30': 'this month', all: 'overall' }[p]);
function delta(points, period) {
  if (!points.length) return null;
  const cur = points[points.length - 1];
  let ref = null;
  if (points.length > 1) {
    if (period === 'last') ref = points[points.length - 2];
    else if (period === 'all') ref = points[0];
    else {
      const cutoff = addDays(cur.date, -Number(period));
      const before = points.filter(p => p.date <= cutoff);
      ref = before.length ? before[before.length - 1] : points.find(p => p.date >= cutoff && p !== cur) || null;
      if (ref === cur) ref = null;
    }
  }
  return { cur, ref, diff: ref ? cur.value - ref.value : 0, repsDiff: ref && ref.reps != null ? cur.reps - ref.reps : 0 };
}
function deltaChip(d, unit, opts = {}) {
  if (!d || !d.ref) return '<span class="delta">New</span>';
  const v = round1(d.diff);
  if (v === 0 && opts.reps && d.repsDiff) return `<span class="delta ${d.repsDiff > 0 ? 'up' : 'down'}">${d.repsDiff > 0 ? '+' : '−'}${Math.abs(d.repsDiff)} reps</span>`;
  if (v === 0) return '<span class="delta">± 0 ' + unit + '</span>';
  const cls = opts.neutral ? 'gold' : (v > 0) !== !!opts.invert ? 'up' : 'down';
  return `<span class="delta ${cls}">${signed(v)} ${unit}</span>`;
}

/* ================= Rendering: shared ================= */
function dayswitch(kind, date, allowFuture) {
  const nextDisabled = !allowFuture && date >= today();
  return `<div class="dayswitch">
    <button class="day-label" data-act="today" data-kind="${kind}" style="text-align:left">
      <div class="day-title">${dayLabel(date)}</div><div class="day-sub">${longDate(date)}</div>
    </button>
    <div class="day-nav">
      <button class="icon-btn" data-act="day" data-kind="${kind}" data-d="-1" aria-label="Previous day">${I.left}</button>
      <button class="icon-btn" data-act="day" data-kind="${kind}" data-d="1" aria-label="Next day" ${nextDisabled ? 'disabled' : ''}>${I.right}</button>
    </div></div>`;
}
const isOpen = id => U.open.has(id) ? ' open' : '';

/* ================= Meals view ================= */
function modeSeg() {
  const i = U.mealsMode === 'shop' ? 1 : 0;
  return `<div class="seg" id="mealSeg"><span class="seg-ind" style="width:calc((100% - 12px)/2);transform:translateX(calc(${i} * (100% + 4px)))"></span>
    <button class="${i ? '' : 'on'}" data-act="meal-mode" data-m="today">Today</button><button class="${i ? 'on' : ''}" data-act="meal-mode" data-m="shop">Shopping</button></div>`;
}
function renderMeals() {
  if (U.mealsMode === 'shop') return renderShop();
  const date = U.mealsDate, meals = getMeals(date);
  const rows = meals.map(m => `<div class="item${m.done ? ' done' : ''}${isOpen(m.id)}" data-meal="${m.id}">${mealHead(m)}
      <div class="expand"><div class="expand-in"><div class="expand-body">
        <div class="form-grid">
          <div class="mini-field span4"><label>Name</label><input class="field" data-mf="name" value="${esc(m.name)}" placeholder="Meal name"></div>
          <div class="mini-field span4"><label>What's in it</label><textarea class="field" data-mf="items" rows="2" placeholder="e.g. 4 eggs, 2 toast, avocado">${esc(m.items)}</textarea></div>
          <div class="mini-field"><label>kcal</label><input class="field" data-mf="cals" inputmode="numeric" value="${num(m.cals) || ''}" placeholder="0"></div>
          <div class="mini-field"><label>Protein g</label><input class="field" data-mf="p" inputmode="decimal" value="${num(m.p) || ''}" placeholder="0"></div>
          <div class="mini-field"><label>Carbs g</label><input class="field" data-mf="c" inputmode="decimal" value="${num(m.c) || ''}" placeholder="0"></div>
          <div class="mini-field"><label>Fat g</label><input class="field" data-mf="f" inputmode="decimal" value="${num(m.f) || ''}" placeholder="0"></div>
        </div>
        <div class="actions"><button class="pill pill-sm pill-danger" data-act="del-meal">Remove meal</button><button class="pill pill-sm pill-ghost" data-act="collapse">Done</button></div>
      </div></div></div></div>`).join('');
  const same = matchesPlan(date);
  $('#view-meals').innerHTML = `${modeSeg()}${dayswitch('meals', date, true)}
    ${hintSlot('meals')}
    <div class="panel sumcard${U.sumOpen ? ' open' : ''}" id="mealSummary"><div class="summary" data-act="sum">${mealSummaryInner(date)}</div>
      <div class="expand"><div class="expand-in"><div class="macro-detail">${macroDetail(date)}</div></div></div></div>
    ${meals.length ? `<div class="list" id="mealList">${rows}</div>` : `<div class="list"><div class="empty"><b>No meals for this day</b>Add the meals you plan to eat, then tick them off as you go.</div></div>`}
    <div class="foot">
      <button class="pill pill-gold" data-act="add-meal">${I.plus}Add meal</button>
      <button class="pill" data-act="save-plan" ${same ? 'disabled style="opacity:.45"' : ''}>Save as daily plan</button>
    </div>
    <p class="foot-note" id="planNote">${same ? 'Your daily plan. It repeats every day, ticks reset each morning.' : 'Changed for this day only. Save as daily plan to repeat it.'}</p>`;
}
function mealHead(m) {
  const sub = m.items ? esc(m.items) : (num(m.p) || num(m.c) || num(m.f)) ? `P ${fmt(num(m.p), 0)}  C ${fmt(num(m.c), 0)}  F ${fmt(num(m.f), 0)}` : '';
  return `<div class="item-head" data-act="toggle">
    <button class="check" data-act="tick" aria-label="Tick off ${esc(m.name)}">${I.check}</button>
    <div class="item-main"><div class="item-title">${esc(m.name || 'Untitled meal')}</div>${sub ? `<div class="item-sub">${sub}</div>` : ''}</div>
    <div class="item-val">${num(m.cals) ? fmtInt(num(m.cals)) + ' kcal' : '<span class="faint">Set kcal</span>'}</div>${I.chev}</div>`;
}
const goalKcal = t => num(S.targets.kcal) || t.planned;
function mealSummaryInner(date) {
  const t = mealTotals(date), goal = goalKcal(t); const pct = goal ? Math.min(1, t.eaten / goal) : 0;
  const C = 2 * Math.PI * 42;
  const macro = `<div class="macros"><span><b>${fmt(t.p, 0)}g</b> protein</span><span><b>${fmt(t.c, 0)}g</b> carbs</span><span><b>${fmt(t.f, 0)}g</b> fat</span>${I.chev}</div>`;
  return `<div class="ring"><svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="42"/><circle class="bar" cx="50" cy="50" r="42" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}"/></svg>
      <div class="ring-label"><div class="ring-pct">${Math.round(pct * 100)}%</div></div></div>
    <div class="sum-main"><div class="sum-cals">${fmtInt(t.eaten)} <span>/ ${fmtInt(goal)} kcal</span></div>
      <div class="sum-sub">${t.done} of ${t.n} meal${t.n === 1 ? '' : 's'} ticked off${goal && t.eaten < goal ? ', ' + fmtInt(goal - t.eaten) + ' kcal to go' : t.n && t.done === t.n ? ', all done' : ''}</div>${macro}</div>`;
}
function macroDetail(date) {
  const t = mealTotals(date), T = S.targets;
  const row = (label, v, goal, plus) => `<div class="mrow"><span class="ml">${label}</span><div class="mbar"><i style="transform:scaleX(${goal ? Math.min(1, v / goal) : 0})"></i></div><span class="mv">${fmt(v, 0)}<span> / ${fmt(goal, 0)}g${plus ? '+' : ''}</span></span></div>`;
  return row('Protein', t.p, num(T.p), true) + row('Carbs', t.c, num(T.c)) + row('Fat', t.f, num(T.f)) +
    `<p class="mnote">Target ${fmtInt(num(T.kcal))} kcal a day. Weights are raw / uncooked unless stated.</p>`;
}
function refreshMealSummary() {
  const box = $('#mealSummary'); if (!box) return;
  const t = mealTotals(U.mealsDate), goal = goalKcal(t), pct = goal ? Math.min(1, t.eaten / goal) : 0, C = 2 * Math.PI * 42;
  const md = $('.macro-detail', box); if (md) md.innerHTML = macroDetail(U.mealsDate);
  const bar = $('.bar', box);
  const tmp = document.createElement('div'); tmp.innerHTML = mealSummaryInner(U.mealsDate);
  box.querySelector('.sum-main').replaceWith(tmp.querySelector('.sum-main'));
  $('.ring-pct', box).textContent = Math.round(pct * 100) + '%';
  bar.setAttribute('stroke-dashoffset', C * (1 - pct)); // animates via CSS transition
  const same = matchesPlan(U.mealsDate), btn = $('[data-act="save-plan"]');
  if (btn) { btn.disabled = same; btn.style.opacity = same ? '.45' : ''; }
  const note = $('#planNote'); if (note) note.textContent = same ? 'Your daily plan. It repeats every day, ticks reset each morning.' : 'Changed for this day only. Save as daily plan to repeat it.';
}

/* ================= Shopping ================= */
const SHOP = {
  month: [
    { g: 'Meat', note: 'Freeze in daily bags: 200g chicken, 150g mince', items: [['chicken', 'Chicken thighs, skinless', '6 × 1kg'], ['mince', 'Beef mince, 10% fat', '9 × 500g']] },
    { g: 'Frozen', items: [['berries', 'Mixed berries', '4 × 750g'], ['broccoli', 'Broccoli', '3 × 1kg']] },
    { g: 'Cupboard', items: [['rice', 'Rice', '10kg bag'], ['dates', 'Medjool dates', '~2kg (90)'], ['honey', 'Honey', '2 × 340g'], ['oil', 'Olive oil', '2 × 500ml'], ['spray', '1-cal spray oil', '1 can'], ['seasoning', 'Potato seasoning', '1–2 jars'], ['butter', 'Butter (optional)', '3 × 250g']] },
  ],
  week: [['bananas', 'Bananas', '14–15'], ['grapes', 'Grapes', '~1.1kg'], ['yogurt', 'Greek yogurt, full-fat', '2 × 1kg'], ['eggs', 'Eggs', '15 tray'], ['potatoes', 'Potatoes', '2.5kg bag']],
};
const SHOP_STORES = [{ id: 'haris', name: 'Haris & Co' }, { id: 'morrisons', name: 'Morrisons' }, { id: 'veg', name: 'Veg market' }];
const SHOP_AT = {
  chicken: ['haris', 'morrisons'], mince: ['haris', 'morrisons'],
  berries: ['morrisons'], broccoli: ['morrisons'],
  rice: ['haris'], dates: ['haris', 'morrisons'],
  honey: ['morrisons', 'haris'], oil: ['haris', 'morrisons'],
  spray: ['morrisons'], seasoning: ['morrisons', 'haris'], butter: ['morrisons'],
  bananas: ['veg', 'morrisons'], grapes: ['veg', 'morrisons'],
  yogurt: ['morrisons'], eggs: ['morrisons', 'veg'], potatoes: ['veg', 'morrisons'],
};
const SHOP_WHERE = [
  '<b>Haris & Co</b> for halal chicken and mince, and for bulk rice, dates and cupboard staples.',
  '<b>Morrisons</b> for frozen berries and broccoli, Greek yogurt, 1-cal spray, honey, butter and eggs.',
  '<b>Veg market</b> for bananas, grapes and potatoes — usually cheaper than the supermarket.',
];
const SHOP_PREP = ['Freeze meat as soon as you get home, portioned per day.', 'Defrost tomorrow’s portions in the fridge the night before.', 'Keep potatoes in a cool, dark cupboard away from onions.', 'Batch cook rice for 2–3 days at a time.'];
const weekStart = d => addDays(d, -mod(parseISO(d).getDay() - 1, 7)); // Monday
function shopSync() { const ws = weekStart(today()); if (S.shop.weekOf !== ws) { S.shop.week = {}; S.shop.weekOf = ws; save(); } }
const monthItems = () => SHOP.month.flatMap(g => g.items);
function allShopItems() {
  return monthItems().map(([id, name, qty]) => ({ list: 'month', id, name, qty }))
    .concat(SHOP.week.map(([id, name, qty]) => ({ list: 'week', id, name, qty })))
    .concat(S.shop.extras.map(x => ({ list: 'extras', id: x.id, name: x.name, qty: '' })));
}
const shopName = x => x.name.replace(/\(.*?\)/g, ' ').replace(/,.*$/, '').trim();
const isGot = (list, id) => list === 'extras' ? !!(S.shop.extras.find(x => x.id === id) || {}).done : !!S.shop[list][id];
function setGot(list, id, v) { if (list === 'extras') { const x = S.shop.extras.find(y => y.id === id); if (x) x.done = v; } else if (v) S.shop[list][id] = true; else delete S.shop[list][id]; }
function shopCount(list) {
  const ids = list === 'month' ? monthItems().map(i => i[0]) : list === 'week' ? SHOP.week.map(i => i[0]) : S.shop.extras.map(x => x.id);
  return { got: ids.filter(id => isGot(list, id)).length, n: ids.length };
}
function shopStores(id) { return (SHOP_AT[id] || []).map(k => SHOP_STORES.find(s => s.id === k)).filter(Boolean); }
function shopRow(list, id, name, qty, del) {
  const tags = shopStores(id);
  const at = tags.length ? `<div class="shop-at">${tags.map(s => `<span>${esc(s.name)}</span>`).join('')}</div>` : '';
  return `<div class="srow${isGot(list, id) ? ' done' : ''}" data-list="${list}" data-sid="${esc(id)}">
    <button class="check" data-act="shop-tick" aria-label="Tick ${esc(name)}">${I.check}</button>
    <div class="item-main" data-act="shop-tick"><div class="item-title">${esc(name)}</div>${at}</div>
    ${qty ? `<div class="item-val">${esc(qty)}</div>` : ''}${del ? `<button class="del" data-act="shop-del" aria-label="Remove ${esc(name)}">${I.x}</button>` : ''}</div>`;
}
function renderShop() {
  shopSync();
  const filt = U.shopFilter || 'all';
  const shown = id => filt === 'all' || (SHOP_AT[id] || []).includes(filt);
  const m = shopCount('month'), w = shopCount('week'), x = shopCount('extras');
  const all = m.got + w.got + x.got, total = m.n + w.n + x.n;
  const card = (id, kicker, count, sub, body) => `<div class="card${isOpen(id)}" data-card="${id}">
    <div class="card-head" data-act="toggle"><div class="grow"><div class="card-kicker">${kicker}</div>
      <div class="card-big"><span data-count="${id}">${count}</span></div><div class="item-sub" style="margin-top:2px">${sub}</div></div>
      <div class="head-right">${I.chev}</div></div>
    <div class="expand"><div class="expand-in"><div class="expand-body">${body}</div></div></div></div>`;
  const cnt = c => `${c.got}<small>of ${c.n}</small>`;
  const monthVis = SHOP.month.map(g => ({ g, items: g.items.filter(([id]) => shown(id)) })).filter(g => g.items.length);
  const weekVis = SHOP.week.filter(([id]) => shown(id));
  const monthBody = monthVis.map(g => `<div class="shop-g"><div class="shop-gh">${g.g.g}${g.g.note ? `<span>${g.g.note}</span>` : ''}</div>
      ${g.items.map(([id, n, q]) => shopRow('month', id, n, q)).join('')}</div>`).join('') +
    `<div class="actions"><span class="faint" style="font-size:12.5px">Ticks stay until your next big shop</span><button class="pill pill-sm" data-act="shop-reset" data-list="month">New shop</button></div>`;
  const weekBody = `<div class="shop-g">${weekVis.map(([id, n, q]) => shopRow('week', id, n, q)).join('')}</div>
    <div class="actions"><span class="faint" style="font-size:12.5px">Clears itself every Monday</span><button class="pill pill-sm" data-act="shop-reset" data-list="week">Reset</button></div>`;
  const extraBody = `${S.shop.extras.length ? `<div class="shop-g">${S.shop.extras.map(e => shopRow('extras', e.id, e.name, '', true)).join('')}</div>` : ''}
    <form class="inline-add" data-form="shop-add" autocomplete="off" style="margin-top:${S.shop.extras.length ? 12 : 0}px"><input class="field" name="v" placeholder="Add an item, e.g. oats"><button class="pill pill-gold" type="submit">Add</button></form>`;
  const tips = (id, kicker, sub, list) => `<div class="card card-sm${isOpen(id)}" data-card="${id}"><div class="card-head" data-act="toggle"><div class="grow"><div class="card-kicker">${kicker}</div>${sub ? `<div class="item-sub">${sub}</div>` : ''}</div><div class="head-right">${I.chev}</div></div>
    <div class="expand"><div class="expand-in"><div class="expand-body"><ul class="tips">${list.map(t => `<li>${t}</li>`).join('')}</ul></div></div></div></div>`;
  const filtBar = `<div class="shop-filt" role="tablist" aria-label="Filter by store">${[{ id: 'all', name: 'All' }, ...SHOP_STORES].map(s =>
    `<button class="chip${filt === s.id ? ' on' : ''}" data-act="shop-filter" data-store="${s.id}">${esc(s.name)}</button>`).join('')}</div>`;
  $('#view-meals').innerHTML = `${modeSeg()}
    <div class="panel shop-sum"><div class="grow"><div class="card-kicker">30 days · Lean bulk, phase 1</div>
      <div class="sum-cals"><span data-count="all-got" style="color:inherit;font-size:inherit">${all}</span> <span>of <span data-count="all-n" style="font-size:inherit">${total}</span> in the trolley</span></div></div>
      <div class="shop-bar"><i data-count="bar" style="transform:scaleX(${total ? all / total : 0})"></i></div></div>
    ${filtBar}
    ${monthVis.length ? card('shop-month', 'Big monthly shop', cnt(m), 'Meat, frozen and cupboard', monthBody) : ''}
    ${weekVis.length ? card('shop-week', 'Weekly fresh top-up', cnt(w), 'Every week ×4, buy fresh so nothing goes off', weekBody) : ''}
    ${filt === 'all' ? card('shop-extras', 'Your extras', x.n ? cnt(x) : '<span class="faint">—</span>', x.n ? 'Things you’ve added' : 'Add anything else you need', extraBody) : ''}
    ${tips('shop-where', 'Where to shop', '', SHOP_WHERE)}
    ${tips('shop-prep', 'Prep tips', 'Freezing, defrosting, batch cooking', SHOP_PREP)}`;
}
function refreshShopCounts() {
  const m = shopCount('month'), w = shopCount('week'), x = shopCount('extras'), all = m.got + w.got + x.got, total = m.n + w.n + x.n;
  const set = (k, html) => { const el = $(`[data-count="${k}"]`); if (el) el.innerHTML = html; };
  set('shop-month', `${m.got}<small>of ${m.n}</small>`); set('shop-week', `${w.got}<small>of ${w.n}</small>`); if (x.n) set('shop-extras', `${x.got}<small>of ${x.n}</small>`);
  set('all-got', all); set('all-n', total);
  const bar = $('[data-count="bar"]'); if (bar) bar.style.transform = `scaleX(${total ? all / total : 0})`;
}

/* ================= Gym view ================= */
const clock = ms => { const t = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, sec = t % 60; return h ? h + ':' + pad(m) + ':' + pad(sec) : m + ':' + pad(sec); };
const hhmm = ms => { const d = new Date(ms + CLOCK); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
function sessionCard(date, w, day) {
  const isToday = date === today(), running = !!(w.start && !w.end), done = !!w.end, next = CYCLE[mod(CYCLE.indexOf(day) + 1, 4)];
  const kicker = day === 'rest' ? 'Rest day' : `${DAYNAME[day]} day${isToday ? ' · Gym ' + esc(S.gym.time) : ''}`;
  const big = running ? `<span class="timer" data-timer="session" data-date="${date}">${clock(Date.now() - w.start)}</span>`
    : done ? `${clock(w.dur || 0)}<small>workout</small>` : `${DAYNAME[day]}`;
  const sub = running ? `Started ${hhmm(w.start)}` : done ? `Finished ${hhmm(w.end)}, saved with this workout`
    : isToday ? `Next up: ${DAYNAME[next]} tomorrow` : longDate(date);
  const btn = !isToday ? '' : running ? `<button class="pill pill-sm" data-act="session-finish">Finish</button>`
    : (!done && (day !== 'rest' || w.exercises.length)) ? `<button class="pill pill-sm pill-gold" data-act="session-start">Start workout</button>` : '';
  const tplK = day === 'rest' ? 'push' : day;
  const settings = isToday ? `<div class="label">Today is</div>
      <div class="cyc">${CYCLE.map(k => `<button class="chip${k === day ? ' on' : ''}" data-act="cycle" data-day="${k}">${DAYNAME[k]}</button>`).join('')}</div>
      <p class="mnote" style="margin:8px 2px 14px">Set it once. It then moves on by itself each day: Push, Pull, Legs, Rest, repeat.</p>
      <div class="row" style="justify-content:space-between"><label class="label" style="margin:0" for="gymTime">Gym time</label><input class="field time-field" id="gymTime" type="time" data-gs="time" value="${esc(S.gym.time)}"></div>` : '';
  return `<div class="card session${running ? ' running' : ''}${isOpen('card-session')}" data-card="card-session">
    <div class="card-head" data-act="toggle"><div class="grow"><div class="card-kicker">${kicker}</div>
      <div class="card-big">${big}</div><div class="item-sub" style="margin-top:2px">${sub}</div></div>
      <div class="head-right">${btn}${I.chev}</div></div>
    <div class="expand"><div class="expand-in"><div class="expand-body">${settings}
      <div class="actions"><span class="faint" style="font-size:13px">Templates</span><div class="row">${['push', 'pull', 'legs'].map(k => `<button class="chip${k === tplK ? ' on' : ''}" data-act="tpl-edit" data-k="${k}">Edit ${DAYNAME[k]}</button>`).join('')}</div></div>
    </div></div></div></div>`;
}
function templateEditor(k) {
  const list = S.gym.templates[k] || [];
  const rests = [60, 90, 120, 150, 180, 240];
  return `<div class="section-h" style="margin-top:6px"><h3>${DAYNAME[k]} template</h3><span>${list.length} exercise${list.length === 1 ? '' : 's'}</span></div>
    <div class="list tpl" id="tplList">${list.map(t => `<div class="tpl-row" data-tpl="${t.id}">
      <div class="row"><input class="field" data-tf="name" value="${esc(t.name)}" placeholder="Exercise name"><button class="del" data-act="tpl-del" aria-label="Remove ${esc(t.name)}">${I.x}</button></div>
      <div class="tpl-nums"><label><span>Sets</span><input class="field" data-tf="sets" inputmode="numeric" value="${num(t.sets) || ''}"></label>
        <label><span>Reps</span><input class="field" data-tf="reps" inputmode="numeric" value="${num(t.reps) || ''}"></label>
        <label><span>Rest</span><select class="field" data-tf="rest">${rests.concat(rests.includes(num(t.rest)) ? [] : [num(t.rest)]).map(r => `<option value="${r}"${r === num(t.rest) ? ' selected' : ''}>${r >= 60 ? fmt(r / 60, 1) + ' min' : r + 's'}</option>`).join('')}</select></label></div>
      </div>`).join('') || '<div class="empty">No exercises yet</div>'}</div>
    <div class="foot"><button class="pill" data-act="tpl-add">${I.plus}Add exercise</button><button class="pill pill-gold" data-act="tpl-done">Done</button></div>
    <p class="foot-note">Changes apply from the next ${DAYNAME[k]} day, or today if you haven’t started logging.</p>`;
}
function renderGym() {
  const date = U.gymDate, isToday = date === today();
  if (isToday) seedToday();
  const w = getWorkout(date), day = cycleDay(date);
  const totalSets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = w.exercises.reduce((a, e) => a + e.sets.filter(loggedSet).length, 0);
  const vol = w.exercises.reduce((a, e) => a + volume(e.sets), 0);
  const rows = w.exercises.map(e => exerciseRow(e, date)).join('');
  const names = allExerciseNames();
  const hist = Object.keys(S.workouts).filter(d => d !== date && loggedWorkout(S.workouts[d])).sort().reverse().slice(0, 12);
  const histN = Object.keys(S.workouts).filter(d => loggedWorkout(S.workouts[d])).length;
  const restState = day === 'rest' && !w.exercises.length;
  const main = U.tplEdit ? templateEditor(U.tplEdit) : `
    ${restState ? `<div class="panel rest-day">${I.moon}<div><b>Rest day</b><span>Recovery is where you grow. Eat the full plan, get your protein in and sleep well. ${DAYNAME.push} is up next.</span></div></div>`
      : `<div class="panel stats"><div class="stat"><div class="stat-v">${w.exercises.length}</div><div class="stat-l">Exercises</div></div>
      <div class="stat"><div class="stat-v">${doneSets}<span class="stat-of">/${totalSets}</span></div><div class="stat-l">Sets done</div></div>
      <div class="stat"><div class="stat-v">${vol >= 10000 ? fmt(vol / 1000, 1) + 'k' : fmtInt(vol)}</div><div class="stat-l">Volume kg</div></div></div>
    ${w.exercises.length ? `<div class="list" id="exList">${rows}</div>` : `<div class="list"><div class="empty"><b>No workout logged${isToday ? ' yet today' : ''}</b>Add an exercise below, or tap the mic and say “lat pulldown 2 sets of 8 at 60 kilos”.</div></div>`}`}
    <form class="add-ex" data-form="add-ex" autocomplete="off">
      <input class="field" name="ex" list="exNames" placeholder="${restState ? 'Training anyway? Add an exercise' : 'Add exercise'}" enterkeyhint="done">
      <datalist id="exNames">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <button class="pill pill-gold" type="submit">${I.plus}Add</button>
    </form>
    ${hist.length ? `<div class="section-h"><h3>History</h3><span>${histN} workouts</span></div>
      <div class="list">${hist.map(d => { const ws = S.workouts[d]; const n = ws.exercises.reduce((a, e) => a + e.sets.filter(loggedSet).length, 0); return `<div class="item"><div class="item-head" data-act="goto-gym" data-date="${d}">
        <div class="item-main"><div class="item-title">${dayLabel(d)}${ws.day && ws.day !== 'rest' ? ` <span class="faint">· ${DAYNAME[ws.day]}</span>` : ''}</div><div class="item-sub">${esc(ws.exercises.filter(loggedEx).map(e => e.name).join(', '))}</div></div>
        <div class="item-val">${n} sets${ws.dur ? ' · ' + Math.round(ws.dur / 60000) + ' min' : ''}</div>${I.chevR}</div></div>`; }).join('')}</div>` : ''}`;
  $('#view-gym').innerHTML = `${dayswitch('gym', date, false)}
    ${hintSlot('gym')}
    ${sessionCard(date, w, day)}
    ${main}`;
}
function exerciseRow(e, date) {
  const lt = lastTime(e.name, date);
  const t = topSet(e.sets);
  const rest = num(e.rest) || 180;
  return `<div class="item${isOpen(e.id)}" data-ex="${e.id}">
    <div class="item-head" data-act="toggle"><span class="badge-n">${e.sets.filter(loggedSet).length}/${e.sets.length}</span>
      <div class="item-main"><div class="item-title">${esc(e.name)}</div><div class="item-sub">${setsSummary(e.sets)} · ${restLabel(rest)}</div></div>
      <div class="item-val">${t && num(t.weight) ? fmt(num(t.weight)) + ' kg' : ''}</div>${I.chev}</div>
    <div class="expand"><div class="expand-in"><div class="expand-body">
      ${lt ? `<div class="hint">${I.clock}<span>Last time (${shortDate(lt.date)}): ${setsSummary(lt.sets)}</span></div>` : ''}
      ${e.note ? `<div class="hint">${I.info}<span>${esc(e.note)}</span></div>` : ''}
      ${e.sets.length ? `<div class="set-head"><span>Done</span><span>Reps</span><span></span><span>Weight</span><span></span></div>` : ''}
      <div class="sets">${e.sets.map((s, i) => `<div class="set${s.done ? ' is-done' : ''}" data-set="${s.id}"><button class="set-check${s.done ? ' on' : ''}" data-act="set-done" aria-label="Set ${i + 1} done"><span>${i + 1}</span>${I.check}</button>
        <input class="field" data-sf="reps" inputmode="numeric" value="${num(s.reps) || ''}" placeholder="${lt && lt.sets[i] ? num(lt.sets[i].reps) : 'reps'}">
        <span class="x">×</span>
        <div class="unit-wrap"><input class="field" data-sf="weight" inputmode="decimal" value="${num(s.weight) || ''}" placeholder="${lt && lt.sets[i] ? fmt(num(lt.sets[i].weight)) : '0'}"><span>kg</span></div>
        <button class="del" data-act="del-set" aria-label="Remove set">${I.x}</button></div>`).join('')}</div>
      <div class="actions"><button class="pill pill-sm pill-danger" data-act="del-ex">Remove</button><button class="pill pill-sm" data-act="add-set">${I.plus}Add set</button></div>
    </div></div></div></div>`;
}
function refreshExerciseHead(item, e) {
  const t = topSet(e.sets);
  $('.badge-n', item).textContent = e.sets.filter(loggedSet).length + '/' + e.sets.length;
  $('.item-sub', item).textContent = setsSummary(e.sets) + ' · ' + restLabel(num(e.rest) || 180);
  $('.item-val', item).textContent = t && num(t.weight) ? fmt(num(t.weight)) + ' kg' : '';
  const w = getWorkout(U.gymDate), stats = $$('#view-gym .stat-v');
  const vol = w.exercises.reduce((a, x) => a + volume(x.sets), 0);
  if (stats.length === 3) { stats[1].innerHTML = w.exercises.reduce((a, x) => a + x.sets.filter(loggedSet).length, 0) + '<span class="stat-of">/' + w.exercises.reduce((a, x) => a + x.sets.length, 0) + '</span>'; stats[2].textContent = vol >= 10000 ? fmt(vol / 1000, 1) + 'k' : fmtInt(vol); }
}
function addExercise(date, name) {
  name = titleCase(name); if (!name) return null;
  const w = ensureWorkout(date);
  const k = exKey(name);
  let e = w.exercises.find(x => exKey(x.name) === k);
  if (!e) { const known = allExerciseNames().find(n => exKey(n) === k), tp = tplFor(known || name); e = { id: uid(), name: known || name, rest: tp ? num(tp.rest) || 180 : 180, note: tp ? tp.note || '' : '', sets: [] }; w.exercises.push(e); }
  U.lastExercise = e.name; return e;
}

/* ================= Chart (hand-rolled SVG, monotone curve) ================= */
let chartN = 0;
function monotonePath(pts) {
  const n = pts.length; if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx = [], dy = [], m = [], t = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; dy[i] = pts[i + 1][1] - pts[i][1]; m[i] = dx[i] ? dy[i] / dx[i] : 0; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; } const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b; if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; } }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) { const h = dx[i] / 3; d += ` C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`; }
  return d;
}
function chartSVG(points, unit, raw) {
  if (!points.length) return `<div class="empty" style="padding:18px 0">No entries yet</div>`;
  const id = 'g' + (++chartN), W = Math.max(240, Math.round(Math.min(window.innerWidth || 380, 520) - 66)), H = 150, L = 4, R = 4, T = 14, B = 22;
  const vals = points.map(p => p.value).concat((raw || []).map(p => p.value)); let lo = Math.min(...vals), hi = Math.max(...vals);
  const padv = (hi - lo) * 0.18 || Math.max(1, hi * 0.02); lo -= padv; hi += padv;
  const t0 = parseISO(points[0].date).getTime(), t1 = parseISO(points[points.length - 1].date).getTime();
  const X = (p, i) => points.length === 1 ? W / 2 : t1 === t0 ? L + (W - L - R) * i / (points.length - 1) : L + (W - L - R) * (parseISO(p.date).getTime() - t0) / (t1 - t0);
  const Y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const xy = points.map((p, i) => [round1(X(p, i)), round1(Y(p.value))]);
  const line = monotonePath(xy), last = xy[xy.length - 1];
  const area = `${line} L${last[0]},${H - B} L${xy[0][0]},${H - B} Z`;
  const grid = [0.25, 0.5, 0.75].map(f => `<line x1="0" x2="${W}" y1="${T + (H - T - B) * f}" y2="${T + (H - T - B) * f}"/>`).join('');
  const data = esc(JSON.stringify(points.map((p, i) => ({ x: xy[i][0], y: xy[i][1], v: p.value, d: p.date }))));
  return `<div class="chart draw" data-points="${data}" data-unit="${esc(unit)}" data-w="${W}">
    <svg viewBox="0 0 ${W} ${H}">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--gold)" stop-opacity=".28"/><stop offset="1" stop-color="var(--gold)" stop-opacity="0"/></linearGradient></defs>
      <g class="grid">${grid}</g>
      ${raw && raw.length > 1 ? `<g class="raw">${raw.map((p, i) => `<circle cx="${round1(X(p, i))}" cy="${round1(Y(p.value))}" r="2.2"/>`).join('')}</g>` : ''}
      ${points.length > 1 ? `<path class="area" d="${area}" style="fill:url(#${id})"/><path class="line" d="${line}" pathLength="1"/>` : ''}
      <line class="cursor" x1="0" x2="0" y1="${T - 6}" y2="${H - B}"/>
      <circle class="dot" cx="${last[0]}" cy="${last[1]}" r="3.6"/>
      <circle class="cursor-dot" cx="0" cy="0" r="3.6"/>
      <text class="ax" x="0" y="${H - 5}">${shortDate(points[0].date)}</text>
      ${points.length > 1 ? `<text class="ax" x="${W}" y="${H - 5}" text-anchor="end">${shortDate(points[points.length - 1].date)}</text>` : ''}
    </svg><div class="chart-tip"></div></div>`;
}
function sparkSVG(points) {
  if (points.length < 2) return '<svg class="spark" viewBox="0 0 64 24"></svg>';
  const vals = points.map(p => p.value), lo = Math.min(...vals), hi = Math.max(...vals) || 1;
  const xy = points.map((p, i) => [round1(2 + 60 * i / (points.length - 1)), round1(hi === lo ? 12 : 21 - 18 * (p.value - lo) / (hi - lo))]);
  return `<svg class="spark" viewBox="0 0 64 24"><path d="${monotonePath(xy)}"/></svg>`;
}
/* Scrub: touch/drag across a chart to read values */
function bindChartScrub(root) {
  root.addEventListener('pointermove', onScrub); root.addEventListener('pointerdown', onScrub);
  ['pointerleave', 'pointerup', 'pointercancel'].forEach(ev => root.addEventListener(ev, e => { const c = e.target.closest && e.target.closest('.chart'); if (c) c.classList.remove('scrub'); }));
}
function onScrub(e) {
  const c = e.target.closest && e.target.closest('.chart'); if (!c) return;
  const pts = JSON.parse(c.dataset.points || '[]'); if (!pts.length) return;
  const svg = $('svg', c), r = svg.getBoundingClientRect(), W = +c.dataset.w;
  const x = (e.clientX - r.left) / r.width * W;
  let best = pts[0]; pts.forEach(p => { if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p; });
  const cur = $('.cursor', c), dot = $('.cursor-dot', c), tip = $('.chart-tip', c);
  cur.setAttribute('x1', best.x); cur.setAttribute('x2', best.x); dot.setAttribute('cx', best.x); dot.setAttribute('cy', best.y);
  tip.textContent = fmt(best.v) + ' ' + c.dataset.unit + '  ' + shortDate(best.d);
  tip.style.left = Math.max(48, Math.min(r.width - 48, best.x / W * r.width)) + 'px';
  c.classList.add('scrub');
}

/* ================= Progress view ================= */
function avg7(bw) {
  return bw.map(p => { const from = addDays(p.date, -6), win = bw.filter(x => x.date >= from && x.date <= p.date);
    return { date: p.date, value: round1(win.reduce((a, x) => a + num(x.value), 0) / win.length), n: win.length }; });
}
function sortByDate(a) { return a.slice().sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0); }
function renderProgress() {
  const P = U.period, keys = PERIOD_KEYS, pi = keys.indexOf(P);
  const seg = `<div class="seg" id="periodSeg"><span class="seg-ind" style="width:calc((100% - 20px)/4);transform:translateX(calc(${pi} * (100% + 4px)))"></span>
    ${keys.map(k => `<button class="${k === P ? 'on' : ''}" data-act="period" data-p="${k}">${PERIODS[k]}</button>`).join('')}</div>`;

  /* Bodyweight */
  const bw = sortByDate(S.bodyweight), avg = avg7(bw), bd = delta(avg, P), lastW = bw[bw.length - 1];
  const bwCard = `<div class="card${isOpen('card-bw')}" data-card="card-bw">
    <div class="card-head" data-act="toggle"><div><div class="card-kicker">Bodyweight · 7-day average</div>
      <div class="card-big">${bd ? fmt(bd.cur.value) + '<small>kg</small>' : '<span class="faint">—</span>'}</div>
      <div class="item-sub" style="margin-top:2px">${lastW ? (lastW.date === today() ? 'Today ' : 'Last weigh-in ') + fmt(lastW.value) + ' kg' + (lastW.date === today() ? '' : ', ' + shortDate(lastW.date)) + (bd && bd.ref ? ' · avg was ' + fmt(bd.ref.value) + ' on ' + shortDate(bd.ref.date) : '') : 'Log your first weigh-in'}</div></div>
      <div class="head-right">${bd ? deltaChip(bd, 'kg', { neutral: true }) : ''}${I.chev}</div></div>
    <div class="expand"><div class="expand-in"><div class="expand-body">
      <div class="hint">${I.scale}<span>Weigh every morning after the toilet, before food. Progress goes off the weekly average, not single days.</span></div>
      ${bw.length ? chartSVG(avg, 'kg avg', bw) : ''}
      <form class="inline-add" data-form="bw" autocomplete="off"><input class="field" name="v" inputmode="decimal" placeholder="Today's weight, kg"><button class="pill pill-gold" type="submit">Log</button></form>
      ${bw.length ? `<div class="history" style="margin-top:12px">${bw.slice().reverse().slice(0, 30).map(e => `<div class="hrow"><span class="d">${dayLabel(e.date)}</span><span>${fmt(e.value)} kg</span><button class="del" data-act="del-bw" data-id="${e.id}" aria-label="Delete">${I.x}</button></div>`).join('')}</div>` : ''}
    </div></div></div></div>`;

  /* Strength (automatic from gym log) */
  const lifts = liftSeries().map(l => Object.assign(l, { d: delta(l.points, P) })).filter(l => l.d && l.d.cur.value > 0);
  const ranked = lifts.filter(l => l.d.ref).sort((a, b) => (b.d.diff - a.d.diff) || (b.d.repsDiff - a.d.repsDiff));
  const star = ranked.find(l => l.d.diff > 0 || (l.d.diff === 0 && l.d.repsDiff > 0));
  const improved = ranked.filter(l => l.d.diff > 0 || (l.d.diff === 0 && l.d.repsDiff > 0)).length;
  const starText = star ? (star.d.diff > 0 ? `${esc(star.name)} ${signed(round1(star.d.diff))} kg ${periodPhrase(P)}` : `${esc(star.name)} +${star.d.repsDiff} reps ${periodPhrase(P)}`) : '';
  const strCard = `<div class="card${isOpen('card-str')}" data-card="card-str">
    <div class="card-head" data-act="toggle"><div style="min-width:0"><div class="card-kicker">Strength</div>
      <div class="card-big">${lifts.length ? improved + '<small>of ' + ranked.length + ' lifts up</small>' : '<span class="faint">—</span>'}</div>
      <div class="item-sub" style="margin-top:2px">${lifts.length ? (star ? 'Top mover: ' + starText : ranked.length ? 'No gains ' + periodPhrase(P) + ' yet' : 'Log a lift twice to see your progress') : 'Worked out from your gym log'}</div></div>
      <div class="head-right">${I.chev}</div></div>
    <div class="expand"><div class="expand-in">
      ${star ? `<div class="standout">${I.trend}<span><b>${starText}</b></span></div>` : ''}
      <div class="expand-body">${lifts.length ? lifts.sort((a, b) => b.d.cur.date.localeCompare(a.d.cur.date)).map(l => `<div class="lift"><div class="grow"><div class="lift-name">${esc(l.name)}</div>
        <div class="lift-sub">Top set ${fmt(l.d.cur.value)} kg × ${l.d.cur.reps}, ${shortDate(l.d.cur.date)}</div></div>${sparkSVG(l.points)}${deltaChip(l.d, 'kg', { reps: true })}</div>`).join('')
        : '<div class="empty" style="padding:10px 0 4px">Your lifts appear here automatically once you log workouts in Gym.</div>'}</div>
    </div></div></div>`;

  /* Measurements */
  const M = S.measure, unit = M.unit, mu = t => /%/.test(t) ? '%' : unit;
  if (!U.measType || !M.types.includes(U.measType)) U.measType = (M.types.find(t => M.entries.some(e => e.type === t)) || M.types[0] || null);
  const seriesOf = t => sortByDate(M.entries.filter(e => e.type === t));
  const summ = M.types.map(t => ({ t, d: delta(seriesOf(t), P) }));
  const withData = summ.filter(x => x.d);
  const sel = U.measType ? seriesOf(U.measType) : [];
  const measCard = `<div class="card${isOpen('card-meas')}" data-card="card-meas">
    <div class="card-head" data-act="toggle"><div class="grow"><div class="card-kicker">Measurements</div>
      ${withData.length ? withData.slice(0, 4).map(x => `<div class="lift" style="padding:8px 0"><div class="grow"><span class="lift-name">${esc(x.t)}</span></div><span class="num muted">${fmt(x.d.cur.value)} ${mu(x.t)}</span>${deltaChip(x.d, mu(x.t), { neutral: true })}</div>`).join('')
        : `<div class="card-big"><span class="faint">—</span></div><div class="item-sub" style="margin-top:2px">Track chest, arms, waist and anything else</div>`}</div>
      <div class="head-right" style="margin-left:0">${I.chev}</div></div>
    <div class="expand"><div class="expand-in"><div class="expand-body">
      <div class="meas-pills">${M.types.map(t => `<button class="chip${t === U.measType ? ' on' : ''}" data-act="meas-type" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      ${U.measType ? chartSVG(sel, mu(U.measType)) : ''}
      <form class="inline-add" data-form="meas" autocomplete="off">
        <select class="field" name="t">${M.types.map(t => `<option${t === U.measType ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
        <input class="field" name="v" inputmode="decimal" placeholder="${unit === 'in' ? 'Inches' : 'cm'}"><button class="pill pill-gold" type="submit">Log</button></form>
      ${sel.length ? `<div class="history" style="margin-top:12px">${sel.slice().reverse().slice(0, 20).map(e => `<div class="hrow"><span class="d">${dayLabel(e.date)}</span><span>${fmt(e.value)} ${mu(e.type)}</span><button class="del" data-act="del-meas" data-id="${e.id}" aria-label="Delete">${I.x}</button></div>`).join('')}</div>` : ''}
      <form class="inline-add" data-form="meas-type" autocomplete="off"><input class="field" name="t" placeholder="New measurement, e.g. Thighs"><button class="pill" type="submit">Add</button></form>
      <div class="actions"><span class="faint" style="font-size:13px">Units</span><div class="row">
        <button class="chip${unit === 'in' ? ' on' : ''}" data-act="meas-unit" data-u="in">in</button><button class="chip${unit === 'cm' ? ' on' : ''}" data-act="meas-unit" data-u="cm">cm</button>
        ${U.measType ? `<button class="chip" data-act="del-meas-type">Remove ${esc(U.measType)}</button>` : ''}</div></div>
    </div></div></div></div>`;

  $('#view-progress').innerHTML = hintSlot('progress') + seg + bwCard + strCard + measCard + `
    <div class="backup"><button class="pill pill-sm pill-ghost" data-act="export">Back up data</button><button class="pill pill-sm pill-ghost" data-act="import">Restore backup</button></div>`;
}

function render() {
  if (U.tab === 'meals') renderMeals(); else if (U.tab === 'gym') renderGym(); else renderProgress();
}

/* ================= Interactions ================= */
const views = $('#views');
function afterRender(focusSel) {
  if (U.justAdded) { const el = $(`[data-meal="${U.justAdded}"],[data-ex="${U.justAdded}"]`); if (el) el.classList.add('enter'); U.justAdded = null; }
  if (focusSel) { const f = $(focusSel); if (f) setTimeout(() => f.focus({ preventScroll: false }), 60); }
}
function restartDraw(scope) { $$('.chart', scope).forEach(c => { c.classList.remove('draw'); void c.offsetWidth; c.classList.add('draw'); }); }
function leave(el, fn) {
  if (!el || reduceMotion()) return fn();
  el.style.transition = 'opacity 160ms cubic-bezier(.2,0,0,1), transform 160ms cubic-bezier(.2,0,0,1)';
  el.style.opacity = '0'; el.style.transform = 'translateX(14px)';
  setTimeout(fn, 160);
}
function commit(focusSel) { save(); render(); afterRender(focusSel); }

views.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act, item = a.closest('.item,.card');
  const mealId = item && item.dataset.meal, exId = item && item.dataset.ex;
  switch (act) {
    case 'tick': {
      e.stopPropagation();
      const m = findMeal(U.mealsDate, mealId); m.done = !m.done; save();
      item.classList.toggle('done', m.done);
      if (m.done) { a.classList.remove('pop'); void a.offsetWidth; a.classList.add('pop'); }
      refreshMealSummary(); break;
    }
    case 'toggle': {
      const id = mealId || exId || item.dataset.card; if (!id) break;
      const open = !item.classList.contains('open');
      item.classList.toggle('open', open); open ? U.open.add(id) : U.open.delete(id);
      if (open) { restartDraw(item); if (exId) { const e2 = getWorkout(U.gymDate).exercises.find(x => x.id === exId); if (e2) U.lastExercise = e2.name; } }
      break;
    }
    case 'collapse': item.classList.remove('open'); U.open.delete(mealId || exId); break;
    case 'sum': { const box = $('#mealSummary'); U.sumOpen = !U.sumOpen; box.classList.toggle('open', U.sumOpen); break; }
    case 'meal-mode': {
      const m = a.dataset.m === 'shop' ? 'shop' : 'meals'; if (m === U.mealsMode) break;
      U.mealsMode = m; localStorage.setItem('peakfit.mealsMode', m);
      $('#mealSeg .seg-ind').style.transform = `translateX(calc(${m === 'shop' ? 1 : 0} * (100% + 4px)))`;
      $$('#mealSeg button').forEach(b => b.classList.toggle('on', b === a));
      setTimeout(() => { renderMeals(); const v = $('#view-meals'); v.style.animation = 'none'; void v.offsetWidth; v.style.animation = ''; }, 140); break;
    }
    case 'nudge': dismissHint(a.dataset.id); break;
    case 'shop-filter': {
      const store = a.dataset.store || 'all'; if (store === U.shopFilter) break;
      U.shopFilter = store; renderMeals(); break;
    }
    case 'shop-tick': {
      const row = a.closest('.srow'), list = row.dataset.list, id = row.dataset.sid, v = !isGot(list, id);
      setGot(list, id, v); save(); row.classList.toggle('done', v);
      if (v) { const c = $('.check', row); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); }
      refreshShopCounts(); break;
    }
    case 'shop-del': { const row = a.closest('.srow'); leave(row, () => { S.shop.extras = S.shop.extras.filter(x => x.id !== row.dataset.sid); commit(); }); break; }
    case 'shop-reset': {
      const list = a.dataset.list, prev = JSON.stringify(S.shop[list]);
      S.shop[list] = {}; commit(); toast(list === 'month' ? 'Ticks cleared for your next big shop' : 'Weekly top-up cleared', { undo: () => { S.shop[list] = JSON.parse(prev); commit(); } }); break;
    }
    case 'set-done': {
      unlockAudio();
      const ex = getWorkout(U.gymDate).exercises.find(x => x.id === exId), row = a.closest('.set'), s = ex.sets.find(x => x.id === row.dataset.set);
      s.done = !s.done;
      const w = ensureWorkout(U.gymDate); let started = false;
      if (s.done) {
        const i = ex.sets.indexOf(s), lt = lastTime(ex.name, U.gymDate), ref = lt && (lt.sets[i] || lt.sets[lt.sets.length - 1]), tp = tplFor(ex.name);
        if (!num(s.weight) && ref && num(ref.weight)) s.weight = num(ref.weight);
        if (!num(s.reps)) s.reps = (ref && num(ref.reps)) || (tp && num(tp.reps)) || '';
        if (U.gymDate === today() && !w.start) { w.start = Date.now(); delete w.end; delete w.dur; started = true; }
        const left = getWorkout(U.gymDate).exercises.some(x => x.sets.some(y => !y.done));
        if (left) startRest(num(ex.rest) || 180, ex.name); else stopRest();
      } else if (REST && REST.name === ex.name) stopRest();
      save();
      if (started) { render(); toast('Workout started, timer running'); break; }
      a.classList.toggle('on', s.done); row.classList.toggle('is-done', s.done);
      if (s.done) { a.classList.remove('pop'); void a.offsetWidth; a.classList.add('pop'); }
      $('[data-sf="reps"]', row).value = num(s.reps) || ''; $('[data-sf="weight"]', row).value = num(s.weight) || '';
      refreshExerciseHead(item, ex); break;
    }
    case 'session-start': {
      unlockAudio();
      const w = ensureWorkout(today()); w.start = Date.now(); delete w.end; delete w.dur; U.open.delete('card-session');
      commit(); toast('Workout started, timer running'); break;
    }
    case 'session-finish': {
      e.stopPropagation();
      const w = ensureWorkout(today()); w.end = Date.now(); w.dur = w.end - w.start; stopRest();
      commit(); toast(`Workout saved, ${Math.max(1, Math.round(w.dur / 60000))} min`, { undo: () => { delete w.end; delete w.dur; commit(); } }); break;
    }
    case 'cycle': { realign(a.dataset.day); commit(); toast(`Today is ${DAYNAME[a.dataset.day]} day`); break; }
    case 'tpl-edit': U.tplEdit = a.dataset.k; U.open.delete('card-session'); render(); window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); break;
    case 'tpl-add': { const t = TX('New exercise', 2, 8, 180); S.gym.templates[U.tplEdit].push(t); save(); render(); const inp = $(`[data-tpl="${t.id}"] [data-tf="name"]`); if (inp) { inp.closest('.tpl-row').classList.add('enter'); setTimeout(() => { inp.focus(); inp.select(); }, 60); } break; }
    case 'tpl-del': { const row = a.closest('.tpl-row'); leave(row, () => { S.gym.templates[U.tplEdit] = S.gym.templates[U.tplEdit].filter(t => t.id !== row.dataset.tpl); commit(); }); break; }
    case 'tpl-done': {
      const k = U.tplEdit, d = today(); U.tplEdit = null;
      S.gym.templates[k] = S.gym.templates[k].filter(t => String(t.name).trim());
      if (cycleDay(d) === k && untouchedWorkout(S.workouts[d])) S.workouts[d] = { day: k, exercises: fromTemplate(k) };
      commit(); toast(`${DAYNAME[k]} template saved`); break;
    }
    case 'add-meal': {
      const ms = materialize(U.mealsDate); const m = { id: uid(), name: 'New meal', cals: 0, items: '', p: 0, c: 0, f: 0, done: false };
      ms.push(m); U.open.add(m.id); U.justAdded = m.id; commit(`[data-meal="${m.id}"] [data-mf="name"]`);
      const inp = $(`[data-meal="${m.id}"] [data-mf="name"]`); if (inp) setTimeout(() => inp.select(), 80); break;
    }
    case 'del-meal': leave(item, () => { S.days[U.mealsDate].meals = materialize(U.mealsDate).filter(m => m.id !== mealId); commit(); }); break;
    case 'save-plan': {
      S.plan = getMeals(U.mealsDate).map(m => Object.assign({ id: m.id, name: m.name, cals: num(m.cals), items: m.items || '', p: num(m.p), c: num(m.c), f: num(m.f) }, m.tag ? { tag: m.tag } : {}));
      save(); refreshMealSummary(); toast('Saved as your daily plan'); break;
    }
    case 'day': case 'today': {
      const k = a.dataset.kind, prop = k === 'meals' ? 'mealsDate' : 'gymDate';
      U[prop] = act === 'today' ? today() : addDays(U[prop], +a.dataset.d);
      if (k === 'gym' && U[prop] > today()) U[prop] = today();
      render(); $('#view-' + k).style.animation = 'none'; void views.offsetWidth; $('#view-' + k).style.animation = ''; break;
    }
    case 'add-set': {
      const ex = getWorkout(U.gymDate).exercises.find(x => x.id === exId);
      const last = ex.sets[ex.sets.length - 1], lt = lastTime(ex.name, U.gymDate);
      const tmpl = last || (lt && lt.sets[0]) || { reps: '', weight: '' };
      const s = { id: uid(), reps: num(tmpl.reps) || '', weight: num(tmpl.weight) || '' };
      ex.sets.push(s); U.open.add(exId); U.lastExercise = ex.name; save(); render();
      const row = $(`[data-set="${s.id}"]`); if (row) { row.classList.add('enter'); } break;
    }
    case 'del-set': {
      const ex = getWorkout(U.gymDate).exercises.find(x => x.id === exId), row = a.closest('.set');
      leave(row, () => { ex.sets = ex.sets.filter(s => s.id !== row.dataset.set); commit(); }); break;
    }
    case 'del-ex': leave(item, () => { const w = ensureWorkout(U.gymDate); w.exercises = w.exercises.filter(x => x.id !== exId); pruneWorkout(U.gymDate); commit(); }); break;
    case 'goto-gym': U.gymDate = a.dataset.date; render(); window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); break;
    case 'period': {
      U.period = a.dataset.p; const keys = PERIOD_KEYS;
      const ind = $('#periodSeg .seg-ind'); ind.style.transform = `translateX(calc(${keys.indexOf(U.period)} * (100% + 4px)))`;
      $$('#periodSeg button').forEach(b => b.classList.toggle('on', b === a));
      setTimeout(() => { renderProgress(); }, 140); break;
    }
    case 'del-bw': leave(a.closest('.hrow'), () => { S.bodyweight = S.bodyweight.filter(x => x.id !== a.dataset.id); commit(); }); break;
    case 'meas-type': U.measType = a.dataset.t; renderProgress(); restartDraw($('[data-card="card-meas"]')); break;
    case 'del-meas': leave(a.closest('.hrow'), () => { S.measure.entries = S.measure.entries.filter(x => x.id !== a.dataset.id); commit(); }); break;
    case 'meas-unit': S.measure.unit = a.dataset.u; commit(); break;
    case 'del-meas-type': {
      const t = U.measType, n = S.measure.entries.filter(x => x.type === t).length;
      if (n && !confirm(`Remove ${t} and its ${n} entr${n === 1 ? 'y' : 'ies'}?`)) break;
      S.measure.types = S.measure.types.filter(x => x !== t); S.measure.entries = S.measure.entries.filter(x => x.type !== t); U.measType = null; commit(); break;
    }
    case 'export': exportData(); break;
    case 'import': importData(); break;
  }
});

views.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.mf) {
    const item = t.closest('[data-meal]'), m = findMeal(U.mealsDate, item.dataset.meal), f = t.dataset.mf;
    m[f] = (f === 'name' || f === 'items') ? t.value : num(t.value); save();
    const tmp = document.createElement('div'); tmp.innerHTML = mealHead(m);
    const head = $('.item-head', item); head.querySelector('.item-main').replaceWith(tmp.querySelector('.item-main')); head.querySelector('.item-val').replaceWith(tmp.querySelector('.item-val'));
    refreshMealSummary();
  } else if (t.dataset.sf) {
    const item = t.closest('[data-ex]'), ex = getWorkout(U.gymDate).exercises.find(x => x.id === item.dataset.ex);
    const s = ex.sets.find(x => x.id === t.closest('[data-set]').dataset.set); s[t.dataset.sf] = num(t.value); save();
    refreshExerciseHead(item, ex);
  } else if (t.dataset.tf && U.tplEdit) {
    const tp = S.gym.templates[U.tplEdit].find(x => x.id === t.closest('[data-tpl]').dataset.tpl), f = t.dataset.tf;
    tp[f] = f === 'name' ? t.value : num(t.value); save();
  }
});
views.addEventListener('change', e => {
  if (e.target.name === 't' && e.target.closest('[data-form="meas"]')) { U.measType = e.target.value; renderProgress(); }
  if (e.target.dataset.gs === 'time' && /^\d{1,2}:\d{2}$/.test(e.target.value)) { S.gym.time = e.target.value; save(); refreshHint(); const k = $('[data-card="card-session"] .card-kicker'); if (k) k.textContent = `${DAYNAME[cycleDay(today())]} day · Gym ${S.gym.time}`; toast('Gym time set to ' + S.gym.time); }
});

views.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
  const kind = f.dataset.form, fd = new FormData(f);
  if (kind === 'add-ex') {
    const name = String(fd.get('ex') || '').trim(); if (!name) return;
    const ex = addExercise(U.gymDate, name); if (!ex.sets.length) { const lt = lastTime(ex.name, U.gymDate), tp = tplFor(ex.name); const n = tp ? Math.max(1, num(tp.sets)) : 1; for (let i = 0; i < n; i++) ex.sets.push({ id: uid(), reps: lt ? num(lt.sets[0].reps) : tp ? num(tp.reps) : '', weight: '', done: false }); }
    U.open.add(ex.id); U.justAdded = ex.id; commit(`[data-ex="${ex.id}"] [data-sf="reps"]`);
  } else if (kind === 'bw') {
    const v = num(fd.get('v')); if (!v) return; logBodyweight(v); U.open.add('card-bw'); commit(); restartDraw($('[data-card="card-bw"]')); toast('Logged bodyweight ' + fmt(v) + ' kg');
  } else if (kind === 'meas') {
    const v = num(fd.get('v')), t = String(fd.get('t') || ''); if (!v || !t) return; logMeasure(t, v); U.measType = t; commit(); restartDraw($('[data-card="card-meas"]')); toast(`Logged ${t} ${fmt(v)} ${S.measure.unit}`);
  } else if (kind === 'meas-type') {
    const t = titleCase(String(fd.get('t') || '')); if (!t) return; ensureMeasType(t); U.measType = t; commit();
  } else if (kind === 'shop-add') {
    const v = String(fd.get('v') || '').trim(); if (!v) return; const r = addShopItem(v); U.open.add('shop-extras'); commit('[data-form="shop-add"] .field'); toast(r);
  }
});

function logBodyweight(v, date = today()) {
  const ex = S.bodyweight.find(x => x.date === date);
  if (ex) ex.value = round1(v); else S.bodyweight.push({ id: uid(), date, value: round1(v) });
}
function ensureMeasType(t) { const hit = S.measure.types.find(x => x.toLowerCase() === t.toLowerCase()); if (hit) return hit; S.measure.types.push(t); return t; }
function logMeasure(t, v, date = today()) {
  t = ensureMeasType(t);
  const ex = S.measure.entries.find(x => x.date === date && x.type === t);
  if (ex) ex.value = round1(v); else S.measure.entries.push({ id: uid(), date, type: t, value: round1(v) });
  return t;
}

function addShopItem(raw) {
  const name = titleCase(raw.replace(/^(?:some|a|an|the)\s+/i, ''));
  const hit = allShopItems().find(x => exKey(shopName(x)) === exKey(name) || exKey(x.name) === exKey(name));
  if (hit) { setGot(hit.list, hit.id, false); return `${hit.name} is already on your list`; }
  S.shop.extras.push({ id: uid(), name, done: false }); return `Added ${name} to shopping`;
}

/* ================= Time-aware hints ================= */
const HKEY = 'peakfit.hints';
function hintState() { try { const h = JSON.parse(localStorage.getItem(HKEY)); if (h && h.date === today()) return h; } catch (_) {} return { date: today(), off: [] }; }
function computeHints(at) {
  at = at || now();
  const d = iso(at), t = at.getHours() * 60 + at.getMinutes(), G = gymMin(), day = cycleDay(d), train = day !== 'rest';
  const ms = getMeals(d), tag = k => ms.find(m => m.tag === k), open = m => m && !m.done;
  const m1 = tag('m1'), m2 = tag('snack'), m3 = tag('pre'), m4 = tag('post'), m5 = tag('dinner');
  const w = S.workouts[d], started = !!(w && w.start), finished = !!(w && w.end), live = started && !finished;
  const tot = mealTotals(d), goal = goalKcal(tot), out = [];
  const add = (id, text, tabs) => out.push({ id, text, tabs: tabs || ['meals', 'gym'] });
  if (t >= 300 && t < 690 && !S.bodyweight.some(b => b.date === d)) add('weigh', 'Weigh in now: after the toilet, before food', ['meals', 'progress']);
  if (live) add('live', 'Tick each set and your rest timer starts by itself', ['gym']);
  if (train && !started && t >= G - 20 && t < G + 45) add('soon', t < G ? `Gym in ${G - t} min: ${DAYNAME[day]} day` : `Gym time: ${DAYNAME[day]} day. Tap Start workout when you begin`);
  if (train && !started && open(m3) && t >= G - 75 && t < G + 15) add('carbs', 'Get your carbs in: bananas + dates, 30–60 mins before the gym');
  if (open(m1) && t >= 750 && t < (train ? G - 75 : 1080)) add('m1', train ? `No ${m1.name.toLowerCase()} yet. Get it in so you’re fuelled for ${S.gym.time}` : `${m1.name} still to go today`, ['meals']);
  if (open(m2) && t >= 900 && t < (train ? G - 75 : 1140)) add('m2', 'Snack time: Greek yogurt, berries, grapes and honey', ['meals']);
  if (train && open(m4) && !live && (finished || t >= G + 90) && t < 1410) add('post', 'Straight after the gym: 320g air-fried potatoes');
  if (open(m5) && !live && t >= (train ? Math.max(G + 120, 1170) : 1140) && t < 1410 && (!train || !open(m4) || t >= G + 180)) add('dinner', `Dinner time: your biggest meal, ${fmtInt(num(m5.cals))} kcal`, ['meals']);
  if (t >= 1200 && t < 1440 && goal) add('kcal', tot.eaten < goal ? `${fmtInt(goal - tot.eaten)} kcal left to hit ${fmtInt(goal)} today` : `All ${fmtInt(goal)} kcal in today. Nice work`, ['meals']);
  const off = hintState().off;
  return out.filter(h => !off.includes(h.id));
}
function hintsFor(tab) {
  if (tab === 'meals' && (U.mealsMode === 'shop' || U.mealsDate !== today())) return [];
  if (tab === 'gym' && (U.gymDate !== today() || U.tplEdit)) return [];
  return computeHints().filter(h => h.tabs.includes(tab));
}
function hintInner(h) { return h ? `<button class="nudge" data-act="nudge" data-id="${h.id}" aria-label="${esc(h.text)}. Tap to dismiss"><span class="nudge-dot"></span><span class="nudge-t">${esc(h.text)}</span><span class="nudge-x">${I.x}</span></button>` : ''; }
function pickHint(tab) { const hs = hintsFor(tab); return hs.length ? hs[U.hintIdx % hs.length] : null; }
function hintSlot(tab) { const h = pickHint(tab); return `<div class="nudge-slot" data-key="${h ? esc(h.id + h.text) : ''}">${hintInner(h)}</div>`; }
function refreshHint() {
  const slot = $(`#view-${U.tab} .nudge-slot`); if (!slot) return;
  const h = pickHint(U.tab), key = h ? h.id + h.text : '';
  if (slot.dataset.key === key) return;
  slot.dataset.key = key;
  const cur = $('.nudge', slot);
  if (cur && !reduceMotion()) { cur.classList.add('out'); setTimeout(() => { if (slot.dataset.key === key) slot.innerHTML = hintInner(h); }, 180); }
  else slot.innerHTML = hintInner(h);
}
function dismissHint(id) { const st = hintState(); if (!st.off.includes(id)) st.off.push(id); localStorage.setItem(HKEY, JSON.stringify(st)); refreshHint(); }

/* ================= Rest timer ================= */
const RKEY = 'peakfit.rest';
let REST = (() => { try { const r = JSON.parse(localStorage.getItem(RKEY)); return r && r.end > Date.now() - 30000 ? r : null; } catch (_) { return null; } })();
const restBar = $('#restBar');
function startRest(sec, name) { REST = { end: Date.now() + sec * 1000, total: sec, name }; localStorage.setItem(RKEY, JSON.stringify(REST)); paintRest(); }
function stopRest() { REST = null; localStorage.removeItem(RKEY); paintRest(); }
function paintRest() {
  if (!restBar) return;
  document.body.classList.toggle('resting', !!REST);
  if (!REST) { restBar.classList.remove('show', 'ending'); return; }
  const left = Math.max(0, REST.end - Date.now());
  $('#restTime').textContent = clock(left + 999);
  $('#restName').textContent = REST.name || '';
  $('#restFill').style.transform = `scaleX(${Math.min(1, left / (REST.total * 1000))})`;
  restBar.classList.toggle('ending', left < 5500);
  restBar.classList.add('show');
}
let AC = null;
function unlockAudio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (_) {} }
function chime() {
  if (!AC) return;
  try { const t0 = AC.currentTime; [[784, 0], [1046.5, 0.2]].forEach(([f, d]) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.16, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.45);
    o.connect(g); g.connect(AC.destination); o.start(t0 + d); o.stop(t0 + d + 0.5); }); } catch (_) {}
}
function restDone() {
  const late = Date.now() - REST.end > 30000; stopRest();
  if (late) return;
  if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) { try { navigator.vibrate([180, 90, 180]); } catch (_) {} }
  chime(); toast('Rest done. Next set');
}
if (restBar) restBar.addEventListener('click', e => {
  const b = e.target.closest('[data-rest]'); if (!b || !REST) return;
  if (b.dataset.rest === 'add') { REST.end += 30000; REST.total += 30; localStorage.setItem(RKEY, JSON.stringify(REST)); paintRest(); } else stopRest();
});

/* One clock drives the session timer, rest countdown and hint rotation */
let hintAt = Date.now();
function tick() {
  $$('[data-timer="session"]').forEach(el => { const w = S.workouts[el.dataset.date]; if (w && w.start && !w.end) el.textContent = clock(Date.now() - w.start); });
  if (REST) { if (Date.now() >= REST.end) restDone(); else paintRest(); }
  if (Date.now() - hintAt >= 15000) { hintAt = Date.now(); U.hintIdx++; refreshHint(); }
}
setInterval(tick, 500);

/* Backup */
function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }), name = `peak-fitness-backup-${today()}.json`;
  const file = window.File ? new File([blob], name, { type: 'application/json' }) : null;
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'PEAK Fitness backup' }).catch(() => {}); return; }
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function importData() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = () => { const file = inp.files[0]; if (!file) return; file.text().then(txt => {
    try { const d = JSON.parse(txt); if (!d || !d.plan || !d.workouts) throw 0; if (!confirm('Replace everything on this phone with this backup?')) return; localStorage.setItem(KEY, JSON.stringify(d)); S = load(); render(); toast('Backup restored'); }
    catch (_) { toast('That file is not a PEAK Fitness backup', { err: true }); }
  }); };
  inp.click();
}

/* ================= Tabs ================= */
const TABS = ['meals', 'gym', 'progress'];
function setTab(tab, initial) {
  U.tab = tab; localStorage.setItem('peakfit.tab', tab);
  $$('.tab').forEach(b => b.classList.toggle('is-active', b.dataset.tab === tab));
  $('#tabInd').style.transform = `translateX(${TABS.indexOf(tab) * 100}%)`;
  $$('.view').forEach(v => { v.hidden = v.dataset.view !== tab; });
  render(); afterRender();
  if (!initial) window.scrollTo({ top: 0 });
}
$('#tabbar').addEventListener('click', e => { const b = e.target.closest('.tab'); if (b && b.dataset.tab !== U.tab) setTab(b.dataset.tab); });
window.addEventListener('scroll', () => $('.topbar').classList.toggle('scrolled', window.scrollY > 4), { passive: true });

/* ================= Theme ================= */
function applyTheme(t, animate) {
  const html = document.documentElement;
  if (animate && !reduceMotion()) { html.classList.add('theme-fade'); getComputedStyle(html).getPropertyValue('--bg'); }
  html.setAttribute('data-theme', t);
  const mt = $('meta[name="theme-color"]'); if (mt) mt.setAttribute('content', t === 'light' ? '#f2f2f2' : '#0a0a0a');
  if (animate) { clearTimeout(applyTheme._t); applyTheme._t = setTimeout(() => html.classList.remove('theme-fade'), 340); }
}
$('#themeBtn').addEventListener('click', () => {
  const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  localStorage.setItem('peakfit.theme', t); applyTheme(t, true);
});
if (window.matchMedia) matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => { if (!localStorage.getItem('peakfit.theme')) applyTheme(e.matches ? 'light' : 'dark', true); });

/* ================= Toast ================= */
let toastT;
function toast(msg, opts = {}) {
  const el = $('#toast');
  el.className = 'toast' + (opts.err ? ' err' : '') + (opts.undo ? ' has-action' : '');
  el.innerHTML = `<span class="t-dot"></span><span class="t-msg">${esc(msg)}</span>${opts.undo ? '<button class="pill pill-sm">Undo</button>' : ''}`;
  if (opts.undo) $('button', el).onclick = () => { opts.undo(); el.classList.remove('show'); };
  void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), opts.undo ? 5000 : 2600);
}

/* ================= Voice: parsing ================= */
const SMALL = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const isNumWord = w => w in SMALL || w in TENS || w === 'hundred' || w === 'thousand';
function wordsToNumbers(text) {
  const tk = text.split(/\s+/).filter(Boolean), out = [];
  for (let i = 0; i < tk.length;) {
    if (isNumWord(tk[i]) || (/^\d+$/.test(tk[i]) && tk[i + 1] === 'point')) {
      let total = 0, cur = 0;
      if (/^\d+$/.test(tk[i])) { cur = +tk[i]; i++; }
      else {
        while (i < tk.length && (isNumWord(tk[i]) || (tk[i] === 'and' && isNumWord(tk[i + 1] || '') && (cur || total)))) {
          const w = tk[i++]; if (w === 'and') continue;
          if (w in SMALL) cur += SMALL[w]; else if (w in TENS) cur += TENS[w];
          else if (w === 'hundred') cur = (cur || 1) * 100; else if (w === 'thousand') { total += (cur || 1) * 1000; cur = 0; }
        }
      }
      let n = String(total + cur);
      if (tk[i] === 'point' && tk[i + 1] && (tk[i + 1] in SMALL || /^\d+$/.test(tk[i + 1]))) {
        i++; let dec = '';
        while (i < tk.length && ((tk[i] in SMALL && SMALL[tk[i]] < 10) || /^\d+$/.test(tk[i]))) { dec += (tk[i] in SMALL) ? SMALL[tk[i]] : tk[i]; i++; }
        n += '.' + dec;
      }
      out.push(n);
    } else out.push(tk[i++]);
  }
  return out.join(' ');
}
function normalise(raw) {
  let s = ' ' + String(raw).toLowerCase().replace(/[’']/g, "'").replace(/[,!?;:]/g, ' ').replace(/(\d)\s*\.\s*(\d)/g, '$1.$2').replace(/\.(?!\d)/g, ' ') + ' ';
  s = s.replace(/\b(please|can you|could you|just|um|uh|okay|ok|hey)\b/g, ' ');
  s = wordsToNumbers(s.replace(/\s+/g, ' ').trim());
  s = s.replace(/(\d+(?:\.\d+)?) and a half\b/g, (_, n) => String(+n + 0.5)).replace(/(\d+(?:\.\d+)?)\s*(?:and\s+)?a half\b/g, (_, n) => String(+n + 0.5));
  s = s.replace(/\b(kilos?|kilograms?|kgs|kilogram)\b/g, 'kg').replace(/(\d)\s*kg\b/g, '$1 kg')
       .replace(/\b(pounds?|lbs?)\b/g, 'lb').replace(/\b(repetitions?|reps?)\b/g, 'reps')
       .replace(/(\d)\s*[x×*]\s*(\d)/g, '$1 x $2').replace(/\b(times|by)\b(?=\s*\d)/g, 'x')
       .replace(/\b(calories|calorie|cals?|kcals?|kilocalories)\b/g, 'kcal')
       .replace(/\b(centimet(?:er|re)s?|cms?)\b/g, 'cm').replace(/\b(inches|inch|ins)\b/g, 'in')
       .replace(/\btic\b|\bticked\b|\btake\b(?= off)/g, 'tick');
  return s.replace(/\s+/g, ' ').trim();
}
const toKg = (v, u) => u === 'lb' ? Math.round(v * 0.45359237 * 2) / 2 : v;
function dice(a, b) {
  a = a.replace(/[^a-z0-9]/g, ''); b = b.replace(/[^a-z0-9]/g, ''); if (!a || !b) return 0; if (a === b) return 1;
  const bg = s => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const g = s.substr(i, 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const A = bg(a), B = bg(b); let hit = 0; A.forEach((n, g) => { hit += Math.min(n, B.get(g) || 0); });
  return 2 * hit / Math.max(1, a.length - 1 + b.length - 1);
}
function bestMatchScore(query, list, getName) {
  const q = query.toLowerCase().replace(/\b(my|the|a|an|meal|for|today|some)\b/g, ' ').replace(/\s+/g, ' ').trim(); if (!q || !list.length) return { x: null, score: 0 };
  const ord = { first: 0, '1st': 0, second: 1, '2nd': 1, third: 2, '3rd': 2, fourth: 3, '4th': 3, fifth: 4, '5th': 4, sixth: 5, last: -1 };
  if (q in ord) { const x = list[ord[q] < 0 ? list.length - 1 : ord[q]]; return { x: x || null, score: x ? 1 : 0 }; }
  if (/^\d+$/.test(q)) return list[+q - 1] ? { x: list[+q - 1], score: 1 } : { x: null, score: 0 };
  let best = null, score = 0;
  list.forEach(x => {
    const n = getName(x).toLowerCase(); let sc = n === q ? 1 : (n.includes(q) || q.includes(n)) ? 0.9 : dice(n, q);
    if (sc > score) { score = sc; best = x; }
  });
  return { x: best, score };
}
function bestMatch(query, list, getName, min = 0.5) { const r = bestMatchScore(query, list, getName); return r.score >= min ? r.x : null; }
/* Meal or shopping item? Shopping wins when it's named, when you're on the list, or when it's a clearly better match */
function tickTarget(q, date) {
  const explicit = /\b(shopping|list|trolley|basket)\b/.test(q);
  const q2 = q.replace(/\b(?:from|on|off|in|to)?\s*(?:the |my )?(?:shopping list|shopping|list|trolley|basket)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const meal = bestMatchScore(q2, getMeals(date), x => x.name), shop = bestMatchScore(q2, allShopItems(), shopName);
  const onList = U.tab === 'meals' && U.mealsMode === 'shop';
  if (shop.x && shop.score >= 0.5 && (explicit || onList || !meal.x || meal.score < 0.5 || shop.score > meal.score + 0.05)) return { kind: 'shop', x: shop.x };
  if (meal.x && meal.score >= 0.5) return { kind: 'meal', x: meal.x };
  return { kind: null, q: q2 };
}
function shopResult(it, v) { setGot(it.list, it.id, v); U.mealsMode = 'shop'; localStorage.setItem('peakfit.mealsMode', 'shop'); U.open.add('shop-' + it.list); return { msg: `${v ? 'Ticked off' : 'Unticked'} ${it.name}`, tab: 'meals' }; }
const KNOWN_MEAS = ['chest', 'arms', 'arm', 'bicep', 'biceps', 'waist', 'hips', 'hip', 'thigh', 'thighs', 'neck', 'shoulders', 'shoulder', 'calves', 'calf', 'forearm', 'forearms', 'body fat', 'bodyfat', 'glutes', 'stomach', 'belly'];
const NUM = '(\\d+(?:\\.\\d+)?)';
const cleanExName = s => s.replace(/\b(i|just|did|done|have|log|logged|add|added|record|recorded|today|set|for|on|of|with|at|do|and|then|my|some|exercise)\b/g, ' ').replace(/\s+/g, ' ').trim();

/* Returns { msg, tab } after applying, or throws/returns null if not understood */
function interpret(raw) {
  const s = normalise(raw); if (!s) return null;
  let m;

  // Theme
  if ((m = s.match(/\b(dark|light)\s*(mode|theme)\b/))) { localStorage.setItem('peakfit.theme', m[1]); applyTheme(m[1], true); return { msg: `Switched to ${m[1]} mode` }; }

  // Shopping: "add to shopping oats", "add oats to my shopping list", "shopping list add oats"
  if ((m = s.match(/^(?:add|put|stick|need)\s+(?:to|on|onto|in)\s+(?:the\s+|my\s+)?(?:shopping(?:\s+list)?|list)\s+(.+)$/) || s.match(/^(?:add|put|stick)\s+(.+?)\s+(?:to|on|onto|in)\s+(?:the\s+|my\s+)?(?:shopping(?:\s+list)?|list|trolley|basket)$/) || s.match(/^shopping(?:\s+list)?\s+(?:add\s+)?(.+)$/))) {
    const msg = addShopItem(m[1]); U.mealsMode = 'shop'; localStorage.setItem('peakfit.mealsMode', 'shop'); U.open.add('shop-extras'); return { msg, tab: 'meals' };
  }
  // Shopping: "got the rice", "bought bananas"
  if ((m = s.match(/^(?:i\s+)?(?:have\s+)?(?:got|bought|picked up|grabbed)\s+(?:the\s+|some\s+)?(.+)$/))) {
    const it = bestMatch(m[1].replace(/\b(?:from|on|off)?\s*(?:the |my )?(?:shopping list|shopping|list)\b/g, ' '), allShopItems(), shopName);
    if (it) return shopResult(it, true);
    return { fail: `“${m[1]}” isn’t on your shopping list. Say “add ${m[1]} to shopping”` };
  }

  // Untick a meal
  if ((m = s.match(/^(?:untick|uncheck|unmark|untik)\s+(?:off\s+)?(.+)$/) || s.match(/^i (?:didn't|did not) (?:have|eat)\s+(.+)$/))) {
    const date = today(), tg = tickTarget(m[1], date);
    if (tg.kind === 'shop') return shopResult(tg.x, false);
    if (!tg.kind) return { fail: `No meal or shopping item called “${m[1]}”` };
    const meal = tg.x; findMeal(date, meal.id).done = false; U.mealsDate = date; return { msg: `Unticked ${meal.name}`, tab: 'meals' };
  }

  // Gym: sets / reps / weight
  const L = [
    [new RegExp(`(\\d+)\\s*sets?\\s*(?:of\\s*)?(\\d+)\\s*(?:reps)?\\s*(?:at|with|@|of|on|using)?\\s*${NUM}\\s*(kg|lb)?`), m => ({ sets: +m[1], reps: +m[2], w: toKg(+m[3], m[4]) })],
    [new RegExp(`(\\d+)\\s*x\\s*(\\d+)\\s*(?:reps)?\\s*(?:at|with|@|on|using)\\s*${NUM}\\s*(kg|lb)?`), m => ({ sets: +m[1], reps: +m[2], w: toKg(+m[3], m[4]) })],
    [new RegExp(`(\\d+)\\s*x\\s*(\\d+)\\s*(?:reps)?\\s*x\\s*${NUM}\\s*(kg|lb)?`), m => ({ sets: +m[1], reps: +m[2], w: toKg(+m[3], m[4]) })],
    [new RegExp(`${NUM}\\s*(kg|lb)\\s*(\\d+)\\s*x\\s*(\\d+)`), m => ({ sets: +m[3], reps: +m[4], w: toKg(+m[1], m[2]) })],
    [new RegExp(`${NUM}\\s*(kg|lb)?\\s*(?:for|x)\\s*(\\d+)\\s*reps(?:\\s*(?:for|x)?\\s*(\\d+)\\s*sets?)?`), m => ({ sets: m[4] ? +m[4] : 1, reps: +m[3], w: toKg(+m[1], m[2]) })],
    [new RegExp(`${NUM}\\s*(kg|lb)\\s*(?:for|x)\\s*(\\d+)(?:\\s*(?:for|x)?\\s*(\\d+)\\s*sets?)?`), m => ({ sets: m[4] ? +m[4] : 1, reps: +m[3], w: toKg(+m[1], m[2]) })],
    [new RegExp(`(\\d+)\\s*reps\\s*(?:at|with|@|of|on|using)\\s*${NUM}\\s*(kg|lb)?(?:\\s*(?:for|x)?\\s*(\\d+)\\s*sets?)?`), m => ({ sets: m[4] ? +m[4] : 1, reps: +m[1], w: toKg(+m[2], m[3]) })],
    [/(\d+)\s*sets?\s*of\s*(\d+)(?:\s*reps)?/, m => ({ sets: +m[1], reps: +m[2], w: 0 })],
    [/(\d+)\s*x\s*(\d+)(?:\s*reps)?/, m => ({ sets: +m[1], reps: +m[2], w: 0 })],
    [/(\d+)\s*reps\b/, m => ({ sets: 1, reps: +m[1], w: 0 })],
  ];
  for (const [re, fn] of L) {
    if (!(m = s.match(re))) continue;
    const p = fn(m); if (!p.reps || p.sets > 20 || p.reps > 200) continue;
    let name = cleanExName(s.slice(0, m.index)) || cleanExName(s.slice(m.index + m[0].length));
    name = name.replace(/\b(sets?|reps|kg|lb|x)\b/g, ' ').replace(/\d+(\.\d+)?/g, ' ').replace(/\s+/g, ' ').trim();
    const date = U.tab === 'gym' ? U.gymDate : today(); if (date === today()) seedToday();
    const known = name ? bestMatch(name, getWorkout(date).exercises.map(e => e.name).concat(allExerciseNames()), x => x, 0.72) : null;
    name = known || name || U.lastExercise;
    if (!name) return { fail: 'Which exercise? Try “bench press 3 sets of 8 at 80 kilos”' };
    const ex = addExercise(date, name); let left = p.sets;
    for (const st of ex.sets) { if (!left) break; if (!loggedSet(st)) { st.reps = p.reps; st.weight = round1(p.w) || ''; st.done = true; left--; } }
    for (let i = 0; i < left; i++) ex.sets.push({ id: uid(), reps: p.reps, weight: round1(p.w) || '', done: true });
    U.gymDate = date; U.open.add(ex.id);
    return { msg: `${ex.name}: ${p.sets} × ${p.reps}${p.w ? ' at ' + fmt(p.w) + ' kg' : ''}`, tab: 'gym' };
  }

  // Bodyweight
  if ((m = s.match(new RegExp(`\\b(?:body\\s?weight|weighed(?: in)?(?: at)?|i weigh|i'm|i am|my weight(?: is)?|weight(?: is| today| this morning)?|weigh in(?: at)?|weigh-in)\\b\\D*?${NUM}\\s*(kg|lb|stone)?`))) && !/\b(set|reps)\b/.test(s)) {
    let v = +m[1]; if (m[2] === 'lb') v = v * 0.45359237; if (m[2] === 'stone') v = v * 6.35029318;
    if (/\b(i'm|i am)\b/.test(m[0]) && !/kg|lb|stone|weigh/.test(s)) { /* "i'm 30" — ignore */ }
    else if (v > 25 && v < 350) { logBodyweight(v); U.open.add('card-bw'); return { msg: `Logged bodyweight ${fmt(v)} kg`, tab: 'progress' }; }
  }

  // Add exercise
  if ((m = s.match(/^(?:add|new|start|log)\s+(?:an?\s+)?(?:exercise|movement|lift)\s+(.+)$/))) {
    const date = U.tab === 'gym' ? U.gymDate : today(), ex = addExercise(date, m[1]); U.gymDate = date; U.open.add(ex.id);
    return { msg: `Added ${ex.name}`, tab: 'gym' };
  }

  // Add meal (with optional kcal)
  if ((m = s.match(new RegExp(`^(?:add|new|create)\\s+(?:a\\s+)?(?:meal\\s+(?:called\\s+)?)?(.+?)(?:\\s+(?:with|at|of|is)?\\s*${NUM}\\s*kcal)?$`))) && (/\bmeal\b/.test(s) || m[2] || /\b(breakfast|lunch|dinner|snack|supper|shake|brunch|pre workout|post workout)\b/.test(s)) && !/\b(measurement|measure)\b/.test(s)) {
    const date = U.mealsDate, ms = materialize(date), name = titleCase(m[1].replace(/\bmeal\b/, '').trim() || 'Meal');
    const dup = ms.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (dup) { if (m[2]) dup.cals = +m[2]; return { msg: `${dup.name} is already on today${m[2] ? ', set to ' + fmtInt(+m[2]) + ' kcal' : ''}`, tab: 'meals' }; }
    const meal = { id: uid(), name, cals: m[2] ? +m[2] : 0, items: '', p: 0, c: 0, f: 0, done: false }; ms.push(meal);
    return { msg: `Added ${name}${meal.cals ? ', ' + fmtInt(meal.cals) + ' kcal' : ''}`, tab: 'meals' };
  }

  // Set a meal's calories: "breakfast is 600 calories"
  if ((m = s.match(new RegExp(`^(?:set\\s+)?(.+?)\\s+(?:is|to|=|has)?\\s*${NUM}\\s*kcal$`))) && !/^(?:tick|check|mark|had|ate|i had|i ate)\b/.test(s)) {
    const date = U.mealsDate, meal = bestMatch(m[1], getMeals(date), x => x.name);
    if (meal) { findMeal(date, meal.id).cals = +m[2]; return { msg: `${meal.name} set to ${fmtInt(+m[2])} kcal`, tab: 'meals' }; }
  }

  // Tick a meal
  if ((m = s.match(/^(?:tick|check|mark|cross|complete|finish(?:ed)?)(?:\s+off)?\s+(.+?)(?:\s+(?:off|done|as done|as eaten|complete|completed))?$/) ||
       s.match(/^(?:i\s+)?(?:have\s+|just\s+)?(?:had|ate|eaten|finished|done with|completed)\s+(?:my\s+)?(.+)$/) ||
       s.match(/^(.+?)\s+(?:done|eaten|finished|ticked|complete|completed)$/))) {
    const date = today(); let q = m[1].trim(), cals = 0, c;
    if ((c = q.match(new RegExp(`\\s*(?:with|at|of|which was|was)?\\s*${NUM}\\s*kcal$`)))) { cals = +c[1]; q = q.slice(0, c.index).trim(); }
    const tg = cals ? { kind: (bestMatch(q, getMeals(date), x => x.name) ? 'meal' : null), x: bestMatch(q, getMeals(date), x => x.name) } : tickTarget(q, date);
    if (tg.kind === 'shop') return shopResult(tg.x, true);
    const meal = tg.kind === 'meal' ? tg.x : null; if (tg.q) q = tg.q;
    U.mealsDate = date;
    if (meal) { const mm = findMeal(date, meal.id); mm.done = true; if (cals) mm.cals = cals; return { msg: `Ticked off ${meal.name}${num(mm.cals) ? ', ' + fmtInt(num(mm.cals)) + ' kcal' : ''}`, tab: 'meals' }; }
    if (cals) { const name = titleCase(q.replace(/\b(a|an|some|my)\b/g, ' ')); materialize(date).push({ id: uid(), name, cals, items: '', p: 0, c: 0, f: 0, done: true }); return { msg: `Added and ticked ${name}, ${fmtInt(cals)} kcal`, tab: 'meals' }; }
    return { fail: `No meal or shopping item called “${q}”. Add calories to log a meal, e.g. “had a protein shake 250 calories”` };
  }

  // Measurements: "waist 34", "add measurement neck 15.5", "my arms are 15 inches"
  if ((m = s.match(new RegExp(`^(?:add\\s+|log\\s+|new\\s+)?(?:a\\s+)?(?:measurement|measure|measured)?\\s*(?:for\\s+)?(?:my\\s+)?([a-z][a-z ]*?)(?:\\s+(?:measurement|is|are|at|of|to|measures|measured at))?\\s*${NUM}\\s*(cm|in|%|percent)?$`)))) {
    let t = m[1].trim(), v = +m[2]; const explicit = /\b(measurement|measure|measured)\b/.test(s);
    if (m[3] && m[3] !== S.measure.unit && m[3] !== '%' && m[3] !== 'percent') v = m[3] === 'cm' ? v / 2.54 : v * 2.54;
    const existing = bestMatch(t, S.measure.types, x => x, 0.7);
    if (/^body ?fat$/.test(t)) t = 'Body fat %';
    const type = existing || ((explicit || KNOWN_MEAS.includes(t) || t === 'Body fat %') ? titleCase(t.replace(/^body fat %$/i, 'Body fat %')) : null);
    if (type) { const tt = logMeasure(type, v); U.measType = tt; U.open.add('card-meas'); return { msg: `Logged ${tt} ${fmt(v)} ${/%/.test(tt) ? '%' : S.measure.unit}`, tab: 'progress' }; }
  }

  // Bare meal name: "breakfast"
  if (U.tab === 'meals' && U.mealsMode === 'shop') { const it = bestMatch(s, allShopItems(), shopName, 0.8); if (it) return shopResult(it, !isGot(it.list, it.id)); }
  const bare = bestMatch(s, getMeals(today()), x => x.name, 0.8);
  if (bare) { findMeal(today(), bare.id).done = true; U.mealsDate = today(); return { msg: `Ticked off ${bare.name}`, tab: 'meals' }; }
  return null;
}

function runCommand(text) {
  const before = JSON.stringify(S), beforeUI = { tab: U.tab, mealsDate: U.mealsDate, gymDate: U.gymDate };
  let res; try { res = interpret(text); } catch (err) { console.error(err); res = null; }
  if (!res || res.fail) { S = JSON.parse(before); return { ok: false, reason: res && res.fail }; }
  save();
  if (res.tab && res.tab !== U.tab) setTab(res.tab); else { render(); afterRender(); }
  toast(res.msg, { undo: () => { S = JSON.parse(before); save(); Object.assign(U, { mealsDate: beforeUI.mealsDate, gymDate: beforeUI.gymDate }); render(); toast('Undone'); } });
  return { ok: true, msg: res.msg };
}

/* ================= Voice: capture ================= */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const sheet = $('#voiceSheet'), vInput = $('#voiceInput'), vStatus = $('#voiceStatus'), vNote = $('#voiceNote'), micBtn = $('#micBtn');
let rec = null, listening = false, finalText = '';
function openSheet() { sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false'); }
function closeSheet() { stopListening(); sheet.classList.remove('open', 'listening'); sheet.setAttribute('aria-hidden', 'true'); micBtn.classList.remove('listening'); vInput.blur(); }
function setStatus(t) { vStatus.textContent = t; }
function stopListening() { listening = false; try { rec && rec.abort(); } catch (_) {} sheet.classList.remove('listening'); micBtn.classList.remove('listening'); }
function startListening() {
  vNote.textContent = ''; vInput.value = ''; finalText = '';
  if (!SR) {
    setStatus('Type or dictate an update');
    vNote.textContent = location.protocol === 'file:' ? 'Voice needs the app opened from its web link (not a file). For now, tap the box and use the keyboard’s mic to dictate.' : 'Voice capture isn’t available in this browser. Tap the box and use the keyboard’s mic to dictate, then Apply.';
    setTimeout(() => vInput.focus(), 250); return;
  }
  rec = new SR(); rec.lang = 'en-GB'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
  rec.onstart = () => { listening = true; sheet.classList.add('listening'); micBtn.classList.add('listening'); setStatus('Listening…'); };
  rec.onresult = ev => {
    let interim = ''; finalText = '';
    for (let i = 0; i < ev.results.length; i++) { const r = ev.results[i]; if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript; }
    vInput.value = (finalText + ' ' + interim).trim(); setStatus(finalText ? 'Got it' : 'Listening…');
  };
  rec.onerror = ev => {
    const map = { 'not-allowed': 'Microphone access is blocked. Allow it in Settings › Safari › Microphone (or for this site), or type below.', 'service-not-allowed': 'Voice isn’t allowed here. Tap the box and use the keyboard’s mic instead.', 'no-speech': 'Didn’t hear anything. Tap the mic to try again.', 'audio-capture': 'No microphone found.', network: 'Voice needs a connection on this device. Type below instead.' };
    if (ev.error !== 'aborted') vNote.textContent = map[ev.error] || 'Voice stopped (' + ev.error + '). Type below instead.';
  };
  rec.onend = () => {
    const was = listening; stopListening();
    const text = (finalText || vInput.value).trim();
    if (was && text) apply(text); else if (was) setStatus('Tap the mic to talk, or type');
  };
  try { rec.start(); } catch (e) { vNote.textContent = 'Could not start the microphone. Type below instead.'; }
}
function apply(text) {
  const r = runCommand(text);
  if (r.ok) { setStatus('Done'); setTimeout(closeSheet, 250); }
  else { setStatus('Didn’t catch that — edit and Apply'); vInput.value = text; vNote.textContent = r.reason || 'Try phrases like the examples below.'; }
}
micBtn.addEventListener('click', () => { if (sheet.classList.contains('open')) { if (listening) { try { rec.stop(); } catch (_) {} } else startListening(); return; } openSheet(); startListening(); });
sheet.addEventListener('click', e => { if (e.target.hasAttribute('data-close')) closeSheet(); const h = e.target.closest('[data-hint]'); if (h) { stopListening(); vInput.value = h.dataset.hint; vInput.focus(); setStatus('Edit, then Apply'); } });
$('#voiceForm').addEventListener('submit', e => { e.preventDefault(); stopListening(); const t = vInput.value.trim(); if (t) apply(t); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheet.classList.contains('open')) closeSheet(); });

/* ================= Boot ================= */
bindChartScrub(views);
setTab(TABS.includes(U.tab) ? U.tab : 'meals', true);
// Roll the day over if the app stays open past midnight
let bootDay = today();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (today() !== bootDay) { if (U.mealsDate === bootDay) U.mealsDate = today(); if (U.gymDate === bootDay) U.gymDate = today(); bootDay = today(); render(); }
  else refreshHint();
  tick();
});
paintRest();
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

// Exposed for testing in the console
window.PEAK = { interpret: t => { const r = runCommand(t); return r; }, normalise, get data() { return S; },
  hints: at => computeHints(at ? new Date(at) : now()).map(h => h.id + ': ' + h.text),
  setClock: at => { CLOCK = at ? new Date(at).getTime() - Date.now() : 0; U.mealsDate = today(); U.gymDate = today(); bootDay = today(); render(); return now().toString(); },
  cycleDay, get rest() { return REST; } };
})();
