import type { Customer } from '@baki/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { balanceTone, LoadState } from '../../components/Balance';
import { errorMessage } from '../../lib/api';
import { HeaderActions } from '../../components/HeaderActions';
import { formatPhone, formatTaka } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { useCustomers, useSummary } from '../../lib/queries';
import { useSession } from '../../lib/session';
import { colors, radius } from '../../lib/theme';

/** Owner home: how much is owed in total, and every customer (owing first). */
export default function OwnerHome() {
  const { signOut } = useSession();
  const { t, num } = useI18n();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const summary = useSummary();
  const customers = useCustomers(q);

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
          data={customers.data}
          keyExtractor={(c) => String(c.id)}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 120 }]}
          refreshControl={<RefreshControl refreshing={summary.isRefetching || customers.isRefetching} onRefresh={refresh} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>{t('totalDue')}</Text>
                <Text style={styles.totalAmount} numberOfLines={1} adjustsFontSizeToFit>
                  {formatTaka(summary.data?.totalDue ?? 0)}
                </Text>
                <View style={styles.todayRow}>
                  <Today icon="arrow-up" label={t('todayBaki')} amount={summary.data?.todayBaki ?? 0} color={colors.baki} />
                  <Today icon="arrow-down" label={t('todayJoma')} amount={summary.data?.todayJoma ?? 0} color={colors.joma} />
                </View>
              </View>
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
              {summary.data ? (
                <Text style={styles.count}>{t('customerCount', { n: num(summary.data.customerCount) })}</Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name={q ? 'search' : 'people'} size={56} color={colors.border} />
              <Text style={styles.emptyText}>{t(q ? 'noneFound' : 'noCustomers')}</Text>
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

function CustomerRow({ customer }: { customer: Customer }) {
  const tone = balanceTone(customer.balance);
  return (
    <Pressable
      onPress={() => router.push(`/owner/customer/${customer.id}`)}
      accessibilityRole="button"
      accessibilityLabel={customer.name}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.keypadPressed }]}
    >
      <Avatar id={customer.id} name={customer.name} photoUrl={customer.photoUrl} size={60} />
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {customer.name}
        </Text>
        <Text style={styles.rowPhone}>{formatPhone(customer.phone)}</Text>
      </View>
      <Text style={[styles.rowBalance, { color: customer.balance === 0 ? colors.muted : tone.color }]}>
        {formatTaka(customer.balance)}
      </Text>
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
  },
  totalLabel: { color: '#fff', fontSize: 20, fontWeight: '700' },
  totalAmount: { color: '#fff', fontSize: 48, fontWeight: '800' },
  todayRow: { flexDirection: 'row', gap: 10, marginTop: 10, alignSelf: 'stretch' },
  today: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  todayLabel: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  todayAmount: { fontSize: 18, fontWeight: '800' },
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
  searchInput: { flex: 1, fontSize: 20, color: colors.text },
  count: { fontSize: 16, color: colors.muted, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
  },
  rowBody: { flex: 1 },
  rowName: { fontSize: 21, fontWeight: '700', color: colors.text },
  rowPhone: { fontSize: 15, color: colors.muted, marginTop: 2 },
  rowBalance: { fontSize: 21, fontWeight: '800' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 20, color: colors.muted, fontWeight: '600' },
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
  fabText: { color: '#fff', fontSize: 22, fontWeight: '800' },
});
