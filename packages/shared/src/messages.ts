/**
 * Server message catalogue. The API and the shared Zod schemas use these
 * keys; the API translates them per request (Accept-Language) before
 * sending `{ message, fieldErrors }` to the app.
 */
export type Lang = 'bn' | 'en';

const bn = {
  notFound: 'পাওয়া যায়নি',
  badRequest: 'অনুরোধ ঠিক নেই',
  serverError: 'সমস্যা হয়েছে, আবার চেষ্টা করুন',
  invalidInput: 'তথ্য ঠিক নেই',
  invalidValue: 'ঠিক নেই',
  tooManyAttempts: 'অনেকবার চেষ্টা হয়েছে, ১৫ মিনিট পরে আবার চেষ্টা করুন',
  loginAgain: 'আবার লগইন করুন',
  forbidden: 'অনুমতি নেই',
  wrongCredentials: 'নম্বর বা পিন ভুল',
  ownerPhoneTaken: 'এই নম্বরে আগেই খাতা খোলা আছে',
  shopNotFound: 'দোকান পাওয়া যায়নি',
  customerNotFound: 'গ্রাহক পাওয়া যায়নি',
  customerPhoneTaken: 'এই নম্বরের গ্রাহক আগেই আছে',
  photoRequired: 'ছবি দিন',
  photoInvalid: 'ছবি অনেক বড় বা ঠিক নেই',
  phoneInvalid: 'সঠিক মোবাইল নম্বর দিন',
  pinInvalid: '৪ সংখ্যার পিন দিন',
  nameRequired: 'নাম দিন',
  shopNameRequired: 'দোকানের নাম দিন',
  amountInvalid: 'টাকার পরিমাণ দিন',
} as const;

export type MessageKey = keyof typeof bn;

const en: Record<MessageKey, string> = {
  notFound: 'Not found',
  badRequest: 'Bad request',
  serverError: 'Something went wrong, please try again',
  invalidInput: 'Some details are not right',
  invalidValue: 'Not valid',
  tooManyAttempts: 'Too many tries. Please try again in 15 minutes',
  loginAgain: 'Please log in again',
  forbidden: 'Not allowed',
  wrongCredentials: 'Wrong number or PIN',
  ownerPhoneTaken: 'A khata is already open with this number',
  shopNotFound: 'Shop not found',
  customerNotFound: 'Customer not found',
  customerPhoneTaken: 'A customer with this number already exists',
  photoRequired: 'Add a photo',
  photoInvalid: 'The photo is too large or not valid',
  phoneInvalid: 'Enter a valid mobile number',
  pinInvalid: 'Enter a 4-digit PIN',
  nameRequired: 'Enter a name',
  shopNameRequired: 'Enter the shop name',
  amountInvalid: 'Enter an amount',
};

const catalogue: Record<Lang, Record<MessageKey, string>> = { bn, en };

export function isMessageKey(value: string): value is MessageKey {
  return Object.prototype.hasOwnProperty.call(bn, value);
}

/** Translates a message key; anything unknown (e.g. a default Zod message) becomes "invalidValue". */
export function serverMessage(lang: Lang, key: string): string {
  return catalogue[lang][isMessageKey(key) ? key : 'invalidValue'];
}
