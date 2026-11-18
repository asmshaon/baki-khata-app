import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../../../components/Avatar';
import { BalanceCard, LoadState, TransactionRow } from '../../../../components/Balance';
import { BigButton } from '../../../../components/BigButton';
import { errorMessage } from '../../../../lib/api';
import { formatPhone } from '../../../../lib/format';
import { useI18n } from '../../../../lib/i18n';
import { pickPhoto, uploadCustomerPhoto } from '../../../../lib/photo';
import { useCustomer, useCustomerTransactions, useRefreshCustomer } from '../../../../lib/queries';
import { colors } from '../../../../lib/theme';

/** One customer: big photo, big balance, and the two main actions. History below. */
export default function CustomerDetail() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const customer = useCustomer(id);
  const history = useCustomerTransactions(id);
  const refreshCustomer = useRefreshCustomer();

  const photo = useMutation({
    mutationFn: async (source: 'camera' | 'gallery') => {
      const picked = await pickPhoto(source);
      return picked ? (await uploadCustomerPhoto(id, picked)).customer : null;
    },
    onSuccess: (updated) => updated && refreshCustomer(updated),
    onError: (err) => Alert.alert(errorMessage(err)),
  });

  const changePhoto = () =>
    Alert.alert(t('changePhoto'), undefined, [
      { text: t('takePhoto'), onPress: () => photo.mutate('camera') },
      { text: t('gallery'), onPress: () => photo.mutate('gallery') },
      { text: t('cancel'), style: 'cancel' },
    ]);

  if (!customer.data) {
    return (
      <LoadState
        loading={customer.isPending}
        error={customer.error ? errorMessage(customer.error) : undefined}
        onRetry={() => void customer.refetch()}
      />
    );
  }
  const c = customer.data;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: c.name,
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/owner/customer/${id}/edit`)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('editInfo')}
            >
              <Ionicons name="create-outline" size={28} color={colors.primary} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={history.data ?? []}
        keyExtractor={(t) => String(t.id)}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={customer.isRefetching || history.isRefetching}
            onRefresh={() => {
              void customer.refetch();
              void history.refetch();
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.identity}>
              <Pressable onPress={changePhoto} accessibilityRole="button" accessibilityLabel={t('changePhoto')}>
                <Avatar id={c.id} name={c.name} photoUrl={c.photoUrl} size={128} />
                <View style={styles.cameraBadge}>
                  {photo.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={20} color="#fff" />
                  )}
                </View>
              </Pressable>
              <Text style={styles.name}>{c.name}</Text>
              <Pressable
                onPress={() => void Linking.openURL(`tel:${c.phone}`)}
                style={styles.phone}
                accessibilityRole="button"
                accessibilityLabel={t('call')}
              >
                <Ionicons name="call" size={20} color={colors.primary} />
                <Text style={styles.phoneText}>{formatPhone(c.phone)}</Text>
              </Pressable>
            </View>

            <BalanceCard balance={c.balance} />

            <View style={styles.actions}>
              <BigButton
                icon="arrow-up-circle"
                label={t('bakiGiven')}
                size="huge"
                color={colors.baki}
                style={styles.flex}
                onPress={() => router.push(`/owner/customer/${id}/entry?type=baki`)}
              />
              <BigButton
                icon="cash"
                label={t('paymentReceived')}
                size="huge"
                color={colors.joma}
                style={styles.flex}
                onPress={() => router.push(`/owner/customer/${id}/entry?type=joma`)}
              />
            </View>

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
  flex: { flex: 1 },
  list: { paddingHorizontal: 16, gap: 8 },
  header: { gap: 16, paddingTop: 16, paddingBottom: 4 },
  identity: { alignItems: 'center', gap: 6 },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: { fontSize: 30, fontWeight: '800', color: colors.text, textAlign: 'center' },
  phone: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6 },
  phoneText: { fontSize: 20, color: colors.primary, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4 },
  empty: { fontSize: 18, color: colors.muted, textAlign: 'center', paddingVertical: 24 },
});
