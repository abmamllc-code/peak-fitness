/**
 * PEAK Fitness sync. Username + PIN for Adnan, Adam and Ismail.
 * Pins come from Worker secrets (ADNAN_PIN, ADAM_PIN, ISMAIL_PIN) and are stored hashed.
 */

const USERS = [
  { id: 'adnan', name: 'Adnan', role: 'athlete', env: 'ADNAN_PIN' },
  { id: 'adam', name: 'Adam', role: 'athlete', env: 'ADAM_PIN' },
  { id: 'ismail', name: 'Ismail', role: 'trainer', env: 'ISMAIL_PIN' },
];
const SESSION_DAYS = 30;
const PBKDF2_ITERS = 100000;
const MAX_BODY = 900000;

export default {
  async fetch(request, env) {
    const origin = allowOrigin(request, env);
    if (origin === false) return json({ error: 'This site is not allowed to sync.' }, 403, request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/health' && request.method === 'GET') return json({ ok: true }, 200, request, env);
      if (url.pathname === '/api/login' && request.method === 'POST') return login(request, env);
      const user = await userFromRequest(request, env);
      if (!user) return json({ error: 'Sign in again.' }, 401, request, env);
      if (url.pathname === '/api/me' && request.method === 'GET') return json({ user: publicUser(user) }, 200, request, env);
      if (url.pathname === '/api/logout' && request.method === 'POST') return logout(request, env);
      if (url.pathname === '/api/state' && request.method === 'GET') return getState(user, env, request);
      if (url.pathname === '/api/state' && request.method === 'PUT') return putState(user, request, env);
      if (url.pathname === '/api/roster' && request.method === 'GET') return roster(user, env, request);
      return json({ error: 'Not found.' }, 404, request, env);
    } catch (err) {
      console.error(err);
      return json({ error: 'Something went wrong.' }, 500, request, env);
    }
  },
};

function allowOrigin(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  const list = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return list.includes(origin) ? origin : false;
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = allowOrigin(request, env);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && allowed && allowed !== true) headers['Access-Control-Allow-Origin'] = origin;
  else if (!origin) headers['Access-Control-Allow-Origin'] = '*';
  return headers;
}

function json(body, status, request, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(request, env) },
  });
}

function publicUser(user) {
  return { id: user.id, username: user.username, name: user.name, role: user.role };
}

async function ensureUsers(env) {
  for (const spec of USERS) {
    const pin = String(env[spec.env] || '');
    if (!/^\d{4,12}$/.test(pin)) continue;
    const existing = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(spec.id).first();
    if (existing) continue;
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await hashPin(pin, salt);
    await env.DB.prepare('INSERT INTO users (id, username, name, role, pin_hash, pin_salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(spec.id, spec.id, spec.name, spec.role, hash, toHex(salt), new Date().toISOString()).run();
  }
}

async function login(request, env) {
  await ensureUsers(env);
  const body = await readJson(request);
  const username = String(body.username || '').trim().toLowerCase();
  const pin = String(body.pin || '');
  if (!username || !pin) return json({ error: 'Enter your name and PIN.' }, 400, request, env);
  if (await lockedOut(env, username)) return json({ error: 'Too many tries. Wait 15 minutes.' }, 429, request, env);
  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
  const salt = user ? fromHex(user.pin_salt) : new Uint8Array(16);
  const hash = await hashPin(pin, salt);
  if (!user || !safeEqual(hash, user.pin_hash)) {
    await env.DB.prepare('INSERT INTO login_attempts (username, attempted_at) VALUES (?, ?)').bind(username, new Date().toISOString()).run();
    return json({ error: 'Wrong username or PIN.' }, 401, request, env);
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE username = ?').bind(username).run();
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), user.id, expires).run();
  return json({ token, user: publicUser(user) }, 200, request, env);
}

async function logout(request, env) {
  const token = bearer(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  return json({ ok: true }, 200, request, env);
}

async function userFromRequest(request, env) {
  const token = bearer(request);
  if (!token) return null;
  const row = await env.DB.prepare(`SELECT users.id, users.username, users.name, users.role, sessions.expires_at
    FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ?`).bind(await sha256(token)).first();
  if (!row || Date.parse(row.expires_at) < Date.now()) return null;
  return row;
}

async function getState(user, env, request) {
  if (user.role !== 'athlete') return json({ error: 'Athletes only.' }, 403, request, env);
  const row = await env.DB.prepare('SELECT rev, updated_at, local_date, theme, data_json FROM athlete_state WHERE user_id = ?').bind(user.id).first();
  if (!row) return json({ state: null }, 200, request, env);
  return json({ state: stateFromRow(row) }, 200, request, env);
}

async function putState(user, request, env) {
  if (user.role !== 'athlete') return json({ error: 'The trainer view is read-only.' }, 403, request, env);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: 'That save is too large to sync.' }, 413, request, env);
  let body;
  try { body = JSON.parse(raw); } catch (_) { return json({ error: 'Bad save.' }, 400, request, env); }
  const baseRev = Number(body.baseRev);
  if (!Number.isInteger(baseRev) || baseRev < 0) return json({ error: 'Bad revision.' }, 400, request, env);
  if (!body.data || typeof body.data !== 'object') return json({ error: 'Missing data.' }, 400, request, env);
  const current = await env.DB.prepare('SELECT rev, updated_at, local_date, theme, data_json FROM athlete_state WHERE user_id = ?').bind(user.id).first();
  if (current && current.rev !== baseRev) return json({ conflict: true, state: stateFromRow(current) }, 409, request, env);
  const rev = current ? current.rev + 1 : 1;
  const updatedAt = new Date().toISOString();
  const dataJson = JSON.stringify(body.data);
  const localDate = typeof body.localDate === 'string' ? body.localDate.slice(0, 10) : '';
  const theme = body.theme === 'light' ? 'light' : 'dark';
  if (current) {
    await env.DB.prepare('UPDATE athlete_state SET rev = ?, updated_at = ?, local_date = ?, theme = ?, data_json = ? WHERE user_id = ?')
      .bind(rev, updatedAt, localDate, theme, dataJson, user.id).run();
  } else {
    await env.DB.prepare('INSERT INTO athlete_state (user_id, rev, updated_at, local_date, theme, data_json) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(user.id, rev, updatedAt, localDate, theme, dataJson).run();
  }
  return json({ rev, updatedAt }, 200, request, env);
}

async function roster(user, env, request) {
  if (user.role !== 'trainer') return json({ error: 'Trainer only.' }, 403, request, env);
  const rows = await env.DB.prepare(`SELECT users.id, users.name, athlete_state.updated_at, athlete_state.local_date, athlete_state.data_json
    FROM users LEFT JOIN athlete_state ON athlete_state.user_id = users.id
    WHERE users.role = 'athlete' ORDER BY users.name`).all();
  const athletes = (rows.results || []).map(row => {
    let data = {};
    try { data = row.data_json ? JSON.parse(row.data_json) : {}; } catch (_) {}
    const summary = summarize(data, row.local_date || '');
    return { id: row.id, name: row.name, updatedAt: row.updated_at || null, ...summary };
  });
  return json({ athletes }, 200, request, env);
}

function stateFromRow(row) {
  let data = {};
  try { data = JSON.parse(row.data_json); } catch (_) {}
  return { rev: row.rev, updatedAt: row.updated_at, localDate: row.local_date || '', theme: row.theme || 'dark', data };
}

function summarize(data, localDate) {
  const days = data.days && typeof data.days === 'object' ? data.days : {};
  const meals = localDate && days[localDate] && Array.isArray(days[localDate].meals) ? days[localDate].meals : [];
  let streak = 0;
  let cursor = dayComplete(days, localDate) ? localDate : prevDate(localDate);
  while (cursor && dayComplete(days, cursor) && streak < 60) { streak++; cursor = prevDate(cursor); }
  const workouts = recentWorkouts(data.workouts);
  return {
    streak,
    meals: { done: meals.filter(m => m && m.done).length, total: meals.length },
    workouts, lastWorkout: workouts[0] || null, bodyweight: latestWeight(data.bodyweight),
    strength: strengthBook(data, localDate),
  };
}

function dayComplete(days, date) {
  const meals = days[date] && Array.isArray(days[date].meals) ? days[date].meals : [];
  return meals.length > 0 && meals.every(m => m && m.done);
}

function prevDate(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

function recentWorkouts(workouts) {
  if (!workouts || typeof workouts !== 'object') return [];
  const out = [];
  const dates = Object.keys(workouts).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().reverse();
  for (const date of dates) {
    const w = workouts[date];
    if (!w || !Array.isArray(w.exercises)) continue;
    let sets = 0, volume = 0;
    w.exercises.forEach(ex => (ex.sets || []).forEach(s => {
      if (!s || (!s.done && !(Number(s.weight) > 0))) return;
      sets++;
      volume += (Number(s.reps) || 0) * (Number(s.weight) || 0);
    }));
    if (sets || w.end) out.push({ date, day: w.day || '', sets, volume: Math.round(volume) });
    if (out.length >= 4) break;
  }
  return out;
}

function latestWeight(list) {
  if (!Array.isArray(list)) return null;
  const rows = list.filter(b => b && b.date && Number(b.value) > 0).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  if (!rows.length) return null;
  const last = rows[rows.length - 1];
  return { value: Number(last.value), date: String(last.date).slice(0, 10) };
}

function epley(weight, reps) {
  if (!(weight > 0) || !(reps > 0)) return 0;
  return weight * (1 + reps / 30);
}
function mainOf(name) {
  const n = String(name || '');
  if (/romanian|straight[\s-]*leg|\brdl\b/i.test(n)) return 'rdl';
  if (/deadlift/i.test(n)) return 'dead';
  if (/incline/i.test(n)) return null;
  if (/bench/i.test(n)) return 'bench';
  if (/overhead press|\bohp\b/i.test(n)) return 'ohp';
  if (/squat/i.test(n) && !/goblet/i.test(n)) return 'squat';
  if (/pulldown|pull-down|pull down/i.test(n)) return 'pulldown';
  if (/\brow\b/i.test(n) && !/face/i.test(n)) return 'row';
  return null;
}
function addDaysIso(iso, n) {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function scoreChange(points, asOf) {
  if (!points || points.length < 2) return null;
  const cur = points[points.length - 1];
  const cut = addDaysIso(asOf || cur.date, -7);
  const prior = points.filter(p => p.date <= cut);
  const base = prior.length ? prior[prior.length - 1] : points[0];
  if (!base || !(base.value > 0)) return null;
  if (base === cur) return { pct: 0, week: true, baseDate: base.date };
  return { pct: (cur.value - base.value) / base.value * 100, week: base.date <= cut, baseDate: base.date };
}
function strengthBook(data, asOf) {
  const mains = ['bench', 'ohp', 'dead', 'squat', 'rdl', 'pulldown', 'row'];
  const names = { bench: 'Bench', ohp: 'Overhead press', dead: 'Deadlift', squat: 'Squat', rdl: 'RDL', pulldown: 'Lat pulldown', row: 'Row' };
  const workouts = data && data.workouts && typeof data.workouts === 'object' ? data.workouts : {};
  const latest = {}, liftPoints = {};
  mains.forEach(k => { liftPoints[k] = []; });
  const points = [];
  Object.keys(workouts).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().forEach(date => {
    const w = workouts[date];
    if (!w || !Array.isArray(w.exercises)) return;
    const dayBest = {};
    w.exercises.forEach(ex => {
      if (!ex || ex.kind === 'warmup' || ex.kind === 'down') return;
      const key = mainOf(ex.name);
      if (!key) return;
      let best = 0;
      (ex.sets || []).forEach(s => {
        if (!s || (!s.done && !(Number(s.weight) > 0))) return;
        best = Math.max(best, epley(Number(s.weight), Number(s.reps)));
      });
      if (best > 0) dayBest[key] = Math.max(dayBest[key] || 0, best);
    });
    if (!Object.keys(dayBest).length) return;
    Object.keys(dayBest).forEach(key => {
      latest[key] = dayBest[key];
      liftPoints[key].push({ date, value: Math.round(dayBest[key] * 10) / 10 });
    });
    const total = Object.keys(latest).reduce((a, k) => a + latest[k], 0);
    points.push({ date, value: Math.round(total * 10) / 10 });
  });
  const when = asOf || (points.length ? points[points.length - 1].date : '');
  const list = Array.isArray(data && data.bodyweight) ? data.bodyweight.filter(b => b && Number(b.value) > 0).slice().sort((a, b) => a.date < b.date ? -1 : 1) : [];
  const bw = list.map(b => ({ date: String(b.date).slice(0, 10), value: Number(b.value) }));
  const start = addDaysIso(when, -6);
  let sessions = 0;
  Object.keys(workouts).forEach(d => {
    if (!start || d < start || d > when) return;
    const w = workouts[d];
    const hit = w && Array.isArray(w.exercises) && w.exercises.some(ex => ex && ex.kind !== 'warmup' && ex.kind !== 'down' && (ex.sets || []).some(s => s && (s.done || Number(s.weight) > 0)));
    if (hit || (w && w.end)) sessions++;
  });
  const days = data && data.days && typeof data.days === 'object' ? data.days : {};
  let done = 0, totalMeals = 0;
  Object.keys(days).forEach(d => {
    if (!start || d < start || d > when) return;
    const meals = days[d] && days[d].meals;
    if (!Array.isArray(meals) || !meals.length) return;
    totalMeals += meals.length;
    done += meals.filter(m => m && m.done).length;
  });
  return {
    points,
    change: scoreChange(points, when),
    lifts: mains.map(key => ({ key, name: names[key], points: liftPoints[key], value: liftPoints[key].length ? liftPoints[key][liftPoints[key].length - 1].value : 0, change: scoreChange(liftPoints[key], when) })),
    body: bw.length ? { points: bw, value: bw[bw.length - 1].value, date: bw[bw.length - 1].date, change: scoreChange(bw, when) } : null,
    consistency: { sessions, mealsPct: totalMeals ? Math.round(100 * done / totalMeals) : null },
  };
}

async function lockedOut(env, username) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE username = ? AND attempted_at > ?').bind(username, since).first();
  return row && row.n >= 8;
}

function bearer(request) {
  const h = request.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+([a-f0-9]{64})$/i);
  return m ? m[1] : '';
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > 10000) return {};
  try { return JSON.parse(text); } catch (_) { return {}; }
}

async function hashPin(pin, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBKDF2_ITERS, hash: 'SHA-256' }, key, 256);
  return toHex(new Uint8Array(bits));
}

async function sha256(value) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return toHex(new Uint8Array(buf));
}

function toHex(bytes) {
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
