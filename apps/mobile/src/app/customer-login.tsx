import type { CustomerSession } from '@baki/shared';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { balanceTone } from '../components/Balance';
import { NumberEntry } from '../components/NumberEntry';
import { api, errorMessage } from '../lib/api';
import { formatTaka } from '../lib/format';
import { useI18n } from '../lib/i18n';
import { useSession } from '../lib/session';
import { colors, radius } from '../lib/theme';

/** Customer sign-in. A phone can belong to several shops; if more than one matches, ask which. */
export default function CustomerLogin() {
  const { signIn } = useSession();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [step, setStep] = useState<'phone' | 'pin' | 'shop'>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [sessions, setSessions] = useState<CustomerSession[]>([]);

  const choose = async (session: CustomerSession) => {
    await signIn(session);
    router.replace('/customer');
  };

  const login = useMutation({
    mutationFn: (input: { phone: string; pin: string }) =>
      api<{ sessions: CustomerSession[] }>('/auth/customer/login', { method: 'POST', body: input }),
    onSuccess: async ({ sessions: found }) => {
      if (found.length === 1) {
        await choose(found[0]);
        return;
      }
      setSessions(found);
      setStep('shop');
    },
    onError: () => setPin(''),
  });

  if (step === 'shop') {
    return (
      <FlatList
        style={styles.container}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
        contentInsetAdjustmentBehavior="automatic"
        data={sessions}
        keyExtractor={(s) => String(s.shop.id)}
        ListHeaderComponent={<Text style={styles.heading}>{t('whichShop')}</Text>}
        renderItem={({ item }) => {
          const tone = balanceTone(item.customer.balance);
          return (
            <Pressable
              onPress={() => choose(item)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.shop, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.shopIcon}>
                <Ionicons name="storefront" size={34} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName}>{item.shop.name}</Text>
                <Text style={[styles.shopBalance, { color: tone.color }]}>
                  {t(tone.label)}: {formatTaka(item.customer.balance)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={30} color={colors.muted} />
            </Pressable>
          );
        }}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {step === 'phone' ? (
        <NumberEntry
          kind="phone"
          label={t('yourPhone')}
          icon="call"
          value={phone}
          onChange={setPhone}
          onDone={() => setStep('pin')}
          accent={colors.joma}
        />
      ) : (
        <NumberEntry
          kind="pin"
          label={t('customerPinLabel')}
          icon="lock-closed"
          value={pin}
          onChange={(v) => {
            login.reset();
            setPin(v);
          }}
          onDone={(value) => login.mutate({ phone, pin: value })}
          busy={login.isPending}
          error={login.error ? errorMessage(login.error) : null}
          accent={colors.joma}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, gap: 12 },
  heading: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  shop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    minHeight: 96,
  },
  shopIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  shopName: { fontSize: 22, fontWeight: '700', color: colors.text },
  shopBalance: { fontSize: 18, fontWeight: '600', marginTop: 2 },
});
