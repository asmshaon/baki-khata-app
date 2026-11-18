import { z } from 'zod';

export * from './messages';

/**
 * Validation messages are message keys (see messages.ts); the API translates them.
 *
 * Shared request/response contracts for the Baki Khata API and mobile app.
 * Money is always whole taka (integers). A positive balance means the
 * customer owes the shop (baki); joma (payment) brings it down.
 */

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^01[3-9]\d{8}$/, 'phoneInvalid');

export const pinSchema = z.string().regex(/^\d{4}$/, 'pinInvalid');

export const nameSchema = z.string().trim().min(1, 'nameRequired').max(80);

export const ownerRegisterSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  pin: pinSchema,
  shopName: z.string().trim().min(1, 'shopNameRequired').max(80),
});
export type OwnerRegisterInput = z.infer<typeof ownerRegisterSchema>;

export const loginSchema = z.object({
  phone: phoneSchema,
  pin: pinSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const customerCreateSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  address: z.string().trim().max(160).optional(),
  pin: pinSchema.optional(),
});
export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

export const customerUpdateSchema = customerCreateSchema.partial();
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export const transactionTypeSchema = z.enum(['baki', 'joma']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const transactionCreateSchema = z.object({
  type: transactionTypeSchema,
  amount: z.number().int().positive('amountInvalid').max(10_000_000),
  note: z.string().trim().max(160).optional(),
});
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;

export const customerSearchSchema = z.object({
  q: z.string().trim().max(80).optional(),
});

export type Role = 'owner' | 'customer';

export interface Shop {
  id: number;
  name: string;
}

export interface Owner {
  id: number;
  name: string;
  phone: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  photoUrl: string | null;
  balance: number;
  hasPin: boolean;
  createdAt: string;
}

export interface Transaction {
  id: number;
  customerId: number;
  type: TransactionType;
  amount: number;
  note: string | null;
  balanceAfter: number;
  createdAt: string;
}

export interface Summary {
  totalDue: number;
  customerCount: number;
  todayBaki: number;
  todayJoma: number;
}

export interface OwnerSession {
  role: 'owner';
  token: string;
  owner: Owner;
  shop: Shop;
}

export interface CustomerSession {
  role: 'customer';
  token: string;
  customer: Customer;
  shop: Shop;
}

export interface ApiError {
  message: string;
  fieldErrors?: Record<string, string[]>;
}
