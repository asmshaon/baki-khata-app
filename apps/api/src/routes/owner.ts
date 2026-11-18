import {
  customerCreateSchema,
  customerSearchSchema,
  customerUpdateSchema,
  transactionCreateSchema,
  type Summary,
} from '@baki/shared';
import { and, asc, desc, eq, gt, like, or, sql } from 'drizzle-orm';
import { Router, type Request } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import multer from 'multer';
import { z } from 'zod';
import { db } from '../db/client.js';
import { customers, owners, shops, transactions } from '../db/schema.js';
import { hashPin, ownerAuth, requireRole } from '../lib/auth.js';
import { HttpError, notFound } from '../lib/http-error.js';
import { serializeCustomer, serializeTransaction } from '../lib/serialize.js';
import { validate } from '../lib/validate.js';

export const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
mkdirSync(uploadDir, { recursive: true });

const photoUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase() || '.jpg'}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)),
});

const idParam = z.coerce.number().int().positive();

export const ownerRouter = Router();
ownerRouter.use(requireRole('owner'));

/** Loads a customer only if it belongs to the authenticated owner's shop. */
async function findShopCustomer(req: Request) {
  const { shopId } = ownerAuth(req);
  const customerId = validate(idParam, req.params.id);
  const customer = await db.query.customers.findFirst({
    where: and(eq(customers.id, customerId), eq(customers.shopId, shopId)),
  });
  if (!customer) {
    throw notFound('customerNotFound');
  }
  return customer;
}

async function assertPhoneFree(shopId: number, phone: string, exceptId?: number) {
  const clash = await db.query.customers.findFirst({
    where: and(eq(customers.shopId, shopId), eq(customers.phone, phone)),
  });
  if (clash && clash.id !== exceptId) {
    throw new HttpError(409, 'customerPhoneTaken', { phone: ['customerPhoneTaken'] });
  }
}

ownerRouter.get('/me', async (req, res) => {
  const { ownerId, shopId } = ownerAuth(req);
  const owner = await db.query.owners.findFirst({ where: eq(owners.id, ownerId) });
  const shop = await db.query.shops.findFirst({ where: eq(shops.id, shopId) });
  if (!owner || !shop) {
    throw new HttpError(401, 'loginAgain');
  }
  res.json({ owner: { id: owner.id, name: owner.name, phone: owner.phone }, shop: { id: shop.id, name: shop.name } });
});

ownerRouter.get('/summary', async (req, res) => {
  const { shopId } = ownerAuth(req);

  const [due] = await db
    .select({
      totalDue: sql<string>`coalesce(sum(case when ${customers.balance} > 0 then ${customers.balance} else 0 end), 0)`,
      customerCount: sql<number>`count(*)`,
    })
    .from(customers)
    .where(eq(customers.shopId, shopId));

  const [today] = await db
    .select({
      todayBaki: sql<string>`coalesce(sum(case when ${transactions.type} = 'baki' then ${transactions.amount} else 0 end), 0)`,
      todayJoma: sql<string>`coalesce(sum(case when ${transactions.type} = 'joma' then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.shopId, shopId), sql`${transactions.createdAt} >= curdate()`));

  const summary: Summary = {
    totalDue: Number(due.totalDue),
    customerCount: Number(due.customerCount),
    todayBaki: Number(today.todayBaki),
    todayJoma: Number(today.todayJoma),
  };
  res.json(summary);
});

ownerRouter.get('/customers', async (req, res) => {
  const { shopId } = ownerAuth(req);
  const { q } = validate(customerSearchSchema, req.query);

  const search = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const rows = await db
    .select()
    .from(customers)
    .where(and(eq(customers.shopId, shopId), search ? or(like(customers.name, search), like(customers.phone, search)) : undefined))
    .orderBy(desc(gt(customers.balance, 0)), asc(customers.name))
    .limit(500);

  res.json({ customers: rows.map(serializeCustomer) });
});

ownerRouter.post('/customers', async (req, res) => {
  const { shopId } = ownerAuth(req);
  const input = validate(customerCreateSchema, req.body);
  await assertPhoneFree(shopId, input.phone);

  const [{ id }] = await db
    .insert(customers)
    .values({
      shopId,
      name: input.name,
      phone: input.phone,
      address: input.address || null,
      pinHash: input.pin ? await hashPin(input.pin) : null,
    })
    .$returningId();

  const customer = await db.query.customers.findFirst({ where: eq(customers.id, id) });
  res.status(201).json({ customer: serializeCustomer(customer!) });
});

ownerRouter.get('/customers/:id', async (req, res) => {
  const customer = await findShopCustomer(req);
  res.json({ customer: serializeCustomer(customer) });
});

ownerRouter.patch('/customers/:id', async (req, res) => {
  const customer = await findShopCustomer(req);
  const input = validate(customerUpdateSchema, req.body);
  if (input.phone) {
    await assertPhoneFree(customer.shopId, input.phone, customer.id);
  }

  await db
    .update(customers)
    .set({
      name: input.name,
      phone: input.phone,
      address: input.address === undefined ? undefined : input.address || null,
      pinHash: input.pin ? await hashPin(input.pin) : undefined,
    })
    .where(eq(customers.id, customer.id));

  const updated = await db.query.customers.findFirst({ where: eq(customers.id, customer.id) });
  res.json({ customer: serializeCustomer(updated!) });
});

ownerRouter.post('/customers/:id/photo', photoUpload.single('photo'), async (req, res) => {
  const customer = await findShopCustomer(req);
  if (!req.file) {
    throw new HttpError(422, 'photoRequired', { photo: ['photoRequired'] });
  }
  await db.update(customers).set({ photoPath: req.file.filename }).where(eq(customers.id, customer.id));
  res.json({ customer: serializeCustomer({ ...customer, photoPath: req.file.filename }) });
});

ownerRouter.get('/customers/:id/transactions', async (req, res) => {
  const customer = await findShopCustomer(req);
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.customerId, customer.id))
    .orderBy(desc(transactions.createdAt), desc(transactions.id))
    .limit(200);
  res.json({ transactions: rows.map(serializeTransaction) });
});

/**
 * Records baki (credit given, balance up) or joma (payment received,
 * balance down). The customer row is locked so concurrent entries
 * cannot corrupt the running balance.
 */
ownerRouter.post('/customers/:id/transactions', async (req, res) => {
  const { ownerId } = ownerAuth(req);
  const { id: customerId } = await findShopCustomer(req);
  const input = validate(transactionCreateSchema, req.body);

  const result = await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(customers).where(eq(customers.id, customerId)).for('update');
    const balanceAfter = locked.balance + (input.type === 'baki' ? input.amount : -input.amount);

    await tx.update(customers).set({ balance: balanceAfter }).where(eq(customers.id, customerId));
    const [{ id }] = await tx
      .insert(transactions)
      .values({
        shopId: locked.shopId,
        customerId,
        type: input.type,
        amount: input.amount,
        note: input.note || null,
        balanceAfter,
        createdBy: ownerId,
      })
      .$returningId();

    const [row] = await tx.select().from(transactions).where(eq(transactions.id, id));
    return { transaction: row, customer: { ...locked, balance: balanceAfter } };
  });

  res.status(201).json({
    transaction: serializeTransaction(result.transaction),
    customer: serializeCustomer(result.customer),
  });
});
