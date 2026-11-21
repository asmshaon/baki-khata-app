import type { PaymentMethod } from '@baki/shared';
import type { StringKey } from './i18n';

/** How a joma was paid: stored as `transactions.method`, shown in the current language. */
export const METHOD_LABEL: Record<PaymentMethod, StringKey> = {
  cash: 'payCash',
  bkash: 'payBkash',
  nagad: 'payNagad',
  rocket: 'payRocket',
};

export const METHODS = Object.keys(METHOD_LABEL) as PaymentMethod[];
