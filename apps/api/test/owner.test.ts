import type { Customer } from '@baki/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { addEntry, app, bearer, createCustomer, nextPhone, registerOwner, useCleanDatabase } from './helpers.js';

useCleanDatabase();

// Smallest valid PNG (1x1 transparent pixel).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

describe('customers', () => {
  it('creates, fetches and updates a customer', async () => {
    const owner = await registerOwner();
    const created = await createCustomer(owner.token, { name: 'করিম', address: 'বাজার রোড', pin: '1111' });
    expect(created).toMatchObject({ name: 'করিম', address: 'বাজার রোড', balance: 0, hasPin: true, photoUrl: null });

    const fetched = await request(app).get(`/owner/customers/${created.id}`).set(bearer(owner.token)).expect(200);
    expect(fetched.body.customer.id).toBe(created.id);

    const updated = await request(app)
      .patch(`/owner/customers/${created.id}`)
      .set(bearer(owner.token))
      .send({ name: 'করিম মিয়া', address: '' })
      .expect(200);
    expect(updated.body.customer).toMatchObject({ name: 'করিম মিয়া', address: null, phone: created.phone });
  });

  it('refuses a duplicate phone within one shop but allows it across shops', async () => {
    const phone = nextPhone();
    const ownerA = await registerOwner();
    const ownerB = await registerOwner();
    await createCustomer(ownerA.token, { phone });

    await request(app).post('/owner/customers').set(bearer(ownerA.token)).send({ name: 'অন্য', phone }).expect(409);
    await createCustomer(ownerB.token, { phone });
  });

  it('searches by name or phone and lists customers who owe first', async () => {
    const owner = await registerOwner();
    const alam = await createCustomer(owner.token, { name: 'আলম' });
    const babul = await createCustomer(owner.token, { name: 'বাবুল', phone: '01999888777' });
    await addEntry(owner.token, babul.id, 'baki', 100).expect(201);

    const all = await request(app).get('/owner/customers').set(bearer(owner.token)).expect(200);
    expect(all.body.customers.map((c: Customer) => c.id)).toEqual([babul.id, alam.id]);

    const byName = await request(app).get('/owner/customers').query({ q: 'আল' }).set(bearer(owner.token)).expect(200);
    expect(byName.body.customers.map((c: Customer) => c.id)).toEqual([alam.id]);

    const byPhone = await request(app).get('/owner/customers').query({ q: '99988' }).set(bearer(owner.token)).expect(200);
    expect(byPhone.body.customers.map((c: Customer) => c.id)).toEqual([babul.id]);

    const wildcard = await request(app).get('/owner/customers').query({ q: '%' }).set(bearer(owner.token)).expect(200);
    expect(wildcard.body.customers).toEqual([]);
  });

  it('returns 422 for invalid customer input and bad ids', async () => {
    const owner = await registerOwner();
    const res = await request(app)
      .post('/owner/customers')
      .set(bearer(owner.token))
      .send({ name: 'x', phone: '01234' })
      .expect(422);
    expect(res.body.fieldErrors.phone).toBeDefined();

    await request(app).get('/owner/customers/abc').set(bearer(owner.token)).expect(422);
  });

  it('uploads a photo and serves it', async () => {
    const owner = await registerOwner();
    const customer = await createCustomer(owner.token);

    const res = await request(app)
      .post(`/owner/customers/${customer.id}/photo`)
      .set(bearer(owner.token))
      .attach('photo', PNG, { filename: 'face.png', contentType: 'image/png' })
      .expect(200);
    expect(res.body.customer.photoUrl).toMatch(/^\/uploads\/[\w-]+\.png$/);

    await request(app).get(res.body.customer.photoUrl).expect(200).expect('Content-Type', /image\/png/);
  });

  it('rejects a photo upload without an image', async () => {
    const owner = await registerOwner();
    const customer = await createCustomer(owner.token);
    await request(app)
      .post(`/owner/customers/${customer.id}/photo`)
      .set(bearer(owner.token))
      .attach('photo', Buffer.from('hello'), { filename: 'x.txt', contentType: 'text/plain' })
      .expect(422);
  });
});

describe('shop isolation', () => {
  it("never lets owner A see or touch shop B's customer", async () => {
    const ownerA = await registerOwner();
    const ownerB = await registerOwner();
    const bCustomer = await createCustomer(ownerB.token, { name: 'খ-এর গ্রাহক' });
    const asA = bearer(ownerA.token);

    await request(app).get(`/owner/customers/${bCustomer.id}`).set(asA).expect(404);
    await request(app).patch(`/owner/customers/${bCustomer.id}`).set(asA).send({ name: 'হ্যাক' }).expect(404);
    await request(app).get(`/owner/customers/${bCustomer.id}/transactions`).set(asA).expect(404);
    await addEntry(ownerA.token, bCustomer.id, 'baki', 500).expect(404);
    await request(app)
      .post(`/owner/customers/${bCustomer.id}/photo`)
      .set(asA)
      .attach('photo', PNG, { filename: 'x.png', contentType: 'image/png' })
      .expect(404);

    const list = await request(app).get('/owner/customers').set(asA).expect(200);
    expect(list.body.customers).toEqual([]);

    const untouched = await request(app).get(`/owner/customers/${bCustomer.id}`).set(bearer(ownerB.token)).expect(200);
    expect(untouched.body.customer).toMatchObject({ name: 'খ-এর গ্রাহক', balance: 0 });
  });
});

describe('ledger', () => {
  it('adds baki, subtracts joma and records balance_after', async () => {
    const owner = await registerOwner();
    const customer = await createCustomer(owner.token);

    const r1 = await addEntry(owner.token, customer.id, 'baki', 500).expect(201);
    expect(r1.body.transaction).toMatchObject({ type: 'baki', amount: 500, balanceAfter: 500 });
    expect(r1.body.customer.balance).toBe(500);

    const r2 = await addEntry(owner.token, customer.id, 'baki', 250).expect(201);
    expect(r2.body.transaction.balanceAfter).toBe(750);

    const r3 = await addEntry(owner.token, customer.id, 'joma', 1000).expect(201);
    expect(r3.body.transaction.balanceAfter).toBe(-250); // advance paid

    const history = await request(app)
      .get(`/owner/customers/${customer.id}/transactions`)
      .set(bearer(owner.token))
      .expect(200);
    expect(history.body.transactions.map((t: { balanceAfter: number }) => t.balanceAfter)).toEqual([-250, 750, 500]);

    const fetched = await request(app).get(`/owner/customers/${customer.id}`).set(bearer(owner.token)).expect(200);
    expect(fetched.body.customer.balance).toBe(-250);
  });

  it('keeps the balance consistent under concurrent entries', async () => {
    const owner = await registerOwner();
    const customer = await createCustomer(owner.token);

    await Promise.all(Array.from({ length: 10 }, () => addEntry(owner.token, customer.id, 'baki', 10).expect(201)));

    const fetched = await request(app).get(`/owner/customers/${customer.id}`).set(bearer(owner.token)).expect(200);
    expect(fetched.body.customer.balance).toBe(100);
    const history = await request(app)
      .get(`/owner/customers/${customer.id}/transactions`)
      .set(bearer(owner.token))
      .expect(200);
    const after = history.body.transactions.map((t: { balanceAfter: number }) => t.balanceAfter).sort((a: number, b: number) => a - b);
    expect(after).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });

  it('rejects zero, negative and fractional amounts with 422', async () => {
    const owner = await registerOwner();
    const customer = await createCustomer(owner.token);
    for (const amount of [0, -5, 12.5]) {
      await addEntry(owner.token, customer.id, 'baki', amount).expect(422);
    }
    await request(app)
      .post(`/owner/customers/${customer.id}/transactions`)
      .set(bearer(owner.token))
      .send({ type: 'gift', amount: 10 })
      .expect(422);
  });

  it('summarises total due and today’s totals for the shop only', async () => {
    const owner = await registerOwner();
    const other = await registerOwner();
    const a = await createCustomer(owner.token);
    const b = await createCustomer(owner.token);
    const c = await createCustomer(owner.token);
    await addEntry(owner.token, a.id, 'baki', 300).expect(201);
    await addEntry(owner.token, b.id, 'baki', 200).expect(201);
    await addEntry(owner.token, c.id, 'joma', 50).expect(201); // advance, must not reduce total due
    const x = await createCustomer(other.token);
    await addEntry(other.token, x.id, 'baki', 9999).expect(201);

    const res = await request(app).get('/owner/summary').set(bearer(owner.token)).expect(200);
    expect(res.body).toEqual({ totalDue: 500, customerCount: 3, todayBaki: 500, todayJoma: 50 });
  });
});
