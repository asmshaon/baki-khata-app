import type { Lang } from '@baki/shared';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { formatDateTime, formatNumber } from './format';

/**
 * UI strings. Bangla is the default. Phone numbers, PINs and money use
 * English digits in both languages; dates and counts follow the language.
 */
const bn = {
  appName: 'বাকি খাতা',
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
} as const;

export type StringKey = keyof typeof bn;

const en: Record<StringKey, string> = {
  appName: 'Baki Khata',
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
