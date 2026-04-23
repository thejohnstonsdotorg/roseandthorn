import * as SQLite from 'expo-sqlite';
import { schema } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

// Current target schema version
const CURRENT_VERSION = 2;

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

  // Future migrations: if (currentVersion < 3) { ... PRAGMA user_version = 3; }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('roseandthorn.db');
    // Apply base schema (CREATE TABLE IF NOT EXISTS — safe to re-run)
    await db.execAsync(schema);
    // Apply incremental migrations for existing databases
    await applyMigrations(db);
  }
  return db;
}

export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DROP TABLE IF EXISTS rose;
    DROP TABLE IF EXISTS thorn;
    DROP TABLE IF EXISTS session;
    DROP TABLE IF EXISTS member;
    DROP TABLE IF EXISTS family;
    DROP TABLE IF EXISTS app_settings;
  `);
  // Recreate with latest schema (includes image columns and settings table)
  await database.execAsync(schema);
  // Set version to current so no migrations are run on a fresh schema
  await database.execAsync(`PRAGMA user_version = ${CURRENT_VERSION}`);
}
