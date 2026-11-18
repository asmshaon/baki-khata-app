import { migrate } from 'drizzle-orm/mysql2/migrator';
import { fileURLToPath } from 'node:url';
import { db, pool } from './client.js';

await migrate(db, { migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)) });
await pool.end();
console.log('Migrations applied');
