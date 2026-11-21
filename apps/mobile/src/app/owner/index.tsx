import type { Customer } from '@baki/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { balanceTone, LoadState } from '../../components/Balance';
import { errorMessage } from '../../lib/api';
import { HeaderActions } from '../../components/HeaderActions';
import { daysSince, formatTaka, toDayString } from '../../lib/format';
import { isPromiseDue } from '../../lib/promise';
import { useI18n } from '../../lib/i18n';
import { useCustomers, useSummary } from '../../lib/queries';
import { useSession } from '../../lib/session';
import { colors, fontFamily, radius } from '../../lib/theme';

/** Owner home: how much is owed in total, and every customer (owing first). */
export default function OwnerHome() {
  const { signOut } = useSession();
  const { t, num } = useI18n();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const summary = useSummary();
  const customers = useCustomers(q);
  const [filter, setFilter] = useState<'all' | 'owing'>('all');
  const all = customers.data ?? [];
  const owing = all.filter((c) => c.balance > 0);
  // Promise day reached (today or overdue) and still owing; earliest promise first.
  const dueNow = all
    .filter((c) => isPromiseDue(c.promisedOn, c.balance))
    .sort((a, b) => (a.promisedOn ?? '').localeCompare(b.promisedOn ?? ''));

  const confirmSignOut = () =>
    Alert.alert(t('signOutConfirm'), undefined, [
      { text: t('no'), style: 'cancel' },
      { text: t('signOutYes'), style: 'destructive', onPress: () => void signOut() },
    ]);

  const refresh = () => {
    void summary.refetch();
    void customers.refetch();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => <HeaderActions onSignOut={confirmSignOut} />,
        }}
      />
      {customers.isPending ? (
        <LoadState loading error={undefined} onRetry={refresh} />
      ) : customers.isError && !customers.data ? (
        <LoadState loading={false} error={errorMessage(customers.error)} onRetry={refresh} />
      ) : (
        <FlatList
          data={filter === 'owing' ? owing : all}
          keyExtractor={(c) => String(c.id)}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
          refreshControl={<RefreshControl refreshing={summary.isRefetching || customers.isRefetching} onRefresh={refresh} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.totalCard}>
                <View style={styles.totalTop}>
                  <Ionicons name="wallet" size={24} color="#fff" />
                  <Text style={[styles.totalLabel, styles.flex]}>{t('totalDue')}</Text>
                  <Pressable
                    onPress={() => router.push('/owner/report')}
                    accessibilityRole="button"
                    accessibilityLabel={t('todayReport')}
                    hitSlop={8}
                    style={({ pressed }) => [styles.reportLink, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.reportText}>{t('todayReport')}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#fff" />
                  </Pressable>
                </View>
                <Text style={styles.totalAmount} numberOfLines={1} adjustsFontSizeToFit>
                  {formatTaka(summary.data?.totalDue ?? 0)}
                </Text>
                <View style={styles.todayRow}>
                  <Today icon="arrow-up" label={t('todayBaki')} amount={summary.data?.todayBaki ?? 0} color={colors.baki} />
                  <Today icon="arrow-down" label={t('todayJoma')} amount={summary.data?.todayJoma ?? 0} color={colors.joma} />
                </View>
              </View>
              {dueNow.length && !q ? (
                <View style={styles.dueCard}>
                  <View style={styles.dueHead}>
                    <Ionicons name="calendar" size={24} color={colors.promise} />
                    <Text style={styles.dueTitle}>{t('dueToday', { n: num(dueNow.length) })}</Text>
                    <Text style={styles.dueTotal}>{formatTaka(dueNow.reduce((s, c) => s + c.balance, 0))}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dueList}>
                    {dueNow.map((c) => (
                      <Pressable
                        key={c.id}
                        onPress={() => router.push(`/owner/customer/${c.id}`)}
                        accessibilityRole="button"
                        accessibilityLabel={c.name}
                        style={({ pressed }) => [styles.duePerson, pressed && { opacity: 0.8 }]}
                      >
                        <Avatar id={c.id} name={c.name} photoUrl={c.photoUrl} size={48} />
                        <Text style={styles.dueName} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.dueAmount}>{formatTaka(c.balance)}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
              <View style={styles.searchBox}>
                <Ionicons name="search" size={26} color={colors.muted} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t('searchPlaceholder')}
                  placeholderTextColor={colors.muted}
                  returnKeyType="search"
                />
                {search ? (
                  <Pressable onPress={() => setSearch('')} hitSlop={10} accessibilityLabel={t('delete')}>
                    <Ionicons name="close-circle" size={26} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.filter}>
                <FilterTab
                  label={`${t('filterAll')} ${num(all.length)}`}
                  active={filter === 'all'}
                  color={colors.primary}
                  onPress={() => setFilter('all')}
                />
                <FilterTab
                  label={`${t('filterOwing')} ${num(owing.length)}`}
                  active={filter === 'owing'}
                  color={colors.baki}
                  onPress={() => setFilter('owing')}
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name={q ? 'search' : 'people'} size={56} color={colors.border} />
              <Text style={styles.emptyText}>{t(q || filter === 'owing' ? 'noneFound' : 'noCustomers')}</Text>
            </View>
          }
          renderItem={({ item }) => <CustomerRow customer={item} />}
        />
      )}

      <Pressable
        onPress={() => router.push('/owner/add-customer')}
        accessibilityRole="button"
        accessibilityLabel={t('newCustomer')}
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 20 }, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="person-add" size={30} color="#fff" />
        <Text style={styles.fabText}>{t('newCustomer')}</Text>
      </Pressable>
    </View>
  );
}

function Today({ icon, label, amount, color }: { icon: 'arrow-up' | 'arrow-down'; label: string; amount: number; color: string }) {
  return (
    <View style={styles.today}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.todayLabel}>{label}</Text>
      <Text style={[styles.todayAmount, { color }]}>{formatTaka(amount)}</Text>
    </View>
  );
}

function FilterTab({ label, active, color, onPress }: { label: string; active: boolean; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.filterTab, active && { backgroundColor: color }]}
    >
      <Text style={[styles.filterText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

/** Customers who owe and haven't had an entry for this many days get a warning badge. */
const LONG_DUE_DAYS = 30;

function CustomerRow({ customer }: { customer: Customer }) {
  const { t, ago, num, day } = useI18n();
  const tone = balanceTone(customer.balance);
  const promiseDue = isPromiseDue(customer.promisedOn, customer.balance);
  const promiseLabel =
    customer.promisedOn && customer.balance > 0
      ? promiseDue
        ? customer.promisedOn === toDayString(new Date())
          ? t('promiseToday')
          : t('promiseLate', { date: day(customer.promisedOn) })
        : day(customer.promisedOn)
      : null;
  const color = customer.balance === 0 ? colors.muted : tone.color;
  const longDue =
    customer.balance > 0 && customer.lastEntryAt !== null && daysSince(customer.lastEntryAt) >= LONG_DUE_DAYS;
  return (
    <Pressable
      onPress={() => router.push(`/owner/customer/${customer.id}`)}
      accessibilityRole="button"
      accessibilityLabel={customer.name}
      style={({ pressed }) => [styles.row, { borderLeftColor: color }, pressed && { backgroundColor: colors.keypadPressed }]}
    >
      <Avatar id={customer.id} name={customer.name} photoUrl={customer.photoUrl} size={60} />
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {customer.name}
        </Text>
        <View style={styles.rowMeta}>
          <Ionicons name="time-outline" size={15} color={colors.muted} />
          <Text style={styles.rowPhone} numberOfLines={1}>
            {customer.lastEntryAt ? ago(customer.lastEntryAt) : t('noEntryYet')}
          </Text>
          {promiseLabel ? (
            <View style={[styles.badge, styles.promiseBadge, promiseDue && styles.promiseBadgeDue]}>
              <Text style={[styles.badgeText, { color: promiseDue ? '#fff' : colors.promiseText }]}>{promiseLabel}</Text>
            </View>
          ) : null}
          {longDue ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('longDue', { n: num(LONG_DUE_DAYS) })}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowBalance, { color }]}>{formatTaka(customer.balance)}</Text>
        {customer.balance !== 0 ? (
          <Text style={[styles.rowTag, { color }]}>{t(customer.balance > 0 ? 'owesShort' : 'advanceShort')}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: 16, gap: 10 },
  header: { gap: 14, paddingTop: 12, paddingBottom: 4 },
  totalCard: {
    backgroundColor: colors.baki,
    borderRadius: radius.lg,
    padding: 18,
    alignItems: 'center',
    elevation: 3,
    shadowColor: colors.baki,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  totalTop: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  flex: { flex: 1 },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingLeft: 12,
    paddingRight: 6,
    minHeight: 36,
  },
  reportText: { fontFamily, color: '#fff', fontSize: 16, fontWeight: '800' },
  dueCard: {
    backgroundColor: colors.promiseSoft,
    borderWidth: 2,
    borderColor: colors.promise,
    borderRadius: radius.lg,
    padding: 12,
    gap: 10,
  },
  dueHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dueTitle: { fontFamily, flex: 1, fontSize: 19, fontWeight: '800', color: colors.promiseText },
  dueTotal: { fontFamily, fontSize: 18, fontWeight: '800', color: colors.promiseText },
  dueList: { gap: 10 },
  duePerson: {
    width: 100,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 2,
  },
  dueName: { fontFamily, fontSize: 15, fontWeight: '700', color: colors.text, maxWidth: '100%' },
  dueAmount: { fontFamily, fontSize: 15, fontWeight: '800', color: colors.baki },
  promiseBadge: { backgroundColor: colors.promiseSoft },
  promiseBadgeDue: { backgroundColor: colors.promise },
  totalLabel: { color: '#fff', fontFamily, fontSize: 20, fontWeight: '700' },
  totalAmount: { color: '#fff', fontFamily, fontSize: 48, fontWeight: '800' },
  todayRow: { flexDirection: 'row', gap: 10, marginTop: 10, alignSelf: 'stretch' },
  today: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  todayLabel: { fontFamily, fontSize: 14, color: colors.muted, fontWeight: '600' },
  todayAmount: { fontFamily, fontSize: 18, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 58,
  },
  searchInput: { flex: 1, fontFamily, fontSize: 20, color: colors.text },
  filter: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: radius.md, padding: 4, gap: 4 },
  filterTab: { flex: 1, minHeight: 50, borderRadius: radius.md - 4, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontFamily, fontSize: 19, fontWeight: '800', color: colors.muted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    borderLeftWidth: 6,
  },
  rowBody: { flex: 1, gap: 4 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  badge: { backgroundColor: colors.bakiSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 4 },
  badgeText: { fontFamily, fontSize: 13, fontWeight: '800', color: colors.baki },
  rowRight: { alignItems: 'flex-end' },
  rowTag: { fontFamily, fontSize: 14, fontWeight: '700' },
  rowName: { fontFamily, fontSize: 21, fontWeight: '700', color: colors.text },
  rowPhone: { fontFamily, fontSize: 15, color: colors.muted },
  rowBalance: { fontFamily, fontSize: 21, fontWeight: '800' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyText: { fontFamily, fontSize: 20, color: colors.muted, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    left: 20,
    minHeight: 68,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: '#fff', fontFamily, fontSize: 22, fontWeight: '800' },
});
