import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, createCustomer, nextPhone, registerOwner, useCleanDatabase } from './helpers.js';

useCleanDatabase();

describe('owner auth', () => {
  it('registers an owner with a shop and returns a session', async () => {
    const phone = nextPhone();
    const session = await registerOwner({ phone, shopName: 'মায়ের দোয়া স্টোর' });

    expect(session.role).toBe('owner');
    expect(session.token).toEqual(expect.any(String));
    expect(session.owner).toMatchObject({ name: 'রহিম', phone });
    expect(session.shop.name).toBe('মায়ের দোয়া স্টোর');

    const me = await request(app).get('/owner/me').set('Authorization', `Bearer ${session.token}`).expect(200);
    expect(me.body.shop.id).toBe(session.shop.id);
  });

  it('logs in with the right PIN', async () => {
    const phone = nextPhone();
    const registered = await registerOwner({ phone, pin: '4321' });

    const res = await request(app).post('/auth/owner/login').send({ phone, pin: '4321' }).expect(200);
    expect(res.body.owner.id).toBe(registered.owner.id);
    expect(res.body.shop.id).toBe(registered.shop.id);
  });

  it('rejects a wrong PIN and an unknown phone with the same 401', async () => {
    const phone = nextPhone();
    await registerOwner({ phone, pin: '4321' });

    const wrongPin = await request(app).post('/auth/owner/login').send({ phone, pin: '0000' }).expect(401);
    const unknown = await request(app).post('/auth/owner/login').send({ phone: nextPhone(), pin: '4321' }).expect(401);
    expect(wrongPin.body.message).toBe(unknown.body.message);
  });

  it('refuses a second registration for the same phone', async () => {
    const phone = nextPhone();
    await registerOwner({ phone });

    const res = await request(app)
      .post('/auth/owner/register')
      .send({ name: 'অন্য', phone, pin: '1111', shopName: 'অন্য দোকান' })
      .expect(409);
    expect(res.body.fieldErrors.phone).toHaveLength(1);
  });

  it('returns 422 with per-field Bangla errors for bad input', async () => {
    const res = await request(app)
      .post('/auth/owner/register')
      .send({ name: '', phone: '12345', pin: '12', shopName: 'দোকান' })
      .expect(422);

    expect(res.body.message).toEqual(expect.any(String));
    expect(Object.keys(res.body.fieldErrors).sort()).toEqual(['name', 'phone', 'pin']);
    expect(res.body.fieldErrors.pin[0]).toBe('৪ সংখ্যার পিন দিন');
  });

  it('rejects requests without a valid token', async () => {
    await request(app).get('/owner/me').expect(401);
    await request(app).get('/owner/me').set('Authorization', 'Bearer not-a-jwt').expect(401);
  });
});

describe('customer auth', () => {
  it('returns one session per shop where the phone and PIN match', async () => {
    const phone = nextPhone();
    const shopA = await registerOwner({ shopName: 'দোকান ক' });
    const shopB = await registerOwner({ shopName: 'দোকান খ' });
    const shopC = await registerOwner({ shopName: 'দোকান গ' });
    await createCustomer(shopA.token, { phone, pin: '5555' });
    await createCustomer(shopB.token, { phone, pin: '5555' });
    await createCustomer(shopC.token, { phone, pin: '9999' }); // different PIN

    const res = await request(app).post('/auth/customer/login').send({ phone, pin: '5555' }).expect(200);

    const shopNames = res.body.sessions.map((s: { shop: { name: string } }) => s.shop.name).sort();
    expect(shopNames).toEqual(['দোকান ক', 'দোকান খ']);
    for (const session of res.body.sessions) {
      expect(session.role).toBe('customer');
      expect(session.customer.phone).toBe(phone);
    }
  });

  it('rejects a wrong PIN and customers without a PIN', async () => {
    const owner = await registerOwner();
    const withPin = await createCustomer(owner.token, { pin: '5555' });
    const noPin = await createCustomer(owner.token);

    await request(app).post('/auth/customer/login').send({ phone: withPin.phone, pin: '0000' }).expect(401);
    await request(app).post('/auth/customer/login').send({ phone: noPin.phone, pin: '0000' }).expect(401);
  });

  it('does not let a customer token reach owner routes', async () => {
    const owner = await registerOwner();
    const customer = await createCustomer(owner.token, { pin: '5555' });
    const login = await request(app).post('/auth/customer/login').send({ phone: customer.phone, pin: '5555' }).expect(200);

    await request(app)
      .get('/owner/customers')
      .set('Authorization', `Bearer ${login.body.sessions[0].token}`)
      .expect(403);
  });
});

describe('language', () => {
  it('answers in Bangla by default and in English when asked', async () => {
    const body = { phone: nextPhone(), pin: '9999' };

    const bn = await request(app).post('/auth/owner/login').send(body).expect(401);
    expect(bn.body.message).toBe('নম্বর বা পিন ভুল');

    const en = await request(app).post('/auth/owner/login').set('Accept-Language', 'en').send(body).expect(401);
    expect(en.body.message).toBe('Wrong number or PIN');
  });

  it('translates field errors, including default Zod messages', async () => {
    const res = await request(app)
      .post('/auth/owner/register')
      .set('Accept-Language', 'en')
      .send({ name: 'x'.repeat(200), phone: '123', pin: '1', shopName: 'দোকান' })
      .expect(422);
    expect(res.body.message).toBe('Some details are not right');
    expect(res.body.fieldErrors).toEqual({
      name: ['Not valid'],
      phone: ['Enter a valid mobile number'],
      pin: ['Enter a 4-digit PIN'],
    });
  });

  it('translates the 404 fallback', async () => {
    const res = await request(app).get('/nope').set('Accept-Language', 'en').expect(404);
    expect(res.body.message).toBe('Not found');
  });
});
