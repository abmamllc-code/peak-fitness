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
  bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.2 11.1c.5.4.9 1 .9 1.6V17h4.6v-1.3c0-.6.4-1.2.9-1.6A6 6 0 0 0 12 3z"/></svg>',
};

/* ================= Store ================= */
const KEY = 'peakfit.data.v1';
/* Lean bulk, phase 1: Adnan's daily plan (weights raw / uncooked unless stated) */
const SEED_PLAN = () => [
  { tag: 'm1', name: 'Chicken & potatoes', cals: 750, p: 50, c: 95, f: 18, items: '200g boneless skinless chicken thighs, 550g potatoes, 10g olive oil in the seasoning' },
  { tag: 'snack', name: 'Snack', cals: 460, p: 25, c: 63, f: 13, items: '250g full-fat Greek yogurt, 100g berries, 150g grapes, 20g honey' },
  { tag: 'pre', name: 'Pre-gym', cals: 410, p: 4, c: 108, f: 1, items: '2 bananas, 3 Medjool dates. 30–60 mins before the gym' },
  { tag: 'post', name: 'Post-gym potatoes', cals: 250, p: 6, c: 55, f: 0, items: '320g potatoes, air-fried. Straight after the gym' },
  { tag: 'dinner', name: 'Dinner', cals: 1120, p: 53, c: 119, f: 45, items: '150g rice (rice cooker), 150g 10% beef mince (defrosted), 2 eggs fried fresh, 20g butter or oil' },
].map(m => Object.assign({ id: uid() }, m));
const SEED_TARGETS = () => ({ kcal: 3000, p: 130, c: 440, f: 80 });

/* Push / Pull / Legs. One pass every four days, so each session carries a full dose for that pattern.
   Compounds first, then the muscles that grow from extra volume. Rest is longer on the heavy lifts. */
const CYCLE = ['push', 'pull', 'legs', 'rest'];
const DAYNAME = { push: 'Push', pull: 'Pull', legs: 'Legs', rest: 'Rest' };
const SPLIT = {
  push: { title: 'PUSH', muscles: 'Chest, shoulders, triceps', line: 'Press first. Then the shoulders and the arms.' },
  pull: { title: 'PULL', muscles: 'Back, rear delts, biceps', line: 'A heavy pull, then width, thickness and arms.' },
  legs: { title: 'LEGS', muscles: 'Quads, hamstrings, glutes, calves, core', line: 'Squat, hinge, then the legs and the trunk.' },
};
const EX = (name, sets, reps, repText, rest, muscles, pose, how, cues, mistakes, easier, harder, alias) =>
  ({ name, sets, reps, repText, rest, muscles, pose, how, cues, mistakes, easier, harder, alias: alias || [] });
const LIB = {
  bench: EX('Barbell Bench Press', 4, 8, '6–8', 180, 'Chest, front delts, triceps', 'bench',
    ['Lie on the bench, feet flat, eyes under the bar. Grip just outside the shoulders and pull the shoulder blades down into the bench.', 'Unrack, lower the bar to the lower chest, and press up until the arms are straight. Keep the wrists stacked over the elbows.', 'Breathe in on the way down and drive the breath out as you press.'],
    ['Shoulder blades stay pinched.', 'Bar path is a slight arc, not straight out over the face.', 'Heels stay down.'],
    ['Bouncing the bar off the chest.', 'Flaring the elbows straight out.', 'Lifting the hips to finish the rep.'],
    'Dumbbell bench press, or a machine chest press.', 'Pause for a second on the chest, or add a fifth set.'),
  ohp: EX('Seated Overhead Press', 3, 8, '6–8', 180, 'Shoulders, triceps', 'ohp',
    ['Sit tall on a bench with a backrest, feet flat. Hold the bar on the front of the shoulders, elbows slightly in front of the bar.', 'Press it overhead until the biceps are by the ears, then lower it under control to the shoulders.', 'Breath in at the bottom, brace, and breathe out as the bar passes the head.'],
    ['Ribs stay down. Don’t lean back to make the lift a chest press.', 'Head comes through at the top so the bar sits over the shoulders.', 'Grip is just outside the shoulders.'],
    ['Overarching the lower back.', 'Pressing the bar out in front of you.', 'Cutting the range short of lockout.'],
    'Seated dumbbell press.', 'Stand up and press from the rack, or slow the lowering to three seconds.'),
  incline: EX('Incline Dumbbell Press', 3, 10, '8–10', 120, 'Upper chest, front delts', 'incline',
    ['Set the bench around 30 degrees. Dumbbells start just outside the upper chest, palms facing forward.', 'Press up and slightly in until the arms are straight, then lower until you feel a stretch across the chest.', 'Breathe in as the weights come down and out as you press.'],
    ['Keep the same angle the whole set. Don’t turn it into a flat press.', 'Elbows stay about 45 degrees from the body.', 'Control the bottom. Don’t crash the bells down.'],
    ['Bench too steep, so the shoulders take over.', 'Bells drifting toward the face.', 'Bouncing out of the bottom.'],
    'Incline machine press, or a lighter pair of bells.', 'Pause at the bottom, or a slower lowering.', ['Smith Machine Incline Bench Press']),
  raise: EX('Dumbbell Lateral Raise', 3, 15, '12–15', 75, 'Side delts', 'raise',
    ['Stand tall, bells at your sides, a soft bend in the elbows.', 'Raise the arms out to just below shoulder height, leading with the elbows, then lower slowly.', 'Breathe out as you lift and in as you lower. Keep the body still.'],
    ['Think about lifting the elbows, not the hands.', 'Stop just before the traps shrug.', 'A little bend in the elbow stays fixed.'],
    ['Swinging from the hips.', 'Shrugging the shoulders to the ears.', 'Going so heavy the arms bend and it becomes a press.'],
    'Cable lateral raise, one arm at a time.', 'Hold the top for a second, or add a fourth set.', ['Cable Lateral Raise']),
  pushdown: EX('Cable Triceps Pushdown', 3, 12, '10–12', 75, 'Triceps', 'pushdown',
    ['Stand at a high cable with a rope or bar. Elbows pinned to the ribs, shoulders down.', 'Straighten the elbows until the arms are locked, then let the handle come back until the forearms are just past parallel.', 'Breathe out as you push down and in as it returns.'],
    ['Only the elbow moves.', 'Squeeze at the bottom without the shoulders rolling forward.', 'Body stays upright.'],
    ['Letting the elbows drift forward.', 'Leaning over the cable to use bodyweight.', 'Stopping short of straight arms.'],
    'A band pushdown, or a lighter pin.', 'A rope, spreading the ends at the bottom, or a slower return.', ['Cable Rope Tricep Extension', 'Barbell Skullcrusher']),
  oht: EX('Overhead Triceps Extension', 3, 12, '10–12', 75, 'Triceps', 'oht',
    ['Sit or stand and hold one dumbbell overhead in both hands, elbows pointing forward.', 'Bend the elbows and lower the bell behind the head, then straighten the arms.', 'Breathe in on the way down and out as you straighten.'],
    ['Elbows stay narrow. Don’t let them flare wide.', 'Ribs stay down so the lower back doesn’t arch.', 'Full stretch at the bottom, full lockout at the top.'],
    ['Flaring the elbows and turning it into a shoulder move.', 'Arching to heave the weight up.', 'Dropping the bell onto the neck.'],
    'A cable overhead extension, or a lighter bell.', 'One arm at a time, or a pause in the stretch.'),
  dead: EX('Barbell Deadlift', 3, 5, '5', 180, 'Back, glutes, hamstrings', 'dead',
    ['Feet under the hips, bar over the mid-foot. Hinge down, grip just outside the legs, chest up, back flat.', 'Push the floor away and stand tall. The bar stays against the legs. Lower it by pushing the hips back.', 'Big breath and a brace before you pull. Breathe out as you stand, then reset the brace for the next rep.'],
    ['Bar stays close the whole way.', 'Hips and shoulders rise together.', 'Lock out by squeezing the glutes, not by leaning back.'],
    ['Rounding the lower back.', 'Jerking the bar off the floor.', 'Bouncing the plates between reps.'],
    'Trap-bar deadlift, or a rack pull from the knee.', 'A pause just off the floor, or a heavier set of 3.'),
  pulldown: EX('Lat Pulldown', 3, 10, '8–10', 120, 'Lats, biceps', 'pull',
    ['Sit with the thighs anchored. Take a grip a little wider than the shoulders and start with the arms straight.', 'Pull the bar to the upper chest, driving the elbows down and in, then let it rise until the arms are straight.', 'Breathe out as you pull and in as the bar goes up.'],
    ['Chest stays tall. Don’t lean back to swing.', 'Think elbows to the hips, not hands to the chest.', 'A slight pause when the bar meets the chest.'],
    ['Yanking with the lower back.', 'Pulling the bar behind the head.', 'Half reps that never straighten the arms.'],
    'A band pulldown, or an assisted pull-up.', 'Pull-ups, or a slower return.', ['Wide Grip Lat Pulldown']),
  row: EX('Seated Cable Row', 3, 10, '8–10', 120, 'Mid back, lats, biceps', 'row',
    ['Sit tall, knees soft, arms straight in front of you. Shoulders down before you pull.', 'Pull the handle to the lower ribs, squeeze the shoulder blades, then reach forward again.', 'Breathe out as you pull and in as you reach.'],
    ['Torso stays still. The arms do the work.', 'Don’t shrug as the handle comes in.', 'Full reach at the front of every rep.'],
    ['Rocking back and forth to use momentum.', 'Pulling so high it becomes a shrug.', 'Cutting the reach short.'],
    'A chest-supported machine row.', 'Pause the squeeze for a second, or a slower reach.', ['Cable Seated Row', 'T-Bar Row']),
  face: EX('Face Pull', 3, 15, '12–15', 75, 'Rear delts, upper back', 'face',
    ['Set a rope at face height. Take an end in each hand and step back until the arms are straight.', 'Pull the rope toward the face, hands finishing beside the ears, then return slowly.', 'Breathe out as you pull. Keep the ribs down.'],
    ['Elbows stay high, about in line with the shoulders.', 'Finish by rotating the hands back, so the rear delts join in.', 'Light enough that the shoulders don’t shrug.'],
    ['Using so much weight the lower back leans.', 'Dropping the elbows and turning it into a row.', 'Rushing the return.'],
    'Band face pull.', 'A slower three-second return.', ['Machine Seated Single Arm Reverse Fly']),
  curl: EX('Dumbbell Curl', 3, 12, '8–12', 75, 'Biceps', 'curl',
    ['Stand tall, bells at your sides, palms forward, elbows under the shoulders.', 'Curl until the biceps are fully shortened, then lower until the arms are straight.', 'Breathe out as you curl and in as you lower. Keep the body still.'],
    ['Elbows stay pinned. They can drift a little forward at the top, not back.', 'Full stretch at the bottom.', 'Squeeze without swinging.'],
    ['Rocking the hips to throw the weight up.', 'Elbows travelling forward into a front raise.', 'Dropping the bells at the bottom.'],
    'Cable curl, or seated so you can’t swing.', 'Alternate arms, or a slower lowering.', ['Machine Preacher Curl']),
  hammer: EX('Hammer Curl', 2, 12, '10–12', 75, 'Biceps, brachialis', 'hammer',
    ['Same stance as a curl, but the palms face each other.', 'Curl without twisting the wrists, then lower to straight arms.', 'Breathe out on the way up and in on the way down.'],
    ['Thumbs stay up the whole rep.', 'Elbows stay close to the ribs.', 'Control the bottom.'],
    ['Swinging.', 'Turning the palms up halfway through.', 'Cutting the range short.'],
    'A lighter pair, or one arm at a time.', 'Pause at the top, or add a third set.'),
  squat: EX('Barbell Back Squat', 4, 8, '6–8', 180, 'Quads, glutes', 'squat',
    ['Bar on the upper back, feet about shoulder width, toes slightly out. Big breath, brace, then sit down between the hips.', 'Go to at least parallel, knees tracking over the toes, then stand by driving the floor away.', 'Hold the brace on the way down. Breathe out as you pass the hard part on the way up, then brace again.'],
    ['Chest stays up and the heels stay down.', 'Knees follow the toes. They can travel forward.', 'Own the bottom. Don’t collapse into it.'],
    ['Knees caving in.', 'Heels lifting.', 'Good-morning the bar up, hips shooting back while the chest drops.'],
    'Goblet squat, or a leg press.', 'Pause for a second in the hole, or add a fifth set.'),
  rdl: EX('Romanian Deadlift', 3, 10, '8–10', 150, 'Hamstrings, glutes', 'rdl',
    ['Hold the bar at the hips, feet under the hips, knees softly bent.', 'Push the hips back and slide the bar down the thighs until the hamstrings are loaded, then stand by driving the hips forward.', 'Breathe in as you hinge and out as you stand.'],
    ['Bar stays against the legs.', 'Back stays flat. The movement is the hips, not a squat.', 'Stop when the hips can’t go back any further without the back rounding.'],
    ['Turning it into a squat by bending the knees too much.', 'Rounding the back to touch the floor.', 'Bouncing out of the bottom.'],
    'Dumbbell Romanian deadlift.', 'A slower lowering, or a pause just below the knee.', ['Barbell Straight Leg Deadlift']),
  press: EX('Leg Press', 3, 12, '10–12', 120, 'Quads, glutes', 'legpress',
    ['Sit in the machine with the feet about shoulder width on the platform, slightly turned out. Lower until the knees are around 90 degrees.', 'Press until the legs are straight without locking hard, then lower again.', 'Breathe in as the sled comes down and out as you press.'],
    ['Lower back stays against the pad.', 'Knees track over the toes.', 'Don’t bounce the stoppers at the bottom.'],
    ['Letting the hips tuck under and the lower back peel off the pad.', 'Locking the knees with a snap.', 'A range so short the quads never work.'],
    'A narrower, lighter setting, or a goblet squat.', 'Feet lower on the platform to bias the quads, or a pause at the bottom.', ['Angled Machine Leg Press']),
  curlleg: EX('Seated Leg Curl', 3, 12, '10–12', 75, 'Hamstrings', 'legcurl',
    ['Sit with the pad on the back of the ankles and the thighs supported. Start with the legs nearly straight.', 'Curl the heels under the seat, squeeze, then let the weight return until the knees are almost straight.', 'Breathe out as you curl and in as the legs straighten.'],
    ['Hips stay down. Don’t lift them to cheat the pad.', 'Squeeze at the shortest point.', 'Full stretch at the start of each rep.'],
    ['Using momentum and swinging the stack.', 'Cutting the stretch short.', 'Letting the hips rise off the seat.'],
    'A lighter pin, or a lying leg curl.', 'A two-second squeeze at the bottom.', ['Machine Seated Leg Curl']),
  calf: EX('Standing Calf Raise', 4, 12, '10–15', 60, 'Calves', 'calf',
    ['Stand on the edge of a step or in the machine, balls of the feet on the platform, heels free.', 'Drop the heels until you feel a stretch, then rise as high as you can and pause.', 'Breathe out as you rise. Move slowly enough that you can’t bounce.'],
    ['The pause at the top is the work.', 'Knees stay almost straight.', 'Full stretch at the bottom of every rep.'],
    ['Bouncing.', 'Bending the knees and using the quads.', 'A tiny range of motion.'],
    'Seated calf raise, or two feet if one is too hard.', 'One leg at a time, or a slower lower.', ['Machine Standing Calf Raise']),
  crunch: EX('Cable Crunch', 3, 12, '10–15', 60, 'Abs', 'crunch',
    ['Kneel at a high cable, rope beside the ears, hips fixed.', 'Curl the ribs toward the hips, then return until the torso is tall again. The hips don’t sit back.', 'Breathe out hard as you crunch and in as you rise.'],
    ['The movement is a curl of the spine, not a hip hinge.', 'Keep the rope beside the head so the neck stays quiet.', 'Pause for a moment in the curl.'],
    ['Sitting back onto the heels and turning it into a squat.', 'Yanking with the arms.', 'Rushing so the abs never hold the weight.'],
    'A bodyweight crunch, or a dead bug.', 'Hold the curl for two seconds, or add a fourth set.'),
};
const WARM = {
  push: ['3 minutes easy on a bike, or a brisk walk.', 'Arm circles, 10 each way, then 10 band pull-aparts or wall slides if you have a band.', 'Two easy sets of the bench press with an empty bar, 8 reps. Stop well short of hard.'],
  pull: ['3 minutes easy on a bike, or a brisk walk.', 'Arm swings, then 15 band pull-aparts or light face pulls.', 'Two easy sets of the deadlift with an empty bar, 5 reps. Brace, and don’t chase speed.'],
  legs: ['3 minutes easy on a bike, or a brisk walk.', '10 bodyweight squats, then 10 hip hinges with your hands on your hips.', 'Two easy sets of the squat with an empty bar, 8 reps. Smooth, full range.'],
};
const DOWN = {
  push: [['Chest', 'Doorway chest stretch, 30 seconds each side. Elbow at shoulder height, step through gently.'], ['Triceps', 'Overhead triceps stretch, 30 seconds each arm. Elbow points up, ribs stay down.'], ['Shoulder', 'Cross-body shoulder stretch, 30 seconds each arm. Pull the arm across the chest, shoulder down.']],
  pull: [['Lats', 'Hang from a bar, or hold a doorway overhead, 30 seconds. Let the shoulders rise and the ribs drop.'], ['Chest and back', 'Clasp the hands behind you and open the chest, 30 seconds. Then round the upper back and reach forward, 30 seconds.'], ['Biceps', 'Arm straight, palm on a wall, thumb down, turn the body away, 30 seconds each side.']],
  legs: [['Quads', 'Standing quad stretch, 30 seconds each side. Knees together, hips pushed slightly forward.'], ['Hamstrings', 'Hinge and reach toward the toes with a flat back, 30 seconds. Soft knees are fine.'], ['Calves', 'Hands on a wall, one heel down, knee straight, 30 seconds each side. Then a second 30 with the knee softly bent.']],
};
const TX = key => { const x = LIB[key]; return { id: uid(), key, name: x.name, sets: x.sets, reps: x.reps, rest: x.rest, note: '' }; };
const SEED_TEMPLATES = () => ({
  push: ['bench', 'ohp', 'incline', 'raise', 'pushdown', 'oht'].map(TX),
  pull: ['dead', 'pulldown', 'row', 'face', 'curl', 'hammer'].map(TX),
  legs: ['squat', 'rdl', 'press', 'curlleg', 'calf', 'crunch'].map(TX),
});
const LEGACY_NAMES = ['smith machine incline bench press', 'machine seated chest fly', 'dip', 'cable lateral raise', 'machine preacher curl', 'wide grip lat pulldown', 't bar row', 'cable seated row', 'cable rope tricep extension', 'barbell skullcrusher', 'machine seated single arm reverse fly', 'angled machine leg press', 'barbell straight leg deadlift', 'machine seated leg extension', 'machine seated leg curl', 'machine seated hip adduction', 'machine standing calf raise'];
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
    xp: { total: 0, seen: {}, celebrated: 1 },
  };
}
function normalizeAthlete(d) {
  try {
    if (!d || typeof d !== 'object') return blank();
    const b = blank(), g = d.gym && typeof d.gym === 'object' ? d.gym : {};
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
      xp: {
        total: d.xp && num(d.xp.total) || 0,
        seen: d.xp && d.xp.seen && typeof d.xp.seen === 'object' ? d.xp.seen : {},
        celebrated: d.xp && num(d.xp.celebrated) || 1,
      },
    };
    // Seed the lean-bulk plan if the meals are still the untouched empty starters (never overwrite real data)
    const untouched = ms => Array.isArray(ms) && ms.every(m => !num(m.cals) && !String(m.items || '').trim() && !num(m.p) && !num(m.c) && !num(m.f));
    if (untouched(out.plan)) {
      out.plan = b.plan;
      Object.keys(out.days).forEach(k => { const ms = out.days[k] && out.days[k].meals; if (untouched(ms) && !ms.some(m => m.done)) delete out.days[k]; });
    }
    // Bring the default cook notes in line with the air-fryer method, and leave anything edited by hand.
    const cookCopy = {
      m1: ['200g boneless skinless chicken thighs, 550g potatoes, 10g olive oil in the seasoning', [
        '200g chicken thighs (skinless), 110g rice (dry weight), 100g broccoli, 10g olive oil to cook',
        '200g boneless skinless chicken thighs, 110g rice (dry weight), 100g broccoli, 10g olive oil in the seasoning',
        '200g boneless skinless chicken thighs, 110g rice (rice cooker), 100g broccoli, 10g olive oil in the seasoning',
      ]],
      post: ['320g potatoes, air-fried. Straight after the gym', [
        '320g potatoes, air-fried (few sprays of oil + seasoning). Straight after the gym',
        '320g potatoes, tossed in the leftover chicken seasoning and air-fried. Straight after the gym',
      ]],
      dinner: ['150g rice (rice cooker), 150g 10% beef mince (defrosted), 2 eggs fried fresh, 20g butter or oil', [
        '150g rice (dry weight), 150g beef mince (10% fat), 2 eggs, 20g olive oil or butter (cook with it / drizzle over rice)',
      ]],
    };
    const patchMeals = ms => {
      if (!Array.isArray(ms)) return;
      ms.forEach(m => {
        if (!m) return;
        const fix = cookCopy[m.tag];
        if (fix && fix[1].includes(m.items)) m.items = fix[0];
        if (m.tag === 'm1' && m.name === 'Chicken & rice') m.name = 'Chicken & potatoes';
        if (m.tag === 'm1' && num(m.cals) === 755 && num(m.p) === 50 && num(m.c) === 93 && num(m.f) === 19) {
          m.cals = 750; m.p = 50; m.c = 95; m.f = 18;
        }
      });
    };
    patchMeals(out.plan);
    Object.keys(out.days).forEach(k => patchMeals(out.days[k] && out.days[k].meals));
    const legacy = ['push', 'pull', 'legs'].every(d => {
      const list = out.gym.templates[d] || [];
      return list.length && list.every(t => LEGACY_NAMES.includes(String(t.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()));
    });
    if (legacy) out.gym.templates = SEED_TEMPLATES();
    Object.keys(out.workouts).forEach(k => { const w = out.workouts[k]; if (w && w.tick) delete w.tick; });
    const tw = out.workouts[today()];
    if (tw && !tw.start && !(tw.exercises || []).some(e => (e.sets || []).some(s => s.done || num(s.weight) > 0))) delete out.workouts[today()];
    return out;
  } catch (e) { console.warn('PEAK: could not read saved data', e); return blank(); }
}
const STORE_KEY = 'peakfit.profiles.v1';
let STORE = null;
let ACTIVE = null;
function profileShell(id, name, role, theme, data) {
  const row = { id, name, role, theme: theme || 'dark', updatedAt: new Date().toISOString() };
  if (role === 'trainer') row.title = 'Trainer';
  else row.data = data;
  return row;
}
function persistStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(STORE)); }
  catch (e) { toast('Could not save — storage is full or blocked', { err: true }); }
}
function bootProfiles() {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    try { STORE = JSON.parse(raw); } catch (_) { STORE = null; }
  }
  let dirty = false;
  if (!STORE || !STORE.profiles || !STORE.profiles.adnan) {
    let adnan = blank(), theme = 'dark';
    try {
      const leg = localStorage.getItem(KEY);
      if (leg) adnan = normalizeAthlete(JSON.parse(leg));
      theme = localStorage.getItem('peakfit.theme') || theme;
    } catch (_) {}
    STORE = {
      version: 1,
      activeId: null,
      picked: false,
      profiles: {
        adnan: profileShell('adnan', 'Adnan', 'athlete', theme, adnan),
        adam: profileShell('adam', 'Adam', 'athlete', 'dark', blank()),
        ismail: profileShell('ismail', 'Ismail', 'trainer', 'dark'),
      },
    };
    dirty = true;
  }
  if (!STORE.profiles.adam) { STORE.profiles.adam = profileShell('adam', 'Adam', 'athlete', 'dark', blank()); dirty = true; }
  if (!STORE.profiles.ismail) { STORE.profiles.ismail = profileShell('ismail', 'Ismail', 'trainer', 'dark'); dirty = true; }
  if (STORE.profiles.ismail && STORE.profiles.ismail.role !== 'trainer') { STORE.profiles.ismail.role = 'trainer'; dirty = true; }
  if (STORE.profiles.ismail && STORE.profiles.ismail.data) { delete STORE.profiles.ismail.data; dirty = true; }
  if (STORE.activeId && STORE.profiles[STORE.activeId]) {
    if (!STORE.picked) { STORE.picked = true; dirty = true; }
  } else if (STORE.activeId || STORE.picked) {
    STORE.activeId = null;
    STORE.picked = false;
    dirty = true;
  }
  ACTIVE = STORE.picked && STORE.activeId ? STORE.activeId : null;
  if (dirty) persistStore();
}
function load() {
  bootProfiles();
  const p = ACTIVE && STORE.profiles[ACTIVE];
  if (!p || p.role !== 'athlete') return blank();
  return normalizeAthlete(p.data || {});
}
let S = load();
function save() {
  if (!ACTIVE || !STORE.profiles[ACTIVE] || STORE.profiles[ACTIVE].role !== 'athlete') return;
  const p = STORE.profiles[ACTIVE];
  p.data = S;
  p.theme = document.documentElement.getAttribute('data-theme') || p.theme || 'dark';
  p.updatedAt = new Date().toISOString();
  persistStore();
  if (!syncing) scheduleSync();
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ================= Levels =================
   Step to the next level is round(25 × level^1.55). Level 1 needs 25 XP, then each step is bigger. */
function xpNeed(level) { return Math.round(25 * Math.pow(Math.max(1, level), 1.55)); }
function levelState(total) {
  let level = 1, spent = 0, guard = 0;
  while (spent + xpNeed(level) <= total && guard < 500) { spent += xpNeed(level); level++; guard++; }
  return { level, into: total - spent, need: xpNeed(level), total: total || 0 };
}
function xpBucket(prefix) {
  const seen = (S.xp && S.xp.seen) || {};
  let n = 0, xp = 0;
  Object.keys(seen).forEach(k => { if (k.startsWith(prefix)) { n++; xp += num(seen[k]); } });
  return { n, xp };
}
function fullDay(date) {
  const day = S.days[date];
  const meals = day && Array.isArray(day.meals) ? day.meals : [];
  return meals.length > 0 && meals.every(m => m.done);
}
function streakCount(date) {
  let n = 0, d = date;
  while (fullDay(d) && n < 60) { n++; d = addDays(d, -1); }
  return n;
}
function grant(id, amount) {
  if (!S.xp) S.xp = { total: 0, seen: {}, celebrated: 1 };
  if (S.xp.seen[id]) return false;
  const before = levelState(S.xp.total).level;
  S.xp.seen[id] = amount;
  S.xp.total += amount;
  const after = levelState(S.xp.total).level;
  paintXp();
  if (after > before) {
    S.xp.celebrated = after;
    showLevelUp(after);
  }
  return true;
}
function noteDay(date) {
  if (!fullDay(date)) return;
  grant('day:' + date, 50);
  const streak = streakCount(date);
  if (streak >= 2) grant('streak:' + date, 15 * Math.min(streak, 10));
}
function paintXp() {
  const bar = $('#xpBar'); if (!bar || !S.xp) return;
  const st = levelState(S.xp.total);
  const pct = st.need ? Math.max(0, Math.min(1, st.into / st.need)) : 0;
  $('#xpLv').textContent = st.level;
  $('#xpLabel').textContent = 'Level ' + st.level;
  $('#xpFill').style.transform = 'scaleX(' + pct + ')';
  $('#xpNext').textContent = (st.need - st.into) + ' to ' + (st.level + 1);
  bar.setAttribute('aria-label', 'Level ' + st.level + ', ' + (st.need - st.into) + ' XP to level ' + (st.level + 1));
}
function showLevelUp(level) {
  const el = $('#lvlUp'); if (!el) return;
  $('#lvlNum').textContent = level;
  el.hidden = false;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}
function openXp() {
  const st = levelState(S.xp.total);
  const rows = [
    ['Meal ticked', '25 XP', 'Once each. Untick and tick again does not add more.', xpBucket('meal:')],
    ['Set done', '10 XP', 'Once for each set you tick in a workout.', xpBucket('set:')],
    ['Workout finished', '100 XP', 'Once for each day you finish a session.', xpBucket('workout:')],
    ['Shop item ticked', '10 XP', 'Once for each thing you mark as bought.', xpBucket('shop:')],
    ['Full day', '50 XP', 'Every meal that day is ticked. Once.', xpBucket('day:')],
    ['Streak', '15 × days', 'From the second full day in a row, up to 10 days. Once for that day.', xpBucket('streak:')],
  ];
  $('#xpBody').innerHTML = `<div class="xp-sheet-top"><div><div class="card-kicker">Progress</div><h2>Level ${st.level}</h2></div>
    <button type="button" class="eye-x" data-xp-close>${I.x}<span>Close</span></button></div>
    <div class="xp-sheet-bar"><i style="transform:scaleX(${st.need ? st.into / st.need : 0})"></i></div>
    <p class="xp-nextline"><b>${st.need - st.into} XP</b> to level ${st.level + 1}. You have ${fmtInt(st.total)} XP in total.</p>
    <p class="xp-rule">Early levels come from a meal or two. Later levels ask for more, because each step is bigger than the last.</p>
    ${rows.map(([name, rate, why, bag]) => `<div class="xp-row"><div><b>${name}</b><span>${why}</span></div><div class="xp-row-n"><b>${rate}</b><span>${bag.n ? bag.xp + ' XP so far' : 'None yet'}</span></div></div>`).join('')}
    <p class="xp-nextline">Next up: tick a meal, finish a set, or clear a shop item.</p>`;
  const wrap = $('#xpSheet');
  wrap.classList.add('open'); wrap.setAttribute('aria-hidden', 'false');
}
function closeXp() {
  const wrap = $('#xpSheet'); if (!wrap) return;
  wrap.classList.remove('open'); wrap.setAttribute('aria-hidden', 'true');
}

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
  return (S.gym.templates[day] || []).map(t => ({ id: uid(), key: t.key || '', name: t.name, rest: num(t.rest) || 180, note: t.note || '',
    sets: Array.from({ length: Math.max(1, Math.min(10, num(t.sets) || 1)) }, () => ({ id: uid(), reps: '', weight: '', done: false, target: num(t.reps) || '' })) }));
}
/* Today's workout is preloaded from the cycle's template */
function seedToday() { /* A session starts when Start is tapped, not when the tab opens. */ }
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
function nameKeys(name) {
  const k = exKey(name), keys = new Set([k]);
  Object.values(LIB).forEach(x => {
    const all = [x.name, ...(x.alias || [])].map(exKey);
    if (all.includes(k)) all.forEach(a => keys.add(a));
  });
  return keys;
}
function libFor(name) {
  const k = exKey(name);
  return Object.values(LIB).find(x => exKey(x.name) === k || (x.alias || []).some(a => exKey(a) === k)) || null;
}
function lastTime(name, beforeDate) {
  const keys = nameKeys(name);
  const dates = Object.keys(S.workouts).filter(d => d < beforeDate).sort().reverse();
  for (const d of dates) {
    const e = (S.workouts[d].exercises || []).find(x => keys.has(exKey(x.name)) && loggedEx(x) && x.kind !== 'warmup' && x.kind !== 'down');
    if (e) return { date: d, sets: e.sets.filter(loggedSet) };
  }
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
    if (e.kind === 'warmup' || e.kind === 'down') return;
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

/* Photos, batch sizes and freezer-to-plate guides, keyed by the plan tag.
   Portions follow a meal that is eaten every day (7× a week) inside the 3,000 kcal plan. */
const MEAL_GUIDES = {
  m1: {
    photo: 'assets/meals/chicken-potatoes.jpg', alt: 'Roast chicken with potatoes',
    credit: 'Biso', source: 'https://commons.wikimedia.org/wiki/File:Roasted_chicken_and_potatoes.JPG', licence: 'CC BY 3.0',
    portions: '4 portions per cook', batch: '800g chicken thighs, 2.2kg potatoes, 40g olive oil',
    why: 'About 750 kcal a portion: 200g chicken and 550g potatoes.',
    steps: [
      ['Chicken', '800g boneless skinless thighs in a glass bowl. Add smoked paprika, salt, garlic powder, onion powder, mixed herbs, rosemary and olive oil. Mix.'],
      ['Air fry', 'Into the air fryer. Air Fry, 200°C, 15 minutes on the first side, flip, then 5–10 minutes more, until the thickest piece is 75°C. Rest 5 minutes.'],
      ['Potatoes', 'While the chicken cooks, put the potatoes (2.2kg, 550g a portion) in the same bowl with what’s left of the seasoning and oil. No extra seasoning. Mix. Air fry them after the chicken, 200°C, about 20–25 minutes, until golden.'],
      ['Box up', 'Split into 4 boxes. 1 in the fridge, freeze 3. Reheat on Recrisp until piping hot. Don’t refreeze.'],
    ],
    safety: [
      'Reheat on Recrisp until piping hot. Don’t refreeze.',
    ],
    ings: [['Chicken thighs, boneless and skinless', '200g', '800g'], ['Potatoes', '550g', '2.2kg'], ['Olive oil', '10g', '40g'], ['Smoked paprika, salt, garlic powder, onion powder, mixed herbs, rosemary', 'In the bowl', 'Same bowl']],
    boxAt: [3],
  },
  snack: {
    photo: 'assets/meals/snack-yogurt.jpg', alt: 'Yogurt topped with green grapes and blueberries',
    credit: 'Uswa Khalid', source: 'https://www.pexels.com/photo/healthy-yogurt-bowl-with-fresh-fruits-and-nuts-35279228/', licence: 'Pexels Licence',
    portions: '7 pots on shop day', batch: '1,750g Greek yogurt and 140g honey, then fruit when you eat',
    why: 'This is every day, and it isn’t a cooked meal. Portion the yogurt and honey for the week on shop day. Add the fruit at the bowl so nothing goes watery in the fridge.',
    steps: [
      ['Set out 7 pots', 'One for each day. The weekly shop is 2 × 1kg yogurt, and seven portions use 1,750g, so one tub is spare.'],
      ['Portion the yogurt and honey', 'Each pot: 250g full-fat Greek yogurt and 20g honey, stirred in. That is 460 kcal, with 25g protein. Lid on, straight into the fridge. Eat them within the week and by the date on the tub.'],
      ['Leave the fruit alone', 'Berries stay in the freezer (the monthly shop is frozen mixed berries). Grapes stay whole in the fridge.'],
      ['Build the bowl', 'When you eat it, add 100g berries and 150g grapes. Frozen berries are fine as they are, or give them about 10 minutes on the counter. Don’t microwave them into the yogurt.'],
      ['Don’t freeze the finished snack', 'Yogurt turns grainy and grapes turn mushy. If you thaw a handful of berries, eat them. Don’t put them back in the freezer.'],
    ],
    safety: [
      'Keep the pots in the fridge and use them within the week.',
      'Don’t leave yogurt out of the fridge while you eat something else and then put it back for tomorrow.',
      'Don’t refreeze thawed berries.',
      'This one is eaten cold. There is nothing to reheat.',
    ],
    ings: [['Full-fat Greek yogurt', '250g', '1,750g, 7 pots'], ['Honey', '20g', '140g'], ['Berries', '100g when you eat', '100g a day'], ['Grapes', '150g when you eat', '150g a day']],
    boxAt: [0, 1],
  },
  pre: {
    photo: 'assets/meals/bananas-dates.jpg', alt: 'Bananas beside a bowl of dates',
    credit: 'daSupremo', source: 'https://commons.wikimedia.org/wiki/File:Bananas_and_dates_in_a_tray.jpg', licence: 'CC BY-SA 4.0',
    portions: '1 portion, no cooking', batch: '2 bananas and 3 Medjool dates',
    why: 'Eaten every day, 30–60 minutes before the gym. Nothing to batch-cook or freeze: bananas you want to eat whole don’t survive the freezer, and dates live in the cupboard.',
    steps: [
      ['Take one portion', '2 bananas and 3 Medjool dates. That is the whole meal: 410 kcal, mostly carbohydrate, so it is easy to train on.'],
      ['Time it', 'Eat it 30–60 minutes before the gym. On a rest day it is still on the plan: have it whenever it suits you.'],
      ['If you are going out', 'Pack it in the morning. Put the dates in a small tub so they don’t get crushed in the bag.'],
      ['How to store the rest', 'Dates keep in a sealed tub in the cupboard. Bananas stay at room temperature. If a bunch is ripening too fast, the fridge slows them down for a couple of days. The skin goes brown; the fruit is fine.'],
      ['Don’t freeze them for this meal', 'A frozen banana is mushy once it thaws, so it is no good as a pre-gym snack. Brown ones you won’t eat in time can be peeled and frozen for something else, but that is not this meal.'],
    ],
    safety: [
      'No cooking, no reheating, no refreezing.',
      'Throw away a banana that is leaking or smells fermented.',
      'Keep dates in a sealed tub so they stay soft rather than drying out.',
    ],
    ings: [['Bananas', '2', '2, no batch'], ['Medjool dates', '3', '3, no batch']],
    boxAt: [3],
  },
  post: {
    photo: 'assets/meals/potatoes.jpg', alt: 'Seasoned potato chunks from an air fryer',
    credit: 'Vimkay', source: 'https://commons.wikimedia.org/wiki/File:Potatoes_coated_with_spices_and_fried_in_an_air-fryer.jpg', licence: 'CC BY-SA 4.0',
    portions: '3 portions per cook', batch: '960g potatoes',
    why: 'A separate 320g portion, straight after the gym. Not the potatoes in the chicken boxes.',
    steps: [
      ['Air fry', '320g potatoes. Air Fry, 200°C, about 20–25 minutes, until golden.'],
    ],
    safety: [
      'Cool cooked potatoes within an hour. Eat fridge portions within 3 days.',
      'Reheat until piping hot, once only.',
      'Don’t refreeze potatoes you have thawed and air-fried.',
      'Eat this straight after the gym, while it is still the post-training meal.',
    ],
    ings: [['Potatoes', '320g', '960g, 3 portions']],
    boxAt: [],
  },
  dinner: {
    photo: 'assets/meals/dinner-mince.jpg', alt: 'White rice with beef mince and a fried egg',
    credit: 'MICDWIM YAINZ RPMMO', source: 'https://commons.wikimedia.org/wiki/File:HK_TST_%E5%B0%96%E6%B2%99%E5%92%80_Tsim_Sha_Tsui_%E7%B7%AC%E7%94%B8%E8%87%BA_3_Minden_Row_%E6%81%86%E6%98%9F%E6%A8%93_Star_Mansion_%E7%A8%BB%E9%A6%99%E9%9B%86%E5%9C%98_Tao_Heung_Restaurant_food_steamed_beef_minced_cake_rice_n_pan-fried_egg_December_2022_Px3_04.jpg', licence: 'CC BY-SA 4.0',
    portions: '4 portions per cook', batch: '600g 10% beef mince, 4 rice-cooker cups of rice (~600g), 80g butter or oil. Eggs fried fresh.',
    why: 'Start the rice cooker first. Defrosted mince goes straight into the glass-bowl air fryer.',
    steps: [
      ['Rice', 'Start this first. Rice cooker. 4 rice-cooker cups of rice (about 600g). Rinse 2–3 times until the water is mostly clear. Water to the 4 line (or about 4.5 cups), and a pinch of salt. Cook. When it switches to warm, rest 10 minutes.'],
      ['Mince', '600g defrosted 10% beef mince, straight into the air fryer glass bowl. Season with 1 tsp salt, ½ tsp pepper, 1 tsp garlic powder, 1 tsp onion powder, 1–2 tsp smoked paprika, and if you want them, mixed herbs and a splash of soy sauce. Mix and break it up. Air Fry, 200°C, 12–15 minutes. Stir and break it up every 3–4 minutes, until there is no pink. Pour off the excess fat, then stir in the butter or oil (80g for the batch).'],
      ['Box up', '4 boxes of mince and rice. Cool the rice within an hour. 1 in the fridge, freeze 3. Leave the eggs out.'],
      ['When you eat', 'Reheat until piping hot. Recrisp works well. Fry 2 eggs fresh and put them on top. Don’t refreeze.'],
    ],
    safety: [
      'Cool the rice within an hour. Don’t leave cooked rice in the fridge more than a day.',
      'Reheat until piping hot. Don’t refreeze.',
      'Use defrosted mince. Fry the eggs fresh.',
    ],
    ings: [['Rice, dry', '150g, 1 rice-cooker cup', '600g, 4 rice-cooker cups'], ['Beef mince, 10%, defrosted', '150g', '600g'], ['Butter or oil', '20g', '80g'], ['Eggs, fried fresh', '2', 'Not in the boxes'], ['Salt, pepper, garlic powder, onion powder, smoked paprika, optional herbs and soy', 'In the bowl', 'The amounts are in the cook steps']],
    boxAt: [2],
  },
};
const mealGuide = m => (m && m.tag && MEAL_GUIDES[m.tag]) || null;

/* ================= Meals view ================= */
function modeSeg() {
  const i = U.mealsMode === 'shop' ? 1 : 0;
  return `<div class="seg" id="mealSeg"><span class="seg-ind" style="width:calc((100% - 12px)/2);transform:translateX(calc(${i} * (100% + 4px)))"></span>
    <button class="${i ? '' : 'on'}" data-act="meal-mode" data-m="today">Today</button><button class="${i ? 'on' : ''}" data-act="meal-mode" data-m="shop">Shopping</button></div>`;
}
function renderMeals() {
  const date = U.mealsDate, meals = getMeals(date);
  const rows = meals.map(m => `<div class="item${m.done ? ' done' : ''}${isOpen(m.id)}" data-meal="${m.id}">${mealHead(m)}
      <button type="button" class="info-btn" data-act="eye" aria-label="Info, ${esc(m.name)}"><span>i</span></button>
      <div class="expand"><div class="expand-in"><div class="expand-body">
        ${mealExtra(m)}
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
  $('#view-meals').innerHTML = `${dayswitch('meals', date, true)}
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
  const g = mealGuide(m);
  const sub = m.items ? esc(m.items) : (num(m.p) || num(m.c) || num(m.f)) ? `P ${fmt(num(m.p), 0)}  C ${fmt(num(m.c), 0)}  F ${fmt(num(m.f), 0)}` : '';
  const thumb = g ? `<img class="meal-thumb" src="${g.photo}" alt="">` : '';
  return `<div class="item-head" data-act="toggle">
    <button class="check" data-act="tick" aria-label="Tick off ${esc(m.name)}">${I.check}</button>
    <div class="item-main meal-main">${thumb}<div class="item-copy"><div class="item-title">${esc(m.name || 'Untitled meal')}</div>${sub ? `<div class="item-sub">${sub}</div>` : ''}</div></div>
    <div class="item-val">${num(m.cals) ? fmtInt(num(m.cals)) + ' kcal' : '<span class="faint">Set kcal</span>'}</div>${I.chev}</div>`;
}
function mealExtra(m) {
  const g = mealGuide(m); if (!g) return '';
  return `<figure class="meal-fig"><img class="meal-photo" src="${g.photo}" alt="${esc(g.alt)}" width="960" height="720">
    <figcaption class="meal-credit">${esc(g.credit)} · ${esc(g.licence)}</figcaption></figure>
    <div class="meal-tools"><div class="meal-port"><b>${esc(g.portions)}</b><span>${esc(g.batch)}</span></div></div>`;
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
    { g: 'Meat', note: 'Defrost before cooking. Daily portions: 200g chicken, 150g mince', items: [['chicken', 'Chicken thighs, boneless and skinless', '6 × 1kg'], ['mince', 'Beef mince, 10% fat', '9 × 500g']] },
    { g: 'Frozen', items: [['berries', 'Mixed berries', '4 × 750g']] },
    { g: 'Cupboard', items: [['rice', 'Rice', '5kg bag'], ['dates', 'Medjool dates', '~2kg (90)'], ['honey', 'Honey', '2 × 340g'], ['oil', 'Olive oil', '2 × 500ml'], ['seasoning', 'Smoked paprika, garlic powder, onion powder, mixed herbs, rosemary, black pepper', '1 of each'], ['soy', 'Soy sauce', '1 bottle'], ['butter', 'Butter', '3 × 250g']] },
  ],
  week: [['bananas', 'Bananas', '14–15'], ['grapes', 'Grapes', '~1.1kg'], ['yogurt', 'Greek yogurt, full-fat', '2 × 1kg'], ['eggs', 'Eggs', '15 tray'], ['potatoes', 'Potatoes', '6kg']],
};
const SHOP_STORES = [{ id: 'haris', name: 'Haris & Co' }, { id: 'morrisons', name: 'Morrisons' }, { id: 'veg', name: 'Veg market' }];
const SHOP_AT = {
  chicken: ['haris', 'morrisons'], mince: ['haris', 'morrisons'],
  berries: ['morrisons'],
  rice: ['haris'], dates: ['haris', 'morrisons'],
  honey: ['morrisons', 'haris'], oil: ['haris', 'morrisons'],
  seasoning: ['morrisons', 'haris'], soy: ['morrisons', 'haris'], butter: ['morrisons'],
  bananas: ['veg', 'morrisons'], grapes: ['veg', 'morrisons'],
  yogurt: ['morrisons'], eggs: ['morrisons', 'veg'], potatoes: ['veg', 'morrisons'],
};
const SHOP_WHERE = [
  '<b>Haris & Co</b> for halal chicken and mince, and for bulk rice, dates and cupboard staples.',
  '<b>Morrisons</b> for frozen berries, Greek yogurt, soy sauce, honey, butter and eggs.',
  '<b>Veg market</b> for bananas, grapes and potatoes — usually cheaper than the supermarket.',
];
const SHOP_PREP = ['Portion the meat for the month and freeze it: 200g chicken, 150g mince.', 'Defrost the mince (and the chicken) in the fridge before you cook.', 'Keep potatoes in a cool, dark cupboard away from onions.', 'Rice goes in the rice cooker. Cool it within an hour: 1 box in the fridge, freeze the rest. Cooked rice shouldn’t sit in the fridge more than a day.'];
const SHOP_DO = {
  chicken: ['A 1kg pack is five 200g portions. One cook is 800g, four portions.', 'From the pack, bag 800g for the cook you are doing now, or for the next cook.', 'Bag the leftover 200g on its own, raw, and freeze it. Four of those leftover bags are another cook.', 'The night before a cook, move one 800g bag into the fridge. Don’t cook it from frozen.'],
  mince: ['A cook is 600g, four portions of 150g. Defrost that 600g in the fridge before it goes in the air fryer.', 'A 500g pack is 50g short of four portions. Weigh 150g bags and top a short bag up from the next pack, so every bag is 150g.', 'Freeze the bags raw. A cook is four bags.'],
  berries: ['Leave the bags in the freezer. The snack takes 100g when you eat it.', 'If you thaw a handful, eat it. Don’t put it back in the freezer.'],
  rice: ['Keep the bag sealed. Dinner is the only meal that uses it.', 'A cook is 4 rice-cooker cups, about 600g. That is four plates of 150g.', 'Rinse 2–3 times, water to the 4 line, pinch of salt. When it switches to warm, rest 10 minutes.', 'Cool it within an hour. 1 box in the fridge, freeze 3. Don’t leave cooked rice in the fridge more than a day.'],
  dates: ['Sealed tub in the cupboard. 3 dates with the 2 bananas, 30–60 minutes before the gym.', 'The bag is about 90 dates, a month of this meal.'],
  honey: ['Cupboard. On shop day, stir 20g into each of the 7 yogurt pots.', 'Seven pots use 140g. The jars cover the month.'],
  oil: ['A chicken cook uses 40g in the glass bowl, with the paprika, salt, garlic powder, onion powder, mixed herbs and rosemary.', 'That is 10g on each plate.'],
  seasoning: ['Chicken bowl: smoked paprika, salt, garlic powder, onion powder, mixed herbs and rosemary, with the 40g olive oil. No extra seasoning on the potatoes.', 'Mince bowl, for the 600g: 1 tsp salt, ½ tsp pepper, 1 tsp garlic powder, 1 tsp onion powder, 1–2 tsp smoked paprika. Mixed herbs if you want them.'],
  soy: ['Optional splash in the mince bowl. Fridge after you open it.'],
  butter: ['A dinner cook uses 80g, stirred into the mince after you pour the fat off.', 'That is 20g a plate. Fry the 2 eggs fresh, without adding to that 80g.'],
  bananas: ['Leave them out. 2 a day, with 3 dates, 30–60 minutes before the gym.', 'A week is 14–15. If a bunch ripens too fast, the fridge slows it for a couple of days. Don’t freeze them for this meal.'],
  grapes: ['Keep them whole in the fridge. 150g goes in the yogurt bowl when you eat it.', 'A week is about 1.1kg. Don’t freeze them.'],
  yogurt: ['On shop day, set out 7 pots. 250g yogurt and 20g honey in each. Lid on, straight in the fridge.', 'Seven pots use 1,750g, so one 1kg tub is spare. Add the fruit when you eat. Don’t freeze the pots.'],
  eggs: ['Fridge. 2 eggs fried fresh on each dinner, after the mince and rice are hot.', 'They don’t go in the freezer boxes. A tray of 15 is a week, plus one spare.'],
  potatoes: ['Cool, dark cupboard, away from onions. A week is 6kg.', 'Chicken and potatoes: a cook is 2.2kg, four portions of 550g. Weigh that out for the cook. The rest stays in the cupboard.', 'Post-gym is separate: 320g a day, air fried on its own. It is not the potatoes in the chicken boxes. Three of those is 960g.'],
};
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
  const prep = SHOP_DO[id];
  return `<div class="srow${isGot(list, id) ? ' done' : ''}" data-list="${list}" data-sid="${esc(id)}">
    <button class="check" data-act="shop-tick" aria-label="Tick ${esc(name)}">${I.check}</button>
    <div class="shop-copy">
      <div class="item-title">${esc(name)}</div>
      ${qty ? `<div class="shop-qty">${esc(qty)}</div>` : ''}
      ${at}
      ${prep ? `<div class="shop-do">${prep.map(p => `<p>${esc(p)}</p>`).join('')}</div>` : ''}
    </div>
    ${del ? `<button class="del" data-act="shop-del" aria-label="Remove ${esc(name)}">${I.x}</button>` : ''}</div>`;
}
function renderShop() {
  shopSync();
  if (!U.shopShown) { U.open.add('shop-month'); U.open.add('shop-week'); U.shopShown = true; }
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
  $('#view-shop').innerHTML = `
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
function sessionMs(w) {
  if (!w || !w.start) return 0;
  return (w.active || 0) + (w.tick ? Math.max(0, Date.now() - w.tick) : 0);
}
function parkGym() {
  const w = S.workouts[today()];
  if (!w || !w.start || w.end || !w.tick) return;
  w.active = (w.active || 0) + Math.max(0, Date.now() - w.tick);
  delete w.tick; save();
}
function wakeGym() {
  const w = S.workouts[today()];
  if (!w || !w.start || w.end || !w.guide || w.guide.phase === 'done') return;
  if (!w.tick) { w.tick = Date.now(); save(); }
}
function dayMinutes(day) {
  const xs = S.gym.templates[day] || [];
  const rest = xs.reduce((a, x) => a + num(x.sets) * (num(x.rest) || 90), 0);
  const work = xs.reduce((a, x) => a + num(x.sets) * 45, 0);
  return Math.round((rest + work) / 60) + 13;
}
function coachOf(ex) {
  if (!ex) return null;
  if (ex.key && LIB[ex.key]) return LIB[ex.key];
  return libFor(ex.name);
}
function lastLine(name, date) {
  const lt = lastTime(name, date); if (!lt) return 'Last time: none yet';
  const t = topSet(lt.sets);
  return t && num(t.weight) ? `Last time: ${fmt(num(t.weight))} kg × ${num(t.reps)}` : `Last time: ${setsSummary(lt.sets)}`;
}
function poseSVG(id) {
  const L = (x1, y1, x2, y2, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="${w || 7}" stroke-linecap="round"/>`;
  const D = (x, y, r) => `<circle class="accent" cx="${x}" cy="${y}" r="${r || 9}"/>`;
  const B = (x1, y1, x2, y2) => `<line class="accent" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="5" stroke-linecap="round"/>`;
  const ground = `<path d="M16 134 H184" stroke="currentColor" stroke-opacity=".18" stroke-width="2"/>`;
  const P = {
    bench: ground + L(40, 88, 112, 88) + L(112, 88, 142, 74) + D(150, 70) + L(78, 88, 78, 56) + B(56, 52, 104, 52) + L(40, 88, 24, 112) + L(40, 88, 34, 120),
    ohp: ground + L(100, 96, 100, 52) + D(100, 40) + L(100, 70, 70, 96) + L(100, 70, 130, 96) + B(62, 28, 138, 28) + L(100, 96, 78, 128) + L(100, 96, 122, 128),
    incline: ground + L(48, 108, 118, 78) + L(118, 78, 146, 66) + D(154, 60) + L(86, 92, 70, 64) + B(58, 58, 108, 70) + L(48, 108, 36, 128),
    raise: ground + L(100, 92, 100, 48) + D(100, 36) + L(100, 62, 48, 48) + L(100, 62, 152, 48) + D(48, 48, 5) + D(152, 48, 5) + L(100, 92, 80, 128) + L(100, 92, 120, 128),
    pushdown: ground + L(96, 96, 96, 46) + D(96, 34) + L(96, 58, 78, 92) + L(70, 58, 78, 92) + B(64, 52, 92, 52) + L(96, 96, 78, 128) + L(96, 96, 116, 128),
    oht: ground + L(100, 98, 100, 50) + D(100, 38) + L(100, 52, 100, 28) + D(100, 24, 6) + L(100, 98, 80, 128) + L(100, 98, 120, 128),
    dead: ground + L(108, 96, 108, 58) + D(108, 46) + L(108, 70, 86, 96) + B(78, 100, 132, 100) + L(108, 96, 86, 128) + L(108, 96, 128, 128),
    pull: ground + B(70, 22, 140, 22) + L(104, 22, 104, 70) + D(104, 82) + L(104, 96, 104, 128) + L(104, 40, 86, 62) + L(104, 40, 122, 62),
    row: ground + L(46, 96, 130, 96) + D(142, 90) + L(80, 96, 80, 70) + B(70, 66, 118, 66) + L(46, 96, 36, 120),
    face: ground + L(100, 96, 100, 50) + D(100, 38) + L(100, 58, 62, 46) + L(100, 58, 138, 46) + B(150, 40, 168, 52) + L(100, 96, 82, 128) + L(100, 96, 118, 128),
    curl: ground + L(100, 98, 100, 48) + D(100, 36) + L(100, 64, 78, 86) + D(74, 90, 5) + L(100, 98, 80, 128) + L(100, 98, 120, 128),
    hammer: ground + L(100, 98, 100, 48) + D(100, 36) + L(100, 64, 72, 88) + D(68, 92, 5) + L(100, 64, 128, 88) + L(100, 98, 80, 128) + L(100, 98, 120, 128),
    squat: ground + L(100, 108, 100, 62) + D(100, 50) + L(100, 78, 72, 108) + L(100, 78, 128, 108) + B(64, 40, 136, 40) + L(72, 108, 64, 128) + L(128, 108, 136, 128),
    rdl: ground + L(108, 70, 70, 108) + D(118, 60) + L(78, 100, 96, 78) + B(60, 112, 108, 112) + L(70, 108, 58, 128),
    legpress: ground + L(46, 110, 120, 70) + D(132, 60) + L(80, 96, 112, 78) + B(118, 70, 150, 96) + L(46, 110, 36, 128),
    legcurl: ground + L(40, 96, 120, 96) + D(132, 90) + L(100, 96, 100, 70) + B(92, 66, 124, 66),
    calf: ground + L(100, 120, 100, 52) + D(100, 40) + L(100, 120, 78, 132) + L(118, 120, 136, 132) + B(70, 132, 150, 132),
    crunch: ground + L(70, 108, 120, 78) + D(132, 68) + L(90, 96, 70, 80) + B(58, 70, 86, 58),
    stand: ground + L(100, 98, 100, 48) + D(100, 36) + L(100, 64, 74, 86) + L(100, 64, 126, 86) + L(100, 98, 80, 128) + L(100, 98, 120, 128),
  };
  return `<svg class="pose" viewBox="0 0 200 150" aria-hidden="true">${P[id] || P.stand}</svg>`;
}
function guideOrder(w) {
  return [{ phase: 'warmup', i: 0 }].concat((w.exercises || []).map((_, i) => ({ phase: 'work', i }))).concat([{ phase: 'down', i: 0 }]);
}
function guideAt(w) {
  const order = guideOrder(w), g = w.guide || { phase: 'warmup', i: 0 };
  let idx = order.findIndex(s => s.phase === g.phase && (g.phase !== 'work' || s.i === g.i));
  if (idx < 0) idx = 0;
  return { order, idx };
}
function startSession(day) {
  unlockAudio();
  const d = today(), cur = S.workouts[d];
  if (cur && cur.start && !cur.end && cur.guide && cur.guide.phase !== 'done') {
    if (cur.day !== day) toast(`Finish ${DAYNAME[cur.day]} first`);
    cur.tick = Date.now(); save(); U.gymDate = d; render(); window.scrollTo({ top: 0 }); return;
  }
  if (cur && cur.end) { cur.guide = { phase: 'done', i: 0 }; save(); U.gymDate = d; render(); return; }
  S.workouts[d] = { day, exercises: fromTemplate(day), start: Date.now(), tick: Date.now(), active: 0, guide: { phase: 'warmup', i: 0 } };
  S.gym.anchor = { date: d, idx: Math.max(0, CYCLE.indexOf(day)) };
  save(); U.gymDate = d; render(); window.scrollTo({ top: 0 });
}
function shiftGuide(dir) {
  const w = S.workouts[today()]; if (!w || !w.guide) return;
  const { order, idx } = guideAt(w);
  const next = order[Math.max(0, Math.min(order.length - 1, idx + dir))];
  w.guide = { phase: next.phase, i: next.i };
  if (!w.tick) w.tick = Date.now();
  save(); render(); window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
}
function finishSession() {
  const w = S.workouts[today()]; if (!w) return;
  w.dur = sessionMs(w); w.end = Date.now(); delete w.tick;
  w.guide = { phase: 'done', i: 0 };
  grant('workout:' + today(), 100);
  stopRest(); save(); render(); window.scrollTo({ top: 0 });
}
function renderGym() {
  const date = U.gymDate;
  if (date === today()) wakeGym();
  const w = S.workouts[date];
  const guiding = date === today() && w && w.guide && w.guide.phase && w.guide.phase !== 'done' && w.start && !w.end;
  document.body.classList.toggle('guiding', !!guiding);
  let body;
  if (date !== today()) body = renderGymLog(date, w);
  else if (w && w.guide && w.guide.phase === 'done') body = renderGymSummary(w);
  else if (guiding) body = renderGymGuide(w);
  else body = renderGymLand(w);
  const hist = date === today() && !guiding && !(w && w.guide && w.guide.phase === 'done') ? renderGymHist(date) : '';
  $('#view-gym').innerHTML = `${hintSlot('gym')}${body}${hist}`;
}
function renderGymLand(w) {
  const live = w && w.start && !w.end && w.guide && w.guide.phase !== 'done';
  const cards = ['push', 'pull', 'legs'].map(day => {
    const meta = SPLIT[day], xs = S.gym.templates[day] || [];
    const on = live && w.day === day;
    const done = w && w.end && w.day === day;
    const label = on ? 'RESUME' : done ? 'SEE SUMMARY' : 'START';
    return `<article class="gym-card${on ? ' is-live' : ''}">
      <div class="gym-kicker">${on ? 'In progress' : done ? 'Saved today' : 'Session'}</div>
      <h2>${meta.title}</h2>
      <p class="gym-muscles">${esc(meta.muscles)}</p>
      <p class="gym-line">${esc(meta.line)}</p>
      <div class="gym-meta"><span>${xs.length} exercises</span><span>About ${dayMinutes(day)} min</span></div>
      <button class="pill pill-gold gym-start" data-act="gym-start" data-day="${day}">${label}</button>
    </article>`;
  }).join('');
  const resume = live ? `<button class="gym-resume" data-act="gym-start" data-day="${w.day}">Resume ${DAYNAME[w.day]} · ${clock(sessionMs(w))}</button>` : '';
  return `<div class="gym-land">${resume}${cards}</div>`;
}
function renderGymHist(date) {
  const hist = Object.keys(S.workouts).filter(d => d !== date && loggedWorkout(S.workouts[d])).sort().reverse().slice(0, 8);
  if (!hist.length) return '';
  const n = Object.keys(S.workouts).filter(d => loggedWorkout(S.workouts[d])).length;
  return `<div class="section-h"><h3>History</h3><span>${n} workouts</span></div>
    <div class="list">${hist.map(d => { const ws = S.workouts[d]; const sets = ws.exercises.reduce((a, e) => a + e.sets.filter(loggedSet).length, 0); return `<div class="item"><div class="item-head" data-act="goto-gym" data-date="${d}">
      <div class="item-main"><div class="item-title">${dayLabel(d)}${ws.day && DAYNAME[ws.day] ? ` <span class="faint">· ${DAYNAME[ws.day]}</span>` : ''}</div><div class="item-sub">${esc(ws.exercises.filter(loggedEx).map(e => e.name).join(', '))}</div></div>
      <div class="item-val">${sets} sets${ws.dur ? ' · ' + Math.max(1, Math.round(ws.dur / 60000)) + ' min' : ''}</div>${I.chevR}</div></div>`; }).join('')}</div>`;
}
function renderGymLog(date, w) {
  const rows = (w && w.exercises || []).map(e => `<div class="item"><div class="item-head"><div class="item-main"><div class="item-title">${esc(e.name)}</div><div class="item-sub">${esc(setsSummary(e.sets.filter(loggedSet)))}</div></div></div></div>`).join('');
  return `<button class="pill pill-sm gym-back" data-act="gym-today">Today</button>
    <h2 class="gym-screen-title">${esc(longDate(date))}</h2>
    <p class="gym-screen-sub">${w && w.day && DAYNAME[w.day] ? DAYNAME[w.day] : 'Logged session'}${w && w.dur ? ' · ' + Math.max(1, Math.round(w.dur / 60000)) + ' min' : ''}</p>
    ${rows ? `<div class="list">${rows}</div>` : '<div class="list"><div class="empty"><b>Nothing logged this day</b></div></div>'}`;
}
function blockList(title, items, cls) {
  return `<section class="g-block"><h3>${title}</h3><ol class="${cls}">${items.map(t => `<li>${esc(t)}</li>`).join('')}</ol></section>`;
}
function renderGymGuide(w) {
  const { order, idx } = guideAt(w);
  const step = order[idx], pct = Math.round((idx / Math.max(1, order.length - 1)) * 100);
  const bar = `<div class="g-top"><button class="pill pill-sm" data-act="gym-land">Close</button><div class="g-count">${idx + 1} of ${order.length}</div></div>
    <div class="g-bar" aria-hidden="true"><i style="width:${pct}%"></i></div>`;
  const nav = `<div class="g-nav"><button class="pill" data-act="gym-prev"${idx === 0 ? ' disabled' : ''}>Previous</button><button class="pill pill-gold" data-act="gym-next">${step.phase === 'down' ? 'Finish' : 'Next'}</button></div>`;
  if (step.phase === 'warmup') {
    return `${bar}<p class="g-kicker">Warm up · ${DAYNAME[w.day]}</p><h2 class="gym-screen-title">Get ready</h2>
      <p class="g-lead">About 8 minutes. The easy sets are practice, not working sets, so they are not logged.</p>
      ${poseSVG('stand')}
      <ol class="g-steps">${(WARM[w.day] || []).map(t => `<li>${esc(t)}</li>`).join('')}</ol>
      <p class="g-credit">Form diagrams are drawn for PEAK and stored in the app.</p>${nav}`;
  }
  if (step.phase === 'down') {
    return `${bar}<p class="g-kicker">Cool down · ${DAYNAME[w.day]}</p><h2 class="gym-screen-title">Stretch</h2>
      <p class="g-lead">About 5 minutes. Easy range, no bouncing. Breathe out as you settle into each one.</p>
      ${poseSVG('stand')}
      <ol class="g-steps">${(DOWN[w.day] || []).map(([h, t]) => `<li><b>${esc(h)}.</b> ${esc(t)}</li>`).join('')}</ol>${nav}`;
  }
  const e = w.exercises[step.i], c = coachOf(e) || { name: e.name, muscles: 'Your lift', repText: (e.sets[0] && e.sets[0].target) || '', rest: e.rest, pose: 'stand', how: ['Set up so you can repeat the same position every rep.', 'Move through a range you can control.', 'Breathe out on the effort and in as the weight comes back.'], cues: ['Same setup every set.', 'Control the lowering.'], mistakes: ['Bouncing the weight.', 'Holding one breath for the whole set.'], easier: 'Use less weight.', harder: 'Slow the lowering to three seconds.' };
  const pres = c.repText ? `${c.sets || e.sets.length} × ${c.repText}` : `${e.sets.length} sets`;
  const sets = `<div class="sets guide-sets" data-ex="${e.id}">${e.sets.map((s, i) => `<div class="set${s.done ? ' is-done' : ''}" data-set="${s.id}"><button class="set-check${s.done ? ' on' : ''}" data-act="set-done" aria-label="Set ${i + 1} done"><span>${i + 1}</span>${I.check}</button>
    <input class="field" data-sf="reps" inputmode="numeric" value="${num(s.reps) || ''}" placeholder="${s.target || 'reps'}" aria-label="Reps">
    <span class="x">×</span>
    <div class="unit-wrap"><input class="field" data-sf="weight" inputmode="decimal" value="${num(s.weight) || ''}" placeholder="0" aria-label="Weight"><span>kg</span></div></div>`).join('')}</div>`;
  return `${bar}<p class="g-kicker">${DAYNAME[w.day]} · ${step.i + 1} of ${w.exercises.length}</p><h2 class="gym-screen-title">${esc(e.name)}</h2>
    <p class="g-muscles">${esc(c.muscles)}</p>
    <div class="g-pres"><b>${esc(pres)}</b><span>${esc(restLabel(num(e.rest) || c.rest || 90))}</span></div>
    <p class="g-last">${esc(lastLine(e.name, today()))}</p>
    ${poseSVG(c.pose)}
    ${blockList('How to do it', c.how, 'g-steps')}
    ${blockList('Form cues', c.cues, 'g-cues')}
    ${blockList('Avoid', c.mistakes, 'g-bad')}
    <section class="g-block g-swap"><h3>Easier / harder</h3><p><b>Easier.</b> ${esc(c.easier)}</p><p><b>Harder.</b> ${esc(c.harder)}</p></section>
    <section class="g-block"><h3>Log the sets</h3><p class="g-lead">Tick a set and the rest timer starts. Weight and reps are saved for next time.</p>${sets}</section>
    <p class="g-credit">Form diagrams are drawn for PEAK and stored in the app.</p>${nav}`;
}
function renderGymSummary(w) {
  const sets = w.exercises.reduce((a, e) => a + e.sets.filter(loggedSet).length, 0);
  const planned = w.exercises.reduce((a, e) => a + e.sets.length, 0);
  const vol = w.exercises.reduce((a, e) => a + volume(e.sets.filter(loggedSet)), 0);
  const mins = Math.max(1, Math.round((w.dur || sessionMs(w)) / 60000));
  const rows = w.exercises.map(e => {
    const done = e.sets.filter(loggedSet), t = topSet(done);
    const bit = done.length ? (t && num(t.weight) ? `${fmt(num(t.weight))} kg × ${num(t.reps)}` : setsSummary(done)) : 'Skipped';
    return `<div class="item"><div class="item-head"><div class="item-main"><div class="item-title">${esc(e.name)}</div><div class="item-sub">${done.length}/${e.sets.length} sets</div></div><div class="item-val">${esc(bit)}</div></div></div>`;
  }).join('');
  return `<p class="g-kicker">Finished · ${DAYNAME[w.day] || ''}</p><h2 class="gym-screen-title">Session saved</h2>
    <div class="panel stats"><div class="stat"><div class="stat-v">${mins}</div><div class="stat-l">Minutes</div></div>
      <div class="stat"><div class="stat-v">${sets}<span class="stat-of">/${planned}</span></div><div class="stat-l">Sets</div></div>
      <div class="stat"><div class="stat-v">${vol >= 10000 ? fmt(vol / 1000, 1) + 'k' : fmtInt(vol)}</div><div class="stat-l">Volume kg</div></div></div>
    <div class="list">${rows}</div>
    <button class="pill pill-gold gym-start" data-act="gym-land">Back to gym</button>`;
}
function refreshExerciseHead(item, e) {
  if (!e) return;
  const badge = item && $('.badge-n', item);
  if (badge) badge.textContent = e.sets.filter(loggedSet).length + '/' + e.sets.length;
  const sub = item && $('.item-sub', item);
  if (sub) sub.textContent = setsSummary(e.sets) + ' · ' + restLabel(num(e.rest) || 180);
  const val = item && $('.item-val', item);
  const t = topSet(e.sets);
  if (val) val.textContent = t && num(t.weight) ? fmt(num(t.weight)) + ' kg' : '';
}
function addExercise(date, name) {
  name = titleCase(name); if (!name) return null;
  const w = ensureWorkout(date);
  const keys = nameKeys(name);
  let e = w.exercises.find(x => keys.has(exKey(x.name)));
  if (!e) {
    const known = libFor(name), tp = tplFor(name);
    e = { id: uid(), key: known ? (Object.keys(LIB).find(k => LIB[k] === known) || '') : '', name: known ? known.name : name, rest: tp ? num(tp.rest) || 180 : (known ? known.rest : 180), note: tp ? tp.note || '' : '', sets: [] };
    w.exercises.push(e);
  }
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
    <div class="backup"><button class="pill pill-sm pill-ghost" data-act="export">Back up data</button><button class="pill pill-sm pill-ghost" data-act="import">Restore backup</button></div>
    <div class="device-settings"><span>Settings</span><button type="button" class="switch-link" data-act="switch-person">Switch person</button></div>`;
}

function render() {
  if (U.tab !== 'gym') document.body.classList.remove('guiding');
  if (U.tab === 'meals') renderMeals();
  else if (U.tab === 'shop') renderShop();
  else if (U.tab === 'gym') renderGym();
  else renderProgress();
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
  const act = a.dataset.act, item = a.closest('.item,.card,[data-ex]');
  const mealId = item && item.dataset.meal, exId = item && item.dataset.ex;
  switch (act) {
    case 'tick': {
      e.stopPropagation();
      const m = findMeal(U.mealsDate, mealId); m.done = !m.done;
      if (m.done) grant('meal:' + U.mealsDate + ':' + m.id, 25);
      noteDay(U.mealsDate);
      save();
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
    case 'eye': {
      e.stopPropagation();
      const id = a.closest('[data-meal]') && a.closest('[data-meal]').dataset.meal;
      if (id) openEye(id); break;
    }
    case 'sum': { const box = $('#mealSummary'); U.sumOpen = !U.sumOpen; box.classList.toggle('open', U.sumOpen); break; }
    case 'nudge': dismissHint(a.dataset.id); break;
    case 'shop-filter': {
      const store = a.dataset.store || 'all'; if (store === U.shopFilter) break;
      U.shopFilter = store; render(); break;
    }
    case 'shop-tick': {
      const row = a.closest('.srow'), list = row.dataset.list, id = row.dataset.sid, v = !isGot(list, id);
      setGot(list, id, v);
      if (v) grant('shop:' + list + ':' + id, 10);
      save(); row.classList.toggle('done', v);
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
        if (!num(s.reps)) s.reps = (ref && num(ref.reps)) || s.target || (tp && num(tp.reps)) || '';
        if (U.gymDate === today() && !w.start) { w.start = Date.now(); delete w.end; delete w.dur; started = true; }
        const left = getWorkout(U.gymDate).exercises.some(x => x.sets.some(y => !y.done));
        if (left) startRest(num(ex.rest) || 180, ex.name); else stopRest();
        grant('set:' + U.gymDate + ':' + s.id, 10);
      } else if (REST && REST.name === ex.name) stopRest();
      save();
      if (started) { render(); toast('Workout started, timer running'); break; }
      a.classList.toggle('on', s.done); row.classList.toggle('is-done', s.done);
      if (s.done) { a.classList.remove('pop'); void a.offsetWidth; a.classList.add('pop'); }
      $('[data-sf="reps"]', row).value = num(s.reps) || ''; $('[data-sf="weight"]', row).value = num(s.weight) || '';
      refreshExerciseHead(item, ex); break;
    }
    case 'gym-start': startSession(a.dataset.day); break;
    case 'gym-next': {
      const gw = S.workouts[today()];
      if (gw && gw.guide && gw.guide.phase === 'down') finishSession();
      else shiftGuide(1); break;
    }
    case 'gym-prev': shiftGuide(-1); break;
    case 'gym-finish': finishSession(); break;
    case 'gym-land': {
      const gw = S.workouts[today()];
      if (gw && gw.guide && gw.guide.phase === 'done') gw.guide = null;
      save(); render(); window.scrollTo({ top: 0 }); break;
    }
    case 'gym-today': U.gymDate = today(); render(); window.scrollTo({ top: 0 }); break;
    case 'session-start': {
      unlockAudio();
      const w = ensureWorkout(today()); w.start = Date.now(); delete w.end; delete w.dur; U.open.delete('card-session');
      commit(); toast('Workout started, timer running'); break;
    }
    case 'session-finish': {
      e.stopPropagation();
      const w = ensureWorkout(today()); w.end = Date.now(); w.dur = w.end - (w.start || w.end); grant('workout:' + today(), 100); stopRest();
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
    case 'switch-person': askSwitch(); break;
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
  if (!started && t >= G - 20 && t < G + 45) add('soon', t < G ? `Gym in ${G - t} min. Open Gym and tap Start` : 'Gym time. Open Gym and tap Start');
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
  if (tab === 'shop') return [];
  if (tab === 'meals' && U.mealsDate !== today()) return [];
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
function startRest(sec, name) {
  REST = { end: Date.now() + sec * 1000, total: sec, name };
  localStorage.setItem(RKEY, JSON.stringify(REST)); paintRest();
  if (navigator.vibrate) { try { navigator.vibrate(25); } catch (_) {} }
}
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
const TABS = ['meals', 'shop', 'gym', 'progress'];
function setTab(tab, initial) {
  closeEye();
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
  const mt = $('meta[name="theme-color"]'); if (mt) mt.setAttribute('content', t === 'light' ? '#ffffff' : '#000000');
  if (animate) { clearTimeout(applyTheme._t); applyTheme._t = setTimeout(() => html.classList.remove('theme-fade'), 340); }
}
$('#themeBtn').addEventListener('click', () => {
  const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(t, true);
  if (ACTIVE && STORE.profiles[ACTIVE]) { STORE.profiles[ACTIVE].theme = t; persistStore(); }
});

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
  const onList = U.tab === 'shop';
  if (shop.x && shop.score >= 0.5 && (explicit || onList || !meal.x || meal.score < 0.5 || shop.score > meal.score + 0.05)) return { kind: 'shop', x: shop.x };
  if (meal.x && meal.score >= 0.5) return { kind: 'meal', x: meal.x };
  return { kind: null, q: q2 };
}
function shopResult(it, v) { setGot(it.list, it.id, v); U.open.add('shop-' + it.list); return { msg: `${v ? 'Ticked off' : 'Unticked'} ${it.name}`, tab: 'shop' }; }
const KNOWN_MEAS = ['chest', 'arms', 'arm', 'bicep', 'biceps', 'waist', 'hips', 'hip', 'thigh', 'thighs', 'neck', 'shoulders', 'shoulder', 'calves', 'calf', 'forearm', 'forearms', 'body fat', 'bodyfat', 'glutes', 'stomach', 'belly'];
const NUM = '(\\d+(?:\\.\\d+)?)';
const cleanExName = s => s.replace(/\b(i|just|did|done|have|log|logged|add|added|record|recorded|today|set|for|on|of|with|at|do|and|then|my|some|exercise)\b/g, ' ').replace(/\s+/g, ' ').trim();

/* Returns { msg, tab } after applying, or throws/returns null if not understood */
function interpret(raw) {
  const s = normalise(raw); if (!s) return null;
  let m;

  // Theme
  if ((m = s.match(/\b(dark|light)\s*(mode|theme)\b/))) { applyTheme(m[1], true); if (ACTIVE && STORE.profiles[ACTIVE]) { STORE.profiles[ACTIVE].theme = m[1]; persistStore(); } return { msg: `Switched to ${m[1]} mode` }; }

  // Shopping: "add to shopping oats", "add oats to my shopping list", "shopping list add oats"
  if ((m = s.match(/^(?:add|put|stick|need)\s+(?:to|on|onto|in)\s+(?:the\s+|my\s+)?(?:shopping(?:\s+list)?|list)\s+(.+)$/) || s.match(/^(?:add|put|stick)\s+(.+?)\s+(?:to|on|onto|in)\s+(?:the\s+|my\s+)?(?:shopping(?:\s+list)?|list|trolley|basket)$/) || s.match(/^shopping(?:\s+list)?\s+(?:add\s+)?(.+)$/))) {
    const msg = addShopItem(m[1]); U.open.add('shop-extras'); return { msg, tab: 'shop' };
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
  if (U.tab === 'shop') { const it = bestMatch(s, allShopItems(), shopName, 0.8); if (it) return shopResult(it, !isGot(it.list, it.id)); }
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
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (sheet.classList.contains('open')) closeSheet();
  if ($('#eyePop').classList.contains('open')) closeEye();
  if ($('#xpSheet').classList.contains('open')) closeXp();
});

/* ================= Meal eye overlay ================= */
let eyeFrom = null, eyeDrag = null;
function eyeSteps(g, which) {
  const at = g.boxAt || [];
  return g.steps.filter((_, i) => which === 'box' ? at.includes(i) : !at.includes(i));
}
function openEye(id) {
  const meal = findMeal(U.mealsDate, id); if (!meal) return;
  const g = mealGuide(meal);
  const card = document.querySelector(`[data-meal="${id}"]`);
  const pop = $('#eyePop'), panel = $('#eyeCard');
  const cook = g ? eyeSteps(g, 'cook') : [];
  const boxes = g ? eyeSteps(g, 'box') : [];
  const keep = g && !(g.boxAt || []).length ? g.safety : [];
  panel.innerHTML = `<div class="eye-bar"><div class="card-kicker">Meal</div><button type="button" class="eye-x" data-eye-close>${I.x}<span>Close</span></button></div>
    <div class="eye-scroll" id="eyeScroll">
      ${g ? `<img class="meal-photo" src="${g.photo}" alt="${esc(g.alt)}">` : ''}
      <h2 id="eyeTitle">${esc(meal.name)}</h2>
      ${g ? `<p class="g-lead">${esc(g.why)}</p>` : `<p class="g-lead">${esc(meal.items || 'No cook guide for this one.')}</p>`}
      ${g ? `<section class="g-block"><h3>Ingredients</h3>
        <div class="ing-table"><div class="ing-h"><span>Item</span><span>One portion</span><span>One cook</span></div>
        ${g.ings.map(([n, a, b]) => `<div class="ing-r"><span>${esc(n)}</span><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join('')}</div></section>
        <section class="g-block"><h3>How to cook it</h3><ol class="g-steps">${cook.map(([t, d]) => `<li><b>${esc(t)}.</b> ${esc(d)}</li>`).join('') || '<li>Nothing to cook.</li>'}</ol></section>
        <section class="g-block"><h3>Boxes</h3><ol class="g-steps">${boxes.map(([t, d]) => `<li><b>${esc(t)}.</b> ${esc(d)}</li>`).join('') || keep.map(s => `<li>${esc(s)}</li>`).join('') || '<li>Nothing to box up.</li>'}</ol></section>
        ${g.safety && (g.boxAt || []).length ? `<div class="guide-safety"><b>Food safety</b><ul>${g.safety.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
        <p class="g-credit">Photo: ${esc(g.credit)} · ${esc(g.licence)}</p>` : ''}
    </div>`;
  const r = card ? card.getBoundingClientRect() : { top: 120, left: 16, width: 300, height: 88 };
  eyeFrom = r;
  pop.hidden = false;
  panel.style.transition = 'none';
  panel.style.transform = 'none';
  panel.style.top = r.top + 'px';
  panel.style.left = r.left + 'px';
  panel.style.width = r.width + 'px';
  panel.style.height = Math.max(72, Math.min(r.height, 140)) + 'px';
  panel.style.opacity = '0.55';
  pop.classList.add('open');
  const go = () => {
    const wide = Math.min(window.innerWidth - 24, 496);
    panel.style.transition = '';
    panel.style.top = '8vh';
    panel.style.left = ((window.innerWidth - wide) / 2) + 'px';
    panel.style.width = wide + 'px';
    panel.style.height = '80vh';
    panel.style.opacity = '1';
  };
  if (reduceMotion()) go();
  else requestAnimationFrame(() => requestAnimationFrame(go));
  const sc = $('#eyeScroll'); if (sc) sc.scrollTop = 0;
}
function closeEye() {
  const pop = $('#eyePop'), panel = $('#eyeCard');
  if (!pop || !pop.classList.contains('open')) return;
  const done = () => { pop.classList.remove('open'); pop.hidden = true; panel.style.transform = 'none'; };
  if (!eyeFrom || reduceMotion()) { done(); return; }
  panel.style.top = eyeFrom.top + 'px';
  panel.style.left = eyeFrom.left + 'px';
  panel.style.width = eyeFrom.width + 'px';
  panel.style.height = Math.max(72, Math.min(eyeFrom.height, 140)) + 'px';
  panel.style.opacity = '0';
  setTimeout(done, 320);
}
$('#eyePop').addEventListener('click', e => { if (e.target.hasAttribute('data-eye-close') || e.target.closest('[data-eye-close]')) closeEye(); });
$('#eyeCard').addEventListener('pointerdown', e => {
  if (e.target.closest('button, a, input, textarea')) return;
  eyeDrag = { y: e.clientY, pointer: e.pointerId };
});
$('#eyeCard').addEventListener('pointermove', e => {
  if (!eyeDrag || e.pointerId !== eyeDrag.pointer) return;
  const dy = Math.max(0, e.clientY - eyeDrag.y);
  $('#eyeCard').style.transform = `translateY(${dy}px)`;
});
$('#eyeCard').addEventListener('pointerup', e => {
  if (!eyeDrag || e.pointerId !== eyeDrag.pointer) return;
  const dy = e.clientY - eyeDrag.y;
  eyeDrag = null;
  if (dy > 90) closeEye();
  else $('#eyeCard').style.transform = '';
});
$('#eyeCard').addEventListener('pointercancel', () => { eyeDrag = null; const c = $('#eyeCard'); if (c) c.style.transform = ''; });

/* ================= Boot ================= */
bindChartScrub(views);
setTab(TABS.includes(U.tab) ? U.tab : 'meals', true);
// Roll the day over if the app stays open past midnight
let bootDay = today();
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { parkGym(); return; }
  wakeGym();
  if (today() !== bootDay) { if (U.mealsDate === bootDay) U.mealsDate = today(); if (U.gymDate === bootDay) U.gymDate = today(); bootDay = today(); render(); }
  else refreshHint();
  tick();
});
window.addEventListener('pagehide', parkGym);
function profileInitials(name) {
  if (name === 'Adnan') return 'Ad';
  if (name === 'Adam') return 'Am';
  if (name === 'Ismail') return 'Is';
  return String(name || '?').slice(0, 2);
}
function isTrainer() {
  const p = ACTIVE && STORE.profiles[ACTIVE];
  return !!(p && p.role === 'trainer');
}
function paintProfile() {
  const trainer = isTrainer();
  document.body.classList.toggle('is-trainer', trainer);
  const panel = $('#trainer');
  if (panel) panel.hidden = !trainer;
}
function showWho(opts) {
  const root = $('#who'); if (!root) return;
  $('#whoCards').innerHTML = ['adnan', 'adam'].map(id => {
    const p = STORE.profiles[id];
    return `<button type="button" class="who-card" data-profile="${id}"><span class="who-av">${profileInitials(p.name)}</span><span class="who-copy"><b>${esc(p.name)}</b></span></button>`;
  }).join('');
  const cancel = $('#whoCancel');
  if (cancel) cancel.hidden = !(opts && opts.cancel && STORE.picked);
  $('#signIn').hidden = true;
  document.body.classList.remove('gate-wait');
  root.hidden = false;
}
function chooseProfile(id) {
  const next = STORE.profiles[id]; if (!next) return;
  if (ACTIVE && ACTIVE !== id && STORE.profiles[ACTIVE] && STORE.profiles[ACTIVE].role === 'athlete') {
    STORE.profiles[ACTIVE].data = S;
    STORE.profiles[ACTIVE].theme = document.documentElement.getAttribute('data-theme') || 'dark';
    STORE.profiles[ACTIVE].updatedAt = new Date().toISOString();
  }
  stopRest();
  STORE.picked = true;
  STORE.activeId = id;
  ACTIVE = id;
  applyTheme(next.theme || 'dark', false);
  $('#who').hidden = true;
  $('#signIn').hidden = true;
  document.body.classList.remove('gate-wait');
  if (next.role === 'trainer') {
    persistStore();
    paintProfile();
    renderTrainer();
    return;
  }
  document.body.classList.remove('is-trainer');
  const panel = $('#trainer'); if (panel) panel.hidden = true;
  S = normalizeAthlete(next.data || {});
  next.data = S;
  persistStore();
  paintProfile();
  U.mealsDate = today();
  U.gymDate = today();
  setTab('meals', true);
  paintXp();
}
function askSwitch() {
  if (SYNC) showSignIn({ cancel: true });
  else showWho({ cancel: true });
}
let SYNC = null, SYNC_USER = null, syncing = false, syncTimer = null;
function setSyncStatus(text) {
  const note = $('#syncNote'); if (!note || !SYNC) return;
  note.hidden = !text;
  note.textContent = text || '';
}
function syncToken() { return localStorage.getItem('peakfit.sync.token') || ''; }
async function api(path, opts) {
  if (!SYNC) return null;
  const headers = { 'Content-Type': 'application/json' };
  const token = syncToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  try {
    const res = await fetch(SYNC.workerUrl + path, { method: (opts && opts.method) || 'GET', headers, body: opts && opts.body ? JSON.stringify(opts.body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409) return data;
    if (!res.ok) return { error: data.error || 'Request failed', status: res.status };
    return data;
  } catch (_) { return null; }
}
function showSignIn(opts) {
  const form = $('#signIn'); if (!form) return;
  $('#who').hidden = true;
  form.hidden = false;
  document.body.classList.remove('gate-wait');
  const out = $('#signOutBtn');
  if (out) out.hidden = true;
  const cancel = $('#signCancel');
  if (cancel) cancel.hidden = !(opts && opts.cancel && STORE.picked);
  const err = $('#signInErr'); if (err) err.textContent = '';
}
async function signIn(username, pin) {
  const err = $('#signInErr');
  if (err) err.textContent = '';
  const data = await api('/api/login', { method: 'POST', body: { username, pin } });
  if (!data || !data.token || !data.user) {
    if (err) err.textContent = (data && data.error) || 'Can’t reach the server. You can keep using the phone offline after you have signed in once.';
    return;
  }
  localStorage.setItem('peakfit.sync.token', data.token);
  await enterAccount(data.user);
}
async function enterAccount(user) {
  SYNC_USER = user;
  $('#signIn').hidden = true;
  setSyncStatus('Signed in');
  if (user.role === 'trainer') {
    if (ACTIVE && STORE.profiles[ACTIVE] && STORE.profiles[ACTIVE].role === 'athlete') {
      STORE.profiles[ACTIVE].data = S;
      STORE.profiles[ACTIVE].theme = document.documentElement.getAttribute('data-theme') || 'dark';
    }
    STORE.picked = true;
    STORE.activeId = 'ismail';
    ACTIVE = 'ismail';
    if (STORE.profiles.ismail) STORE.profiles.ismail.theme = document.documentElement.getAttribute('data-theme') || STORE.profiles.ismail.theme || 'dark';
    persistStore();
    applyTheme((STORE.profiles.ismail && STORE.profiles.ismail.theme) || 'dark', false);
    $('#who').hidden = true;
    document.body.classList.remove('gate-wait');
    paintProfile();
    renderTrainer();
    return;
  }
  if (STORE.profiles[user.id]) chooseProfile(user.id);
  await reconcile();
}
async function reconcile() {
  if (!SYNC || !SYNC_USER || SYNC_USER.role !== 'athlete' || !ACTIVE) return;
  if (!navigator.onLine) { setSyncStatus('Offline. Saved on this phone'); return; }
  setSyncStatus('Syncing…');
  const remote = await api('/api/state');
  if (!remote || remote.error) { setSyncStatus('Offline. Saved on this phone'); return; }
  const local = STORE.profiles[ACTIVE];
  if (!remote.state) { await pushState(0, true); return; }
  const localAt = Date.parse(local.updatedAt || 0) || 0;
  const remoteAt = Date.parse(remote.state.updatedAt || 0) || 0;
  if (remoteAt > localAt) { applyRemote(remote.state); setSyncStatus('Synced'); return; }
  await pushState(remote.state.rev, true);
}
function applyRemote(state) {
  syncing = true;
  S = normalizeAthlete(state.data || {});
  const p = STORE.profiles[ACTIVE];
  p.data = S;
  p.updatedAt = state.updatedAt || p.updatedAt;
  p.syncRev = state.rev || 0;
  if (state.theme) { p.theme = state.theme; applyTheme(state.theme, false); }
  persistStore();
  render();
  paintXp();
  syncing = false;
}
async function pushState(baseRev, retry) {
  if (!SYNC || !ACTIVE || !STORE.profiles[ACTIVE] || STORE.profiles[ACTIVE].role !== 'athlete') return;
  if (!navigator.onLine) { setSyncStatus('Offline. Saved on this phone'); return; }
  const local = STORE.profiles[ACTIVE];
  const res = await api('/api/state', { method: 'PUT', body: { baseRev, updatedAt: local.updatedAt, localDate: today(), theme: local.theme || 'dark', data: local.data } });
  if (!res || (res.error && !res.conflict)) { setSyncStatus('Offline. Saved on this phone'); return; }
  if (res.conflict && res.state) {
    const remoteAt = Date.parse(res.state.updatedAt || 0) || 0;
    const localAt = Date.parse(local.updatedAt || 0) || 0;
    if (retry && localAt > remoteAt) { await pushState(res.state.rev, false); return; }
    applyRemote(res.state);
    setSyncStatus('Synced');
    return;
  }
  if (res.error) { setSyncStatus(res.error); return; }
  if (res.rev) local.syncRev = res.rev;
  persistStore();
  setSyncStatus('Synced');
}
function scheduleSync() {
  if (!SYNC || !SYNC_USER || SYNC_USER.role !== 'athlete' || syncing) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { const rev = (STORE.profiles[ACTIVE] && STORE.profiles[ACTIVE].syncRev) || 0; pushState(rev, true); }, 1200);
}
function dayTitle(day) { return DAYNAME[day] || day || 'Workout'; }
function prettyDate(iso) {
  const s = String(iso || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? shortDate(s) : '';
}
function mealsDone(days, date) {
  const meals = days && days[date] && Array.isArray(days[date].meals) ? days[date].meals : [];
  return meals.length > 0 && meals.every(m => m && m.done);
}
function workoutList(workouts) {
  if (!workouts || typeof workouts !== 'object') return [];
  const out = [];
  Object.keys(workouts).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().reverse().forEach(date => {
    const w = workouts[date];
    if (!w || !Array.isArray(w.exercises)) return;
    let sets = 0, volume = 0;
    w.exercises.forEach(ex => (ex.sets || []).forEach(s => {
      if (!s || (!s.done && !(num(s.weight) > 0))) return;
      sets++;
      volume += (num(s.reps) || 0) * (num(s.weight) || 0);
    }));
    if (sets || w.end) out.push({ date, day: w.day || '', sets, volume: Math.round(volume) });
  });
  return out.slice(0, 4);
}
function summarizeAthlete(raw) {
  const data = normalizeAthlete(raw || {});
  const xp = data.xp.total || 0;
  const date = today();
  const dayMeals = (data.days[date] && data.days[date].meals) || [];
  let streak = 0, cursor = mealsDone(data.days, date) ? date : addDays(date, -1);
  while (cursor && mealsDone(data.days, cursor) && streak < 60) { streak++; cursor = addDays(cursor, -1); }
  const workouts = workoutList(data.workouts);
  const bw = sortByDate(data.bodyweight || []);
  const last = bw.length ? bw[bw.length - 1] : null;
  const anyMeal = Object.keys(data.days || {}).some(d => ((data.days[d] && data.days[d].meals) || []).some(m => m && m.done));
  return {
    level: levelState(xp).level, xp, streak,
    meals: { done: dayMeals.filter(m => m && m.done).length, total: dayMeals.length },
    workouts, bodyweight: last && num(last.value) > 0 ? { value: last.value, date: last.date } : null,
    logged: xp > 0 || anyMeal || workouts.length > 0 || !!(last && num(last.value) > 0),
  };
}
function localPeople() {
  return ['adnan', 'adam'].map(id => Object.assign({ id, name: STORE.profiles[id].name }, summarizeAthlete(STORE.profiles[id].data)));
}
function rosterLogged(a) {
  if (!a) return false;
  const meals = a.meals || {};
  return !!(a.xp > 0 || a.streak || meals.done || (a.workouts && a.workouts.length) || a.bodyweight || (a.lastWorkout && a.lastWorkout.sets));
}
function trainerCard(a) {
  const meals = a.meals || {};
  const mealLine = meals.total ? meals.done + ' of ' + meals.total + ' meals ticked today' : 'No meals ticked today';
  const list = (a.workouts && a.workouts.length) ? a.workouts : (a.lastWorkout ? [a.lastWorkout] : []);
  const setsLabel = n => n === 1 ? '1 set' : (n || 0) + ' sets';
  const wos = list.map(w => `<li><b>${esc(prettyDate(w.date) || w.date || '')}</b> · ${esc(dayTitle(w.day))} · ${setsLabel(w.sets || 0)} · ${fmtInt(w.volume || 0)} kg</li>`).join('');
  const bw = a.bodyweight ? `<p>Body weight ${fmt(a.bodyweight.value)} kg${a.bodyweight.date ? ' · ' + esc(prettyDate(a.bodyweight.date)) : ''}</p>` : '';
  return `<article class="trainer-card"><h2>${esc(a.name)}</h2>
    <p><b>Level ${a.level || 1}</b> · ${fmtInt(a.xp || 0)} XP</p>
    <p>${a.streak ? a.streak + ' day streak' : 'No streak yet'}</p>
    <p>${mealLine}</p>
    ${wos ? `<p class="trainer-k">Workouts</p><ul class="trainer-wos">${wos}</ul>` : '<p>No workouts saved</p>'}
    ${bw}</article>`;
}
function quietCard(name, text) {
  return `<article class="trainer-card"><h2>${esc(name)}</h2><p>${text}</p></article>`;
}
function paintLocalRoster() {
  const note = $('#trainerNote'), box = $('#trainerRoster');
  if (!box) return;
  const people = localPeople();
  if (!people.some(p => p.logged)) {
    if (note) { note.hidden = false; note.textContent = 'Nothing to track on this phone yet. Adnan’s and Adam’s progress fills in here once sync is on.'; }
    box.innerHTML = '';
    return;
  }
  if (note) { note.hidden = false; note.textContent = 'Showing what is saved on this phone. The other person’s progress fills in once sync is on.'; }
  box.innerHTML = people.map(p => p.logged ? trainerCard(p) : quietCard(p.name, 'Nothing on this phone yet. This fills in once sync is on.')).join('');
}
function renderTrainer() {
  const panel = $('#trainer'); if (!panel) return;
  document.body.classList.add('is-trainer');
  document.body.classList.remove('gate-wait');
  panel.hidden = false;
  $('#who').hidden = true;
  $('#signIn').hidden = true;
  if (SYNC && SYNC_USER && SYNC_USER.role === 'trainer' && navigator.onLine) { loadRoster(); return; }
  paintLocalRoster();
}
async function loadRoster() {
  const note = $('#trainerNote'), box = $('#trainerRoster');
  if (!box) return;
  if (!navigator.onLine) { paintLocalRoster(); return; }
  const data = await api('/api/roster');
  if (!data || !data.athletes) {
    if (note) { note.hidden = false; note.textContent = 'Can’t reach the server. This fills in once you are back online.'; }
    const people = localPeople();
    box.innerHTML = people.some(p => p.logged) ? people.map(p => p.logged ? trainerCard(p) : quietCard(p.name, 'Nothing on this phone yet.')).join('') : '';
    return;
  }
  const athletes = data.athletes.map(a => Object.assign({}, a, { logged: rosterLogged(a) }));
  if (!athletes.some(a => a.logged)) {
    if (note) { note.hidden = false; note.textContent = 'Nothing synced yet. This fills in once Adnan and Adam sign in on their phones.'; }
    box.innerHTML = '';
    return;
  }
  if (note) note.hidden = true;
  box.innerHTML = athletes.map(a => a.logged ? trainerCard(a) : quietCard(a.name, 'Nothing synced yet.')).join('');
}
function rememberOffline() {
  if (!STORE.picked || !ACTIVE || !STORE.profiles[ACTIVE]) return false;
  const p = STORE.profiles[ACTIVE];
  SYNC_USER = { id: p.id, username: p.id, name: p.name, role: p.role };
  setSyncStatus('Offline. Saved on this phone');
  if (p.role === 'trainer') renderTrainer();
  return true;
}
async function initSync() {
  let cfg = null;
  try {
    const res = await fetch('sync.json', { cache: 'no-store' });
    if (res.ok) cfg = await res.json();
  } catch (_) {}
  if (!cfg || !cfg.enabled || !cfg.workerUrl) {
    if (!STORE.picked) showWho();
    return;
  }
  SYNC = { workerUrl: String(cfg.workerUrl).replace(/\/$/, '') };
  window.addEventListener('online', () => {
    if (SYNC_USER && SYNC_USER.role === 'athlete') reconcile();
    if (SYNC_USER && SYNC_USER.role === 'trainer') loadRoster();
  });
  const token = syncToken();
  if (token && !navigator.onLine) {
    if (!rememberOffline() && !STORE.picked) showSignIn();
    return;
  }
  if (token && navigator.onLine) {
    const me = await api('/api/me');
    if (me && me.user) { await enterAccount(me.user); return; }
    if (me && me.status === 401) localStorage.removeItem('peakfit.sync.token');
    else if (rememberOffline()) return;
  }
  if (!STORE.picked) showSignIn();
}
$('#signInForm').addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  signIn(String(fd.get('username') || ''), String(fd.get('pin') || ''));
});
$('#signOutBtn').addEventListener('click', () => {
  const token = syncToken();
  localStorage.removeItem('peakfit.sync.token');
  SYNC_USER = null;
  if (token) api('/api/logout', { method: 'POST' });
  setSyncStatus('Not signed in');
  showSignIn({ cancel: true });
});
$('#who').addEventListener('click', e => { const b = e.target.closest('[data-profile]'); if (b) chooseProfile(b.dataset.profile); });
$('#whoTrainer').addEventListener('click', () => chooseProfile('ismail'));
$('#whoCancel').addEventListener('click', () => { $('#who').hidden = true; });
$('#signCancel').addEventListener('click', () => {
  $('#signIn').hidden = true;
  if (isTrainer()) renderTrainer();
});
$('#trainerSwitch').addEventListener('click', askSwitch);
if (STORE.picked) {
  applyTheme((STORE.profiles[ACTIVE] && STORE.profiles[ACTIVE].theme) || 'dark', false);
  paintProfile();
  if (isTrainer()) renderTrainer();
} else document.body.classList.add('gate-wait');
paintRest();
paintXp();
$('#xpBar').addEventListener('click', openXp);
$('#xpSheet').addEventListener('click', e => { if (e.target.hasAttribute('data-xp-close') || e.target.closest('[data-xp-close]')) closeXp(); });
$('#lvlOk').addEventListener('click', () => { const el = $('#lvlUp'); el.classList.remove('show'); el.hidden = true; });
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
initSync();

// Exposed for testing in the console
window.PEAK = { interpret: t => { const r = runCommand(t); return r; }, normalise, get data() { return S; },
  hints: at => computeHints(at ? new Date(at) : now()).map(h => h.id + ': ' + h.text),
  setClock: at => { CLOCK = at ? new Date(at).getTime() - Date.now() : 0; U.mealsDate = today(); U.gymDate = today(); bootDay = today(); render(); return now().toString(); },
  cycleDay, get rest() { return REST; } };
})();
