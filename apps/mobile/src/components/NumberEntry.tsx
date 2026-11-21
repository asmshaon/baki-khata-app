import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatPhone, formatTaka } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { colors, fontFamily } from '../lib/theme';
import { Keypad } from './Keypad';

type Kind = 'phone' | 'pin' | 'amount';

const MAX_LENGTH: Record<Kind, number> = { phone: 11, pin: 4, amount: 8 };

type Props = {
  kind: Kind;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  onChange: (value: string) => void;
  /** Called with the final value. PIN entry submits by itself once 4 digits are in. */
  onDone: (value: string) => void;
  error?: string | null;
  busy?: boolean;
  accent?: string;
  /** Amount only: one-tap buttons that fill in a common amount. */
  quickAmounts?: number[];
};

function isComplete(kind: Kind, value: string) {
  if (kind === 'phone') return /^01[3-9]\d{8}$/.test(value);
  if (kind === 'pin') return value.length === 4;
  return Number(value) > 0;
}

/** One question per screen: an icon, a short label, what was typed, and the keypad. */
export function NumberEntry({ kind, label, icon, value, onChange, onDone, error, busy, accent = colors.primary, quickAmounts }: Props) {
  const { t } = useI18n();
  const handleDigit = (digit: string) => {
    if (busy || value.length >= MAX_LENGTH[kind]) return;
    if (kind === 'amount' && value === '' && digit === '0') return;
    const next = value + digit;
    onChange(next);
    if (kind === 'pin' && next.length === 4) onDone(next);
  };

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View style={[styles.iconCircle, { backgroundColor: accent }]}>
          <Ionicons name={icon} size={36} color="#fff" />
        </View>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.display, { borderColor: error ? colors.baki : accent }]}>
          {kind === 'pin' ? (
            <View style={styles.dots}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.dot, i < value.length && { backgroundColor: accent, borderColor: accent }]} />
              ))}
            </View>
          ) : (
            <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1} adjustsFontSizeToFit>
              {kind === 'amount' ? formatTaka(Number(value || 0)) : value ? formatPhone(value) : '01XXXXXXXXX'}
            </Text>
          )}
        </View>
        <View style={styles.status}>
          {busy ? <ActivityIndicator size="large" color={accent} /> : error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
      <View>
      {kind === 'amount' && quickAmounts?.length ? (
        <View style={styles.quick}>
          <Text style={styles.quickLabel}>{t('quickAmounts')}</Text>
          <View style={styles.quickRow}>
            {quickAmounts.map((n) => {
              const on = value === String(n);
              return (
                <Pressable
                  key={n}
                  onPress={() => !busy && onChange(String(n))}
                  accessibilityRole="button"
                  accessibilityLabel={formatTaka(n)}
                  style={({ pressed }) => [
                    styles.quickChip,
                    { borderColor: accent },
                    on && { backgroundColor: accent },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.quickText, { color: on ? '#fff' : accent }]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <Keypad
        onDigit={handleDigit}
        onBackspace={() => !busy && onChange(value.slice(0, -1))}
        onDone={kind === 'pin' ? undefined : () => onDone(value)}
        doneEnabled={!busy && isComplete(kind, value)}
        doneColor={kind === 'amount' ? accent : colors.joma}
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', backgroundColor: colors.bg },
  top: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily, fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center' },
  display: {
    alignSelf: 'stretch',
    minHeight: 76,
    borderWidth: 2,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  value: { fontFamily, fontSize: 36, fontWeight: '700', color: colors.text, letterSpacing: 1 },
  placeholder: { color: colors.border },
  dots: { flexDirection: 'row', gap: 22 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.muted },
  status: { minHeight: 44, justifyContent: 'center' },
  quick: { paddingHorizontal: 16, paddingBottom: 10, gap: 6 },
  quickLabel: { fontFamily, fontSize: 15, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  quickRow: { flexDirection: 'row', gap: 6 },
  quickChip: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { fontFamily, fontSize: 18, fontWeight: '800' },
  error: { fontFamily, fontSize: 18, color: colors.baki, fontWeight: '600', textAlign: 'center' },
});
