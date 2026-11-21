import type { Lang } from '@baki/shared';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { daysSince, formatDateTime, formatDay, formatNumber } from './format';

/**
 * UI strings. Bangla is the default. Phone numbers, PINs and money use
 * English digits in both languages; dates and counts follow the language.
 */
const bn = {
  appName: 'বাকি খাতা',
  tagline: 'দোকানের বাকির হিসাব, এখন মোবাইলে',
  whoAreYou: 'আপনি কে?',
  roleOwner: 'দোকানদার',
  roleCustomer: 'ক্রেতা',
  language: 'ভাষা',
  ok: 'ঠিক আছে',
  yes: 'হ্যাঁ',
  no: 'না',
  cancel: 'বাতিল',
  delete: 'মুছুন',
  retry: 'আবার চেষ্টা',
  signOut: 'বের হন',
  signOutConfirm: 'বের হবেন?',
  signOutYes: 'হ্যাঁ, বের হব',
  networkError: 'ইন্টারনেট সংযোগ নেই, আবার চেষ্টা করুন',
  genericError: 'সমস্যা হয়েছে, আবার চেষ্টা করুন',

  yourPhone: 'আপনার মোবাইল নম্বর',
  yourPin: 'আপনার ৪ সংখ্যার পিন',
  openNewKhata: 'নতুন খাতা খুলুন',
  shopName: 'দোকানের নাম',
  shopNamePlaceholder: 'যেমন: মায়ের দোয়া স্টোর',
  yourName: 'আপনার নাম',
  newPin: 'নতুন ৪ সংখ্যার পিন দিন',
  pinAgain: 'পিন আবার দিন',
  pinMismatch: 'দুইবার একই পিন দিন',
  customerPinLabel: 'দোকানদারের দেওয়া পিন',
  whichShop: 'কোন দোকান?',

  totalDue: 'মোট বাকি',
  todayBaki: 'আজ বাকি',
  todayJoma: 'আজ পেলাম',
  searchPlaceholder: 'নাম বা নম্বর খুঁজুন',
  customerCount: '{n} জন গ্রাহক',
  noneFound: 'কাউকে পাওয়া যায়নি',
  noCustomers: 'এখনো কোনো গ্রাহক নেই',
  newCustomer: 'নতুন গ্রাহক',

  customerPhoto: 'গ্রাহকের ছবি',
  takePhoto: 'ছবি তুলুন',
  gallery: 'গ্যালারি',
  noPhoto: 'ছবি ছাড়া',
  customerName: 'গ্রাহকের নাম',
  customerPhone: 'গ্রাহকের মোবাইল নম্বর',
  addCustomerConfirm: 'নতুন গ্রাহক যোগ করবেন?',

  changePhoto: 'ছবি বদলান',
  call: 'ফোন করুন',
  editInfo: 'তথ্য বদলান',
  bakiGiven: 'বাকি দিলাম',
  paymentReceived: 'টাকা পেলাম',
  history: 'হিসাব',
  noHistory: 'এখনো কোনো হিসাব নেই',
  balanceOwes: 'বাকি আছে',
  balanceAdvance: 'আগাম জমা',
  balanceClear: 'কোনো বাকি নেই',
  howMuchBaki: 'কত টাকা বাকি দিলেন?',
  howMuchJoma: 'কত টাকা পেলেন?',
  afterThis: 'এরপর',

  customerInfo: 'গ্রাহকের তথ্য',
  name: 'নাম',
  address: 'ঠিকানা',
  optional: 'ঐচ্ছিক',
  save: 'সংরক্ষণ করুন',
  customerPin: 'ক্রেতার পিন',
  customerPinFor: 'ক্রেতার জন্য ৪ সংখ্যার পিন',
  pinSaved: 'নতুন পিন: {pin} — ক্রেতাকে জানিয়ে দিন',
  pinIsSet: 'পিন দেওয়া আছে। ক্রেতা নিজের হিসাব দেখতে পারবেন।',
  pinNotSet: 'পিন দিলে ক্রেতা নিজের হিসাব দেখতে পারবেন।',
  setPin: 'পিন দিন',
  changePin: 'পিন বদলান',

  filterAll: 'সবাই',
  filterOwing: 'বাকিদার',
  today: 'আজ',
  yesterday: 'গতকাল',
  daysAgo: '{n} দিন আগে',
  noEntryYet: 'এখনো লেনদেন হয়নি',
  longDue: '{n}+ দিন',
  owesShort: 'বাকি',
  advanceShort: 'জমা',
  remind: 'তাগাদা দিন',
  remindHow: 'কীভাবে তাগাদা দেবেন?',
  remindMessage: 'আসসালামু আলাইকুম {name}, {shop}-এ আপনার বাকি {amount}। সুবিধামতো পরিশোধ করার অনুরোধ রইল। ধন্যবাদ।',
  appMissing: 'এই অ্যাপটি ফোনে নেই',
  whatTaken: 'কী কী নিলেন? (ঐচ্ছিক)',
  howPaid: 'কীভাবে দিলেন? (ঐচ্ছিক)',
  itemRice: 'চাল',
  itemLentil: 'ডাল',
  itemOil: 'তেল',
  itemSugar: 'চিনি',
  itemEgg: 'ডিম',
  itemVeg: 'সবজি',
  itemSoap: 'সাবান',
  itemRecharge: 'রিচার্জ',
  payCash: 'ক্যাশ',
  payBkash: 'বিকাশ',
  payNagad: 'নগদ',
  payRocket: 'রকেট',
  undoEntry: 'ভুল? মুছুন',
  undoConfirm: 'এই হিসাব মুছবেন?',
  undoYes: 'হ্যাঁ, মুছুন',

  quickAmounts: 'এক চাপে টাকা',
  whenPay: 'কবে দেবেন? (ঐচ্ছিক)',
  promise3: '৩ দিন পর',
  promise7: '৭ দিন পর',
  promise15: '১৫ দিন পর',
  promiseMonth: 'মাসের ১ তারিখ',
  promiseFriday: 'শুক্রবার',
  promiseNone: 'জানি না',
  noDate: 'তারিখ ছাড়া',
  promiseOn: '{date} দেবেন',
  promiseToday: 'আজ দেবে',
  promiseLate: 'দেরি: {date}',
  dueToday: 'আজ দেওয়ার কথা · {n} জন',
  todayReport: 'আজকের হিসাব',
  report: 'দিনের হিসাব',
  previousDay: 'আগের দিন',
  nextDay: 'পরের দিন',
  peopleCount: '{n} জন',
  howReceived: 'কীভাবে পেলাম',
  methodUnknown: 'উল্লেখ নেই',
  dayEntries: 'এই দিনের লেনদেন',
  noEntriesDay: 'এই দিনে কোনো লেনদেন নেই',
  sendStatement: 'হিসাব পাঠান',
  statementRange: 'কত দিনের হিসাব?',
  rangeLast5: 'শেষ ৫টি',
  rangeMonth: 'এই মাস',
  rangeAll: 'সব',
  willSend: 'যা পাঠানো হবে',
  sendNote: 'ফোনের অ্যাপ খুলবে — আপনি নিজে পাঠান চাপবেন',
  statementTitle: '{shop} — {name}-এর হিসাব',
  statementBaki: 'বাকি',
  statementJoma: 'জমা',
  statementMore: '… আরও {n}টি হিসাব',
  statementTotalOwes: 'মোট বাকি: {amount}',
  statementTotalAdvance: 'আগাম জমা: {amount}',
  statementClear: 'কোনো বাকি নেই',
  thanks: 'ধন্যবাদ।',
  remindPromise: 'আপনি {date} দেবেন বলেছিলেন।',
} as const;

export type StringKey = keyof typeof bn;

const en: Record<StringKey, string> = {
  appName: 'Baki Khata',
  tagline: "Your shop's credit book, on your phone",
  whoAreYou: 'Who are you?',
  roleOwner: 'Shop owner',
  roleCustomer: 'Customer',
  language: 'Language',
  ok: 'OK',
  yes: 'Yes',
  no: 'No',
  cancel: 'Cancel',
  delete: 'Delete',
  retry: 'Try again',
  signOut: 'Log out',
  signOutConfirm: 'Log out?',
  signOutYes: 'Yes, log out',
  networkError: 'No connection, please try again',
  genericError: 'Something went wrong, please try again',

  yourPhone: 'Your mobile number',
  yourPin: 'Your 4-digit PIN',
  openNewKhata: 'Open a new khata',
  shopName: 'Shop name',
  shopNamePlaceholder: 'e.g. Mayer Doa Store',
  yourName: 'Your name',
  newPin: 'Choose a 4-digit PIN',
  pinAgain: 'Enter the PIN again',
  pinMismatch: 'Enter the same PIN twice',
  customerPinLabel: 'PIN from the shop owner',
  whichShop: 'Which shop?',

  totalDue: 'Total due',
  todayBaki: 'Credit today',
  todayJoma: 'Received today',
  searchPlaceholder: 'Search name or number',
  customerCount: '{n} customers',
  noneFound: 'No one found',
  noCustomers: 'No customers yet',
  newCustomer: 'New customer',

  customerPhoto: 'Customer photo',
  takePhoto: 'Take photo',
  gallery: 'Gallery',
  noPhoto: 'No photo',
  customerName: 'Customer name',
  customerPhone: "Customer's mobile number",
  addCustomerConfirm: 'Add this customer?',

  changePhoto: 'Change photo',
  call: 'Call',
  editInfo: 'Edit details',
  bakiGiven: 'Gave credit',
  paymentReceived: 'Got paid',
  history: 'History',
  noHistory: 'No entries yet',
  balanceOwes: 'Owes',
  balanceAdvance: 'Paid in advance',
  balanceClear: 'Nothing due',
  howMuchBaki: 'How much credit?',
  howMuchJoma: 'How much did you get?',
  afterThis: 'After this:',

  customerInfo: 'Customer details',
  name: 'Name',
  address: 'Address',
  optional: 'Optional',
  save: 'Save',
  customerPin: 'Customer PIN',
  customerPinFor: '4-digit PIN for the customer',
  pinSaved: 'New PIN: {pin} — tell the customer',
  pinIsSet: 'A PIN is set. The customer can see their own account.',
  pinNotSet: 'Set a PIN so the customer can see their own account.',
  setPin: 'Set PIN',
  changePin: 'Change PIN',

  filterAll: 'All',
  filterOwing: 'Owing',
  today: 'Today',
  yesterday: 'Yesterday',
  daysAgo: '{n} days ago',
  noEntryYet: 'No entries yet',
  longDue: '{n}+ days',
  owesShort: 'due',
  advanceShort: 'advance',
  remind: 'Send reminder',
  remindHow: 'How to send the reminder?',
  remindMessage: 'Hello {name}, your due at {shop} is {amount}. Please pay when convenient. Thank you.',
  appMissing: 'This app is not on the phone',
  whatTaken: 'What was taken? (optional)',
  howPaid: 'How was it paid? (optional)',
  itemRice: 'Rice',
  itemLentil: 'Lentils',
  itemOil: 'Oil',
  itemSugar: 'Sugar',
  itemEgg: 'Eggs',
  itemVeg: 'Vegetables',
  itemSoap: 'Soap',
  itemRecharge: 'Recharge',
  payCash: 'Cash',
  payBkash: 'bKash',
  payNagad: 'Nagad',
  payRocket: 'Rocket',
  undoEntry: 'Mistake? Delete',
  undoConfirm: 'Delete this entry?',
  undoYes: 'Yes, delete',

  quickAmounts: 'One-tap amounts',
  whenPay: 'When will they pay? (optional)',
  promise3: 'In 3 days',
  promise7: 'In 7 days',
  promise15: 'In 15 days',
  promiseMonth: '1st of the month',
  promiseFriday: 'Friday',
  promiseNone: "Don't know",
  noDate: 'No date',
  promiseOn: 'Pays {date}',
  promiseToday: 'Pays today',
  promiseLate: 'Late: {date}',
  dueToday: 'Due today · {n}',
  todayReport: "Today's report",
  report: 'Daily report',
  previousDay: 'Previous day',
  nextDay: 'Next day',
  peopleCount: '{n} people',
  howReceived: 'How it was paid',
  methodUnknown: 'Not given',
  dayEntries: "This day's entries",
  noEntriesDay: 'No entries on this day',
  sendStatement: 'Send statement',
  statementRange: 'Which entries?',
  rangeLast5: 'Last 5',
  rangeMonth: 'This month',
  rangeAll: 'All',
  willSend: 'This will be sent',
  sendNote: 'Your phone app opens — you press send yourself',
  statementTitle: '{shop} — statement for {name}',
  statementBaki: 'credit',
  statementJoma: 'paid',
  statementMore: '… {n} more entries',
  statementTotalOwes: 'Total due: {amount}',
  statementTotalAdvance: 'Paid in advance: {amount}',
  statementClear: 'Nothing due',
  thanks: 'Thank you.',
  remindPromise: 'You said you would pay on {date}.',
};

const STRINGS: Record<Lang, Record<StringKey, string>> = { bn, en };
const STORAGE_KEY = 'baki.lang';

/** Current language for code outside React (the API client sends it as Accept-Language). */
let currentLang: Lang = 'bn';
export const getLang = () => currentLang;

export function translate(lang: Lang, key: StringKey, vars?: Record<string, string | number>): string {
  let text = STRINGS[lang][key];
  if (vars) for (const [name, value] of Object.entries(vars)) text = text.replace(`{${name}}`, String(value));
  return text;
}

type I18n = {
  lang: Lang;
  ready: boolean;
  setLang: (lang: Lang) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  /** Count or other plain number in the current language's digits. */
  num: (value: number) => string;
  dateTime: (iso: string) => string;
  /** "আজ", "গতকাল", "৫ দিন আগে". */
  ago: (iso: string) => string;
  /** A YYYY-MM-DD day as "১ ডিসেম্বর" / "1 Dec". */
  day: (dayString: string) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('bn');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'en' || stored === 'bn') {
          currentLang = stored;
          setLangState(stored);
        }
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const setLang = useCallback((next: Lang) => {
    currentLang = next;
    setLangState(next);
    void SecureStore.setItemAsync(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18n>(
    () => ({
      lang,
      ready,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      num: (n) => formatNumber(n, lang),
      dateTime: (iso) => formatDateTime(iso, lang),
      ago: (iso) => {
        const days = daysSince(iso);
        if (days <= 0) return translate(lang, 'today');
        if (days === 1) return translate(lang, 'yesterday');
        return translate(lang, 'daysAgo', { n: formatNumber(days, lang) });
      },
      day: (d) => formatDay(d, lang),
    }),
    [lang, ready, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
