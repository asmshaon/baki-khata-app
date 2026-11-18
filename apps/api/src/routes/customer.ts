import { desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../db/client.js';
import { customers, shops, transactions } from '../db/schema.js';
import { customerAuth, requireRole } from '../lib/auth.js';
import { HttpError } from '../lib/http-error.js';
import { serializeCustomer, serializeTransaction } from '../lib/serialize.js';

/** Read-only portal: a customer sees only their own balance and history. */
export const customerRouter = Router();
customerRouter.use(requireRole('customer'));

customerRouter.get('/me', async (req, res) => {
  const { customerId, shopId } = customerAuth(req);
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
  const shop = await db.query.shops.findFirst({ where: eq(shops.id, shopId) });
  if (!customer || !shop || customer.shopId !== shop.id) {
    throw new HttpError(401, 'loginAgain');
  }
  res.json({ customer: serializeCustomer(customer), shop: { id: shop.id, name: shop.name } });
});

customerRouter.get('/transactions', async (req, res) => {
  const { customerId } = customerAuth(req);
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.customerId, customerId))
    .orderBy(desc(transactions.createdAt), desc(transactions.id))
    .limit(200);
  res.json({ transactions: rows.map(serializeTransaction) });
});
