import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Runs in each test worker before any test file is imported, so the
 * DB client and auth helpers pick up the test configuration.
 */
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}
if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set (see apps/api/.env.example)');
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'baki-uploads-'));
