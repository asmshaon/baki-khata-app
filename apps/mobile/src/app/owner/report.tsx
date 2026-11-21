import type { PaymentMethod, ReportEntry } from '@baki/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { errorMessage } from '../../lib/api';
import { formatDateTime, formatDay, formatTaka } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { METHOD_LABEL, METHODS } from '../../lib/methods';
import { useReport } from '../../lib/queries';
import { colors, fontFamily, radius } from '../../lib/theme';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** One day's baki and joma across the shop, with how the money came in. */
export default function Report() {
  const insets = useSafeAreaInsets();
  const { t, num, lang } = useI18n();
  const [today] = useState(() => startOfDay(new Date()));
  const [dayStart, setDayStart] = useState(today);
  const report = useReport(dayStart, addDays(dayStart, 1));
  const isToday = dayStart.getTime() === today.getTime();
  const entries = report.data ?? [];

  const baki = entries.filter((e) => e.type === 'baki');
  const joma = entries.filter((e) => e.type === 'joma');
  const sum = (list: ReportEntry[]) => list.reduce((total, e) => total + e.amount, 0);
  const people = (list: ReportEntry[]) => new Set(list.map((e) => e.customerId)).size;
  const jomaTotal = sum(joma);
  const byMethod: { key: PaymentMethod | 'unknown'; amount: number }[] = [
    ...METHODS.map((m) => ({ key: m, amount: sum(joma.filter((e) => e.method === m)) })),
    { key: 'unknown' as const, amount: sum(joma.filter((e) => !e.method)) },
  ].filter((m) => m.amount > 0);

  const header = (
    <View style={styles.header}>
      <View style={styles.dayNav}>
        <Pressable
          onPress={() => setDayStart(addDays(dayStart, -1))}
          accessibilityRole="button"
          accessibilityLabel={t('previousDay')}
          style={styles.navButton}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <View style={styles.dayLabel}>
          <Text style={styles.dayTitle}>{isToday ? t('today') : formatDay(dayStart, lang)}</Text>
          <Text style={styles.daySub}>{formatDay(dayStart, lang, true)}</Text>
        </View>
        <Pressable
          onPress={() => setDayStart(addDays(dayStart, 1))}
          disabled={isToday}
          accessibilityRole="button"
          accessibilityLabel={t('nextDay')}
          style={[styles.navButton, isToday && { opacity: 0.3 }]}
        >
          <Ionicons name="chevron-forward" size={28} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.totals}>
        <Total label={t('bakiGiven')} amount={sum(baki)} people={num(people(baki))} color={colors.baki} soft={colors.bakiSoft} icon="arrow-up" />
        <Total label={t('paymentReceived')} amount={jomaTotal} people={num(people(joma))} color={colors.joma} soft={colors.jomaSoft} icon="arrow-down" />
      </View>

      {byMethod.length ? (
        <View style={styles.methods}>
          <Text style={styles.methodsTitle}>{t('howReceived')}</Text>
          {byMethod.map((m) => (
            <View key={m.key} style={styles.methodRow}>
              <Text style={styles.methodName}>{t(m.key === 'unknown' ? 'methodUnknown' : METHOD_LABEL[m.key])}</Text>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${Math.max(4, Math.round((m.amount / jomaTotal) * 100))}%` }]} />
              </View>
              <Text style={styles.methodAmount}>{formatTaka(m.amount)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>{t('dayEntries')}</Text>
      {report.isPending ? <ActivityIndicator size="large" color={colors.primary} /> : null}
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      data={entries}
      keyExtractor={(e) => String(e.id)}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
      refreshControl={<RefreshControl refreshing={report.isRefetching} onRefresh={() => void report.refetch()} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        report.isPending ? undefined : (
          <Text style={styles.empty}>{report.isError ? errorMessage(report.error) : t('noEntriesDay')}</Text>
        )
      }
      renderItem={({ item }) => <EntryRow entry={item} />}
    />
  );
}

function Total({
  label,
  amount,
  people,
  color,
  soft,
  icon,
}: {
  label: string;
  amount: number;
  people: string;
  color: string;
  soft: string;
  icon: 'arrow-up' | 'arrow-down';
}) {
  const { t } = useI18n();
  return (
    <View style={[styles.total, { backgroundColor: soft, borderColor: color }]}>
      <View style={styles.totalHead}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={[styles.totalLabel, { color }]}>{label}</Text>
      </View>
      <Text style={[styles.totalAmount, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatTaka(amount)}
      </Text>
      <Text style={styles.totalPeople}>{t('peopleCount', { n: people })}</Text>
    </View>
  );
}

function EntryRow({ entry }: { entry: ReportEntry }) {
  const { t, lang } = useI18n();
  const isBaki = entry.type === 'baki';
  const color = isBaki ? colors.baki : colors.joma;
  const time = formatDateTime(entry.createdAt, lang).split(', ').pop();
  const detail = [time, entry.method ? t(METHOD_LABEL[entry.method]) : null, entry.note].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => router.push(`/owner/customer/${entry.customerId}`)}
      accessibilityRole="button"
      accessibilityLabel={entry.customerName}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.keypadPressed }]}
    >
      <Avatar id={entry.customerId} name={entry.customerName} photoUrl={entry.customerPhotoUrl} size={44} />
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {entry.customerName}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Text style={[styles.rowAmount, { color }]}>
        {isBaki ? '+' : '−'} {formatTaka(entry.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: 16, gap: 8 },
  header: { gap: 12, paddingTop: 12, paddingBottom: 4 },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 4,
  },
  navButton: {
    width: 56,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { flex: 1, alignItems: 'center' },
  dayTitle: { fontFamily, fontSize: 21, fontWeight: '800', color: colors.text },
  daySub: { fontFamily, fontSize: 14, color: colors.muted },
  totals: { flexDirection: 'row', gap: 10 },
  total: { flex: 1, borderWidth: 2, borderRadius: radius.lg, padding: 10, alignItems: 'center' },
  totalHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  totalLabel: { fontFamily, fontSize: 16, fontWeight: '700' },
  totalAmount: { fontFamily, fontSize: 28, fontWeight: '800' },
  totalPeople: { fontFamily, fontSize: 14, color: colors.muted },
  methods: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 10 },
  methodsTitle: { fontFamily, fontSize: 17, fontWeight: '700', color: colors.muted },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  methodName: { fontFamily, width: 76, fontSize: 17, fontWeight: '700', color: colors.text },
  bar: { flex: 1, height: 14, borderRadius: 7, backgroundColor: colors.jomaSoft, overflow: 'hidden' },
  barFill: { height: 14, borderRadius: 7, backgroundColor: colors.joma },
  methodAmount: { fontFamily, width: 84, textAlign: 'right', fontSize: 17, fontWeight: '800', color: colors.joma },
  sectionTitle: { fontFamily, fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 4 },
  empty: { fontFamily, fontSize: 18, color: colors.muted, textAlign: 'center', paddingVertical: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontFamily, fontSize: 18, fontWeight: '700', color: colors.text },
  rowDetail: { fontFamily, fontSize: 14, color: colors.muted },
  rowAmount: { fontFamily, fontSize: 18, fontWeight: '800' },
});
