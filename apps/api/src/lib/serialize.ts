import type { Customer, Transaction } from '@baki/shared';
import type { customers, transactions } from '../db/schema.js';

type CustomerRow = typeof customers.$inferSelect;
type TransactionRow = typeof transactions.$inferSelect;

export function serializeCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    photoUrl: row.photoPath ? `/uploads/${row.photoPath}` : null,
    balance: row.balance,
    hasPin: row.pinHash !== null,
    lastEntryAt: row.lastEntryAt?.toISOString() ?? null,
    promisedOn: row.promisedOn ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    customerId: row.customerId,
    type: row.type,
    amount: row.amount,
    method: row.method,
    note: row.note,
    balanceAfter: row.balanceAfter,
    createdAt: row.createdAt.toISOString(),
  };
}
