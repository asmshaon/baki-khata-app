import type { Customer, Transaction } from '@baki/shared';
import { Alert, Linking, Platform } from 'react-native';
import { formatDay, formatTaka, toBanglaDigits } from './format';
import { getLang, translate } from './i18n';

/** Polite payment reminder (তাগাদা) in the current language, with the promised day if there is one. */
export function reminderText(customer: Pick<Customer, 'name' | 'balance' | 'promisedOn'>, shop: string) {
  const lang = getLang();
  const text = translate(lang, 'remindMessage', { name: customer.name, shop, amount: formatTaka(customer.balance) });
  if (!customer.promisedOn) return text;
  // Put the promise sentence before the closing "please pay… thank you".
  return `${text} ${translate(lang, 'remindPromise', { date: formatDay(customer.promisedOn, lang) })}`;
}

/** A plain-text statement: one line per entry, then the balance. `total` is how many entries exist in the range. */
export function statementText(customer: Pick<Customer, 'name' | 'balance'>, shop: string, entries: Transaction[], total: number) {
  const lang = getLang();
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string | number>) => translate(lang, key, vars);
  const methodKey = { cash: 'payCash', bkash: 'payBkash', nagad: 'payNagad', rocket: 'payRocket' } as const;
  const lines = entries.map((tx) => {
    const extras = [tx.method ? t(methodKey[tx.method]) : null, tx.note].filter(Boolean).join(', ');
    const kind = t(tx.type === 'baki' ? 'statementBaki' : 'statementJoma');
    return `${formatDay(new Date(tx.createdAt), lang)}: ${kind} ${formatTaka(tx.amount)}${extras ? ` (${extras})` : ''}`;
  });
  if (total > entries.length) lines.push(t('statementMore', { n: lang === 'bn' ? toBanglaDigits(total - entries.length) : total - entries.length }));
  const balance =
    customer.balance > 0
      ? t('statementTotalOwes', { amount: formatTaka(customer.balance) })
      : customer.balance < 0
        ? t('statementTotalAdvance', { amount: formatTaka(customer.balance) })
        : t('statementClear');
  return [t('statementTitle', { shop, name: customer.name }), '', ...lines, '', balance, t('thanks')].join('\n');
}

/** Opens the phone's SMS app with the message filled in. Nothing is sent until the owner presses send. */
export function openSms(phone: string, text: string) {
  const sep = Platform.OS === 'ios' ? '&' : '?';
  return open(`sms:${phone}${sep}body=${encodeURIComponent(text)}`);
}

/** Opens WhatsApp on the customer's chat. Bangladeshi 01XXXXXXXXX becomes 8801XXXXXXXXX. */
export function openWhatsApp(phone: string, text: string) {
  return open(`https://wa.me/88${phone}?text=${encodeURIComponent(text)}`);
}

async function open(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(translate(getLang(), 'appMissing'));
  }
}
