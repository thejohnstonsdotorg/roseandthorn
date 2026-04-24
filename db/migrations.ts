import * as SQLite from 'expo-sqlite';
import { schema } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

// Current target schema version
const CURRENT_VERSION = 3;

async function applyMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Read the current schema version
  const versionResult = await database.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = versionResult?.user_version ?? 0;

  if (currentVersion < 1) {
    // Migration 1: image columns on rose/thorn (v1.4)
    // ALTER TABLE statements must be executed separately in SQLite
    await database.execAsync('ALTER TABLE rose ADD COLUMN image_uri TEXT');
    await database.execAsync('ALTER TABLE rose ADD COLUMN image_seed INTEGER');
    await database.execAsync('ALTER TABLE rose ADD COLUMN image_source TEXT');
    await database.execAsync('ALTER TABLE rose ADD COLUMN image_prompt TEXT');
    await database.execAsync('ALTER TABLE thorn ADD COLUMN image_uri TEXT');
    await database.execAsync('ALTER TABLE thorn ADD COLUMN image_seed INTEGER');
    await database.execAsync('ALTER TABLE thorn ADD COLUMN image_source TEXT');
    await database.execAsync('ALTER TABLE thorn ADD COLUMN image_prompt TEXT');
    await database.execAsync('PRAGMA user_version = 1');
  }

  if (currentVersion < 2) {
    // Migration 2: app_settings key-value table (v1.4)
    // The CREATE TABLE IF NOT EXISTS in schema handles fresh installs;
    // this migration handles existing databases that predate the settings table.
    await database.execAsync(
      'CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)'
    );
    await database.execAsync('PRAGMA user_version = 2');
  }

  // Migration 3: relax CHECK constraint on rose/thorn image_source to allow 'cloud' (v1.5)
  // Also recovers from a partial migration that left rose_old/thorn_old on disk with
  // user_version already at 3 (caused by multi-statement execAsync running only first stmt).
  {
    const tables = await database.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table'`
    );
    const tableNames = new Set(tables.map((t) => t.name));
    const needsRose = !tableNames.has('rose') || currentVersion < 3;
    const needsThorn = !tableNames.has('thorn') || currentVersion < 3;

    if (needsRose) {
      // If a partial migration left rose_old behind, use it; otherwise rename existing rose
      if (!tableNames.has('rose_old') && tableNames.has('rose')) {
        await database.execAsync('ALTER TABLE rose RENAME TO rose_old');
      }
      await database.execAsync(`CREATE TABLE IF NOT EXISTS rose (
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
      )`);
      if (tableNames.has('rose_old')) {
        await database.execAsync('INSERT INTO rose SELECT * FROM rose_old');
        await database.execAsync('DROP TABLE rose_old');
      }
    }

    if (needsThorn) {
      if (!tableNames.has('thorn_old') && tableNames.has('thorn')) {
        await database.execAsync('ALTER TABLE thorn RENAME TO thorn_old');
      }
      await database.execAsync(`CREATE TABLE IF NOT EXISTS thorn (
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
      )`);
      if (tableNames.has('thorn_old')) {
        await database.execAsync('INSERT INTO thorn SELECT * FROM thorn_old');
        await database.execAsync('DROP TABLE thorn_old');
      }
    }

    if (needsRose || needsThorn) {
      await database.execAsync('PRAGMA user_version = 3');
    }
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('roseandthorn.db');

    // Check if this is a fresh database (user_version = 0 AND no tables yet).
    // On a fresh install, the schema already contains all columns and tables at
    // their latest version, so we create the tables then immediately stamp
    // user_version = CURRENT_VERSION to skip every migration.
    // On an existing install (user_version > 0 or tables already present),
    // we fall through to applyMigrations() as before.
    const versionCheck = await db.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version'
    );
    const existingVersion = versionCheck?.user_version ?? 0;

    // Apply base schema (CREATE TABLE IF NOT EXISTS — safe to re-run)
    await db.execAsync(schema);

    if (existingVersion === 0) {
      // Fresh install: schema already reflects CURRENT_VERSION, stamp it so
      // migrations don't try to ALTER TABLE columns that already exist.
      await db.execAsync(`PRAGMA user_version = ${CURRENT_VERSION}`);
    } else {
      // Existing install: apply any pending incremental migrations
      await applyMigrations(db);
    }
  }
  return db;
}

export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();
  // Each DROP must be a separate execAsync — multi-statement strings are unreliable
  await database.execAsync('DROP TABLE IF EXISTS rose');
  await database.execAsync('DROP TABLE IF EXISTS thorn');
  await database.execAsync('DROP TABLE IF EXISTS session');
  await database.execAsync('DROP TABLE IF EXISTS member');
  await database.execAsync('DROP TABLE IF EXISTS family');
  await database.execAsync('DROP TABLE IF EXISTS app_settings');
  await database.execAsync('DROP TABLE IF EXISTS rose_old');
  await database.execAsync('DROP TABLE IF EXISTS thorn_old');
  // Recreate with latest schema (includes image columns and settings table)
  await database.execAsync(schema);
  // Set version to current so no migrations are run on a fresh schema
  await database.execAsync(`PRAGMA user_version = ${CURRENT_VERSION}`);
}
