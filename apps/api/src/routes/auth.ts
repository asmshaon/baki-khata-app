import { loginSchema, ownerRegisterSchema, serverMessage, type CustomerSession, type OwnerSession } from '@baki/shared';
import { eq, isNotNull, and } from 'drizzle-orm';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { db } from '../db/client.js';
import { customers, owners, shops } from '../db/schema.js';
import { checkPin, hashPin, signToken } from '../lib/auth.js';
import { HttpError } from '../lib/http-error.js';
import { langOf } from '../lib/i18n.js';
import { serializeCustomer } from '../lib/serialize.js';
import { validate } from '../lib/validate.js';

export const authRouter = Router();

/** PINs are only 4 digits, so login attempts must be throttled hard. */
authRouter.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    handler: (req, res, _next, options) => {
      res.status(options.statusCode).json({ message: serverMessage(langOf(req), 'tooManyAttempts') });
    },
  }),
);

authRouter.post('/owner/register', async (req, res) => {
  const input = validate(ownerRegisterSchema, req.body);

  const existing = await db.query.owners.findFirst({ where: eq(owners.phone, input.phone) });
  if (existing) {
    throw new HttpError(409, 'ownerPhoneTaken', { phone: ['ownerPhoneTaken'] });
  }

  const pinHash = await hashPin(input.pin);
  const { ownerId, shopId } = await db.transaction(async (tx) => {
    const [owner] = await tx.insert(owners).values({ name: input.name, phone: input.phone, pinHash }).$returningId();
    const [shop] = await tx.insert(shops).values({ ownerId: owner.id, name: input.shopName }).$returningId();
    return { ownerId: owner.id, shopId: shop.id };
  });

  const session: OwnerSession = {
    role: 'owner',
    token: signToken({ role: 'owner', ownerId, shopId }),
    owner: { id: ownerId, name: input.name, phone: input.phone },
    shop: { id: shopId, name: input.shopName },
  };
  res.status(201).json(session);
});

authRouter.post('/owner/login', async (req, res) => {
  const input = validate(loginSchema, req.body);

  const owner = await db.query.owners.findFirst({ where: eq(owners.phone, input.phone) });
  if (!owner || !(await checkPin(input.pin, owner.pinHash))) {
    throw new HttpError(401, 'wrongCredentials');
  }
  const shop = await db.query.shops.findFirst({ where: eq(shops.ownerId, owner.id) });
  if (!shop) {
    throw new HttpError(404, 'shopNotFound');
  }

  const session: OwnerSession = {
    role: 'owner',
    token: signToken({ role: 'owner', ownerId: owner.id, shopId: shop.id }),
    owner: { id: owner.id, name: owner.name, phone: owner.phone },
    shop: { id: shop.id, name: shop.name },
  };
  res.json(session);
});

/**
 * A customer may have accounts at several shops with the same phone.
 * Returns one session per shop whose PIN matches; the app lets them pick.
 */
authRouter.post('/customer/login', async (req, res) => {
  const input = validate(loginSchema, req.body);

  const rows = await db
    .select({ customer: customers, shop: shops })
    .from(customers)
    .innerJoin(shops, eq(shops.id, customers.shopId))
    .where(and(eq(customers.phone, input.phone), isNotNull(customers.pinHash)));

  const sessions: CustomerSession[] = [];
  for (const { customer, shop } of rows) {
    if (customer.pinHash && (await checkPin(input.pin, customer.pinHash))) {
      sessions.push({
        role: 'customer',
        token: signToken({ role: 'customer', customerId: customer.id, shopId: shop.id }),
        customer: serializeCustomer(customer),
        shop: { id: shop.id, name: shop.name },
      });
    }
  }

  if (sessions.length === 0) {
    throw new HttpError(401, 'wrongCredentials');
  }
  res.json({ sessions });
});
