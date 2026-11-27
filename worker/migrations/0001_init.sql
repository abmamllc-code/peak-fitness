-- One row per person. Pins are stored as PBKDF2 hashes, never as the PIN itself.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('athlete', 'trainer')),
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);

CREATE INDEX sessions_user ON sessions(user_id);

-- The athlete's whole on-device record (meals, workouts, XP, streaks), plus when it was saved.
CREATE TABLE athlete_state (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  rev INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  local_date TEXT,
  theme TEXT,
  data_json TEXT NOT NULL
);

CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  attempted_at TEXT NOT NULL
);

CREATE INDEX login_attempts_user ON login_attempts(username, attempted_at);
