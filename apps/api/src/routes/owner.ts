import {
  customerCreateSchema,
  customerSearchSchema,
  customerUpdateSchema,
  reportQuerySchema,
  transactionCreateSchema,
  type Summary,
} from '@baki/shared';
import { and, asc, desc, eq, gt, gte, like, lt, or, sql } from 'drizzle-orm';
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

    const [{ id }] = await tx
      .insert(transactions)
      .values({
        shopId: locked.shopId,
        customerId,
        type: input.type,
        amount: input.amount,
        method: input.type === 'joma' ? (input.method ?? null) : null,
        note: input.note || null,
        balanceAfter,
        createdBy: ownerId,
      })
      .$returningId();

    const [row] = await tx.select().from(transactions).where(eq(transactions.id, id));
    // A baki may carry a new promise date; once nothing is owed, any promise is done.
    let promisedOn = locked.promisedOn;
    if (input.type === 'baki' && input.promisedOn !== undefined) promisedOn = input.promisedOn;
    if (balanceAfter <= 0) promisedOn = null;

    const changes = { balance: balanceAfter, lastEntryAt: row.createdAt, promisedOn };
    await tx.update(customers).set(changes).where(eq(customers.id, customerId));
    return { transaction: row, customer: { ...locked, ...changes } };
  });

  res.status(201).json({
    transaction: serializeTransaction(result.transaction),
    customer: serializeCustomer(result.customer),
  });
});

const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Undoes a mistaken entry. Only the customer's latest entry, and only within
 * 24 hours, so the balance_after chain stays correct and older history
 * (which the customer can see) cannot be rewritten.
 */
ownerRouter.delete('/customers/:id/transactions/:txId', async (req, res) => {
  const { id: customerId } = await findShopCustomer(req);
  const txId = validate(idParam, req.params.txId);

  const customer = await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(customers).where(eq(customers.id, customerId)).for('update');
    const [latest, previous] = await tx
      .select()
      .from(transactions)
      .where(eq(transactions.customerId, customerId))
      .orderBy(desc(transactions.id))
      .limit(2);

    if (!latest || latest.id !== txId) {
      const [target] = await tx
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.id, txId), eq(transactions.customerId, customerId)));
      throw target ? new HttpError(409, 'onlyLastEntry') : notFound('entryNotFound');
    }
    if (Date.now() - latest.createdAt.getTime() > UNDO_WINDOW_MS) {
      throw new HttpError(409, 'entryTooOld');
    }

    const balance = locked.balance - (latest.type === 'baki' ? latest.amount : -latest.amount);
    const lastEntryAt = previous?.createdAt ?? null;
    await tx.delete(transactions).where(eq(transactions.id, latest.id));
    await tx.update(customers).set({ balance, lastEntryAt }).where(eq(customers.id, customerId));
    return { ...locked, balance, lastEntryAt };
  });

  res.json({ customer: serializeCustomer(customer) });
});

/** Daily report: every entry in [from, to) across the shop, newest first. */
ownerRouter.get('/report', async (req, res) => {
  const { shopId } = ownerAuth(req);
  const { from, to } = validate(reportQuerySchema, req.query);

  const rows = await db
    .select({ tx: transactions, customerName: customers.name, photoPath: customers.photoPath })
    .from(transactions)
    .innerJoin(customers, eq(customers.id, transactions.customerId))
    .where(
      and(
        eq(transactions.shopId, shopId),
        gte(transactions.createdAt, new Date(from)),
        lt(transactions.createdAt, new Date(to)),
      ),
    )
    .orderBy(desc(transactions.createdAt), desc(transactions.id))
    .limit(1000);

  res.json({
    entries: rows.map((r) => ({
      ...serializeTransaction(r.tx),
      customerName: r.customerName,
      customerPhotoUrl: r.photoPath ? `/uploads/${r.photoPath}` : null,
    })),
  });
});
