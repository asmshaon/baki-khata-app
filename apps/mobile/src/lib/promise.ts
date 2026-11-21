import type { StringKey } from './i18n';
import { toDayString } from './format';

export type PromiseOption = { key: StringKey; day: string | null };

const addDays = (from: Date, n: number) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + n);

/** The promise-date chips shown when giving baki, computed from today (local time). */
export function promiseOptions(today = new Date()): PromiseOption[] {
  const firstOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const daysToFriday = (5 - today.getDay() + 7) % 7 || 7; // the coming Friday, never today
  return [
    { key: 'promise3', day: toDayString(addDays(today, 3)) },
    { key: 'promise7', day: toDayString(addDays(today, 7)) },
    { key: 'promise15', day: toDayString(addDays(today, 15)) },
    { key: 'promiseMonth', day: toDayString(firstOfNextMonth) },
    { key: 'promiseFriday', day: toDayString(addDays(today, daysToFriday)) },
    { key: 'promiseNone', day: null },
  ];
}

/** Promise is today or already past, and money is still owed. */
export function isPromiseDue(promisedOn: string | null, balance: number, today = new Date()): boolean {
  return balance > 0 && promisedOn !== null && promisedOn <= toDayString(today);
}
