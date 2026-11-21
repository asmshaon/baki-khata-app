import { sql } from 'drizzle-orm';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { db } from '../src/db/client.js';
import { addEntry, app, bearer, createCustomer, registerOwner, useCleanDatabase } from './helpers.js';

useCleanDatabase();

const undo = (token: string, customerId: number, txId: number) =>
  request(app).delete(`/owner/customers/${customerId}/transactions/${txId}`).set(bearer(token));

describe('entry notes, last entry time and undo', () => {
  it('stores a note and tracks the last entry time', async () => {
    const owner = await registerOwner();
    const c = await createCustomer(owner.token);
    expect(c.lastEntryAt).toBeNull();

    const res = await request(app)
      .post(`/owner/customers/${c.id}/transactions`)
      .set(bearer(owner.token))
      .send({ type: 'baki', amount: 120, note: 'চাল, ডাল' })
      .expect(201);
    expect(res.body.transaction.note).toBe('চাল, ডাল');
    expect(res.body.customer.lastEntryAt).toBe(res.body.transaction.createdAt);

    // Read back from the database: catches time-zone drift between Node and MySQL.
    const stored = await request(app).get(`/owner/customers/${c.id}`).set(bearer(owner.token)).expect(200);
    expect(stored.body.customer.lastEntryAt).toBe(res.body.transaction.createdAt);
    expect(Math.abs(Date.parse(res.body.transaction.createdAt) - Date.now())).toBeLessThan(60_000);
  });

  it('undoes only the latest entry and restores the balance', async () => {
    const owner = await registerOwner();
    const c = await createCustomer(owner.token);
    const first = (await addEntry(owner.token, c.id, 'baki', 500).expect(201)).body.transaction;
    const second = (await addEntry(owner.token, c.id, 'joma', 200).expect(201)).body.transaction;

    await undo(owner.token, c.id, first.id).expect(409);

    const res = await undo(owner.token, c.id, second.id).expect(200);
    expect(res.body.customer.balance).toBe(500);
    expect(res.body.customer.lastEntryAt).toBe(first.createdAt);

    const last = await undo(owner.token, c.id, first.id).expect(200);
    expect(last.body.customer).toMatchObject({ balance: 0, lastEntryAt: null });

    const history = await request(app).get(`/owner/customers/${c.id}/transactions`).set(bearer(owner.token)).expect(200);
    expect(history.body.transactions).toEqual([]);
  });

  it('refuses to undo entries older than 24 hours', async () => {
    const owner = await registerOwner();
    const c = await createCustomer(owner.token);
    const tx = (await addEntry(owner.token, c.id, 'baki', 100).expect(201)).body.transaction;
    await db.execute(sql`update transactions set created_at = now() - interval 2 day where id = ${tx.id}`);

    await undo(owner.token, c.id, tx.id).expect(409);
  });

  it("cannot undo another shop's entry", async () => {
    const ownerA = await registerOwner();
    const ownerB = await registerOwner();
    const c = await createCustomer(ownerA.token);
    const tx = (await addEntry(ownerA.token, c.id, 'baki', 100).expect(201)).body.transaction;

    await undo(ownerB.token, c.id, tx.id).expect(404);
    const other = await createCustomer(ownerB.token);
    await undo(ownerB.token, other.id, tx.id).expect(404);
  });
});
