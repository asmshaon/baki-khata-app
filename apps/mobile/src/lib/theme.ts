/** Red = baki (customer owes), green = joma (paid). Keep these meanings everywhere. */
export const colors = {
  baki: '#C62828',
  bakiSoft: '#FDECEA',
  joma: '#2E7D32',
  jomaSoft: '#E8F5E9',
  /** Orange = a promised payment day (কবে দেবে), distinct from red baki and green joma. */
  promise: '#E65100',
  promiseSoft: '#FFF3E0',
  promiseText: '#7A3300',
  whatsapp: '#1B7F4B',
  primary: '#1565C0',
  primarySoft: '#E3F0FC',
  text: '#1B1B1F',
  muted: '#5F6368',
  bg: '#F4F5F7',
  card: '#FFFFFF',
  border: '#DADCE0',
  keypad: '#FFFFFF',
  keypadPressed: '#E3E6EA',
} as const;

/**
 * App-wide typeface: Kalpurush (OFL, assets/fonts). It ships one regular
 * weight, so bold text is synthesised by the OS. React Native has no global
 * font setting, so every text style sets `fontFamily`.
 */
export const fontFamily = 'Kalpurush';

export const radius = { md: 14, lg: 22 } as const;

const AVATAR_COLORS = ['#6A1B9A', '#00838F', '#EF6C00', '#283593', '#AD1457', '#558B2F', '#4E342E', '#0277BD'];

export function avatarColor(seed: number): string {
  return AVATAR_COLORS[Math.abs(seed) % AVATAR_COLORS.length];
}

export const stackScreenOptions = {
  headerTitleStyle: { fontFamily, fontSize: 22, fontWeight: '700' as const },
  headerTitleAlign: 'center' as const,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerTransparent: false,
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.text,
  contentStyle: { backgroundColor: colors.bg },
};
