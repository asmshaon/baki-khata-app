import type { Customer, Shop, Transaction } from '@baki/shared';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BalanceCard, TransactionRow } from '../../components/Balance';
import { api, errorMessage } from '../../lib/api';
import { HeaderActions } from '../../components/HeaderActions';
import { useI18n } from '../../lib/i18n';
import { keys } from '../../lib/queries';
import { useCustomerSession, useSession } from '../../lib/session';
import { colors } from '../../lib/theme';

/** Read-only portal: the customer's balance at this shop and their history. */
export default function CustomerHome() {
  const session = useCustomerSession();
  const { signOut } = useSession();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const me = useQuery({
    queryKey: keys.me,
    queryFn: () => api<{ customer: Customer; shop: Shop }>('/customer/me'),
  });
  const history = useQuery({
    queryKey: keys.myTransactions,
    queryFn: () => api<{ transactions: Transaction[] }>('/customer/transactions').then((r) => r.transactions),
  });

  const customer = me.data?.customer ?? session.customer;

  const confirmSignOut = () =>
    Alert.alert(t('signOutConfirm'), undefined, [
      { text: t('no'), style: 'cancel' },
      { text: t('signOutYes'), style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => <HeaderActions onSignOut={confirmSignOut} />,
        }}
      />
      <FlatList
        data={history.data ?? []}
        keyExtractor={(t) => String(t.id)}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={me.isRefetching || history.isRefetching}
            onRefresh={() => {
              void me.refetch();
              void history.refetch();
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.greeting}>{customer.name}</Text>
            <BalanceCard balance={customer.balance} />
            {me.isError ? <Text style={styles.warn}>{errorMessage(me.error)}</Text> : null}
            <Text style={styles.sectionTitle}>{t('history')}</Text>
            {history.isPending ? <ActivityIndicator size="large" color={colors.primary} /> : null}
          </View>
        }
        ListEmptyComponent={
          history.isPending ? undefined : (
            <Text style={styles.empty}>{history.isError ? errorMessage(history.error) : t('noHistory')}</Text>
          )
        }
        renderItem={({ item }) => <TransactionRow tx={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: 16, gap: 8 },
  header: { gap: 14, paddingTop: 16, paddingBottom: 4 },
  greeting: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center' },
  warn: { fontSize: 16, color: colors.baki, textAlign: 'center' },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4 },
  empty: { fontSize: 18, color: colors.muted, textAlign: 'center', paddingVertical: 24 },
});
