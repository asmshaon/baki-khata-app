import { relations } from 'drizzle-orm';
import {
  bigint,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

const id = () => bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey();
const ref = (name: string) => bigint(name, { mode: 'number', unsigned: true });

export const owners = mysqlTable('owners', {
  id: id(),
  name: varchar('name', { length: 80 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  pinHash: varchar('pin_hash', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const shops = mysqlTable('shops', {
  id: id(),
  ownerId: ref('owner_id')
    .notNull()
    .references(() => owners.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const customers = mysqlTable(
  'customers',
  {
    id: id(),
    shopId: ref('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 80 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    address: varchar('address', { length: 160 }),
    photoPath: varchar('photo_path', { length: 200 }),
    pinHash: varchar('pin_hash', { length: 100 }),
    balance: int('balance').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('customers_shop_phone_unique').on(table.shopId, table.phone),
    index('customers_phone_idx').on(table.phone),
  ],
);

export const transactions = mysqlTable(
  'transactions',
  {
    id: id(),
    shopId: ref('shop_id')
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    customerId: ref('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    type: mysqlEnum('type', ['baki', 'joma']).notNull(),
    amount: int('amount').notNull(),
    note: varchar('note', { length: 160 }),
    balanceAfter: int('balance_after').notNull(),
    createdBy: ref('created_by').references(() => owners.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('transactions_customer_created_idx').on(table.customerId, table.createdAt),
    index('transactions_shop_created_idx').on(table.shopId, table.createdAt),
  ],
);

export const shopRelations = relations(shops, ({ one, many }) => ({
  owner: one(owners, { fields: [shops.ownerId], references: [owners.id] }),
  customers: many(customers),
}));

