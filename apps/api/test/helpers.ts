import type { Customer, OwnerSession } from '@baki/shared';
import { sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { db, pool } from '../src/db/client.js';

export const app = createApp();

/** Empties every table before each test and closes the pool after the file. */
export function useCleanDatabase() {
  beforeEach(async () => {
    await db.execute(sql`set foreign_key_checks = 0`);
    for (const table of ['transactions', 'customers', 'shops', 'owners']) {
      await db.execute(sql.raw(`truncate table \`${table}\``));
    }
    await db.execute(sql`set foreign_key_checks = 1`);
  });
  afterAll(async () => {
    await pool.end();
  });
}

let phoneCounter = 0;
/** A valid, unique Bangladeshi mobile number. */
export const nextPhone = () => `0171${String(++phoneCounter).padStart(7, '0')}`;

export async function registerOwner(overrides: Partial<{ name: string; phone: string; pin: string; shopName: string }> = {}) {
  const res = await request(app)
    .post('/auth/owner/register')
    .send({ name: 'রহিম', phone: nextPhone(), pin: '1234', shopName: 'রহিম স্টোর', ...overrides })
    .expect(201);
  return res.body as OwnerSession;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function createCustomer(
  token: string,
  overrides: Partial<{ name: string; phone: string; pin: string; address: string }> = {},
) {
  const res = await request(app)
    .post('/owner/customers')
    .set(bearer(token))
    .send({ name: 'করিম', phone: nextPhone(), ...overrides })
    .expect(201);
  return res.body.customer as Customer;
}

export function addEntry(token: string, customerId: number, type: 'baki' | 'joma', amount: number) {
  return request(app)
    .post(`/owner/customers/${customerId}/transactions`)
    .set(bearer(token))
    .send({ type, amount });
}
