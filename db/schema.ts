export const schema = `
CREATE TABLE IF NOT EXISTS family (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  theme_color TEXT DEFAULT 'amber'
);

CREATE TABLE IF NOT EXISTS member (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  avatar_emoji TEXT DEFAULT '🙂',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (family_id) REFERENCES family(id)
);

CREATE TABLE IF NOT EXISTS session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  date INTEGER NOT NULL,
  closing_word TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (family_id) REFERENCES family(id)
);

CREATE TABLE IF NOT EXISTS rose (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  deepening_prompt TEXT,
  deepening_answer TEXT,
  created_at INTEGER NOT NULL,
  image_uri TEXT,
  image_seed INTEGER,
  image_source TEXT CHECK(image_source IN ('procedural', 'mediapipe', 'cloud', 'apple-playground')),
  image_prompt TEXT,
  FOREIGN KEY (session_id) REFERENCES session(id),
  FOREIGN KEY (member_id) REFERENCES member(id)
);

CREATE TABLE IF NOT EXISTS thorn (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  deepening_prompt TEXT,
  deepening_answer TEXT,
  created_at INTEGER NOT NULL,
  image_uri TEXT,
  image_seed INTEGER,
  image_source TEXT CHECK(image_source IN ('procedural', 'mediapipe', 'cloud', 'apple-playground')),
  image_prompt TEXT,
  FOREIGN KEY (session_id) REFERENCES session(id),
  FOREIGN KEY (member_id) REFERENCES member(id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
