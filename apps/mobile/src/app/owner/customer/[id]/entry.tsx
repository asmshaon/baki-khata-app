import type { TransactionType } from '@baki/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../../../components/Avatar';
import { balanceTone, LoadState } from '../../../../components/Balance';
import { ConfirmBar } from '../../../../components/ConfirmBar';
import { NumberEntry } from '../../../../components/NumberEntry';
import { errorMessage } from '../../../../lib/api';
import { formatTaka } from '../../../../lib/format';
import { useI18n, type StringKey } from '../../../../lib/i18n';
import { useAddEntry, useCustomer } from '../../../../lib/queries';
import { colors, radius } from '../../../../lib/theme';

const COPY: Record<TransactionType, { title: StringKey; question: StringKey; color: string; soft: string }> = {
  baki: { title: 'bakiGiven', question: 'howMuchBaki', color: colors.baki, soft: colors.bakiSoft },
  joma: { title: 'paymentReceived', question: 'howMuchJoma', color: colors.joma, soft: colors.jomaSoft },
};

/** Amount on the keypad, then a ✓ / ✗ confirm that shows the new balance before saving. */
export default function Entry() {
  const params = useLocalSearchParams<{ id: string; type: string }>();
  const id = Number(params.id);
  const type: TransactionType = params.type === 'joma' ? 'joma' : 'baki';
  const copy = COPY[type];
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const customer = useCustomer(id);
  const addEntry = useAddEntry(id);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'amount' | 'confirm'>('amount');

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
  const value = Number(amount);
  const newBalance = c.balance + (type === 'baki' ? value : -value);
  const newTone = balanceTone(newBalance);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{ title: t(copy.title), headerStyle: { backgroundColor: copy.color }, headerTintColor: '#fff' }}
      />
      {step === 'amount' ? (
        <NumberEntry
          kind="amount"
          label={t(copy.question)}
          icon={type === 'baki' ? 'arrow-up-circle' : 'cash'}
          value={amount}
          onChange={setAmount}
          onDone={() => setStep('confirm')}
          accent={copy.color}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.confirm}>
          <Avatar id={c.id} name={c.name} photoUrl={c.photoUrl} size={110} />
          <Text style={styles.name}>{c.name}</Text>

          <View style={[styles.amountCard, { backgroundColor: copy.soft, borderColor: copy.color }]}>
            <Text style={[styles.amountLabel, { color: copy.color }]}>{t(copy.title)}</Text>
            <Text style={[styles.amount, { color: copy.color }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatTaka(value)}
            </Text>
          </View>

          <Text style={styles.after}>
            {t('afterThis')} <Text style={{ color: newTone.color, fontWeight: '800' }}>{t(newTone.label)}</Text>
            {newBalance !== 0 ? (
              <Text style={{ color: newTone.color, fontWeight: '800' }}> {formatTaka(newBalance)}</Text>
            ) : null}
          </Text>

          {addEntry.isError ? <Text style={styles.error}>{errorMessage(addEntry.error)}</Text> : null}

          <ConfirmBar
            loading={addEntry.isPending}
            onCancel={() => {
              addEntry.reset();
              setStep('amount');
            }}
            onConfirm={() => addEntry.mutate({ type, amount: value }, { onSuccess: () => router.back() })}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  confirm: { alignItems: 'center', padding: 20, gap: 10 },
  name: { fontSize: 28, fontWeight: '800', color: colors.text },
  amountCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderWidth: 3,
    borderRadius: radius.lg,
    paddingVertical: 18,
    marginTop: 8,
  },
  amountLabel: { fontSize: 22, fontWeight: '800' },
  amount: { fontSize: 56, fontWeight: '800' },
  after: { fontSize: 20, color: colors.text, textAlign: 'center', marginTop: 4 },
  error: {
    fontSize: 18,
    color: colors.baki,
    fontWeight: '600',
    backgroundColor: colors.bakiSoft,
    padding: 12,
    borderRadius: radius.md,
  },
});
