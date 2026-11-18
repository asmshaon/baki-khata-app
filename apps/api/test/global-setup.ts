import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Runs once before the whole suite: rebuilds the test database from the
 * Drizzle migrations so every run starts from the current schema.
 */
export default async function setup() {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set (see apps/api/.env.example)');
  }

  const conn = await mysql.createConnection({ uri: url, multipleStatements: true });
  try {
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      'select table_name as name from information_schema.tables where table_schema = database()',
    );
    if (rows.length > 0) {
      const names = rows.map((r) => `\`${r.name}\``).join(', ');
      await conn.query(`set foreign_key_checks = 0; drop table if exists ${names}; set foreign_key_checks = 1;`);
    }
    await migrate(drizzle(conn), {
      migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
    });
  } finally {
    await conn.end();
  }
}
