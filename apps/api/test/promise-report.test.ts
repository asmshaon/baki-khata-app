import { sql } from 'drizzle-orm';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { db } from '../src/db/client.js';
import { app, bearer, createCustomer, registerOwner, useCleanDatabase } from './helpers.js';

useCleanDatabase();

const entry = (token: string, customerId: number, body: Record<string, unknown>) =>
  request(app).post(`/owner/customers/${customerId}/transactions`).set(bearer(token)).send(body);

describe('promise date', () => {
  it('is set by a baki, kept by a partial joma and cleared once paid off', async () => {
    const owner = await registerOwner();
    const c = await createCustomer(owner.token);

    const given = await entry(owner.token, c.id, { type: 'baki', amount: 500, promisedOn: '2026-12-01' }).expect(201);
    expect(given.body.customer.promisedOn).toBe('2026-12-01');

    const partial = await entry(owner.token, c.id, { type: 'joma', amount: 200 }).expect(201);
    expect(partial.body.customer.promisedOn).toBe('2026-12-01');

    const listed = await request(app).get('/owner/customers').set(bearer(owner.token)).expect(200);
    expect(listed.body.customers[0].promisedOn).toBe('2026-12-01');

    const paid = await entry(owner.token, c.id, { type: 'joma', amount: 300 }).expect(201);
    expect(paid.body.customer.promisedOn).toBeNull();
  });

  it('can be cleared with null and rejects bad dates', async () => {
    const owner = await registerOwner();
    const c = await createCustomer(owner.token);
    await entry(owner.token, c.id, { type: 'baki', amount: 100, promisedOn: '2026-12-01' }).expect(201);
    const cleared = await entry(owner.token, c.id, { type: 'baki', amount: 100, promisedOn: null }).expect(201);
    expect(cleared.body.customer.promisedOn).toBeNull();

    await entry(owner.token, c.id, { type: 'baki', amount: 100, promisedOn: '1/12/2026' }).expect(422);
  });
});

describe('payment method', () => {
  it('is stored for joma and ignored for baki', async () => {
    const owner = await registerOwner();
    const c = await createCustomer(owner.token);
    const baki = await entry(owner.token, c.id, { type: 'baki', amount: 300, method: 'bkash' }).expect(201);
    expect(baki.body.transaction.method).toBeNull();
    const joma = await entry(owner.token, c.id, { type: 'joma', amount: 100, method: 'bkash' }).expect(201);
    expect(joma.body.transaction.method).toBe('bkash');
    await entry(owner.token, c.id, { type: 'joma', amount: 100, method: 'paypal' }).expect(422);
  });
});

describe('daily report', () => {
  it("lists only the shop's entries inside the range, with customer names", async () => {
    const owner = await registerOwner();
    const other = await registerOwner();
    const karim = await createCustomer(owner.token, { name: 'করিম' });
    const stranger = await createCustomer(other.token);

    const old = (await entry(owner.token, karim.id, { type: 'baki', amount: 100 }).expect(201)).body.transaction;
    await db.execute(sql`update transactions set created_at = now() - interval 3 day where id = ${old.id}`);
    await entry(owner.token, karim.id, { type: 'joma', amount: 40, method: 'cash' }).expect(201);
    await entry(other.token, stranger.id, { type: 'baki', amount: 999 }).expect(201);

    const from = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const res = await request(app).get('/owner/report').query({ from, to }).set(bearer(owner.token)).expect(200);
    expect(res.body.entries).toHaveLength(1);
    expect(res.body.entries[0]).toMatchObject({ customerName: 'করিম', type: 'joma', amount: 40, method: 'cash' });

    await request(app).get('/owner/report').query({ from: 'yesterday' }).set(bearer(owner.token)).expect(422);
  });
});
