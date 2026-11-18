import type { CustomerSession } from '@baki/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { addEntry, app, bearer, createCustomer, registerOwner, useCleanDatabase } from './helpers.js';

useCleanDatabase();

async function customerLogin(phone: string, pin: string) {
  const res = await request(app).post('/auth/customer/login').send({ phone, pin }).expect(200);
  return res.body.sessions as CustomerSession[];
}

describe('customer portal', () => {
  it('shows the customer their own balance and history', async () => {
    const owner = await registerOwner({ shopName: 'রহিম স্টোর' });
    const customer = await createCustomer(owner.token, { pin: '2468' });
    await addEntry(owner.token, customer.id, 'baki', 400).expect(201);
    await addEntry(owner.token, customer.id, 'joma', 150).expect(201);

    const [session] = await customerLogin(customer.phone, '2468');

    const me = await request(app).get('/customer/me').set(bearer(session.token)).expect(200);
    expect(me.body.customer).toMatchObject({ id: customer.id, balance: 250 });
    expect(me.body.shop.name).toBe('রহিম স্টোর');

    const history = await request(app).get('/customer/transactions').set(bearer(session.token)).expect(200);
    expect(history.body.transactions.map((t: { type: string }) => t.type)).toEqual(['joma', 'baki']);
  });

  it('only shows the ledger of the shop the session belongs to', async () => {
    const shopA = await registerOwner();
    const shopB = await registerOwner();
    const phone = '01811000001';
    const inA = await createCustomer(shopA.token, { phone, pin: '2468' });
    const inB = await createCustomer(shopB.token, { phone, pin: '2468' });
    await addEntry(shopA.token, inA.id, 'baki', 100).expect(201);
    await addEntry(shopB.token, inB.id, 'baki', 700).expect(201);

    const sessions = await customerLogin(phone, '2468');
    const sessionA = sessions.find((s) => s.shop.id === shopA.shop.id)!;

    const history = await request(app).get('/customer/transactions').set(bearer(sessionA.token)).expect(200);
    expect(history.body.transactions).toHaveLength(1);
    expect(history.body.transactions[0].amount).toBe(100);
  });

  it('does not let an owner token reach customer routes', async () => {
    const owner = await registerOwner();
    await request(app).get('/customer/me').set(bearer(owner.token)).expect(403);
  });
});
