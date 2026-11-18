import type { Transaction } from '@baki/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatTaka } from '../lib/format';
import { useI18n, type StringKey } from '../lib/i18n';
import { colors, radius } from '../lib/theme';

/** Wording and colour for a running balance: red when owed, green when paid ahead. */
export function balanceTone(balance: number): { label: StringKey; color: string; soft: string } {
  if (balance > 0) return { label: 'balanceOwes', color: colors.baki, soft: colors.bakiSoft };
  if (balance < 0) return { label: 'balanceAdvance', color: colors.joma, soft: colors.jomaSoft };
  return { label: 'balanceClear', color: colors.joma, soft: colors.jomaSoft };
}

export function BalanceCard({ balance }: { balance: number }) {
  const { t } = useI18n();
  const tone = balanceTone(balance);
  return (
    <View style={[styles.card, { backgroundColor: tone.soft, borderColor: tone.color }]}>
      <Text style={[styles.cardLabel, { color: tone.color }]}>{t(tone.label)}</Text>
      <Text style={[styles.cardAmount, { color: tone.color }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatTaka(balance)}
      </Text>
    </View>
  );
}

export function TransactionRow({ tx }: { tx: Transaction }) {
  const { t, dateTime } = useI18n();
  const isBaki = tx.type === 'baki';
  const color = isBaki ? colors.baki : colors.joma;
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: isBaki ? colors.bakiSoft : colors.jomaSoft }]}>
        <Ionicons name={isBaki ? 'arrow-up' : 'arrow-down'} size={26} color={color} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowType, { color }]}>{t(isBaki ? 'bakiGiven' : 'paymentReceived')}</Text>
        <Text style={styles.rowDate}>{dateTime(tx.createdAt)}</Text>
        {tx.note ? <Text style={styles.rowDate}>{tx.note}</Text> : null}
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, { color }]}>
          {isBaki ? '+' : '−'} {formatTaka(tx.amount)}
        </Text>
        <Text style={[styles.rowAfter, { color: balanceTone(tx.balanceAfter).color }]}>= {formatTaka(tx.balanceAfter)}</Text>
      </View>
    </View>
  );
}

/** Loading spinner or an error with a retry button, filling the screen. */
export function LoadState({ loading, error, onRetry }: { loading: boolean; error?: string; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.center}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <>
          <Ionicons name="cloud-offline-outline" size={56} color={colors.muted} />
          <Text style={styles.centerText}>{error}</Text>
          <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button">
            <Ionicons name="refresh" size={26} color="#fff" />
            <Text style={styles.retryText}>{t('retry')}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 2, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' },
  cardLabel: { fontSize: 20, fontWeight: '700' },
  cardAmount: { fontSize: 48, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
  },
  rowIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowType: { fontSize: 18, fontWeight: '700' },
  rowDate: { fontSize: 14, color: colors.muted },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  rowAmount: { fontSize: 20, fontWeight: '800' },
  rowAfter: { fontSize: 14, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, backgroundColor: colors.bg },
  centerText: { fontSize: 18, color: colors.text, textAlign: 'center' },
  retry: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  retryText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
