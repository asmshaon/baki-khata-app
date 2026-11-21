import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set');
}

/**
 * Every connection works in UTC. Drizzle sends Date values as UTC wall-clock
 * strings, so the session time zone must match or date filters and written
 * timestamps shift by the server's offset (e.g. +06 in Bangladesh).
 * TIMESTAMP columns are stored as UTC internally, so existing rows read back correctly.
 */
export const pool = mysql.createPool({ uri: url, connectionLimit: 10, timezone: 'Z' });
pool.pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});
export const db = drizzle(pool, { schema, mode: 'default' });
export type Db = typeof db;
