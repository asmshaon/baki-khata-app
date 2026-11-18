import type { Lang } from '@baki/shared';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Replaces ASCII digits with Bangla digits: "18" → "১৮". */
export function toBanglaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

/** Counts and other plain numbers follow the app language. */
export function formatNumber(value: number, lang: Lang): string {
  return lang === 'bn' ? toBanglaDigits(value) : String(value);
}

/** Groups digits the South Asian way: 1250 → "1,250", 125000 → "1,25,000". */
function groupDigits(n: number): string {
  const s = String(Math.trunc(Math.abs(n)));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
}

/** Whole taka, always positive, English digits in both languages (user request): 1250 → "৳ 1,250". */
export function formatTaka(amount: number): string {
  return `৳ ${groupDigits(amount)}`;
}

/** "01712345678" → "01712-345678". English digits in both languages, as printed on SIM cards. */
export function formatPhone(phone: string): string {
  return phone.length === 11 ? `${phone.slice(0, 5)}-${phone.slice(5)}` : phone;
}

const MONTHS: Record<Lang, string[]> = {
  bn: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

function banglaPeriod(hour: number) {
  if (hour < 5) return 'রাত';
  if (hour < 12) return 'সকাল';
  if (hour < 15) return 'দুপুর';
  if (hour < 18) return 'বিকাল';
  if (hour < 20) return 'সন্ধ্যা';
  return 'রাত';
}

/** bn: "১৮ নভেম্বর, সকাল ১০:০৫" · en: "18 Nov, 10:05 AM" */
export function formatDateTime(iso: string, lang: Lang): string {
  const d = new Date(iso);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const time = `${h12}:${String(d.getMinutes()).padStart(2, '0')}`;
  const year = d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`;
  const date = `${d.getDate()} ${MONTHS[lang][d.getMonth()]}${year}`;
  return lang === 'bn' ? toBanglaDigits(`${date}, ${banglaPeriod(h)} ${time}`) : `${date}, ${time} ${h < 12 ? 'AM' : 'PM'}`;
}
