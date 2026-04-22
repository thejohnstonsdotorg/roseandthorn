import * as SQLite from 'expo-sqlite';
import { schema } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('roseandthorn.db');
    await db.execAsync(schema);
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
  `);
  await database.execAsync(schema);
}
